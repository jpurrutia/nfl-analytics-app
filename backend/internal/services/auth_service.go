package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/auth"
	"github.com/nfl-analytics/backend/internal/models"
	"github.com/nfl-analytics/backend/internal/repositories"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailExists        = errors.New("email already registered")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

// AuthService handles authentication business logic
type AuthService interface {
	Register(ctx context.Context, req *models.RegisterRequest) (*models.AuthResponse, error)
	Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*models.AuthResponse, error)
	Logout(ctx context.Context, userID uuid.UUID) error
}

// authService implements AuthService
type authService struct {
	authRepo        repositories.AuthRepository
	userRepo        repositories.UserRepository
	jwtManager      *auth.JWTManager
	passwordManager *auth.PasswordManager
}

// NewAuthService creates a new auth service
func NewAuthService(authRepo repositories.AuthRepository, userRepo repositories.UserRepository, jwtManager *auth.JWTManager) AuthService {
	return &authService{
		authRepo:        authRepo,
		userRepo:        userRepo,
		jwtManager:      jwtManager,
		passwordManager: auth.NewPasswordManager(10),
	}
}

// Register creates a new user account
func (s *authService) Register(ctx context.Context, req *models.RegisterRequest) (*models.AuthResponse, error) {
	// Trim and validate input
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	
	// Check if email already exists
	existingUser, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil && err != repositories.ErrUserNotFound {
		return nil, err
	}
	if existingUser != nil {
		return nil, ErrEmailExists
	}
	
	// Validate password strength
	if err := s.passwordManager.ValidatePasswordStrength(req.Password); err != nil {
		return nil, err
	}
	
	// Hash password
	hashedPassword, err := s.passwordManager.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	
	// Create user
	user := &models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		IsActive:     true,
		IsVerified:   false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	
	// Use the Create method from user repository
	if repo, ok := s.userRepo.(*repositories.PostgresUserRepository); ok {
		if err := repo.Create(ctx, user); err != nil {
			if err == repositories.ErrUserExists {
				return nil, ErrEmailExists
			}
			return nil, err
		}
	} else {
		return nil, errors.New("repository does not support user creation")
	}
	
	// Generate tokens
	accessToken, refreshToken, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		return nil, err
	}
	
	// Store refresh token
	expiresAt := time.Now().Add(time.Duration(7*24) * time.Hour)
	if err := s.authRepo.StoreRefreshToken(ctx, user.ID, refreshToken, expiresAt); err != nil {
		return nil, err
	}
	
	// Update last login
	_ = s.authRepo.UpdateLastLogin(ctx, user.ID)
	
	return &models.AuthResponse{
		User: &models.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Login authenticates a user
func (s *authService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	// Trim email
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if err == repositories.ErrUserNotFound {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	
	// Check if user is active
	if !user.IsActive {
		return nil, ErrInvalidCredentials
	}
	
	// Verify password
	if err := s.passwordManager.VerifyPassword(user.PasswordHash, req.Password); err != nil {
		return nil, ErrInvalidCredentials
	}
	
	// Generate tokens
	accessToken, refreshToken, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		return nil, err
	}
	
	// Store refresh token
	expiresAt := time.Now().Add(time.Duration(7*24) * time.Hour)
	if err := s.authRepo.StoreRefreshToken(ctx, user.ID, refreshToken, expiresAt); err != nil {
		return nil, err
	}
	
	// Update last login
	_ = s.authRepo.UpdateLastLogin(ctx, user.ID)
	
	return &models.AuthResponse{
		User: &models.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// RefreshToken generates new tokens using a refresh token
func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	// Get refresh token from database
	storedToken, err := s.authRepo.GetRefreshToken(ctx, refreshToken)
	if err != nil {
		if err == repositories.ErrTokenNotFound {
			return nil, ErrInvalidToken
		}
		return nil, err
	}
	
	// Check if token is expired
	if time.Now().After(storedToken.ExpiresAt) {
		_ = s.authRepo.DeleteRefreshToken(ctx, refreshToken)
		return nil, ErrInvalidToken
	}
	
	// Get user
	user, err := s.userRepo.GetByID(ctx, storedToken.UserID)
	if err != nil {
		return nil, err
	}
	
	// Check if user is active
	if !user.IsActive {
		_ = s.authRepo.DeleteRefreshToken(ctx, refreshToken)
		return nil, ErrInvalidToken
	}
	
	// Generate new tokens
	newAccessToken, newRefreshToken, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		return nil, err
	}
	
	// Delete old refresh token
	_ = s.authRepo.DeleteRefreshToken(ctx, refreshToken)
	
	// Store new refresh token
	expiresAt := time.Now().Add(time.Duration(7*24) * time.Hour)
	if err := s.authRepo.StoreRefreshToken(ctx, user.ID, newRefreshToken, expiresAt); err != nil {
		return nil, err
	}
	
	return &models.AuthResponse{
		User: &models.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		},
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

// Logout invalidates all refresh tokens for a user
func (s *authService) Logout(ctx context.Context, userID uuid.UUID) error {
	return s.authRepo.DeleteUserRefreshTokens(ctx, userID)
}