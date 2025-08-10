# Container Deployment Guide

This guide explains how to containerize and deploy the federated bot using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 1.29 or higher)
- Git (for cloning the repository)

## Configuration Files

### Created Files
1. **`Dockerfile`** - Production-optimized container image
2. **`Dockerfile.dev`** - Development container with hot-reloading
3. **`docker-compose.prod.yml`** - Production orchestration
4. **`docker-compose.dev.yml`** - Development orchestration
5. **`.dockerignore`** - Build optimization file

### Environment Variables

Create a `.env` file in the project root:

```env
# Redis Configuration
REDIS_PASSWORD=your-secure-redis-password

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Optional: Database Path (defaults to /app/data/context-database.json in container)
DB_PATH=/app/data/context-database.json
```

## Deployment Options

### Option 1: Production Deployment

#### 1. Prepare Configuration
```bash
# Copy and configure the environment file
cp .env.example .env
# Edit .env with your actual credentials
```

#### 2. Configure the Bot
```bash
# Copy and edit the bot configuration
cp config.example.json config.json
# Edit config.json with your instance details
```

Example `config.json`:
```json
{
    "instanceUrl": "https://your-fedi-instance.com",
    "instanceToken": "your-bot-access-token",
    "botID": "your-bot-account-id",
    "vertexAI": {
      "projectName": "gen-lang-client",
      "projectLocation": "us-central1",
      "authFile": "",
      "apiKey": ""
    },
    "dbPath": "/app/data/context-database.json"
}
```

#### 3. Build and Deploy
```bash
# Build and start the services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker-compose -f docker-compose.prod.yml down -v
```

#### 4. Check Service Status
```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# Check health status
docker-compose -f docker-compose.prod.yml ps fedi-bot
```

### Option 2: Development Deployment

#### 1. Prepare Configuration
```bash
# Copy and configure the environment file
cp .env.example .env
# Edit .env with development credentials
```

#### 2. Start Development Environment
```bash
# Start the development stack
docker-compose -f docker-compose.dev.yml up -d

# For interactive development with live reload
docker-compose -f docker-compose.dev.yml up

# Access the running container
docker-compose -f docker-compose.dev.yml exec fedi-bot bash
```

#### 3. Development Features
- Live code reloading (volume mounting)
- Automatic dependency installation
- Interactive debugging access
- Development logging

### Option 3: Standalone Container

#### 1. Build Image
```bash
# Build the production image
docker build -t my-fedi-bot:latest .

# Build with build arguments
docker build --build-arg NODE_ENV=production -t my-fedi-bot:latest .
```

#### 2. Run Container
```bash
# Basic run
docker run -d \
  --name fedi-bot \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v fedi-bot-data:/app/data \
  -e GEMINI_API_KEY=your-api-key \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6379 \
  my-fedi-bot:latest

# Run with local Redis
docker run -d \
  --name fedi-bot \
  --link redis:redis \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v fedi-bot-data:/app/data \
  -e GEMINI_API_KEY=your-api-key \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=your-redis-password \
  my-fedi-bot:latest
```

## Container Features

### Production Container (Dockerfile)
- Multi-stage build for optimized image size
- Non-root user execution for security
- Health checks for monitoring
- Volume mounting for persistent data
- Production environment configuration
- Automatic cleanup of build artifacts

### Development Container (Dockerfile.dev)
- Full source code mounting for hot-reloading
- Development dependencies included
- Interactive debugging capabilities
- Optimized for development workflow

### Service Orchestration
- Redis/Valkey service for media caching
- Network isolation between containers
- Automatic service dependencies
- Health check integration
- Volume persistence for data

## Volume Management

### Data Persistence
- `bot_data`: Stores the conversation database
- `redis_data`: Stores Redis cache data
- `logs`: (optional) Stores application logs

