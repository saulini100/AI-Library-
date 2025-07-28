import { BaseAgent, AgentTask } from './base-agent';
import { OllamaService } from '../services/ollama-service';
import { documentRAGService, RAGContext } from '../services/document-rag-service.js';
import { agentKnowledgeService } from '../services/agent-knowledge-service.js';

// Enhanced ChatContext interface for discussion conversations
interface DiscussionChatContext {
  userId: number;
  documentId?: number;
  chapter?: number;
  language?: string;
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  topics?: string[]; // Track discussion topics for better context
  lastIntent?: string; // Remember last intent for follow-up awareness
}

// Simple intent analyzer for discussion
class DiscussionIntentAnalyzer {
  analyzeIntent(message: string, previousIntent?: string): { type: string; isFollowUp: boolean } {
    const lowerMessage = message.toLowerCase();
    
    // Detect follow-up indicators
    const followUpIndicators = [
      'and what about', 'also', 'furthermore', 'additionally', 'but what',
      'however', 'on the other hand', 'speaking of', 'regarding that',
      'about that', 'tell me more', 'can you explain', 'expand on',
      'what do you mean', 'clarify', 'elaborate'
    ];
    
    const isFollowUp = followUpIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    ) || Boolean(previousIntent && (
      lowerMessage.startsWith('and ') || 
      lowerMessage.startsWith('but ') ||
      lowerMessage.startsWith('also ') ||
      lowerMessage.startsWith('what about') ||
      lowerMessage.startsWith('how about')
    ));
    
    if (lowerMessage.includes('note') || lowerMessage.includes('remember') || lowerMessage.includes('save')) {
      return { type: 'note_request', isFollowUp };
    }
    
    if (lowerMessage.includes('translate') || lowerMessage.includes('traduce') || lowerMessage.includes('traduire')) {
      return { type: 'translation_request', isFollowUp };
    }
    
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why') || 
        lowerMessage.includes('quién') || lowerMessage.includes('cómo') || lowerMessage.includes('por qué')) {
      return { type: 'question', isFollowUp };
    }
    
    return { type: 'discussion', isFollowUp };
  }
}

// Enhanced tool call manager with conversation-aware prompts
class DiscussionToolCallManager {
  private ollamaService: OllamaService;
  
  constructor(ollamaService: OllamaService) {
    this.ollamaService = ollamaService;
  }

  private getConversationContext(context: any, sessionHistory?: DiscussionChatContext): string {
    // Use session history if available, otherwise fall back to passed context
    const history = sessionHistory?.recentMessages || context?.conversationHistory || [];
    if (history.length === 0) return '';
    
    const recentMessages = history.slice(-5).map((msg: any) => 
      `${msg.role === 'user' ? 'You' : 'I'}: ${msg.content}`
    ).join('\n');
    
    // Add follow-up context awareness
    let contextPrefix = 'Recent conversation:\n';
    if (sessionHistory?.lastIntent) {
      contextPrefix = `Continuing our ${sessionHistory.lastIntent} discussion:\n`;
    }
    
    return `${contextPrefix}${recentMessages}\n\n`;
  }

  private getDocumentContext(context: any): string {
    if (!context?.documentId) return '';
    return `Context: You're discussing content from document ${context.documentId}${context.chapter ? `, chapter ${context.chapter}` : ''}.\n\n`;
  }

