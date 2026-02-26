/**
 * Alert System - Odds Intelligence
 * 
 * Sistema de alertas para notificar oportunidades de arbitraje.
 * Canales soportados: Telegram, Email, Webhook
 */

import type { AlertPayload, TelegramMessage, OpportunityWithDetails, AlertChannel } from '@/types'

// ==================== TELEGRAM BOT ====================

export class TelegramNotifier {
  private botToken: string
  private apiUrl: string

  constructor(botToken: string) {
    this.botToken = botToken
    this.apiUrl = `https://api.telegram.org/bot${botToken}`
  }

  /**
   * Send message to Telegram chat
   */
  async sendMessage(message: TelegramMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: message.parseMode || 'Markdown',
          disable_web_page_preview: true,
        }),
      })

      const data = await response.json()

      if (!data.ok) {
        return { success: false, error: data.description || 'Unknown Telegram error' }
      }

      return { success: true, messageId: String(data.result.message_id) }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Format opportunity as Telegram message
   */
  formatOpportunityMessage(opp: OpportunityWithDetails): string {
    const eventDisplay = opp.event.homePlayer || opp.event.homeTeam
    const opponentDisplay = opp.event.awayPlayer || opp.event.awayTeam
    
    const lines = [
      `🚨 *OPORTUNIDAD DE ARBITRAJE*`,
      ``,
      `📊 *Evento:* ${eventDisplay} vs ${opponentDisplay}`,
      `🏆 *Deporte:* ${opp.event.sportKey}`,
      `📈 *Mercado:* ${opp.marketType}`,
      ``,
      `💰 *Beneficio:* ${opp.profitPercentage.toFixed(2)}%`,
      `⏱️ *Margen:* ${opp.arbitrageMargin.toFixed(4)}`,
      `🏅 *Calidad:* ${opp.qualityGrade} (${opp.qualityScore}/100)`,
      ``,
      `📌 *Mejores Cuotas:*`,
      `   📍 Casa: ${opp.oddsHome.toFixed(2)} @ ${opp.bookmakerHome}`,
      `   📍 Visitante: ${opp.oddsAway.toFixed(2)} @ ${opp.bookmakerAway}`,
    ]

    if (opp.oddsDraw && opp.bookmakerDraw) {
      lines.push(`   📍 Empate: ${opp.oddsDraw.toFixed(2)} @ ${opp.bookmakerDraw}`)
    }

    lines.push(``)
    lines.push(`💵 *Stakes recomendados (total $100):*`)
    lines.push(`   🏠 ${opp.recommendedStakeHome.toFixed(2)} @ ${opp.bookmakerHome}`)
    lines.push(`   🏃 ${opp.recommendedStakeAway.toFixed(2)} @ ${opp.bookmakerAway}`)
    
    if (opp.recommendedStakeDraw) {
      lines.push(`   🤝 ${opp.recommendedStakeDraw.toFixed(2)} @ ${opp.bookmakerDraw}`)
    }

    lines.push(``)
    lines.push(`💵 *Ganancia esperada:* $${opp.expectedProfit.toFixed(2)}`)
    lines.push(`⚡ *Riesgo latencia:* ${opp.latencyRisk}`)
    lines.push(`💧 *Liquidez:* ${opp.liquidityScore}/100`)
    lines.push(``)
    lines.push(`⏰ Detectado: ${new Date(opp.detectedAt).toLocaleString('es-ES')}`)

    return lines.join('\n')
  }

  /**
   * Send arbitrage alert to Telegram
   */
  async sendArbitrageAlert(chatId: string, opportunity: OpportunityWithDetails): Promise<{ success: boolean; error?: string }> {
    const text = this.formatOpportunityMessage(opportunity)
    return this.sendMessage({ chatId, text, parseMode: 'Markdown' })
  }
}

// ==================== EMAIL NOTIFIER ====================

export class EmailNotifier {
  private apiKey: string
  private fromEmail: string
  private apiUrl: string = 'https://api.resend.com/emails'

  constructor(apiKey: string, fromEmail: string = 'alerts@oddsintelligence.com') {
    this.apiKey = apiKey
    this.fromEmail = fromEmail
  }

  /**
   * Send email via Resend API
   */
  async sendEmail(params: {
    to: string
    subject: string
    html: string
    text: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.message || 'Email API error' }
      }

