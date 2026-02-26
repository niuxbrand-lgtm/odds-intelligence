/**
 * Sync Service - Odds Intelligence
 * 
 * Servicio de sincronización que coordina la ingesta de datos
 * desde múltiples fuentes (The Odds API, Polymarket).
 */

import { db } from '@/lib/db'
import { TheOddsApiConnector, createOddsApiConnector } from '@/lib/connectors/the-odds-api'
import { PolymarketConnector } from '@/lib/connectors/polymarket'
import { ArbitrageEngine, arbitrageEngine } from '@/lib/arbitrage/engine'
import { dataNormalizer } from '@/lib/normalizer'
import { AlertDispatcher, createAlertDispatcher } from '@/lib/alerts/notifier'
import type { SyncResult, OddsWithBookmaker, OpportunityWithDetails } from '@/types'

export interface SyncServiceConfig {
  oddsApiKey?: string
  telegramBotToken?: string
  emailApiKey?: string
  syncIntervalMs?: number
}

const DEFAULT_SYNC_INTERVAL = 60000 // 1 minute

export class SyncService {
  private oddsApiConnector?: TheOddsApiConnector
  private polymarketConnector: PolymarketConnector
  private arbitrageEngine: ArbitrageEngine
  private alertDispatcher: AlertDispatcher
  private syncInterval: number
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  constructor(config: SyncServiceConfig = {}) {
    if (config.oddsApiKey) {
      this.oddsApiConnector = createOddsApiConnector(config.oddsApiKey)
    }
    this.polymarketConnector = new PolymarketConnector()
    this.arbitrageEngine = new ArbitrageEngine()
    this.alertDispatcher = createAlertDispatcher({
      telegramBotToken: config.telegramBotToken,
      emailApiKey: config.emailApiKey,
    })
    this.syncInterval = config.syncIntervalMs || DEFAULT_SYNC_INTERVAL
  }

  /**
   * Initialize connectors in database
   */
  async initializeConnectors(): Promise<void> {
    // Ensure bookmakers exist
    const bookmakers = [
      { key: 'polymarket', name: 'Polymarket', type: 'prediction_market', commission: 0.02 },
      { key: 'draftkings', name: 'DraftKings', type: 'bookmaker', commission: 0 },
      { key: 'fanduel', name: 'FanDuel', type: 'bookmaker', commission: 0 },
      { key: 'betmgm', name: 'BetMGM', type: 'bookmaker', commission: 0 },
      { key: 'pointsbet', name: 'PointsBet', type: 'bookmaker', commission: 0 },
      { key: 'williamhill_us', name: 'William Hill', type: 'bookmaker', commission: 0 },
    ]

    for (const bm of bookmakers) {
      await db.bookmaker.upsert({
        where: { key: bm.key },
        update: { name: bm.name, type: bm.type, commission: bm.commission },
        create: {
          key: bm.key,
          name: bm.name,
          type: bm.type,
          commission: bm.commission,
          isActive: true,
        },
      })
    }

    // Ensure sports exist
    const sports = [
      { key: 'esports_cs2', name: 'Counter-Strike 2', category: 'esports' },
      { key: 'esports_lol', name: 'League of Legends', category: 'esports' },
      { key: 'esports_valorant', name: 'Valorant', category: 'esports' },
      { key: 'mma_mixed_martial_arts', name: 'MMA/UFC', category: 'combat_sports' },
      { key: 'tennis_atp', name: 'ATP Tennis', category: 'tennis' },
      { key: 'polymarket_mma', name: 'Polymarket MMA', category: 'combat_sports' },
      { key: 'polymarket_esports', name: 'Polymarket Esports', category: 'esports' },
    ]

    for (const sport of sports) {
      await db.sport.upsert({
        where: { key: sport.key },
        update: { name: sport.name, category: sport.category },
        create: {
          key: sport.key,
          name: sport.name,
          category: sport.category,
          active: true,
        },
      })
    }

    // Ensure market types exist
    const marketTypes = [
      { key: 'h2h', name: 'Match Winner', isThreeWay: true },
      { key: 'spreads', name: 'Handicap', isThreeWay: false },
      { key: 'totals', name: 'Over/Under', isThreeWay: false },
    ]

    for (const mt of marketTypes) {
      await db.marketType.upsert({
        where: { key: mt.key },
        update: { name: mt.name, isThreeWay: mt.isThreeWay },
        create: {
          key: mt.key,
          name: mt.name,
          isThreeWay: mt.isThreeWay,
          active: true,
        },
      })
    }

    console.log('[SyncService] Connectors initialized')
  }

  /**
   * Run a full sync from all sources
   */
  async runFullSync(): Promise<{
    oddsApi: SyncResult | null
    polymarket: SyncResult
    opportunities: number
  }> {
    console.log('[SyncService] Starting full sync...')
    const startTime = Date.now()

    let oddsApiResult: SyncResult | null = null
    let opportunitiesCount = 0

    // Sync from The Odds API if configured
    if (this.oddsApiConnector) {
      try {
        oddsApiResult = await this.oddsApiConnector.syncAll()
        console.log(`[SyncService] The Odds API: ${oddsApiResult.eventsProcessed} events, ${oddsApiResult.oddsProcessed} odds`)
      } catch (error) {
        console.error('[SyncService] The Odds API sync failed:', error)
      }
    }

    // Sync from Polymarket
    const polymarketResult = await this.polymarketConnector.syncAll()
    console.log(`[SyncService] Polymarket: ${polymarketResult.eventsProcessed} events, ${polymarketResult.oddsProcessed} odds`)

    // Process opportunities (this would normally be done via queue)
    // opportunitiesCount = await this.processOpportunities()

    const totalDuration = Date.now() - startTime
    console.log(`[SyncService] Full sync completed in ${totalDuration}ms`)

    // Update sync state
    await this.updateSyncState('the_odds_api', oddsApiResult?.success ?? false, oddsApiResult?.duration)
    await this.updateSyncState('polymarket', polymarketResult.success, polymarketResult.duration)

    return {
      oddsApi: oddsApiResult,
      polymarket: polymarketResult,
      opportunities: opportunitiesCount,
    }
  }

