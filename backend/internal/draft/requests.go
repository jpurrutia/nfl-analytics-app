package draft

import (
	"fmt"

	"github.com/nfl-analytics/backend/internal/models"
)

// CreateSessionRequest represents a request to create a draft session
type CreateSessionRequest struct {
	LeagueID     string                `json:"league_id" binding:"required"`
	Name         string                `json:"name" binding:"required"`
	DraftType    string                `json:"draft_type" binding:"required,oneof=snake auction linear"`
	TeamCount    int                   `json:"team_count" binding:"required,min=4,max=20"`
	RoundCount   int                   `json:"round_count" binding:"required,min=1,max=30"`
	UserPosition int                   `json:"user_position" binding:"required,min=1"`
	Settings     models.DraftSettings  `json:"settings" binding:"required"`
}

// Validate validates the create session request
func (r *CreateSessionRequest) Validate() error {
	if r.UserPosition > r.TeamCount {
		return fmt.Errorf("user position cannot be greater than team count")
	}

	// Validate roster slots
	totalSlots := r.Settings.RosterSlots.QB + r.Settings.RosterSlots.RB +
		r.Settings.RosterSlots.WR + r.Settings.RosterSlots.TE +
		r.Settings.RosterSlots.FLEX + r.Settings.RosterSlots.DST +
		r.Settings.RosterSlots.K + r.Settings.RosterSlots.BENCH

	if totalSlots != r.RoundCount {
		return fmt.Errorf("total roster slots (%d) must equal round count (%d)", totalSlots, r.RoundCount)
	}

	// Validate scoring type
	validScoring := map[string]bool{
		"PPR":      true,
		"HALF_PPR": true,
		"STANDARD": true,
	}
	if !validScoring[r.Settings.ScoringType] {
		return fmt.Errorf("invalid scoring type: %s", r.Settings.ScoringType)
	}

	// Validate timer
	if r.Settings.TimerSeconds < 0 || r.Settings.TimerSeconds > 600 {
		return fmt.Errorf("timer must be between 0 and 600 seconds")
	}

	return nil
}

// RecordPickRequest represents a request to record a draft pick
type RecordPickRequest struct {
	PlayerID   string `json:"player_id" binding:"required"`
	PlayerName string `json:"player_name" binding:"required"`
	Position   string `json:"position" binding:"required,oneof=QB RB WR TE DST K"`
}

// UpdateSessionRequest represents a request to update a draft session
type UpdateSessionRequest struct {
	Name     string `json:"name"`
	Settings *models.DraftSettings `json:"settings"`
}

// SimulatePickRequest represents a request to simulate picks
type SimulatePickRequest struct {
	Count int `json:"count" binding:"required,min=1,max=50"`
}