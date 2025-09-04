package draft

import (
	"context"
	"fmt"
	"math"
	"sort"

	"github.com/nfl-analytics/backend/internal/models"
)

// RecommendationEngine provides draft pick recommendations
type RecommendationEngine struct {
	playerRepo PlayerRepository
	adpRepo    ADPRepository
}

// PlayerRepository interface for accessing player data
type PlayerRepository interface {
	GetAvailablePlayers(ctx context.Context, playerIDs []string) ([]Player, error)
	GetPlayerProjections(ctx context.Context, playerIDs []string, scoringType string) (map[string]float64, error)
}

// ADPRepository interface for accessing ADP data
type ADPRepository interface {
	GetADP(ctx context.Context, scoringType string) (map[string]float64, error)
}

// Player represents a player with their stats and projections
type Player struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Position   string  `json:"position"`
	Team       string  `json:"team"`
	Projection float64 `json:"projection"`
	ADP        float64 `json:"adp"`
}

// NewRecommendationEngine creates a new recommendation engine
func NewRecommendationEngine(playerRepo PlayerRepository, adpRepo ADPRepository) *RecommendationEngine {
	return &RecommendationEngine{
		playerRepo: playerRepo,
		adpRepo:    adpRepo,
	}
}

// GetRecommendations generates draft recommendations for the current pick
func (e *RecommendationEngine) GetRecommendations(
	ctx context.Context,
	session *models.DraftSession,
	state *models.DraftState,
	count int,
) ([]models.DraftRecommendation, error) {
	
	// Get available players
	players, err := e.playerRepo.GetAvailablePlayers(ctx, state.AvailablePlayers)
	if err != nil {
		return nil, fmt.Errorf("failed to get available players: %w", err)
	}

	// Get projections for the scoring type
	projections, err := e.playerRepo.GetPlayerProjections(ctx, state.AvailablePlayers, session.Settings.ScoringType)
	if err != nil {
		return nil, fmt.Errorf("failed to get projections: %w", err)
	}

	// Get ADP data
	adpData, err := e.adpRepo.GetADP(ctx, session.Settings.ScoringType)
	if err != nil {
		return nil, fmt.Errorf("failed to get ADP data: %w", err)
	}

	// Calculate current roster needs
	rosterNeeds := e.calculateRosterNeeds(session, state)

	// Score each player
	recommendations := make([]models.DraftRecommendation, 0, len(players))
	for _, player := range players {
		// Get player's projected points
		projectedPoints := projections[player.ID]
		
		// Get player's ADP
		adp, hasADP := adpData[player.ID]
		if !hasADP {
			adp = 200.0 // Default ADP for unlisted players
		}
		player.ADP = adp

		// Calculate value over ADP
		currentPick := float64(session.CurrentPick)
		if currentPick == 0 {
			currentPick = 1
		}
		valueOverADP := adp - currentPick

		// Calculate positional need score
		positionalNeed := rosterNeeds[player.Position]

		// Calculate overall score (0-100)
		score := e.calculateScore(
			projectedPoints,
			valueOverADP,
			positionalNeed,
			player.Position,
			currentPick,
		)

		// Generate reasoning
		reasoning := e.generateReasoning(
			player,
			valueOverADP,
			positionalNeed,
			projectedPoints,
		)

		recommendations = append(recommendations, models.DraftRecommendation{
			PlayerID:       player.ID,
			PlayerName:     player.Name,
			Position:       player.Position,
			Team:           player.Team,
			Score:          score,
			ValueOverADP:   valueOverADP,
			PositionalNeed: positionalNeed,
			Reasoning:      reasoning,
		})
	}

	// Sort by score (highest first)
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].Score > recommendations[j].Score
	})

	// Return top N recommendations
	if len(recommendations) > count {
		recommendations = recommendations[:count]
	}

	return recommendations, nil
}

