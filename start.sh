#!/bin/sh
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || echo "Migration skipped or failed, trying db push..."
npx prisma db push --skip-generate 2>/dev/null || echo "DB push completed or skipped"
echo "Starting Next.js..."
node server.js
