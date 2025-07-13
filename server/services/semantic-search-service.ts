import { MultiModelService } from './multi-model-service.js';
import { LocalMemoryService } from './LocalMemoryService.js';
import { CachedEmbeddingService } from './cached-embedding-service.js';
import { db } from '../db.js';
import * as schema from '@shared/schema';
import { eq, desc, like, and, or, inArray } from 'drizzle-orm';

export interface SearchResult {
  id: string;
  content: string;
  relevanceScore: number;
  semanticSimilarity: number;
  contextualRelevance: number;
  source: {
    type: 'document' | 'annotation' | 'memory' | 'knowledge';
    id: number;
    title?: string;
    chapter?: number;
  };
  highlightedSnippets: string[];
  relatedConcepts: string[];
  suggestedQuestions: string[];
  metadata?: {
    section?: 'current' | 'other';
    boosted?: boolean;
    [key: string]: any;
  };
}

export interface SearchContext {
  userId: number;
  currentDocument?: number;
  currentChapter?: number;
  recentQueries: string[];
  userExpertiseLevel: number;
  preferredTopics: string[];
}

export interface SemanticQuery {
  query: string;
  intent: 'search' | 'question' | 'exploration' | 'comparison';
  semanticContext: string[];
  filters?: {
    contentTypes?: string[];
    timeRange?: { start: Date; end: Date };
    relevanceThreshold?: number;
  };
}

export class SemanticSearchService {
  private multiModel: MultiModelService;
  private memory: LocalMemoryService;
  private embeddingService: CachedEmbeddingService;
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private conceptIndex: Map<string, string[]> = new Map(); // concept -> document IDs
  private queryEmbeddings: Map<string, Float32Array> = new Map();

  private readonly CACHE_TTL = 1000 * 60 * 15; // 15 minutes
  private readonly MAX_RESULTS = 20; // Reduced from 50
  private readonly RELEVANCE_THRESHOLD = 0.5; // Reduced from 0.7 for better RAG results

  constructor() {
    this.multiModel = new MultiModelService();
    this.memory = LocalMemoryService.getInstance();
    this.embeddingService = new CachedEmbeddingService();
  }

  async initialize(): Promise<void> {
    await this.multiModel.initialize();
    await this.buildConceptIndex();
    console.log('🔍 Semantic Search Service initialized - Ready for intelligent knowledge retrieval!');
  }

  // 🧠 BUILD CONCEPT INDEX FOR FASTER SEMANTIC SEARCH
  private async buildConceptIndex(): Promise<void> {
    try {
      console.log('📚 Building concept index for semantic search...');
      
      // Get all documents for indexing
      const documents = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content
      }).from(schema.documents);

      for (const doc of documents) {
        // Extract key concepts from each document
        const concepts = await this.extractKeyConcepts(doc.content, doc.title);
        
        concepts.forEach(concept => {
          if (!this.conceptIndex.has(concept)) {
            this.conceptIndex.set(concept, []);
          }
          this.conceptIndex.get(concept)!.push(doc.id.toString());
        });
      }

