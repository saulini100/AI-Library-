import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface Memory {
  id: string;
  userId: number;
  content: string;
  category: string;
  metadata?: any;
  embedding?: Buffer;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MemoryPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  examples: string[];
}

export interface UserProfile {
  userId: number;
  favoriteBooks: string[];
  commonThemes: string[];
  studyTimes: string[];
  annotationFrequency: number;
  averageSessionLength: number;
  preferredTopics: string[];
}

interface QueryPerformanceMetrics {
  operation: string;
  duration: number;
  rowsAffected: number;
  timestamp: Date;
}

export class LocalMemoryService {
  private static instance: LocalMemoryService;

  private db: Database.Database;
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private preparedStatements: Map<string, Database.Statement> = new Map();
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor(dbPath?: string) {
    let defaultPath: string;
    
    // First check if explicit DB_PATH or SQLITE_PATH is set by Electron (same as db.ts)
    const envDbPath = process.env.DB_PATH || process.env.SQLITE_PATH;
    if (envDbPath) {
      console.log('🧠 LocalMemoryService using database path from environment:', envDbPath);
      
      // Ensure directory exists
      const dbDir = path.dirname(envDbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      defaultPath = envDbPath;
    } else if (process.env.NODE_ENV === 'development') {
      defaultPath = path.join(process.cwd(), 'local-bible-companion.db');
    } else {
      // In production, use the same logic as db.ts
      const appDataPath = process.env.APP_DATA_PATH || path.join(os.homedir(), '.bible-companion');
      
      // Ensure directory exists
      if (!fs.existsSync(appDataPath)) {
        fs.mkdirSync(appDataPath, { recursive: true });
      }
      
      defaultPath = path.join(appDataPath, 'local-bible-companion.db');
    }
    
    this.db = new Database(dbPath || defaultPath);
    
    // Enable WAL mode for better performance and concurrent access
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('busy_timeout = 30000'); // 30 second timeout for busy database
    
    this.initializationPromise = this.initializeAsync();
  }

  public static getInstance(dbPath?: string): LocalMemoryService {
    if (!LocalMemoryService.instance) {
      LocalMemoryService.instance = new LocalMemoryService(dbPath);
    }
    return LocalMemoryService.instance;
  }

  private async initializeAsync(): Promise<void> {
    try {
      this.initializeOptimizedTables();
      this.prepareStatements();
      this.startPerformanceMonitoring();
      this.isInitialized = true;
      console.log('📊 Optimized LocalMemoryService initialized with performance monitoring');
    } catch (error) {
      console.error('❌ Failed to initialize LocalMemoryService:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      
      // Don't throw the error - instead try to continue with basic functionality
      console.warn('⚠️ Continuing with minimal LocalMemoryService functionality');
      this.isInitialized = false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && this.initializationPromise) {
      await this.initializationPromise;
    }
    if (!this.isInitialized) {
      console.warn('⚠️ LocalMemoryService not fully initialized, attempting basic functionality');
      // Try basic table creation if initialization failed
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS ai_memories (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            metadata TEXT,
            embedding TEXT,
            created_at TEXT DEFAULT (datetime('now')) NOT NULL
          );
        `);
        this.isInitialized = true;
        console.log('✅ Basic ai_memories table created successfully');
      } catch (error) {
        console.error('❌ Failed to create basic tables:', error);
        // Don't throw error - continue with limited functionality
      }
    }
  }

  private async retryOperation<T>(operation: () => T, maxRetries: number = 3, delay: number = 100): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a database lock error
        if (lastError.message.includes('SQLITE_BUSY') || lastError.message.includes('database is locked')) {
          console.warn(`🔄 Database busy, retrying (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
            continue;
          }
        }
        
        // For non-retry errors, throw immediately
        if (attempt === 1 && !lastError.message.includes('SQLITE_BUSY')) {
          throw lastError;
        }
      }
    }
    
    throw lastError!;
  }

