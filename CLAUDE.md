# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
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

## Architecture Overview

This is a federated social media bot built for Pleroma/Mastodon instances using the megalodon library. The architecture follows a modular design pattern with clear separation of concerns.

### Core Components

**Bot Engine (`src/bot.ts`)**: Central bot controller that handles streaming connections and module management. Uses user streaming API for real-time notifications and dispatches to appropriate module hooks.

**Module System (`src/module.ts`)**: Abstract base class for extensible bot functionality. Modules register hooks for handling mentions and emoji reactions. The `auto-bind` library ensures proper `this` context in all methods.

**Configuration System (`src/config.ts`)**: Loads bot configuration from `config.json` with expected structure:
- `instanceUrl`: Federated instance URL
- `instanceToken`: Bot access token
- `botID`: Bot account ID
- `vertexAI`: Google Vertex AI configuration (project name, location, auth file, API key)
- `dbPath`: Database file path (defaults to `context-database.json`)

### Data Layer

**Database (`src/database.ts`)**: Uses LokiJS for in-memory database with persistence. Manages two collections:
- `permittedUsers`: Users authorized to interact with the bot
- `chatContexts`: Conversation history and context for AI interactions

**Media Cache (`src/mediacache.ts`)**: Redis-based caching system for media attachments (images, etc.) to reduce network requests and improve performance. Uses environment variables `REDIS_HOST` and `REDIS_PORT` for connection.

### AI Integration

**AI Service (`src/ai.ts`)**: Integrates with Google Gemini AI for conversational capabilities:
- Supports text and multimodal (image) inputs
- Maintains conversation history for contextual responses
- Uses Gemini 1.5 Flash model for responses
- Handles image base64 conversion and caching

**Aichat Module (`src/modules/aichat.ts`)**: Implementation of the AI chat functionality:
- Processes mentions from permitted users only
- Handles new conversations and replies to existing threads
- Extracts and processes image attachments
- Maintains conversation context through the database

### Key Design Patterns

**Hook-based Architecture**: Modules register hooks via `installHook()` method returning `MentionHook` and `EmojiReactionHook` functions.

**Streaming-based Processing**: Bot uses real-time user streaming for immediate response to mentions and notifications.

**Permission-based Access**: Bot only responds to users explicitly added to permitted users collection.

**Media Handling**: Images are fetched, converted to base64, cached in Redis, and passed to AI for multimodal processing.

### Configuration Notes

- Requires `config.json` file in project root (see `config.example.json` for template)
- Vertex AI configuration needs Google Cloud service account authentication
- Redis connection requires environment variables for host and port
- Bot account must be configured with appropriate permissions on the federated instance

### Testing Structure

Tests use Bun's test runner with proper setup and teardown:
- Database tests create temporary JSON files and clean up after
- AI tests mock actual AI calls to avoid API costs during development
- Tests ensure core functionality of database operations and AI response generation