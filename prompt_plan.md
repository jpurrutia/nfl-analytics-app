# Fantasy Football Analytics Platform - Development Prompt Plan

## Overview
This document contains a series of structured prompts for building the Fantasy Football Analytics Platform using test-driven development (TDD). Each prompt builds incrementally on the previous ones, ensuring no orphaned code and complete integration at each step.

## Development Philosophy
- **Test-First**: Write tests before implementation
- **Incremental**: Small, safe steps that can be verified
- **Integrated**: Each step connects to previous work
- **Production-Ready**: Focus on error handling, logging, and best practices from the start

---

## Phase 1: Foundation & Infrastructure

### Prompt 1: Initialize Monorepo and Docker Infrastructure

```text
Create a monorepo structure for a fantasy football analytics platform with Docker Compose setup. Initialize the following structure:

fantasy-football-analytics/
├── backend/           (Go API server)
├── frontend/          (Next.js React app)
├── data-pipeline/     (Python ETL scripts)
├── docker/            (Dockerfiles)
├── scripts/           (Setup scripts)
├── docker-compose.yml
├── .env.example
└── README.md

Set up Docker Compose with:
- PostgreSQL 15 (port 5432)
- Redis 7 (port 6379)
- Backend service (Go, port 8080)
- Frontend service (Next.js, port 3000)
- Data pipeline service (Python)

Include:
1. docker-compose.yml with all services, health checks, and proper networking
2. .env.example with all required environment variables
3. Dockerfiles for each service (can be placeholder for now)
4. Basic README.md explaining project structure
5. .gitignore for Go, Node.js, Python, and Docker

Write tests to verify:
- Docker Compose file is valid YAML
- All required directories exist
- Environment variables are documented

Use best practices for Docker networking and volume management.
```

---

### Prompt 2: PostgreSQL Database Schema and Migrations

```text
Building on the monorepo structure, implement the PostgreSQL database schema with migration support.

Create the following in backend/internal/database/:
1. migrations/ directory with numbered SQL files
2. 001_create_users_table.sql - Users table with UUID primary key, email, password_hash
3. 002_create_leagues_table.sql - Leagues table with ESPN integration fields
4. 003_create_draft_tables.sql - Draft sessions and draft actions tables
5. 004_create_logs_table.sql - Application logs table

Implement in Go:
1. backend/internal/database/postgres.go - Connection pool management
2. backend/internal/database/migrate.go - Migration runner using golang-migrate
3. backend/cmd/migrate/main.go - CLI tool for running migrations

Write tests for:
1. postgres_test.go - Test connection pool creation and health checks
2. migrate_test.go - Test migration up/down functionality
3. Integration test that runs all migrations against a test database

Include:
- Proper connection pooling with pgx
- Context support for all database operations
- Structured error handling
- Migration rollback support

Ensure the migration tool can be run via Docker Compose.
```

---

### Prompt 3: Go Backend Structure with Health Check

```text
Expand the Go backend with proper project structure and a working health check endpoint.

Implement:
1. backend/cmd/api/main.go - Application entry point
2. backend/internal/config/config.go - Environment variable loading
3. backend/internal/server/server.go - HTTP server setup with Gin
4. backend/internal/middleware/logger.go - Request logging middleware
5. backend/internal/handlers/health.go - Health check endpoint
6. backend/pkg/logger/logger.go - Structured logging utility

The health check endpoint (/health) should:
- Check PostgreSQL connectivity
- Check Redis connectivity  
- Return JSON with service status

Write tests for:
1. config_test.go - Environment variable parsing
2. health_test.go - Health endpoint with mocked dependencies
3. logger_test.go - Logging middleware
4. Integration test for full server startup

Include:
- Graceful shutdown handling
- Panic recovery middleware
- CORS configuration
- Request ID middleware

The server should start successfully via docker-compose up backend.
```

---

## Phase 2: Authentication & User Management

### Prompt 4: JWT Authentication Service

