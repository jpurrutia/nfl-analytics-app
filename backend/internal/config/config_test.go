package config

import (
	"fmt"
	"os"
	"testing"
	"time"
)

func TestLoad(t *testing.T) {
	// Save original env vars and restore after test
	originalJWTSecret := os.Getenv("JWT_SECRET")
	defer func() {
		if originalJWTSecret != "" {
			os.Setenv("JWT_SECRET", originalJWTSecret)
		} else {
			os.Unsetenv("JWT_SECRET")
		}
	}()

	tests := []struct {
		name    string
		envVars map[string]string
		wantErr bool
		check   func(*Config) error
	}{
		{
			name: "default values with JWT secret",
			envVars: map[string]string{
				"JWT_SECRET": "test_secret_key",
			},
			wantErr: false,
			check: func(cfg *Config) error {
				if cfg.Server.Port != "8080" {
					return fmt.Errorf("expected port 8080, got %s", cfg.Server.Port)
				}
				if cfg.Database.Host != "localhost" {
					return fmt.Errorf("expected host localhost, got %s", cfg.Database.Host)
				}
				if cfg.JWT.Secret != "test_secret_key" {
					return fmt.Errorf("expected JWT secret test_secret_key, got %s", cfg.JWT.Secret)
				}
				return nil
			},
		},
		{
			name:    "missing JWT secret",
			envVars: map[string]string{},
			wantErr: true,
		},
		{
			name: "custom values",
			envVars: map[string]string{
				"JWT_SECRET":      "custom_secret",
				"API_PORT":        "9090",
				"POSTGRES_HOST":   "db.example.com",
				"POSTGRES_PORT":   "5433",
				"REDIS_HOST":      "redis.example.com",
				"ENV":             "production",
				"LOG_LEVEL":       "debug",
			},
			wantErr: false,
			check: func(cfg *Config) error {
				if cfg.Server.Port != "9090" {
					return fmt.Errorf("expected port 9090, got %s", cfg.Server.Port)
				}
				if cfg.Database.Host != "db.example.com" {
					return fmt.Errorf("expected host db.example.com, got %s", cfg.Database.Host)
				}
				if cfg.Database.Port != "5433" {
					return fmt.Errorf("expected port 5433, got %s", cfg.Database.Port)
				}
				if cfg.Redis.Host != "redis.example.com" {
					return fmt.Errorf("expected redis host redis.example.com, got %s", cfg.Redis.Host)
				}
				if cfg.App.Environment != "production" {
					return fmt.Errorf("expected environment production, got %s", cfg.App.Environment)
				}
				if cfg.App.LogLevel != "debug" {
					return fmt.Errorf("expected log level debug, got %s", cfg.App.LogLevel)
				}
				return nil
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear JWT_SECRET first
			os.Unsetenv("JWT_SECRET")
			
			// Set test environment variables
			for key, value := range tt.envVars {
				os.Setenv(key, value)
				defer os.Unsetenv(key)
			}

			cfg, err := Load()
			if (err != nil) != tt.wantErr {
				t.Errorf("Load() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && tt.check != nil {
				if err := tt.check(cfg); err != nil {
					t.Errorf("Config validation failed: %v", err)
				}
			}
		})
	}
}

func TestGetEnv(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		want         string
	}{
		{
			name:         "returns environment value when set",
			key:          "TEST_ENV_VAR",
			defaultValue: "default",
			envValue:     "from_env",
			want:         "from_env",
		},
		{
			name:         "returns default when not set",
			key:          "UNSET_VAR",
			defaultValue: "default",
			envValue:     "",
			want:         "default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			}

			if got := getEnv(tt.key, tt.defaultValue); got != tt.want {
				t.Errorf("getEnv() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetIntEnv(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue int
		envValue     string
		want         int
	}{
		{
			name:         "returns parsed integer when valid",
			key:          "TEST_INT",
			defaultValue: 10,
			envValue:     "42",
			want:         42,
		},
		{
			name:         "returns default when not set",
			key:          "UNSET_INT",
			defaultValue: 10,
			envValue:     "",
			want:         10,
		},
		{
			name:         "returns default when invalid integer",
			key:          "INVALID_INT",
			defaultValue: 10,
			envValue:     "not_a_number",
			want:         10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			}

			if got := getIntEnv(tt.key, tt.defaultValue); got != tt.want {
				t.Errorf("getIntEnv() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetDurationEnv(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue time.Duration
		envValue     string
		want         time.Duration
	}{
		{
			name:         "returns parsed duration when valid",
			key:          "TEST_DURATION",
			defaultValue: 10 * time.Second,
			envValue:     "30s",
			want:         30 * time.Second,
		},
		{
			name:         "returns default when not set",
			key:          "UNSET_DURATION",
			defaultValue: 10 * time.Second,
			envValue:     "",
			want:         10 * time.Second,
		},
		{
			name:         "returns default when invalid duration",
			key:          "INVALID_DURATION",
			defaultValue: 10 * time.Second,
			envValue:     "invalid",
			want:         10 * time.Second,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			}

			if got := getDurationEnv(tt.key, tt.defaultValue); got != tt.want {
				t.Errorf("getDurationEnv() = %v, want %v", got, tt.want)
			}
		})
	}
}