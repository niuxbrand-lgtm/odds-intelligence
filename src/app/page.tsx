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
import { 
  TrendingUp, RefreshCw, Settings, Bell, Activity, Clock, Zap, Trophy, Target
} from 'lucide-react'

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('opportunities')

  // Settings state
  const [minMargin, setMinMargin] = useState(2)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/opportunities')
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.data || [])
      }
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/sync', { method: 'POST' })
      setTimeout(() => {
        fetchData()
        setSyncing(false)
      }, 3000)
    } catch (error) {
      setSyncing(false)
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
                {lastUpdate.toLocaleTimeString('es-ES')}
              </div>
              <Button onClick={handleSync} disabled={syncing} variant="outline" 
                className="border-slate-600 text-white hover:bg-slate-700">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xl font-bold text-white">OK</span>
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
              <p className="text-xs text-slate-500">Polymarket + Odds API</p>
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
                    <p className="text-slate-400">No hay oportunidades activas</p>
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
                          <TableRow key={opp.id} className="border-slate-700">
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    Canales de Notificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-blue-500 text-blue-400">Telegram</Badge>
                      <span className="text-slate-300">Recibir alertas por Telegram</span>
                    </div>
                    <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-green-500 text-green-400">Email</Badge>
                      <span className="text-slate-300">Recibir alertas por correo</span>
                    </div>
                    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
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
