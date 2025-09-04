-- Create leagues table for storing connected fantasy leagues
CREATE TABLE IF NOT EXISTS leagues (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- ESPN, Yahoo, Sleeper, etc.
    external_id VARCHAR(255) NOT NULL, -- League ID from the platform
    name VARCHAR(255) NOT NULL,
    season INTEGER NOT NULL,
    settings JSONB NOT NULL, -- League settings (scoring, roster, playoffs, etc.)
    teams_data TEXT, -- JSON string of teams data
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique league per user
    UNIQUE(user_id, external_id, platform)
);

-- Create indexes for efficient queries
CREATE INDEX idx_leagues_user_id ON leagues(user_id);
CREATE INDEX idx_leagues_external_id ON leagues(external_id);
CREATE INDEX idx_leagues_is_active ON leagues(is_active);
CREATE INDEX idx_leagues_last_sync ON leagues(last_sync_at);

-- Create league_auth table for storing authentication credentials
CREATE TABLE IF NOT EXISTS league_auth (
    id VARCHAR(36) PRIMARY KEY,
    league_id VARCHAR(36) NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    auth_type VARCHAR(50) NOT NULL, -- cookie, oauth, api_key
    credentials TEXT NOT NULL, -- Encrypted credentials
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(league_id, auth_type)
);

CREATE INDEX idx_league_auth_league_id ON league_auth(league_id);