package espn

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewESPNClient(t *testing.T) {
	client := NewESPNClient()
	assert.NotNil(t, client)
	assert.NotNil(t, client.httpClient)
	assert.Equal(t, baseURL, client.baseURL)
}

func TestGetLeagueInfo(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		assert.Contains(t, r.URL.Path, "/apis/site/v2/sports/football/nfl/scoreboard")
		
		// Mock response
		response := LeagueInfo{
			ID:       "123456",
			Name:     "Test League",
			Season:   2023,
			Settings: LeagueSettings{
				ScoringType: "PPR",
				RosterSettings: RosterSettings{
					QB:   1,
					RB:   2,
					WR:   2,
					TE:   1,
					FLEX: 1,
					DST:  1,
					K:    1,
				},
				PlayoffSettings: PlayoffSettings{
					PlayoffTeams: 6,
					WeeksPerRound: []int{1, 1, 1},
				},
			},
			Teams: []Team{
				{
					ID:   1,
					Name: "Team Alpha",
					Owner: TeamOwner{
						Name: "John Doe",
					},
				},
				{
					ID:   2,
					Name: "Team Beta",
					Owner: TeamOwner{
						Name: "Jane Smith",
					},
				},
			},
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := &ESPNClient{
		httpClient: http.DefaultClient,
		baseURL:    server.URL,
		rateLimiter: &rateLimiter{
			minInterval: 100 * time.Millisecond,
			resetTime:   time.Now().Add(time.Minute),
		},
	}

	ctx := context.Background()
	info, err := client.GetLeagueInfo(ctx, "123456")
	
	assert.NoError(t, err)
	assert.NotNil(t, info)
	assert.Equal(t, "123456", info.ID)
	assert.Equal(t, "Test League", info.Name)
	assert.Equal(t, 2023, info.Season)
	assert.Equal(t, "PPR", info.Settings.ScoringType)
	assert.Len(t, info.Teams, 2)
}

func TestGetRosters(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := []Roster{
			{
				TeamID: 1,
				Players: []RosterPlayer{
					{
						PlayerID:   "player123",
						PlayerName: "Patrick Mahomes",
						Position:   "QB",
						Team:       "KC",
						Status:     "ACTIVE",
					},
					{
						PlayerID:   "player456",
						PlayerName: "Travis Kelce",
						Position:   "TE",
						Team:       "KC",
						Status:     "ACTIVE",
					},
				},
			},
			{
				TeamID: 2,
				Players: []RosterPlayer{
					{
						PlayerID:   "player789",
						PlayerName: "Josh Allen",
						Position:   "QB",
						Team:       "BUF",
						Status:     "ACTIVE",
					},
				},
			},
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := &ESPNClient{
		httpClient: http.DefaultClient,
		baseURL:    server.URL,
		rateLimiter: &rateLimiter{
			minInterval: 100 * time.Millisecond,
			resetTime:   time.Now().Add(time.Minute),
		},
	}

	ctx := context.Background()
	rosters, err := client.GetRosters(ctx, "123456")
	
	assert.NoError(t, err)
	assert.Len(t, rosters, 2)
	assert.Len(t, rosters[0].Players, 2)
	assert.Equal(t, "Patrick Mahomes", rosters[0].Players[0].PlayerName)
}

func TestGetAvailablePlayers(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := []Player{
			{
				ID:         "player001",
				Name:       "Available Player 1",
				Position:   "RB",
				Team:       "DAL",
				Status:     "ACTIVE",
				PercentOwned: 45.5,
				AverageDraftPosition: 65.2,
			},
			{
				ID:         "player002",
				Name:       "Available Player 2",
				Position:   "WR",
				Team:       "MIN",
				Status:     "ACTIVE",
				PercentOwned: 32.1,
				AverageDraftPosition: 88.7,
			},
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := &ESPNClient{
		httpClient: http.DefaultClient,
		baseURL:    server.URL,
		rateLimiter: &rateLimiter{
			minInterval: 100 * time.Millisecond,
			resetTime:   time.Now().Add(time.Minute),
		},
	}

	ctx := context.Background()
	players, err := client.GetAvailablePlayers(ctx, "123456")
	
	assert.NoError(t, err)
	assert.Len(t, players, 2)
	assert.Equal(t, "Available Player 1", players[0].Name)
	assert.Equal(t, "RB", players[0].Position)
	assert.Equal(t, 45.5, players[0].PercentOwned)
}

func TestDetectScoringFormat(t *testing.T) {
	tests := []struct {
		name     string
		settings LeagueSettings
		expected string
	}{
		{
			name: "PPR scoring",
			settings: LeagueSettings{
				ScoringSettings: ScoringSettings{
					ReceptionPoints: 1.0,
				},
			},
			expected: "PPR",
		},
		{
			name: "Half-PPR scoring",
			settings: LeagueSettings{
				ScoringSettings: ScoringSettings{
					ReceptionPoints: 0.5,
				},
			},
			expected: "HALF_PPR",
		},
		{
			name: "Standard scoring",
			settings: LeagueSettings{
				ScoringSettings: ScoringSettings{
					ReceptionPoints: 0.0,
				},
			},
			expected: "STANDARD",
		},
	}

	client := NewESPNClient()
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			format := client.DetectScoringFormat(tt.settings)
			assert.Equal(t, tt.expected, format)
		})
	}
}

