package repositories

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/database"
	"github.com/nfl-analytics/backend/internal/models"
)

var (
	ErrUserNotFound  = errors.New("user not found")
	ErrUserExists    = errors.New("user already exists")
	ErrTokenNotFound = errors.New("token not found")
)

// UserRepository interface defines user data operations
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// PostgresUserRepository implements UserRepository using PostgreSQL
type PostgresUserRepository struct {
	db *database.PostgresDB
}

// NewPostgresUserRepository creates a new PostgreSQL user repository
func NewPostgresUserRepository(db *database.PostgresDB) UserRepository {
	return &PostgresUserRepository{
		db: db,
	}
}

// GetByID retrieves a user by their ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	
	query := `
		SELECT id, email, password_hash, first_name, last_name, 
		       is_active, is_verified, created_at, updated_at, last_login_at
		FROM users 
		WHERE id = $1 AND deleted_at IS NULL
	`
	
	err := r.db.DB.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.IsActive,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	
	return &user, nil
}

// GetByEmail retrieves a user by their email
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	
	query := `
		SELECT id, email, password_hash, first_name, last_name, 
		       is_active, is_verified, created_at, updated_at, last_login_at
		FROM users 
		WHERE email = $1 AND deleted_at IS NULL
	`
	
	err := r.db.DB.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.IsActive,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	
	return &user, nil
}

// Update updates a user's information
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users 
		SET first_name = $2, last_name = $3, updated_at = $4, password_hash = $5
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at
	`
	
	err := r.db.DB.QueryRowContext(
		ctx, 
		query,
		user.ID,
		user.FirstName,
		user.LastName,
		time.Now(),
		user.PasswordHash,
	).Scan(&user.UpdatedAt)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrUserNotFound
		}
		return err
	}
	
	return nil
}

// Delete soft deletes a user account
func (r *PostgresUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE users 
		SET deleted_at = $2, is_active = false, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL
	`
	
	result, err := r.db.DB.ExecContext(ctx, query, id, time.Now())
	if err != nil {
		return err
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	
	return nil
}

// Create creates a new user (helper method for auth service)
func (r *PostgresUserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, first_name, last_name, 
		                  is_active, is_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	
	_, err := r.db.DB.ExecContext(
		ctx,
		query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.IsActive,
		user.IsVerified,
		user.CreatedAt,
		user.UpdatedAt,
	)
	
	if err != nil {
		// Check for unique constraint violation
		if strings.Contains(err.Error(), "duplicate key") || 
		   strings.Contains(err.Error(), "users_email_key") {
			return ErrUserExists
		}
		// Return the actual error for debugging
		return err
	}
	
	return nil
}

// UpdateLastLogin updates the user's last login timestamp
func (r *PostgresUserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE users 
		SET last_login_at = $2, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL
	`
	
	_, err := r.db.DB.ExecContext(ctx, query, id, time.Now())
	return err
}