      console.log(`✅ Concept index built with ${this.conceptIndex.size} concepts`);
      
    } catch (error) {
      console.error(`❌ Failed to build concept index: ${error}`);
    }
  }

  // 🎯 EXTRACT KEY CONCEPTS FROM TEXT
  private async extractKeyConcepts(content: string, title?: string): Promise<string[]> {
    const conceptPrompt = `Extract key concepts and themes from this text. Focus on:
- Main topics and themes
- Important terminology and concepts
- Key ideas and principles
- Significant names, places, or entities
- Core subject matter

Text: ${title ? `Title: ${title}\n\n` : ''}${content.substring(0, 3000)}

CRITICAL INSTRUCTION: Respond with ONLY a valid JSON array of strings. Do not include any explanations, introductions, or markdown. Return exactly this format:
["concept1", "concept2", "concept3", "concept4", "concept5"]

Example for a technology text: ["artificial intelligence", "machine learning", "neural networks", "data processing", "automation"]`;

    try {
      const result = await this.multiModel.executeTask('text-analysis', conceptPrompt, {
        requirements: { accuracy: 9, speed: 8, reasoning: 7 }
      });

      // Enhanced JSON parsing with fallback
      const concepts = this.parseJsonWithFallback(result.response);
      return Array.isArray(concepts) ? concepts : this.extractConceptsFallback(content, title);
      
    } catch (error) {
      console.error(`❌ Failed to extract concepts: ${error}`);
      return this.extractConceptsFallback(content, title);
    }
  }

  // 🔧 ROBUST JSON PARSING WITH FALLBACK
  private parseJsonWithFallback(response: string): any {
    try {
      // Try parsing the full response first
      return JSON.parse(response.trim());
    } catch (error) {
      try {
        // Some models often wrap JSON in markdown or add explanations
        const extractionPatterns = [
          /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/i, // JSON in code blocks
          /```\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/i,     // JSON in generic code blocks
          /(\{[\s\S]*?\}|\[[\s\S]*?\])/,                   // Any JSON-like structure
        ];
        
        for (const pattern of extractionPatterns) {
          const match = response.match(pattern);
          if (match) {
            let jsonStr = match[1] || match[0];
            
            try {
              // Clean up common JSON issues from AI responses
              jsonStr = jsonStr
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
                .replace(/[\u0000-\u001f]+/g, '') // Remove control characters
                .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Fix invalid escape sequences
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
              
              return JSON.parse(jsonStr);
            } catch (cleanupError) {
              continue;
            }
          }
        }
        
        // Try extracting concepts array specifically for this service
        const conceptMatch = response.match(/(?:concepts?|terms?):\s*\[(.*?)\]/i);
        if (conceptMatch) {
          return JSON.parse(`[${conceptMatch[1]}]`);
        }
        
        // Last resort: extract quoted words
        const quotedWords = response.match(/"([^"]+)"/g);
        if (quotedWords) {
          return quotedWords.map(word => word.replace(/"/g, ''));
        }
        
        throw new Error('No JSON structure found');
      } catch (fallbackError) {
        console.warn(`⚠️ JSON parsing fallback failed: ${fallbackError}`);
        return null;
      }
    }
  }

  // 🔄 SIMPLE FALLBACK CONCEPT EXTRACTION
  private extractConceptsFallback(content: string, title?: string): string[] {
    const fallbackConcepts: string[] = [];
    
    // Extract title-based concepts
    if (title) {
      const titleWords = title.split(' ').filter(word => 
        word.length > 3 && !['the', 'and', 'for', 'with'].includes(word.toLowerCase())
      );
      fallbackConcepts.push(...titleWords.slice(0, 2));
    }
    
    // Extract common universal concepts from content
    const universalTerms = [
      'knowledge', 'learning', 'understanding', 'analysis', 'concept', 'theory', 'principle', 'method',
      'system', 'process', 'development', 'innovation', 'research', 'discovery',
      'technology', 'science', 'education', 'growth', 'progress', 'solution',
      'strategy', 'framework', 'approach', 'technique', 'implementation'
    ];
    
    const contentLower = content.toLowerCase();
    const foundTerms = universalTerms.filter(term => contentLower.includes(term));
    fallbackConcepts.push(...foundTerms.slice(0, 5));
    
    return Array.from(new Set(fallbackConcepts)).slice(0, 8);
  }

  // 🔍 ENHANCED SEMANTIC SEARCH with Embedding Model
  async search(query: string, context: SearchContext, options: {
    maxResults?: number;
    includeMemories?: boolean;
    includeAnnotations?: boolean;
    semanticExpansion?: boolean;
    useEmbeddings?: boolean;
    singleDocumentOnly?: boolean;
  } = {}): Promise<SearchResult[]> {
    
    const searchKey = `${query}_${context.userId}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.searchCache.get(searchKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`⚡ Cache hit for semantic search: ${query.substring(0, 30)}...`);
      return cached.results;
    }

    console.log(`🔍 Performing semantic search: "${query}"`);
    const startTime = performance.now();

    try {
      // Check if we should use embeddings (default to true)
      if (options.useEmbeddings !== false) {
        try {
          console.log(`🔗 Using embedding-based search`);
          const results = await this.searchWithEmbeddings(query, context, options);
          
          // Cache results with the same key as traditional search for consistency
          this.searchCache.set(searchKey, {
            results,
            timestamp: Date.now()
          });
          
          return results;
        } catch (embeddingError) {
          console.warn(`⚠️ Embedding search failed, falling back to traditional search: ${embeddingError}`);
          // Fall through to traditional search
        }
      }

      // Traditional search approach
      console.log(`📚 Using traditional semantic search`);
      
      // Step 1: Analyze query intent and expand semantically
      const semanticQuery = await this.analyzeQueryIntent(query, context);
      
      // Step 2: Multi-source search
      const searchPromises: Promise<SearchResult[]>[] = [];
      
      // If singleDocumentOnly is true, only search the current document
      if (options.singleDocumentOnly && context.currentDocument) {
        searchPromises.push(this.searchSpecificDocument(semanticQuery, context, context.currentDocument, options.useEmbeddings || false));
      } else {
        // Search all documents
        searchPromises.push(this.searchDocuments(semanticQuery, context));
      }

      if (options.includeMemories !== false && !options.singleDocumentOnly) {
        searchPromises.push(this.searchMemories(semanticQuery, context));
      }

      if (options.includeAnnotations !== false && !options.singleDocumentOnly) {
        searchPromises.push(this.searchAnnotations(semanticQuery, context));
      }

      // Step 3: Execute searches in parallel
      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Step 4: Rank and filter results
      const rankedResults = await this.rankResults(allResults, semanticQuery, context);
      
      // Step 5: Enhance results with related concepts and suggestions
      const enhancedResults = await this.enhanceResults(
        rankedResults.slice(0, options.maxResults || this.MAX_RESULTS),
        semanticQuery,
        context
      );

      const executionTime = performance.now() - startTime;
      console.log(`🎯 Semantic search completed in ${executionTime.toFixed(2)}ms - ${enhancedResults.length} results`);

      // Cache results
      this.searchCache.set(searchKey, {
        results: enhancedResults,
        timestamp: Date.now()
      });

      return enhancedResults;

    } catch (error) {
      console.error(`❌ Semantic search failed: ${error}`);
      return [];
    }
  }

  // 🔗 HYBRID EMBEDDING-BASED SEARCH with Context Prioritization
  private async searchWithEmbeddings(
    query: string, 
    context: SearchContext, 
    options: any
  ): Promise<SearchResult[]> {
    const startTime = performance.now();
    
    try {
      console.log(`🔗 Performing hybrid embedding-based search for: "${query}"`);
      console.log(`📍 Context - Current document: ${context.currentDocument || 'None'}, User: ${context.userId}`);
      
      // Generate embedding for the query using cached service
      console.log(`🚀 Generating cached embedding for query: "${query.substring(0, 50)}..."`);
      const queryEmbeddingResult = await this.embeddingService.getEmbedding(query);
      const queryEmbedding = queryEmbeddingResult.embedding;
      
      console.log(`⚡ Query embedding: ${queryEmbeddingResult.cacheHit ? 'CACHE HIT' : 'CACHE MISS'} (${queryEmbeddingResult.responseTime}ms)`);
      
      // Get all documents for embedding comparison - FILTER BY TYPE
      const documents = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content,
        userId: schema.documents.userId
      }).from(schema.documents)
      .where(eq(schema.documents.userId, context.userId || 2))
      .limit(20); // Further reduced for performance
      
      // Filter out irrelevant documents based on title/content
      const relevantDocs = documents.filter(doc => {
        const title = (doc.title || '').toLowerCase();
        const isFinancial = title.includes('cbdc') || title.includes('bank') || 
                          title.includes('finance') || title.includes('crypto') ||
                          title.includes('monetary') || title.includes('currency');
        const isBiblical = title.includes('bible') || title.includes('book') || 
                         title.includes('chapter') || title.includes('enoch') ||
                         title.includes('scripture') || title.includes('testament') ||
                         title.includes('creation') || title.includes('tablets');
        
        // Allow both biblical and financial content, only exclude clearly irrelevant
        // Prefer biblical content for biblical queries, but don't completely exclude others
        return true; // Accept all documents for now to improve recall
      });
      
      console.log(`📚 Document filtering: ${documents.length} total → ${relevantDocs.length} relevant (excluded ${documents.length - relevantDocs.length} irrelevant docs)`);
      
      // Separate documents by priority
      const currentDoc = context.currentDocument ? 
        relevantDocs.find(doc => doc.id === context.currentDocument) : null;
      const filteredOtherDocs = relevantDocs.filter(doc => doc.id !== context.currentDocument);
      
      console.log(`📚 Document distribution: Current=${currentDoc ? 1 : 0}, Others=${filteredOtherDocs.length}`);
      
      // Priority 1: Search current document first (if specified)
      const currentDocResults: SearchResult[] = [];
      if (currentDoc) {
        console.log(`🎯 Priority 1: Searching current document "${currentDoc.title}"`);
        const results = await this.processDocumentForEmbedding(
          currentDoc, 
          queryEmbedding, 
          query, 
          'current'
        );
        currentDocResults.push(...results);
      }
      
      // Priority 2: Search all other documents
      console.log(`🌐 Priority 2: Searching ${filteredOtherDocs.length} other documents`);
      const otherDocResults: SearchResult[] = [];
      
      // Process documents in chunks for better performance
      const chunkSize = 3; // Reduced from 5
      for (let i = 0; i < filteredOtherDocs.length; i += chunkSize) {
        const chunk = filteredOtherDocs.slice(i, i + chunkSize);
        
                  const chunkResults = await Promise.all(
            chunk.map((doc: any) => this.processDocumentForEmbedding(doc, queryEmbedding, query, 'other'))
          );
        
        otherDocResults.push(...chunkResults.flat());
        
        // Break early if we have enough good results
        if (otherDocResults.length >= 10) break;
      }
      
      // Combine results with priority-based scoring
      const allResults = [
        ...this.boostContextualRelevance(currentDocResults, 1.2), // 20% boost for current doc
        ...otherDocResults
      ];
      
      // Sort by enhanced relevance score and return top results
      const maxResults = options.maxResults || this.MAX_RESULTS;
      const sortedResults = allResults
        .sort((a, b) => b.contextualRelevance - a.contextualRelevance)
        .slice(0, maxResults);
      
      const executionTime = performance.now() - startTime;
      console.log(`🔗 Hybrid embedding search completed in ${executionTime.toFixed(2)}ms`);
      console.log(`📊 Results: ${currentDocResults.length} current, ${otherDocResults.length} others, ${sortedResults.length} final`);
      
      return sortedResults;
      
    } catch (error) {
      console.error(`❌ Hybrid embedding search failed: ${error}`);
      throw error;
    }
  }

  // Helper method to process a single document for embedding search
  private async processDocumentForEmbedding(
    doc: any,
    queryEmbedding: number[],
    query: string,
    section: 'current' | 'other'
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    try {
      // Create excerpts from document content for embedding
      const excerpts = this.createDocumentExcerpts(doc.content, 500);
      console.log(`📄 Processing document ${doc.id} (${doc.title}) - ${excerpts.length} excerpts, section: ${section}`);

      // Batch embed all excerpts
      const batchResults = await this.embeddingService.getEmbeddingsBatch(
        excerpts,
        Array(excerpts.length).fill(doc.id),
        Array(excerpts.length).fill(0), // Approximate chapter
        Array(excerpts.length).fill(0)  // Approximate paragraph
      );

      for (let i = 0; i < excerpts.length; i++) {
        const excerpt = excerpts[i];
        const excerptEmbedding = batchResults[i].embedding;
        const similarity = this.multiModel.calculateCosineSimilarity(queryEmbedding, excerptEmbedding);
        // Adjust threshold based on section - balanced for good recall
        const threshold = section === 'current' ? 0.3 : 0.4; // Lowered for better RAG results
        if (similarity >= threshold) {
          console.log(`🎯 Found match in doc ${doc.id} (${section}): similarity=${similarity.toFixed(3)}, excerpt="${excerpt.substring(0, 80)}..."`);
          results.push({
            id: `doc_${doc.id}_${section}_${results.length}`,
            content: excerpt,
            relevanceScore: similarity,
            semanticSimilarity: similarity,
            contextualRelevance: similarity, // Will be boosted later if current doc
            source: {
              type: 'document',
              id: doc.id,
              title: doc.title
            },
            highlightedSnippets: [this.extractRelevantSnippet(excerpt, query, 150)],
            relatedConcepts: [],
            suggestedQuestions: [],
            metadata: {
              section,
              cacheHit: batchResults[i].cacheHit
            }
          });
        }
      }
    } catch (docError) {
      console.warn(`⚠️ Failed to process document ${doc.id}: ${docError}`);
    }
    return results;
  }

  // Helper method to boost contextual relevance for current document results
  private boostContextualRelevance(results: SearchResult[], boostFactor: number): SearchResult[] {
    return results.map(result => ({
      ...result,
      contextualRelevance: result.contextualRelevance * boostFactor,
      metadata: { ...result.metadata, boosted: true }
    }));
  }

  // Helper method to create document excerpts
  private createDocumentExcerpts(content: string, maxLength: number = 500): string[] {
    if (typeof content !== 'string') {
      content = JSON.stringify(content);
    }
    
    const excerpts: string[] = [];
    
    try {
      // Try to parse as JSON first (for structured documents)
      const parsed = JSON.parse(content);
      
      if (parsed.chapters && Array.isArray(parsed.chapters)) {
        // Handle structured document format
        for (const chapter of parsed.chapters) {
          if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
            for (const paragraph of chapter.paragraphs) {
              if (paragraph.text && typeof paragraph.text === 'string') {
                const text = paragraph.text.trim();
                if (text.length > 50) { // Only process substantial paragraphs
                  // Split long paragraphs into excerpts
                  if (text.length <= maxLength) {
                    excerpts.push(text);
                  } else {
                    // Split by sentences and create excerpts
                    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
                    let currentExcerpt = '';
                    
                    for (const sentence of sentences) {
                      const sentenceWithPeriod = sentence.trim() + '. ';
                      if ((currentExcerpt + sentenceWithPeriod).length <= maxLength) {
                        currentExcerpt += sentenceWithPeriod;
                      } else {
                        if (currentExcerpt.trim()) {
                          excerpts.push(currentExcerpt.trim());
                        }
                        currentExcerpt = sentenceWithPeriod;
                      }
                    }
                    
                    if (currentExcerpt.trim()) {
                      excerpts.push(currentExcerpt.trim());
                    }
                  }
                }
              }
            }
          }
        }
      } else if (parsed.content && typeof parsed.content === 'string') {
        // Handle documents with direct content field
        return this.createExcerptsFromText(parsed.content, maxLength);
      } else if (typeof parsed === 'string') {
        // Handle string content wrapped in JSON
        return this.createExcerptsFromText(parsed, maxLength);
      }
      
    } catch (parseError) {
      // If JSON parsing fails, treat as plain text
      return this.createExcerptsFromText(content, maxLength);
    }
    
    // If no excerpts were created from structured content, fall back to text processing
    if (excerpts.length === 0) {
      return this.createExcerptsFromText(content, maxLength);
    }
    
    return excerpts;
  }

  // Helper method to create excerpts from plain text
  private createExcerptsFromText(content: string, maxLength: number = 500): string[] {
    const excerpts: string[] = [];
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
    
    let currentExcerpt = '';
    for (const sentence of sentences) {
      const sentenceWithPeriod = sentence.trim() + '. ';
      if ((currentExcerpt + sentenceWithPeriod).length <= maxLength) {
        currentExcerpt += sentenceWithPeriod;
      } else {
        if (currentExcerpt.trim()) {
          excerpts.push(currentExcerpt.trim());
        }
        currentExcerpt = sentenceWithPeriod;
      }
    }
    
    // Add the last excerpt if it exists
    if (currentExcerpt.trim()) {
      excerpts.push(currentExcerpt.trim());
    }
    
    // If no excerpts were created, create one from the beginning
    if (excerpts.length === 0 && content.length > 0) {
      excerpts.push(content.substring(0, maxLength));
    }
    
    return excerpts;
  }

  // 🧠 ANALYZE QUERY INTENT AND EXPAND SEMANTICALLY
  private async analyzeQueryIntent(query: string, context: SearchContext): Promise<SemanticQuery> {
    const intentPrompt = `Analyze this search query and provide semantic expansion:

Query: "${query}"
User context: Currently reading ${context.currentDocument ? `document ${context.currentDocument}` : 'various texts'}
User expertise: Level ${context.userExpertiseLevel}/10
Recent queries: ${context.recentQueries.join(', ')}

Provide JSON response:
{
  "intent": "search|question|exploration|comparison",
  "semantic_context": ["related_concept1", "related_concept2", "related_concept3"],
  "expanded_terms": ["synonym1", "synonym2", "related_term1"],
  "suggested_filters": ["filter1", "filter2"]
}`;

    try {
      const result = await this.multiModel.executeTask('text-analysis', intentPrompt, {
        requirements: { reasoning: 8, accuracy: 8 }
      });

      const analysis = this.parseJsonWithFallback(result.response);
      
      return {
        query,
        intent: analysis?.intent || 'search',
        semanticContext: [
          ...(analysis?.semantic_context || []),
          ...(analysis?.expanded_terms || []),
          ...context.preferredTopics
        ]
      };

    } catch (error) {
      console.error(`❌ Failed to analyze query intent: ${error}`);
      return {
        query,
        intent: 'search',
        semanticContext: context.preferredTopics
      };
    }
  }

  // 📚 SEARCH DOCUMENTS WITH SEMANTIC UNDERSTANDING
  private async searchDocuments(semanticQuery: SemanticQuery, context: SearchContext): Promise<SearchResult[]> {
    const documentIds = this.getConceptRelatedDocs(semanticQuery.semanticContext);

    if (documentIds.length === 0) {
      return [];
    }
    
    try {
      // Get documents with basic text matching
      const documents = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content,
        userId: schema.documents.userId
      }).from(schema.documents)
      .where(
        and(
          or(
            like(schema.documents.content, `%${semanticQuery.query}%`),
            like(schema.documents.title, `%${semanticQuery.query}%`)
          ),
          inArray(schema.documents.id, documentIds)
        )
      )
      .limit(20);

      const results: SearchResult[] = [];

      for (const doc of documents) {
        // Calculate semantic relevance
        const relevance = await this.calculateSemanticRelevance(
          doc.content,
          semanticQuery.query,
          semanticQuery.semanticContext
        );

        if (relevance.score >= this.RELEVANCE_THRESHOLD) {
          results.push({
            id: `doc_${doc.id}`,
            content: this.extractRelevantSnippet(doc.content, semanticQuery.query),
            relevanceScore: relevance.score,
            semanticSimilarity: relevance.semanticSimilarity,
            contextualRelevance: relevance.contextualRelevance,
            source: {
              type: 'document',
              id: doc.id,
              title: doc.title
            },
            highlightedSnippets: relevance.snippets,
            relatedConcepts: [],
            suggestedQuestions: []
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Failed to search documents: ${error}`);
      return [];
    }
  }

  // 📚 SEARCH SPECIFIC DOCUMENT
  private async searchSpecificDocument(
    semanticQuery: SemanticQuery, 
    context: SearchContext, 
    documentId: number, 
    useEmbeddings: boolean
  ): Promise<SearchResult[]> {
    try {
      console.log(`📚 Searching specific document ${documentId} for: "${semanticQuery.query}"`);
      
      const document = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content,
        userId: schema.documents.userId
      }).from(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .limit(1);
      
      if (document.length === 0) {
        return [];
      }
      
      const doc = document[0];
      const relevance = await this.calculateSemanticRelevance(
        doc.content,
        semanticQuery.query,
        semanticQuery.semanticContext
      );
      
      if (relevance.score >= this.RELEVANCE_THRESHOLD) {
        return [{
          id: `doc_${doc.id}`,
          content: this.extractRelevantSnippet(doc.content, semanticQuery.query),
          relevanceScore: relevance.score,
          semanticSimilarity: relevance.semanticSimilarity,
          contextualRelevance: relevance.contextualRelevance,
          source: {
            type: 'document',
            id: doc.id,
            title: doc.title
          },
          highlightedSnippets: relevance.snippets,
          relatedConcepts: [],
          suggestedQuestions: []
        }];
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Specific document search failed: ${error}`);
      return [];
    }
  }

  // 🧠 SEARCH MEMORIES WITH CONTEXT AWARENESS
  private async searchMemories(semanticQuery: SemanticQuery, context: SearchContext): Promise<SearchResult[]> {
    try {
      const memories = await this.memory.searchMemories(context.userId, semanticQuery.query, 20);
      const results: SearchResult[] = [];

      for (const memory of memories) {
        const relevance = await this.calculateSemanticRelevance(
          memory.content,
          semanticQuery.query,
          semanticQuery.semanticContext
        );

        if (relevance.score >= this.RELEVANCE_THRESHOLD) {
          results.push({
            id: `memory_${memory.id}`,
            content: memory.content,
            relevanceScore: relevance.score,
            semanticSimilarity: relevance.semanticSimilarity,
            contextualRelevance: relevance.contextualRelevance,
            source: {
              type: 'memory',
              id: 0, // Memory ID would go here
              title: memory.category
            },
            highlightedSnippets: relevance.snippets,
            relatedConcepts: [],
            suggestedQuestions: []
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Failed to search memories: ${error}`);
      return [];
    }
  }

  // 📝 SEARCH ANNOTATIONS
  private async searchAnnotations(semanticQuery: SemanticQuery, context: SearchContext): Promise<SearchResult[]> {
    const documentIds = this.getConceptRelatedDocs(semanticQuery.semanticContext);
    
    if (documentIds.length === 0) {
      return [];
    }

    try {
      const annotations = await db.select({
        id: schema.annotations.id,
        note: schema.annotations.note,
        documentId: schema.annotations.documentId,
        chapter: schema.annotations.chapter
      }).from(schema.annotations)
      .where(
        and(
          eq(schema.annotations.userId, context.userId),
          like(schema.annotations.note, `%${semanticQuery.query}%`),
          inArray(schema.annotations.documentId, documentIds)
        )
      )
      .limit(15);

      const results: SearchResult[] = [];

      for (const annotation of annotations) {
        const relevance = await this.calculateSemanticRelevance(
          annotation.note,
          semanticQuery.query,
          semanticQuery.semanticContext
        );

        if (relevance.score >= this.RELEVANCE_THRESHOLD) {
          results.push({
            id: `annotation_${annotation.id}`,
            content: annotation.note,
            relevanceScore: relevance.score,
            semanticSimilarity: relevance.semanticSimilarity,
            contextualRelevance: relevance.contextualRelevance,
            source: {
              type: 'annotation',
              id: annotation.id,
              title: `Document ${annotation.documentId}`,
              chapter: annotation.chapter
            },
            highlightedSnippets: [annotation.note],
            relatedConcepts: [],
            suggestedQuestions: []
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Failed to search annotations: ${error}`);
      return [];
    }
  }

  private getConceptRelatedDocs(concepts: string[]): number[] {
    if (!concepts || concepts.length === 0) return [];
    const docIds = new Set<string>();
    for (const concept of concepts) {
      const ids = this.conceptIndex.get(concept);
      if (ids) {
        for (const id of ids) {
          docIds.add(id);
        }
      }
    }
    return Array.from(docIds).map(id => parseInt(id, 10));
  }

  // 🎯 CALCULATE SEMANTIC RELEVANCE
  private async calculateSemanticRelevance(
    content: string,
    query: string,
    semanticContext: string[]
  ): Promise<{
    score: number;
    semanticSimilarity: number;
    contextualRelevance: number;
    snippets: string[];
  }> {
    
    const relevancePrompt = `Calculate semantic relevance between query and content:

Query: "${query}"
Semantic context: ${semanticContext.join(', ')}

Content: ${content.substring(0, 2000)}

Analyze and provide JSON response:
{
  "semantic_similarity": 0.0-1.0,
  "contextual_relevance": 0.0-1.0,
  "key_snippets": ["relevant snippet 1", "relevant snippet 2"],
  "reasoning": "brief explanation of relevance"
}`;

    try {
      const result = await this.multiModel.executeTask('semantic-search', relevancePrompt, {
        requirements: { accuracy: 9, reasoning: 8 }
      });

      const analysis = JSON.parse(result.response);
      
      const semanticSimilarity = Math.max(0, Math.min(1, analysis.semantic_similarity || 0));
      const contextualRelevance = Math.max(0, Math.min(1, analysis.contextual_relevance || 0));
      
      // Calculate overall score with weighted components
      const score = (semanticSimilarity * 0.6 + contextualRelevance * 0.4);

      return {
        score,
        semanticSimilarity,
        contextualRelevance,
        snippets: analysis.key_snippets || []
      };

    } catch (error) {
      // Fallback to simple text matching
      const score = this.calculateSimpleRelevance(content, query);
      return {
        score,
        semanticSimilarity: score,
        contextualRelevance: score * 0.8,
        snippets: [this.extractRelevantSnippet(content, query)]
      };
    }
  }

  // 📊 SIMPLE FALLBACK RELEVANCE CALCULATION  
  private calculateSimpleRelevance(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    
    let matches = 0;
    queryWords.forEach(word => {
      if (contentLower.includes(word)) {
        matches++;
      }
    });

    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  // ✂️ EXTRACT RELEVANT SNIPPET
  private extractRelevantSnippet(content: string, query: string, maxLength: number = 200): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    const index = contentLower.indexOf(queryLower);
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + queryLower.length + 150);
      return content.substring(start, end);
    }

    // Fallback to beginning of content
    return content.substring(0, Math.min(maxLength, content.length));
  }

  // 📈 RANK RESULTS USING MULTIPLE FACTORS
  private async rankResults(
    results: SearchResult[],
    semanticQuery: SemanticQuery,
    context: SearchContext
  ): Promise<SearchResult[]> {
    
    return results.sort((a, b) => {
      // Primary sort: relevance score
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Secondary sort: semantic similarity
      if (a.semanticSimilarity !== b.semanticSimilarity) {
        return b.semanticSimilarity - a.semanticSimilarity;
      }

      // Tertiary sort: contextual relevance
      return b.contextualRelevance - a.contextualRelevance;
    }).filter(result => result.relevanceScore >= this.RELEVANCE_THRESHOLD);
  }

  // 🎨 ENHANCE RESULTS WITH RELATED CONCEPTS AND QUESTIONS
  private async enhanceResults(
    results: SearchResult[],
    semanticQuery: SemanticQuery,
    context: SearchContext
  ): Promise<SearchResult[]> {
    
    const enhancedResults: SearchResult[] = [];

    for (const result of results) {
      try {
        // Generate related concepts and suggested questions
        const enhancement = await this.generateEnhancements(result.content, semanticQuery.query, context);
        
        enhancedResults.push({
          ...result,
          relatedConcepts: enhancement.relatedConcepts,
          suggestedQuestions: enhancement.suggestedQuestions
        });

      } catch (error) {
        // If enhancement fails, include original result
        enhancedResults.push(result);
      }
    }

    return enhancedResults;
  }

  // 🎯 GENERATE ENHANCEMENTS FOR SEARCH RESULTS
  private async generateEnhancements(
    content: string,
    originalQuery: string,
    context: SearchContext
  ): Promise<{
    relatedConcepts: string[];
    suggestedQuestions: string[];
  }> {
    
    const enhancementPrompt = `Based on this content and the user's search query, generate helpful enhancements:

Original query: "${originalQuery}"
Content: ${content.substring(0, 1000)}
User expertise level: ${context.userExpertiseLevel}/10

Generate JSON response:
{
  "related_concepts": ["related concept 1", "related concept 2", "related concept 3"],
  "suggested_questions": ["follow-up question 1", "follow-up question 2"]
}`;

    try {
      const result = await this.multiModel.executeTask('creative-insights', enhancementPrompt, {
        requirements: { creativity: 7, reasoning: 7 }
      });

      const enhancement = JSON.parse(result.response);
      
      return {
        relatedConcepts: enhancement.related_concepts || [],
        suggestedQuestions: enhancement.suggested_questions || []
      };

    } catch (error) {
      return {
        relatedConcepts: [],
        suggestedQuestions: []
      };
    }
  }

  // 🔍 CONTEXTUAL SEARCH (Search within current reading context)
  async contextualSearch(
    query: string,
    context: SearchContext,
    radius: number = 3 // chapters around current position
  ): Promise<SearchResult[]> {
    
    if (!context.currentDocument || !context.currentChapter) {
      return this.search(query, context);
    }

    console.log(`🎯 Performing contextual search around document ${context.currentDocument}, chapter ${context.currentChapter}`);

    try {
      // Search within specific chapter range
      const startChapter = Math.max(1, context.currentChapter - radius);
      const endChapter = context.currentChapter + radius;

      const annotations = await db.select({
        id: schema.annotations.id,
        note: schema.annotations.note,
        documentId: schema.annotations.documentId,
        chapter: schema.annotations.chapter
      }).from(schema.annotations)
      .where(
        and(
          eq(schema.annotations.documentId, context.currentDocument),
          // Note: Would need proper range query here
          like(schema.annotations.note, `%${query}%`)
        )
      );

      const results: SearchResult[] = [];

      for (const annotation of annotations) {
        if (annotation.chapter >= startChapter && annotation.chapter <= endChapter) {
          const relevance = await this.calculateSemanticRelevance(
            annotation.note,
            query,
            context.preferredTopics
          );

          if (relevance.score >= this.RELEVANCE_THRESHOLD) {
            results.push({
              id: `contextual_${annotation.id}`,
              content: annotation.note,
              relevanceScore: relevance.score + 0.2, // Boost for contextual relevance
              semanticSimilarity: relevance.semanticSimilarity,
              contextualRelevance: relevance.contextualRelevance + 0.3,
              source: {
                type: 'annotation',
                id: annotation.id,
                title: `Document ${annotation.documentId}`,
                chapter: annotation.chapter
              },
              highlightedSnippets: relevance.snippets,
              relatedConcepts: [],
              suggestedQuestions: []
            });
          }
        }
      }

      return this.rankResults(results, { query, intent: 'search', semanticContext: context.preferredTopics }, context);

    } catch (error) {
      console.error(`❌ Contextual search failed: ${error}`);
      return this.search(query, context);
    }
  }

  // 🎭 CONCEPT-BASED EXPLORATION
  async exploreConcept(
    concept: string,
    context: SearchContext,
    depth: 'surface' | 'medium' | 'deep' = 'medium'
  ): Promise<{
    conceptDefinition: string;
    relatedPassages: SearchResult[];
    crossReferences: SearchResult[];
    theologicalConnections: string[];
    explorationQuestions: string[];
  }> {
    
    console.log(`🎭 Exploring concept: "${concept}" with ${depth} depth`);

    try {
      // Get concept definition and context
      const conceptAnalysis = await this.analyzeConcept(concept, context, depth);
      
      // Find related passages using semantic search
      const relatedPassages = await this.search(concept, context, { maxResults: 10 });
      
      // Find cross-references using concept index
      const crossReferences = await this.findConceptCrossReferences(concept, context);

      return {
        conceptDefinition: conceptAnalysis.definition,
        relatedPassages,
        crossReferences,
        theologicalConnections: conceptAnalysis.connections,
        explorationQuestions: conceptAnalysis.questions
      };

    } catch (error) {
      console.error(`❌ Concept exploration failed: ${error}`);
      return {
        conceptDefinition: '',
        relatedPassages: [],
        crossReferences: [],
        theologicalConnections: [],
        explorationQuestions: []
      };
    }
  }

  // 🧠 ANALYZE CONCEPT IN DEPTH
  private async analyzeConcept(
    concept: string,
    context: SearchContext,
    depth: string
  ): Promise<{
    definition: string;
    connections: string[];
    questions: string[];
  }> {
    
    const depthInstructions = {
      'surface': 'Provide basic definition and key points',
      'medium': 'Include significance and relevant context',
      'deep': 'Explore historical development, scholarly debates, and detailed implications'
    };

    const analysisPrompt = `Analyze the concept: "${concept}"

Depth level: ${depth} - ${depthInstructions[depth as keyof typeof depthInstructions]}
User expertise: Level ${context.userExpertiseLevel}/10

Provide JSON response:
{
  "definition": "comprehensive definition appropriate for user level",
  "related_connections": ["connection1", "connection2", "connection3"],
  "exploration_questions": ["question1", "question2", "question3"]
}`;

    try {
      const result = await this.multiModel.executeTask('theological-reasoning', analysisPrompt, {
        requirements: { reasoning: 9, accuracy: 9 }
      });

      const analysis = JSON.parse(result.response);
      
      return {
        definition: analysis.definition || '',
        connections: analysis.related_connections || [],
        questions: analysis.exploration_questions || []
      };

    } catch (error) {
      console.error(`❌ Failed to analyze concept: ${error}`);
      return {
        definition: `The concept of "${concept}" is a significant theme in this subject area.`,
        connections: [],
        questions: []
      };
    }
  }

  // 🔗 FIND CROSS-REFERENCES USING CONCEPT INDEX
  private async findConceptCrossReferences(concept: string, context: SearchContext): Promise<SearchResult[]> {
    const relatedDocuments = this.conceptIndex.get(concept.toLowerCase()) || [];
    const results: SearchResult[] = [];

    for (const docId of relatedDocuments.slice(0, 5)) {
      try {
        const doc = await db.select({
          id: schema.documents.id,
          title: schema.documents.title,
          content: schema.documents.content
        }).from(schema.documents)
        .where(eq(schema.documents.id, parseInt(docId)))
        .limit(1);

        if (doc.length > 0) {
          results.push({
            id: `crossref_${doc[0].id}`,
            content: this.extractRelevantSnippet(doc[0].content, concept),
            relevanceScore: 0.8, // High relevance for concept-indexed results
            semanticSimilarity: 0.9,
            contextualRelevance: 0.7,
            source: {
              type: 'document',
              id: doc[0].id,
              title: doc[0].title
            },
            highlightedSnippets: [],
            relatedConcepts: [],
            suggestedQuestions: []
          });
        }
      } catch (error) {
        console.error(`❌ Error retrieving cross-reference: ${error}`);
      }
    }

    return results;
  }

  // 📊 GET SEARCH ANALYTICS
  getSearchAnalytics(): {
    totalSearches: number;
    cacheHitRate: number;
    averageResults: number;
    topQueries: string[];
    conceptIndexSize: number;
  } {
    const totalSearches = this.searchCache.size;
    const conceptIndexSize = this.conceptIndex.size;
    
    // Calculate cache hit rate (simplified)
    const cacheHitRate = 0.75; // Would be calculated from actual metrics
    
    return {
      totalSearches,
      cacheHitRate,
      averageResults: 8.5, // Would be calculated from actual searches
      topQueries: [], // Would be tracked in production
      conceptIndexSize
    };
  }

  // 🔧 UTILITY METHODS
  async clearCache(): Promise<void> {
    this.searchCache.clear();
    console.log('🧹 Search cache cleared');
  }

  async rebuildConceptIndex(): Promise<void> {
    this.conceptIndex.clear();
    await this.buildConceptIndex();
  }
} 