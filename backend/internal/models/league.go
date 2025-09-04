package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// League represents an ESPN fantasy league
type League struct {
	ID              uuid.UUID       `json:"id" db:"id"`
	UserID          uuid.UUID       `json:"user_id" db:"user_id"`
	Platform        string          `json:"platform" db:"platform"`
	ExternalID      string          `json:"external_id" db:"external_id"`
	Name            string          `json:"name" db:"name"`
	ESPNLeagueID    string          `json:"espn_league_id" db:"espn_league_id"`
	LeagueName      string          `json:"league_name" db:"league_name"`
	Season          int             `json:"season" db:"season"`
	Settings        json.RawMessage `json:"settings" db:"settings"`
	ScoringType     string          `json:"scoring_type" db:"scoring_type"`
	RosterPositions json.RawMessage `json:"roster_positions" db:"roster_positions"`
	TeamsData       json.RawMessage `json:"teams_data" db:"teams_data"`
	IsActive        bool            `json:"is_active" db:"is_active"`
	EncryptedSWID   sql.NullString  `json:"-" db:"encrypted_swid"`
	EncryptedESPN   sql.NullString  `json:"-" db:"encrypted_espn_s2"`
	LastSyncAt      sql.NullTime    `json:"last_sync_at" db:"last_sync_at"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

// LeagueAuth stores encrypted league authentication credentials
type LeagueAuth struct {
	ID                   uuid.UUID `json:"id" db:"id"`
	UserID               uuid.UUID `json:"user_id" db:"user_id"`
	Platform             string    `json:"platform" db:"platform"`
	EncryptedCredentials []byte    `json:"-" db:"encrypted_credentials"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

// LeagueSettings represents league configuration
type LeagueSettings struct {
	LeagueID         uuid.UUID `json:"league_id"`
	Name             string    `json:"name"`
	Season           int       `json:"season"`
	ScoringType      string    `json:"scoring_type"`
	RosterSize       int       `json:"roster_size"`
	PlayoffTeams     int       `json:"playoff_teams"`
	PlayoffWeekStart int       `json:"playoff_week_start"`
}

// RosterRequirements defines roster position requirements
type RosterRequirements struct {
	QB   int `json:"qb"`
	RB   int `json:"rb"`
	WR   int `json:"wr"`
	TE   int `json:"te"`
	FLEX int `json:"flex"`
	DST  int `json:"dst"`
	K    int `json:"k"`
	BE   int `json:"bench"`
	IR   int `json:"ir,omitempty"`
}