```text
Implement JWT-based authentication with refresh tokens.

Create in backend/internal/auth/:
1. jwt.go - JWT token generation and validation
2. password.go - Bcrypt password hashing and verification
3. service.go - Authentication service with login/register/refresh
4. middleware.go - JWT validation middleware

Implement these database models in backend/internal/models/:
1. user.go - User model with validation
2. token.go - Refresh token tracking

Create these handlers in backend/internal/handlers/:
1. auth.go - Register, login, refresh, logout endpoints

Write comprehensive tests:
1. jwt_test.go - Token generation/validation edge cases
2. password_test.go - Hashing and verification
3. service_test.go - Full auth flow with mocked database
4. middleware_test.go - Authorization header parsing
5. Integration test for complete auth flow

Security requirements:
- 15-minute access tokens
- 7-day refresh tokens
- Bcrypt cost factor 10
- Constant-time password comparison
- Secure token storage in HTTP-only cookies

Wire up routes in the main server and test via curl commands.
```

---

### Prompt 5: User Management API

```text
Building on authentication, implement user profile management.

Add to backend/internal/handlers/:
1. user.go - Profile CRUD operations

Add to backend/internal/services/:
1. user_service.go - Business logic for user operations

Add to backend/internal/repositories/:
1. user_repository.go - Database operations for users

Implement endpoints:
- GET /api/users/profile - Get current user
- PUT /api/users/profile - Update profile
- DELETE /api/users/account - Delete account

Write tests:
1. user_service_test.go - Business logic validation
2. user_repository_test.go - Database operations with test DB
3. user_handler_test.go - HTTP endpoint testing
4. Integration test for full user lifecycle

Include:
- Input validation
- SQL injection prevention
- Proper error messages
- Audit logging for account changes
- Soft delete for user accounts

Ensure all endpoints require authentication via the JWT middleware.
```

---

## Phase 3: Data Pipeline Foundation

### Prompt 6: PostgreSQL Analytics Schema

```text
Set up PostgreSQL analytics tables with the medallion architecture.

Create in backend/internal/database/migrations/:
1. 005_create_analytics_schemas.sql - Create bronze/silver/gold schemas
2. 006_create_bronze_tables.sql - Raw data tables
3. 007_create_silver_tables.sql - Cleaned/standardized tables  
4. 008_create_gold_tables.sql - Analytics/metrics tables

Implement these tables:
Bronze layer:
- bronze.raw_plays - Raw play-by-play data
- bronze.raw_adp - Raw ADP values

Silver layer:
- silver.plays - Cleaned play data
- silver.player_stats - Standardized player statistics
- silver.player_week_stats - Weekly aggregations

Gold layer:
- gold.player_metrics - Calculated metrics
- gold.player_rankings - Current rankings
- gold.player_season_totals - Season aggregations

Write tests:
1. Test migration execution
2. Test table creation and indexes
3. Test data integrity constraints

Create in data-pipeline/:
1. database/postgres_connection.py - PostgreSQL connection manager
2. models/schema.py - SQLAlchemy model definitions

Include:
- Proper indexing for analytical queries
- Partitioning for time-series data
- Materialized views for expensive aggregations
```

---

### Prompt 7: NFL Data Extraction Pipeline

```text
Implement data extraction from nflverse using nfl_data_py.

Create in data-pipeline/extractors/:
1. base_extractor.py - Abstract base class for extractors
2. nflverse_extractor.py - NFL play-by-play data extraction
3. config.py - Data source configuration

The extractor should:
- Download 5 seasons of play-by-play data
- Handle rate limiting and retries
- Store raw data in PostgreSQL bronze.raw_plays
- Track extraction metadata (timestamps, record counts)
- Support incremental updates
- Use pre-calculated fantasy points from nflverse

Write tests:
1. test_nflverse_extractor.py - Mock API responses
2. Integration test with small data sample
3. Test error handling and retries

Create data-pipeline/orchestration/extract_nfl_data.py:
- Command-line script for manual extraction
- Logging to both file and PostgreSQL
- Progress reporting
- Idempotent execution
- Write directly to PostgreSQL using psycopg2

Ensure the extraction can run via Docker and stores data in PostgreSQL.
```

