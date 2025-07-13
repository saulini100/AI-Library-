import { SemanticSearchService } from './semantic-search-service';
import { QueryResultCacheService, CachedQueryResult, QueryContext, SearchParameters } from './query-result-cache-service';

export interface EnhancedSearchResult {
  results: any[];
  performance: {
    totalTime: number;
    embeddingCacheHits: number;
    embeddingCacheMisses: number;
    queryCache: {
      hit: boolean;
      source: 'exact' | 'fuzzy' | 'fresh';
      responseTime: number;
      hitCount?: number;
    };
    breakdown: {
      queryCache: number;
      search: number;
      embedding: number;
    };
  };
  cacheStats: {
    embedding: any;
    query: any;
  };
}

export class EnhancedSemanticSearchService {
  private semanticSearchService: SemanticSearchService;
  private queryResultCacheService: QueryResultCacheService;

  constructor() {
    this.semanticSearchService = new SemanticSearchService();
    this.queryResultCacheService = new QueryResultCacheService();
  }

  /**
   * Enhanced search with dual-layer caching
   */
  async search(
    query: string,
    context: QueryContext,
    options: {
      maxResults?: number;
      includeMemories?: boolean;
      includeAnnotations?: boolean;
      semanticExpansion?: boolean;
      singleDocumentOnly?: boolean;
    } = {}
  ): Promise<EnhancedSearchResult> {
    console.log(`[EnhancedSemanticSearchService] Starting enhanced search for query: "${query}"`);
    const totalStartTime = Date.now();
    
    // Step 1: Prepare search parameters
    const searchParams: SearchParameters = {
      includeMemories: options.includeMemories || false,
      includeAnnotations: options.includeAnnotations || false,
      semanticExpansion: options.semanticExpansion || true,
      useEmbeddings: true,
      maxResults: options.maxResults || 5,
      relevanceThreshold: 0.6
    };

    const queryStartTime = Date.now();

    // Step 2: Try query result cache first
    const cachedResult = await this.queryResultCacheService.getCachedResults(
      query,
      context,
      searchParams
    );

    const queryTime = Date.now() - queryStartTime;

    if (cachedResult) {
      // Return cached results immediately
      return {
        results: cachedResult.results,
        performance: {
          totalTime: Date.now() - totalStartTime,
          embeddingCacheHits: 0, // Not needed for cached results
          embeddingCacheMisses: 0,
          queryCache: {
            hit: true,
            source: cachedResult.source === 'cache' ? 'exact' : 'fuzzy',
            responseTime: cachedResult.responseTime,
            hitCount: cachedResult.hitCount
          },
          breakdown: {
            queryCache: queryTime,
            search: 0,
            embedding: 0
          }
        },
        cacheStats: {
          embedding: {}, // Will be filled for fresh searches
          query: this.queryResultCacheService.getCacheStats()
        }
      };
    }

    // Step 3: Perform fresh search using existing semantic search service
    const searchStartTime = Date.now();
    
    // Convert QueryContext to SearchContext
    const searchContext = {
      userId: context.userId,
      currentDocument: context.documentId,
      currentChapter: context.chapter,
      recentQueries: [],
      userExpertiseLevel: 5,
      preferredTopics: []
    };

    const searchResults = await this.semanticSearchService.search(
      query,
      searchContext,
      {
        maxResults: searchParams.maxResults,
        includeMemories: searchParams.includeMemories,
        includeAnnotations: searchParams.includeAnnotations,
        semanticExpansion: searchParams.semanticExpansion,
        useEmbeddings: searchParams.useEmbeddings,
        singleDocumentOnly: options.singleDocumentOnly
      }
    );

    const searchTime = Date.now() - searchStartTime;

    // Step 4: Store results in query cache for future use
    await this.queryResultCacheService.storeResults(
      query,
      context,
      searchParams,
      searchResults
    );

    // Step 5: Get cache statistics
    const embeddingStats = this.semanticSearchService.getSearchAnalytics();
    const queryStats = this.queryResultCacheService.getCacheStats();

    // Step 6: Return enhanced results with performance tracking
    return {
      results: searchResults,
      performance: {
        totalTime: Date.now() - totalStartTime,
        embeddingCacheHits: embeddingStats?.totalSearches || 0,
        embeddingCacheMisses: 0,
        queryCache: {
          hit: false,
          source: 'fresh',
          responseTime: queryTime,
          hitCount: 0
        },
        breakdown: {
          queryCache: queryTime,
          search: searchTime,
          embedding: 0
        }
      },
      cacheStats: {
        embedding: embeddingStats || {},
        query: queryStats
      }
    };
  }

