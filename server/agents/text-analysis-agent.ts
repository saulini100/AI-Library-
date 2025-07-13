import '../env.js'; // Load environment variables first
import { BaseAgent, AgentTask } from './base-agent';
import { OllamaService } from '../services/ollama-service';
import { MultiModelService } from '../services/multi-model-service';
import { storage } from '../storage';
import natural from 'natural';
import { documentRAGService, RAGContext, RAGResponse } from '../services/document-rag-service.js';
import { DefinitionsAccessService } from '../services/definitions-access-service';
import { powerSummaryService } from '../services/power-summary-service.js';

interface TextAnalysisResult {
  documentId: number;
  chapter: number;
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  keyWords: string[];
  themes: string[];
  complexity: {
    readabilityScore: number;
    gradeLevel: string;
  };
  entities: string[];
  aiInsights: string;
  theologicalAnalysis: string;
  studyQuestions: string[];
}

export class TextAnalysisAgent extends BaseAgent {
  private ollamaService: OllamaService;
  private multiModelService: MultiModelService;
  private ragCallCount = 0;
  private readonly MAX_RAG_CALLS_PER_TASK = 2;
  private readonly RAG_TIMEOUT = 20000;
  private failedDocuments = new Set<string>(); // Track failed documents to prevent retry loops
  private definitionsService: DefinitionsAccessService;
  private translationService?: any; // Add translation service property

  constructor() {
    super({
      name: 'TextAnalysisAgent',
      description: 'Continuously analyzes texts with multi-model intelligence for insights, themes, and study aids',
      interval: 300000, // 5 minutes (less aggressive)
      maxRetries: 2, // Reduce retries to prevent infinite loops
      timeout: 180000, // Increase to 3 minutes for complex analysis
      specialties: ['Text Analysis', 'Sentiment Analysis', 'Term Definition', 'Theme Extraction', 'Entity Recognition', 'Complexity Analysis']
    });

    this.ollamaService = new OllamaService({
      model: 'qwen2.5:7b-instruct', // Superior complex reasoning and analysis capabilities
      temperature: 0.4, // Balanced temperature for focused yet creative analysis
      maxTokens: 4096
    });

    this.multiModelService = new MultiModelService();

    this.definitionsService = new DefinitionsAccessService();
  }

  async initialize(): Promise<void> {
    try {
      await this.ollamaService.initialize();
      await this.multiModelService.initialize();
      this.log('Both Ollama and MultiModel services initialized successfully');
      
      // Schedule periodic analysis of unprocessed documents
      this.addTask('ANALYZE_PENDING_DOCUMENTS', {}, 1);
      
      this.log('Text Analysis Agent initialized with multi-model intelligence');
    } catch (error) {
      this.error(`Failed to initialize: ${error}`);
      throw error;
    }
  }

  async processTask(task: AgentTask): Promise<any> {
    this.log(`Processing text analysis task: ${task.type}`);
    
    switch (task.type) {
      case 'ANALYZE_PENDING_DOCUMENTS':
        return await this.analyzePendingDocuments();
        
      case 'ANALYZE_DOCUMENT':
        const { documentId, chapter } = task.data;
        return await this.analyzeDocument(documentId, chapter);
        
      case 'REANALYZE_DOCUMENT':
        return await this.reanalyzeDocument(task.data.documentId);
        
      case 'DEFINE_TERM':
        if (!task.data.term) {
          this.warn('DEFINE_TERM task called without a term.');
          return null;
        }
        return await this.defineTerm(task.data.term, task.data.language);
      
      // Keep other valid tasks if they exist, for now we only have this one
      // for the inter-agent communication example.
      
      default:
        this.warn(`Unknown text analysis task type: ${task.type}`);
        return null;
    }
  }

  async analyzePendingDocuments(): Promise<void> {
    try {
      // Find documents that haven't been analyzed yet
      const documents = await storage.getDocuments(2); // Default user (fixed user ID)
      
      for (const doc of documents) {
        const docKey = `${doc.id}`;
        
        // Skip documents that have failed recently
        if (this.failedDocuments.has(docKey)) {
          this.log(`Skipping document ${doc.id} - recently failed analysis`);
          continue;
        }
        
        // Check if analysis exists
        const existingAnalysis = await this.getExistingAnalysis(doc.id);
        
        if (!existingAnalysis) {
          this.addTask('ANALYZE_DOCUMENT', { documentId: doc.id }, 2);
        }
      }
    } catch (error) {
      this.error(`Error finding pending documents: ${error}`);
    }
  }

