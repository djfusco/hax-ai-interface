# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

HAX AI Interface is an npm package that creates a conversational interface for building HAX-powered websites. It provides both CLI tools and a web-based interface for managing HAX sites through natural language commands.

**Key Innovation**: Resource-first content generation system that allows faculty and educators to upload course materials (PDFs, documents, URLs) and generate rich, contextual website content based on their specific curriculum rather than generic AI knowledge.

## Key Architecture Components

### Core Architecture
- **Entry Point**: `bin/hax-ai.js` - Main CLI executable with setup wizard and server launcher
- **Web Server**: `lib/server.js` - Express server providing REST API and static file serving
- **AI Processor**: `lib/ai-processor.js` - Hybrid AI system supporting OpenAI, Anthropic, and pattern matching fallbacks
- **Frontend**: `public/index.html` - Single-page web interface for conversational site management

### Data Flow
1. User interacts via CLI (`npx hax-ai-interface`) or web interface
2. Commands processed by SmartAIProcessor with PRAW rules integration
3. HAX CLI commands executed in managed site directories
4. Site servers run on dynamically assigned ports (3005+)
5. Deployment managed through Surge.sh integration

### Site Management System
- Sites stored in `~/.hax-ai/sites/` with individual directories
- Port assignments persist across restarts via PortManager
- Deployment tracking via DeploymentManager for Surge.sh URLs
- Each site maintains its own `site.json` configuration

### Faculty-Setup Resource System
- Faculty-resources folder per site: `~/.hax-ai/sites/[sitename]/faculty-resources/`
- PDF text extraction using pdf-parse for textbooks and documents
- URL resource tracking via resources.json metadata file
- Resource-first content generation prioritizes uploaded materials over generic AI

## Essential Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Start production server
npm start

# Test the CLI locally
node bin/hax-ai.js

# Reset configuration (useful during development)
node bin/hax-ai.js --reset
```

### Testing the Package
```bash
# Test CLI installation flow
npx . --help

# Test with different ports
npx . --port 3002

# Test in a clean environment
npx . --reset
```

### Publishing
```bash
# Prepare for publishing (runs prepublishOnly script)
npm publish

# Check package contents before publishing
npm pack
tar -tf hax-ai-interface-*.tgz
```

## Key Configuration Files

### Environment Configuration
- `templates/.env.example` - Template for user environment variables
- User config stored in `~/.hax-ai/.env` (created during first run)
- Supports OPENAI_API_KEY, ANTHROPIC_API_KEY, and SURGE_* variables

### Package Configuration
- Main executable: `bin/hax-ai.js`
- Library code: `lib/server.js`, `lib/ai-processor.js`
- Static assets: `public/` directory
- Files included in npm package defined in `package.json` files array

## AI System Architecture

### SmartAIProcessor Features
- **Hybrid Approach**: Uses AI APIs when available, falls back to pattern matching
- **PRAW Rules Integration**: Fetches and applies HAX ecosystem rules from GitHub
- **Multi-Provider Support**: OpenAI GPT-3.5-turbo or Anthropic Claude
- **Conversation Memory**: Maintains context across user interactions
- **Command Validation**: Ensures generated commands follow HAX best practices
- **Resource-First Processing**: Prioritizes uploaded course materials in content generation
- **PDF Text Extraction**: Automatically extracts and indexes text from uploaded PDFs

### Key AI Processing Methods
- `process()` - Main entry point, routes to AI or pattern matching
- `processWithAI()` - Handles OpenAI/Anthropic API calls with context
- `processWithPatterns()` - Fallback pattern matching for common operations
- `buildSystemPrompt()` - Constructs context-aware prompts with PRAW rules
- `buildResourcesSummary()` - Extracts and summarizes content from uploaded resources
- `extractTextFromResource()` - Handles PDF, text, and document processing
- `generateBasicContentFromResources()` - Creates content using uploaded materials as primary source

## Server Management

### Port Management System
- **Reserved Ports**: 3000-3004 (common development ports + main app)
- **Dynamic Allocation**: Sites assigned ports starting from 3005
- **Persistent Assignments**: Port assignments survive server restarts
- **Collision Avoidance**: Automatic port availability checking

### Site Server Lifecycle
- Sites can be started/stopped/restarted independently
- Each site runs its own HAX development server
- Process management with proper cleanup on shutdown
- Error handling with status reporting to frontend

## Development Workflow

### Adding New AI Commands
1. Update pattern matching in `ai-processor.js` `processWithPatterns()`
2. Add corresponding HAX CLI command mappings
3. Test both with and without AI API keys
4. Ensure commands work in site-specific contexts

### Modifying the Web Interface
1. Edit `public/index.html` (single-page application)
2. Test with live sites and various server states
3. Verify API endpoint integration
4. Check responsive design across devices

### Extending Site Management
1. Update server endpoints in `lib/server.js`
2. Modify PortManager or DeploymentManager as needed
3. Ensure proper cleanup in deletion workflows
4. Test with multiple concurrent sites

## Dependencies and Integration

### Core HAX Dependencies
- `@haxtheweb/create` - Primary HAX CLI functionality
- Site structure follows HAX conventions with `site.json`
- Build process uses HAX's built-in npm scripts

### AI/ML Dependencies
- `@langchain/openai`, `@langchain/anthropic` - AI provider SDKs
- `@langchain/core`, `@langchain/langgraph` - Agent framework (fallback disabled for stability)
- `axios` - HTTP client for PRAW rules fetching
- `marked` - Markdown parsing for rules integration
- `pdf-parse` - PDF text extraction for course materials
- `multer` - File upload handling for resource management

### Development Tools
- `nodemon` - Development server with auto-restart
- `inquirer` - Interactive CLI prompts during setup
- `chalk`, `ora` - CLI styling and progress indicators

## Deployment Considerations

### Package Distribution
- Configured for public npm registry
- Uses `preferGlobal: false` to work with npx
- Includes comprehensive file filtering in package.json
- Post-install message guides users to first run

### User Environment Setup
- Creates `~/.hax-ai/` directory structure on first run
- Handles global dependency installation (HAX CLI, Surge CLI)
- Validates system requirements (Node.js 16+)
- Provides setup wizard for API key configuration

### Surge.sh Integration
- Automatic domain generation with timestamps
- Existing domain reuse for redeployments
- Login status checking and validation
- Build process integration with HAX CLI

## Common Development Patterns

### Error Handling
- Graceful degradation when AI APIs unavailable
- Comprehensive logging with debug modes
- User-friendly error messages in web interface
- Command execution with timeout protection

### State Management
- In-memory tracking of site servers and ports
- Persistent configuration in user directories
- Conversation history for AI context
- Deployment history for redeployment workflows

### Security Considerations
- Path validation for file operations (prevents directory traversal)
- API key masking in configuration endpoints
- Environment variable isolation
- Process cleanup on shutdown signals