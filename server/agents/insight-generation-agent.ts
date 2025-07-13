import { BaseAgent, AgentTask } from './base-agent.js';
import { OllamaService } from '../services/ollama-service.js';
import { MultiModelService } from '../services/multi-model-service.js';
import { storage } from '../storage.js';
import { powerSummaryService } from '../services/power-summary-service.js';
import { documentRAGService, RAGContext, RAGResponse } from '../services/document-rag-service.js';

interface Insight {
  id: string;
  documentId: number;
  chapter: number;
  type: 'connection' | 'theme' | 'application' | 'historical' | 'prophetic';
  title: string;
  content: string;
  relevanceScore: number;
  createdAt: Date;
  tags: string[];
}

interface CrossReference {
  id: string;
  sourceDocumentId: number;
  sourceChapter: number;
  targetDocumentId: number;
  targetChapter: number;
  connectionType: 'theme' | 'concept' | 'reference' | 'parallel';
  strength: number;
}

// Page tracking interface for insight generation limits
interface PageTracker {
  userId: number;
  documentId: number;
  pagesRead: number;
  lastInsightPage: number;
  lastInsightTimestamp: Date;
}

export class InsightGenerationAgent extends BaseAgent {
  private ollamaService: OllamaService;
  private multiModelService: MultiModelService;
  private generatedInsights: Map<string, Insight> = new Map();
  private crossReferences: CrossReference[] = [];
  // Page tracking for insight generation limits
  private pageTrackers: Map<string, PageTracker> = new Map(); // key: `${userId}-${documentId}`
  private readonly PAGES_PER_INSIGHT = 10; // Generate 1 insight every 10 pages
  private translationService?: any; // Add translation service property

  constructor() {
    super({
      name: 'InsightGenerationAgent',
      description: 'Generates deep insights and discovers connections with multi-model intelligence (limited to 1 insight per 10 pages)',
      interval: 3600000, // 1 hour (much less aggressive)
      maxRetries: 3,
      timeout: 180000, // 3 minutes for complex insight generation
      specialties: ['Insight Generation', 'Connection Discovery', 'Pattern Recognition', 'Theme Analysis', 'Cross-References']
    });

    this.ollamaService = new OllamaService({
      model: 'qwen2.5:7b-instruct', // Superior reasoning for deep insights and complex analysis
      temperature: 0.6 // Balanced temperature for insightful yet focused responses
    });

    this.multiModelService = new MultiModelService();
  }

  async cleanup(): Promise<void> {
    this.log('Cleaning up Insight Generation Agent');
  }

  async initialize(): Promise<void> {
    try {
      await this.ollamaService.initialize();
      await this.multiModelService.initialize();
      
      // Schedule periodic insight generation (less aggressive)
      // Only schedule daily insights, not all tasks immediately
      setTimeout(() => {
        this.addTask('GENERATE_DAILY_INSIGHTS', {}, 1);
      }, 3600000); // Wait 1 hour before first daily insights
      
      this.log('Insight Generation Agent initialized with multi-model intelligence and page-based limiting (1 insight per 10 pages) - Scheduled for 1 hour intervals');
    } catch (error) {
      this.error(`Failed to initialize: ${error}`);
      throw error;
    }
  }

  async processTask(task: AgentTask): Promise<any> {
    this.log(`Processing insight generation task: ${task.type}`);

    switch (task.type) {
      case 'GENERATE_DAILY_INSIGHTS':
        await this.generateDailyInsights();
        break;
      
      case 'DISCOVER_CONNECTIONS':
        await this.discoverCrossReferences();
        break;
      
      case 'ANALYZE_THEMES':
        await this.analyzeThemesWithRAG();
        break;
      
      case 'GENERATE_INSIGHT_FOR_CHAPTER':
        await this.generateInsightForChapter(task.data.documentId, task.data.chapter, task.data.userId);
        break;
      
      case 'UPDATE_EXPERTISE':
        await this.updateExpertise(task.data);
        break;
      
      default:
        this.warn(`Unknown task type: ${task.type}`);
    }
    return null;
  }

