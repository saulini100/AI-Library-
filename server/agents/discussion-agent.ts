import { BaseAgent, AgentTask } from './base-agent';
import { OllamaService } from '../services/ollama-service';
import { documentRAGService, RAGContext } from '../services/document-rag-service.js';

// Simple intent analyzer for discussion
class DiscussionIntentAnalyzer {
  analyzeIntent(message: string): { type: string } {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('note') || lowerMessage.includes('remember') || lowerMessage.includes('save')) {
      return { type: 'note_request' };
    }
    
    if (lowerMessage.includes('translate') || lowerMessage.includes('traduce') || lowerMessage.includes('traduire')) {
      return { type: 'translation_request' };
    }
    
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why') || 
        lowerMessage.includes('quién') || lowerMessage.includes('cómo') || lowerMessage.includes('por qué')) {
      return { type: 'question' };
    }
    
    return { type: 'discussion' };
  }
}

// Enhanced tool call manager with conversation-aware prompts
class DiscussionToolCallManager {
  private ollamaService: OllamaService;
  
  constructor(ollamaService: OllamaService) {
    this.ollamaService = ollamaService;
  }

  private getConversationContext(context: any): string {
    const history = context?.conversationHistory || [];
    if (history.length === 0) return '';
    
    const recentMessages = history.slice(-3).map((msg: any) => 
      `${msg.role === 'user' ? 'You' : 'I'}: ${msg.content}`
    ).join('\n');
    
    return `Recent conversation:\n${recentMessages}\n\n`;
  }

  private getDocumentContext(context: any): string {
    if (!context?.documentId) return '';
    return `Context: You're discussing content from document ${context.documentId}${context.chapter ? `, chapter ${context.chapter}` : ''}.\n\n`;
  }

  async generateDiscussionResponse(message: string, context: any): Promise<string> {
    const targetLanguage = context?.language || 'en';
    console.log(`💬 Discussion Tool Manager: Generating response in ${targetLanguage}`);
    
    const conversationContext = this.getConversationContext(context);
    const documentContext = this.getDocumentContext(context);
    
    // Shorter, more human-like prompt
    const prompt = `${documentContext}${conversationContext}You're having a natural conversation. Respond to this in a friendly, conversational way:

"${message}"

Keep it natural and engaging.`;
    
    console.log(`📝 Discussion Tool Manager: Sending prompt to Ollama in ${targetLanguage}`);
    
    const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
      temperature: 0.8, // Higher temperature for more natural responses
      maxTokens: 1024, // Shorter responses
      context: `Natural conversation in ${targetLanguage}`
    });
    
    console.log(`✅ Discussion Tool Manager: Received response in ${targetLanguage}`);
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

  async generateQuestionResponse(message: string, context: any, contextResult: any): Promise<string> {
    const targetLanguage = context?.language || 'en';
    console.log(`❓ Question Tool Manager: Generating response in ${targetLanguage}`);
    
    const conversationContext = this.getConversationContext(context);
    const documentContext = this.getDocumentContext(context);
    
    let prompt = `${documentContext}${conversationContext}Answer this question naturally and conversationally:

"${message}"`;

    // Add relevant context if available
    if (contextResult && contextResult.sources && contextResult.sources.length > 0) {
      const relevantInfo = contextResult.sources.map((s: any) => s.excerpt.substring(0, 150)).join('\n');
      prompt += `\n\nRelevant information:\n${relevantInfo}`;
    }
    
    prompt += `\n\nGive a helpful, conversational answer.`;
    
    const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
      temperature: 0.7,
      maxTokens: 1024,
      context: `Question response in ${targetLanguage}`
    });
    
    console.log(`✅ Question Tool Manager: Generated response in ${targetLanguage}`);
    return response;
  }
}

export class DiscussionAgent extends BaseAgent {
  private ollamaService: OllamaService;
  private toolCallManager: DiscussionToolCallManager;
  private intentAnalyzer: DiscussionIntentAnalyzer;

  constructor() {
    super({
      name: 'DiscussionAgent',
      description: 'Engages in natural discussions and helps with note-taking. Provides conversational responses and context-aware insights.',
      interval: 900000,
      maxRetries: 2,
      timeout: 60000,
      specialties: ['Discussion', 'Note-taking', 'Conversation', 'Context-aware Responses']
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
    console.log(`💬 Discussion Agent: Processing message in language: ${context?.language || 'en'}`);
    
    // Analyze intent
    const intent = this.intentAnalyzer.analyzeIntent(message);
    let response = '';
    
    try {
      switch (intent.type) {
        case 'note_request':
          response = await this.toolCallManager.generateNoteResponse(message, context);
          break;
          
        case 'translation_request':
          // For translation requests, just generate a discussion response
          response = await this.toolCallManager.generateDiscussionResponse(message, context);
          break;
          
        case 'question':
          // For questions, try to get context first, then respond
          let contextResult = null;
          if (context?.documentId) {
            contextResult = await this.toolCallManager.searchDiscussionContext(message, context);
          }
          response = await this.toolCallManager.generateQuestionResponse(message, context, contextResult);
          break;
          
        default:
          // Default discussion response
          response = await this.toolCallManager.generateDiscussionResponse(message, context);
          break;
      }
      
      console.log(`✅ Discussion Agent: Generated response in ${context?.language || 'en'}`);
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

  // Process task for compatibility
  async processTask(task: AgentTask): Promise<any> {
    if (task.type === 'DISCUSS') {
      return await this.handleDiscussionMessage(task.data.message, task.data.context);
    }
    return null;
  }

  async cleanup(): Promise<void> {
    // No-op for now
    return;
  }
}