---

### Prompt 8: Data Transformation Pipeline

```text
Implement data transformation with Python and PostgreSQL.

Create in data-pipeline/transformers/:
1. fantasy_verifier.py - Verify pre-calculated fantasy points
2. cleaner.py - Data cleaning and standardization
3. aggregator.py - Weekly and season aggregations
4. postgres_writer.py - Write transformed data to PostgreSQL

Implement transformations:
1. Clean player names and IDs
2. Verify pre-calculated fantasy points from nflverse
3. Identify red zone plays
4. Calculate target shares
5. Aggregate to player-week level
6. Write to PostgreSQL silver/gold schemas

Write comprehensive tests:
1. test_fantasy_verifier.py - Verify point calculations
2. test_cleaner.py - Name standardization
3. test_aggregator.py - Aggregation logic
4. Integration test comparing to known values

Create data-pipeline/orchestration/transform_data.py:
- Read from PostgreSQL bronze layer
- Apply all transformations in Python
- Write to silver and gold layers in PostgreSQL
- Use transactions for data consistency
- Handle partial failures gracefully

All transformations happen in Python with PostgreSQL for storage only.
```

---

## Phase 4: Core Analytics Engine

### Prompt 9: Analytics Metrics Calculation

```text
Implement the five core analytics metrics in Python with PostgreSQL storage.

Create in data-pipeline/analytics/:
1. consistency.py - Calculate consistency scores
2. boom_bust.py - Calculate boom/bust rates
3. target_share.py - Calculate target share percentages
4. red_zone.py - Calculate red zone usage
5. matchup.py - Calculate matchup strength scores
6. metrics_writer.py - Write metrics to PostgreSQL

Each metric should:
- Read from PostgreSQL silver/gold tables
- Apply statistical calculations in Python
- Store results in PostgreSQL gold.player_metrics
- Support multiple seasons of data
- Handle edge cases (min games played, etc.)

Write tests:
1. Test each metric calculation with known inputs/outputs
2. Test edge cases (players with 1 game, etc.)
3. Integration test for full metrics pipeline
4. Performance test with full dataset

Create backend/internal/analytics/:
1. postgres_client.go - PostgreSQL connection for analytics
2. metrics_service.go - Service to query calculated metrics
3. cache_service.go - Redis caching layer

The Go service should:
- Query PostgreSQL for pre-calculated metrics
- Cache results in Redis with 1-hour TTL
- Provide fast API responses
```

---

### Prompt 10: Player API Endpoints

```text
Expose player data and analytics via REST API.

Implement in backend/internal/handlers/:
1. player.go - Player-related endpoints

Add to backend/internal/services/:
1. player_service.go - Business logic for player operations

Add to backend/internal/repositories/:
1. player_repository.go - Query PostgreSQL for player data

Implement endpoints:
- GET /api/players - List with pagination and filters
- GET /api/players/:id - Get player details
- GET /api/players/:id/stats - Historical statistics
- GET /api/players/:id/metrics - Calculated metrics
- GET /api/players/search - Search by name

Write tests:
1. Test pagination logic
2. Test filtering (position, team, etc.)
3. Test search functionality
4. Test caching behavior
5. Integration test with real PostgreSQL data

Include:
- Redis caching with proper invalidation
- Query parameter validation
- Response compression for large datasets
- Proper error handling for missing players

Wire up all endpoints and test with sample queries.
```

---

## Phase 5: League Integration

### Prompt 11: ESPN API Client

```text
Implement ESPN Fantasy API integration.

Create in backend/internal/integrations/espn/:
1. client.go - ESPN API client with rate limiting
2. models.go - ESPN data models
3. parser.go - Parse league settings and rosters
4. mock.go - Mock client for testing

The client should:
- Fetch league settings
- Detect scoring format (PPR/Standard)
- Get roster requirements
- Identify available players
- Handle authentication (if required)

Write comprehensive tests:
1. client_test.go - Test with mocked responses
2. parser_test.go - Test settings detection
3. Integration test with sample league data
4. Test rate limiting and retries

Create backend/internal/handlers/league.go:
- POST /api/leagues - Connect new league
- GET /api/leagues/:id - Get league details
- GET /api/leagues/:id/sync - Force sync

Include:
- Graceful degradation when ESPN is down
- Caching of league settings
- Support for different league formats

Test with multiple league configurations.
```

