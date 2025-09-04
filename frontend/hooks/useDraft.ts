import { useState, useEffect, useCallback, useRef } from 'react'
import { draftAPI, getDraftHelpers, type DraftSession, type DraftPick, type RecordPickRequest, type DraftRecommendation } from '@/lib/draft-api'
import { toast } from 'react-hot-toast'

interface UseDraftOptions {
  sessionId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useDraft(options: UseDraftOptions = {}) {
  const { sessionId, autoRefresh = false, refreshInterval = 5000 } = options
  
  const [session, setSession] = useState<DraftSession | null>(null)
  const [recommendations, setRecommendations] = useState<DraftRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load draft session
  const loadSession = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      setError(null)
      const data = await draftAPI.getSession(sessionId)
      setSession(data)
      
      // Load recommendations if draft is active
      if (data.status === 'active') {
        await loadRecommendations()
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load draft session'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Load recommendations
  const loadRecommendations = useCallback(async (position?: string) => {
    if (!sessionId) return
    
    try {
      const data = await draftAPI.getRecommendations(sessionId, position)
      setRecommendations(data)
    } catch (err: any) {
      console.error('Failed to load recommendations:', err)
    }
  }, [sessionId])

  // Record a draft pick
  const recordPick = useCallback(async (playerId: string, teamId: string) => {
    if (!sessionId || !session) return
    
    try {
      setIsLoading(true)
      const pickData: RecordPickRequest = {
        player_id: playerId,
        team_id: teamId,
        pick_number: session.current_pick
      }
      
      const pick = await draftAPI.recordPick(sessionId, pickData)
      
      // Update local state
      setSession(prev => {
        if (!prev) return prev
        return {
          ...prev,
          picks: [...prev.picks, pick],
          current_pick: prev.current_pick + 1,
          available_players: prev.available_players.filter(id => id !== playerId)
        }
      })
      
      toast.success(`Drafted ${pick.player_name}!`)
      
      // Reload recommendations
      await loadRecommendations()
      
      return pick
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to record pick'
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, session, loadRecommendations])

  // Undo last pick
  const undoPick = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const updatedSession = await draftAPI.undoPick(sessionId)
      setSession(updatedSession)
      toast.success('Pick undone')
      
      // Reload recommendations
      await loadRecommendations()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to undo pick'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, loadRecommendations])

  // Redo pick
  const redoPick = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const updatedSession = await draftAPI.redoPick(sessionId)
      setSession(updatedSession)
      toast.success('Pick redone')
      
      // Reload recommendations
      await loadRecommendations()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to redo pick'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, loadRecommendations])

  // Start draft
  const startDraft = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const updatedSession = await draftAPI.startDraft(sessionId)
      setSession(updatedSession)
      toast.success('Draft started!')
      
      // Load initial recommendations
      await loadRecommendations()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to start draft'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, loadRecommendations])

  // Pause draft
  const pauseDraft = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const updatedSession = await draftAPI.pauseDraft(sessionId)
      setSession(updatedSession)
      toast.success('Draft paused')
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to pause draft'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Resume draft
  const resumeDraft = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const updatedSession = await draftAPI.resumeDraft(sessionId)
      setSession(updatedSession)
      toast.success('Draft resumed')
      
      // Reload recommendations
      await loadRecommendations()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to resume draft'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, loadRecommendations])

  // Auto-draft
  const autoDraft = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const pick = await draftAPI.autoDraft(sessionId)
      
      // Update local state
      setSession(prev => {
        if (!prev) return prev
        return {
          ...prev,
          picks: [...prev.picks, pick],
          current_pick: prev.current_pick + 1,
          available_players: prev.available_players.filter(id => id !== pick.player_id)
        }
      })
      
      toast.success(`Auto-drafted ${pick.player_name}`)
      
      // Reload recommendations
      await loadRecommendations()
      
      return pick
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to auto-draft'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, loadRecommendations])

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh || !sessionId) return
    
    intervalRef.current = setInterval(() => {
      loadSession()
    }, refreshInterval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, sessionId, refreshInterval, loadSession])

  // Set up timer for current pick
  useEffect(() => {
    if (!session || session.status !== 'active') {
      setTimeRemaining(null)
      return
    }
    
    const updateTimer = () => {
      if (!session.started_at) return
      
      const helpers = getDraftHelpers(session.draft_config)
      const lastPick = session.picks[session.picks.length - 1]
      const pickStartTime = lastPick?.timestamp || session.started_at
      const remaining = helpers.getTimeRemaining(pickStartTime)
      
      setTimeRemaining(remaining)
      
      if (remaining <= 0) {
        // Time expired - trigger auto-draft if it's user's turn
        const currentTeam = helpers.getCurrentTeam(session.current_pick)
        if (currentTeam.owner === 'You') {
          autoDraft()
        }
      }
    }
    
    // Update immediately
    updateTimer()
    
    // Then update every second
    timerRef.current = setInterval(updateTimer, 1000)
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [session, autoDraft])

  // Load session on mount
  useEffect(() => {
    loadSession()
  }, [loadSession])

  return {
    // State
    session,
    recommendations,
    isLoading,
    error,
    timeRemaining,
    
    // Actions
    loadSession,
    loadRecommendations,
    recordPick,
    undoPick,
    redoPick,
    startDraft,
    pauseDraft,
    resumeDraft,
    autoDraft,
    
    // Helpers
    helpers: session ? getDraftHelpers(session.draft_config) : null
  }
}