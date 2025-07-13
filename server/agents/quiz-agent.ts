import { BaseAgent, AgentTask } from './base-agent';
import { OllamaService } from '../services/ollama-service';
import { storage } from '../storage';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { documentRAGService, RAGContext, RAGResponse } from '../services/document-rag-service.js';

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  source: {
    documentId: number;
    chapter?: number;
    verse?: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  tags: string[];
  createdAt: Date;
  documentId: number;
  chapter?: number;
}

interface QuizContext {
  userId: number;
  documentId?: number;
  chapter?: number;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredQuestionTypes: string[];
  recentQuizzes: Quiz[];
}

export class QuizAgent extends BaseAgent {
  private ollamaService?: OllamaService;
  private quizSessions: Map<string, QuizContext> = new Map();
  private userQuizHistory: Map<number, Quiz[]> = new Map();
  private quizTemplates: Map<string, any> = new Map();
  private translationService?: any; // Will be injected

  constructor(ollamaService?: OllamaService) {
    super({
      name: 'QuizAgent',
      description: 'Generates personalized quizzes about biblical content',
      interval: 300000, // 5 minutes
      maxRetries: 3,
      timeout: 180000, // 180 seconds (3 minutes) for longer quiz generation
      specialties: ['Quiz Generation', 'Assessment Creation', 'Multi-language Quizzes', 'Difficulty Adaptation', 'Performance Analysis']
    });

    this.ollamaService = ollamaService;
  }

  setOllamaService(ollamaService: OllamaService): void {
    this.ollamaService = ollamaService;
  }

  setTranslationService(service: any): void {
    this.translationService = service;
    this.log('🌐 Translation service set for Quiz Agent');
  }

  async initialize(): Promise<void> {
    this.log('Quiz Agent initialized');
    await this.loadQuizTemplates();
  }

  async processTask(task: AgentTask): Promise<any> {
    this.log(`Processing quiz agent task: ${task.type}`);
    
    switch (task.type) {
      case 'GENERATE_QUIZ':
        return await this.generateQuiz(task.data);
      case 'ANALYZE_QUIZ_PERFORMANCE':
        return await this.analyzeQuizPerformance(task.data);
      case 'ADAPT_QUIZ_DIFFICULTY':
        return await this.adaptQuizDifficulty(task.data);
      case 'GENERATE_DAILY_QUIZ':
        return await this.generateDailyQuiz(task.data);
      default:
        this.warn(`Unknown quiz agent task type: ${task.type}`);
        return null;
    }
  }

  async cleanup(): Promise<void> {
    this.log('Cleaning up Quiz Agent');
  }

  async generateQuiz(data: {
    documentId: number;
    chapter?: number;
    userId: number;
    sessionId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    questionTypes?: string[];
    numQuestions?: number;
    language?: string; // Add language parameter
  }): Promise<Quiz> {
    try {
      const {
        documentId,
        chapter,
        userId,
        sessionId = 'default',
        difficulty = 'intermediate',
        questionTypes = ['multiple-choice', 'true-false'],
        numQuestions = 5,
        language = 'en'
      } = data;

      this.log(`🎯 Generating quiz for document ${documentId}, chapter ${chapter} in ${language}`);
      this.log(`🔧 Translation service available: ${this.translationService ? 'YES' : 'NO'}`);

      // Clear cache for this specific document to ensure fresh content
      if (this.ollamaService) {
        this.ollamaService.clearCacheForDocument(documentId, chapter);
      }
      
      // Also clear query result cache for this document to prevent cross-document contamination
      try {
        const { QueryResultCacheService } = await import('../services/query-result-cache-service.js');
        const queryCache = new QueryResultCacheService();
        await queryCache.invalidateContext(userId, documentId);
      } catch (error) {
        this.warn(`Failed to clear query cache: ${error}`);
      }

      // Get or create quiz context
      let context = this.quizSessions.get(sessionId);
      if (!context) {
        context = {
          userId,
          documentId,
          chapter,
          userLevel: difficulty,
          preferredQuestionTypes: questionTypes,
          recentQuizzes: []
        };
        this.quizSessions.set(sessionId, context);
      }

      // Get document content for quiz generation
      const documentResult = await this.getDocumentContent(documentId, chapter);
      if (!documentResult) {
        throw new Error('Document content not found');
      }

      const { content: documentContent, title: documentTitle } = documentResult;

      // Build RAG context for enhanced quiz generation
      const ragContext: RAGContext = {
        userId,
        currentDocument: documentId,
        currentChapter: chapter,
        conversationHistory: [],
        userStudyPatterns: await this.getUserStudyPatterns(userId),
        preferredTopics: await this.getUserPreferredTopics(userId),
        studyLevel: difficulty
      };

      // Generate quiz using AI with language support
      const quiz = await this.generateQuizWithAI(documentContent, context, ragContext, numQuestions, documentTitle, language);

      // Save quiz to user history
      this.saveQuizToHistory(userId, quiz);

      this.log(`✅ Quiz generated successfully with ${quiz.questions.length} questions in ${language}`);
      return quiz;

    } catch (error: any) {
      this.error(`Failed to generate quiz: ${error.message}`);
      throw new Error('Quiz generation is taking longer than usual. Please wait a moment and try again if you don\'t see a result.');
    }
  }

