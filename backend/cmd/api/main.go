package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/nfl-analytics/backend/internal/auth"
	"github.com/nfl-analytics/backend/internal/config"
	"github.com/nfl-analytics/backend/internal/database"
	"github.com/nfl-analytics/backend/internal/handlers"
	"github.com/nfl-analytics/backend/internal/repositories"
	"github.com/nfl-analytics/backend/internal/services"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Create context with timeout for initialization
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Initialize database
	dbConfig := database.Config{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		Database: cfg.Database.Name,
		SSLMode:  cfg.Database.SSLMode,
	}

	db, err := database.NewPostgresDB(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Verify database connection
	if err := db.Health(ctx); err != nil {
		log.Fatalf("Database health check failed: %v", err)
	}

	// Initialize Redis client
	var redisClient *redis.Client
	if cfg.Redis.Host != "" {
		redisClient = redis.NewClient(&redis.Options{
			Addr:     cfg.Redis.Host + ":" + cfg.Redis.Port,
			Password: cfg.Redis.Password,
			DB:       cfg.Redis.DB,
		})
		
		// Test Redis connection
		if err := redisClient.Ping(ctx).Err(); err != nil {
			log.Printf("Redis connection failed (continuing without cache): %v", err)
			redisClient = nil
		} else {
			log.Printf("Redis connected successfully")
		}
	}

	// DuckDB analytics temporarily disabled
	// TODO: Re-enable when DuckDB Go driver supports Go 1.23

	// Initialize repositories
	userRepo := repositories.NewPostgresUserRepository(db)
	authRepo := repositories.NewPostgresAuthRepository(db)
	leagueAuthRepo := repositories.NewPostgresLeagueAuthRepository(db)

	// Initialize services
	jwtManager := auth.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.AccessTokenExpiry,
		cfg.JWT.RefreshTokenExpiry,
	)
	authService := services.NewAuthService(authRepo, userRepo, jwtManager)
	userService := services.NewUserService(userRepo)
	
	// Initialize credentials service with encryption key
	encryptionKey := os.Getenv("ENCRYPTION_KEY")
	if encryptionKey == "" {
		// Use a default for development only - MUST be set in production
		log.Println("WARNING: ENCRYPTION_KEY not set, using development default")
		encryptionKey = "dev-key-change-in-production-32b" // Exactly 32 bytes
	}
	if len(encryptionKey) != 32 {
		log.Fatalf("ENCRYPTION_KEY must be exactly 32 bytes, got %d", len(encryptionKey))
	}
	credentialsService, err := services.NewCredentialsService(
		leagueAuthRepo,
		encryptionKey,
	)
	if err != nil {
		log.Fatalf("Failed to initialize credentials service: %v", err)
	}
	
	// Analytics service temporarily disabled
	// TODO: Re-enable when DuckDB is available

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db, redisClient)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	leagueHandler := handlers.NewLeagueHandler(credentialsService)
	// analyticsHandler := handlers.NewAnalyticsHandler(metricsService)

	// Create Gin router
	r := gin.Default()

	// Public endpoints
	r.GET("/health", healthHandler.Health)
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "NFL Fantasy Analytics API",
			"version": "0.1.0",
		})
	})

	// Auth endpoints (public)
	authRoutes := r.Group("/api/auth")
	{
		authRoutes.POST("/register", authHandler.Register)
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/refresh", authHandler.RefreshToken)
	}

	// Protected routes
	api := r.Group("/api")
	api.Use(auth.AuthMiddleware(jwtManager))
	{
		// User endpoints
		userRoutes := api.Group("/users")
		{
			userRoutes.GET("/profile", userHandler.GetProfile)
			userRoutes.PUT("/profile", userHandler.UpdateProfile)
			userRoutes.DELETE("/account", userHandler.DeleteAccount)
			userRoutes.POST("/password", userHandler.ChangePassword)
		}

		// Logout endpoint
		api.POST("/auth/logout", authHandler.Logout)
		
		// League endpoints
		leagueRoutes := api.Group("/leagues")
		{
			leagueRoutes.POST("/espn/connect", leagueHandler.ConnectESPN)
			leagueRoutes.GET("/espn/status", leagueHandler.GetESPNStatus)
			leagueRoutes.DELETE("/espn/disconnect", leagueHandler.DisconnectESPN)
			leagueRoutes.PUT("/espn/update", leagueHandler.UpdateESPNCredentials)
		}
		
		// Analytics endpoints (if available)
		// Analytics routes temporarily disabled
		// TODO: Re-enable when analytics service is available
	}

	// Get port from config or environment
	port := cfg.Server.Port
	if port == "" {
		port = os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
	}

	// Start server
	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}