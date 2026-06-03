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
# Non-fatal: in local dev the bind-mounted /app is host-owned and the non-root
# container user can't write staticfiles/ (PermissionError). On a real host
# (Render — no bind mount, appuser owns /app) this succeeds. Either way, never
# block boot on it.
python manage.py collectstatic --noinput || echo "[entrypoint] collectstatic skipped"

# Run idempotent seeds in the background so gunicorn can start (and pass the
# health check) immediately. On a fresh Neon DB the 961-row global catalog seed
# can take 2-4 min over SSL — blocking on it caused Render health-check timeouts.
# Both commands are fully idempotent; a restart before they finish is safe.
echo "Starting background seeds (seed_global_catalog + seed_demo)..."
(python manage.py seed_global_catalog && python manage.py seed_demo \
    && echo "[entrypoint] background seeds complete") &

# Auto-create superuser when env vars are set (idempotent).
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py shell -c "
from django.contrib.auth import get_user_model; U = get_user_model()
if not U.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    U.objects.create_superuser(username='$DJANGO_SUPERUSER_USERNAME', password='$DJANGO_SUPERUSER_PASSWORD', phone='$DJANGO_SUPERUSER_USERNAME')
    print('[entrypoint] superuser created.')
else:
    print('[entrypoint] superuser already exists.')
" || true
fi

exec "$@"