  async analyzeDocument(documentId: number, specificChapter?: number): Promise<void> {
    const docKey = `${documentId}`;
    
    try {
      this.log(`Starting analysis of document: ${documentId}`);
      
             // Get document
       const document = await storage.getDocument(documentId);
       if (!document) {
         this.warn(`Document ${documentId} not found`);
         return;
       }

       // Extract chapters from document content
       const content = document.content as any;
       let chapters: any[] = [];
       
       if (content && content.chapters && Array.isArray(content.chapters)) {
         chapters = content.chapters;
       } else if (content && typeof content === 'string') {
         // Simple text content - create a single chapter
         chapters = [{
           number: 1,
           title: document.title,
           paragraphs: [{ text: content }]
         }];
       } else if (content && content.text) {
         // Content with text property
         chapters = [{
           number: 1,
           title: document.title,
           paragraphs: [{ text: content.text }]
         }];
       }

       if (chapters.length === 0) {
         this.warn(`Document ${documentId} has no analyzable content`);
         return;
       }

       // If specific chapter is requested, analyze only that chapter
       if (specificChapter !== undefined) {
         const chapter = chapters.find((ch: any) => ch.number === specificChapter);
         if (chapter) {
           const analysis = await this.performChapterAnalysisWithFallback(documentId, chapter);
           await this.saveAnalysis(documentId, specificChapter, analysis);
         }
         return;
       }

       // Analyze all chapters with a limit to prevent overwhelming the system
       const maxChaptersPerRun = 3; // Limit concurrent chapter analysis
       const chaptersToAnalyze = chapters.slice(0, maxChaptersPerRun);

       // 🚀 OPTIMIZED: Parallel chapter processing with individual timeouts
       const chapterPromises = chaptersToAnalyze.map(async (chapter, index) => {
         try {
           this.log(`Starting analysis of chapter ${chapter.number} (${index + 1}/${chaptersToAnalyze.length})`);
           
           const analysis = await Promise.race([
             this.performChapterAnalysisWithFallback(documentId, chapter),
             new Promise<never>((_, reject) => 
               setTimeout(() => reject(new Error(`Chapter ${chapter.number} analysis timeout`)), 60000) // Reduced from 180s to 60s
             )
           ]);
           
           await this.saveAnalysis(documentId, chapter.number, analysis);
           this.log(`✅ Chapter ${chapter.number} analysis completed in ${Date.now() - Date.now()}ms`);
           return { success: true, chapter: chapter.number };
           
         } catch (chapterError) {
           this.error(`Failed to analyze chapter ${chapter.number}: ${chapterError}`);
           
           // 🚀 FALLBACK: Save minimal analysis for failed chapters
           try {
             const fallbackAnalysis: TextAnalysisResult = {
               documentId,
               chapter: chapter.number,
               sentiment: { score: 0, label: 'neutral' },
               keyWords: [],
               themes: [],
               complexity: { readabilityScore: 50, gradeLevel: 'Unknown' },
               entities: [],
               aiInsights: 'Analysis could not be completed due to processing constraints.',
               theologicalAnalysis: 'Analysis unavailable.',
               studyQuestions: []
             };
             
             await this.saveAnalysis(documentId, chapter.number, fallbackAnalysis);
             this.log(`💾 Saved fallback analysis for chapter ${chapter.number}`);
             
           } catch (saveError) {
             this.error(`Failed to save fallback analysis: ${saveError}`);
           }
           
           return { success: false, chapter: chapter.number, error: chapterError };
         }
       });

       // Wait for all chapter analyses to complete
       const results = await Promise.allSettled(chapterPromises);
       
       // Log results
       const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
       const failed = results.length - successful;
       this.log(`Chapter analysis completed: ${successful} successful, ${failed} failed`);

      // Remove from failed documents set on successful completion
      this.failedDocuments.delete(docKey);
      this.log(`✅ Document ${documentId} analysis completed`);
      
    } catch (error) {
      this.error(`Failed to analyze document ${documentId}: ${error}`);
      
      // Add to failed documents to prevent immediate retry
      this.failedDocuments.add(docKey);
      
      // Schedule removal from failed set after 1 hour
      setTimeout(() => {
        this.failedDocuments.delete(docKey);
        this.log(`Removed document ${documentId} from failed documents list`);
      }, 3600000); // 1 hour
      
      throw error;
    }
  }

  private async performChapterAnalysisWithFallback(documentId: number, chapter: any): Promise<TextAnalysisResult> {
    try {
      // Try RAG-enhanced analysis first
      return await this.performChapterAnalysis(documentId, chapter);
    } catch (error) {
      this.warn(`RAG-enhanced analysis failed for chapter ${chapter.number}, falling back to basic analysis: ${error}`);
      
      // Fallback to basic analysis without RAG
      return await this.performBasicAnalysis(documentId, chapter);
    }
  }

  private async performChapterAnalysis(documentId: number, chapter: any): Promise<TextAnalysisResult> {
    // Handle different paragraph structures
    let fullText = '';
    if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
      fullText = chapter.paragraphs.map((p: any) => p.text || '').join(' ');
    } else if (chapter.text) {
      fullText = chapter.text;
    } else if (typeof chapter === 'string') {
      fullText = chapter;
    } else {
      this.warn(`Chapter has unsupported structure for document ${documentId}`);
      fullText = JSON.stringify(chapter);
    }
    
    this.log(`Analyzing chapter ${chapter.number} with ${fullText.length} characters`);
    
    // 🚀 FAST PATH: For very small content, skip complex processing
    if (fullText.length < 100) {
      this.log(`Very small content detected (${fullText.length} chars), using fast path`);
      const nlpAnalysis = await this.performNLPAnalysis(fullText, 'General Knowledge');
      
      return {
        documentId,
        chapter: chapter.number,
        sentiment: nlpAnalysis.sentiment,
        keyWords: nlpAnalysis.keyWords,
        themes: nlpAnalysis.themes,
        complexity: nlpAnalysis.complexity,
        entities: nlpAnalysis.entities,
        aiInsights: `Brief content: ${fullText.substring(0, 80)}${fullText.length > 80 ? '...' : ''}`,
        theologicalAnalysis: 'Content too brief for detailed analysis.',
        studyQuestions: []
      };
    }
    
