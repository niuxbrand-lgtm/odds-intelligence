import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
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

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    let settings = await db.userSettings.findFirst()

    if (!settings) {
      settings = await db.userSettings.create({ data: body })
    } else {
      settings = await db.userSettings.update({
        where: { id: settings.id },
        data: body,
      })
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}
