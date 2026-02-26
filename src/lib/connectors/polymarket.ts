/**
 * Polymarket API Connector
 * 
 * Polymarket es un mercado de predicción descentralizado basado en Polygon.
 * Documentación: https://polymarket.com/
 * 
 * NOTA IMPORTANTE: Polymarket tiene API pública oficial para leer mercados.
 * No hacemos scraping - usamos exclusivamente sus endpoints públicos autorizados.
 * 
 * Límites: No hay rate limits documentados estrictos, pero recomendamos
 * ser respetuoso con requests/second.
 */

import type { PolymarketMarket, NormalizedEvent, NormalizedOdds, SyncResult } from '@/types'

// Categorías de mercados deportivos en Polymarket
export const POLYMARKET_SPORTS_TAGS = [
  'Sports',
  'Basketball',
  'Football',
  'Baseball',
  'Hockey',
  'Soccer',
  'Tennis',
  'MMA',
  'Boxing',
  'Esports',
  'Golf',
  'Cricket',
  'Rugby',
] as const

interface PolymarketConfig {
  baseUrl?: string
  apiKey?: string // Polymarket no requiere API key para lectura pública
}

const DEFAULT_CONFIG: PolymarketConfig = {
  baseUrl: 'https://clob.polymarket.com',
}

// Mapeo de condiciones para identificar mercados deportivos
const SPORT_PATTERNS = {
  mma: /\b(ufc|mma|fight|vs\.?|bellator|one fc)\b/i,
  esports: /\b(cs2|csgo|counter-strike|lol|league of legends|dota|valorant|esports)\b/i,
  tennis: /\b(atp|wta|tennis|open|grand slam|challenger)\b/i,
  football: /\b(premier league|la liga|serie a|bundesliga|ligue 1|champions league|world cup)\b/i,
  basketball: /\b(nba|basketball|basket)\b/i,
}

export class PolymarketConnector {
  private config: PolymarketConfig
  private requestCount = 0
  private lastRequestTime = 0
  private readonly minRequestInterval = 500 // 500ms between requests

