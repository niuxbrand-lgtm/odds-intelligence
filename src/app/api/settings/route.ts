import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Try to get settings, create table if needed
    try {
      const settings = await db.userSettings.findFirst()
      if (settings) {
        return NextResponse.json({ success: true, data: settings })
      }
    } catch (e) {
      // Table doesn't exist, create it
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
        )
      `)
    }

    // Create default settings
    const result = await db.$queryRaw`SELECT * FROM "UserSettings" LIMIT 1`
    if ((result as any[]).length === 0) {
      await db.$executeRawUnsafe(`
        INSERT INTO "UserSettings" ("minMargin", "telegramEnabled", "telegramChatId", "emailEnabled")
        VALUES (0.02, false, '', false)
      `)
      const newResult = await db.$queryRaw`SELECT * FROM "UserSettings" LIMIT 1`
      return NextResponse.json({ success: true, data: (newResult as any[])[0] })
    }
    
    return NextResponse.json({ success: true, data: (result as any[])[0] })
  } catch (error) {
    console.error('Settings error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Update using raw SQL
    const sets = []
    if (body.minMargin !== undefined) sets.push(`"minMargin" = ${body.minMargin}`)
    if (body.telegramEnabled !== undefined) sets.push(`"telegramEnabled" = ${body.telegramEnabled}`)
    if (body.telegramChatId !== undefined) sets.push(`"telegramChatId" = '${body.telegramChatId}'`)
    if (body.emailEnabled !== undefined) sets.push(`"emailEnabled" = ${body.emailEnabled}`)
    
    if (sets.length > 0) {
      await db.$executeRawUnsafe(`
        UPDATE "UserSettings" 
        SET ${sets.join(', ')}, "updatedAt" = NOW()
      `)
    }
    
    const result = await db.$queryRaw`SELECT * FROM "UserSettings" LIMIT 1`
    return NextResponse.json({ success: true, data: (result as any[])[0] })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed' 
    }, { status: 500 })
  }
}
