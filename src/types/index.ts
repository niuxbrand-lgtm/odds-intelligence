// Odds Intelligence - TypeScript Types

// ==================== CORE TYPES ====================

export type SportCategory = 'esports' | 'combat_sports' | 'tennis' | 'football'
export type BookmakerType = 'bookmaker' | 'exchange' | 'prediction_market'
export type MarketKey = 'h2h' | 'spreads' | 'totals' | 'map_winner' | 'round_betting'
export type OpportunityStatus = 'active' | 'expired' | 'executed' | 'dismissed'
export type AlertChannel = 'telegram' | 'email' | 'webhook' | 'push'
export type AlertStatus = 'pending' | 'sent' | 'failed'
export type LatencyRisk = 'low' | 'medium' | 'high'
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

// ==================== API RESPONSE TYPES ====================

// The Odds API Response Types
export interface OddsApiEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsApiBookmaker[]
}

export interface OddsApiBookmaker {
  key: string
  title: string
  last_update: string
  markets: OddsApiMarket[]
}

export interface OddsApiMarket {
  key: MarketKey
  last_update: string
  outcomes: OddsApiOutcome[]
}

export interface OddsApiOutcome {
  name: string
  price: number
  point?: number
}

// Polymarket API Response Types
export interface PolymarketMarket {
  id: string
  question: string
  description?: string
  outcomes: string[]
  outcomePrices: string[] // JSON string array of prices
  active: boolean
  closed: boolean
  archived: boolean
  minimumBond?: number
  minimumBondType?: string
  endDate?: string
  image?: string
  icon?: string
  tags?: string[]
}

export interface PolymarketOrderBook {
  market: string
  asset_id: string
  bids: PolymarketOrder[]
  asks: PolymarketOrder[]
}

export interface PolymarketOrder {
  price: string
  size: string
}

// ==================== INTERNAL DATA TYPES ====================

export interface NormalizedEvent {
  externalId: string
  sourceApi: 'the_odds_api' | 'polymarket' | 'manual'
  sportKey: string
  competition?: string
  homeTeam?: string
  awayTeam?: string
  homePlayer?: string
  awayPlayer?: string
  commenceTime: Date
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
}

export interface NormalizedOdds {
  eventId: string
  bookmakerKey: string
  bookmakerName: string
  marketType: MarketKey
  oddsHome: number
  oddsAway: number
  oddsDraw?: number
  point?: number
  oddsOver?: number
  oddsUnder?: number
  capturedAt: Date
  sourceApi: 'the_odds_api' | 'polymarket' | 'manual'
  rawResponse?: string
}

export interface OddsWithBookmaker extends NormalizedOdds {
  bookmakerId: string
  marketTypeId: string
  commission: number
  impliedProbHome: number
  impliedProbAway: number
  impliedProbDraw?: number
}

// ==================== ARBITRAGE TYPES ====================

export interface ArbitrageInput {
  eventId: string
  marketType: MarketKey
  isThreeWay: boolean
  odds: {
    bookmakerId: string
    bookmakerKey: string
    oddsHome: number
    oddsAway: number
    oddsDraw?: number
    commission: number
    capturedAt: Date
  }[]
}

export interface ArbitrageCalculation {
  totalImpliedProb: number
  arbitrageMargin: number
  profitPercentage: number
  isArbitrage: boolean
  
  // Best odds found
  bestOddsHome: { odds: number; bookmakerId: string; bookmakerKey: string }
  bestOddsAway: { odds: number; bookmakerId: string; bookmakerKey: string }
  bestOddsDraw?: { odds: number; bookmakerId: string; bookmakerKey: string }
  
  // Stakes for $100 total
  stakeHome: number
  stakeAway: number
  stakeDraw?: number
  expectedProfit: number
  
  // Adjustments
  commissionAdjusted: number
  slippageEstimate: number
  adjustedProfit: number
}

export interface OpportunityWithDetails {
  id: string
  eventId: string
  event: {
    homeTeam: string
    awayTeam?: string
    homePlayer?: string
    awayPlayer?: string
    commenceTime: Date
    sportKey: string
    competition?: string
  }
  marketType: string
  isThreeWay: boolean
  arbitrageMargin: number
  profitPercentage: number
  qualityGrade: QualityGrade
  qualityScore: number
  oddsHome: number
  oddsAway: number
  oddsDraw?: number
  bookmakerHome: string
  bookmakerAway: string
  bookmakerDraw?: string
  recommendedStakeHome: number
  recommendedStakeAway: number
  recommendedStakeDraw?: number
  expectedProfit: number
  detectedAt: Date
  expiresAt?: Date
  latencyRisk: LatencyRisk
  liquidityScore: number
}

// ==================== ALERT TYPES ====================

export interface AlertConfig {
  minMargin: number
  maxLatencyRisk: LatencyRisk
  minLiquidity: number
  sportsFilter?: string[]
  marketsFilter?: string[]
  bookmakersFilter?: string[]
  telegramEnabled: boolean
  telegramChatId?: string
  emailEnabled: boolean
  emailAddress?: string
  webhookEnabled: boolean
  webhookUrl?: string
}

export interface AlertPayload {
  opportunityId: string
  title: string
  message: string
  data: OpportunityWithDetails
  channels: AlertChannel[]
}

export interface TelegramMessage {
  chatId: string
  text: string
  parseMode?: 'Markdown' | 'HTML'
}

// ==================== SYNC TYPES ====================

export interface SyncResult {
  provider: string
  sportKey?: string
  success: boolean
  eventsProcessed: number
  oddsProcessed: number
  opportunitiesDetected: number
  errors: string[]
  duration: number
  timestamp: Date
}

export interface SyncConfig {
  provider: 'the_odds_api' | 'polymarket'
  sportKeys?: string[]
  intervalMs: number
  enabled: boolean
}

// ==================== SETTINGS TYPES ====================

export interface UserSettingsInput {
  minMargin?: number
  maxLatencyRisk?: LatencyRisk
  minLiquidity?: number
  sportsFilter?: string[]
  marketsFilter?: string[]
  bookmakersFilter?: string[]
  maxStakePerBet?: number
  maxDailyExposure?: number
  telegramChatId?: string
  telegramEnabled?: boolean
  emailEnabled?: boolean
  emailAddress?: string
  webhookUrl?: string
  webhookEnabled?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
}

// ==================== STATS TYPES ====================

export interface DashboardStats {
  activeOpportunities: number
  opportunitiesLast24h: number
  avgProfitPercentage: number
  avgLatency: number
  topSports: { sport: string; count: number }[]
  topBookmakers: { bookmaker: string; count: number }[]
  recentAlerts: number
  systemHealth: 'healthy' | 'degraded' | 'down'
}

// ==================== API TYPES ====================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
