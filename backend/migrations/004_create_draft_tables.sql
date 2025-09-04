-- Create draft_sessions table for storing draft sessions
CREATE TABLE IF NOT EXISTS draft_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id VARCHAR(36) REFERENCES leagues(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    draft_type VARCHAR(50) NOT NULL, -- snake, auction, linear
    team_count INTEGER NOT NULL CHECK (team_count >= 4 AND team_count <= 20),
    round_count INTEGER NOT NULL CHECK (round_count >= 1 AND round_count <= 30),
    user_position INTEGER NOT NULL CHECK (user_position >= 1),
    current_pick INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, completed
    settings JSONB NOT NULL, -- Draft settings (scoring, roster, timer, etc.)
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (user_position <= team_count),
    CHECK (status IN ('active', 'paused', 'completed'))
);

-- Create draft_picks table for storing individual picks
CREATE TABLE IF NOT EXISTS draft_picks (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
    pick_number INTEGER NOT NULL, -- Overall pick number
    round INTEGER NOT NULL,
    round_pick INTEGER NOT NULL, -- Pick within the round
    team_number INTEGER NOT NULL,
    player_id VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    is_keeper BOOLEAN DEFAULT FALSE,
    picked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique pick per session
    UNIQUE(session_id, pick_number),
    -- Ensure player can only be picked once per session
    UNIQUE(session_id, player_id)
);

-- Create draft_recommendations table for storing AI recommendations
CREATE TABLE IF NOT EXISTS draft_recommendations (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
    pick_number INTEGER NOT NULL,
    player_id VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    team VARCHAR(10),
    score DECIMAL(5,2) NOT NULL, -- Recommendation score (0-100)
    value_over_adp DECIMAL(5,2), -- How much value vs ADP
    positional_need DECIMAL(5,2), -- How much this position is needed
    reasoning TEXT, -- Human-readable explanation
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for fast lookups
    UNIQUE(session_id, pick_number, player_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_draft_sessions_user_id ON draft_sessions(user_id);
CREATE INDEX idx_draft_sessions_league_id ON draft_sessions(league_id);
CREATE INDEX idx_draft_sessions_status ON draft_sessions(status);
CREATE INDEX idx_draft_sessions_created_at ON draft_sessions(created_at);

CREATE INDEX idx_draft_picks_session_id ON draft_picks(session_id);
CREATE INDEX idx_draft_picks_player_id ON draft_picks(player_id);
CREATE INDEX idx_draft_picks_pick_number ON draft_picks(session_id, pick_number);

CREATE INDEX idx_draft_recommendations_session_pick ON draft_recommendations(session_id, pick_number);
CREATE INDEX idx_draft_recommendations_score ON draft_recommendations(session_id, score DESC);