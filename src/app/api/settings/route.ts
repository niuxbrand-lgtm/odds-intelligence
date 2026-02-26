import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.userSettings.findFirst()
    
    if (!settings) {
      const defaultSettings = await db.userSettings.create({ data: {} })
      return NextResponse.json({ success: true, data: defaultSettings })
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = await db.userSettings.findFirst()

    if (!settings) {
      const newSettings = await db.userSettings.create({ data: body })
      return NextResponse.json({ success: true, data: newSettings })
    }

    const updated = await db.userSettings.update({
      where: { id: settings.id },
      data: body,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