// calculateRosterNeeds determines which positions need to be filled
func (e *RecommendationEngine) calculateRosterNeeds(
	session *models.DraftSession,
	state *models.DraftState,
) map[string]float64 {
	
	needs := make(map[string]float64)
	roster := state.TeamRosters[session.UserPosition]
	
	// Count current roster by position
	currentRoster := make(map[string]int)
	for _, pick := range state.Picks {
		if pick.TeamNumber == session.UserPosition {
			currentRoster[pick.Position]++
		}
	}

	// Calculate need for each position (0-100 scale)
	settings := session.Settings.RosterSlots
	
	// QB need
	qbHave := currentRoster["QB"]
	qbNeed := settings.QB - qbHave
	needs["QB"] = e.normalizeNeed(qbNeed, settings.QB, len(roster))

	// RB need
	rbHave := currentRoster["RB"]
	rbNeed := settings.RB - rbHave
	if rbNeed < 0 {
		rbNeed = 0 // Can use RBs in FLEX
	}
	needs["RB"] = e.normalizeNeed(rbNeed, settings.RB+settings.FLEX, len(roster))

	// WR need
	wrHave := currentRoster["WR"]
	wrNeed := settings.WR - wrHave
	if wrNeed < 0 {
		wrNeed = 0 // Can use WRs in FLEX
	}
	needs["WR"] = e.normalizeNeed(wrNeed, settings.WR+settings.FLEX, len(roster))

	// TE need
	teHave := currentRoster["TE"]
	teNeed := settings.TE - teHave
	if teNeed < 0 {
		teNeed = 0 // Can use TEs in FLEX
	}
	needs["TE"] = e.normalizeNeed(teNeed, settings.TE+settings.FLEX, len(roster))

	// DST need
	dstHave := currentRoster["DST"]
	dstNeed := settings.DST - dstHave
	needs["DST"] = e.normalizeNeed(dstNeed, settings.DST, len(roster))

	// K need
	kHave := currentRoster["K"]
	kNeed := settings.K - kHave
	needs["K"] = e.normalizeNeed(kNeed, settings.K, len(roster))

	return needs
}

// normalizeNeed converts position need to 0-100 scale
func (e *RecommendationEngine) normalizeNeed(need, maxNeed, rosterSize int) float64 {
	if need <= 0 {
		return 0.0
	}
	
	// Early picks should focus on best available
	pickProgress := float64(rosterSize) / 15.0 // Assume 15 round draft
	earlyPickBonus := math.Max(0, 1.0-pickProgress)
	
	// Calculate base need score
	baseScore := (float64(need) / float64(maxNeed)) * 100
	
	// Reduce position need importance in early rounds
	return baseScore * (1.0 - earlyPickBonus*0.5)
}

// calculateScore computes the overall recommendation score
func (e *RecommendationEngine) calculateScore(
	projectedPoints float64,
	valueOverADP float64,
	positionalNeed float64,
	position string,
	currentPick float64,
) float64 {
	
	// Weight factors based on draft stage
	earlyDraft := currentPick <= 36  // First 3 rounds
	midDraft := currentPick > 36 && currentPick <= 96  // Rounds 4-8
	lateDraft := currentPick > 96
	
	var valueWeight, needWeight, projectionWeight float64
	
	if earlyDraft {
		// Early draft: Focus on value and projections
		valueWeight = 0.4
		projectionWeight = 0.5
		needWeight = 0.1
	} else if midDraft {
		// Mid draft: Balance all factors
		valueWeight = 0.3
		projectionWeight = 0.4
		needWeight = 0.3
	} else if lateDraft {
		// Late draft: Focus on needs and upside
		valueWeight = 0.2
		projectionWeight = 0.3
		needWeight = 0.5
	}
	
	// Calculate value score (normalize to 0-100)
	valueScore := math.Max(0, math.Min(100, 50+valueOverADP*2))
	
	// Calculate projection score (position-relative)
	projectionScore := e.getProjectionScore(projectedPoints, position)
	
	// Calculate weighted score
	score := valueScore*valueWeight + 
	         projectionScore*projectionWeight + 
	         positionalNeed*needWeight
	
	// Apply position-specific adjustments
	score = e.applyPositionAdjustments(score, position, currentPick)
	
	return math.Max(0, math.Min(100, score))
}

