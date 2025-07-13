# DocumentCompanion AI System Documentation

## 🤖 Overview

The DocumentCompanion AI System is a sophisticated multi-agent architecture designed to provide intelligent, context-aware learning assistance. The system combines multiple specialized AI agents with advanced natural language processing capabilities to deliver personalized document analysis and learning support.

## 🏗️ Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │           Agent Manager             │
                    │  • Coordination & Orchestration     │
                    │  • Resource Management             │
                    │  • Performance Monitoring          │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │ Core AI Agents  │ │ Support Services │ │ Learning System │
        │                 │ │                 │ │                 │
        │ • Text Analysis │ │ • Ollama Service│ │ • Adaptive      │
        │ • Study Assist  │ │ • Translation   │ │ • Memory        │
        │ • Insight Gen   │ │ • RAG Service   │ │ • Analytics     │
        │ • Learning      │ │ • Semantic      │ │ • Insights      │
        │ • Discussion    │ │ • Cache Service │ │ • Coordination  │
        │ • Quiz Agent    │ │ • Multi-Model   │ │ • Auto-Learning │
        │ • Teacher Agent │ │ • Auto-Learning │ │ • Knowledge     │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 🧠 AI Agent System

### **Agent Manager**
Central coordination hub that orchestrates all AI agents and provides:

#### **Core Responsibilities**
- **Agent Lifecycle Management**: Start, stop, and monitor agents
- **Task Coordination**: Route requests to appropriate agents
- **Resource Allocation**: Manage computational resources
- **Performance Monitoring**: Track agent performance and health
- **Cross-Agent Communication**: Enable agent collaboration

#### **Configuration**
```typescript
interface AgentManagerConfig {
  webSocketPort: number;
  enableMCP: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enabledAgents: string[];
  maxConcurrentTasks: number;
  performanceThresholds: {
    responseTime: number;
    errorRate: number;
  };
}
```

#### **Usage**
```typescript
const agentManager = new AgentManager({
  webSocketPort: 3001,
  enableMCP: true,
  logLevel: 'info',
  enabledAgents: ['text-analysis', 'study-assistant', 'insight-generation', 'learning', 'discussion', 'quiz', 'teacher', 'auto-learning'],
  maxConcurrentTasks: 10
});

await agentManager.initialize();
await agentManager.start();
```

## 🔍 Core AI Agents

### **1. Text Analysis Agent**
Specialized in document processing and content analysis.

#### **Capabilities**
- **Document Structure Analysis**: Chapter detection, content organization
- **Theme Extraction**: Identify key themes and concepts
- **Sentiment Analysis**: Emotional tone detection
- **Keyword Extraction**: Important term identification
- **Readability Assessment**: Content complexity scoring
- **Study Question Generation**: Automated assessment creation

#### **Configuration**
```typescript
interface TextAnalysisConfig {
  analysisDepth: 'quick' | 'standard' | 'deep';
  enableSentiment: boolean;
  maxKeywords: number;
  themeThreshold: number;
  generateQuestions: boolean;
}
```

#### **Usage**
```typescript
const result = await textAnalysisAgent.analyzeDocument({
  documentId: 1,
  chapter: 3,
  analysisDepth: 'standard',
  options: {
    extractThemes: true,
    generateQuestions: true,
    includeSentiment: true
  }
});
```

#### **Response Format**
```json
{
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
      { "word": "creation", "frequency": 12, "relevance": 0.89 }
    ],
    "sentiment": {
      "overall": "positive",
      "confidence": 0.82
    },
    "readability": {
      "score": 7.2,
      "level": "intermediate"
    },
    "studyQuestions": [
      "What does this passage reveal about the nature of creation?"
    ]
  }
}
```

### **2. Discussion Agent**
Interactive conversational AI for contextual discussions.

#### **Capabilities**
- **Natural Conversation**: Context-aware dialogue
- **Multi-Language Support**: 6+ languages with translation
- **Context Retention**: Maintain conversation history
- **Personalized Responses**: Adapt to user preferences
- **Cross-Reference Discovery**: Find related content
- **Learning Pattern Recognition**: Adapt to user behavior

#### **Configuration**
```typescript
interface DiscussionConfig {
  maxContextLength: number;
  responseStyle: 'formal' | 'casual' | 'academic';
  enableTranslation: boolean;
  contextRetention: number;
  personalityProfile: string;
}
```

