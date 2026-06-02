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

echo "Collecting static files..."
python manage.py collectstatic --noinput

exec "$@"