  async generateDiscussionResponse(message: string, context: any, sessionHistory?: DiscussionChatContext): Promise<string> {
    const targetLanguage = context?.language || 'en';
    console.log(`💬 Discussion Tool Manager: Generating response in ${targetLanguage}`);
    
    const conversationContext = this.getConversationContext(context, sessionHistory);
    const documentContext = this.getDocumentContext(context);
    
    // Get relevant knowledge from stored definitions
    const knowledgeContext = await agentKnowledgeService.getContextForPrompt(
      'discussion', 
      context?.documentId,
      3 // Limit to 3 most relevant definitions
    );
    
    // Get suggestions for enhanced response
    const suggestions = await agentKnowledgeService.getSuggestionsForResponse(
      'discussion',
      message,
      context?.documentId
    );
    
    const suggestionText = suggestions.length > 0 
      ? `\nConsider: ${suggestions.join('; ')}`
      : '';
    
    // Enhanced prompt with knowledge context
    const prompt = `${documentContext}${conversationContext}${knowledgeContext}You're having a natural conversation. Use any relevant definitions or knowledge to enhance your response, but keep it conversational and engaging:

"${message}"

${suggestionText}

Keep it natural and engaging while being informative.`;
    
    console.log(`📝 Discussion Tool Manager: Sending enhanced prompt to Ollama in ${targetLanguage}`);
    
    const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
      temperature: 0.8, // Higher temperature for more natural responses
      maxTokens: 1024, // Shorter responses
      context: `Natural conversation in ${targetLanguage} with knowledge enhancement`
    });
    
    // Reinforce any definitions that were likely used
    this.reinforceUsedDefinitions(message, response, context);
    
    console.log(`✅ Discussion Tool Manager: Received enhanced response in ${targetLanguage}`);
    return response;
  }

  async searchDiscussionContext(query: string, context: any): Promise<any> {
    const ragContext: RAGContext = {
      userId: context?.userId || 1,
      currentDocument: context?.documentId,
      currentChapter: context?.chapter,
      conversationHistory: context?.conversationHistory?.slice(-3) || [],
      userStudyPatterns: [],
      preferredTopics: [],
      studyLevel: 'intermediate',
      targetLanguage: context?.language || 'en'
    };
    
    return await documentRAGService.processRAGQuery(query, ragContext, {
      maxSources: 2,
      includeAnnotations: true,
      includeMemories: true,
      searchDepth: 'quick',
      useEmbeddings: true,
      singleDocumentOnly: false,
      targetLanguage: context?.language || 'en'
    });
  }

  async generateNoteResponse(message: string, context: any): Promise<string> {
    const targetLanguage = context?.language || 'en';
    console.log(`📝 Note Tool Manager: Generating note in ${targetLanguage}`);
    
    // Shorter, more focused note prompt
    const prompt = `Create a brief, helpful note about this:

"${message}"

Make it clear and easy to reference.`;
    
    const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
      temperature: 0.3, // Lower temperature for more structured notes
      maxTokens: 512, // Shorter notes
      context: `Note creation in ${targetLanguage}`
    });
    
    console.log(`✅ Note Tool Manager: Created note in ${targetLanguage}`);
    return response;
  }

  async generateQuestionResponse(message: string, context: any, contextResult: any, sessionHistory?: DiscussionChatContext): Promise<string> {
    const targetLanguage = context?.language || 'en';
    console.log(`❓ Question Tool Manager: Generating response in ${targetLanguage}`);
    
    const conversationContext = this.getConversationContext(context, sessionHistory);
    const documentContext = this.getDocumentContext(context);
    
    // Get enhanced knowledge context for questions
    const knowledgeContext = await agentKnowledgeService.getContextForPrompt(
      'discussion', 
      context?.documentId,
      5 // More definitions for question responses
    );
    
    let prompt = `${documentContext}${conversationContext}${knowledgeContext}Answer this question naturally and conversationally, using any relevant stored knowledge:

"${message}"`;

    // Add relevant context if available
    if (contextResult && contextResult.sources && contextResult.sources.length > 0) {
      const relevantInfo = contextResult.sources.map((s: any) => s.excerpt.substring(0, 150)).join('\n');
      prompt += `\n\nRelevant information:\n${relevantInfo}`;
    }
    
    prompt += `\n\nGive a helpful, conversational answer that incorporates relevant definitions and knowledge.`;
    
    const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
      temperature: 0.7,
      maxTokens: 1024,
      context: `Enhanced question response in ${targetLanguage}`
    });
    
    // Reinforce any definitions that were used in the response
    this.reinforceUsedDefinitions(message, response, context);
    
    console.log(`✅ Question Tool Manager: Generated enhanced response in ${targetLanguage}`);
    return response;
  }

  // Helper method to reinforce definitions that were likely used
  private async reinforceUsedDefinitions(userMessage: string, response: string, context: any): Promise<void> {
    try {
      // Extract potential terms from both user message and response
      const allText = `${userMessage} ${response}`.toLowerCase();
      const words = allText.split(/\s+/).filter(word => word.length > 4);
      const uniqueWords = Array.from(new Set(words));
      
      // Check if any stored definitions were likely referenced
      for (const word of uniqueWords.slice(0, 10)) { // Limit to prevent excessive checks
        const hasDefinition = await agentKnowledgeService.hasDefinition('discussion', word, context?.documentId);
        if (hasDefinition) {
          await agentKnowledgeService.reinforceKnowledge('discussion', word, context?.documentId);
        }
      }
    } catch (error) {
      console.warn('Failed to reinforce definitions:', error);
    }
  }
}

export class DiscussionAgent extends BaseAgent {
  private ollamaService: OllamaService;
  private toolCallManager: DiscussionToolCallManager;
  private intentAnalyzer: DiscussionIntentAnalyzer;
  private chatSessions: Map<string, DiscussionChatContext> = new Map();

  constructor() {
    super({
      name: 'DiscussionAgent',
      description: 'Engages in natural discussions with conversation memory and follow-up awareness. Provides context-aware insights and remembers conversation history.',
      interval: 900000,
      maxRetries: 2,
      timeout: 60000,
      specialties: ['Discussion', 'Note-taking', 'Conversation Memory', 'Follow-up Awareness', 'Context-aware Responses']
    });
    
    this.ollamaService = new OllamaService({
      model: 'gemma3n:e2b',
      temperature: 0.7
    });
    this.toolCallManager = new DiscussionToolCallManager(this.ollamaService);
    this.intentAnalyzer = new DiscussionIntentAnalyzer();
  }

