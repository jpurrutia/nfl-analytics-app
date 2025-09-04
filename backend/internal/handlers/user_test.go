package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/auth"
	"github.com/nfl-analytics/backend/internal/models"
	"github.com/nfl-analytics/backend/internal/services"
)

// MockUserService for testing
type MockUserService struct {
	users       map[uuid.UUID]*models.User
	returnError error
}

func NewMockUserService() *MockUserService {
	return &MockUserService{
		users: make(map[uuid.UUID]*models.User),
	}
}

func (m *MockUserService) GetProfile(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	if m.returnError != nil {
		return nil, m.returnError
	}
	user, exists := m.users[userID]
	if !exists {
		return nil, services.ErrUserNotFound
	}
	return user, nil
}

func (m *MockUserService) UpdateProfile(ctx context.Context, userID uuid.UUID, req *models.UserUpdateRequest) (*models.User, error) {
	if m.returnError != nil {
		return nil, m.returnError
	}
	user, exists := m.users[userID]
	if !exists {
		return nil, services.ErrUserNotFound
	}
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	return user, nil
}

func (m *MockUserService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	if m.returnError != nil {
		return m.returnError
	}
	if _, exists := m.users[userID]; !exists {
		return services.ErrUserNotFound
	}
	delete(m.users, userID)
	return nil
}

func (m *MockUserService) ChangePassword(ctx context.Context, userID uuid.UUID, req *models.PasswordChangeRequest) error {
	if m.returnError != nil {
		return m.returnError
	}
	if _, exists := m.users[userID]; !exists {
		return services.ErrUserNotFound
	}
	return nil
}

func TestUserHandler_GetProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	service := NewMockUserService()
	handler := NewUserHandler(service)

	// Create test user
	userID := uuid.New()
	testUser := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		IsActive:  true,
	}
	service.users[userID] = testUser

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		expectedStatus int
		expectedBody   map[string]interface{}
	}{
		{
			name: "successful get profile",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, userID)
			},
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"email":      "test@example.com",
				"first_name": "Test",
				"last_name":  "User",
			},
		},
		{
			name: "unauthorized - no user ID",
			setupContext: func(c *gin.Context) {
				// Don't set user ID
			},
			expectedStatus: http.StatusUnauthorized,
			expectedBody: map[string]interface{}{
				"error": "unauthorized",
			},
		},
		{
			name: "user not found",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, uuid.New())
			},
			expectedStatus: http.StatusNotFound,
			expectedBody: map[string]interface{}{
				"error": "user not found",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/api/users/profile", nil)
			
			tt.setupContext(c)
			handler.GetProfile(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var response models.User
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if response.Email != tt.expectedBody["email"] {
					t.Errorf("Expected email %v, got %v", tt.expectedBody["email"], response.Email)
				}
			}
		})
	}
}

func TestUserHandler_UpdateProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	service := NewMockUserService()
	handler := NewUserHandler(service)

	// Create test user
	userID := uuid.New()
	testUser := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		IsActive:  true,
	}
	service.users[userID] = testUser

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		requestBody    interface{}
		expectedStatus int
	}{
		{
			name: "successful update",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, userID)
			},
			requestBody: models.UserUpdateRequest{
				FirstName: "Updated",
				LastName:  "Name",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "unauthorized",
			setupContext: func(c *gin.Context) {
				// No user ID set
			},
			requestBody: models.UserUpdateRequest{
				FirstName: "Updated",
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid request body",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, userID)
			},
			requestBody:    "invalid json",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			
			body, _ := json.Marshal(tt.requestBody)
			c.Request = httptest.NewRequest("PUT", "/api/users/profile", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			
			tt.setupContext(c)
			handler.UpdateProfile(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestUserHandler_DeleteAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	service := NewMockUserService()
	handler := NewUserHandler(service)

	// Create test user
	userID := uuid.New()
	testUser := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		IsActive:  true,
	}
	service.users[userID] = testUser

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		expectedStatus int
	}{
		{
			name: "successful delete",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, userID)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "unauthorized",
			setupContext: func(c *gin.Context) {
				// No user ID set
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "user not found",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, uuid.New())
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("DELETE", "/api/users/account", nil)
			
			tt.setupContext(c)
			handler.DeleteAccount(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestUserHandler_ChangePassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	service := NewMockUserService()
	handler := NewUserHandler(service)

	// Create test user
	userID := uuid.New()
	testUser := &models.User{
		ID:           userID,
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
		FirstName:    "Test",
		LastName:     "User",
		IsActive:     true,
	}
	service.users[userID] = testUser

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		requestBody    interface{}
		expectedStatus int
	}{
		{
			name: "successful password change",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, userID)
			},
			requestBody: models.PasswordChangeRequest{
				OldPassword: "OldPass123!",
				NewPassword: "NewPass456!",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "unauthorized",
			setupContext: func(c *gin.Context) {
				// No user ID set
			},
			requestBody: models.PasswordChangeRequest{
				OldPassword: "OldPass123!",
				NewPassword: "NewPass456!",
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid request",
			setupContext: func(c *gin.Context) {
				c.Set(auth.UserIDKey, userID)
			},
			requestBody: models.PasswordChangeRequest{
				OldPassword: "",
				NewPassword: "NewPass456!",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			
			body, _ := json.Marshal(tt.requestBody)
			c.Request = httptest.NewRequest("POST", "/api/users/password", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")
			
			tt.setupContext(c)
			handler.ChangePassword(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}