# 🤖 AI Agent System for DocumentCompanion

## Overview

The DocumentCompanion app features a sophisticated **24/7 AI Agent System** with **8 specialized AI agents** powered by **Gemma3n** that provide autonomous, intelligent assistance for document study. The system leverages Google's Gemma3n model for advanced reasoning, theological analysis, and multilingual capabilities to create a comprehensive learning experience.

## 🏗️ Architecture

### Core Components

1. **Agent Manager** - Orchestrates all 8 AI agents
2. **Base Agent** - Foundation class for all agents
3. **Ollama Service** - Local LLM integration with multiple models
4. **WebSocket Communication** - Real-time updates and agent coordination
5. **Multi-Model Service** - Intelligent model selection for optimal performance
6. **Auto-Learning System** - Continuous knowledge acquisition and expertise building

## 🚀 Setup Instructions

### Prerequisites

1. **Install Ollama** (for local LLM models):
   ```bash
   # Download and install Ollama from https://ollama.ai
   # Or use package manager:
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Install Required Models**:
   ```bash
   # Primary models (Gemma3n)
   ollama pull gemma3n:e4b    # Advanced reasoning and thesis analysis
   ollama pull gemma3n:e2b    # Fast reasoning and text analysis
   
   # Supporting models
   ollama pull nomic-embed-text:v1.5  # Semantic embeddings
   ollama pull qwen2.5vl:7b           # Vision analysis
   ollama pull phi3.5:3.8b-mini-instruct-q8_0  # Fast reasoning
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

## 🎯 Starting the AI Agent System

### Option 1: Standalone Agent System
```bash
npm run agents:start
```

### Option 2: Integrated with Main App
```bash
npm run dev:full
```

The agents will automatically start when the main server starts.

## 🤖 AI Agents Overview

### 1. Text Analysis Agent
**Purpose**: Continuous analysis of uploaded texts

**Features**:
- **NLP Analysis**: Sentiment, readability, key words, themes
- **AI-Powered Insights**: Using Ollama for deep text understanding
- **Automatic Processing**: Analyzes new documents automatically
- **Theme Detection**: Specialized keyword recognition
- **Multi-language Support**: Analyzes content in multiple languages

**Tasks**:
- `ANALYZE_DOCUMENT` - Analyze specific document/chapter
- `ANALYZE_PENDING_DOCUMENTS` - Process unanalyzed texts
- `REANALYZE_DOCUMENT` - Re-process with updated algorithms

### 2. Study Assistant Agent
**Purpose**: Interactive document study companion

**Features**:
- **Chat Interface**: Natural conversation about texts
- **Contextual Awareness**: Knows current reading location
- **Study Pattern Analysis**: Learns user preferences
- **Personalized Recommendations**: Suggests relevant study materials
- **Multi-language Support**: Converses in user's preferred language

**Tasks**:
- `HANDLE_CHAT` - Process user messages
- `ANALYZE_STUDY_PATTERNS` - Learn from user behavior
- `GENERATE_RECOMMENDATIONS` - Create personalized suggestions

### 3. Insight Generation Agent
**Purpose**: Deep insight discovery

**Features**:
- **Daily Insights**: Automatic generation of reflections
- **Cross-References**: Discovers connections between texts
- **Theme Analysis**: Identifies recurring themes
- **Multiple Insight Types**: Thematic, historical, practical applications
- **Adaptive Learning**: Improves insights based on user feedback

**Tasks**:
- `GENERATE_DAILY_INSIGHTS` - Create daily reflections
- `DISCOVER_CONNECTIONS` - Find cross-textual relationships
- `ANALYZE_THEMES` - Study recurring patterns

### 4. Learning Agent
**Purpose**: Advanced AI that learns and becomes expert on content

**Features**:
- **Deep Learning**: Analyzes documents to build expertise
- **Concept Extraction**: Identifies and learns key concepts
- **Pattern Recognition**: Discovers recurring themes and relationships
- **Knowledge Base Building**: Creates structured knowledge representations
- **Multi-Model Intelligence**: Uses multiple AI models for comprehensive learning
- **Expertise Tracking**: Monitors learning progress and expertise levels

