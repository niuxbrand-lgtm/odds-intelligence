import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const events = await db.event.findMany({
      where: {
        status: 'scheduled',
        commenceTime: { gte: new Date() },
      },
      include: {
        competition: true,
        oddsSnapshots: {
          include: { bookmaker: true },
          orderBy: { capturedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { commenceTime: 'asc' },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      data: events,
      timestamp: new Date(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events', data: [] },
      { status: 500 }
    )
  }
}
