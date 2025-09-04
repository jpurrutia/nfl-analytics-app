package espn

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

// MockESPNClient provides a mock implementation for testing
type MockESPNClient struct {
	LeagueInfo        *LeagueInfo
	Rosters           []Roster
	AvailablePlayers  []Player
	Matchups          []Matchup
	Transactions      []Transaction
	DraftPicks        []DraftPick
	Error             error
}

// NewMockESPNClient creates a mock client with sample data
func NewMockESPNClient() *MockESPNClient {
	return &MockESPNClient{
		LeagueInfo: &LeagueInfo{
			ID:     "mock-league",
			Name:   "Mock Fantasy League",
			Season: 2023,
			Settings: LeagueSettings{
				ScoringType: "PPR",
				ScoringSettings: ScoringSettings{
					PassingYards:        0.04,
					PassingTouchdowns:   4,
					Interceptions:       -2,
					RushingYards:        0.1,
					RushingTouchdowns:   6,
					ReceptionPoints:     1,
					ReceivingYards:      0.1,
					ReceivingTouchdowns: 6,
				},
				RosterSettings: RosterSettings{
					QB:    1,
					RB:    2,
					WR:    2,
					TE:    1,
					FLEX:  1,
					DST:   1,
					K:     1,
					BENCH: 7,
				},
				PlayoffSettings: PlayoffSettings{
					PlayoffTeams:  6,
					WeeksPerRound: []int{1, 1, 1},
					PlayoffStart:  15,
				},
			},
			Teams: []Team{
				{
					ID:       1,
					Name:     "ALPHA",
					FullName: "Team Alpha",
					Owner: TeamOwner{
						ID:   "user1",
						Name: "John Doe",
					},
					Record: TeamRecord{Wins: 8, Losses: 2},
					Points: 1250.5,
					Rank:   1,
				},
				{
					ID:       2,
					Name:     "BETA",
					FullName: "Team Beta",
					Owner: TeamOwner{
						ID:   "user2",
						Name: "Jane Smith",
					},
					Record: TeamRecord{Wins: 6, Losses: 4},
					Points: 1180.3,
					Rank:   3,
				},
			},
			Status: LeagueStatus{
				CurrentWeek:         10,
				IsActive:           true,
				LatestScoringPeriod: 10,
				FinalMatchupPeriod:  17,
				TransactionCounter:  145,
				WaiverStatus:        "ON",
			},
		},
		Rosters: []Roster{
			{
				TeamID: 1,
				Players: []RosterPlayer{
					{
						PlayerID:   "player001",
						PlayerName: "Patrick Mahomes",
						Position:   "QB",
						Team:       "KC",
						Status:     "ACTIVE",
						LineupSlot: "QB",
						Points:     285.4,
					},
					{
						PlayerID:   "player002",
						PlayerName: "Christian McCaffrey",
						Position:   "RB",
						Team:       "SF",
						Status:     "ACTIVE",
						LineupSlot: "RB",
						Points:     245.8,
					},
				},
			},
		},
		AvailablePlayers: []Player{
			{
				ID:                   "player100",
				Name:                 "Available RB",
				Position:             "RB",
				Team:                 "DAL",
				Status:               "ACTIVE",
				PercentOwned:         45.2,
				AverageDraftPosition: 85.3,
			},
			{
				ID:                   "player101",
				Name:                 "Available WR",
				Position:             "WR",
				Team:                 "MIN",
				Status:               "QUESTIONABLE",
				PercentOwned:         32.8,
				AverageDraftPosition: 112.5,
			},
		},
	}
}

// GetLeagueInfo returns mock league information
func (m *MockESPNClient) GetLeagueInfo(ctx context.Context, leagueID string) (*LeagueInfo, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	if m.LeagueInfo == nil {
		return nil, fmt.Errorf("league not found")
	}
	return m.LeagueInfo, nil
}

// GetRosters returns mock rosters
func (m *MockESPNClient) GetRosters(ctx context.Context, leagueID string) ([]Roster, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	return m.Rosters, nil
}

// GetAvailablePlayers returns mock available players
func (m *MockESPNClient) GetAvailablePlayers(ctx context.Context, leagueID string) ([]Player, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	return m.AvailablePlayers, nil
}

// GetMatchups returns mock matchups
func (m *MockESPNClient) GetMatchups(ctx context.Context, leagueID string, week int) ([]Matchup, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	if m.Matchups == nil {
		// Generate mock matchup
		m.Matchups = []Matchup{
			{
				ID:         fmt.Sprintf("matchup-%d-1", week),
				Week:       week,
				HomeTeamID: 1,
				AwayTeamID: 2,
				HomeScore:  125.4,
				AwayScore:  118.2,
				Winner:     "HOME",
				IsComplete: week < 10,
			},
		}
	}
	return m.Matchups, nil
}

// GetTransactions returns mock transactions
func (m *MockESPNClient) GetTransactions(ctx context.Context, leagueID string, limit int) ([]Transaction, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	if m.Transactions == nil {
		m.Transactions = []Transaction{
			{
				ID:              "trans001",
				Type:            "ADD",
				Status:          "EXECUTED",
				ProposingTeamID: 1,
				Players:         []string{"player100"},
				ProcessDate:     time.Now().Add(-24 * time.Hour),
			},
			{
				ID:              "trans002",
				Type:            "TRADE",
				Status:          "PENDING",
				ProposingTeamID: 1,
				AcceptingTeamID: 2,
				Players:         []string{"player002", "player003"},
				ProcessDate:     time.Now().Add(24 * time.Hour),
			},
		}
	}
	
	if limit > 0 && len(m.Transactions) > limit {
		return m.Transactions[:limit], nil
	}
	return m.Transactions, nil
}

// GetDraftResults returns mock draft picks
func (m *MockESPNClient) GetDraftResults(ctx context.Context, leagueID string) ([]DraftPick, error) {
	if m.Error != nil {
		return nil, m.Error
	}
	if m.DraftPicks == nil {
		m.DraftPicks = []DraftPick{
			{
				Round:       1,
				Pick:        1,
				OverallPick: 1,
				TeamID:      1,
				PlayerID:    "player002",
				PlayerName:  "Christian McCaffrey",
				Timestamp:   time.Date(2023, 9, 1, 19, 0, 0, 0, time.UTC),
			},
			{
				Round:       1,
				Pick:        2,
				OverallPick: 2,
				TeamID:      2,
				PlayerID:    "player003",
				PlayerName:  "Justin Jefferson",
				Timestamp:   time.Date(2023, 9, 1, 19, 1, 0, 0, time.UTC),
			},
		}
	}
	return m.DraftPicks, nil
}

// DetectScoringFormat returns the mock scoring format
func (m *MockESPNClient) DetectScoringFormat(settings LeagueSettings) string {
	if settings.ScoringSettings.ReceptionPoints == 1.0 {
		return "PPR"
	} else if settings.ScoringSettings.ReceptionPoints == 0.5 {
		return "HALF_PPR"
	}
	return "STANDARD"
}

// SetCookies is a no-op for the mock client
func (m *MockESPNClient) SetCookies(cookies []*http.Cookie) {
	// No-op for mock
}