**Tasks**:
- `DEEP_LEARN_DOCUMENT` - Comprehensive document analysis
- `EXTRACT_KNOWLEDGE` - Extract concepts and relationships
- `BUILD_EXPERTISE` - Generate specialized knowledge
- `REINFORCE_LEARNING` - Improve based on feedback
- `GENERATE_FINE_TUNING_DATA` - Create training examples

### 5. Discussion Agent
**Purpose**: Interactive discussions about document content

**Features**:
- **Natural Conversations**: Human-like discussion capabilities
- **Context Awareness**: Understands current reading position
- **Multi-language Support**: Discussions in user's preferred language
- **Conversation Memory**: Remembers discussion history
- **Drag-and-Drop Interface**: Movable chat window
- **Feedback System**: User feedback for continuous improvement

**Tasks**:
- `HANDLE_DISCUSSION` - Process discussion messages
- `MAINTAIN_CONTEXT` - Track conversation context
- `GENERATE_RESPONSES` - Create contextual responses

### 6. Quiz Agent
**Purpose**: Automated quiz generation and assessment

**Features**:
- **Dynamic Quiz Generation**: Creates quizzes based on content
- **Multiple Question Types**: Multiple choice, true/false, short answer
- **Difficulty Adaptation**: Adjusts difficulty based on user level
- **Progress Tracking**: Monitors quiz performance
- **Multi-language Support**: Quizzes in user's preferred language
- **Real-time Feedback**: Immediate scoring and explanations

**Tasks**:
- `GENERATE_QUIZ` - Create new quizzes
- `GRADE_QUIZ` - Score and provide feedback
- `ADAPT_DIFFICULTY` - Adjust based on performance
- `TRACK_PROGRESS` - Monitor learning progress

### 7. AI Teacher Agent
**Purpose**: Expert teaching and educational guidance

**Features**:
- **Teaching Expertise**: Specialized in educational explanations
- **Step-by-Step Guidance**: Clear, structured teaching approach
- **Multi-language Support**: Teaching in 6+ languages (EN, ES, FR, DE, JA, KO)
- **Context-Aware Teaching**: Adapts to current reading material
- **Expert Knowledge**: Leverages learned expertise from other agents
- **Interactive Learning**: Engages in educational conversations
- **Drag-and-Drop Interface**: Movable teaching window

**Tasks**:
- `TEACH_CONCEPT` - Explain concepts clearly
- `PROVIDE_EXAMPLES` - Give practical examples
- `ADAPT_TO_LEVEL` - Adjust teaching to user's level
- `GENERATE_EXERCISES` - Create learning activities

### 8. Auto-Learning System
**Purpose**: Autonomous knowledge acquisition and expertise building

**Features**:
- **Continuous Learning**: Automatically learns from all interactions
- **Expertise Building**: Creates specialized AI experts for different domains
- **Cross-Document Synthesis**: Connects insights across multiple documents
- **Knowledge Graph Building**: Creates structured knowledge representations
- **Multi-Model Intelligence**: Uses multiple AI models for comprehensive learning
- **Adaptive Expertise**: Adjusts expertise based on content complexity

**Tasks**:
- `TRIGGER_AUTO_LEARNING` - Start learning process for documents
- `BUILD_EXPERTISE` - Create specialized knowledge
- `SYNTHESIZE_INSIGHTS` - Connect insights across documents
- `UPDATE_KNOWLEDGE_GRAPH` - Maintain knowledge structure

## 💻 Frontend Integration

### AI Agent Components

The AI agent system includes multiple interactive components accessible from the navigation bar and floating action buttons:

**Available Components**:
- **AI Agent Chat** - General chat interface
- **AI Discussion Agent** - Interactive discussions
- **AI Teacher Agent** - Educational guidance
- **AI Quiz Agent** - Quiz generation and assessment
- **AI Voice Reader** - Text-to-speech narration
- **Auto Learning Panel** - Learning system interface
- **AI Chapter Notes** - Chapter insights and notes
- **AI Power Summaries** - Chapter summaries

