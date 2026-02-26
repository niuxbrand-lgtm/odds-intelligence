import { NextResponse } from 'next/server'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'unknown',
      odds_api: !!process.env.ODDS_API_KEY ? 'configured' : 'not_configured',
      telegram: !!process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured',
      email: !!process.env.RESEND_API_KEY ? 'configured' : 'not_configured',
    },
  }

  try {
    const { db } = await import('@/lib/db')
    await db.$queryRaw`SELECT 1`
    health.services.database = 'connected'
  } catch {
    health.status = 'degraded'
    health.services.database = 'error'
  }

  return NextResponse.json(health)
}
