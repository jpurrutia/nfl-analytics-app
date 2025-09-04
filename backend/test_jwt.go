package main

import (
	"fmt"
	"time"
	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/auth"
)

func main() {
	// Test JWT generation
	jwtManager := auth.NewJWTManager(
		"your_jwt_secret_change_me",
		15*time.Minute,
		7*24*time.Hour,
	)
	
	testUserID := uuid.New()
	testEmail := "test@example.com"
	
	fmt.Println("Testing JWT generation...")
	fmt.Printf("User ID: %s\n", testUserID)
	fmt.Printf("Email: %s\n", testEmail)
	
	// Generate tokens
	accessToken, refreshToken, err := jwtManager.GenerateTokenPair(testUserID, testEmail)
	if err != nil {
		fmt.Printf("ERROR generating tokens: %v\n", err)
		return
	}
	
	fmt.Println("SUCCESS! Tokens generated:")
	fmt.Printf("Access Token (length %d): %s...\n", len(accessToken), accessToken[:20])
	fmt.Printf("Refresh Token (length %d): %s...\n", len(refreshToken), refreshToken[:20])
}