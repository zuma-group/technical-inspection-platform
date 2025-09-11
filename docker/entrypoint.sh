#!/usr/bin/env sh
set -e

echo "🔧 Running Prisma client generate (idempotent)"
npx prisma generate >/dev/null 2>&1 || true

if [ -n "$DATABASE_URL" ]; then
  echo "🗄️  Running database migrations"
  npx prisma migrate deploy
else
  echo "⚠️  DATABASE_URL is not set; skipping migrations"
fi

echo "🚀 Starting Next.js"
exec npm run start -- -p ${PORT:-3002}


