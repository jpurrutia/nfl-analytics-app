package draft

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

// Service handles draft business logic
type Service struct {
	repo  Repository
	redis *redis.Client
}

// NewService creates a new draft service
func NewService(repo Repository, redis *redis.Client) *Service {
	return &Service{
		repo:  repo,
		redis: redis,
	}
}

// CreateSession creates a new draft session
func (s *Service) CreateSession(ctx context.Context, userID string, req *CreateSessionRequest) (*models.DraftSession, error) {
	// Validate request
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Create session
	session := &models.DraftSession{
		ID:           uuid.New().String(),
		UserID:       userID,
		LeagueID:     req.LeagueID,
		Name:         req.Name,
		DraftType:    req.DraftType,
		TeamCount:    req.TeamCount,
		RoundCount:   req.RoundCount,
		UserPosition: req.UserPosition,
		CurrentPick:  0,
		Status:       "active",
		Settings:     req.Settings,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Handle keeper players
	if len(req.Settings.KeeperPlayers) > 0 {
		// Pre-draft keeper players will be handled in state initialization
		session.StartedAt = &[]time.Time{time.Now()}[0]
	}

	// Save to database
	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// Initialize draft state in Redis
	state := &models.DraftState{
		SessionID:        session.ID,
		Picks:           []models.DraftPick{},
		AvailablePlayers: []string{}, // Will be populated from player data
		TeamRosters:      make(map[int][]string),
		UndoStack:       []models.DraftEvent{},
		RedoStack:       []models.DraftEvent{},
		LastAction:      time.Now(),
	}

	// Initialize team rosters
	for i := 1; i <= req.TeamCount; i++ {
		state.TeamRosters[i] = []string{}
	}

	// Save state to Redis with 24-hour expiration
	if err := s.saveState(ctx, session.ID, state); err != nil {
		return nil, fmt.Errorf("failed to save state: %w", err)
	}

	return session, nil
}

// GetSession retrieves a draft session
func (s *Service) GetSession(ctx context.Context, sessionID, userID string) (*models.DraftSession, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if session.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}

	// Load state from Redis
	state, err := s.getState(ctx, sessionID)
	if err == nil {
		session.State = state
	}

	return session, nil
}

