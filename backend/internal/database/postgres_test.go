package database

import (
	"context"
	"testing"
	"time"
)

func TestNewPostgresDB(t *testing.T) {
	tests := []struct {
		name    string
		config  Config
		wantErr bool
	}{
		{
			name: "valid config",
			config: Config{
				Host:        "localhost",
				Port:        "5432",
				User:        "test_user",
				Password:    "test_password",
				Database:    "test_db",
				SSLMode:     "disable",
				MaxConns:    10,
				MinConns:    2,
				MaxConnAge:  30 * time.Minute,
				ConnTimeout: 5 * time.Second,
			},
			wantErr: true, // Will fail without actual database
		},
		{
			name: "invalid host",
			config: Config{
				Host:        "",
				Port:        "5432",
				User:        "test_user",
				Password:    "test_password",
				Database:    "test_db",
				SSLMode:     "disable",
				MaxConns:    10,
				MinConns:    2,
				MaxConnAge:  30 * time.Minute,
				ConnTimeout: 5 * time.Second,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, err := NewPostgresDB(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewPostgresDB() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if db != nil {
				defer db.Close()
			}
		})
	}
}

func TestPostgresDB_Health(t *testing.T) {
	// This test requires a real database connection
	// Skip if not in integration test mode
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	config := Config{
		Host:        "localhost",
		Port:        "5432",
		User:        "app_user",
		Password:    "secure_password",
		Database:    "fantasy_football",
		SSLMode:     "disable",
		MaxConns:    10,
		MinConns:    2,
		MaxConnAge:  30 * time.Minute,
		ConnTimeout: 5 * time.Second,
	}

	db, err := NewPostgresDB(config)
	if err != nil {
		t.Skipf("Skipping test - database not available: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.Health(ctx); err != nil {
		t.Errorf("Health() error = %v", err)
	}
}

func TestPostgresDB_Stats(t *testing.T) {
	// This test requires a real database connection
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	config := Config{
		Host:        "localhost",
		Port:        "5432",
		User:        "app_user",
		Password:    "secure_password",
		Database:    "fantasy_football",
		SSLMode:     "disable",
		MaxConns:    10,
		MinConns:    2,
		MaxConnAge:  30 * time.Minute,
		ConnTimeout: 5 * time.Second,
	}

	db, err := NewPostgresDB(config)
	if err != nil {
		t.Skipf("Skipping test - database not available: %v", err)
	}
	defer db.Close()

	stats := db.Stats()
	if stats == nil {
		t.Error("Stats() returned nil")
	}

	// Check basic stats
	if stats.MaxConns() != 10 {
		t.Errorf("Expected MaxConns to be 10, got %d", stats.MaxConns())
	}
}