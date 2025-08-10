# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management
- **bun info [package] - Get package information (latest version, etc.)**
- `bun install` - Install dependencies
- `bun run start` - Start the bot using `bun src/index.ts`
- `bun run build` or `bun run compile` - Compile TypeScript to JavaScript using `tsc`

### Code Quality
- `bun run lint` - Run linting using Google TypeScript Style (gts)
- `bun run fix` - Automatically fix linting issues
- `bun run clean` - Clean up generated files

### Testing
- `bun test` - Run all tests
- `bun test test/ai.test.ts` - Run AI service tests specifically
- `bun test test/database.test.ts` - Run database tests specifically

### Container Development
- `docker build -t my-fedi-bot:latest .` - Build production container
- `docker build -t my-fedi-bot:dev -f Dockerfile.dev .` - Build development container
- `docker-compose -f docker-compose.dev.yml up` - Start development environment
- `docker-compose -f docker-compose.prod.yml up -d` - Start production environment
- `docker-compose -f docker-compose.prod.yml logs -f` - View production logs

## Architecture Overview

This is a federated social media bot built for Pleroma/Mastodon instances using the megalodon library. The architecture follows a modular design pattern with clear separation of concerns.

### Core Components

**Bot Engine (`src/bot.ts`)**: Central bot controller that handles streaming connections and module management. Uses user streaming API for real-time notifications and dispatches to appropriate module hooks.

**Module System (`src/module.ts`)**: Abstract base class for extensible bot functionality. Modules register hooks for handling mentions and emoji reactions. The `auto-bind` library ensures proper `this` context in all methods.

**Configuration System (`src/config.ts`)**: Loads bot configuration from `config.json` with expected structure:
- `instanceUrl`: Federated instance URL
- `instanceToken`: Bot access token
- `botID`: Bot account ID
- `vertexAI`: Google Gemini AI configuration (apiKey, project name, location, auth file)
- `dbPath`: Database file path (defaults to `context-database.json`)

### Data Layer

**Database (`src/database.ts`)**: Uses LokiJS for in-memory database with persistence. Manages two collections:
- `permittedUsers`: Users authorized to interact with the bot
- `chatContexts`: Conversation history and context for AI interactions (includes mediaUrls array)

**Media Cache (`src/mediacache.ts`)**: Redis-based caching system for media attachments (images, etc.) to reduce network requests and improve performance. Uses environment variables `REDIS_HOST` and `REDIS_PORT` for connection.

**Media Cache (`src/mediacache.ts`)**: Redis-based caching system for media attachments (images, etc.) to reduce network requests and improve performance. Uses environment variables `REDIS_HOST` and `REDIS_PORT` for connection.

### AI Integration

**AI Service (`src/ai.ts`)**: Integrates with Google Gemini AI for conversational capabilities:
- Supports text and multimodal (image) inputs
- Maintains conversation history for contextual responses
- Uses Gemini 2.5 Flash model for responses
- Handles image base64 conversion and caching
- Retrieves cached images from database context for conversations

**Aichat Module (`src/modules/aichat.ts`)**: Implementation of the AI chat functionality:
- Processes mentions from permitted users only
- Handles new conversations and replies to existing threads
- Extracts and processes image attachments
- Maintains conversation context through the database
- Supports slash commands: `/add_user` (direct visibility only)

### Key Design Patterns

**Hook-based Architecture**: Modules register hooks via `installHook()` method returning `MentionHook` and `EmojiReactionHook` functions.

**Streaming-based Processing**: Bot uses real-time user streaming for immediate response to mentions and notifications.

**Permission-based Access**: Bot only responds to users explicitly added to permitted users collection.

**Media Handling**: Images are fetched, converted to base64, cached in Redis, and passed to AI for multimodal processing. Media URLs are also cached in the database context for conversation continuity.

### Configuration Notes

- Requires `config.json` file in project root (see `config.example.json` for template)
- Gemini AI configuration requires API key (simpler than Vertex AI setup)
- Redis connection requires environment variables for host and port
- Bot account must be configured with appropriate permissions on the federated instance

### Testing Structure

Tests use Bun's test runner with proper setup and teardown:
- Database tests create temporary JSON files and clean up after
- AI tests mock actual AI calls to avoid API costs during development
- Tests ensure core functionality of database operations and AI response generation

### Database Test Coverage

The database test suite (`test/database.test.ts`) includes comprehensive coverage of all database operations:
- **Core Operations**: `newChatContext`, `extendChatContent`, `getAllChatContext`
- **User Management**: `addPermittedUser`, `isPermittedUser`, `removePermittedUser`
- **Media URL Handling**: `getMediaUrlsFromContext` with various scenarios
- **Error Handling**: Proper error throwing for non-existent contexts and duplicate operations
- **Edge Cases**: Empty media URL arrays, duplicate user additions, and mixed media scenarios

**Total Test Count**: 16 tests covering all major functionality and error conditions

### Current Development Status

**Recent Updates (0b0d035):**
- Added comprehensive database test coverage with 16 total tests
- Implemented complete Docker containerization using Bun runtime
- Enhanced media URL functionality and error handling
- Added production-ready container orchestration with Redis
- Improved development workflow with hot-reloading containers

**Key Improvements:**
- **Enhanced Testing**: Added 10 new database tests covering media URL operations, error handling, and edge cases
- **Containerization**: Complete Docker support with multi-stage builds using `oven/bun:1-alpine` base image
- **Deployment**: Production and development docker-compose configurations with health checks
- **Performance**: Optimized container images with non-root user execution and security best practices
- **Developer Experience**: Hot-reloading development containers with volume mounting
- **Documentation**: Comprehensive deployment guide with troubleshooting and scaling options

## Container Deployment

The application includes comprehensive Docker containerization support with multiple deployment options:

### Container Files
- **`Dockerfile`** - Production-optimized multi-stage build using Bun runtime
- **`Dockerfile.dev`** - Development container with hot-reloading and Bun
- **`docker-compose.prod.yml`** - Production orchestration with Redis and health checks
- **`docker-compose.dev.yml`** - Development environment with volume mounting
- **`.dockerignore`** - Build optimization excluding unnecessary files
- **`CONTAINER_DEPLOYMENT.md`** - Complete deployment guide with troubleshooting

### Quick Start with Docker
```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Container Features
- **Bun Runtime**: Uses `oven/bun:1-alpine` base image for optimal performance
- Multi-stage builds for optimized image size
- Non-root user execution for security (UID 1001)
- Redis/Valkey service for media caching with health checks
- Volume persistence for database and logs
- Environment variable configuration for secrets and settings
- Development hot-reloading with volume mounting
- Production health checks and monitoring
- Security best practices with read-only configuration mounts

### Deployment Options
- **Production**: Optimized containers with Redis caching
- **Development**: Hot-reloading with volume mounting
- **Standalone**: Single container deployment
- **Scaled**: Multiple bot instances with shared Redis

For complete deployment instructions, see `CONTAINER_DEPLOYMENT.md`.