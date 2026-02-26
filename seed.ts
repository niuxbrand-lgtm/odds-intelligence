/**
 * Seed Script - Odds Intelligence
 * 
 * Pobla la base de datos con datos de demostración para probar la aplicación.
 */

import { db } from './src/lib/db'

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // Crear deportes
  const sports = await Promise.all([
    db.sport.upsert({
      where: { key: 'esports_cs2' },
      update: {},
      create: { key: 'esports_cs2', name: 'Counter-Strike 2', category: 'esports', active: true },
    }),
    db.sport.upsert({
      where: { key: 'esports_lol' },
      update: {},
      create: { key: 'esports_lol', name: 'League of Legends', category: 'esports', active: true },
    }),
    db.sport.upsert({
      where: { key: 'mma_ufc' },
      update: {},
      create: { key: 'mma_ufc', name: 'UFC/MMA', category: 'combat_sports', active: true },
    }),
    db.sport.upsert({
      where: { key: 'tennis_challenger' },
      update: {},
      create: { key: 'tennis_challenger', name: 'ATP Challenger', category: 'tennis', active: true },
    }),
  ])

  console.log(`✅ Creados ${sports.length} deportes`)

  // Crear bookmakers
  const bookmakers = await Promise.all([
    db.bookmaker.upsert({
      where: { key: 'polymarket' },
      update: {},
      create: {
        key: 'polymarket',
        name: 'Polymarket',
        type: 'prediction_market',
        commission: 0.02,
        isActive: true,
      },
    }),
    db.bookmaker.upsert({
      where: { key: 'draftkings' },
      update: {},
      create: {
        key: 'draftkings',
        name: 'DraftKings',
        type: 'bookmaker',
        commission: 0,
        isActive: true,
      },
    }),
    db.bookmaker.upsert({
      where: { key: 'fanduel' },
      update: {},
      create: {
        key: 'fanduel',
        name: 'FanDuel',
        type: 'bookmaker',
        commission: 0,
        isActive: true,
      },
    }),
    db.bookmaker.upsert({
      where: { key: 'betmgm' },
      update: {},
      create: {
        key: 'betmgm',
        name: 'BetMGM',
        type: 'bookmaker',
        commission: 0,
        isActive: true,
      },
    }),
  ])

  console.log(`✅ Creados ${bookmakers.length} bookmakers`)

  // Crear tipos de mercado
  const marketTypes = await Promise.all([
    db.marketType.upsert({
      where: { key: 'h2h' },
      update: {},
      create: { key: 'h2h', name: 'Match Winner', isThreeWay: true, active: true },
    }),
    db.marketType.upsert({
      where: { key: 'spreads' },
      update: {},
      create: { key: 'spreads', name: 'Handicap', isThreeWay: false, active: true },
    }),
    db.marketType.upsert({
      where: { key: 'totals' },
      update: {},
      create: { key: 'totals', name: 'Over/Under', isThreeWay: false, active: true },
    }),
  ])

  console.log(`✅ Creados ${marketTypes.length} tipos de mercado`)

  // Crear competiciones
  const competition1 = await db.competition.create({
    data: {
      name: 'ESL Pro League Season 19',
      sportId: sports[0].id,
      country: 'Europe',
      tier: 1,
    },
  })

  const competition2 = await db.competition.create({
    data: {
      name: 'UFC Fight Night 240',
      sportId: sports[2].id,
      country: 'USA',
      tier: 2,
    },
  })

  const competition3 = await db.competition.create({
    data: {
      name: 'ATP Challenger Lyon',
      sportId: sports[3].id,
      country: 'France',
      tier: 2,
    },
  })

  console.log(`✅ Creadas 3 competiciones`)

  // Crear eventos
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const event1 = await db.event.create({
    data: {
      externalId: 'esl_csgo_001',
      competitionId: competition1.id,
      homeTeam: 'Natus Vincere',
      awayTeam: 'FaZe Clan',
      commenceTime: tomorrow,
      status: 'scheduled',
      sportKey: 'esports_cs2',
    },
  })

  const event2 = await db.event.create({
    data: {
      externalId: 'ufc_fn_001',
      competitionId: competition2.id,
      homePlayer: 'Jon Jones',
      awayPlayer: 'Stipe Miocic',
      commenceTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      status: 'scheduled',
      sportKey: 'mma_ufc',
    },
  })

  const event3 = await db.event.create({
    data: {
      externalId: 'atp_lyon_001',
      competitionId: competition3.id,
      homePlayer: 'Carlos Alcaraz',
      awayPlayer: 'Jannik Sinner',
      commenceTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      status: 'scheduled',
      sportKey: 'tennis_challenger',
    },
  })

  console.log(`✅ Creados 3 eventos`)

  // Crear odds snapshots (escenario de arbitraje)
  // Evento 1: NaVi vs FaZe - Arbitraje 2-way
  await db.oddsSnapshot.createMany({
    data: [
      {
        eventId: event1.id,
        bookmakerId: bookmakers[0].id, // Polymarket
        marketTypeId: marketTypes[0].id,
        oddsHome: 2.15, // NaVi
        oddsAway: 1.85, // FaZe
        impliedProbHome: 1 / 2.15,
        impliedProbAway: 1 / 1.85,
        margin: (1/2.15 + 1/1.85) - 1,
        capturedAt: now,
        sourceApi: 'polymarket',
      },
      {
        eventId: event1.id,
        bookmakerId: bookmakers[1].id, // DraftKings
        marketTypeId: marketTypes[0].id,
        oddsHome: 1.95, // NaVi - mejor cuota
        oddsAway: 1.95, // FaZe
        impliedProbHome: 1 / 1.95,
        impliedProbAway: 1 / 1.95,
        margin: (1/1.95 + 1/1.95) - 1,
        capturedAt: now,
        sourceApi: 'the_odds_api',
      },
    ],
  })

  // Evento 2: Jones vs Miocic - Arbitraje con diferentes bookmakers
  await db.oddsSnapshot.createMany({
    data: [
      {
        eventId: event2.id,
        bookmakerId: bookmakers[0].id, // Polymarket
        marketTypeId: marketTypes[0].id,
        oddsHome: 1.75, // Jones
        oddsAway: 2.25, // Miocic
        impliedProbHome: 1 / 1.75,
        impliedProbAway: 1 / 2.25,
        margin: (1/1.75 + 1/2.25) - 1,
        capturedAt: now,
        sourceApi: 'polymarket',
      },
      {
        eventId: event2.id,
        bookmakerId: bookmakers[2].id, // FanDuel
        marketTypeId: marketTypes[0].id,
        oddsHome: 1.65, // Jones
        oddsAway: 2.45, // Miocic - mejor cuota
        impliedProbHome: 1 / 1.65,
        impliedProbAway: 1 / 2.45,
        margin: (1/1.65 + 1/2.45) - 1,
        capturedAt: now,
        sourceApi: 'the_odds_api',
      },
    ],
  })

  // Evento 3: Alcaraz vs Sinner - Arbitraje 3-way con empate
  await db.oddsSnapshot.createMany({
    data: [
      {
        eventId: event3.id,
        bookmakerId: bookmakers[0].id, // Polymarket
        marketTypeId: marketTypes[0].id,
        oddsHome: 1.90, // Alcaraz
        oddsAway: 2.10, // Sinner
        impliedProbHome: 1 / 1.90,
        impliedProbAway: 1 / 2.10,
        margin: (1/1.90 + 1/2.10) - 1,
        capturedAt: now,
        sourceApi: 'polymarket',
      },
      {
        eventId: event3.id,
        bookmakerId: bookmakers[3].id, // BetMGM
        marketTypeId: marketTypes[0].id,
        oddsHome: 2.05, // Alcaraz - mejor
        oddsAway: 1.95, // Sinner
        impliedProbHome: 1 / 2.05,
        impliedProbAway: 1 / 1.95,
        margin: (1/2.05 + 1/1.95) - 1,
        capturedAt: now,
        sourceApi: 'the_odds_api',
      },
    ],
  })

  console.log(`✅ Creados odds snapshots`)

  // Crear oportunidades de arbitraje de ejemplo
  // Oportunidad 1: NaVi vs FaZe
  const probTotal1 = (1/2.15) + (1/1.95) // Best odds from different bookmakers
  const margin1 = 1 - probTotal1
  const profit1 = margin1 / probTotal1

  await db.arbitrageOpportunity.create({
    data: {
      eventId: event1.id,
      marketType: 'h2h',
      isThreeWay: false,
      bookmakerHomeId: bookmakers[0].id, // Polymarket - NaVi @ 2.15
      oddsHome: 2.15,
      bookmakerAwayId: bookmakers[1].id, // DraftKings - FaZe @ 1.95
      oddsAway: 1.95,
      totalImpliedProb: probTotal1,
      arbitrageMargin: margin1,
      profitPercentage: profit1,
      recommendedStakeHome: 100 * (1/2.15) / probTotal1,
      recommendedStakeAway: 100 * (1/1.95) / probTotal1,
      expectedProfit: 100 * profit1,
      commissionAdjustment: 0.02,
      slippageEstimate: 0.005,
      latencyRisk: 'low',
      liquidityScore: 75,
      qualityScore: 78,
      qualityGrade: 'B',
      status: 'active',
      detectedAt: now,
    },
  })

  // Oportunidad 2: Jones vs Miocic
  const probTotal2 = (1/1.75) + (1/2.45)
  const margin2 = 1 - probTotal2
  const profit2 = margin2 / probTotal2

  await db.arbitrageOpportunity.create({
    data: {
      eventId: event2.id,
      marketType: 'h2h',
      isThreeWay: false,
      bookmakerHomeId: bookmakers[0].id, // Polymarket - Jones @ 1.75
      oddsHome: 1.75,
      bookmakerAwayId: bookmakers[2].id, // FanDuel - Miocic @ 2.45
      oddsAway: 2.45,
      totalImpliedProb: probTotal2,
      arbitrageMargin: margin2,
      profitPercentage: profit2,
      recommendedStakeHome: 100 * (1/1.75) / probTotal2,
      recommendedStakeAway: 100 * (1/2.45) / probTotal2,
      expectedProfit: 100 * profit2,
      commissionAdjustment: 0.02,
      slippageEstimate: 0.005,
      latencyRisk: 'medium',
      liquidityScore: 60,
      qualityScore: 65,
      qualityGrade: 'B',
      status: 'active',
      detectedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago
    },
  })

  // Oportunidad 3: Alcaraz vs Sinner
  const probTotal3 = (1/2.05) + (1/2.10)
  const margin3 = 1 - probTotal3
  const profit3 = margin3 / probTotal3

  await db.arbitrageOpportunity.create({
    data: {
      eventId: event3.id,
      marketType: 'h2h',
      isThreeWay: false,
      bookmakerHomeId: bookmakers[3].id, // BetMGM - Alcaraz @ 2.05
      oddsHome: 2.05,
      bookmakerAwayId: bookmakers[0].id, // Polymarket - Sinner @ 2.10
      oddsAway: 2.10,
      totalImpliedProb: probTotal3,
      arbitrageMargin: margin3,
      profitPercentage: profit3,
      recommendedStakeHome: 100 * (1/2.05) / probTotal3,
      recommendedStakeAway: 100 * (1/2.10) / probTotal3,
      expectedProfit: 100 * profit3,
      commissionAdjustment: 0.02,
      slippageEstimate: 0.003,
      latencyRisk: 'low',
      liquidityScore: 85,
      qualityScore: 88,
      qualityGrade: 'A',
      status: 'active',
      detectedAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 min ago
    },
  })

  console.log(`✅ Creadas 3 oportunidades de arbitraje`)

  // Crear configuración de usuario por defecto
  await db.userSettings.create({
    data: {
      minMargin: 0.01,
      maxLatencyRisk: 'medium',
      minLiquidity: 30,
      maxStakePerBet: 100,
      maxDailyExposure: 1000,
      telegramEnabled: false,
      emailEnabled: false,
      webhookEnabled: false,
      timezone: 'Europe/Madrid',
    },
  })

  console.log(`✅ Creada configuración de usuario`)

  // Crear sync state
  await db.syncState.createMany({
    data: [
      {
        provider: 'the_odds_api',
        lastSyncAt: now,
        lastSuccessAt: now,
        totalSyncs: 1,
        isActive: true,
      },
      {
        provider: 'polymarket',
        lastSyncAt: now,
        lastSuccessAt: now,
        totalSyncs: 1,
        isActive: true,
      },
    ],
  })

  console.log(`✅ Creados estados de sincronización`)

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log(`   - ${sports.length} deportes`)
  console.log(`   - ${bookmakers.length} bookmakers`)
  console.log(`   - ${marketTypes.length} tipos de mercado`)
  console.log(`   - 3 competiciones`)
  console.log(`   - 3 eventos`)
  console.log(`   - 3 oportunidades de arbitraje activas`)
  console.log('\n🚀 La aplicación está lista para usar!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
