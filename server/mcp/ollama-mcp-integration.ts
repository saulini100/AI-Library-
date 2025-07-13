import { OllamaService } from '../services/ollama-service.js';
import { MemoryService } from './memory-service.js';
import { storage } from '../storage.js';

export interface MCPContext {
  userId: number;
  sessionId: string;
  currentDocument?: number;
  currentChapter?: number;
}

export class OllamaMCPIntegration {
  private ollama: OllamaService;
  private memoryService: MemoryService;
  private activeSessions: Map<string, MCPContext> = new Map();

  constructor() {
    this.ollama = new OllamaService({
      model: 'gemma3n:e2b', // 🚀 FAST: Optimized reasoning with 3x speed improvement
      temperature: 0.7,
      maxTokens: 4096
    });
    this.memoryService = new MemoryService();
  }

  async initialize(): Promise<void> {
    await this.ollama.initialize();
    console.log('✅ MCP Ollama service initialized successfully');
  }

  async createSession(userId: number): Promise<string> {
    const sessionId = this.generateSessionId();
    const context: MCPContext = {
      userId,
      sessionId
    };
    
    this.activeSessions.set(sessionId, context);
    
    try {
      // Load user memories to provide context
      const recentMemories = await this.memoryService.retrieveMemories(
        userId, 
        '', // Empty query to get recent memories
        undefined, // No specific category filter
        10 // limit to 10 recent memories
      );
      
      // Store session initialization with retry logic
      await this.retryOperation(async () => {
        await this.memoryService.storeMemory(
          userId,
          `Started new AI session with ${recentMemories.length} memories loaded`,
          'session_start',
          { sessionId, memoriesLoaded: recentMemories.length }
        );
      }, 3, 500); // 3 retries with 500ms delay
      
      console.log(`✅ Session ${sessionId} created successfully for user ${userId}`);
      return sessionId;
    } catch (error) {
      console.error(`❌ Failed to create session for user ${userId}:`, error);
      // Still return the session ID even if memory storage failed
      // The session can work without the initial memory storage
      console.warn(`⚠️ Session ${sessionId} created but memory storage failed - continuing anyway`);
      return sessionId;
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`🔄 Operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  async enhancedChat(
    sessionId: string, 
    message: string, 
    includeContext: boolean = true
  ): Promise<string> {
    const context = this.activeSessions.get(sessionId);
    if (!context) {
      throw new Error('Invalid session ID');
    }

    let enhancedPrompt = message;

    if (includeContext) {
      // Retrieve relevant memories
      const relevantMemories = await this.memoryService.retrieveMemories(
        context.userId,
        message,
        undefined,
        5
      );

      // Get user's current reading context
      const userDocuments = await storage.getDocuments(context.userId);
      const recentAnnotations = await storage.getAnnotations(context.userId);
      const bookmarks = await storage.getBookmarks(context.userId);

      // Build context-aware prompt
      const contextInfo = this.buildContextPrompt(
        relevantMemories,
        userDocuments.slice(0, 3), // Recent documents
        recentAnnotations.slice(0, 5), // Recent annotations
        bookmarks.slice(0, 3) // Recent bookmarks
      );

      enhancedPrompt = `${contextInfo}\n\nUser Question: ${message}`;
    }

    // Generate response using Ollama
    const response = await this.ollama.generateText(enhancedPrompt);

    // Store the conversation in memory
    await this.memoryService.storeMemory(
      context.userId,
      `User asked: "${message}" | AI responded: "${response}"`,
      'conversation',
      {
        sessionId,
        timestamp: new Date().toISOString(),
        messageLength: message.length,
        responseLength: response.length
      }
    );

    return response;
  }

  private buildContextPrompt(
    memories: any[],
    documents: any[],
    annotations: any[],
    bookmarks: any[]
  ): string {
    let context = "CONTEXT INFORMATION:\n\n";

    if (memories.length > 0) {
      context += "RELEVANT MEMORIES:\n";
      memories.forEach((memory, index) => {
        context += `${index + 1}. [${memory.category}] ${memory.content}\n`;
      });
      context += "\n";
    }

    if (documents.length > 0) {
      context += "RECENT DOCUMENTS:\n";
      documents.forEach((doc, index) => {
        context += `${index + 1}. ${doc.title} (${doc.totalChapters} chapters)\n`;
      });
      context += "\n";
    }

    if (annotations.length > 0) {
      context += "RECENT ANNOTATIONS:\n";
      annotations.forEach((annotation, index) => {
        context += `${index + 1}. "${annotation.selectedText}" - ${annotation.note}\n`;
      });
      context += "\n";
    }

    if (bookmarks.length > 0) {
      context += "BOOKMARKS:\n";
      bookmarks.forEach((bookmark, index) => {
        context += `${index + 1}. ${bookmark.title || 'Untitled'} (Chapter ${bookmark.chapter})\n`;
      });
      context += "\n";
    }

    context += "Please use this context to provide more personalized and relevant responses.\n";
    context += "---\n\n";

    return context;
  }

  async analyzeUserBehavior(userId: number): Promise<any> {
    // Get comprehensive user data
    const [annotations, bookmarks, documents, progress] = await Promise.all([
      storage.getAnnotations(userId),
      storage.getBookmarks(userId),
      storage.getDocuments(userId),
      storage.getReadingProgress(userId)
    ]);

    // Analyze patterns using AI
    const analysisPrompt = `
    Analyze the following user data and provide insights about their reading and study patterns:
    
    ANNOTATIONS (${annotations.length} total):
    ${annotations.slice(0, 10).map(a => `- "${a.selectedText}": ${a.note}`).join('\n')}
    
    BOOKMARKS (${bookmarks.length} total):
    ${bookmarks.slice(0, 5).map(b => `- ${b.title} (Chapter ${b.chapter})`).join('\n')}
    
    READING PROGRESS:
    ${progress.map(p => `- Document ${p.documentId}, Chapter ${p.chapter}: ${p.completed ? 'Completed' : 'In Progress'}`).join('\n')}
    
    Please provide:
    1. Study patterns and preferences
    2. Favorite topics or themes
    3. Reading habits
    4. Recommendations for future study
    `;

    const analysis = await this.ollama.generateText(analysisPrompt);

    // Store the analysis in memory
    await this.memoryService.storeMemory(
      userId,
      `Behavioral analysis: ${analysis}`,
      'behavior_analysis',
      {
        annotationsCount: annotations.length,
        bookmarksCount: bookmarks.length,
        documentsCount: documents.length,
        analysisDate: new Date().toISOString()
      }
    );

    return {
      analysis,
      stats: {
        annotations: annotations.length,
        bookmarks: bookmarks.length,
        documents: documents.length,
        completedChapters: progress.filter(p => p.completed).length
      }
    };
  }

  async generatePersonalizedInsights(userId: number): Promise<string[]> {
    // Get user study patterns from memory
    const studyPatterns = await this.memoryService.getUserStudyPatterns(userId);
    
    // Generate insights based on patterns
    const insightPrompts = [
      `Based on the user's favorite books (${studyPatterns.favoriteBooks.join(', ')}), suggest 3 related passages they might enjoy studying.`,
      `Given the user's common themes (${studyPatterns.commonThemes.join(', ')}), provide an educational insight connecting these themes.`,
      `The user typically studies during ${studyPatterns.studyTimes.join(' and ')}. Suggest an optimal study routine.`,
      `Based on the user's annotation frequency (${studyPatterns.annotationFrequency.toFixed(2)} per day), recommend ways to deepen their engagement.`
    ];

    const insights = await Promise.all(
      insightPrompts.map(prompt => this.ollama.generateText(prompt))
    );

    // Store insights in memory
    for (const insight of insights) {
      await this.memoryService.storeMemory(
        userId,
        `Personalized insight: ${insight}`,
        'personalized_insight',
        { generatedAt: new Date().toISOString() }
      );
    }

    return insights;
  }

