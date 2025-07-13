import { BaseAgent, AgentTask } from './base-agent';
import { MultiModelService } from '../services/multi-model-service';
import { OllamaService } from '../services/ollama-service';
import { storage } from '../storage';
import { documentRAGService, RAGContext, RAGResponse } from '../services/document-rag-service.js';

interface ChatContext {
  userId: number;
  documentId?: number;
  chapter?: number;
  language?: string; // Add language field
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

interface StudyRecommendation {
  type: 'passage' | 'topic' | 'question' | 'resource';
  title: string;
  description: string;
  documentId?: number;
  chapter?: number;
  priority: number;
}

export class StudyAssistantAgent extends BaseAgent {
  private multiModelService: MultiModelService;
  private ollamaService: OllamaService;
  private translationService?: any; // Add translation service property
  private chatSessions: Map<string, ChatContext> = new Map();
  private studyPatterns: Map<number, any> = new Map(); // User study patterns
  private userRecommendations: Map<number, StudyRecommendation[]> = new Map();

  constructor() {
    super({
      name: 'StudyAssistantAgent',
      description: 'Provides personalized Bible study assistance and recommendations',
      interval: 1800000, // 30 minutes (less aggressive)
      maxRetries: 3,
      timeout: 45000, // 45 seconds
      specialties: ['Study Assistance', 'Personalized Recommendations', 'Pattern Analysis', 'Content Analysis', 'RAG-Enhanced Responses']
    });

    this.multiModelService = new MultiModelService();
    this.ollamaService = new OllamaService({
      model: 'gemma3n:e2b',
      temperature: 0.5
    });
  }

  async initialize(): Promise<void> {
    await this.multiModelService.initialize();
    await this.ollamaService.initialize();
    this.log('Study Assistant Agent initialized');
  }

  async processTask(task: AgentTask): Promise<any> {
    this.log(`Processing study assistant task: ${task.type}`);
    
    // This agent currently handles its logic via handleChatMessage,
    // so the task processor is empty. We'll add a default case.
    switch (task.type) {
      default:
        this.warn(`Unknown or unhandled study assistant task type: ${task.type}`);
    }
    return null;
  }

