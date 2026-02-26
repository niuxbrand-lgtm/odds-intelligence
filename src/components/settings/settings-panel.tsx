'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Settings, Save, Bell, Mail, Globe, AlertCircle } from 'lucide-react'

interface Settings {
  id: string
  minMargin: number
  maxLatencyRisk: string
  minLiquidity: number
  sportsFilter?: string
  marketsFilter?: string
  telegramEnabled: boolean
  telegramChatId?: string
  emailEnabled: boolean
  emailAddress?: string
  webhookEnabled: boolean
  webhookUrl?: string
  maxStakePerBet: number
  maxDailyExposure: number
  timezone: string
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' })
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la configuración' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <Settings className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Alert Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Filtros de Alertas
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configura los criterios para recibir alertas de arbitraje
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Margen Mínimo (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={(settings?.minMargin || 0.02) * 100}
                onChange={(e) => updateSetting('minMargin', parseFloat(e.target.value) / 100)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500">Solo alertas con margen superior a este valor</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Riesgo Máximo de Latencia</Label>
              <select
                value={settings?.maxLatencyRisk || 'medium'}
                onChange={(e) => updateSetting('maxLatencyRisk', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
              >
                <option value="low">Solo bajo</option>
                <option value="medium">Bajo y medio</option>
                <option value="high">Todos</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Liquidez Mínima</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings?.minLiquidity || 30}
                onChange={(e) => updateSetting('minLiquidity', parseInt(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500">Score mínimo de liquidez (0-100)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Canales de Notificación
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configura dónde recibir las alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Telegram */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-blue-500 text-blue-400">Telegram</Badge>
                <span className="text-slate-300">Recibir alertas por Telegram</span>
              </div>
              <Switch
                checked={settings?.telegramEnabled || false}
                onCheckedChange={(checked) => updateSetting('telegramEnabled', checked)}
              />
            </div>
            {settings?.telegramEnabled && (
              <div className="pl-4">
                <Label className="text-slate-300">Chat ID de Telegram</Label>
                <Input
                  type="text"
                  placeholder="Ej: 123456789"
                  value={settings?.telegramChatId || ''}
                  onChange={(e) => updateSetting('telegramChatId', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Obtén tu Chat ID enviando /start a @userinfobot en Telegram
                </p>
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Email */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-green-500 text-green-400">Email</Badge>
                <span className="text-slate-300">Recibir alertas por correo</span>
              </div>
              <Switch
                checked={settings?.emailEnabled || false}
                onCheckedChange={(checked) => updateSetting('emailEnabled', checked)}
              />
            </div>
            {settings?.emailEnabled && (
              <div className="pl-4">
                <Label className="text-slate-300">Dirección de Email</Label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={settings?.emailAddress || ''}
                  onChange={(e) => updateSetting('emailAddress', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                />
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Webhook */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-purple-500 text-purple-400">Webhook</Badge>
                <span className="text-slate-300">Enviar alertas a un webhook personalizado</span>
              </div>
              <Switch
                checked={settings?.webhookEnabled || false}
                onCheckedChange={(checked) => updateSetting('webhookEnabled', checked)}
              />
            </div>
            {settings?.webhookEnabled && (
              <div className="pl-4">
                <Label className="text-slate-300">URL del Webhook</Label>
                <Input
                  type="url"
                  placeholder="https://tu-servidor.com/webhook"
                  value={settings?.webhookUrl || ''}
                  onChange={(e) => updateSetting('webhookUrl', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exposure Limits */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-500" />
            Límites de Exposición
          </CardTitle>
          <CardDescription className="text-slate-400">
            Define tus límites máximos de apuesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Stake Máximo por Apuesta ($)</Label>
              <Input
                type="number"
                value={settings?.maxStakePerBet || 100}
                onChange={(e) => updateSetting('maxStakePerBet', parseFloat(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Exposición Diaria Máxima ($)</Label>
              <Input
                type="number"
                value={settings?.maxDailyExposure || 1000}
                onChange={(e) => updateSetting('maxDailyExposure', parseFloat(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-red-500" />
            Configuración de APIs
          </CardTitle>
          <CardDescription className="text-slate-400">
            Variables de entorno necesarias (configuradas en el servidor)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <span className="text-slate-300">The Odds API</span>
              <Badge variant="outline" className="border-slate-500 text-slate-400">
                Configurar en .env
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <span className="text-slate-300">Telegram Bot Token</span>
              <Badge variant="outline" className="border-slate-500 text-slate-400">
                Configurar en .env
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <span className="text-slate-300">Resend API (Email)</span>
              <Badge variant="outline" className="border-slate-500 text-slate-400">
                Configurar en .env
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-purple-500 to-blue-500">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  )
}
