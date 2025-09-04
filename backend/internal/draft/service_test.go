package draft

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nfl-analytics/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of Repository
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) CreateSession(ctx context.Context, session *models.DraftSession) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockRepository) GetSession(ctx context.Context, sessionID string) (*models.DraftSession, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DraftSession), args.Error(1)
}

func (m *MockRepository) UpdateSession(ctx context.Context, session *models.DraftSession) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockRepository) DeleteSession(ctx context.Context, sessionID string) error {
	args := m.Called(ctx, sessionID)
	return args.Error(0)
}

func (m *MockRepository) GetUserSessions(ctx context.Context, userID string) ([]*models.DraftSession, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.DraftSession), args.Error(1)
}

func (m *MockRepository) CreatePick(ctx context.Context, pick *models.DraftPick) error {
	args := m.Called(ctx, pick)
	return args.Error(0)
}

func (m *MockRepository) GetPicks(ctx context.Context, sessionID string) ([]*models.DraftPick, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.DraftPick), args.Error(1)
}

func (m *MockRepository) DeletePick(ctx context.Context, pickID string) error {
	args := m.Called(ctx, pickID)
	return args.Error(0)
}

// Helper function to create a test Redis client
func createTestRedis() *redis.Client {
	// Use mini redis for testing or mock
	return redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   15, // Use a test database
	})
}

func TestCreateSession(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	redisClient := createTestRedis()
	service := NewService(mockRepo, redisClient)

	userID := uuid.New().String()
	req := &CreateSessionRequest{
		LeagueID:     uuid.New().String(),
		Name:         "Test Draft 2024",
		DraftType:    "snake",
		TeamCount:    12,
		RoundCount:   15,
		UserPosition: 5,
		Settings: models.DraftSettings{
			ScoringType: "PPR",
			RosterSlots: models.RosterSlots{
				QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6,
			},
			TimerSeconds:     90,
			AutoDraftEnabled: false,
		},
	}

	// Test successful creation
	mockRepo.On("CreateSession", ctx, mock.AnythingOfType("*models.DraftSession")).Return(nil)

	session, err := service.CreateSession(ctx, userID, req)
	assert.NoError(t, err)
	assert.NotNil(t, session)
	assert.Equal(t, userID, session.UserID)
	assert.Equal(t, "snake", session.DraftType)
	assert.Equal(t, 12, session.TeamCount)
	assert.Equal(t, 15, session.RoundCount)
	assert.Equal(t, 5, session.UserPosition)
	assert.Equal(t, "active", session.Status)
	assert.Equal(t, 0, session.CurrentPick)

	// Clean up Redis
	redisClient.Del(ctx, "draft:state:"+session.ID)

	// Test invalid request - user position > team count
	invalidReq := &CreateSessionRequest{
		LeagueID:     uuid.New().String(),
		Name:         "Invalid Draft",
		DraftType:    "snake",
		TeamCount:    10,
		RoundCount:   15,
		UserPosition: 11, // Invalid: greater than team count
		Settings: models.DraftSettings{
			ScoringType: "PPR",
			RosterSlots: models.RosterSlots{
				QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6,
			},
		},
	}

	_, err = service.CreateSession(ctx, userID, invalidReq)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user position cannot be greater than team count")
}

