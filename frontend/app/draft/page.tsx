'use client'

import React, { useState } from 'react'
import DraftBoard from '@/components/draft/DraftBoard'
import DraftOrder from '@/components/draft/DraftOrder'
import TeamRoster from '@/components/draft/TeamRoster'
import DraftTimer from '@/components/draft/DraftTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Play, Settings, Users, Trophy } from 'lucide-react'

interface Team {
  id: string
  name: string
  owner: string
  draftPosition: number
}

export default function DraftPage() {
  const [draftStarted, setDraftStarted] = useState(false)
  const [currentPick, setCurrentPick] = useState(1)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)

  // Mock teams for demo
  const teams: Team[] = [
    { id: '1', name: 'My Team', owner: 'You', draftPosition: 1 },
    { id: '2', name: 'Team Alpha', owner: 'Alex', draftPosition: 2 },
    { id: '3', name: 'Team Beta', owner: 'Blake', draftPosition: 3 },
    { id: '4', name: 'Team Gamma', owner: 'Charlie', draftPosition: 4 },
    { id: '5', name: 'Team Delta', owner: 'Dana', draftPosition: 5 },
    { id: '6', name: 'Team Epsilon', owner: 'Eve', draftPosition: 6 },
    { id: '7', name: 'Team Zeta', owner: 'Frank', draftPosition: 7 },
    { id: '8', name: 'Team Eta', owner: 'Grace', draftPosition: 8 },
    { id: '9', name: 'Team Theta', owner: 'Henry', draftPosition: 9 },
    { id: '10', name: 'Team Iota', owner: 'Iris', draftPosition: 10 },
  ]

  const getCurrentTeam = () => {
    const round = Math.ceil(currentPick / teams.length)
    const pickInRound = ((currentPick - 1) % teams.length) + 1
    
    // Snake draft logic
    if (round % 2 === 1) {
      return teams[pickInRound - 1]
    } else {
      return teams[teams.length - pickInRound]
    }
  }

  const handlePlayerSelect = (player: any) => {
    setSelectedPlayer(player)
    setShowConfirmDialog(true)
  }

  const confirmDraftPick = () => {
    // Here you would normally send the pick to the backend
    console.log('Drafting player:', selectedPlayer)
    setCurrentPick(currentPick + 1)
    setShowConfirmDialog(false)
    setSelectedPlayer(null)
  }

  const handleStartDraft = () => {
    setDraftStarted(true)
  }

  const handleTimeExpired = () => {
    // Auto-draft best available player
    console.log('Time expired - auto-drafting')
    setCurrentPick(currentPick + 1)
  }

  if (!draftStarted) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Fantasy Football Draft Room</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Trophy className="h-16 w-16 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Ready to Draft?</h2>
                <p className="text-gray-600">
                  Join the live draft room to build your championship team
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="font-semibold">{teams.length} Teams</div>
                  <div className="text-sm text-gray-600">Snake Draft</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-semibold">15 Rounds</div>
                  <div className="text-sm text-gray-600">90s per pick</div>
                </div>
              </div>

              <Button 
                onClick={handleStartDraft} 
                className="w-full" 
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Enter Draft Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentTeam = getCurrentTeam()

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Live Draft Room</h1>
        <p className="text-gray-600">
          Round {Math.ceil(currentPick / teams.length)} • Pick {currentPick} • 
          {currentTeam.name === 'My Team' ? " It's your turn!" : ` ${currentTeam.name} is on the clock`}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Draft Order and Timer */}
        <div className="col-span-3 space-y-4">
          <DraftTimer
            currentTeam={currentTeam.name}
            onTimeExpired={handleTimeExpired}
            onSkip={() => setCurrentPick(currentPick + 1)}
          />
          <DraftOrder
            teams={teams}
            currentPick={currentPick}
            totalRounds={15}
          />
        </div>

        {/* Center Column - Draft Board */}
        <div className="col-span-6">
          <DraftBoard
            onPlayerSelect={handlePlayerSelect}
          />
        </div>

        {/* Right Column - Team Rosters */}
        <div className="col-span-3">
          <TeamRoster
            teams={teams.map(t => ({
              ...t,
              roster: []
            }))}
            currentTeamId={currentTeam.id}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Draft Pick</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPlayer && (
                <div className="space-y-2 mt-2">
                  <div className="font-semibold text-lg text-black">
                    {selectedPlayer.name}
                  </div>
                  <div className="text-sm">
                    {selectedPlayer.position} - {selectedPlayer.team}
                  </div>
                  <div className="text-sm">
                    Rank: #{selectedPlayer.rank} | ADP: {selectedPlayer.adp}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDraftPick}>
              Draft Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}