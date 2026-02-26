'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'

interface Alert {
  id: string
  opportunityId: string
  channel: string
  recipient: string
  title: string
  message: string
  status: string
  sentAt?: string
  errorMessage?: string
  createdAt: string
  opportunity?: {
    event?: {
      homeTeam?: string
      awayTeam?: string
    }
  }
}

export function AlertsHistory() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      const data = await response.json()
      if (data.success) {
        setAlerts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'telegram': return '📱'
      case 'email': return '📧'
      case 'webhook': return '🔗'
      default: return '📢'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Enviado</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pendiente</Badge>
      case 'failed':
        return <Badge className="bg-red-500">Fallido</Badge>
      default:
        return <Badge className="bg-gray-500">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Historial de Alertas
          </CardTitle>
          <Button onClick={fetchAlerts} variant="outline" size="sm" className="border-slate-600 text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No hay alertas enviadas todavía</p>
            <p className="text-sm text-slate-500 mt-2">
              Las alertas aparecerán cuando envíes notificaciones desde las oportunidades
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-4 bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getChannelIcon(alert.channel)}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{alert.title}</span>
                      {getStatusBadge(alert.status)}
                    </div>
                    <p className="text-sm text-slate-400">{alert.message}</p>
                    {alert.errorMessage && (
                      <p className="text-xs text-red-400 mt-1">
                        <XCircle className="w-3 h-3 inline mr-1" />
                        {alert.errorMessage}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDate(alert.createdAt)}
                      </span>
                      <span className="capitalize">{alert.channel}</span>
                      {alert.sentAt && (
                        <span className="text-green-500">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Entregado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
