package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestJWTManager_GenerateAndValidateToken(t *testing.T) {
	jwtManager := NewJWTManager("test_secret_key", 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()
	email := "test@example.com"

	t.Run("generate and validate access token", func(t *testing.T) {
		token, err := jwtManager.GenerateAccessToken(userID, email)
		if err != nil {
			t.Fatalf("GenerateAccessToken() error = %v", err)
		}

		if token == "" {
			t.Fatal("GenerateAccessToken() returned empty token")
		}

		// Validate the token
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			t.Fatalf("ValidateToken() error = %v", err)
		}

		// Check claims
		if claims.UserID != userID {
			t.Errorf("Expected UserID %v, got %v", userID, claims.UserID)
		}
		if claims.Email != email {
			t.Errorf("Expected Email %s, got %s", email, claims.Email)
		}
		if claims.TokenType != AccessToken {
			t.Errorf("Expected TokenType %s, got %s", AccessToken, claims.TokenType)
		}
	})

	t.Run("generate and validate refresh token", func(t *testing.T) {
		token, err := jwtManager.GenerateRefreshToken(userID, email)
		if err != nil {
			t.Fatalf("GenerateRefreshToken() error = %v", err)
		}

		if token == "" {
			t.Fatal("GenerateRefreshToken() returned empty token")
		}

		// Validate the token
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			t.Fatalf("ValidateToken() error = %v", err)
		}

		// Check claims
		if claims.UserID != userID {
			t.Errorf("Expected UserID %v, got %v", userID, claims.UserID)
		}
		if claims.Email != email {
			t.Errorf("Expected Email %s, got %s", email, claims.Email)
		}
		if claims.TokenType != RefreshToken {
			t.Errorf("Expected TokenType %s, got %s", RefreshToken, claims.TokenType)
		}
	})
}

func TestJWTManager_ValidateToken_Errors(t *testing.T) {
	jwtManager := NewJWTManager("test_secret_key", 15*time.Minute, 7*24*time.Hour)

	tests := []struct {
		name    string
		token   string
		wantErr error
	}{
		{
			name:    "invalid token",
			token:   "invalid.token.here",
			wantErr: ErrInvalidToken,
		},
		{
			name:    "empty token",
			token:   "",
			wantErr: ErrInvalidToken,
		},
		{
			name:    "malformed token",
			token:   "not.a.jwt",
			wantErr: ErrInvalidToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := jwtManager.ValidateToken(tt.token)
			if err == nil {
				t.Error("ValidateToken() expected error but got nil")
			}
		})
	}
}

func TestJWTManager_ExpiredToken(t *testing.T) {
	// Create a manager with very short token duration
	jwtManager := NewJWTManager("test_secret_key", 1*time.Millisecond, 1*time.Millisecond)
	userID := uuid.New()
	email := "test@example.com"

	token, err := jwtManager.GenerateAccessToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	_, err = jwtManager.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken() should return error for expired token")
	}
}

func TestJWTManager_GenerateTokenPair(t *testing.T) {
	jwtManager := NewJWTManager("test_secret_key", 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()
	email := "test@example.com"

	accessToken, refreshToken, err := jwtManager.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	if accessToken == "" {
		t.Error("GenerateTokenPair() returned empty access token")
	}
	if refreshToken == "" {
		t.Error("GenerateTokenPair() returned empty refresh token")
	}
	if accessToken == refreshToken {
		t.Error("GenerateTokenPair() returned same token for access and refresh")
	}

	// Validate access token
	accessClaims, err := jwtManager.ValidateToken(accessToken)
	if err != nil {
		t.Fatalf("Failed to validate access token: %v", err)
	}
	if accessClaims.TokenType != AccessToken {
		t.Errorf("Expected access token type, got %s", accessClaims.TokenType)
	}

	// Validate refresh token
	refreshClaims, err := jwtManager.ValidateToken(refreshToken)
	if err != nil {
		t.Fatalf("Failed to validate refresh token: %v", err)
	}
	if refreshClaims.TokenType != RefreshToken {
		t.Errorf("Expected refresh token type, got %s", refreshClaims.TokenType)
	}
}

func TestJWTManager_DifferentSecrets(t *testing.T) {
	jwtManager1 := NewJWTManager("secret1", 15*time.Minute, 7*24*time.Hour)
	jwtManager2 := NewJWTManager("secret2", 15*time.Minute, 7*24*time.Hour)
	
	userID := uuid.New()
	email := "test@example.com"

	// Generate token with first manager
	token, err := jwtManager1.GenerateAccessToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	// Try to validate with second manager (different secret)
	_, err = jwtManager2.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken() should fail with different secret")
	}
}