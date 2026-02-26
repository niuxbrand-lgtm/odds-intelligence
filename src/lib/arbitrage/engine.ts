/**
 * Arbitrage Engine - Odds Intelligence
 * 
 * Motor de cálculo de arbitraje para mercados 2-way y 3-way.
 * 
 * Fórmulas implementadas:
 * - Arbitraje 2-way: prob_total = 1/odds1 + 1/odds2 < 1
 * - Arbitraje 3-way: prob_total = 1/odds1 + 1/oddsX + 1/odds2 < 1
 * - Staking proporcional: stake_i = stake_total * prob_i / prob_total
 * - Beneficio garantizado: profit = stake_total * (1 - prob_total) / prob_total
 * 
 * Ajustes por fricción:
 * - Comisiones de exchange
 * - Slippage estimado
 * - Riesgo de latencia
 */

import type { 
  ArbitrageCalculation, 
  OddsWithBookmaker,
  QualityGrade,
  LatencyRisk 
} from '@/types'

// Configuración del motor
export interface ArbitrageEngineConfig {
  minProfitPercentage: number // Mínimo 1% de profit
  commissionDefault: number // Comisión por defecto de exchanges
  slippageEstimate: number // Slippage estimado por defecto
  maxLatencyMs: number // Latencia máxima aceptable
}

const DEFAULT_CONFIG: ArbitrageEngineConfig = {
  minProfitPercentage: 0.01, // 1%
  commissionDefault: 0.02, // 2%
  slippageEstimate: 0.005, // 0.5%
  maxLatencyMs: 60000, // 60 segundos
}

export class ArbitrageEngine {
  private config: ArbitrageEngineConfig

