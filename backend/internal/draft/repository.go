package draft

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/nfl-analytics/backend/internal/models"
)

// Repository defines the interface for draft data access
type Repository interface {
	CreateSession(ctx context.Context, session *models.DraftSession) error
	GetSession(ctx context.Context, sessionID string) (*models.DraftSession, error)
	UpdateSession(ctx context.Context, session *models.DraftSession) error
	DeleteSession(ctx context.Context, sessionID string) error
	GetUserSessions(ctx context.Context, userID string) ([]*models.DraftSession, error)
	
	CreatePick(ctx context.Context, pick *models.DraftPick) error
	GetPicks(ctx context.Context, sessionID string) ([]*models.DraftPick, error)
	DeletePick(ctx context.Context, pickID string) error
}

// PostgresRepository implements Repository for PostgreSQL
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL draft repository
func NewPostgresRepository(db *sql.DB) Repository {
	return &PostgresRepository{db: db}
}

// CreateSession creates a new draft session
func (r *PostgresRepository) CreateSession(ctx context.Context, session *models.DraftSession) error {
	settingsJSON, err := json.Marshal(session.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	query := `
		INSERT INTO draft_sessions (
			id, user_id, league_id, name, draft_type, team_count, 
			round_count, user_position, current_pick, status, settings,
			started_at, completed_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err = r.db.ExecContext(ctx, query,
		session.ID,
		session.UserID,
		session.LeagueID,
		session.Name,
		session.DraftType,
		session.TeamCount,
		session.RoundCount,
		session.UserPosition,
		session.CurrentPick,
		session.Status,
		settingsJSON,
		session.StartedAt,
		session.CompletedAt,
		session.CreatedAt,
		session.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	return nil
}

// GetSession retrieves a draft session by ID
func (r *PostgresRepository) GetSession(ctx context.Context, sessionID string) (*models.DraftSession, error) {
	query := `
		SELECT id, user_id, league_id, name, draft_type, team_count,
			   round_count, user_position, current_pick, status, settings,
			   started_at, completed_at, created_at, updated_at
		FROM draft_sessions
		WHERE id = $1
	`

	session := &models.DraftSession{}
	var settingsJSON []byte

	err := r.db.QueryRowContext(ctx, query, sessionID).Scan(
		&session.ID,
		&session.UserID,
		&session.LeagueID,
		&session.Name,
		&session.DraftType,
		&session.TeamCount,
		&session.RoundCount,
		&session.UserPosition,
		&session.CurrentPick,
		&session.Status,
		&settingsJSON,
		&session.StartedAt,
		&session.CompletedAt,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	if err := json.Unmarshal(settingsJSON, &session.Settings); err != nil {
		return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
	}

	return session, nil
}

// UpdateSession updates a draft session
func (r *PostgresRepository) UpdateSession(ctx context.Context, session *models.DraftSession) error {
	settingsJSON, err := json.Marshal(session.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	query := `
		UPDATE draft_sessions
		SET name = $2, current_pick = $3, status = $4, settings = $5,
			started_at = $6, completed_at = $7, updated_at = $8
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query,
		session.ID,
		session.Name,
		session.CurrentPick,
		session.Status,
		settingsJSON,
		session.StartedAt,
		session.CompletedAt,
		session.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("session not found")
	}

	return nil
}

// DeleteSession deletes a draft session
func (r *PostgresRepository) DeleteSession(ctx context.Context, sessionID string) error {
	query := `DELETE FROM draft_sessions WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, sessionID)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("session not found")
	}

	return nil
}

// GetUserSessions retrieves all draft sessions for a user
func (r *PostgresRepository) GetUserSessions(ctx context.Context, userID string) ([]*models.DraftSession, error) {
	query := `
		SELECT id, user_id, league_id, name, draft_type, team_count,
			   round_count, user_position, current_pick, status, settings,
			   started_at, completed_at, created_at, updated_at
		FROM draft_sessions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*models.DraftSession

	for rows.Next() {
		session := &models.DraftSession{}
		var settingsJSON []byte

		err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.LeagueID,
			&session.Name,
			&session.DraftType,
			&session.TeamCount,
			&session.RoundCount,
			&session.UserPosition,
			&session.CurrentPick,
			&session.Status,
			&settingsJSON,
			&session.StartedAt,
			&session.CompletedAt,
			&session.CreatedAt,
			&session.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}

		if err := json.Unmarshal(settingsJSON, &session.Settings); err != nil {
			return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
		}

		sessions = append(sessions, session)
	}

	return sessions, nil
}

// CreatePick creates a new draft pick
func (r *PostgresRepository) CreatePick(ctx context.Context, pick *models.DraftPick) error {
	query := `
		INSERT INTO draft_picks (
			id, session_id, pick_number, round, round_pick,
			team_number, player_id, player_name, position, 
			is_keeper, picked_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.ExecContext(ctx, query,
		pick.ID,
		pick.SessionID,
		pick.PickNumber,
		pick.Round,
		pick.RoundPick,
		pick.TeamNumber,
		pick.PlayerID,
		pick.PlayerName,
		pick.Position,
		pick.IsKeeper,
		pick.PickedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create pick: %w", err)
	}

	return nil
}

// GetPicks retrieves all picks for a draft session
func (r *PostgresRepository) GetPicks(ctx context.Context, sessionID string) ([]*models.DraftPick, error) {
	query := `
		SELECT id, session_id, pick_number, round, round_pick,
			   team_number, player_id, player_name, position,
			   is_keeper, picked_at
		FROM draft_picks
		WHERE session_id = $1
		ORDER BY pick_number ASC
	`

	rows, err := r.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query picks: %w", err)
	}
	defer rows.Close()

	var picks []*models.DraftPick

	for rows.Next() {
		pick := &models.DraftPick{}

		err := rows.Scan(
			&pick.ID,
			&pick.SessionID,
			&pick.PickNumber,
			&pick.Round,
			&pick.RoundPick,
			&pick.TeamNumber,
			&pick.PlayerID,
			&pick.PlayerName,
			&pick.Position,
			&pick.IsKeeper,
			&pick.PickedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan pick: %w", err)
		}

		picks = append(picks, pick)
	}

	return picks, nil
}

// DeletePick deletes a draft pick
func (r *PostgresRepository) DeletePick(ctx context.Context, pickID string) error {
	query := `DELETE FROM draft_picks WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, pickID)
	if err != nil {
		return fmt.Errorf("failed to delete pick: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("pick not found")
	}

	return nil
}