      return { success: true, messageId: data.id }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Format opportunity as HTML email
   */
  formatOpportunityEmail(opp: OpportunityWithDetails): { subject: string; html: string; text: string } {
    const eventDisplay = opp.event.homePlayer || opp.event.homeTeam
    const opponentDisplay = opp.event.awayPlayer || opp.event.awayTeam
    
    const subject = `[${opp.qualityGrade}] Arbitraje ${opp.profitPercentage.toFixed(1)}% - ${eventDisplay} vs ${opponentDisplay}`

    const text = `
OPORTUNIDAD DE ARBITRAJE DETECTADA

Evento: ${eventDisplay} vs ${opponentDisplay}
Deporte: ${opp.event.sportKey}
Mercado: ${opp.marketType}

Beneficio: ${opp.profitPercentage.toFixed(2)}%
Margen: ${opp.arbitrageMargin.toFixed(4)}
Calidad: ${opp.qualityGrade} (${opp.qualityScore}/100)

MEJORES CUOTAS:
- Casa: ${opp.oddsHome.toFixed(2)} @ ${opp.bookmakerHome}
- Visitante: ${opp.oddsAway.toFixed(2)} @ ${opp.bookmakerAway}
${opp.oddsDraw ? `- Empate: ${opp.oddsDraw.toFixed(2)} @ ${opp.bookmakerDraw}` : ''}

STAKES RECOMENDADOS (total $100):
- Casa: $${opp.recommendedStakeHome.toFixed(2)}
- Visitante: $${opp.recommendedStakeAway.toFixed(2)}
${opp.recommendedStakeDraw ? `- Empate: $${opp.recommendedStakeDraw.toFixed(2)}` : ''}

Ganancia esperada: $${opp.expectedProfit.toFixed(2)}
Riesgo latencia: ${opp.latencyRisk}
Liquidez: ${opp.liquidityScore}/100

Detectado: ${new Date(opp.detectedAt).toLocaleString('es-ES')}
    `.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
    .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
    .odds-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
    .odds-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .quality-a { color: #10b981; }
    .quality-b { color: #3b82f6; }
    .quality-c { color: #f59e0b; }
    .quality-d, .quality-f { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 Oportunidad de Arbitraje</h1>
    <p style="font-size: 24px; margin: 10px 0 0 0;">${eventDisplay} vs ${opponentDisplay}</p>
  </div>
  
  <div class="content">
    <div class="highlight">
      <strong style="font-size: 18px;">Beneficio garantizado: ${opp.profitPercentage.toFixed(2)}%</strong><br>
      <span>Calidad: <strong class="quality-${opp.qualityGrade.toLowerCase()}">${opp.qualityGrade}</strong> (${opp.qualityScore}/100)</span>
    </div>
    
    <h3>📊 Detalles del Evento</h3>
    <p>
      <strong>Deporte:</strong> ${opp.event.sportKey}<br>
      <strong>Mercado:</strong> ${opp.marketType}<br>
      <strong>Margen:</strong> ${opp.arbitrageMargin.toFixed(4)}
    </p>
    
    <h3>📌 Mejores Cuotas</h3>
    <div class="odds-grid">
      <div class="odds-card">
        <strong>Casa</strong><br>
        <span style="font-size: 24px; color: #10b981;">${opp.oddsHome.toFixed(2)}</span><br>
        <small>${opp.bookmakerHome}</small>
      </div>
      <div class="odds-card">
        <strong>Visitante</strong><br>
        <span style="font-size: 24px; color: #3b82f6;">${opp.oddsAway.toFixed(2)}</span><br>
        <small>${opp.bookmakerAway}</small>
      </div>
      ${opp.oddsDraw ? `
      <div class="odds-card">
        <strong>Empate</strong><br>
        <span style="font-size: 24px; color: #8b5cf6;">${opp.oddsDraw.toFixed(2)}</span><br>
        <small>${opp.bookmakerDraw}</small>
      </div>
      ` : ''}
    </div>
    
    <h3>💵 Stakes Recomendados (Total: $100)</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #e5e7eb;">
        <th style="padding: 10px; text-align: left;">Outcome</th>
        <th style="padding: 10px; text-align: right;">Stake</th>
        <th style="padding: 10px; text-align: right;">Cuota</th>
      </tr>
      <tr>
        <td style="padding: 10px;">${opp.bookmakerHome}</td>
        <td style="padding: 10px; text-align: right;">$${opp.recommendedStakeHome.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right;">${opp.oddsHome.toFixed(2)}</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 10px;">${opp.bookmakerAway}</td>
        <td style="padding: 10px; text-align: right;">$${opp.recommendedStakeAway.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right;">${opp.oddsAway.toFixed(2)}</td>
      </tr>
      ${opp.recommendedStakeDraw ? `
      <tr>
        <td style="padding: 10px;">${opp.bookmakerDraw}</td>
        <td style="padding: 10px; text-align: right;">$${opp.recommendedStakeDraw.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right;">${opp.oddsDraw?.toFixed(2)}</td>
      </tr>
      ` : ''}
    </table>
    
    <div class="highlight" style="margin-top: 20px;">
      <strong>Ganancia esperada: $${opp.expectedProfit.toFixed(2)}</strong>
    </div>
    
    <h3>⚠️ Indicadores de Riesgo</h3>
    <p>
      <strong>Riesgo de latencia:</strong> ${opp.latencyRisk}<br>
      <strong>Score de liquidez:</strong> ${opp.liquidityScore}/100
    </p>
    
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px;">
      Detectado: ${new Date(opp.detectedAt).toLocaleString('es-ES')}<br>
      Odds Intelligence - Detección de arbitraje deportivo
    </p>
  </div>
</body>
</html>
    `.trim()

    return { subject, html, text }
  }

  /**
   * Send arbitrage alert email
   */
  async sendArbitrageAlert(to: string, opportunity: OpportunityWithDetails): Promise<{ success: boolean; error?: string }> {
    const { subject, html, text } = this.formatOpportunityEmail(opportunity)
    const result = await this.sendEmail({ to, subject, html, text })
    return { success: result.success, error: result.error }
  }
}

// ==================== WEBHOOK NOTIFIER ====================

export class WebhookNotifier {
  async sendWebhook(
    url: string,
    payload: AlertPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'arbitrage_opportunity',
          data: payload.data,
        }),
      })

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }
}

// ==================== ALERT DISPATCHER ====================

export interface AlertDispatcherConfig {
  telegramBotToken?: string
  emailApiKey?: string
  emailFrom?: string
}

export class AlertDispatcher {
  private telegram?: TelegramNotifier
  private email?: EmailNotifier
  private webhook: WebhookNotifier

  constructor(config: AlertDispatcherConfig) {
    if (config.telegramBotToken) {
      this.telegram = new TelegramNotifier(config.telegramBotToken)
    }
    if (config.emailApiKey) {
      this.email = new EmailNotifier(config.emailApiKey, config.emailFrom)
    }
    this.webhook = new WebhookNotifier()
  }

  /**
   * Dispatch alert to multiple channels
   */
  async dispatch(payload: AlertPayload): Promise<Map<AlertChannel, { success: boolean; error?: string }>> {
    const results = new Map<AlertChannel, { success: boolean; error?: string }>()

    for (const channel of payload.channels) {
      switch (channel) {
        case 'telegram':
          if (this.telegram) {
            // Telegram would need chatId from payload
            results.set(channel, { success: false, error: 'Chat ID not configured' })
          }
          break

        case 'email':
          if (this.email) {
            // Email would need address from payload
            results.set(channel, { success: false, error: 'Email not configured' })
          }
          break

        case 'webhook':
          // Webhook URL would come from settings
          results.set(channel, { success: false, error: 'Webhook URL not configured' })
          break

        default:
          results.set(channel, { success: false, error: 'Unknown channel' })
      }
    }

    return results
  }

  /**
   * Send Telegram alert to specific chat
   */
  async sendTelegramAlert(chatId: string, opportunity: OpportunityWithDetails): Promise<{ success: boolean; error?: string }> {
    if (!this.telegram) {
      return { success: false, error: 'Telegram not configured' }
    }
    return this.telegram.sendArbitrageAlert(chatId, opportunity)
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(to: string, opportunity: OpportunityWithDetails): Promise<{ success: boolean; error?: string }> {
    if (!this.email) {
      return { success: false, error: 'Email not configured' }
    }
    return this.email.sendArbitrageAlert(to, opportunity)
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(url: string, payload: AlertPayload): Promise<{ success: boolean; error?: string }> {
    return this.webhook.sendWebhook(url, payload)
  }
}

// Factory function
export function createAlertDispatcher(config: AlertDispatcherConfig): AlertDispatcher {
  return new AlertDispatcher(config)
}
