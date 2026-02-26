/**
 * The Odds API Connector
 * 
 * Documentación: https://the-odds-api.com/liveapi/
 * Planes: Free (500 req/mes), Pro ($500/mes - 30,000 req/mes)
 * 
 * Límites:
 * - Free: 500 requests/mes, 1 request/second
 * - Pro: 30,000 requests/mes, varies by tier
 */

import type { OddsApiEvent, NormalizedEvent, NormalizedOdds, MarketKey, SyncResult } from '@/types'

// Deportes de nicho/ligas inferiores soportados
export const ODDS_API_SPORTS = {
  // E-sports
  'esports_cs2': 'Counter-Strike 2',
  'esports_lol': 'League of Legends',
  'esports_dota2': 'Dota 2',
  'esports_valorant': 'Valorant',
  
  // MMA/Combat
  'mma_mixed_martial_arts': 'MMA',
  'boxing_boxing': 'Boxing',
  
  // Tennis (incluye challengers)
  'tennis_atp': 'ATP Tennis',
  'tennis_wta': 'WTA Tennis',
  
  // Football ligas menores
  'soccer_australia_aleague': 'A-League (Australia)',
  'soccer_argentina_primera_division': 'Primera División (Argentina)',
  'soccer_brazil_serie_a': 'Brasileirão',
  'soccer_chile_primera_division': 'Primera División (Chile)',
  'soccer_colombia_primera_a': 'Primera A (Colombia)',
  'soccer_denmark_superliga': 'Superliga (Denmark)',
  'soccer_finland_veikkausliiga': 'Veikkausliiga (Finland)',
  'soccer_japan_j_league': 'J-League',
  'soccer_mexico_ligamx': 'Liga MX',
  'soccer_norway_eliteserien': 'Eliteserien (Norway)',
  'soccer_poland_ekstraklasa': 'Ekstraklasa (Poland)',
  'soccer_romania_liga_1': 'Liga 1 (Romania)',
  'soccer_russia_premier_league': 'Premier League (Russia)',
  'soccer_sweden_allsvenskan': 'Allsvenskan (Sweden)',
  'soccer_switzerland_superleague': 'Super League (Switzerland)',
  'soccer_turkey_super_league': 'Süper Lig (Turkey)',
  'soccer_ukraine_premier_league': 'Premier League (Ukraine)',
} as const

export type OddsApiSportKey = keyof typeof ODDS_API_SPORTS

interface OddsApiConfig {
  apiKey: string
  baseUrl?: string
  regions?: string
  markets?: string
  oddsFormat?: 'decimal' | 'american'
  dateFormat?: 'iso' | 'unix'
}

const DEFAULT_CONFIG: Partial<OddsApiConfig> = {
  baseUrl: 'https://api.the-odds-api.com/v4',
  regions: 'us,uk,eu,au', // Múltiples regiones para más bookmakers
  markets: 'h2h,spreads,totals',
  oddsFormat: 'decimal',
  dateFormat: 'iso',
}

export class TheOddsApiConnector {
  private config: OddsApiConfig
  private requestCount = 0
  private lastRequestTime = 0
  private readonly minRequestInterval = 1000 // 1 second between requests

  constructor(config: OddsApiConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check rate limit and wait if necessary
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
   * Make authenticated request to The Odds API
   */
  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    await this.waitForRateLimit()

    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    url.searchParams.set('apiKey', this.config.apiKey)
    url.searchParams.set('regions', this.config.regions!)
    url.searchParams.set('markets', this.config.markets!)
    url.searchParams.set('oddsFormat', this.config.oddsFormat!)
    url.searchParams.set('dateFormat', this.config.dateFormat!)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
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
        throw new Error(`API Error ${response.status}: ${error}`)
      }

      // Track usage from headers
      const requestsUsed = response.headers.get('x-requests-used')
      const requestsRemaining = response.headers.get('x-requests-remaining')
      