  private async generateQuizWithAI(
    content: string,
    context: QuizContext,
    ragContext: RAGContext,
    numQuestions: number,
    documentTitle: string,
    language: string = 'en' // Add language parameter
  ): Promise<Quiz> {
    if (!this.ollamaService) {
      throw new Error('Ollama service is not connected');
    }

    this.log(`🧠 Starting AI quiz generation in ${language}`);
    
    const prompt = this.buildQuizGenerationPrompt(content, context, numQuestions, documentTitle, language);
    
    // Use language-aware generation with document context
    let response: string;
    const documentContext = `document: ${context.documentId}, chapter: ${context.chapter || 'all'}`;
    
    if (language !== 'en') {
      this.log(`🌐 Using language-aware generation for ${language}`);
      response = await this.ollamaService.generateTextWithLanguage(prompt, language, {
        context: documentContext,
        temperature: 0.2
      });
      this.log(`📝 AI Response preview: "${response.substring(0, 100)}..."`);
    } else {
      this.log(`🇺🇸 Using English generation`);
      response = await this.ollamaService.generateText(prompt, {
        context: documentContext,
        temperature: 0.2
      });
    }
    
    // Parse the AI response to extract quiz structure
    const quiz = await this.parseQuizFromResponse(response, context, language);
    
    // If quiz is in English but target language is not English, try translation
    if (language !== 'en' && this.translationService && this.isQuizInEnglish(quiz)) {
      this.log(`🔄 Quiz appears to be in English, attempting translation to ${language}`);
      try {
        const translatedQuiz = await this.translationService.translateQuizContent(quiz, language);
        this.log(`✅ Quiz translated successfully to ${language}`);
        
        // Enhance questions with RAG insights
        const enhancedQuiz = await this.enhanceQuizWithRAG(translatedQuiz, ragContext);
        return enhancedQuiz;
      } catch (error) {
        this.warn(`❌ Translation failed: ${error}, returning original quiz`);
      }
    }
    
    // Enhance questions with RAG insights
    const enhancedQuiz = await this.enhanceQuizWithRAG(quiz, ragContext);
    
    return enhancedQuiz;
  }

  private buildQuizGenerationPrompt(content: string, context: QuizContext, numQuestions: number, documentTitle: string, language: string = 'en'): string {
    const difficulty = context.userLevel;
    const questionTypes = context.preferredQuestionTypes.join(', ');
    
    // Get more content - use up to 8000 characters for better context
    const contentToUse = content.length > 8000 ? content.substring(0, 8000) + '...' : content;
    
    // Language-specific formatting instructions
    const formatInstructions = this.getLanguageSpecificFormatInstructions(language, numQuestions);
    
    // Language-specific main prompt
    const mainPrompt = this.getLanguageSpecificMainPrompt(language, difficulty, documentTitle, numQuestions, questionTypes);
    
    return `${mainPrompt}

DOCUMENT CONTENT TO QUIZ ON:
${contentToUse}

${formatInstructions}

**Quiz Details:**
- **Total Questions:** ${numQuestions}
- **Estimated Time:** ${numQuestions * 2} minutes
- **Difficulty:** ${difficulty}
- **Document:** ${documentTitle}`;
  }

