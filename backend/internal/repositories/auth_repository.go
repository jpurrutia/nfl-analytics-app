package repositories

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/database"
)

// RefreshToken represents a refresh token in the database
type RefreshToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Token     string
	ExpiresAt time.Time
	CreatedAt time.Time
}

// AuthRepository interface defines authentication data operations
type AuthRepository interface {
	StoreRefreshToken(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) error
	GetRefreshToken(ctx context.Context, token string) (*RefreshToken, error)
	DeleteRefreshToken(ctx context.Context, token string) error
	DeleteUserRefreshTokens(ctx context.Context, userID uuid.UUID) error
	UpdateLastLogin(ctx context.Context, userID uuid.UUID) error
}

// PostgresAuthRepository implements AuthRepository using PostgreSQL
type PostgresAuthRepository struct {
	db *database.PostgresDB
}

// NewPostgresAuthRepository creates a new PostgreSQL auth repository
func NewPostgresAuthRepository(db *database.PostgresDB) AuthRepository {
	return &PostgresAuthRepository{
		db: db,
	}
}

// StoreRefreshToken stores a new refresh token
func (r *PostgresAuthRepository) StoreRefreshToken(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	
	_, err := r.db.DB.ExecContext(
		ctx,
		query,
		uuid.New(),
		userID,
		token,
		expiresAt,
		time.Now(),
	)
	
	return err
}

// GetRefreshToken retrieves a refresh token
func (r *PostgresAuthRepository) GetRefreshToken(ctx context.Context, token string) (*RefreshToken, error) {
	var rt RefreshToken
	
	query := `
		SELECT id, user_id, token, expires_at, created_at
		FROM refresh_tokens
		WHERE token = $1 AND expires_at > $2
	`
	
	err := r.db.DB.QueryRowContext(ctx, query, token, time.Now()).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.Token,
		&rt.ExpiresAt,
		&rt.CreatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	
	return &rt, nil
}

// DeleteRefreshToken deletes a specific refresh token
func (r *PostgresAuthRepository) DeleteRefreshToken(ctx context.Context, token string) error {
	query := `DELETE FROM refresh_tokens WHERE token = $1`
	
	result, err := r.db.DB.ExecContext(ctx, query, token)
	if err != nil {
		return err
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrTokenNotFound
	}
	
	return nil
}

// DeleteUserRefreshTokens deletes all refresh tokens for a user
func (r *PostgresAuthRepository) DeleteUserRefreshTokens(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE user_id = $1`
	
	_, err := r.db.DB.ExecContext(ctx, query, userID)
	return err
}

// UpdateLastLogin updates the user's last login timestamp
func (r *PostgresAuthRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users 
		SET last_login_at = $2, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL
	`
	
	_, err := r.db.DB.ExecContext(ctx, query, userID, time.Now())
	return err
}