#### **Usage**
```typescript
const response = await discussionAgent.processMessage({
  message: 'What does this passage mean?',
  context: {
    documentId: 1,
    chapter: 3,
    selectedText: 'In the beginning...',
    userId: 1,
    language: 'en'
  },
  sessionId: 'chat_session_123'
});
```

#### **Response Format**
```json
{
  "response": "This passage represents the foundational moment...",
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
  "crossReferences": [
    {
      "documentId": 1,
      "chapter": 5,
      "connection": "Parallel creation theme"
    }
  ]
}
```

### **3. Study Assistant Agent**
Personalized learning support and guidance.

#### **Capabilities**
- **Personalized Learning Paths**: Adaptive study recommendations
- **Progress Tracking**: Monitor learning advancement
- **Difficulty Adjustment**: Scale content complexity
- **Study Plan Generation**: Create structured learning schedules
- **Concept Reinforcement**: Identify areas needing review
- **Goal-Oriented Learning**: Align with user objectives

#### **Configuration**
```typescript
interface StudyAssistantConfig {
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  difficultyRange: [number, number];
  reinforcementThreshold: number;
  goalTrackingEnabled: boolean;
  progressMetrics: string[];
}
```

#### **Usage**
```typescript
const guidance = await studyAssistantAgent.generateGuidance({
  userId: 1,
  documentId: 1,
  currentProgress: {
    chaptersCompleted: 5,
    conceptsMastered: 12,
    currentDifficulty: 7
  },
  learningGoals: ['understanding_themes', 'historical_context']
});
```

#### **Response Format**
```json
{
  "guidance": {
    "nextSteps": [
      "Review Chapter 6 for theme reinforcement",
      "Complete practice questions on creation themes"
    ],
    "difficultyAdjustment": {
      "current": 7,
      "recommended": 8,
      "reason": "Strong performance on recent assessments"
    },
    "studyPlan": {
      "thisWeek": [
        { "day": 1, "chapter": 6, "focus": "themes" },
        { "day": 3, "chapter": 7, "focus": "historical_context" }
      ]
    },
    "reinforcement": [
      {
        "concept": "Divine sovereignty",
        "reason": "Needs additional review",
        "resources": ["Chapter 1", "Chapter 3"]
      }
    ]
  }
}
```

### **4. Quiz Agent**
Intelligent assessment and question generation.

#### **Capabilities**
- **Dynamic Question Generation**: Create contextual questions
- **Multiple Question Types**: MCQ, open-ended, true/false
- **Difficulty Scaling**: Adaptive question complexity
- **Performance Assessment**: Analyze user responses
- **Knowledge Gap Detection**: Identify learning needs
- **Multi-Language Support**: Generate questions in multiple languages

#### **Configuration**
```typescript
interface QuizConfig {
  questionTypes: string[];
  difficultyLevels: number[];
  maxQuestions: number;
  adaptiveDifficulty: boolean;
  includeExplanations: boolean;
  multiLanguage: boolean;
}
```

#### **Usage**
```typescript
const quiz = await quizAgent.generateQuiz({
  documentId: 1,
  chapter: 3,
  questionCount: 5,
  difficulty: 'medium',
  types: ['multiple_choice', 'open_ended'],
  language: 'en'
});
```

#### **Response Format**
```json
{
  "quiz": {
    "id": "quiz_123",
    "title": "Chapter 3: Creation Themes",
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "question": "What is the primary theme of this passage?",
        "options": [
          "Divine creation",
          "Human responsibility",
          "Natural order",
          "Spiritual growth"
        ],
        "correctAnswer": 0,
        "explanation": "The passage primarily focuses on divine creation...",
        "difficulty": 0.6,
        "source": {
          "chapter": 3,
          "paragraph": 1
        }
      }
    ],
    "metadata": {
      "totalQuestions": 5,
      "estimatedTime": "10 minutes",
      "difficulty": "medium"
    }
  }
}
```

### **5. Learning Agent**
Advanced AI that learns and becomes expert on content.

#### **Capabilities**
- **Deep Learning**: Analyzes documents to build expertise
- **Concept Extraction**: Identifies and learns key concepts
- **Pattern Recognition**: Discovers recurring themes and relationships
- **Knowledge Base Building**: Creates structured knowledge representations
- **Multi-Model Intelligence**: Uses multiple AI models for comprehensive learning
- **Expertise Tracking**: Monitors learning progress and expertise levels
- **Fine-tuning Data Generation**: Creates training examples for model improvement

