package espn

import "time"

// LeagueInfo represents ESPN fantasy league information
type LeagueInfo struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	Season   int            `json:"seasonId"`
	Settings LeagueSettings `json:"settings"`
	Teams    []Team         `json:"teams"`
	Status   LeagueStatus   `json:"status"`
}

// LeagueSettings contains league configuration
type LeagueSettings struct {
	ScoringType     string          `json:"scoringType"`
	ScoringSettings ScoringSettings `json:"scoringSettings"`
	RosterSettings  RosterSettings  `json:"rosterSettings"`
	PlayoffSettings PlayoffSettings `json:"playoffSettings"`
	DraftSettings   DraftSettings   `json:"draftSettings"`
	TradeSettings   TradeSettings   `json:"tradeSettings"`
}

// ScoringSettings defines point values for different actions
type ScoringSettings struct {
	PassingYards      float64 `json:"passingYards"`
	PassingTouchdowns float64 `json:"passingTouchdowns"`
	Interceptions     float64 `json:"interceptions"`
	RushingYards      float64 `json:"rushingYards"`
	RushingTouchdowns float64 `json:"rushingTouchdowns"`
	ReceptionPoints   float64 `json:"receptionPoints"`
	ReceivingYards    float64 `json:"receivingYards"`
	ReceivingTouchdowns float64 `json:"receivingTouchdowns"`
	Fumbles           float64 `json:"fumbles"`
	FieldGoalMade     float64 `json:"fieldGoalMade"`
	FieldGoalMissed   float64 `json:"fieldGoalMissed"`
	ExtraPointMade    float64 `json:"extraPointMade"`
}

// RosterSettings defines team roster requirements
type RosterSettings struct {
	QB     int `json:"QB"`
	RB     int `json:"RB"`
	WR     int `json:"WR"`
	TE     int `json:"TE"`
	FLEX   int `json:"FLEX"`
	DST    int `json:"DST"`
	K      int `json:"K"`
	BENCH  int `json:"BENCH"`
	IR     int `json:"IR"`
	Total  int `json:"total"`
}

// PlayoffSettings defines playoff structure
type PlayoffSettings struct {
	PlayoffTeams  int   `json:"playoffTeams"`
	WeeksPerRound []int `json:"weeksPerRound"`
	PlayoffStart  int   `json:"playoffStart"`
}

// DraftSettings contains draft configuration
type DraftSettings struct {
	Type         string    `json:"type"` // SNAKE, AUCTION
	Date         time.Time `json:"date"`
	PickOrder    []int     `json:"pickOrder"`
	TimePerPick  int       `json:"timePerPick"`
	AuctionBudget int      `json:"auctionBudget,omitempty"`
}

// TradeSettings defines trade rules
type TradeSettings struct {
	TradeDeadline   time.Time `json:"tradeDeadline"`
	ReviewPeriod    int       `json:"reviewPeriod"`
	VetoVotesNeeded int       `json:"vetoVotesNeeded"`
	AllowTradePicks bool      `json:"allowTradePicks"`
}

// Team represents a fantasy team
type Team struct {
	ID       int       `json:"id"`
	Name     string    `json:"abbrev"`
	FullName string    `json:"location"`
	Nickname string    `json:"nickname"`
	Owner    TeamOwner `json:"owner"`
	Record   TeamRecord `json:"record,omitempty"`
	Points   float64   `json:"points,omitempty"`
	Rank     int       `json:"playoffSeed,omitempty"`
}

// TeamOwner represents team ownership
type TeamOwner struct {
	ID   string `json:"id"`
	Name string `json:"displayName"`
	Email string `json:"email,omitempty"`
}

// TeamRecord contains win/loss record
type TeamRecord struct {
	Wins   int `json:"wins"`
	Losses int `json:"losses"`
	Ties   int `json:"ties"`
}

// LeagueStatus represents current league state
type LeagueStatus struct {
	CurrentWeek         int    `json:"currentMatchupPeriod"`
	IsActive           bool   `json:"isActive"`
	LatestScoringPeriod int    `json:"latestScoringPeriod"`
	FinalMatchupPeriod  int    `json:"finalMatchupPeriod"`
	TransactionCounter  int    `json:"transactionCounter"`
	WaiverStatus        string `json:"waiverStatus"`
}

