#!/bin/sh
echo "Running Prisma DB sync..."
npx prisma db push --skip-generate --accept-data-loss
echo "DB sync finished."
echo "Starting Next.js..."
node server.js