### **6. Discussion Agent**
Interactive discussions about document content.

#### **Capabilities**
- **Natural Conversations**: Human-like discussion capabilities
- **Context Awareness**: Understands current reading position
- **Multi-language Support**: Discussions in user's preferred language
- **Conversation Memory**: Remembers discussion history
- **Drag-and-Drop Interface**: Movable chat window
- **Feedback System**: User feedback for continuous improvement

### **7. Quiz Agent**
Intelligent assessment and question generation.

#### **Capabilities**
- **Dynamic Question Generation**: Create contextual questions
- **Multiple Question Types**: MCQ, open-ended, true/false
- **Difficulty Scaling**: Adaptive question complexity
- **Performance Assessment**: Analyze user responses
- **Knowledge Gap Detection**: Identify learning needs
- **Multi-Language Support**: Generate questions in multiple languages

### **8. AI Teacher Agent**
Expert teaching and educational guidance.

#### **Capabilities**
- **Teaching Expertise**: Specialized in educational explanations
- **Step-by-Step Guidance**: Clear, structured teaching approach
- **Multi-language Support**: Teaching in 6+ languages (EN, ES, FR, DE, JA, KO)
- **Context-Aware Teaching**: Adapts to current reading material
- **Expert Knowledge**: Leverages learned expertise from other agents
- **Interactive Learning**: Engages in educational conversations
- **Drag-and-Drop Interface**: Movable teaching window

### **9. Insight Generation Agent**
Deep analysis and cross-connection discovery.

#### **Capabilities**
- **Thematic Analysis**: Deep theme exploration
- **Cross-Reference Discovery**: Find connections across documents
- **Historical Context**: Provide background information
- **Application Insights**: Practical relevance
- **Comparative Analysis**: Compare different perspectives
- **Pattern Recognition**: Identify recurring motifs

#### **Configuration**
```typescript
interface InsightConfig {
  analysisDepth: 'surface' | 'deep' | 'comprehensive';
  crossReferenceLimit: number;
  includeHistorical: boolean;
  includeApplications: boolean;
  confidenceThreshold: number;
}
```

#### **Usage**
```typescript
const insights = await insightAgent.generateInsights({
  documentId: 1,
  chapter: 3,
  insightTypes: ['thematic', 'historical', 'application'],
  crossReferenceDocuments: [1, 2, 3]
});
```

#### **Response Format**
```json
{
  "insights": [
    {
      "type": "thematic",
      "title": "Divine Order and Purpose",
      "content": "The passage reveals a structured approach to creation...",
      "confidence": 0.91,
      "sources": [
        { "chapter": 3, "paragraph": 1 },
        { "chapter": 5, "paragraph": 3 }
      ],
      "crossReferences": [
        {
          "documentId": 2,
          "chapter": 1,
          "connection": "Similar creation theme"
        }
      ]
    }
  ],
  "connections": [
    {
      "sourceChapter": 3,
      "targetChapter": 7,
      "relationship": "cause_effect",
      "strength": 0.85
    }
  ]
}
```

### **Learning Agent Configuration**
```typescript
interface LearningConfig {
  learningDepth: 'surface' | 'deep' | 'comprehensive';
  expertiseTracking: boolean;
  conceptExtraction: boolean;
  patternRecognition: boolean;
  multiModelIntegration: boolean;
  fineTuningEnabled: boolean;
}
```

#### **Usage**
```typescript
const learningResult = await learningAgent.deepLearnDocument({
  documentId: 1,
  chapter: 3,
  learningType: 'comprehensive',
  includeCrossReferences: true
});
```

### **Discussion Agent Configuration**
```typescript
interface DiscussionConfig {
  maxContextLength: number;
  responseStyle: 'formal' | 'casual' | 'academic';
  enableTranslation: boolean;
  contextRetention: number;
  personalityProfile: string;
  multiLanguageSupport: boolean;
}
```

#### **Usage**
```typescript
const response = await discussionAgent.processMessage({
  message: 'What does this passage mean?',
  context: {
    documentId: 1,
    chapter: 3,
    selectedText: 'In the beginning...',
    userId: 1,
    language: 'en'
  },
  sessionId: 'chat_session_123'
});
```

### **Quiz Agent Configuration**
```typescript
interface QuizConfig {
  questionTypes: string[];
  difficultyLevels: number[];
  maxQuestions: number;
  adaptiveDifficulty: boolean;
  includeExplanations: boolean;
  multiLanguage: boolean;
}
```

