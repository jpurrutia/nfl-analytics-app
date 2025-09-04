package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/nfl-analytics/backend/internal/models"
)

// LeagueRepository defines the interface for league data access
type LeagueRepository interface {
	Create(ctx context.Context, league *models.League) error
	GetByID(ctx context.Context, id string) (*models.League, error)
	GetByUserID(ctx context.Context, userID string) ([]*models.League, error)
	GetByExternalID(ctx context.Context, externalID, userID string) (*models.League, error)
	Update(ctx context.Context, league *models.League) error
	Delete(ctx context.Context, id string) error
	GetActiveLeagues(ctx context.Context) ([]*models.League, error)
}

// PostgresLeagueRepository implements LeagueRepository for PostgreSQL
type PostgresLeagueRepository struct {
	db *sql.DB
}

// NewPostgresLeagueRepository creates a new PostgreSQL league repository
func NewPostgresLeagueRepository(db *sql.DB) LeagueRepository {
	return &PostgresLeagueRepository{db: db}
}

// Create inserts a new league
func (r *PostgresLeagueRepository) Create(ctx context.Context, league *models.League) error {
	settingsJSON, err := json.Marshal(league.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	query := `
		INSERT INTO leagues (
			id, user_id, platform, external_id, name, season, 
			settings, teams_data, is_active, last_sync_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err = r.db.ExecContext(ctx, query,
		league.ID,
		league.UserID,
		league.Platform,
		league.ExternalID,
		league.Name,
		league.Season,
		settingsJSON,
		league.TeamsData,
		league.IsActive,
		league.LastSyncAt,
		league.CreatedAt,
		league.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create league: %w", err)
	}

	return nil
}

// GetByID retrieves a league by its ID
func (r *PostgresLeagueRepository) GetByID(ctx context.Context, id string) (*models.League, error) {
	query := `
		SELECT id, user_id, platform, external_id, name, season, 
			   settings, teams_data, is_active, last_sync_at, created_at, updated_at
		FROM leagues
		WHERE id = $1
	`

	league := &models.League{}
	var settingsJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&league.ID,
		&league.UserID,
		&league.Platform,
		&league.ExternalID,
		&league.Name,
		&league.Season,
		&settingsJSON,
		&league.TeamsData,
		&league.IsActive,
		&league.LastSyncAt,
		&league.CreatedAt,
		&league.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("league not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get league: %w", err)
	}

	if err := json.Unmarshal(settingsJSON, &league.Settings); err != nil {
		return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
	}

	return league, nil
}

// GetByUserID retrieves all leagues for a user
func (r *PostgresLeagueRepository) GetByUserID(ctx context.Context, userID string) ([]*models.League, error) {
	query := `
		SELECT id, user_id, platform, external_id, name, season, 
			   settings, teams_data, is_active, last_sync_at, created_at, updated_at
		FROM leagues
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query leagues: %w", err)
	}
	defer rows.Close()

	var leagues []*models.League

	for rows.Next() {
		league := &models.League{}
		var settingsJSON []byte

		err := rows.Scan(
			&league.ID,
			&league.UserID,
			&league.Platform,
			&league.ExternalID,
			&league.Name,
			&league.Season,
			&settingsJSON,
			&league.TeamsData,
			&league.IsActive,
			&league.LastSyncAt,
			&league.CreatedAt,
			&league.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan league: %w", err)
		}

		if err := json.Unmarshal(settingsJSON, &league.Settings); err != nil {
			return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
		}

		leagues = append(leagues, league)
	}

	return leagues, nil
}

// GetByExternalID retrieves a league by external ID and user ID
func (r *PostgresLeagueRepository) GetByExternalID(ctx context.Context, externalID, userID string) (*models.League, error) {
	query := `
		SELECT id, user_id, platform, external_id, name, season, 
			   settings, teams_data, is_active, last_sync_at, created_at, updated_at
		FROM leagues
		WHERE external_id = $1 AND user_id = $2
	`

	league := &models.League{}
	var settingsJSON []byte

	err := r.db.QueryRowContext(ctx, query, externalID, userID).Scan(
		&league.ID,
		&league.UserID,
		&league.Platform,
		&league.ExternalID,
		&league.Name,
		&league.Season,
		&settingsJSON,
		&league.TeamsData,
		&league.IsActive,
		&league.LastSyncAt,
		&league.CreatedAt,
		&league.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // Not an error, just not found
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get league: %w", err)
	}

	if err := json.Unmarshal(settingsJSON, &league.Settings); err != nil {
		return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
	}

	return league, nil
}

// Update updates a league
func (r *PostgresLeagueRepository) Update(ctx context.Context, league *models.League) error {
	settingsJSON, err := json.Marshal(league.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	query := `
		UPDATE leagues
		SET name = $2, season = $3, settings = $4, teams_data = $5, 
			is_active = $6, last_sync_at = $7, updated_at = $8
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query,
		league.ID,
		league.Name,
		league.Season,
		settingsJSON,
		league.TeamsData,
		league.IsActive,
		league.LastSyncAt,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update league: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("league not found")
	}

	return nil
}

// Delete removes a league
func (r *PostgresLeagueRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM leagues WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete league: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("league not found")
	}

	return nil
}

// GetActiveLeagues retrieves all active leagues for batch processing
func (r *PostgresLeagueRepository) GetActiveLeagues(ctx context.Context) ([]*models.League, error) {
	query := `
		SELECT id, user_id, platform, external_id, name, season, 
			   settings, teams_data, is_active, last_sync_at, created_at, updated_at
		FROM leagues
		WHERE is_active = true
		ORDER BY last_sync_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query active leagues: %w", err)
	}
	defer rows.Close()

	var leagues []*models.League

	for rows.Next() {
		league := &models.League{}
		var settingsJSON []byte

		err := rows.Scan(
			&league.ID,
			&league.UserID,
			&league.Platform,
			&league.ExternalID,
			&league.Name,
			&league.Season,
			&settingsJSON,
			&league.TeamsData,
			&league.IsActive,
			&league.LastSyncAt,
			&league.CreatedAt,
			&league.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan league: %w", err)
		}

		if err := json.Unmarshal(settingsJSON, &league.Settings); err != nil {
			return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
		}

		leagues = append(leagues, league)
	}

	return leagues, nil
}