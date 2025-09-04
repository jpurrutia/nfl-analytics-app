package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nfl-analytics/backend/pkg/logger"
)

// Logger returns a gin middleware for logging requests
func Logger(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get request ID from context
		requestID, _ := c.Get("request_id")

		// Log request details
		if raw != "" {
			path = path + "?" + raw
		}

		log.Info("Request processed",
			"request_id", requestID,
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"latency_ms", latency.Milliseconds(),
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
			"error", c.Errors.String(),
		)
	}
}