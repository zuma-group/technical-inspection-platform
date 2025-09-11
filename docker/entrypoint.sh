#!/usr/bin/env sh
set -e

echo "🔧 Running Prisma client generate (idempotent)"
npx prisma generate >/dev/null 2>&1 || true

if [ -n "$DATABASE_URL" ]; then
  echo "🗄️  Applying migrations (if any)..."
  npx prisma migrate deploy || true
  echo "🧱 Ensuring schema via db push..."
  npx prisma db push || true
else
  echo "⚠️  DATABASE_URL is not set; skipping schema setup"
fi

echo "🚀 Starting Next.js"
exec npm run start -- -p ${PORT:-3002}


