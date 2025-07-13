import { EventEmitter } from 'events';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { TextAnalysisAgent } from './text-analysis-agent.js';
import { StudyAssistantAgent } from './study-assistant-agent.js';
import { InsightGenerationAgent } from './insight-generation-agent.js';
import { LearningAgent } from './learning-agent.js';
import { DiscussionAgent } from './discussion-agent.js';
import { QuizAgent } from './quiz-agent.js';
import { BibleCompanionMCPServer } from '../mcp/mcp-server.js';
import { OllamaMCPIntegration } from '../mcp/ollama-mcp-integration.js';
import { OllamaService } from '../services/ollama-service.js';
import { autoLearningSystem } from './auto-learning-system.js';
import { documentRAGService, RAGContext, RAGResponse, RAGSearchResult } from '../services/document-rag-service.js';
import { AITeacherAgent } from './ai-teacher-agent';

export interface AgentManagerConfig {
  webSocketPort?: number;
  enableMCP?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  ollamaService?: OllamaService;
}

// Enhanced RAG coordination interface for Agent Manager
export interface AgentRAGCoordination {
  coordinateRAGQuery(query: string, agentName: string, context: RAGContext): Promise<RAGResponse>;
  buildCrossAgentContext(query: string, context: RAGContext): Promise<RAGContext>;
  shareRAGInsights(insights: RAGResponse, targetAgents: string[]): Promise<void>;
  getRAGAnalytics(): RAGAnalytics;
}

export interface RAGAnalytics {
  totalQueries: number;
  agentQueryDistribution: Record<string, number>;
  averageResponseTime: number;
  cacheHitRate: number;
  mostActiveAgents: string[];
}

export class AgentManager extends EventEmitter implements AgentRAGCoordination {
  private config: AgentManagerConfig;
  private agents: Map<string, any> = new Map();
  private io?: SocketIOServer;
  private httpServer?: any;
  private isRunning: boolean = false;
  private startTime?: Date;
  private mcpServer?: BibleCompanionMCPServer;
  private mcpIntegration?: OllamaMCPIntegration;
  private pendingTasks: Map<string, (result: any) => void> = new Map();
  private ollamaService?: OllamaService;
  
  // RAG coordination properties
  private ragQueryCount: number = 0;
  private agentRAGStats: Map<string, { queries: number; totalTime: number }> = new Map();
  private ragCache: Map<string, { response: RAGResponse; timestamp: number; agent: string }> = new Map();
  private readonly RAG_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

  constructor(config: AgentManagerConfig) {
    super();
    this.config = {
      webSocketPort: 3001,
      enableMCP: true,
      ...config
    };
    
    this.ollamaService = config.ollamaService;
    
    // Initialize MCP integration
    if (this.config.enableMCP) {
      this.mcpIntegration = new OllamaMCPIntegration();
    }
    
    // Initialize RAG stats for all agents
    ['text-analysis', 'study-assistant', 'insight-generation', 'learning', 'discussion', 'quiz'].forEach(agent => {
      this.agentRAGStats.set(agent, { queries: 0, totalTime: 0 });
    });
  }

  setOllamaService(ollamaService: OllamaService): void {
    this.ollamaService = ollamaService;
    
    // Update Quiz Agent if it already exists
    const quizAgent = this.agents.get('QuizAgent');
    if (quizAgent && typeof quizAgent.setOllamaService === 'function') {
      quizAgent.setOllamaService(ollamaService);
      this.log('Updated Quiz Agent with Ollama service');
    }
  }

  getOllamaService(): OllamaService | undefined {
    return this.ollamaService;
  }

  setTranslationService(translationService: any): void {
    this.log('🌐 Setting up translation service for agents...');
    
    // Inject translation service into agents that need it
    const quizAgent = this.agents.get('QuizAgent');
    if (quizAgent && typeof quizAgent.setTranslationService === 'function') {
      quizAgent.setTranslationService(translationService);
      this.log('✅ Injected translation service into Quiz Agent');
    } else {
      this.warn('❌ QuizAgent not found or missing setTranslationService method');
    }

    const discussionAgent = this.agents.get('DiscussionAgent');
    if (discussionAgent) {
      this.log('✅ Discussion Agent found (simplified version - handles translation internally)');
    } else {
      this.warn('❌ DiscussionAgent not found');
    }

    const studyAgent = this.agents.get('StudyAssistantAgent');
    if (studyAgent && typeof studyAgent.setTranslationService === 'function') {
      studyAgent.setTranslationService(translationService);
      this.log('✅ Injected translation service into Study Assistant Agent');
    } else {
      this.warn('❌ StudyAssistantAgent not found or missing setTranslationService method');
    }

    const textAnalysisAgent = this.agents.get('TextAnalysisAgent');
    if (textAnalysisAgent && typeof textAnalysisAgent.setTranslationService === 'function') {
      textAnalysisAgent.setTranslationService(translationService);
      this.log('✅ Injected translation service into Text Analysis Agent');
    } else {
      this.warn('❌ TextAnalysisAgent not found or missing setTranslationService method');
    }

    const insightAgent = this.agents.get('InsightGenerationAgent');
    if (insightAgent && typeof insightAgent.setTranslationService === 'function') {
      insightAgent.setTranslationService(translationService);
      this.log('✅ Injected translation service into Insight Generation Agent');
    } else {
      this.warn('❌ InsightGenerationAgent not found or missing setTranslationService method');
    }
    
    this.log('🎯 Translation service injection completed');
  }

  // 🧠 RAG COORDINATION METHODS