### Usage in Components

```tsx
import AIAgentChat from '@/components/ai-agent-chat';
import AITeacherAgent from '@/components/ai-teacher-agent';
import AIDiscussionAgent from '@/components/ai-discussion-agent';
import { useAgentSocket } from '@/hooks/use-language-aware-agents';

// In your component
const {
  isConnected,
  sendMessage,
  requestAnalysis,
  insights
} = useAgentSocket();
```

## 🔧 Configuration Options

### Agent Manager Configuration

```typescript
const agentManager = new AgentManager({
  enabledAgents: [
    'text-analysis', 
    'study-assistant', 
    'insight-generation',
    'learning',
    'discussion',
    'quiz',
    'teacher',
    'auto-learning'
  ],
  webSocketPort: 3001,
  logLevel: 'info'
});
```

### Multi-Model Service Configuration

```typescript
const multiModelService = new MultiModelService({
  models: {
    'gemma3n:e2b': { reasoning: 9, accuracy: 8, speed: 7 },
    'qwen2.5:7b-instruct': { reasoning: 8, accuracy: 9, speed: 6 },
    'llama3.2:3b': { reasoning: 6, accuracy: 7, speed: 9 },
    'mistral:7b': { reasoning: 7, accuracy: 8, speed: 8 }
  },
  defaultModel: 'gemma3n:e2b'
});
```

## 📊 API Endpoints

### Agent Status
- `GET /api/agents/status` - Get system status
- `GET /api/agents/health` - Health check

### Analysis
- `POST /api/agents/analyze` - Request analysis
- `GET /api/agents/insights/:documentId/:chapter` - Get insights

### Teaching
- `POST /api/agents/teach` - Request teaching assistance
- `GET /api/agents/teacher/expertise/:documentId` - Get teaching expertise

### Learning
- `POST /api/agents/learn` - Trigger learning process
- `GET /api/agents/learning/progress/:documentId` - Get learning progress

### WebSocket Events

**Client → Server**:
- `chatMessage` - Send message to study assistant
- `teacherMessage` - Send message to teacher agent
- `discussionMessage` - Send message to discussion agent
- `quizMessage` - Send message to quiz agent
- `requestAnalysis` - Request document analysis
- `requestAgentStatus` - Get current status

**Server → Client**:
- `chatResponse` - Response from study assistant
- `teacherResponse` - Response from teacher agent
- `discussionResponse` - Response from discussion agent
- `quizResponse` - Response from quiz agent
- `analysisCompleted` - Analysis finished notification
- `insightsGenerated` - New insights available
- `systemStatus` - System status update

## 🎨 UI Features

### Navigation Bar Integration
- **AI Assistant Buttons**: Toggle various AI agent interfaces
- **Status Indicators**: Shows when agents are active
- **Responsive Design**: Works on all screen sizes
- **Multi-language Support**: Interface in user's preferred language

### Agent Interfaces
- **Tabbed Layouts**: Organized content and features
- **Message History**: Persistent conversations
- **Context Awareness**: Knows current chapter/document
- **Real-time Updates**: Live agent notifications
- **Drag-and-Drop**: Movable agent windows
- **Minimizable**: Non-intrusive design

## 🚀 Advanced Features

### Multi-Model Intelligence
- **Intelligent Model Selection**: Automatically chooses optimal model for each task
- **Performance Optimization**: Real-time performance tracking and load balancing
- **Adaptive Fallbacks**: Seamlessly switches models if one becomes unavailable
- **Task-Specific Optimization**: Different models for different types of tasks

### Auto-Learning Capabilities
- **Continuous Learning**: Agents learn from all interactions
- **Expertise Building**: Creates specialized knowledge for different domains
- **Cross-Document Synthesis**: Connects insights across multiple documents
- **Knowledge Graph Maintenance**: Structured knowledge representation

### Machine Learning Capabilities
- **Text Classification**: Automatic categorization
- **Pattern Recognition**: User behavior analysis
- **Sentiment Analysis**: Emotional tone detection
- **Readability Assessment**: Complexity scoring
- **Concept Extraction**: Key concept identification