  async initialize(): Promise<void> {
    await this.ollamaService.initialize();
    console.log('💬 Discussion Agent initialized');
  }

  async handleDiscussionMessage(message: string, context?: any): Promise<string> {
    try {
      // Ignore empty messages
      if (!message || message.trim() === '') {
        return '';
      }

      console.log(`💬 Discussion Agent: Processing message in language: ${context?.language || 'en'}`);
      
      // Create or get chat session
      const sessionId = context?.sessionId || 'default';
      let chatContext = this.chatSessions.get(sessionId);
      
      if (!chatContext) {
        chatContext = {
          userId: context?.userId || 1,
          documentId: context?.documentId,
          chapter: context?.chapter,
          language: context?.language || 'en',
          recentMessages: [],
          topics: [],
          lastIntent: undefined
        };
        this.chatSessions.set(sessionId, chatContext);
      } else {
        // Update language and context for existing session
        chatContext.language = context?.language || 'en';
        if (context?.documentId) chatContext.documentId = context.documentId;
        if (context?.chapter) chatContext.chapter = context.chapter;
      }

      // Add user message to conversation history
      chatContext.recentMessages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Analyze intent with follow-up awareness
      const intent = this.intentAnalyzer.analyzeIntent(message, chatContext.lastIntent);
      let response = '';
      
      // Generate response based on intent
      switch (intent.type) {
        case 'note_request':
          response = await this.toolCallManager.generateNoteResponse(message, context);
          break;
          
        case 'translation_request':
          response = await this.toolCallManager.generateDiscussionResponse(message, context, chatContext);
          break;
          
        case 'question':
          // For questions, try to get context first, then respond
          let contextResult = null;
          if (context?.documentId) {
            contextResult = await this.toolCallManager.searchDiscussionContext(message, context);
          }
          response = await this.toolCallManager.generateQuestionResponse(message, context, contextResult, chatContext);
          break;
          
        default:
          // Default discussion response with conversation memory
          response = await this.toolCallManager.generateDiscussionResponse(message, context, chatContext);
          break;
      }

      // Add assistant response to conversation history
      chatContext.recentMessages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      // Update session context
      chatContext.lastIntent = intent.type;

      // Keep only last 10 messages to prevent context overflow
      if (chatContext.recentMessages.length > 10) {
        chatContext.recentMessages = chatContext.recentMessages.slice(-10);
      }
      
      console.log(`✅ Discussion Agent: Generated ${intent.isFollowUp ? 'follow-up ' : ''}response in ${context?.language || 'en'}`);
      return response;
      
    } catch (error) {
      console.error(`❌ Discussion Agent error: ${error}`);
      
      // Fallback response
      const targetLanguage = context?.language || 'en';
      const fallbackResponses = {
        'en': "I'm here to chat and help with discussions. What would you like to talk about?",
        'es': "Estoy aquí para charlar y ayudar con discusiones. ¿De qué te gustaría hablar?",
        'fr': "Je suis ici pour discuter et aider avec les conversations. De quoi voulez-vous parler ?",
        'de': "Ich bin hier, um zu chatten und bei Diskussionen zu helfen. Worüber möchten Sie sprechen?",
        'ja': "おしゃべりやディスカッションのお手伝いをします。何について話したいですか？",
        'ko': "대화와 토론을 도와드리겠습니다. 무엇에 대해 이야기하고 싶으신가요?"
      };
      
      return fallbackResponses[targetLanguage as keyof typeof fallbackResponses] || fallbackResponses.en;
    }
  }

  // Clear old chat sessions to prevent memory leaks
  clearOldSessions(maxAgeMinutes: number = 60): void {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    
    for (const [sessionId, session] of Array.from(this.chatSessions.entries())) {
      const lastMessageTime = session.recentMessages[session.recentMessages.length - 1]?.timestamp;
      if (lastMessageTime && lastMessageTime < cutoffTime) {
        this.chatSessions.delete(sessionId);
        console.log(`💬 Cleared old discussion session: ${sessionId}`);
      }
    }
  }

  // Get session info for debugging
  getSessionInfo(sessionId?: string): any {
    if (sessionId) {
      return this.chatSessions.get(sessionId);
    }
    return {
      totalSessions: this.chatSessions.size,
      sessionIds: Array.from(this.chatSessions.keys())
    };
  }

  // Process task for compatibility
  async processTask(task: AgentTask): Promise<any> {
    if (task.type === 'DISCUSS') {
      return await this.handleDiscussionMessage(task.data.message, task.data.context);
    }
    return null;
  }

  async cleanup(): Promise<void> {
    console.log('💬 Cleaning up Discussion Agent');
    this.clearOldSessions(30); // Clear sessions older than 30 minutes
    this.chatSessions.clear();
  }
}