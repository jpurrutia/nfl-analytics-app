package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nfl-analytics/backend/internal/database"
)

type HealthHandler struct {
	db    *database.PostgresDB
	redis interface{} // TODO: Add Redis client type
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *database.PostgresDB, redis interface{}) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redis,
	}
}

// Health returns the health status of the application
func (h *HealthHandler) Health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	response := gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"services":  gin.H{},
	}

	services := response["services"].(gin.H)
	allHealthy := true

	// Check PostgreSQL
	if h.db != nil {
		if err := h.db.Health(ctx); err != nil {
			services["postgres"] = gin.H{
				"status": "unhealthy",
				"error":  err.Error(),
			}
			allHealthy = false
		} else {
			services["postgres"] = gin.H{
				"status": "healthy",
			}
		}
	} else {
		services["postgres"] = gin.H{
			"status": "not configured",
		}
	}

	// Check Redis
	// TODO: Add Redis health check
	services["redis"] = gin.H{
		"status": "not configured",
	}

	// Set overall status
	if !allHealthy {
		response["status"] = "degraded"
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}

	c.JSON(http.StatusOK, response)
}