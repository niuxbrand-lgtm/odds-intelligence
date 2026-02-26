import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createAlertDispatcher } from '@/lib/alerts/notifier'

export async function GET() {
  try {
    const alerts = await db.alert.findMany({
      include: {
        opportunity: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: alerts,
      timestamp: new Date(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityId, channel, recipient } = body

    const opportunity = await db.arbitrageOpportunity.findUnique({
      where: { id: opportunityId },
      include: { event: { include: { competition: true } } },
    })

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 })
    }

    const alert = await db.alert.create({
      data: {
        opportunityId,
        channel,
        recipient,
        title: `Arbitraje ${opportunity.profitPercentage.toFixed(2)}%`,
        message: `Oportunidad detectada en ${opportunity.event.homeTeam}`,
        status: 'pending',
      },
    })

    const dispatcher = createAlertDispatcher({
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      emailApiKey: process.env.RESEND_API_KEY,
    })

    const oppData = {
      id: opportunity.id,
      eventId: opportunity.eventId,
      event: {
        homeTeam: opportunity.event.homeTeam || '',
        awayTeam: opportunity.event.awayTeam || '',
        homePlayer: opportunity.event.homePlayer || undefined,
        awayPlayer: opportunity.event.awayPlayer || undefined,
        commenceTime: opportunity.event.commenceTime,
        sportKey: opportunity.event.sportKey,
        competition: opportunity.event.competition?.name,
      },
      marketType: opportunity.marketType,
      isThreeWay: opportunity.isThreeWay,
      arbitrageMargin: opportunity.arbitrageMargin,
      profitPercentage: opportunity.profitPercentage,
      qualityGrade: opportunity.qualityGrade as 'A' | 'B' | 'C' | 'D' | 'F',
      qualityScore: opportunity.qualityScore,
      oddsHome: opportunity.oddsHome,
      oddsAway: opportunity.oddsAway,
      oddsDraw: opportunity.oddsDraw || undefined,
      bookmakerHome: opportunity.bookmakerHomeId,
      bookmakerAway: opportunity.bookmakerAwayId,
      bookmakerDraw: opportunity.bookmakerDrawId || undefined,
      recommendedStakeHome: opportunity.recommendedStakeHome,
      recommendedStakeAway: opportunity.recommendedStakeAway,
      recommendedStakeDraw: opportunity.recommendedStakeDraw || undefined,
      expectedProfit: opportunity.expectedProfit,
      detectedAt: opportunity.detectedAt,
      latencyRisk: opportunity.latencyRisk as 'low' | 'medium' | 'high',
      liquidityScore: opportunity.liquidityScore,
    }

    let result = { success: false, error: 'Unknown channel' }
    if (channel === 'telegram') result = await dispatcher.sendTelegramAlert(recipient, oppData)
    else if (channel === 'email') result = await dispatcher.sendEmailAlert(recipient, oppData)

    await db.alert.update({
      where: { id: alert.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
      },
    })

    return NextResponse.json({ success: result.success, data: alert, error: result.error })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send alert' }, { status: 500 })
  }
}
