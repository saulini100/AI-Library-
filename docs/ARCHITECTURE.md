# DocumentCompanion Architecture Documentation

## 🏗️ System Overview

DocumentCompanion is a modern, AI-powered document learning platform built with a microservices-inspired architecture that emphasizes modularity, scalability, and maintainability.

### **Core Principles**
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **AI-First Design**: AI agents as first-class citizens in the architecture
- **Performance-Oriented**: Caching, optimization, and efficient data flow
- **Extensible**: Plugin-based architecture for new features
- **Type-Safe**: End-to-end TypeScript implementation

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  React Frontend (TypeScript)                                   │
│  ├── Components (UI)                                          │
│  ├── Pages (Routes)                                           │
│  ├── Hooks (Logic)                                            │
│  ├── Contexts (State)                                         │
│  └── Services (API)                                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Server Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Node.js + Express + Socket.IO                                 │
│  ├── Routes (API Endpoints)                                   │
│  ├── Services (Business Logic)                                │
│  ├── Agents (AI System)                                       │
│  └── Database Layer                                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
├─────────────────────────────────────────────────────────────────┤
│  ├── Ollama (Local AI Models)                                 │
│  ├── SQLite (Local Database)                                  │
│  ├── File System (Document Storage)                           │
│  └── Web APIs (Enhanced Features)                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Frontend Architecture

### **Component Hierarchy**
```
App
├── LanguageProvider
├── ThemeProvider
├── AgentSocketProvider
├── QueryClientProvider
└── Router
    ├── DocumentLibrary
    ├── DocumentReader
    │   ├── DocumentContent
    │   ├── SidebarNew
    │   ├── AIAgentChat
    │   ├── AIVoiceReader
    │   └── AnnotationModal
    ├── PerformanceDashboard
    ├── AgentDashboard
    └── SearchPage
```

### **State Management**
- **React Query**: Server state management and caching
- **React Context**: Global state (theme, language, agent socket)
- **Local Storage**: Persistent user preferences
- **Component State**: Local UI state

### **Data Flow**
```
User Action → Component → Custom Hook → API Service → Server
     ↓
Local State Update ← React Query Cache ← API Response
```

### **Key Frontend Components**

#### **DocumentReader**
- Main reading interface with chapter navigation
- Integrates AI features (chat, voice, annotations)
- Handles reading progress and bookmarks
- Responsive design with mobile optimization

#### **AIAgentChat**
- Real-time communication with AI agents
- WebSocket-based messaging
- Context-aware conversations
- Multi-language support

#### **AIVoiceReader**
- Advanced text-to-speech with 40+ voices
- AI-enhanced reading with emphasis and pacing
- Progress tracking and navigation
- Voice customization options

#### **DocumentLibrary**
- Document management and organization
- Upload functionality with drag-and-drop
- Search and filtering capabilities
- Progress tracking visualization

## 🔧 Backend Architecture

### **Service Layer Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │   AI Agents     │    │   Services      │
│                 │    │                 │    │                 │
│ • Documents     │    │ • TextAnalysis  │    │ • OllamaService │
│ • Annotations   │    │ • Discussion    │    │ • DocumentRAG   │
│ • Bookmarks     │    │ • StudyAssist   │    │ • SemanticSearch│
│ • AI Endpoints  │    │ • QuizAgent     │    │ • Translation   │
│ • Performance   │    │ • InsightGen    │    │ • CacheService  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Database Layer │
                    │                 │
                    │ • SQLite        │
                    │ • Drizzle ORM   │
                    │ • Migrations    │
                    └─────────────────┘
```

### **AI Agent System**

#### **Agent Manager**
Central coordinator that manages all AI agents:
- Agent lifecycle management
- Message routing and coordination
- Resource allocation and optimization
- Performance monitoring
- Cross-agent communication

#### **Agent Types**
1. **TextAnalysisAgent**: Document processing and analysis
2. **DiscussionAgent**: Interactive conversations
3. **StudyAssistantAgent**: Learning support
4. **QuizAgent**: Assessment generation
5. **InsightGenerationAgent**: Deep analysis
6. **LearningAgent**: Adaptive learning

#### **Agent Communication**
```typescript
interface AgentMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'BROADCAST';
  agentId: string;
  payload: any;
  timestamp: Date;
  priority: number;
}
```

### **Database Schema**

#### **Core Tables**
```sql
-- Documents and content
documents (id, userId, title, content, metadata)
annotations (id, documentId, userId, selectedText, note)
bookmarks (id, documentId, userId, chapter, title)
reading_progress (id, userId, documentId, chapter, completed)

-- AI system
ai_memories (id, userId, content, category, embedding)
power_summaries (id, documentId, chapter, summary, insights)
learned_definitions (id, term, definition, confidence)

-- Performance optimization
embedding_cache (id, text_hash, embedding, access_count)
query_result_cache (id, query_hash, result, metadata)
```

#### **Relationships**
- Users have many Documents
- Documents have many Annotations, Bookmarks, PowerSummaries
- AI Memories are linked to Users and Documents
- Cache tables are optimized for performance

## 🤖 AI System Architecture

### **Multi-Model Integration**
```typescript
interface AIModel {
  name: string;
  capabilities: ModelCapability[];
  performance: PerformanceMetrics;
  isAvailable(): boolean;
  process(input: string, context: any): Promise<any>;
}
```

### **Supported Models**
- **qwen2.5:7b-instruct**: General reasoning and analysis
- **llama3.2:3b**: Fast processing and summarization
- **gemma3n:e2b**: Nuanced content specialization
- **mistral:7b**: Creative insights and explanations

### **RAG (Retrieval-Augmented Generation)**
```
User Query → Embedding Generation → Semantic Search → Context Building → AI Response
     ↓                                                                      ↑