  private async updateExpertise(data: any): Promise<void> {
    try {
      const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
      this.log(`🧠 Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
      
      // Update the insight generation agent's knowledge for more accurate insights
      // This could involve updating insight generation prompts or adjusting analysis depth
      
      this.log(`✅ Insight Generation expertise updated for ${domain}`);
    } catch (error) {
      this.error(`Failed to update expertise: ${error}`);
    }
  }

  private async generateDailyInsights(): Promise<void> {
    try {
      this.log('Generating daily insights...');
      
      const documents = await storage.getDocuments(2); // Default user (fixed user ID)
      
      // Select a few documents/chapters for daily insights
      const selections = this.selectChaptersForInsights(documents, 3);
      
      for (const selection of selections) {
        await this.generateInsightForChapter(selection.documentId, selection.chapter);
      }
      
      // Schedule next daily insights (24 hours)
      setTimeout(() => {
        this.addTask('GENERATE_DAILY_INSIGHTS', {}, 1);
      }, 86400000); // 24 hours
      
    } catch (error) {
      this.error(`Error generating daily insights: ${error}`);
    }
  }

  private selectChaptersForInsights(documents: any[], count: number): Array<{documentId: number, chapter: number}> {
    const selections: Array<{documentId: number, chapter: number}> = [];
    
    for (let i = 0; i < Math.min(count, documents.length); i++) {
      const doc = documents[i];
      const randomChapter = Math.floor(Math.random() * doc.totalChapters) + 1;
      selections.push({
        documentId: doc.id,
        chapter: randomChapter
      });
    }
    
    return selections;
  }

  private getPageTrackerKey(userId: number, documentId: number): string {
    return `${userId}-${documentId}`;
  }

  private getOrCreatePageTracker(userId: number, documentId: number): PageTracker {
    const key = this.getPageTrackerKey(userId, documentId);
    let tracker = this.pageTrackers.get(key);
    
    if (!tracker) {
      tracker = {
        userId,
        documentId,
        pagesRead: 0,
        lastInsightPage: 0,
        lastInsightTimestamp: new Date(0) // Start from epoch
      };
      this.pageTrackers.set(key, tracker);
      this.log(`📊 Created new page tracker for user ${userId}, document ${documentId}`);
    }
    
    return tracker;
  }

  private updatePageCount(userId: number, documentId: number, chapter: number): void {
    const tracker = this.getOrCreatePageTracker(userId, documentId);
    tracker.pagesRead = chapter; // Using chapter as page count for simplicity
    this.pageTrackers.set(this.getPageTrackerKey(userId, documentId), tracker);
    
    this.log(`📖 Updated page count: User ${userId}, Document ${documentId}, Pages read: ${tracker.pagesRead}`);
  }

  private shouldGenerateInsight(userId: number, documentId: number): boolean {
    const tracker = this.getOrCreatePageTracker(userId, documentId);
    const pagesSinceLastInsight = tracker.pagesRead - tracker.lastInsightPage;
    
    const shouldGenerate = pagesSinceLastInsight >= this.PAGES_PER_INSIGHT;
    
    if (shouldGenerate) {
      this.log(`✅ Insight generation allowed: ${pagesSinceLastInsight} pages since last insight (threshold: ${this.PAGES_PER_INSIGHT})`);
    } else {
      this.log(`⏳ Insight generation limited: Only ${pagesSinceLastInsight} pages since last insight (need ${this.PAGES_PER_INSIGHT})`);
    }
    
    return shouldGenerate;
  }

  private markInsightGenerated(userId: number, documentId: number): void {
    const tracker = this.getOrCreatePageTracker(userId, documentId);
    tracker.lastInsightPage = tracker.pagesRead;
    tracker.lastInsightTimestamp = new Date();
    this.pageTrackers.set(this.getPageTrackerKey(userId, documentId), tracker);
    
    this.log(`🎯 Marked insight generated: User ${userId}, Document ${documentId}, Page ${tracker.lastInsightPage}`);
  }

  async generateInsightForChapter(documentId: number, chapter: number, userId: number = 1): Promise<Insight[]> {
    // Check if we should generate an insight based on page tracking
    this.updatePageCount(userId, documentId, chapter);
    if (!this.shouldGenerateInsight(userId, documentId)) {
      this.log(`📊 Skipping insight generation: need ${this.PAGES_PER_INSIGHT} pages between insights (current: ${this.getOrCreatePageTracker(userId, documentId).pagesRead - this.getOrCreatePageTracker(userId, documentId).lastInsightPage} pages since last insight)`);
      return [];
    }

    try {
      this.log(`🎯 Generating insights for document ${documentId}, chapter ${chapter} (page-limited generation)`);
      
      // Get document content
      const document = await storage.getDocument(documentId);
      if (!document) return [];

      const content = JSON.parse(document.content) as any;
      const chapterData = content.chapters.find((c: any) => c.number === chapter);
      if (!chapterData) return [];

      const text = chapterData.paragraphs.map((p: any) => p.text).join('\n');
      const title = document.title;

      // 🔍 NEW: Get power summaries for context
      const powerSummaryContext = await powerSummaryService.getPowerSummariesForAIContext(documentId, 5);
      const powerSummaryStats = await powerSummaryService.getPowerSummaryStats();

      // 🔍 NEW: Get user annotations for this chapter
      const annotations = await storage.getAnnotationsByChapter(userId, documentId, chapter);
      const annotationContext = annotations.map(a => a.note).join('\n');

      // Detect content domain
      const domain = await this.detectContentDomain(text, title);
      
      const insights: Insight[] = [];
      
      // Generate RAG-enhanced insights with power summaries and annotations
      const ragInsights = await this.generateRAGEnhancedInsightsWithContext(
        documentId, chapter, text, title, domain, userId, powerSummaryContext, annotationContext
      );
      insights.push(...ragInsights);
      
      // Generate thematic insights
      const thematicInsights = await this.generateThematicInsights(documentId, chapter, text, title, domain);
      insights.push(...thematicInsights.slice(0, 1)); // Limit to 1 thematic insight
      
      // Generate application insights
      const applicationInsights = await this.generateApplicationInsights(documentId, chapter, text, title, domain);
      insights.push(...applicationInsights.slice(0, 1)); // Limit to 1 application insight

      // Store insights
      insights.forEach(insight => {
        this.generatedInsights.set(insight.id, insight);
      });

      // Mark that we've generated an insight at this page
      this.markInsightGenerated(userId, documentId);

      this.log(`✅ Generated ${insights.length} insights for chapter ${chapter} (limited generation)`);
      return insights;
    } catch (error) {
      this.error(`Error generating insights: ${error}`);
      return [];
    }
  }

  private async detectContentDomain(text: string, title: string = ''): Promise<string> {
    const prompt = `Analyze this content and identify its primary domain/subject area:

Title: ${title}
Content (first 1500 chars): ${text.substring(0, 1500)}

What is the primary subject domain? Choose from:
- Religious/Biblical Studies
- Science (Physics, Chemistry, Biology, etc.)
- Philosophy
- History
- Literature
- Technology/Programming
- Psychology
- Medicine/Health
- Business/Economics
- Education
- Arts/Creative
- General Knowledge
- Other

Respond with just the domain name.`;

    try {
      const response = await this.ollamaService.generateText(prompt);
      return response.trim();
    } catch (error) {
      this.warn(`Domain detection failed: ${error}`);
      return 'General Knowledge';
    }
  }

  private async generateThematicInsights(documentId: number, chapter: number, text: string, title: string, domain: string): Promise<Insight[]> {
    let prompt = '';
    
    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      prompt = `As a biblical scholar and spiritual teacher, analyze this passage from ${title}, Chapter ${chapter} and identify the most profound spiritual themes.

TEXT: "${text.substring(0, 2000)}..."

Please identify 2-3 major spiritual themes with deep analysis:

For each theme:
1. **Theme Name**: Clear, compelling title
2. **Spiritual Significance**: Why this theme matters for spiritual growth
3. **Biblical Development**: How it unfolds in this specific passage
4. **Universal Connection**: How it relates to the broader biblical narrative
5. **Personal Application**: How readers can apply this truth today

Focus on themes that would:
- Transform someone's understanding of God
- Provide comfort in difficult times  
- Challenge complacency in faith
- Reveal God's character and love
- Inspire deeper discipleship

Write in a warm, pastoral tone that would be meaningful when heard aloud. Each theme should be 2-3 sentences that could stand alone as a powerful spiritual insight.

Format your response as:
THEME 1: [Title]
[2-3 sentences of deep spiritual insight]

THEME 2: [Title] 
[2-3 sentences of deep spiritual insight]

THEME 3: [Title]
[2-3 sentences of deep spiritual insight]`;
    } else if (domain.toLowerCase().includes('science') || domain.toLowerCase().includes('physics')) {
      prompt = `As a science educator and expert in ${domain}, analyze this content from ${title}, Chapter ${chapter} and identify the most important scientific concepts and principles.

TEXT: "${text.substring(0, 2000)}..."

Please identify 2-3 major scientific themes with clear explanations:

For each theme:
1. **Concept Name**: Clear, precise title
2. **Scientific Significance**: Why this concept is important to understand
3. **Practical Applications**: How this applies to real-world situations  
4. **Connections**: How it relates to other scientific principles
5. **Learning Impact**: Why mastering this concept matters

Focus on themes that would:
- Clarify complex scientific principles
- Show real-world applications
- Build foundation for advanced concepts
- Inspire scientific curiosity
- Connect abstract ideas to concrete examples

Write in clear, accessible language suitable for voice reading. Each theme should be 2-3 sentences that explain the concept clearly.

Format your response as:
CONCEPT 1: [Title]
[2-3 sentences explaining the concept]

CONCEPT 2: [Title]
[2-3 sentences explaining the concept]

CONCEPT 3: [Title]
[2-3 sentences explaining the concept]`;
    } else {
      prompt = `As an expert in ${domain}, analyze this content from ${title}, Chapter ${chapter} and identify the most important themes and concepts.

TEXT: "${text.substring(0, 2000)}..."

Please identify 2-3 major themes with clear explanations:

For each theme:
1. **Theme Name**: Clear, compelling title
2. **Significance**: Why this theme is important to understand
3. **Key Insights**: The main points or takeaways
4. **Connections**: How it relates to other concepts in this field
5. **Practical Value**: How understanding this helps in real situations

Write in clear, engaging language suitable for voice reading. Each theme should be 2-3 sentences that capture the essence of the concept.

Format your response as:
THEME 1: [Title]
[2-3 sentences explaining the theme]

THEME 2: [Title]
[2-3 sentences explaining the theme]

THEME 3: [Title]
[2-3 sentences explaining the theme]`;
    }

    try {
      const response = await this.ollamaService.generateText(prompt);
      const themes = this.parseThematicResponse(response);
      
      return themes.map((theme, index) => ({
        id: `theme-${documentId}-${chapter}-${index}`,
        documentId,
        chapter,
        type: 'theme' as const,
        title: domain.toLowerCase().includes('science') ? `Scientific Concept: ${theme.title}` : `Key Theme: ${theme.title}`,
        content: theme.content,
        relevanceScore: 0.9,
        createdAt: new Date(),
        tags: ['theme', domain.toLowerCase(), 'voice-optimized']
      }));
    } catch (error) {
      this.warn(`Error generating thematic insights: ${error}`);
      return [];
    }
  }

  private async generateApplicationInsights(documentId: number, chapter: number, text: string, title: string, domain: string): Promise<Insight[]> {
    let prompt = '';
    
    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      prompt = `As a practical discipleship coach, analyze this passage from ${title}, Chapter ${chapter} and provide actionable spiritual applications.

TEXT: "${text.substring(0, 2000)}..."

Create practical applications that help modern believers live out these biblical truths:

REQUIREMENTS:
- Address real-life situations believers face today
- Provide specific, actionable steps
- Connect biblical truth to daily decisions
- Encourage spiritual growth and transformation
- Be relevant across different life stages and circumstances

Focus on applications for:
1. **Personal Transformation**: How this passage changes how we think, feel, or act
2. **Relationships**: How these truths impact how we treat others
3. **Life Challenges**: How this passage provides guidance for difficulties
4. **Spiritual Disciplines**: How to live out these truths through prayer, study, service

Write in an encouraging, practical tone suitable for voice reading. Each application should inspire immediate action while connecting to eternal truths.

Format as a cohesive 3-4 sentence practical guide that flows naturally when spoken aloud.`;
    } else if (domain.toLowerCase().includes('science') || domain.toLowerCase().includes('physics')) {
      prompt = `As a science educator, analyze this content from ${title}, Chapter ${chapter} and provide practical applications and real-world connections.

TEXT: "${text.substring(0, 2000)}..."

Create practical applications that help learners understand how these scientific concepts apply to real life:

REQUIREMENTS:
- Show real-world examples and applications
- Connect abstract concepts to everyday experiences
- Provide ways to observe or experiment with these principles
- Explain how this knowledge is useful in various careers or situations
- Make science feel relevant and accessible

Focus on applications for:
1. **Daily Life**: How these principles appear in everyday situations
2. **Technology**: How this science enables modern technology
3. **Problem Solving**: How understanding this helps solve real problems
4. **Future Learning**: How this knowledge builds toward more advanced concepts

Write in an engaging, practical tone suitable for voice reading. Make science feel exciting and relevant.

Format as a cohesive 3-4 sentence guide that shows practical value and real-world connections.`;
    } else {
      prompt = `As an expert in ${domain}, analyze this content from ${title}, Chapter ${chapter} and provide practical applications and real-world connections.

TEXT: "${text.substring(0, 2000)}..."

Create practical applications that help learners understand how these concepts apply to real situations:

REQUIREMENTS:
- Show real-world examples and applications
- Connect abstract ideas to concrete experiences
- Provide actionable insights or steps
- Explain how this knowledge is useful in practice
- Make the content feel relevant and valuable

Write in an engaging, practical tone suitable for voice reading. Make the content feel immediately useful and applicable.

Format as a cohesive 3-4 sentence guide that shows practical value and real-world connections.`;
    }

    try {
      const response = await this.ollamaService.generateText(prompt);
      
      return [{
        id: `application-${documentId}-${chapter}`,
        documentId,
        chapter,
        type: 'application' as const,
        title: domain.toLowerCase().includes('religious') ? 'Living It Out: Practical Application' : 'Real-World Applications',
        content: response,
        relevanceScore: 0.95,
        createdAt: new Date(),
        tags: ['application', 'practical', domain.toLowerCase(), 'voice-optimized']
      }];
    } catch (error) {
      this.warn(`Error generating application insights: ${error}`);
      return [];
    }
  }

  private async generateHistoricalInsights(documentId: number, chapter: number, text: string, title: string, domain: string): Promise<Insight[]> {
    let prompt = '';
    
    if (domain.toLowerCase().includes('religious') || domain.toLowerCase().includes('biblical')) {
      prompt = `As a biblical historian and cultural expert, provide rich historical context for this passage from ${title}, Chapter ${chapter}.

TEXT: "${text.substring(0, 2000)}..."

Illuminate the historical and cultural background that brings this passage to life:

HISTORICAL ELEMENTS TO EXPLORE:
- **Time Period & Setting**: When and where this occurred, why timing mattered
- **Cultural Practices**: Customs, traditions, or social norms that modern readers might miss
- **Political Context**: Rulers, conflicts, or social conditions affecting the original audience
- **Religious Background**: Temple practices, Jewish customs, or spiritual traditions relevant to the text
- **Daily Life Details**: How people lived, worked, traveled, or worshipped in this era

GOALS:
- Help modern readers feel transported to the biblical world
- Explain details that enhance understanding and emotional connection
- Show how historical context deepens the passage's meaning
- Make ancient truths feel vivid and immediate
- Enhance the listening experience with engaging background

Write in a storytelling tone that captivates listeners, as if you're painting a picture of the biblical world. Make it 3-4 sentences that flow beautifully when read aloud.`;
    } else if (domain.toLowerCase().includes('science') || domain.toLowerCase().includes('physics')) {
      prompt = `As a science historian, provide fascinating historical context for these scientific concepts from ${title}, Chapter ${chapter}.

TEXT: "${text.substring(0, 2000)}..."

Illuminate the historical development and discovery of these scientific principles:

HISTORICAL ELEMENTS TO EXPLORE:
- **Discovery Timeline**: When and how these concepts were discovered
- **Key Scientists**: Who made breakthrough discoveries and their stories
- **Historical Context**: What was happening in science and society during these discoveries
- **Experimental Breakthroughs**: Famous experiments that proved these principles
- **Impact on Society**: How these discoveries changed technology and human understanding

GOALS:
- Make science feel human and relatable through stories
- Show how scientific knowledge builds over time
- Highlight the excitement and challenges of scientific discovery
- Connect historical context to modern applications
- Enhance engagement through fascinating historical details

Write in an engaging, storytelling tone that brings the history of science to life. Make it 3-4 sentences that flow beautifully when read aloud.`;
    } else {
      prompt = `As a subject matter expert in ${domain}, provide interesting historical context and background for this content from ${title}, Chapter ${chapter}.

TEXT: "${text.substring(0, 2000)}..."

Provide historical context that enriches understanding:

CONTEXTUAL ELEMENTS TO EXPLORE:
- **Historical Development**: How these ideas or practices developed over time
- **Key Figures**: Important people who contributed to this field
- **Cultural Context**: How historical events shaped these concepts
- **Evolution of Thinking**: How understanding has changed over time
- **Impact and Influence**: How these ideas influenced society or other fields

Write in an engaging tone that adds depth and interest to the material. Make it 3-4 sentences that provide valuable context when read aloud.`;
    }

    try {
      const response = await this.ollamaService.generateText(prompt);
      
      return [{
        id: `historical-${documentId}-${chapter}`,
        documentId,
        chapter,
        type: 'historical' as const,
        title: domain.toLowerCase().includes('religious') ? 'Historical Window: Understanding the Context' : 'Historical Background',
        content: response,
        relevanceScore: 0.8,
        createdAt: new Date(),
        tags: ['historical', 'context', 'background', domain.toLowerCase(), 'voice-optimized']
      }];
    } catch (error) {
      this.warn(`Error generating historical insights: ${error}`);
      return [];
    }
  }

  // 🧠 NEW: RAG-Enhanced Cross-Document Insight Generation
  private async generateRAGEnhancedInsights(
    documentId: number, 
    chapter: number, 
    content: string, 
    title: string, 
    domain: string, 
    userId: number
  ): Promise<Insight[]> {
    try {
      this.log(`🔍 Generating RAG-enhanced insights for cross-document connections`);
      
      // Build RAG context for insight discovery
      const ragContext: RAGContext = {
        userId: userId,
        currentDocument: documentId,
        currentChapter: chapter,
        conversationHistory: [],
        userStudyPatterns: [domain, 'insight-generation'],
        preferredTopics: this.extractKeyThemes(content),
        studyLevel: 'intermediate'
      };
      
      // Search for related concepts and themes across user's library
      const themeQuery = `themes, concepts, and insights related to: ${title} ${content.substring(0, 300)}`;
      
      const ragResponse: RAGResponse = await documentRAGService.processRAGQuery(
        themeQuery, 
        ragContext, 
        {
          maxSources: 5, // More sources for comprehensive insights
          includeAnnotations: true, // Include user notes for personalized insights
          includeMemories: true, // Include AI memories for learned patterns
          searchDepth: 'thorough', // Deep search for quality insights
          useEmbeddings: true
        }
      );
      
      const ragInsights: Insight[] = [];
      
      // Generate cross-document connection insights
      if (ragResponse.sources.length > 1) {
        const connectionInsight = await this.generateCrossDocumentConnectionInsight(
          documentId, chapter, content, title, ragResponse.sources
        );
        if (connectionInsight) ragInsights.push(connectionInsight);
      }
      
      // Generate pattern recognition insights
      if (ragResponse.sources.length > 0) {
        const patternInsight = await this.generatePatternRecognitionInsight(
          documentId, chapter, content, title, ragResponse.sources, domain
        );
        if (patternInsight) ragInsights.push(patternInsight);
      }
      
      this.log(`✅ Generated ${ragInsights.length} RAG-enhanced insights with ${ragResponse.sources.length} source connections`);
      return ragInsights;
      
    } catch (error) {
      this.warn(`RAG-enhanced insight generation failed: ${error}`);
      return [];
    }
  }

  private async generateCrossDocumentConnectionInsight(
    documentId: number, 
    chapter: number, 
    content: string, 
    title: string, 
    sources: any[]
  ): Promise<Insight | null> {
    try {
      const relatedDocs = sources.filter(s => s.source.id !== documentId);
      if (relatedDocs.length === 0) return null;
      
      const connectionPrompt = `Analyze connections between these materials:

CURRENT: "${title}" Chapter ${chapter}
${content.substring(0, 800)}

RELATED:
${relatedDocs.slice(0, 3).map((source, i) => 
  `${i + 1}. ${source.documentTitle}: "${source.excerpt}"`
).join('\n')}

Generate a cross-document insight (2-3 sentences) that reveals meaningful connections between these materials.`;

      const response = await this.multiModelService.executeTask('theological-reasoning', connectionPrompt, {
        requirements: { reasoning: 9, creativity: 7, accuracy: 8 }
      });

      return {
        id: `cross-doc-${documentId}-${chapter}-${Date.now()}`,
        documentId,
        chapter,
        type: 'connection' as const,
        title: 'Cross-Document Connection',
        content: response.response,
        relevanceScore: 0.9,
        createdAt: new Date(),
        tags: ['cross-document', 'connection', 'rag-enhanced']
      };
    } catch (error) {
      this.warn(`Cross-document connection insight failed: ${error}`);
      return null;
    }
  }

  private async generatePatternRecognitionInsight(
    documentId: number, 
    chapter: number, 
    content: string, 
    title: string, 
    sources: any[], 
    domain: string
  ): Promise<Insight | null> {
    try {
      const patternPrompt = `Identify patterns across these materials:

CURRENT: "${title}" Chapter ${chapter}
${content.substring(0, 600)}

RELATED:
${sources.slice(0, 3).map((source, i) => 
  `${i + 1}. ${source.documentTitle}: "${source.excerpt.substring(0, 100)}"`
).join('\n')}

Generate a pattern recognition insight (2-3 sentences) that identifies recurring themes or concepts.`;

      const response = await this.multiModelService.executeTask('pattern-analysis', patternPrompt, {
        requirements: { reasoning: 8, creativity: 6, accuracy: 9 }
      });

      return {
        id: `pattern-${documentId}-${chapter}-${Date.now()}`,
        documentId,
        chapter,
        type: 'theme' as const,
        title: `Recurring Pattern (${domain})`,
        content: response.response,
        relevanceScore: 0.85,
        createdAt: new Date(),
        tags: ['pattern', 'rag-enhanced', domain.toLowerCase()]
      };
    } catch (error) {
      this.warn(`Pattern recognition insight failed: ${error}`);
      return null;
    }
  }

  private extractKeyThemes(content: string): string[] {
    try {
      const words = content.toLowerCase().split(/\W+/);
      const meaningfulWords = words.filter(word => 
        word.length > 4 && 
        !['this', 'that', 'with', 'have', 'they', 'were', 'been', 'their', 'would'].includes(word)
      );
      
      const wordCount = new Map<string, number>();
      meaningfulWords.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
      
      return Array.from(wordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
    } catch (error) {
      return ['general', 'study'];
    }
  }

  private parseThematicResponse(response: string): Array<{title: string, content: string}> {
    // Simple parsing - in production, this could be more sophisticated
    const themes: Array<{title: string, content: string}> = [];
    const sections = response.split(/\d+\./);
    
    sections.forEach(section => {
      const trimmed = section.trim();
      if (trimmed.length > 50) {
        const lines = trimmed.split('\n');
        const title = lines[0].substring(0, 60) + '...';
        const content = trimmed;
        themes.push({ title, content });
      }
    });
    
    return themes.slice(0, 3); // Limit to 3 themes
  }

  private async discoverCrossReferences(): Promise<void> {
    try {
      this.log('Discovering cross-references between texts...');
      
      const documents = await storage.getDocuments(2); // Default user (fixed user ID)
      
      // Compare chapters across documents to find connections
      for (let i = 0; i < documents.length; i++) {
        for (let j = i + 1; j < documents.length; j++) {
          await this.findConnectionsBetweenDocuments(documents[i], documents[j]);
        }
      }
      
      // Schedule next cross-reference discovery (24 hours)
      setTimeout(() => {
        this.addTask('DISCOVER_CONNECTIONS', {}, 1);
      }, 86400000); // 24 hours (less frequent)
      
    } catch (error) {
      this.error(`Error discovering cross-references: ${error}`);
    }
  }

  private async findConnectionsBetweenDocuments(doc1: any, doc2: any): Promise<void> {
    try {
      // Sample chapters from each document
      const sampleChapters1 = this.sampleChapters(doc1, 2);
      const sampleChapters2 = this.sampleChapters(doc2, 2);
      
      for (const ch1 of sampleChapters1) {
        for (const ch2 of sampleChapters2) {
          const connection = await this.analyzeConnection(doc1, ch1, doc2, ch2);
          if (connection && connection.strength > 0.6) {
            this.crossReferences.push(connection);
          }
        }
      }
    } catch (error) {
      this.warn(`Error finding connections between ${doc1.title} and ${doc2.title}: ${error}`);
    }
  }

  private sampleChapters(document: any, count: number): number[] {
    const totalChapters = document.totalChapters;
    const chapters: number[] = [];
    
    for (let i = 0; i < Math.min(count, totalChapters); i++) {
      chapters.push(Math.floor(Math.random() * totalChapters) + 1);
    }
    
    return chapters;
  }

  private async analyzeConnection(doc1: any, ch1: number, doc2: any, ch2: number): Promise<CrossReference | null> {
    try {
      const content1 = doc1.content as any;
      const content2 = doc2.content as any;
      
      const chapter1 = content1.chapters?.find((ch: any) => ch.number === ch1);
      const chapter2 = content2.chapters?.find((ch: any) => ch.number === ch2);
      
      if (!chapter1 || !chapter2) return null;
      
      const text1 = chapter1.paragraphs.map((p: any) => p.text).join(' ').substring(0, 800);
      const text2 = chapter2.paragraphs.map((p: any) => p.text).join(' ').substring(0, 800);
      
      const prompt = `Analyze these two biblical passages and identify any thematic, theological, or narrative connections:

Passage 1 (${doc1.title}, Chapter ${ch1}):
"${text1}"

Passage 2 (${doc2.title}, Chapter ${ch2}):
"${text2}"

Rate the connection strength (0-1) and describe the connection type. Only respond if there's a meaningful connection (>0.6).`;

      const response = await this.ollamaService.generateText(prompt);
      
      // Parse response for connection strength and type
      const strengthMatch = response.match(/(\d*\.?\d+)/);
      const strength = strengthMatch ? parseFloat(strengthMatch[1]) : 0;
      
      if (strength > 0.6) {
        return {
          id: `connection-${doc1.id}-${ch1}-${doc2.id}-${ch2}`,
          sourceDocumentId: doc1.id,
          sourceChapter: ch1,
          targetDocumentId: doc2.id,
          targetChapter: ch2,
          connectionType: 'theme' as const,
          strength,
        };
      }
      
      return null;
    } catch (error) {
      this.warn(`Error analyzing connection: ${error}`);
      return null;
    }
  }

  public async requestInsightGeneration(documentId: number, chapter?: number, language: string = 'en'): Promise<string> {
    let response = `Insight generation requested for document ${documentId}${chapter ? `, chapter ${chapter}` : ''}`;
    
    // 🌐 LANGUAGE FIX: Apply language transformation to response
    if (language !== 'en' && this.translationService) {
      try {
        const translatedResponse = await this.translationService.translateText({
          text: response,
          targetLanguage: language,
          context: 'general'
        });
        response = translatedResponse.translatedText;
      } catch (error) {
        this.warn(`Insight generation response translation failed: ${error}`);
      }
    }
    
    return response;
  }

  setTranslationService(translationService: any): void {
    this.translationService = translationService;
    this.log('🌐 Translation service set for Insight Generation Agent');
  }

  public getInsightsForChapter(documentId: number, chapter: number): Insight[] {
    return Array.from(this.generatedInsights.values())
      .filter(insight => insight.documentId === documentId && insight.chapter === chapter);
  }

  public getCrossReferences(documentId: number, chapter: number): CrossReference[] {
    return this.crossReferences.filter(ref => 
      (ref.sourceDocumentId === documentId && ref.sourceChapter === chapter) ||
      (ref.targetDocumentId === documentId && ref.targetChapter === chapter)
    );
  }

  public getInsightStats() {
    return {
      totalInsights: this.generatedInsights.size,
      totalCrossReferences: this.crossReferences.length,
      insightsByType: this.groupInsightsByType(),
      recentInsights: this.getRecentInsights(5)
    };
  }

  public getPageTrackingStats() {
    const stats = Array.from(this.pageTrackers.values()).map(tracker => ({
      userId: tracker.userId,
      documentId: tracker.documentId,
      pagesRead: tracker.pagesRead,
      lastInsightPage: tracker.lastInsightPage,
      pagesSinceLastInsight: tracker.pagesRead - tracker.lastInsightPage,
      lastInsightTimestamp: tracker.lastInsightTimestamp
    }));

    return {
      totalTrackers: this.pageTrackers.size,
      trackerDetails: stats,
      averagePagesBetweenInsights: this.PAGES_PER_INSIGHT
    };
  }

  private groupInsightsByType(): Record<string, number> {
    const groups: Record<string, number> = {};
    this.generatedInsights.forEach(insight => {
      groups[insight.type] = (groups[insight.type] || 0) + 1;
    });
    return groups;
  }

  private getRecentInsights(count: number): Insight[] {
    return Array.from(this.generatedInsights.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, count);
  }

  // 🔍 NEW: Enhanced RAG insights with power summaries and annotations
  private async generateRAGEnhancedInsightsWithContext(
    documentId: number, 
    chapter: number, 
    content: string, 
    title: string, 
    domain: string, 
    userId: number,
    summaryContext: string,
    annotationContext: string
  ): Promise<Insight[]> {
    try {
      this.log(`🔍 Generating RAG-enhanced insights with power summaries and annotations`);

      // Build enhanced RAG context
      const ragContext: RAGContext = {
        userId,
        currentDocument: documentId,
        currentChapter: chapter,
        conversationHistory: [],
        userStudyPatterns: [],
        preferredTopics: [],
        studyLevel: 'intermediate'
      };

      // Enhanced query with power summaries and annotation context
      const enhancedQuery = `Generate deep insights for this content:

Title: ${title}
Chapter: ${chapter}
Content: ${content.substring(0, 2000)}

Previous Power Summaries:
${summaryContext.substring(0, 1000)}

User Annotations:
${annotationContext.substring(0, 1000)}

Focus on: connections, patterns, applications, and deep understanding.`;

      const ragResponse = await documentRAGService.processRAGQuery(enhancedQuery, ragContext, {
        maxSources: 5,
        includeAnnotations: true,
        includeMemories: true,
        searchDepth: 'thorough'
      });

      // Convert RAG response to insights
      const insights: Insight[] = [];
      
      if (ragResponse.sources.length > 0) {
        const connectionInsight = await this.generateCrossDocumentConnectionInsightWithContext(
          documentId, chapter, content, title, ragResponse.sources, summaryContext, annotationContext
        );
        if (connectionInsight) insights.push(connectionInsight);
      }

      return insights;
      
    } catch (error) {
      this.error(`RAG-enhanced insight generation failed: ${error}`);
      return [];
    }
  }

  // 🔍 NEW: Enhanced cross-document connection insight with context
  private async generateCrossDocumentConnectionInsightWithContext(
    documentId: number, 
    chapter: number, 
    content: string, 
    title: string, 
    sources: any[],
    summaryContext: string,
    annotationContext: string
  ): Promise<Insight | null> {
    try {
      const sourceInfo = sources.slice(0, 3).map(s => 
        `"${s.excerpt}" from ${s.documentTitle}`
      ).join('\n');

      const prompt = `Generate a deep insight connecting this content with related materials and user context:

Current Content: ${content.substring(0, 1500)}
Title: ${title}, Chapter: ${chapter}

Related Sources:
${sourceInfo}

Power Summaries Context:
${summaryContext.substring(0, 800)}

User Annotations Context:
${annotationContext.substring(0, 800)}

Create an insight that:
1. Connects themes across documents
2. Builds on user's previous understanding (annotations/summaries)
3. Reveals deeper patterns or applications
4. Provides practical relevance

Format: {"title": "connection title", "content": "detailed insight"}`;

      let response: string;
      
      try {
        const result = await this.multiModelService.executeTask('insight-generation', prompt, {
          requirements: { reasoning: 8, creativity: 7, accuracy: 7 }
        });
        response = result.response;
      } catch (error) {
        response = await this.ollamaService.generateText(prompt);
      }

      const parsed = this.parseInsightResponse(response);
      if (!parsed) return null;

      return {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        documentId,
        chapter,
        type: 'connection',
        title: parsed.title,
        content: parsed.content,
        relevanceScore: 0.85,
        createdAt: new Date(),
        tags: ['cross-reference', 'connection', 'enhanced-context']
      };

    } catch (error) {
      this.error(`Enhanced connection insight generation failed: ${error}`);
      return null;
    }
  }

  // Helper method to parse insight responses
  private parseInsightResponse(response: string): {title: string, content: string} | null {
    try {
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      
      // Fallback parsing
      const lines = response.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        return {
          title: lines[0].replace(/[^\w\s]/g, '').trim(),
          content: lines.slice(1).join('\n').trim()
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async analyzeThemesWithRAG(): Promise<void> {
    this.log('Starting high-level theme analysis with RAG...');
    try {
      const allDocuments = await storage.getDocuments(2); // Default user (fixed user ID)
      if (allDocuments.length === 0) {
        this.log('No documents found for theme analysis.');
        return;
      }

      const allContent = allDocuments.map(doc => {
        const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
        return content.chapters.map((ch: any) => ch.paragraphs.map((p: any) => p.text).join(' ')).join('\n');
      }).join('\n\n');

      const query = "What are the major recurring themes across all available texts?";
      const ragContext: RAGContext = {
        userId: 1,
        conversationHistory: [],
        userStudyPatterns: [],
        preferredTopics: [],
        studyLevel: 'advanced',
      };

      const response = await documentRAGService.processRAGQuery(query, ragContext, { searchDepth: 'thorough' });
      this.log(`RAG-based theme analysis complete. Response: ${response.answer.substring(0, 100)}...`);

    } catch (error) {
      this.error(`Error during RAG theme analysis: ${error}`);
    }
  }
}