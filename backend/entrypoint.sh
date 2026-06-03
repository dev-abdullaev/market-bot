#!/bin/sh
set -e

# Wait for Postgres to be ready before proceeding.
# The compose healthcheck on the db service ensures it's pg_isready,
# but an extra wait loop here guards against any timing edge.
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database at ${DB_HOST}:${DB_PORT:-5432}..."
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -q; do
        sleep 1
    done
    echo "Database is ready."
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding global product catalog..."
python manage.py seed_global_catalog

echo "Collecting static files..."
# Non-fatal: in local dev the bind-mounted /app is host-owned and the non-root
# container user can't write staticfiles/ (PermissionError). On a real host
# (Render — no bind mount, appuser owns /app) this succeeds. Either way, never
# block boot on it.
python manage.py collectstatic --noinput || echo "[entrypoint] collectstatic skipped"

exec "$@"