---

### Prompt 12: League Data Persistence

```text
Store and manage league connections for users.

Add to backend/internal/services/:
1. league_service.go - League management logic

Add to backend/internal/repositories/:
1. league_repository.go - League database operations

Implement:
1. Store league settings in PostgreSQL
2. Track multiple leagues per user
3. Periodic sync with ESPN (via cron)
4. League settings change detection

Write tests:
1. Test league CRUD operations
2. Test user-league associations
3. Test settings sync logic
4. Integration test for full flow

Create data-pipeline/extractors/espn_extractor.py:
- Extract league-specific data
- Store player availability
- Update roster information

Include:
- Audit trail for league changes
- Soft delete for removed leagues
- Encryption for sensitive league data

Ensure users can only access their own leagues.
```

---

## Phase 6: Draft Tool Backend

### Prompt 13: Draft Session Management

```text
Implement draft session state management.

Create in backend/internal/draft/:
1. session.go - Draft session model
2. service.go - Draft business logic
3. repository.go - Draft persistence
4. state.go - State machine for draft flow

Implement:
1. Create new draft session
2. Track picked players
3. Implement undo/redo with event sourcing
4. Auto-save to database
5. Session recovery after disconnect

Write tests:
1. Test state transitions
2. Test undo/redo logic
3. Test persistence and recovery
4. Test concurrent modifications
5. Integration test for full draft

Create endpoints:
- POST /api/draft/session - Start session
- GET /api/draft/session/:id - Get state
- PUT /api/draft/session/:id - Update state
- POST /api/draft/session/:id/pick - Record pick
- POST /api/draft/session/:id/undo - Undo action

Include:
- Optimistic locking for updates
- Audit log of all actions
- State validation
- Maximum session duration

Test with simulated draft scenarios.
```

---

### Prompt 14: Draft Recommendations Engine

```text
Implement intelligent draft recommendations.

Create in backend/internal/draft/:
1. recommendations.go - Recommendation algorithm
2. value_calculator.go - Player value calculations
3. roster_builder.go - Roster need analysis

The algorithm should:
1. Calculate positional scarcity
2. Consider roster needs
3. Adjust for league settings
4. Factor in ADP values
5. Identify value picks

Write comprehensive tests:
1. Test value calculations
2. Test roster need detection
3. Test league setting adjustments
4. Mock draft simulation test
5. Compare recommendations to expert consensus

Create endpoint:
- GET /api/draft/recommendations - Get current recommendations

The endpoint should:
- Accept current roster state
- Return top 10 recommendations
- Include reasoning for each pick
- Respond in <100ms

Include:
- Caching of calculations
- Pre-computation where possible
- Fallback to simple algorithm if slow

Validate recommendations make logical sense.
```

---

## Phase 7: Frontend Foundation

### Prompt 15: Next.js Setup with Authentication

```text
Initialize the Next.js frontend with authentication.

Create in frontend/:
1. Initialize Next.js 14 with TypeScript
2. Set up Tailwind CSS
3. Configure environment variables
4. Set up API client with Axios

Implement in frontend/:
1. lib/api.ts - API client with interceptors
2. lib/auth.ts - Authentication helpers
3. contexts/AuthContext.tsx - Auth state management
4. components/Layout.tsx - App layout wrapper

Create pages:
1. pages/login.tsx - Login form
2. pages/register.tsx - Registration form
3. pages/dashboard.tsx - Protected dashboard
4. middleware.ts - Auth route protection

Write tests:
1. Test API client interceptors
2. Test auth context
3. Test protected route behavior
4. Test form validation

Include:
- JWT token management
- Automatic token refresh
- Loading states
- Error handling
- Responsive design

The frontend should connect to the backend API and handle auth flow properly.
```

