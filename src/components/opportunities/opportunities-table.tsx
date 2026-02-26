'use client'

import { useState } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  TrendingUp, ExternalLink, Bell, RefreshCw, Search, Filter, ChevronDown
} from 'lucide-react'

interface Opportunity {
  id: string
  eventId: string
  marketType: string
  profitPercentage: number
  qualityGrade: string
  qualityScore: number
  oddsHome: number
  oddsAway: number
  oddsDraw?: number
  recommendedStakeHome: number
  recommendedStakeAway: number
  recommendedStakeDraw?: number
  expectedProfit: number
  detectedAt: string
  latencyRisk: string
  liquidityScore: number
  event: {
    homeTeam: string
    awayTeam?: string
    homePlayer?: string
    awayPlayer?: string
    sportKey: string
    commenceTime: string
  }
}

interface Props {
  opportunities: Opportunity[]
  loading: boolean
  onRefresh: () => void
}

export function OpportunitiesTable({ opportunities, loading, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: 'bg-green-500 hover:bg-green-600',
      B: 'bg-blue-500 hover:bg-blue-600',
      C: 'bg-yellow-500 hover:bg-yellow-600',
      D: 'bg-orange-500 hover:bg-orange-600',
      F: 'bg-red-500 hover:bg-red-600',
    }
    return colors[grade] || 'bg-gray-500'
  }

  const getLatencyColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'text-green-500',
      medium: 'text-yellow-500',
      high: 'text-red-500',
    }
    return colors[risk] || 'text-gray-500'
  }

  const getMarketLabel = (market: string) => {
    const labels: Record<string, string> = {
      h2h: 'Match Winner',
      spreads: 'Handicap',
      totals: 'Over/Under',
    }
    return labels[market] || market
  }

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = 
      opp.event.homeTeam?.toLowerCase().includes(search.toLowerCase()) ||
      opp.event.awayTeam?.toLowerCase().includes(search.toLowerCase()) ||
      opp.event.homePlayer?.toLowerCase().includes(search.toLowerCase()) ||
      opp.event.awayPlayer?.toLowerCase().includes(search.toLowerCase()) ||
      opp.event.sportKey.toLowerCase().includes(search.toLowerCase())
    
    const matchesGrade = gradeFilter === 'all' || opp.qualityGrade === gradeFilter
    
    return matchesSearch && matchesGrade
  })

  const sendAlert = async (opportunityId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          channel: 'telegram',
          recipient: 'user_chat_id',
        }),
      })
      if (response.ok) {
        alert('¡Alerta enviada!')
      }
    } catch (error) {
      console.error('Error sending alert:', error)
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Oportunidades de Arbitraje
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Buscar eventos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-700 border-slate-600 text-white w-64"
              />
            </div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
            >
              <option value="all">Todas las calidades</option>
              <option value="A">Solo A</option>
              <option value="B">Solo B</option>
              <option value="C">Solo C</option>
              <option value="D">Solo D</option>
              <option value="F">Solo F</option>
            </select>
            <Button onClick={onRefresh} variant="outline" size="sm" className="border-slate-600 text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No hay oportunidades activas en este momento</p>
            <p className="text-sm text-slate-500 mt-2">
              Las oportunidades aparecerán cuando se detecten arbitrajes
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-400">Evento</TableHead>
                  <TableHead className="text-slate-400">Deporte</TableHead>
                  <TableHead className="text-slate-400">Mercado</TableHead>
                  <TableHead className="text-slate-400">Calidad</TableHead>
                  <TableHead className="text-slate-400 text-right">Beneficio</TableHead>
                  <TableHead className="text-slate-400 text-right">Cuotas</TableHead>
                  <TableHead className="text-slate-400">Riesgo</TableHead>
                  <TableHead className="text-slate-400 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((opp) => (
                  <TableRow 
                    key={opp.id} 
                    className="border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => setSelectedOpp(opp)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">
                          {opp.event.homePlayer || opp.event.homeTeam}
                        </div>
                        <div className="text-sm text-slate-400">
                          vs {opp.event.awayPlayer || opp.event.awayTeam}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {opp.event.sportKey.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {getMarketLabel(opp.marketType)}
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
                    <TableCell className="text-right">
                      <div className="text-sm">
                        <span className="text-blue-400">{opp.oddsHome.toFixed(2)}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-purple-400">{opp.oddsAway.toFixed(2)}</span>
                        {opp.oddsDraw && (
                          <>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className="text-yellow-400">{opp.oddsDraw.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`capitalize ${getLatencyColor(opp.latencyRisk)}`}>
                        {opp.latencyRisk}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOpp(opp)
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={(e) => {
                            e.stopPropagation()
                            sendAlert(opp.id)
                          }}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          {selectedOpp && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Detalles de Oportunidad
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {selectedOpp.event.homePlayer || selectedOpp.event.homeTeam} vs{' '}
                  {selectedOpp.event.awayPlayer || selectedOpp.event.awayTeam}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400">Beneficio Esperado</label>
                    <div className="text-3xl font-bold text-green-500">
                      {(selectedOpp.profitPercentage * 100).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400">Calidad</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getGradeColor(selectedOpp.qualityGrade)}>
                        {selectedOpp.qualityGrade}
                      </Badge>
                      <span className="text-slate-300">({selectedOpp.qualityScore}/100)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400">Mercado</label>
                    <div className="text-white">{getMarketLabel(selectedOpp.marketType)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400">Cuotas</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div className="bg-slate-700 p-2 rounded text-center">
                        <div className="text-xs text-slate-400">Casa</div>
                        <div className="text-lg font-bold text-blue-400">
                          {selectedOpp.oddsHome.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-slate-700 p-2 rounded text-center">
                        <div className="text-xs text-slate-400">Visitante</div>
                        <div className="text-lg font-bold text-purple-400">
                          {selectedOpp.oddsAway.toFixed(2)}
                        </div>
                      </div>
                      {selectedOpp.oddsDraw && (
                        <div className="bg-slate-700 p-2 rounded text-center">
                          <div className="text-xs text-slate-400">Empate</div>
                          <div className="text-lg font-bold text-yellow-400">
                            {selectedOpp.oddsDraw.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400">Riesgo de Latencia</label>
                    <div className={`capitalize ${getLatencyColor(selectedOpp.latencyRisk)}`}>
                      {selectedOpp.latencyRisk}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400">Liquidez</label>
                    <div className="text-white">{selectedOpp.liquidityScore}/100</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm text-slate-400">Stakes Recomendados (Total $100)</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-slate-700 p-3 rounded">
                    <div className="text-xs text-slate-400">Casa</div>
                    <div className="text-xl font-bold text-white">
                      ${selectedOpp.recommendedStakeHome.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded">
                    <div className="text-xs text-slate-400">Visitante</div>
                    <div className="text-xl font-bold text-white">
                      ${selectedOpp.recommendedStakeAway.toFixed(2)}
                    </div>
                  </div>
                  {selectedOpp.recommendedStakeDraw && (
                    <div className="bg-slate-700 p-3 rounded">
                      <div className="text-xs text-slate-400">Empate</div>
                      <div className="text-xl font-bold text-white">
                        ${selectedOpp.recommendedStakeDraw.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedOpp(null)}>
                  Cerrar
                </Button>
                <Button onClick={() => sendAlert(selectedOpp.id)}>
                  <Bell className="w-4 h-4 mr-2" />
                  Enviar Alerta
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