  /**
   * Update sync state in database
   */
  private async updateSyncState(provider: string, success: boolean, duration?: number): Promise<void> {
    try {
      await db.syncState.upsert({
        where: { provider_sportKey: { provider, sportKey: '' } },
        update: {
          lastSyncAt: new Date(),
          lastSuccessAt: success ? new Date() : undefined,
          lastErrorAt: success ? undefined : new Date(),
          consecutiveErrors: success ? 0 : { increment: 1 },
          totalSyncs: { increment: 1 },
        },
        create: {
          provider,
          lastSyncAt: new Date(),
          lastSuccessAt: success ? new Date() : undefined,
        },
      })
    } catch {
      // Ignore errors in sync state update
    }
  }

  /**
   * Process and detect arbitrage opportunities
   */
  async processOpportunities(): Promise<number> {
    // Get recent odds snapshots from database
    const recentOdds = await db.oddsSnapshot.findMany({
      where: {
        capturedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      include: {
        bookmaker: true,
        marketType: true,
        event: true,
      },
    })

    // Group by event and market
    const grouped = new Map<string, typeof recentOdds>()
    
    for (const odds of recentOdds) {
      const key = `${odds.eventId}_${odds.marketTypeId}`
      const existing = grouped.get(key) || []
      existing.push(odds)
      grouped.set(key, existing)
    }

    let opportunitiesCount = 0

    // Check each group for arbitrage
    for (const [key, oddsGroup] of grouped) {
      if (oddsGroup.length < 2) continue // Need at least 2 bookmakers

      const [eventId, marketTypeId] = key.split('_')
      const isThreeWay = oddsGroup[0].marketType.isThreeWay

      // Convert to OddsWithBookmaker format
      const oddsList: OddsWithBookmaker[] = oddsGroup.map(o => ({
        eventId: o.eventId,
        bookmakerId: o.bookmakerId,
        bookmakerKey: o.bookmaker.key,
        marketType: o.marketType.key as 'h2h' | 'spreads' | 'totals',
        oddsHome: o.oddsHome,
        oddsAway: o.oddsAway,
        oddsDraw: o.oddsDraw ?? undefined,
        capturedAt: o.capturedAt,
        sourceApi: o.sourceApi as 'the_odds_api' | 'polymarket',
        commission: o.bookmaker.commission,
        impliedProbHome: o.impliedProbHome ?? 0,
        impliedProbAway: o.impliedProbAway ?? 0,
        impliedProbDraw: o.impliedProbDraw ?? undefined,
      }))

      const calculation = this.arbitrageEngine.calculateFromOddsList(oddsList)

      if (calculation && calculation.isArbitrage) {
        // Save opportunity
        await this.saveOpportunity(oddsGroup[0], calculation, isThreeWay)
        opportunitiesCount++
      }
    }

    return opportunitiesCount
  }

  /**
   * Save arbitrage opportunity to database
   */
  private async saveOpportunity(
    oddsSnapshot: typeof db.oddsSnapshot extends { findMany: any } ? never : any,
    calculation: ReturnType<typeof this.arbitrageEngine.calculateFromOddsList>,
    isThreeWay: boolean
  ): Promise<void> {
    if (!calculation) return

    const qualityScore = this.arbitrageEngine.calculateQualityScore(
      calculation.profitPercentage,
      50, // Default liquidity score
      this.arbitrageEngine.assessLatencyRisk(new Date()),
      75 // Default reliability
    )

    const qualityGrade = this.arbitrageEngine.assignQualityGrade(qualityScore)

    await db.arbitrageOpportunity.create({
      data: {
        eventId: oddsSnapshot.eventId,
        marketType: oddsSnapshot.marketType.key,
        isThreeWay,
        bookmakerHomeId: calculation.bestOddsHome.bookmakerId,
        oddsHome: calculation.bestOddsHome.odds,
        bookmakerAwayId: calculation.bestOddsAway.bookmakerId,
        oddsAway: calculation.bestOddsAway.odds,
        bookmakerDrawId: calculation.bestOddsDraw?.bookmakerId,
        oddsDraw: calculation.bestOddsDraw?.odds,
        totalImpliedProb: calculation.totalImpliedProb,
        arbitrageMargin: calculation.arbitrageMargin,
        profitPercentage: calculation.profitPercentage,
        recommendedStakeHome: calculation.stakeHome,
        recommendedStakeAway: calculation.stakeAway,
        recommendedStakeDraw: calculation.stakeDraw,
        expectedProfit: calculation.expectedProfit,
        commissionAdjustment: calculation.commissionAdjusted,
        slippageEstimate: calculation.slippageEstimate,
        qualityScore,
        qualityGrade,
        status: 'active',
      },
    })
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(): void {
    if (this.isRunning) {
      console.log('[SyncService] Sync already running')
      return
    }

    this.isRunning = true
    console.log(`[SyncService] Starting periodic sync every ${this.syncInterval / 1000}s`)

    // Run immediately
    this.runFullSync().catch(console.error)

    // Then periodically
    this.intervalId = setInterval(() => {
      this.runFullSync().catch(console.error)
    }, this.syncInterval)
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('[SyncService] Stopped periodic sync')
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.syncInterval,
    }
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null

export function getSyncService(config?: SyncServiceConfig): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService(config)
  }
  return syncServiceInstance
}