### Accessing Data
```bash
# Access bot data
docker exec -it fedi-bot-app ls -la /app/data

# Access Redis data
docker exec -it fedi-bot-redis redis-cli -a your-password

# Copy data out of container
docker cp fedi-bot-app:/app/data/context-database.json ./backup-$(date +%Y%m%d).json
```

## Monitoring and Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f fedi-bot
docker-compose -f docker-compose.prod.yml logs -f redis

# Recent logs
docker-compose -f docker-compose.prod.yml logs --tail=100 fedi-bot
```

### Health Checks
```bash
# Check container health
docker inspect fedi-bot-app --format='{{.State.Health.Status}}'

# View health check details
docker inspect fedi-bot-app | grep -A 10 Health
```

### Resource Monitoring
```bash
# View container resource usage
docker stats fedi-bot-app fedi-bot-redis

# View disk usage
docker system df
```

## Security Considerations

### Container Security
- Runs as non-root user (UID 1001)
- Read-only configuration file mounting
- Network isolation between services
- Environment variable secrets management

### Recommended Security Practices
1. **Environment Variables**: Store sensitive data in environment variables, not in configuration files
2. **Network Security**: Use Docker networks to isolate services
3. **Volume Permissions**: Ensure proper permissions for mounted volumes
4. **Image Scanning**: Regularly scan container images for vulnerabilities
5. **Resource Limits**: Consider adding resource limits to containers

## Troubleshooting

### Common Issues

#### Redis Connection Issues
```bash
# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis

# Test Redis connection
docker exec -it fedi-bot-redis redis-cli ping

# Verify Redis password
docker exec -it fedi-bot-redis redis-cli -a your-password ping
```

#### Bot Configuration Issues
```bash
# Check configuration file
docker exec -it fedi-bot-app cat /app/config.json

# Verify environment variables
docker exec -it fedi-bot-app env | grep -E '(REDIS|GEMINI|NODE_ENV)'

# Test application startup
docker exec -it fedi-bot-app bun src/index.ts
```

#### Database Issues
```bash
# Check database file
docker exec -it fedi-bot-app ls -la /app/data/

# Test database access
docker exec -it fedi-bot-app node -e "
const ContextDatabase = require('/app/src/database.ts');
const db = new ContextDatabase('/app/data/context-database.json');
console.log('Database initialized successfully');
"
```

### Debug Mode
```bash
# Run container with debug output
docker run -it --rm \
  -e NODE_ENV=development \
  -e DEBUG=* \
  my-fedi-bot:latest

# Or use development compose
docker-compose -f docker-compose.dev.yml up
```

## Backup and Recovery

### Backup Data
```bash
# Backup database
docker cp fedi-bot-app:/app/data/context-database.json ./backup-$(date +%Y%m%d).json

# Backup Redis data
docker exec fedi-bot-redis redis-cli -a your-password SAVE
docker cp fedi-bot-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# Complete backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker cp fedi-bot-app:/app/data/context-database.json ./backups/db-$TIMESTAMP.json
docker exec fedi-bot-redis redis-cli -a your-password SAVE
docker cp fedi-bot-redis:/data/dump.rdb ./backups/redis-$TIMESTAMP.rdb
```

### Restore Data
```bash
# Restore database
docker cp ./backup-$(date +%Y%m%d).json fedi-bot-app:/app/data/context-database.json
docker restart fedi-bot-app

# Restore Redis data
docker cp ./redis-backup-$(date +%Y%m%d).rdb fedi-bot-redis:/data/dump.rdb
docker restart fedi-bot-redis
```

## Scaling and Performance

### Horizontal Scaling
For multiple bot instances, modify the docker-compose file:

```yaml
services:
  fedi-bot:
    deploy:
      replicas: 3
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
```

### Resource Limits
Add resource constraints to the docker-compose file:

```yaml
services:
  fedi-bot:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## License

This container deployment setup is part of the my-fedi-bot project. Refer to the main project license for usage terms.