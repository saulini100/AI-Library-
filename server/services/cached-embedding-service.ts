import crypto from 'crypto';
import { Ollama } from 'ollama';
import { db } from '../db';
import { embeddingCache, documents } from '../../shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export interface CachedEmbeddingResult {
  embedding: number[];
  cacheHit: boolean;
  responseTime: number;
}

export class CachedEmbeddingService {
  private ollama: Ollama;
  private model: string;
  private maxCacheSize: number;
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  constructor(model = 'nomic-embed-text:v1.5', maxCacheSize = 10000) {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
    this.model = model;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
  }

  /**
   * Get or generate embedding with caching
   */
  async getEmbedding(
    content: string,
    documentId?: number,
    chapter?: number,
    paragraph?: number
  ): Promise<CachedEmbeddingResult> {
    const startTime = Date.now();
    this.cacheStats.totalRequests++;

    const contentHash = this.generateContentHash(content);

    try {
      // Try to get from cache first
      const cached = await db
        .select()
        .from(embeddingCache)
        .where(
          and(
            eq(embeddingCache.text_hash, contentHash),
            eq(embeddingCache.model, this.model)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        // Cache hit! Update last used timestamp
        await db
          .update(embeddingCache)
          .set({ last_accessed_at: new Date() })
          .where(eq(embeddingCache.id, cached[0].id));

        this.cacheStats.hits++;
        const responseTime = Date.now() - startTime;

        console.log(`🚀 Embedding cache HIT for hash ${contentHash.substring(0, 8)}... (${responseTime}ms)`);

        return {
          embedding: JSON.parse(cached[0].embedding),
          cacheHit: true,
          responseTime
        };
      }

      // Cache miss - generate new embedding
      console.log(`🔄 Embedding cache MISS for hash ${contentHash.substring(0, 8)}... Generating new embedding...`);
      
      const embeddingResponse = await this.ollama.embeddings({
        model: this.model,
        prompt: content
      });
      const embedding = embeddingResponse.embedding;
      const responseTime = Date.now() - startTime;

      // Store in cache (with cleanup if needed)
      await this.storeInCache(
        contentHash,
        content,
        embedding,
        documentId,
        chapter,
        paragraph
      );

      this.cacheStats.misses++;

      return {
        embedding,
        cacheHit: false,
        responseTime
      };

    } catch (error) {
      console.error('Error in cached embedding service:', error);
      // Fallback to direct generation
      const embeddingResponse = await this.ollama.embeddings({
        model: this.model,
        prompt: content
      });
      return {
        embedding: embeddingResponse.embedding,
        cacheHit: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Store embedding in cache with automatic cleanup
   */
  private async storeInCache(
    contentHash: string,
    content: string,
    embedding: number[],
    documentId?: number,
    chapter?: number,
    paragraph?: number
  ): Promise<void> {
    try {
      // Check if we need to clean up old entries
      await this.cleanupOldEntries();

      // Use INSERT OR IGNORE to handle duplicate inserts gracefully
      // This prevents UNIQUE constraint violations when multiple requests
      // try to insert the same content hash simultaneously
      await db.insert(embeddingCache).values({
        userId: 2, // Default user ID (fixed)
        text_hash: contentHash,
        embedding: JSON.stringify(embedding),
        model: this.model
      }).onConflictDoNothing(); // This is the equivalent of INSERT OR IGNORE

      console.log(`💾 Cached embedding for hash ${contentHash.substring(0, 8)}...`);

    } catch (error) {
      console.error('Error storing embedding in cache:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Clean up old cache entries when approaching max size
   */
  private async cleanupOldEntries(): Promise<void> {
    try {
      const cacheCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(embeddingCache);

      const count = cacheCount[0]?.count || 0;

      if (count >= this.maxCacheSize) {
        // Remove oldest 20% of entries
        const removeCount = Math.floor(this.maxCacheSize * 0.2);
        
        const oldEntries = await db
          .select({ id: embeddingCache.id })
          .from(embeddingCache)
          .orderBy(embeddingCache.last_accessed_at)
          .limit(removeCount);

        if (oldEntries.length > 0) {
          const idsToRemove = oldEntries.map(entry => entry.id);
          
          for (const id of idsToRemove) {
            await db.delete(embeddingCache).where(eq(embeddingCache.id, id));
          }

          console.log(`🧹 Cleaned up ${idsToRemove.length} old embedding cache entries`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(1)
      : '0.0';

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Clear all cache entries (for testing/debugging)
   */
  async clearCache(): Promise<void> {
    try {
      await db.delete(embeddingCache);
      console.log('🗑️ Cleared all embedding cache entries');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache size information
   */
  async getCacheInfo(): Promise<{
    totalEntries: number;
    modelBreakdown: Record<string, number>;
    oldestEntry?: string;
    newestEntry?: string;
  }> {
    try {
      // Get total count efficiently
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(embeddingCache);
      
      const totalEntries = countResult[0]?.count || 0;
      
      // Get model breakdown from a sample
      const sampleEntries = await db
        .select({ model: embeddingCache.model })
        .from(embeddingCache)
        .limit(1000); // Sample 1000 entries for model breakdown
      
      const modelBreakdown: Record<string, number> = {};
      sampleEntries.forEach(entry => {
        modelBreakdown[entry.model] = (modelBreakdown[entry.model] || 0) + 1;
      });
      
      // Scale up the counts based on sample ratio
      const sampleRatio = totalEntries / sampleEntries.length;
      Object.keys(modelBreakdown).forEach(model => {
        modelBreakdown[model] = Math.round(modelBreakdown[model] * sampleRatio);
      });

      // Get oldest and newest from a sample
      const timeSample = await db
        .select({ created_at: embeddingCache.created_at })
        .from(embeddingCache)
        .orderBy(embeddingCache.created_at)
        .limit(1000); // Sample for time range

      const oldest = timeSample.length > 0 ? timeSample[0]?.created_at : null;
      const newest = timeSample.length > 0 ? timeSample[timeSample.length - 1]?.created_at : null;

      return {
        totalEntries,
        modelBreakdown,
        oldestEntry: oldest ? (oldest instanceof Date ? oldest.toISOString() : oldest) : undefined,
        newestEntry: newest ? (newest instanceof Date ? newest.toISOString() : newest) : undefined
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        totalEntries: 0,
        modelBreakdown: {}
      };
    }
  }

  /**
   * Batch get or generate embeddings with caching
   */
  async getEmbeddingsBatch(
    contents: string[],
    documentIds?: (number | undefined)[],
    chapters?: (number | undefined)[],
    paragraphs?: (number | undefined)[]
  ): Promise<CachedEmbeddingResult[]> {
    const startTime = Date.now();
    this.cacheStats.totalRequests += contents.length;

    // Prepare hashes and look up cache
    const hashes = contents.map(c => this.generateContentHash(c));

    // Batch the cache lookup to avoid exceeding parameter limits
    const BATCH_SIZE = 10; // Reduce to 10 for safety
    let cachedResults: any[] = [];
    for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
      const batch = hashes.slice(i, i + BATCH_SIZE);
      console.log(`🔎 Cache lookup batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(hashes.length / BATCH_SIZE)} (${batch.length} items)`);
      // Use inArray helper for parameterized IN clause
      const batchResults = await db
        .select()
        .from(embeddingCache)
        .where(
          and(
            inArray(embeddingCache.text_hash, batch),
            eq(embeddingCache.model, this.model)
          )
        );
      cachedResults = cachedResults.concat(batchResults);
    }

    // Map of hash to embedding
    const cachedMap = new Map<string, any>();
    for (const entry of cachedResults) {
      cachedMap.set(entry.text_hash, entry);
    }

    // Prepare results and missing indices
    const results: CachedEmbeddingResult[] = [];
    const missingIndices: number[] = [];
    const missingContents: string[] = [];
    for (let i = 0; i < contents.length; i++) {
      const hash = hashes[i];
      if (cachedMap.has(hash)) {
        this.cacheStats.hits++;
        results[i] = {
          embedding: JSON.parse(cachedMap.get(hash).embedding),
          cacheHit: true,
          responseTime: 0 // Will update below
        };
        // Update last used timestamp
        db.update(embeddingCache)
          .set({ last_accessed_at: new Date() })
          .where(eq(embeddingCache.id, cachedMap.get(hash).id));
      } else {
        missingIndices.push(i);
        missingContents.push(contents[i]);
      }
    }

    // If there are missing, batch embed
    if (missingContents.length > 0) {
      const OLLAMA_BATCH_SIZE = 10; // Reduce to 10 for safety
      const allEmbeddings: number[][] = [];
      
      // Process missing contents in batches
      for (let i = 0; i < missingContents.length; i += OLLAMA_BATCH_SIZE) {
        const batch = missingContents.slice(i, i + OLLAMA_BATCH_SIZE);
        console.log(`🔄 Generating embeddings for batch ${Math.floor(i / OLLAMA_BATCH_SIZE) + 1}/${Math.ceil(missingContents.length / OLLAMA_BATCH_SIZE)} (${batch.length} items)`);
        
        // FIX: Send one string at a time for prompt to avoid backend error
        for (const content of batch) {
          const embeddingResponse = await this.ollama.embeddings({
            model: this.model,
            prompt: content
          });
          allEmbeddings.push(embeddingResponse.embedding as number[]);
        }
      }
      
      // Process results
      for (let j = 0; j < missingIndices.length; j++) {
        const idx = missingIndices[j];
        const emb = allEmbeddings[j];
        const embArray = Array.isArray(emb) ? emb : [emb];
        results[idx] = {
          embedding: embArray,
          cacheHit: false,
          responseTime: Date.now() - startTime
        };
        // Store in cache
        await this.storeInCache(
          hashes[idx],
          contents[idx],
          embArray,
          documentIds?.[idx],
          chapters?.[idx],
          paragraphs?.[idx]
        );
        this.cacheStats.misses++;
      }
    }

    // Fill in response times for cache hits
    const totalTime = Date.now() - startTime;
    for (const r of results) {
      if (r && r.cacheHit) r.responseTime = totalTime;
    }

    return results;
  }
} 