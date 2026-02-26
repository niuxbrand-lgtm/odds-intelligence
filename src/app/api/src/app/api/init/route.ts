import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Create tables using raw SQL
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSettings" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "minMargin" DOUBLE PRECISION DEFAULT 0.02,
        "maxLatencyRisk" TEXT DEFAULT 'medium',
        "minLiquidity" INTEGER DEFAULT 30,
        "sportsFilter" TEXT,
        "marketsFilter" TEXT,
        "bookmakersFilter" TEXT,
        "maxStakePerBet" DOUBLE PRECISION DEFAULT 100,
        "maxDailyExposure" DOUBLE PRECISION DEFAULT 1000,
        "telegramChatId" TEXT,
        "telegramEnabled" BOOLEAN DEFAULT false,
        "emailEnabled" BOOLEAN DEFAULT false,
        "emailAddress" TEXT,
        "webhookUrl" TEXT,
        "webhookEnabled" BOOLEAN DEFAULT false,
        "quietHoursStart" TEXT,
        "quietHoursEnd" TEXT,
        "timezone" TEXT DEFAULT 'Europe/Madrid',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `)

    // Create default settings
    const existing = await db.$queryRaw`SELECT * FROM "UserSettings" LIMIT 1`
    
    if (!existing || (existing as any[]).length === 0) {
      await db.$executeRawUnsafe(`
        INSERT INTO "UserSettings" ("minMargin", "telegramEnabled", "telegramChatId", "emailEnabled")
        VALUES (0.02, false, '', false)
      `)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Init failed',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
