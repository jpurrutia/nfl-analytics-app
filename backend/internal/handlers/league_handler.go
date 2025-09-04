package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/services"
)

// LeagueHandler handles league-related HTTP requests
type LeagueHandler struct {
	credService *services.CredentialsService
}

// NewLeagueHandler creates a new league handler
func NewLeagueHandler(credService *services.CredentialsService) *LeagueHandler {
	return &LeagueHandler{
		credService: credService,
	}
}

// ConnectESPNRequest represents the request to connect an ESPN league
type ConnectESPNRequest struct {
	LeagueID string `json:"league_id" binding:"required"`
	SWID     string `json:"swid" binding:"required"`
	EspnS2   string `json:"espn_s2" binding:"required"`
}

// ConnectESPN handles ESPN league connection
func (h *LeagueHandler) ConnectESPN(c *gin.Context) {
	var req ConnectESPNRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	// Validate SWID format (should be a UUID with curly braces)
	swid := req.SWID
	// Remove curly braces if present
	if len(swid) > 0 && swid[0] == '{' {
		swid = swid[1 : len(swid)-1]
	}
	
	// Validate it's a valid UUID
	if _, err := uuid.Parse(swid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SWID must be a valid UUID format"})
		return
	}

	// Store encrypted credentials
	err := h.credService.StoreESPNCredentials(
		c.Request.Context(),
		userID.(uuid.UUID),
		swid,
		req.EspnS2,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store credentials"})
		return
	}

	// TODO: Validate credentials by making a test request to ESPN
	// TODO: Fetch and store league details

	c.JSON(http.StatusOK, gin.H{
		"message": "ESPN league connected successfully",
		"league_id": req.LeagueID,
	})
}

// GetESPNStatus checks if user has ESPN credentials stored
func (h *LeagueHandler) GetESPNStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	// Check if credentials exist and when they expire
	isExpiring, expiresAt, err := h.credService.CheckCredentialsExpiry(
		c.Request.Context(),
		userID.(uuid.UUID),
	)
	
	if err != nil {
		// No credentials found
		c.JSON(http.StatusOK, gin.H{
			"connected": false,
			"message": "No ESPN account connected",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"connected": true,
		"expires_at": expiresAt,
		"is_expiring": isExpiring,
	})
}

// DisconnectESPN removes ESPN credentials
func (h *LeagueHandler) DisconnectESPN(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	err := h.credService.DeleteLeagueCredentials(
		c.Request.Context(),
		userID.(uuid.UUID),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disconnect ESPN"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ESPN account disconnected successfully",
	})
}

// UpdateESPNCredentials updates existing ESPN credentials
func (h *LeagueHandler) UpdateESPNCredentials(c *gin.Context) {
	var req ConnectESPNRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	// Validate and clean SWID
	swid := req.SWID
	if len(swid) > 0 && swid[0] == '{' {
		swid = swid[1 : len(swid)-1]
	}
	
	if _, err := uuid.Parse(swid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SWID must be a valid UUID format"})
		return
	}

	// Update credentials
	err := h.credService.UpdateESPNCredentials(
		c.Request.Context(),
		userID.(uuid.UUID),
		swid,
		req.EspnS2,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ESPN credentials updated successfully",
	})
}