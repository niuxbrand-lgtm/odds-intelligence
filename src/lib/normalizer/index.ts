/**
 * Data Normalizer - Odds Intelligence
 * 
 * Normaliza datos de diferentes fuentes (The Odds API, Polymarket)
 * a un formato unificado para el motor de arbitraje.
 */

import type { 
  OddsApiEvent, 
  PolymarketMarket,
  NormalizedEvent, 
  NormalizedOdds,
  OddsWithBookmaker,
  MarketKey
} from '@/types'
import { db } from '@/lib/db'

// Entity mapping for team/player name resolution
const ENTITY_MAPPINGS: Record<string, string> = {
  // E-sports teams
  'navi': 'Natus Vincere',
  'natus vincere': 'Natus Vincere',
  'faze': 'FaZe Clan',
  'faze clan': 'FaZe Clan',
  'g2': 'G2 Esports',
  'g2 esports': 'G2 Esports',
  'vitality': 'Team Vitality',
  'team vitality': 'Team Vitality',
  'liquid': 'Team Liquid',
  'team liquid': 'Team Liquid',
  'c9': 'Cloud9',
  'cloud9': 'Cloud9',
  
  // MMA Fighters
  'jon jones': 'Jon Jones',
  'jones': 'Jon Jones',
  'stipe miocic': 'Stipe Miocic',
  'miocic': 'Stipe Miocic',
  'conor mcgregor': 'Conor McGregor',
  'mcgregor': 'Conor McGregor',
  
  // Common abbreviations
  'man utd': 'Manchester United',
  'man city': 'Manchester City',
  'mancity': 'Manchester City',
  'manunited': 'Manchester United',
}

// Sport category mapping
const SPORT_CATEGORY_MAP: Record<string, string> = {
  // E-sports
  'esports_cs2': 'esports',
  'esports_lol': 'esports',
  'esports_dota2': 'esports',
  'esports_valorant': 'esports',
  
  // Combat sports
  'mma_mixed_martial_arts': 'combat_sports',
  'boxing_boxing': 'combat_sports',
  'polymarket_mma': 'combat_sports',
  
  // Tennis
  'tennis_atp': 'tennis',
  'tennis_wta': 'tennis',
  'polymarket_tennis': 'tennis',
  
  // Football
  'soccer_australia_aleague': 'football',
  'soccer_argentina_primera_division': 'football',
  'soccer_brazil_serie_a': 'football',
  'polymarket_football': 'football',
}