#### **Usage**
```typescript
const quiz = await quizAgent.generateQuiz({
  documentId: 1,
  chapter: 3,
  questionCount: 5,
  difficulty: 'medium',
  types: ['multiple_choice', 'open_ended'],
  language: 'en'
});
```

### **AI Teacher Agent Configuration**
```typescript
interface TeacherConfig {
  teachingStyle: 'structured' | 'conversational' | 'socratic';
  languageSupport: string[];
  expertiseIntegration: boolean;
  adaptiveTeaching: boolean;
  interactiveMode: boolean;
  stepByStepGuidance: boolean;
}
```

#### **Usage**
```typescript
const teachingResponse = await teacherAgent.handleTeachingMessage({
  message: 'Explain the concept of grace in simple terms',
  context: {
    documentId: 1,
    chapter: 3,
    language: 'es',
    userLevel: 'intermediate'
  },
  sessionId: 'teaching_session_123'
});
```

## 🔄 Agent Coordination

### **RAG (Retrieval-Augmented Generation) Integration**
Advanced coordination system for context-aware responses.

#### **RAG Architecture**
```
User Query → Semantic Search → Context Building → AI Response
     ↓                                                   ↑
Query Analysis → Document Retrieval → Relevance Ranking → Context Injection
```

#### **RAG Service Interface**
```typescript
interface RAGService {
  processQuery(query: string, context: RAGContext): Promise<RAGResponse>;
  buildContext(documentId: number, chapter: number): Promise<RAGContext>;
  generateEmbeddings(text: string): Promise<number[]>;
  findSimilarContent(embedding: number[]): Promise<RAGSearchResult[]>;
}
```

#### **Context Building**
```typescript
interface RAGContext {
  userId: number;
  documentId: number;
  chapter: number;
  selectedText?: string;
  recentQueries: string[];
  userPreferences: UserPreferences;
  learningHistory: LearningHistory[];
}
```

### **Cross-Agent Communication**
Agents collaborate through the Agent Manager for enhanced responses.

#### **Communication Protocol**
```typescript
interface AgentMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'BROADCAST';
  sourceAgent: string;
  targetAgent: string;
  payload: any;
  timestamp: Date;
  priority: number;
}
```

#### **Coordination Example**
```typescript
// Discussion Agent requests analysis from Text Analysis Agent
const analysisRequest = {
  type: 'REQUEST',
  sourceAgent: 'discussion',
  targetAgent: 'text-analysis',
  payload: {
    documentId: 1,
    chapter: 3,
    analysisType: 'themes'
  }
};

const analysisResponse = await agentManager.routeMessage(analysisRequest);
```

## 🎯 Multi-Model AI Support

### **Primary Model: Gemma3n**
**Gemma3n** serves as the core AI model powering all intelligent features:

- **gemma3n:e4b** (Primary): Advanced reasoning, thesis analysis, and scholarly research
- **gemma3n:e2b** (Secondary): Fast reasoning, text analysis, and theological reasoning

#### **Why Gemma3n?**
- **Advanced Reasoning**: Superior logical and theological analysis capabilities
- **Multilingual Excellence**: Native support for 6+ languages with cultural understanding
- **Theological Expertise**: Specialized training for biblical and religious content
- **Academic Performance**: Excellent for scholarly research and academic writing
- **Consistent Quality**: Reliable, high-quality responses across all use cases

### **Supporting Models**
- **nomic-embed-text:v1.5**: Semantic embeddings and vector search
- **qwen2.5vl:7b**: Vision analysis for document layout and scanned text
- **phi3.5:3.8b-mini-instruct-q8_0**: Fast reasoning and structured analysis

### **Model Selection Logic**
```typescript
interface ModelSelector {
  selectOptimalModel(
    task: TaskType,
    content: string,
    requirements: ModelRequirements
  ): Promise<string>;
}

interface ModelRequirements {
  speed: number;        // 1-10 scale
  accuracy: number;     // 1-10 scale
  creativity: number;   // 1-10 scale
  reasoning: number;    // 1-10 scale
  maxTokens: number;
}
```

### **Performance Optimization**
- **Model Caching**: Keep frequently used models in memory
- **Load Balancing**: Distribute requests across available models
- **Fallback Systems**: Automatic model switching on failure
- **Resource Monitoring**: Track model performance and resource usage

## 🔧 Configuration & Customization

