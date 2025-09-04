-- 002_create_leagues_table.sql
-- Create leagues and related tables for ESPN integration

CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'ESPN',
    platform_league_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    season_year INTEGER NOT NULL,
    total_teams INTEGER NOT NULL,
    scoring_format VARCHAR(50) NOT NULL, -- 'PPR', 'HALF_PPR', 'STANDARD'
    roster_settings JSONB NOT NULL DEFAULT '{}',
    scoring_settings JSONB NOT NULL DEFAULT '{}',
    draft_settings JSONB DEFAULT '{}',
    waiver_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_platform_league UNIQUE (user_id, platform, platform_league_id),
    CONSTRAINT valid_scoring_format CHECK (scoring_format IN ('PPR', 'HALF_PPR', 'STANDARD')),
    CONSTRAINT valid_platform CHECK (platform IN ('ESPN', 'YAHOO', 'SLEEPER'))
);

-- Create league members table
CREATE TABLE IF NOT EXISTS league_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    team_owner VARCHAR(255),
    draft_position INTEGER,
    is_user_team BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create league players table (tracks available players in league)
CREATE TABLE IF NOT EXISTS league_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    player_id VARCHAR(100) NOT NULL, -- ESPN player ID or other platform ID
    player_name VARCHAR(255) NOT NULL,
    team VARCHAR(10), -- NFL team abbreviation
    position VARCHAR(10) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    current_owner_team_id UUID REFERENCES league_members(id),
    adp_rank INTEGER,
    projected_points DECIMAL(10, 2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_league_player UNIQUE (league_id, player_id)
);

-- Create indexes
CREATE INDEX idx_leagues_user_id ON leagues(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leagues_platform_league_id ON leagues(platform_league_id);
CREATE INDEX idx_leagues_season_year ON leagues(season_year);
CREATE INDEX idx_leagues_last_synced ON leagues(last_synced_at);
CREATE INDEX idx_league_members_league_id ON league_members(league_id);
CREATE INDEX idx_league_players_league_id ON league_players(league_id);
CREATE INDEX idx_league_players_position ON league_players(position);
CREATE INDEX idx_league_players_availability ON league_players(is_available);

-- Add trigger for leagues updated_at
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for league_members updated_at  
CREATE TRIGGER update_league_members_updated_at BEFORE UPDATE ON league_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();