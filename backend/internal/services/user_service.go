package services

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/auth"
	"github.com/nfl-analytics/backend/internal/models"
	"github.com/nfl-analytics/backend/internal/repositories"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidPassword   = errors.New("invalid password")
	ErrWeakPassword      = errors.New("password does not meet requirements")
	ErrIncorrectPassword = errors.New("incorrect password")
)

// UserService handles user business logic
type UserService interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (*models.User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req *models.UserUpdateRequest) (*models.User, error)
	DeleteAccount(ctx context.Context, userID uuid.UUID) error
	ChangePassword(ctx context.Context, userID uuid.UUID, req *models.PasswordChangeRequest) error
}

// userService implements UserService
type userService struct {
	userRepo        repositories.UserRepository
	passwordManager *auth.PasswordManager
}

// NewUserService creates a new user service
func NewUserService(userRepo repositories.UserRepository) UserService {
	return &userService{
		userRepo:        userRepo,
		passwordManager: auth.NewPasswordManager(10),
	}
}

// GetProfile retrieves a user's profile
func (s *userService) GetProfile(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == repositories.ErrUserNotFound {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	
	// Don't return password hash
	user.PasswordHash = ""
	return user, nil
}

// UpdateProfile updates a user's profile information
func (s *userService) UpdateProfile(ctx context.Context, userID uuid.UUID, req *models.UserUpdateRequest) (*models.User, error) {
	// Get existing user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == repositories.ErrUserNotFound {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	
	// Update fields if provided
	if req.FirstName != "" {
		user.FirstName = strings.TrimSpace(req.FirstName)
	}
	if req.LastName != "" {
		user.LastName = strings.TrimSpace(req.LastName)
	}
	
	// Save updates
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	
	// Don't return password hash
	user.PasswordHash = ""
	return user, nil
}

// DeleteAccount soft deletes a user's account
func (s *userService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	// Verify user exists
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == repositories.ErrUserNotFound {
			return ErrUserNotFound
		}
		return err
	}
	
	// Soft delete the account
	return s.userRepo.Delete(ctx, userID)
}

// ChangePassword changes a user's password
func (s *userService) ChangePassword(ctx context.Context, userID uuid.UUID, req *models.PasswordChangeRequest) error {
	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if err == repositories.ErrUserNotFound {
			return ErrUserNotFound
		}
		return err
	}
	
	// Verify old password
	if err := s.passwordManager.VerifyPassword(user.PasswordHash, req.OldPassword); err != nil {
		return ErrIncorrectPassword
	}
	
	// Validate new password strength
	if err := s.passwordManager.ValidatePasswordStrength(req.NewPassword); err != nil {
		return ErrWeakPassword
	}
	
	// Hash new password
	hashedPassword, err := s.passwordManager.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}
	
	// Update password
	user.PasswordHash = hashedPassword
	return s.userRepo.Update(ctx, user)
}