package auth

import (
	"strings"
	"testing"
)

func TestPasswordManager_HashPassword(t *testing.T) {
	pm := NewPasswordManager(10)

	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "SecurePass123!",
			wantErr:  false,
		},
		{
			name:     "minimum length password",
			password: "Pass123!",
			wantErr:  false,
		},
		{
			name:     "too short password",
			password: "Pass12!",
			wantErr:  true,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  true,
		},
		{
			name:     "very long password",
			password: strings.Repeat("a", 100) + "A1!",
			wantErr:  true, // bcrypt has 72 byte limit
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := pm.HashPassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("HashPassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if hash == "" {
					t.Error("HashPassword() returned empty hash")
				}
				if hash == tt.password {
					t.Error("HashPassword() returned plain password instead of hash")
				}
			}
		})
	}
}

func TestPasswordManager_VerifyPassword(t *testing.T) {
	pm := NewPasswordManager(10)
	password := "SecurePass123!"
	
	hash, err := pm.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	tests := []struct {
		name     string
		hash     string
		password string
		wantErr  bool
	}{
		{
			name:     "correct password",
			hash:     hash,
			password: password,
			wantErr:  false,
		},
		{
			name:     "incorrect password",
			hash:     hash,
			password: "WrongPass123!",
			wantErr:  true,
		},
		{
			name:     "empty password",
			hash:     hash,
			password: "",
			wantErr:  true,
		},
		{
			name:     "invalid hash",
			hash:     "invalid_hash",
			password: password,
			wantErr:  true,
		},
		{
			name:     "empty hash",
			hash:     "",
			password: password,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := pm.VerifyPassword(tt.hash, tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("VerifyPassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestPasswordManager_ValidatePasswordStrength(t *testing.T) {
	pm := NewPasswordManager(10)

	tests := []struct {
		name     string
		password string
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "valid strong password",
			password: "SecurePass123!",
			wantErr:  false,
		},
		{
			name:     "missing uppercase",
			password: "securepass123!",
			wantErr:  true,
			errMsg:   "uppercase",
		},
		{
			name:     "missing lowercase",
			password: "SECUREPASS123!",
			wantErr:  true,
			errMsg:   "lowercase",
		},
		{
			name:     "missing number",
			password: "SecurePass!",
			wantErr:  true,
			errMsg:   "number",
		},
		{
			name:     "missing special character",
			password: "SecurePass123",
			wantErr:  true,
			errMsg:   "special",
		},
		{
			name:     "too short",
			password: "Sp1!",
			wantErr:  true,
			errMsg:   "8 characters",
		},
		{
			name:     "all special characters valid",
			password: "Pass123@#$%^&*",
			wantErr:  false,
		},
		{
			name:     "minimum valid password",
			password: "Pass123!",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := pm.ValidatePasswordStrength(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePasswordStrength() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("Expected error message to contain '%s', got: %v", tt.errMsg, err)
			}
		})
	}
}

func TestPasswordManager_HashVerifyIntegration(t *testing.T) {
	pm := NewPasswordManager(10)
	passwords := []string{
		"SimplePass123!",
		"C0mpl3x!P@ssw0rd",
		"Another$ecure1",
		"Test@1234567890",
	}

	for _, password := range passwords {
		t.Run(password, func(t *testing.T) {
			// Validate strength
			if err := pm.ValidatePasswordStrength(password); err != nil {
				t.Fatalf("Password should be valid: %v", err)
			}

			// Hash password
			hash, err := pm.HashPassword(password)
			if err != nil {
				t.Fatalf("Failed to hash password: %v", err)
			}

			// Verify correct password
			if err := pm.VerifyPassword(hash, password); err != nil {
				t.Errorf("Failed to verify correct password: %v", err)
			}

			// Verify wrong password fails
			if err := pm.VerifyPassword(hash, "WrongPass123!"); err == nil {
				t.Error("VerifyPassword should fail with wrong password")
			}

			// Hash same password again - should get different hash
			hash2, err := pm.HashPassword(password)
			if err != nil {
				t.Fatalf("Failed to hash password second time: %v", err)
			}
			if hash == hash2 {
				t.Error("Same password should produce different hashes due to salt")
			}

			// Both hashes should verify correctly
			if err := pm.VerifyPassword(hash2, password); err != nil {
				t.Errorf("Failed to verify second hash: %v", err)
			}
		})
	}
}

func TestNewPasswordManager_CostValidation(t *testing.T) {
	tests := []struct {
		name         string
		cost         int
		expectedCost int
	}{
		{
			name:         "valid cost",
			cost:         10,
			expectedCost: 10,
		},
		{
			name:         "below minimum cost",
			cost:         2,
			expectedCost: 10, // Should default to DefaultCost
		},
		{
			name:         "above maximum cost",
			cost:         40,
			expectedCost: 10, // Should default to DefaultCost
		},
		{
			name:         "negative cost",
			cost:         -1,
			expectedCost: 10, // Should default to DefaultCost
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pm := NewPasswordManager(tt.cost)
			if pm.cost != tt.expectedCost {
				t.Errorf("Expected cost %d, got %d", tt.expectedCost, pm.cost)
			}
		})
	}
}