  async coordinateRAGQuery(query: string, agentName: string, context: RAGContext): Promise<RAGResponse> {
    const startTime = Date.now();
    this.ragQueryCount++;
    
    try {
      this.log(`🔍 Coordinating RAG query from ${agentName}: "${query.substring(0, 50)}..."`);
      
      // Build enhanced context with cross-agent insights
      const enhancedContext = await this.buildCrossAgentContext(query, context);
      
      // Check for cached responses from other agents (document-aware cache)
      const cacheKey = `${query}_${context.userId}_${agentName}_${context.currentDocument || 'no-doc'}_${context.currentChapter || 'no-chapter'}`;
      const cached = this.ragCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.RAG_CACHE_TTL) {
        this.log(`⚡ RAG cache hit for ${agentName}: ${query.substring(0, 30)}...`);
        return cached.response;
      }
      
      // Process RAG query with enhanced options
      const ragResponse = await documentRAGService.processRAGQuery(query, enhancedContext, {
        maxSources: 8,
        includeMemories: true,
        includeAnnotations: true,
        searchDepth: 'comprehensive',
        useEmbeddings: true
      });
      
      // Cache the response
      this.ragCache.set(cacheKey, {
        response: ragResponse,
        timestamp: Date.now(),
        agent: agentName
      });
      
      // Update agent statistics
      const endTime = Date.now();
      const stats = this.agentRAGStats.get(agentName);
      if (stats) {
        stats.queries++;
        stats.totalTime += (endTime - startTime);
      }
      
      // Share insights with relevant agents if high confidence
      if (ragResponse.confidence > 0.8) {
        await this.shareRAGInsights(ragResponse, this.getRelevantAgents(agentName));
      }
      
      this.log(`✅ RAG coordination complete for ${agentName} (${endTime - startTime}ms)`);
      return ragResponse;
      
    } catch (error) {
      this.error(`❌ RAG coordination failed for ${agentName}: ${error}`);
      
      // Return fallback response
      return {
        answer: `I encountered an issue processing your request. Please try rephrasing your question.`,
        sources: [],
        confidence: 0.3,
        relatedQuestions: [],
        studyRecommendations: [],
        crossReferences: []
      };
    }
  }

  async buildCrossAgentContext(query: string, baseContext: RAGContext): Promise<RAGContext> {
    try {
      // Enhance context with insights from other agents
      const enhancedContext: RAGContext = {
        ...baseContext,
        conversationHistory: [...baseContext.conversationHistory],
        userStudyPatterns: [...baseContext.userStudyPatterns],
        preferredTopics: [...baseContext.preferredTopics]
      };
      
      // Add recent insights from learning agent
      const learningAgent = this.agents.get('learning');
      if (learningAgent && typeof learningAgent.getUserStudyPatterns === 'function') {
        try {
          const userPatterns = await learningAgent.getUserStudyPatterns(baseContext.userId);
          if (Array.isArray(userPatterns)) {
            enhancedContext.userStudyPatterns.push(...userPatterns);
          }
        } catch (error) {
          this.warn(`Could not get user patterns from learning agent: ${error}`);
        }
      }
      
      // Note: Simplified Discussion Agent doesn't track discussion topics
      // Discussion context is handled within the agent itself
      
      this.log(`🔗 Enhanced RAG context with cross-agent insights`);
      return enhancedContext;
      
    } catch (error) {
      this.warn(`Failed to build cross-agent context: ${error}`);
      return baseContext;
    }
  }

  async shareRAGInsights(insights: RAGResponse, targetAgents: string[]): Promise<void> {
    try {
      this.log(`📤 Sharing RAG insights with agents: ${targetAgents.join(', ')}`);
      
      for (const agentName of targetAgents) {
        const agent = this.agents.get(agentName);
        if (agent && typeof agent.receiveRAGInsights === 'function') {
          try {
            await agent.receiveRAGInsights(insights);
          } catch (error) {
            this.warn(`Failed to share insights with ${agentName}: ${error}`);
          }
        }
      }
      
      // Broadcast insights via WebSocket
      this.broadcast('ragInsightsShared', {
        insights: {
          confidence: insights.confidence,
          sourceCount: insights.sources.length,
          topics: insights.sources.map(s => s.documentTitle).slice(0, 3)
        },
        targetAgents
      });
      
    } catch (error) {
      this.error(`Failed to share RAG insights: ${error}`);
    }
  }

  getRAGAnalytics(): RAGAnalytics {
    const agentQueryDistribution: Record<string, number> = {};
    let totalTime = 0;
    let totalQueries = 0;
    
    this.agentRAGStats.forEach((stats, agentName) => {
      agentQueryDistribution[agentName] = stats.queries;
      totalTime += stats.totalTime;
      totalQueries += stats.queries;
    });
    
    const averageResponseTime = totalQueries > 0 ? totalTime / totalQueries : 0;
    const cacheHits = this.ragCache.size;
    const cacheHitRate = this.ragQueryCount > 0 ? (cacheHits / this.ragQueryCount) * 100 : 0;
    
    const mostActiveAgents = Object.entries(agentQueryDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([agent]) => agent);
    
    return {
      totalQueries: this.ragQueryCount,
      agentQueryDistribution,
      averageResponseTime: Math.round(averageResponseTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      mostActiveAgents
    };
  }

  private getRelevantAgents(sourceAgent: string): string[] {
    const agentRelations: Record<string, string[]> = {
      'text-analysis': ['study-assistant', 'insight-generation'],
      'study-assistant': ['learning', 'discussion'],
      'insight-generation': ['text-analysis', 'study-assistant'],
      'learning': ['study-assistant', 'discussion'],
      'discussion': ['study-assistant', 'learning']
    };
    
    return agentRelations[sourceAgent] || [];
  }

  async initialize(): Promise<void> {
    this.setupAgentEventListeners();
    this.initializeWebSocketServer();
    
    // Initialize MCP Integration
    if (this.mcpIntegration) {
      await this.mcpIntegration.initialize();
      this.log('🤖 MCP Integration Initialized');
    }

    // Auto-Learning System is a special singleton agent, initialize it
    try {
      await autoLearningSystem.initialize();
      this.log('🤖 Auto-Learning System Initialized');
    } catch (error) {
      this.error(`Failed to initialize Auto-Learning System: ${error}`);
    }
  }
  
  private setupAgentEventListeners(): void {
    const agentClasses = [
      TextAnalysisAgent,
      StudyAssistantAgent,
      InsightGenerationAgent,
      LearningAgent,
      DiscussionAgent,
      AITeacherAgent // Register the new teacher agent
    ];
    
    // Initialize regular agents
    agentClasses.forEach(AgentClass => {
      const agent = new AgentClass();
      agent.setAgentManager(this); // Set the manager reference
      this.agents.set(agent.name, agent);
      this.log(`Agent ${agent.name} registered`);
      
      agent.on('log', (log) => this.broadcast('log', log));
      
      agent.on('taskCompleted', (payload: { task: any, result: any }) => {
        const { task, result } = payload;
        
        // Check if this task is waiting for a response
        if (this.pendingTasks.has(task.id)) {
            const resolver = this.pendingTasks.get(task.id);
            if (resolver) {
                resolver(result);
            }
        }
        
        this.log(`Task ${task.id} on agent ${agent.name} completed.`);
        this.broadcast('agentTaskCompleted', { agentName: agent.name, task });
      });
      
      agent.on('taskFailed', (task, error) => {
        this.log(`Task ${task.id} on agent ${agent.name} failed: ${error}`);
        this.broadcast('agentTaskFailed', { agentName: agent.name, task, error: error.message });
      });
    });

    // Initialize Quiz Agent separately to pass Ollama service
    try {
      this.log('🔧 Starting Quiz Agent initialization...');
      
      // Use the stored Ollama service
      const quizAgent = new QuizAgent(this.ollamaService);
      this.log('✅ Quiz Agent instance created');
      
      quizAgent.setAgentManager(this);
      this.log('✅ Agent manager reference set');
      
      this.agents.set(quizAgent.name, quizAgent);
      this.log(`✅ Agent ${quizAgent.name} registered in agents map ${this.ollamaService ? 'with' : 'without'} shared Ollama service`);
      
      // Verify the agent was actually added
      const registeredAgent = this.agents.get(quizAgent.name);
      if (!registeredAgent) {
        throw new Error(`Quiz Agent was not properly registered in agents map`);
      }
      this.log(`✅ Verified Quiz Agent is in agents map: ${registeredAgent.name}`);
      
      quizAgent.on('log', (log) => this.broadcast('log', log));
      
      quizAgent.on('taskCompleted', (payload: { task: any, result: any }) => {
        const { task, result } = payload;
        
        if (this.pendingTasks.has(task.id)) {
            const resolver = this.pendingTasks.get(task.id);
            if (resolver) {
                resolver(result);
            }
        }
        
        this.log(`Task ${task.id} on agent ${quizAgent.name} completed.`);
        this.broadcast('agentTaskCompleted', { agentName: quizAgent.name, task });
      });
      
      quizAgent.on('taskFailed', (task, error) => {
        this.log(`Task ${task.id} on agent ${quizAgent.name} failed: ${error}`);
        this.broadcast('agentTaskFailed', { agentName: quizAgent.name, task, error: error.message });
      });
      
      this.log('🎯 Quiz Agent initialization completed successfully');
    } catch (error) {
      this.error(`❌ Failed to initialize Quiz Agent: ${error}`);
      this.error(`❌ Quiz Agent will not be available for quiz generation`);
    }
    
    // Store agent names for later translation service injection
  }

  private initializeWebSocketServer(): void {
    // Create HTTP server for Socket.IO
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      this.log('New Socket.IO connection established');

      // Send initial status with RAG analytics
      const systemStatus = this.getSystemStatus();
      const ragAnalytics = this.getRAGAnalytics();
      
      socket.emit('systemStatus', {
        ...systemStatus,
        ragAnalytics
      });

      // Handle different message types
      socket.on('getSystemStatus', () => {
        socket.emit('systemStatus', {
          ...this.getSystemStatus(),
          ragAnalytics: this.getRAGAnalytics()
        });
      });

      socket.on('getRagAnalytics', () => {
        socket.emit('ragAnalytics', this.getRAGAnalytics());
      });

      socket.on('requestAgentStatus', () => {
        socket.emit('systemStatus', this.getSystemStatus());
      });

      socket.on('createSession', async (data, callback) => {
        try {
          // Add a small delay and retry logic for session creation
          let sessionId: string | undefined;
          let attempts = 0;
          const maxAttempts = 3;
          
          while (!sessionId && attempts < maxAttempts) {
            attempts++;
            try {
              sessionId = await this.createMCPSession(data.userId || 2);
              if (sessionId) {
                console.log(`✅ Session created successfully on attempt ${attempts}`);
                break;
              }
            } catch (error) {
              console.warn(`⚠️ Session creation attempt ${attempts} failed:`, error instanceof Error ? error.message : 'Unknown error');
              if (attempts < maxAttempts) {
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 200 * attempts));
              }
            }
          }
          
          if (callback) {
            if (sessionId) {
              callback({ sessionId });
            } else {
              callback({ error: 'Failed to create session after multiple attempts' });
            }
          }
        } catch (error) {
          this.error(`Session creation error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('chatMessage', async (data, callback) => {
        try {
          await this.handleChatMessage(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Chat message error: ${error}`);
                     if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
         }
       });

      socket.on('discussionMessage', async (data, callback) => {
        try {
          await this.handleDiscussionMessage(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Discussion message error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('quizMessage', async (data, callback) => {
        try {
          await this.handleQuizMessage(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Quiz message error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('saveDiscussionNote', async (data, callback) => {
        try {
          await this.handleSaveDiscussionNote(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Save note error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('requestAnalysis', async (data, callback) => {
        try {
          await this.handleAnalysisRequest(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Analysis request error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      // AI Voice Reading Integration
      socket.on('analyzeForVoiceReading', async (data, callback) => {
        try {
          await this.handleVoiceAnalysisRequest(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Voice analysis error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('analyzeSpecificContent', async (data, callback) => {
        try {
          await this.handleSpecificContentAnalysis(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Specific content analysis error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('teacherMessage', async (data, callback) => {
        try {
          await this.handleTeacherMessage(socket, data);
          if (callback) callback({ success: true });
        } catch (error) {
          this.error(`Teacher message error: ${error}`);
          if (callback) callback({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      socket.on('disconnect', () => {
        this.log('Socket.IO connection closed');
      });
    });

    // Start the HTTP server
    this.httpServer.listen(this.config.webSocketPort, () => {
      this.log(`Socket.IO server listening on port ${this.config.webSocketPort}`);
    });
  }

  private async handleChatMessage(socket: any, data: any): Promise<void> {
    const { message, context } = data;
    
    // Extract language from context (defaults to English)
    const language = context?.language || 'en';
    console.log(`🌐 Chat message in language: ${language}`);
    
    // 🎓 PRIORITY: Use Study Assistant agent for context-aware responses
    const studyAgent = this.agents.get('study-assistant');
    if (studyAgent && typeof studyAgent.handleChatMessage === 'function') {
      try {
        this.log(`🎓 Using Study Assistant for context-aware response (Document: ${context?.documentId}, Chapter: ${context?.chapter}, Language: ${language})`);
        const studyResponse = await studyAgent.handleChatMessage(message, {
          sessionId: context?.sessionId || 'default',
          userId: context?.userId || 2,
          documentId: context?.documentId,
          chapter: context?.chapter,
          language: language // Pass language to agent
        });
        socket.emit('chatResponse', { message: studyResponse, agent: 'StudyAssistant' });
        return;
      } catch (error) {
        this.warn(`Study Assistant failed, trying fallbacks: ${error}`);
      }
    }
    
    // Check if this is about a document that has expert knowledge
    if (context?.documentId) {
      try {
        const expertise = autoLearningSystem.getExpertiseSummary(context.documentId);
        if (expertise.expertise) {
          this.log(`🧠 Using expert knowledge for document ${context.documentId} (${expertise.domain} - Level ${expertise.expertiseLevel}/10)`);
          const expertResponse = await autoLearningSystem.getExpertResponse(context.documentId, message, context?.chapter);
          socket.emit('chatResponse', { message: expertResponse, isExpertResponse: true, expertise });
          return;
        }
      } catch (error) {
        this.log(`Expert knowledge not available: ${error}`);
      }
    }
    
    // Fallback to MCP integration for general chat
    if (this.mcpIntegration) {
      const sessionId = context?.sessionId || await this.mcpIntegration.createSession(context?.userId || 2);
      const response = await this.mcpIntegration.enhancedChat(
        sessionId,
        message,
        context?.includeContext || true
      );
      socket.emit('chatResponse', { message: response, sessionId });
    } else {
      socket.emit('chatResponse', { message: 'AI system not available' });
    }
  }

  private async handleAnalysisRequest(socket: any, data: any): Promise<void> {
    const { documentId, chapter, agentType } = data;
    
    const agent = this.agents.get(agentType || 'text-analysis');
    if (agent && typeof agent.addTask === 'function') {
      const taskId = await agent.addTask('analyze', { documentId, chapter });
      socket.emit('analysisCompleted', { documentId, chapter, taskId });
    } else {
      throw new Error(`Agent not found: ${agentType}`);
    }
  }

  private async handleVoiceAnalysisRequest(socket: any, data: any): Promise<void> {
    const { documentId, content, userLevel, preferences, currentChapter } = data;
    
    this.log(`🎙️ Voice analysis requested for document ${documentId} (Level: ${userLevel}, Chapter: ${currentChapter || 'auto-detect'})`);
    
    try {
      // Get AI agents for comprehensive analysis
      const textAnalysisAgent = this.agents.get('text-analysis');
      const insightAgent = this.agents.get('insight-generation');
      const studyAgent = this.agents.get('study-assistant');
      const learningAgent = this.agents.get('learning');

      // Use the provided chapter number, or try to detect it from content
      let chapter = currentChapter || 1;
      if (!currentChapter && content && typeof content === 'string') {
        // Try to extract chapter information from content as fallback
        const chapterMatch = content.match(/chapter\s+(\d+)/i);
        if (chapterMatch) {
          chapter = parseInt(chapterMatch[1]);
        }
      }

      this.log(`Using chapter ${chapter} for voice analysis`);

      // 1. Generate comprehensive voice-optimized insights (with page limiting)
      if (insightAgent) {
        this.log(`Requesting content-based insights from InsightGenerationAgent (with page limiting)`);
        try {
          // Use the new content-based insight generation method with page tracking
          const voiceInsights = await insightAgent.generateInsightsFromContent(
            content, 
            `Document ${documentId}`, 
            userLevel, 
            preferences,
            documentId,
            chapter,
            2 // Default user ID 2
          );
          
          if (voiceInsights && voiceInsights.length > 0) {
            // Emit insights in a format the client expects
            socket.emit('insightsGenerated', { 
              insights: voiceInsights,
              source: 'content-analysis',
              optimizedForVoice: true,
              pageTracker: voiceInsights.length > 0 ? 'limited' : undefined
            });
            this.log(`✅ Sent ${voiceInsights.length} content-based insights (page-limited)`);
          } else {
            this.log(`📄 No insights generated - page limit reached (1 per 10 pages)`);
            socket.emit('insightsGenerated', { 
              insights: [],
              source: 'content-analysis',
              optimizedForVoice: true,
              message: 'Insight generation limited to 1 per 10 pages read'
            });
          }
        } catch (error) {
          this.warn(`Content-based insight generation failed: ${error}`);
        }
      }

      // 2. Perform advanced text analysis for voice reading - DISABLED (content-based insights only)
      // if (textAnalysisAgent) {
      //   const analysisData = {
      //     documentId,
      //     content,
      //     chapter,
      //     analysisType: 'voice_reading_enhanced',
      //     userLevel,
      //     focusAreas: ['key_themes', 'complex_concepts', 'emphasis_points', 'emotional_tone', 'reading_pace']
      //   };

      //   try {
      //     const analysis = await this.performEnhancedVoiceTextAnalysis(textAnalysisAgent, analysisData);
      //     if (analysis) {
      //       socket.emit('textAnalysis', analysis);
      //       this.log(`✅ Sent enhanced text analysis for voice reading`);
      //     }
      //   } catch (error) {
      //     this.warn(`Enhanced text analysis failed: ${error}`);
      //   }
      // }

      // 3. Get personalized study insights based on user level - DISABLED (content-based insights only)
      // if (studyAgent && preferences.enableExplanations) {
      //   try {
      //     const studyInsights = await this.getPersonalizedVoiceStudyInsights(studyAgent, { 
      //       documentId, 
      //       chapter,
      //       content, 
      //       userLevel,
      //       preferences
      //     });
      //     if (studyInsights) {
      //       socket.emit('studyInsight', studyInsights);
      //       this.log(`✅ Sent personalized study insights`);
      //     }
      //   } catch (error) {
      //     this.warn(`Personalized study insights failed: ${error}`);
      //   }
      // }

      // 4. Get contextual cross-references optimized for voice - DISABLED (content-based insights only)
      // if (insightAgent && preferences.enableCrossRefs) {
      //   try {
      //     const connections = await this.getEnhancedVoiceCrossReferences(insightAgent, { 
      //       documentId, 
      //       chapter,
      //       content, 
      //       userLevel 
      //     });
      //     if (connections) {
      //       socket.emit('crossReference', connections);
      //       this.log(`✅ Sent enhanced cross-references`);
      //     }
      //   } catch (error) {
      //     this.warn(`Enhanced cross-references failed: ${error}`);
      //   }
      // }

      // 5. Get intelligent learning adaptations - DISABLED (content-based insights only)
      // if (learningAgent) {
      //   try {
      //     const adaptations = await this.getIntelligentLearningAdaptations(learningAgent, {
      //       documentId,
      //       chapter,
      //       userLevel,
      //       preferences,
      //       content
      //     });
      //     if (adaptations) {
      //       socket.emit('learningAdaptation', adaptations);
      //       this.log(`✅ Sent intelligent learning adaptations`);
      //     }
      //   } catch (error) {
      //     this.warn(`Learning adaptations failed: ${error}`);
      //   }
      // }

      // 6. Send comprehensive voice reading guidance - DISABLED (content-based insights only)
      // const voiceGuidance = this.generateVoiceReadingGuidance(userLevel, preferences, content);
      // socket.emit('voiceGuidance', voiceGuidance);
      this.log(`✅ Voice analysis complete for document ${documentId}`);

    } catch (error) {
      this.error(`Voice analysis failed: ${error} - ${error instanceof Error ? error.stack : ''}`);
      socket.emit('voiceAnalysisError', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to complete voice analysis. Please try again.'
      });
    }
  }

  private async performEnhancedVoiceTextAnalysis(agent: any, data: any): Promise<any> {
    const { userLevel, content, focusAreas } = data;
    
    // Enhanced analysis that considers user level and voice reading needs
    const analysis = {
      keyThemes: await this.identifyVoiceKeyThemes(content, userLevel),
      complexConcepts: await this.identifyComplexConcepts(content, userLevel),
      readingTips: await this.generateReadingTips(content, userLevel),
      emotionalTone: this.analyzeEmotionalTone(content),
      voiceEmphasis: this.generateVoiceEmphasisPoints(content),
      pauseRecommendations: this.generatePauseRecommendations(content)
    };

    return analysis;
  }

  private async identifyVoiceKeyThemes(content: string, userLevel: string): Promise<any[]> {
    // First, detect the content domain
    const contentDomain = await this.detectContentDomain(content);
    
    // Generate domain-appropriate themes using AI
    const prompt = this.getDomainPrompt(contentDomain, 'theme_identification', content.substring(0, 1500));
    
    try {
      const ollamaService = this.agents.get('insight-generation')?.ollamaService;
      if (!ollamaService) return [];
      
      const response = await ollamaService.generateText(prompt);
      
      // Parse AI response to extract themes (simplified version)
      const themes = this.parseThemesFromResponse(response, contentDomain);
      
      return themes.filter(theme => theme.importance > (userLevel === 'beginner' ? 0.7 : 0.8));
    } catch (error) {
      console.warn('Theme identification failed:', error);
      return []; // Return empty array instead of hardcoded religious themes
    }
  }

  private async detectContentDomain(content: string): Promise<string> {
    const lowerContent = content.toLowerCase();
    
    // Science & Technology
    if (this.matchesKeywords(lowerContent, ['quantum', 'physics', 'particle', 'energy', 'wave', 'atom', 'electron', 'photon', 'relativity', 'mechanics'])) {
      return 'Science/Physics';
    }
    if (this.matchesKeywords(lowerContent, ['biology', 'cell', 'dna', 'evolution', 'organism', 'genetics', 'species', 'ecosystem'])) {
      return 'Science/Biology';
    }
    if (this.matchesKeywords(lowerContent, ['chemistry', 'molecule', 'compound', 'reaction', 'element', 'periodic', 'chemical', 'bond'])) {
      return 'Science/Chemistry';
    }
    if (this.matchesKeywords(lowerContent, ['computer', 'programming', 'algorithm', 'software', 'technology', 'digital', 'artificial intelligence', 'machine learning', 'data'])) {
      return 'Technology/Computing';
    }
    if (this.matchesKeywords(lowerContent, ['medicine', 'medical', 'health', 'disease', 'treatment', 'patient', 'diagnosis', 'therapy', 'clinical'])) {
      return 'Medicine/Health';
    }
    
    // Mathematics
    if (this.matchesKeywords(lowerContent, ['mathematics', 'equation', 'theorem', 'proof', 'calculus', 'algebra', 'geometry', 'statistics', 'probability'])) {
      return 'Mathematics';
    }
    
    // Social Sciences
    if (this.matchesKeywords(lowerContent, ['psychology', 'behavior', 'cognitive', 'mental', 'personality', 'therapy', 'psychological'])) {
      return 'Psychology';
    }
    if (this.matchesKeywords(lowerContent, ['sociology', 'society', 'social', 'culture', 'community', 'group', 'institution', 'demographic'])) {
      return 'Sociology';
    }
    if (this.matchesKeywords(lowerContent, ['economy', 'economic', 'market', 'business', 'finance', 'money', 'trade', 'investment', 'capitalism'])) {
      return 'Economics/Business';
    }
    if (this.matchesKeywords(lowerContent, ['politics', 'political', 'government', 'democracy', 'election', 'policy', 'law', 'constitution'])) {
      return 'Politics/Government';
    }
    
    // Humanities
    if (this.matchesKeywords(lowerContent, ['philosophy', 'ethics', 'moral', 'metaphysics', 'epistemology', 'logic', 'philosophical', 'virtue'])) {
      return 'Philosophy';
    }
    if (this.matchesKeywords(lowerContent, ['history', 'historical', 'war', 'ancient', 'civilization', 'empire', 'revolution', 'century'])) {
      return 'History';
    }
    if (this.matchesKeywords(lowerContent, ['literature', 'poetry', 'novel', 'author', 'writing', 'literary', 'narrative', 'story'])) {
      return 'Literature';
    }
    if (this.matchesKeywords(lowerContent, ['art', 'artistic', 'painting', 'sculpture', 'museum', 'aesthetic', 'creative', 'design'])) {
      return 'Arts';
    }
    if (this.matchesKeywords(lowerContent, ['music', 'musical', 'song', 'instrument', 'melody', 'rhythm', 'composer', 'symphony'])) {
      return 'Music';
    }
    
    // Languages & Communication
    if (this.matchesKeywords(lowerContent, ['language', 'linguistic', 'grammar', 'vocabulary', 'translation', 'communication', 'speech'])) {
      return 'Linguistics';
    }
    
    // Religion & Spirituality
    if (this.matchesKeywords(lowerContent, ['god', 'jesus', 'bible', 'faith', 'prayer', 'christian', 'church', 'spiritual', 'divine', 'holy'])) {
      return 'Religious/Biblical Studies';
    }
    if (this.matchesKeywords(lowerContent, ['islam', 'muslim', 'quran', 'allah', 'prophet', 'mosque', 'islamic'])) {
      return 'Religious/Islamic Studies';
    }
    if (this.matchesKeywords(lowerContent, ['buddhism', 'buddha', 'meditation', 'karma', 'dharma', 'enlightenment', 'buddhist'])) {
      return 'Religious/Buddhist Studies';
    }
    if (this.matchesKeywords(lowerContent, ['hinduism', 'hindu', 'yoga', 'sanskrit', 'vedic', 'brahman', 'chakra'])) {
      return 'Religious/Hindu Studies';
    }
    
    // Self-Help & Personal Development
    if (this.matchesKeywords(lowerContent, ['self-help', 'motivation', 'success', 'productivity', 'leadership', 'personal development', 'goal', 'habit'])) {
      return 'Self-Help/Personal Development';
    }
    
    // Education
    if (this.matchesKeywords(lowerContent, ['education', 'learning', 'teaching', 'student', 'school', 'university', 'curriculum', 'pedagogy'])) {
      return 'Education';
    }
    
    // Sports & Fitness
    if (this.matchesKeywords(lowerContent, ['sports', 'fitness', 'exercise', 'training', 'athlete', 'competition', 'physical', 'workout'])) {
      return 'Sports/Fitness';
    }
    
    // Travel & Geography
    if (this.matchesKeywords(lowerContent, ['travel', 'geography', 'country', 'city', 'culture', 'tourism', 'destination', 'exploration'])) {
      return 'Travel/Geography';
    }
    
    // Cooking & Food
    if (this.matchesKeywords(lowerContent, ['cooking', 'recipe', 'food', 'cuisine', 'ingredient', 'chef', 'culinary', 'nutrition'])) {
      return 'Cooking/Food';
    }
    
    // Default fallback
    return 'General';
  }

  private matchesKeywords(content: string, keywords: string[]): boolean {
    const threshold = Math.max(1, Math.floor(keywords.length * 0.3)); // At least 30% of keywords must match
    let matches = 0;
    
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matches++;
        if (matches >= threshold) {
          return true;
        }
      }
    }
    
    return false;
  }

  private getDomainPrompt(domain: string, taskType: string, content: string): string {
    const expertPersonas = {
      'Science/Physics': 'As a physics professor',
      'Science/Biology': 'As a biology expert', 
      'Science/Chemistry': 'As a chemistry specialist',
      'Technology/Computing': 'As a technology expert',
      'Medicine/Health': 'As a medical professional',
      'Mathematics': 'As a mathematics educator',
      'Psychology': 'As a psychology expert',
      'Sociology': 'As a sociology scholar',
      'Economics/Business': 'As a business and economics expert',
      'Politics/Government': 'As a political science expert',
      'Philosophy': 'As a philosophy scholar',
      'History': 'As a history expert',
      'Literature': 'As a literature scholar',
      'Arts': 'As an art expert',
      'Music': 'As a music expert',
      'Linguistics': 'As a linguistics expert',
      'Religious/Biblical Studies': 'As a biblical scholar',
      'Religious/Islamic Studies': 'As an Islamic studies scholar',
      'Religious/Buddhist Studies': 'As a Buddhist studies expert',
      'Religious/Hindu Studies': 'As a Hindu studies scholar',
      'Self-Help/Personal Development': 'As a personal development coach',
      'Education': 'As an education expert',
      'Sports/Fitness': 'As a fitness and sports expert',
      'Travel/Geography': 'As a travel and geography expert',
      'Cooking/Food': 'As a culinary expert'
    };

    const persona = expertPersonas[domain as keyof typeof expertPersonas] || 'As an expert in this field';

    if (taskType === 'theme_identification') {
      return `${persona}, identify 2-3 key themes in this ${domain.toLowerCase()} text. Focus on the core concepts being discussed. For each theme, provide: topic name, importance (0.0-1.0), emphasis level, and reading notes.

TEXT: "${content}"

Return in format:
- Topic: [Key concept from ${domain}]
- Importance: [0.0-1.0]  
- Emphasis: [low/medium/high]
- Reading note: [How to emphasize when reading aloud]`;
    } else if (taskType === 'concept_identification') {
      return `${persona}, identify 2-3 complex concepts in this ${domain.toLowerCase()} text that may need explanation. For each concept, provide: term, difficulty level, explanation, and voice reading notes.

TEXT: "${content}"

Return in format:
- Term: [Technical term from ${domain}]
- Difficulty: [beginner/intermediate/advanced/expert]
- Explanation: [Brief explanation appropriate for ${domain}]
- Voice note: [How to emphasize when reading aloud]`;
    } else {
      return `${persona}, analyze this ${domain.toLowerCase()} text and provide insights: ${content}`;
    }
  }

  private parseThemesFromResponse(response: string, domain: string): any[] {
    // Simple parsing - look for the format we requested
    const themes: any[] = [];
    const lines = response.split('\n');
    
    let currentTheme: any = {};
    
    for (const line of lines) {
      if (line.includes('Topic:')) {
        if (currentTheme.topic) themes.push(currentTheme);
        currentTheme = { topic: line.replace('Topic:', '').trim() };
      } else if (line.includes('Importance:')) {
        currentTheme.importance = parseFloat(line.replace('Importance:', '').trim()) || 0.8;
      } else if (line.includes('Emphasis:')) {
        currentTheme.emphasis = line.replace('Emphasis:', '').trim() || 'medium';
      } else if (line.includes('Reading note:')) {
        currentTheme.voiceNote = line.replace('Reading note:', '').trim();
      }
    }
    
    if (currentTheme.topic) themes.push(currentTheme);
    
    // If parsing failed, provide a fallback based on domain
    if (themes.length === 0) {
      return [{
        topic: domain === 'Science/Physics' ? 'Key Scientific Concepts' : 'Main Theme',
        importance: 0.8,
        emphasis: 'medium',
        voiceNote: 'Emphasize this important concept'
      }];
    }
    
    return themes;
  }

  private async identifyComplexConcepts(content: string, userLevel: string): Promise<any[]> {
    // First, detect the content domain
    const contentDomain = await this.detectContentDomain(content);
    
    const complexityThreshold = {
      beginner: 0.3,
      intermediate: 0.5,
      advanced: 0.7,
      scholar: 0.9
    };

    // Generate domain-appropriate complex concepts using AI
    const prompt = this.getDomainPrompt(contentDomain, 'concept_identification', content.substring(0, 1500));
    
    try {
      const ollamaService = this.agents.get('insight-generation')?.ollamaService;
      if (!ollamaService) return [];
      
      const response = await ollamaService.generateText(prompt);
      
      // Parse AI response to extract concepts
      const concepts = this.parseConceptsFromResponse(response, contentDomain, userLevel);
      
      return concepts.filter((concept: any) => this.getDifficultyScore(concept.difficulty) >= complexityThreshold[userLevel as keyof typeof complexityThreshold]);
    } catch (error) {
      console.warn('Complex concept identification failed:', error);
      return []; // Return empty array instead of hardcoded religious concepts
    }
  }

  private parseConceptsFromResponse(response: string, domain: string, userLevel: string): any[] {
    // Simple parsing - look for concept format
    const concepts: any[] = [];
    const lines = response.split('\n');
    
    let currentConcept: any = {};
    
    for (const line of lines) {
      if (line.includes('Term:') || line.includes('Concept:')) {
        if (currentConcept.term) concepts.push(currentConcept);
        currentConcept = { term: line.replace(/Term:|Concept:/, '').trim() };
      } else if (line.includes('Difficulty:')) {
        currentConcept.difficulty = line.replace('Difficulty:', '').trim() || 'intermediate';
      } else if (line.includes('Explanation:')) {
        currentConcept.explanation = line.replace('Explanation:', '').trim();
      } else if (line.includes('Voice note:')) {
        currentConcept.voiceNote = line.replace('Voice note:', '').trim();
      }
    }
    
    if (currentConcept.term) concepts.push(currentConcept);
    
    // If parsing failed, return empty array (no hardcoded concepts)
    return concepts;
  }

  private getDifficultyScore(difficulty: string): number {
    const scores = { easy: 0.2, intermediate: 0.5, advanced: 0.7, expert: 0.9 };
    return scores[difficulty as keyof typeof scores] || 0.5;
  }

  private async generateReadingTips(content: string, userLevel: string): Promise<any> {
    return {
      suggestedPace: userLevel === 'beginner' ? 'slow' : userLevel === 'scholar' ? 'moderate' : 'moderate-slow',
      emotionalTone: 'contemplative',
      pausePoints: [1, 3, 5, 8], // Intelligent pause placement
      breathingReminders: userLevel === 'beginner' ? true : false,
      voiceModulation: {
        emphasizeNames: true,
        highlightQuotes: true,
        reflectivePassages: [2, 4, 6]
      }
    };
  }

  private analyzeEmotionalTone(content: string): any {
    // Analyze the emotional content for appropriate voice delivery
    return {
      overallTone: 'hopeful',
      toneChanges: [
        { paragraph: 0, tone: 'reverent', intensity: 'medium' },
        { paragraph: 2, tone: 'encouraging', intensity: 'high' },
        { paragraph: 4, tone: 'contemplative', intensity: 'low' }
      ],
      voiceGuidance: "Begin with reverence, build to encouragement, end with quiet contemplation"
    };
  }

  private generateVoiceEmphasisPoints(content: string): any[] {
    return [
      {
        paragraph: 0,
        phrase: "love of God",
        emphasis: "high",
        reason: "Central theological concept",
        voiceNote: "Slow down and emphasize each word"
      },
      {
        paragraph: 2,
        phrase: "never forsaken",
        emphasis: "medium",
        reason: "Comfort and assurance",
        voiceNote: "Warm, reassuring tone"
      }
    ];
  }

  private generatePauseRecommendations(content: string): any[] {
    return [
      {
        paragraph: 1,
        type: "reflection",
        duration: "medium",
        reason: "Deep spiritual truth presented",
        guidance: "Allow listeners to absorb this truth"
      },
      {
        paragraph: 3,
        type: "emphasis", 
        duration: "short",
        reason: "Key concept introduced",
        guidance: "Brief pause to highlight importance"
      }
    ];
  }

  private async getPersonalizedVoiceStudyInsights(agent: any, data: any): Promise<any> {
    const { userLevel, preferences, content, chapter } = data;
    
    const explanationStyles = {
      beginner: "simple and encouraging",
      intermediate: "thoughtful and growth-oriented", 
      advanced: "detailed and theologically rich",
      scholar: "academically rigorous with original language insights"
    };

    const explanation = await this.generatePersonalizedExplanation(content, userLevel);
    const concepts = await this.extractKeyConcepts(content, userLevel);
    
    return {
      paragraph: 0,
      explanation,
      importance: "high",
      concepts,
      voiceGuidance: {
        tone: explanationStyles[userLevel as keyof typeof explanationStyles],
        pacing: userLevel === 'beginner' ? 'slow' : 'moderate',
        emphasis: userLevel === 'scholar' ? 'analytical' : 'educational'
      }
    };
  }

  private async generatePersonalizedExplanation(content: string, userLevel: string): Promise<string> {
    // Detect content domain first
    const domain = await this.detectContentDomain(content);
    
    if (domain.toLowerCase().includes('economics') || domain.toLowerCase().includes('finance')) {
      const explanations: Record<string, string> = {
        beginner: "This passage introduces important economic concepts that help us understand how financial systems work. These principles are fundamental to grasping how money, markets, and economic decisions impact our daily lives.",
        intermediate: "This text explores deeper economic relationships and market dynamics. The concepts presented here challenge us to think critically about financial systems and their broader implications for society and individual decision-making.",
        advanced: "The economic framework presented encompasses both theoretical foundations and practical applications. We see the interplay between market forces, policy decisions, and economic outcomes that shape modern financial landscapes.",
        scholar: "This analysis demonstrates sophisticated economic modeling and theoretical frameworks. The methodological approaches and analytical structures reveal layers of complexity that connect to broader economic theories and empirical research."
      };
      return explanations[userLevel] || explanations.intermediate;
    } else if (domain.toLowerCase().includes('technology') || domain.toLowerCase().includes('computing')) {
      const explanations: Record<string, string> = {
        beginner: "This section explains important technology concepts that help us understand how digital systems work. These principles are essential for grasping how computers, software, and digital tools function in our modern world.",
        intermediate: "This text explores deeper technical relationships and system architectures. The concepts presented challenge us to think systematically about technology design and implementation.",
        advanced: "The technical framework encompasses both theoretical computer science and practical engineering. We see the interplay between algorithms, data structures, and system design that drives modern computing.",
        scholar: "This analysis demonstrates sophisticated computational models and theoretical frameworks. The algorithmic approaches and system architectures reveal layers of complexity in modern computing systems."
      };
      return explanations[userLevel] || explanations.intermediate;
    } else {
      const explanations: Record<string, string> = {
        beginner: "This passage introduces important concepts that help us understand the subject matter. These ideas are fundamental to grasping the key principles and their applications.",
        intermediate: "This text explores deeper relationships and underlying principles. The concepts presented challenge us to think critically about the subject and its broader implications.",
        advanced: "The framework presented encompasses both theoretical foundations and practical applications. We see the interplay between different elements that shape understanding in this field.",
        scholar: "This analysis demonstrates sophisticated theoretical frameworks and methodological approaches. The analytical structures reveal layers of complexity that connect to broader academic discourse."
      };
      return explanations[userLevel] || explanations.intermediate;
    }
  }

  private async extractKeyConcepts(content: string, userLevel: string): Promise<string[]> {
    // Detect content domain first
    const domain = await this.detectContentDomain(content);
    
    if (domain.toLowerCase().includes('economics') || domain.toLowerCase().includes('finance')) {
      const conceptsByLevel: Record<string, string[]> = {
        beginner: ["money", "markets", "supply and demand", "economic growth"],
        intermediate: ["monetary policy", "financial systems", "market dynamics", "economic indicators"],
        advanced: ["macroeconomic theory", "financial regulation", "market efficiency", "economic modeling"],
        scholar: ["econometric analysis", "behavioral economics", "institutional frameworks", "policy implications"]
      };
      return conceptsByLevel[userLevel] || conceptsByLevel.intermediate;
    } else if (domain.toLowerCase().includes('technology') || domain.toLowerCase().includes('computing')) {
      const conceptsByLevel: Record<string, string[]> = {
        beginner: ["computers", "software", "data", "algorithms"],
        intermediate: ["programming", "system design", "data structures", "user interfaces"],
        advanced: ["software architecture", "computational complexity", "system optimization", "technical frameworks"],
        scholar: ["theoretical computer science", "algorithmic analysis", "system modeling", "computational paradigms"]
      };
      return conceptsByLevel[userLevel] || conceptsByLevel.intermediate;
    } else {
      const conceptsByLevel: Record<string, string[]> = {
        beginner: ["key ideas", "basic concepts", "fundamental principles", "main themes"],
        intermediate: ["theoretical frameworks", "analytical methods", "core principles", "practical applications"],
        advanced: ["complex relationships", "systematic analysis", "methodological approaches", "theoretical implications"],
        scholar: ["academic discourse", "research methodologies", "theoretical paradigms", "scholarly frameworks"]
      };
      return conceptsByLevel[userLevel] || conceptsByLevel.intermediate;
    }
  }

  private async getEnhancedVoiceCrossReferences(agent: any, data: any): Promise<any> {
    const { userLevel, content } = data;
    
    // Generate contextual cross-references based on content domain
    const domain = await this.detectContentDomain(content);
    
    if (domain.toLowerCase().includes('economics') || domain.toLowerCase().includes('finance')) {
      return {
        paragraph: 0,
        title: "Related Economic Principle",
        connection: "This concept relates to fundamental economic theory",
        relevance: "high",
        voiceNote: "Consider this connection to deepen understanding",
        explanation: userLevel === 'beginner' 
          ? "This principle appears in many economic contexts"
          : "This theoretical framework provides broader context for understanding",
        readingTip: "Pause to consider how this connects to broader economic concepts"
      };
    } else if (domain.toLowerCase().includes('technology')) {
      return {
        paragraph: 0,
        title: "Related Technical Concept",
        connection: "This builds on fundamental technology principles",
        relevance: "high",
        voiceNote: "Note this technical connection",
        explanation: userLevel === 'beginner' 
          ? "This concept appears in many technical contexts"
          : "This technical framework provides broader understanding",
        readingTip: "Pause to consider the technical implications"
      };
    } else {
      return {
        paragraph: 0,
        title: "Related Concept",
        connection: "This connects to broader themes in the subject",
        relevance: "medium",
        voiceNote: "Consider this thematic connection",
        explanation: userLevel === 'beginner' 
          ? "This idea appears in related contexts"
          : "This conceptual parallel provides additional insight",
        readingTip: "Pause to reflect on this connection"
      };
    }
  }

  private async getIntelligentLearningAdaptations(agent: any, data: any): Promise<any> {
    const { userLevel, preferences, content } = data;
    
    // Analyze content complexity and user needs
    const contentComplexity = this.analyzeContentComplexity(content);
    const personalizedSettings = this.generatePersonalizedSettings(userLevel, contentComplexity, preferences);
    
    return {
      preferredSpeed: personalizedSettings.speed,
      comprehensionLevel: userLevel,
      recommendedFeatures: {
        enableReflectionPauses: personalizedSettings.needsPauses,
        enableDetailedExplanations: personalizedSettings.needsExplanations,
        suggestedVoice: personalizedSettings.voiceRecommendation,
        emphasizeKeyTerms: personalizedSettings.emphasizeTerms,
        provideCrossReferences: personalizedSettings.crossRefs
      },
      adaptationReasoning: personalizedSettings.reasoning,
      voiceCoaching: {
        beforeReading: personalizedSettings.preparation,
        duringReading: personalizedSettings.guidance,
        afterReading: personalizedSettings.reflection
      }
    };
  }

  private analyzeContentComplexity(content: string): 'low' | 'medium' | 'high' {
    // Analyze content complexity based on sentence structure, vocabulary, and technical terms
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    
    // Count technical/complex terms (general indicators)
    const complexTerms = ['methodology', 'implementation', 'infrastructure', 'optimization', 'algorithm', 'paradigm', 'framework', 'architecture'];
    const complexTermCount = complexTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length;
    
    // Complexity scoring
    let complexityScore = 0;
    if (avgSentenceLength > 20) complexityScore += 2;
    if (avgSentenceLength > 15) complexityScore += 1;
    if (complexTermCount > 3) complexityScore += 2;
    if (complexTermCount > 1) complexityScore += 1;
    
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private generatePersonalizedSettings(userLevel: string, complexity: string, preferences: any): any {
    const settings = {
      beginner: {
        speed: 0.8,
        needsPauses: true,
        needsExplanations: true,
        voiceRecommendation: 'sarah',
        emphasizeTerms: true,
        crossRefs: complexity !== 'high',
        reasoning: "Slower pace and explanations help build understanding",
        preparation: "Take time to center yourself and focus on understanding",
        guidance: "Focus on the key concepts and ideas throughout this passage",
        reflection: "Consider how this knowledge applies to your learning goals"
      },
      intermediate: {
        speed: 1.0,
        needsPauses: complexity === 'high',
        needsExplanations: complexity !== 'low',
        voiceRecommendation: 'sarah',
        emphasizeTerms: true,
        crossRefs: true,
        reasoning: "Balanced approach with contextual support",
        preparation: "Focus on deepening your understanding as you listen",
        guidance: "Notice how this passage connects to your learning journey",
        reflection: "What insights are you gaining from these concepts?"
      },
      advanced: {
        speed: 1.1,
        needsPauses: false,
        needsExplanations: complexity === 'high',
        voiceRecommendation: 'james',
        emphasizeTerms: complexity === 'high',
        crossRefs: true,
        reasoning: "Sophisticated analysis with conceptual depth",
        preparation: "Prepare to engage with the conceptual richness of this text",
        guidance: "Consider the broader theoretical and practical implications",
        reflection: "How does this deepen your understanding of the subject matter?"
      },
      scholar: {
        speed: 1.2,
        needsPauses: false,
        needsExplanations: false,
        voiceRecommendation: 'james',
        emphasizeTerms: false,
        crossRefs: true,
        reasoning: "Academic approach focusing on textual and analytical analysis",
        preparation: "Engage your analytical faculties while maintaining focused attention",
        guidance: "Note the methodological and theoretical dimensions",
        reflection: "Consider the broader academic and systematic implications"
      }
    };

    return settings[userLevel as keyof typeof settings] || settings.intermediate;
  }

  private generateVoiceReadingGuidance(userLevel: string, preferences: any, content: string): any {
    return {
      preparationTips: {
        beforeReading: [
          "Find a quiet space free from distractions",
          "Take a moment for focused concentration",
          "Have water nearby for vocal care",
          userLevel === 'beginner' ? "Remember that understanding grows with time" : "Prepare to engage deeply with the text"
        ]
      },
      readingGuidance: {
        voiceProjection: "Speak clearly but conversationally",
        emotionalConnection: "Let the emotion of the text come through naturally",
        pacing: "Vary your pace to match the content's rhythm",
        emphasis: "Highlight key concepts and ideas without overdoing it"
      },
      postReadingReflection: {
        immediateSteps: [
          "Pause in silence for a moment",
          "Consider what stood out most powerfully",
          "Take a moment to appreciate the insights gained"
        ],
        longerReflection: [
          "Journal about insights received",
          "Consider practical applications",
          "Share meaningful insights with others"
        ]
      },
      technicalTips: {
        voiceCare: "Stay hydrated and speak from your diaphragm",
        equipment: "Use good headphones for better audio quality",
        environment: "Soft furnishings help reduce echo"
      }
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Agent Manager is already running');
      return;
    }

    try {
      this.log('Starting Agent Manager...');
      this.startTime = new Date();
      this.isRunning = true;

      // Start MCP server
      if (this.mcpServer) {
        await this.mcpServer.start();
        this.log('MCP server started');
      }

      // Start all agents
      for (const [name, agent] of Array.from(this.agents.entries())) {
        await agent.start();
        this.log(`Started agent: ${name}`);
      }

      this.emit('started');
      this.log('Agent Manager started successfully');
    } catch (error) {
      this.error(`Failed to start Agent Manager: ${error}`);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('Agent Manager is not running');
      return;
    }

    try {
      this.log('Stopping Agent Manager...');
      this.isRunning = false;

      // Stop all agents
      for (const [name, agent] of Array.from(this.agents.entries())) {
        await agent.stop();
        this.log(`Stopped agent: ${name}`);
      }

      // Close Socket.IO server
      if (this.io) {
        this.io.close();
        this.log('Socket.IO server closed');
      }
      
      if (this.httpServer) {
        this.httpServer.close();
        this.log('HTTP server closed');
      }

      this.emit('stopped');
      this.log('Agent Manager stopped successfully');
    } catch (error) {
      this.error(`Error stopping Agent Manager: ${error}`);
      throw error;
    }
  }

  private async startAgent(agentName: string): Promise<void> {
    const agent = this.agents.get(agentName);
    if (agent) {
      await agent.start();
      this.log(`Started agent: ${agentName}`);
      this.broadcast('agentStarted', { agent: agentName });
    } else {
      throw new Error(`Agent not found: ${agentName}`);
    }
  }

  private async stopAgent(agentName: string): Promise<void> {
    const agent = this.agents.get(agentName);
    if (agent) {
      await agent.stop();
      this.log(`Stopped agent: ${agentName}`);
      this.broadcast('agentStopped', { agent: agentName });
    } else {
      throw new Error(`Agent not found: ${agentName}`);
    }
  }

  async requestAgentTask(agentName: string, taskType: string, taskData: any): Promise<string> {
    const agent = this.agents.get(agentName);
    if (!agent) throw new Error(`Agent ${agentName} not found`);
    return agent.addTask(taskType, taskData);
  }

  async requestAgentTaskAndWait(agentName: string, taskType: string, taskData: any, priority: number = 2): Promise<any> {
    const agent = this.agents.get(agentName);
    if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
    }

    const taskId = agent.addTask(taskType, taskData, priority);

    return new Promise((resolve, reject) => {
        // Set up a timeout for the whole operation
        const timeoutId = setTimeout(() => {
            this.pendingTasks.delete(taskId);
            reject(new Error(`Request for task ${taskId} on agent ${agentName} timed out.`));
        }, 120000); // 120 second timeout for AI tasks (increased from 90s)

        // Store the resolver
        this.pendingTasks.set(taskId, (result) => {
            clearTimeout(timeoutId);
            this.pendingTasks.delete(taskId);
            resolve(result);
        });
    });
  }

  private broadcast(type: string, data: any): void {
    if (this.io) {
      this.io.emit(type, data);
    }
  }

  getSystemStatus() {
    const agentStatuses = Array.from(this.agents.entries()).map(([name, agent]) => ({
      ...agent.getStatus(),
      name
    }));

    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      totalAgents: this.agents.size,
      activeAgents: agentStatuses.filter(a => a.isRunning).length,
      agents: agentStatuses,
      mcpEnabled: !!this.mcpServer,
      activeMCPSessions: this.mcpIntegration?.getActiveSessionsCount() || 0
    };
  }

  // MCP Integration methods
  async createMCPSession(userId: number): Promise<string | undefined> {
    return this.mcpIntegration?.createSession(userId);
  }

  async endMCPSession(sessionId: string): Promise<void> {
    await this.mcpIntegration?.endSession(sessionId);
  }

  private log(message: string): void {
    if (this.config.logLevel !== 'error') {
      console.log(`[AgentManager] ${message}`);
    }
  }

  private error(message: string): void {
    console.error(`[AgentManager] ${message}`);
  }

  private warn(message: string): void {
    console.warn(`[AgentManager] ${message}`);
  }

  private async handleSpecificContentAnalysis(socket: any, data: any): Promise<void> {
    const { documentId, paragraph, requestType, userLevel } = data;
    
    this.log(`🔍 Specific content analysis: ${requestType} for document ${documentId}, paragraph ${paragraph}`);
    
    try {
      if (requestType === 'contextual_help') {
        const studyAgent = this.agents.get('study-assistant');
        if (studyAgent) {
          const helpData = await this.getContextualHelp(studyAgent, {
            documentId,
            paragraph,
            userLevel
          });
          socket.emit('contextualHelp', helpData);
        }
      }
    } catch (error) {
      this.error(`Specific content analysis failed: ${error}`);
      socket.emit('specificAnalysisError', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async getContextualHelp(agent: any, data: any): Promise<any> {
    const { paragraph, userLevel } = data;
    
    return {
      paragraph,
      helpType: "explanation",
      content: `Here's additional context for paragraph ${paragraph} at ${userLevel} level...`,
      relatedConcepts: ["faith", "hope", "perseverance"]
    };
  }

  private async handleDiscussionMessage(socket: any, data: any): Promise<void> {
    try {
      const { 
        message, 
        sessionId, 
        userId, 
        documentId, 
        chapter, 
        mode = 'normal',
        language = 'en',
        conversationHistory = []
      } = data;

      // Validate supported languages
      const supportedLanguages = ['en', 'es', 'fr', 'de'];
      const validatedLanguage = supportedLanguages.includes(language) ? language : 'en';
      if (validatedLanguage !== language) {
        console.log(`⚠️ Unsupported language: ${language}, defaulting to English`);
      }

      console.log(`🌐 Chat message in language: ${validatedLanguage}`);
      console.log(`📝 Conversation history length: ${conversationHistory.length}`);

      // Get the discussion agent
      const discussionAgent = this.agents.get('DiscussionAgent');
      if (!discussionAgent) {
        throw new Error('Discussion agent not found');
      }

      // Handle the discussion message with validated language and conversation history
      const response = await discussionAgent.handleDiscussionMessage(message, {
        sessionId,
        userId,
        documentId,
        chapter,
        mode,
        language: validatedLanguage,
        socket,
        conversationHistory // Pass conversation history for context restoration
      });

      // Emit the response back to the client
      socket.emit('discussionResponse', {
        success: true,
        message: response,
        sessionId,
        language: validatedLanguage
      });

    } catch (error) {
      this.error(`Discussion message handling failed: ${error}`);
      socket.emit('discussionResponse', {
        error: true,
        message: 'Failed to process discussion message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleSaveDiscussionNote(socket: any, data: any): Promise<void> {
    try {
      const { note, discussionId, userId } = data;
      
      // Get the discussion agent
      const discussionAgent = this.agents.get('DiscussionAgent');
      if (!discussionAgent) {
        throw new Error('Discussion agent not found');
      }

      // For simplified discussion agent, just acknowledge the note
      // The note creation is handled within the discussion response
      const savedNote = {
        id: `note_${Date.now()}`,
        content: note,
        timestamp: new Date(),
        userId: userId,
        discussionId: discussionId
      };

      // Emit the response back to the client
      socket.emit('discussionNoteSaved', {
        success: true,
        note: savedNote
      });

    } catch (error) {
      this.error(`Save discussion note failed: ${error}`);
      socket.emit('discussionNoteSaved', {
        error: true,
        message: 'Failed to save discussion note'
      });
    }
  }

  private async handleQuizMessage(socket: any, data: any): Promise<void> {
    try {
      const { message, context } = data;
      
      this.log('🎯 Quiz message received, starting processing...');
      
      // Extract and validate language from context
      const language = context?.language || 'en';
      this.log(`🌐 Quiz generation in language: ${language}`);
      
      // Validate supported languages
      const supportedLanguages = ['en', 'es', 'fr', 'de'];
      if (!supportedLanguages.includes(language)) {
        this.warn(`⚠️ Unsupported language: ${language}, defaulting to English`);
        context.language = 'en';
      }
      
      // Clear cache for document-specific quiz generation to prevent cross-document contamination
      if (context?.documentId) {
        this.log(`🧹 Clearing cache for document ${context.documentId} to ensure fresh quiz generation`);
        try {
          // Clear Ollama cache for this document
          const ollamaService = this.getOllamaService();
          if (ollamaService) {
            ollamaService.clearCacheForDocument(context.documentId, context.chapter);
          }
          
          // Clear query result cache for this document
          const { QueryResultCacheService } = await import('../services/query-result-cache-service.js');
          const queryCache = new QueryResultCacheService();
          await queryCache.invalidateContext(context.userId || 2, context.documentId);
        } catch (error) {
          this.warn(`⚠️ Failed to clear cache: ${error}`);
        }
      }
      
      // Debug: Check what agents are available
      this.log(`🔍 Available agents: ${Array.from(this.agents.keys()).join(', ')}`);
      
      // Get the quiz agent
      const quizAgent = this.agents.get('QuizAgent');
      if (!quizAgent) {
        this.error(`❌ Quiz agent not found in agents map. Available agents: ${Array.from(this.agents.keys()).join(', ')}`);
        throw new Error('Quiz agent not found');
      }

      this.log(`✅ Quiz agent found: ${quizAgent.name}`);
      this.log(`🎯 Requesting quiz with validated language: ${context.language}`);
      
      // Handle the quiz request with language context
      const quiz = await quizAgent.handleQuizRequest(message, {
        ...context,
        language: context.language
      });

      this.log(`✅ Quiz generated successfully in ${context.language}, title: "${quiz.title}"`);

      // Emit the response back to the client
      socket.emit('quizGenerated', {
        success: true,
        quiz,
        language: context.language
      });

    } catch (error) {
      this.error(`❌ Quiz message handling failed: ${error}`);
      socket.emit('quizGenerated', {
        error: true,
        message: 'Failed to generate quiz',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleTeacherMessage(socket: any, data: any): Promise<void> {
    try {
      const {
        message,
        sessionId,
        userId,
        documentId,
        chapter,
        language = 'en',
        conversationHistory = []
      } = data;

      this.log(`🎓 Teacher message received in language: ${language}`);

      // Validate supported languages
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'ja', 'ko'];
      const validatedLanguage = supportedLanguages.includes(language) ? language : 'en';
      if (validatedLanguage !== language) {
        this.warn(`⚠️ Unsupported language: ${language}, defaulting to English`);
      }

      this.log(`✅ Using validated language: ${validatedLanguage}`);

      // Get the teacher agent
      const teacherAgent = this.agents.get('AITeacherAgent');
      if (!teacherAgent) {
        throw new Error('Teacher agent not found');
      }

      // Handle the teaching message
      const response = await teacherAgent.handleTeachingMessage(message, {
        sessionId,
        userId,
        documentId,
        chapter,
        language: validatedLanguage,
        conversationHistory
      });

      this.log(`✅ Teacher response generated in ${validatedLanguage}`);

      // Emit the response back to the client
      socket.emit('teacherResponse', {
        success: true,
        message: response,
        sessionId,
        language: validatedLanguage
      });
    } catch (error) {
      this.error(`Teacher message handling failed: ${error}`);
      socket.emit('teacherResponse', {
        error: true,
        message: 'Failed to process teacher message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Create and export singleton instance
export const agentManager = new AgentManager({
  webSocketPort: 3001,
  enableMCP: true,
  logLevel: 'info'
});

// Handle process signals for graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await agentManager.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await agentManager.stop();
  process.exit(0);
});

// Initialize and start if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await agentManager.initialize();
      await agentManager.start();
      console.log('🤖 AI Agent System is now running 24/7!');
    } catch (error) {
      console.error('Failed to start agent system:', error);
      process.exit(1);
    }
  })();
} 