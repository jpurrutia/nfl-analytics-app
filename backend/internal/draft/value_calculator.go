package draft

import (
	"context"
	"math"
	"sort"
)

// ValueCalculator calculates player values for draft recommendations
type ValueCalculator struct {
	projectionRepo ProjectionRepository
}

// ProjectionRepository interface for accessing player projections
type ProjectionRepository interface {
	GetSeasonProjections(ctx context.Context, season int, week int) (map[string]PlayerProjection, error)
	GetHistoricalPerformance(ctx context.Context, playerID string, weeks int) ([]float64, error)
}

// PlayerProjection represents projected stats for a player
type PlayerProjection struct {
	PlayerID        string  `json:"player_id"`
	Name            string  `json:"name"`
	Position        string  `json:"position"`
	Team            string  `json:"team"`
	ProjectedPoints float64 `json:"projected_points"`
	FloorPoints     float64 `json:"floor_points"`
	CeilingPoints   float64 `json:"ceiling_points"`
	Consistency     float64 `json:"consistency"`
	Volatility      float64 `json:"volatility"`
}

// NewValueCalculator creates a new value calculator
func NewValueCalculator(projectionRepo ProjectionRepository) *ValueCalculator {
	return &ValueCalculator{
		projectionRepo: projectionRepo,
	}
}

// CalculateVBD calculates Value Based Drafting scores
func (v *ValueCalculator) CalculateVBD(
	ctx context.Context,
	projections map[string]PlayerProjection,
	scoringType string,
) (map[string]float64, error) {
	
	// Define baseline players (replacement level)
	baselines := v.getPositionBaselines(scoringType)
	
	// Group players by position
	positionGroups := make(map[string][]PlayerProjection)
	for _, proj := range projections {
		positionGroups[proj.Position] = append(positionGroups[proj.Position], proj)
	}
	
	// Sort each position by projected points
	for pos := range positionGroups {
		sort.Slice(positionGroups[pos], func(i, j int) bool {
			return positionGroups[pos][i].ProjectedPoints > positionGroups[pos][j].ProjectedPoints
		})
	}
	
	// Calculate replacement values for each position
	replacementValues := make(map[string]float64)
	for pos, baseline := range baselines {
		if players, exists := positionGroups[pos]; exists && len(players) > baseline {
			replacementValues[pos] = players[baseline-1].ProjectedPoints
		} else {
			replacementValues[pos] = 0
		}
	}
	
	// Calculate VBD for each player
	vbdScores := make(map[string]float64)
	for playerID, proj := range projections {
		replacement := replacementValues[proj.Position]
		vbdScores[playerID] = proj.ProjectedPoints - replacement
	}
	
	return vbdScores, nil
}

// CalculatePositionalScarcity calculates scarcity scores for each position
func (v *ValueCalculator) CalculatePositionalScarcity(
	projections map[string]PlayerProjection,
	draftedPlayers map[string]bool,
) map[string]float64 {
	
	// Count available elite players by position
	eliteThresholds := map[string]float64{
		"QB":  250,
		"RB":  150,
		"WR":  140,
		"TE":  100,
		"DST": 100,
		"K":   110,
	}
	
	availableElite := make(map[string]int)
	totalAvailable := make(map[string]int)
	
	for playerID, proj := range projections {
		if !draftedPlayers[playerID] {
			totalAvailable[proj.Position]++
			if proj.ProjectedPoints >= eliteThresholds[proj.Position] {
				availableElite[proj.Position]++
			}
		}
	}
	
	// Calculate scarcity scores (0-100)
	scarcity := make(map[string]float64)
	for pos := range eliteThresholds {
		if totalAvailable[pos] == 0 {
			scarcity[pos] = 100 // Maximum scarcity
		} else {
			eliteRatio := float64(availableElite[pos]) / float64(totalAvailable[pos])
			scarcity[pos] = (1 - eliteRatio) * 100
		}
	}
	
	return scarcity
}

// CalculateTierBreaks identifies tier breaks in player rankings
func (v *ValueCalculator) CalculateTierBreaks(
	projections []PlayerProjection,
	position string,
) []int {
	
	if len(projections) < 2 {
		return []int{}
	}
	
	// Sort by projected points
	sort.Slice(projections, func(i, j int) bool {
		return projections[i].ProjectedPoints > projections[j].ProjectedPoints
	})
	
	// Identify significant drops in value (tier breaks)
	tierBreaks := []int{}
	threshold := v.getTierThreshold(position)
	
	for i := 1; i < len(projections); i++ {
		drop := projections[i-1].ProjectedPoints - projections[i].ProjectedPoints
		dropPercent := drop / projections[i-1].ProjectedPoints
		
		if dropPercent > threshold {
			tierBreaks = append(tierBreaks, i)
		}
	}
	
	return tierBreaks
}