  private initializeOptimizedTables() {
    // First, ensure the basic ai_memories table exists (for compatibility)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_memories (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        metadata TEXT,
        embedding TEXT,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL
      );
    `);

    // Create optimized AI memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_memories_v2 (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        metadata TEXT,
        embedding BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Optimized compound indexes for common query patterns
      CREATE INDEX IF NOT EXISTS idx_memories_user_category_time ON ai_memories_v2(user_id, category, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_user_time ON ai_memories_v2(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_category_time ON ai_memories_v2(category, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_content_fts ON ai_memories_v2(content);
      CREATE INDEX IF NOT EXISTS idx_memories_updated ON ai_memories_v2(updated_at DESC);

      -- Create trigger to update updated_at timestamp
      CREATE TRIGGER IF NOT EXISTS update_memories_timestamp 
      AFTER UPDATE ON ai_memories_v2
      BEGIN
        UPDATE ai_memories_v2 SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Migrate data from old table if it exists (safer approach)
    try {
      // Check if ai_memories table exists first
      const tableExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_memories'").get();
      
      if (tableExists) {
        // Get the actual columns from the ai_memories table
        const columns = this.db.prepare("PRAGMA table_info(ai_memories)").all();
        const columnNames = columns.map((col: any) => col.name);
        
        console.log('📊 Migrating data from ai_memories table with columns:', columnNames);
        
        // Only migrate columns that exist in both tables
        const commonColumns = ['id', 'user_id', 'content', 'category', 'metadata', 'created_at']
          .filter(col => columnNames.includes(col));
        
        if (commonColumns.length > 0) {
          const columnList = commonColumns.join(', ');
          const migrationQuery = `
            INSERT OR IGNORE INTO ai_memories_v2 (${columnList})
            SELECT ${columnList} FROM ai_memories
          `;
          
          const result = this.db.exec(migrationQuery);
          console.log('✅ Migration completed successfully');
        }
      } else {
        console.log('📊 No ai_memories table found, starting fresh with ai_memories_v2');
      }
    } catch (error) {
      console.warn('⚠️ Migration failed, continuing with empty ai_memories_v2:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Create performance metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS query_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        duration_ms REAL NOT NULL,
        rows_affected INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_performance_operation ON query_performance(operation, timestamp DESC);
    `);
  }

  private prepareStatements() {
    // Prepare frequently used statements for better performance
    const statements = {
      insertMemory: `
        INSERT INTO ai_memories_v2 (id, user_id, content, category, metadata, embedding)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      getUserMemories: `
        SELECT id, user_id, content, category, metadata, created_at, updated_at
        FROM ai_memories_v2 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `,
      getUserMemoriesByCategory: `
        SELECT id, user_id, content, category, metadata, created_at, updated_at
        FROM ai_memories_v2 
        WHERE user_id = ? AND category = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `,
      searchMemories: `
        SELECT id, user_id, content, category, metadata, created_at, updated_at
        FROM ai_memories_v2 
        WHERE user_id = ? AND content LIKE ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `,
      getMemoryStats: `
        SELECT 
          COUNT(*) as total_memories,
          category,
          COUNT(*) as count
        FROM ai_memories_v2 
        WHERE user_id = ? 
        GROUP BY category
      `,
      getMemoryById: `
        SELECT id, user_id, content, category, metadata, created_at, updated_at
        FROM ai_memories_v2 
        WHERE id = ?
        LIMIT 1
      `,
      getMemoryDateRange: `
        SELECT 
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM ai_memories_v2 
        WHERE user_id = ?
      `,
      deleteOldMemories: `
        DELETE FROM ai_memories_v2 
        WHERE user_id = ? AND created_at < datetime('now', '-30 days')
      `,
      insertPerformanceMetric: `
        INSERT INTO query_performance (operation, duration_ms, rows_affected)
        VALUES (?, ?, ?)
      `
    };

    Object.entries(statements).forEach(([key, sql]) => {
      this.preparedStatements.set(key, this.db.prepare(sql));
    });
  }

  private async trackPerformance<T>(operation: string, fn: () => T): Promise<T> {
    const start = performance.now();
    let rowsAffected = 0;
    
    try {
      const result = fn();
      
      // Extract rows affected if it's a database result
      if (result && typeof result === 'object' && 'changes' in result) {
        rowsAffected = (result as any).changes;
      }
      
      const duration = performance.now() - start;
      
      // Store performance metric
      const metric: QueryPerformanceMetrics = {
        operation,
        duration,
        rowsAffected,
        timestamp: new Date()
      };
      
      this.performanceMetrics.push(metric);
      
      // Keep only last 1000 metrics in memory
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }
      
      // Log slow queries
      if (duration > 100) {
        console.warn(`🐌 Slow query detected: ${operation} took ${duration.toFixed(2)}ms`);
      } else if (duration > 10) {
        console.log(`⚡ Query: ${operation} completed in ${duration.toFixed(2)}ms`);
      }
      
      // Persist performance metric to database (async, don't block)
      setImmediate(() => {
        try {
          this.preparedStatements.get('insertPerformanceMetric')?.run(operation, duration, rowsAffected);
        } catch (error) {
          // Ignore performance tracking errors
        }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ Query failed: ${operation} after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  async storeMemory(userId: number, content: string, category: string, metadata?: any, embedding?: Buffer): Promise<string> {
    await this.ensureInitialized();
    
    return this.trackPerformance('storeMemory', () => {
      return this.retryOperation(() => {
        const id = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const metadataJson = metadata ? JSON.stringify(metadata) : null;
        
        const stmt = this.preparedStatements.get('insertMemory');
        if (!stmt) {
          throw new Error('Insert memory statement not prepared');
        }
        
        try {
          const result = stmt.run(id, userId, content, category, metadataJson, embedding);
          
          // Verify the insert was successful
          if (result.changes === 0) {
            throw new Error('Memory insert failed: no rows affected');
          }
          
          return id;
        } catch (error) {
          console.error('❌ Failed to store memory:', error);
          throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    });
  }

  async retrieveMemories(userId: number, category?: string, limit: number = 100): Promise<Memory[]> {
    return this.trackPerformance('retrieveMemories', () => {
      let stmt: Database.Statement;
      let params: any[];
      
      if (category) {
        stmt = this.preparedStatements.get('getUserMemoriesByCategory')!;
        params = [userId, category, limit];
      } else {
        stmt = this.preparedStatements.get('getUserMemories')!;
        params = [userId, limit];
      }
      
      const rows = stmt.all(...params) as any[];
      
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        content: row.content,
        category: row.category,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        embedding: row.embedding,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }));
    });
  }

  async getMemoryById(id: string): Promise<Memory | null> {
    return this.trackPerformance('getMemoryById', () => {
      const stmt = this.preparedStatements.get('getMemoryById')!;
      const row = stmt.get(id) as any;
      
      if (!row) {
        return null;
      }
      
      return {
        id: row.id,
        userId: row.user_id,
        content: row.content,
        category: row.category,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        embedding: row.embedding,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      };
    });
  }

  async searchMemories(userId: number, query: string, limit: number = 50): Promise<Memory[]> {
    return this.trackPerformance('searchMemories', () => {
      const searchPattern = `%${query.toLowerCase()}%`;
      const stmt = this.preparedStatements.get('searchMemories')!;
      const rows = stmt.all(userId, searchPattern, limit) as any[];
      
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        content: row.content,
        category: row.category,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        embedding: row.embedding,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }));
    });
  }

  async analyzePatterns(userId: number): Promise<MemoryPattern[]> {
    return this.trackPerformance('analyzePatterns', async () => {
      const memories = await this.retrieveMemories(userId, undefined, 1000);
      const patterns = new Map<string, MemoryPattern>();

      // Analyze content patterns
      for (const memory of memories) {
        const words = memory.content.toLowerCase().split(/\s+/);
        
        for (const word of words) {
          if (word.length > 3) { // Only consider meaningful words
            const key = `word:${word}`;
            if (patterns.has(key)) {
              const pattern = patterns.get(key)!;
              pattern.frequency++;
              pattern.lastSeen = new Date(memory.createdAt);
              if (pattern.examples.length < 3) {
                pattern.examples.push(memory.content.substring(0, 100));
              }
            } else {
              patterns.set(key, {
                pattern: word,
                frequency: 1,
                lastSeen: new Date(memory.createdAt),
                examples: [memory.content.substring(0, 100)]
              });
            }
          }
        }

        // Analyze category patterns
        const categoryKey = `category:${memory.category}`;
        if (patterns.has(categoryKey)) {
          const pattern = patterns.get(categoryKey)!;
          pattern.frequency++;
          pattern.lastSeen = new Date(memory.createdAt);
        } else {
          patterns.set(categoryKey, {
            pattern: memory.category,
            frequency: 1,
            lastSeen: new Date(memory.createdAt),
            examples: [memory.content.substring(0, 100)]
          });
        }
      }

      // Return top patterns sorted by frequency
      return Array.from(patterns.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20);
    });
  }

  async getUserProfile(userId: number): Promise<UserProfile> {
    return this.trackPerformance('getUserProfile', async () => {
      // Get recent memories for analysis
      const memories = await this.retrieveMemories(userId, undefined, 500);
      
      // Analyze favorite books (from annotation and conversation memories)
      const bookMentions = new Map<string, number>();
      const themes = new Map<string, number>();
      const studyTimes = new Map<string, number>();
      let totalAnnotations = 0;
      let totalSessions = 0;
      let totalSessionTime = 0;

      for (const memory of memories) {
        // Extract book/document names (general pattern for titles)
        const bookPattern = /\b[A-Z][a-zA-Z\s]{2,30}(?:\s(?:Chapter|Book|Volume|Part)\s\d+)?\b/g;
        const bookMatches = memory.content.match(bookPattern);
        if (bookMatches) {
          for (const book of bookMatches) {
            const bookName = book.toLowerCase();
            bookMentions.set(bookName, (bookMentions.get(bookName) || 0) + 1);
          }
        }

        // Extract themes (common universal themes)
        const themePattern = /\b(love|hope|wisdom|truth|justice|peace|joy|knowledge|learning|growth|understanding|insight|discovery|innovation|progress|development|achievement|success|challenge|opportunity|transformation|improvement|excellence|mastery|expertise|skill|talent|creativity|inspiration|motivation|dedication|perseverance|resilience|leadership|collaboration|community|relationship|connection|communication|expression|exploration|adventure|journey|experience|reflection|analysis|synthesis|evaluation|critical thinking|problem solving|decision making)\b/gi;
        const themeMatches = memory.content.match(themePattern);
        if (themeMatches) {
          for (const theme of themeMatches) {
            const themeName = theme.toLowerCase();
            themes.set(themeName, (themes.get(themeName) || 0) + 1);
          }
        }

        // Track study patterns
        if (memory.category === 'annotation') {
          totalAnnotations++;
        }

        if (memory.category === 'session_tracking') {
          totalSessions++;
          // Try to extract session length from metadata
          if (memory.metadata && memory.metadata.duration) {
            totalSessionTime += memory.metadata.duration;
          }
        }

        // Extract study times (hour of day from timestamp)
        const hour = memory.createdAt.getHours();
        const timeSlot = this.getTimeSlot(hour);
        studyTimes.set(timeSlot, (studyTimes.get(timeSlot) || 0) + 1);
      }

      return {
        userId,
        favoriteBooks: Array.from(bookMentions.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([book]) => book),
        commonThemes: Array.from(themes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([theme]) => theme),
        studyTimes: Array.from(studyTimes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([time]) => time),
        annotationFrequency: totalAnnotations,
        averageSessionLength: totalSessions > 0 ? totalSessionTime / totalSessions : 0,
        preferredTopics: Array.from(themes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([theme]) => theme)
      };
    });
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  async getMemoryStats(userId: number): Promise<{
    totalMemories: number;
    categoryCounts: Record<string, number>;
    oldestMemory: Date | null;
    newestMemory: Date | null;
    averageQueryTime: number;
    cacheHitRate: number;
  }> {
    return this.trackPerformance('getMemoryStats', () => {
      // Get category counts
      const categoryStmt = this.preparedStatements.get('getMemoryStats')!;
      const categoryResults = categoryStmt.all(userId) as { category: string; count: number }[];

      // Get date range
      const dateStmt = this.preparedStatements.get('getMemoryDateRange')!;
      const dateResult = dateStmt.get(userId) as { oldest: string | null; newest: string | null };

      const categoryCounts: Record<string, number> = {};
      let totalMemories = 0;
      
      for (const result of categoryResults) {
        categoryCounts[result.category] = result.count;
        totalMemories += result.count;
      }

      // Calculate performance metrics
      const recentMetrics = this.performanceMetrics.slice(-100);
      const averageQueryTime = recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
        : 0;

      return {
        totalMemories,
        categoryCounts,
        oldestMemory: dateResult.oldest ? new Date(dateResult.oldest) : null,
        newestMemory: dateResult.newest ? new Date(dateResult.newest) : null,
        averageQueryTime,
        cacheHitRate: this.calculateCacheHitRate()
      };
    });
  }

  private calculateCacheHitRate(): number {
    // This would be implemented if we had query result caching
    // For now, return a placeholder
    return 0;
  }

  async cleanupOldMemories(userId: number, daysToKeep: number = 30): Promise<number> {
    return this.trackPerformance('cleanupOldMemories', () => {
      const stmt = this.preparedStatements.get('deleteOldMemories')!;
      const result = stmt.run(userId);
      return result.changes;
    });
  }

  async optimizeDatabase(): Promise<void> {
    return this.trackPerformance('optimizeDatabase', () => {
      console.log('🔧 Starting database optimization...');
      
      // Analyze tables to update statistics
      this.db.exec('ANALYZE');
      
      // Vacuum to reclaim space and defragment
      this.db.exec('VACUUM');
      
      // Update table statistics
      this.db.exec('PRAGMA optimize');
      
      console.log('✅ Database optimization completed');
    });
  }

  getPerformanceMetrics(): QueryPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  getPerformanceSummary(): {
    totalQueries: number;
    averageQueryTime: number;
    slowestQuery: QueryPerformanceMetrics | null;
    fastestQuery: QueryPerformanceMetrics | null;
    operationBreakdown: Record<string, { count: number; avgTime: number }>;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        slowestQuery: null,
        fastestQuery: null,
        operationBreakdown: {}
      };
    }

    const totalQueries = this.performanceMetrics.length;
    const averageQueryTime = this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    
    const sortedByDuration = [...this.performanceMetrics].sort((a, b) => a.duration - b.duration);
    const slowestQuery = sortedByDuration[sortedByDuration.length - 1];
    const fastestQuery = sortedByDuration[0];

    const operationBreakdown: Record<string, { count: number; avgTime: number }> = {};
    
    for (const metric of this.performanceMetrics) {
      if (!operationBreakdown[metric.operation]) {
        operationBreakdown[metric.operation] = { count: 0, avgTime: 0 };
      }
      operationBreakdown[metric.operation].count++;
    }

    // Calculate average times
    for (const operation in operationBreakdown) {
      const operationMetrics = this.performanceMetrics.filter(m => m.operation === operation);
      const totalTime = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
      operationBreakdown[operation].avgTime = totalTime / operationMetrics.length;
    }

    return {
      totalQueries,
      averageQueryTime,
      slowestQuery,
      fastestQuery,
      operationBreakdown
    };
  }

  private startPerformanceMonitoring(): void {
    // Clean up old performance metrics every hour
    setInterval(() => {
      this.performanceMetrics = this.performanceMetrics.slice(-500);
      console.log(`📊 Performance metrics cleaned up, keeping last 500 entries`);
    }, 60 * 60 * 1000);

    // Log performance summary every 10 minutes
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      if (summary.totalQueries > 0) {
        console.log(`📈 Performance Summary: ${summary.totalQueries} queries, avg ${summary.averageQueryTime.toFixed(2)}ms`);
      }
    }, 10 * 60 * 1000);
  }

  async close(): Promise<void> {
    this.db.close();
    console.log('🔒 LocalMemoryService database connection closed');
  }
} 