-- DuckDB Initialization Script
-- Medallion Architecture: Bronze -> Silver -> Gold

-- Create schemas for medallion architecture
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- ============================================
-- BRONZE LAYER - Raw Data
-- ============================================

-- Raw play-by-play data from nflverse
CREATE TABLE IF NOT EXISTS bronze.raw_plays (
    game_id VARCHAR,
    play_id BIGINT,
    season INTEGER,
    week INTEGER,
    game_date DATE,
    game_type VARCHAR,
    home_team VARCHAR(3),
    away_team VARCHAR(3),
    posteam VARCHAR(3),
    defteam VARCHAR(3),
    play_type VARCHAR,
    passer_player_id VARCHAR,
    passer_player_name VARCHAR,
    receiver_player_id VARCHAR,
    receiver_player_name VARCHAR,
    rusher_player_id VARCHAR,
    rusher_player_name VARCHAR,
    yards_gained DOUBLE,
    air_yards DOUBLE,
    yards_after_catch DOUBLE,
    complete_pass INTEGER,
    incomplete_pass INTEGER,
    interception INTEGER,
    touchdown INTEGER,
    pass_touchdown INTEGER,
    rush_touchdown INTEGER,
    receiving_touchdown INTEGER,
    fumble INTEGER,
    fumble_lost INTEGER,
    two_point_attempt INTEGER,
    two_point_conv_result INTEGER,
    field_goal_attempt INTEGER,
    field_goal_result VARCHAR,
    extra_point_attempt INTEGER,
    extra_point_result VARCHAR,
    yardline_100 INTEGER,
    ydstogo INTEGER,
    down INTEGER,
    quarter INTEGER,
    time_remaining VARCHAR,
    red_zone INTEGER,
    goal_to_go INTEGER,
    raw_data JSON,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw ADP (Average Draft Position) data
CREATE TABLE IF NOT EXISTS bronze.raw_adp (
    player_id VARCHAR,
    player_name VARCHAR,
    team VARCHAR(3),
    position VARCHAR(10),
    adp DOUBLE,
    adp_formatted VARCHAR,
    times_drafted INTEGER,
    high_pick INTEGER,
    low_pick INTEGER,
    std_dev DOUBLE,
    source VARCHAR,
    scoring_format VARCHAR,
    season INTEGER,
    date_pulled DATE,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw roster data from ESPN
CREATE TABLE IF NOT EXISTS bronze.raw_rosters (
    league_id VARCHAR,
    team_id VARCHAR,
    player_id VARCHAR,
    player_name VARCHAR,
    position VARCHAR(10),
    team VARCHAR(3),
    roster_slot VARCHAR,
    acquisition_type VARCHAR,
    acquisition_date DATE,
    season INTEGER,
    week INTEGER,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SILVER LAYER - Cleaned & Standardized Data
-- ============================================

-- Cleaned play-by-play data
CREATE TABLE IF NOT EXISTS silver.plays (
    play_key VARCHAR PRIMARY KEY,  -- Composite: game_id + play_id
    game_id VARCHAR NOT NULL,
    play_id BIGINT NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    game_date DATE,
    game_type VARCHAR,
    team VARCHAR(3),
    opponent VARCHAR(3),
    play_type VARCHAR,
    player_id VARCHAR,
    player_name VARCHAR,
    player_position VARCHAR(10),
    yards_gained DOUBLE,
    air_yards DOUBLE,
    yards_after_catch DOUBLE,
    targets INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    passing_yards DOUBLE DEFAULT 0,
    rushing_yards DOUBLE DEFAULT 0,
    receiving_yards DOUBLE DEFAULT 0,
    touchdowns INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    fumbles INTEGER DEFAULT 0,
    fumbles_lost INTEGER DEFAULT 0,
    two_point_conversions INTEGER DEFAULT 0,
    red_zone_play BOOLEAN DEFAULT FALSE,
    goal_to_go BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player statistics aggregated by game
CREATE TABLE IF NOT EXISTS silver.player_game_stats (
    player_game_key VARCHAR PRIMARY KEY,  -- Composite: player_id + game_id
    player_id VARCHAR NOT NULL,
    player_name VARCHAR NOT NULL,
    position VARCHAR(10),
    team VARCHAR(3),
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    game_id VARCHAR NOT NULL,
    game_date DATE,
    opponent VARCHAR(3),
    -- Passing stats
    pass_attempts INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    passing_yards DOUBLE DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    sacks INTEGER DEFAULT 0,
    sack_yards DOUBLE DEFAULT 0,
    -- Rushing stats
    carries INTEGER DEFAULT 0,
    rushing_yards DOUBLE DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    rushing_long DOUBLE DEFAULT 0,
    -- Receiving stats
    targets INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    receiving_yards DOUBLE DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    receiving_long DOUBLE DEFAULT 0,
    -- Fantasy points
    fantasy_points_ppr DOUBLE DEFAULT 0,
    fantasy_points_standard DOUBLE DEFAULT 0,
    fantasy_points_half_ppr DOUBLE DEFAULT 0,
    -- Red zone stats
    red_zone_targets INTEGER DEFAULT 0,
    red_zone_carries INTEGER DEFAULT 0,
    red_zone_touches INTEGER DEFAULT 0,
    red_zone_tds INTEGER DEFAULT 0,
    -- Snap counts (if available)
    snaps INTEGER,
    snap_percentage DOUBLE,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player weekly aggregates
CREATE TABLE IF NOT EXISTS silver.player_week_stats (
    player_week_key VARCHAR PRIMARY KEY,  -- Composite: player_id + season + week
    player_id VARCHAR NOT NULL,
    player_name VARCHAR NOT NULL,
    position VARCHAR(10),
    team VARCHAR(3),
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    games_played INTEGER DEFAULT 1,
    -- Aggregate stats (sum across all games in week for doubleheaders)
    passing_yards DOUBLE DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    rushing_yards DOUBLE DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    receiving_yards DOUBLE DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    targets INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    fantasy_points_ppr DOUBLE DEFAULT 0,
    fantasy_points_standard DOUBLE DEFAULT 0,
    fantasy_points_half_ppr DOUBLE DEFAULT 0,
    target_share DOUBLE,
    red_zone_share DOUBLE,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GOLD LAYER - Analytics & Metrics
-- ============================================

-- Pre-calculated player metrics
CREATE TABLE IF NOT EXISTS gold.player_metrics (
    metric_key VARCHAR PRIMARY KEY,  -- Composite: player_id + season + metric_type
    player_id VARCHAR NOT NULL,
    player_name VARCHAR NOT NULL,
    position VARCHAR(10),
    team VARCHAR(3),
    season INTEGER NOT NULL,
    games_played INTEGER,
    -- Consistency metrics
    consistency_score DOUBLE,  -- Standard deviation of weekly fantasy points
    floor_score DOUBLE,        -- 25th percentile of weekly points
    ceiling_score DOUBLE,      -- 75th percentile of weekly points
    -- Boom/Bust rates (configurable thresholds)
    boom_rate DOUBLE,          -- % of games above boom threshold
    bust_rate DOUBLE,          -- % of games below bust threshold
    boom_threshold DOUBLE,     -- Points threshold for boom
    bust_threshold DOUBLE,     -- Points threshold for bust
    -- Target metrics
    avg_target_share DOUBLE,
    avg_targets_per_game DOUBLE,
    target_share_consistency DOUBLE,
    -- Red zone metrics
    red_zone_target_share DOUBLE,
    red_zone_touch_share DOUBLE,
    red_zone_td_rate DOUBLE,
    avg_red_zone_touches DOUBLE,
    -- Efficiency metrics
    yards_per_target DOUBLE,
    yards_per_carry DOUBLE,
    td_rate DOUBLE,
    catch_rate DOUBLE,
    -- Fantasy metrics
    avg_fantasy_points_ppr DOUBLE,
    avg_fantasy_points_standard DOUBLE,
    avg_fantasy_points_half_ppr DOUBLE,
    fantasy_points_per_touch DOUBLE,
    fantasy_points_per_opportunity DOUBLE,
    -- Advanced metrics
    air_yards_share DOUBLE,
    wopr DOUBLE,  -- Weighted Opportunity Rating
    racr DOUBLE,  -- Receiver Air Conversion Ratio
    -- Trend metrics
    last_3_avg DOUBLE,
    last_5_avg DOUBLE,
    season_trend VARCHAR,  -- 'improving', 'declining', 'stable'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Current player rankings
CREATE TABLE IF NOT EXISTS gold.player_rankings (
    ranking_key VARCHAR PRIMARY KEY,  -- Composite: player_id + season + week + scoring_format
    player_id VARCHAR NOT NULL,
    player_name VARCHAR NOT NULL,
    position VARCHAR(10),
    team VARCHAR(3),
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    scoring_format VARCHAR NOT NULL,  -- 'ppr', 'standard', 'half_ppr'
    -- Rankings
    overall_rank INTEGER,
    position_rank INTEGER,
    tier INTEGER,
    -- Projections
    projected_points DOUBLE,
    projected_ceiling DOUBLE,
    projected_floor DOUBLE,
    -- Value metrics
    value_over_replacement DOUBLE,
    adp_value DOUBLE,  -- Current rank vs ADP
    -- Rest of season
    ros_rank INTEGER,
    ros_projected_points DOUBLE,
    -- Matchup data
    opponent VARCHAR(3),
    matchup_rating DOUBLE,
    opponent_rank_vs_position INTEGER,
    -- Confidence
    projection_confidence DOUBLE,
    ranking_confidence DOUBLE,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player season totals
CREATE TABLE IF NOT EXISTS gold.player_season_totals (
    season_key VARCHAR PRIMARY KEY,  -- Composite: player_id + season
    player_id VARCHAR NOT NULL,
    player_name VARCHAR NOT NULL,
    position VARCHAR(10),
    team VARCHAR(3),
    season INTEGER NOT NULL,
    games_played INTEGER,
    -- Season totals
    total_passing_yards DOUBLE,
    total_passing_tds INTEGER,
    total_rushing_yards DOUBLE,
    total_rushing_tds INTEGER,
    total_receiving_yards DOUBLE,
    total_receiving_tds INTEGER,
    total_targets INTEGER,
    total_receptions INTEGER,
    total_fantasy_points_ppr DOUBLE,
    total_fantasy_points_standard DOUBLE,
    -- Season ranks
    overall_rank_ppr INTEGER,
    overall_rank_standard INTEGER,
    position_rank_ppr INTEGER,
    position_rank_standard INTEGER,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matchup history and trends
CREATE TABLE IF NOT EXISTS gold.matchup_history (
    matchup_key VARCHAR PRIMARY KEY,  -- Composite: team + opponent + season
    team VARCHAR(3) NOT NULL,
    opponent VARCHAR(3) NOT NULL,
    season INTEGER NOT NULL,
    position VARCHAR(10),
    -- Defensive metrics
    avg_points_allowed DOUBLE,
    avg_yards_allowed DOUBLE,
    avg_tds_allowed DOUBLE,
    fantasy_points_allowed_rank INTEGER,
    -- Trend data
    last_4_weeks_avg DOUBLE,
    season_trend VARCHAR,
    home_away_split DOUBLE,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bronze_plays_game ON bronze.raw_plays(game_id, play_id);
CREATE INDEX IF NOT EXISTS idx_bronze_plays_player ON bronze.raw_plays(passer_player_id, receiver_player_id, rusher_player_id);
CREATE INDEX IF NOT EXISTS idx_bronze_plays_date ON bronze.raw_plays(season, week);

CREATE INDEX IF NOT EXISTS idx_silver_plays_player ON silver.plays(player_id, season, week);
CREATE INDEX IF NOT EXISTS idx_silver_plays_date ON silver.plays(season, week);
CREATE INDEX IF NOT EXISTS idx_silver_game_stats_player ON silver.player_game_stats(player_id, season, week);
CREATE INDEX IF NOT EXISTS idx_silver_week_stats_player ON silver.player_week_stats(player_id, season, week);

CREATE INDEX IF NOT EXISTS idx_gold_metrics_player ON gold.player_metrics(player_id, season);
CREATE INDEX IF NOT EXISTS idx_gold_rankings_player ON gold.player_rankings(player_id, season, week);
CREATE INDEX IF NOT EXISTS idx_gold_rankings_position ON gold.player_rankings(position, season, week);
CREATE INDEX IF NOT EXISTS idx_gold_season_totals ON gold.player_season_totals(player_id, season);
CREATE INDEX IF NOT EXISTS idx_gold_matchup ON gold.matchup_history(team, opponent, season);

-- Create views for common queries
CREATE OR REPLACE VIEW gold.current_player_rankings_ppr AS
WITH max_season AS (
    SELECT MAX(season) as season FROM gold.player_rankings
),
max_week AS (
    SELECT MAX(week) as week 
    FROM gold.player_rankings 
    WHERE season = (SELECT season FROM max_season)
)
SELECT * FROM gold.player_rankings
WHERE scoring_format = 'ppr'
  AND season = (SELECT season FROM max_season)
  AND week = (SELECT week FROM max_week);

CREATE OR REPLACE VIEW gold.current_player_metrics AS
SELECT * FROM gold.player_metrics
WHERE season = (SELECT MAX(season) FROM gold.player_metrics);