Query Analysis → Document Retrieval → Relevance Ranking → Context Injection
```

#### **RAG Components**
1. **Embedding Service**: Generate and cache text embeddings
2. **Semantic Search**: Find relevant document sections
3. **Context Builder**: Assemble relevant information
4. **Response Generator**: Create contextual answers

### **Agent Coordination**
```typescript
interface AgentCoordinator {
  coordinateRAGQuery(query: string, context: RAGContext): Promise<RAGResponse>;
  buildCrossAgentContext(query: string): Promise<AgentContext>;
  shareInsights(insights: any, targetAgents: string[]): Promise<void>;
  getPerformanceMetrics(): AgentMetrics;
}
```

## 🔄 Data Flow Architecture

### **Request Processing Flow**
```
1. Client Request → API Route Handler
2. Route Handler → Service Layer
3. Service Layer → Database/AI Agent
4. Response Processing → Client Update
5. Cache Update → Performance Optimization
```

### **AI Processing Flow**
```
1. User Input → Agent Manager
2. Agent Selection → Context Building
3. Model Processing → Response Generation
4. Response Validation → Client Delivery
5. Learning Update → Performance Metrics
```

### **Real-time Communication**
```typescript
// WebSocket Architecture
Client ←→ Socket.IO ←→ Agent Manager ←→ AI Agents
   ↓                                      ↓
Local State                         Processing Queue
```

## 🚀 Performance Architecture

### **Caching Strategy**
1. **Embedding Cache**: Semantic search optimization
2. **Query Result Cache**: Response caching
3. **Memory Cache**: Frequently accessed data
4. **Browser Cache**: Static assets and API responses

### **Optimization Techniques**
- **Lazy Loading**: Component and route splitting
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Batch Processing**: Grouped operations

### **Monitoring & Analytics**
```typescript
interface PerformanceMetrics {
  responseTime: number;
  cacheHitRate: number;
  agentProcessingTime: number;
  databaseQueryTime: number;
  memoryUsage: number;
}
```

## 🔐 Security Architecture

### **Authentication & Authorization**
- **Session Management**: Secure user sessions
- **Input Validation**: Comprehensive sanitization
- **Access Control**: Role-based permissions
- **Audit Logging**: Security event tracking

### **Data Protection**
- **Local Processing**: AI processing on-device
- **Encryption**: Data encryption at rest
- **Secure Communication**: HTTPS/WSS protocols
- **Privacy**: No external data sharing

## 🌐 Deployment Architecture

### **Development Environment**
```bash
# Local development stack
npm run dev          # Frontend development server
npm run dev:full     # Full system with AI agents
npm run db:studio    # Database management
```

### **Production Deployment**
```bash
# Production build
npm run build        # Optimized production build
npm start            # Production server
```

### **Environment Configuration**
- **Development**: Local Ollama, SQLite, file storage
- **Production**: Optimized settings, performance monitoring
- **Testing**: Automated testing environment

## 📊 Monitoring Architecture

### **Performance Monitoring**
- **Real-time Metrics**: System performance tracking
- **Agent Performance**: AI processing metrics
- **Database Analytics**: Query performance
- **User Analytics**: Engagement tracking

### **Health Checks**
- **System Health**: Overall system status
- **Agent Health**: AI agent availability
- **Database Health**: Connection status
- **External Services**: Dependency monitoring

## 🔧 Extension Architecture

### **Plugin System**
```typescript
interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
}
```

### **Extension Points**
- **AI Agents**: Custom agent implementations
- **Document Processors**: New file format support
- **UI Components**: Custom interface elements
- **API Endpoints**: Additional functionality

## 📝 Code Organization

### **Directory Structure**
```
BibleCompanion/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── lib/           # Utilities
├── server/                 # Backend application
│   ├── agents/            # AI agent system
│   ├── services/          # Business logic
│   ├── routes/            # API endpoints
│   └── db.ts              # Database setup
├── shared/                 # Shared types/schemas
├── migrations/             # Database migrations
└── docs/                  # Documentation
```

### **Naming Conventions**
- **Components**: PascalCase (`DocumentReader`)
- **Files**: kebab-case (`document-reader.tsx`)
- **Functions**: camelCase (`processDocument`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

## 🔄 Future Architecture Considerations

### **Scalability**
- **Microservices**: Service decomposition
- **Distributed Caching**: Redis integration
- **Load Balancing**: Multiple server instances
- **Database Sharding**: Horizontal scaling

### **Enhanced AI**
- **Model Orchestration**: Advanced model management
- **Federated Learning**: Distributed AI training
- **Edge Computing**: Local AI processing
- **Custom Models**: Domain-specific fine-tuning

### **Integration**
- **API Gateway**: Centralized API management
- **Message Queues**: Asynchronous processing
- **External AI Services**: Cloud AI integration
- **Multi-tenant**: Support for multiple organizations

---

This architecture provides a solid foundation for a modern, AI-powered document learning platform while maintaining flexibility for future enhancements and scaling. 