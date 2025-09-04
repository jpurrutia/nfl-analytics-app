# Fantasy Football Analytics Platform - Technical Specification

## Executive Summary
A comprehensive, data-driven fantasy football analytics platform that provides personalized insights for dominating fantasy leagues. The platform features league-aware analytics that automatically adapt to any ESPN league format, intelligent draft assistance, and advanced statistical analysis powered by a modern data pipeline.

## Core Requirements

### Functional Requirements

#### MVP Features (Phase 1)
1. **Interactive Draft Tool**
   - Real-time draft assistant with ADP-based value recommendations
   - Manual player tracking during live drafts
   - Adapts recommendations based on league format (superflex, PPR, etc.)
   - Tracks roster needs and suggests best available players
   - Auto-saves state with undo/resume capabilities
   - Post-draft import for reconciliation and analysis

2. **League Intelligence**
   - Auto-detect settings from ESPN API
   - Support for various roster configurations and flex positions
   - Identify scoring format (PPR/Standard/Half-PPR)
   - Filter out unavailable positions (e.g., leagues with no kickers)
   - Multi-platform architecture ready (ESPN first, Yahoo/Sleeper later)

3. **Analytics Engine**
   - Core metrics calculated from 5+ seasons of historical data:
     - Consistency score (standard deviation of weekly fantasy points)
     - Boom/bust rates (% games above/below configurable thresholds)
     - Target share (% of team's passing attempts)
     - Red zone usage (touches inside the 20-yard line)
     - Matchup strength (performance vs defensive rankings)
   - Position scarcity calculations
   - Mean reversion pattern detection
   - QB stability analysis
   - **Advanced Projection System** (NEW):
     - Sharp sportsbook data (BetOnline, Pinnacle) for true point estimates
     - Fantasy platform projections (ESPN, FantasyPros) for consensus
     - Floor/ceiling calculations from alternate betting lines
     - Imputation strategy: Use fantasy projections when props unavailable
     - League-specific adjustments based on scoring settings
     - Start/sit decisions based on projection confidence
     - FA/Waiver recommendations (Tuesday props release timing)

4. **User Management**
   - Full user accounts with email/password authentication
   - Support for multiple league connections per user
   - Persist draft history and preferences
   - Private data model (no sharing between users)

#### Phase 2 Features
1. **Waiver Wire Assistant**
   - Available player recommendations
   - Proactive alerts for breakout patterns
   - Drop recommendations based on rest-of-season value
   - League-mate roster need analysis for competition prediction

2. **Lineup Optimizer**
   - Basic optimal lineup selection based on projections
   - Weekly recommendations delivered before game time

### Non-Functional Requirements

1. **Performance**
   - Draft tool must respond within 100ms for recommendations
   - Analytics queries should complete within 2 seconds
   - Support 100 concurrent users without degradation

2. **Reliability**
   - Graceful degradation when ESPN API is unavailable
   - Cache last known good data for offline operation
   - No data loss during draft sessions

3. **Scalability**
   - Initial target: <100 users, <10 leagues
   - Architecture should support growth to 1,000+ users without major refactoring

4. **Security**
   - JWT-based authentication with refresh tokens
   - Encrypted storage of ESPN credentials
   - SQL injection prevention
   - Rate limiting on API endpoints

## Technical Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│                    Next.js React App                          │
│              (Desktop-optimized, Minimal UI)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
┌──────────────────────▼──────────────────────────────────────┐
│                      API Gateway                              │
│                     Go Backend (Gin)                          │
│          JWT Auth | Rate Limiting | Logging                   │
└──────┬───────────────┬───────────────┬─────────────────────┘
       │               │               │
┌──────▼────┐   ┌──────▼────┐
│PostgreSQL │   │   Redis    │
│           │   │            │
│User Data  │   │Cache Layer │
│League Info│   │Draft State │
│App State  │   │Hot Data    │
│Analytics  │   │            │
└───────────┘   └────────────┘
       ▲
       │
┌──────┴───────────────────────────────────────┐
│           Python Data Pipeline               │
│         (Cron Jobs → Airflow later)          │
│                                              │
│  nflverse | ESPN API | Projections Sources  │
│  (BetOnline, Pinnacle, FantasyPros, etc.)   │
└──────────────────────────────────────────────┘
```

### Data Architecture

#### Medallion Architecture
1. **Bronze Layer** (Raw Data)
   - Raw play-by-play data from nflverse
   - Raw ESPN API responses
   - Projection data from multiple sources:
     - BetOnline props and projections
     - Pinnacle betting lines and implied probabilities
     - FantasyPros consensus projections
     - ESPN projections
   - Storage: PostgreSQL bronze schema tables

2. **Silver Layer** (Cleaned Data)
   - Standardized player names and IDs
   - Calculated fantasy points per play
   - Cleaned and validated statistics
   - Storage: PostgreSQL silver schema tables

3. **Gold Layer** (Analytics-Ready)
   - Pre-aggregated player-week statistics
   - Calculated metrics (consistency, boom/bust)
   - Optimized for query performance
   - Storage: PostgreSQL gold schema tables with indexes

#### Database Schema

##### PostgreSQL (Transactional Data)
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Leagues table
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    espn_league_id VARCHAR(50) NOT NULL,
    league_name VARCHAR(255),
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Draft sessions table
CREATE TABLE draft_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    league_id UUID REFERENCES leagues(id),
    draft_state JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Draft actions table (for undo/redo)
CREATE TABLE draft_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES draft_sessions(id),
    action_type VARCHAR(50),
    player_data JSONB,
    action_timestamp TIMESTAMP DEFAULT NOW(),
    sequence_number INTEGER
);

-- Application logs table
CREATE TABLE app_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20),
    message TEXT,
    context JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### PostgreSQL (Analytics Data)
```sql
-- Create analytics schemas
CREATE SCHEMA bronze;
CREATE SCHEMA silver;
CREATE SCHEMA gold;

-- Bronze: Raw data tables
CREATE TABLE bronze.raw_projections (
    source VARCHAR(50),  -- 'betonline', 'pinnacle', 'fantasypros', 'espn'
    week INTEGER,
    season INTEGER,
    player_name VARCHAR(255),
    position VARCHAR(10),
    team VARCHAR(10),
    stat_type VARCHAR(50),
    stat_value DECIMAL(10,2),
    implied_probability DECIMAL(5,4),
    betting_line INTEGER,
    timestamp TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bronze.raw_plays (
    game_id VARCHAR(20),
    play_id INTEGER,
    player_id VARCHAR(50),
    player_name VARCHAR(255),
    play_type VARCHAR(50),
    yards_gained INTEGER,
    touchdown BOOLEAN,
    fantasy_points_ppr DECIMAL(5,2),
    fantasy_points_standard DECIMAL(5,2),
    game_date DATE,
    season INTEGER,
    week INTEGER,
    ingested_at TIMESTAMP DEFAULT NOW()
);

-- Silver: Cleaned and standardized data
CREATE TABLE silver.player_week_stats (
    player_id VARCHAR(50),
    season INTEGER,
    week INTEGER,
    targets INTEGER,
    receptions INTEGER,
    receiving_yards INTEGER,
    rushing_attempts INTEGER,
    rushing_yards INTEGER,
    total_touchdowns INTEGER,
    red_zone_touches INTEGER,
    fantasy_points_ppr DECIMAL(5,2),
    fantasy_points_standard DECIMAL(5,2),
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Gold: Pre-calculated analytics
CREATE TABLE gold.player_metrics (
    player_id VARCHAR(50),
    season INTEGER,
    consistency_score DECIMAL(5,2),
    boom_rate DECIMAL(5,2),
    bust_rate DECIMAL(5,2),
    target_share DECIMAL(5,2),
    red_zone_share DECIMAL(5,2),
    games_played INTEGER,
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Gold: Consensus projections with floor/ceiling
CREATE TABLE gold.player_projections (
    player_id VARCHAR(50),
    player_name VARCHAR(255),
    position VARCHAR(10),
    team VARCHAR(10),
    week INTEGER,
    season INTEGER,
    -- Consensus values
    consensus_points DECIMAL(5,2),
    floor_points DECIMAL(5,2),      -- From alternate unders
    ceiling_points DECIMAL(5,2),    -- From alternate overs
    -- Individual source projections
    betonline_proj DECIMAL(5,2),
    pinnacle_proj DECIMAL(5,2),
    fantasypros_proj DECIMAL(5,2),
    espn_proj DECIMAL(5,2),
    -- Detailed stat projections (from BOL format)
    proj_passing_yards DECIMAL(6,2),
    proj_passing_tds DECIMAL(3,2),
    proj_rushing_yards DECIMAL(5,2),
    proj_rushing_tds DECIMAL(3,2),
    proj_receiving_yards DECIMAL(5,2),
    proj_receiving_tds DECIMAL(3,2),
    proj_receptions DECIMAL(4,2),
    -- Meta
    projection_std_dev DECIMAL(5,2),
    confidence_rating VARCHAR(10),  -- 'HIGH', 'MEDIUM', 'LOW'
    has_props BOOLEAN,               -- Whether sportsbook props available
    calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_metrics_season ON gold.player_metrics(player_id, season);
CREATE INDEX idx_player_week_stats ON silver.player_week_stats(player_id, season, week);
CREATE INDEX idx_player_projections ON gold.player_projections(player_id, season, week);
```

### API Design

#### RESTful Endpoints

##### Authentication
```
POST   /api/auth/register     - User registration
POST   /api/auth/login        - User login (returns JWT)
POST   /api/auth/refresh      - Refresh JWT token
POST   /api/auth/logout       - Invalidate refresh token
```

##### User Management
```
GET    /api/users/profile     - Get user profile
PUT    /api/users/profile     - Update user profile
DELETE /api/users/account     - Delete user account
```

##### League Operations
```
GET    /api/leagues           - List user's leagues
POST   /api/leagues           - Connect new league
GET    /api/leagues/:id       - Get league details
PUT    /api/leagues/:id       - Update league settings
DELETE /api/leagues/:id       - Remove league connection
GET    /api/leagues/:id/sync  - Force sync with ESPN
```

##### Player Data & Analytics
```
GET    /api/players           - List all players with filters
GET    /api/players/:id       - Get player details
GET    /api/players/:id/stats - Get player statistics
GET    /api/players/:id/metrics - Get calculated metrics
GET    /api/players/search    - Search players by name
```

##### Draft Operations
```
POST   /api/draft/session     - Start new draft session
GET    /api/draft/session/:id - Get draft session state
PUT    /api/draft/session/:id - Update draft state
POST   /api/draft/session/:id/pick - Record a pick
POST   /api/draft/session/:id/undo - Undo last action
GET    /api/draft/recommendations - Get draft recommendations
POST   /api/draft/import      - Import completed draft
```

#### API Response Format
```json
{
  "success": true,
  "data": { },
  "error": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Error Response Format
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": { }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Implementation Details

### Technology Stack

#### Backend
- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Authentication**: JWT (dgrijalva/jwt-go)
- **Database Drivers**: 
  - database/sql with lib/pq (PostgreSQL)
  - go-redis/redis
- **HTTP Client**: Standard library with retry logic
- **Logging**: Structured logging to PostgreSQL

#### Frontend
- **Framework**: Next.js 14+ (React 18+)
- **Language**: TypeScript
- **State Management**: React Context + useReducer
- **HTTP Client**: Axios with interceptors
- **UI Components**: Custom components, minimal design
- **CSS**: Tailwind CSS or CSS Modules

#### Data Pipeline
- **Language**: Python 3.11+
- **Package Manager**: uv (fast, reliable Python package management)
  - All Python dependencies managed via `pyproject.toml`
  - Virtual environments via `uv venv`
  - No pip/pip3 usage - consistency across all environments
- **Data Libraries**:
  - polars for high-performance data manipulation (replacing pandas)
  - pandas for legacy compatibility where needed
  - nfl_data_py for nflverse access
  - psycopg2-binary for PostgreSQL
  - requests for API calls
- **Scheduling**: Cron (later Airflow)

#### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Databases**:
  - PostgreSQL 15+
  - Redis 7+
- **Version Control**: Git with monorepo structure

### Project Structure

```
fantasy-football-analytics/
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go
│   ├── internal/
│   │   ├── auth/
│   │   │   ├── jwt.go
│   │   │   ├── middleware.go
│   │   │   └── service.go
│   │   ├── draft/
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   └── recommendations.go
│   │   ├── league/
│   │   │   ├── espn_client.go
│   │   │   ├── handler.go
│   │   │   └── service.go
│   │   ├── analytics/
│   │   │   ├── postgres_client.go
│   │   │   ├── metrics.go
│   │   │   └── service.go
│   │   └── database/
│   │       ├── postgres.go
│   │       ├── redis.go
│   │       └── migrations/
│   ├── pkg/
│   │   ├── logger/
│   │   └── utils/
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx
│   │   ├── draft/
│   │   ├── analytics/
│   │   └── leagues/
│   ├── components/
│   │   ├── DraftBoard/
│   │   ├── PlayerCard/
│   │   └── Layout/
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── DraftContext.tsx
│   ├── hooks/
│   ├── services/
│   │   └── api.ts
│   ├── styles/
│   ├── package.json
│   └── tsconfig.json
│
├── data-pipeline/
│   ├── extractors/
│   │   ├── nflverse.py
│   │   ├── fantasypros.py
│   │   └── espn.py
│   ├── transformers/
│   │   ├── clean_plays.py
│   │   ├── calculate_fantasy.py
│   │   └── aggregate_stats.py
│   ├── loaders/
│   │   └── postgres_loader.py
│   ├── orchestration/
│   │   └── daily_update.py
│   ├── requirements.txt
│   └── config.yaml
│
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── pipeline.Dockerfile
│
├── scripts/
│   ├── setup.sh
│   └── seed_data.sh
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## Error Handling Strategy

### Backend Error Handling

#### Error Categories
1. **Validation Errors** (400)
   - Invalid input parameters
   - Missing required fields
   - Format violations

2. **Authentication Errors** (401/403)
   - Invalid JWT token
   - Expired token
   - Insufficient permissions

3. **Resource Errors** (404)
   - Player not found
   - League not found
   - Draft session not found

4. **External Service Errors** (502/503)
   - ESPN API unavailable
   - Database connection failed
   - Redis timeout

5. **Server Errors** (500)
   - Unexpected application errors
   - Panic recovery

#### Error Handling Implementation
```go
// Example error handler middleware
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // Log to PostgreSQL
                logError(err)
                c.JSON(500, ErrorResponse{
                    Code: "INTERNAL_ERROR",
                    Message: "An unexpected error occurred",
                })
            }
        }()
        c.Next()
    }
}
```

### Frontend Error Handling

#### Strategies
1. **Graceful Degradation**
   - Show cached data when API unavailable
   - Disable features that require failed services
   - Display informative error messages

2. **Retry Logic**
   - Automatic retry with exponential backoff
   - Manual retry option for user-initiated actions

3. **User Feedback**
   - Toast notifications for transient errors
   - Full-page error boundaries for critical failures
   - Inline validation messages

### Data Pipeline Error Handling

#### Strategies
1. **Idempotent Operations**
   - Safe to retry without side effects
   - Track processing state in database

2. **Partial Failure Handling**
   - Continue processing other data sources
   - Log failures for manual review
   - Send alerts for critical failures

3. **Data Validation**
   - Schema validation before loading
   - Outlier detection for statistical anomalies
   - Referential integrity checks

## Testing Plan

### Unit Testing

#### Backend (Go)
- **Coverage Target**: 80%
- **Key Areas**:
  - Authentication logic
  - Draft recommendation algorithm
  - Analytics calculations
  - API input validation
- **Framework**: Standard testing package + testify

#### Frontend (React)
- **Coverage Target**: 70%
- **Key Areas**:
  - Component rendering
  - State management logic
  - API integration layers
  - User input validation
- **Framework**: Jest + React Testing Library

#### Data Pipeline (Python)
- **Coverage Target**: 75%
- **Key Areas**:
  - Data transformation logic
  - Fantasy point calculations
  - Aggregation functions
- **Framework**: pytest

### Integration Testing

1. **API Integration Tests**
   - Test complete request/response cycles
   - Verify database state changes
   - Test with mock ESPN API responses

2. **End-to-End Draft Simulation**
   - Simulate complete draft session
   - Test undo/redo functionality
   - Verify state persistence

3. **Data Pipeline Integration**
   - Test full ETL process with sample data
   - Verify medallion layer transformations
   - Validate analytics calculations

### Historical Backtesting

1. **Analytics Validation**
   - Compare calculated metrics against known values
   - Validate fantasy point calculations
   - Test season-over-season consistency

2. **Draft Recommendation Testing**
   - Simulate past drafts with historical ADP
   - Compare recommendations to actual outcomes
   - Measure value above replacement accuracy

### Performance Testing

1. **Load Testing**
   - Simulate 100 concurrent draft sessions
   - Measure API response times under load
   - Test database query performance

2. **Stress Testing**
   - Test graceful degradation under failure
   - Verify cache behavior under pressure
   - Monitor memory usage patterns

### Manual Testing Checklist

#### Pre-Draft
- [ ] User registration and login
- [ ] League connection via ESPN ID
- [ ] League settings detection
- [ ] Player search and filtering

#### During Draft
- [ ] Draft board updates
- [ ] Recommendation accuracy
- [ ] Undo/redo functionality
- [ ] Auto-save verification
- [ ] Manual player selection

#### Post-Draft
- [ ] Draft import from ESPN
- [ ] Results analysis
- [ ] Historical comparison
- [ ] Export capabilities

## Deployment & Operations

### Development Environment Setup
```bash
# Clone repository
git clone https://github.com/[your-org]/fantasy-football-analytics.git
cd fantasy-football-analytics

# Copy environment variables
cp .env.example .env

# Start services with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec backend /app/migrate up

# Seed initial data
docker-compose exec pipeline python seed_data.py

# Start development servers
# Backend: http://localhost:8080
# Frontend: http://localhost:3000
```

### Production Deployment

#### Containerization
- Multi-stage Docker builds for optimized images
- Separate containers for each service
- Health checks for container orchestration

#### Environment Variables
```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=fantasy_football
POSTGRES_USER=app_user
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Keys
ESPN_API_KEY=your_key_here
JWT_SECRET=your_secret_here

# Application
API_PORT=8080
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

### Monitoring & Logging

#### Application Logs
- Structured JSON logging
- Stored in PostgreSQL for querying
- Log rotation after 30 days
- Key events to log:
  - Authentication attempts
  - Draft actions
  - API errors
  - Performance metrics

#### Health Checks
```go
GET /health
{
  "status": "healthy",
  "services": {
    "postgres": "connected",
    "redis": "connected",
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Backup Strategy
1. **PostgreSQL**: Daily automated backups, 7-day retention
2. **Redis**: No backup needed (cache only)

## Security Considerations

1. **Authentication & Authorization**
   - JWT tokens with 15-minute expiry
   - Refresh tokens with 7-day expiry
   - Bcrypt password hashing (cost factor 10)

2. **Data Protection**
   - HTTPS only in production
   - Encrypted database connections
   - No sensitive data in logs

3. **Input Validation**
   - Parameterized SQL queries
   - Input sanitization on all endpoints
   - Rate limiting (100 requests/minute per IP)

4. **ESPN API Security**
   - Credentials stored encrypted
   - API keys never exposed to frontend
   - Proxy all external requests through backend

## Performance Optimization

1. **Caching Strategy**
   - Redis TTL: 1 hour for analytics
   - Browser cache: 5 minutes for player data
   - CDN for static assets

2. **Database Optimization**
   - Indexes on frequently queried columns
   - Connection pooling (max 20 connections)
   - Query optimization for complex analytics

3. **Frontend Optimization**
   - Code splitting by route
   - Lazy loading for components
   - Optimistic UI updates

## Future Enhancements

### Phase 3 Considerations
1. Mobile native apps (React Native)
2. Real-time draft synchronization via WebSockets
3. Machine learning for player projections
4. Social features for league trash talk
5. Dynasty league support
6. DFS (Daily Fantasy Sports) optimizer
7. Advanced visualization dashboards
8. Slack/Discord integration for alerts

### Scalability Path
1. Add read replicas for PostgreSQL analytics queries
2. Implement Kubernetes for orchestration
3. Add CDN for global distribution
4. Implement GraphQL for flexible queries
5. Add message queue for async processing

## Success Metrics

1. **Technical Metrics**
   - API response time < 200ms (p95)
   - 99.9% uptime during draft season
   - Zero data loss incidents

2. **User Metrics**
   - Draft tool usage for 80% of user drafts
   - Weekly active users during season
   - User retention season-over-season

3. **Analytics Accuracy**
   - Recommendation value vs actual performance
   - Correlation of metrics to fantasy success
   - Prediction accuracy for breakout players

## Development Timeline

### Month 1: Foundation
- Week 1-2: Environment setup, database schema
- Week 3-4: Basic authentication, user management

### Month 2: Data Pipeline
- Week 1-2: nflverse data ingestion
- Week 3-4: Analytics calculations, PostgreSQL analytics schema

### Month 3: Core Features
- Week 1-2: Draft tool backend
- Week 3-4: Draft tool frontend

### Month 4: Polish & Launch
- Week 1-2: Testing and bug fixes
- Week 3: Production deployment
- Week 4: Beta testing with friends

## Conclusion

This specification provides a comprehensive blueprint for building a professional-grade fantasy football analytics platform. The architecture balances performance, maintainability, and user experience while remaining achievable for a small team. The phased approach allows for iterative development and validation, ensuring each feature delivers real value before moving to the next.