### Ollama Integration Benefits
- **Privacy**: All AI processing happens locally
- **Customization**: Use any compatible model
- **Performance**: Fast, local inference
- **Offline Capable**: Works without internet
- **Multi-Model Support**: Multiple AI models for different tasks

## 🔍 Monitoring & Debugging

### Logs
All agents provide detailed logging:
```
[2024-01-XX 10:XX:XX] [TextAnalysisAgent] Starting analysis of document: Chapter 3
[2024-01-XX 10:XX:XX] [TeacherAgent] Teaching session started in Spanish
[2024-01-XX 10:XX:XX] [AgentManager] All 8 agents started successfully
```

### Health Checks
Monitor agent health via:
- WebSocket status messages
- HTTP health endpoints
- Agent queue sizes
- Processing times
- Model performance metrics

## 🎯 Usage Examples

### Request Text Analysis
```typescript
// Via WebSocket
socket.emit('requestAnalysis', {
  documentId: 1,
  chapter: 3,
  agentType: 'text-analysis'
});

// Via API
await requestAnalysis(documentId, chapter);
```

### Chat with Study Assistant
```typescript
await sendMessage("What is the main theme of John Chapter 3?", {
  sessionId: 'user123',
  documentId: 1,
  chapter: 3
});
```

### Get Teaching Assistance
```typescript
await sendTeacherMessage("Explain the concept of grace in simple terms", {
  sessionId: 'user123',
  documentId: 1,
  chapter: 3,
  language: 'es'
});
```

### Start Auto-Learning
```typescript
await triggerAutoLearning(documentId, {
  learningType: 'comprehensive',
  includeCrossReferences: true
});
```

## 🛡️ Security & Privacy

- **Local Processing**: AI runs on your machine
- **No Data Sharing**: Text never leaves your server
- **Secure WebSockets**: Encrypted communication
- **Session Management**: Isolated user sessions
- **Multi-language Privacy**: Language processing stays local

## 🚀 Performance Optimization

### Agent Efficiency
- **Task Queuing**: Prioritized processing
- **Background Processing**: Non-blocking operations
- **Automatic Retries**: Fault tolerance
- **Resource Management**: Memory cleanup
- **Multi-Model Load Balancing**: Optimal model selection

### Recommended Hardware
- **RAM**: 8GB+ (for Ollama models)
- **CPU**: Multi-core processor
- **Storage**: SSD recommended for model storage
- **GPU**: Optional for faster inference

## 📈 Future Enhancements

- **Advanced Multi-language Support**: Additional language models
- **Custom Models**: Fine-tuned domain-specific models
- **Advanced Analytics**: Reading pattern insights
- **Collaborative Features**: Shared study sessions
- **Mobile App Integration**: Cross-platform agents
- **Voice Integration**: Natural speech interaction
- **Visual Understanding**: Image and diagram analysis

## 🐛 Troubleshooting

### Common Issues

1. **Ollama Connection Failed**:
   ```bash
   # Check if Ollama is running
   ollama list
   # Restart Ollama service
   ollama serve
   ```

2. **WebSocket Connection Error**:
   - Check port 3001 is available
   - Verify firewall settings
   - Ensure agent manager is running

3. **Model Download Issues**:
   ```bash
   # Re-download model
   ollama pull gemma3n:e2b
   ```

4. **Teacher Agent Language Issues**:
   - Verify language is supported (EN, ES, FR, DE, JA, KO)
   - Check translation service is running
   - Restart agent manager

### Debug Mode
Enable detailed logging:
```env
AGENT_LOG_LEVEL=debug
```

## 📞 Support

For issues with the AI agent system:

1. Check agent logs for error messages
2. Verify Ollama installation and models
3. Test WebSocket connection manually
4. Review environment configuration
5. Check multi-model service status

---

**🎉 Congratulations!** You now have a powerful 24/7 AI agent system with 8 specialized agents running alongside your DocumentCompanion app, providing intelligent, continuous assistance for document study and spiritual growth with advanced multi-language support and teaching capabilities. 