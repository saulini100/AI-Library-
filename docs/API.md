# DocumentCompanion API Documentation

## 📋 Table of Contents

- [🚀 Getting Started](#-getting-started)
- [🔐 Authentication](#-authentication)
- [📚 Document Management](#-document-management)
- [🤖 AI Services](#-ai-services)
- [📝 User Features](#-user-features)
- [🔍 Search & Analytics](#-search--analytics)
- [⚡ Performance & Monitoring](#-performance--monitoring)
- [🌐 Real-time Communication](#-real-time-communication)
- [🔧 Configuration](#-configuration)
- [❌ Error Handling](#-error-handling)
- [📊 Rate Limiting](#-rate-limiting)
- [🔄 Versioning](#-versioning)

## 🚀 Getting Started

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Content Type
All requests should use `application/json` content type unless specified otherwise.

### Response Format
All API responses follow this structure:
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string | null,
  "timestamp": string,
  "requestId": string
}
```

## 🔐 Authentication

### Session-based Authentication
The API uses session-based authentication with HTTP cookies.

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe"
    },
    "sessionId": "sess_abc123"
  },
  "message": "Login successful"
}
```

#### Logout
```http
POST /api/auth/logout
```

#### Get Current User
```http
GET /api/auth/me
```

## 📚 Document Management

### Upload Document
```http
POST /api/documents
Content-Type: multipart/form-data

file: [PDF/TXT file]
title: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "My Document",
    "filename": "document.pdf",
    "fileType": "pdf",
    "totalChapters": 15,
    "createdAt": "2024-01-15T10:30:00Z",
    "processingStatus": "completed"
  }
}
```

### Get Documents
```http
GET /api/documents?userId=1&limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": 1,
        "title": "Document Title",
        "totalChapters": 15,
        "createdAt": "2024-01-15T10:30:00Z",
        "progress": {
          "completedChapters": 5,
          "percentage": 33.3
        }
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

### Get Document Info
```http
GET /api/documents/:id/info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Document Title",
    "filename": "document.pdf",
    "fileType": "pdf",
    "totalChapters": 15,
    "createdAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "wordCount": 50000,
      "averageReadingTime": "3.5 hours",
      "language": "en",
      "topics": ["spirituality", "philosophy"]
    }
  }
}
```

### Get Chapter Content
```http
GET /api/documents/:id/chapters/:chapter
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chapter": {
      "number": 1,
      "title": "Chapter Title",
      "paragraphs": [
        {
          "number": 1,
          "text": "Chapter content paragraph..."
        }
      ]
    },
    "navigation": {
      "previousChapter": null,
      "nextChapter": 2,
      "totalChapters": 15
    }
  }
}
```

### Delete Document
```http
DELETE /api/documents/:id
```

## 🤖 AI Services

### Chat with AI Agents
```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Explain this passage about creation",
  "agentType": "discussion",
  "context": {
    "documentId": 1,
    "chapter": 3,
    "selectedText": "In the beginning...",
    "userId": 1,
    "language": "en"
  },
  "sessionId": "chat_session_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "The passage about creation represents...",
    "agentType": "discussion",
    "confidence": 0.92,
    "sources": [
      {
        "documentId": 1,
        "chapter": 3,
        "paragraph": 1,
        "relevance": 0.89
      }
    ],
    "relatedQuestions": [
      "What does this mean in historical context?",
      "How does this relate to modern understanding?"
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Generate Power Summary
```http
POST /api/ai-power-summary
Content-Type: application/json

{
  "documentId": 1,
  "chapter": 3,
  "userId": 1,
  "summaryType": "comprehensive",
  "language": "en",
  "options": {
    "includeInsights": true,
    "includeThemes": true,
    "includeActionablePoints": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "id": 1,
      "chapterTitle": "The Creation Story",
      "powerSummary": "This chapter explores the foundational narrative...",
      "keyInsights": [
        "The text emphasizes divine intentionality",
        "Progressive revelation of creation order"
      ],
      "mainThemes": [
        "Divine sovereignty",
        "Order from chaos",
        "Human dignity"
      ],
      "actionablePoints": [
        "Reflect on purpose and meaning",
        "Consider stewardship responsibilities"
      ],
      "confidence": 0.94,
      "processingTime": "2.3s"
    }
  }
}
```

### Request Document Analysis
```http
POST /api/ai/analyze
Content-Type: application/json

{
  "documentId": 1,
  "chapter": 3,
  "analysisType": "themes",
  "options": {
    "depth": "standard",
    "includeKeywords": true,
    "includeSentiment": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "themes": [
        {
          "theme": "Divine Creation",
          "confidence": 0.95,
          "passages": [
            {
              "paragraph": 1,
              "text": "In the beginning God created..."
            }
          ]
        }
      ],
      "keywords": [
        { "word": "creation", "frequency": 12, "relevance": 0.89 },
        { "word": "divine", "frequency": 8, "relevance": 0.76 }
      ],
      "sentiment": {
        "overall": "positive",
        "confidence": 0.82,
        "emotional_tone": "reverent"
      },
      "readability": {
        "score": 7.2,
        "level": "intermediate"
      }
    }
  }
}
```

### Get AI Agent Status
```http
GET /api/agents/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "name": "TextAnalysisAgent",
        "status": "active",
        "processedTasks": 1247,
        "averageResponseTime": "1.2s",
        "queueSize": 3
      },
      {
        "name": "DiscussionAgent",
        "status": "active",
        "processedTasks": 892,
        "averageResponseTime": "2.1s",
        "queueSize": 1
      }
    ],
    "systemHealth": "excellent",
    "totalUptime": "7d 14h 32m"
  }
}
```

## 📝 User Features

### Annotations

#### Get Annotations
```http
GET /api/annotations?documentId=1&chapter=3&userId=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "annotations": [
      {
        "id": 1,
        "documentId": 1,
        "chapter": 3,
        "paragraph": 1,
        "selectedText": "In the beginning God created",
        "note": "This is a foundational verse",
        "type": "user",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

#### Create Annotation
```http
POST /api/annotations
Content-Type: application/json

{
  "documentId": 1,
  "chapter": 3,
  "paragraph": 1,
  "selectedText": "In the beginning God created",
  "note": "This is a foundational verse",
  "type": "user"
}
```

#### Update Annotation
```http
PUT /api/annotations/:id
Content-Type: application/json

{
  "note": "Updated annotation text"
}
```

#### Delete Annotation
```http
DELETE /api/annotations/:id
```

### Bookmarks

#### Get Bookmarks
```http
GET /api/bookmarks?userId=1&limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookmarks": [
      {
        "id": 1,
        "documentId": 1,
        "documentTitle": "Genesis",
        "chapter": 1,
        "paragraph": 1,
        "title": "Creation Beginning",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

#### Create Bookmark
```http
POST /api/bookmarks
Content-Type: application/json

{
  "documentId": 1,
  "chapter": 1,
  "paragraph": 1,
  "title": "Creation Beginning"
}
```

#### Delete Bookmark
```http
DELETE /api/bookmarks/:id
```

### Reading Progress

#### Get Reading Progress
```http
GET /api/reading-progress?userId=1&documentId=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "documentId": 1,
        "chapter": 1,
        "completed": 1,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "summary": {
      "totalChapters": 15,
      "completedChapters": 5,
      "percentage": 33.3,
      "estimatedTimeRemaining": "2.5 hours"
    }
  }
}
```

#### Update Reading Progress
```http
POST /api/reading-progress
Content-Type: application/json

{
  "documentId": 1,
  "chapter": 3,
  "completed": 1
}
```

## 🔍 Search & Analytics

### Semantic Search
```http
POST /api/search
Content-Type: application/json

{
  "query": "creation of the world",
  "userId": 1,
  "filters": {
    "documentIds": [1, 2],
    "chapters": [1, 2, 3]
  },
  "options": {
    "maxResults": 10,
    "includeContext": true,
    "searchType": "semantic"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "documentId": 1,
        "documentTitle": "Genesis",
        "chapter": 1,
        "paragraph": 1,
        "text": "In the beginning God created the heavens and the earth",
        "context": "The opening verse of the creation narrative...",
        "relevance": 0.94,
        "highlights": ["creation", "world"]
      }
    ],
    "total": 1,
    "processingTime": "0.8s",
    "queryAnalysis": {
      "intent": "information_seeking",
      "topics": ["creation", "cosmology"]
    }
  }
}
```

### Search Analytics
```http
GET /api/analytics/search?userId=1&period=7d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalSearches": 156,
      "averageResultsPerSearch": 8.3,
      "topQueries": [
        { "query": "creation", "count": 23 },
        { "query": "love", "count": 18 }
      ],
      "searchPatterns": {
        "mostActiveHour": 19,
        "preferredSearchType": "semantic"
      }
    }
  }
}
```

## ⚡ Performance & Monitoring

### System Performance
```http
GET /api/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "uptime": "7d 14h 32m",
      "memoryUsage": "45.2%",
      "cpuUsage": "12.8%",
      "diskUsage": "23.1%"
    },
    "database": {
      "connectionCount": 8,
      "averageQueryTime": "15ms",
      "slowQueries": 2
    },
    "ai": {
      "averageResponseTime": "1.8s",
      "processedRequests": 1247,
      "errorRate": "0.3%"
    },
    "cache": {
      "hitRate": "89.2%",
      "memoryUsage": "156MB",
      "evictionCount": 23
    }
  }
}
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": "healthy",
      "ollama": "healthy",
      "agents": "healthy",
      "fileSystem": "healthy"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🌐 Real-time Communication

### WebSocket Connection
```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000', {
  auth: {
    sessionId: 'your-session-id'
  }
});

// Listen for events
socket.on('chatResponse', (data) => {
  console.log('AI Response:', data);
});

socket.on('analysisCompleted', (data) => {
  console.log('Analysis Complete:', data);
});
```

### WebSocket Events

#### Client → Server Events
```javascript
// Send chat message
socket.emit('chatMessage', {
  message: 'Explain this passage',
  agentType: 'discussion',
  context: {
    documentId: 1,
    chapter: 3,
    userId: 1
  }
});

// Request analysis
socket.emit('requestAnalysis', {
  documentId: 1,
  chapter: 3,
  analysisType: 'themes'
});

// Get agent status
socket.emit('requestAgentStatus');
```

#### Server → Client Events
```javascript
// Chat response
socket.on('chatResponse', {
  response: 'AI generated response...',
  agentType: 'discussion',
  confidence: 0.92
});

// Analysis completed
socket.on('analysisCompleted', {
  documentId: 1,
  chapter: 3,
  analysis: { /* analysis results */ }
});

// System status update
socket.on('systemStatus', {
  agents: [/* agent status */],
  performance: { /* performance metrics */ }
});
```

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=./local-document-companion.db

# AI Services
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
# Removed: AI Together API integration (now using Ollama only)

# Server
PORT=5000
NODE_ENV=development

# Features
ENABLE_VOICE_FEATURES=true
ENABLE_TRANSLATION=true
ENABLE_ANALYTICS=true
```

### Get Configuration
```http
GET /api/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "features": {
      "voiceFeatures": true,
      "translation": true,
      "analytics": true,
      "multiModel": true
    },
    "limits": {
      "maxFileSize": "50MB",
      "maxDocuments": 100,
      "maxAnnotations": 10000
    },
    "version": "1.0.0"
  }
}
```

## ❌ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document with ID 123 not found",
    "details": {
      "documentId": 123,
      "userId": 1
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_abc123"
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `AI_SERVICE_UNAVAILABLE`: AI service temporarily unavailable
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## 📊 Rate Limiting

### Rate Limits
- **General API**: 100 requests per minute per user
- **AI Services**: 10 requests per minute per user
- **File Upload**: 5 uploads per minute per user
- **Search**: 20 searches per minute per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## 🔄 Versioning

### API Versioning
The API uses URL path versioning:
```
/api/v1/documents
/api/v2/documents
```

### Version Information
```http
GET /api/version
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiVersion": "1.0.0",
    "supportedVersions": ["1.0.0"],
    "deprecatedVersions": [],
    "releaseNotes": "https://docs.biblecompanion.dev/changelog"
  }
}
```

## 📝 Usage Examples

### Complete Document Processing Workflow
```javascript
// 1. Upload document
const uploadResponse = await fetch('/api/documents', {
  method: 'POST',
  body: formData
});

// 2. Get document content
const contentResponse = await fetch('/api/documents/1/chapters/1');

// 3. Generate AI summary
const summaryResponse = await fetch('/api/ai-power-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 1,
    chapter: 1,
    userId: 1
  })
});

// 4. Create annotation
const annotationResponse = await fetch('/api/annotations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 1,
    chapter: 1,
    selectedText: 'Important passage',
    note: 'My thoughts on this passage'
  })
});
```

### AI Chat Integration
```javascript
// Initialize WebSocket connection
const socket = io('http://localhost:5000');

// Send chat message
socket.emit('chatMessage', {
  message: 'What is the significance of this passage?',
  agentType: 'discussion',
  context: {
    documentId: 1,
    chapter: 3,
    selectedText: 'In the beginning...',
    userId: 1
  }
});

// Handle response
socket.on('chatResponse', (data) => {
  console.log('AI Response:', data.response);
  console.log('Confidence:', data.confidence);
  console.log('Sources:', data.sources);
});
```

---

This API documentation provides comprehensive coverage of all available endpoints and features. For additional support, please refer to the [main documentation](../README.md) or contact the development team. 