func TestRecordPick(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	redisClient := createTestRedis()
	service := NewService(mockRepo, redisClient)

	userID := uuid.New().String()
	sessionID := uuid.New().String()

	// Create test session
	session := &models.DraftSession{
		ID:           sessionID,
		UserID:       userID,
		LeagueID:     uuid.New().String(),
		Name:         "Test Draft",
		DraftType:    "snake",
		TeamCount:    12,
		RoundCount:   15,
		UserPosition: 5,
		CurrentPick:  0,
		Status:       "active",
		Settings: models.DraftSettings{
			ScoringType: "PPR",
			RosterSlots: models.RosterSlots{
				QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Create test state with available players
	state := &models.DraftState{
		SessionID:        sessionID,
		Picks:           []models.DraftPick{},
		AvailablePlayers: []string{"player1", "player2", "player3"},
		TeamRosters:      make(map[int][]string),
		UndoStack:       []models.DraftEvent{},
		RedoStack:       []models.DraftEvent{},
		LastAction:      time.Now(),
	}

	// Initialize team rosters
	for i := 1; i <= 12; i++ {
		state.TeamRosters[i] = []string{}
	}

	// Save state to Redis
	stateData, _ := json.Marshal(state)
	redisClient.Set(ctx, "draft:state:"+sessionID, stateData, 24*time.Hour)

	// Setup mocks
	mockRepo.On("GetSession", ctx, sessionID).Return(session, nil)
	mockRepo.On("CreatePick", ctx, mock.AnythingOfType("*models.DraftPick")).Return(nil)
	mockRepo.On("UpdateSession", ctx, mock.AnythingOfType("*models.DraftSession")).Return(nil)

	// Test successful pick
	req := &RecordPickRequest{
		PlayerID:   "player1",
		PlayerName: "Test Player",
		Position:   "RB",
	}

	pick, err := service.RecordPick(ctx, sessionID, userID, req)
	assert.NoError(t, err)
	assert.NotNil(t, pick)
	assert.Equal(t, 1, pick.PickNumber)
	assert.Equal(t, 1, pick.Round)
	assert.Equal(t, 1, pick.TeamNumber)
	assert.Equal(t, "player1", pick.PlayerID)
	assert.Equal(t, "Test Player", pick.PlayerName)
	assert.Equal(t, "RB", pick.Position)

	// Verify state was updated
	updatedState, err := service.getState(ctx, sessionID)
	assert.NoError(t, err)
	assert.Len(t, updatedState.Picks, 1)
	assert.Len(t, updatedState.AvailablePlayers, 2)
	assert.Contains(t, updatedState.TeamRosters[1], "player1")

	// Test picking unavailable player
	req2 := &RecordPickRequest{
		PlayerID:   "player999",
		PlayerName: "Unavailable Player",
		Position:   "WR",
	}

	_, err = service.RecordPick(ctx, sessionID, userID, req2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "player is not available")

	// Clean up Redis
	redisClient.Del(ctx, "draft:state:"+sessionID)
}

func TestUndoRedoPick(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	redisClient := createTestRedis()
	service := NewService(mockRepo, redisClient)

	userID := uuid.New().String()
	sessionID := uuid.New().String()

	// Create test session with one pick already made
	session := &models.DraftSession{
		ID:           sessionID,
		UserID:       userID,
		DraftType:    "snake",
		TeamCount:    12,
		RoundCount:   15,
		CurrentPick:  1,
		Status:       "active",
	}

	// Create pick to undo
	existingPick := &models.DraftPick{
		ID:         uuid.New().String(),
		SessionID:  sessionID,
		PickNumber: 1,
		Round:      1,
		TeamNumber: 1,
		PlayerID:   "player1",
		PlayerName: "Test Player",
		Position:   "RB",
	}

	// Create state with the pick
	state := &models.DraftState{
		SessionID:        sessionID,
		Picks:           []models.DraftPick{*existingPick},
		AvailablePlayers: []string{"player2", "player3"},
		TeamRosters:      map[int][]string{1: {"player1"}},
		UndoStack: []models.DraftEvent{
			{
				Type:      "pick",
				Data:      existingPick,
				Timestamp: time.Now(),
				UserID:    userID,
			},
		},
		RedoStack:  []models.DraftEvent{},
		LastAction: time.Now(),
	}

	// Save state to Redis
	stateData, _ := json.Marshal(state)
	redisClient.Set(ctx, "draft:state:"+sessionID, stateData, 24*time.Hour)

	// Setup mocks for undo
	mockRepo.On("GetSession", ctx, sessionID).Return(session, nil)
	mockRepo.On("UpdateSession", ctx, mock.AnythingOfType("*models.DraftSession")).Return(nil)
	mockRepo.On("DeletePick", ctx, existingPick.ID).Return(nil)
	mockRepo.On("CreatePick", ctx, mock.AnythingOfType("*models.DraftPick")).Return(nil)

	// Test undo
	err := service.UndoPick(ctx, sessionID, userID)
	assert.NoError(t, err)

	// Verify state after undo
	undoState, err := service.getState(ctx, sessionID)
	assert.NoError(t, err)
	assert.Len(t, undoState.Picks, 0)
	assert.Len(t, undoState.UndoStack, 0)
	assert.Len(t, undoState.RedoStack, 1)
	assert.Contains(t, undoState.AvailablePlayers, "player1")

	// Test redo
	pick, err := service.RedoPick(ctx, sessionID, userID)
	assert.NoError(t, err)
	assert.NotNil(t, pick)
	assert.Equal(t, "player1", pick.PlayerID)

	// Verify state after redo
	redoState, err := service.getState(ctx, sessionID)
	assert.NoError(t, err)
	assert.Len(t, redoState.Picks, 1)
	assert.Len(t, redoState.UndoStack, 1)
	assert.Len(t, redoState.RedoStack, 0)

	// Clean up Redis
	redisClient.Del(ctx, "draft:state:"+sessionID)
}

func TestDraftSessionMethods(t *testing.T) {
	// Test GetCurrentRound
	session := &models.DraftSession{
		TeamCount:   12,
		CurrentPick: 0,
	}
	assert.Equal(t, 1, session.GetCurrentRound())

	session.CurrentPick = 12
	assert.Equal(t, 1, session.GetCurrentRound())

	session.CurrentPick = 13
	assert.Equal(t, 2, session.GetCurrentRound())

	// Test GetCurrentTeam for snake draft
	session.DraftType = "snake"
	session.CurrentPick = 1
	assert.Equal(t, 1, session.GetCurrentTeam())

	session.CurrentPick = 12
	assert.Equal(t, 12, session.GetCurrentTeam())

	// In round 2 of snake draft, order reverses
	session.CurrentPick = 13
	assert.Equal(t, 12, session.GetCurrentTeam())

	session.CurrentPick = 24
	assert.Equal(t, 1, session.GetCurrentTeam())

	// Test IsUserPick
	session.UserPosition = 5
	session.CurrentPick = 5
	assert.True(t, session.IsUserPick())

	session.CurrentPick = 6
	assert.False(t, session.IsUserPick())

	// Test GetTotalPicks
	session.RoundCount = 15
	assert.Equal(t, 180, session.GetTotalPicks())

	// Test IsComplete
	session.CurrentPick = 180
	assert.False(t, session.IsComplete())

	session.CurrentPick = 181
	assert.True(t, session.IsComplete())
}

func TestValidateCreateSessionRequest(t *testing.T) {
	// Valid request
	req := &CreateSessionRequest{
		LeagueID:     uuid.New().String(),
		Name:         "Test Draft",
		DraftType:    "snake",
		TeamCount:    12,
		RoundCount:   15,
		UserPosition: 5,
		Settings: models.DraftSettings{
			ScoringType: "PPR",
			RosterSlots: models.RosterSlots{
				QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6,
			},
			TimerSeconds: 90,
		},
	}

	err := req.Validate()
	assert.NoError(t, err)

	// Invalid: user position > team count
	req.UserPosition = 13
	err = req.Validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user position cannot be greater than team count")

	// Invalid: roster slots don't match round count
	req.UserPosition = 5
	req.Settings.RosterSlots.BENCH = 5
	err = req.Validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "total roster slots")

	// Invalid: bad scoring type
	req.Settings.RosterSlots.BENCH = 6
	req.Settings.ScoringType = "INVALID"
	err = req.Validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid scoring type")

	// Invalid: timer out of range
	req.Settings.ScoringType = "PPR"
	req.Settings.TimerSeconds = 700
	err = req.Validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "timer must be between")
}