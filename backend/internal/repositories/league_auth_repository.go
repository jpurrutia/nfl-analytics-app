package repositories

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/database"
	"github.com/nfl-analytics/backend/internal/models"
)

var (
	ErrLeagueAuthNotFound = errors.New("league auth not found")
	ErrLeagueAuthExists   = errors.New("league auth already exists")
)

// LeagueAuthRepository defines the interface for league authentication operations
type LeagueAuthRepository interface {
	Store(ctx context.Context, auth *models.LeagueAuth) error
	GetByUserAndPlatform(ctx context.Context, userID uuid.UUID, platform string) (*models.LeagueAuth, error)
	Update(ctx context.Context, auth *models.LeagueAuth) error
	Delete(ctx context.Context, userID uuid.UUID, platform string) error
	GetAllByUser(ctx context.Context, userID uuid.UUID) ([]*models.LeagueAuth, error)
}

// postgresLeagueAuthRepository implements LeagueAuthRepository using PostgreSQL
type postgresLeagueAuthRepository struct {
	db *sql.DB
}

// NewPostgresLeagueAuthRepository creates a new PostgreSQL league auth repository
func NewPostgresLeagueAuthRepository(db *database.PostgresDB) LeagueAuthRepository {
	return &postgresLeagueAuthRepository{db: db.DB}
}

// Store creates a new league auth record
func (r *postgresLeagueAuthRepository) Store(ctx context.Context, auth *models.LeagueAuth) error {
	query := `
		INSERT INTO league_auth (id, user_id, platform, encrypted_credentials, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, platform) DO UPDATE SET
		encrypted_credentials = EXCLUDED.encrypted_credentials,
		updated_at = EXCLUDED.updated_at`
	
	_, err := r.db.ExecContext(ctx, query,
		auth.ID,
		auth.UserID,
		auth.Platform,
		auth.EncryptedCredentials,
		auth.CreatedAt,
		auth.UpdatedAt,
	)
	
	if err != nil {
		return err
	}
	
	return nil
}

// GetByUserAndPlatform retrieves league auth by user ID and platform
func (r *postgresLeagueAuthRepository) GetByUserAndPlatform(ctx context.Context, userID uuid.UUID, platform string) (*models.LeagueAuth, error) {
	query := `
		SELECT id, user_id, platform, encrypted_credentials, created_at, updated_at
		FROM league_auth
		WHERE user_id = $1 AND platform = $2`
	
	auth := &models.LeagueAuth{}
	err := r.db.QueryRowContext(ctx, query, userID, platform).Scan(
		&auth.ID,
		&auth.UserID,
		&auth.Platform,
		&auth.EncryptedCredentials,
		&auth.CreatedAt,
		&auth.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrLeagueAuthNotFound
		}
		return nil, err
	}
	
	return auth, nil
}

// Update updates an existing league auth record
func (r *postgresLeagueAuthRepository) Update(ctx context.Context, auth *models.LeagueAuth) error {
	query := `
		UPDATE league_auth
		SET encrypted_credentials = $1, updated_at = $2
		WHERE user_id = $3 AND platform = $4`
	
	result, err := r.db.ExecContext(ctx, query,
		auth.EncryptedCredentials,
		time.Now(),
		auth.UserID,
		auth.Platform,
	)
	
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return ErrLeagueAuthNotFound
	}
	
	return nil
}

// Delete removes a league auth record
func (r *postgresLeagueAuthRepository) Delete(ctx context.Context, userID uuid.UUID, platform string) error {
	query := `DELETE FROM league_auth WHERE user_id = $1 AND platform = $2`
	
	result, err := r.db.ExecContext(ctx, query, userID, platform)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return ErrLeagueAuthNotFound
	}
	
	return nil
}

// GetAllByUser retrieves all league auth records for a user
func (r *postgresLeagueAuthRepository) GetAllByUser(ctx context.Context, userID uuid.UUID) ([]*models.LeagueAuth, error) {
	query := `
		SELECT id, user_id, platform, encrypted_credentials, created_at, updated_at
		FROM league_auth
		WHERE user_id = $1
		ORDER BY platform`
	
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var auths []*models.LeagueAuth
	for rows.Next() {
		auth := &models.LeagueAuth{}
		err := rows.Scan(
			&auth.ID,
			&auth.UserID,
			&auth.Platform,
			&auth.EncryptedCredentials,
			&auth.CreatedAt,
			&auth.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		auths = append(auths, auth)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return auths, nil
}