func TestParsePlayerPosition(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"QB", "QB"},
		{"RB", "RB"},
		{"WR", "WR"},
		{"TE", "TE"},
		{"K", "K"},
		{"DEF", "DST"},
		{"D/ST", "DST"},
		{"DST", "DST"},
		{"FLEX", "FLEX"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := ParsePlayerPosition(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestHandleHTTPError(t *testing.T) {
	tests := []struct {
		statusCode int
		shouldErr  bool
		errMsg     string
	}{
		{200, false, ""},
		{404, true, "league not found"},
		{401, true, "unauthorized"},
		{429, true, "rate limited"},
		{500, true, "server error"},
		{503, true, "service unavailable"},
	}

	for _, tt := range tests {
		t.Run(http.StatusText(tt.statusCode), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				if tt.statusCode == 200 {
					json.NewEncoder(w).Encode(LeagueInfo{ID: "test"})
				}
			}))
			defer server.Close()

			client := &ESPNClient{
				httpClient: http.DefaultClient,
				baseURL:    server.URL,
			}

			ctx := context.Background()
			_, err := client.GetLeagueInfo(ctx, "123456")
			
			if tt.shouldErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRateLimiting(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if requestCount > 2 {
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		json.NewEncoder(w).Encode(LeagueInfo{ID: "test"})
	}))
	defer server.Close()

	client := &ESPNClient{
		httpClient: http.DefaultClient,
		baseURL:    server.URL,
		rateLimiter: &rateLimiter{
			minInterval: 100 * time.Millisecond,
			resetTime:   time.Now().Add(time.Minute),
		},
	}

	ctx := context.Background()
	
	// First two requests should succeed
	for i := 0; i < 2; i++ {
		_, err := client.GetLeagueInfo(ctx, "123456")
		assert.NoError(t, err)
	}
	
	// Third request should be rate limited
	_, err := client.GetLeagueInfo(ctx, "123456")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "rate limited")
}

func TestConcurrentRequests(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(LeagueInfo{ID: "test"})
	}))
	defer server.Close()

	client := &ESPNClient{
		httpClient: http.DefaultClient,
		baseURL:    server.URL,
		rateLimiter: &rateLimiter{
			minInterval: 100 * time.Millisecond,
			resetTime:   time.Now().Add(time.Minute),
		},
	}

	ctx := context.Background()
	
	// Run concurrent requests
	done := make(chan bool, 5)
	for i := 0; i < 5; i++ {
		go func() {
			_, err := client.GetLeagueInfo(ctx, "123456")
			assert.NoError(t, err)
			done <- true
		}()
	}
	
	// Wait for all goroutines
	for i := 0; i < 5; i++ {
		<-done
	}
}