#!/bin/sh
set -e

MAX_RETRIES=3
RETRY_DELAY=5

echo "[entrypoint] Waiting for database to be ready..."

# Retry loop for prisma migrate deploy — production-safe migration command
# Does NOT require @prisma/dev or valibot (no dev dependencies)
attempt=1
while [ "$attempt" -le "$MAX_RETRIES" ]; do
  echo "[entrypoint] Attempt $attempt/$MAX_RETRIES: Running prisma migrate deploy..."

  if npx prisma migrate deploy 2>&1; then
    echo "[entrypoint] ✓ prisma migrate deploy succeeded on attempt $attempt."
    break
  else
    echo "[entrypoint] ✗ prisma migrate deploy failed on attempt $attempt."
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      echo "[entrypoint] Retrying in ${RETRY_DELAY}s..."
      sleep "$RETRY_DELAY"
    else
      echo "[entrypoint] ERROR: All $MAX_RETRIES attempts failed."
      echo "[entrypoint] The database schema may be out of sync."
      echo "[entrypoint] Common causes:"
      echo "[entrypoint]   - Database not reachable (check DATABASE_URL)"
      echo "[entrypoint]   - Missing migration files (run 'prisma migrate dev' locally)"
      echo "[entrypoint]   - Pending migrations need manual review"
      echo "[entrypoint] Continuing with app startup..."
    fi
  fi

  attempt=$((attempt + 1))
done

echo "[entrypoint] Starting application..."
exec "$@"