  private extractJsonFromString(text: string): string | null {
    // Try to find JSON object with proper balancing
    let openBraces = 0;
    let start = -1;
    let end = -1;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (start === -1) start = i;
        openBraces++;
      } else if (text[i] === '}') {
        openBraces--;
        if (openBraces === 0 && start !== -1) {
          end = i;
          break;
        }
      }
    }
    
    if (start !== -1 && end !== -1) {
      return text.substring(start, end + 1);
    }
    
    // Fallback to simple regex
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  }

  private completeQuestionObject(partialQuestion: Partial<QuizQuestion>, index: number, context: QuizContext): QuizQuestion {
    return {
      id: `q_${index}_${Date.now()}`,
      type: partialQuestion.type || 'multiple-choice',
      question: partialQuestion.question || `Question ${index + 1}`,
      options: partialQuestion.options || [],
      correctAnswer: partialQuestion.correctAnswer || (partialQuestion.options?.[0] || 'Unknown'),
      explanation: partialQuestion.explanation || 'No explanation provided.',
      difficulty: 'medium',
      tags: ['parsed-question'],
      source: {
        documentId: context.documentId || 0,
        chapter: context.chapter
      }
    };
  }

  private async repairInvalidJSON(invalidJson: string): Promise<string> {
    if (!this.ollamaService) {
        throw new Error('Ollama service not available for JSON repair.');
    }
    this.log('-> Sending broken JSON to AI for repair.');
    const prompt = `
The following text is supposed to be a single, valid JSON object, but it contains syntax errors.
Fix the errors and return ONLY the corrected, valid JSON object. Do not provide any explanation or surrounding text.

Broken JSON:
---
${invalidJson}
---

Corrected JSON:
`;
    const repairedResponse = await this.ollamaService.generateText(prompt);
    const extractedRepairedJson = this.extractJsonFromString(repairedResponse);

    if (!extractedRepairedJson) {
        throw new Error('AI failed to return a valid JSON object during the repair attempt.');
    }
    this.log('<- Received repaired JSON from AI.');
    return extractedRepairedJson;
  }

  private constructQuizObject(quizData: any, context: QuizContext): Quiz {
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Parsed JSON is valid but is missing a non-empty "questions" array.');
    }
    
    const quiz: Quiz = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: quizData.title || quizData.quizTitle || `Quiz: Document ${context.documentId}`,
      description: quizData.description || 'A quiz to test your knowledge.',
      questions: quizData.questions.map((q: any, index: number) => ({
        id: `q_${index}_${Date.now()}`,
        type: q.type || q.questionType || 'multiple-choice',
        question: q.question || q.questionText || `Question ${index + 1}`,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'No explanation provided.',
        difficulty: q.difficulty || 'medium',
        tags: q.tags || [],
        source: {
          documentId: context.documentId || 0,
          chapter: context.chapter
        }
      })),
      difficulty: context.userLevel,
      estimatedTime: quizData.estimatedTime || (quizData.questions.length * 2),
      tags: quizData.tags || ['quiz'],
      createdAt: new Date(),
      documentId: context.documentId || 0,
      chapter: context.chapter
    };
    
    this.log(`✅ Successfully constructed quiz object with ${quiz.questions.length} questions.`);
    return quiz;
  }

  private createFallbackQuiz(context: QuizContext): Quiz {
    const chapterText = context.chapter ? ` Chapter ${context.chapter}` : '';
    return {
      id: `quiz_fallback_${Date.now()}`,
      title: `Quiz: Document${chapterText}`,
      description: 'Test your understanding of this document\'s content',
      questions: [
        {
          id: 'q_1',
          type: 'multiple-choice',
          question: 'What is a central theme in this document?',
          options: ['Main theme or concept', 'Secondary theme', 'Supporting idea', 'Background information'],
          correctAnswer: 'Main theme or concept',
          explanation: 'Documents typically have main themes or central concepts that are developed throughout the text.',
          difficulty: 'medium',
          tags: ['main-theme', 'content-analysis'],
          source: {
            documentId: context.documentId || 0,
            chapter: context.chapter
          }
        },
        {
          id: 'q_2',
          type: 'true-false',
          question: 'Understanding the context is important for comprehending the document\'s message.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Context is crucial for proper understanding of any written material, including its themes, characters, and intended message.',
          difficulty: 'easy',
          tags: ['comprehension', 'context'],
          source: {
            documentId: context.documentId || 0,
            chapter: context.chapter
          }
        }
      ],
      difficulty: context.userLevel,
      estimatedTime: 5,
      tags: ['document-content', 'fallback'],
      createdAt: new Date(),
      documentId: context.documentId || 0,
      chapter: context.chapter
    };
  }

  private async enhanceQuizWithRAG(quiz: Quiz, ragContext: RAGContext): Promise<Quiz> {
    try {
      // Use RAG to enhance questions with additional context
      const enhancedQuestions = await Promise.all(
        quiz.questions.map(async (question) => {
          const ragResponse = await documentRAGService.processRAGQuery(
            question.question,
            ragContext,
            { maxSources: 2, includeAnnotations: true }
          );

          // Enhance explanation with RAG insights
          if (ragResponse.sources.length > 0) {
            question.explanation += `\n\n📚 Additional context: ${ragResponse.sources[0].excerpt}`;
          }

          return question;
        })
      );

      return {
        ...quiz,
        questions: enhancedQuestions
      };
    } catch (error) {
      this.warn(`Failed to enhance quiz with RAG: ${error}`);
      return quiz;
    }
  }

  private async getDocumentContent(documentId: number, chapter?: number): Promise<{ content: string; title: string } | null> {
    this.log(`Fetching content for document ${documentId}, chapter ${chapter || 'all'}`);
    
    try {
      const document = await db.query.documents.findFirst({
        where: eq(schema.documents.id, documentId),
      });

      if (!document) {
        this.warn(`Document with ID ${documentId} not found.`);
        return null;
      }

      let content = document.content;
      if (chapter && document.content) {
        try {
          const parsedContent = JSON.parse(document.content);
          const chapterData = parsedContent.chapters.find((c: any) => c.number === chapter);
          if (chapterData) {
            content = chapterData.paragraphs.map((p: any) => p.text).join('\n\n');
          } else {
            this.warn(`Chapter ${chapter} not found in document ${documentId}. Falling back to full document.`);
          }
        } catch (error) {
          this.error(`Failed to parse document content for chapter selection: ${error}`);
          // Fallback to full content
        }
      }
      
      this.log(`✅ Successfully fetched content for document ${documentId}.`);
      return { content, title: document.title };

    } catch (error) {
      this.error(`❌ Failed to fetch document content: ${error}`);
      return null;
    }
  }

  private async getUserStudyPatterns(userId: number): Promise<string[]> {
    // This would integrate with the learning agent
    return ['literary analysis', 'content comprehension', 'thematic understanding'];
  }

  private async getUserPreferredTopics(userId: number): Promise<string[]> {
    // This would integrate with user preferences
    return ['character development', 'main themes', 'narrative structure', 'key concepts'];
  }

  private saveQuizToHistory(userId: number, quiz: Quiz): void {
    if (!this.userQuizHistory.has(userId)) {
      this.userQuizHistory.set(userId, []);
    }
    
    const userHistory = this.userQuizHistory.get(userId)!;
    userHistory.push(quiz);
    
    // Keep only last 20 quizzes
    if (userHistory.length > 20) {
      userHistory.splice(0, userHistory.length - 20);
    }
  }

  private async loadQuizTemplates(): Promise<void> {
    // Load predefined quiz templates for different content types
    this.quizTemplates.set('narrative', {
      questionTypes: ['multiple-choice', 'true-false', 'short-answer'],
      focus: 'plot, characters, themes'
    });
    
    this.quizTemplates.set('teaching', {
      questionTypes: ['multiple-choice', 'fill-in-blank', 'short-answer'],
      focus: 'principles, applications, concepts'
    });
    
    this.quizTemplates.set('poetry', {
      questionTypes: ['multiple-choice', 'short-answer'],
      focus: 'imagery, symbolism, themes'
    });
  }

  async analyzeQuizPerformance(data: { quizId: string; userId: number; answers: any[] }): Promise<any> {
    // Analyze user performance and provide insights
    return {
      score: 85,
      strengths: ['biblical knowledge', 'theological understanding'],
      areasForImprovement: ['historical context', 'cross-references'],
      recommendations: ['Study more historical background', 'Practice connecting themes across books']
    };
  }

  async adaptQuizDifficulty(data: { userId: number; performance: any }): Promise<'beginner' | 'intermediate' | 'advanced'> {
    // Adapt difficulty based on user performance
    const { performance } = data;
    
    if (performance.score < 60) {
      return 'beginner';
    } else if (performance.score > 85) {
      return 'advanced';
    } else {
      return 'intermediate';
    }
  }

  async generateDailyQuiz(data: { userId: number; documentId?: number }): Promise<Quiz> {
    // Generate a daily quiz based on user's study patterns
    const documentId = data.documentId || 1; // Use provided document or fallback
    return await this.generateQuiz({
      documentId,
      userId: data.userId,
      difficulty: 'intermediate',
      numQuestions: 5
    });
  }

  // Public methods for external access
  async handleQuizRequest(message: string, context?: any): Promise<Quiz> {
    try {
      const sessionId = context?.sessionId || 'default';
      const userId = context?.userId || 2;
      const documentId = context?.documentId;
      const chapter = context?.chapter;
      const language = context?.language || 'en';

      // Parse the request to determine quiz parameters
      const quizParams = this.parseQuizRequest(message);
      
      return await this.generateQuiz({
        documentId: documentId || 1,
        chapter,
        userId,
        sessionId,
        language, // Pass language to quiz generation
        ...quizParams
      });
    } catch (error) {
      this.error(`Quiz request handling failed: ${error}`);
      throw error;
    }
  }

  private parseQuizRequest(message: string): any {
    const lowerMessage = message.toLowerCase();
    
    // Extract difficulty
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
    if (lowerMessage.includes('easy') || lowerMessage.includes('beginner')) {
      difficulty = 'beginner';
    } else if (lowerMessage.includes('hard') || lowerMessage.includes('advanced')) {
      difficulty = 'advanced';
    }

    // Extract question types
    const questionTypes: string[] = ['multiple-choice', 'true-false'];
    if (lowerMessage.includes('fill in') || lowerMessage.includes('blank')) {
      questionTypes.push('fill-in-blank');
    }
    if (lowerMessage.includes('short answer') || lowerMessage.includes('essay')) {
      questionTypes.push('short-answer');
    }

    // Extract number of questions
    const numMatch = message.match(/(\d+)\s*questions?/);
    const numQuestions = numMatch ? parseInt(numMatch[1]) : 5;

    return {
      difficulty,
      questionTypes,
      numQuestions
    };
  }

  getQuizHistory(userId: number): Quiz[] {
    return this.userQuizHistory.get(userId) || [];
  }

  getActiveSessionsCount(): number {
    return this.quizSessions.size;
  }

  // Enhanced generateQuiz method with language support
  async generateMultilingualQuiz(data: {
    documentId: number;
    chapter?: number;
    userId: number;
    sessionId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    questionTypes?: string[];
    numQuestions?: number;
    targetLanguage?: string; // New: Target language for quiz
  }): Promise<Quiz> {
    try {
      const {
        documentId,
        chapter,
        userId,
        sessionId = 'default',
        difficulty = 'intermediate',
        questionTypes = ['multiple-choice', 'true-false'],
        numQuestions = 5,
        targetLanguage = 'en'
      } = data;

      this.log(`🌐 Generating ${targetLanguage} quiz for document ${documentId}, chapter ${chapter}`);

      // Generate quiz in English first
      const englishQuiz = await this.generateQuiz({
        documentId,
        chapter,
        userId,
        sessionId,
        difficulty,
        questionTypes,
        numQuestions
      });

      // If target language is English, return as-is
      if (targetLanguage === 'en' || !this.translationService) {
        return englishQuiz;
      }

      // Translate quiz to target language
      this.log(`🔄 Translating quiz to ${targetLanguage}...`);
      const translatedQuiz = await this.translationService.translateQuizContent(
        englishQuiz,
        targetLanguage
      );

      this.log(`✅ Multilingual quiz generated successfully in ${targetLanguage}`);
      return translatedQuiz;

    } catch (error) {
      this.error(`Failed to generate multilingual quiz: ${error}`);
      throw error;
    }
  }

  // Enhanced quiz request handler with language detection
  async handleMultilingualQuizRequest(message: string, context?: any): Promise<Quiz> {
    try {
      const sessionId = context?.sessionId || 'default';
      const userId = context?.userId || 2;
      const documentId = context?.documentId;
      const chapter = context?.chapter;
      const targetLanguage = context?.language || 'en';

      // Parse the request to determine quiz parameters
      const quizParams = this.parseQuizRequest(message);
      
      return await this.generateMultilingualQuiz({
        documentId: documentId || 1,
        chapter,
        userId,
        sessionId,
        targetLanguage,
        ...quizParams
      });
    } catch (error) {
      this.error(`Multilingual quiz request handling failed: ${error}`);
      throw error;
    }
  }

  // Language-specific main prompt
  private getLanguageSpecificMainPrompt(language: string, difficulty: string, documentTitle: string, numQuestions: number, questionTypes: string): string {
    switch (language) {
      case 'es':
        return `Eres un educador experto creando un cuestionario de nivel ${difficulty} sobre el libro/documento titulado "${documentTitle}".

REQUISITOS:
- Crea exactamente ${numQuestions} preguntas sobre el CONTENIDO ESPECÍFICO de "${documentTitle}"
- Tipos de preguntas: ${questionTypes}
- Nivel de dificultad: ${difficulty}
- Enfócate en el contenido único de este libro: personajes, eventos, temas, conceptos y detalles
- Las preguntas deben ser únicas para "${documentTitle}" y NO aplicables a otros libros
- Incluye referencias específicas a pasajes, citas o conceptos de este texto
- Cada pregunta debe evaluar la comprensión del contenido real de "${documentTitle}"
- Etiqueta las preguntas con temas relevantes para este libro específico (ej: "desarrollo-personaje", "tema-principal", "contexto-histórico")
- NO hagas suposiciones genéricas - basa todo en el contenido real proporcionado`;

      case 'fr':
        return `Vous êtes un éducateur expert créant un quiz de niveau ${difficulty} sur le livre/document intitulé "${documentTitle}".

EXIGENCES:
- Créez exactement ${numQuestions} questions sur le CONTENU SPÉCIFIQUE de "${documentTitle}"
- Types de questions: ${questionTypes}
- Niveau de difficulté: ${difficulty}
- Concentrez-vous sur le contenu unique de ce livre: personnages, événements, thèmes, concepts et détails
- Les questions doivent être uniques à "${documentTitle}" et NON applicables à d'autres livres
- Incluez des références spécifiques aux passages, citations ou concepts de ce texte
- Chaque question doit tester la compréhension du contenu réel de "${documentTitle}"
- Étiquetez les questions avec des thèmes pertinents pour ce livre spécifique (ex: "développement-personnage", "thème-principal", "contexte-historique")
- NE faites PAS d'hypothèses génériques - basez tout sur le contenu réel fourni`;

      case 'de':
        return `Sie sind ein Expertenpädagoge, der ein ${difficulty}-Level-Quiz über das Buch/Dokument mit dem Titel "${documentTitle}" erstellt.

ANFORDERUNGEN:
- Erstellen Sie genau ${numQuestions} Fragen über den SPEZIFISCHEN INHALT von "${documentTitle}"
- Fragetypen: ${questionTypes}
- Schwierigkeitsgrad: ${difficulty}
- Konzentrieren Sie sich auf den einzigartigen Inhalt dieses Buches: Charaktere, Ereignisse, Themen, Konzepte und Details
- Fragen müssen einzigartig für "${documentTitle}" sein und NICHT auf andere Bücher anwendbar
- Fügen Sie spezifische Verweise auf Passagen, Zitate oder Konzepte aus diesem Text hinzu
- Jede Frage sollte das Verständnis des tatsächlichen Inhalts von "${documentTitle}" testen
- Markieren Sie Fragen mit Themen, die für dieses spezifische Buch relevant sind (z.B. "charakterentwicklung", "hauptthema", "historischer-kontext")
- Machen Sie KEINE generischen Annahmen - basieren Sie alles auf dem tatsächlich bereitgestellten Inhalt`;

      default: // English
        return `You are an expert educator creating a ${difficulty}-level quiz about the book/document titled "${documentTitle}".

REQUIREMENTS:
- Create exactly ${numQuestions} questions about the SPECIFIC CONTENT from "${documentTitle}"
- Question types: ${questionTypes}
- Difficulty level: ${difficulty}
- Focus on this book's unique content: characters, events, themes, concepts, and details
- Questions should be unique to "${documentTitle}" and NOT applicable to other books
- Include specific references to passages, quotes, or concepts from this text
- Each question should test understanding of the actual content from "${documentTitle}"
- Tag questions with themes relevant to this specific book (e.g., "character-development", "main-theme", "historical-context")
- DO NOT make generic assumptions - base everything on the actual content provided`;
    }
  }

  // Language-specific formatting instructions
  private getLanguageSpecificFormatInstructions(language: string, numQuestions: number = 5): string {
    const difficulty = this.quizSessions.get('default')?.userLevel || 'intermediate';
    
    switch (language) {
      case 'es':
        return `⚠️ ABSOLUTE RULES:
- ZERO English words allowed
- ZERO mixed languages allowed
- EVERY single word must be in Spanish
- NO introductory text or explanations
- START DIRECTLY with the quiz format below
- NO text before the quiz format

FORMATO OBLIGATORIO - RESPONDE EXACTAMENTE ASÍ:

## Cuestionario: [Título del Documento]

**Descripción:** Pon a prueba tu conocimiento de [Título del Documento]

**Instrucciones:** Elige la mejor respuesta para cada pregunta.

**1. [Pregunta basada en contenido específico del documento]**
   a) [Opción A]
   b) [Opción B] 
   c) [Opción C]
   d) [Opción D]

**Respuesta:** [Letra de la opción correcta]

**Explicación:** [Explicación que hace referencia al contenido específico del documento]

**Dificultad:** ${difficulty === 'beginner' ? 'Fácil' : difficulty === 'intermediate' ? 'Media' : 'Difícil'}
**Etiquetas:** [temas-relevantes]

**2. [Segunda pregunta]**
   a) [Opción A]
   b) [Opción B] 
   c) [Opción C]
   d) [Opción D]

**Respuesta:** [Letra de la opción correcta]

**Explicación:** [Explicación]

[Continúa con exactamente ${numQuestions} preguntas en este formato]

IMPORTANTE: NO escribas ningún texto introductorio. Comienza DIRECTAMENTE con "## Cuestionario:"`;

      case 'fr':
        return `⚠️ RÈGLES ABSOLUES:
- AUCUN mot anglais autorisé
- AUCUN mélange de langues autorisé
- CHAQUE mot doit être en français
- AUCUN texte d'introduction ou d'explications
- COMMENCEZ DIRECTEMENT avec le format ci-dessous

FORMAT OBLIGATOIRE - RÉPONDEZ EXACTEMENT AINSI:

## Quiz: [Titre du Document]

**Description:** Testez vos connaissances sur [Titre du Document]

**Instructions:** Choisissez la meilleure réponse pour chaque question.

**1. [Question basée sur le contenu spécifique du document]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Réponse:** [Lettre de l'option correcte]

**Explication:** [Explication faisant référence au contenu spécifique du document]

**Difficulté:** ${difficulty === 'beginner' ? 'Facile' : difficulty === 'intermediate' ? 'Moyenne' : 'Difficile'}
**Tags:** [thèmes-pertinents]

**2. [Deuxième question]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Réponse:** [Lettre de l'option correcte]

**Explication:** [Explication]

[Continuez avec exactement ${numQuestions} questions dans ce format]`;

      case 'de':
        return `⚠️ ABSOLUTE REGELN:
- KEINE englischen Wörter erlaubt
- KEINE Sprachmischung erlaubt
- JEDES Wort muss auf Deutsch sein
- KEIN Einführungstext oder Erklärungen
- BEGINNEN Sie DIREKT mit dem Format unten

OBLIGATORISCHES FORMAT - ANTWORTEN SIE GENAU SO:

## Quiz: [Dokumenttitel]

**Beschreibung:** Testen Sie Ihr Wissen über [Dokumenttitel]

**Anweisungen:** Wählen Sie die beste Antwort für jede Frage.

**1. [Frage basierend auf spezifischem Inhalt des Dokuments]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Antwort:** [Buchstabe der richtigen Option]

**Erklärung:** [Erklärung mit Bezug auf spezifischen Inhalt des Dokuments]

**Schwierigkeit:** ${difficulty === 'beginner' ? 'Einfach' : difficulty === 'intermediate' ? 'Mittel' : 'Schwer'}
**Tags:** [relevante-themen]

**2. [Zweite Frage]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Antwort:** [Buchstabe der richtigen Option]

**Erklärung:** [Erklärung]

[Fahren Sie mit genau ${numQuestions} Fragen in diesem Format fort]`;

      default: // English
        return `⚠️ ABSOLUTE RULES:
- NO mixed languages allowed
- EVERY word must be in English
- NO introductory text or explanations
- START DIRECTLY with the format below

MANDATORY FORMAT - RESPOND EXACTLY LIKE THIS:

## Quiz: [Document Title]

**Description:** Test your knowledge of [Document Title]

**Instructions:** Choose the best answer for each question.

**1. [Question based on specific content from the document]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Answer:** [Correct option letter]

**Explanation:** [Explanation referencing specific content from the document]

**Difficulty:** ${difficulty === 'beginner' ? 'Easy' : difficulty === 'intermediate' ? 'Medium' : 'Hard'}
**Tags:** [relevant-themes]

**2. [Second question]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Answer:** [Correct option letter]

**Explanation:** [Explanation]

[Continue with exactly ${numQuestions} questions in this format]`;
    }
  }

  // Language-aware parsing method
  private async parseQuizFromResponse(response: string, context: QuizContext, language: string = 'en'): Promise<Quiz> {
    try {
      // Pre-processing: strip all lines before the first quiz header or question
      const cleanResponse = (() => {
        const lines = response.split('\n');
        let startIdx = -1;
        // New: Patterns to skip common Spanish/other intros
        const introPatterns = [
          /^¡?Absolutamente!?/i,
          /^Aquí tienes/i,
          /^A continuación/i,
          /^Te presento/i,
          /^Vamos a/i,
          /^En este cuestionario/i,
          /^En este test/i,
          /^En este quiz/i,
          /^En este ejercicio/i
        ];
        // Remove leading intro lines
        let firstContentIdx = 0;
        while (firstContentIdx < lines.length && introPatterns.some(p => p.test(lines[firstContentIdx].trim()))) {
          firstContentIdx++;
        }
        const filteredLines = lines.slice(firstContentIdx);
        // Look for quiz start patterns
        for (let i = 0; i < filteredLines.length; i++) {
          const line = filteredLines[i].trim();
          if (line.startsWith('##') ||
              line.startsWith('**Cuestionario:') ||
              line.startsWith('**Quiz:') ||
              line.trim().startsWith('Quiz:') ||
              line.trim().match(/^\*\*?1\./) ||
              line.trim().match(/^1\./) ||
              // Add Spanish-specific patterns
              line.trim().match(/^\*\*?(\d+)\.\s*(.+)/) ||
              line.trim().startsWith('**1.') ||
              line.trim().startsWith('1.') ||
              // Additional Spanish patterns
              line.trim().startsWith('Cuestionario:') ||
              line.trim().startsWith('**Cuestionario') ||
              line.trim().match(/^\*\*?(\d+)\s*(.+)/)) {
            startIdx = i;
            break;
          }
        }
        // If no clear start found, try to find the first numbered question
        if (startIdx === -1) {
          for (let i = 0; i < filteredLines.length; i++) {
            const line = filteredLines[i].trim();
            if (line.match(/^\d+\./) || line.match(/^\*\*?\d+\./)) {
              startIdx = i;
              break;
            }
          }
        }
        return startIdx >= 0 ? filteredLines.slice(startIdx).join('\n') : filteredLines.join('\n');
      })();
      
      // First try to parse as markdown (more reliable)
      this.log('📝 Attempting to parse as markdown format...');
      const markdownQuiz = this.parseMarkdownQuiz(cleanResponse, context, language);
      if (markdownQuiz) {
        this.log('✅ Successfully parsed markdown format quiz.');
        return markdownQuiz;
      }

      // Fallback to JSON parsing
      this.log('🔄 Markdown parsing failed, attempting JSON parsing...');
      let jsonString = this.extractJsonFromString(cleanResponse);
      if (!jsonString) {
        throw new Error('No valid quiz format found in the AI response');
      }

      try {
        const quizData = JSON.parse(jsonString);
        this.log('✅ JSON parsing successful.');
        return this.constructQuizObject(quizData, context);
      } catch (e) {
        if (e instanceof SyntaxError) {
          this.log(`⚠️ JSON parsing failed. Attempting to repair...`);
          const repairedJsonString = await this.repairInvalidJSON(jsonString);
          const quizData = JSON.parse(repairedJsonString);
          this.log('✅ Successfully parsed the repaired JSON.');
          return this.constructQuizObject(quizData, context);
        } else {
          throw e; // Re-throw other types of errors
        }
      }
    } catch (error) {
      this.error(`❌ Failed to parse quiz from AI response: ${error}`);
      this.log(`Raw response for final failure: ${response.substring(0, 500)}...`);
      
      // Enhanced fallback: Try to extract questions from the response with better language support
      const enhancedFallback = this.extractQuestionFromFailedResponse(response, context, language);
      if (enhancedFallback) {
        this.log('✅ Successfully extracted questions from failed response');
        return enhancedFallback;
      }
      
      this.log('🔄 Using basic fallback quiz');
      return this.createFallbackQuiz(context);
    }
  }

  // Enhanced fallback to extract questions from failed responses
  private extractQuestionFromFailedResponse(response: string, context: QuizContext, language: string): Quiz | null {
    try {
      const lines = response.split('\n');
      const questions: QuizQuestion[] = [];
      let questionIndex = 0;
      
      // Language-specific question patterns
      const questionPatterns = language === 'es' ? [
        /^\**(\d+)\.?\s*(.+)/,  // **1. Question text
        /^(\d+)\.?\s*(.+)/,     // 1. Question text
        /^\*\*?(\d+)\.?\s*(.+)/ // **1 Question text
      ] : [
        /^\**(\d+)\.?\s*(.+)/,  // **1. Question text
        /^(\d+)\.?\s*(.+)/      // 1. Question text
      ];
      
      // Look for question patterns even in malformed responses
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Try different question patterns
        let questionMatch = null;
        for (const pattern of questionPatterns) {
          questionMatch = line.match(pattern);
          if (questionMatch && questionMatch[2] && questionMatch[2].length > 10) {
            break;
          }
        }
        
        if (questionMatch && questionMatch[2] && questionMatch[2].length > 10) {
          const questionText = questionMatch[2].replace(/\**/g, '').trim();
          
          // Skip if it's just a number or very short
          if (questionText.length < 10) continue;
          
          const question: QuizQuestion = {
            id: `extracted_q_${questionIndex++}`,
            type: 'multiple-choice',
            question: questionText,
            options: language === 'es' ? 
              ['Opción A', 'Opción B', 'Opción C', 'Opción D'] : 
              ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: language === 'es' ? 'Opción A' : 'Option A',
            explanation: language === 'es' ? 
              'Esta pregunta fue extraída de un cuestionario parcialmente generado.' : 
              'This question was extracted from a partially generated quiz.',
            difficulty: 'medium',
            tags: ['extracted-question'],
            source: {
              documentId: context.documentId || 0,
              chapter: context.chapter
            }
          };
          questions.push(question);
          
          // Increase limit to 5 questions for better coverage
          if (questions.length >= 5) break;
        }
      }
      
      if (questions.length > 0) {
        return {
          id: `quiz_extracted_${Date.now()}`,
          title: language === 'es' ? 
            `Cuestionario Extraído: Documento ${context.documentId}` : 
            `Extracted Quiz: Document ${context.documentId}`,
          description: language === 'es' ? 
            'Cuestionario extraído de respuesta parcial de IA' : 
            'Quiz extracted from partial AI response',
          questions,
          difficulty: context.userLevel,
          estimatedTime: questions.length * 2,
          tags: ['extracted-quiz'],
          createdAt: new Date(),
          documentId: context.documentId || 0,
          chapter: context.chapter
        };
      }
      
      return null;
    } catch (error) {
      this.warn(`Failed to extract questions from failed response: ${error}`);
      return null;
    }
  }

  // Language-aware markdown parsing
  private parseMarkdownQuiz(text: string, context: QuizContext, language: string = 'en'): Quiz | null {
    try {
      const lines = text.split('\n');
      const questions: QuizQuestion[] = [];
      let currentQuestion: Partial<QuizQuestion> = {};
      let title = '';
      let description = '';
      let isInQuestion = false;
      let questionIndex = 0;
      let currentAnswer = '';
      let currentExplanation = '';

      // Language-specific patterns
      const patterns = this.getLanguagePatterns(language);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract title
        if (line.startsWith('##') || line.startsWith('#')) {
          title = line.replace(/^#+\s*/, '').trim();
          continue;
        }
        
        // Extract description
        if (line.startsWith(patterns.description)) {
          description = line.replace(new RegExp(`^${patterns.description}\\s*`), '').trim();
          continue;
        }
        
        // Start of a new question (supports multiple formats)
        const questionMatch = line.match(/^\*\*?(\d+)\.?\s*(.+)/);
        if (questionMatch) {
          // Save previous question if it exists
          if (isInQuestion && currentQuestion.question) {
            currentQuestion.correctAnswer = currentAnswer;
            currentQuestion.explanation = currentExplanation;
            questions.push(this.completeQuestionObject(currentQuestion, questionIndex++, context));
          }
          
          // Start new question
          currentQuestion = {
            question: questionMatch[2].replace(/\*\*/g, '').trim(),
            options: [],
            type: 'multiple-choice'
          };
          currentAnswer = '';
          currentExplanation = '';
          isInQuestion = true;
          continue;
        }
        
        // Additional Spanish question patterns
        if (language === 'es') {
          const spanishQuestionMatch = line.match(/^(\d+)\.?\s*(.+)/);
          if (spanishQuestionMatch && !isInQuestion) {
            // Save previous question if it exists
            if (isInQuestion && currentQuestion.question) {
              currentQuestion.correctAnswer = currentAnswer;
              currentQuestion.explanation = currentExplanation;
              questions.push(this.completeQuestionObject(currentQuestion, questionIndex++, context));
            }
            
            // Start new question
            currentQuestion = {
              question: spanishQuestionMatch[2].replace(/\*\*/g, '').trim(),
              options: [],
              type: 'multiple-choice'
            };
            currentAnswer = '';
            currentExplanation = '';
            isInQuestion = true;
            continue;
          }
        }
        
        // Extract options (a), b), c), d) format
        const optionMatch = line.match(/^\s*([a-d])\)\s*(.+)/);
        if (optionMatch && isInQuestion) {
          currentQuestion.options = currentQuestion.options || [];
          currentQuestion.options.push(optionMatch[2].trim());
          continue;
        }
        
        // Handle Spanish option formats (a), b), c), d) or a), b), c), d)
        if (language === 'es') {
          const spanishOptionMatch = line.match(/^\s*([a-d])\)?\s*(.+)/);
          if (spanishOptionMatch && isInQuestion) {
            currentQuestion.options = currentQuestion.options || [];
            currentQuestion.options.push(spanishOptionMatch[2].trim());
            continue;
          }
        }
        
        // Extract answer
        if (line.startsWith(patterns.answer) && isInQuestion) {
          currentAnswer = line.replace(new RegExp(`^${patterns.answer}\\s*`), '').trim();
          continue;
        }
        
        // Extract explanation
        if (line.startsWith(patterns.explanation) && isInQuestion) {
          currentExplanation = line.replace(new RegExp(`^${patterns.explanation}\\s*`), '').trim();
          continue;
        }
        
        // True/False questions
        if (line.toLowerCase().includes('true') && line.toLowerCase().includes('false')) {
          currentQuestion.type = 'true-false';
          currentQuestion.options = ['True', 'False'];
          continue;
        }
      }
      
      // Add the last question
      if (isInQuestion && currentQuestion.question) {
        currentQuestion.correctAnswer = currentAnswer;
        currentQuestion.explanation = currentExplanation;
        questions.push(this.completeQuestionObject(currentQuestion, questionIndex, context));
      }
      
      if (questions.length === 0) {
        return null;
      }
      
      // Create quiz object
      const quiz: Quiz = {
        id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title || `Quiz: Document ${context.documentId}`,
        description: description || 'Test your knowledge of this document\'s content',
        questions,
        difficulty: context.userLevel,
        estimatedTime: questions.length * 2,
        tags: ['parsed-from-markdown'],
        createdAt: new Date(),
        documentId: context.documentId || 0,
        chapter: context.chapter
      };
      
      return quiz;
    } catch (error) {
      this.warn(`Failed to parse markdown quiz: ${error}`);
      return null;
    }
  }

  // Get language-specific patterns for parsing
  private getLanguagePatterns(language: string): {
    description: string;
    answer: string;
    explanation: string;
  } {
    switch (language) {
      case 'es':
        return {
          description: '\\*\\*Descripción:\\*\\*|\\*\\*Instrucciones:\\*\\*',
          answer: '\\*\\*Respuesta:\\*\\*|\\*\\*Respuesta correcta:\\*\\*',
          explanation: '\\*\\*Explicación:\\*\\*|\\*\\*Explicación de la respuesta:\\*\\*'
        };
      case 'fr':
        return {
          description: '\\*\\*Description:\\*\\*|\\*\\*Instructions:\\*\\*',
          answer: '\\*\\*Réponse:\\*\\*|\\*\\*Réponse correcte:\\*\\*',
          explanation: '\\*\\*Explication:\\*\\*|\\*\\*Explication de la réponse:\\*\\*'
        };
      case 'de':
        return {
          description: '\\*\\*Beschreibung:\\*\\*|\\*\\*Anweisungen:\\*\\*',
          answer: '\\*\\*Antwort:\\*\\*|\\*\\*Richtige Antwort:\\*\\*',
          explanation: '\\*\\*Erklärung:\\*\\*|\\*\\*Erklärung der Antwort:\\*\\*'
        };
      default: // English
        return {
          description: '\\*\\*Description:\\*\\*|\\*\\*Instructions:\\*\\*',
          answer: '\\*\\*Answer:\\*\\*|\\*\\*Correct Answer:\\*\\*',
          explanation: '\\*\\*Explanation:\\*\\*|\\*\\*Answer Explanation:\\*\\*'
        };
    }
  }

  private isQuizInEnglish(quiz: Quiz): boolean {
    // Simple heuristic to detect if quiz is in English
    const englishWords = ['the', 'and', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'with', 'what', 'which', 'this', 'that'];
    const titleWords = quiz.title.toLowerCase().split(/\s+/);
    const englishWordCount = titleWords.filter(word => englishWords.includes(word)).length;
    return englishWordCount >= 2; // If 2+ common English words in title, likely English
  }
}
