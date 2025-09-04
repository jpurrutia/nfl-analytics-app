'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Trophy, TrendingUp } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  team: string
  round: number
  pick: number
  projectedPoints: number
}

interface Team {
  id: string
  name: string
  owner: string
  roster: Player[]
  projectedTotal?: number
  grade?: string
}

interface TeamRosterProps {
  teams: Team[]
  currentTeamId?: string
}

export default function TeamRoster({ teams = [], currentTeamId }: TeamRosterProps) {
  // Mock data for demo
  const mockTeams: Team[] = [
    {
      id: '1',
      name: 'My Team',
      owner: 'You',
      roster: [
        {
          id: '1',
          name: 'Josh Allen',
          position: 'QB',
          team: 'BUF',
          round: 2,
          pick: 5,
          projectedPoints: 380.5,
        },
        {
          id: '2',
          name: 'Saquon Barkley',
          position: 'RB',
          team: 'PHI',
          round: 1,
          pick: 8,
          projectedPoints: 250.3,
        },
      ],
      projectedTotal: 1850.5,
      grade: 'A-',
    },
  ]

  const displayTeams = teams.length > 0 ? teams : mockTeams
  const activeTeamId = currentTeamId || displayTeams[0]?.id

  const positionOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST', 'BE']

  const getPositionColor = (position: string) => {
    const colors: { [key: string]: string } = {
      QB: 'bg-red-100 text-red-800',
      RB: 'bg-green-100 text-green-800',
      WR: 'bg-blue-100 text-blue-800',
      TE: 'bg-yellow-100 text-yellow-800',
      K: 'bg-purple-100 text-purple-800',
      DST: 'bg-orange-100 text-orange-800',
      FLEX: 'bg-gray-100 text-gray-800',
      BE: 'bg-gray-100 text-gray-800',
    }
    return colors[position] || 'bg-gray-100 text-gray-800'
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600'
    if (grade.startsWith('B')) return 'text-blue-600'
    if (grade.startsWith('C')) return 'text-yellow-600'
    if (grade.startsWith('D')) return 'text-orange-600'
    return 'text-red-600'
  }

  const groupPlayersByPosition = (roster: Player[]) => {
    const grouped: { [key: string]: Player[] } = {}
    roster.forEach(player => {
      if (!grouped[player.position]) {
        grouped[player.position] = []
      }
      grouped[player.position].push(player)
    })
    return grouped
  }

  const calculatePositionNeeds = (roster: Player[]) => {
    const needs: { [key: string]: number } = {
      QB: 2 - roster.filter(p => p.position === 'QB').length,
      RB: 5 - roster.filter(p => p.position === 'RB').length,
      WR: 5 - roster.filter(p => p.position === 'WR').length,
      TE: 2 - roster.filter(p => p.position === 'TE').length,
      K: 1 - roster.filter(p => p.position === 'K').length,
      DST: 1 - roster.filter(p => p.position === 'DST').length,
    }
    return Object.entries(needs)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Team Rosters</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTeamId} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            {displayTeams.slice(0, 3).map((team) => (
              <TabsTrigger key={team.id} value={team.id}>
                {team.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {displayTeams.map((team) => (
            <TabsContent key={team.id} value={team.id} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-semibold">{team.name}</div>
                    <div className="text-sm text-gray-600">{team.owner}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {team.projectedTotal && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Projected</div>
                      <div className="font-bold">{team.projectedTotal.toFixed(1)} pts</div>
                    </div>
                  )}
                  {team.grade && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Grade</div>
                      <div className={`text-2xl font-bold ${getGradeColor(team.grade)}`}>
                        {team.grade}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Position Needs</div>
                <div className="flex gap-2">
                  {calculatePositionNeeds(team.roster).map(([position, count]) => (
                    <Badge key={position} variant="outline">
                      {position} ({count})
                    </Badge>
                  ))}
                </div>
              </div>

              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {Object.entries(groupPlayersByPosition(team.roster))
                    .sort((a, b) => positionOrder.indexOf(a[0]) - positionOrder.indexOf(b[0]))
                    .map(([position, players]) => (
                      <div key={position} className="space-y-1">
                        <Badge className={getPositionColor(position)}>{position}</Badge>
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="p-2 ml-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{player.name}</span>
                                <span className="text-sm text-gray-600">{player.team}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span>R{player.round}.{player.pick}</span>
                                <span>{player.projectedPoints.toFixed(1)} pts</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}