  /**
   * Progressive search - show cached results immediately, then update with fresh results if needed
   */
  async progressiveSearch(
    query: string,
    context: QueryContext,
    options: {
      maxResults?: number;
      includeMemories?: boolean;
      includeAnnotations?: boolean;
      semanticExpansion?: boolean;
    } = {},
    onProgress?: (results: EnhancedSearchResult, stage: 'cached' | 'fresh') => void
  ): Promise<EnhancedSearchResult> {
    const searchParams: SearchParameters = {
      includeMemories: options.includeMemories || false,
      includeAnnotations: options.includeAnnotations || false,
      semanticExpansion: options.semanticExpansion || true,
      useEmbeddings: true,
      maxResults: options.maxResults || 10,
      relevanceThreshold: 0.3
    };

    // First try cached results
    const cachedResult = await this.queryResultCacheService.getCachedResults(
      query,
      context,
      searchParams
    );

    if (cachedResult && onProgress) {
      // Show cached results immediately
      const cachedSearchResult: EnhancedSearchResult = {
        results: cachedResult.results,
        performance: {
          totalTime: cachedResult.responseTime,
          embeddingCacheHits: 0,
          embeddingCacheMisses: 0,
          queryCache: {
            hit: true,
            source: cachedResult.source === 'cache' ? 'exact' : 'fuzzy',
            responseTime: cachedResult.responseTime,
            hitCount: cachedResult.hitCount
          },
          breakdown: {
            queryCache: cachedResult.responseTime,
            search: 0,
            embedding: 0
          }
        },
        cacheStats: {
          embedding: {},
          query: this.queryResultCacheService.getCacheStats()
        }
      };

      onProgress(cachedSearchResult, 'cached');

      // For exact cache hits, we can return immediately
      if (cachedResult.source === 'cache') {
        return cachedSearchResult;
      }
    }

    // Perform fresh search (either no cache or fuzzy match that should be updated)
    return await this.search(query, context, options);
  }

  /**
   * Batch search for multiple queries
   */
  async batchSearch(
    queries: Array<{
      query: string;
      context: QueryContext;
      options?: any;
    }>
  ): Promise<EnhancedSearchResult[]> {
    const results: EnhancedSearchResult[] = [];
    
    // Process queries in parallel where possible
    const searchPromises = queries.map(({ query, context, options }) =>
      this.search(query, context, options)
    );

    const batchResults = await Promise.all(searchPromises);
    return batchResults;
  }

  /**
   * Get comprehensive cache statistics
   */
  async getPerformanceStats(): Promise<{
    embedding: any;
    query: any;
    queryDetails: any;
    combined: {
      totalRequests: number;
      totalCacheHits: number;
      overallHitRate: string;
      averageResponseTime: number;
    };
  }> {
    const embeddingStats = this.semanticSearchService.getSearchAnalytics();
    const queryStats = this.queryResultCacheService.getCacheStats();
    const queryDetails = await this.queryResultCacheService.getCacheInfo();

    // Calculate combined metrics
    const totalRequests = queryStats.totalRequests;
    const totalCacheHits = queryStats.hits + queryStats.fuzzyMatches + (embeddingStats?.totalSearches || 0);
    const overallHitRate = totalRequests > 0 
      ? ((totalCacheHits / totalRequests) * 100).toFixed(1) + '%'
      : '0.0%';

    return {
      embedding: embeddingStats || {},
      query: queryStats,
      queryDetails,
      combined: {
        totalRequests,
        totalCacheHits,
        overallHitRate,
        averageResponseTime: 0 // Would need to track this separately
      }
    };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await Promise.all([
      this.semanticSearchService.clearCache(),
      this.queryResultCacheService.clearCache()
    ]);
    console.log('🗑️ Cleared all search caches (embedding + query)');
  }

  /**
   * Invalidate caches for specific context
   */
  async invalidateContext(userId: number, documentId?: number): Promise<void> {
    await this.queryResultCacheService.invalidateContext(userId, documentId);
    console.log(`🔄 Invalidated query cache for user ${userId}, document ${documentId || 'all'}`);
  }

  /**
   * Search suggestions based on cached queries
   */
  async getSearchSuggestions(
    partialQuery: string,
    context: QueryContext,
    limit = 5
  ): Promise<Array<{ query: string; hitCount: number; lastUsed: string }>> {
    const queryDetails = await this.queryResultCacheService.getCacheInfo();
    
    const suggestions = queryDetails.topQueries
      .filter(entry => 
        entry.query.toLowerCase().includes(partialQuery.toLowerCase()) ||
        partialQuery.toLowerCase().includes(entry.query.toLowerCase())
      )
      .slice(0, limit);

    return suggestions;
  }

  /**
   * Warm up cache with common queries
   */
  async warmupCache(
    commonQueries: Array<{
      query: string;
      context: QueryContext;
      options?: any;
    }>
  ): Promise<void> {
    console.log(`🔥 Warming up cache with ${commonQueries.length} common queries...`);
    
    for (const { query, context, options } of commonQueries) {
      try {
        await this.search(query, context, options);
        console.log(`✅ Warmed up: "${query}"`);
      } catch (error) {
        console.error(`❌ Failed to warm up "${query}":`, error);
      }
    }
    
    console.log('🔥 Cache warmup completed');
  }
} 