  constructor(config: Partial<ArbitrageEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Calculate implied probability from decimal odds
   * Formula: implied_prob = 1 / odds
   */
  impliedProbability(odds: number): number {
    if (odds <= 1) return 0
    return 1 / odds
  }

  /**
   * Apply commission adjustment to implied probability
   * For exchanges: effective_odds = odds * (1 - commission)
   * Equivalent: adjusted_prob = prob / (1 - commission)
   */
  applyCommission(impliedProb: number, commission: number): number {
    return impliedProb / (1 - commission)
  }

  /**
   * Calculate arbitrage for 2-way market
   * 
   * Example: Team A @ 2.10 (Bookie 1), Team B @ 2.05 (Bookie 2)
   * Implied prob: 1/2.10 + 1/2.05 = 0.476 + 0.488 = 0.964 < 1 ✓
   * Arbitrage margin: 1 - 0.964 = 3.6%
   */
  calculate2WayArbitrage(
    oddsHome: number,
    oddsAway: number,
    commissionHome: number = 0,
    commissionAway: number = 0
  ): ArbitrageCalculation {
    // Calculate implied probabilities with commission adjustment
    const probHome = this.applyCommission(
      this.impliedProbability(oddsHome),
      commissionHome
    )
    const probAway = this.applyCommission(
      this.impliedProbability(oddsAway),
      commissionAway
    )

    const totalImpliedProb = probHome + probAway
    const arbitrageMargin = 1 - totalImpliedProb
    const profitPercentage = arbitrageMargin / totalImpliedProb
    const isArbitrage = arbitrageMargin > this.config.minProfitPercentage

    // Calculate optimal stakes for $100 total stake
    const stakeHome = 100 * probHome / totalImpliedProb
    const stakeAway = 100 * probAway / totalImpliedProb
    const expectedProfit = 100 - (stakeHome + stakeAway) + (stakeHome * (oddsHome - 1))

    // Apply slippage estimate
    const slippageEstimate = this.config.slippageEstimate
    const adjustedProfit = expectedProfit * (1 - slippageEstimate)

    return {
      totalImpliedProb,
      arbitrageMargin,
      profitPercentage,
      isArbitrage,
      bestOddsHome: { odds: oddsHome, bookmakerId: '', bookmakerKey: '' },
      bestOddsAway: { odds: oddsAway, bookmakerId: '', bookmakerKey: '' },
      stakeHome,
      stakeAway,
      expectedProfit,
      commissionAdjusted: commissionHome + commissionAway,
      slippageEstimate,
      adjustedProfit,
    }
  }

  /**
   * Calculate arbitrage for 3-way market (1X2)
   * 
   * Example: Home @ 3.10, Draw @ 3.40, Away @ 2.90
   * Implied prob: 1/3.10 + 1/3.40 + 1/2.90 = 0.323 + 0.294 + 0.345 = 0.962 < 1 ✓
   * Arbitrage margin: 1 - 0.962 = 3.8%
   */
  calculate3WayArbitrage(
    oddsHome: number,
    oddsDraw: number,
    oddsAway: number,
    commissionHome: number = 0,
    commissionDraw: number = 0,
    commissionAway: number = 0
  ): ArbitrageCalculation {
    // Calculate implied probabilities with commission adjustment
    const probHome = this.applyCommission(
      this.impliedProbability(oddsHome),
      commissionHome
    )
    const probDraw = this.applyCommission(
      this.impliedProbability(oddsDraw),
      commissionDraw
    )
    const probAway = this.applyCommission(
      this.impliedProbability(oddsAway),
      commissionAway
    )

    const totalImpliedProb = probHome + probDraw + probAway
    const arbitrageMargin = 1 - totalImpliedProb
    const profitPercentage = arbitrageMargin / totalImpliedProb
    const isArbitrage = arbitrageMargin > this.config.minProfitPercentage

    // Calculate optimal stakes for $100 total stake
    const stakeHome = 100 * probHome / totalImpliedProb
    const stakeDraw = 100 * probDraw / totalImpliedProb
    const stakeAway = 100 * probAway / totalImpliedProb
    const expectedProfit = 100 * profitPercentage

    // Apply slippage estimate
    const slippageEstimate = this.config.slippageEstimate
    const adjustedProfit = expectedProfit * (1 - slippageEstimate)

    return {
      totalImpliedProb,
      arbitrageMargin,
      profitPercentage,
      isArbitrage,
      bestOddsHome: { odds: oddsHome, bookmakerId: '', bookmakerKey: '' },
      bestOddsAway: { odds: oddsAway, bookmakerId: '', bookmakerKey: '' },
      bestOddsDraw: { odds: oddsDraw, bookmakerId: '', bookmakerKey: '' },
      stakeHome,
      stakeDraw,
      stakeAway,
      expectedProfit,
      commissionAdjusted: commissionHome + commissionDraw + commissionAway,
      slippageEstimate,
      adjustedProfit,
    }
  }

  /**
   * Find best combination of odds across bookmakers
   * Returns the best odds for each outcome
   */
  findBestOdds(oddsList: OddsWithBookmaker[]): {
    bestHome: OddsWithBookmaker
    bestAway: OddsWithBookmaker
    bestDraw?: OddsWithBookmaker
    isThreeWay: boolean
  } {
    // Sort by odds descending for each outcome
    const sortedByHome = [...oddsList].sort((a, b) => b.oddsHome - a.oddsHome)
    const sortedByAway = [...oddsList].sort((a, b) => b.oddsAway - a.oddsAway)

    const bestHome = sortedByHome[0]
    const bestAway = sortedByAway[0]

    // Check if any odds have draw (3-way)
    const hasDraw = oddsList.some(o => o.oddsDraw && o.oddsDraw > 0)
    
    if (hasDraw) {
      const sortedByDraw = [...oddsList]
        .filter(o => o.oddsDraw && o.oddsDraw > 0)
        .sort((a, b) => (b.oddsDraw || 0) - (a.oddsDraw || 0))
      
      return {
        bestHome,
        bestAway,
        bestDraw: sortedByDraw[0],
        isThreeWay: true,
      }
    }

    return {
      bestHome,
      bestAway,
      isThreeWay: false,
    }
  }

  /**
   * Calculate arbitrage from a list of odds for the same event
   */
  calculateFromOddsList(oddsList: OddsWithBookmaker[]): ArbitrageCalculation | null {
    if (oddsList.length < 2) {
      return null // Need at least 2 bookmakers for arbitrage
    }

    const { bestHome, bestAway, bestDraw, isThreeWay } = this.findBestOdds(oddsList)

    // Don't allow same bookmaker for both sides (unless it's an exchange)
    if (bestHome.bookmakerId === bestAway.bookmakerId && 
        bestHome.bookmakerKey !== 'polymarket' && 
        !bestHome.bookmakerKey.includes('exchange')) {
      // Same bookmaker - check if it's an arbitrage within same book (rare)
      return null
    }

    let calculation: ArbitrageCalculation

    if (isThreeWay && bestDraw) {
      calculation = this.calculate3WayArbitrage(
        bestHome.oddsHome,
        bestDraw.oddsDraw!,
        bestAway.oddsAway,
        bestHome.commission,
        bestDraw.commission,
        bestAway.commission
      )
      calculation.bestOddsDraw = {
        odds: bestDraw.oddsDraw!,
        bookmakerId: bestDraw.bookmakerId,
        bookmakerKey: bestDraw.bookmakerKey,
      }
    } else {
      calculation = this.calculate2WayArbitrage(
        bestHome.oddsHome,
        bestAway.oddsAway,
        bestHome.commission,
        bestAway.commission
      )
    }

    // Update best odds info
    calculation.bestOddsHome = {
      odds: bestHome.oddsHome,
      bookmakerId: bestHome.bookmakerId,
      bookmakerKey: bestHome.bookmakerKey,
    }
    calculation.bestOddsAway = {
      odds: bestAway.oddsAway,
      bookmakerId: bestAway.bookmakerId,
      bookmakerKey: bestAway.bookmakerKey,
    }

    return calculation
  }

  /**
   * Assess latency risk based on time since odds capture
   */
  assessLatencyRisk(capturedAt: Date, now: Date = new Date()): LatencyRisk {
    const latencyMs = now.getTime() - capturedAt.getTime()
    
    if (latencyMs < 10000) return 'low' // < 10 seconds
    if (latencyMs < 30000) return 'medium' // < 30 seconds
    return 'high'
  }

  /**
   * Calculate quality score (0-100) for an arbitrage opportunity
   * Factors: profit margin, liquidity, latency risk, market reliability
   */
  calculateQualityScore(
    profitPercentage: number,
    liquidityScore: number,
    latencyRisk: LatencyRisk,
    bookmakerReliability: number // 0-100 average
  ): number {
    // Profit score (max 40 points)
    // Higher profit = higher score, but diminishing returns
    const profitScore = Math.min(40, profitPercentage * 2000) // 2% = 40 points
    
    // Liquidity score (max 25 points)
    const liquidityPoints = (liquidityScore / 100) * 25
    
    // Latency penalty
    const latencyPenalty = {
      low: 0,
      medium: 10,
      high: 25,
    }[latencyRisk]
    
    // Bookmaker reliability (max 35 points)
    const reliabilityPoints = (bookmakerReliability / 100) * 35
    
    const totalScore = profitScore + liquidityPoints + reliabilityPoints - latencyPenalty
    
    return Math.max(0, Math.min(100, Math.round(totalScore)))
  }

  /**
   * Assign quality grade based on score
   */
  assignQualityGrade(score: number): QualityGrade {
    if (score >= 80) return 'A'
    if (score >= 65) return 'B'
    if (score >= 50) return 'C'
    if (score >= 35) return 'D'
    return 'F'
  }

  /**
   * Estimate maximum stake based on liquidity and bookmaker limits
   */
  estimateMaxStake(
    liquidityScore: number,
    bookmakerLimits: { home: number; away: number; draw?: number }
  ): number {
    // Conservative estimate: use lowest limit
    const limits = [bookmakerLimits.home, bookmakerLimits.away]
    if (bookmakerLimits.draw) limits.push(bookmakerLimits.draw)
    
    const minLimit = Math.min(...limits)
    
    // Scale by liquidity score
    const liquidityFactor = liquidityScore / 100
    
    return minLimit * liquidityFactor
  }

  /**
   * Estimate opportunity expiration time
   * Based on market volatility and time until event start
   */
  estimateExpiration(
    detectedAt: Date,
    eventStartTime: Date,
    marketVolatility: 'low' | 'medium' | 'high' = 'medium'
  ): Date {
    const timeUntilEvent = eventStartTime.getTime() - detectedAt.getTime()
    
    // Arbitrage opportunities typically don't last long
    const baseExpirationMs = {
      low: 5 * 60 * 1000, // 5 minutes for low volatility
      medium: 2 * 60 * 1000, // 2 minutes for medium
      high: 30 * 1000, // 30 seconds for high volatility
    }[marketVolatility]
    
    // Cap at 10% of time until event
    const maxExpirationMs = Math.min(baseExpirationMs, timeUntilEvent * 0.1)
    
    return new Date(detectedAt.getTime() + maxExpirationMs)
  }
}

// Singleton instance
export const arbitrageEngine = new ArbitrageEngine()

// Utility functions
export function formatProfitPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function formatStake(value: number): string {
  return `$${value.toFixed(2)}`
}

export function isArbitrageOpportunity(
  oddsHome: number,
  oddsAway: number,
  oddsDraw?: number
): boolean {
  const probHome = 1 / oddsHome
  const probAway = 1 / oddsAway
  const probDraw = oddsDraw ? 1 / oddsDraw : 0
  
  const totalProb = probHome + probAway + probDraw
  
  return totalProb < 1
}
