import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const services = {
    database: 'error',
    odds_api: 'not_configured',
    telegram: 'not_configured',
    email: 'not_configured',
  }

  // Test database
  try {
    // Try a simple query
    await db.$queryRaw`SELECT 1`
    
    // Try to get or create settings
    let settings = await db.userSettings.findFirst()
    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          minMargin: 0.02,
          telegramEnabled: false,
          telegramChatId: '',
          emailEnabled: false,
        }
      })
    }
    services.database = 'connected'
  } catch (dbError) {
    console.error('Database error:', dbError)
    services.database = 'error'
  }

  // Check ODDS_API_KEY
  if (process.env.ODDS_API_KEY && process.env.ODDS_API_KEY.length > 10) {
    services.odds_api = 'configured'
  }

  // Check TELEGRAM_BOT_TOKEN
  if (process.env.TELEGRAM_BOT_TOKEN) {
    services.telegram = 'configured'
  }

  const allOk = services.database === 'connected'

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date(),
    version: '1.0.0',
    services,
  })
}