      console.log(`[TheOddsAPI] Request ${this.requestCount}: ${latency}ms, Used: ${requestsUsed}, Remaining: ${requestsRemaining}`)

      return response.json()
    } catch (error) {
      console.error(`[TheOddsAPI] Request failed:`, error)
      throw error
    }
  }

  /**
   * Get upcoming events for a sport
   */
  async getUpcomingEvents(sportKey: OddsApiSportKey): Promise<OddsApiEvent[]> {
    return this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/odds/`)
  }

  /**
   * Get event odds by event ID
   */
  async getEventOdds(sportKey: OddsApiSportKey, eventId: string): Promise<OddsApiEvent> {
    return this.fetch<OddsApiEvent>(`/sports/${sportKey}/events/${eventId}/odds/`)
  }

  /**
   * Get list of available sports
   */
  async getSports(): Promise<{ key: string; title: string; description: string; active: boolean }[]> {
    return this.fetch('/sports/')
  }

  /**
   * Normalize event data from The Odds API
   */
  normalizeEvent(event: OddsApiEvent, sportKey: string): NormalizedEvent {
    return {
      externalId: event.id,
      sourceApi: 'the_odds_api',
      sportKey: sportKey,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: new Date(event.commence_time),
      status: 'scheduled',
    }
  }

  /**
   * Normalize odds data from The Odds API
   */
  normalizeOdds(event: OddsApiEvent): NormalizedOdds[] {
    const oddsList: NormalizedOdds[] = []
    const capturedAt = new Date()

    for (const bookmaker of event.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        const outcomes = market.outcomes
        
        // Find home/away/draw outcomes
        const homeOutcome = outcomes.find(o => o.name === event.home_team)
        const awayOutcome = outcomes.find(o => o.name === event.away_team)
        const drawOutcome = outcomes.find(o => o.name === 'Draw')

        if (!homeOutcome || !awayOutcome) continue

        const odds: NormalizedOdds = {
          eventId: event.id,
          bookmakerKey: bookmaker.key,
          bookmakerName: bookmaker.title,
          marketType: market.key as MarketKey,
          oddsHome: homeOutcome.price,
          oddsAway: awayOutcome.price,
          oddsDraw: drawOutcome?.price,
          capturedAt,
          sourceApi: 'the_odds_api',
        }

        // Handle point spreads and totals
        if (market.key === 'spreads' && homeOutcome.point) {
          odds.point = homeOutcome.point
        }
        
        if (market.key === 'totals') {
          const overOutcome = outcomes.find(o => o.name === 'Over')
          const underOutcome = outcomes.find(o => o.name === 'Under')
          if (overOutcome && underOutcome) {
            odds.point = overOutcome.point
            odds.oddsOver = overOutcome.price
            odds.oddsUnder = underOutcome.price
          }
        }

        oddsList.push(odds)
      }
    }

    return oddsList
  }

  /**
   * Sync all sports and return results
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      provider: 'the_odds_api',
      success: true,
      eventsProcessed: 0,
      oddsProcessed: 0,
      opportunitiesDetected: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    }

    const sportKeys = Object.keys(ODDS_API_SPORTS) as OddsApiSportKey[]

    for (const sportKey of sportKeys) {
      try {
        console.log(`[TheOddsAPI] Syncing ${sportKey}...`)
        const events = await this.getUpcomingEvents(sportKey)
        result.eventsProcessed += events.length
        
        for (const event of events) {
          const odds = this.normalizeOdds(event)
          result.oddsProcessed += odds.length
        }

        // Small delay between sports to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push(`${sportKey}: ${errorMessage}`)
        console.error(`[TheOddsAPI] Error syncing ${sportKey}:`, error)
      }
    }

    result.duration = Date.now() - startTime
    result.success = result.errors.length === 0

    return result
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    }
  }
}

// Factory function
export function createOddsApiConnector(apiKey: string): TheOddsApiConnector {
  return new TheOddsApiConnector({ apiKey })
}
