-- 003_create_draft_tables.sql
-- Create draft sessions and related tables

CREATE TABLE IF NOT EXISTS draft_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    draft_type VARCHAR(50) NOT NULL DEFAULT 'SNAKE',
    total_teams INTEGER NOT NULL,
    rounds INTEGER NOT NULL,
    current_pick INTEGER DEFAULT 1,
    user_draft_position INTEGER NOT NULL,
    scoring_format VARCHAR(50) NOT NULL,
    roster_settings JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_draft_type CHECK (draft_type IN ('SNAKE', 'LINEAR', 'AUCTION')),
    CONSTRAINT valid_status CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED')),
    CONSTRAINT valid_scoring_format_draft CHECK (scoring_format IN ('PPR', 'HALF_PPR', 'STANDARD'))
);

-- Create draft picks table (event sourcing for draft)
CREATE TABLE IF NOT EXISTS draft_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
    pick_number INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    team_position INTEGER NOT NULL,
    player_id VARCHAR(100) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    player_team VARCHAR(10),
    player_position VARCHAR(10) NOT NULL,
    adp_rank INTEGER,
    projected_points DECIMAL(10, 2),
    actual_points DECIMAL(10, 2),
    is_keeper BOOLEAN DEFAULT false,
    picked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_pick UNIQUE (session_id, pick_number),
    CONSTRAINT unique_session_player UNIQUE (session_id, player_id)
);

-- Create draft events table (for undo/redo functionality)
CREATE TABLE IF NOT EXISTS draft_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    sequence_number INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_type CHECK (event_type IN ('PICK_MADE', 'PICK_UNDONE', 'SESSION_PAUSED', 'SESSION_RESUMED', 'SETTINGS_CHANGED'))
);

-- Create draft recommendations cache table
CREATE TABLE IF NOT EXISTS draft_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
    pick_number INTEGER NOT NULL,
    recommendations JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT unique_session_pick_rec UNIQUE (session_id, pick_number)
);

-- Create draft notes table
CREATE TABLE IF NOT EXISTS draft_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
    player_id VARCHAR(100) NOT NULL,
    note TEXT NOT NULL,
    tier INTEGER,
    do_not_draft BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_player_note UNIQUE (session_id, player_id)
);

-- Create indexes
CREATE INDEX idx_draft_sessions_user_id ON draft_sessions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_draft_sessions_league_id ON draft_sessions(league_id);
CREATE INDEX idx_draft_sessions_status ON draft_sessions(status);
CREATE INDEX idx_draft_picks_session_id ON draft_picks(session_id);
CREATE INDEX idx_draft_picks_player_id ON draft_picks(player_id);
CREATE INDEX idx_draft_picks_pick_number ON draft_picks(pick_number);
CREATE INDEX idx_draft_events_session_id ON draft_events(session_id);
CREATE INDEX idx_draft_events_sequence ON draft_events(session_id, sequence_number);
CREATE INDEX idx_draft_recommendations_session_id ON draft_recommendations(session_id);
CREATE INDEX idx_draft_notes_session_id ON draft_notes(session_id);
CREATE INDEX idx_draft_notes_player_id ON draft_notes(player_id);

-- Add triggers for updated_at
CREATE TRIGGER update_draft_sessions_updated_at BEFORE UPDATE ON draft_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_notes_updated_at BEFORE UPDATE ON draft_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();