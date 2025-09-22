#!/usr/bin/env sh
set -e

echo "🔧 Running Prisma client generate (idempotent)"
npx prisma generate >/dev/null 2>&1 || true

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL is not set; skipping schema setup"
fi

# Optional, controlled migrations at runtime (default off in prod). Set RUN_MIGRATIONS=true to enable.
if [ "$RUN_MIGRATIONS" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "🗄️  (entrypoint) Applying migrations as RUN_MIGRATIONS=true"
  npx prisma migrate deploy || true
fi

echo "🚀 Starting Next.js"
exec npm run start -- -p ${PORT:-3002}