  async smartSearch(userId: number, query: string): Promise<any> {
    // First, search documents
    const documentResults = await storage.searchDocuments(userId, query);
    
    // Then, search memories for related context
    const memoryResults = await this.memoryService.retrieveMemories(
      userId,
      query,
      undefined,
      5
    );

    // Use AI to enhance search results
    const enhancementPrompt = `
    The user searched for: "${query}"
    
    DOCUMENT RESULTS:
    ${documentResults.map(r => `- ${r.documentTitle}, Chapter ${r.chapter}: "${r.text}"`).join('\n')}
    
    RELATED MEMORIES:
    ${memoryResults.map(m => `- [${m.category}] ${m.content}`).join('\n')}
    
    Please provide:
    1. A summary of the search results
    2. Additional insights or connections
    3. Suggested follow-up questions or topics
    `;

    const enhancement = await this.ollama.generateText(enhancementPrompt);

    // Store search activity
    await this.memoryService.storeMemory(
      userId,
      `Smart search for "${query}" returned ${documentResults.length} document results and ${memoryResults.length} memory matches`,
      'smart_search',
      {
        query,
        documentResults: documentResults.length,
        memoryResults: memoryResults.length
      }
    );

    return {
      documentResults,
      memoryResults,
      aiEnhancement: enhancement,
      summary: {
        totalResults: documentResults.length + memoryResults.length,
        query
      }
    };
  }

  async updateContext(sessionId: string, documentId?: number, chapter?: number): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      context.currentDocument = documentId;
      context.currentChapter = chapter;
      
      // Store context change in memory
      await this.memoryService.storeMemory(
        context.userId,
        `Context updated: Document ${documentId}, Chapter ${chapter}`,
        'context_change',
        { sessionId, documentId, chapter }
      );
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      // Store session end
      await this.memoryService.storeMemory(
        context.userId,
        `Ended AI session ${sessionId}`,
        'session_end',
        { sessionId, duration: Date.now() }
      );
      
      this.activeSessions.delete(sessionId);
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get session statistics
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  async getSessionContext(sessionId: string): Promise<MCPContext | undefined> {
    return this.activeSessions.get(sessionId);
  }
} 