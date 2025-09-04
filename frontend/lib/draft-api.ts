import { api } from './api'

// Draft types matching backend models
export interface DraftSession {
  id: string
  user_id: string
  league_id: string
  draft_config: DraftConfig
  current_pick: number
  current_round: number
  status: 'pending' | 'active' | 'paused' | 'completed'
  picks: DraftPick[]
  available_players: string[]
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface DraftConfig {
  teams: Team[]
  rounds: number
  seconds_per_pick: number
  draft_type: 'snake' | 'linear'
  scoring_type: 'PPR' | 'STANDARD' | 'HALF_PPR'
  roster_spots: RosterSpots
}

export interface Team {
  id: string
  name: string
  owner: string
  draft_position: number
}

export interface RosterSpots {
  QB: number
  RB: number
  WR: number
  TE: number
  FLEX: number
  K: number
  DEF: number
  BENCH: number
}

export interface DraftPick {
  pick_number: number
  round: number
  team_id: string
  player_id: string
  player_name: string
  player_position: string
  player_team?: string
  timestamp: string
}

export interface CreateSessionRequest {
  league_id: string
  draft_config: DraftConfig
}

export interface RecordPickRequest {
  player_id: string
  team_id: string
  pick_number: number
}

export interface DraftRecommendation {
  player_id: string
  player_name: string
  position: string
  team: string
  adp: number
  projected_points: number
  value_score: number
  recommendation_reason: string
  tier: number
}

class DraftAPI {
  // Create a new draft session
  async createSession(data: CreateSessionRequest): Promise<DraftSession> {
    const response = await api.post('/draft/sessions', data)
    return response.data
  }

  // Get a draft session by ID
  async getSession(sessionId: string): Promise<DraftSession> {
    const response = await api.get(`/draft/sessions/${sessionId}`)
    return response.data
  }

  // Get all user's draft sessions
  async getUserSessions(): Promise<{ sessions: DraftSession[]; count: number }> {
    const response = await api.get('/draft/sessions')
    return response.data
  }

  // Record a draft pick
  async recordPick(sessionId: string, data: RecordPickRequest): Promise<DraftPick> {
    const response = await api.post(`/draft/sessions/${sessionId}/pick`, data)
    return response.data
  }

  // Undo the last pick
  async undoPick(sessionId: string): Promise<DraftSession> {
    const response = await api.post(`/draft/sessions/${sessionId}/undo`)
    return response.data
  }

  // Redo a previously undone pick
  async redoPick(sessionId: string): Promise<DraftSession> {
    const response = await api.post(`/draft/sessions/${sessionId}/redo`)
    return response.data
  }

  // Get draft recommendations
  async getRecommendations(
    sessionId: string,
    position?: string
  ): Promise<DraftRecommendation[]> {
    const params = position ? { position } : {}
    const response = await api.get(`/draft/sessions/${sessionId}/recommendations`, {
      params
    })
    return response.data
  }

  // Start the draft
  async startDraft(sessionId: string): Promise<DraftSession> {
    const response = await api.post(`/draft/sessions/${sessionId}/start`)
    return response.data
  }

  // Pause the draft
  async pauseDraft(sessionId: string): Promise<DraftSession> {
    const response = await api.post(`/draft/sessions/${sessionId}/pause`)
    return response.data
  }

  // Resume the draft
  async resumeDraft(sessionId: string): Promise<DraftSession> {
    const response = await api.post(`/draft/sessions/${sessionId}/resume`)
    return response.data
  }

  // Complete the draft
  async completeDraft(sessionId: string): Promise<DraftSession> {
    const response = await api.post(`/draft/sessions/${sessionId}/complete`)
    return response.data
  }

  // Auto-draft for current pick
  async autoDraft(sessionId: string): Promise<DraftPick> {
    const response = await api.post(`/draft/sessions/${sessionId}/auto-draft`)
    return response.data
  }
}

export const draftAPI = new DraftAPI()

// Helper functions for draft logic
export const getDraftHelpers = (config: DraftConfig) => {
  const totalTeams = config.teams.length
  const totalPicks = totalTeams * config.rounds

  return {
    // Calculate which team is currently picking
    getCurrentTeam: (pickNumber: number): Team => {
      const round = Math.ceil(pickNumber / totalTeams)
      const pickInRound = ((pickNumber - 1) % totalTeams) + 1
      
      // Snake draft logic
      if (config.draft_type === 'snake') {
        if (round % 2 === 1) {
          // Odd rounds go in normal order
          return config.teams[pickInRound - 1]
        } else {
          // Even rounds go in reverse order
          return config.teams[totalTeams - pickInRound]
        }
      } else {
        // Linear draft
        return config.teams[pickInRound - 1]
      }
    },

    // Get the next team to pick
    getNextTeam: (pickNumber: number): Team | null => {
      if (pickNumber >= totalPicks) return null
      return getDraftHelpers(config).getCurrentTeam(pickNumber + 1)
    },

    // Calculate round and pick within round
    getRoundInfo: (pickNumber: number) => {
      const round = Math.ceil(pickNumber / totalTeams)
      const pickInRound = ((pickNumber - 1) % totalTeams) + 1
      return { round, pickInRound }
    },

    // Check if it's user's turn
    isUserTurn: (pickNumber: number, userTeamId: string): boolean => {
      const currentTeam = getDraftHelpers(config).getCurrentTeam(pickNumber)
      return currentTeam.id === userTeamId
    },

    // Calculate time remaining for current pick
    getTimeRemaining: (pickStartTime: string): number => {
      const startTime = new Date(pickStartTime).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const remaining = Math.max(0, config.seconds_per_pick - elapsed)
      return remaining
    }
  }
}