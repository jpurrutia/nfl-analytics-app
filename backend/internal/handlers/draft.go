package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nfl-analytics/backend/internal/draft"
)

// DraftHandler handles draft-related HTTP requests
type DraftHandler struct {
	draftService *draft.Service
}

// NewDraftHandler creates a new draft handler
func NewDraftHandler(draftService *draft.Service) *DraftHandler {
	return &DraftHandler{
		draftService: draftService,
	}
}

// CreateSession handles POST /api/draft/sessions
func (h *DraftHandler) CreateSession(c *gin.Context) {
	userID := c.GetString("user_id") // Set by auth middleware

	var req draft.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := h.draftService.CreateSession(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// GetSession handles GET /api/draft/sessions/:id
func (h *DraftHandler) GetSession(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	session, err := h.draftService.GetSession(c.Request.Context(), sessionID, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to draft session"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Draft session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// GetUserSessions handles GET /api/draft/sessions
func (h *DraftHandler) GetUserSessions(c *gin.Context) {
	userID := c.GetString("user_id")

	sessions, err := h.draftService.GetUserSessions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// RecordPick handles POST /api/draft/sessions/:id/pick
func (h *DraftHandler) RecordPick(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	var req draft.RecordPickRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pick, err := h.draftService.RecordPick(c.Request.Context(), sessionID, userID, &req)
	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to draft session"})
			return
		}
		if err.Error() == "draft is not active" || err.Error() == "draft is complete" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "player is not available" {
			c.JSON(http.StatusConflict, gin.H{"error": "Player has already been drafted"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, pick)
}

// UndoPick handles POST /api/draft/sessions/:id/undo
func (h *DraftHandler) UndoPick(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	err := h.draftService.UndoPick(c.Request.Context(), sessionID, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to draft session"})
			return
		}
		if err.Error() == "nothing to undo" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No picks to undo"})
			return
		}
		if err.Error() == "draft is not active" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pick undone successfully"})
}

// RedoPick handles POST /api/draft/sessions/:id/redo
func (h *DraftHandler) RedoPick(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	pick, err := h.draftService.RedoPick(c.Request.Context(), sessionID, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to draft session"})
			return
		}
		if err.Error() == "nothing to redo" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No picks to redo"})
			return
		}
		if err.Error() == "draft is not active" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pick)
}

// PauseSession handles POST /api/draft/sessions/:id/pause
func (h *DraftHandler) PauseSession(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	err := h.draftService.PauseSession(c.Request.Context(), sessionID, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to draft session"})
			return
		}
		if err.Error() == "can only pause active drafts" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Draft session paused"})
}

// ResumeSession handles POST /api/draft/sessions/:id/resume
func (h *DraftHandler) ResumeSession(c *gin.Context) {
	userID := c.GetString("user_id")
	sessionID := c.Param("id")

	err := h.draftService.ResumeSession(c.Request.Context(), sessionID, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to draft session"})
			return
		}
		if err.Error() == "can only resume paused drafts" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Draft session resumed"})
}

// RegisterRoutes registers all draft routes
func (h *DraftHandler) RegisterRoutes(router *gin.RouterGroup) {
	draft := router.Group("/draft")
	{
		// Sessions
		draft.POST("/sessions", h.CreateSession)
		draft.GET("/sessions", h.GetUserSessions)
		draft.GET("/sessions/:id", h.GetSession)
		
		// Draft actions
		draft.POST("/sessions/:id/pick", h.RecordPick)
		draft.POST("/sessions/:id/undo", h.UndoPick)
		draft.POST("/sessions/:id/redo", h.RedoPick)
		draft.POST("/sessions/:id/pause", h.PauseSession)
		draft.POST("/sessions/:id/resume", h.ResumeSession)
	}
}