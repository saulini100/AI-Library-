import '../env.js'; // Load environment variables first
import { MultiModelService } from './multi-model-service.js';
import { CachedEmbeddingService } from './cached-embedding-service.js';
import { QueryResultCacheService } from './query-result-cache-service.js';
import { db } from '../db.js';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    scrapedAt: Date;
    contentType: 'article' | 'definition' | 'tutorial' | 'reference' | 'other';
    wordCount: number;
    language: string;
    author?: string;
    publishDate?: Date;
    tags: string[];
  };
  extractedData: {
    definitions: Array<{ term: string; definition: string; context: string }>;
    keyPoints: string[];
    examples: string[];
    relatedTerms: string[];
    citations: string[];
  };
  aiAnalysis: {
    summary: string;
    complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    domain: string;
    confidence: number;
    learningValue: number;
  };
}

export interface ScrapingOptions {
  maxPages?: number;
  followLinks?: boolean;
  extractImages?: boolean;
  respectRobots?: boolean;
  userAgent?: string;
  timeout?: number;
  selectors?: {
    content?: string;
    title?: string;
    author?: string;
    date?: string;
  };
}

export class WebScrapingService {
  private multiModel: MultiModelService;
  private embeddingService: CachedEmbeddingService;
  private cacheService: QueryResultCacheService;
  private scrapingQueue: Map<string, Promise<ScrapedContent[]>> = new Map();
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 1000; // 1 second between requests
  private scrapeCache: Map<string, { data: ScrapedContent; timestamp: number }> = new Map();
  private cacheExpiryMs: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.multiModel = new MultiModelService();
    this.embeddingService = new CachedEmbeddingService();
    this.cacheService = new QueryResultCacheService();
  }

  async initialize(): Promise<void> {
    console.log('🕷️ Initializing Web Scraping Service...');
    console.log('⚡ Optimized for llama3.2:3b - Speed Priority: 10/10');
    console.log('🎯 Using quick-classification task type for maximum speed');
    
    // Initialize the MultiModelService - this was missing!
    await this.multiModel.initialize();
    
    console.log('✅ Web Scraping Service initialized');
  }

  /**
   * 🔍 INTELLIGENT WEB SCRAPING WITH AI ANALYSIS
   */
  async scrapeAndLearn(
    urls: string | string[],
    query: string,
    options: ScrapingOptions = {}
  ): Promise<ScrapedContent[]> {
    const urlList = Array.isArray(urls) ? urls : [urls];
    const results: ScrapedContent[] = [];

    console.log(`🕷️ Starting intelligent scraping for: "${query}"`);
    console.log(`📄 Processing ${urlList.length} URLs`);

    for (const url of urlList) {
      try {
        // Rate limiting
        await this.enforceRateLimit();

        // Check cache first
        const cacheKey = `web_scrape:${url}:${query}`;
        const cached = await this.getCachedScraping(cacheKey);
        
        if (cached) {
          console.log(`⚡ Cache hit for ${url}`);
          results.push(cached);
          continue;
        }

        // Scrape fresh content
        const scraped = await this.scrapeUrl(url, query, options);
        if (scraped) {
          // Cache the result
          await this.cacheScraping(cacheKey, scraped);
          results.push(scraped);
          
          // Learn from the scraped content
          await this.learnFromScrapedContent(scraped, query);
        }

      } catch (error) {
        console.error(`❌ Failed to scrape ${url}: ${error}`);
      }
    }

    console.log(`✅ Scraped ${results.length} pages successfully`);
    return results;
  }

  /**
   * ⏱️ RATE LIMITING TO PREVENT BEING BLOCKED
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 🤖 CHECK ROBOTS.TXT COMPLIANCE
   */
  private async checkRobotsTxt(url: string, userAgent: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      
      const response = await fetch(robotsUrl, {
        timeout: 5000,
        headers: { 'User-Agent': userAgent }
      } as any);
      
      if (!response.ok) {
        // If robots.txt doesn't exist, assume allowed
        return true;
      }
      
      const robotsText = await response.text();
      const lines = robotsText.split('\n');
      
      let currentUserAgent = '';
      let disallowed = false;
      
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        
        if (trimmed.startsWith('user-agent:')) {
          currentUserAgent = trimmed.split(':')[1].trim();
        } else if (trimmed.startsWith('disallow:') && 
                  (currentUserAgent === '*' || currentUserAgent === userAgent.toLowerCase())) {
          const disallowPath = trimmed.split(':')[1].trim();
          if (disallowPath === '/' || url.includes(disallowPath)) {
            disallowed = true;
            break;
          }
        }
      }
      
      return !disallowed;
    } catch (error) {
      console.warn(`⚠️ Could not check robots.txt for ${url}: ${error}`);
      return true; // Assume allowed if we can't check
    }
  }

  /**
   * 🔍 SCRAPE SINGLE URL WITH AI ENHANCEMENT
   */
  private async scrapeUrl(
    url: string,
    query: string,
    options: ScrapingOptions
  ): Promise<ScrapedContent | null> {
    try {
      console.log(`🔍 Scraping: ${url}`);

      // Check robots.txt if requested
      if (options.respectRobots) {
        const userAgent = options.userAgent || 'Mozilla/5.0 (compatible; BibleCompanion-Bot/1.0)';
        const allowed = await this.checkRobotsTxt(url, userAgent);
        if (!allowed) {
          console.warn(`🚫 Robots.txt disallows scraping ${url}`);
          return null;
        }
      }

      // Use fetch for static content scraping with proper error handling
      const rawContent = await this.scrapeStatic(url, options);

      if (!rawContent) return null;

      // AI-powered content analysis and extraction
      const aiAnalysis = await this.analyzeScrapedContent(rawContent, query);
      
      // Extract structured data using AI
      const extractedData = await this.extractStructuredData(rawContent, query);

      // Ensure extractedData has all required fields
      const safeExtractedData = {
        definitions: extractedData.definitions || [],
        keyPoints: extractedData.keyPoints || [],
        examples: extractedData.examples || [],
        relatedTerms: extractedData.relatedTerms || [],
        citations: extractedData.citations || [],
        ...extractedData
      };

      const scrapedContent: ScrapedContent = {
        url,
        title: rawContent.title,
        content: rawContent.content,
        metadata: {
          scrapedAt: new Date(),
          contentType: aiAnalysis.contentType || 'other',
          wordCount: rawContent.content.split(/\s+/).length,
          language: aiAnalysis.language || 'en',
          author: rawContent.author,
          publishDate: rawContent.publishDate,
          tags: aiAnalysis.tags || []
        },
        extractedData: safeExtractedData,
        aiAnalysis: {
          summary: aiAnalysis.summary || 'Content analyzed',
          complexity: aiAnalysis.complexity || 'intermediate',
          domain: aiAnalysis.domain || 'General',
          confidence: aiAnalysis.confidence || 0.5,
          learningValue: aiAnalysis.learningValue || 0.5
        }
      };

      return scrapedContent;

    } catch (error) {
      console.error(`❌ Scraping failed for ${url}: ${error}`);
      return null;
    }
  }

  /**
   * 🧠 AI-POWERED CONTENT ANALYSIS
   */
  private async analyzeScrapedContent(rawContent: any, query: string): Promise<any> {
    const analysisPrompt = `Analyze this scraped web content for learning value and structure:

ORIGINAL QUERY: "${query}"
CONTENT TITLE: ${rawContent.title}
CONTENT: ${rawContent.content.substring(0, 3000)}

Analyze and provide JSON response:
{
  "contentType": "article|definition|tutorial|reference|other",
  "summary": "2-3 sentence summary of key information",
  "complexity": "beginner|intermediate|advanced|expert",
  "domain": "subject domain (e.g., 'Computer Science', 'Physics', 'History')",
  "language": "detected language code",
  "confidence": 0.95,
  "learningValue": 0.85,
  "tags": ["tag1", "tag2", "tag3"],
  "relevanceToQuery": 0.9
}`;

    try {
      const result = await this.multiModel.executeTask('quick-classification', analysisPrompt, {
        requirements: { accuracy: 6, speed: 8 }
      });

      return this.parseJsonWithFallback(result.response);
    } catch (error) {
      console.error(`❌ AI analysis failed: ${error instanceof Error ? error.message : error}`);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * 📊 EXTRACT STRUCTURED DATA USING AI
   */
  private async extractStructuredData(rawContent: any, query: string): Promise<any> {
    const extractionPrompt = `Extract structured learning data from this web content:

QUERY CONTEXT: "${query}"
CONTENT: ${rawContent.content.substring(0, 4000)}

Extract and format as JSON:
{
  "definitions": [
    {"term": "term1", "definition": "clear definition", "context": "usage context"}
  ],
  "keyPoints": ["important point 1", "important point 2"],
  "examples": ["example 1", "example 2"],
  "relatedTerms": ["related term 1", "related term 2"],
  "citations": ["source 1", "source 2"],
  "practicalApplications": ["application 1", "application 2"],
  "prerequisites": ["prerequisite 1", "prerequisite 2"]
}`;

    try {
      const result = await this.multiModel.executeTask('quick-classification', extractionPrompt, {
        requirements: { accuracy: 6, speed: 8 }
      });

      return this.parseJsonWithFallback(result.response);
    } catch (error) {
      console.error(`❌ Data extraction failed: ${error instanceof Error ? error.message : error}`);
      return { definitions: [], keyPoints: [], examples: [], relatedTerms: [], citations: [] };
    }
  }

  /**
   * 🧠 LEARN FROM SCRAPED CONTENT
   */
  private async learnFromScrapedContent(content: ScrapedContent, originalQuery: string): Promise<void> {
    try {
      console.log(`🧠 Learning from scraped content: ${content.title}`);

      // Store in knowledge base with embeddings
      const definitions = content.extractedData?.definitions || [];
      for (const definition of definitions) {
        const embedding = await this.embeddingService.getEmbedding(
          `${definition.term}: ${definition.definition} ${definition.context}`,
          0, // No specific document
          0, // No specific chapter
          0  // No specific paragraph
        );

        // Store learned definition
        await this.storeLearnedDefinition({
          term: definition.term,
          definition: definition.definition,
          context: definition.context,
          source: content.url,
          originalQuery,
          embedding: embedding.embedding,
          confidence: content.aiAnalysis.confidence,
          domain: content.aiAnalysis.domain,
          complexity: content.aiAnalysis.complexity,
          scrapedAt: content.metadata.scrapedAt
        });
      }

      console.log(`✅ Learned ${definitions.length} definitions from ${content.url}`);
    } catch (error) {
      console.error(`❌ Learning from scraped content failed: ${error}`);
    }
  }

  /**
   * 💾 STORE LEARNED DEFINITION IN DATABASE
   */
  private async storeLearnedDefinition(data: any): Promise<void> {
    try {
      const { db } = await import('../db.js');
      const { learnedDefinitions } = await import('../../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      
      // Check if definition already exists by term
      const existing = await db
        .select()
        .from(learnedDefinitions)
        .where(eq(learnedDefinitions.term, data.term))
        .limit(1);

      if (existing.length > 0) {
        // Update access count and last accessed
        await db
          .update(learnedDefinitions)
          .set({
            last_accessed_at: new Date(),
            access_count: (existing[0]?.access_count || 0) + 1,
            updated_at: new Date()
          })
          .where(eq(learnedDefinitions.id, existing[0].id));
        
        console.log(`🔄 Updated existing definition: ${data.term}`);
        return;
      }

      // Store new definition
      const definitionData = {
        term: data.term,
        definition: data.definition,
        context_snippet: data.context || null,
        confidence_score: Math.round((data.confidence || 0.8) * 100), // Convert to 0-100 scale
        tags: JSON.stringify(data.tags || []),
        access_count: 1,
        last_accessed_at: new Date(),
      };

      await db.insert(learnedDefinitions).values(definitionData);
      console.log(`✅ Stored new definition: ${data.term}`);

    } catch (error) {
      console.error(`❌ Failed to store learned definition: ${error}`);
    }
  }

  /**
   * 📄 STATIC CONTENT SCRAPING (HTML parsing) WITH PROPER ERROR HANDLING
   */
  private async scrapeStatic(url: string, options: ScrapingOptions): Promise<any> {
    const timeout = options.timeout || 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': options.userAgent || 'Mozilla/5.0 (compatible; BibleCompanion-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const html = await response.text();
      
      // Enhanced HTML parsing
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : 'Untitled';
      
      // Try to extract author from meta tags
      const authorMatch = html.match(/<meta[^>]*name=["\']author["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i) ||
                         html.match(/<meta[^>]*property=["\']article:author["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
      const author = authorMatch ? this.decodeHtmlEntities(authorMatch[1]) : undefined;

      // Try to extract publish date
      const dateMatch = html.match(/<meta[^>]*property=["\']article:published_time["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i) ||
                       html.match(/<time[^>]*datetime=["\']([^"']+)["\'][^>]*>/i);
      const publishDate = dateMatch ? new Date(dateMatch[1]) : undefined;

      // Enhanced content extraction with better selectors
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        options.selectors?.content,
        'main',
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '#content',
        '.article-body',
        '.post-body'
      ].filter(Boolean);

      for (const selector of contentSelectors) {
        if (selector) {
          const regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, 'gi');
          const match = html.match(regex);
          if (match && match[0]) {
            content = match[0];
            break;
          }
        }
      }

      // Fallback to body if no content area found
      if (!content) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        content = bodyMatch ? bodyMatch[1] : html;
      }

      // Remove unwanted elements and clean up
      const cleanHtml = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanHtml.length < 100) {
        throw new Error('Content too short, possibly blocked or failed to parse');
      }

      return {
        title,
        author,
        publishDate,
        content: cleanHtml
      };

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * 🔤 DECODE HTML ENTITIES
   */
  private decodeHtmlEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&mdash;': '—',
      '&ndash;': '–',
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': "'",
      '&rsquo;': "'"
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  /**
   * 🎯 INTELLIGENT SEARCH AND SCRAPE
   */
  async searchAndScrape(
    query: string,
    options: { maxResults?: number; searchEngine?: 'duckduckgo' } = {}
  ): Promise<ScrapedContent[]> {
    console.log(`🔍 Searching and scraping for: "${query}"`);

    // Get search results from DuckDuckGo
    const searchResults = await this.searchDuckDuckGo(query);
    
    // Filter to most relevant URLs
    const relevantUrls = searchResults
      .filter(result => this.isRelevantForScraping(result, query))
      .slice(0, options.maxResults || 3)
      .map(result => result.url);

    // Scrape the relevant pages
    return this.scrapeAndLearn(relevantUrls, query, {
      respectRobots: true,
      timeout: 60000,
      maxPages: options.maxResults || 3
    });
  }

  private async searchDuckDuckGo(query: string): Promise<any[]> {
    try {
      console.log(`🔍 Searching for: "${query}"`);
      
      // First try DuckDuckGo Instant Answer API
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
      const data = await response.json();
      
      const results = [];
      
      // Extract URLs from various DuckDuckGo result types
      if (data.AbstractURL) {
        results.push({ url: data.AbstractURL, title: data.AbstractSource, snippet: data.Abstract });
        console.log(`📄 Found Abstract: ${data.AbstractURL}`);
      }
      if (data.DefinitionURL) {
        results.push({ url: data.DefinitionURL, title: data.DefinitionSource, snippet: data.Definition });
        console.log(`📚 Found Definition: ${data.DefinitionURL}`);
      }
      
      data.RelatedTopics?.forEach((topic: any) => {
        if (topic.FirstURL) {
          results.push({ url: topic.FirstURL, title: topic.Text?.split(' - ')[0], snippet: topic.Text });
          console.log(`🔗 Found Related: ${topic.FirstURL}`);
        }
      });

      // If no results from DuckDuckGo, use educational fallback URLs
      if (results.length === 0) {
        console.log(`⚠️ No DuckDuckGo results, using educational fallback URLs`);
        const fallbackResults = this.getFallbackEducationalUrls(query);
        results.push(...fallbackResults);
      }

      console.log(`✅ Total search results: ${results.length}`);
      return results;
    } catch (error) {
      console.error(`❌ Search failed, using fallback URLs: ${error instanceof Error ? error.message : error}`);
      return this.getFallbackEducationalUrls(query);
    }
  }

  /**
   * 📚 FALLBACK EDUCATIONAL URLS FOR COMMON QUERIES
   */
  private getFallbackEducationalUrls(query: string): any[] {
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    // Physics-related queries
    if (lowerQuery.includes('quantum') || lowerQuery.includes('physics')) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Quantum_mechanics',
        title: 'Quantum Mechanics - Wikipedia',
        snippet: 'Quantum mechanics is a fundamental theory in physics that describes the behavior of matter and energy at the atomic scale.'
      });
    }
    
    // Biology-related queries
    if (lowerQuery.includes('photosynthesis') || lowerQuery.includes('biology')) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Photosynthesis',
        title: 'Photosynthesis - Wikipedia',
        snippet: 'Photosynthesis is the process by which plants convert light energy into chemical energy.'
      });
    }
    
    // Machine Learning queries
    if (lowerQuery.includes('machine learning') || lowerQuery.includes('artificial intelligence')) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Machine_learning',
        title: 'Machine Learning - Wikipedia',
        snippet: 'Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.'
      });
    }
    
    // Chemistry queries
    if (lowerQuery.includes('chemistry') || lowerQuery.includes('chemical')) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Chemistry',
        title: 'Chemistry - Wikipedia',
        snippet: 'Chemistry is the scientific study of matter, its properties, and reactions.'
      });
    }
    
    // Mathematics queries
    if (lowerQuery.includes('math') || lowerQuery.includes('calculus') || lowerQuery.includes('algebra')) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Mathematics',
        title: 'Mathematics - Wikipedia',
        snippet: 'Mathematics is the study of numbers, shapes, patterns, and logical reasoning.'
      });
    }
    
    // Mythology and historical queries
    if (lowerQuery.includes('tiamat') || lowerQuery.includes('mythology') || lowerQuery.includes('ancient')) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Tiamat',
        title: 'Tiamat - Wikipedia',
        snippet: 'Tiamat is a primordial goddess of the salt sea, mating with Abzû, the god of groundwater, to produce younger gods in Mesopotamian mythology.'
      });
    }
    
    // General definition queries - use multiple educational sources
    if (lowerQuery.includes('definition') || lowerQuery.includes('what is') || lowerQuery.includes('explain') || lowerQuery.includes('who is')) {
      // Better extraction of the actual term being asked about
      let searchTerm = lowerQuery
        .replace(/what\s*is\s*the\s*definition\s*of\s*/g, '')
        .replace(/whats\s*is\s*the\s*definition\s*of\s*/g, '')
        .replace(/what\s*is\s*/g, '')
        .replace(/whats\s*is\s*/g, '')
        .replace(/definition\s*of\s*/g, '')
        .replace(/explain\s*/g, '')
        .replace(/who\s*is\s*/g, '')
        .replace(/meaning\s*of\s*/g, '')
        .replace(/\s*definition\s*/g, '')
        .replace(/\s*meaning\s*/g, '')
        .replace(/\?+/g, '')
        .trim();
      
      if (searchTerm && searchTerm.length > 1) {
        // For quantum superposition specifically, use the correct Wikipedia URL
        if (searchTerm.includes('superposition') && searchTerm.includes('quantum')) {
          results.push({
            url: 'https://en.wikipedia.org/wiki/Quantum_superposition',
            title: 'Quantum superposition - Wikipedia',
            snippet: 'Quantum superposition is a fundamental principle of quantum mechanics that holds that a physical system exists partly in all its particular, theoretically possible states.'
          });
        } else if (searchTerm.includes('beginner')) {
          // Handle beginner/beginners specifically
          results.push({
            url: 'https://en.wikipedia.org/wiki/Beginner',
            title: 'Beginner - Wikipedia',
            snippet: 'A beginner is someone new to a particular activity, skill, or field of study.'
          });
        } else {
          // Clean up the search term for Wikipedia URL
          const cleanTerm = searchTerm
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .toLowerCase();
          
          if (cleanTerm.length > 1) {
            results.push({
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTerm)}`,
              title: `${searchTerm} - Wikipedia`,
              snippet: `Educational content about ${searchTerm}`
            });
          }
        }
      }
    }
    
    // If still no results, add a general educational URL
    if (results.length === 0) {
      results.push({
        url: 'https://en.wikipedia.org/wiki/Education',
        title: 'Education - Wikipedia',
        snippet: 'General educational content and learning resources.'
      });
    }
    
    console.log(`📚 Generated ${results.length} fallback educational URLs`);
    return results;
  }

  private isRelevantForScraping(result: any, query: string): boolean {
    const relevanceScore = this.calculateRelevanceScore(result, query);
    // Lower threshold for fallback URLs to ensure they get processed
    return relevanceScore > 0.3;
  }

  private calculateRelevanceScore(result: any, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const title = result.title?.toLowerCase() || '';
    const snippet = result.snippet?.toLowerCase() || '';
    const url = result.url?.toLowerCase() || '';
    
    let score = 0;
    
    // Check for word matches in title (higher weight)
    queryWords.forEach(word => {
      if (word.length > 2) { // Skip short words like "is", "a", etc.
        if (title.includes(word)) score += 0.4;
        if (snippet.includes(word)) score += 0.3;
        if (url.includes(word)) score += 0.2;
      }
    });
    
    // Boost score for educational domains
    if (url.includes('wikipedia.org') || url.includes('.edu')) {
      score += 0.2;
    }
    
    // Ensure minimum score for fallback URLs
    if (score === 0 && (title.includes('Wikipedia') || snippet.includes('Educational content'))) {
      score = 0.5;
    }
    
    return Math.min(score, 1.0);
  }

  private parseJsonWithFallback(response: string): any {
    try {
      // First try direct JSON parsing
      return JSON.parse(response);
    } catch {
      try {
        // Try to extract JSON from markdown code blocks
        const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          return JSON.parse(codeBlockMatch[1]);
        }
        
        // Try to extract JSON from any braces
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        // Try to clean up the response and parse
        const cleaned = response
          .replace(/^[^{]*/, '') // Remove everything before first {
          .replace(/[^}]*$/, '') // Remove everything after last }
          .trim();
        
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          return JSON.parse(cleaned);
        }
      } catch (e) {
        console.warn(`Failed to parse JSON: ${e instanceof Error ? e.message : e}`);
      }
      
      console.warn(`Using default analysis due to unparseable response: ${response.substring(0, 200)}...`);
      return this.getDefaultAnalysis();
    }
  }

  private getDefaultAnalysis(): any {
    return {
      contentType: 'other',
      summary: 'Content analyzed',
      complexity: 'intermediate',
      domain: 'General',
      language: 'en',
      confidence: 0.5,
      learningValue: 0.5,
      tags: [],
      relevanceToQuery: 0.5
    };
  }

  /**
   * 💾 IMPROVED CACHING IMPLEMENTATION
   */
  private async getCachedScraping(key: string): Promise<ScrapedContent | null> {
    try {
      // Check memory cache first
      const memoryCache = this.scrapeCache.get(key);
      if (memoryCache) {
        const isExpired = Date.now() - memoryCache.timestamp > this.cacheExpiryMs;
        if (!isExpired) {
          console.log(`⚡ Memory cache hit for ${key}`);
          return memoryCache.data;
        } else {
          this.scrapeCache.delete(key);
          console.log(`🗑️ Expired cache entry removed for ${key}`);
        }
      }

      // For now, we'll just use memory cache since the QueryResultCacheService 
      // interface doesn't directly support generic key-value caching
      // TODO: Implement persistent cache using a different method

      return null;
    } catch (error) {
      console.error(`❌ Cache retrieval failed for ${key}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  private async cacheScraping(key: string, content: ScrapedContent): Promise<void> {
    try {
      // Store in memory cache
      this.scrapeCache.set(key, {
        data: content,
        timestamp: Date.now()
      });

      // For now, we'll just use memory cache
      // TODO: Implement persistent cache storage

      console.log(`💾 Cached scraping result for ${key}`);
    } catch (error) {
      console.error(`❌ Failed to cache scraping result for ${key}: ${error}`);
    }
  }

  /**
   * 🧹 CLEANUP EXPIRED CACHE ENTRIES
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.scrapeCache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.cacheExpiryMs) {
        this.scrapeCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Web Scraping Service');
    this.cleanupExpiredCache();
    this.scrapeCache.clear();
  }
} 