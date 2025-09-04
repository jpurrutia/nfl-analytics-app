package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	App      AppConfig
}

type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

type DatabaseConfig struct {
	Host        string
	Port        string
	User        string
	Password    string
	Name        string
	SSLMode     string
	MaxConns    int32
	MinConns    int32
	MaxConnAge  time.Duration
	ConnTimeout time.Duration
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret              string
	AccessTokenExpiry   time.Duration
	RefreshTokenExpiry  time.Duration
}

type AppConfig struct {
	Environment string
	LogLevel    string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{}

	// Server configuration
	cfg.Server.Port = getEnv("API_PORT", "8080")
	cfg.Server.ReadTimeout = getDurationEnv("SERVER_READ_TIMEOUT", 15*time.Second)
	cfg.Server.WriteTimeout = getDurationEnv("SERVER_WRITE_TIMEOUT", 15*time.Second)
	cfg.Server.IdleTimeout = getDurationEnv("SERVER_IDLE_TIMEOUT", 60*time.Second)

	// Database configuration
	cfg.Database.Host = getEnv("POSTGRES_HOST", "localhost")
	cfg.Database.Port = getEnv("POSTGRES_PORT", "5432")
	cfg.Database.User = getEnv("POSTGRES_USER", "app_user")
	cfg.Database.Password = getEnv("POSTGRES_PASSWORD", "secure_password")
	cfg.Database.Name = getEnv("POSTGRES_DB", "fantasy_football")
	cfg.Database.SSLMode = getEnv("POSTGRES_SSLMODE", "disable")
	cfg.Database.MaxConns = int32(getIntEnv("POSTGRES_MAX_CONNS", 20))
	cfg.Database.MinConns = int32(getIntEnv("POSTGRES_MIN_CONNS", 5))
	cfg.Database.MaxConnAge = getDurationEnv("POSTGRES_MAX_CONN_AGE", 30*time.Minute)
	cfg.Database.ConnTimeout = getDurationEnv("POSTGRES_CONN_TIMEOUT", 10*time.Second)

	// Redis configuration
	cfg.Redis.Host = getEnv("REDIS_HOST", "localhost")
	cfg.Redis.Port = getEnv("REDIS_PORT", "6379")
	cfg.Redis.Password = getEnv("REDIS_PASSWORD", "")
	cfg.Redis.DB = getIntEnv("REDIS_DB", 0)

	// JWT configuration
	cfg.JWT.Secret = getEnv("JWT_SECRET", "")
	if cfg.JWT.Secret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	cfg.JWT.AccessTokenExpiry = getDurationEnv("JWT_ACCESS_TOKEN_EXPIRY", 15*time.Minute)
	cfg.JWT.RefreshTokenExpiry = getDurationEnv("JWT_REFRESH_TOKEN_EXPIRY", 7*24*time.Hour)

	// App configuration
	cfg.App.Environment = getEnv("ENV", "development")
	cfg.App.LogLevel = getEnv("LOG_LEVEL", "info")

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}