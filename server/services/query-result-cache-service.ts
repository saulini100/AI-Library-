import crypto from 'crypto';
import { db } from '../db.js';
import { queryResultCache } from '@shared/schema';
import { eq, and, sql, desc, lt, inArray } from 'drizzle-orm';

export interface CachedQueryResult {
  results: any[];
  cacheHit: boolean;
  responseTime: number;
  hitCount: number;
  source: 'cache' | 'fresh';
}

export interface QueryContext {
  userId: number;
  documentId?: number;
  chapter?: number;
}

export interface SearchParameters {
  includeMemories?: boolean;
  includeAnnotations?: boolean;
  semanticExpansion?: boolean;
  useEmbeddings?: boolean;
  maxResults?: number;
  relevanceThreshold?: number;
}

export class QueryResultCacheService {
  private cacheStats = {
    hits: 0,
    misses: 0,
    fuzzyMatches: 0,
    totalRequests: 0
  };

  private maxCacheSize = 10000; // Maximum number of cached entries
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Generate a unique hash for a query and its context
   */
  private generateQueryHash(query: string, context: QueryContext, params: SearchParameters): string {
    const keyData = {
      query: this.normalizeQuery(query),
      userId: context.userId,
      documentId: context.documentId || null,
      chapter: context.chapter || null,
      params: {
        includeMemories: params.includeMemories || false,
        includeAnnotations: params.includeAnnotations || false,
        semanticExpansion: params.semanticExpansion || false,
        useEmbeddings: params.useEmbeddings || false,
        maxResults: params.maxResults || 10,
        relevanceThreshold: params.relevanceThreshold || 0.7
      }
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Generate context hash for fuzzy matching
   */
  private generateContextHash(context: QueryContext): string {
    const contextData = {
      userId: context.userId,
      documentId: context.documentId || null,
      chapter: context.chapter || null
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(contextData)).digest('hex');
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Calculate similarity between two queries with improved logic
   */
  private calculateQuerySimilarity(query1: string, query2: string): number {
    const words1 = query1.toLowerCase().split(' ').filter(word => word.length > 2);
    const words2 = query2.toLowerCase().split(' ').filter(word => word.length > 2);
    
    // Filter out common stop words that don't add meaning
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'what', 'when', 'where', 'why', 'how', 'who', 'which', 'that', 'this', 'these', 'those'];
    
    const filteredWords1 = words1.filter(word => !stopWords.includes(word));
    const filteredWords2 = words2.filter(word => !stopWords.includes(word));
    
    if (filteredWords1.length === 0 || filteredWords2.length === 0) {
      return 0; // No meaningful words to compare
    }
    
    const commonWords = filteredWords1.filter(word => filteredWords2.includes(word));
    const totalWords = new Set([...filteredWords1, ...filteredWords2]).size;
    
    // Require at least 2 meaningful words to match for similarity
    if (commonWords.length < 2) {
      return 0;
    }
    
    const similarity = commonWords.length / totalWords;
    
    // Additional penalty for very different query lengths
    const lengthDiff = Math.abs(filteredWords1.length - filteredWords2.length);
    const maxLength = Math.max(filteredWords1.length, filteredWords2.length);
    const lengthPenalty = lengthDiff / maxLength;
    
    return Math.max(0, similarity - lengthPenalty * 0.3);
  }

  /**
   * Find fuzzy matches for similar queries
   */
  private async findFuzzyMatches(
    normalizedQuery: string, 
    contextHash: string, 
    userId: number,
    threshold = 0.8,
    context?: QueryContext
  ): Promise<any[]> {
    try {
      // Build query conditions - prioritize exact document/chapter matches
      const conditions = [eq(queryResultCache.userId, userId)];
      
      // If we have document context, prioritize exact matches
      if (context?.documentId) {
        // First try to find matches from the same document
        const sameDocumentCandidates = await db
          .select()
          .from(queryResultCache)
          .where(eq(queryResultCache.userId, userId))
          .orderBy(desc(queryResultCache.last_accessed_at))
          .limit(50);

        // Filter candidates that contain the document ID in their hash
        const sameDocumentMatches = sameDocumentCandidates.filter(candidate => {
          try {
            const keyData = JSON.parse(Buffer.from(candidate.query_hash, 'base64').toString());
            const isSameDocument = keyData.documentId === context.documentId?.toString();
            if (isSameDocument) {
              const similarity = this.calculateQuerySimilarity(normalizedQuery, candidate.query_text);
              return similarity >= threshold;
            }
            return false;
          } catch (error) {
            // Skip invalid cache entries
            return false;
          }
        });

        if (sameDocumentMatches.length > 0) {
          return sameDocumentMatches.sort((a, b) => {
            const simA = this.calculateQuerySimilarity(normalizedQuery, a.query_text);
            const simB = this.calculateQuerySimilarity(normalizedQuery, b.query_text);
            return simB - simA; // Best match first
          });
        }
      }

      // Fallback to general fuzzy matching (but with lower threshold for cross-document)
      const candidates = await db
        .select()
        .from(queryResultCache)
        .where(
          and(
            eq(queryResultCache.userId, userId)
          )
        )
        .orderBy(desc(queryResultCache.last_accessed_at))
        .limit(30); // Reduced from 50 to be more conservative

      const matches = candidates.filter(candidate => {
        const similarity = this.calculateQuerySimilarity(normalizedQuery, candidate.query_text);
        // Use much higher threshold to avoid false positives
        return similarity >= (context?.documentId ? threshold + 0.05 : threshold + 0.1);
      });

      return matches.sort((a, b) => {
        const simA = this.calculateQuerySimilarity(normalizedQuery, a.query_text);
        const simB = this.calculateQuerySimilarity(normalizedQuery, b.query_text);
        return simB - simA; // Best match first
      });
    } catch (error) {
      console.error('Error finding fuzzy matches:', error);
      return [];
    }
  }

  /**
   * Get cached query results with fuzzy matching
   */
  async getCachedResults(
    query: string,
    context: QueryContext,
    params: SearchParameters
  ): Promise<CachedQueryResult | null> {
    const startTime = Date.now();
    this.cacheStats.totalRequests++;

    const normalizedQuery = this.normalizeQuery(query);
    const queryHash = this.generateQueryHash(normalizedQuery, context, params);
    const contextHash = this.generateContextHash(context);

    try {
      // Try exact match first
      const exactMatch = await db
        .select()
        .from(queryResultCache)
        .where(eq(queryResultCache.query_hash, queryHash))
        .limit(1);

      if (exactMatch.length > 0) {
        const cached = exactMatch[0];
        
        // Update access count and last accessed
        await db
          .update(queryResultCache)
          .set({ 
            last_accessed_at: new Date(),
            access_count: (cached.access_count || 0) + 1
          })
          .where(eq(queryResultCache.id, cached.id));

        this.cacheStats.hits++;
        const responseTime = Date.now() - startTime;

        console.log(`🚀 Query cache EXACT HIT for "${query}" (${responseTime}ms, hit #${cached.access_count + 1})`);

        return {
          results: JSON.parse(cached.result),
          cacheHit: true,
          responseTime,
          hitCount: cached.access_count + 1,
          source: 'cache'
        };
      }

      // Try fuzzy matching for similar queries with higher threshold
      const fuzzyMatches = await this.findFuzzyMatches(normalizedQuery, contextHash, context.userId, 0.9, context);
      
      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        const similarity = this.calculateQuerySimilarity(normalizedQuery, bestMatch.query_text);
        
        // Update access count for fuzzy match
        await db
          .update(queryResultCache)
          .set({ 
            last_accessed_at: new Date(),
            access_count: (bestMatch.access_count || 0) + 1
          })
          .where(eq(queryResultCache.id, bestMatch.id));

        this.cacheStats.fuzzyMatches++;
        const responseTime = Date.now() - startTime;

        console.log(`🎯 Query cache FUZZY HIT for "${query}" → "${bestMatch.query_text}" (${(similarity * 100).toFixed(1)}% similar, ${responseTime}ms)`);
        console.log(`⚠️ WARNING: Fuzzy cache hit may be returning stale results for different questions!`);

        return {
          results: JSON.parse(bestMatch.result),
          cacheHit: true,
          responseTime,
          hitCount: bestMatch.access_count + 1,
          source: 'cache'
        };
      }

      // No cache hit
      this.cacheStats.misses++;
      console.log(`🔄 Query cache MISS for "${query}"`);
      return null;

    } catch (error) {
      console.error('Error getting cached results:', error);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Store query results in cache
   */
  async storeResults(
    query: string,
    context: QueryContext,
    params: SearchParameters,
    results: any[]
  ): Promise<void> {
    try {
      const normalizedQuery = this.normalizeQuery(query);
      const queryHash = this.generateQueryHash(normalizedQuery, context, params);
      const contextHash = this.generateContextHash(context);

      // Clean up old entries if approaching limit
      await this.cleanupOldEntries();

      // Limit results to prevent parameter overflow (store only top 10)
      const limitedResults = results.slice(0, 10);
      const wasTruncated = results.length > 10;

      // Prepare metadata with search parameters and result info
      const metadata = {
        includeMemories: params.includeMemories,
        includeAnnotations: params.includeAnnotations,
        semanticExpansion: params.semanticExpansion,
        useEmbeddings: params.useEmbeddings,
        maxResults: params.maxResults,
        relevanceThreshold: params.relevanceThreshold,
        originalResultCount: results.length,
        wasTruncated
      };

      // Before inserting, check if the query hash already exists
      const existing = await db
        .select()
        .from(queryResultCache)
        .where(eq(queryResultCache.query_hash, queryHash))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(queryResultCache)
          .set({
            result: JSON.stringify(limitedResults),
            metadata: metadata,
            last_accessed_at: new Date(),
          })
          .where(eq(queryResultCache.query_hash, queryHash));
        console.log(`📝 Updated query result cache for hash: ${queryHash}${wasTruncated ? ' (truncated to 10 results)' : ''}`);
      } else {
        // Insert new record
        await db
          .insert(queryResultCache)
          .values({
            query_hash: queryHash,
            query_text: query.substring(0, 500), // Limit query length
            userId: context.userId,
            model: 'semantic-search',
            result: JSON.stringify(limitedResults),
            metadata: metadata,
            embedding: null
          });
        console.log(`🆕 Inserted new query result cache for hash: ${queryHash}${wasTruncated ? ' (truncated to 10 results)' : ''}`);
      }

    } catch (error) {
      console.error('Error storing query results:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Clean up old cache entries to maintain performance
   */
  private async cleanupOldEntries(): Promise<void> {
    try {
      // Get current cache size
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(queryResultCache);

      const currentSize = countResult[0]?.count || 0;

      if (currentSize >= this.maxCacheSize) {
        console.log(`🧹 Cache cleanup: ${currentSize} entries, removing oldest 20%`);
        
        // Get the oldest 20% of entries
        const entriesToRemove = Math.floor(this.maxCacheSize * 0.2);
          const oldEntries = await db
            .select({ id: queryResultCache.id })
            .from(queryResultCache)
          .orderBy(queryResultCache.last_accessed_at)
          .limit(entriesToRemove);

        // Delete old entries in batches
            for (const entry of oldEntries) {
              await db.delete(queryResultCache).where(eq(queryResultCache.id, entry.id));
        }

        console.log(`✅ Removed ${oldEntries.length} old cache entries`);
      }

      // Also remove entries older than TTL
      const cutoffTime = new Date(Date.now() - this.defaultTTL);
      const deleted = await db
        .delete(queryResultCache)
        .where(lt(queryResultCache.created_at, cutoffTime));

      if (deleted.changes > 0) {
        console.log(`🕐 Removed ${deleted.changes} expired cache entries`);
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? (this.cacheStats.hits + this.cacheStats.fuzzyMatches) / this.cacheStats.totalRequests * 100 
      : 0;

    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    try {
      await db.delete(queryResultCache);
      console.log('🗑️ Cleared all query result cache entries');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Clear cache for specific user to force fresh responses
   */
  async clearCacheForUser(userId: number): Promise<void> {
    try {
      const deleted = await db
        .delete(queryResultCache)
        .where(eq(queryResultCache.userId, userId));
      console.log(`🧹 Cleared cache for user ${userId}: ${deleted.changes} entries`);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<{
    totalEntries: number;
    averageResultCount: number;
    topQueries: Array<{ query: string; hitCount: number; lastUsed: string }>;
    oldestEntry?: string;
    newestEntry?: string;
  }> {
    try {
      // Get total count without selecting all entries
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(queryResultCache);
      
      const totalEntries = countResult[0]?.count || 0;
      
      // Get sample entries for calculations
      const sampleEntries = await db
        .select({ 
          result: queryResultCache.result,
          created_at: queryResultCache.created_at
        })
        .from(queryResultCache)
        .limit(100); // Sample 100 entries for average calculation
      
      let averageResultCount = 0;
      if (sampleEntries.length > 0) {
        const resultCounts = sampleEntries.map(entry => {
          try {
            const results = JSON.parse(entry.result);
            return Array.isArray(results) ? results.length : 0;
          } catch {
            return 0;
          }
        });
        averageResultCount = resultCounts.reduce((sum, count) => sum + count, 0) / resultCounts.length;
      }

      const topQueries = await db
        .select({
          query: queryResultCache.query_text,
          hitCount: queryResultCache.access_count,
          lastUsed: queryResultCache.last_accessed_at
        })
        .from(queryResultCache)
        .orderBy(desc(queryResultCache.access_count))
        .limit(10);

      // Get time range from sample
      const timestamps = sampleEntries.map(e => {
        // Handle both Date objects and timestamps
        return e.created_at instanceof Date ? e.created_at.getTime() / 1000 : e.created_at;
      });
      
      const oldest = timestamps.length > 0 ? Math.min(...timestamps) : null;
      const newest = timestamps.length > 0 ? Math.max(...timestamps) : null;

      return {
        totalEntries,
        averageResultCount: Math.round(averageResultCount * 100) / 100,
        topQueries: topQueries.map(q => ({
          query: q.query,
          hitCount: q.hitCount,
          lastUsed: q.lastUsed instanceof Date ? q.lastUsed.toISOString() : new Date(q.lastUsed * 1000).toISOString()
        })),
        oldestEntry: oldest ? new Date(oldest * 1000).toISOString() : undefined,
        newestEntry: newest ? new Date(newest * 1000).toISOString() : undefined
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        totalEntries: 0,
        averageResultCount: 0,
        topQueries: []
      };
    }
  }

  /**
   * Invalidate cache entries for a specific context
   */
  async invalidateContext(userId: number, documentId?: number): Promise<void> {
    try {
      if (documentId) {
        // Try to clear cache entries for specific document
        console.log(`🗑️ Clearing cache entries for user ${userId}, document ${documentId}`);
        
        // First, get all cache entries for the user
        const userEntries = await db
          .select({ id: queryResultCache.id, query_hash: queryResultCache.query_hash })
          .from(queryResultCache)
          .where(eq(queryResultCache.userId, userId));
        
        // Filter entries that contain the document ID in their hash
        const entriesToDelete = userEntries.filter(entry => {
          try {
            const keyData = JSON.parse(Buffer.from(entry.query_hash, 'base64').toString());
            return keyData.documentId === documentId.toString();
          } catch (error) {
            // Skip invalid cache entries
            return false;
          }
        });
        
        // Delete the filtered entries
        if (entriesToDelete.length > 0) {
          const entryIds = entriesToDelete.map(entry => entry.id);
          
          // Delete in batches to avoid parameter limits
          const batchSize = 100;
          for (let i = 0; i < entryIds.length; i += batchSize) {
            const batch = entryIds.slice(i, i + batchSize);
            await db
              .delete(queryResultCache)
              .where(inArray(queryResultCache.id, batch));
          }
          
          console.log(`✅ Cleared ${entriesToDelete.length} cache entries for user ${userId}, document ${documentId}`);
        } else {
          console.log(`ℹ️ No cache entries found for user ${userId}, document ${documentId}`);
        }
      } else {
        // Clear all cache entries for the user
        console.log(`🗑️ Clearing all cache entries for user ${userId}`);
        
        const deleted = await db
          .delete(queryResultCache)
          .where(eq(queryResultCache.userId, userId));

        console.log(`✅ Cleared ${deleted.changes} cache entries for user ${userId}`);
      }
    } catch (error) {
      console.error('Error invalidating context cache:', error);
      throw error;
    }
  }
} 