import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createOddsApiConnector, ODDS_API_SPORTS } from '@/lib/connectors/the-odds-api'
import { polymarketConnector } from '@/lib/connectors/polymarket'
import { ArbitrageEngine } from '@/lib/arbitrage/engine'

// GET - Check sync status
export async function GET() {
  try {
    const syncStates = await db.syncState.findMany()
    const recentOpportunities = await db.arbitrageOpportunity.count({
      where: {
        detectedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { 
        syncStates,
        recentOpportunities,
        lastSync: syncStates[0]?.lastSyncAt || null,
      },
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}

// POST - Run sync
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const results = {
    oddsApi: { success: false, events: 0, odds: 0, errors: [] as string[] },
    polymarket: { success: false, events: 0, odds: 0, errors: [] as string[] },
    arbitrage: { opportunitiesFound: 0 },
    totalDuration: 0,
  }

  try {
    const body = await request.json().catch(() => ({}))
    const source = body.source || 'all'

    // Get or create default competition
    let defaultCompetition = await db.competition.findFirst()
    if (!defaultCompetition) {
      const defaultSport = await db.sport.findFirst() || 
        await db.sport.create({ data: { key: 'default', name: 'General', category: 'other' } })
      defaultCompetition = await db.competition.create({
        data: { name: 'Eventos Varios', sportId: defaultSport.id }
      })
    }

    // Get or create default market type
    let defaultMarketType = await db.marketType.findFirst()
    if (!defaultMarketType) {
      defaultMarketType = await db.marketType.create({
        data: { key: 'h2h', name: 'Match Winner', isThreeWay: false }
      })
    }

    // 1. Sync from The Odds API
    if (source === 'all' || source === 'odds_api') {
      const oddsApiKey = process.env.ODDS_API_KEY
      
      if (oddsApiKey && oddsApiKey.length > 10) {
        try {
          console.log('[Sync] Starting The Odds API sync...')
          const connector = createOddsApiConnector(oddsApiKey)
          
          const sportsToSync = ['mma_mixed_martial_arts', 'esports_cs2', 'esports_lol', 'tennis_atp']
          
          for (const sportKey of sportsToSync) {
            try {
              const events = await connector.getUpcomingEvents(sportKey as keyof typeof ODDS_API_SPORTS)
              results.oddsApi.events += events.length
              
              for (const event of events) {
                const odds = connector.normalizeOdds(event)
                results.oddsApi.odds += odds.length
                
                // Create or update event
                const dbEvent = await db.event.upsert({
                  where: { externalId: event.id },
                  create: {
                    externalId: event.id,
                    competitionId: defaultCompetition.id,
                    homeTeam: event.home_team,
                    awayTeam: event.away_team,
                    commenceTime: new Date(event.commence_time),
                    status: 'scheduled',
                    sportKey: sportKey,
                    sourceApi: 'the_odds_api',
                  },
                  update: {
                    commenceTime: new Date(event.commence_time),
                  },
                })
                
                // Store odds snapshots
                for (const odd of odds) {
                  const bookmaker = await db.bookmaker.upsert({
                    where: { key: odd.bookmakerKey },
                    create: { 
                      key: odd.bookmakerKey, 
                      name: odd.bookmakerName,
                      type: 'bookmaker',
                      isActive: true,
                    },
                    update: { name: odd.bookmakerName },
                  })
                  
                  await db.oddsSnapshot.create({
                    data: {
                      eventId: dbEvent.id,
                      bookmakerId: bookmaker.id,
                      marketTypeId: defaultMarketType.id,
                      marketType: odd.marketType,
                      oddsHome: odd.oddsHome,
                      oddsAway: odd.oddsAway,
                      oddsDraw: odd.oddsDraw,
                      capturedAt: new Date(),
                      sourceApi: 'the_odds_api',
                    },
                  })
                }
              }
              
              await new Promise(r => setTimeout(r, 1100))
            } catch (sportError) {
              console.error(`[Sync] Error syncing ${sportKey}:`, sportError)
              results.oddsApi.errors.push(`${sportKey}: ${sportError instanceof Error ? sportError.message : 'Unknown error'}`)
            }
          }
          
          results.oddsApi.success = true
          
          await db.syncState.upsert({
            where: { provider_sportKey: { provider: 'the_odds_api', sportKey: '' } },
            create: { provider: 'the_odds_api', sportKey: '', lastSyncAt: new Date(), lastSuccessAt: new Date() },
            update: { lastSyncAt: new Date(), lastSuccessAt: new Date() },
          })
        } catch (error) {
          console.error('[Sync] The Odds API error:', error)
          results.oddsApi.errors.push(error instanceof Error ? error.message : 'Unknown error')
        }
      } else {
        results.oddsApi.errors.push('API key not configured')
      }
    }

    // 2. Sync from Polymarket
    if (source === 'all' || source === 'polymarket') {
      try {
        console.log('[Sync] Starting Polymarket sync...')
        const markets = await polymarketConnector.getSportsMarkets('Sports')
        
        let sportMarkets = 0
        for (const market of markets) {
          const sportCategory = polymarketConnector.detectSportCategory(market.question)
          
          if (sportCategory && polymarketConnector.isBettingMarket(market)) {
            sportMarkets++
            results.polymarket.events++
            
            const odds = polymarketConnector.normalizeOdds(market)
            if (odds) {
              results.polymarket.odds += odds.length
              
              // Create bookmaker for polymarket
              const bookmaker = await db.bookmaker.upsert({
                where: { key: 'polymarket' },
                create: { 
                  key: 'polymarket', 
                  name: 'Polymarket',
                  type: 'prediction_market',
                  isActive: true,
                },
                update: {},
              })
              
              // Create event
              const dbEvent = await db.event.upsert({
                where: { externalId: `pm_${market.id}` },
                create: {
                  externalId: `pm_${market.id}`,
                  competitionId: defaultCompetition.id,
                  homePlayer: market.question.substring(0, 100),
                  commenceTime: market.endDate ? new Date(market.endDate) : new Date(),
                  status: market.closed ? 'ended' : 'scheduled',
                  sportKey: `polymarket_${sportCategory}`,
                  sourceApi: 'polymarket',
                },
                update: {},
              })
              
              // Store odds
              await db.oddsSnapshot.create({
                data: {
                  eventId: dbEvent.id,
                  bookmakerId: bookmaker.id,
                  marketTypeId: defaultMarketType.id,
                  marketType: 'h2h',
                  oddsHome: odds[0].oddsHome,
                  oddsAway: odds[0].oddsAway,
                  capturedAt: new Date(),
                  sourceApi: 'polymarket',
                },
              })
            }
          }
        }
        
        results.polymarket.success = true
        console.log(`[Sync] Polymarket found ${sportMarkets} sports markets`)
        
        await db.syncState.upsert({
          where: { provider_sportKey: { provider: 'polymarket', sportKey: '' } },
          create: { provider: 'polymarket', sportKey: '', lastSyncAt: new Date(), lastSuccessAt: new Date() },
          update: { lastSyncAt: new Date(), lastSuccessAt: new Date() },
        })
      } catch (error) {
        console.error('[Sync] Polymarket error:', error)
        results.polymarket.errors.push(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    // 3. Find arbitrage opportunities
    try {
      console.log('[Sync] Running arbitrage detection...')
      const engine = new ArbitrageEngine()
      
      const snapshots = await db.oddsSnapshot.findMany({
        where: {
          capturedAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000)
          }
        },
        include: {
          event: true,
          bookmaker: true,
        },
      })
      
      // Group by event
      const oddsByEvent = new Map<string, typeof snapshots>()
      for (const snap of snapshots) {
        if (!oddsByEvent.has(snap.eventId)) {
          oddsByEvent.set(snap.eventId, [])
        }
        oddsByEvent.get(snap.eventId)!.push(snap)
      }
      
      // Check for arbitrage
      for (const [eventId, eventOdds] of oddsByEvent) {
        if (eventOdds.length < 2) continue
        
        const isThreeWay = eventOdds.some(o => o.oddsDraw !== null)
        
        // Find best odds for each outcome
        const sortedByHome = [...eventOdds].sort((a, b) => b.oddsHome - a.oddsHome)
        const sortedByAway = [...eventOdds].sort((a, b) => b.oddsAway - a.oddsAway)
        
        const bestHome = sortedByHome[0]
        const bestAway = sortedByAway[0]
        
        if (bestHome && bestAway && bestHome.bookmakerId !== bestAway.bookmakerId) {
          const result = isThreeWay 
            ? engine.calculate3WayArbitrage(
                bestHome.oddsHome,
                eventOdds.find(o => o.oddsDraw)?.oddsDraw || 3.0,
                bestAway.oddsAway,
                bestHome.bookmaker.commission,
                0,
                bestAway.bookmaker.commission
              )
            : engine.calculate2WayArbitrage(
                bestHome.oddsHome,
                bestAway.oddsAway,
                bestHome.bookmaker.commission,
                bestAway.bookmaker.commission
              )
          
          if (result.isArbitrage) {
            const latencyRisk = engine.assessLatencyRisk(bestHome.capturedAt)
            const qualityScore = engine.calculateQualityScore(
              result.profitPercentage,
              75,
              latencyRisk,
              80
            )
            const qualityGrade = engine.assignQualityGrade(qualityScore)
            
            const drawOdd = eventOdds.find(o => o.oddsDraw)
            
            results.arbitrage.opportunitiesFound++
            
            await db.arbitrageOpportunity.create({
              data: {
                eventId,
                marketType: bestHome.marketType || 'h2h',
                isThreeWay,
                bookmakerHomeId: bestHome.bookmakerId,
                oddsHome: bestHome.oddsHome,
                bookmakerAwayId: bestAway.bookmakerId,
                oddsAway: bestAway.oddsAway,
                bookmakerDrawId: drawOdd?.bookmakerId,
                oddsDraw: drawOdd?.oddsDraw,
                totalImpliedProb: result.totalImpliedProb,
                arbitrageMargin: result.arbitrageMargin,
                profitPercentage: result.profitPercentage,
                recommendedStakeHome: result.stakeHome,
                recommendedStakeAway: result.stakeAway,
                recommendedStakeDraw: result.stakeDraw,
                expectedProfit: result.expectedProfit,
                latencyRisk,
                liquidityScore: 75,
                qualityScore,
                qualityGrade,
                status: 'active',
              },
            })
          }
        }
      }
    } catch (arbError) {
      console.error('[Sync] Arbitrage detection error:', arbError)
    }

    results.totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('[Sync] General error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