// CalculateUpsideScore calculates a player's upside potential
func (v *ValueCalculator) CalculateUpsideScore(proj PlayerProjection) float64 {
	// Calculate upside as ceiling relative to projection
	if proj.ProjectedPoints == 0 {
		return 0
	}
	
	upsideRatio := (proj.CeilingPoints - proj.ProjectedPoints) / proj.ProjectedPoints
	
	// Normalize to 0-100 scale
	// 50% upside = 100 score
	score := math.Min(100, upsideRatio*200)
	
	return math.Max(0, score)
}

// CalculateSafetyScore calculates a player's safety/floor
func (v *ValueCalculator) CalculateSafetyScore(proj PlayerProjection) float64 {
	// Calculate safety as floor relative to projection
	if proj.ProjectedPoints == 0 {
		return 0
	}
	
	floorRatio := proj.FloorPoints / proj.ProjectedPoints
	
	// Add consistency bonus
	consistencyBonus := proj.Consistency * 0.3
	
	// Normalize to 0-100 scale
	score := (floorRatio * 70) + consistencyBonus
	
	return math.Max(0, math.Min(100, score))
}

// CalculateStackValue calculates value for QB-WR/TE stacks
func (v *ValueCalculator) CalculateStackValue(
	qbProj PlayerProjection,
	skillProj PlayerProjection,
) float64 {
	
	if qbProj.Team != skillProj.Team {
		return 0 // No stack value if different teams
	}
	
	// Base stack value on combined projections
	combinedPoints := qbProj.ProjectedPoints + skillProj.ProjectedPoints
	
	// Add correlation bonus (QB-WR correlations are valuable in fantasy)
	correlationBonus := 1.0
	if skillProj.Position == "WR" {
		correlationBonus = 1.15 // 15% bonus for WR stacks
	} else if skillProj.Position == "TE" {
		correlationBonus = 1.10 // 10% bonus for TE stacks
	}
	
	// Calculate stack score
	stackValue := combinedPoints * correlationBonus
	
	// Normalize to 0-100 scale (500 combined points = 100 score)
	return math.Min(100, stackValue/5)
}

// CalculateAgeAdjustedValue adjusts value based on player age and dynasty considerations
func (v *ValueCalculator) CalculateAgeAdjustedValue(
	baseValue float64,
	age int,
	position string,
	isDynasty bool,
) float64 {
	
	if !isDynasty {
		// Minimal age adjustment for redraft leagues
		if age > 32 {
			return baseValue * 0.95 // 5% discount for older players
		}
		return baseValue
	}
	
	// Dynasty league adjustments
	peakAges := map[string][]int{
		"QB":  {26, 32}, // QBs peak later and last longer
		"RB":  {23, 27}, // RBs peak early and decline fast
		"WR":  {24, 29}, // WRs have moderate peak window
		"TE":  {25, 30}, // TEs peak a bit later than WRs
		"DST": {0, 0},   // No age adjustment for DST
		"K":   {0, 0},   // No age adjustment for K
	}
	
	peakRange := peakAges[position]
	if peakRange[0] == 0 {
		return baseValue // No adjustment for DST/K
	}
	
	multiplier := 1.0
	
	if age < peakRange[0] {
		// Young player with upside
		yearsToPeak := peakRange[0] - age
		multiplier = 1.0 + (float64(yearsToPeak) * 0.05) // 5% bonus per year until peak
	} else if age > peakRange[1] {
		// Aging player
		yearsPastPeak := age - peakRange[1]
		if position == "RB" {
			multiplier = 1.0 - (float64(yearsPastPeak) * 0.15) // RBs decline fast
		} else {
			multiplier = 1.0 - (float64(yearsPastPeak) * 0.08) // Others decline slower
		}
	}
	
	// Ensure multiplier stays reasonable
	multiplier = math.Max(0.5, math.Min(1.5, multiplier))
	
	return baseValue * multiplier
}

// Helper functions

func (v *ValueCalculator) getPositionBaselines(scoringType string) map[string]int {
	// Number of players at each position that are "startable"
	// This defines the replacement level for VBD
	
	// Standard 12-team league starting requirements
	return map[string]int{
		"QB":  12, // 1 QB per team
		"RB":  24, // 2 RBs per team
		"WR":  36, // 3 WRs per team (including flex)
		"TE":  12, // 1 TE per team
		"DST": 12, // 1 DST per team
		"K":   12, // 1 K per team
	}
}

func (v *ValueCalculator) getTierThreshold(position string) float64 {
	// Percentage drop that indicates a new tier
	thresholds := map[string]float64{
		"QB":  0.08, // 8% drop
		"RB":  0.10, // 10% drop
		"WR":  0.10, // 10% drop
		"TE":  0.12, // 12% drop
		"DST": 0.10, // 10% drop
		"K":   0.08, // 8% drop
	}
	
	if threshold, exists := thresholds[position]; exists {
		return threshold
	}
	return 0.10 // Default 10%
}