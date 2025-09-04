package repositories

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/models"
)

// MockUserRepository for testing
type MockUserRepository struct {
	users map[uuid.UUID]*models.User
	err   error
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[uuid.UUID]*models.User),
	}
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	user, exists := m.users[id]
	if !exists {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, user := range m.users {
		if user.Email == email && user.DeletedAt == nil {
			return user, nil
		}
	}
	return nil, ErrUserNotFound
}

func (m *MockUserRepository) Update(ctx context.Context, user *models.User) error {
	if m.err != nil {
		return m.err
	}
	if _, exists := m.users[user.ID]; !exists {
		return ErrUserNotFound
	}
	user.UpdatedAt = time.Now()
	m.users[user.ID] = user
	return nil
}

func (m *MockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if m.err != nil {
		return m.err
	}
	user, exists := m.users[id]
	if !exists {
		return ErrUserNotFound
	}
	now := time.Now()
	user.DeletedAt = &now
	return nil
}

func TestUserRepository_GetByID(t *testing.T) {
	repo := NewMockUserRepository()
	ctx := context.Background()
	
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
		id      uuid.UUID
		want    *models.User
		wantErr bool
	}{
		{
			name:    "existing user",
			id:      userID,
			want:    testUser,
			wantErr: false,
		},
		{
			name:    "non-existent user",
			id:      uuid.New(),
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := repo.GetByID(ctx, tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetByID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got.ID != tt.want.ID {
				t.Errorf("GetByID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestUserRepository_GetByEmail(t *testing.T) {
	repo := NewMockUserRepository()
	ctx := context.Background()
	
	// Create test users
	activeUser := &models.User{
		ID:        uuid.New(),
		Email:     "active@example.com",
		FirstName: "Active",
		LastName:  "User",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.users[activeUser.ID] = activeUser

	deletedTime := time.Now()
	deletedUser := &models.User{
		ID:        uuid.New(),
		Email:     "deleted@example.com",
		FirstName: "Deleted",
		LastName:  "User",
		IsActive:  false,
		DeletedAt: &deletedTime,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.users[deletedUser.ID] = deletedUser

	tests := []struct {
		name    string
		email   string
		want    *models.User
		wantErr bool
	}{
		{
			name:    "existing active user",
			email:   "active@example.com",
			want:    activeUser,
			wantErr: false,
		},
		{
			name:    "deleted user",
			email:   "deleted@example.com",
			want:    nil,
			wantErr: true,
		},
		{
			name:    "non-existent user",
			email:   "nonexistent@example.com",
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := repo.GetByEmail(ctx, tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetByEmail() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got.Email != tt.want.Email {
				t.Errorf("GetByEmail() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestUserRepository_Update(t *testing.T) {
	repo := NewMockUserRepository()
	ctx := context.Background()
	
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
		user    *models.User
		wantErr bool
	}{
		{
			name: "update existing user",
			user: &models.User{
				ID:        userID,
				Email:     "updated@example.com",
				FirstName: "Updated",
				LastName:  "User",
			},
			wantErr: false,
		},
		{
			name: "update non-existent user",
			user: &models.User{
				ID:        uuid.New(),
				Email:     "new@example.com",
				FirstName: "New",
				LastName:  "User",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.Update(ctx, tt.user)
			if (err != nil) != tt.wantErr {
				t.Errorf("Update() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				updated, _ := repo.GetByID(ctx, tt.user.ID)
				if updated.Email != tt.user.Email {
					t.Errorf("Update() did not update email: got %v, want %v", updated.Email, tt.user.Email)
				}
			}
		})
	}
}

func TestUserRepository_Delete(t *testing.T) {
	repo := NewMockUserRepository()
	ctx := context.Background()
	
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
		id      uuid.UUID
		wantErr bool
	}{
		{
			name:    "delete existing user",
			id:      userID,
			wantErr: false,
		},
		{
			name:    "delete non-existent user",
			id:      uuid.New(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.Delete(ctx, tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("Delete() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				user, _ := repo.users[tt.id]
				if user.DeletedAt == nil {
					t.Error("Delete() did not set DeletedAt timestamp")
				}
			}
		})
	}
}