export class DataNormalizer {
  /**
   * Normalize team/player name
   */
  normalizeName(name: string): string {
    const lowerName = name.toLowerCase().trim()
    
    // Check mapping
    if (ENTITY_MAPPINGS[lowerName]) {
      return ENTITY_MAPPINGS[lowerName]
    }
    
    // Capitalize properly
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Get sport category from sport key
   */
  getSportCategory(sportKey: string): string {
    return SPORT_CATEGORY_MAP[sportKey] || 'other'
  }

  /**
   * Calculate implied probability from decimal odds
   */
  calculateImpliedProbability(odds: number): number {
    if (odds <= 1) return 0
    return 1 / odds
  }

  /**
   * Calculate bookmaker margin
   * For 2-way: margin = prob1 + prob2 - 1
   * For 3-way: margin = prob1 + probX + prob2 - 1
   */
  calculateMargin(
    oddsHome: number, 
    oddsAway: number, 
    oddsDraw?: number
  ): number {
    const probHome = this.calculateImpliedProbability(oddsHome)
    const probAway = this.calculateImpliedProbability(oddsAway)
    const probDraw = oddsDraw ? this.calculateImpliedProbability(oddsDraw) : 0
    
    return probHome + probAway + probDraw - 1
  }

  /**
   * Convert American odds to decimal
   */
  americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1
    } else {
      return (100 / Math.abs(americanOdds)) + 1
    }
  }

  /**
   * Convert fractional odds to decimal
   */
  fractionalToDecimal(numerator: number, denominator: number): number {
    return (numerator / denominator) + 1
  }

  /**
   * Normalize event from The Odds API
   */
  normalizeOddsApiEvent(event: OddsApiEvent, sportKey: string): NormalizedEvent {
    return {
      externalId: event.id,
      sourceApi: 'the_odds_api',
      sportKey,
      homeTeam: this.normalizeName(event.home_team),
      awayTeam: this.normalizeName(event.away_team),
      commenceTime: new Date(event.commence_time),
      status: 'scheduled',
    }
  }

  /**
   * Normalize event from Polymarket
   */
  normalizePolymarketEvent(market: PolymarketMarket): NormalizedEvent | null {
    // Extract teams/players from question
    const vsMatch = market.question.match(/(.+?)\s+(?:vs\.?|v\.?|against)\s+(.+?)(?:\s*\?)?$/i)
    
    let homePlayer: string | undefined
    let awayPlayer: string | undefined
    
    if (vsMatch) {
      homePlayer = this.normalizeName(vsMatch[1].trim())
      awayPlayer = this.normalizeName(vsMatch[2].trim())
    }

    // Detect sport from question/tags
    const sportKey = this.detectSportFromPolymarket(market)
    if (!sportKey) return null

    return {
      externalId: market.id,
      sourceApi: 'polymarket',
      sportKey,
      competition: 'Polymarket',
      homePlayer,
      awayPlayer,
      homeTeam: homePlayer,
      awayTeam: awayPlayer,
      commenceTime: market.endDate ? new Date(market.endDate) : new Date(),
      status: market.closed ? 'ended' : 'scheduled',
    }
  }

  /**
   * Detect sport category from Polymarket market
   */
  private detectSportFromPolymarket(market: PolymarketMarket): string | null {
    const question = market.question.toLowerCase()
    const tags = market.tags || []

    // Check tags first
    if (tags.includes('MMA') || tags.includes('UFC')) return 'polymarket_mma'
    if (tags.includes('Esports')) return 'polymarket_esports'
    if (tags.includes('Tennis')) return 'polymarket_tennis'
    if (tags.includes('Football')) return 'polymarket_football'

    // Check question patterns
    if (/\b(ufc|mma|fight|vs\.?\s*\d)/i.test(question)) return 'polymarket_mma'
    if (/\b(cs2|csgo|lol|league of legends|dota|valorant)\b/i.test(question)) return 'polymarket_esports'
    if (/\b(atp|wta|tennis|open)\b/i.test(question)) return 'polymarket_tennis'
    if (/\b(nba|basketball)\b/i.test(question)) return 'polymarket_basketball'
    if (/\b(nfl|football)\b/i.test(question)) return 'polymarket_football'

    return 'polymarket_other'
  }

  /**
   * Normalize odds data with full bookmaker info
   */
  async normalizeOddsWithBookmaker(
    eventId: string,
    bookmakerId: string,
    bookmakerKey: string,
    marketType: MarketKey,
    oddsHome: number,
    oddsAway: number,
    oddsDraw?: number,
    commission: number = 0
  ): Promise<OddsWithBookmaker> {
    const impliedProbHome = this.calculateImpliedProbability(oddsHome)
    const impliedProbAway = this.calculateImpliedProbability(oddsAway)
    const impliedProbDraw = oddsDraw ? this.calculateImpliedProbability(oddsDraw) : undefined

    return {
      eventId,
      bookmakerId,
      bookmakerKey,
      marketType,
      oddsHome,
      oddsAway,
      oddsDraw,
      capturedAt: new Date(),
      sourceApi: 'the_odds_api',
      commission,
      impliedProbHome,
      impliedProbAway,
      impliedProbDraw,
    }
  }

  /**
   * Group odds by event for arbitrage detection
   */
  groupOddsByEvent(oddsList: OddsWithBookmaker[]): Map<string, OddsWithBookmaker[]> {
    const grouped = new Map<string, OddsWithBookmaker[]>()

    for (const odds of oddsList) {
      const existing = grouped.get(odds.eventId) || []
      existing.push(odds)
      grouped.set(odds.eventId, existing)
    }

    return grouped
  }

  /**
   * Filter odds by market type
   */
  filterByMarket(oddsList: OddsWithBookmaker[], marketType: MarketKey): OddsWithBookmaker[] {
    return oddsList.filter(o => o.marketType === marketType)
  }

  /**
   * Check if odds are fresh (within acceptable latency)
   */
  isOddsFresh(capturedAt: Date, maxAgeMs: number = 60000): boolean {
    const age = Date.now() - capturedAt.getTime()
    return age < maxAgeMs
  }

  /**
   * Validate odds data quality
   */
  validateOdds(odds: NormalizedOdds): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (odds.oddsHome <= 1) {
      errors.push('Invalid home odds: must be greater than 1')
    }
    if (odds.oddsAway <= 1) {
      errors.push('Invalid away odds: must be greater than 1')
    }
    if (odds.oddsDraw !== undefined && odds.oddsDraw <= 1) {
      errors.push('Invalid draw odds: must be greater than 1')
    }

    // Check for obvious errors (extremely high odds might be data issues)
    const maxReasonableOdds = 1000
    if (odds.oddsHome > maxReasonableOdds || odds.oddsAway > maxReasonableOdds) {
      errors.push('Odds seem unreasonably high, possible data error')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Singleton instance
export const dataNormalizer = new DataNormalizer()

// Utility functions
export function formatEventTitle(event: NormalizedEvent): string {
  const home = event.homeTeam || event.homePlayer || 'TBD'
  const away = event.awayTeam || event.awayPlayer || 'TBD'
  return `${home} vs ${away}`
}

export function formatMarketType(market: MarketKey): string {
  const names: Record<MarketKey, string> = {
    'h2h': 'Match Winner',
    'spreads': 'Handicap',
    'totals': 'Over/Under',
    'map_winner': 'Map Winner',
    'round_betting': 'Round Betting',
  }
  return names[market] || market
}
