-- Create projections tables for storing multi-source projections
-- Migration: 005_create_projections_tables.sql

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- Bronze: Raw projections from each source
CREATE TABLE IF NOT EXISTS bronze.raw_projections (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'betonline', 'pinnacle', 'fantasypros', 'espn'
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10),
    team VARCHAR(10),
    -- BetOnline style columns
    proj_passing_yards DECIMAL(6,2),
    proj_passing_completions DECIMAL(4,2),
    proj_passing_touchdowns DECIMAL(3,2),
    proj_passing_attempts DECIMAL(4,2),
    proj_passing_interceptions DECIMAL(3,2),
    proj_rushing_yards DECIMAL(5,2),
    proj_rushing_attempts DECIMAL(4,2),
    proj_rushing_touchdowns DECIMAL(3,2),
    proj_receiving_yards DECIMAL(5,2),
    proj_receiving_receptions DECIMAL(4,2),
    proj_receiving_touchdowns DECIMAL(3,2),
    -- Pinnacle specific
    prop_type VARCHAR(50),
    prop_line DECIMAL(6,2),
    over_price INTEGER,
    under_price INTEGER,
    implied_over DECIMAL(5,4),
    implied_under DECIMAL(5,4),
    -- Meta
    game_id VARCHAR(50),
    opponent VARCHAR(10),
    is_home BOOLEAN,
    game_date DATE,
    timestamp TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source, season, week, player_name, prop_type)
);

-- Silver: Standardized projections
CREATE TABLE IF NOT EXISTS silver.player_projections (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50),
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10),
    team VARCHAR(10),
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    -- Standardized stats
    passing_yards DECIMAL(6,2),
    passing_tds DECIMAL(3,2),
    passing_ints DECIMAL(3,2),
    rushing_yards DECIMAL(5,2),
    rushing_tds DECIMAL(3,2),
    receiving_yards DECIMAL(5,2),
    receiving_tds DECIMAL(3,2),
    receptions DECIMAL(4,2),
    -- Fantasy points
    fantasy_points_ppr DECIMAL(5,2),
    fantasy_points_standard DECIMAL(5,2),
    fantasy_points_half_ppr DECIMAL(5,2),
    -- Meta
    has_props BOOLEAN DEFAULT false,
    confidence_score DECIMAL(3,2),
    processed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_name, season, week, source)
);

-- Gold: Consensus projections with floor/ceiling
CREATE TABLE IF NOT EXISTS gold.consensus_projections (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50),
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    team VARCHAR(10),
    week INTEGER NOT NULL,
    season INTEGER NOT NULL,
    -- Consensus values
    consensus_points_ppr DECIMAL(5,2),
    consensus_points_standard DECIMAL(5,2),
    floor_points_ppr DECIMAL(5,2),      -- From alternate unders
    ceiling_points_ppr DECIMAL(5,2),    -- From alternate overs
    -- Source projections
    betonline_proj DECIMAL(5,2),
    pinnacle_proj DECIMAL(5,2),
    fantasypros_proj DECIMAL(5,2),
    espn_proj DECIMAL(5,2),
    -- Detailed stat projections (consensus)
    proj_passing_yards DECIMAL(6,2),
    proj_passing_tds DECIMAL(3,2),
    proj_rushing_yards DECIMAL(5,2),
    proj_rushing_tds DECIMAL(3,2),
    proj_receiving_yards DECIMAL(5,2),
    proj_receiving_tds DECIMAL(3,2),
    proj_receptions DECIMAL(4,2),
    -- Meta
    num_sources INTEGER,
    projection_std_dev DECIMAL(5,2),
    confidence_rating VARCHAR(10), -- 'HIGH', 'MEDIUM', 'LOW'
    has_props BOOLEAN,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_name, season, week)
);

-- Indexes for performance
CREATE INDEX idx_bronze_proj_player_week ON bronze.raw_projections(player_name, season, week);
CREATE INDEX idx_bronze_proj_source ON bronze.raw_projections(source, season, week);
CREATE INDEX idx_silver_proj_player ON silver.player_projections(player_name, season, week);
CREATE INDEX idx_gold_proj_player ON gold.consensus_projections(player_name, season, week);
CREATE INDEX idx_gold_proj_position ON gold.consensus_projections(position, season, week);
CREATE INDEX idx_gold_proj_team ON gold.consensus_projections(team, season, week);

-- Comments
COMMENT ON TABLE bronze.raw_projections IS 'Raw projection data from various sources';
COMMENT ON TABLE silver.player_projections IS 'Standardized player projections with calculated fantasy points';
COMMENT ON TABLE gold.consensus_projections IS 'Consensus projections with floor/ceiling from multiple sources';