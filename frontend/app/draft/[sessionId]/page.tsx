'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDraft } from '@/hooks/useDraft'
import DraftBoard from '@/components/draft/DraftBoard'
import DraftOrder from '@/components/draft/DraftOrder'
import TeamRoster from '@/components/draft/TeamRoster'
import DraftTimer from '@/components/draft/DraftTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, RotateCcw, Zap, TrendingUp, Users, Trophy, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function DraftSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const {
    session,
    recommendations,
    isLoading,
    error,
    timeRemaining,
    recordPick,
    undoPick,
    redoPick,
    startDraft,
    pauseDraft,
    resumeDraft,
    autoDraft,
    loadRecommendations,
    helpers
  } = useDraft({ sessionId, autoRefresh: true })

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [positionFilter, setPositionFilter] = useState<string>('')

  // Get current team info
  const currentTeam = session && helpers ? helpers.getCurrentTeam(session.current_pick) : null
  const isUserTurn = currentTeam && helpers ? helpers.isUserTurn(session.current_pick, '1') : false // Assuming user team ID is '1'
  const roundInfo = session && helpers ? helpers.getRoundInfo(session.current_pick) : null

  const handlePlayerSelect = (player: any) => {
    if (!isUserTurn) {
      toast.error("It's not your turn to pick!")
      return
    }
    
    setSelectedPlayer(player)
    setShowConfirmDialog(true)
  }

  const confirmDraftPick = async () => {
    if (!selectedPlayer || !currentTeam) return
    
    try {
      await recordPick(selectedPlayer.id, currentTeam.id)
      setShowConfirmDialog(false)
      setSelectedPlayer(null)
    } catch (error) {
      console.error('Failed to record pick:', error)
    }
  }

  const handleTimeExpired = async () => {
    if (isUserTurn) {
      await autoDraft()
    }
  }

  const handlePositionFilter = (position: string) => {
    setPositionFilter(position)
    loadRecommendations(position || undefined)
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => router.push('/draft')} className="mt-4">
              Back to Draft List
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading && !session) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!session) return null

  // Pre-draft lobby
  if (session.status === 'pending') {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Draft Lobby</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Trophy className="h-16 w-16 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Ready to Draft?</h2>
                <p className="text-gray-600">
                  {session.draft_config.teams.length} teams • {session.draft_config.rounds} rounds • 
                  {session.draft_config.seconds_per_pick}s per pick
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Teams:</h3>
                {session.draft_config.teams.map((team, index) => (
                  <div key={team.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{team.name}</span>
                    <span className="text-sm text-gray-600">Pick #{team.draft_position}</span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={startDraft} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                Start Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Live Draft Room</h1>
          <p className="text-gray-600">
            Round {roundInfo?.round} • Pick {session.current_pick} of {session.draft_config.teams.length * session.draft_config.rounds}
            {currentTeam && (
              <span className="ml-2">
                • {isUserTurn ? "🎯 Your turn!" : `${currentTeam.name} is on the clock`}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undoPick}
            disabled={session.picks.length === 0 || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Undo
          </Button>
          
          {session.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={pauseDraft}
              disabled={isLoading}
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          ) : session.status === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resumeDraft}
              disabled={isLoading}
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          ) : null}
          
          {isUserTurn && (
            <Button
              variant="default"
              size="sm"
              onClick={autoDraft}
              disabled={isLoading}
            >
              <Zap className="h-4 w-4 mr-1" />
              Auto-Pick
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Draft Order and Timer */}
        <div className="col-span-3 space-y-4">
          {timeRemaining !== null && (
            <DraftTimer
              currentTeam={currentTeam?.name || ''}
              timeRemaining={timeRemaining}
              onTimeExpired={handleTimeExpired}
              isPaused={session.status === 'paused'}
            />
          )}
          
          <DraftOrder
            teams={session.draft_config.teams}
            currentPick={session.current_pick}
            totalRounds={session.draft_config.rounds}
            picks={session.picks}
          />
        </div>

        {/* Center Column - Draft Board and Recommendations */}
        <div className="col-span-6">
          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Available Players</TabsTrigger>
              <TabsTrigger value="recommendations">
                Recommendations
                {recommendations.length > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {recommendations.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="available">
              <DraftBoard
                onPlayerSelect={handlePlayerSelect}
                draftedPlayers={session.picks.map(p => p.player_id)}
                isUserTurn={isUserTurn}
              />
            </TabsContent>
            
            <TabsContent value="recommendations">
              <div className="space-y-4">
                {/* Position filter */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={positionFilter === '' ? 'default' : 'outline'}
                    onClick={() => handlePositionFilter('')}
                  >
                    All
                  </Button>
                  {['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => (
                    <Button
                      key={pos}
                      size="sm"
                      variant={positionFilter === pos ? 'default' : 'outline'}
                      onClick={() => handlePositionFilter(pos)}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
                
                {/* Recommendations list */}
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <Card 
                      key={rec.player_id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handlePlayerSelect(rec)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                #{index + 1}
                              </Badge>
                              <span className="font-semibold">{rec.player_name}</span>
                              <Badge variant="outline">{rec.position}</Badge>
                              <span className="text-sm text-gray-500">{rec.team}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {rec.recommendation_reason}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">{rec.value_score.toFixed(1)}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              ADP: {rec.adp.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {recommendations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No recommendations available
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Team Rosters */}
        <div className="col-span-3">
          <TeamRoster
            teams={session.draft_config.teams.map(team => ({
              ...team,
              roster: session.picks
                .filter(p => p.team_id === team.id)
                .map(p => ({
                  id: p.player_id,
                  name: p.player_name,
                  position: p.player_position,
                  team: p.player_team || 'FA'
                }))
            }))}
            currentTeamId={currentTeam?.id}
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
                    {selectedPlayer.player_name || selectedPlayer.name}
                  </div>
                  <div className="text-sm">
                    {selectedPlayer.position} - {selectedPlayer.team}
                  </div>
                  {selectedPlayer.adp && (
                    <div className="text-sm">
                      ADP: {selectedPlayer.adp} | Projected: {selectedPlayer.projected_points?.toFixed(1)} pts
                    </div>
                  )}
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