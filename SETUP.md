# Setup Guide

## Quick Start Options

### Option 1: Using Docker (Recommended)

The easiest way to get started is using Docker Compose, which will set up both the application and PostgreSQL database:

```bash
# Start all services (app + database)
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f app
```

The service will be available at `http://localhost:3000`

### Option 2: Local Development

If you prefer to run the application locally:

1. **Start PostgreSQL**
   
   Make sure PostgreSQL is running locally. You can:
   - Install PostgreSQL locally
   - Or use Docker for just the database:
   ```bash
   docker run -d \
     --name postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=mirage_dev \
     -p 5432:5432 \
     postgres:15-alpine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your database credentials if needed
   ```

4. **Run database migrations**
   ```bash
   npm run db:setup
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Testing the Service

Once running, you can test the endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Create a mock endpoint
curl -X POST http://localhost:3000/api/v1/mock-endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Endpoint",
    "method": "GET",
    "url_pattern": "/api/test",
    "response_data": {"message": "Hello from mock!"},
    "response_status_code": 200
  }'

# Use the mock endpoint
curl http://localhost:3000/mock/api/test
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. **Check PostgreSQL is running**
   ```bash
   # For Docker
   docker ps | grep postgres
   
   # For local PostgreSQL
   pg_isready -h localhost -p 5432
   ```

2. **Verify database credentials in .env file**
   - DB_HOST=localhost
   - DB_PORT=5432
   - DB_USER=postgres
   - DB_PASSWORD=password
   - DB_NAME=mirage_dev

3. **Create database manually if needed**
   ```sql
   CREATE DATABASE mirage_dev;
   ```

### Port Conflicts

If port 3000 is already in use:
- Change PORT in .env file
- Or use Docker: `docker-compose up -d` (uses different ports)

### Permission Issues

If you get permission errors with Docker:
```bash
sudo docker-compose up -d
```