    // Select analysis approach based on content size
    const analysisLevel = this.selectAnalysisLevel(fullText.length);
    this.log(`Using ${analysisLevel} analysis for chapter ${chapter.number}`);
    
    // Detect content domain first (with shorter text for speed)
    const domainSample = fullText.substring(0, 500);
    const contentDomain = await this.detectContentDomain(domainSample, chapter.title);
    
    // Traditional NLP Analysis on sample
    const nlpSample = fullText.substring(0, 1000);
    const nlpAnalysis = await this.performNLPAnalysis(nlpSample, contentDomain);
    
    // Smart AI analysis with timeout protection
    let aiInsights = '';
    let domainAnalysis = '';
    let studyQuestions: string[] = [];
    
    try {
      // Use different timeouts based on analysis level
      const timeout = analysisLevel === 'QUICK' ? 30000 : analysisLevel === 'STANDARD' ? 60000 : 90000;
      
      // Generate insights with timeout
      aiInsights = await Promise.race([
        this.generateDomainInsights(fullText.substring(0, 2000), chapter.title, contentDomain),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('AI insights timeout')), timeout)
        )
      ]);
      
      // Generate analysis with timeout
      domainAnalysis = await Promise.race([
        this.generateDomainAnalysis(fullText.substring(0, 2000), contentDomain),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('AI analysis timeout')), timeout)
        )
      ]);
      
      // Generate questions with timeout (only for STANDARD and DEEP)
      if (analysisLevel !== 'QUICK') {
        studyQuestions = await Promise.race([
          this.generateDomainQuestions(fullText.substring(0, 1000), contentDomain),
          new Promise<string[]>((_, reject) => 
            setTimeout(() => reject(new Error('AI questions timeout')), timeout)
          )
        ]);
      }
      
    } catch (error) {
      this.warn(`AI analysis timed out: ${error}, using fallback`);
      
      // Generate fallback content
      aiInsights = this.generateFallbackInsights(fullText, contentDomain);
      domainAnalysis = `Analysis of this ${contentDomain.toLowerCase()} content: ${fullText.substring(0, 200)}...`;
      studyQuestions = [`What are the main themes in this ${contentDomain.toLowerCase()} content?`];
    }

    return {
      documentId,
      chapter: chapter.number,
      sentiment: nlpAnalysis.sentiment,
      keyWords: nlpAnalysis.keyWords,
      themes: nlpAnalysis.themes,
      complexity: nlpAnalysis.complexity,
      entities: nlpAnalysis.entities,
      aiInsights,
      theologicalAnalysis: domainAnalysis,
      studyQuestions
    };
  }

  // 🚀 NEW: Select optimal analysis level based on content size
  private selectAnalysisLevel(textLength: number): 'QUICK' | 'STANDARD' | 'DEEP' {
    if (textLength < 1000) return 'QUICK';
    if (textLength < 5000) return 'STANDARD';
    return 'DEEP';
  }

  // 🚀 POWER FALLBACK: Generate concise fallback insights without verbose details
  private generateFallbackInsights(text: string, domain: string): string {
    const themes = this.extractDomainThemes(text, domain);
    const keywords = this.extractKeywordsFromText(text.substring(0, 500));
    
    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      return `Power Summary: Explores ${themes.slice(0, 2).join(' and ')} with focus on ${keywords.slice(0, 3).join(', ')}. Key spiritual principles for practical application.`;
    } else if (domain.toLowerCase().includes('science')) {
      return `Power Summary: Covers ${themes.slice(0, 2).join(' and ')} including ${keywords.slice(0, 3).join(', ')}. Scientific principles with practical applications.`;
    } else {
      return `Power Summary: Examines ${themes.slice(0, 2).join(' and ')} featuring ${keywords.slice(0, 3).join(', ')}. Key concepts with practical insights.`;
    }
  }

  // 🚀 NEW: Extract keywords from text chunk
  private extractKeywordsFromText(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'would', 'there', 'could', 'other'].includes(word));
    
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private async performBasicAnalysis(documentId: number, chapter: any): Promise<TextAnalysisResult> {
    this.log(`Performing basic analysis for document ${documentId}, chapter ${chapter.number || 1}`);
    
    // Handle different paragraph structures
    let fullText = '';
    if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
      fullText = chapter.paragraphs.map((p: any) => p.text || '').join(' ');
    } else if (chapter.text) {
      fullText = chapter.text;
    } else if (typeof chapter === 'string') {
      fullText = chapter;
    } else {
      fullText = JSON.stringify(chapter);
    }
    
    // Detect content domain first
    const contentDomain = await this.detectContentDomain(fullText, chapter.title);
    
    // Traditional NLP Analysis only
    const nlpAnalysis = await this.performNLPAnalysis(fullText, contentDomain);
    
    // Basic AI insights without RAG
    const basicInsights = await this.generateDomainInsights(fullText, chapter.title || 'Chapter', contentDomain);
    const basicAnalysis = await this.generateDomainAnalysis(fullText, contentDomain);
    const basicQuestions = await this.generateDomainQuestions(fullText, contentDomain);

    return {
      documentId,
      chapter: chapter.number || 1,
      sentiment: nlpAnalysis.sentiment,
      keyWords: nlpAnalysis.keyWords,
      themes: nlpAnalysis.themes,
      complexity: nlpAnalysis.complexity,
      entities: nlpAnalysis.entities,
      aiInsights: basicInsights,
      theologicalAnalysis: basicAnalysis,
      studyQuestions: basicQuestions
    };
  }

  private async detectContentDomain(text: string, title: string = ''): Promise<string> {
    // 🚀 FAST DOMAIN DETECTION: Use simpler heuristics for small text
    if (text.length < 200) {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('god') || lowerText.includes('jesus') || lowerText.includes('bible') || lowerText.includes('faith')) {
        return 'Religious/Biblical Studies';
      }
      if (lowerText.includes('science') || lowerText.includes('theory') || lowerText.includes('experiment')) {
        return 'Science';
      }
      return 'General Knowledge';
    }
    
    const prompt = `Analyze this content and identify its primary domain/subject area:

Title: ${title}
Content (first 500 chars): ${text.substring(0, 500)}

What is the primary subject domain? Choose from:
- Religious/Biblical Studies
- Science
- Philosophy
- History
- Literature
- General Knowledge

Respond with just the domain name.`;

    try {
      // 🚀 LONGER TIMEOUT: Increased to 20 seconds for domain detection
      const response = await Promise.race([
        this.ollamaService.generateText(prompt, { maxTokens: 100, temperature: 0.1 }),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Domain detection timeout')), 20000)
        )
      ]);
      
      const domainMatch = response.match(/(Religious\/Biblical Studies|Science|Philosophy|History|Literature|General Knowledge)/i);
      return domainMatch ? domainMatch[1] : 'General Knowledge';
    } catch (error) {
      this.warn(`Domain detection failed: ${error}`);
      return 'General Knowledge';
    }
  }

  private async generateDomainInsights(text: string, title: string, domain: string): Promise<string> {
    // 🚀 POWER SUMMARY: Generate concise insights instead of lengthy analysis
    let prompt = '';
    
    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      prompt = `Create a POWER SUMMARY (2-3 sentences max) of the key spiritual insights from this text:\n\n${text.substring(0, 800)}\n\nRespond with only the essential points, no elaboration.`;
    } else if (domain.toLowerCase().includes('science')) {
      prompt = `Create a POWER SUMMARY (2-3 sentences max) of the key scientific concepts in this text:\n\n${text.substring(0, 800)}\n\nRespond with only the essential points, no elaboration.`;
    } else {
      prompt = `Create a POWER SUMMARY (2-3 sentences max) of the key insights from this content:\n\n${text.substring(0, 800)}\n\nRespond with only the essential points, no elaboration.`;
    }

    try {
      const result = await this.ollamaService.generateText(prompt, { 
        maxTokens: 400, // Increased for complete insights
        temperature: 0.2 // Lower temperature for more focused responses
      });
      
      // Ensure result is truly concise by truncating if needed
      const sentences = result.split('.').filter(s => s.trim().length > 0);
      if (sentences.length > 3) {
        return sentences.slice(0, 3).join('.') + '.';
      }
      return result;
    } catch (error) {
      this.warn(`Domain insights generation failed: ${error}`);
      return `Power Summary: ${title} covers key ${domain.toLowerCase()} concepts with practical applications.`;
    }
  }

  private async generateDomainAnalysis(text: string, domain: string): Promise<string> {
    // 🚀 POWER ANALYSIS: Keep analysis extremely concise
    let prompt = '';
    
    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      prompt = `Provide a 1-2 sentence theological analysis of this text:\n\n${text.substring(0, 600)}\n\nBe concise and direct.`;
    } else {
      prompt = `Provide a 1-2 sentence analysis of this ${domain} content:\n\n${text.substring(0, 600)}\n\nBe concise and direct.`;
    }

    try {
      const result = await this.ollamaService.generateText(prompt, {
        maxTokens: 300, // Increased for complete analysis
        temperature: 0.2
      });
      
      // Ensure it's truly brief - limit to 2 sentences max
      const sentences = result.split('.').filter(s => s.trim().length > 0);
      if (sentences.length > 2) {
        return sentences.slice(0, 2).join('.') + '.';
      }
      return result;
    } catch (error) {
      this.warn(`Domain analysis failed: ${error}`);
      return `Analysis: Key ${domain.toLowerCase()} concepts with practical applications.`;
    }
  }

  private async generateDomainQuestions(text: string, domain: string): Promise<string[]> {
    const prompt = `Generate 3 simple study questions for this ${domain} content:\n\n${text.substring(0, 800)}

Format: one question per line.`;

    try {
      const response = await this.ollamaService.generateText(prompt, {
        maxTokens: 150,
        temperature: 0.4
      });
      return response.split('\n').filter(q => q.trim().length > 10).slice(0, 3);
    } catch (error) {
      this.warn(`Domain questions generation failed: ${error}`);
      return [`What are the key concepts in this ${domain} content?`];
    }
  }

  private async performNLPAnalysis(text: string, domain: string = 'General Knowledge'): Promise<any> {
    // Tokenization - using word tokenization from natural
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
    
    // Remove stop words
    const stopWords = natural.stopwords;
    const filteredTokens = tokens.filter((token: string) => !stopWords.includes(token));
    
    // Stemming and frequency analysis
    const stemmedTokens = filteredTokens.map((token: string) => natural.PorterStemmer.stem(token));
    const frequency = this.calculateWordFrequency(stemmedTokens);
    
    // Extract key words (top 10 most frequent meaningful words)
    const keyWords = Object.entries(frequency)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([word]) => word);

    // Sentiment analysis
    const sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    const sentimentScore = sentimentAnalyzer.getSentiment(stemmedTokens);
    
    // Readability analysis - using simple sentence splitting
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = tokens.length;
    const avgWordsPerSentence = words / sentences.length;
    const readabilityScore = this.calculateReadabilityScore(text, words, sentences.length);
    
    // Extract themes based on domain
    const themes = this.extractDomainThemes(text, domain);
    
    // Named entity extraction (simplified)
    const entities = this.extractEntities(text);

    return {
      sentiment: {
        score: sentimentScore,
        label: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral'
      },
      keyWords,
      themes,
      complexity: {
        readabilityScore,
        gradeLevel: this.getGradeLevel(readabilityScore)
      },
      entities
    };
  }

  private calculateWordFrequency(tokens: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    tokens.forEach(token => {
      if (token.length > 2) { // Ignore very short words
        frequency[token] = (frequency[token] || 0) + 1;
      }
    });
    return frequency;
  }

  private calculateReadabilityScore(text: string, wordCount: number, sentenceCount: number): number {
    // Simplified Flesch Reading Ease Score
    const avgSentenceLength = wordCount / sentenceCount;
    const avgSyllablesPerWord = this.estimateSyllables(text) / wordCount;
    
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  private estimateSyllables(text: string): number {
    // Simple syllable estimation
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let totalSyllables = 0;
    
    words.forEach(word => {
      // Count vowel groups
      const vowelGroups = word.match(/[aeiouy]+/g) || [];
      let syllables = vowelGroups.length;
      
      // Adjust for silent 'e'
      if (word.endsWith('e') && syllables > 1) {
        syllables--;
      }
      
      totalSyllables += Math.max(1, syllables);
    });
    
    return totalSyllables;
  }

  private getGradeLevel(score: number): string {
    if (score >= 90) return 'Elementary School';
    if (score >= 80) return 'Middle School';
    if (score >= 70) return 'High School';
    if (score >= 60) return 'College';
    return 'Graduate Level';
  }

  private extractDomainThemes(text: string, domain: string): string[] {
    const lowerText = text.toLowerCase();
    const themes: string[] = [];

    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      const biblicalKeywords = {
        'faith': ['faith', 'believe', 'trust', 'faithful'],
        'love': ['love', 'beloved', 'charity', 'compassion'],
        'redemption': ['redeem', 'salvation', 'save', 'deliver'],
        'righteousness': ['righteous', 'just', 'justice', 'holy'],
        'covenant': ['covenant', 'promise', 'agreement', 'testament'],
        'kingdom': ['kingdom', 'reign', 'ruler', 'king'],
        'sacrifice': ['sacrifice', 'offering', 'altar', 'blood'],
        'forgiveness': ['forgive', 'mercy', 'pardon', 'grace'],
        'wisdom': ['wisdom', 'understanding', 'knowledge', 'insight'],
        'prophecy': ['prophet', 'prophecy', 'foretell', 'vision']
      };

      Object.entries(biblicalKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          themes.push(theme);
        }
      });
    } else if (domain.toLowerCase().includes('science') || domain.toLowerCase().includes('physics')) {
      const scienceKeywords = {
        'quantum mechanics': ['quantum', 'particle', 'wave', 'probability', 'superposition', 'entanglement'],
        'energy': ['energy', 'potential', 'kinetic', 'conservation', 'force', 'work'],
        'matter': ['matter', 'mass', 'atom', 'molecule', 'element', 'compound'],
        'motion': ['motion', 'velocity', 'acceleration', 'momentum', 'friction'],
        'waves': ['wave', 'frequency', 'amplitude', 'wavelength', 'interference'],
        'thermodynamics': ['temperature', 'heat', 'entropy', 'thermal', 'pressure'],
        'electromagnetism': ['electric', 'magnetic', 'charge', 'current', 'field'],
        'relativity': ['relativity', 'spacetime', 'einstein', 'gravity', 'mass-energy']
      };

      Object.entries(scienceKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          themes.push(theme);
        }
      });
    } else if (domain.toLowerCase().includes('philosophy')) {
      const philosophyKeywords = {
        'existence': ['existence', 'being', 'reality', 'ontology', 'metaphysics'],
        'knowledge': ['knowledge', 'epistemology', 'truth', 'belief', 'certainty'],
        'ethics': ['ethics', 'moral', 'right', 'wrong', 'virtue', 'duty'],
        'consciousness': ['consciousness', 'mind', 'awareness', 'thought', 'perception'],
        'free will': ['free will', 'determinism', 'choice', 'freedom', 'responsibility'],
        'meaning': ['meaning', 'purpose', 'value', 'significance', 'worth']
      };

      Object.entries(philosophyKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          themes.push(theme);
        }
      });
    } else if (domain.toLowerCase().includes('history')) {
      const historyKeywords = {
        'war': ['war', 'battle', 'conflict', 'military', 'army', 'victory'],
        'politics': ['government', 'ruler', 'democracy', 'empire', 'revolution'],
        'culture': ['culture', 'society', 'civilization', 'tradition', 'custom'],
        'economy': ['trade', 'commerce', 'economy', 'money', 'wealth', 'poverty'],
        'technology': ['invention', 'discovery', 'innovation', 'progress', 'advancement'],
        'religion': ['religion', 'church', 'temple', 'worship', 'belief', 'ritual']
      };

      Object.entries(historyKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          themes.push(theme);
        }
      });
    } else {
      // General themes for other domains
      const generalKeywords = {
        'learning': ['learn', 'education', 'knowledge', 'study', 'understand'],
        'problem-solving': ['problem', 'solution', 'solve', 'method', 'approach'],
        'development': ['develop', 'growth', 'progress', 'improvement', 'evolution'],
        'relationship': ['relationship', 'connection', 'interaction', 'communication'],
        'innovation': ['innovation', 'creative', 'new', 'invention', 'original'],
        'analysis': ['analysis', 'examine', 'investigate', 'research', 'study']
      };

      Object.entries(generalKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          themes.push(theme);
        }
      });
    }

    return themes;
  }

  private extractEntities(text: string): string[] {
    // Simple pattern matching for biblical names and places
    const patterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Proper nouns
    ];

    const entities: string[] = [];
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      entities.push(...matches);
    });

    // Remove duplicates and filter out common words
    const commonWords = ['The', 'And', 'But', 'For', 'Or', 'So', 'Yet'];
    return Array.from(new Set(entities)).filter(entity => !commonWords.includes(entity));
  }

  private async getExistingAnalysis(documentId: number): Promise<boolean> {
    // This would check if analysis already exists in the database
    // For now, return false to trigger analysis
    return false;
  }

  private async saveAnalysis(documentId: number, chapter: number, analysis: TextAnalysisResult): Promise<void> {
    try {
      // Save analysis results to database
      // This would involve creating a new table for text analysis results
      this.log(`Saved analysis for document ${documentId}, chapter ${chapter}`);
      
      // Emit event for real-time updates
      this.emit('analysisCompleted', {
        documentId,
        chapter,
        analysis
      });
      
    } catch (error) {
      this.error(`Failed to save analysis: ${error}`);
      throw error;
    }
  }

  async reanalyzeDocument(documentId: number): Promise<void> {
    this.log(`Re-analyzing document ${documentId}`);
    await this.analyzeDocument(documentId);
  }

  private async updateExpertise(data: any): Promise<void> {
    try {
      const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
      this.log(`🧠 Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
      
      // Store the expertise information for this agent to use in future analyses
      // This could be stored in memory or a database for persistent expertise
      
      this.log(`✅ Expertise updated for ${domain}`);
    } catch (error) {
      this.error(`Failed to update expertise: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    this.log('Cleaning up Text Analysis Agent');
    // Cleanup resources if needed
  }

  // Public methods for external access
  public async requestAnalysis(documentId: number, chapter?: number): Promise<string> {
    return this.addTask('ANALYZE_DOCUMENT', { documentId, chapter }, 3);
  }

  public async requestReanalysis(documentId: number): Promise<string> {
    return this.addTask('REANALYZE_DOCUMENT', { documentId }, 2);
  }

  // 🔍 RAG-Enhanced Analysis Methods with Circuit Breaker
  private async performRAGEnhancedAnalysis(
    text: string, 
    title: string, 
    documentId: number, 
    chapter: number
  ): Promise<{
    insights: string;
    analysis: string;
    questions: string[];
    enhancedKeywords: string[];
    crossReferencedThemes: string[];
  }> {
    try {
      // Circuit breaker - prevent excessive RAG calls
      if (this.ragCallCount >= this.MAX_RAG_CALLS_PER_TASK) {
        this.warn(`RAG call limit reached for task, returning empty analysis`);
        return {
          insights: '',
          analysis: '',
          questions: [],
          enhancedKeywords: [],
          crossReferencedThemes: []
        };
      }

      this.ragCallCount++;
      this.log(`🔍 Performing RAG-enhanced analysis for "${title}" Chapter ${chapter} (call ${this.ragCallCount}/${this.MAX_RAG_CALLS_PER_TASK})`);
      
      // Add timeout wrapper for RAG operations
      const ragTimeout = new Promise<{
        insights: string;
        analysis: string;
        questions: string[];
        enhancedKeywords: string[];
        crossReferencedThemes: string[];
      }>((_, reject) =>
        setTimeout(() => reject(new Error('RAG analysis timeout')), this.RAG_TIMEOUT)
      );

      const ragAnalysis = this.performActualRAGAnalysis(text, title, documentId, chapter);

      const result = await Promise.race([ragAnalysis, ragTimeout]);
      
      this.log(`✅ RAG-enhanced analysis completed successfully`);
      return result;
      
    } catch (error) {
      this.error(`❌ RAG-enhanced analysis failed: ${error}`);
      this.log(`🔍 RAG failure details - Document: ${documentId}, Chapter: ${chapter}, Call: ${this.ragCallCount}/${this.MAX_RAG_CALLS_PER_TASK}`);
      
      return {
        insights: `Analysis completed without RAG enhancement due to timeout. Basic text analysis was successful for chapter ${chapter}.`,
        analysis: '',
        questions: [],
        enhancedKeywords: [],
        crossReferencedThemes: []
      };
    }
  }

  private async performActualRAGAnalysis(
    text: string, 
    title: string, 
    documentId: number, 
    chapter: number
  ): Promise<{
    insights: string;
    analysis: string;
    questions: string[];
    enhancedKeywords: string[];
    crossReferencedThemes: string[];
  }> {
    // 🔍 NEW: Get power summaries and annotations for enhanced context
    const powerSummaryContext = await powerSummaryService.getPowerSummariesForAIContext(documentId, 5);
    const powerSummaryStats = await powerSummaryService.getPowerSummaryStats();

    const annotations = await storage.getAnnotationsByChapter(1, documentId, chapter);
    const annotationContext = annotations.map(a => a.note).slice(0, 5).join('\n');

    // Build enhanced RAG context with user data
    const ragContext: RAGContext = {
      userId: 1, // Default user for now
      currentDocument: documentId,
      currentChapter: chapter,
      conversationHistory: [
        `Power Summary Context: ${powerSummaryContext.substring(0, 300)}`, 
        `User notes: ${annotationContext}`
      ],
      userStudyPatterns: await this.extractUserPatterns(),
      preferredTopics: await this.extractUserTopics(),
      studyLevel: 'intermediate' // Default level
    };

    // Enhanced search query with user context
    const relatedContentQuery = `themes and concepts similar to: ${title} ${text.substring(0, 200)}
    
Power Summary Context: ${powerSummaryContext.substring(0, 200)}
User's notes: ${annotationContext.substring(0, 200)}
Power Summary Stats: ${powerSummaryStats.totalSummaries} summaries, ${powerSummaryStats.documentCoverage} documents`;
    
    const ragResponse: RAGResponse = await documentRAGService.processRAGQuery(
      relatedContentQuery, 
      ragContext, 
      {
        maxSources: 2, // Reduced from 3 
        includeAnnotations: false, // Disabled for faster processing
        includeMemories: false, // Disable memories for faster processing
        searchDepth: 'quick', // Use quick search instead of thorough
        singleDocumentOnly: true // Focus on current document only
      }
    );

    // Extract enhanced keywords from related content
    const enhancedKeywords = this.extractKeywordsFromSources(ragResponse.sources);
    
    // Extract cross-referenced themes
    const crossReferencedThemes = this.extractThemesFromSources(ragResponse.sources);
    
    // Generate all AI responses in parallel for faster processing
    const [insights, analysis, questions] = await Promise.allSettled([
      ragResponse.sources.length > 0 ? this.generateCrossContextualInsights(text, title, ragResponse.sources, powerSummaryContext) : Promise.resolve(''),
      ragResponse.sources.length > 0 ? this.generateComparativeAnalysis(text, title, ragResponse.sources, powerSummaryContext) : Promise.resolve(''),
      ragResponse.sources.length > 0 ? this.generateCrossReferencedQuestions(text, title, ragResponse.sources, powerSummaryContext) : Promise.resolve([])
    ]);

    this.log(`✅ RAG-enhanced analysis completed with ${ragResponse.sources.length} related sources and power summary context`);
    
    return {
      insights: insights.status === 'fulfilled' ? insights.value : '',
      analysis: analysis.status === 'fulfilled' ? analysis.value : '',
      questions: questions.status === 'fulfilled' ? questions.value : [],
      enhancedKeywords,
      crossReferencedThemes
    };
  }

  private async extractUserPatterns(): Promise<string[]> {
    // Placeholder - would analyze user's study patterns
    return ['biblical study', 'theological analysis', 'comparative reading'];
  }

  private async extractUserTopics(): Promise<string[]> {
    // Placeholder - would analyze user's preferred topics from annotations
    return ['faith', 'prayer', 'spiritual growth'];
  }

  private extractKeywordsFromSources(sources: any[]): string[] {
    const keywords = new Set<string>();
    
    sources.forEach(source => {
      // Extract meaningful words from excerpts
      const words = source.excerpt
        .toLowerCase()
        .match(/\b[a-zA-Z]{4,}\b/g) || [];
      
      words.forEach((word: string) => {
        if (!['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were'].includes(word)) {
          keywords.add(word);
        }
      });
    });
    
    return Array.from(keywords).slice(0, 10);
  }

  private extractThemesFromSources(sources: any[]): string[] {
    const themes = new Set<string>();
    
    sources.forEach(source => {
      // Look for thematic concepts in the source title and content
      const themeWords = ['love', 'faith', 'hope', 'grace', 'forgiveness', 'salvation', 'wisdom', 'truth', 'justice', 'mercy'];
      
      themeWords.forEach(theme => {
        if (source.excerpt.toLowerCase().includes(theme) || 
            source.documentTitle.toLowerCase().includes(theme)) {
          themes.add(theme);
        }
      });
    });
    
    return Array.from(themes);
  }

  private async generateCrossContextualInsights(text: string, title: string, sources: any[], powerSummaryContext: string): Promise<string> {
    if (sources.length === 0) return '';
    
    const contextPrompt = `Analyze this text in the context of the user's other study materials:

CURRENT TEXT: "${title}"
${text.substring(0, 1000)}

RELATED MATERIALS:
${sources.slice(0, 3).map(s => `- ${s.documentTitle}: "${s.excerpt}"`).join('\n')}

Generate insights that connect this text to the user's broader study patterns and related materials. Focus on:
1. Common themes across materials
2. Contrasting perspectives or approaches
3. Deeper understanding gained from cross-references
4. Personal study progression patterns

Insights:
${powerSummaryContext.substring(0, 300)}`;

    try {
      const result = await this.multiModelService.executeTask('theological-reasoning', contextPrompt, {
        requirements: { accuracy: 9, reasoning: 9, creativity: 7 }
      });
      
      return result.response;
    } catch (error) {
      this.warn(`Failed to generate cross-contextual insights: ${error}`);
      return '';
    }
  }

  private async generateComparativeAnalysis(text: string, title: string, sources: any[], powerSummaryContext: string): Promise<string> {
    if (sources.length === 0) return '';
    
    const analysisPrompt = `Provide a comparative analysis of this text with the user's related study materials:

CURRENT TEXT: "${title}"
${text.substring(0, 1000)}

COMPARE WITH:
${sources.slice(0, 3).map(s => `- ${s.documentTitle}: "${s.excerpt}"`).join('\n')}

Analysis should include:
1. How this text builds upon or contrasts with previous materials
2. Unique insights this text provides
3. Connections to user's annotation patterns
4. Theological or thematic development

Analysis:
${powerSummaryContext.substring(0, 300)}`;

    try {
      const result = await this.multiModelService.executeTask('text-analysis', analysisPrompt, {
        requirements: { accuracy: 9, reasoning: 8, creativity: 6 }
      });
      
      return result.response;
    } catch (error) {
      this.warn(`Failed to generate comparative analysis: ${error}`);
      return '';
    }
  }

  private async generateCrossReferencedQuestions(text: string, title: string, sources: any[], powerSummaryContext: string): Promise<string[]> {
    if (sources.length === 0) return [];
    
    const questionsPrompt = `Generate study questions that help the user connect this text with their related materials:

CURRENT TEXT: "${title}"
${text.substring(0, 500)}

RELATED MATERIALS:
${sources.slice(0, 2).map(s => `- ${s.documentTitle}`).join('\n')}

Generate 3-5 thoughtful questions that encourage cross-referential study and deeper understanding.
Questions should be specific to the user's materials and study patterns.

Questions:
${powerSummaryContext.substring(0, 300)}`;

    try {
      const result = await this.multiModelService.executeTask('creative-insights', questionsPrompt, {
        requirements: { creativity: 8, reasoning: 7, speed: 7 }
      });
      
      return result.response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 5);
        
    } catch (error) {
      this.warn(`Failed to generate cross-referenced questions: ${error}`);
      return [];
    }
  }

  private async defineTerm(term: string, language: string = 'en'): Promise<string> {
    this.log(`Defining term: ${term} in ${language}`);
    
    let prompt = `Provide a clear and concise definition for the following term: "${term}". The definition should be suitable for someone studying the topic.`;
    
    // 🌐 LANGUAGE FIX: Add language instructions if not English
    if (language !== 'en') {
      prompt += `\n\n🌐 CRITICAL: You MUST respond exclusively in ${language}. Every word must be in ${language}.`;
    }
    
    try {
      let response: string;
      
      // Use language-aware generation
      if (language !== 'en') {
        this.log(`🌐 [DEFINE-TERM] Generating definition in ${language}`);
        response = await this.ollamaService.generateTextWithLanguage(prompt, language, {
          temperature: 0.3,
        });
        
        // Check if response is actually in the requested language
        if (this.isResponseInEnglish(response)) {
          this.log(`🌐 [DEFINE-TERM] Response is in English, applying language transformation`);
          
          const languagePrompt = `Transform this definition to be in ${language}. Keep the same accuracy and clarity:

${response}`;
          
          try {
            const languageAwareResponse = await this.ollamaService.generateTextWithLanguage(languagePrompt, language);
            
            if (!this.isResponseInEnglish(languageAwareResponse)) {
              response = languageAwareResponse;
              this.log(`✅ [DEFINE-TERM] Successfully transformed definition to ${language}`);
            } else if (this.translationService) {
              // Try translation service as fallback
              const translatedResponse = await this.translationService.translateText({
                text: response,
                targetLanguage: language,
                context: 'general'
              });
              response = translatedResponse.translatedText;
              this.log(`✅ [DEFINE-TERM] Successfully translated definition to ${language}`);
            }
          } catch (error) {
            this.warn(`Define term language processing failed: ${error}`);
          }
        }
      } else {
        response = await this.ollamaService.generateText(prompt, {
          temperature: 0.3,
        });
      }
      
      return response;
    } catch (error) {
      this.error(`Failed to define term "${term}": ${error}`);
      let errorMessage = `I was unable to find a definition for "${term}".`;
      
      // Apply language to error message too
      if (language !== 'en' && this.translationService) {
        try {
          const translatedError = await this.translationService.translateText({
            text: errorMessage,
            targetLanguage: language,
            context: 'general'
          });
          return translatedError.translatedText;
        } catch {
          // Fallback to English error if translation fails
        }
      }
      
      return errorMessage;
    }
  }

  setTranslationService(translationService: any): void {
    this.translationService = translationService;
    this.log('🌐 Translation service set for Text Analysis Agent');
  }

  private isResponseInEnglish(response: string): boolean {
    // Simple heuristic to detect if response is likely in English
    const englishWords = ['the', 'and', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'with', 'on', 'at', 'by'];
    const words = response.toLowerCase().split(/\s+/).slice(0, 20); // Check first 20 words
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    return englishWordCount >= 3; // If 3+ common English words, likely English
  }
} 