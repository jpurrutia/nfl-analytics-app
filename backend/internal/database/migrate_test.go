package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewMigrator(t *testing.T) {
	tests := []struct {
		name           string
		databaseURL    string
		migrationsPath string
		wantErr        bool
	}{
		{
			name:           "invalid database URL",
			databaseURL:    "invalid://url",
			migrationsPath: "../../migrations",
			wantErr:        true,
		},
		{
			name:           "non-existent migrations path",
			databaseURL:    "postgres://user:pass@localhost/db?sslmode=disable",
			migrationsPath: "/non/existent/path",
			wantErr:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			migrator, err := NewMigrator(tt.databaseURL, tt.migrationsPath)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewMigrator() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if migrator != nil {
				defer migrator.Close()
			}
		})
	}
}

func TestMigrator_List(t *testing.T) {
	// Create a temporary directory with test migration files
	tempDir := t.TempDir()
	
	// Create test migration files
	testFiles := []string{
		"001_create_users.up.sql",
		"001_create_users.down.sql",
		"002_create_posts.up.sql",
		"002_create_posts.down.sql",
		"README.md", // Should be ignored
	}

	for _, file := range testFiles {
		path := filepath.Join(tempDir, file)
		if err := os.WriteFile(path, []byte("-- test migration"), 0644); err != nil {
			t.Fatalf("Failed to create test file: %v", err)
		}
	}

	// We can't create a real migrator without a database, but we can test the List method
	migrator := &Migrator{}
	
	migrations, err := migrator.List(tempDir)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	// Should have 4 SQL files
	expectedCount := 4
	if len(migrations) != expectedCount {
		t.Errorf("Expected %d migrations, got %d", expectedCount, len(migrations))
	}

	// Check that README.md is not included
	for _, m := range migrations {
		if m == "README.md" {
			t.Error("Non-SQL file included in migrations list")
		}
	}
}

func TestMigrator_Integration(t *testing.T) {
	// This test requires a real database connection
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Use test database URL
	databaseURL := "postgres://app_user:secure_password@localhost:5432/fantasy_football_test?sslmode=disable"
	migrationsPath := "../../migrations"

	// Check if migrations directory exists
	if _, err := os.Stat(migrationsPath); os.IsNotExist(err) {
		t.Skip("Migrations directory not found")
	}

	migrator, err := NewMigrator(databaseURL, migrationsPath)
	if err != nil {
		t.Skipf("Skipping test - database not available: %v", err)
	}
	defer migrator.Close()

	// Test Version
	version, dirty, err := migrator.Version()
	if err != nil && err.Error() != "no migration" {
		t.Errorf("Version() error = %v", err)
	}

	t.Logf("Current version: %d, dirty: %v", version, dirty)

	// Test Up (would need actual migrations and test database)
	// err = migrator.Up()
	// if err != nil && err != migrate.ErrNoChange {
	//     t.Errorf("Up() error = %v", err)
	// }

	// Test Down (would need actual migrations and test database)
	// err = migrator.Down()
	// if err != nil && err != migrate.ErrNoChange {
	//     t.Errorf("Down() error = %v", err)
	// }
}