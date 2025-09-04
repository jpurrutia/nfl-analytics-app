package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/nfl-analytics/backend/internal/database"
)

func main() {
	var (
		command        string
		steps          int
		version        int
		migrationsPath string
		databaseURL    string
	)

	// Define flags
	flag.StringVar(&command, "command", "up", "Migration command: up, down, steps, version, force, list")
	flag.IntVar(&steps, "steps", 0, "Number of migration steps (for 'steps' command)")
	flag.IntVar(&version, "version", 0, "Migration version (for 'force' command)")
	flag.StringVar(&migrationsPath, "path", "./migrations", "Path to migrations directory")
	flag.StringVar(&databaseURL, "database", "", "Database connection URL")
	flag.Parse()

	// Get database URL from environment if not provided
	if databaseURL == "" {
		host := getEnv("POSTGRES_HOST", "localhost")
		port := getEnv("POSTGRES_PORT", "5432")
		user := getEnv("POSTGRES_USER", "app_user")
		password := getEnv("POSTGRES_PASSWORD", "secure_password")
		dbname := getEnv("POSTGRES_DB", "fantasy_football")
		sslmode := getEnv("POSTGRES_SSLMODE", "disable")

		databaseURL = fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s",
			user, password, host, port, dbname, sslmode)
	}

	// Create migrator
	migrator, err := database.NewMigrator(databaseURL, migrationsPath)
	if err != nil {
		log.Fatalf("Failed to create migrator: %v", err)
	}
	defer migrator.Close()

	// Execute command
	switch command {
	case "up":
		fmt.Println("Running all migrations...")
		if err := migrator.Up(); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		fmt.Println("Migrations completed successfully")

	case "down":
		fmt.Println("Reverting last migration...")
		if err := migrator.Down(); err != nil {
			log.Fatalf("Failed to revert migration: %v", err)
		}
		fmt.Println("Migration reverted successfully")

	case "steps":
		if steps == 0 {
			log.Fatal("Please specify number of steps with -steps flag")
		}
		fmt.Printf("Migrating %d steps...\n", steps)
		if err := migrator.Steps(steps); err != nil {
			log.Fatalf("Failed to migrate steps: %v", err)
		}
		fmt.Println("Migration steps completed successfully")

	case "version":
		version, dirty, err := migrator.Version()
		if err != nil {
			log.Fatalf("Failed to get version: %v", err)
		}
		fmt.Printf("Current version: %d (dirty: %v)\n", version, dirty)

	case "force":
		if version == 0 {
			log.Fatal("Please specify version with -version flag")
		}
		fmt.Printf("Forcing version to %d...\n", version)
		if err := migrator.Force(version); err != nil {
			log.Fatalf("Failed to force version: %v", err)
		}
		fmt.Println("Version forced successfully")

	case "list":
		fmt.Println("Available migrations:")
		migrations, err := migrator.List(migrationsPath)
		if err != nil {
			log.Fatalf("Failed to list migrations: %v", err)
		}
		for _, m := range migrations {
			fmt.Printf("  - %s\n", m)
		}

	default:
		log.Fatalf("Unknown command: %s", command)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}