---

### Prompt 16: Player Analytics Dashboard

```text
Build the player analytics viewing interface.

Create components in frontend/components/:
1. PlayerTable.tsx - Sortable, filterable player list
2. PlayerCard.tsx - Detailed player view
3. MetricsChart.tsx - Visualize metrics
4. SearchBar.tsx - Player search

Create pages:
1. pages/players/index.tsx - Player list page
2. pages/players/[id].tsx - Player detail page

Implement features:
1. Server-side pagination
2. Column sorting
3. Position filtering
4. Metric-based filtering
5. Search autocomplete

Write tests:
1. Test table sorting
2. Test filtering logic
3. Test search functionality
4. Test chart rendering
5. Integration test with API

Include:
- Loading skeletons
- Error boundaries
- Empty states
- Mobile responsive tables
- Data export functionality

Style with clean, minimal design focusing on data clarity.
```

---

## Phase 8: Draft Tool Frontend

### Prompt 17: Draft Interface Components

```text
Build the core draft tool UI components.

Create in frontend/components/draft/:
1. DraftBoard.tsx - Main draft board grid
2. PlayerPool.tsx - Available players list
3. RosterView.tsx - Current roster display
4. DraftHistory.tsx - Pick history with undo
5. RecommendationPanel.tsx - Top recommendations

Implement features:
1. Drag-and-drop or click to draft
2. Real-time filtering and search
3. Position-based views
4. Undo/redo buttons
5. Keyboard shortcuts

Write tests:
1. Test draft actions
2. Test undo/redo
3. Test filtering
4. Test keyboard navigation
5. Test responsive layout

Create frontend/contexts/DraftContext.tsx:
- Manage draft state
- Handle optimistic updates
- Sync with backend
- Auto-save functionality

Include:
- Optimistic UI updates
- Conflict resolution
- Offline support
- Session recovery
- Timer/round tracking
```

---

### Prompt 18: Draft Tool Integration

```text
Wire together the complete draft tool.

Create pages/draft/:
1. index.tsx - Draft session list
2. new.tsx - New draft setup
3. [id].tsx - Active draft interface

Implement:
1. League selection for draft
2. Draft configuration (rounds, positions)
3. Full draft workflow
4. Post-draft summary
5. Export functionality

Integration features:
1. Connect to recommendations API
2. Real-time state sync
3. Auto-save every action
4. Resume interrupted drafts
5. Post-draft analysis

Write tests:
1. Test full draft flow
2. Test interruption recovery
3. Test recommendations integration
4. Test export functionality
5. End-to-end draft simulation

Include:
- Tutorial/onboarding
- Hotkeys guide
- Draft grades
- Share functionality
- Print-friendly view

Ensure smooth performance with 200+ players displayed.
```

---

## Phase 9: Production Readiness

### Prompt 19: Monitoring and Logging

```text
Implement comprehensive monitoring and logging.

Add to backend:
1. internal/middleware/metrics.go - Prometheus metrics
2. internal/logger/db_logger.go - Database log writer
3. Add health check details

Add to frontend:
1. lib/monitoring.ts - Client-side error tracking
2. components/ErrorBoundary.tsx - Global error handling

Implement:
1. Request/response logging
2. Error tracking with stack traces
3. Performance metrics
4. User action tracking
5. Database query logging

Create dashboards for:
1. API response times
2. Error rates
3. Database performance
4. Cache hit rates
5. User activity

Write tests:
1. Test metric collection
2. Test log formatting
3. Test error capturing
4. Test log rotation
5. Test alert triggers

Add scripts/:
1. analyze_logs.py - Log analysis script
2. performance_report.py - Performance reporting

Include structured logging with correlation IDs across services.
```

---

### Prompt 20: End-to-End Testing and Documentation

