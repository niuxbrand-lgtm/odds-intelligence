/**
 * Seed Script - Odds Intelligence
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // Crear deportes
  const sports = await Promise.all([
    prisma.sport.upsert({
      where: { key: 'esports_cs2' },
      update: {},
      create: { key: 'esports_cs2', name: 'Counter-Strike 2', category: 'esports', active: true },
    }),
    prisma.sport.upsert({
      where: { key: 'esports_lol' },
      update: {},
      create: { key: 'esports_lol', name: 'League of Legends', category: 'esports', active: true },
    }),
    prisma.sport.upsert({
      where: { key: 'mma_ufc' },
      update: {},
      create: { key: 'mma_ufc', name: 'UFC/MMA', category: 'combat_sports', active: true },
    }),
    prisma.sport.upsert({
      where: { key: 'tennis_atp' },
      update: {},
      create: { key: 'tennis_atp', name: 'ATP Tennis', category: 'tennis', active: true },
    }),
  ])
  console.log(`✅ Creados ${sports.length} deportes`)

  // Crear bookmakers
  const bookmakers = await Promise.all([
    prisma.bookmaker.upsert({
      where: { key: 'polymarket' },
      update: {},
      create: { key: 'polymarket', name: 'Polymarket', type: 'prediction_market', commission: 0.02 },
    }),
    prisma.bookmaker.upsert({
      where: { key: 'draftkings' },
      update: {},
      create: { key: 'draftkings', name: 'DraftKings', type: 'bookmaker', commission: 0 },
    }),
    prisma.bookmaker.upsert({
      where: { key: 'fanduel' },
      update: {},
      create: { key: 'fanduel', name: 'FanDuel', type: 'bookmaker', commission: 0 },
    }),
    prisma.bookmaker.upsert({
      where: { key: 'betmgm' },
      update: {},
      create: { key: 'betmgm', name: 'BetMGM', type: 'bookmaker', commission: 0 },
    }),
  ])
  console.log(`✅ Creados ${bookmakers.length} bookmakers`)

  // Crear tipos de mercado
  const marketTypes = await Promise.all([
    prisma.marketType.upsert({
      where: { key: 'h2h' },
      update: {},
      create: { key: 'h2h', name: 'Match Winner', isThreeWay: true, active: true },
    }),
    prisma.marketType.upsert({
      where: { key: 'spreads' },
      update: {},
      create: { key: 'spreads', name: 'Handicap', isThreeWay: false, active: true },
    }),
    prisma.marketType.upsert({
      where: { key: 'totals' },
      update: {},
      create: { key: 'totals', name: 'Over/Under', isThreeWay: false, active: true },
    }),
  ])
  console.log(`✅ Creados ${marketTypes.length} tipos de mercado`)

  // Crear competición por defecto
  let defaultCompetition = await prisma.competition.findFirst()
  if (!defaultCompetition) {
    defaultCompetition = await prisma.competition.create({
      data: { name: 'Eventos Varios', sportId: sports[0].id }
    })
    console.log(`✅ Creada competición por defecto`)
  }

  // Crear configuración de usuario por defecto
  const existingSettings = await prisma.userSettings.findFirst()
  if (!existingSettings) {
    await prisma.userSettings.create({
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
  }

  // Crear sync states
  await prisma.syncState.upsert({
    where: { provider_sportKey: { provider: 'the_odds_api', sportKey: '' } },
    create: { provider: 'the_odds_api', sportKey: '', isActive: true },
    update: {},
  })
  
  await prisma.syncState.upsert({
    where: { provider_sportKey: { provider: 'polymarket', sportKey: '' } },
    create: { provider: 'polymarket', sportKey: '', isActive: true },
    update: {},
  })
  console.log(`✅ Creados estados de sincronización`)

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log(`   - ${sports.length} deportes`)
  console.log(`   - ${bookmakers.length} bookmakers`)
  console.log(`   - ${marketTypes.length} tipos de mercado`)
  console.log('\n🚀 La aplicación está lista para usar!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
