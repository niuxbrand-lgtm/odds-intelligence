'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, RefreshCw, Settings, Bell, Activity, Clock, Zap, Trophy, Target,
  CheckCircle2, XCircle, AlertCircle, ExternalLink
} from 'lucide-react'

interface TestResults {
  odds_api?: { success: boolean; message: string; data?: unknown }
  polymarket?: { success: boolean; message: string; data?: unknown }
  telegram?: { success: boolean; message: string; data?: unknown }
}

interface SyncResult {
  oddsApi: { success: boolean; events: number; odds: number; errors: string[] }
  polymarket: { success: boolean; events: number; odds: number; errors: string[] }
  arbitrage: { opportunitiesFound: number }
  totalDuration: number
}

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('opportunities')
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [testing, setTesting] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  // Settings state
  const [minMargin, setMinMargin] = useState(2)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Set mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Refresh data function
  const refreshData = async () => {
    try {
      const response = await fetch('/api/opportunities')
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.data || [])
      }
      setLastUpdate(new Date().toLocaleTimeString('es-ES'))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted) return
    
    refreshData()
    // Load settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setMinMargin(data.data.minMargin || 2)
          setTelegramEnabled(data.data.telegramEnabled || false)
          setTelegramChatId(data.data.telegramChatId || '')
          setEmailEnabled(data.data.emailEnabled || false)
        }
      })
      .catch(console.error)
  }, [mounted])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const response = await fetch('/api/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'all' })
      })
      const data = await response.json()
      setSyncResult(data.data)
      setTimeout(() => {
        refreshData()
        setSyncing(false)
      }, 2000)
    } catch (error) {
      console.error('Sync error:', error)
      setSyncing(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/test?test=all')
      const data = await response.json()
      setTestResults(data.results)
    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setTesting(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minMargin,
          telegramEnabled,
          telegramChatId,
          emailEnabled,
        })
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (error) {
      console.error('Save settings error:', error)
    }
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500',
      D: 'bg-orange-500', F: 'bg-red-500',
    }
    return colors[grade] || 'bg-gray-500'
  }

  const avgProfit = opportunities.length > 0 
    ? opportunities.reduce((acc, op) => acc + op.profitPercentage, 0) / opportunities.length * 100 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Odds Intelligence</h1>
                <p className="text-sm text-slate-400">Detección de arbitraje en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span suppressHydrationWarning>{lastUpdate}</span>
              </div>
              <Button onClick={handleSync} disabled={syncing} variant="outline" 
                className="border-slate-600 text-white hover:bg-slate-700">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar APIs'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Sync Result Banner */}
        {syncResult && (
          <Alert className="mb-6 bg-slate-800/50 border-slate-600">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <AlertDescription className="text-slate-300">
              <strong>Sincronización completada</strong> ({syncResult.totalDuration}ms) -
              Odds API: {syncResult.oddsApi.events} eventos, {syncResult.oddsApi.odds} cuotas |
              Polymarket: {syncResult.polymarket.events} mercados |
              Arbitraje: {syncResult.arbitrage.opportunitiesFound} oportunidades detectadas
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Oportunidades Activas</CardTitle>
              <Target className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{opportunities.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Beneficio Promedio</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{avgProfit.toFixed(2)}%</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Estado Sistema</CardTitle>
              <Activity className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xl font-bold text-white">Operativo</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Fuentes Activas</CardTitle>
              <Zap className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">2</div>
              <p className="text-xs text-slate-500">Polymarket + The Odds API</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-slate-700">
              <TrendingUp className="w-4 h-4 mr-2" /> Oportunidades
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
              <Settings className="w-4 h-4 mr-2" /> Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Oportunidades de Arbitraje
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-4">No hay oportunidades activas</p>
                    <p className="text-slate-500 text-sm mb-4">
                      Haz clic en <strong>"Sincronizar APIs"</strong> para buscar oportunidades
                    </p>
                    <Button onClick={handleSync} disabled={syncing} variant="outline">
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Sincronizar ahora
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-400">Evento</TableHead>
                          <TableHead className="text-slate-400">Deporte</TableHead>
                          <TableHead className="text-slate-400">Calidad</TableHead>
                          <TableHead className="text-slate-400 text-right">Beneficio</TableHead>
                          <TableHead className="text-slate-400 text-right">Cuotas</TableHead>
                          <TableHead className="text-slate-400">Stakes ($100)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {opportunities.map((opp) => (
                          <TableRow key={opp.id} className="border-slate-700 hover:bg-slate-700/50">
                            <TableCell>
                              <div className="font-medium text-white">
                                {opp.event?.homePlayer || opp.event?.homeTeam || 'N/A'}
                              </div>
                              <div className="text-sm text-slate-400">
                                vs {opp.event?.awayPlayer || opp.event?.awayTeam || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-slate-600 text-slate-300">
                                {opp.event?.sportKey?.replace(/_/g, ' ') || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getGradeColor(opp.qualityGrade)}>
                                {opp.qualityGrade} ({opp.qualityScore})
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-500 font-bold">
                                {(opp.profitPercentage * 100).toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-blue-400">{opp.oddsHome?.toFixed(2)}</span>
                              <span className="text-slate-500 mx-1">/</span>
                              <span className="text-purple-400">{opp.oddsAway?.toFixed(2)}</span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-300">
                              ${opp.recommendedStakeHome?.toFixed(0)} / ${opp.recommendedStakeAway?.toFixed(0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
              {/* Test Connections */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Estado de Conexiones API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={handleTest} disabled={testing} variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700">
                    <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                    {testing ? 'Probando...' : 'Probar Conexiones'}
                  </Button>

                  {testResults && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {/* The Odds API */}
                      <div className={`p-4 rounded-lg border ${testResults.odds_api?.success ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {testResults.odds_api?.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-white font-medium">The Odds API</span>
                        </div>
                        <p className="text-sm text-slate-400">{testResults.odds_api?.message}</p>
                        {testResults.odds_api?.data && (
                          <p className="text-xs text-slate-500 mt-2">
                            {(testResults.odds_api.data as any).activeSports} deportes activos
                          </p>
                        )}
                      </div>

                      {/* Polymarket */}
                      <div className={`p-4 rounded-lg border ${testResults.polymarket?.success ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {testResults.polymarket?.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-white font-medium">Polymarket</span>
                        </div>
                        <p className="text-sm text-slate-400">{testResults.polymarket?.message}</p>
                      </div>

                      {/* Telegram */}
                      <div className={`p-4 rounded-lg border ${testResults.telegram?.success ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {testResults.telegram?.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : testResults.telegram?.message.includes('not configured') ? (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-white font-medium">Telegram</span>
                        </div>
                        <p className="text-sm text-slate-400">{testResults.telegram?.message}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alert Filters */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Filtros de Alertas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Margen Mínimo (%)</Label>
                      <Input type="number" value={minMargin} 
                        onChange={(e) => setMinMargin(parseFloat(e.target.value))}
                        className="bg-slate-700 border-slate-600 text-white mt-2" />
                      <p className="text-xs text-slate-500 mt-1">
                        Solo alertar si el beneficio es mayor a este porcentaje
                      </p>
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
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Telegram */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-blue-500 text-blue-400">Telegram</Badge>
                        <span className="text-slate-300">Recibir alertas por Telegram</span>
                      </div>
                      <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                    </div>
                    {telegramEnabled && (
                      <div>
                        <Label className="text-slate-400 text-sm">Chat ID de Telegram</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={telegramChatId} 
                            onChange={(e) => setTelegramChatId(e.target.value)}
                            placeholder="Ej: 123456789 o -1001234567890"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Obtén tu Chat ID enviando /start a @userinfobot en Telegram
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-green-500 text-green-400">Email</Badge>
                      <span className="text-slate-300">Recibir alertas por correo (Requiere RESEND_API_KEY)</span>
                    </div>
                    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                  </div>

                  <Button onClick={handleSaveSettings} className="w-full md:w-auto">
                    {settingsSaved ? '✓ Guardado' : 'Guardar Configuración'}
                  </Button>
                </CardContent>
              </Card>

              {/* API Setup Guide */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" />
                    Guía de Configuración de APIs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* The Odds API */}
                  <div className="p-4 bg-slate-700/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">The Odds API</div>
                        <div className="text-xs text-slate-400">Cuotas de +100 bookmakers</div>
                      </div>
                      <a href="https://the-odds-api.com/" target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm">
                        Obtener API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-500">
                      1. Regístrate en the-odds-api.com<br/>
                      2. Copia tu API Key del dashboard<br/>
                      3. Añade ODDS_API_KEY=tu_key al archivo .env
                    </p>
                  </div>

                  {/* Polymarket */}
                  <div className="p-4 bg-slate-700/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">Polymarket</div>
                        <div className="text-xs text-slate-400">Mercados de predicción descentralizados</div>
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-400">Activo</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Sin configuración necesaria - usa la API pública de Polymarket automáticamente.
                    </p>
                  </div>

                  {/* Telegram */}
                  <div className="p-4 bg-slate-700/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">Telegram Bot</div>
                        <div className="text-xs text-slate-400">Alertas instantáneas en tu teléfono</div>
                      </div>
                      <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm">
                        @BotFather <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-500">
                      1. Abre @BotFather en Telegram y envía /newbot<br/>
                      2. Copia el token generado<br/>
                      3. Añade TELEGRAM_BOT_TOKEN=tu_token al archivo .env<br/>
                      4. Obtén tu Chat ID con @userinfobot
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-slate-500 text-center">
            Odds Intelligence v1.0 - Fuentes: Polymarket, The Odds API | Solo uso informativo
          </p>
        </div>
      </footer>
    </div>
  )
}
