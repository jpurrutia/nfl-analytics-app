# NFL Fantasy Analytics Platform

A comprehensive, data-driven fantasy football analytics platform that provides personalized insights for dominating fantasy leagues.

## Features

- **Interactive Draft Tool**: Real-time draft assistant with ADP-based value recommendations
- **League Intelligence**: Auto-detect settings from ESPN API and adapt analytics
- **Advanced Analytics**: 5+ seasons of historical data with consistency scores, boom/bust rates, and more
- **Multi-League Support**: Manage multiple fantasy leagues per user account

## Tech Stack

- **Backend**: Go 1.21+ with Gin framework
- **Frontend**: Next.js 14+ with TypeScript
- **Data Pipeline**: Python 3.11+ with pandas and DuckDB
- **Databases**: PostgreSQL (transactional), Redis (cache), DuckDB (analytics)
- **Infrastructure**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker Desktop installed and running
- Git for version control

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd nfl-analytics-v2
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Wait for services to be healthy:
```bash
docker-compose ps
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Health Check: http://localhost:8080/health

### Development

All dependencies run in Docker containers, keeping your local machine clean:

- **Backend**: Go code in `/backend` with hot-reload via Air
- **Frontend**: Next.js in `/frontend` with hot-reload
- **Data Pipeline**: Python scripts in `/data-pipeline`

Make changes to the code locally, and the containers will automatically reload.

### Stopping Services

```bash
docker-compose down
```

To also remove volumes (database data):
```bash
docker-compose down -v
```

## Project Structure

```
nfl-analytics-v2/
├── backend/          # Go API server
├── frontend/         # Next.js application  
├── data-pipeline/    # Python ETL scripts
├── docker/           # Dockerfile configurations
├── scripts/          # Utility scripts
├── .env              # Environment variables (git-ignored)
├── .env.example      # Example environment variables
└── docker-compose.yml # Service orchestration
```

## Environment Variables

Key configuration options in `.env`:

- `POSTGRES_PASSWORD`: Database password (change in production)
- `JWT_SECRET`: JWT signing secret (change in production)
- `REDIS_HOST`: Redis cache host
- `NEXT_PUBLIC_API_URL`: Frontend API endpoint

## Architecture

The platform follows a microservices architecture:

1. **PostgreSQL**: Stores user data, leagues, and draft sessions
2. **Redis**: Caches frequently accessed data with 1-hour TTL
3. **DuckDB**: Analytics database with medallion architecture (Bronze → Silver → Gold)
4. **Go Backend**: RESTful API with JWT authentication
5. **Next.js Frontend**: Server-side rendered React application
6. **Python Pipeline**: ETL processes for NFL data ingestion

## API Documentation

Once running, the main API endpoints are:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/players` - List players with filters
- `POST /api/draft/session` - Start draft session
- `GET /api/draft/recommendations` - Get draft recommendations

## Testing

Run tests inside containers:

```bash
# Backend tests
docker-compose exec backend go test ./...

# Frontend tests  
docker-compose exec frontend npm test

# Data pipeline tests
docker-compose exec data-pipeline pytest
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## License

Private - All rights reserved

## Support

For issues or questions, please open a GitHub issue.

---

**Note**: This is a development setup. For production deployment, additional security configurations are required.