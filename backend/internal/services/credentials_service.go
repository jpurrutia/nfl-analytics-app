package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/models"
	"github.com/nfl-analytics/backend/internal/repositories"
)

// LeagueCredentials represents encrypted authentication data for fantasy platforms
type LeagueCredentials struct {
	SWID   string `json:"swid,omitempty"`
	EspnS2 string `json:"espn_s2,omitempty"`
	// Future: Add Yahoo, Sleeper tokens here
}

// CredentialsService handles secure credential storage for fantasy leagues
type CredentialsService struct {
	authRepo      repositories.LeagueAuthRepository
	encryptionKey []byte
}

// NewCredentialsService creates a new credentials service with encryption
func NewCredentialsService(authRepo repositories.LeagueAuthRepository, encryptionKey string) (*CredentialsService, error) {
	// Ensure encryption key is 32 bytes for AES-256
	if len(encryptionKey) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes")
	}

	return &CredentialsService{
		authRepo:      authRepo,
		encryptionKey: []byte(encryptionKey),
	}, nil
}

// StoreESPNCredentials encrypts and stores ESPN authentication cookies
func (s *CredentialsService) StoreESPNCredentials(ctx context.Context, userID uuid.UUID, swid, espnS2 string) error {
	creds := &LeagueCredentials{
		SWID:   swid,
		EspnS2: espnS2,
	}

	// Validate credentials format
	if err := s.validateESPNCredentials(creds); err != nil {
		return err
	}

	// Serialize credentials
	data, err := json.Marshal(creds)
	if err != nil {
		return fmt.Errorf("failed to marshal credentials: %w", err)
	}

	// Encrypt the data
	encrypted, err := s.encrypt(data)
	if err != nil {
		return fmt.Errorf("failed to encrypt credentials: %w", err)
	}

	// Store in database
	auth := &models.LeagueAuth{
		ID:                   uuid.New(),
		UserID:               userID,
		Platform:             "espn",
		EncryptedCredentials: []byte(encrypted),
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	return s.authRepo.Store(ctx, auth)
}

// GetESPNCredentials retrieves and decrypts ESPN authentication cookies
func (s *CredentialsService) GetESPNCredentials(ctx context.Context, userID uuid.UUID) (swid, espnS2 string, err error) {
	auth, err := s.authRepo.GetByUserAndPlatform(ctx, userID, "espn")
	if err != nil {
		return "", "", err
	}

	// Decrypt the data
	decrypted, err := s.decrypt(string(auth.EncryptedCredentials))
	if err != nil {
		return "", "", fmt.Errorf("failed to decrypt credentials: %w", err)
	}

	// Deserialize credentials
	var creds LeagueCredentials
	if err := json.Unmarshal(decrypted, &creds); err != nil {
		return "", "", fmt.Errorf("failed to unmarshal credentials: %w", err)
	}

	return creds.SWID, creds.EspnS2, nil
}

// UpdateESPNCredentials updates existing ESPN authentication cookies
func (s *CredentialsService) UpdateESPNCredentials(ctx context.Context, userID uuid.UUID, swid, espnS2 string) error {
	// Get existing auth record
	auth, err := s.authRepo.GetByUserAndPlatform(ctx, userID, "espn")
	if err != nil {
		return err
	}

	creds := &LeagueCredentials{
		SWID:   swid,
		EspnS2: espnS2,
	}

	// Validate credentials format
	if err := s.validateESPNCredentials(creds); err != nil {
		return err
	}

	// Serialize and encrypt new credentials
	data, err := json.Marshal(creds)
	if err != nil {
		return fmt.Errorf("failed to marshal credentials: %w", err)
	}

	encrypted, err := s.encrypt(data)
	if err != nil {
		return fmt.Errorf("failed to encrypt credentials: %w", err)
	}

	// Update the record
	auth.EncryptedCredentials = []byte(encrypted)
	auth.UpdatedAt = time.Now()

	return s.authRepo.Update(ctx, auth)
}

// DeleteLeagueCredentials removes authentication credentials
func (s *CredentialsService) DeleteLeagueCredentials(ctx context.Context, userID uuid.UUID) error {
	return s.authRepo.Delete(ctx, userID, "espn")
}

// CheckCredentialsExpiry checks if credentials are about to expire
func (s *CredentialsService) CheckCredentialsExpiry(ctx context.Context, userID uuid.UUID) (bool, time.Time, error) {
	auth, err := s.authRepo.GetByUserAndPlatform(ctx, userID, "espn")
	if err != nil {
		return false, time.Time{}, err
	}

	// ESPN cookies typically last 1 year, return a year from creation
	expiresAt := auth.CreatedAt.Add(365 * 24 * time.Hour)
	
	// Consider expired if less than 7 days remaining
	expiringThreshold := time.Now().Add(7 * 24 * time.Hour)
	isExpiring := expiresAt.Before(expiringThreshold)

	return isExpiring, expiresAt, nil
}

// encrypt encrypts data using AES-GCM
func (s *CredentialsService) encrypt(plaintext []byte) (string, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decrypt decrypts data using AES-GCM
func (s *CredentialsService) decrypt(ciphertext string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	if len(data) < gcm.NonceSize() {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

// validateESPNCredentials checks if ESPN credentials are valid format
func (s *CredentialsService) validateESPNCredentials(creds *LeagueCredentials) error {
	if creds.SWID == "" || creds.EspnS2 == "" {
		return fmt.Errorf("SWID and espn_s2 are required for ESPN authentication")
	}

	// Basic format validation for SWID (UUID format)
	if _, err := uuid.Parse(creds.SWID); err != nil {
		return fmt.Errorf("SWID must be a valid UUID format (without curly braces)")
	}

	// ESPN S2 should be a long string
	if len(creds.EspnS2) < 50 {
		return fmt.Errorf("espn_s2 appears to be invalid (too short)")
	}

	return nil
}