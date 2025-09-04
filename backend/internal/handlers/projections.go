package handlers

import (
	"database/sql"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

type ProjectionResponse struct {
	PlayerName           string   `json:"player_name"`
	Position            *string  `json:"position"`
	Team                *string  `json:"team"`
	ConsensusPPR        float64  `json:"consensus_ppr"`
	ConsensusStandard   float64  `json:"consensus_standard"`
	FloorPPR            float64  `json:"floor_ppr"`
	CeilingPPR          float64  `json:"ceiling_ppr"`
	BetonlineProj       *float64 `json:"betonline_proj"`
	PinnacleProj        *float64 `json:"pinnacle_proj"`
	PassingYards        *float64 `json:"passing_yards"`
	PassingTDs          *float64 `json:"passing_tds"`
	RushingYards        *float64 `json:"rushing_yards"`
	RushingTDs          *float64 `json:"rushing_tds"`
	ReceivingYards      *float64 `json:"receiving_yards"`
	ReceivingTDs        *float64 `json:"receiving_tds"`
	Receptions          *float64 `json:"receptions"`
	NumSources          int      `json:"num_sources"`
	ProjectionStdDev    *float64 `json:"projection_std_dev"`
	ConfidenceRating    string   `json:"confidence_rating"`
	HasProps            bool     `json:"has_props"`
}

type ProjectionsHandler struct {
	db *sql.DB
}

func NewProjectionsHandler(db *sql.DB) *ProjectionsHandler {
	return &ProjectionsHandler{
		db: db,
	}
}

// Helper function to handle NaN values
func sanitizeFloat64(f *float64) *float64 {
	if f == nil {
		return nil
	}
	if math.IsNaN(*f) || math.IsInf(*f, 0) {
		return nil
	}
	return f
}

// GetProjections returns consensus projections for a given week
func (h *ProjectionsHandler) GetProjections(c *gin.Context) {
	weekStr := c.DefaultQuery("week", "1")
	seasonStr := c.DefaultQuery("season", "2025")
	position := c.Query("position")
	limit := c.DefaultQuery("limit", "50")

	week, err := strconv.Atoi(weekStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid week parameter"})
		return
	}

	season, err := strconv.Atoi(seasonStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid season parameter"})
		return
	}

	query := `
		SELECT 
			player_name,
			position,
			team,
			consensus_points_ppr,
			consensus_points_standard,
			floor_points_ppr,
			ceiling_points_ppr,
			betonline_proj,
			pinnacle_proj,
			proj_passing_yards,
			proj_passing_tds,
			proj_rushing_yards,
			proj_rushing_tds,
			proj_receiving_yards,
			proj_receiving_tds,
			proj_receptions,
			num_sources,
			projection_std_dev,
			confidence_rating,
			has_props
		FROM gold.consensus_projections
		WHERE week = $1 AND season = $2
	`

	args := []interface{}{week, season}
	
	if position != "" {
		query += " AND position = $3"
		args = append(args, position)
	}
	
	query += " ORDER BY consensus_points_ppr DESC LIMIT " + limit

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projections"})
		return
	}
	defer rows.Close()

	var projections []ProjectionResponse
	for rows.Next() {
		var p ProjectionResponse
		err := rows.Scan(
			&p.PlayerName,
			&p.Position,
			&p.Team,
			&p.ConsensusPPR,
			&p.ConsensusStandard,
			&p.FloorPPR,
			&p.CeilingPPR,
			&p.BetonlineProj,
			&p.PinnacleProj,
			&p.PassingYards,
			&p.PassingTDs,
			&p.RushingYards,
			&p.RushingTDs,
			&p.ReceivingYards,
			&p.ReceivingTDs,
			&p.Receptions,
			&p.NumSources,
			&p.ProjectionStdDev,
			&p.ConfidenceRating,
			&p.HasProps,
		)
		if err != nil {
			continue
		}
		// Sanitize NaN values
		p.BetonlineProj = sanitizeFloat64(p.BetonlineProj)
		p.PinnacleProj = sanitizeFloat64(p.PinnacleProj)
		p.PassingYards = sanitizeFloat64(p.PassingYards)
		p.PassingTDs = sanitizeFloat64(p.PassingTDs)
		p.RushingYards = sanitizeFloat64(p.RushingYards)
		p.RushingTDs = sanitizeFloat64(p.RushingTDs)
		p.ReceivingYards = sanitizeFloat64(p.ReceivingYards)
		p.ReceivingTDs = sanitizeFloat64(p.ReceivingTDs)
		p.Receptions = sanitizeFloat64(p.Receptions)
		p.ProjectionStdDev = sanitizeFloat64(p.ProjectionStdDev)
		
		projections = append(projections, p)
	}

	c.JSON(http.StatusOK, gin.H{
		"projections": projections,
		"week":        week,
		"season":      season,
		"count":       len(projections),
	})
}

// GetPlayerProjection returns projection for a specific player
func (h *ProjectionsHandler) GetPlayerProjection(c *gin.Context) {
	playerName := c.Param("player")
	weekStr := c.DefaultQuery("week", "1")
	seasonStr := c.DefaultQuery("season", "2025")

	week, err := strconv.Atoi(weekStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid week parameter"})
		return
	}

	season, err := strconv.Atoi(seasonStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid season parameter"})
		return
	}

	query := `
		SELECT 
			player_name,
			position,
			team,
			consensus_points_ppr,
			consensus_points_standard,
			floor_points_ppr,
			ceiling_points_ppr,
			betonline_proj,
			pinnacle_proj,
			proj_passing_yards,
			proj_passing_tds,
			proj_rushing_yards,
			proj_rushing_tds,
			proj_receiving_yards,
			proj_receiving_tds,
			proj_receptions,
			num_sources,
			projection_std_dev,
			confidence_rating,
			has_props
		FROM gold.consensus_projections
		WHERE player_name ILIKE $1 AND week = $2 AND season = $3
		LIMIT 1
	`

	var p ProjectionResponse
	err = h.db.QueryRow(query, "%"+playerName+"%", week, season).Scan(
		&p.PlayerName,
		&p.Position,
		&p.Team,
		&p.ConsensusPPR,
		&p.ConsensusStandard,
		&p.FloorPPR,
		&p.CeilingPPR,
		&p.BetonlineProj,
		&p.PinnacleProj,
		&p.PassingYards,
		&p.PassingTDs,
		&p.RushingYards,
		&p.RushingTDs,
		&p.ReceivingYards,
		&p.ReceivingTDs,
		&p.Receptions,
		&p.NumSources,
		&p.ProjectionStdDev,
		&p.ConfidenceRating,
		&p.HasProps,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch player projection"})
		return
	}

	// Sanitize NaN values
	p.BetonlineProj = sanitizeFloat64(p.BetonlineProj)
	p.PinnacleProj = sanitizeFloat64(p.PinnacleProj)
	p.PassingYards = sanitizeFloat64(p.PassingYards)
	p.PassingTDs = sanitizeFloat64(p.PassingTDs)
	p.RushingYards = sanitizeFloat64(p.RushingYards)
	p.RushingTDs = sanitizeFloat64(p.RushingTDs)
	p.ReceivingYards = sanitizeFloat64(p.ReceivingYards)
	p.ReceivingTDs = sanitizeFloat64(p.ReceivingTDs)
	p.Receptions = sanitizeFloat64(p.Receptions)
	p.ProjectionStdDev = sanitizeFloat64(p.ProjectionStdDev)

	c.JSON(http.StatusOK, p)
}