// getProjectionScore normalizes projection points by position
func (e *RecommendationEngine) getProjectionScore(points float64, position string) float64 {
	// Position-specific point thresholds for elite/good/average
	thresholds := map[string][]float64{
		"QB":  {300, 250, 200},  // Elite, Good, Average
		"RB":  {200, 150, 100},
		"WR":  {180, 140, 90},
		"TE":  {140, 100, 60},
		"DST": {120, 100, 80},
		"K":   {130, 110, 90},
	}
	
	posThresholds, exists := thresholds[position]
	if !exists {
		return 50.0 // Default middle score
	}
	
	if points >= posThresholds[0] {
		// Elite tier: 85-100
		return 85 + (points-posThresholds[0])/posThresholds[0]*15
	} else if points >= posThresholds[1] {
		// Good tier: 65-85
		ratio := (points - posThresholds[1]) / (posThresholds[0] - posThresholds[1])
		return 65 + ratio*20
	} else if points >= posThresholds[2] {
		// Average tier: 40-65
		ratio := (points - posThresholds[2]) / (posThresholds[1] - posThresholds[2])
		return 40 + ratio*25
	}
	
	// Below average: 0-40
	return math.Max(0, points/posThresholds[2]*40)
}

// applyPositionAdjustments applies draft strategy adjustments
func (e *RecommendationEngine) applyPositionAdjustments(score float64, position string, currentPick float64) float64 {
	// Don't draft K/DST too early
	if position == "K" || position == "DST" {
		if currentPick < 100 {
			score *= 0.3 // Heavy penalty for early K/DST
		} else if currentPick < 130 {
			score *= 0.7 // Moderate penalty
		}
	}
	
	// Slight boost for RB/WR in early rounds (position scarcity)
	if (position == "RB" || position == "WR") && currentPick < 50 {
		score *= 1.1
	}
	
	// TE premium in middle rounds (position scarcity after top tier)
	if position == "TE" && currentPick > 30 && currentPick < 80 {
		score *= 1.15
	}
	
	return score
}

// generateReasoning creates human-readable explanation
func (e *RecommendationEngine) generateReasoning(
	player Player,
	valueOverADP float64,
	positionalNeed float64,
	projectedPoints float64,
) string {
	
	reasons := []string{}
	
	// Value reasoning
	if valueOverADP > 20 {
		reasons = append(reasons, fmt.Sprintf("Excellent value (ADP: %.0f)", player.ADP))
	} else if valueOverADP > 10 {
		reasons = append(reasons, fmt.Sprintf("Good value (ADP: %.0f)", player.ADP))
	} else if valueOverADP < -10 {
		reasons = append(reasons, "Slight reach based on ADP")
	}
	
	// Position need reasoning
	if positionalNeed > 75 {
		reasons = append(reasons, "High positional need")
	} else if positionalNeed > 50 {
		reasons = append(reasons, "Fills roster need")
	}
	
	// Projection reasoning
	if projectedPoints > 0 {
		if player.Position == "QB" && projectedPoints > 280 {
			reasons = append(reasons, "Elite QB projection")
		} else if player.Position == "RB" && projectedPoints > 180 {
			reasons = append(reasons, "Top-tier RB projection")
		} else if player.Position == "WR" && projectedPoints > 160 {
			reasons = append(reasons, "Top-tier WR projection")
		} else if player.Position == "TE" && projectedPoints > 120 {
			reasons = append(reasons, "Elite TE projection")
		}
	}
	
	// Position-specific insights
	switch player.Position {
	case "RB":
		if valueOverADP > 0 && positionalNeed > 30 {
			reasons = append(reasons, "RB depth is crucial")
		}
	case "WR":
		if positionalNeed > 40 {
			reasons = append(reasons, "WR consistency important for lineup flexibility")
		}
	case "TE":
		if projectedPoints > 100 {
			reasons = append(reasons, "Positional advantage at TE")
		}
	case "QB":
		if projectedPoints > 250 {
			reasons = append(reasons, "QB stability for weekly lineup")
		}
	}
	
	if len(reasons) == 0 {
		reasons = append(reasons, "Solid pick at current position")
	}
	
	// Join reasons with semicolons
	result := ""
	for i, reason := range reasons {
		if i > 0 {
			result += "; "
		}
		result += reason
	}
	
	return result
}