import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const existingSettings = await db.userSettings.findFirst()
    if (!existingSettings) {
      const settings = await db.userSettings.create({
        data: { 
          minMargin: 0.02, 
          telegramEnabled: false, 
          telegramChatId: "", 
          emailEnabled: false 
        }
      })
      return NextResponse.json({ 
        success: true, 
        message: "Database initialized", 
        data: settings 
      })
    }
    return NextResponse.json({ 
      success: true, 
      message: "Database already initialized", 
      data: existingSettings 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Setup failed" 
    }, { status: 500 })
  }
}