// RecordPick records a draft pick
func (s *Service) RecordPick(ctx context.Context, sessionID, userID string, req *RecordPickRequest) (*models.DraftPick, error) {
	// Get session
	session, err := s.GetSession(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	// Validate session state
	if session.Status != "active" {
		return nil, fmt.Errorf("draft is not active")
	}

	if session.IsComplete() {
		return nil, fmt.Errorf("draft is complete")
	}

	// Get current state
	state, err := s.getState(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get state: %w", err)
	}

	// Validate player is available
	if !s.isPlayerAvailable(state.AvailablePlayers, req.PlayerID) {
		return nil, fmt.Errorf("player is not available")
	}

	// Create pick
	session.CurrentPick++
	pick := &models.DraftPick{
		ID:         uuid.New().String(),
		SessionID:  sessionID,
		PickNumber: session.CurrentPick,
		Round:      session.GetCurrentRound(),
		RoundPick:  ((session.CurrentPick - 1) % session.TeamCount) + 1,
		TeamNumber: session.GetCurrentTeam(),
		PlayerID:   req.PlayerID,
		PlayerName: req.PlayerName,
		Position:   req.Position,
		IsKeeper:   false,
		PickedAt:   time.Now(),
	}

	// Save pick to database
	if err := s.repo.CreatePick(ctx, pick); err != nil {
		return nil, fmt.Errorf("failed to save pick: %w", err)
	}

	// Update session
	session.UpdatedAt = time.Now()
	if session.IsComplete() {
		session.Status = "completed"
		session.CompletedAt = &[]time.Time{time.Now()}[0]
	}

	if err := s.repo.UpdateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	// Update state
	state.Picks = append(state.Picks, *pick)
	state.TeamRosters[pick.TeamNumber] = append(state.TeamRosters[pick.TeamNumber], pick.PlayerID)
	state.AvailablePlayers = s.removePlayer(state.AvailablePlayers, pick.PlayerID)
	state.LastAction = time.Now()

	// Add to undo stack
	event := models.DraftEvent{
		Type:      "pick",
		Data:      pick,
		Timestamp: time.Now(),
		UserID:    userID,
	}
	state.UndoStack = append(state.UndoStack, event)
	state.RedoStack = []models.DraftEvent{} // Clear redo stack on new action

	// Save updated state
	if err := s.saveState(ctx, sessionID, state); err != nil {
		return nil, fmt.Errorf("failed to save state: %w", err)
	}

	return pick, nil
}

// UndoPick undoes the last pick
func (s *Service) UndoPick(ctx context.Context, sessionID, userID string) error {
	// Get session
	session, err := s.GetSession(ctx, sessionID, userID)
	if err != nil {
		return err
	}

	if session.Status != "active" {
		return fmt.Errorf("draft is not active")
	}

	// Get state
	state, err := s.getState(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("failed to get state: %w", err)
	}

	// Check if there's anything to undo
	if len(state.UndoStack) == 0 {
		return fmt.Errorf("nothing to undo")
	}

	// Get last event
	lastEvent := state.UndoStack[len(state.UndoStack)-1]
	if lastEvent.Type != "pick" {
		return fmt.Errorf("can only undo picks")
	}

	// Remove from undo stack and add to redo stack
	state.UndoStack = state.UndoStack[:len(state.UndoStack)-1]
	state.RedoStack = append(state.RedoStack, lastEvent)

	// Remove the pick
	pick := lastEvent.Data.(*models.DraftPick)
	state.Picks = state.Picks[:len(state.Picks)-1]
	
	// Remove from team roster
	roster := state.TeamRosters[pick.TeamNumber]
	for i, playerID := range roster {
		if playerID == pick.PlayerID {
			state.TeamRosters[pick.TeamNumber] = append(roster[:i], roster[i+1:]...)
			break
		}
	}
	
	// Add player back to available
	state.AvailablePlayers = append(state.AvailablePlayers, pick.PlayerID)

	// Update session
	session.CurrentPick--
	session.UpdatedAt = time.Now()
	if err := s.repo.UpdateSession(ctx, session); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// Delete pick from database
	if err := s.repo.DeletePick(ctx, pick.ID); err != nil {
		return fmt.Errorf("failed to delete pick: %w", err)
	}

	// Save state
	state.LastAction = time.Now()
	if err := s.saveState(ctx, sessionID, state); err != nil {
		return fmt.Errorf("failed to save state: %w", err)
	}

	return nil
}

// RedoPick redoes a previously undone pick
func (s *Service) RedoPick(ctx context.Context, sessionID, userID string) (*models.DraftPick, error) {
	// Get session
	session, err := s.GetSession(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	if session.Status != "active" {
		return nil, fmt.Errorf("draft is not active")
	}

	// Get state
	state, err := s.getState(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get state: %w", err)
	}

	// Check if there's anything to redo
	if len(state.RedoStack) == 0 {
		return nil, fmt.Errorf("nothing to redo")
	}

	// Get last undone event
	lastEvent := state.RedoStack[len(state.RedoStack)-1]
	if lastEvent.Type != "pick" {
		return nil, fmt.Errorf("can only redo picks")
	}

	// Remove from redo stack and add back to undo stack
	state.RedoStack = state.RedoStack[:len(state.RedoStack)-1]
	state.UndoStack = append(state.UndoStack, lastEvent)

	// Restore the pick
	pick := lastEvent.Data.(*models.DraftPick)
	
	// Re-create the pick in database
	if err := s.repo.CreatePick(ctx, pick); err != nil {
		return nil, fmt.Errorf("failed to restore pick: %w", err)
	}

	// Update state
	state.Picks = append(state.Picks, *pick)
	state.TeamRosters[pick.TeamNumber] = append(state.TeamRosters[pick.TeamNumber], pick.PlayerID)
	state.AvailablePlayers = s.removePlayer(state.AvailablePlayers, pick.PlayerID)

	// Update session
	session.CurrentPick++
	session.UpdatedAt = time.Now()
	if err := s.repo.UpdateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	// Save state
	state.LastAction = time.Now()
	if err := s.saveState(ctx, sessionID, state); err != nil {
		return nil, fmt.Errorf("failed to save state: %w", err)
	}

	return pick, nil
}

// PauseSession pauses a draft session
func (s *Service) PauseSession(ctx context.Context, sessionID, userID string) error {
	session, err := s.GetSession(ctx, sessionID, userID)
	if err != nil {
		return err
	}

	if session.Status != "active" {
		return fmt.Errorf("can only pause active drafts")
	}

	session.Status = "paused"
	session.UpdatedAt = time.Now()

	return s.repo.UpdateSession(ctx, session)
}

// ResumeSession resumes a paused draft session
func (s *Service) ResumeSession(ctx context.Context, sessionID, userID string) error {
	session, err := s.GetSession(ctx, sessionID, userID)
	if err != nil {
		return err
	}

	if session.Status != "paused" {
		return fmt.Errorf("can only resume paused drafts")
	}

	session.Status = "active"
	session.UpdatedAt = time.Now()

	return s.repo.UpdateSession(ctx, session)
}

// GetUserSessions gets all draft sessions for a user
func (s *Service) GetUserSessions(ctx context.Context, userID string) ([]*models.DraftSession, error) {
	return s.repo.GetUserSessions(ctx, userID)
}

// Helper functions

func (s *Service) saveState(ctx context.Context, sessionID string, state *models.DraftState) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("draft:state:%s", sessionID)
	return s.redis.Set(ctx, key, data, 24*time.Hour).Err()
}

func (s *Service) getState(ctx context.Context, sessionID string) (*models.DraftState, error) {
	key := fmt.Sprintf("draft:state:%s", sessionID)
	data, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var state models.DraftState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, err
	}

	return &state, nil
}

func (s *Service) isPlayerAvailable(availablePlayers []string, playerID string) bool {
	for _, id := range availablePlayers {
		if id == playerID {
			return true
		}
	}
	return false
}

func (s *Service) removePlayer(availablePlayers []string, playerID string) []string {
	result := make([]string, 0, len(availablePlayers)-1)
	for _, id := range availablePlayers {
		if id != playerID {
			result = append(result, id)
		}
	}
	return result
}