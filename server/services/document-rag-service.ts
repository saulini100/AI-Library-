import { MultiModelService } from './multi-model-service.js';
import { OllamaService } from './ollama-service.js';
import { SemanticSearchService, SearchResult, SearchContext } from './semantic-search-service.js';
import { EnhancedSemanticSearchService } from './enhanced-semantic-search-service.js';
import { QueryResultCacheService, QueryContext, SearchParameters } from './query-result-cache-service.js';
import { CachedEmbeddingService } from './cached-embedding-service.js';
import { LocalMemoryService } from './LocalMemoryService.js';
import { GemmaTranslationService } from './gemma-translation-service.js';
import { getRAGConfig } from '../config/rag-config.js';
import { db } from '../db.js';
import * as schema from '@shared/schema';
import { eq, desc, like, and, or } from 'drizzle-orm';

export interface RAGSearchResult extends SearchResult {
  ragScore: number;
  documentTitle: string;
  documentType: 'document' | 'annotation' | 'bookmark' | 'memory';
  excerpt: string;
  relevantPassages: string[];
  crossReferences: RAGCrossReference[];
}

export interface RAGCrossReference {
  documentId: number;
  documentTitle: string;
  chapter?: number;
  relevanceScore: number;
  connectionType: 'thematic' | 'keyword' | 'conceptual' | 'sequential';
  snippet: string;
}

export interface RAGContext {
  userId: number;
  currentDocument?: number;
  currentChapter?: number;
  conversationHistory: string[];
  userStudyPatterns: string[];
  preferredTopics: string[];
  studyLevel: 'beginner' | 'intermediate' | 'advanced';
  targetLanguage?: string; // Add language support
}

export interface RAGResponse {
  answer: string;
  sources: RAGSearchResult[];
  confidence: number;
  relatedQuestions: string[];
  studyRecommendations: string[];
  crossReferences: RAGCrossReference[];
}

export class DocumentRAGService {
  private multiModel: MultiModelService;
  private ollamaService: OllamaService;
  private semanticSearch: SemanticSearchService;
  private enhancedSemanticSearch: EnhancedSemanticSearchService;
  private queryCache: Map<string, { response: RAGResponse; timestamp: number }> = new Map();
  private queryResultCache: QueryResultCacheService;
  private cachedEmbedding: CachedEmbeddingService;
  private memory: LocalMemoryService;
  private translationService?: GemmaTranslationService; // Add translation service
  
  // Use configuration instead of hardcoded values
  private get config() {
    return getRAGConfig();
  }

  constructor() {
    this.multiModel = new MultiModelService();
    this.ollamaService = new OllamaService({
      model: 'gemma3n:e2b',
      temperature: 0.3
    });
    this.semanticSearch = new SemanticSearchService();
    this.enhancedSemanticSearch = new EnhancedSemanticSearchService();
    this.queryResultCache = new QueryResultCacheService();
    this.cachedEmbedding = new CachedEmbeddingService();
    this.memory = LocalMemoryService.getInstance();
  }

  // Add method to set translation service
  setTranslationService(translationService: GemmaTranslationService): void {
    this.translationService = translationService;
    console.log('🌐 Translation service added to RAG service');
  }

  // Language-aware helper methods
  private async translateExcerpt(excerpt: string, targetLanguage: string): Promise<string> {
    if (!this.translationService || targetLanguage === 'en') {
      return excerpt;
    }
    
    try {
      const result = await this.translationService.translateText({
        text: excerpt,
        targetLanguage: targetLanguage as any,
        context: 'biblical'
      });
      return result.translatedText;
    } catch (error) {
      console.warn(`Translation failed for excerpt: ${error}`);
      return excerpt; // Fallback to original
    }
  }

  private async generateLanguageAwareMessage(message: string, targetLanguage: string): Promise<string> {
    if (!this.translationService || targetLanguage === 'en') {
      return message;
    }
    
    try {
      const result = await this.translationService.translateText({
        text: message,
        targetLanguage: targetLanguage as any,
        context: 'general'
      });
      return result.translatedText;
    } catch (error) {
      console.warn(`Translation failed for message: ${error}`);
      return message; // Fallback to original
    }
  }

  private async generateLanguageAwareFallbackResponse(query: string, sources: RAGSearchResult[], targetLanguage: string): Promise<string> {
    const baseResponse = this.generateFastFallbackResponse(query, sources);
    
    if (!this.translationService || targetLanguage === 'en') {
      return baseResponse;
    }
    
    try {
      const result = await this.translationService.translateText({
        text: baseResponse,
        targetLanguage: targetLanguage as any,
        context: 'general'
      });
      return result.translatedText;
    } catch (error) {
      console.warn(`Translation failed for fallback response: ${error}`);
      return baseResponse; // Fallback to original
    }
  }

  private async generateLanguageAwareRAGResponse(
    query: string, 
    retrievedContext: string, 
    context: RAGContext,
    targetLanguage: string
  ): Promise<{ answer: string; confidence: number }> {
    try {
      console.log(`🤖 Generating grounded RAG response for: "${query}" in ${targetLanguage}`);
      
      const languageInstruction = targetLanguage !== 'en' 
        ? `\nIMPORTANT: Respond EXCLUSIVELY in ${targetLanguage}.`
        : '';
      
      // Simplified prompt for faster processing
      const prompt = `Based on the provided context, answer the user's question. Be accurate and grounded.

CONTEXT: ${retrievedContext.substring(0, 1000)}

QUESTION: "${query}"

INSTRUCTIONS:
- Use only information from the context above
- If context is insufficient, say "I need more specific information"
- Keep response concise but helpful
- Be conversational but accurate${languageInstruction}

Answer:`;

      // Use language-aware generation with Ollama service
      const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
        temperature: 0.2, // Very low temperature for consistency
        maxTokens: 200, // Reduced from 300 to 200 for faster responses
        context: `RAG response in ${targetLanguage}`
      });

      let answer = response.trim();
      
      // Quick post-processing
      answer = this.quickGroundingCheck(answer, retrievedContext);
      
      // Simple confidence calculation
      const confidence = this.calculateSimpleConfidence(answer, retrievedContext);