```text
Create comprehensive testing and documentation.

Create tests/:
1. e2e/ - End-to-end test suite
2. load/ - Load testing scripts
3. fixtures/ - Test data

Implement E2E tests:
1. Complete user registration flow
2. League connection and sync
3. Full draft simulation
4. Player analytics viewing
5. Data pipeline execution

Create load tests:
1. Simulate 100 concurrent drafts
2. Test API under load
3. Database connection pooling
4. Cache performance
5. Frontend performance

Create documentation:
1. API documentation (OpenAPI/Swagger)
2. Database schema documentation
3. Deployment guide
4. Developer setup guide
5. User guide

Write:
1. README.md - Complete project overview
2. CONTRIBUTING.md - Contribution guidelines
3. API.md - API endpoint reference
4. DEPLOYMENT.md - Production deployment
5. TROUBLESHOOTING.md - Common issues

Include:
- Performance benchmarks
- Security checklist
- Backup procedures
- Monitoring setup
- Scaling guidelines

Ensure all tests pass and documentation is complete before deployment.
```

---

## Phase 10: Deployment and Final Integration

### Prompt 21: Production Deployment Configuration

```text
Prepare for production deployment with Docker and environment configs.

Create:
1. docker/docker-compose.prod.yml - Production compose file
2. .env.production - Production variables template
3. scripts/deploy.sh - Deployment script
4. scripts/backup.sh - Backup script

Implement:
1. Multi-stage Docker builds for optimization
2. Health checks for all services
3. Automatic restart policies
4. Volume management for persistence
5. Network security configurations

Add production optimizations:
1. Backend: Connection pooling, compiled binary
2. Frontend: Static generation, CDN ready
3. Database: Indexes, vacuum schedules
4. Redis: Persistence configuration
5. PostgreSQL: Read replicas for analytics

Write deployment tests:
1. Test container builds
2. Test health checks
3. Test backup/restore
4. Test rolling updates
5. Test rollback procedures

Create monitoring setup:
1. Prometheus configuration
2. Grafana dashboards
3. Alert rules
4. Log aggregation

Include:
- SSL/TLS configuration
- Rate limiting rules
- CORS configuration
- Security headers
- Database migrations strategy

Validate the entire stack works in production mode locally.
```

---

### Prompt 22: Final Integration and Smoke Tests

```text
Perform final integration and create smoke tests for production validation.

Create scripts/smoke_tests/:
1. test_auth.sh - Verify authentication flow
2. test_draft.sh - Verify draft tool
3. test_analytics.sh - Verify analytics
4. test_data_pipeline.sh - Verify ETL
5. run_all.sh - Run all smoke tests

Each test should:
1. Make actual API calls
2. Verify response format
3. Check data consistency
4. Measure response times
5. Log results

Create final integration points:
1. Cron job for daily data updates
2. Redis cache warming on startup
3. Database connection pool tuning
4. Frontend bundle optimization
5. API response compression

Performance validation:
1. Draft tool loads in <2 seconds
2. Recommendations return in <100ms
3. Analytics queries complete in <2 seconds
4. Data pipeline runs in <30 minutes
5. 99% uptime during testing

Create scripts/validate.sh:
- Run all tests
- Check code coverage
- Verify documentation
- Validate environment variables
- Check for security issues

Final checklist:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security scan clean
- [ ] Performance targets met
- [ ] Backup/restore tested
- [ ] Monitoring operational
- [ ] Logs properly structured
- [ ] Error handling comprehensive

This completes the full system integration with production-ready validation.
```

---

## Summary

This prompt plan provides 22 incremental steps to build the complete Fantasy Football Analytics Platform. Each prompt:

1. **Builds on previous work** - No orphaned code
2. **Includes comprehensive testing** - TDD approach throughout
3. **Integrates immediately** - Each step produces working functionality
4. **Follows best practices** - Production-ready from the start
5. **Maintains manageable scope** - Each prompt is achievable in a focused session

The progression follows a logical order:
- Foundation → Authentication → Data → Analytics → Integration → Frontend → Production

Each prompt can be executed independently while maintaining the overall system coherence. The plan ensures that at any point in development, you have a working system that can be tested and validated.