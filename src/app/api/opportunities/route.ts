import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const opportunities = await db.arbitrageOpportunity.findMany({
      where: { status: 'active' },
      include: {
        event: {
          include: {
            competition: true,
          },
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: opportunities,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch opportunities', data: [] },
      { status: 500 }
    )
  }
}