### **Global AI Configuration**
```typescript
interface AISystemConfig {
  ollamaBaseUrl: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
  temperature: number;
  maxTokens: number;
  enableCaching: boolean;
  cacheSize: number;
}
```

### **Agent-Specific Configuration**
```typescript
interface AgentConfig {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  capabilities: string[];
  dependencies: string[];
}
```

### **Environment Variables**
```env
# AI Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048
AI_TIMEOUT=30000

# Agent Configuration
ENABLE_TEXT_ANALYSIS=true
ENABLE_DISCUSSION=true
ENABLE_STUDY_ASSISTANT=true
ENABLE_QUIZ_GENERATION=true
ENABLE_INSIGHT_GENERATION=true
```

## 📊 Performance Monitoring

### **Agent Performance Metrics**
```typescript
interface AgentMetrics {
  name: string;
  processedTasks: number;
  averageResponseTime: number;
  errorRate: number;
  queueSize: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHealthCheck: Date;
}
```

### **System Health Monitoring**
```typescript
interface SystemHealth {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  agents: AgentHealth[];
  resources: ResourceUsage;
  uptime: number;
  errorLogs: ErrorLog[];
}
```

### **Performance Dashboard**
Access real-time metrics at `/api/agents/status`:
- Agent processing times
- Queue sizes and throughput
- Error rates and health status
- Resource utilization
- Cache performance

## 🚀 Usage Examples

### **Basic Agent Interaction**
```typescript
// Initialize agent manager
const agentManager = new AgentManager({
  enabledAgents: ['text-analysis', 'discussion'],
  webSocketPort: 3001
});

await agentManager.initialize();

// Request text analysis
const analysis = await agentManager.requestAgentTask(
  'text-analysis',
  'ANALYZE_DOCUMENT',
  {
    documentId: 1,
    chapter: 3,
    analysisType: 'themes'
  }
);

// Chat with discussion agent
const response = await agentManager.requestAgentTask(
  'discussion',
  'HANDLE_CHAT',
  {
    message: 'What does this passage mean?',
    context: {
      documentId: 1,
      chapter: 3,
      userId: 1
    }
  }
);
```

### **WebSocket Integration**
```typescript
// Client-side WebSocket usage
const socket = io('http://localhost:3001');

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

// Listen for response
socket.on('chatResponse', (data) => {
  console.log('AI Response:', data.response);
  console.log('Sources:', data.sources);
});
```

### **Advanced RAG Query**
```typescript
// Complex RAG query with multiple agents
const ragResponse = await agentManager.coordinateRAGQuery(
  'What are the main themes in creation stories?',
  'discussion',
  {
    userId: 1,
    documentId: 1,
    chapter: 1,
    crossReferenceDocuments: [2, 3],
    includeHistoricalContext: true
  }
);
```

## 🔒 Security & Privacy

### **Data Protection**
- **Local Processing**: All AI processing happens on-device
- **No External Calls**: Content never leaves your system
- **Input Sanitization**: Comprehensive validation
- **Access Control**: User-based permissions

### **Privacy Features**
- **Memory Isolation**: User data separation
- **Secure Sessions**: Encrypted communication
- **Audit Logging**: Security event tracking
- **Data Encryption**: At-rest and in-transit protection

## 🛠️ Development & Extending

### **Creating Custom Agents**
```typescript
class CustomAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.capabilities = ['custom_analysis', 'special_processing'];
  }

  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    // Custom processing logic
    return {
      success: true,
      data: processedResult,
      processingTime: Date.now() - startTime
    };
  }
}
```

### **Agent Integration**
```typescript
// Register custom agent
agentManager.registerAgent('custom-agent', CustomAgent, {
  model: 'qwen2.5:7b-instruct',
  temperature: 0.7,
  maxTokens: 1024
});
```

## 📈 Future Enhancements

### **Planned Features**
- **Federated Learning**: Distributed AI training
- **Model Fine-tuning**: Domain-specific optimization
- **Advanced Reasoning**: Multi-step logical processing
- **Visual Understanding**: Image and diagram analysis
- **Voice Integration**: Natural speech interaction

### **Research Areas**
- **Cognitive Architecture**: Human-like reasoning
- **Knowledge Graphs**: Structured knowledge representation
- **Multimodal AI**: Combined text, audio, and visual processing
- **Reinforcement Learning**: Adaptive behavior optimization

---

This AI system provides a comprehensive, extensible platform for intelligent document learning with advanced capabilities for analysis, discussion, and personalized education support. 