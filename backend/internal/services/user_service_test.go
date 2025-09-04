package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/auth"
	"github.com/nfl-analytics/backend/internal/models"
)

// MockUserRepository for testing
type MockUserRepository struct {
	users       map[uuid.UUID]*models.User
	returnError error
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[uuid.UUID]*models.User),
	}
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	if m.returnError != nil {
		return nil, m.returnError
	}
	user, exists := m.users[id]
	if !exists {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.returnError != nil {
		return nil, m.returnError
	}
	for _, user := range m.users {
		if user.Email == email && user.DeletedAt == nil {
			return user, nil
		}
	}
	return nil, ErrUserNotFound
}

func (m *MockUserRepository) Update(ctx context.Context, user *models.User) error {
	if m.returnError != nil {
		return m.returnError
	}
	if _, exists := m.users[user.ID]; !exists {
		return ErrUserNotFound
	}
	user.UpdatedAt = time.Now()
	m.users[user.ID] = user
	return nil
}

func (m *MockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if m.returnError != nil {
		return m.returnError
	}
	user, exists := m.users[id]
	if !exists {
		return ErrUserNotFound
	}
	now := time.Now()
	user.DeletedAt = &now
	user.IsActive = false
	return nil
}

func TestUserService_GetProfile(t *testing.T) {
	ctx := context.Background()
	repo := NewMockUserRepository()
	service := NewUserService(repo)

	// Create test user
	userID := uuid.New()
	testUser := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.users[userID] = testUser

	tests := []struct {
		name    string
		userID  uuid.UUID
		want    *models.User
		wantErr bool
	}{
		{
			name:    "existing user",
			userID:  userID,
			want:    testUser,
			wantErr: false,
		},
		{
			name:    "non-existent user",
			userID:  uuid.New(),
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := service.GetProfile(ctx, tt.userID)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetProfile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got.ID != tt.want.ID {
				t.Errorf("GetProfile() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestUserService_UpdateProfile(t *testing.T) {
	ctx := context.Background()
	repo := NewMockUserRepository()
	service := NewUserService(repo)

	// Create test user
	userID := uuid.New()
	testUser := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.users[userID] = testUser

	tests := []struct {
		name    string
		userID  uuid.UUID
		update  *models.UserUpdateRequest
		wantErr bool
	}{
		{
			name:   "update existing user",
			userID: userID,
			update: &models.UserUpdateRequest{
				FirstName: "Updated",
				LastName:  "Name",
			},
			wantErr: false,
		},
		{
			name:   "update non-existent user",
			userID: uuid.New(),
			update: &models.UserUpdateRequest{
				FirstName: "New",
				LastName:  "User",
			},
			wantErr: true,
		},
		{
			name:   "partial update",
			userID: userID,
			update: &models.UserUpdateRequest{
				FirstName: "OnlyFirst",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := service.UpdateProfile(ctx, tt.userID, tt.update)
			if (err != nil) != tt.wantErr {
				t.Errorf("UpdateProfile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if tt.update.FirstName != "" && user.FirstName != tt.update.FirstName {
					t.Errorf("UpdateProfile() FirstName = %v, want %v", user.FirstName, tt.update.FirstName)
				}
				if tt.update.LastName != "" && user.LastName != tt.update.LastName {
					t.Errorf("UpdateProfile() LastName = %v, want %v", user.LastName, tt.update.LastName)
				}
			}
		})
	}
}

func TestUserService_DeleteAccount(t *testing.T) {
	ctx := context.Background()
	repo := NewMockUserRepository()
	service := NewUserService(repo)

	// Create test users
	activeUserID := uuid.New()
	activeUser := &models.User{
		ID:        activeUserID,
		Email:     "active@example.com",
		FirstName: "Active",
		LastName:  "User",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.users[activeUserID] = activeUser

	tests := []struct {
		name    string
		userID  uuid.UUID
		wantErr bool
	}{
		{
			name:    "delete existing user",
			userID:  activeUserID,
			wantErr: false,
		},
		{
			name:    "delete non-existent user",
			userID:  uuid.New(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.DeleteAccount(ctx, tt.userID)
			if (err != nil) != tt.wantErr {
				t.Errorf("DeleteAccount() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				// Check if user is soft deleted
				user := repo.users[tt.userID]
				if user.DeletedAt == nil {
					t.Error("DeleteAccount() did not set DeletedAt")
				}
				if user.IsActive {
					t.Error("DeleteAccount() did not set IsActive to false")
				}
			}
		})
	}
}

func TestUserService_ChangePassword(t *testing.T) {
	ctx := context.Background()
	repo := NewMockUserRepository()
	service := NewUserService(repo)

	// Create test user with a real hashed password for testing
	userID := uuid.New()
	// Hash a known password for testing
	pm := auth.NewPasswordManager(10)
	hashedPassword, _ := pm.HashPassword("OldPass123!")
	testUser := &models.User{
		ID:           userID,
		Email:        "test@example.com",
		PasswordHash: hashedPassword,
		FirstName:    "Test",
		LastName:     "User",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	repo.users[userID] = testUser

	tests := []struct {
		name    string
		userID  uuid.UUID
		request *models.PasswordChangeRequest
		wantErr bool
		errMsg  string
	}{
		{
			name:   "valid password change",
			userID: userID,
			request: &models.PasswordChangeRequest{
				OldPassword: "OldPass123!",
				NewPassword: "NewPass456!",
			},
			wantErr: false,
		},
		{
			name:   "weak new password",
			userID: userID,
			request: &models.PasswordChangeRequest{
				OldPassword: "OldPass123!",
				NewPassword: "weak",
			},
			wantErr: true,
			errMsg:  "password validation",
		},
		{
			name:   "user not found",
			userID: uuid.New(),
			request: &models.PasswordChangeRequest{
				OldPassword: "OldPass123!",
				NewPassword: "NewPass456!",
			},
			wantErr: true,
			errMsg:  "not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Note: In real implementation, we'd mock the password manager
			// For now, we're testing the service logic structure
			err := service.ChangePassword(ctx, tt.userID, tt.request)
			if (err != nil) != tt.wantErr {
				t.Errorf("ChangePassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestUserService_ErrorHandling(t *testing.T) {
	ctx := context.Background()
	repo := NewMockUserRepository()
	service := NewUserService(repo)

	// Test database error handling
	repo.returnError = errors.New("database error")

	_, err := service.GetProfile(ctx, uuid.New())
	if err == nil {
		t.Error("GetProfile() should return error when repository fails")
	}

	_, err = service.UpdateProfile(ctx, uuid.New(), &models.UserUpdateRequest{})
	if err == nil {
		t.Error("UpdateProfile() should return error when repository fails")
	}

	err = service.DeleteAccount(ctx, uuid.New())
	if err == nil {
		t.Error("DeleteAccount() should return error when repository fails")
	}
}