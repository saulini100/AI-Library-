import { BaseAgent, AgentTask } from './base-agent';
import { OllamaService } from '../services/ollama-service';
import { documentRAGService, RAGContext } from '../services/document-rag-service.js';

// Minimal intent analyzer for teaching
class TeachingIntentAnalyzer {
  analyzeIntent(message: string): { type: string } {
    // For now, treat everything as a teaching question
    return { type: 'teaching_question' };
  }
}

// Minimal tool call manager for teaching
class TeachingToolCallManager {
  private ollamaService: OllamaService;
  constructor(ollamaService: OllamaService) {
    this.ollamaService = ollamaService;
  }

  async generateTeachingResponse(message: string, context: any): Promise<string> {
    // Get target language from context
    const targetLanguage = context?.language || 'en';
    console.log(`🎓 Teaching Tool Manager: Generating response in ${targetLanguage}`);
    
    // Create a simple teaching prompt - language enforcement is handled by Ollama service
    const prompt = `You are an expert teacher. Explain the following question to a student in a clear, step-by-step way, using examples if helpful. Avoid unnecessary jargon.\n\nQuestion: ${message}`;
    
    console.log(`📝 Teaching Tool Manager: Sending prompt to Ollama in ${targetLanguage}`);
    console.log(`📝 Prompt preview: ${prompt.substring(0, 200)}...`);
    
    // Use the language-aware generation method with strong enforcement
    const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
      temperature: 0.3, // Lower temperature for more consistent language adherence
      maxTokens: 2048,
      context: `Teaching response in ${targetLanguage}`
    });
    
    console.log(`✅ Teaching Tool Manager: Received response in ${targetLanguage}`);
    console.log(`📄 Response preview: ${response.substring(0, 100)}...`);
    return response;
  }

  async searchTeachingContext(query: string, context: any): Promise<any> {
    // Use RAG to get relevant context (optional)
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
      maxSources: 1,
      includeAnnotations: false,
      includeMemories: false,
      searchDepth: 'quick',
      useEmbeddings: true,
      singleDocumentOnly: true,
      targetLanguage: context?.language || 'en'
    });
  }
}

export class AITeacherAgent extends BaseAgent {
  private ollamaService: OllamaService;
  private toolCallManager: TeachingToolCallManager;
  private intentAnalyzer: TeachingIntentAnalyzer;

  constructor() {
    super({
      name: 'AITeacherAgent',
      description: 'Answers questions as a helpful, expert teacher. Focuses on clear, step-by-step explanations.',
      interval: 900000,
      maxRetries: 2,
      timeout: 60000,
      specialties: ['Teaching', 'Explanation', 'Step-by-step Guidance']
    });
    this.ollamaService = new OllamaService({
      model: 'gemma3n:e2b',
      temperature: 0.5
    });
    this.toolCallManager = new TeachingToolCallManager(this.ollamaService);
    this.intentAnalyzer = new TeachingIntentAnalyzer();
  }

  async initialize(): Promise<void> {
    await this.ollamaService.initialize();
  }

  async handleTeachingMessage(message: string, context?: any): Promise<string> {
    console.log(`🎓 Teacher Agent: Processing message in language: ${context?.language || 'en'}`);
    
    // Analyze intent (minimal for now)
    const intent = this.intentAnalyzer.analyzeIntent(message);
    let response = '';
    if (intent.type === 'teaching_question') {
      // Optionally, search for context (RAG)
      let contextResult = null;
      if (context?.documentId) {
        contextResult = await this.toolCallManager.searchTeachingContext(message, context);
      }
      // Generate teaching response
      response = await this.toolCallManager.generateTeachingResponse(message, context);
      console.log(`✅ Teacher Agent: Generated response in ${context?.language || 'en'}`);
      // Optionally, append context if found
      if (contextResult && contextResult.sources && contextResult.sources.length > 0) {
        response += `\n\nRelevant material from your reading:\n`;
        response += contextResult.sources.map((s: any) => `• ${s.excerpt.substring(0, 80)}...`).join('\n');
      }
    } else {
      const targetLanguage = context?.language || 'en';
      const fallbackResponses = {
        'en': "I'm here to help you learn. Please ask a question!",
        'es': "Estoy aquí para ayudarte a aprender. ¡Por favor, haz una pregunta!",
        'fr': "Je suis ici pour vous aider à apprendre. Veuillez poser une question !",
        'de': "Ich bin hier, um Ihnen beim Lernen zu helfen. Bitte stellen Sie eine Frage!",
        'ja': "学習のお手伝いをします。質問をしてください！",
        'ko': "학습을 도와드리겠습니다. 질문해 주세요!"
      };
      response = fallbackResponses[targetLanguage as keyof typeof fallbackResponses] || fallbackResponses.en;
      console.log(`✅ Teacher Agent: Using fallback response in ${targetLanguage}`);
    }
    return response;
  }

  // Minimal processTask for compatibility
  async processTask(task: AgentTask): Promise<any> {
    if (task.type === 'TEACH') {
      return await this.handleTeachingMessage(task.data.message, task.data.context);
    }
    return null;
  }

  async cleanup(): Promise<void> {
    // No-op for now
    return;
  }
} 