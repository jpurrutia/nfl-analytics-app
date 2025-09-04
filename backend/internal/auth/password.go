package auth

import (
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// PasswordManager handles password hashing and verification
type PasswordManager struct {
	cost int
}

// NewPasswordManager creates a new password manager
func NewPasswordManager(cost int) *PasswordManager {
	if cost < bcrypt.MinCost || cost > bcrypt.MaxCost {
		cost = bcrypt.DefaultCost
	}
	return &PasswordManager{
		cost: cost,
	}
}

// HashPassword hashes a plain text password
func (pm *PasswordManager) HashPassword(password string) (string, error) {
	if len(password) < 8 {
		return "", fmt.Errorf("password must be at least 8 characters long")
	}
	
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), pm.cost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	
	return string(hashedBytes), nil
}

// VerifyPassword compares a plain text password with a hashed password
func (pm *PasswordManager) VerifyPassword(hashedPassword, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return fmt.Errorf("invalid password")
		}
		return fmt.Errorf("failed to verify password: %w", err)
	}
	return nil
}

// Common weak passwords list
var commonWeakPasswords = []string{
	"password", "password123", "123456", "12345678", "123456789",
	"qwerty", "qwertyuiop", "abc123", "monkey", "dragon",
	"1234567890", "letmein", "admin", "welcome", "monkey123",
	"password1", "password12", "password1234",
	"qwerty123", "abc123456", "football", "baseball", "iloveyou",
	"trustno1", "1234567", "sunshine", "master", "123123",
	"welcome123", "shadow", "ashley", "football1", "jesus",
	"michael", "ninja", "mustang",
}

// hasSequentialChars checks if password contains sequential characters
func hasSequentialChars(password string, maxSequence int) bool {
	lowerPassword := strings.ToLower(password)
	
	// Check for keyboard sequences
	keyboardPatterns := []string{
		"qwertyuiop",
		"asdfghjkl",
		"zxcvbnm",
		"1234567890",
		"abcdefghijklmnopqrstuvwxyz",
	}
	
	for _, pattern := range keyboardPatterns {
		for i := 0; i <= len(pattern)-maxSequence; i++ {
			sequence := pattern[i : i+maxSequence]
			reverseSequence := reverseString(sequence)
			
			if strings.Contains(lowerPassword, sequence) || strings.Contains(lowerPassword, reverseSequence) {
				return true
			}
		}
	}
	
	// Check for numeric/alphabetic sequences
	for i := 0; i < len(password)-maxSequence+1; i++ {
		isSequential := true
		isReverseSequential := true
		
		for j := 0; j < maxSequence-1; j++ {
			current := password[i+j]
			next := password[i+j+1]
			
			if next != current+1 {
				isSequential = false
			}
			if next != current-1 {
				isReverseSequential = false
			}
		}
		
		if isSequential || isReverseSequential {
			return true
		}
	}
	
	return false
}

// hasRepeatedChars checks if password contains repeated characters
func hasRepeatedChars(password string, maxRepeats int) bool {
	consecutiveCount := 1
	
	for i := 1; i < len(password); i++ {
		if password[i] == password[i-1] {
			consecutiveCount++
			if consecutiveCount >= maxRepeats {
				return true
			}
		} else {
			consecutiveCount = 1
		}
	}
	
	return false
}

// reverseString reverses a string
func reverseString(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// isCommonWeakPassword checks if password is in the common weak passwords list
func isCommonWeakPassword(password string) bool {
	lowerPassword := strings.ToLower(password)
	
	// Check exact match
	for _, weak := range commonWeakPasswords {
		if lowerPassword == weak {
			return true
		}
	}
	
	// Check if it's a simple variation (common password + up to 3 chars)
	for _, weak := range commonWeakPasswords {
		if strings.Contains(lowerPassword, weak) && len(lowerPassword) < len(weak)+4 {
			return true
		}
	}
	
	return false
}

// ValidatePasswordStrength checks if a password meets minimum requirements
func (pm *PasswordManager) ValidatePasswordStrength(password string) error {
	// Check minimum length (12 characters)
	if len(password) < 12 {
		return fmt.Errorf("password must be at least 12 characters long")
	}
	
	var hasUpper, hasLower, hasNumber, hasSpecial bool
	specialChars := "!@#$%^&*()-_=+[]{};:'\",.<>?/|\\`~"
	
	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasNumber = true
		case strings.ContainsRune(specialChars, char):
			hasSpecial = true
		}
	}
	
	// Check for required character types
	if !hasUpper {
		return fmt.Errorf("password must include at least one uppercase letter (A-Z)")
	}
	if !hasLower {
		return fmt.Errorf("password must include at least one lowercase letter (a-z)")
	}
	if !hasNumber {
		return fmt.Errorf("password must include at least one digit (0-9)")
	}
	if !hasSpecial {
		return fmt.Errorf("password must include at least one special character (%s)", specialChars)
	}
	
	// Check for common weak passwords
	if isCommonWeakPassword(password) {
		return fmt.Errorf("password is too common, please choose a more unique password")
	}
	
	// Check for sequential characters (e.g., "abc", "123")
	if hasSequentialChars(password, 3) {
		return fmt.Errorf("password should not contain sequential characters (e.g., 'abc', '123')")
	}
	
	// Check for repeated characters (e.g., "aaa", "111")
	if hasRepeatedChars(password, 3) {
		return fmt.Errorf("password should not contain repeated characters (e.g., 'aaa', '111')")
	}
	
	return nil
}