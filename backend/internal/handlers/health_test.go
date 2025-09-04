package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/nfl-analytics/backend/internal/database"
)

func TestHealthHandler_Health(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		mockDB         *database.PostgresDB
		expectedStatus int
		checkResponse  func(t *testing.T, body map[string]interface{})
	}{
		{
			name:           "healthy with nil database",
			mockDB:         nil,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body map[string]interface{}) {
				if body["status"] != "healthy" {
					t.Errorf("expected status healthy, got %v", body["status"])
				}
				services, ok := body["services"].(map[string]interface{})
				if !ok {
					t.Fatal("services not found in response")
				}
				postgres, ok := services["postgres"].(map[string]interface{})
				if !ok {
					t.Fatal("postgres not found in services")
				}
				if postgres["status"] != "not configured" {
					t.Errorf("expected postgres status 'not configured', got %v", postgres["status"])
				}
			},
		},
		// Note: Testing with actual database connection would require more setup
		// For now, we're testing the handler logic with nil dependencies
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHealthHandler(tt.mockDB, nil)

			// Create test context
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/health", nil)

			// Call handler
			handler.Health(c)

			// Check status code
			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			// Parse response
			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("failed to parse response: %v", err)
			}

			// Run custom checks
			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestHealthHandler_ResponseFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewHealthHandler(nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/health", nil)

	handler.Health(c)

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	// Check required fields
	requiredFields := []string{"status", "timestamp", "services"}
	for _, field := range requiredFields {
		if _, ok := response[field]; !ok {
			t.Errorf("required field %s not found in response", field)
		}
	}

	// Check timestamp format
	timestamp, ok := response["timestamp"].(string)
	if !ok {
		t.Error("timestamp is not a string")
	} else if timestamp == "" {
		t.Error("timestamp is empty")
	}
}