      console.log(`✅ Generated grounded response in ${targetLanguage} (confidence: ${confidence.toFixed(2)})`);
      return { answer, confidence };
      
    } catch (error) {
      console.error(`❌ RAG response generation failed: ${error}`);
      
      // Fast fallback using context directly
      const fastAnswer = this.generateContextBasedFallback(query, retrievedContext);
      
      // Translate fallback if needed
      if (targetLanguage !== 'en' && this.translationService) {
        try {
          const result = await this.translationService.translateText({
            text: fastAnswer,
            targetLanguage: targetLanguage as any,
            context: 'general'
          });
          return { answer: result.translatedText, confidence: 0.6 };
        } catch {
          // Fallback to English if translation fails
        }
      }
      
      return { 
        answer: fastAnswer, 
        confidence: 0.6 
      };
    }
  }

  async initialize(): Promise<void> {
    await this.multiModel.initialize();
    await this.ollamaService.initialize();
    await this.semanticSearch.initialize();
    // Note: Enhanced services don't need explicit initialization
    console.log('🔍 Document RAG Service initialized with advanced caching - Ready for intelligent document retrieval!');
  }

  // 🧠 MAIN RAG QUERY PROCESSING with Advanced Caching
  async processRAGQuery(
    query: string, 
    context: RAGContext, 
    options: {
      maxSources?: number;
      includeMemories?: boolean;
      includeAnnotations?: boolean;
      searchDepth?: 'quick' | 'thorough' | 'comprehensive';
      useEmbeddings?: boolean;
      singleDocumentOnly?: boolean; // New option to restrict to single document
      targetLanguage?: string; // Add language support
    } = {}
  ): Promise<RAGResponse> {
    
    const startTime = Date.now();
    const targetLanguage = options.targetLanguage || context.targetLanguage || 'en';
    console.log(`🔍 Processing RAG query: "${query}" in language: ${targetLanguage}`);
    
    // Step 1: Try advanced query result cache first (database-backed)
    const queryContext: QueryContext = {
      userId: context.userId,
      documentId: context.currentDocument,
      chapter: context.currentChapter
    };
    
    const searchParams: SearchParameters = {
      includeMemories: options.includeMemories || false,
      includeAnnotations: options.includeAnnotations || false,
      semanticExpansion: true,
      useEmbeddings: options.useEmbeddings !== false,
      maxResults: options.maxSources || 3,
      relevanceThreshold: options.singleDocumentOnly ? 0.6 : 0.7 // Lower threshold for single doc to get more results
    };

    // --- UPDATED CACHE KEY LOGIC WITH LANGUAGE CONSIDERATION ---
    const cacheKey = JSON.stringify({
      query,
      conversationHistory: context.conversationHistory.slice(-3), // Reduced from 5 to 3
      userId: context.userId,
      documentId: context.currentDocument,
      chapter: context.currentChapter,
      singleDocumentOnly: options.singleDocumentOnly || false,
      targetLanguage: targetLanguage // Add language to cache key
    });
    // --- END UPDATED CACHE KEY LOGIC ---

    try {
      // Try cached results first
      const cachedResult = await this.queryResultCache.getCachedResults(cacheKey, queryContext, searchParams);
      
      if (cachedResult) {
        console.log(`⚡ Advanced cache HIT for "${query}" in ${targetLanguage} (${Date.now() - startTime}ms)`);
        
        // Filter cached results if singleDocumentOnly is enabled
        let filteredResults = cachedResult.results;
        if (options.singleDocumentOnly && context.currentDocument) {
          filteredResults = cachedResult.results.filter(result => 
            result.source?.id === context.currentDocument ||
            result.source?.type === 'annotation' // Allow annotations from current reading
          );
        }
        
        // Convert cached results to RAG format with language awareness
        const answer = filteredResults.length > 0 
          ? await this.generateLanguageAwareFallbackResponse(query, filteredResults, targetLanguage)
          : await this.generateLanguageAwareMessage(`Based on your current reading, I found some relevant information about "${query}".`, targetLanguage);
        
        const ragResponse: RAGResponse = {
          answer,
          sources: filteredResults,
          confidence: 0.8,
          relatedQuestions: [],
          studyRecommendations: [],
          crossReferences: [] // Empty for single document mode
        };
        
        return ragResponse;
      }
      
      // Step 2: Use enhanced semantic search with embedding cache
      console.log(`🔄 Performing fresh search with caching for: "${query}" in ${targetLanguage}`);
      
      const enhancedResult = await this.enhancedSemanticSearch.search(query, queryContext, {
        maxResults: options.maxSources || 5,
        includeMemories: options.includeMemories,
        includeAnnotations: options.includeAnnotations,
        semanticExpansion: true,
        singleDocumentOnly: options.singleDocumentOnly
      });
      
      console.log(`✅ Enhanced search completed in ${enhancedResult.performance.totalTime}ms (embedding cache: ${enhancedResult.performance.embeddingCacheHits} hits, ${enhancedResult.performance.embeddingCacheMisses} misses)`);
      
      // Apply strict filtering for single document mode
      let filteredResults = enhancedResult.results;
      if (options.singleDocumentOnly && context.currentDocument) {
        filteredResults = enhancedResult.results.filter(result => {
          // Allow only results from current document or user annotations
          return result.source?.id === context.currentDocument ||
                 (result.source?.type === 'annotation' && 
                  result.metadata?.section === 'current') ||
                 !result.source?.id; // Include results without source ID (current document content)
        });
        console.log(`🎯 Filtered ${enhancedResult.results.length} results to ${filteredResults.length} for single document mode`);
      }
      
      // Apply chapter-specific filtering if chapter is mentioned in query
      const chapterMatch = query.match(/chapter\s+(\d+)/i);
      if (chapterMatch && options.singleDocumentOnly) {
        const requestedChapter = parseInt(chapterMatch[1]);
        const beforeChapterFilter = filteredResults.length;
        
        filteredResults = filteredResults.filter(result => {
          return this.isFromRequestedChapter(result, requestedChapter);
        });
        
        console.log(`📖 Chapter ${requestedChapter} filter: ${beforeChapterFilter} → ${filteredResults.length} results`);
      }
      
      // Convert to RAG results with language-aware excerpts
      const ragResults: RAGSearchResult[] = await Promise.all(filteredResults.map(async result => {
        const excerpt = this.extractRelevantExcerpt(result.content, query, 300);
        const translatedExcerpt = targetLanguage !== 'en' && this.translationService 
          ? await this.translateExcerpt(excerpt, targetLanguage)
          : excerpt;
        
        return {
          ...result,
          ragScore: result.relevanceScore || 0.5,
          documentTitle: result.source?.title || 'Current Document',
          documentType: 'document' as const,
          excerpt: translatedExcerpt,
          relevantPassages: [result.content.substring(0, 400)], // Keep original for reference
          crossReferences: options.singleDocumentOnly ? [] : [] // No cross-references for single document mode
        };
      }));
      
      // Limit results for cache storage to prevent parameter overflow
      const limitedRagResults = ragResults.slice(0, 8); // Reduced from 10 to 8
      const wasTruncated = ragResults.length > 8;
      
      // Generate AI response if we have good results
      let answer: string;
      let confidence: number;
      
      if (ragResults.length > 0 && ragResults[0].ragScore > 0.5) { // Lowered threshold from 0.6 to 0.5
        try {
          // Quick AI response with reasonable timeout for questions
          const aiResponse = await Promise.race([
            this.generateLanguageAwareRAGResponse(query, ragResults.map(r => r.excerpt).join('\n'), context, targetLanguage),
            new Promise<{ answer: string; confidence: number }>((_, reject) => 
              setTimeout(() => reject(new Error('AI timeout')), 35000) // Increased to 35s for better reliability
            )
          ]);
          answer = aiResponse.answer;
          confidence = aiResponse.confidence;
        } catch {
          // Fast fallback
          answer = await this.generateLanguageAwareFallbackResponse(query, ragResults, targetLanguage);
          confidence = 0.7;
        }
      } else {
        answer = await this.generateLanguageAwareFallbackResponse(query, ragResults, targetLanguage);
        confidence = ragResults.length > 0 ? 0.6 : 0.3;
      }
      
      const ragResponse: RAGResponse = {
        answer,
        sources: ragResults,
        confidence,
        relatedQuestions: options.singleDocumentOnly ? [] : [], // No related questions for single document
        studyRecommendations: [],
        crossReferences: options.singleDocumentOnly ? [] : [] // No cross-references for single document
      };
      
      // Cache the results for future use (use limited results to prevent overflow)
      await this.queryResultCache.storeResults(cacheKey, queryContext, searchParams, limitedRagResults);
      
      console.log(`✅ RAG query completed in ${Date.now() - startTime}ms with ${ragResults.length} sources in ${targetLanguage}${wasTruncated ? ' (truncated to 8 for cache)' : ''}`);
      return ragResponse;
      
    } catch (error) {
      console.error(`❌ RAG query failed: ${error}`);
      
      // Enhanced fallback to simple search
      try {
        console.log(`🔄 Attempting enhanced simple search fallback...`);
        const simpleResults = await this.performSimpleSearch(query, context);
        
        if (simpleResults.length > 0) {
          return {
            answer: this.generateFastFallbackResponse(query, simpleResults),
            sources: simpleResults,
            confidence: 0.5,
            relatedQuestions: [
              `Tell me more about ${query}`,
              `What else should I know about this topic?`,
              `Are there related concepts I should explore?`
            ],
            studyRecommendations: [
              `Try searching with different keywords`,
              `Explore related topics in your documents`
            ],
            crossReferences: []
          };
        }
      } catch (fallbackError) {
        console.error(`❌ Simple search fallback also failed: ${fallbackError}`);
      }
      
      return {
        answer: `I'm having trouble finding specific information about "${query}" in your documents right now. This could be because:

• The topic might not be covered in your current documents
• Try using different keywords or phrases  
• The information might be in a different section or chapter
• You might need to upload more documents on this topic

**Suggestions:**
- Try rephrasing your question with different terms
- Search for broader or more specific concepts
- Check if related information exists in your documents`,
        sources: [],
        confidence: 0,
        relatedQuestions: [
          `What topics are covered in my documents?`,
          `How can I search more effectively?`,
          `What documents should I upload for this topic?`
        ],
        studyRecommendations: [
          `Upload more documents related to "${query}"`,
          `Try searching with synonyms or related terms`,
          `Browse your document library to see available content`
        ],
        crossReferences: []
      };
    }
  }

  // 🚀 NEW: Fast fallback response without AI processing
  private generateFastFallbackResponse(query: string, sources: RAGSearchResult[]): string {
    if (sources.length === 0) {
      return `I don't have specific information available about "${query}" in your current reading. Could you help me understand what specific aspect you'd like to explore, or point me to a particular section you're reading?`;
    }
    
    // Build response from available sources with clear grounding
    let response = `Based on your current reading, here's what I found about "${query}":\n\n`;
    
    const relevantSources = sources.slice(0, 2); // Limit to top 2 sources
    relevantSources.forEach((source, index) => {
      const excerpt = source.excerpt.length > 120 ? 
        source.excerpt.substring(0, 120) + '...' : 
        source.excerpt;
      
      response += `• ${excerpt}`;
      
      // Add source attribution to prevent false authority claims
      if (source.documentTitle && source.documentTitle !== 'Current Document') {
        response += ` (from ${source.documentTitle})`;
      }
      
      response += '\n';
    });
    
    // Add helpful follow-up that stays grounded
    if (sources.length > 2) {
      response += `\nI found ${sources.length - 2} additional related passages. `;
    }
    
    response += `\nWould you like me to explore any specific aspect of this further, or help you find more information on a particular point?`;
    
    return response;
  }

  // 🚀 NEW: Minimal fallback when everything fails
  private generateMinimalFallbackResponse(query: string): string {
    return `I'd like to help you explore "${query}", but I don't have specific information available right now. Could you point me to a section of your reading that relates to this, or help me understand what specific aspect you're most interested in?`;
  }

  // 🔍 ENHANCED DOCUMENT SEARCH
  private async enhancedDocumentSearch(
    query: string, 
    context: RAGContext, 
    options: any
  ): Promise<RAGSearchResult[]> {
    
    const searchContext: SearchContext = {
      userId: context.userId,
      currentDocument: context.currentDocument,
      currentChapter: context.currentChapter,
      recentQueries: context.conversationHistory.slice(-5),
      userExpertiseLevel: context.studyLevel === 'beginner' ? 3 : context.studyLevel === 'intermediate' ? 6 : 9,
      preferredTopics: context.preferredTopics
    };

    // Search across multiple sources with embedding support
    const [documentResults, annotationResults, memoryResults] = await Promise.all([
      this.searchDocuments(query, searchContext, options.useEmbeddings),
      options.includeAnnotations !== false ? this.searchAnnotations(query, searchContext) : [],
      options.includeMemories !== false ? this.searchMemories(query, searchContext) : []
    ]);

    // Combine and rank results
    const allResults = [...documentResults, ...annotationResults, ...memoryResults];
    
    // Convert to RAG results with enhanced metadata
    const ragResults = await this.convertToRAGResults(allResults, query, context);
    
    // Sort by RAG score and return top results
    const maxSources = options.maxSources || 10;
    return ragResults
      .sort((a, b) => b.ragScore - a.ragScore)
      .slice(0, maxSources);
  }

  // 📄 SEARCH DOCUMENTS with Smart Hybrid Approach
  private async searchDocuments(query: string, context: SearchContext, useEmbeddings: boolean = false): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Starting smart hybrid search for "${query}"`);
      
      // STEP 1: Search current document first (if specified)
      if (context.currentDocument) {
        console.log(`📖 Searching current document (ID: ${context.currentDocument}) first...`);
        
        const currentDocResults = await this.searchSpecificDocument(
          query, 
          context, 
          context.currentDocument, 
          useEmbeddings
        );
        
        // If we found good results in current document, return them
        if (currentDocResults.length > 0 && currentDocResults[0].relevanceScore > 0.7) {
          console.log(`✅ Found ${currentDocResults.length} high-quality results in current document`);
          return currentDocResults;
        }
        
        // If we found some results but not great, keep them and search more
        if (currentDocResults.length > 0) {
          console.log(`⚠️ Found ${currentDocResults.length} moderate results in current document, expanding search...`);
          
          // Search all documents but boost current document results
          const allResults = await this.searchAllDocuments(query, context, useEmbeddings);
          
          // Boost current document results by 20%
          const boostedCurrentResults = currentDocResults.map(result => ({
            ...result,
            relevanceScore: Math.min(result.relevanceScore * 1.2, 1.0),
            contextualRelevance: Math.min((result.contextualRelevance || 0) * 1.2, 1.0)
          }));
          
          // Combine and deduplicate
          const combinedResults = this.combineAndDeduplicateResults(boostedCurrentResults, allResults);
          console.log(`🔄 Combined search: ${currentDocResults.length} current + ${allResults.length} all = ${combinedResults.length} total`);
          
          return combinedResults;
        }
        
        console.log(`❌ No good results in current document, searching all documents...`);
      }
      
      // STEP 2: Search all documents (fallback or no current document)
      return await this.searchAllDocuments(query, context, useEmbeddings);
      
    } catch (error) {
      console.error(`❌ Error in smart hybrid search: ${error}`);
      return [];
    }
  }

  // 📖 Search a specific document
  private async searchSpecificDocument(
    query: string, 
    context: SearchContext, 
    documentId: number, 
    useEmbeddings: boolean
  ): Promise<SearchResult[]> {
    try {
      const document = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content,
        userId: schema.documents.userId,
        createdAt: schema.documents.createdAt
      })
      .from(schema.documents)
      .where(and(
        eq(schema.documents.userId, context.userId),
        eq(schema.documents.id, documentId)
      ))
      .limit(1);

      if (document.length === 0) {
        console.log(`⚠️ Current document ${documentId} not found`);
        return [];
      }

      const doc = document[0];
      const results: SearchResult[] = [];
      
      if (useEmbeddings) {
        console.log(`🔗 Using embedding search on document: "${doc.title}"`);
        // Use semantic search but limit to current document
        const searchResults = await this.semanticSearch.search(query, {
          ...context,
          currentDocument: documentId
        }, {
          maxResults: 10,
          includeMemories: false,
          includeAnnotations: false,
          useEmbeddings: true
        });
        
        return searchResults.filter(result => 
          result.source?.type === 'document' && result.source?.id === documentId
        );
      } else {
        console.log(`📝 Using traditional search on document: "${doc.title}"`);
        const relevance = await this.calculateDocumentRelevance(doc.content, query, context, false);
        
        if (relevance.score > this.config.minRelevanceScore) {
          results.push({
            id: `doc_${doc.id}`,
            content: doc.content,
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
      console.error(`❌ Error searching specific document ${documentId}: ${error}`);
      return [];
    }
  }

  // 📚 Search all documents (original behavior)
  private async searchAllDocuments(query: string, context: SearchContext, useEmbeddings: boolean): Promise<SearchResult[]> {
    try {
      console.log(`🌐 Searching all documents for "${query}"`);
      
      const documents = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content,
        userId: schema.documents.userId,
        createdAt: schema.documents.createdAt
      })
      .from(schema.documents)
      .where(eq(schema.documents.userId, context.userId));

      const results: SearchResult[] = [];
      
      if (useEmbeddings) {
        console.log(`🔗 Using embedding-based search across all documents`);
        const searchResults = await this.semanticSearch.search(query, context, {
          maxResults: 20,
          includeMemories: false,
          includeAnnotations: false,
          useEmbeddings: true
        });
        
        return searchResults;
      } else {
        console.log(`📝 Using traditional search across all documents`);
        for (const doc of documents) {
          const relevance = await this.calculateDocumentRelevance(doc.content, query, context, false);
          
          if (relevance.score > this.config.minRelevanceScore) {
            results.push({
              id: `doc_${doc.id}`,
              content: doc.content,
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
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error searching all documents: ${error}`);
      return [];
    }
  }

  // 🔄 Combine and deduplicate results
  private combineAndDeduplicateResults(currentResults: SearchResult[], allResults: SearchResult[]): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();
    
    // Add current document results first (higher priority)
    currentResults.forEach(result => {
      resultMap.set(result.id, result);
    });
    
    // Add other results if not already present
    allResults.forEach(result => {
      if (!resultMap.has(result.id)) {
        resultMap.set(result.id, result);
      }
    });
    
    // Convert back to array and sort by relevance
    return Array.from(resultMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // 📝 SEARCH ANNOTATIONS
  private async searchAnnotations(query: string, context: SearchContext): Promise<SearchResult[]> {
    try {
      const annotations = await db.select({
        id: schema.annotations.id,
        documentId: schema.annotations.documentId,
        chapter: schema.annotations.chapter,
        selectedText: schema.annotations.selectedText,
        note: schema.annotations.note,
        createdAt: schema.annotations.createdAt
      })
      .from(schema.annotations)
      .where(eq(schema.annotations.userId, context.userId));

      const results: SearchResult[] = [];
      
      for (const annotation of annotations) {
        const searchText = `${annotation.selectedText} ${annotation.note}`;
        const relevance = await this.calculateDocumentRelevance(searchText, query, context, true);
        
        if (relevance.score > this.config.minRelevanceScore) {
          results.push({
            id: `annotation_${annotation.id}`,
            content: searchText,
            relevanceScore: relevance.score,
            semanticSimilarity: relevance.semanticSimilarity,
            contextualRelevance: relevance.contextualRelevance,
            source: {
              type: 'annotation',
              id: annotation.id,
              title: `Annotation in Chapter ${annotation.chapter}`,
              chapter: annotation.chapter
            },
            highlightedSnippets: relevance.snippets,
            relatedConcepts: [],
            suggestedQuestions: []
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error searching annotations: ${error}`);
      return [];
    }
  }

  // 🧠 SEARCH MEMORIES
  private async searchMemories(query: string, context: SearchContext): Promise<SearchResult[]> {
    try {
      const memories = await db.select({
        id: schema.aiMemories.id,
        content: schema.aiMemories.content,
        category: schema.aiMemories.category,
        metadata: schema.aiMemories.metadata,
        createdAt: schema.aiMemories.createdAt
      })
      .from(schema.aiMemories)
      .where(eq(schema.aiMemories.userId, context.userId));

      const results: SearchResult[] = [];
      
      for (const memory of memories) {
        const relevance = await this.calculateDocumentRelevance(memory.content, query, context, true);
        
        if (relevance.score > this.config.minRelevanceScore) {
          results.push({
            id: `memory_${memory.id}`,
            content: memory.content,
            relevanceScore: relevance.score,
            semanticSimilarity: relevance.semanticSimilarity,
            contextualRelevance: relevance.contextualRelevance,
            source: {
              type: 'memory',
              id: parseInt(memory.id),
              title: `AI Memory: ${memory.category}`
            },
            highlightedSnippets: relevance.snippets,
            relatedConcepts: [],
            suggestedQuestions: []
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error searching memories: ${error}`);
      return [];
    }
  }

  // 📊 CALCULATE DOCUMENT RELEVANCE
  private async calculateDocumentRelevance(
    content: string, 
    query: string, 
    context: SearchContext,
    useEmbeddings: boolean = true
  ): Promise<{
    score: number;
    semanticSimilarity: number;
    contextualRelevance: number;
    snippets: string[];
  }> {
    try {
      if (useEmbeddings) {
        console.log(`🔗 Using embedding-based relevance calculation`);
        // Use embedding-based similarity calculation
        const queryEmbedding = await this.multiModel.generateEmbedding(query);
        const contentEmbedding = await this.multiModel.generateEmbedding(content.substring(0, 1000));
        
        const similarity = this.multiModel.calculateCosineSimilarity(queryEmbedding, contentEmbedding);
        
        return {
          score: similarity,
          semanticSimilarity: similarity,
          contextualRelevance: similarity * 0.9, // Slightly lower than semantic
          snippets: [this.extractRelevantExcerpt(content, query, 200)]
        };
      } else {
        console.log(`📝 Using traditional relevance calculation with qwen2.5`);
        // Fallback to traditional LLM-based analysis
        const analysisPrompt = `Analyze the relevance of this content to the query.
Query: "${query}"
Content: "${content.substring(0, 2000)}"

Rate the relevance on a scale of 0.0 to 1.0 and provide relevant snippets.
Respond with JSON: {
  "semanticSimilarity": 0.8,
  "contextualRelevance": 0.7,
  "relevantSnippets": ["snippet1", "snippet2"]
}`;

        const result = await this.multiModel.executeTask('semantic-search', analysisPrompt, {
          requirements: { accuracy: 9, speed: 7, reasoning: 8 }
        });

        const analysis = this.parseAnalysisResult(result.response);
        
        const overallScore = (analysis.semanticSimilarity * 0.6) + (analysis.contextualRelevance * 0.4);
        
        return {
          score: overallScore,
          semanticSimilarity: analysis.semanticSimilarity,
          contextualRelevance: analysis.contextualRelevance,
          snippets: analysis.relevantSnippets || []
        };
      }
      
    } catch (error) {
      console.error(`❌ Error calculating relevance: ${error}`);
      return {
        score: 0.5,
        semanticSimilarity: 0.5,
        contextualRelevance: 0.5,
        snippets: [content.substring(0, 200)]
      };
    }
  }

  // 🔧 PARSE ANALYSIS RESULT
  private parseAnalysisResult(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        semanticSimilarity: 0.6,
        contextualRelevance: 0.6,
        relevantSnippets: []
      };
    } catch (error) {
      return {
        semanticSimilarity: 0.5,
        contextualRelevance: 0.5,
        relevantSnippets: []
      };
    }
  }

  // 🔄 CONVERT TO RAG RESULTS
  private async convertToRAGResults(
    results: SearchResult[], 
    query: string, 
    context: RAGContext
  ): Promise<RAGSearchResult[]> {
    return results.map(result => ({
      ...result,
      ragScore: this.calculateRAGScore(result, query, context),
      documentTitle: result.source.title || 'Unknown Document',
      documentType: result.source.type as 'document' | 'annotation' | 'bookmark' | 'memory',
      excerpt: this.extractRelevantExcerpt(result.content, query),
      relevantPassages: result.highlightedSnippets,
      crossReferences: [] // Will be populated later
    }));
  }

  // 📊 CALCULATE RAG SCORE
  private calculateRAGScore(result: SearchResult, query: string, context: RAGContext): number {
    let score = result.relevanceScore;
    
    // Boost score for user's preferred topics
    if (context.preferredTopics.some(topic => 
      result.content.toLowerCase().includes(topic.toLowerCase())
    )) {
      score += 0.1;
    }
    
    // Boost score for recent content
    if (result.source.type === 'annotation' || result.source.type === 'memory') {
      score += 0.05;
    }
    
    // Boost score if related to current reading
    if (context.currentDocument && result.source.id === context.currentDocument) {
      score += 0.15;
    }
    
    return Math.min(1.0, score);
  }

  // 📄 EXTRACT RELEVANT EXCERPT
  private extractRelevantExcerpt(content: string, query: string, maxLength: number = 300): string {
    const queryWords = query.toLowerCase().split(' ');
    const contentLower = content.toLowerCase();
    
    // Find the best position for excerpt
    let bestPosition = 0;
    let bestScore = 0;
    
    for (let i = 0; i < content.length - maxLength; i += 50) {
      const segment = contentLower.substring(i, i + maxLength);
      const score = queryWords.reduce((acc, word) => 
        acc + (segment.includes(word) ? 1 : 0), 0
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }
    
    let excerpt = content.substring(bestPosition, bestPosition + maxLength);
    if (bestPosition > 0) excerpt = '...' + excerpt;
    if (bestPosition + maxLength < content.length) excerpt += '...';
    
    return excerpt;
  }

  // 🔗 BUILD RAG CONTEXT
  private async buildRAGContext(
    searchResults: RAGSearchResult[], 
    query: string, 
    context: RAGContext
  ): Promise<string> {
    
    let ragContext = `Based on the user's personal study materials, here is relevant information:\n\n`;
    
    // Add top search results as context
    for (const result of searchResults.slice(0, 5)) {
      ragContext += `📖 From "${result.documentTitle}" (${result.documentType}):\n`;
      ragContext += `${result.excerpt}\n\n`;
      
      if (result.relevantPassages.length > 0) {
        ragContext += `Key passages: ${result.relevantPassages.join('; ')}\n\n`;
      }
    }
    
    // Add user context
    if (context.conversationHistory.length > 0) {
      ragContext += `Recent conversation context:\n`;
      ragContext += context.conversationHistory.slice(-3).join('\n') + '\n\n';
    }
    
          // Truncate if too long
      if (ragContext.length > this.config.maxContextLength) {
        ragContext = ragContext.substring(0, this.config.maxContextLength) + '...';
    }
    
    return ragContext;
  }

  private quickGroundingCheck(answer: string, context: string): string {
    // Quick checks only - no complex analysis
    if (answer.includes('research shows') || answer.includes('studies indicate')) {
      return `Based on the available information, ${answer.replace(/research shows|studies indicate/gi, '')}`;
    }
    
    if (!answer.includes('based on') && !answer.includes('from the context') && context.length > 50) {
      return `Based on your reading, ${answer}`;
    }
    
    return answer;
  }

  private calculateSimpleConfidence(answer: string, context: string): number {
    let confidence = 0.7; // Start higher for faster processing
    
    if (answer.includes('based on') || answer.includes('from the context')) {
      confidence += 0.1;
    }
    
    if (context.length < 100) {
      confidence -= 0.2;
    }
    
    return Math.max(0.4, Math.min(0.9, confidence));
  }

  private generateContextBasedFallback(query: string, context: string): string {
    if (!context || context.length < 30) {
      return `I'd like to help with "${query}", but I need more specific information from your reading. Could you point me to a particular section?`;
    }
    
    // Extract a relevant snippet directly
    const snippet = context.substring(0, 150);
    return `Based on your reading: "${snippet}..." Would you like me to explore a specific aspect of "${query}" further?`;
  }

  private isFromRequestedChapter(result: any, requestedChapter: number): boolean {
    const content = result.content?.toLowerCase() || '';
    const metadata = result.metadata || {};
    
    // Check if this result is from the requested chapter
    const chapterPatterns = [
      `chapter ${requestedChapter}`,
      `chapter ${requestedChapter}:`,
      `chapter ${requestedChapter}.`,
      `chapter ${requestedChapter} -`,
      `chapter ${requestedChapter}\\n`,
      `chapter ${requestedChapter}\\t`
    ];
    
    // Check if content contains the specific chapter
    const isFromChapter = chapterPatterns.some(pattern => 
      content.includes(pattern) || content.includes(pattern.replace('\\n', '\n').replace('\\t', '\t'))
    );
    
    // Check metadata for chapter info
    const metadataMatch = metadata.chapter === requestedChapter ||
                         (metadata.section && metadata.section.includes(`Chapter ${requestedChapter}`));
    
    if (isFromChapter || metadataMatch) {
      return true;
    }
    
    // Check for other chapters mentioned in content
    const otherChapterMatch = content.match(/chapter\s+(\d+)/i);
    if (otherChapterMatch) {
      const foundChapter = parseInt(otherChapterMatch[1]);
      
      // If content explicitly mentions a different chapter, be more lenient
      // Allow content from adjacent chapters or general content
      if (foundChapter !== requestedChapter) {
        // Allow if it's adjacent chapter (within 1 chapter difference)
        if (Math.abs(foundChapter - requestedChapter) <= 1) {
          return true;
        }
        
        // Allow if content is general/introductory (first 500 chars often contain overview)
        if (content.length < 500 || content.includes('introduction') || content.includes('overview')) {
          return true;
        }
        
        // Allow if content doesn't heavily reference the other chapter
        const chapterReferences = (content.match(/chapter\s+\d+/gi) || []).length;
        if (chapterReferences <= 1) {
          return true; // Only one chapter reference, might be general content
        }
        
        return false; // Multiple chapter references to different chapter, exclude
      }
    }
    
    // For results without clear chapter indicators, be more permissive
    // This handles cases where content spans multiple paragraphs without repeating "Chapter X"
    const hasChapterContext = content.includes('chapter') || metadata.chapter;
    if (!hasChapterContext) {
      // If no chapter context, allow it (might be general content)
      return true;
    }
    
    // If we have chapter context but can't determine specific chapter, allow it
    // This prevents over-filtering of relevant content
    return true;
  }

  // 🔍 Analyze query complexity and type
  private async analyzeQueryComplexity(query: string): Promise<{
    type: 'factual' | 'analytical' | 'comparative' | 'explanatory' | 'general';
    complexity: number;
    keywords: string[];
  }> {
    const queryLower = query.toLowerCase();
    
    // Detect query type based on patterns
    let type: 'factual' | 'analytical' | 'comparative' | 'explanatory' | 'general' = 'general';
    
    if (queryLower.match(/what is|what are|define|definition|meaning/)) {
      type = 'factual';
    } else if (queryLower.match(/why|how does|explain|because|reason|cause/)) {
      type = 'explanatory';
    } else if (queryLower.match(/compare|versus|vs|difference|similar|unlike|better|worse/)) {
      type = 'comparative';
    } else if (queryLower.match(/analyze|analysis|evaluate|assess|implications|impact/)) {
      type = 'analytical';
    }
    
    // Calculate complexity based on length and question words
    const complexity = Math.min(10, Math.max(1, 
      query.split(' ').length / 3 + 
      (queryLower.match(/\?/g) || []).length * 2 +
      (queryLower.match(/and|or|but|however|therefore/g) || []).length
    ));
    
    // Extract key terms
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['what', 'how', 'why', 'when', 'where', 'which'].includes(word))
      .slice(0, 5);
    
    return { type, complexity, keywords };
  }

  // 🔗 Enhanced context synthesis
  private async synthesizeContext(
    retrievedContext: string, 
    query: string, 
    context: RAGContext
  ): Promise<string> {
    
    // Extract key information from context
    const contextSections = retrievedContext.split('📖').filter(section => section.trim());
    
    let synthesized = `# Relevant Information for: "${query}"\n\n`;
    
    // Group similar sources
    const groupedSources = this.groupSimilarSources(contextSections);
    
    for (const [topic, sources] of Object.entries(groupedSources)) {
      synthesized += `## ${topic}\n`;
      sources.forEach((source, index) => {
        synthesized += `**Source ${index + 1}:** ${source.trim()}\n\n`;
      });
    }
    
    // Add user context if relevant
    if (context.preferredTopics.length > 0) {
      synthesized += `\n## User's Study Focus\n`;
      synthesized += `Topics of interest: ${context.preferredTopics.join(', ')}\n`;
      synthesized += `Study level: ${context.studyLevel}\n\n`;
    }
    
    return synthesized;
  }

  // 📊 Group similar sources by topic
  private groupSimilarSources(sections: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    
    sections.forEach(section => {
      // Extract document title for grouping
      const titleMatch = section.match(/From "([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : 'Other Sources';
      
      if (!groups[title]) {
        groups[title] = [];
      }
      groups[title].push(section);
    });
    
    return groups;
  }

  // 📋 Format factual response
  private formatFactualResponse(response: string): string {
    // Add structure to factual responses
    if (!response.includes('•') && !response.includes('-') && response.includes('\n')) {
      const lines = response.split('\n').filter(line => line.trim());
      if (lines.length > 2) {
        return lines.map((line, index) => 
          index === 0 ? line : `• ${line.trim()}`
        ).join('\n');
      }
    }
    return response;
  }

  // 🔬 Format analytical response
  private formatAnalyticalResponse(response: string): string {
    // Ensure analytical structure
    if (!response.includes('##') && !response.includes('**')) {
      const paragraphs = response.split('\n\n');
      if (paragraphs.length > 1) {
        return paragraphs.map((para, index) => 
          index === 0 ? `**Analysis:** ${para}` : para
        ).join('\n\n');
      }
    }
    return response;
  }

  // ✅ Validate and enhance response
  private async validateAndEnhanceResponse(
    answer: string, 
    query: string, 
    context: string, 
    userContext: RAGContext
  ): Promise<{ answer: string; confidence: number }> {
    
    // Basic validation checks
    let confidence = 0.8;
    let enhancedAnswer = answer;
    
    // Check if answer is too short
    if (answer.length < 50) {
      confidence -= 0.2;
      enhancedAnswer += "\n\n*Note: This answer is brief due to limited information in your documents. Consider uploading more relevant materials for a more comprehensive response.*";
    }
    
    // Check if answer addresses the query
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const answerLower = answer.toLowerCase();
    const addressedWords = queryWords.filter(word => answerLower.includes(word));
    
    if (addressedWords.length / queryWords.length < 0.3) {
      confidence -= 0.3;
    }
    
    // Add confidence indicator
    if (confidence > 0.8) {
      enhancedAnswer = `${enhancedAnswer}\n\n*Confidence: High - Based on comprehensive information from your materials.*`;
    } else if (confidence > 0.6) {
      enhancedAnswer = `${enhancedAnswer}\n\n*Confidence: Moderate - Based on available information, but may benefit from additional sources.*`;
    } else {
      enhancedAnswer = `${enhancedAnswer}\n\n*Confidence: Low - Limited information available. Consider uploading more relevant documents.*`;
    }
    
      return {
      answer: enhancedAnswer,
      confidence: Math.max(0.1, confidence)
      };
  }

  // 🔗 FIND CROSS-REFERENCES
  private async findCrossReferences(
    searchResults: RAGSearchResult[], 
    context: RAGContext
  ): Promise<RAGCrossReference[]> {
    
    const crossRefs: RAGCrossReference[] = [];
    
    // Simple implementation - find documents with similar themes
    for (const result of searchResults.slice(0, 3)) {
      if (result.relatedConcepts.length > 0) {
        // This would be enhanced with actual cross-reference logic
        crossRefs.push({
          documentId: result.source.id,
          documentTitle: result.documentTitle,
          chapter: result.source.chapter,
          relevanceScore: result.ragScore,
          connectionType: 'thematic',
          snippet: result.excerpt.substring(0, 100) + '...'
        });
      }
    }
    
    return crossRefs;
  }

  // 📚 GENERATE STUDY RECOMMENDATIONS
  private async generateStudyRecommendations(
    query: string, 
    searchResults: RAGSearchResult[], 
    context: RAGContext
  ): Promise<string[]> {
    
    const recommendations: string[] = [];
    
    // Analyze what the user might want to study next
    if (searchResults.length > 0) {
      recommendations.push(`Explore more annotations in "${searchResults[0].documentTitle}"`);
      
      if (context.currentChapter) {
        recommendations.push(`Read the next chapter for continued study`);
      }
      
      recommendations.push(`Review your previous notes on similar topics`);
    }
    
    return recommendations;
  }

  // ❓ GENERATE RELATED QUESTIONS
  private async generateRelatedQuestions(
    query: string, 
    searchResults: RAGSearchResult[], 
    context: RAGContext
  ): Promise<string[]> {
    
    const questionsPrompt = `Based on this query: "${query}" and the user's study materials, suggest 3 related questions they might want to explore next. Make them specific to their content.

Respond with just the questions, one per line:`;

    try {
      const result = await this.multiModel.executeTask('creative-insights', questionsPrompt, {
        requirements: { creativity: 8, reasoning: 6, speed: 8 }
      });
      
      return result.response.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3);
        
    } catch (error) {
      console.error(`❌ Error generating related questions: ${error}`);
      return [
        "What other passages relate to this topic?",
        "How does this connect to your previous studies?", 
        "What practical applications can you draw from this?"
      ];
    }
  }

  // 📊 GET RAG ANALYTICS
  getRAGAnalytics(): {
    totalQueries: number;
    cacheHitRate: number;
    averageSources: number;
    topQueries: string[];
  } {
    const totalQueries = this.queryCache.size;
    
    return {
      totalQueries,
      cacheHitRate: 0.75, // Placeholder
      averageSources: 5, // Placeholder
      topQueries: [] // Placeholder
    };
  }

  // 🧹 CLEAR CACHE
  async clearCache(): Promise<void> {
    this.queryCache.clear();
    console.log('🧹 RAG cache cleared');
  }

  /**
   * Clear cache for specific user
   */
  async clearCacheForUser(userId: number): Promise<void> {
    await this.queryResultCache.clearCacheForUser(userId);
    console.log(`🧹 RAG cache cleared for user ${userId}`);
  }

  // 💾 SAVE RAG INSIGHTS TO DATABASE for persistent knowledge building
  private async saveRAGInsightsToDB(query: string, response: RAGResponse, context: RAGContext): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Save the main AI response as a memory
      const mainMemoryId = `rag_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(schema.aiMemories).values({
        id: mainMemoryId,
        userId: context.userId,
        content: `Query: ${query}\n\nAnswer: ${response.answer}`,
        category: 'rag_response',
        metadata: JSON.stringify({
          confidence: response.confidence,
          sourcesCount: response.sources.length,
          timestamp,
          studyLevel: context.studyLevel
        })
      });

      // Save related questions as separate memories for future query suggestions
      for (const question of response.relatedQuestions) {
        const questionId = `rag_question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(schema.aiMemories).values({
          id: questionId,
          userId: context.userId,
          content: question,
          category: 'suggested_question',
          metadata: JSON.stringify({
            originalQuery: query,
            timestamp,
            relevantSources: response.sources.slice(0, 2).map(s => s.documentTitle)
          })
        });
      }

      // Save study recommendations
      for (const recommendation of response.studyRecommendations) {
        const recId = `rag_recommendation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(schema.aiMemories).values({
          id: recId,
          userId: context.userId,
          content: recommendation,
          category: 'study_recommendation',
          metadata: JSON.stringify({
            originalQuery: query,
            timestamp,
            studyLevel: context.studyLevel
          })
        });
      }

      // Save cross-reference insights
      for (const crossRef of response.crossReferences) {
        const crossRefId = `rag_crossref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(schema.aiMemories).values({
          id: crossRefId,
          userId: context.userId,
          content: `Cross-reference: ${crossRef.snippet}`,
          category: 'cross_reference',
          metadata: JSON.stringify({
            documentId: crossRef.documentId,
            documentTitle: crossRef.documentTitle,
            connectionType: crossRef.connectionType,
            relevanceScore: crossRef.relevanceScore,
            originalQuery: query,
            timestamp
          })
        });
      }

      console.log(`💾 Saved RAG insights to database: 1 response + ${response.relatedQuestions.length} questions + ${response.studyRecommendations.length} recommendations + ${response.crossReferences.length} cross-refs`);
      
    } catch (error) {
      console.error(`❌ Failed to save RAG insights to database: ${error}`);
      // Don't throw - this shouldn't break the main RAG flow
    }
  }

  // 🔍 SEARCH SAVED RAG INSIGHTS
  async searchSavedInsights(query: string, userId: number, category?: string): Promise<any[]> {
    try {
      const whereConditions = [eq(schema.aiMemories.userId, userId)];
      
      if (category) {
        whereConditions.push(eq(schema.aiMemories.category, category));
      }

      const memories = await db.select()
        .from(schema.aiMemories)
        .where(and(...whereConditions));
      
      // Simple relevance scoring for saved insights
      return memories
        .filter(memory => memory.content.toLowerCase().includes(query.toLowerCase()))
        .map(memory => ({
          ...memory,
          relevanceScore: this.calculateSimpleRelevance(memory.content, query)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10);
        
    } catch (error) {
      console.error(`❌ Error searching saved insights: ${error}`);
      return [];
    }
  }

  // 📊 SIMPLE RELEVANCE CALCULATION
  private calculateSimpleRelevance(content: string, query: string): number {
    if (!content || !query) return 0;
    
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Split query into individual words and phrases
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const queryPhrases = queryLower.split(/[,;.!?]+/).map(p => p.trim()).filter(p => p.length > 3);
    
    let score = 0;
    const contentLength = content.length;
    
    // 1. Exact phrase matches (highest weight)
    queryPhrases.forEach(phrase => {
      const phraseMatches = (contentLower.match(new RegExp(this.escapeRegex(phrase), 'g')) || []).length;
      score += phraseMatches * 10; // High weight for exact phrases
    });
    
    // 2. Individual word matches
    queryWords.forEach(word => {
      // Exact word matches
      const exactMatches = (contentLower.match(new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'g')) || []).length;
      score += exactMatches * 3;
      
      // Partial word matches (for things like "cryptocurrency" matching "crypto")
      const partialMatches = (contentLower.match(new RegExp(this.escapeRegex(word), 'g')) || []).length;
      score += partialMatches * 1;
      
      // Fuzzy matches (allow 1-2 character differences for longer words)
      if (word.length > 4) {
        const fuzzyPattern = this.createFuzzyPattern(word);
        const fuzzyMatches = (contentLower.match(new RegExp(fuzzyPattern, 'g')) || []).length;
        score += fuzzyMatches * 0.5;
      }
    });
    
    // 3. Acronym and abbreviation matching
    const acronyms = this.extractAcronyms(queryLower);
    acronyms.forEach(acronym => {
      const acronymMatches = (contentLower.match(new RegExp(`\\b${this.escapeRegex(acronym)}\\b`, 'gi')) || []).length;
      score += acronymMatches * 5; // High weight for acronyms like "XRP"
    });
    
    // 4. Related terms and synonyms
    const relatedTerms = this.getRelatedTerms(queryLower);
    relatedTerms.forEach(term => {
      const relatedMatches = (contentLower.match(new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'g')) || []).length;
      score += relatedMatches * 2;
    });
    
    // Normalize score based on content length to avoid bias toward longer documents
    const normalizedScore = score / Math.sqrt(contentLength / 1000);
    
    return Math.min(normalizedScore, 10); // Cap at 10 to avoid extreme scores
  }

  // Helper method to escape regex special characters
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Create fuzzy pattern for approximate matching
  private createFuzzyPattern(word: string): string {
    // Allow 1 character substitution for words 5-7 chars, 2 for longer
    const allowedErrors = word.length > 7 ? 2 : 1;
    
    if (allowedErrors === 1) {
      // Simple pattern: allow one character to be different
      return word.split('').map((char, i) => 
        `${word.substring(0, i)}[a-z]?${word.substring(i + 1)}`
      ).join('|');
    }
    
    // For longer words, just do partial matching
    return word.substring(0, Math.floor(word.length * 0.8));
  }

  // Extract acronyms from query (like XRP, BTC, etc.)
  private extractAcronyms(query: string): string[] {
    const acronymPattern = /\b[A-Z]{2,5}\b/gi;
    return (query.match(acronymPattern) || []).map(a => a.toUpperCase());
  }

  // Get related terms for better semantic matching
  private getRelatedTerms(query: string): string[] {
    const relatedTermsMap: Record<string, string[]> = {
      'xrp': ['ripple', 'cryptocurrency', 'digital currency', 'blockchain', 'crypto'],
      'cryptocurrency': ['bitcoin', 'crypto', 'digital currency', 'blockchain', 'token'],
      'bitcoin': ['btc', 'cryptocurrency', 'crypto', 'digital currency', 'blockchain'],
      'blockchain': ['distributed ledger', 'crypto', 'cryptocurrency', 'decentralized'],
      'finance': ['financial', 'economic', 'economy', 'monetary', 'banking'],
      'economy': ['economic', 'financial', 'gdp', 'market', 'trade'],
      'technology': ['tech', 'digital', 'innovation', 'software', 'computing'],
      'ai': ['artificial intelligence', 'machine learning', 'ml', 'neural network'],
      'business': ['corporate', 'company', 'enterprise', 'commercial', 'industry']
    };

    const related: string[] = [];
    Object.keys(relatedTermsMap).forEach(key => {
      if (query.includes(key)) {
        related.push(...relatedTermsMap[key]);
      }
    });

    return Array.from(new Set(related)); // Remove duplicates
  }

  // 🚀 NEW: Enhanced simple search fallback
  private async performSimpleSearch(query: string, context: RAGContext): Promise<RAGSearchResult[]> {
    try {
      console.log(`🔍 Performing enhanced simple search fallback for: "${query}"`);
      
      // Parse query into search terms
      const searchTerms = query.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 2)
        .slice(0, 10); // Limit search terms
      
      if (searchTerms.length === 0) {
        return [];
      }
      
      // Search documents with multiple term matching
      const documents = await db.select({
        id: schema.documents.id,
        title: schema.documents.title,
        content: schema.documents.content,
        userId: schema.documents.userId
      }).from(schema.documents)
      .where(eq(schema.documents.userId, context.userId || 2))
      .limit(10);
      
      const results: RAGSearchResult[] = [];
      
      for (const doc of documents) {
        // Check title relevance
        const titleMatches = searchTerms.filter(term => 
          doc.title.toLowerCase().includes(term)
        ).length;
        
        // Check content relevance
        let contentMatches = 0;
        let relevantExcerpt = '';
        
        try {
          let content: any = doc.content;
          if (typeof content === 'string') {
            try {
              content = JSON.parse(content);
            } catch (e) {
              // Keep as string if not JSON
            }
          }
          
          let searchableText = '';
          if (typeof content === 'object' && content && content.chapters) {
            // Extract text from structured content
            searchableText = content.chapters.map((chapter: any) => {
              if (chapter.paragraphs) {
                return chapter.paragraphs.map((p: any) => p.text || p.content || '').join(' ');
              }
              return JSON.stringify(chapter);
            }).join(' ');
          } else {
            searchableText = content.toString();
          }
          
          const lowerText = searchableText.toLowerCase();
          contentMatches = searchTerms.filter(term => 
            lowerText.includes(term)
          ).length;
          
          // Extract relevant excerpt around matching terms
          const firstMatchTerm = searchTerms.find(term => lowerText.includes(term));
          if (firstMatchTerm) {
            const matchIndex = lowerText.indexOf(firstMatchTerm);
            const excerptStart = Math.max(0, matchIndex - 150);
            const excerptEnd = Math.min(searchableText.length, matchIndex + 300);
            relevantExcerpt = searchableText.substring(excerptStart, excerptEnd);
          } else {
            relevantExcerpt = searchableText.substring(0, 200);
          }
          
        } catch (error) {
          console.warn(`Error processing document ${doc.id} content:`, error);
          relevantExcerpt = doc.content.toString().substring(0, 200);
        }
        
        // Calculate simple relevance score
        const totalMatches = titleMatches * 2 + contentMatches; // Weight title matches more
        const maxPossibleMatches = searchTerms.length * 3; // Max if all terms match title and content
        const relevanceScore = Math.min(totalMatches / maxPossibleMatches + 0.1, 1.0); // Add base score
        
        if (relevanceScore > 0.1) { // Very low threshold for fallback
          results.push({
            id: `doc_${doc.id}`,
            content: relevantExcerpt,
            relevanceScore,
            semanticSimilarity: relevanceScore * 0.8,
            contextualRelevance: relevanceScore,
            source: {
              type: 'document',
              id: doc.id,
              title: doc.title
            },
            highlightedSnippets: [relevantExcerpt],
            relatedConcepts: [],
            suggestedQuestions: [],
            ragScore: relevanceScore,
            documentTitle: doc.title,
            documentType: 'document' as const,
            excerpt: relevantExcerpt,
            relevantPassages: [relevantExcerpt],
            crossReferences: []
          });
        }
      }
      
      // Sort by relevance and return top results
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
        
    } catch (error) {
      console.error(`❌ Simple search fallback failed: ${error}`);
      return [];
    }
  }
}

// Create and export singleton instance
export const documentRAGService = new DocumentRAGService();