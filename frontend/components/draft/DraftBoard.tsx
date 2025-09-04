'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Filter, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  team: string
  rank: number
  adp: number
  projectedPoints: number
  drafted: boolean
  draftedTeam?: string
}

interface DraftBoardProps {
  players?: Player[]
  onPlayerSelect?: (player: Player) => void
}

export default function DraftBoard({ players = [], onPlayerSelect }: DraftBoardProps) {
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDrafted, setShowDrafted] = useState(false)

  // Mock data for demo
  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      rank: 1,
      adp: 1.2,
      projectedPoints: 320.5,
      drafted: false,
    },
    {
      id: '2',
      name: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      rank: 2,
      adp: 2.1,
      projectedPoints: 295.3,
      drafted: false,
    },
    {
      id: '3',
      name: 'CeeDee Lamb',
      position: 'WR',
      team: 'DAL',
      rank: 3,
      adp: 3.5,
      projectedPoints: 288.7,
      drafted: true,
      draftedTeam: 'Team 3',
    },
    // Add more mock players as needed
  ]

  const displayPlayers = players.length > 0 ? players : mockPlayers

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']

  const filteredPlayers = displayPlayers.filter((player) => {
    const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDrafted = showDrafted || !player.drafted
    return matchesPosition && matchesSearch && matchesDrafted
  })

  const getPositionColor = (position: string) => {
    const colors: { [key: string]: string } = {
      QB: 'bg-red-100 text-red-800',
      RB: 'bg-green-100 text-green-800',
      WR: 'bg-blue-100 text-blue-800',
      TE: 'bg-yellow-100 text-yellow-800',
      K: 'bg-purple-100 text-purple-800',
      DST: 'bg-orange-100 text-orange-800',
    }
    return colors[position] || 'bg-gray-100 text-gray-800'
  }

  const getADPTrend = (rank: number, adp: number) => {
    const diff = adp - rank
    if (Math.abs(diff) < 0.5) return null
    if (diff > 0) {
      return <TrendingDown className="h-4 w-4 text-green-500" />
    }
    return <TrendingUp className="h-4 w-4 text-red-500" />
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Draft Board</CardTitle>
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search players..."
              className="pl-8 w-full px-3 py-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant={showDrafted ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowDrafted(!showDrafted)}
          >
            <Filter className="h-4 w-4 mr-1" />
            {showDrafted ? 'All' : 'Available'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ALL" value={selectedPosition} onValueChange={setSelectedPosition}>
          <TabsList className="grid grid-cols-7 w-full">
            {positions.map((pos) => (
              <TabsTrigger key={pos} value={pos}>
                {pos}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={selectedPosition} className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      player.drafted ? 'opacity-60 bg-gray-50' : ''
                    }`}
                    onClick={() => !player.drafted && onPlayerSelect?.(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold text-gray-600 w-10">
                          {player.rank}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{player.name}</span>
                            <Badge className={getPositionColor(player.position)}>
                              {player.position}
                            </Badge>
                            <span className="text-sm text-gray-600">{player.team}</span>
                            {player.drafted && (
                              <Badge variant="secondary">{player.draftedTeam}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>ADP: {player.adp.toFixed(1)}</span>
                            {getADPTrend(player.rank, player.adp)}
                            <span>Proj: {player.projectedPoints.toFixed(1)} pts</span>
                          </div>
                        </div>
                      </div>
                      {!player.drafted && (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}