  constructor(config: PolymarketConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Rate limiting
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      )
    }
    
    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  /**
   * Fetch markets from Polymarket CLOB API
   */
  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    await this.waitForRateLimit()

    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
    })

    const startTime = Date.now()

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      const latency = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Polymarket API Error ${response.status}: ${error}`)
      }

      console.log(`[Polymarket] Request ${this.requestCount}: ${latency}ms`)

      return response.json()
    } catch (error) {
      console.error(`[Polymarket] Request failed:`, error)
      throw error
    }
  }

  /**
   * Get active markets
   * Endpoint: GET /markets
   */
  async getMarkets(nextCursor?: string): Promise<{ markets: PolymarketMarket[]; next_cursor: string }> {
    const params: Record<string, string> = {
      limit: '100',
      active: 'true',
      closed: 'false',
    }
    
    if (nextCursor) {
      params.next_cursor = nextCursor
    }

    return this.fetch('/markets', params)
  }

  /**
   * Get markets by tag (sports categories)
   */
  async getSportsMarkets(tag?: string): Promise<PolymarketMarket[]> {
    const params: Record<string, string> = {
      limit: '100',
      active: 'true',
      closed: 'false',
    }
    
    if (tag) {
      params.tag = tag
    }

    const response = await this.fetch<PolymarketMarket[] | { markets: PolymarketMarket[] }>('/markets', params)
    
    // Handle both array and object response formats
    if (Array.isArray(response)) {
      return response
    } else if (response && 'markets' in response) {
      return response.markets
    }
    return []
  }

  /**
   * Get single market by ID
   */
  async getMarket(marketId: string): Promise<PolymarketMarket> {
    return this.fetch(`/markets/${marketId}`)
  }

  /**
   * Get order book for a market (for liquidity info)
   */
  async getOrderBook(tokenId: string): Promise<{ market: string; asset_id: string; bids: { price: string; size: string }[]; asks: { price: string; size: string }[] }> {
    return this.fetch('/orderbook', { token_id: tokenId })
  }

  /**
   * Detect sport category from market question
   */
  detectSportCategory(question: string): string | null {
    for (const [sport, pattern] of Object.entries(SPORT_PATTERNS)) {
      if (pattern.test(question)) {
        return sport
      }
    }
    return null
  }

  /**
   * Check if market is a 2-way betting market (Yes/No)
   */
  isBettingMarket(market: PolymarketMarket): boolean {
    // Polymarket markets typically have 2 outcomes: Yes/No or Team A/Team B
    return market.outcomes.length === 2 && market.active && !market.closed
  }

  /**
   * Parse market outcomes into odds format
   * Polymarket uses probability format (0-1), we convert to decimal odds
   */
  parseOutcomesToOdds(outcomes: string[], outcomePrices: string[]): { 
    oddsYes: number
    oddsNo: number
    impliedProbYes: number
    impliedProbNo: number
  } {
    // outcomePrices are strings of probabilities (0-1)
    const probYes = parseFloat(outcomePrices[0] || '0.5')
    const probNo = parseFloat(outcomePrices[1] || '0.5')

    // Convert probability to decimal odds
    // Decimal odds = 1 / probability
    const oddsYes = probYes > 0 ? 1 / probYes : 0
    const oddsNo = probNo > 0 ? 1 / probNo : 0

    return {
      oddsYes,
      oddsNo,
      impliedProbYes: probYes,
      impliedProbNo: probNo,
    }
  }

  /**
   * Normalize Polymarket market to our internal format
   */
  normalizeMarket(market: PolymarketMarket): NormalizedEvent | null {
    const sportCategory = this.detectSportCategory(market.question)
    
    if (!sportCategory) {
      return null // Not a sports market
    }

    // Try to extract team/player names from question
    const vsMatch = market.question.match(/(.+?)\s+(?:vs\.?|v\.?|against)\s+(.+)/i)
    
    let homePlayer: string | undefined
    let awayPlayer: string | undefined
    
    if (vsMatch) {
      homePlayer = vsMatch[1].trim()
      awayPlayer = vsMatch[2].replace(/\?$/, '').trim()
    }

    // Parse end date for commence time
    let commenceTime = new Date()
    if (market.endDate) {
      commenceTime = new Date(market.endDate)
    }

    return {
      externalId: market.id,
      sourceApi: 'polymarket',
      sportKey: `polymarket_${sportCategory}`,
      competition: 'Polymarket Prediction Market',
      homePlayer,
      awayPlayer,
      homeTeam: homePlayer,
      awayTeam: awayPlayer,
      commenceTime,
      status: market.closed ? 'ended' : 'scheduled',
    }
  }

  /**
   * Normalize Polymarket odds to our internal format
   */
  normalizeOdds(market: PolymarketMarket): NormalizedOdds[] | null {
    if (!this.isBettingMarket(market)) {
      return null
    }

    const sportCategory = this.detectSportCategory(market.question)
    if (!sportCategory) return null

    const { oddsYes, oddsNo } = this.parseOutcomesToOdds(
      market.outcomes,
      market.outcomePrices
    )

    // Determine which outcome is "home" vs "away"
    const outcomes = market.outcomes
    const isYesNo = outcomes.some(o => o.toLowerCase() === 'yes' || o.toLowerCase() === 'no')

    const odds: NormalizedOdds = {
      eventId: market.id,
      bookmakerKey: 'polymarket',
      bookmakerName: 'Polymarket',
      marketType: 'h2h',
      oddsHome: isYesNo ? oddsYes : (outcomes[0]?.toLowerCase().includes('yes') ? oddsYes : oddsNo),
      oddsAway: isYesNo ? oddsNo : (outcomes[1]?.toLowerCase().includes('no') ? oddsNo : oddsYes),
      capturedAt: new Date(),
      sourceApi: 'polymarket',
      rawResponse: JSON.stringify(market),
    }

    return [odds]
  }

  /**
   * Get liquidity information for a market
   */
  async getMarketLiquidity(market: PolymarketMarket): Promise<number> {
    try {
      // For simplicity, estimate liquidity from minimumBond
      // In production, you'd query the order book for actual depth
      return market.minimumBond || 1000 // Default $1000 minimum
    } catch {
      return 0
    }
  }

  /**
   * Sync all sports markets from Polymarket
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      provider: 'polymarket',
      success: true,
      eventsProcessed: 0,
      oddsProcessed: 0,
      opportunitiesDetected: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    }

    try {
      // Fetch all active sports markets
      const markets = await this.getSportsMarkets('Sports')
      
      for (const market of markets) {
        const sportCategory = this.detectSportCategory(market.question)
        
        if (sportCategory && this.isBettingMarket(market)) {
          result.eventsProcessed++
          
          const odds = this.normalizeOdds(market)
          if (odds) {
            result.oddsProcessed += odds.length
          }
        }
      }

      // Fetch additional pages if available
      let nextCursor: string | undefined
      let pageCount = 0
      const maxPages = 5 // Limit to avoid excessive requests

      while (nextCursor && pageCount < maxPages) {
        try {
          const response = await this.fetch<{ markets: PolymarketMarket[]; next_cursor: string }>(
            '/markets',
            { next_cursor: nextCursor, active: 'true', limit: '100' }
          )
          
          for (const market of response.markets || []) {
            const sportCategory = this.detectSportCategory(market.question)
            
            if (sportCategory && this.isBettingMarket(market)) {
              result.eventsProcessed++
              
              const odds = this.normalizeOdds(market)
              if (odds) {
                result.oddsProcessed += odds.length
              }
            }
          }
          
          nextCursor = response.next_cursor
          pageCount++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          result.errors.push(`Pagination error: ${errorMessage}`)
          break
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      result.success = false
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Get usage stats
   */
  getUsageStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    }
  }
}

// Factory function
export function createPolymarketConnector(): PolymarketConnector {
  return new PolymarketConnector()
}

// Export singleton instance
export const polymarketConnector = new PolymarketConnector()