// Roster represents a team's roster
type Roster struct {
	TeamID  int            `json:"teamId"`
	Week    int            `json:"scoringPeriodId,omitempty"`
	Players []RosterPlayer `json:"players"`
}

// RosterPlayer represents a player on a roster
type RosterPlayer struct {
	PlayerID        string  `json:"playerId"`
	PlayerName      string  `json:"playerName"`
	Position        string  `json:"position"`
	Team            string  `json:"proTeam"`
	Status          string  `json:"injuryStatus"`
	LineupSlot      string  `json:"lineupSlot"`
	Points          float64 `json:"appliedStatTotal,omitempty"`
	ProjectedPoints float64 `json:"projectedPoints,omitempty"`
	AcquisitionDate time.Time `json:"acquisitionDate,omitempty"`
}

// Player represents available player information
type Player struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"fullName"`
	FirstName            string  `json:"firstName"`
	LastName             string  `json:"lastName"`
	Position             string  `json:"defaultPositionId"`
	Team                 string  `json:"proTeamId"`
	Jersey               int     `json:"jersey,omitempty"`
	Status               string  `json:"injuryStatus"`
	PercentOwned         float64 `json:"percentOwned"`
	PercentStarted       float64 `json:"percentStarted"`
	AverageDraftPosition float64 `json:"averageDraftPosition"`
	Stats                PlayerStats `json:"stats,omitempty"`
	Projections          PlayerStats `json:"projections,omitempty"`
}

// PlayerStats contains player statistics
type PlayerStats struct {
	Season          int                    `json:"seasonId"`
	Week            int                    `json:"scoringPeriodId,omitempty"`
	StatSource      string                 `json:"statSourceId"`
	Stats           map[string]float64     `json:"stats"`
	AppliedTotal    float64                `json:"appliedTotal"`
	ExternalID      string                 `json:"externalId,omitempty"`
}

// Transaction represents a league transaction
type Transaction struct {
	ID              string    `json:"id"`
	Type            string    `json:"type"` // TRADE, ADD, DROP, WAIVER
	Status          string    `json:"status"`
	ProposingTeamID int       `json:"proposingTeamId"`
	AcceptingTeamID int       `json:"acceptingTeamId,omitempty"`
	Players         []string  `json:"players"`
	ProcessDate     time.Time `json:"processDate"`
	BidAmount       int       `json:"bidAmount,omitempty"`
}

// Matchup represents a weekly matchup
type Matchup struct {
	ID          string  `json:"id"`
	Week        int     `json:"matchupPeriodId"`
	HomeTeamID  int     `json:"homeTeamId"`
	AwayTeamID  int     `json:"awayTeamId"`
	HomeScore   float64 `json:"homeScore"`
	AwayScore   float64 `json:"awayScore"`
	Winner      string  `json:"winner"` // HOME, AWAY, TIE
	IsComplete  bool    `json:"isComplete"`
	IsPlayoffs  bool    `json:"isPlayoffs"`
}

// DraftPick represents a draft selection
type DraftPick struct {
	Round        int    `json:"round"`
	Pick         int    `json:"pick"`
	OverallPick  int    `json:"overallPick"`
	TeamID       int    `json:"teamId"`
	PlayerID     string `json:"playerId"`
	PlayerName   string `json:"playerName"`
	BidAmount    int    `json:"bidAmount,omitempty"` // For auction drafts
	Keeper       bool   `json:"keeper"`
	Timestamp    time.Time `json:"timestamp"`
}

// WaiverClaim represents a waiver wire claim
type WaiverClaim struct {
	ID          string    `json:"id"`
	TeamID      int       `json:"teamId"`
	PlayerAdd   string    `json:"playerIdAdd"`
	PlayerDrop  string    `json:"playerIdDrop,omitempty"`
	BidAmount   int       `json:"bidAmount"`
	Priority    int       `json:"priority"`
	Status      string    `json:"status"` // PENDING, PROCESSED, FAILED
	ProcessDate time.Time `json:"processDate"`
}

// ParsePlayerPosition standardizes position strings
func ParsePlayerPosition(pos string) string {
	switch pos {
	case "DEF", "D/ST":
		return "DST"
	default:
		return pos
	}
}