  private async updateExpertise(data: any): Promise<void> {
    try {
      const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
      this.log(`🧠 Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
      
      // Update the study assistant's knowledge for better recommendations
      // This could involve updating prompts or adjusting recommendation strategies
      
      this.log(`✅ Study Assistant expertise updated for ${domain}`);
    } catch (error) {
      this.error(`Failed to update expertise: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    this.log('Cleaning up Study Assistant Agent');
  }

  async handleChatMessage(message: string, context?: any): Promise<string> {
    try {
      // Ignore empty messages
      if (!message || message.trim() === '') {
        return '';
      }
      
      // Create or get chat context
      const sessionId = context?.sessionId || 'default';
      let chatContext = this.chatSessions.get(sessionId);
      
      if (!chatContext) {
        chatContext = {
          userId: context?.userId || 2,
          documentId: context?.documentId,
          chapter: context?.chapter,
          language: context?.language || 'en', // Add language to context
          recentMessages: []
        };
        this.chatSessions.set(sessionId, chatContext);
      } else {
        // Update language for existing session
        chatContext.language = context?.language || 'en';
      }
      
      // Add user message to context
      chatContext.recentMessages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // ❓ NEW: Check if the message is a question to determine if RAG is needed
      const isQuestion = this.isQuestion(message);
      
      let response: string;
      
      if (isQuestion) {
        // Use RAG for questions
        response = await this.generateRAGEnhancedResponse(message, chatContext);
      } else {
        // Use a simpler, non-RAG response for non-questions
        response = await this.generateChatResponse(message, chatContext);
      }
      
      // Add assistant response to context
      chatContext.recentMessages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
      
      // Keep only last 10 messages to prevent context overflow
      if (chatContext.recentMessages.length > 10) {
        chatContext.recentMessages = chatContext.recentMessages.slice(-10);
      }
      
      return response;
    } catch (error: any) {
      this.error(`Chat message handling failed: ${error.message}`);
      return "I apologize, but I'm having trouble processing your message right now. Please try again.";
    }
  }

  private async _translateResponse(response: string, language?: string): Promise<string> {
    if (!this.translationService || !language || language === 'en') {
      return response;
    }
    try {
      this.log(`Translating response to ${language}`);
      const translated = await this.translationService.translateText({
        text: response,
        targetLanguage: language as any,
        context: 'explanation'
      });
      return translated.translatedText;
    } catch (error: any) {
      this.error(`Translation failed: ${error.message}. Returning original response.`);
      return response;
    }
  }

  // Helper function to check if a message is a question
  private isQuestion(message: string): boolean {
    const trimmed = message.trim().toLowerCase();
    // Simple check for question mark or question-like words
    return trimmed.endsWith('?') || 
           /^(what|who|where|when|why|how|which|can|is|do|are|does|tell me about)/.test(trimmed);
  }

  // 🧠 NEW: RAG-Enhanced Response Generation
  private async generateRAGEnhancedResponse(message: string, context: ChatContext): Promise<string> {
    try {
      this.log(`🔍 Generating RAG-enhanced response for: "${message.substring(0, 50)}..."`);
      
      // Build RAG context
      const ragContext: RAGContext = {
        userId: context.userId,
        currentDocument: context.documentId,
        currentChapter: context.chapter,
        conversationHistory: context.recentMessages.map(msg => msg.content).slice(-5),
        userStudyPatterns: this.extractUserStudyPatterns(context.userId),
        preferredTopics: await this.getUserPreferredTopics(context.userId),
        studyLevel: await this.getUserStudyLevel(context.userId),
        targetLanguage: context.language || 'en', // Add language to RAG context
      };
      
      console.log(`🎓 Study Assistant: Using RAG with language: ${context.language || 'en'}`);
      
      // Use RAG service to search and generate response
      const ragResponse: RAGResponse = await documentRAGService.processRAGQuery(message, ragContext, {
        maxSources: 5,
        includeAnnotations: true,
        includeMemories: true,
        searchDepth: 'thorough',
        targetLanguage: context.language || 'en' // Pass language to RAG service
      });
      
      // Enhance the response with sources and recommendations
      let enhancedResponse = ragResponse.answer;
      
      // Add source citations if available
      if (ragResponse.sources.length > 0) {
        enhancedResponse += '\n\n📚 **Sources from your materials:**\n';
        ragResponse.sources.slice(0, 3).forEach((source, index) => {
          enhancedResponse += `${index + 1}. **${source.documentTitle}**`;
          
          // Add precise location information
          if (source.source.chapter) {
            enhancedResponse += `, Chapter ${source.source.chapter}`;
          }
          
          enhancedResponse += '\n';
          
          // Show full excerpt with quote formatting
          if (source.excerpt && source.excerpt.length > 0) {
            const fullExcerpt = source.excerpt.length > 300 
              ? source.excerpt.substring(0, 300) + '...' 
              : source.excerpt;
            enhancedResponse += `   > "${fullExcerpt}"\n`;
          }
          
          // Add confidence score if available
          if (source.relevanceScore) {
            enhancedResponse += `   *Relevance: ${Math.round(source.relevanceScore * 100)}%*\n`;
          }
          
          // Add highlighted snippets for better context
          if (source.highlightedSnippets && source.highlightedSnippets.length > 0) {
            enhancedResponse += `   📍 Key passages: ${source.highlightedSnippets.slice(0, 2).join(' | ')}\n`;
          }
          
          enhancedResponse += '\n';
        });
      }
      
      // Add related questions if available
      if (ragResponse.relatedQuestions.length > 0) {
        enhancedResponse += '\n🤔 **You might also want to explore:**\n';
        ragResponse.relatedQuestions.forEach((question, index) => {
          enhancedResponse += `• ${question}\n`;
        });
      }
      
      // Add study recommendations
      if (ragResponse.studyRecommendations.length > 0) {
        enhancedResponse += '\n📖 **Study suggestions:**\n';
        ragResponse.studyRecommendations.forEach((rec, index) => {
          enhancedResponse += `• ${rec}\n`;
        });
      }
      
      this.log(`✅ RAG response generated with ${ragResponse.sources.length} sources (confidence: ${ragResponse.confidence}) in ${context.language || 'en'}`);
      
      return enhancedResponse;
      
    } catch (error: any) {
      this.error(`RAG response generation failed: ${error.message}`);
      // Fallback to simpler response on RAG failure
      return this.generateChatResponse(message, context);
    }
  }

  // Generates a simpler, non-RAG response
  private async generateChatResponse(message: string, context: ChatContext): Promise<string> {
    // Extract language from context
    const language = context.language || 'en';
    console.log(`🎓 Study Assistant: Generating chat response in language: ${language}`);
    
    // Detect content domain from current document
    let contentDomain = 'General Studies';
    let documentTitle = '';
    
    if (context.documentId && context.chapter) {
      try {
        const document = await storage.getDocument(context.documentId);
        if (document) {
          documentTitle = document.title;
          contentDomain = await this.detectContentDomain(document.title, message);
        }
      } catch (error) {
        this.warn(`Could not load document context: ${error}`);
      }
    }

    // Create domain-specific system prompt
    const systemPrompt = this.getDomainSpecificPrompt(contentDomain, documentTitle);
    const fullPrompt = `${systemPrompt}\n\n${context.recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\nassistant:`;

    try {
      // Use language-aware generation with Ollama service
      const response = await this.ollamaService.generateTextWithLanguage(fullPrompt, language, {
        temperature: 0.6,
        maxTokens: 400,
        context: `Study Assistant response in ${language}`
      });
      
      console.log(`✅ Study Assistant: Generated response in ${language}`);
      return response;
    } catch (error: any) {
      this.error(`Chat response generation failed: ${error.message}`);
      return 'I am having trouble formulating a response right now. Could you try rephrasing?';
    }
  }

  private async detectContentDomain(title: string, userMessage: string): Promise<string> {
    const combinedText = `${title} ${userMessage}`.toLowerCase();
    
    // Economics & Finance
    if (this.matchesKeywords(combinedText, ['cbdc', 'central bank', 'digital currency', 'cryptocurrency', 'bitcoin', 'blockchain', 'monetary policy', 'federal reserve', 'economy', 'economic', 'finance', 'financial', 'market', 'investment', 'banking', 'money', 'currency', 'inflation', 'recession'])) {
      return 'Economics/Finance';
    }
    
    // Technology & Computing
    if (this.matchesKeywords(combinedText, ['technology', 'computer', 'software', 'programming', 'algorithm', 'artificial intelligence', 'machine learning', 'data', 'digital', 'internet', 'cybersecurity'])) {
      return 'Technology/Computing';
    }
    
    // Science
    if (this.matchesKeywords(combinedText, ['physics', 'chemistry', 'biology', 'quantum', 'energy', 'molecule', 'cell', 'dna', 'evolution', 'scientific', 'research', 'experiment'])) {
      return 'Science';
    }
    
    // Business & Management
    if (this.matchesKeywords(combinedText, ['business', 'management', 'strategy', 'marketing', 'leadership', 'organization', 'corporate', 'entrepreneur', 'startup', 'company'])) {
      return 'Business/Management';
    }
    
    // Philosophy & Ethics
    if (this.matchesKeywords(combinedText, ['philosophy', 'ethics', 'moral', 'philosophical', 'logic', 'reasoning', 'virtue', 'justice', 'truth', 'knowledge'])) {
      return 'Philosophy/Ethics';
    }
    
    // History & Politics
    if (this.matchesKeywords(combinedText, ['history', 'historical', 'politics', 'political', 'government', 'democracy', 'war', 'revolution', 'civilization', 'empire'])) {
      return 'History/Politics';
    }
    
    // Religious/Spiritual (only if explicitly religious content)
    if (this.matchesKeywords(combinedText, ['bible', 'biblical', 'god', 'jesus', 'christian', 'faith', 'prayer', 'spiritual', 'religious', 'scripture', 'church', 'theology'])) {
      return 'Religious/Biblical Studies';
    }
    
    return 'General Studies';
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private getDomainSpecificPrompt(domain: string, documentTitle: string): string {
    return `You are a knowledgeable and helpful universal reading assistant. You adapt your expertise to whatever content the user is reading.

Your core abilities:
- Understand and explain concepts from any field or domain
- Provide clear, accessible explanations regardless of subject matter
- Help users think critically about ideas and information
- Suggest relevant resources and further reading
- Connect theoretical concepts to practical applications
- Adapt your communication style to the user's level of understanding

Universal Guidelines:
- Listen carefully to what the user is asking about
- Explain concepts clearly with relevant examples
- Ask clarifying questions when you need more context
- Provide balanced perspectives on complex topics
- Be encouraging and supportive of learning
- Respect different viewpoints and interpretations
- Focus on helping the user understand and engage with their material
- Draw connections between ideas when helpful
- Suggest practical applications when relevant

Current Context: The user is reading "${documentTitle}" which appears to be in the ${domain} domain. Adapt your responses to be most helpful for this type of content while maintaining your universal approach to learning and understanding.`;
  }

  private async analyzeStudyPatterns(): Promise<void> {
    this.log('Analyzing study patterns for all users');
    
    try {
      // Analyze patterns for each user
      for (const [userId, patterns] of Array.from(this.studyPatterns.entries())) {
        const patternAnalysis = await this.analyzeUserPatterns(userId, patterns);
        
        // Generate recommendations based on patterns
        const recommendations = await this.createRecommendations(userId, patternAnalysis);
        
        // Store recommendations for this user
        this.userRecommendations.set(userId, recommendations);
        
        // Emit pattern analysis results
        this.emit('patternAnalysis', {
          userId,
          patterns: patternAnalysis,
          recommendations
        });
      }
      
      // Find trending themes across all users
      const allThemes = new Map<string, number>();
      for (const patterns of Array.from(this.studyPatterns.values())) {
        patterns.forEach((pattern: any) => {
          pattern.themes?.forEach((theme: string) => {
            allThemes.set(theme, (allThemes.get(theme) || 0) + 1);
          });
        });
      }
      
      // Get top trending themes
      const topThemes = Array.from(allThemes.entries())
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10);
      
      // Generate insights for trending themes
      for (const [theme] of topThemes) {
        const insight = await this.generateThemeInsight(theme);
        this.emit('trendingTheme', { theme, insight });
      }
      
    } catch (error) {
      this.error(`Error analyzing study patterns: ${error}`);
    }
  }

  private async analyzeUserPatterns(userId: number, patterns: any): Promise<any> {
    // Analyze user patterns and return analysis
    return {
      mostReadBooks: [],
      favoriteTopics: [],
      readingFrequency: 0,
      annotationPatterns: []
    };
  }

  private async generateThemeInsight(theme: string): Promise<string> {
    // Generate insights for a theme using the multi-model service
    try {
      const { response } = await this.multiModelService.executeTask('creative-insights', `Generate an educational insight about the theme: ${theme}`);
      return response;
    } catch (error) {
      return `Insight for ${theme}: This theme appears frequently in user study patterns.`;
    }
  }

  private extractStudyPatterns(annotations: any[], documents: any[]): any {
    const patterns = {
      favoriteThemes: new Map<string, number>(),
      studyFrequency: 0,
      preferredBooks: new Map<string, number>(),
      questionTypes: new Map<string, number>(),
      lastActiveDate: new Date()
    };

    // Analyze annotations for themes and patterns
    annotations.forEach(annotation => {
      // Extract themes from annotation text
      const themes = this.extractThemesFromText(annotation.note);
      themes.forEach(theme => {
        patterns.favoriteThemes.set(theme, (patterns.favoriteThemes.get(theme) || 0) + 1);
      });
    });

    // Analyze document preferences
    documents.forEach(doc => {
      patterns.preferredBooks.set(doc.title, (patterns.preferredBooks.get(doc.title) || 0) + 1);
    });

    return patterns;
  }

  private extractThemesFromText(text: string, contentDomain?: string): string[] {
    const themes: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Universal theme extraction - looks for common patterns across all domains
    const universalKeywords = {
      'key_concepts': ['concept', 'principle', 'theory', 'idea', 'notion', 'framework'],
      'analysis': ['analysis', 'examine', 'evaluate', 'assess', 'review', 'study'],
      'methodology': ['method', 'approach', 'technique', 'process', 'procedure', 'system'],
      'evidence': ['evidence', 'data', 'proof', 'research', 'finding', 'result'],
      'application': ['application', 'practical', 'use', 'implementation', 'example', 'case'],
      'development': ['develop', 'growth', 'progress', 'evolution', 'advancement', 'change'],
      'relationships': ['relationship', 'connection', 'link', 'correlation', 'association', 'pattern'],
      'problem_solving': ['problem', 'solution', 'challenge', 'issue', 'resolution', 'answer'],
      'innovation': ['innovation', 'creative', 'new', 'novel', 'breakthrough', 'discovery'],
      'impact': ['impact', 'effect', 'influence', 'consequence', 'outcome', 'result'],
      'comparison': ['compare', 'contrast', 'difference', 'similarity', 'versus', 'alternative'],
      'historical_context': ['history', 'historical', 'past', 'origin', 'background', 'context'],
      'future_implications': ['future', 'prediction', 'forecast', 'trend', 'projection', 'outlook'],
      'critical_thinking': ['critical', 'question', 'debate', 'argument', 'perspective', 'viewpoint']
    };

    // Extract themes based on universal patterns
    Object.entries(universalKeywords).forEach(([theme, words]) => {
      if (words.some(word => lowerText.includes(word))) {
        themes.push(theme);
      }
    });

    // Add domain context as additional theme if detected
    if (contentDomain && contentDomain !== 'General Studies') {
      themes.push(`domain_${contentDomain.toLowerCase().replace(/[^a-z]/g, '_')}`);
    }

    return themes;
  }

  private async generatePersonalizedRecommendations(): Promise<void> {
    try {
      this.log('Generating personalized study recommendations...');
      
      for (const [userId, patterns] of Array.from(this.studyPatterns.entries())) {
        const recommendations = await this.createRecommendations(userId, patterns);
        
        // Store recommendations (this could be saved to database)
        this.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
        
        // Emit recommendations for real-time delivery
        this.emit('recommendationsGenerated', {
          userId,
          recommendations
        });
      }
      
      // Schedule next recommendation generation
      setTimeout(() => {
        this.addTask('GENERATE_RECOMMENDATIONS', {}, 1);
      }, 3600000); // 1 hour
      
    } catch (error) {
      this.error(`Error generating recommendations: ${error}`);
    }
  }

  private async createRecommendations(userId: number, patterns: any): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];
    
    try {
      // Get user's documents
      const documents = await storage.getDocuments(userId);
      
      // Generate theme-based recommendations
      const topThemes = Array.from(patterns.favoriteThemes.entries()) as [string, number][];
      topThemes.sort((a, b) => b[1] - a[1]);
      const top3Themes = topThemes.slice(0, 3);
      
      for (const [theme] of top3Themes) {
        const prompt = `Suggest a meaningful study topic or resource related to "${theme}" for someone interested in learning and growth. Provide a brief, encouraging description.`;
        
        const { response } = await this.multiModelService.executeTask('creative-insights', prompt, { temperature: 0.5 });
        
        recommendations.push({
          type: 'topic',
          title: `Study on ${theme.charAt(0).toUpperCase() + theme.slice(1)}`,
          description: response,
          priority: 3
        });
      }
      
      // Generate study questions based on recent activity
      if (documents.length > 0) {
        const recentDoc = documents[0]; // Most recent document
        const prompt = `Create 3 thoughtful study questions for someone reading "${recentDoc.title}". Make them practical and encouraging for learning and understanding.`;
        
        const { response } = await this.multiModelService.executeTask('creative-insights', prompt, { temperature: 0.6 });
        
        recommendations.push({
          type: 'question',
          title: `Study Questions for ${recentDoc.title}`,
          description: response,
          documentId: recentDoc.id,
          priority: 2
        });
      }
      
    } catch (error) {
      this.warn(`Error creating recommendations for user ${userId}: ${error}`);
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // Public methods for external access
  public async startChatSession(sessionId: string, context?: any): Promise<void> {
    this.chatSessions.set(sessionId, {
      userId: context?.userId || 2,
      documentId: context?.documentId,
      chapter: context?.chapter,
      recentMessages: []
    });
  }

  public async endChatSession(sessionId: string): Promise<void> {
    this.chatSessions.delete(sessionId);
  }

  public getActiveSessionsCount(): number {
    return this.chatSessions.size;
  }

  // 🔧 RAG Helper Methods
  private extractUserStudyPatterns(userId: number): string[] {
    const patterns = this.studyPatterns.get(userId);
    if (!patterns) return ['general study', 'biblical text analysis'];
    
    return patterns.studyTopics || ['general study'];
  }

  private async getUserPreferredTopics(userId: number): Promise<string[]> {
    try {
      const patterns = this.studyPatterns.get(userId);
      if (patterns?.studyTopics) {
        return patterns.studyTopics;
      }
      
      // Fallback: analyze user's annotations to determine preferred topics
      const annotations = await storage.getAnnotations(userId);
      const topics = new Set<string>();
      
      annotations.forEach(annotation => {
        const themes = this.extractThemesFromText(annotation.note);
        themes.forEach(theme => topics.add(theme));
      });
      
      return Array.from(topics).slice(0, 5);
    } catch (error) {
      this.warn(`Could not determine user preferred topics: ${error}`);
      return ['faith', 'prayer', 'study'];
    }
  }

  private async getUserStudyLevel(userId: number): Promise<'beginner' | 'intermediate' | 'advanced'> {
    try {
      const patterns = this.studyPatterns.get(userId);
      if (patterns?.comprehensionLevel) {
        if (patterns.comprehensionLevel < 4) return 'beginner';
        if (patterns.comprehensionLevel < 7) return 'intermediate';
        return 'advanced';
      }
      
      // Fallback: analyze user's annotation complexity
      const annotations = await storage.getAnnotations(userId);
      if (annotations.length === 0) return 'beginner';
      
      const avgAnnotationLength = annotations.reduce((sum, ann) => sum + ann.note.length, 0) / annotations.length;
      
      if (avgAnnotationLength < 50) return 'beginner';
      if (avgAnnotationLength < 150) return 'intermediate';
      return 'advanced';
    } catch (error) {
      this.warn(`Could not determine user study level: ${error}`);
      return 'intermediate';
    }
  }

  setTranslationService(translationService: any): void {
    this.translationService = translationService;
    this.log('Translation service set for Study Assistant Agent.');
  }

  private isResponseInEnglish(response: string): boolean {
    // Simple heuristic to detect if response is likely in English
    const englishWords = ['the', 'and', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'with', 'on', 'at', 'by'];
    const words = response.toLowerCase().split(/\s+/).slice(0, 20); // Check first 20 words
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    return englishWordCount >= 3; // If 3+ common English words, likely English
  }
} 