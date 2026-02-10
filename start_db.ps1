# Start Docker Compose if available
if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
    docker-compose up -d
    Write-Host "Database started successfully via docker-compose."
} elseif (Get-Command "docker" -ErrorAction SilentlyContinue) {
    docker compose up -d
    Write-Host "Database started successfully via docker compose."
} else {
    Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop to run the local database."
    exit 1
}

# Wait for DB to be ready
Write-Host "Waiting for database to be ready..."
Start-Sleep -Seconds 5

# Push schema
Write-Host "Pushing schema to database..."
npx prisma db push
