'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Clock, Users } from 'lucide-react'

interface Team {
  id: string
  name: string
  owner: string
  draftPosition: number
}

interface Pick {
  round: number
  pick: number
  overall: number
  team: Team
  player?: {
    name: string
    position: string
    team: string
  }
  timestamp?: Date
}

interface DraftOrderProps {
  teams: Team[]
  currentPick?: number
  completedPicks?: Pick[]
  totalRounds?: number
}

export default function DraftOrder({
  teams = [],
  currentPick = 1,
  completedPicks = [],
  totalRounds = 15,
}: DraftOrderProps) {
  // Generate draft order (snake draft)
  const generateDraftOrder = (): Pick[] => {
    const picks: Pick[] = []
    let overall = 1

    for (let round = 1; round <= totalRounds; round++) {
      const roundTeams = round % 2 === 1 ? teams : [...teams].reverse()
      
      roundTeams.forEach((team, index) => {
        picks.push({
          round,
          pick: index + 1,
          overall,
          team,
          player: completedPicks.find(p => p.overall === overall)?.player,
          timestamp: completedPicks.find(p => p.overall === overall)?.timestamp,
        })
        overall++
      })
    }
    
    return picks
  }

  const draftOrder = generateDraftOrder()
  const currentRound = Math.ceil(currentPick / teams.length)
  
  // Group picks by round
  const picksByRound: { [key: number]: Pick[] } = {}
  draftOrder.forEach(pick => {
    if (!picksByRound[pick.round]) {
      picksByRound[pick.round] = []
    }
    picksByRound[pick.round].push(pick)
  })

  const getPickStatus = (pick: Pick) => {
    if (pick.overall < currentPick) return 'completed'
    if (pick.overall === currentPick) return 'current'
    return 'upcoming'
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Draft Order</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Clock className="h-4 w-4" />
            <span>Round {currentRound} of {totalRounds}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {Object.entries(picksByRound).map(([round, picks]) => (
              <div key={round} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={Number(round) === currentRound ? 'default' : 'outline'}>
                    Round {round}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {picks.map((pick) => {
                    const status = getPickStatus(pick)
                    return (
                      <div
                        key={pick.overall}
                        className={`p-2 rounded flex items-center justify-between text-sm ${
                          status === 'completed'
                            ? 'bg-gray-100'
                            : status === 'current'
                            ? 'bg-blue-100 border-blue-500 border-2'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 w-8">
                            {pick.overall}.
                          </span>
                          <span className={status === 'current' ? 'font-bold' : ''}>
                            {pick.team.name}
                          </span>
                          {status === 'current' && (
                            <Badge variant="default" className="ml-2">
                              ON THE CLOCK
                            </Badge>
                          )}
                        </div>
                        {pick.player && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pick.player.name}</span>
                            <Badge variant="outline">
                              {pick.player.position}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}