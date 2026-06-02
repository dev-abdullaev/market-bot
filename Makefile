.PHONY: test test-pg test-sqlite up down build

# Run the full test suite against SQLite (no Docker needed, uses local .venv)
test-sqlite:
	cd backend && DB_NAME= .venv/bin/pytest

# Run the full test suite against the compose Postgres.
# Prerequisites: docker compose up -d db (or use `make up`).
# pytest-django creates test_marketbot automatically; the postgres user has CREATEDB.
test-pg:
	cd backend && \
	  DB_NAME=marketbot \
	  DB_USER=postgres \
	  DB_PASSWORD=postgres \
	  DB_HOST=127.0.0.1 \
	  DB_PORT=5434 \
	  .venv/bin/pytest

# Default `make test` runs against SQLite for speed
test: test-sqlite

# Bring up Postgres only (ready for test-pg)
up-db:
	docker compose up -d db

# Bring up all services
up:
	docker compose up -d

# Tear everything down (keeps named volumes)
down:
	docker compose down

# Build the backend image
build:
	docker compose build backend
