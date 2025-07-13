# MCP Server & Mem0 Integration for Document Companion

This document outlines the integration of the Meta-Cognitive Processor (MCP) Server and the `Mem0` personalized memory service into the Document Companion application. This powerful combination enables advanced, stateful AI capabilities.

## 🧠 What This Adds

### MCP Server Features
- **Direct Data Access**: Ollama can now directly read/write annotations, bookmarks, and user data
- **Real-time Communication**: WebSocket-based communication between AI and your app
- **Structured Tool Calls**: Standardized way for AI to interact with your app's storage
- **Context Awareness**: AI knows what you're reading, your notes, and your patterns

### Mem0 Memory System
- **Persistent Memory**: AI remembers conversations, preferences, and insights across sessions
- **Pattern Recognition**: Analyzes your study habits and provides personalized recommendations
- **Smart Retrieval**: Finds relevant past conversations and notes when answering questions
- **User Profiling**: Builds understanding of your favorite books, themes, and study times

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install @modelcontextprotocol/sdk mem0ai ws
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Mem0 Configuration (optional - will use local mode if not provided)
MEM0_API_KEY=your_mem0_api_key_here

# MCP Configuration
MCP_ENABLED=true
MCP_PORT=3001

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama2
```

### 3. Start the Services

```bash
# Start everything together
npm run dev:full

# Or start individually
npm run dev          # Main app
npm run agents:start # AI agents
npm run mcp:server   # MCP server
```

## 🔧 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Agents     │
│   (React)       │◄──►│   (Express)     │◄──►│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Local Storage │    │   MCP Server    │
                       │   (PostgreSQL)  │    │   (WebSocket)   │
                       └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Mem0 Memory   │
                                              │   (Local/Cloud) │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Ollama LLM    │
                                              │   (Local AI)    │
                                              └─────────────────┘
```

## 🛠 Available MCP Tools

The MCP server provides these tools for Ollama to use:

### Data Access Tools
- `get_user_annotations` - Retrieve all user annotations
- `get_annotations_by_chapter` - Get annotations for specific chapter
- `create_annotation` - Create new annotation
- `get_user_bookmarks` - Get user bookmarks
- `get_reading_progress` - Get reading progress
- `search_documents` - Search through documents
- `get_user_documents` - Get all user documents

### Memory Tools
- `store_memory` - Store information in AI memory
- `retrieve_memories` - Find relevant memories
- `get_user_study_patterns` - Analyze study patterns

## 💡 Smart Features

### 1. Enhanced Chat
```javascript
// AI now has context about your reading
const response = await mcpIntegration.enhancedChat(
  sessionId,
  "What themes have I been studying lately?",
  true // Include context from memories and annotations
);
```

### 2. Behavioral Analysis
```javascript
// AI analyzes your study patterns
const analysis = await mcpIntegration.analyzeUserBehavior(userId);
// Returns insights about favorite books, themes, reading habits
```

### 3. Personalized Insights
```javascript
// AI generates insights based on your patterns
const insights = await mcpIntegration.generatePersonalizedInsights(userId);
// Returns customized study recommendations
```

### 4. Smart Search
```javascript
// AI-enhanced search with memory context
const results = await mcpIntegration.smartSearch(userId, "faith and works");
// Returns documents + related memories + AI insights
```

## 🎯 Usage Examples

### Example 1: Context-Aware Chat
```typescript
// User asks about a topic they've studied before
const sessionId = await agentManager.createMCPSession(userId);
const response = await mcpIntegration.enhancedChat(
  sessionId,
  "Can you explain the parable of the talents again?",
  true
);
// AI remembers previous discussions and builds on them
```

### Example 2: Study Pattern Analysis
```typescript
// Get insights about user's study habits
const patterns = await memoryService.getUserStudyPatterns(userId);
console.log(patterns);
// Output:
// {
//   favoriteBooks: ["Matthew", "Romans", "Psalms"],
//   commonThemes: ["faith", "love", "redemption"],
//   studyTimes: ["morning", "evening"],
//   annotationFrequency: 2.5,
//   preferredTopics: ["parables", "epistles"]
// }
```

### Example 3: Smart Recommendations
```typescript
// AI suggests what to study next based on patterns
const insights = await mcpIntegration.generatePersonalizedInsights(userId);
// Returns:
// - Related passages based on favorite books
// - Thematic connections from past studies
// - Optimal study schedule suggestions
// - Ways to deepen engagement
```

## 🔧 Configuration Options

### MCP Server Config
```typescript
const mcpServer = new DocumentCompanionMCPServer({
  enableMemory: true,
  memoryMode: 'local', // or 'cloud'
  logLevel: 'info'
});
```

### Memory Service Config
```