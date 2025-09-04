.PHONY: up down restart logs test backend-shell db-shell migrate clean

# Start all services
up:
	docker-compose up -d
	@echo "Services starting... Check status with 'make logs'"

# Stop all services
down:
	docker-compose down

# Restart all services
restart: down up

# View logs
logs:
	docker-compose logs -f

# Run backend tests
test:
	cd backend && go test ./...

# Shell into backend container
backend-shell:
	docker exec -it nfl_backend sh

# Shell into database
db-shell:
	docker exec -it nfl_postgres psql -U app_user -d fantasy_football

# Run migrations
migrate:
	cat backend/migrations/*.sql | docker exec -i nfl_postgres psql -U app_user -d fantasy_football

# Clean everything (including volumes)
clean:
	docker-compose down -v
	@echo "Cleaned all containers and volumes"

# Development workflow
dev: up migrate
	@echo "Development environment ready!"
	@echo "Backend API: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"
	@echo "PostgreSQL: localhost:5432"

# Check health
health:
	@curl -s http://localhost:8080/health | python3 -m json.tool || echo "Backend not ready yet"