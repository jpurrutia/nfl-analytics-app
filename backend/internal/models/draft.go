package models

import (
	"time"
)

// DraftSession represents an active draft session
type DraftSession struct {
	ID           string          `json:"id" db:"id"`
	UserID       string          `json:"user_id" db:"user_id"`
	LeagueID     string          `json:"league_id" db:"league_id"`
	Name         string          `json:"name" db:"name"`
	DraftType    string          `json:"draft_type" db:"draft_type"` // snake, auction, linear
	TeamCount    int             `json:"team_count" db:"team_count"`
	RoundCount   int             `json:"round_count" db:"round_count"`
	UserPosition int             `json:"user_position" db:"user_position"` // User's draft position
	CurrentPick  int             `json:"current_pick" db:"current_pick"`    // Current overall pick number
	Status       string          `json:"status" db:"status"`                // active, paused, completed
	Settings     DraftSettings   `json:"settings" db:"settings"`
	State        *DraftState     `json:"state,omitempty"`      // Current draft state (not stored in DB)
	StartedAt    *time.Time      `json:"started_at" db:"started_at"`
	CompletedAt  *time.Time      `json:"completed_at" db:"completed_at"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// DraftSettings contains draft configuration
type DraftSettings struct {
	ScoringType      string           `json:"scoring_type"`      // PPR, HALF_PPR, STANDARD
	RosterSlots      RosterSlots      `json:"roster_slots"`
	TimerSeconds     int              `json:"timer_seconds"`     // Seconds per pick (0 = no timer)
	AutoDraftEnabled bool             `json:"auto_draft_enabled"`
	KeeperPlayers    []string         `json:"keeper_players,omitempty"` // Player IDs for keepers
}

// RosterSlots defines roster requirements
type RosterSlots struct {
	QB    int `json:"qb"`
	RB    int `json:"rb"`
	WR    int `json:"wr"`
	TE    int `json:"te"`
	FLEX  int `json:"flex"`
	DST   int `json:"dst"`
	K     int `json:"k"`
	BENCH int `json:"bench"`
}

// DraftPick represents a single pick in the draft
type DraftPick struct {
	ID          string    `json:"id" db:"id"`
	SessionID   string    `json:"session_id" db:"session_id"`
	PickNumber  int       `json:"pick_number" db:"pick_number"`   // Overall pick number
	Round       int       `json:"round" db:"round"`
	RoundPick   int       `json:"round_pick" db:"round_pick"`     // Pick within the round
	TeamNumber  int       `json:"team_number" db:"team_number"`
	PlayerID    string    `json:"player_id" db:"player_id"`
	PlayerName  string    `json:"player_name" db:"player_name"`
	Position    string    `json:"position" db:"position"`
	IsKeeper    bool      `json:"is_keeper" db:"is_keeper"`
	PickedAt    time.Time `json:"picked_at" db:"picked_at"`
}

// DraftState represents the current state of a draft (stored in Redis)
type DraftState struct {
	SessionID       string              `json:"session_id"`
	Picks           []DraftPick         `json:"picks"`
	AvailablePlayers []string           `json:"available_players"` // Player IDs still available
	TeamRosters     map[int][]string   `json:"team_rosters"`       // Team number -> Player IDs
	UndoStack       []DraftEvent       `json:"undo_stack"`
	RedoStack       []DraftEvent       `json:"redo_stack"`
	LastAction      time.Time          `json:"last_action"`
}

// DraftEvent represents an event in the draft (for undo/redo)
type DraftEvent struct {
	Type      string      `json:"type"`      // pick, undo, redo, pause, resume
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
	UserID    string      `json:"user_id"`
}

// DraftRecommendation represents a recommended pick
type DraftRecommendation struct {
	PlayerID      string  `json:"player_id"`
	PlayerName    string  `json:"player_name"`
	Position      string  `json:"position"`
	Team          string  `json:"team"`
	Score         float64 `json:"score"`         // Recommendation score (0-100)
	ValueOverADP  float64 `json:"value_over_adp"` // How much value vs ADP
	PositionalNeed float64 `json:"positional_need"` // How much this position is needed
	Reasoning     string  `json:"reasoning"`      // Human-readable explanation
}

// GetCurrentRound calculates the current round based on pick number
func (ds *DraftSession) GetCurrentRound() int {
	if ds.CurrentPick == 0 {
		return 1
	}
	return ((ds.CurrentPick - 1) / ds.TeamCount) + 1
}

// GetCurrentTeam calculates which team is currently picking
func (ds *DraftSession) GetCurrentTeam() int {
	if ds.CurrentPick == 0 {
		return 1
	}
	
	round := ds.GetCurrentRound()
	if ds.DraftType == "snake" && round%2 == 0 {
		// Even rounds go in reverse order for snake drafts
		return ds.TeamCount - ((ds.CurrentPick - 1) % ds.TeamCount)
	}
	
	return ((ds.CurrentPick - 1) % ds.TeamCount) + 1
}

// IsUserPick checks if it's currently the user's turn to pick
func (ds *DraftSession) IsUserPick() bool {
	return ds.GetCurrentTeam() == ds.UserPosition
}

// GetTotalPicks returns the total number of picks in the draft
func (ds *DraftSession) GetTotalPicks() int {
	return ds.TeamCount * ds.RoundCount
}

// IsComplete checks if the draft is complete
func (ds *DraftSession) IsComplete() bool {
	return ds.CurrentPick > ds.GetTotalPicks()
}