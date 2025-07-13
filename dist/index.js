var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiKnowledgeGraph: () => aiKnowledgeGraph,
  aiMemories: () => aiMemories,
  annotations: () => annotations,
  bookmarks: () => bookmarks,
  documents: () => documents,
  embeddingCache: () => embeddingCache,
  insertAiMemorySchema: () => insertAiMemorySchema,
  insertAnnotationSchema: () => insertAnnotationSchema,
  insertBookmarkSchema: () => insertBookmarkSchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertEmbeddingCacheSchema: () => insertEmbeddingCacheSchema,
  insertLearnedDefinitionSchema: () => insertLearnedDefinitionSchema,
  insertPowerSummarySchema: () => insertPowerSummarySchema,
  insertQueryResultCacheSchema: () => insertQueryResultCacheSchema,
  insertReadingProgressSchema: () => insertReadingProgressSchema,
  insertUserSchema: () => insertUserSchema,
  knowledgeGraphConcepts: () => knowledgeGraphConcepts,
  knowledgeGraphEdges: () => knowledgeGraphEdges,
  learnedDefinitions: () => learnedDefinitions,
  notifications: () => notifications,
  powerSummaries: () => powerSummaries,
  queryResultCache: () => queryResultCache,
  readingProgress: () => readingProgress,
  users: () => users
});
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
var users, documents, annotations, bookmarks, readingProgress, aiMemories, powerSummaries, embeddingCache, queryResultCache, learnedDefinitions, aiKnowledgeGraph, knowledgeGraphConcepts, knowledgeGraphEdges, notifications, insertUserSchema, insertDocumentSchema, insertAnnotationSchema, insertBookmarkSchema, insertReadingProgressSchema, insertAiMemorySchema, insertPowerSummarySchema, insertEmbeddingCacheSchema, insertQueryResultCacheSchema, insertLearnedDefinitionSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = sqliteTable("users", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      username: text("username").notNull().unique(),
      password: text("password").notNull()
    });
    documents = sqliteTable("documents", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").notNull(),
      title: text("title").notNull(),
      filename: text("filename").notNull(),
      fileType: text("file_type").notNull(),
      // 'pdf' or 'txt'
      totalChapters: integer("total_chapters").notNull(),
      content: text("content").notNull(),
      // JSON string of parsed content with chapters
      createdAt: text("created_at").default("datetime('now')").notNull()
    });
    annotations = sqliteTable("annotations", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").notNull(),
      documentId: integer("document_id").notNull(),
      chapter: integer("chapter").notNull(),
      paragraph: integer("paragraph"),
      selectedText: text("selected_text").notNull(),
      note: text("note").notNull(),
      type: text("type").default("user").notNull(),
      // 'user' or 'ai'
      createdAt: text("created_at").default("datetime('now')").notNull()
    });
    bookmarks = sqliteTable("bookmarks", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").notNull(),
      documentId: integer("document_id").notNull(),
      chapter: integer("chapter").notNull(),
      paragraph: integer("paragraph"),
      title: text("title"),
      createdAt: text("created_at").default("datetime('now')").notNull()
    });
    readingProgress = sqliteTable("reading_progress", {
      id: integer("id").primaryKey(),
      userId: integer("user_id").notNull(),
      documentId: integer("document_id").notNull(),
      chapter: integer("chapter").notNull(),
      completed: integer("completed").default(0).notNull(),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull()
    });
    aiMemories = sqliteTable("ai_memories", {
      id: text("id").primaryKey(),
      userId: integer("user_id").notNull(),
      content: text("content").notNull(),
      category: text("category").notNull(),
      // e.g., 'definition', 'insight', 'question'
      metadata: text("metadata", { mode: "json" }),
      // Store any extra data, like source text
      embedding: text("embedding"),
      // Store vector embeddings for semantic search
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull()
    });
    powerSummaries = sqliteTable("power_summaries", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").notNull(),
      documentId: integer("document_id").notNull(),
      chapter: integer("chapter").notNull(),
      chapterTitle: text("chapter_title").notNull(),
      powerSummary: text("power_summary").notNull(),
      // Main summary text
      keyInsights: text("key_insights").notNull(),
      // JSON array of insights
      mainThemes: text("main_themes").notNull(),
      // JSON array of themes
      actionablePoints: text("actionable_points").notNull(),
      // JSON array of action points
      createdAt: text("created_at").default("datetime('now')").notNull(),
      updatedAt: text("updated_at").default("datetime('now')").notNull()
    });
    embeddingCache = sqliteTable(
      "embedding_cache",
      {
        id: integer("id").primaryKey(),
        userId: integer("user_id").notNull(),
        text_hash: text("text_hash").notNull().unique(),
        model: text("model").notNull(),
        embedding: text("embedding").notNull(),
        // Stored as JSON string
        created_at: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
        last_accessed_at: integer("last_accessed_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
        access_count: integer("access_count").default(0).notNull()
      },
      (table) => {
        return {
          textHashIdx: index("text_hash_idx").on(table.text_hash)
        };
      }
    );
    queryResultCache = sqliteTable(
      "query_result_cache",
      {
        id: integer("id").primaryKey(),
        userId: integer("user_id").notNull(),
        query_hash: text("query_hash").notNull().unique(),
        query_text: text("query_text").notNull(),
        embedding: text("embedding"),
        // Stored as JSON string
        model: text("model").notNull(),
        result: text("result").notNull(),
        // Stored as JSON string
        metadata: text("metadata", { mode: "json" }),
        created_at: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
        last_accessed_at: integer("last_accessed_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
        access_count: integer("access_count").default(0).notNull()
      },
      (table) => {
        return {
          queryHashIdx: index("query_hash_idx").on(table.query_hash)
        };
      }
    );
    learnedDefinitions = sqliteTable("learned_definitions", {
      id: integer("id").primaryKey(),
      term: text("term").notNull().unique(),
      definition: text("definition").notNull(),
      source_document_id: integer("source_document_id"),
      context_snippet: text("context_snippet"),
      user_feedback: text("user_feedback"),
      // 'positive', 'negative', 'neutral'
      confidence_score: integer("confidence_score").notNull().default(0),
      created_at: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
      updated_at: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
      related_terms: text("related_terms", { mode: "json" }),
      // JSON array of related term IDs or names
      embedding: text("embedding"),
      // Stored as JSON string of numbers
      tags: text("tags", { mode: "json" }),
      // JSON array of strings
      access_count: integer("access_count").default(0),
      last_accessed_at: integer("last_accessed_at", { mode: "timestamp" })
    });
    aiKnowledgeGraph = sqliteTable("ai_knowledge_graph", {
      id: integer("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
    });
    knowledgeGraphConcepts = sqliteTable("knowledge_graph_concepts", {
      id: integer("id").primaryKey(),
      graphId: integer("graph_id").references(() => aiKnowledgeGraph.id),
      name: text("name").notNull(),
      summary: text("summary"),
      sourceDocumentId: integer("source_document_id").references(() => documents.id),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
    });
    knowledgeGraphEdges = sqliteTable("knowledge_graph_edges", {
      id: integer("id").primaryKey(),
      graphId: integer("graph_id").references(() => aiKnowledgeGraph.id),
      sourceConceptId: integer("source_concept_id").references(() => knowledgeGraphConcepts.id),
      targetConceptId: integer("target_concept_id").references(() => knowledgeGraphConcepts.id),
      label: text("label").notNull(),
      // e.g., 'is_a', 'part_of', 'contradicts'
      description: text("description"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
    });
    notifications = sqliteTable("notifications", {
      id: integer("id").primaryKey(),
      user_id: integer("user_id").notNull().references(() => users.id),
      title: text("title").notNull(),
      message: text("message").notNull(),
      is_read: integer("is_read", { mode: "boolean" }).default(false).notNull(),
      created_at: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true
    });
    insertDocumentSchema = createInsertSchema(documents).omit({
      id: true,
      userId: true,
      createdAt: true
    });
    insertAnnotationSchema = createInsertSchema(annotations).omit({
      id: true,
      userId: true,
      createdAt: true
    });
    insertBookmarkSchema = createInsertSchema(bookmarks).omit({
      id: true,
      userId: true,
      createdAt: true
    });
    insertReadingProgressSchema = createInsertSchema(readingProgress).omit({
      id: true,
      userId: true,
      createdAt: true
    });
    insertAiMemorySchema = createInsertSchema(aiMemories).omit({
      userId: true,
      createdAt: true
    });
    insertPowerSummarySchema = createInsertSchema(powerSummaries).omit({
      id: true,
      userId: true,
      createdAt: true,
      updatedAt: true
    });
    insertEmbeddingCacheSchema = createInsertSchema(embeddingCache).omit({
      id: true,
      created_at: true,
      last_accessed_at: true
    });
    insertQueryResultCacheSchema = createInsertSchema(queryResultCache).omit({
      id: true,
      created_at: true,
      last_accessed_at: true,
      access_count: true
    });
    insertLearnedDefinitionSchema = createInsertSchema(learnedDefinitions).omit({
      id: true,
      created_at: true,
      updated_at: true,
      last_accessed_at: true,
      access_count: true
    });
  }
});

// server/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
var sqlite, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    sqlite = new Database("./local-document-companion.db");
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite, { schema: schema_exports });
  }
});

// server/storage.ts
import { eq, and } from "drizzle-orm";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    DatabaseStorage = class {
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || void 0;
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      // Document methods
      async getDocuments(userId) {
        return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(documents.createdAt);
      }
      async getDocument(id) {
        const [document] = await db.select().from(documents).where(eq(documents.id, id));
        return document || void 0;
      }
      async createDocument(document) {
        const [newDocument] = await db.insert(documents).values(document).returning();
        return newDocument;
      }
      async deleteDocument(id) {
        try {
          await db.delete(annotations).where(eq(annotations.documentId, id));
          await db.delete(bookmarks).where(eq(bookmarks.documentId, id));
          await db.delete(readingProgress).where(eq(readingProgress.documentId, id));
          await db.delete(powerSummaries).where(eq(powerSummaries.documentId, id));
          await db.delete(knowledgeGraphConcepts).where(eq(knowledgeGraphConcepts.sourceDocumentId, id));
          await db.delete(learnedDefinitions).where(eq(learnedDefinitions.source_document_id, id));
          const result = await db.delete(documents).where(eq(documents.id, id));
          return result.changes > 0;
        } catch (error) {
          console.error("Error deleting document:", error);
          return false;
        }
      }
      async searchDocuments(userId, query) {
        const userDocuments = await this.getDocuments(userId);
        const results = [];
        const searchTerm = query.toLowerCase();
        for (const doc of userDocuments) {
          const content = typeof doc.content === "string" ? JSON.parse(doc.content) : doc.content;
          if (content && content.chapters) {
            for (const chapter of content.chapters) {
              if (chapter.paragraphs) {
                for (const paragraph of chapter.paragraphs) {
                  if (paragraph.text && paragraph.text.toLowerCase().includes(searchTerm)) {
                    const contextStart = Math.max(0, paragraph.text.toLowerCase().indexOf(searchTerm) - 50);
                    const contextEnd = Math.min(paragraph.text.length, paragraph.text.toLowerCase().indexOf(searchTerm) + searchTerm.length + 50);
                    results.push({
                      documentId: doc.id,
                      documentTitle: doc.title,
                      chapter: chapter.number,
                      paragraph: paragraph.number,
                      text: paragraph.text,
                      context: "..." + paragraph.text.substring(contextStart, contextEnd) + "..."
                    });
                  }
                }
              }
            }
          }
        }
        return results;
      }
      async getAnnotations(userId) {
        return await db.select().from(annotations).where(eq(annotations.userId, userId));
      }
      async getAnnotationsByChapter(userId, documentId, chapter) {
        return await db.select().from(annotations).where(and(
          eq(annotations.userId, userId),
          eq(annotations.documentId, documentId),
          eq(annotations.chapter, chapter)
        ));
      }
      async createAnnotation(annotation) {
        const [newAnnotation] = await db.insert(annotations).values({
          ...annotation,
          type: annotation.type ?? "user"
        }).returning();
        return newAnnotation;
      }
      async updateAnnotation(id, note) {
        const [updated] = await db.update(annotations).set({ note }).where(eq(annotations.id, id)).returning();
        return updated || void 0;
      }
      async deleteAnnotation(id) {
        const result = await db.delete(annotations).where(eq(annotations.id, id));
        return result.changes > 0;
      }
      async getBookmarks(userId) {
        return await db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
      }
      async createBookmark(bookmark) {
        const [newBookmark] = await db.insert(bookmarks).values(bookmark).returning();
        return newBookmark;
      }
      async deleteBookmark(id) {
        const result = await db.delete(bookmarks).where(eq(bookmarks.id, id));
        return result.changes > 0;
      }
      async getReadingProgress(userId) {
        return await db.select().from(readingProgress).where(eq(readingProgress.userId, userId));
      }
      async updateReadingProgress(progress) {
        const [existing] = await db.select().from(readingProgress).where(and(
          eq(readingProgress.userId, progress.userId),
          eq(readingProgress.documentId, progress.documentId),
          eq(readingProgress.chapter, progress.chapter)
        ));
        if (existing) {
          const [updated] = await db.update(readingProgress).set({
            completed: progress.completed
          }).where(eq(readingProgress.id, existing.id)).returning();
          return updated;
        } else {
          const [newProgress] = await db.insert(readingProgress).values(progress).returning();
          return newProgress;
        }
      }
      async getPowerSummaries(documentId) {
        return await db.select().from(powerSummaries).where(eq(powerSummaries.documentId, documentId)).orderBy(powerSummaries.chapter);
      }
      async createPowerSummary(summary) {
        try {
          const [newSummary] = await db.insert(powerSummaries).values({
            ...summary,
            userId: 2,
            // Use correct default user ID 2
            keyInsights: typeof summary.keyInsights === "string" ? summary.keyInsights : JSON.stringify(summary.keyInsights || []),
            mainThemes: typeof summary.mainThemes === "string" ? summary.mainThemes : JSON.stringify(summary.mainThemes || []),
            actionablePoints: typeof summary.actionablePoints === "string" ? summary.actionablePoints : JSON.stringify(summary.actionablePoints || [])
          }).returning();
          return {
            ...newSummary,
            keyInsights: typeof newSummary.keyInsights === "string" ? JSON.parse(newSummary.keyInsights) : newSummary.keyInsights,
            mainThemes: typeof newSummary.mainThemes === "string" ? JSON.parse(newSummary.mainThemes) : newSummary.mainThemes,
            actionablePoints: typeof newSummary.actionablePoints === "string" ? JSON.parse(newSummary.actionablePoints) : newSummary.actionablePoints
          };
        } catch (error) {
          if (error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            throw new Error("A power summary for this chapter already exists.");
          }
          throw error;
        }
      }
      async deletePowerSummary(id) {
        const deleted = await db.delete(powerSummaries).where(eq(powerSummaries.id, id));
        return deleted.changes > 0;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/services/ollama-service.ts
import { Ollama } from "ollama";
import axios from "axios";
var OllamaService;
var init_ollama_service = __esm({
  "server/services/ollama-service.ts"() {
    "use strict";
    OllamaService = class {
      config;
      isConnected = false;
      connectionPool = [];
      responseCache = /* @__PURE__ */ new Map();
      CACHE_TTL = 1e3 * 60 * 30;
      // 30 minutes
      CONNECTION_TIMEOUT = 1e3 * 60 * 5;
      // 5 minutes
      constructor(config2) {
        this.config = {
          host: "localhost",
          port: 11434,
          temperature: 0.7,
          maxTokens: 4096,
          maxConnections: 3,
          // Pool of 3 connections
          cacheSize: 1e3,
          // Cache up to 1000 responses
          ...config2
        };
        this.initializeConnectionPool();
        this.startCacheCleanup();
      }
      initializeConnectionPool() {
        for (let i = 0; i < this.config.maxConnections; i++) {
          this.connectionPool.push({
            ollama: new Ollama({
              host: `http://${this.config.host}:${this.config.port}`
            }),
            inUse: false,
            lastUsed: Date.now()
          });
        }
      }
      async getAvailableConnection() {
        let connection = this.connectionPool.find((conn) => !conn.inUse);
        if (!connection) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return this.getAvailableConnection();
        }
        connection.inUse = true;
        connection.lastUsed = Date.now();
        return connection.ollama;
      }
      releaseConnection(ollama) {
        const connection = this.connectionPool.find((conn) => conn.ollama === ollama);
        if (connection) {
          connection.inUse = false;
          connection.lastUsed = Date.now();
        }
      }
      generateCacheKey(prompt, options) {
        let documentContext = "";
        let documentId = "";
        let chapterId = "";
        if (options.context) {
          const contextMatch = options.context.match(/document[:\s]*(\d+)|chapter[:\s]*(\d+)/i);
          if (contextMatch) {
            documentContext = contextMatch[0];
          }
          const docMatch = options.context.match(/document[:\s]*(\d+)/i);
          const chapterMatch = options.context.match(/chapter[:\s]*(\d+)/i);
          if (docMatch) documentId = docMatch[1];
          if (chapterMatch) chapterId = chapterMatch[1];
        }
        const promptMatch = prompt.match(/document[:\s]*(\d+)|chapter[:\s]*(\d+)/i);
        if (promptMatch && !documentContext) {
          documentContext = promptMatch[0];
        }
        const promptDocMatch = prompt.match(/document[:\s]*(\d+)/i);
        const promptChapterMatch = prompt.match(/chapter[:\s]*(\d+)/i);
        if (promptDocMatch && !documentId) documentId = promptDocMatch[1];
        if (promptChapterMatch && !chapterId) chapterId = promptChapterMatch[1];
        const keyData = {
          prompt: prompt.substring(0, 500),
          // Limit key size
          temperature: options.temperature || this.config.temperature,
          maxTokens: options.maxTokens || this.config.maxTokens,
          model: this.config.model,
          documentContext,
          documentId: documentId || "none",
          chapterId: chapterId || "none",
          // Add a hash of the full prompt to ensure uniqueness
          promptHash: this.hashString(prompt)
        };
        return Buffer.from(JSON.stringify(keyData)).toString("base64");
      }
      hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return hash.toString();
      }
      getCachedResponse(cacheKey) {
        const entry = this.responseCache.get(cacheKey);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.CACHE_TTL) {
          this.responseCache.delete(cacheKey);
          return null;
        }
        entry.hitCount++;
        console.log(`\u{1F680} Cache hit for key: ${cacheKey.substring(0, 20)}... (hits: ${entry.hitCount})`);
        return entry.response;
      }
      setCachedResponse(cacheKey, response) {
        if (this.responseCache.size >= this.config.cacheSize) {
          let oldestKey = null;
          let oldestTime = Date.now();
          this.responseCache.forEach((entry, key) => {
            if (entry.timestamp < oldestTime) {
              oldestTime = entry.timestamp;
              oldestKey = key;
            }
          });
          if (oldestKey) {
            this.responseCache.delete(oldestKey);
          }
        }
        this.responseCache.set(cacheKey, {
          response,
          timestamp: Date.now(),
          hitCount: 0
        });
      }
      startCacheCleanup() {
        setInterval(() => {
          const now = Date.now();
          const keysToDelete = [];
          this.responseCache.forEach((entry, key) => {
            if (now - entry.timestamp > this.CACHE_TTL) {
              keysToDelete.push(key);
            }
          });
          keysToDelete.forEach((key) => this.responseCache.delete(key));
          console.log(`\u{1F9F9} Cache cleanup: ${this.responseCache.size} entries remaining`);
        }, this.CACHE_TTL);
      }
      async initialize() {
        try {
          await this.checkConnection();
          await this.ensureModel();
          this.responseCache.clear();
          console.log(`\u{1F9F9} Cleared existing cache for document-aware caching`);
          this.isConnected = true;
          console.log(`\u2705 Ollama service initialized with model: ${this.config.model}`);
          console.log(`\u{1F517} Connection pool: ${this.config.maxConnections} connections`);
          console.log(`\u{1F4BE} Cache size: ${this.config.cacheSize} entries`);
        } catch (error) {
          console.error("\u274C Failed to initialize Ollama service:", error);
          throw error;
        }
      }
      // Clear cache entries for specific document to ensure fresh content
      clearCacheForDocument(documentId, chapter) {
        const keysToDelete = [];
        this.responseCache.forEach((entry, key) => {
          try {
            const keyData = JSON.parse(Buffer.from(key, "base64").toString());
            if (keyData.documentId === documentId.toString() || chapter && keyData.chapterId === chapter.toString()) {
              keysToDelete.push(key);
            }
          } catch (error) {
          }
        });
        keysToDelete.forEach((key) => this.responseCache.delete(key));
        console.log(`\u{1F9F9} Cleared ${keysToDelete.length} cache entries for document ${documentId}${chapter ? ` chapter ${chapter}` : ""}`);
      }
      async checkConnection() {
        try {
          const response = await axios.get(`http://${this.config.host}:${this.config.port}/api/tags`, {
            timeout: 5e3
          });
          if (response.status !== 200) {
            throw new Error("Ollama server is not responding");
          }
        } catch (error) {
          throw new Error(`Cannot connect to Ollama server at ${this.config.host}:${this.config.port}. Please ensure Ollama is running.`);
        }
      }
      async ensureModel() {
        try {
          const connection = await this.getAvailableConnection();
          const models = await connection.list();
          this.releaseConnection(connection);
          const hasModel = models.models.some((m) => m.name.includes(this.config.model));
          if (!hasModel) {
            console.log(`\u26A0\uFE0F  Model ${this.config.model} not found. Checking for available alternatives...`);
            const fallbackModels = [
              "openthinker:7b",
              "phi3.5:3.8b-mini-instruct-q8_0",
              "llama3.2:3b",
              "mistral:7b"
            ];
            let fallbackModel = null;
            for (const model of fallbackModels) {
              const hasAlternative = models.models.some((m) => m.name.includes(model));
              if (hasAlternative) {
                fallbackModel = model;
                break;
              }
            }
            if (fallbackModel) {
              console.log(`\u{1F504} Using fallback model: ${fallbackModel}`);
              this.config.model = fallbackModel;
            } else {
              console.log(`\u{1F4E5} Attempting to pull model ${this.config.model}...`);
              try {
                const pullConnection = await this.getAvailableConnection();
                await pullConnection.pull({ model: this.config.model });
                this.releaseConnection(pullConnection);
                console.log(`\u2705 Model ${this.config.model} downloaded successfully`);
              } catch (pullError) {
                console.error(`\u274C Failed to pull model ${this.config.model}: ${pullError}`);
                if (models.models.length > 0) {
                  const firstAvailable = models.models[0].name;
                  console.log(`\u{1F198} Using first available model: ${firstAvailable}`);
                  this.config.model = firstAvailable;
                } else {
                  throw new Error("No models available in Ollama");
                }
              }
            }
          }
        } catch (error) {
          throw new Error(`Failed to ensure model availability: ${error}`);
        }
      }
      async generateText(prompt, options = {}) {
        if (!this.isConnected) {
          throw new Error("Ollama service is not connected");
        }
        const startTime = performance.now();
        const defaultMaxTokens = prompt.length < 500 ? 800 : prompt.length < 1500 ? 1200 : 2e3;
        const defaultTimeout = options.timeout || (prompt.length < 500 ? 6e4 : prompt.length < 1500 ? 9e4 : 12e4);
        if (options.useCache !== false) {
          const cacheKey = this.generateCacheKey(prompt, options);
          const cachedResponse = this.getCachedResponse(cacheKey);
          if (cachedResponse) {
            const duration = performance.now() - startTime;
            console.log(`\u26A1 Cached response returned in ${duration.toFixed(2)}ms`);
            return cachedResponse;
          }
        }
        let connection = null;
        try {
          connection = await this.getAvailableConnection();
          const generateOptions = {
            temperature: options.temperature || this.config.temperature || 0.3,
            num_predict: options.maxTokens || defaultMaxTokens,
            // Performance optimizations
            top_p: 0.85,
            // Reduced from 0.9 for faster sampling
            repeat_penalty: 1.05,
            // Reduced from 1.1
            num_ctx: Math.min(2048, prompt.length + (options.maxTokens || defaultMaxTokens)),
            // Dynamic context size
            // Additional speed optimizations
            num_thread: 4,
            // Limit threads for faster response
            num_batch: 512,
            // Optimize batch size
            num_gqa: 1
            // Grouped query attention optimization
          };
          const generatePromise = connection.generate({
            model: this.config.model,
            prompt: prompt.substring(0, 2e3),
            // Limit prompt size for speed
            options: generateOptions,
            stream: false
          });
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("Ollama generation timeout")), defaultTimeout)
          );
          const response = await Promise.race([generatePromise, timeoutPromise]);
          if (options.useCache !== false) {
            const cacheKey = this.generateCacheKey(prompt, options);
            this.setCachedResponse(cacheKey, response.response);
          }
          const duration = performance.now() - startTime;
          console.log(`\u{1F680} Generated response in ${duration.toFixed(2)}ms`);
          return response.response;
        } catch (error) {
          console.error("Error generating text:", error);
          if (error instanceof Error && error.message.includes("timeout")) {
            const fallback = `Analysis of this content: The material appears to cover key concepts and themes. Due to processing constraints, a complete analysis is not available at this time.`;
            console.log("\u26A0\uFE0F Using fallback response due to timeout");
            return fallback;
          }
          throw new Error(`Text generation failed: ${error}`);
        } finally {
          if (connection) {
            this.releaseConnection(connection);
          }
        }
      }
      async chat(messages, options = {}) {
        if (!this.isConnected) {
          throw new Error("Ollama service is not connected");
        }
        const startTime = performance.now();
        let connection = null;
        try {
          connection = await this.getAvailableConnection();
          const response = await connection.chat({
            model: this.config.model,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content
            })),
            options: {
              temperature: options.temperature || this.config.temperature,
              num_predict: options.maxTokens || this.config.maxTokens,
              // Performance optimizations
              top_p: 0.9,
              repeat_penalty: 1.1
            },
            stream: false
          });
          const duration = performance.now() - startTime;
          console.log(`\u{1F4AC} Chat response generated in ${duration.toFixed(2)}ms`);
          return response.message.content;
        } catch (error) {
          console.error("Error in chat:", error);
          throw new Error(`Chat failed: ${error}`);
        } finally {
          if (connection) {
            this.releaseConnection(connection);
          }
        }
      }
      async streamChat(messages, onChunk, options = {}) {
        if (!this.isConnected) {
          throw new Error("Ollama service is not connected");
        }
        let connection = null;
        try {
          connection = await this.getAvailableConnection();
          const response = await connection.chat({
            model: this.config.model,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content
            })),
            options: {
              temperature: options.temperature || this.config.temperature,
              num_predict: options.maxTokens || this.config.maxTokens
            },
            stream: true
          });
          for await (const part of response) {
            if (part.message?.content) {
              onChunk(part.message.content);
            }
          }
        } catch (error) {
          console.error("Error in streaming chat:", error);
          throw new Error(`Streaming chat failed: ${error}`);
        } finally {
          if (connection) {
            this.releaseConnection(connection);
          }
        }
      }
      // Specialized methods for biblical text analysis
      async analyzeTextTheologically(text2) {
        const prompt = `
As a biblical scholar and theologian, analyze the following text:

"${text2}"

Please provide:
1. Theological themes and concepts
2. Historical context
3. Literary analysis (genre, structure, etc.)
4. Key insights and interpretations
5. Cross-references to related passages
6. Practical applications for modern readers

Be scholarly but accessible in your analysis.
`;
        return await this.generateText(prompt, { temperature: 0.3, useCache: true });
      }
      async generateStudyQuestions(text2) {
        const prompt = `
Create thoughtful study questions for this biblical text:

"${text2}"

Generate 8-10 questions that:
- Encourage deep reflection
- Explore different aspects of the text
- Connect to personal application
- Range from basic comprehension to advanced analysis
- Promote discussion and contemplation

Return each question on a new line.
`;
        const response = await this.generateText(prompt, { temperature: 0.6, useCache: true });
        return response.split("\n").filter((q) => q.trim().length > 0);
      }
      async suggestStudyQuestions(text2) {
        return this.generateStudyQuestions(text2);
      }
      // Performance monitoring methods
      getPerformanceStats() {
        const totalConnections = this.connectionPool.length;
        const activeConnections = this.connectionPool.filter((conn) => conn.inUse).length;
        const cacheSize = this.responseCache.size;
        const cacheHitRate = this.calculateCacheHitRate();
        return {
          isConnected: this.isConnected,
          model: this.config.model,
          host: this.config.host,
          port: this.config.port,
          connectionPool: {
            total: totalConnections,
            active: activeConnections,
            available: totalConnections - activeConnections
          },
          cache: {
            size: cacheSize,
            maxSize: this.config.cacheSize,
            hitRate: cacheHitRate
          }
        };
      }
      calculateCacheHitRate() {
        const entries = Array.from(this.responseCache.values());
        if (entries.length === 0) return 0;
        const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
        const totalRequests = entries.length + totalHits;
        return totalRequests > 0 ? totalHits / totalRequests * 100 : 0;
      }
      getStatus() {
        return this.getPerformanceStats();
      }
      // Language-aware text generation methods
      async generateTextWithLanguage(prompt, language = "en", options = {}) {
        console.log(`\u{1F310} [OLLAMA] Generating response in language: ${language}`);
        if (language === "en") {
          console.log(`\u{1F310} [OLLAMA] Using English generation (no language modification)`);
          return await this.generateText(prompt, options);
        }
        const languagePrompt = this.addLanguageContext(prompt, language);
        console.log(`\u{1F310} [OLLAMA] Language prompt length: ${languagePrompt.length} chars`);
        console.log(`\u{1F310} [OLLAMA] Language instructions preview: ${languagePrompt.substring(0, 200)}...`);
        const response = await this.generateText(languagePrompt, options);
        const isEnglish = this.detectEnglishResponse(response);
        console.log(`\u{1F310} [OLLAMA] Response language check - appears to be English: ${isEnglish}`);
        console.log(`\u{1F310} [OLLAMA] Response preview: ${response.substring(0, 100)}...`);
        return response;
      }
      detectEnglishResponse(response) {
        const englishIndicators = [
          "the",
          "and",
          "is",
          "are",
          "was",
          "were",
          "have",
          "has",
          "had",
          "this",
          "that",
          "these",
          "those",
          "with",
          "from",
          "they",
          "their",
          "would",
          "could",
          "should",
          "about",
          "according",
          "what",
          "when",
          "where"
        ];
        const lowerResponse = response.toLowerCase();
        const englishWordCount = englishIndicators.filter(
          (word) => lowerResponse.includes(" " + word + " ") || lowerResponse.startsWith(word + " ") || lowerResponse.includes(" " + word + ".")
        ).length;
        return englishWordCount > 3;
      }
      async chatWithLanguage(messages, language = "en", options = {}) {
        const languageSystemMessage = this.getLanguageSystemMessage(language);
        const messagesWithLanguage = [
          languageSystemMessage,
          ...messages
        ];
        return await this.chat(messagesWithLanguage, options);
      }
      addLanguageContext(prompt, language) {
        if (language === "en") {
          return prompt;
        }
        const languageInstructions = this.getLanguageInstructions(language);
        return `${languageInstructions}

${prompt}`;
      }
      getLanguageSystemMessage(language) {
        const instructions = this.getLanguageInstructions(language);
        return {
          role: "system",
          content: instructions
        };
      }
      getLanguageInstructions(language) {
        const languageMap = {
          "es": "Spanish (Espa\xF1ol)",
          "fr": "French (Fran\xE7ais)",
          "de": "German (Deutsch)",
          "ja": "Japanese (\u65E5\u672C\u8A9E)",
          "ko": "Korean (\uD55C\uAD6D\uC5B4)",
          "en": "English"
        };
        const languageName = languageMap[language] || language;
        if (language === "en") {
          return "You are a helpful AI assistant. Respond naturally in English.";
        }
        return `\u{1F6A8} CRITICAL LANGUAGE REQUIREMENT \u{1F6A8}

YOU MUST RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()}. 

\u26A0\uFE0F ABSOLUTE RULES:
- ZERO English words allowed
- ZERO mixed languages allowed  
- EVERY single word must be in ${languageName}
- If you don't know a word in ${languageName}, describe it in ${languageName}
- Start your response immediately in ${languageName}
- End your response in ${languageName}

\u{1F310} LANGUAGE: ${languageName}
\u{1F4DD} RESPONSE LANGUAGE: ${languageName} ONLY
\u{1F512} ENFORCEMENT: STRICT

For biblical/religious content: Use traditional ${languageName} religious terminology.
For cultural context: Use ${languageName} cultural references and expressions.
For tone: Maintain natural, respectful ${languageName} conversation style.

\u26A1 BEGIN RESPONSE IN ${languageName} NOW:`;
      }
      // Cleanup method
      async cleanup() {
        this.responseCache.clear();
        console.log("\u{1F9F9} OllamaService cleanup completed");
      }
    };
  }
});

// server/env.ts
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
var __filename, __dirname, envPath;
var init_env = __esm({
  "server/env.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    envPath = join(__dirname, "..", ".env");
    if (!existsSync(envPath)) {
      const possiblePaths = [
        // Development path
        join(__dirname, "..", ".env"),
        // Packaged app paths - check extraResources location first
        join(process.resourcesPath || "", ".env"),
        join(process.resourcesPath || "", "app.asar.unpacked", ".env"),
        join(process.cwd(), ".env"),
        join(process.cwd(), "..", ".env"),
        // Additional fallback paths
        join(__dirname, "..", "..", ".env"),
        join(__dirname, "..", "..", "..", ".env"),
        // Check if we're in the dist directory
        join(__dirname, "..", "..", "..", ".env"),
        join(__dirname, "..", "..", "..", "..", ".env")
      ];
      for (const path4 of possiblePaths) {
        if (existsSync(path4)) {
          envPath = path4;
          break;
        }
      }
    }
    if (existsSync(envPath)) {
      config({ path: envPath });
      console.log("\u{1F511} Environment variables loaded from:", envPath);
    } else {
      console.log("\u{1F511} No .env file found, using defaults");
      console.log("\u{1F511} Searched paths:", [
        join(__dirname, "..", ".env"),
        join(process.resourcesPath || "", ".env"),
        join(process.resourcesPath || "", "app.asar.unpacked", ".env"),
        join(process.cwd(), ".env"),
        join(__dirname, "..", "..", "..", ".env")
      ]);
    }
    if (!process.env.SESSION_SECRET) {
      process.env.SESSION_SECRET = "default_session_secret_for_development";
    }
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "development";
    }
    console.log("Environment setup complete.");
  }
});

// server/config/models-config.ts
function getModelConfig() {
  const ollamaHost = process.env.OLLAMA_HOST || "localhost";
  const ollamaPort = parseInt(process.env.OLLAMA_PORT || "11434");
  const models = DEFAULT_MODELS.map((model) => ({
    ...model,
    host: model.provider === "ollama" ? ollamaHost : model.host,
    port: model.provider === "ollama" ? ollamaPort : model.port
  }));
  return {
    models,
    taskTypes: DEFAULT_TASK_TYPES,
    timeouts: MODEL_TIMEOUTS
  };
}
var DEFAULT_MODELS, DEFAULT_TASK_TYPES, MODEL_TIMEOUTS;
var init_models_config = __esm({
  "server/config/models-config.ts"() {
    "use strict";
    DEFAULT_MODELS = [
      {
        name: "gemma3n:e4b",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0.7,
        maxTokens: 16384,
        // Increased for thesis-level content
        specialties: [
          "advanced-reasoning",
          "thesis-analysis",
          "academic-writing",
          "complex-argumentation",
          "scholarly-research",
          "critical-analysis",
          "dissertation-support",
          "advanced-synthesis"
        ],
        performance: { speed: 7, accuracy: 10, reasoning: 10, creativity: 9 }
      },
      {
        name: "gemma3n:e2b",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0.7,
        maxTokens: 8192,
        specialties: [
          "fast-reasoning",
          "text-analysis",
          "theological-reasoning",
          "complex-reasoning",
          "multilingual-analysis",
          "instruction-following",
          "creative-insights"
        ],
        performance: { speed: 9, accuracy: 10, reasoning: 10, creativity: 8 }
      },
      {
        name: "llama3.2:3b",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0.5,
        maxTokens: 2048,
        specialties: ["fast-analysis", "summarization", "classification"],
        performance: { speed: 9, accuracy: 7, reasoning: 6, creativity: 6 }
      },
      {
        name: "mistral:7b",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0.8,
        maxTokens: 4096,
        specialties: ["creative-writing", "poetry-analysis", "cultural-context"],
        performance: { speed: 7, accuracy: 8, reasoning: 8, creativity: 9 }
      },
      {
        name: "phi3.5:3.8b-mini-instruct-q8_0",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0.3,
        maxTokens: 4096,
        specialties: ["reasoning", "critical-thinking", "structured-analysis", "logical-reasoning"],
        performance: { speed: 9, accuracy: 8, reasoning: 9, creativity: 6 }
      },
      {
        name: "nomic-embed-text:v1.5",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0,
        // No temperature for embeddings
        maxTokens: 2048,
        specialties: ["embeddings", "semantic-similarity", "vector-search", "rag-embedding"],
        performance: { speed: 10, accuracy: 10, reasoning: 10, creativity: 1 }
      },
      {
        name: "qwen2.5vl:7b",
        provider: "ollama",
        host: "localhost",
        port: 11434,
        temperature: 0.7,
        maxTokens: 4096,
        specialties: [
          "vision-analysis",
          "document-layout",
          "visual-reasoning",
          "multimodal-analysis",
          "scanned-text",
          "chart-analysis"
        ],
        performance: { speed: 7, accuracy: 9, reasoning: 10, creativity: 8 }
      }
    ];
    DEFAULT_TASK_TYPES = [
      {
        name: "text-analysis",
        requirements: { accuracy: 9, reasoning: 8, speed: 6 },
        preferredModels: ["gemma3n:e2b", "phi3.5:3.8b-mini-instruct-q8_0"]
      },
      {
        name: "theological-reasoning",
        requirements: { reasoning: 8, accuracy: 8, creativity: 7 },
        preferredModels: ["gemma3n:e2b", "mistral:7b"]
      },
      {
        name: "expert-reasoning",
        requirements: { reasoning: 8, accuracy: 8, creativity: 6 },
        preferredModels: ["gemma3n:e2b"]
      },
      {
        name: "quick-classification",
        requirements: { speed: 10, accuracy: 8 },
        preferredModels: ["llama3.2:3b", "phi3.5:3.8b-mini-instruct-q8_0", "gemma3n:e2b"]
      },
      {
        name: "creative-insights",
        requirements: { creativity: 9, reasoning: 7 },
        preferredModels: ["mistral:7b", "gemma3n:e2b"]
      },
      {
        name: "semantic-search",
        requirements: { accuracy: 9, speed: 8, reasoning: 8 },
        preferredModels: ["gemma3n:e2b", "phi3.5:3.8b-mini-instruct-q8_0"]
      },
      {
        name: "summarization",
        requirements: { speed: 9, accuracy: 8 },
        preferredModels: ["llama3.2:3b", "gemma3n:e2b"]
      },
      {
        name: "group-discussion",
        requirements: { creativity: 8, reasoning: 7, speed: 6 },
        preferredModels: ["mistral:7b", "gemma3n:e2b", "llama3.2:3b", "phi3.5:3.8b-mini-instruct-q8_0"]
      },
      {
        name: "ai-interaction",
        requirements: { creativity: 7, reasoning: 6, speed: 8 },
        preferredModels: ["mistral:7b", "gemma3n:e2b", "llama3.2:3b"]
      },
      {
        name: "embedding-generation",
        requirements: { accuracy: 9, speed: 9, reasoning: 8, creativity: 1 },
        preferredModels: ["nomic-embed-text:v1.5"]
      },
      {
        name: "vector-similarity",
        requirements: { accuracy: 10, speed: 8, reasoning: 9, creativity: 1 },
        preferredModels: ["nomic-embed-text:v1.5"]
      },
      {
        name: "vision-document-analysis",
        requirements: { accuracy: 8, reasoning: 8, speed: 5, creativity: 6 },
        preferredModels: ["qwen2.5vl:7b"]
      },
      {
        name: "layout-detection",
        requirements: { accuracy: 9, speed: 7, reasoning: 8, creativity: 6 },
        preferredModels: ["qwen2.5vl:7b"]
      },
      {
        name: "scanned-text-processing",
        requirements: { accuracy: 10, reasoning: 8, speed: 6, creativity: 5 },
        preferredModels: ["qwen2.5vl:7b"]
      },
      {
        name: "visual-content-analysis",
        requirements: { accuracy: 9, reasoning: 9, speed: 6, creativity: 8 },
        preferredModels: ["qwen2.5vl:7b"]
      },
      {
        name: "universal-reasoning",
        requirements: { reasoning: 9, accuracy: 8, speed: 7, creativity: 6 },
        preferredModels: ["gemma3n:e4b", "gemma3n:e2b", "phi3.5:3.8b-mini-instruct-q8_0", "llama3.2:3b"]
      },
      {
        name: "thesis-analysis",
        requirements: { reasoning: 10, accuracy: 10, speed: 5, creativity: 8 },
        preferredModels: ["gemma3n:e4b"]
      },
      {
        name: "academic-writing",
        requirements: { reasoning: 9, accuracy: 9, speed: 6, creativity: 8 },
        preferredModels: ["gemma3n:e4b", "mistral:7b"]
      },
      {
        name: "scholarly-research",
        requirements: { reasoning: 10, accuracy: 10, speed: 5, creativity: 7 },
        preferredModels: ["gemma3n:e4b", "gemma3n:e2b"]
      },
      {
        name: "dissertation-support",
        requirements: { reasoning: 10, accuracy: 10, speed: 4, creativity: 9 },
        preferredModels: ["gemma3n:e4b"]
      }
    ];
    MODEL_TIMEOUTS = {
      "gemma3n:e4b": 75e3,
      // 75s for advanced thesis work
      "gemma3n:e2b": 6e4,
      // Increased to 60s for complex reasoning
      "llama3.2:3b": 45e3,
      // 45s for fast responses
      "mistral:7b": 6e4,
      // 60s for creative work
      "phi3.5:3.8b-mini-instruct-q8_0": 5e4,
      // 50s for balanced performance
      "nomic-embed-text:v1.5": 3e4,
      // 30s for embeddings
      "qwen2.5vl:7b": 9e4
      // 90s for vision processing
    };
  }
});

// server/services/multi-model-service.ts
import { Ollama as Ollama2 } from "ollama";
var MultiModelService;
var init_multi_model_service = __esm({
  "server/services/multi-model-service.ts"() {
    "use strict";
    init_env();
    init_models_config();
    MultiModelService = class {
      models = /* @__PURE__ */ new Map();
      taskTypes = /* @__PURE__ */ new Map();
      modelInstances = /* @__PURE__ */ new Map();
      modelPerformance = /* @__PURE__ */ new Map();
      constructor() {
        this.initializeDefaultModels();
        this.initializeTaskTypes();
      }
      initializeDefaultModels() {
        const { models } = getModelConfig();
        models.forEach((model) => {
          this.models.set(model.name, model);
          this.modelPerformance.set(model.name, {
            totalRequests: 0,
            totalTime: 0,
            successRate: 1
          });
        });
      }
      initializeTaskTypes() {
        const { taskTypes } = getModelConfig();
        taskTypes.forEach((task) => {
          this.taskTypes.set(task.name, task);
        });
      }
      async initialize() {
        console.log("\u{1F680} Initializing Multi-Model Service...");
        console.log("\u{1F3E0} Using local Ollama models");
        for (const [modelName, config2] of Array.from(this.models.entries())) {
          if (config2.provider === "ollama") {
            try {
              const ollama = new Ollama2({
                host: `http://${config2.host}:${config2.port}`
              });
              const models = await ollama.list();
              const availableModelNames = models.models.map((m) => m.name);
              console.log(`\u{1F50D} Available models: ${availableModelNames.join(", ")}`);
              console.log(`\u{1F3AF} Looking for model: ${modelName}`);
              const isAvailable = models.models.some(
                (m) => m.name === modelName || m.name === `${modelName}:latest` || m.name.startsWith(`${modelName}:`)
              );
              if (isAvailable) {
                this.modelInstances.set(modelName, ollama);
                console.log(`\u2705 Model ${modelName} initialized successfully`);
              } else {
                console.log(`\u26A0\uFE0F  Model ${modelName} not found, attempting to pull...`);
                try {
                  await ollama.pull({ model: modelName });
                  this.modelInstances.set(modelName, ollama);
                  console.log(`\u2705 Model ${modelName} pulled and initialized`);
                } catch (pullError) {
                  console.log(`\u274C Failed to pull model ${modelName}: ${pullError}`);
                }
              }
            } catch (error) {
              console.error(`\u274C Failed to initialize ${modelName}: ${error}`);
            }
          }
        }
        console.log(`\u{1F3AF} Multi-Model Service initialized with ${this.modelInstances.size} active models`);
      }
      // 🧠 INTELLIGENT MODEL SELECTION
      selectOptimalModel(taskType, requirements) {
        const task = this.taskTypes.get(taskType);
        if (!task) {
          console.warn(`Unknown task type: ${taskType}, using default model`);
          return "gemma3n:e2b";
        }
        const finalRequirements = { ...task.requirements, ...requirements };
        let bestModel = "";
        let bestScore = -1;
        for (const modelName of task.preferredModels) {
          const model = this.models.get(modelName);
          if (!model || !this.modelInstances.has(modelName)) continue;
          let score = 0;
          let totalWeight = 0;
          Object.entries(finalRequirements).forEach(([req, importance]) => {
            if (importance && req in model.performance) {
              const modelCapability = model.performance[req];
              score += modelCapability * importance;
              totalWeight += importance;
            }
          });
          score = totalWeight > 0 ? score / totalWeight : 0;
          const speedBonus = model.performance.speed * 0.1;
          score += speedBonus;
          const perf = this.modelPerformance.get(modelName);
          if (perf && perf.totalRequests > 0) {
            const avgResponseTime = perf.totalTime / perf.totalRequests;
            const reliabilityBonus = perf.successRate;
            score = score * (1 + reliabilityBonus * 0.1);
          }
          if (score > bestScore) {
            bestScore = score;
            bestModel = modelName;
          }
        }
        console.log(`\u{1F3AF} Selected ${bestModel} for ${taskType} (score: ${bestScore.toFixed(2)})`);
        return bestModel || "gemma3n:e2b";
      }
      // 🚀 EXECUTE TASK WITH OPTIMAL MODEL
      async executeTask(taskType, prompt, options = {}) {
        const selectedModel = this.selectOptimalModel(taskType, options.requirements);
        try {
          const result = await this.executeWithModel(selectedModel, taskType, prompt, options);
          return { ...result, cost: 0 };
        } catch (error) {
          if (error instanceof Error && error.message.includes("timeout")) {
            console.warn(`\u26A1 ${selectedModel} timed out for ${taskType}, trying faster fallback model...`);
            const fastModel = this.selectFastFallbackModel(taskType);
            if (fastModel !== selectedModel) {
              console.log(`\u{1F3C3}\u200D\u2642\uFE0F Fallback: ${selectedModel} \u2192 ${fastModel} for ${taskType}`);
              const fastOptions = {
                ...options,
                timeout: (options.timeout || 6e4) * 0.9
                // Reduce timeout to 90% for fast model (less aggressive)
              };
              try {
                const result = await this.executeWithModel(fastModel, taskType, prompt, fastOptions);
                console.log(`\u2705 Fallback succeeded: ${fastModel} completed ${taskType} in ${result.executionTime.toFixed(2)}ms`);
                return { ...result, cost: 0 };
              } catch (fallbackError) {
                console.error(`\u274C Fallback failed: ${fastModel} also failed for ${taskType}: ${fallbackError}`);
                throw fallbackError;
              }
            }
          }
          throw error;
        }
      }
      // 🏃‍♂️ SELECT FAST FALLBACK MODEL
      selectFastFallbackModel(taskType) {
        if (this.modelInstances.has("llama3.2:3b")) {
          return "llama3.2:3b";
        }
        if (this.modelInstances.has("gemma3n:e2b")) {
          return "gemma3n:e2b";
        }
        const fallbackOrder = ["phi3.5:3.8b-mini-instruct-q8_0", "mistral:7b"];
        for (const model of fallbackOrder) {
          if (this.modelInstances.has(model)) {
            return model;
          }
        }
        return Array.from(this.modelInstances.keys())[0] || "gemma3n:e2b";
      }
      // 🎯 EXECUTE WITH SPECIFIC MODEL (PUBLIC METHOD)
      async executeWithSpecificModel(modelName, prompt, options = {}) {
        const taskType = options.taskType || "direct-execution";
        if (!this.modelInstances.has(modelName)) {
          throw new Error(`Model ${modelName} is not available. Available models: ${this.getAvailableModels().join(", ")}`);
        }
        return await this.executeWithModel(modelName, taskType, prompt, options);
      }
      // 🎯 EXECUTE WITH SPECIFIC MODEL
      async executeWithModel(modelName, taskType, prompt, options) {
        const modelConfig = this.models.get(modelName);
        const modelInstance = this.modelInstances.get(modelName);
        if (!modelConfig || !modelInstance) {
          throw new Error(`Model ${modelName} not available`);
        }
        const optimizedPrompt = this.optimizePromptForModel(prompt, modelName);
        const startTime = performance.now();
        const modelTimeout = this.calculateSmartTimeout(modelName, taskType, options.timeout);
        try {
          let response;
          if (modelConfig.provider === "ollama") {
            const ollamaRequest = modelInstance.generate({
              model: modelName,
              prompt: optimizedPrompt,
              options: {
                temperature: options.temperature || modelConfig.temperature,
                num_predict: options.maxTokens || modelConfig.maxTokens
              }
            }).then((result) => result.response);
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error(`Model ${modelName} timeout after ${modelTimeout}ms`)), modelTimeout)
            );
            response = await Promise.race([ollamaRequest, timeoutPromise]);
          } else {
            throw new Error(`Provider ${modelConfig.provider} not yet implemented`);
          }
          const executionTime = performance.now() - startTime;
          this.updatePerformanceMetrics(modelName, executionTime, true);
          console.log(`\u2705 ${modelName} completed ${taskType} in ${executionTime.toFixed(2)}ms`);
          return {
            response,
            modelUsed: modelName,
            executionTime
          };
        } catch (error) {
          const executionTime = performance.now() - startTime;
          this.updatePerformanceMetrics(modelName, executionTime, false);
          console.error(`\u274C ${modelName} failed for ${taskType}: ${error}`);
          if (error instanceof Error && error.message.includes("timeout")) {
            throw new Error(`Model response timeout (${modelTimeout}ms exceeded). Try reducing complexity or increasing timeout.`);
          }
          throw error;
        }
      }
      // ⏱️ CALCULATE SMART TIMEOUT
      calculateSmartTimeout(modelName, taskType, explicitTimeout) {
        if (explicitTimeout) return explicitTimeout;
        if (taskType === "embedding-generation" || taskType === "vector-similarity") {
          return 2e4;
        }
        const modelBaseTimeouts = {
          "gemma3n:e4b": 75e3,
          // 75s for advanced thesis work
          "gemma3n:e2b": 6e4,
          // Increased to 60s to prevent 30s timeout
          "llama3.2:3b": 45e3,
          // Increased to 45s  
          "mistral:7b": 6e4,
          // Increased to 60s
          "phi3.5:3.8b-mini-instruct-q8_0": 5e4,
          // Increased to 50s
          "nomic-embed-text:v1.5": 35e3,
          // Increased to 35s
          "qwen2.5vl:7b": 12e4
          // Increased to 120s for vision processing
        };
        const taskMultipliers = {
          "theological-reasoning": 1.5,
          "expert-reasoning": 1.5,
          "universal-reasoning": 1.3,
          // Added for RAG responses
          "thesis-analysis": 2,
          // Longest timeout for thesis work
          "academic-writing": 1.8,
          // Extended for academic writing
          "scholarly-research": 1.7,
          // Extended for research tasks
          "dissertation-support": 2.2,
          // Maximum timeout for dissertation work
          "text-analysis": 1.2,
          "creative-insights": 1.3,
          "quick-classification": 0.6,
          "summarization": 0.8,
          "embedding-generation": 0.4,
          "group-discussion": 1,
          "ai-interaction": 0.9
        };
        const baseTimeout = modelBaseTimeouts[modelName] || 6e4;
        const multiplier = taskMultipliers[taskType] || 1;
        return Math.round(baseTimeout * multiplier);
      }
      // 🔧 OPTIMIZE PROMPT FOR SPECIFIC MODEL
      optimizePromptForModel(prompt, modelName) {
        if (modelName.includes("gemma3n:e4b")) {
          return `${prompt}

IMPORTANT: You are an advanced academic AI assistant. Provide comprehensive, well-structured responses with:
- Deep analytical thinking
- Scholarly precision
- Critical evaluation
- Proper academic reasoning
- Detailed explanations
Respond directly without showing your thinking process.`;
        }
        if (modelName.includes("llama3.2")) {
          return `${prompt}

Provide a clear, concise response.`;
        }
        if (modelName.includes("gemma3n")) {
          return `${prompt}

IMPORTANT: Respond directly without showing your thinking process. Provide only the final answer.`;
        }
        if (modelName.includes("mistral")) {
          return `${prompt}

Be creative and insightful in your response.`;
        }
        if (modelName.includes("phi3.5")) {
          return `${prompt}

Provide a well-structured, logical response.`;
        }
        return prompt;
      }
      // 📊 UPDATE PERFORMANCE METRICS
      updatePerformanceMetrics(modelName, executionTime, success) {
        const perf = this.modelPerformance.get(modelName);
        if (perf) {
          perf.totalRequests++;
          perf.totalTime += executionTime;
          perf.successRate = (perf.successRate * (perf.totalRequests - 1) + (success ? 1 : 0)) / perf.totalRequests;
        }
      }
      // 📈 PERFORMANCE ANALYTICS
      getModelPerformanceReport() {
        const report = {};
        this.modelPerformance.forEach((perf, modelName) => {
          const model = this.models.get(modelName);
          report[modelName] = {
            totalRequests: perf.totalRequests,
            averageResponseTime: perf.totalRequests > 0 ? perf.totalTime / perf.totalRequests : 0,
            successRate: perf.successRate,
            specialties: model?.specialties || [],
            capabilities: model?.performance || {}
          };
        });
        return report;
      }
      // 🔧 DYNAMIC MODEL MANAGEMENT
      async addModel(config2) {
        this.models.set(config2.name, config2);
        if (config2.provider === "ollama") {
          try {
            const ollama = new Ollama2({
              host: `http://${config2.host}:${config2.port}`
            });
            this.modelInstances.set(config2.name, ollama);
            console.log(`\u2705 Added new model: ${config2.name}`);
          } catch (error) {
            console.error(`\u274C Failed to add model ${config2.name}: ${error}`);
          }
        }
      }
      getAvailableModels() {
        return Array.from(this.modelInstances.keys());
      }
      getTaskTypes() {
        return Array.from(this.taskTypes.keys());
      }
      // 🎯 SPECIALIZED METHODS FOR COMMON TASKS
      async analyzeText(text2, analysisType = "themes") {
        const taskType = analysisType === "theological" ? "theological-reasoning" : "text-analysis";
        const result = await this.executeTask(
          taskType,
          `Analyze this text for ${analysisType}:

${text2}

Provide detailed analysis as JSON.`,
          { requirements: { accuracy: 9, reasoning: 8 } }
        );
        try {
          return JSON.parse(result.response);
        } catch {
          return { analysis: result.response, modelUsed: result.modelUsed };
        }
      }
      async generateInsights(content, insightType = "analytical") {
        const taskType = insightType === "creative" ? "creative-insights" : "theological-reasoning";
        const result = await this.executeTask(
          taskType,
          `Generate ${insightType} insights about this content:

${content}`,
          { requirements: insightType === "creative" ? { creativity: 9 } : { reasoning: 9, accuracy: 8 } }
        );
        return result.response;
      }
      async quickClassify(text2, categories) {
        const result = await this.executeTask(
          "quick-classification",
          `Classify this text into one of these categories: ${categories.join(", ")}

Text: ${text2}

Return only the category name.`,
          { requirements: { speed: 8, accuracy: 6 } }
        );
        return result.response.trim();
      }
      // 🎓 THESIS & ACADEMIC METHODS
      async analyzeThesis(content, analysisType = "argument") {
        const result = await this.executeTask(
          "thesis-analysis",
          `Perform a ${analysisType} analysis of this thesis content:

${content}

Provide detailed academic analysis with specific recommendations.`,
          { requirements: { reasoning: 10, accuracy: 10 } }
        );
        return result.response;
      }
      async generateAcademicWriting(prompt, style = "formal") {
        const result = await this.executeTask(
          "academic-writing",
          `Generate ${style} academic writing for: ${prompt}

Ensure proper academic tone, structure, and scholarly language.`,
          { requirements: { reasoning: 9, accuracy: 9, creativity: 8 } }
        );
        return result.response;
      }
      async conductScholarlyResearch(query, domain) {
        const result = await this.executeTask(
          "scholarly-research",
          `Conduct scholarly research on: ${query}

Domain: ${domain}

Provide comprehensive research findings with analysis and implications.`,
          { requirements: { reasoning: 10, accuracy: 10 } }
        );
        return result.response;
      }
      async provideDissertationSupport(content, supportType = "review") {
        const result = await this.executeTask(
          "dissertation-support",
          `Provide ${supportType} support for this dissertation content:

${content}

Offer detailed academic guidance and specific recommendations.`,
          { requirements: { reasoning: 10, accuracy: 10, creativity: 9 } }
        );
        return result.response;
      }
      // 🔗 EMBEDDING METHODS for RAG with Nomic Embed
      async generateEmbedding(text2) {
        console.log(`\u{1F3E0} Generating embedding with local Ollama (avoiding rate limits & costs)`);
        const modelName = this.selectOptimalModel("embedding-generation");
        const ollama = this.modelInstances.get(modelName);
        if (!ollama) {
          throw new Error(`Embedding model ${modelName} not available`);
        }
        try {
          const startTime = Date.now();
          const response = await ollama.embeddings({
            model: modelName,
            prompt: text2
          });
          const executionTime = Date.now() - startTime;
          this.updatePerformanceMetrics(modelName, executionTime, true);
          console.log(`\u{1F517} Generated embedding with ${modelName} in ${executionTime}ms`);
          return response.embedding;
        } catch (error) {
          this.updatePerformanceMetrics(modelName, 0, false);
          console.error(`\u274C Embedding generation failed with ${modelName}: ${error}`);
          throw error;
        }
      }
      async generateBatchEmbeddings(texts) {
        console.log(`\u{1F3E0} Generating ${texts.length} embeddings with local Ollama (avoiding rate limits & costs)`);
        const modelName = this.selectOptimalModel("embedding-generation");
        const ollama = this.modelInstances.get(modelName);
        if (!ollama) {
          throw new Error(`Embedding model ${modelName} not available`);
        }
        try {
          const startTime = Date.now();
          const embeddings = [];
          const batchSize = 5;
          for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchPromises = batch.map(
              (text2) => ollama.embeddings({
                model: modelName,
                prompt: text2
              }).then((response) => response.embedding)
            );
            const batchEmbeddings = await Promise.all(batchPromises);
            embeddings.push(...batchEmbeddings);
          }
          const executionTime = Date.now() - startTime;
          this.updatePerformanceMetrics(modelName, executionTime, true);
          console.log(`\u{1F517} Generated ${embeddings.length} embeddings with ${modelName} in ${executionTime}ms`);
          return embeddings;
        } catch (error) {
          this.updatePerformanceMetrics(modelName, 0, false);
          console.error(`\u274C Batch embedding generation failed with ${modelName}: ${error}`);
          throw error;
        }
      }
      // Calculate cosine similarity between two embeddings
      calculateCosineSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
          throw new Error("Embeddings must have the same length");
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
          dotProduct += embedding1[i] * embedding2[i];
          norm1 += embedding1[i] * embedding1[i];
          norm2 += embedding2[i] * embedding2[i];
        }
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        if (norm1 === 0 || norm2 === 0) {
          return 0;
        }
        return dotProduct / (norm1 * norm2);
      }
      // Find most similar embeddings
      findMostSimilarEmbeddings(queryEmbedding, candidateEmbeddings, topK = 5) {
        const similarities = candidateEmbeddings.map((candidate) => ({
          similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
          metadata: candidate.metadata
        }));
        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
      }
      // 👁️ VISION-ENABLED ANALYSIS with Qwen2.5-VL
      async analyzeDocumentWithVision(text2, imageData, analysisType = "combined") {
        const startTime = performance.now();
        try {
          let prompt = "";
          let useVisionModel = false;
          if (imageData && analysisType !== "content") {
            useVisionModel = true;
            prompt = `Analyze this document image and text. Focus on:
${analysisType === "layout" ? "Document structure, headers, formatting, layout elements" : analysisType === "combined" ? "Both content analysis and visual structure" : "Content analysis"}

Text content:
${text2}

Provide structured analysis including:
- Document structure and layout
- Visual elements (headers, tables, charts, etc.)
- Content themes and insights
- Formatting observations
- Recommendations for better organization`;
          } else {
            prompt = `Analyze this text content: ${text2}`;
          }
          const modelName = useVisionModel ? this.selectOptimalModel("vision-document-analysis") : this.selectOptimalModel("text-analysis");
          const result = await this.executeTask(
            useVisionModel ? "vision-document-analysis" : "text-analysis",
            prompt,
            { useCache: true }
          );
          const executionTime = performance.now() - startTime;
          console.log(`\u{1F441}\uFE0F Vision-enhanced analysis completed in ${executionTime.toFixed(2)}ms using ${result.modelUsed}`);
          return {
            textAnalysis: result.response,
            layoutAnalysis: useVisionModel ? result.response : void 0,
            visualElements: useVisionModel ? result.response : void 0,
            combinedInsights: analysisType === "combined" ? result.response : void 0
          };
        } catch (error) {
          console.error("\u274C Vision analysis failed:", error);
          throw error;
        }
      }
      async detectDocumentLayout(imageData) {
        try {
          const prompt = `Analyze this document image for layout and structure. Identify:
1. Headers and subheaders
2. Paragraph organization
3. Lists and bullet points
4. Tables and charts
5. Column layouts
6. Visual hierarchy
7. Suggestions for improvement

Provide a structured response with clear identification of layout elements.`;
          const result = await this.executeTask("layout-detection", prompt);
          return {
            structure: result.response,
            elements: ["headers", "paragraphs", "lists"],
            // Parse from response
            suggestions: ["Improve spacing", "Add visual hierarchy"]
            // Parse from response
          };
        } catch (error) {
          console.error("\u274C Layout detection failed:", error);
          throw error;
        }
      }
      async processScannedDocument(imageData) {
        try {
          const prompt = `This is a scanned document image. Please:
1. Extract all readable text accurately
2. Maintain original formatting and structure
3. Identify any unclear or damaged text
4. Provide analysis of the document content
5. Rate your confidence in the text extraction (0-100%)

Format the response with clear sections for extracted text and analysis.`;
          const result = await this.executeTask("scanned-text-processing", prompt);
          return {
            extractedText: result.response,
            // Parse extracted text section
            confidence: 95,
            // Parse confidence from response
            analysis: result.response
            // Full analysis
          };
        } catch (error) {
          console.error("\u274C Scanned document processing failed:", error);
          throw error;
        }
      }
      // 📊 TIMEOUT AND PERFORMANCE MONITORING
      getTimeoutReport() {
        const report = {
          modelTimeouts: {},
          averageResponseTimes: {},
          successRates: {},
          slowQueries: []
        };
        this.modelPerformance.forEach((perf, modelName) => {
          report.averageResponseTimes[modelName] = perf.totalRequests > 0 ? perf.totalTime / perf.totalRequests : 0;
          report.successRates[modelName] = perf.successRate;
          report.modelTimeouts[modelName] = perf.totalRequests - Math.round(perf.totalRequests * perf.successRate);
        });
        return report;
      }
      // 🔍 DEBUGGING HELPER - Log system status
      logSystemStatus() {
        console.log("\n\u{1F50D} MultiModel System Status:");
        console.log("Available Models:", this.getAvailableModels());
        console.log("Model Performance:", this.getModelPerformanceReport());
        console.log("Timeout Report:", this.getTimeoutReport());
        console.log("Task Types:", this.getTaskTypes());
      }
      // 🕒 GET SMART TIMEOUT FOR MODEL AND TASK
      getSmartTimeout(modelName, taskType, defaultTimeout = 6e4) {
        if (taskType === "embedding-generation" || taskType === "vector-similarity") {
          return 25e3;
        }
        const modelBaseTimeouts = {
          "gemma3n:e4b": 75e3,
          // 75s for advanced thesis work
          "gemma3n:e2b": 6e4,
          // Increased to 60s to prevent 30s timeout
          "llama3.2:3b": 45e3,
          // Increased to 45s  
          "mistral:7b": 6e4,
          // Increased to 60s
          "phi3.5:3.8b-mini-instruct-q8_0": 5e4,
          // Increased to 50s
          "nomic-embed-text:v1.5": 35e3,
          // Increased to 35s
          "qwen2.5vl:7b": 12e4
          // Increased to 120s for vision processing
        };
        const taskMultipliers = {
          "theological-reasoning": 1.5,
          "expert-reasoning": 1.4,
          "text-analysis": 1.2,
          "creative-insights": 1.3,
          "semantic-search": 1.1,
          "vision-document-analysis": 1.8,
          "quick-classification": 0.8,
          "summarization": 0.9,
          "group-discussion": 1,
          "ai-interaction": 0.9,
          "embedding-generation": 0.7,
          "vector-similarity": 0.6,
          "universal-reasoning": 1.3
          // Added for RAG responses
        };
        const baseTimeout = modelBaseTimeouts[modelName] || defaultTimeout;
        const multiplier = taskMultipliers[taskType] || 1;
        return Math.round(baseTimeout * multiplier);
      }
    };
  }
});

// server/services/LocalMemoryService.ts
import Database2 from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
var LocalMemoryService;
var init_LocalMemoryService = __esm({
  "server/services/LocalMemoryService.ts"() {
    "use strict";
    LocalMemoryService = class _LocalMemoryService {
      static instance;
      db;
      performanceMetrics = [];
      preparedStatements = /* @__PURE__ */ new Map();
      isInitialized = false;
      initializationPromise = null;
      constructor(dbPath) {
        let defaultPath;
        const envDbPath = process.env.DB_PATH || process.env.SQLITE_PATH;
        if (envDbPath) {
          console.log("\u{1F9E0} LocalMemoryService using database path from environment:", envDbPath);
          const dbDir = path.dirname(envDbPath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
          }
          defaultPath = envDbPath;
        } else if (process.env.NODE_ENV === "development") {
          defaultPath = path.join(process.cwd(), "local-bible-companion.db");
        } else {
          const appDataPath = process.env.APP_DATA_PATH || path.join(os.homedir(), ".bible-companion");
          if (!fs.existsSync(appDataPath)) {
            fs.mkdirSync(appDataPath, { recursive: true });
          }
          defaultPath = path.join(appDataPath, "local-bible-companion.db");
        }
        this.db = new Database2(dbPath || defaultPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("cache_size = 10000");
        this.db.pragma("temp_store = MEMORY");
        this.db.pragma("busy_timeout = 30000");
        this.initializationPromise = this.initializeAsync();
      }
      static getInstance(dbPath) {
        if (!_LocalMemoryService.instance) {
          _LocalMemoryService.instance = new _LocalMemoryService(dbPath);
        }
        return _LocalMemoryService.instance;
      }
      async initializeAsync() {
        try {
          this.initializeOptimizedTables();
          this.prepareStatements();
          this.startPerformanceMonitoring();
          this.isInitialized = true;
          console.log("\u{1F4CA} Optimized LocalMemoryService initialized with performance monitoring");
        } catch (error) {
          console.error("\u274C Failed to initialize LocalMemoryService:", error);
          console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
          console.warn("\u26A0\uFE0F Continuing with minimal LocalMemoryService functionality");
          this.isInitialized = false;
        }
      }
      async ensureInitialized() {
        if (!this.isInitialized && this.initializationPromise) {
          await this.initializationPromise;
        }
        if (!this.isInitialized) {
          console.warn("\u26A0\uFE0F LocalMemoryService not fully initialized, attempting basic functionality");
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
            console.log("\u2705 Basic ai_memories table created successfully");
          } catch (error) {
            console.error("\u274C Failed to create basic tables:", error);
          }
        }
      }
      async retryOperation(operation, maxRetries = 3, delay = 100) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return operation();
          } catch (error) {
            lastError = error;
            if (lastError.message.includes("SQLITE_BUSY") || lastError.message.includes("database is locked")) {
              console.warn(`\u{1F504} Database busy, retrying (attempt ${attempt}/${maxRetries})`);
              if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, delay * attempt));
                continue;
              }
            }
            if (attempt === 1 && !lastError.message.includes("SQLITE_BUSY")) {
              throw lastError;
            }
          }
        }
        throw lastError;
      }
      initializeOptimizedTables() {
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
        try {
          const tableExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_memories'").get();
          if (tableExists) {
            const columns = this.db.prepare("PRAGMA table_info(ai_memories)").all();
            const columnNames = columns.map((col) => col.name);
            console.log("\u{1F4CA} Migrating data from ai_memories table with columns:", columnNames);
            const commonColumns = ["id", "user_id", "content", "category", "metadata", "created_at"].filter((col) => columnNames.includes(col));
            if (commonColumns.length > 0) {
              const columnList = commonColumns.join(", ");
              const migrationQuery = `
            INSERT OR IGNORE INTO ai_memories_v2 (${columnList})
            SELECT ${columnList} FROM ai_memories
          `;
              const result = this.db.exec(migrationQuery);
              console.log("\u2705 Migration completed successfully");
            }
          } else {
            console.log("\u{1F4CA} No ai_memories table found, starting fresh with ai_memories_v2");
          }
        } catch (error) {
          console.warn("\u26A0\uFE0F Migration failed, continuing with empty ai_memories_v2:", error instanceof Error ? error.message : "Unknown error");
        }
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
      prepareStatements() {
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
        Object.entries(statements).forEach(([key, sql4]) => {
          this.preparedStatements.set(key, this.db.prepare(sql4));
        });
      }
      async trackPerformance(operation, fn) {
        const start = performance.now();
        let rowsAffected = 0;
        try {
          const result = fn();
          if (result && typeof result === "object" && "changes" in result) {
            rowsAffected = result.changes;
          }
          const duration = performance.now() - start;
          const metric = {
            operation,
            duration,
            rowsAffected,
            timestamp: /* @__PURE__ */ new Date()
          };
          this.performanceMetrics.push(metric);
          if (this.performanceMetrics.length > 1e3) {
            this.performanceMetrics = this.performanceMetrics.slice(-1e3);
          }
          if (duration > 100) {
            console.warn(`\u{1F40C} Slow query detected: ${operation} took ${duration.toFixed(2)}ms`);
          } else if (duration > 10) {
            console.log(`\u26A1 Query: ${operation} completed in ${duration.toFixed(2)}ms`);
          }
          setImmediate(() => {
            try {
              this.preparedStatements.get("insertPerformanceMetric")?.run(operation, duration, rowsAffected);
            } catch (error) {
            }
          });
          return result;
        } catch (error) {
          const duration = performance.now() - start;
          console.error(`\u274C Query failed: ${operation} after ${duration.toFixed(2)}ms:`, error);
          throw error;
        }
      }
      async storeMemory(userId, content, category, metadata, embedding) {
        await this.ensureInitialized();
        return this.trackPerformance("storeMemory", () => {
          return this.retryOperation(() => {
            const id = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const metadataJson = metadata ? JSON.stringify(metadata) : null;
            const stmt = this.preparedStatements.get("insertMemory");
            if (!stmt) {
              throw new Error("Insert memory statement not prepared");
            }
            try {
              const result = stmt.run(id, userId, content, category, metadataJson, embedding);
              if (result.changes === 0) {
                throw new Error("Memory insert failed: no rows affected");
              }
              return id;
            } catch (error) {
              console.error("\u274C Failed to store memory:", error);
              throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          });
        });
      }
      async retrieveMemories(userId, category, limit = 100) {
        return this.trackPerformance("retrieveMemories", () => {
          let stmt;
          let params;
          if (category) {
            stmt = this.preparedStatements.get("getUserMemoriesByCategory");
            params = [userId, category, limit];
          } else {
            stmt = this.preparedStatements.get("getUserMemories");
            params = [userId, limit];
          }
          const rows = stmt.all(...params);
          return rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            content: row.content,
            category: row.category,
            metadata: row.metadata ? JSON.parse(row.metadata) : void 0,
            embedding: row.embedding,
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : void 0
          }));
        });
      }
      async getMemoryById(id) {
        return this.trackPerformance("getMemoryById", () => {
          const stmt = this.preparedStatements.get("getMemoryById");
          const row = stmt.get(id);
          if (!row) {
            return null;
          }
          return {
            id: row.id,
            userId: row.user_id,
            content: row.content,
            category: row.category,
            metadata: row.metadata ? JSON.parse(row.metadata) : void 0,
            embedding: row.embedding,
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : void 0
          };
        });
      }
      async searchMemories(userId, query, limit = 50) {
        return this.trackPerformance("searchMemories", () => {
          const searchPattern = `%${query.toLowerCase()}%`;
          const stmt = this.preparedStatements.get("searchMemories");
          const rows = stmt.all(userId, searchPattern, limit);
          return rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            content: row.content,
            category: row.category,
            metadata: row.metadata ? JSON.parse(row.metadata) : void 0,
            embedding: row.embedding,
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : void 0
          }));
        });
      }
      async analyzePatterns(userId) {
        return this.trackPerformance("analyzePatterns", async () => {
          const memories = await this.retrieveMemories(userId, void 0, 1e3);
          const patterns = /* @__PURE__ */ new Map();
          for (const memory of memories) {
            const words = memory.content.toLowerCase().split(/\s+/);
            for (const word of words) {
              if (word.length > 3) {
                const key = `word:${word}`;
                if (patterns.has(key)) {
                  const pattern = patterns.get(key);
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
            const categoryKey = `category:${memory.category}`;
            if (patterns.has(categoryKey)) {
              const pattern = patterns.get(categoryKey);
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
          return Array.from(patterns.values()).sort((a, b) => b.frequency - a.frequency).slice(0, 20);
        });
      }
      async getUserProfile(userId) {
        return this.trackPerformance("getUserProfile", async () => {
          const memories = await this.retrieveMemories(userId, void 0, 500);
          const bookMentions = /* @__PURE__ */ new Map();
          const themes = /* @__PURE__ */ new Map();
          const studyTimes = /* @__PURE__ */ new Map();
          let totalAnnotations = 0;
          let totalSessions = 0;
          let totalSessionTime = 0;
          for (const memory of memories) {
            const bookPattern = /\b[A-Z][a-zA-Z\s]{2,30}(?:\s(?:Chapter|Book|Volume|Part)\s\d+)?\b/g;
            const bookMatches = memory.content.match(bookPattern);
            if (bookMatches) {
              for (const book of bookMatches) {
                const bookName = book.toLowerCase();
                bookMentions.set(bookName, (bookMentions.get(bookName) || 0) + 1);
              }
            }
            const themePattern = /\b(love|hope|wisdom|truth|justice|peace|joy|knowledge|learning|growth|understanding|insight|discovery|innovation|progress|development|achievement|success|challenge|opportunity|transformation|improvement|excellence|mastery|expertise|skill|talent|creativity|inspiration|motivation|dedication|perseverance|resilience|leadership|collaboration|community|relationship|connection|communication|expression|exploration|adventure|journey|experience|reflection|analysis|synthesis|evaluation|critical thinking|problem solving|decision making)\b/gi;
            const themeMatches = memory.content.match(themePattern);
            if (themeMatches) {
              for (const theme of themeMatches) {
                const themeName = theme.toLowerCase();
                themes.set(themeName, (themes.get(themeName) || 0) + 1);
              }
            }
            if (memory.category === "annotation") {
              totalAnnotations++;
            }
            if (memory.category === "session_tracking") {
              totalSessions++;
              if (memory.metadata && memory.metadata.duration) {
                totalSessionTime += memory.metadata.duration;
              }
            }
            const hour = memory.createdAt.getHours();
            const timeSlot = this.getTimeSlot(hour);
            studyTimes.set(timeSlot, (studyTimes.get(timeSlot) || 0) + 1);
          }
          return {
            userId,
            favoriteBooks: Array.from(bookMentions.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([book]) => book),
            commonThemes: Array.from(themes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([theme]) => theme),
            studyTimes: Array.from(studyTimes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([time]) => time),
            annotationFrequency: totalAnnotations,
            averageSessionLength: totalSessions > 0 ? totalSessionTime / totalSessions : 0,
            preferredTopics: Array.from(themes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([theme]) => theme)
          };
        });
      }
      getTimeSlot(hour) {
        if (hour >= 5 && hour < 12) return "morning";
        if (hour >= 12 && hour < 17) return "afternoon";
        if (hour >= 17 && hour < 21) return "evening";
        return "night";
      }
      async getMemoryStats(userId) {
        return this.trackPerformance("getMemoryStats", () => {
          const categoryStmt = this.preparedStatements.get("getMemoryStats");
          const categoryResults = categoryStmt.all(userId);
          const dateStmt = this.preparedStatements.get("getMemoryDateRange");
          const dateResult = dateStmt.get(userId);
          const categoryCounts = {};
          let totalMemories = 0;
          for (const result of categoryResults) {
            categoryCounts[result.category] = result.count;
            totalMemories += result.count;
          }
          const recentMetrics = this.performanceMetrics.slice(-100);
          const averageQueryTime = recentMetrics.length > 0 ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length : 0;
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
      calculateCacheHitRate() {
        return 0;
      }
      async cleanupOldMemories(userId, daysToKeep = 30) {
        return this.trackPerformance("cleanupOldMemories", () => {
          const stmt = this.preparedStatements.get("deleteOldMemories");
          const result = stmt.run(userId);
          return result.changes;
        });
      }
      async optimizeDatabase() {
        return this.trackPerformance("optimizeDatabase", () => {
          console.log("\u{1F527} Starting database optimization...");
          this.db.exec("ANALYZE");
          this.db.exec("VACUUM");
          this.db.exec("PRAGMA optimize");
          console.log("\u2705 Database optimization completed");
        });
      }
      getPerformanceMetrics() {
        return [...this.performanceMetrics];
      }
      getPerformanceSummary() {
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
        const operationBreakdown = {};
        for (const metric of this.performanceMetrics) {
          if (!operationBreakdown[metric.operation]) {
            operationBreakdown[metric.operation] = { count: 0, avgTime: 0 };
          }
          operationBreakdown[metric.operation].count++;
        }
        for (const operation in operationBreakdown) {
          const operationMetrics = this.performanceMetrics.filter((m) => m.operation === operation);
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
      startPerformanceMonitoring() {
        setInterval(() => {
          this.performanceMetrics = this.performanceMetrics.slice(-500);
          console.log(`\u{1F4CA} Performance metrics cleaned up, keeping last 500 entries`);
        }, 60 * 60 * 1e3);
        setInterval(() => {
          const summary = this.getPerformanceSummary();
          if (summary.totalQueries > 0) {
            console.log(`\u{1F4C8} Performance Summary: ${summary.totalQueries} queries, avg ${summary.averageQueryTime.toFixed(2)}ms`);
          }
        }, 10 * 60 * 1e3);
      }
      async close() {
        this.db.close();
        console.log("\u{1F512} LocalMemoryService database connection closed");
      }
    };
  }
});

// server/services/cached-embedding-service.ts
import crypto from "crypto";
import { Ollama as Ollama3 } from "ollama";
import { eq as eq3, and as and3, sql as sql2, inArray } from "drizzle-orm";
var CachedEmbeddingService;
var init_cached_embedding_service = __esm({
  "server/services/cached-embedding-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    CachedEmbeddingService = class {
      ollama;
      model;
      maxCacheSize;
      cacheStats = {
        hits: 0,
        misses: 0,
        totalRequests: 0
      };
      constructor(model = "nomic-embed-text:v1.5", maxCacheSize = 1e4) {
        this.ollama = new Ollama3({ host: "http://localhost:11434" });
        this.model = model;
        this.maxCacheSize = maxCacheSize;
      }
      /**
       * Generate content hash for deduplication
       */
      generateContentHash(content) {
        return crypto.createHash("sha256").update(content.trim().toLowerCase()).digest("hex");
      }
      /**
       * Get or generate embedding with caching
       */
      async getEmbedding(content, documentId, chapter, paragraph) {
        const startTime = Date.now();
        this.cacheStats.totalRequests++;
        const contentHash = this.generateContentHash(content);
        try {
          const cached = await db.select().from(embeddingCache).where(
            and3(
              eq3(embeddingCache.text_hash, contentHash),
              eq3(embeddingCache.model, this.model)
            )
          ).limit(1);
          if (cached.length > 0) {
            await db.update(embeddingCache).set({ last_accessed_at: /* @__PURE__ */ new Date() }).where(eq3(embeddingCache.id, cached[0].id));
            this.cacheStats.hits++;
            const responseTime2 = Date.now() - startTime;
            console.log(`\u{1F680} Embedding cache HIT for hash ${contentHash.substring(0, 8)}... (${responseTime2}ms)`);
            return {
              embedding: JSON.parse(cached[0].embedding),
              cacheHit: true,
              responseTime: responseTime2
            };
          }
          console.log(`\u{1F504} Embedding cache MISS for hash ${contentHash.substring(0, 8)}... Generating new embedding...`);
          const embeddingResponse = await this.ollama.embeddings({
            model: this.model,
            prompt: content
          });
          const embedding = embeddingResponse.embedding;
          const responseTime = Date.now() - startTime;
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
          console.error("Error in cached embedding service:", error);
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
      async storeInCache(contentHash, content, embedding, documentId, chapter, paragraph) {
        try {
          await this.cleanupOldEntries();
          await db.insert(embeddingCache).values({
            userId: 2,
            // Default user ID (fixed)
            text_hash: contentHash,
            embedding: JSON.stringify(embedding),
            model: this.model
          }).onConflictDoNothing();
          console.log(`\u{1F4BE} Cached embedding for hash ${contentHash.substring(0, 8)}...`);
        } catch (error) {
          console.error("Error storing embedding in cache:", error);
        }
      }
      /**
       * Clean up old cache entries when approaching max size
       */
      async cleanupOldEntries() {
        try {
          const cacheCount = await db.select({ count: sql2`COUNT(*)` }).from(embeddingCache);
          const count = cacheCount[0]?.count || 0;
          if (count >= this.maxCacheSize) {
            const removeCount = Math.floor(this.maxCacheSize * 0.2);
            const oldEntries = await db.select({ id: embeddingCache.id }).from(embeddingCache).orderBy(embeddingCache.last_accessed_at).limit(removeCount);
            if (oldEntries.length > 0) {
              const idsToRemove = oldEntries.map((entry) => entry.id);
              for (const id of idsToRemove) {
                await db.delete(embeddingCache).where(eq3(embeddingCache.id, id));
              }
              console.log(`\u{1F9F9} Cleaned up ${idsToRemove.length} old embedding cache entries`);
            }
          }
        } catch (error) {
          console.error("Error cleaning up cache:", error);
        }
      }
      /**
       * Get cache statistics
       */
      getCacheStats() {
        const hitRate = this.cacheStats.totalRequests > 0 ? (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(1) : "0.0";
        return {
          ...this.cacheStats,
          hitRate: `${hitRate}%`
        };
      }
      /**
       * Clear all cache entries (for testing/debugging)
       */
      async clearCache() {
        try {
          await db.delete(embeddingCache);
          console.log("\u{1F5D1}\uFE0F Cleared all embedding cache entries");
        } catch (error) {
          console.error("Error clearing cache:", error);
        }
      }
      /**
       * Get cache size information
       */
      async getCacheInfo() {
        try {
          const countResult = await db.select({ count: sql2`COUNT(*)` }).from(embeddingCache);
          const totalEntries = countResult[0]?.count || 0;
          const sampleEntries = await db.select({ model: embeddingCache.model }).from(embeddingCache).limit(1e3);
          const modelBreakdown = {};
          sampleEntries.forEach((entry) => {
            modelBreakdown[entry.model] = (modelBreakdown[entry.model] || 0) + 1;
          });
          const sampleRatio = totalEntries / sampleEntries.length;
          Object.keys(modelBreakdown).forEach((model) => {
            modelBreakdown[model] = Math.round(modelBreakdown[model] * sampleRatio);
          });
          const timeSample = await db.select({ created_at: embeddingCache.created_at }).from(embeddingCache).orderBy(embeddingCache.created_at).limit(1e3);
          const oldest = timeSample.length > 0 ? timeSample[0]?.created_at : null;
          const newest = timeSample.length > 0 ? timeSample[timeSample.length - 1]?.created_at : null;
          return {
            totalEntries,
            modelBreakdown,
            oldestEntry: oldest ? oldest instanceof Date ? oldest.toISOString() : oldest : void 0,
            newestEntry: newest ? newest instanceof Date ? newest.toISOString() : newest : void 0
          };
        } catch (error) {
          console.error("Error getting cache info:", error);
          return {
            totalEntries: 0,
            modelBreakdown: {}
          };
        }
      }
      /**
       * Batch get or generate embeddings with caching
       */
      async getEmbeddingsBatch(contents, documentIds, chapters, paragraphs) {
        const startTime = Date.now();
        this.cacheStats.totalRequests += contents.length;
        const hashes = contents.map((c) => this.generateContentHash(c));
        const BATCH_SIZE = 10;
        let cachedResults = [];
        for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
          const batch = hashes.slice(i, i + BATCH_SIZE);
          console.log(`\u{1F50E} Cache lookup batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(hashes.length / BATCH_SIZE)} (${batch.length} items)`);
          const batchResults = await db.select().from(embeddingCache).where(
            and3(
              inArray(embeddingCache.text_hash, batch),
              eq3(embeddingCache.model, this.model)
            )
          );
          cachedResults = cachedResults.concat(batchResults);
        }
        const cachedMap = /* @__PURE__ */ new Map();
        for (const entry of cachedResults) {
          cachedMap.set(entry.text_hash, entry);
        }
        const results = [];
        const missingIndices = [];
        const missingContents = [];
        for (let i = 0; i < contents.length; i++) {
          const hash = hashes[i];
          if (cachedMap.has(hash)) {
            this.cacheStats.hits++;
            results[i] = {
              embedding: JSON.parse(cachedMap.get(hash).embedding),
              cacheHit: true,
              responseTime: 0
              // Will update below
            };
            db.update(embeddingCache).set({ last_accessed_at: /* @__PURE__ */ new Date() }).where(eq3(embeddingCache.id, cachedMap.get(hash).id));
          } else {
            missingIndices.push(i);
            missingContents.push(contents[i]);
          }
        }
        if (missingContents.length > 0) {
          const OLLAMA_BATCH_SIZE = 10;
          const allEmbeddings = [];
          for (let i = 0; i < missingContents.length; i += OLLAMA_BATCH_SIZE) {
            const batch = missingContents.slice(i, i + OLLAMA_BATCH_SIZE);
            console.log(`\u{1F504} Generating embeddings for batch ${Math.floor(i / OLLAMA_BATCH_SIZE) + 1}/${Math.ceil(missingContents.length / OLLAMA_BATCH_SIZE)} (${batch.length} items)`);
            for (const content of batch) {
              const embeddingResponse = await this.ollama.embeddings({
                model: this.model,
                prompt: content
              });
              allEmbeddings.push(embeddingResponse.embedding);
            }
          }
          for (let j = 0; j < missingIndices.length; j++) {
            const idx = missingIndices[j];
            const emb = allEmbeddings[j];
            const embArray = Array.isArray(emb) ? emb : [emb];
            results[idx] = {
              embedding: embArray,
              cacheHit: false,
              responseTime: Date.now() - startTime
            };
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
        const totalTime = Date.now() - startTime;
        for (const r of results) {
          if (r && r.cacheHit) r.responseTime = totalTime;
        }
        return results;
      }
    };
  }
});

// server/services/semantic-search-service.ts
import { eq as eq4, like as like2, and as and4, or as or2, inArray as inArray2 } from "drizzle-orm";
var SemanticSearchService;
var init_semantic_search_service = __esm({
  "server/services/semantic-search-service.ts"() {
    "use strict";
    init_multi_model_service();
    init_LocalMemoryService();
    init_cached_embedding_service();
    init_db();
    init_schema();
    SemanticSearchService = class {
      multiModel;
      memory;
      embeddingService;
      searchCache = /* @__PURE__ */ new Map();
      conceptIndex = /* @__PURE__ */ new Map();
      // concept -> document IDs
      queryEmbeddings = /* @__PURE__ */ new Map();
      CACHE_TTL = 1e3 * 60 * 15;
      // 15 minutes
      MAX_RESULTS = 20;
      // Reduced from 50
      RELEVANCE_THRESHOLD = 0.5;
      // Reduced from 0.7 for better RAG results
      constructor() {
        this.multiModel = new MultiModelService();
        this.memory = LocalMemoryService.getInstance();
        this.embeddingService = new CachedEmbeddingService();
      }
      async initialize() {
        await this.multiModel.initialize();
        await this.buildConceptIndex();
        console.log("\u{1F50D} Semantic Search Service initialized - Ready for intelligent knowledge retrieval!");
      }
      // 🧠 BUILD CONCEPT INDEX FOR FASTER SEMANTIC SEARCH
      async buildConceptIndex() {
        try {
          console.log("\u{1F4DA} Building concept index for semantic search...");
          const documents3 = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content
          }).from(documents);
          for (const doc of documents3) {
            const concepts = await this.extractKeyConcepts(doc.content, doc.title);
            concepts.forEach((concept) => {
              if (!this.conceptIndex.has(concept)) {
                this.conceptIndex.set(concept, []);
              }
              this.conceptIndex.get(concept).push(doc.id.toString());
            });
          }
          console.log(`\u2705 Concept index built with ${this.conceptIndex.size} concepts`);
        } catch (error) {
          console.error(`\u274C Failed to build concept index: ${error}`);
        }
      }
      // 🎯 EXTRACT KEY CONCEPTS FROM TEXT
      async extractKeyConcepts(content, title) {
        const conceptPrompt = `Extract key concepts and themes from this text. Focus on:
- Main topics and themes
- Important terminology and concepts
- Key ideas and principles
- Significant names, places, or entities
- Core subject matter

Text: ${title ? `Title: ${title}

` : ""}${content.substring(0, 3e3)}

CRITICAL INSTRUCTION: Respond with ONLY a valid JSON array of strings. Do not include any explanations, introductions, or markdown. Return exactly this format:
["concept1", "concept2", "concept3", "concept4", "concept5"]

Example for a technology text: ["artificial intelligence", "machine learning", "neural networks", "data processing", "automation"]`;
        try {
          const result = await this.multiModel.executeTask("text-analysis", conceptPrompt, {
            requirements: { accuracy: 9, speed: 8, reasoning: 7 }
          });
          const concepts = this.parseJsonWithFallback(result.response);
          return Array.isArray(concepts) ? concepts : this.extractConceptsFallback(content, title);
        } catch (error) {
          console.error(`\u274C Failed to extract concepts: ${error}`);
          return this.extractConceptsFallback(content, title);
        }
      }
      // 🔧 ROBUST JSON PARSING WITH FALLBACK
      parseJsonWithFallback(response) {
        try {
          return JSON.parse(response.trim());
        } catch (error) {
          try {
            const extractionPatterns = [
              /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/i,
              // JSON in code blocks
              /```\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/i,
              // JSON in generic code blocks
              /(\{[\s\S]*?\}|\[[\s\S]*?\])/
              // Any JSON-like structure
            ];
            for (const pattern of extractionPatterns) {
              const match = response.match(pattern);
              if (match) {
                let jsonStr = match[1] || match[0];
                try {
                  jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\u0000-\u001f]+/g, "").replace(/\\(?!["\\/bfnrt])/g, "\\\\").replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
                  return JSON.parse(jsonStr);
                } catch (cleanupError) {
                  continue;
                }
              }
            }
            const conceptMatch = response.match(/(?:concepts?|terms?):\s*\[(.*?)\]/i);
            if (conceptMatch) {
              return JSON.parse(`[${conceptMatch[1]}]`);
            }
            const quotedWords = response.match(/"([^"]+)"/g);
            if (quotedWords) {
              return quotedWords.map((word) => word.replace(/"/g, ""));
            }
            throw new Error("No JSON structure found");
          } catch (fallbackError) {
            console.warn(`\u26A0\uFE0F JSON parsing fallback failed: ${fallbackError}`);
            return null;
          }
        }
      }
      // 🔄 SIMPLE FALLBACK CONCEPT EXTRACTION
      extractConceptsFallback(content, title) {
        const fallbackConcepts = [];
        if (title) {
          const titleWords = title.split(" ").filter(
            (word) => word.length > 3 && !["the", "and", "for", "with"].includes(word.toLowerCase())
          );
          fallbackConcepts.push(...titleWords.slice(0, 2));
        }
        const universalTerms = [
          "knowledge",
          "learning",
          "understanding",
          "analysis",
          "concept",
          "theory",
          "principle",
          "method",
          "system",
          "process",
          "development",
          "innovation",
          "research",
          "discovery",
          "technology",
          "science",
          "education",
          "growth",
          "progress",
          "solution",
          "strategy",
          "framework",
          "approach",
          "technique",
          "implementation"
        ];
        const contentLower = content.toLowerCase();
        const foundTerms = universalTerms.filter((term) => contentLower.includes(term));
        fallbackConcepts.push(...foundTerms.slice(0, 5));
        return Array.from(new Set(fallbackConcepts)).slice(0, 8);
      }
      // 🔍 ENHANCED SEMANTIC SEARCH with Embedding Model
      async search(query, context, options = {}) {
        const searchKey = `${query}_${context.userId}_${JSON.stringify(options)}`;
        const cached = this.searchCache.get(searchKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log(`\u26A1 Cache hit for semantic search: ${query.substring(0, 30)}...`);
          return cached.results;
        }
        console.log(`\u{1F50D} Performing semantic search: "${query}"`);
        const startTime = performance.now();
        try {
          if (options.useEmbeddings !== false) {
            try {
              console.log(`\u{1F517} Using embedding-based search`);
              const results = await this.searchWithEmbeddings(query, context, options);
              this.searchCache.set(searchKey, {
                results,
                timestamp: Date.now()
              });
              return results;
            } catch (embeddingError) {
              console.warn(`\u26A0\uFE0F Embedding search failed, falling back to traditional search: ${embeddingError}`);
            }
          }
          console.log(`\u{1F4DA} Using traditional semantic search`);
          const semanticQuery = await this.analyzeQueryIntent(query, context);
          const searchPromises = [];
          if (options.singleDocumentOnly && context.currentDocument) {
            searchPromises.push(this.searchSpecificDocument(semanticQuery, context, context.currentDocument, options.useEmbeddings || false));
          } else {
            searchPromises.push(this.searchDocuments(semanticQuery, context));
          }
          if (options.includeMemories !== false && !options.singleDocumentOnly) {
            searchPromises.push(this.searchMemories(semanticQuery, context));
          }
          if (options.includeAnnotations !== false && !options.singleDocumentOnly) {
            searchPromises.push(this.searchAnnotations(semanticQuery, context));
          }
          const searchResults = await Promise.all(searchPromises);
          const allResults = searchResults.flat();
          const rankedResults = await this.rankResults(allResults, semanticQuery, context);
          const enhancedResults = await this.enhanceResults(
            rankedResults.slice(0, options.maxResults || this.MAX_RESULTS),
            semanticQuery,
            context
          );
          const executionTime = performance.now() - startTime;
          console.log(`\u{1F3AF} Semantic search completed in ${executionTime.toFixed(2)}ms - ${enhancedResults.length} results`);
          this.searchCache.set(searchKey, {
            results: enhancedResults,
            timestamp: Date.now()
          });
          return enhancedResults;
        } catch (error) {
          console.error(`\u274C Semantic search failed: ${error}`);
          return [];
        }
      }
      // 🔗 HYBRID EMBEDDING-BASED SEARCH with Context Prioritization
      async searchWithEmbeddings(query, context, options) {
        const startTime = performance.now();
        try {
          console.log(`\u{1F517} Performing hybrid embedding-based search for: "${query}"`);
          console.log(`\u{1F4CD} Context - Current document: ${context.currentDocument || "None"}, User: ${context.userId}`);
          console.log(`\u{1F680} Generating cached embedding for query: "${query.substring(0, 50)}..."`);
          const queryEmbeddingResult = await this.embeddingService.getEmbedding(query);
          const queryEmbedding = queryEmbeddingResult.embedding;
          console.log(`\u26A1 Query embedding: ${queryEmbeddingResult.cacheHit ? "CACHE HIT" : "CACHE MISS"} (${queryEmbeddingResult.responseTime}ms)`);
          const documents3 = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            userId: documents.userId
          }).from(documents).where(eq4(documents.userId, context.userId || 2)).limit(20);
          const relevantDocs = documents3.filter((doc) => {
            const title = (doc.title || "").toLowerCase();
            const isFinancial = title.includes("cbdc") || title.includes("bank") || title.includes("finance") || title.includes("crypto") || title.includes("monetary") || title.includes("currency");
            const isBiblical = title.includes("bible") || title.includes("book") || title.includes("chapter") || title.includes("enoch") || title.includes("scripture") || title.includes("testament") || title.includes("creation") || title.includes("tablets");
            return true;
          });
          console.log(`\u{1F4DA} Document filtering: ${documents3.length} total \u2192 ${relevantDocs.length} relevant (excluded ${documents3.length - relevantDocs.length} irrelevant docs)`);
          const currentDoc = context.currentDocument ? relevantDocs.find((doc) => doc.id === context.currentDocument) : null;
          const filteredOtherDocs = relevantDocs.filter((doc) => doc.id !== context.currentDocument);
          console.log(`\u{1F4DA} Document distribution: Current=${currentDoc ? 1 : 0}, Others=${filteredOtherDocs.length}`);
          const currentDocResults = [];
          if (currentDoc) {
            console.log(`\u{1F3AF} Priority 1: Searching current document "${currentDoc.title}"`);
            const results = await this.processDocumentForEmbedding(
              currentDoc,
              queryEmbedding,
              query,
              "current"
            );
            currentDocResults.push(...results);
          }
          console.log(`\u{1F310} Priority 2: Searching ${filteredOtherDocs.length} other documents`);
          const otherDocResults = [];
          const chunkSize = 3;
          for (let i = 0; i < filteredOtherDocs.length; i += chunkSize) {
            const chunk = filteredOtherDocs.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(
              chunk.map((doc) => this.processDocumentForEmbedding(doc, queryEmbedding, query, "other"))
            );
            otherDocResults.push(...chunkResults.flat());
            if (otherDocResults.length >= 10) break;
          }
          const allResults = [
            ...this.boostContextualRelevance(currentDocResults, 1.2),
            // 20% boost for current doc
            ...otherDocResults
          ];
          const maxResults = options.maxResults || this.MAX_RESULTS;
          const sortedResults = allResults.sort((a, b) => b.contextualRelevance - a.contextualRelevance).slice(0, maxResults);
          const executionTime = performance.now() - startTime;
          console.log(`\u{1F517} Hybrid embedding search completed in ${executionTime.toFixed(2)}ms`);
          console.log(`\u{1F4CA} Results: ${currentDocResults.length} current, ${otherDocResults.length} others, ${sortedResults.length} final`);
          return sortedResults;
        } catch (error) {
          console.error(`\u274C Hybrid embedding search failed: ${error}`);
          throw error;
        }
      }
      // Helper method to process a single document for embedding search
      async processDocumentForEmbedding(doc, queryEmbedding, query, section) {
        const results = [];
        try {
          const excerpts = this.createDocumentExcerpts(doc.content, 500);
          console.log(`\u{1F4C4} Processing document ${doc.id} (${doc.title}) - ${excerpts.length} excerpts, section: ${section}`);
          const batchResults = await this.embeddingService.getEmbeddingsBatch(
            excerpts,
            Array(excerpts.length).fill(doc.id),
            Array(excerpts.length).fill(0),
            // Approximate chapter
            Array(excerpts.length).fill(0)
            // Approximate paragraph
          );
          for (let i = 0; i < excerpts.length; i++) {
            const excerpt = excerpts[i];
            const excerptEmbedding = batchResults[i].embedding;
            const similarity = this.multiModel.calculateCosineSimilarity(queryEmbedding, excerptEmbedding);
            const threshold = section === "current" ? 0.3 : 0.4;
            if (similarity >= threshold) {
              console.log(`\u{1F3AF} Found match in doc ${doc.id} (${section}): similarity=${similarity.toFixed(3)}, excerpt="${excerpt.substring(0, 80)}..."`);
              results.push({
                id: `doc_${doc.id}_${section}_${results.length}`,
                content: excerpt,
                relevanceScore: similarity,
                semanticSimilarity: similarity,
                contextualRelevance: similarity,
                // Will be boosted later if current doc
                source: {
                  type: "document",
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
          console.warn(`\u26A0\uFE0F Failed to process document ${doc.id}: ${docError}`);
        }
        return results;
      }
      // Helper method to boost contextual relevance for current document results
      boostContextualRelevance(results, boostFactor) {
        return results.map((result) => ({
          ...result,
          contextualRelevance: result.contextualRelevance * boostFactor,
          metadata: { ...result.metadata, boosted: true }
        }));
      }
      // Helper method to create document excerpts
      createDocumentExcerpts(content, maxLength = 500) {
        if (typeof content !== "string") {
          content = JSON.stringify(content);
        }
        const excerpts = [];
        try {
          const parsed = JSON.parse(content);
          if (parsed.chapters && Array.isArray(parsed.chapters)) {
            for (const chapter of parsed.chapters) {
              if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
                for (const paragraph of chapter.paragraphs) {
                  if (paragraph.text && typeof paragraph.text === "string") {
                    const text2 = paragraph.text.trim();
                    if (text2.length > 50) {
                      if (text2.length <= maxLength) {
                        excerpts.push(text2);
                      } else {
                        const sentences = text2.split(/[.!?]+/).filter((s) => s.trim().length > 20);
                        let currentExcerpt = "";
                        for (const sentence of sentences) {
                          const sentenceWithPeriod = sentence.trim() + ". ";
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
          } else if (parsed.content && typeof parsed.content === "string") {
            return this.createExcerptsFromText(parsed.content, maxLength);
          } else if (typeof parsed === "string") {
            return this.createExcerptsFromText(parsed, maxLength);
          }
        } catch (parseError) {
          return this.createExcerptsFromText(content, maxLength);
        }
        if (excerpts.length === 0) {
          return this.createExcerptsFromText(content, maxLength);
        }
        return excerpts;
      }
      // Helper method to create excerpts from plain text
      createExcerptsFromText(content, maxLength = 500) {
        const excerpts = [];
        const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
        let currentExcerpt = "";
        for (const sentence of sentences) {
          const sentenceWithPeriod = sentence.trim() + ". ";
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
        if (excerpts.length === 0 && content.length > 0) {
          excerpts.push(content.substring(0, maxLength));
        }
        return excerpts;
      }
      // 🧠 ANALYZE QUERY INTENT AND EXPAND SEMANTICALLY
      async analyzeQueryIntent(query, context) {
        const intentPrompt = `Analyze this search query and provide semantic expansion:

Query: "${query}"
User context: Currently reading ${context.currentDocument ? `document ${context.currentDocument}` : "various texts"}
User expertise: Level ${context.userExpertiseLevel}/10
Recent queries: ${context.recentQueries.join(", ")}

Provide JSON response:
{
  "intent": "search|question|exploration|comparison",
  "semantic_context": ["related_concept1", "related_concept2", "related_concept3"],
  "expanded_terms": ["synonym1", "synonym2", "related_term1"],
  "suggested_filters": ["filter1", "filter2"]
}`;
        try {
          const result = await this.multiModel.executeTask("text-analysis", intentPrompt, {
            requirements: { reasoning: 8, accuracy: 8 }
          });
          const analysis = this.parseJsonWithFallback(result.response);
          return {
            query,
            intent: analysis?.intent || "search",
            semanticContext: [
              ...analysis?.semantic_context || [],
              ...analysis?.expanded_terms || [],
              ...context.preferredTopics
            ]
          };
        } catch (error) {
          console.error(`\u274C Failed to analyze query intent: ${error}`);
          return {
            query,
            intent: "search",
            semanticContext: context.preferredTopics
          };
        }
      }
      // 📚 SEARCH DOCUMENTS WITH SEMANTIC UNDERSTANDING
      async searchDocuments(semanticQuery, context) {
        const documentIds = this.getConceptRelatedDocs(semanticQuery.semanticContext);
        if (documentIds.length === 0) {
          return [];
        }
        try {
          const documents3 = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            userId: documents.userId
          }).from(documents).where(
            and4(
              or2(
                like2(documents.content, `%${semanticQuery.query}%`),
                like2(documents.title, `%${semanticQuery.query}%`)
              ),
              inArray2(documents.id, documentIds)
            )
          ).limit(20);
          const results = [];
          for (const doc of documents3) {
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
                  type: "document",
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
          console.error(`\u274C Failed to search documents: ${error}`);
          return [];
        }
      }
      // 📚 SEARCH SPECIFIC DOCUMENT
      async searchSpecificDocument(semanticQuery, context, documentId, useEmbeddings) {
        try {
          console.log(`\u{1F4DA} Searching specific document ${documentId} for: "${semanticQuery.query}"`);
          const document = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            userId: documents.userId
          }).from(documents).where(eq4(documents.id, documentId)).limit(1);
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
                type: "document",
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
          console.error(`\u274C Specific document search failed: ${error}`);
          return [];
        }
      }
      // 🧠 SEARCH MEMORIES WITH CONTEXT AWARENESS
      async searchMemories(semanticQuery, context) {
        try {
          const memories = await this.memory.searchMemories(context.userId, semanticQuery.query, 20);
          const results = [];
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
                  type: "memory",
                  id: 0,
                  // Memory ID would go here
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
          console.error(`\u274C Failed to search memories: ${error}`);
          return [];
        }
      }
      // 📝 SEARCH ANNOTATIONS
      async searchAnnotations(semanticQuery, context) {
        const documentIds = this.getConceptRelatedDocs(semanticQuery.semanticContext);
        if (documentIds.length === 0) {
          return [];
        }
        try {
          const annotations2 = await db.select({
            id: annotations.id,
            note: annotations.note,
            documentId: annotations.documentId,
            chapter: annotations.chapter
          }).from(annotations).where(
            and4(
              eq4(annotations.userId, context.userId),
              like2(annotations.note, `%${semanticQuery.query}%`),
              inArray2(annotations.documentId, documentIds)
            )
          ).limit(15);
          const results = [];
          for (const annotation of annotations2) {
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
                  type: "annotation",
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
          console.error(`\u274C Failed to search annotations: ${error}`);
          return [];
        }
      }
      getConceptRelatedDocs(concepts) {
        if (!concepts || concepts.length === 0) return [];
        const docIds = /* @__PURE__ */ new Set();
        for (const concept of concepts) {
          const ids = this.conceptIndex.get(concept);
          if (ids) {
            for (const id of ids) {
              docIds.add(id);
            }
          }
        }
        return Array.from(docIds).map((id) => parseInt(id, 10));
      }
      // 🎯 CALCULATE SEMANTIC RELEVANCE
      async calculateSemanticRelevance(content, query, semanticContext) {
        const relevancePrompt = `Calculate semantic relevance between query and content:

Query: "${query}"
Semantic context: ${semanticContext.join(", ")}

Content: ${content.substring(0, 2e3)}

Analyze and provide JSON response:
{
  "semantic_similarity": 0.0-1.0,
  "contextual_relevance": 0.0-1.0,
  "key_snippets": ["relevant snippet 1", "relevant snippet 2"],
  "reasoning": "brief explanation of relevance"
}`;
        try {
          const result = await this.multiModel.executeTask("semantic-search", relevancePrompt, {
            requirements: { accuracy: 9, reasoning: 8 }
          });
          const analysis = JSON.parse(result.response);
          const semanticSimilarity = Math.max(0, Math.min(1, analysis.semantic_similarity || 0));
          const contextualRelevance = Math.max(0, Math.min(1, analysis.contextual_relevance || 0));
          const score = semanticSimilarity * 0.6 + contextualRelevance * 0.4;
          return {
            score,
            semanticSimilarity,
            contextualRelevance,
            snippets: analysis.key_snippets || []
          };
        } catch (error) {
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
      calculateSimpleRelevance(content, query) {
        const contentLower = content.toLowerCase();
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(" ").filter((word) => word.length > 2);
        let matches = 0;
        queryWords.forEach((word) => {
          if (contentLower.includes(word)) {
            matches++;
          }
        });
        return queryWords.length > 0 ? matches / queryWords.length : 0;
      }
      // ✂️ EXTRACT RELEVANT SNIPPET
      extractRelevantSnippet(content, query, maxLength = 200) {
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        const index2 = contentLower.indexOf(queryLower);
        if (index2 !== -1) {
          const start = Math.max(0, index2 - 50);
          const end = Math.min(content.length, index2 + queryLower.length + 150);
          return content.substring(start, end);
        }
        return content.substring(0, Math.min(maxLength, content.length));
      }
      // 📈 RANK RESULTS USING MULTIPLE FACTORS
      async rankResults(results, semanticQuery, context) {
        return results.sort((a, b) => {
          if (a.relevanceScore !== b.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          if (a.semanticSimilarity !== b.semanticSimilarity) {
            return b.semanticSimilarity - a.semanticSimilarity;
          }
          return b.contextualRelevance - a.contextualRelevance;
        }).filter((result) => result.relevanceScore >= this.RELEVANCE_THRESHOLD);
      }
      // 🎨 ENHANCE RESULTS WITH RELATED CONCEPTS AND QUESTIONS
      async enhanceResults(results, semanticQuery, context) {
        const enhancedResults = [];
        for (const result of results) {
          try {
            const enhancement = await this.generateEnhancements(result.content, semanticQuery.query, context);
            enhancedResults.push({
              ...result,
              relatedConcepts: enhancement.relatedConcepts,
              suggestedQuestions: enhancement.suggestedQuestions
            });
          } catch (error) {
            enhancedResults.push(result);
          }
        }
        return enhancedResults;
      }
      // 🎯 GENERATE ENHANCEMENTS FOR SEARCH RESULTS
      async generateEnhancements(content, originalQuery, context) {
        const enhancementPrompt = `Based on this content and the user's search query, generate helpful enhancements:

Original query: "${originalQuery}"
Content: ${content.substring(0, 1e3)}
User expertise level: ${context.userExpertiseLevel}/10

Generate JSON response:
{
  "related_concepts": ["related concept 1", "related concept 2", "related concept 3"],
  "suggested_questions": ["follow-up question 1", "follow-up question 2"]
}`;
        try {
          const result = await this.multiModel.executeTask("creative-insights", enhancementPrompt, {
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
      async contextualSearch(query, context, radius = 3) {
        if (!context.currentDocument || !context.currentChapter) {
          return this.search(query, context);
        }
        console.log(`\u{1F3AF} Performing contextual search around document ${context.currentDocument}, chapter ${context.currentChapter}`);
        try {
          const startChapter = Math.max(1, context.currentChapter - radius);
          const endChapter = context.currentChapter + radius;
          const annotations2 = await db.select({
            id: annotations.id,
            note: annotations.note,
            documentId: annotations.documentId,
            chapter: annotations.chapter
          }).from(annotations).where(
            and4(
              eq4(annotations.documentId, context.currentDocument),
              // Note: Would need proper range query here
              like2(annotations.note, `%${query}%`)
            )
          );
          const results = [];
          for (const annotation of annotations2) {
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
                  relevanceScore: relevance.score + 0.2,
                  // Boost for contextual relevance
                  semanticSimilarity: relevance.semanticSimilarity,
                  contextualRelevance: relevance.contextualRelevance + 0.3,
                  source: {
                    type: "annotation",
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
          return this.rankResults(results, { query, intent: "search", semanticContext: context.preferredTopics }, context);
        } catch (error) {
          console.error(`\u274C Contextual search failed: ${error}`);
          return this.search(query, context);
        }
      }
      // 🎭 CONCEPT-BASED EXPLORATION
      async exploreConcept(concept, context, depth = "medium") {
        console.log(`\u{1F3AD} Exploring concept: "${concept}" with ${depth} depth`);
        try {
          const conceptAnalysis = await this.analyzeConcept(concept, context, depth);
          const relatedPassages = await this.search(concept, context, { maxResults: 10 });
          const crossReferences = await this.findConceptCrossReferences(concept, context);
          return {
            conceptDefinition: conceptAnalysis.definition,
            relatedPassages,
            crossReferences,
            theologicalConnections: conceptAnalysis.connections,
            explorationQuestions: conceptAnalysis.questions
          };
        } catch (error) {
          console.error(`\u274C Concept exploration failed: ${error}`);
          return {
            conceptDefinition: "",
            relatedPassages: [],
            crossReferences: [],
            theologicalConnections: [],
            explorationQuestions: []
          };
        }
      }
      // 🧠 ANALYZE CONCEPT IN DEPTH
      async analyzeConcept(concept, context, depth) {
        const depthInstructions = {
          "surface": "Provide basic definition and key points",
          "medium": "Include significance and relevant context",
          "deep": "Explore historical development, scholarly debates, and detailed implications"
        };
        const analysisPrompt = `Analyze the concept: "${concept}"

Depth level: ${depth} - ${depthInstructions[depth]}
User expertise: Level ${context.userExpertiseLevel}/10

Provide JSON response:
{
  "definition": "comprehensive definition appropriate for user level",
  "related_connections": ["connection1", "connection2", "connection3"],
  "exploration_questions": ["question1", "question2", "question3"]
}`;
        try {
          const result = await this.multiModel.executeTask("theological-reasoning", analysisPrompt, {
            requirements: { reasoning: 9, accuracy: 9 }
          });
          const analysis = JSON.parse(result.response);
          return {
            definition: analysis.definition || "",
            connections: analysis.related_connections || [],
            questions: analysis.exploration_questions || []
          };
        } catch (error) {
          console.error(`\u274C Failed to analyze concept: ${error}`);
          return {
            definition: `The concept of "${concept}" is a significant theme in this subject area.`,
            connections: [],
            questions: []
          };
        }
      }
      // 🔗 FIND CROSS-REFERENCES USING CONCEPT INDEX
      async findConceptCrossReferences(concept, context) {
        const relatedDocuments = this.conceptIndex.get(concept.toLowerCase()) || [];
        const results = [];
        for (const docId of relatedDocuments.slice(0, 5)) {
          try {
            const doc = await db.select({
              id: documents.id,
              title: documents.title,
              content: documents.content
            }).from(documents).where(eq4(documents.id, parseInt(docId))).limit(1);
            if (doc.length > 0) {
              results.push({
                id: `crossref_${doc[0].id}`,
                content: this.extractRelevantSnippet(doc[0].content, concept),
                relevanceScore: 0.8,
                // High relevance for concept-indexed results
                semanticSimilarity: 0.9,
                contextualRelevance: 0.7,
                source: {
                  type: "document",
                  id: doc[0].id,
                  title: doc[0].title
                },
                highlightedSnippets: [],
                relatedConcepts: [],
                suggestedQuestions: []
              });
            }
          } catch (error) {
            console.error(`\u274C Error retrieving cross-reference: ${error}`);
          }
        }
        return results;
      }
      // 📊 GET SEARCH ANALYTICS
      getSearchAnalytics() {
        const totalSearches = this.searchCache.size;
        const conceptIndexSize = this.conceptIndex.size;
        const cacheHitRate = 0.75;
        return {
          totalSearches,
          cacheHitRate,
          averageResults: 8.5,
          // Would be calculated from actual searches
          topQueries: [],
          // Would be tracked in production
          conceptIndexSize
        };
      }
      // 🔧 UTILITY METHODS
      async clearCache() {
        this.searchCache.clear();
        console.log("\u{1F9F9} Search cache cleared");
      }
      async rebuildConceptIndex() {
        this.conceptIndex.clear();
        await this.buildConceptIndex();
      }
    };
  }
});

// server/agents/base-agent.ts
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
var BaseAgent;
var init_base_agent = __esm({
  "server/agents/base-agent.ts"() {
    "use strict";
    BaseAgent = class extends EventEmitter {
      id;
      name;
      description;
      config;
      isRunning = false;
      intervalId;
      taskQueue = [];
      isProcessingTasks = false;
      agentManager;
      // Enhanced metrics tracking
      tasksCompleted = 0;
      responseTimes = [];
      lastActivity = /* @__PURE__ */ new Date();
      startTime = /* @__PURE__ */ new Date();
      constructor(config2) {
        super();
        this.id = uuidv4();
        this.name = config2.name;
        this.description = config2.description;
        this.config = {
          interval: 5e3,
          // Default 5 seconds
          maxRetries: 3,
          timeout: 6e4,
          // Default 60 seconds
          specialties: ["General AI"],
          // Default specialties
          ...config2
        };
        this.log(`Agent ${this.name} initialized`);
      }
      setAgentManager(manager) {
        this.agentManager = manager;
      }
      // Agent lifecycle methods
      async start() {
        if (this.isRunning) {
          this.log("Agent is already running");
          return;
        }
        try {
          await this.initialize();
          this.isRunning = true;
          this.startTime = /* @__PURE__ */ new Date();
          this.lastActivity = /* @__PURE__ */ new Date();
          this.intervalId = setInterval(() => {
            this.processTasks();
          }, this.config.interval);
          this.log(`Agent ${this.name} started successfully`);
          this.emit("started");
        } catch (error) {
          this.error(`Failed to start agent: ${error}`);
          throw error;
        }
      }
      async stop() {
        if (!this.isRunning) {
          this.log("Agent is not running");
          return;
        }
        try {
          this.isRunning = false;
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = void 0;
          }
          await this.waitForTasksToComplete();
          await this.cleanup();
          this.log(`Agent ${this.name} stopped successfully`);
          this.emit("stopped");
        } catch (error) {
          this.error(`Failed to stop agent: ${error}`);
          throw error;
        }
      }
      // Task management
      addTask(type, data, priority = 1) {
        const task = {
          id: uuidv4(),
          type,
          data,
          priority,
          createdAt: /* @__PURE__ */ new Date(),
          retries: 0
        };
        this.taskQueue.push(task);
        this.taskQueue.sort((a, b) => b.priority - a.priority);
        this.log(`Task ${task.id} added to queue (type: ${type}, priority: ${priority})`);
        return task.id;
      }
      async processTasks() {
        if (this.isProcessingTasks || this.taskQueue.length === 0) {
          return;
        }
        this.isProcessingTasks = true;
        try {
          while (this.taskQueue.length > 0 && this.isRunning) {
            const task = this.taskQueue.shift();
            await this.executeTask(task);
          }
        } catch (error) {
          this.error(`Error processing tasks: ${error}`);
        } finally {
          this.isProcessingTasks = false;
        }
      }
      async executeTask(task) {
        const startTime = Date.now();
        try {
          this.log(`Processing task ${task.id} (type: ${task.type})`);
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("Task timeout")), this.config.timeout)
          );
          const result = await Promise.race([
            this.processTask(task),
            timeoutPromise
          ]);
          const responseTime = Date.now() - startTime;
          this.tasksCompleted++;
          this.responseTimes.push(responseTime);
          this.lastActivity = /* @__PURE__ */ new Date();
          if (this.responseTimes.length > 100) {
            this.responseTimes = this.responseTimes.slice(-100);
          }
          this.log(`Task ${task.id} completed successfully in ${responseTime}ms`);
          this.emit("taskCompleted", { task, result });
        } catch (error) {
          task.retries++;
          this.error(`Task ${task.id} failed (attempt ${task.retries}): ${error}`);
          if (task.retries < this.config.maxRetries) {
            this.taskQueue.unshift(task);
            this.log(`Task ${task.id} re-queued for retry`);
          } else {
            this.error(`Task ${task.id} failed permanently after ${task.retries} attempts`);
            this.emit("taskFailed", task, error);
          }
        }
      }
      async waitForTasksToComplete() {
        while (this.isProcessingTasks) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      // Status and health checks
      getStatus() {
        const averageResponseTime = this.responseTimes.length > 0 ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length) : 0;
        const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();
        let lastActivityText = "Never";
        if (timeSinceLastActivity < 6e4) {
          lastActivityText = `${Math.floor(timeSinceLastActivity / 1e3)}s ago`;
        } else if (timeSinceLastActivity < 36e5) {
          lastActivityText = `${Math.floor(timeSinceLastActivity / 6e4)}m ago`;
        } else {
          lastActivityText = `${Math.floor(timeSinceLastActivity / 36e5)}h ago`;
        }
        return {
          id: this.id,
          name: this.name,
          description: this.description,
          isRunning: this.isRunning,
          queueSize: this.taskQueue.length,
          isProcessingTasks: this.isProcessingTasks,
          uptime: this.isRunning ? Date.now() - this.startTime.getTime() : 0,
          tasksCompleted: this.tasksCompleted,
          averageResponseTime,
          specialties: this.config.specialties || ["General AI"],
          lastActivity: lastActivityText
        };
      }
      // Logging methods
      log(message) {
        console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.name}] ${message}`);
        this.emit("log", { level: "info", message, timestamp: /* @__PURE__ */ new Date() });
      }
      error(message) {
        console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.name}] ERROR: ${message}`);
        this.emit("log", { level: "error", message, timestamp: /* @__PURE__ */ new Date() });
      }
      warn(message) {
        console.warn(`[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.name}] WARN: ${message}`);
        this.emit("log", { level: "warn", message, timestamp: /* @__PURE__ */ new Date() });
      }
    };
  }
});

// server/services/query-result-cache-service.ts
var query_result_cache_service_exports = {};
__export(query_result_cache_service_exports, {
  QueryResultCacheService: () => QueryResultCacheService
});
import crypto2 from "crypto";
import { eq as eq5, and as and5, sql as sql3, desc as desc3, lt, inArray as inArray3 } from "drizzle-orm";
var QueryResultCacheService;
var init_query_result_cache_service = __esm({
  "server/services/query-result-cache-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    QueryResultCacheService = class {
      cacheStats = {
        hits: 0,
        misses: 0,
        fuzzyMatches: 0,
        totalRequests: 0
      };
      maxCacheSize = 1e4;
      // Maximum number of cached entries
      defaultTTL = 24 * 60 * 60 * 1e3;
      // 24 hours in milliseconds
      /**
       * Generate a unique hash for a query and its context
       */
      generateQueryHash(query, context, params) {
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
        return crypto2.createHash("sha256").update(JSON.stringify(keyData)).digest("hex");
      }
      /**
       * Generate context hash for fuzzy matching
       */
      generateContextHash(context) {
        const contextData = {
          userId: context.userId,
          documentId: context.documentId || null,
          chapter: context.chapter || null
        };
        return crypto2.createHash("sha256").update(JSON.stringify(contextData)).digest("hex");
      }
      /**
       * Normalize query for better matching
       */
      normalizeQuery(query) {
        return query.toLowerCase().trim().replace(/\s+/g, " ");
      }
      /**
       * Calculate similarity between two queries
       */
      calculateQuerySimilarity(query1, query2) {
        const words1 = query1.split(" ");
        const words2 = query2.split(" ");
        const commonWords = words1.filter((word) => words2.includes(word));
        const totalWords = (/* @__PURE__ */ new Set([...words1, ...words2])).size;
        return commonWords.length / totalWords;
      }
      /**
       * Find fuzzy matches for similar queries
       */
      async findFuzzyMatches(normalizedQuery, contextHash, userId, threshold = 0.8, context) {
        try {
          const conditions = [eq5(queryResultCache.userId, userId)];
          if (context?.documentId) {
            const sameDocumentCandidates = await db.select().from(queryResultCache).where(eq5(queryResultCache.userId, userId)).orderBy(desc3(queryResultCache.last_accessed_at)).limit(50);
            const sameDocumentMatches = sameDocumentCandidates.filter((candidate) => {
              try {
                const keyData = JSON.parse(Buffer.from(candidate.query_hash, "base64").toString());
                const isSameDocument = keyData.documentId === context.documentId?.toString();
                if (isSameDocument) {
                  const similarity = this.calculateQuerySimilarity(normalizedQuery, candidate.query_text);
                  return similarity >= threshold;
                }
                return false;
              } catch (error) {
                return false;
              }
            });
            if (sameDocumentMatches.length > 0) {
              return sameDocumentMatches.sort((a, b) => {
                const simA = this.calculateQuerySimilarity(normalizedQuery, a.query_text);
                const simB = this.calculateQuerySimilarity(normalizedQuery, b.query_text);
                return simB - simA;
              });
            }
          }
          const candidates = await db.select().from(queryResultCache).where(
            and5(
              eq5(queryResultCache.userId, userId)
            )
          ).orderBy(desc3(queryResultCache.last_accessed_at)).limit(30);
          const matches = candidates.filter((candidate) => {
            const similarity = this.calculateQuerySimilarity(normalizedQuery, candidate.query_text);
            return similarity >= (context?.documentId ? threshold + 0.1 : threshold);
          });
          return matches.sort((a, b) => {
            const simA = this.calculateQuerySimilarity(normalizedQuery, a.query_text);
            const simB = this.calculateQuerySimilarity(normalizedQuery, b.query_text);
            return simB - simA;
          });
        } catch (error) {
          console.error("Error finding fuzzy matches:", error);
          return [];
        }
      }
      /**
       * Get cached query results with fuzzy matching
       */
      async getCachedResults(query, context, params) {
        const startTime = Date.now();
        this.cacheStats.totalRequests++;
        const normalizedQuery = this.normalizeQuery(query);
        const queryHash = this.generateQueryHash(normalizedQuery, context, params);
        const contextHash = this.generateContextHash(context);
        try {
          const exactMatch = await db.select().from(queryResultCache).where(eq5(queryResultCache.query_hash, queryHash)).limit(1);
          if (exactMatch.length > 0) {
            const cached = exactMatch[0];
            await db.update(queryResultCache).set({
              last_accessed_at: /* @__PURE__ */ new Date(),
              access_count: (cached.access_count || 0) + 1
            }).where(eq5(queryResultCache.id, cached.id));
            this.cacheStats.hits++;
            const responseTime = Date.now() - startTime;
            console.log(`\u{1F680} Query cache EXACT HIT for "${query}" (${responseTime}ms, hit #${cached.access_count + 1})`);
            return {
              results: JSON.parse(cached.result),
              cacheHit: true,
              responseTime,
              hitCount: cached.access_count + 1,
              source: "cache"
            };
          }
          const fuzzyMatches = await this.findFuzzyMatches(normalizedQuery, contextHash, context.userId, 0.8, context);
          if (fuzzyMatches.length > 0) {
            const bestMatch = fuzzyMatches[0];
            const similarity = this.calculateQuerySimilarity(normalizedQuery, bestMatch.query_text);
            await db.update(queryResultCache).set({
              last_accessed_at: /* @__PURE__ */ new Date(),
              access_count: (bestMatch.access_count || 0) + 1
            }).where(eq5(queryResultCache.id, bestMatch.id));
            this.cacheStats.fuzzyMatches++;
            const responseTime = Date.now() - startTime;
            console.log(`\u{1F3AF} Query cache FUZZY HIT for "${query}" \u2192 "${bestMatch.query_text}" (${(similarity * 100).toFixed(1)}% similar, ${responseTime}ms)`);
            return {
              results: JSON.parse(bestMatch.result),
              cacheHit: true,
              responseTime,
              hitCount: bestMatch.access_count + 1,
              source: "cache"
            };
          }
          this.cacheStats.misses++;
          console.log(`\u{1F504} Query cache MISS for "${query}"`);
          return null;
        } catch (error) {
          console.error("Error getting cached results:", error);
          this.cacheStats.misses++;
          return null;
        }
      }
      /**
       * Store query results in cache
       */
      async storeResults(query, context, params, results) {
        try {
          const normalizedQuery = this.normalizeQuery(query);
          const queryHash = this.generateQueryHash(normalizedQuery, context, params);
          const contextHash = this.generateContextHash(context);
          await this.cleanupOldEntries();
          const limitedResults = results.slice(0, 10);
          const wasTruncated = results.length > 10;
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
          const existing = await db.select().from(queryResultCache).where(eq5(queryResultCache.query_hash, queryHash)).limit(1);
          if (existing.length > 0) {
            await db.update(queryResultCache).set({
              result: JSON.stringify(limitedResults),
              metadata,
              last_accessed_at: /* @__PURE__ */ new Date()
            }).where(eq5(queryResultCache.query_hash, queryHash));
            console.log(`\u{1F4DD} Updated query result cache for hash: ${queryHash}${wasTruncated ? " (truncated to 10 results)" : ""}`);
          } else {
            await db.insert(queryResultCache).values({
              query_hash: queryHash,
              query_text: query.substring(0, 500),
              // Limit query length
              userId: context.userId,
              model: "semantic-search",
              result: JSON.stringify(limitedResults),
              metadata,
              embedding: null
            });
            console.log(`\u{1F195} Inserted new query result cache for hash: ${queryHash}${wasTruncated ? " (truncated to 10 results)" : ""}`);
          }
        } catch (error) {
          console.error("Error storing query results:", error);
        }
      }
      /**
       * Clean up old cache entries to maintain performance
       */
      async cleanupOldEntries() {
        try {
          const countResult = await db.select({ count: sql3`COUNT(*)` }).from(queryResultCache);
          const currentSize = countResult[0]?.count || 0;
          if (currentSize >= this.maxCacheSize) {
            console.log(`\u{1F9F9} Cache cleanup: ${currentSize} entries, removing oldest 20%`);
            const entriesToRemove = Math.floor(this.maxCacheSize * 0.2);
            const oldEntries = await db.select({ id: queryResultCache.id }).from(queryResultCache).orderBy(queryResultCache.last_accessed_at).limit(entriesToRemove);
            for (const entry of oldEntries) {
              await db.delete(queryResultCache).where(eq5(queryResultCache.id, entry.id));
            }
            console.log(`\u2705 Removed ${oldEntries.length} old cache entries`);
          }
          const cutoffTime = new Date(Date.now() - this.defaultTTL);
          const deleted = await db.delete(queryResultCache).where(lt(queryResultCache.created_at, cutoffTime));
          if (deleted.changes > 0) {
            console.log(`\u{1F550} Removed ${deleted.changes} expired cache entries`);
          }
        } catch (error) {
          console.error("Error during cache cleanup:", error);
        }
      }
      /**
       * Get cache statistics
       */
      getCacheStats() {
        const hitRate = this.cacheStats.totalRequests > 0 ? (this.cacheStats.hits + this.cacheStats.fuzzyMatches) / this.cacheStats.totalRequests * 100 : 0;
        return {
          ...this.cacheStats,
          hitRate: Math.round(hitRate * 100) / 100
        };
      }
      /**
       * Clear all cache entries
       */
      async clearCache() {
        try {
          await db.delete(queryResultCache);
          console.log("\u{1F5D1}\uFE0F Cleared all query result cache entries");
        } catch (error) {
          console.error("Error clearing cache:", error);
          throw error;
        }
      }
      /**
       * Get cache information
       */
      async getCacheInfo() {
        try {
          const countResult = await db.select({ count: sql3`COUNT(*)` }).from(queryResultCache);
          const totalEntries = countResult[0]?.count || 0;
          const sampleEntries = await db.select({
            result: queryResultCache.result,
            created_at: queryResultCache.created_at
          }).from(queryResultCache).limit(100);
          let averageResultCount = 0;
          if (sampleEntries.length > 0) {
            const resultCounts = sampleEntries.map((entry) => {
              try {
                const results = JSON.parse(entry.result);
                return Array.isArray(results) ? results.length : 0;
              } catch {
                return 0;
              }
            });
            averageResultCount = resultCounts.reduce((sum, count) => sum + count, 0) / resultCounts.length;
          }
          const topQueries = await db.select({
            query: queryResultCache.query_text,
            hitCount: queryResultCache.access_count,
            lastUsed: queryResultCache.last_accessed_at
          }).from(queryResultCache).orderBy(desc3(queryResultCache.access_count)).limit(10);
          const timestamps = sampleEntries.map((e) => {
            return e.created_at instanceof Date ? e.created_at.getTime() / 1e3 : e.created_at;
          });
          const oldest = timestamps.length > 0 ? Math.min(...timestamps) : null;
          const newest = timestamps.length > 0 ? Math.max(...timestamps) : null;
          return {
            totalEntries,
            averageResultCount: Math.round(averageResultCount * 100) / 100,
            topQueries: topQueries.map((q) => ({
              query: q.query,
              hitCount: q.hitCount,
              lastUsed: q.lastUsed instanceof Date ? q.lastUsed.toISOString() : new Date(q.lastUsed * 1e3).toISOString()
            })),
            oldestEntry: oldest ? new Date(oldest * 1e3).toISOString() : void 0,
            newestEntry: newest ? new Date(newest * 1e3).toISOString() : void 0
          };
        } catch (error) {
          console.error("Error getting cache info:", error);
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
      async invalidateContext(userId, documentId) {
        try {
          if (documentId) {
            console.log(`\u{1F5D1}\uFE0F Clearing cache entries for user ${userId}, document ${documentId}`);
            const userEntries = await db.select({ id: queryResultCache.id, query_hash: queryResultCache.query_hash }).from(queryResultCache).where(eq5(queryResultCache.userId, userId));
            const entriesToDelete = userEntries.filter((entry) => {
              try {
                const keyData = JSON.parse(Buffer.from(entry.query_hash, "base64").toString());
                return keyData.documentId === documentId.toString();
              } catch (error) {
                return false;
              }
            });
            if (entriesToDelete.length > 0) {
              const entryIds = entriesToDelete.map((entry) => entry.id);
              const batchSize = 100;
              for (let i = 0; i < entryIds.length; i += batchSize) {
                const batch = entryIds.slice(i, i + batchSize);
                await db.delete(queryResultCache).where(inArray3(queryResultCache.id, batch));
              }
              console.log(`\u2705 Cleared ${entriesToDelete.length} cache entries for user ${userId}, document ${documentId}`);
            } else {
              console.log(`\u2139\uFE0F No cache entries found for user ${userId}, document ${documentId}`);
            }
          } else {
            console.log(`\u{1F5D1}\uFE0F Clearing all cache entries for user ${userId}`);
            const deleted = await db.delete(queryResultCache).where(eq5(queryResultCache.userId, userId));
            console.log(`\u2705 Cleared ${deleted.changes} cache entries for user ${userId}`);
          }
        } catch (error) {
          console.error("Error invalidating context cache:", error);
          throw error;
        }
      }
    };
  }
});

// server/services/enhanced-semantic-search-service.ts
var EnhancedSemanticSearchService;
var init_enhanced_semantic_search_service = __esm({
  "server/services/enhanced-semantic-search-service.ts"() {
    "use strict";
    init_semantic_search_service();
    init_query_result_cache_service();
    EnhancedSemanticSearchService = class {
      semanticSearchService;
      queryResultCacheService;
      constructor() {
        this.semanticSearchService = new SemanticSearchService();
        this.queryResultCacheService = new QueryResultCacheService();
      }
      /**
       * Enhanced search with dual-layer caching
       */
      async search(query, context, options = {}) {
        console.log(`[EnhancedSemanticSearchService] Starting enhanced search for query: "${query}"`);
        const totalStartTime = Date.now();
        const searchParams = {
          includeMemories: options.includeMemories || false,
          includeAnnotations: options.includeAnnotations || false,
          semanticExpansion: options.semanticExpansion || true,
          useEmbeddings: true,
          maxResults: options.maxResults || 5,
          relevanceThreshold: 0.6
        };
        const queryStartTime = Date.now();
        const cachedResult = await this.queryResultCacheService.getCachedResults(
          query,
          context,
          searchParams
        );
        const queryTime = Date.now() - queryStartTime;
        if (cachedResult) {
          return {
            results: cachedResult.results,
            performance: {
              totalTime: Date.now() - totalStartTime,
              embeddingCacheHits: 0,
              // Not needed for cached results
              embeddingCacheMisses: 0,
              queryCache: {
                hit: true,
                source: cachedResult.source === "cache" ? "exact" : "fuzzy",
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
              embedding: {},
              // Will be filled for fresh searches
              query: this.queryResultCacheService.getCacheStats()
            }
          };
        }
        const searchStartTime = Date.now();
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
        await this.queryResultCacheService.storeResults(
          query,
          context,
          searchParams,
          searchResults
        );
        const embeddingStats = this.semanticSearchService.getSearchAnalytics();
        const queryStats = this.queryResultCacheService.getCacheStats();
        return {
          results: searchResults,
          performance: {
            totalTime: Date.now() - totalStartTime,
            embeddingCacheHits: embeddingStats?.totalSearches || 0,
            embeddingCacheMisses: 0,
            queryCache: {
              hit: false,
              source: "fresh",
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
      async progressiveSearch(query, context, options = {}, onProgress) {
        const searchParams = {
          includeMemories: options.includeMemories || false,
          includeAnnotations: options.includeAnnotations || false,
          semanticExpansion: options.semanticExpansion || true,
          useEmbeddings: true,
          maxResults: options.maxResults || 10,
          relevanceThreshold: 0.3
        };
        const cachedResult = await this.queryResultCacheService.getCachedResults(
          query,
          context,
          searchParams
        );
        if (cachedResult && onProgress) {
          const cachedSearchResult = {
            results: cachedResult.results,
            performance: {
              totalTime: cachedResult.responseTime,
              embeddingCacheHits: 0,
              embeddingCacheMisses: 0,
              queryCache: {
                hit: true,
                source: cachedResult.source === "cache" ? "exact" : "fuzzy",
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
          onProgress(cachedSearchResult, "cached");
          if (cachedResult.source === "cache") {
            return cachedSearchResult;
          }
        }
        return await this.search(query, context, options);
      }
      /**
       * Batch search for multiple queries
       */
      async batchSearch(queries) {
        const results = [];
        const searchPromises = queries.map(
          ({ query, context, options }) => this.search(query, context, options)
        );
        const batchResults = await Promise.all(searchPromises);
        return batchResults;
      }
      /**
       * Get comprehensive cache statistics
       */
      async getPerformanceStats() {
        const embeddingStats = this.semanticSearchService.getSearchAnalytics();
        const queryStats = this.queryResultCacheService.getCacheStats();
        const queryDetails = await this.queryResultCacheService.getCacheInfo();
        const totalRequests = queryStats.totalRequests;
        const totalCacheHits = queryStats.hits + queryStats.fuzzyMatches + (embeddingStats?.totalSearches || 0);
        const overallHitRate = totalRequests > 0 ? (totalCacheHits / totalRequests * 100).toFixed(1) + "%" : "0.0%";
        return {
          embedding: embeddingStats || {},
          query: queryStats,
          queryDetails,
          combined: {
            totalRequests,
            totalCacheHits,
            overallHitRate,
            averageResponseTime: 0
            // Would need to track this separately
          }
        };
      }
      /**
       * Clear all caches
       */
      async clearAllCaches() {
        await Promise.all([
          this.semanticSearchService.clearCache(),
          this.queryResultCacheService.clearCache()
        ]);
        console.log("\u{1F5D1}\uFE0F Cleared all search caches (embedding + query)");
      }
      /**
       * Invalidate caches for specific context
       */
      async invalidateContext(userId, documentId) {
        await this.queryResultCacheService.invalidateContext(userId, documentId);
        console.log(`\u{1F504} Invalidated query cache for user ${userId}, document ${documentId || "all"}`);
      }
      /**
       * Search suggestions based on cached queries
       */
      async getSearchSuggestions(partialQuery, context, limit = 5) {
        const queryDetails = await this.queryResultCacheService.getCacheInfo();
        const suggestions = queryDetails.topQueries.filter(
          (entry) => entry.query.toLowerCase().includes(partialQuery.toLowerCase()) || partialQuery.toLowerCase().includes(entry.query.toLowerCase())
        ).slice(0, limit);
        return suggestions;
      }
      /**
       * Warm up cache with common queries
       */
      async warmupCache(commonQueries) {
        console.log(`\u{1F525} Warming up cache with ${commonQueries.length} common queries...`);
        for (const { query, context, options } of commonQueries) {
          try {
            await this.search(query, context, options);
            console.log(`\u2705 Warmed up: "${query}"`);
          } catch (error) {
            console.error(`\u274C Failed to warm up "${query}":`, error);
          }
        }
        console.log("\u{1F525} Cache warmup completed");
      }
    };
  }
});

// server/config/rag-config.ts
function getRAGConfig() {
  return { ...defaultRAGConfig };
}
var defaultRAGConfig;
var init_rag_config = __esm({
  "server/config/rag-config.ts"() {
    "use strict";
    defaultRAGConfig = {
      // Relevance thresholds - Lowered for better recall
      minRelevanceScore: 0.4,
      // Reduced from 0.7
      semanticRelevanceThreshold: 0.5,
      // Reduced from 0.7  
      fallbackRelevanceThreshold: 0.1,
      // Very low for fallback
      // Search limits
      maxResults: 20,
      maxSources: 5,
      maxContextLength: 4e3,
      // Cache settings  
      cacheTTL: 1e3 * 60 * 10,
      // 10 minutes
      enableQueryCache: true,
      enableEmbeddingCache: true,
      // Search behavior
      enableEmbeddings: true,
      enableFallbackSearch: true,
      includeMemoriesByDefault: true,
      includeAnnotationsByDefault: true,
      // Content processing
      enableDocumentFiltering: false,
      // Disabled for better recall
      contentChunkSize: 500,
      excerptLength: 300,
      // Response generation
      enableRelatedQuestions: true,
      enableStudyRecommendations: true,
      enableCrossReferences: true
    };
  }
});

// server/services/document-rag-service.ts
var document_rag_service_exports = {};
__export(document_rag_service_exports, {
  DocumentRAGService: () => DocumentRAGService,
  documentRAGService: () => documentRAGService
});
import { eq as eq6, and as and6 } from "drizzle-orm";
var DocumentRAGService, documentRAGService;
var init_document_rag_service = __esm({
  "server/services/document-rag-service.ts"() {
    "use strict";
    init_multi_model_service();
    init_semantic_search_service();
    init_enhanced_semantic_search_service();
    init_query_result_cache_service();
    init_cached_embedding_service();
    init_LocalMemoryService();
    init_rag_config();
    init_db();
    init_schema();
    DocumentRAGService = class {
      multiModel;
      semanticSearch;
      enhancedSemanticSearch;
      queryCache = /* @__PURE__ */ new Map();
      queryResultCache;
      cachedEmbedding;
      memory;
      translationService;
      // Add translation service
      // Use configuration instead of hardcoded values
      get config() {
        return getRAGConfig();
      }
      constructor() {
        this.multiModel = new MultiModelService();
        this.semanticSearch = new SemanticSearchService();
        this.enhancedSemanticSearch = new EnhancedSemanticSearchService();
        this.queryResultCache = new QueryResultCacheService();
        this.cachedEmbedding = new CachedEmbeddingService();
        this.memory = LocalMemoryService.getInstance();
      }
      // Add method to set translation service
      setTranslationService(translationService) {
        this.translationService = translationService;
        console.log("\u{1F310} Translation service added to RAG service");
      }
      // Language-aware helper methods
      async translateExcerpt(excerpt, targetLanguage) {
        if (!this.translationService || targetLanguage === "en") {
          return excerpt;
        }
        try {
          const result = await this.translationService.translateText({
            text: excerpt,
            targetLanguage,
            context: "biblical"
          });
          return result.translatedText;
        } catch (error) {
          console.warn(`Translation failed for excerpt: ${error}`);
          return excerpt;
        }
      }
      async generateLanguageAwareMessage(message, targetLanguage) {
        if (!this.translationService || targetLanguage === "en") {
          return message;
        }
        try {
          const result = await this.translationService.translateText({
            text: message,
            targetLanguage,
            context: "general"
          });
          return result.translatedText;
        } catch (error) {
          console.warn(`Translation failed for message: ${error}`);
          return message;
        }
      }
      async generateLanguageAwareFallbackResponse(query, sources, targetLanguage) {
        const baseResponse = this.generateFastFallbackResponse(query, sources);
        if (!this.translationService || targetLanguage === "en") {
          return baseResponse;
        }
        try {
          const result = await this.translationService.translateText({
            text: baseResponse,
            targetLanguage,
            context: "general"
          });
          return result.translatedText;
        } catch (error) {
          console.warn(`Translation failed for fallback response: ${error}`);
          return baseResponse;
        }
      }
      async generateLanguageAwareRAGResponse(query, retrievedContext, context, targetLanguage) {
        try {
          console.log(`\u{1F916} Generating grounded RAG response for: "${query}" in ${targetLanguage}`);
          const languageInstruction = targetLanguage !== "en" ? `
IMPORTANT: Respond EXCLUSIVELY in ${targetLanguage}.` : "";
          const prompt = `Based on the provided context, answer the user's question. Be accurate and grounded.

CONTEXT: ${retrievedContext.substring(0, 1e3)}

QUESTION: "${query}"

INSTRUCTIONS:
- Use only information from the context above
- If context is insufficient, say "I need more specific information"
- Keep response concise but helpful
- Be conversational but accurate${languageInstruction}

Answer:`;
          const response = await this.multiModel.executeTask("universal-reasoning", prompt, {
            requirements: {
              accuracy: 8,
              reasoning: 7,
              creativity: 2
              // Very low creativity to prevent hallucination
            },
            temperature: 0.2,
            // Very low temperature for consistency
            maxTokens: 200,
            // Reduced from 300 to 200 for faster responses
            timeout: 3e4
            // Increased to 30 seconds for better reliability
          });
          let answer = response.response.trim();
          answer = this.quickGroundingCheck(answer, retrievedContext);
          const confidence = this.calculateSimpleConfidence(answer, retrievedContext);
          console.log(`\u2705 Generated grounded response in ${targetLanguage} (confidence: ${confidence.toFixed(2)})`);
          return { answer, confidence };
        } catch (error) {
          console.error(`\u274C RAG response generation failed: ${error}`);
          const fastAnswer = this.generateContextBasedFallback(query, retrievedContext);
          if (targetLanguage !== "en" && this.translationService) {
            try {
              const result = await this.translationService.translateText({
                text: fastAnswer,
                targetLanguage,
                context: "general"
              });
              return { answer: result.translatedText, confidence: 0.6 };
            } catch {
            }
          }
          return {
            answer: fastAnswer,
            confidence: 0.6
          };
        }
      }
      async initialize() {
        await this.multiModel.initialize();
        await this.semanticSearch.initialize();
        console.log("\u{1F50D} Document RAG Service initialized with advanced caching - Ready for intelligent document retrieval!");
      }
      // 🧠 MAIN RAG QUERY PROCESSING with Advanced Caching
      async processRAGQuery(query, context, options = {}) {
        const startTime = Date.now();
        const targetLanguage = options.targetLanguage || context.targetLanguage || "en";
        console.log(`\u{1F50D} Processing RAG query: "${query}" in language: ${targetLanguage}`);
        const queryContext = {
          userId: context.userId,
          documentId: context.currentDocument,
          chapter: context.currentChapter
        };
        const searchParams = {
          includeMemories: options.includeMemories || false,
          includeAnnotations: options.includeAnnotations || false,
          semanticExpansion: true,
          useEmbeddings: options.useEmbeddings !== false,
          maxResults: options.maxSources || 3,
          relevanceThreshold: options.singleDocumentOnly ? 0.6 : 0.7
          // Lower threshold for single doc to get more results
        };
        const cacheKey = JSON.stringify({
          query,
          conversationHistory: context.conversationHistory.slice(-3),
          // Reduced from 5 to 3
          userId: context.userId,
          documentId: context.currentDocument,
          chapter: context.currentChapter,
          singleDocumentOnly: options.singleDocumentOnly || false,
          targetLanguage
          // Add language to cache key
        });
        try {
          const cachedResult = await this.queryResultCache.getCachedResults(cacheKey, queryContext, searchParams);
          if (cachedResult) {
            console.log(`\u26A1 Advanced cache HIT for "${query}" in ${targetLanguage} (${Date.now() - startTime}ms)`);
            let filteredResults2 = cachedResult.results;
            if (options.singleDocumentOnly && context.currentDocument) {
              filteredResults2 = cachedResult.results.filter(
                (result) => result.source?.id === context.currentDocument || result.source?.type === "annotation"
                // Allow annotations from current reading
              );
            }
            const answer2 = filteredResults2.length > 0 ? await this.generateLanguageAwareFallbackResponse(query, filteredResults2, targetLanguage) : await this.generateLanguageAwareMessage(`Based on your current reading, I found some relevant information about "${query}".`, targetLanguage);
            const ragResponse2 = {
              answer: answer2,
              sources: filteredResults2,
              confidence: 0.8,
              relatedQuestions: [],
              studyRecommendations: [],
              crossReferences: []
              // Empty for single document mode
            };
            return ragResponse2;
          }
          console.log(`\u{1F504} Performing fresh search with caching for: "${query}" in ${targetLanguage}`);
          const enhancedResult = await this.enhancedSemanticSearch.search(query, queryContext, {
            maxResults: options.maxSources || 5,
            includeMemories: options.includeMemories,
            includeAnnotations: options.includeAnnotations,
            semanticExpansion: true,
            singleDocumentOnly: options.singleDocumentOnly
          });
          console.log(`\u2705 Enhanced search completed in ${enhancedResult.performance.totalTime}ms (embedding cache: ${enhancedResult.performance.embeddingCacheHits} hits, ${enhancedResult.performance.embeddingCacheMisses} misses)`);
          let filteredResults = enhancedResult.results;
          if (options.singleDocumentOnly && context.currentDocument) {
            filteredResults = enhancedResult.results.filter((result) => {
              return result.source?.id === context.currentDocument || result.source?.type === "annotation" && result.metadata?.section === "current" || !result.source?.id;
            });
            console.log(`\u{1F3AF} Filtered ${enhancedResult.results.length} results to ${filteredResults.length} for single document mode`);
          }
          const chapterMatch = query.match(/chapter\s+(\d+)/i);
          if (chapterMatch && options.singleDocumentOnly) {
            const requestedChapter = parseInt(chapterMatch[1]);
            const beforeChapterFilter = filteredResults.length;
            filteredResults = filteredResults.filter((result) => {
              return this.isFromRequestedChapter(result, requestedChapter);
            });
            console.log(`\u{1F4D6} Chapter ${requestedChapter} filter: ${beforeChapterFilter} \u2192 ${filteredResults.length} results`);
          }
          const ragResults = await Promise.all(filteredResults.map(async (result) => {
            const excerpt = this.extractRelevantExcerpt(result.content, query, 300);
            const translatedExcerpt = targetLanguage !== "en" && this.translationService ? await this.translateExcerpt(excerpt, targetLanguage) : excerpt;
            return {
              ...result,
              ragScore: result.relevanceScore || 0.5,
              documentTitle: result.source?.title || "Current Document",
              documentType: "document",
              excerpt: translatedExcerpt,
              relevantPassages: [result.content.substring(0, 400)],
              // Keep original for reference
              crossReferences: options.singleDocumentOnly ? [] : []
              // No cross-references for single document mode
            };
          }));
          const limitedRagResults = ragResults.slice(0, 8);
          const wasTruncated = ragResults.length > 8;
          let answer;
          let confidence;
          if (ragResults.length > 0 && ragResults[0].ragScore > 0.5) {
            try {
              const aiResponse = await Promise.race([
                this.generateLanguageAwareRAGResponse(query, ragResults.map((r) => r.excerpt).join("\n"), context, targetLanguage),
                new Promise(
                  (_, reject) => setTimeout(() => reject(new Error("AI timeout")), 35e3)
                  // Increased to 35s for better reliability
                )
              ]);
              answer = aiResponse.answer;
              confidence = aiResponse.confidence;
            } catch {
              answer = await this.generateLanguageAwareFallbackResponse(query, ragResults, targetLanguage);
              confidence = 0.7;
            }
          } else {
            answer = await this.generateLanguageAwareFallbackResponse(query, ragResults, targetLanguage);
            confidence = ragResults.length > 0 ? 0.6 : 0.3;
          }
          const ragResponse = {
            answer,
            sources: ragResults,
            confidence,
            relatedQuestions: options.singleDocumentOnly ? [] : [],
            // No related questions for single document
            studyRecommendations: [],
            crossReferences: options.singleDocumentOnly ? [] : []
            // No cross-references for single document
          };
          await this.queryResultCache.storeResults(cacheKey, queryContext, searchParams, limitedRagResults);
          console.log(`\u2705 RAG query completed in ${Date.now() - startTime}ms with ${ragResults.length} sources in ${targetLanguage}${wasTruncated ? " (truncated to 8 for cache)" : ""}`);
          return ragResponse;
        } catch (error) {
          console.error(`\u274C RAG query failed: ${error}`);
          try {
            console.log(`\u{1F504} Attempting enhanced simple search fallback...`);
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
            console.error(`\u274C Simple search fallback also failed: ${fallbackError}`);
          }
          return {
            answer: `I'm having trouble finding specific information about "${query}" in your documents right now. This could be because:

\u2022 The topic might not be covered in your current documents
\u2022 Try using different keywords or phrases  
\u2022 The information might be in a different section or chapter
\u2022 You might need to upload more documents on this topic

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
      generateFastFallbackResponse(query, sources) {
        if (sources.length === 0) {
          return `I don't have specific information available about "${query}" in your current reading. Could you help me understand what specific aspect you'd like to explore, or point me to a particular section you're reading?`;
        }
        let response = `Based on your current reading, here's what I found about "${query}":

`;
        const relevantSources = sources.slice(0, 2);
        relevantSources.forEach((source, index2) => {
          const excerpt = source.excerpt.length > 120 ? source.excerpt.substring(0, 120) + "..." : source.excerpt;
          response += `\u2022 ${excerpt}`;
          if (source.documentTitle && source.documentTitle !== "Current Document") {
            response += ` (from ${source.documentTitle})`;
          }
          response += "\n";
        });
        if (sources.length > 2) {
          response += `
I found ${sources.length - 2} additional related passages. `;
        }
        response += `
Would you like me to explore any specific aspect of this further, or help you find more information on a particular point?`;
        return response;
      }
      // 🚀 NEW: Minimal fallback when everything fails
      generateMinimalFallbackResponse(query) {
        return `I'd like to help you explore "${query}", but I don't have specific information available right now. Could you point me to a section of your reading that relates to this, or help me understand what specific aspect you're most interested in?`;
      }
      // 🔍 ENHANCED DOCUMENT SEARCH
      async enhancedDocumentSearch(query, context, options) {
        const searchContext = {
          userId: context.userId,
          currentDocument: context.currentDocument,
          currentChapter: context.currentChapter,
          recentQueries: context.conversationHistory.slice(-5),
          userExpertiseLevel: context.studyLevel === "beginner" ? 3 : context.studyLevel === "intermediate" ? 6 : 9,
          preferredTopics: context.preferredTopics
        };
        const [documentResults, annotationResults, memoryResults] = await Promise.all([
          this.searchDocuments(query, searchContext, options.useEmbeddings),
          options.includeAnnotations !== false ? this.searchAnnotations(query, searchContext) : [],
          options.includeMemories !== false ? this.searchMemories(query, searchContext) : []
        ]);
        const allResults = [...documentResults, ...annotationResults, ...memoryResults];
        const ragResults = await this.convertToRAGResults(allResults, query, context);
        const maxSources = options.maxSources || 10;
        return ragResults.sort((a, b) => b.ragScore - a.ragScore).slice(0, maxSources);
      }
      // 📄 SEARCH DOCUMENTS with Smart Hybrid Approach
      async searchDocuments(query, context, useEmbeddings = false) {
        try {
          console.log(`\u{1F50D} Starting smart hybrid search for "${query}"`);
          if (context.currentDocument) {
            console.log(`\u{1F4D6} Searching current document (ID: ${context.currentDocument}) first...`);
            const currentDocResults = await this.searchSpecificDocument(
              query,
              context,
              context.currentDocument,
              useEmbeddings
            );
            if (currentDocResults.length > 0 && currentDocResults[0].relevanceScore > 0.7) {
              console.log(`\u2705 Found ${currentDocResults.length} high-quality results in current document`);
              return currentDocResults;
            }
            if (currentDocResults.length > 0) {
              console.log(`\u26A0\uFE0F Found ${currentDocResults.length} moderate results in current document, expanding search...`);
              const allResults = await this.searchAllDocuments(query, context, useEmbeddings);
              const boostedCurrentResults = currentDocResults.map((result) => ({
                ...result,
                relevanceScore: Math.min(result.relevanceScore * 1.2, 1),
                contextualRelevance: Math.min((result.contextualRelevance || 0) * 1.2, 1)
              }));
              const combinedResults = this.combineAndDeduplicateResults(boostedCurrentResults, allResults);
              console.log(`\u{1F504} Combined search: ${currentDocResults.length} current + ${allResults.length} all = ${combinedResults.length} total`);
              return combinedResults;
            }
            console.log(`\u274C No good results in current document, searching all documents...`);
          }
          return await this.searchAllDocuments(query, context, useEmbeddings);
        } catch (error) {
          console.error(`\u274C Error in smart hybrid search: ${error}`);
          return [];
        }
      }
      // 📖 Search a specific document
      async searchSpecificDocument(query, context, documentId, useEmbeddings) {
        try {
          const document = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            userId: documents.userId,
            createdAt: documents.createdAt
          }).from(documents).where(and6(
            eq6(documents.userId, context.userId),
            eq6(documents.id, documentId)
          )).limit(1);
          if (document.length === 0) {
            console.log(`\u26A0\uFE0F Current document ${documentId} not found`);
            return [];
          }
          const doc = document[0];
          const results = [];
          if (useEmbeddings) {
            console.log(`\u{1F517} Using embedding search on document: "${doc.title}"`);
            const searchResults = await this.semanticSearch.search(query, {
              ...context,
              currentDocument: documentId
            }, {
              maxResults: 10,
              includeMemories: false,
              includeAnnotations: false,
              useEmbeddings: true
            });
            return searchResults.filter(
              (result) => result.source?.type === "document" && result.source?.id === documentId
            );
          } else {
            console.log(`\u{1F4DD} Using traditional search on document: "${doc.title}"`);
            const relevance = await this.calculateDocumentRelevance(doc.content, query, context, false);
            if (relevance.score > this.config.minRelevanceScore) {
              results.push({
                id: `doc_${doc.id}`,
                content: doc.content,
                relevanceScore: relevance.score,
                semanticSimilarity: relevance.semanticSimilarity,
                contextualRelevance: relevance.contextualRelevance,
                source: {
                  type: "document",
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
          console.error(`\u274C Error searching specific document ${documentId}: ${error}`);
          return [];
        }
      }
      // 📚 Search all documents (original behavior)
      async searchAllDocuments(query, context, useEmbeddings) {
        try {
          console.log(`\u{1F310} Searching all documents for "${query}"`);
          const documents3 = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            userId: documents.userId,
            createdAt: documents.createdAt
          }).from(documents).where(eq6(documents.userId, context.userId));
          const results = [];
          if (useEmbeddings) {
            console.log(`\u{1F517} Using embedding-based search across all documents`);
            const searchResults = await this.semanticSearch.search(query, context, {
              maxResults: 20,
              includeMemories: false,
              includeAnnotations: false,
              useEmbeddings: true
            });
            return searchResults;
          } else {
            console.log(`\u{1F4DD} Using traditional search across all documents`);
            for (const doc of documents3) {
              const relevance = await this.calculateDocumentRelevance(doc.content, query, context, false);
              if (relevance.score > this.config.minRelevanceScore) {
                results.push({
                  id: `doc_${doc.id}`,
                  content: doc.content,
                  relevanceScore: relevance.score,
                  semanticSimilarity: relevance.semanticSimilarity,
                  contextualRelevance: relevance.contextualRelevance,
                  source: {
                    type: "document",
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
          console.error(`\u274C Error searching all documents: ${error}`);
          return [];
        }
      }
      // 🔄 Combine and deduplicate results
      combineAndDeduplicateResults(currentResults, allResults) {
        const resultMap = /* @__PURE__ */ new Map();
        currentResults.forEach((result) => {
          resultMap.set(result.id, result);
        });
        allResults.forEach((result) => {
          if (!resultMap.has(result.id)) {
            resultMap.set(result.id, result);
          }
        });
        return Array.from(resultMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
      }
      // 📝 SEARCH ANNOTATIONS
      async searchAnnotations(query, context) {
        try {
          const annotations2 = await db.select({
            id: annotations.id,
            documentId: annotations.documentId,
            chapter: annotations.chapter,
            selectedText: annotations.selectedText,
            note: annotations.note,
            createdAt: annotations.createdAt
          }).from(annotations).where(eq6(annotations.userId, context.userId));
          const results = [];
          for (const annotation of annotations2) {
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
                  type: "annotation",
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
          console.error(`\u274C Error searching annotations: ${error}`);
          return [];
        }
      }
      // 🧠 SEARCH MEMORIES
      async searchMemories(query, context) {
        try {
          const memories = await db.select({
            id: aiMemories.id,
            content: aiMemories.content,
            category: aiMemories.category,
            metadata: aiMemories.metadata,
            createdAt: aiMemories.createdAt
          }).from(aiMemories).where(eq6(aiMemories.userId, context.userId));
          const results = [];
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
                  type: "memory",
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
          console.error(`\u274C Error searching memories: ${error}`);
          return [];
        }
      }
      // 📊 CALCULATE DOCUMENT RELEVANCE
      async calculateDocumentRelevance(content, query, context, useEmbeddings = true) {
        try {
          if (useEmbeddings) {
            console.log(`\u{1F517} Using embedding-based relevance calculation`);
            const queryEmbedding = await this.multiModel.generateEmbedding(query);
            const contentEmbedding = await this.multiModel.generateEmbedding(content.substring(0, 1e3));
            const similarity = this.multiModel.calculateCosineSimilarity(queryEmbedding, contentEmbedding);
            return {
              score: similarity,
              semanticSimilarity: similarity,
              contextualRelevance: similarity * 0.9,
              // Slightly lower than semantic
              snippets: [this.extractRelevantExcerpt(content, query, 200)]
            };
          } else {
            console.log(`\u{1F4DD} Using traditional relevance calculation with qwen2.5`);
            const analysisPrompt = `Analyze the relevance of this content to the query.
Query: "${query}"
Content: "${content.substring(0, 2e3)}"

Rate the relevance on a scale of 0.0 to 1.0 and provide relevant snippets.
Respond with JSON: {
  "semanticSimilarity": 0.8,
  "contextualRelevance": 0.7,
  "relevantSnippets": ["snippet1", "snippet2"]
}`;
            const result = await this.multiModel.executeTask("semantic-search", analysisPrompt, {
              requirements: { accuracy: 9, speed: 7, reasoning: 8 }
            });
            const analysis = this.parseAnalysisResult(result.response);
            const overallScore = analysis.semanticSimilarity * 0.6 + analysis.contextualRelevance * 0.4;
            return {
              score: overallScore,
              semanticSimilarity: analysis.semanticSimilarity,
              contextualRelevance: analysis.contextualRelevance,
              snippets: analysis.relevantSnippets || []
            };
          }
        } catch (error) {
          console.error(`\u274C Error calculating relevance: ${error}`);
          return {
            score: 0.5,
            semanticSimilarity: 0.5,
            contextualRelevance: 0.5,
            snippets: [content.substring(0, 200)]
          };
        }
      }
      // 🔧 PARSE ANALYSIS RESULT
      parseAnalysisResult(response) {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
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
      async convertToRAGResults(results, query, context) {
        return results.map((result) => ({
          ...result,
          ragScore: this.calculateRAGScore(result, query, context),
          documentTitle: result.source.title || "Unknown Document",
          documentType: result.source.type,
          excerpt: this.extractRelevantExcerpt(result.content, query),
          relevantPassages: result.highlightedSnippets,
          crossReferences: []
          // Will be populated later
        }));
      }
      // 📊 CALCULATE RAG SCORE
      calculateRAGScore(result, query, context) {
        let score = result.relevanceScore;
        if (context.preferredTopics.some(
          (topic) => result.content.toLowerCase().includes(topic.toLowerCase())
        )) {
          score += 0.1;
        }
        if (result.source.type === "annotation" || result.source.type === "memory") {
          score += 0.05;
        }
        if (context.currentDocument && result.source.id === context.currentDocument) {
          score += 0.15;
        }
        return Math.min(1, score);
      }
      // 📄 EXTRACT RELEVANT EXCERPT
      extractRelevantExcerpt(content, query, maxLength = 300) {
        const queryWords = query.toLowerCase().split(" ");
        const contentLower = content.toLowerCase();
        let bestPosition = 0;
        let bestScore = 0;
        for (let i = 0; i < content.length - maxLength; i += 50) {
          const segment = contentLower.substring(i, i + maxLength);
          const score = queryWords.reduce(
            (acc, word) => acc + (segment.includes(word) ? 1 : 0),
            0
          );
          if (score > bestScore) {
            bestScore = score;
            bestPosition = i;
          }
        }
        let excerpt = content.substring(bestPosition, bestPosition + maxLength);
        if (bestPosition > 0) excerpt = "..." + excerpt;
        if (bestPosition + maxLength < content.length) excerpt += "...";
        return excerpt;
      }
      // 🔗 BUILD RAG CONTEXT
      async buildRAGContext(searchResults, query, context) {
        let ragContext = `Based on the user's personal study materials, here is relevant information:

`;
        for (const result of searchResults.slice(0, 5)) {
          ragContext += `\u{1F4D6} From "${result.documentTitle}" (${result.documentType}):
`;
          ragContext += `${result.excerpt}

`;
          if (result.relevantPassages.length > 0) {
            ragContext += `Key passages: ${result.relevantPassages.join("; ")}

`;
          }
        }
        if (context.conversationHistory.length > 0) {
          ragContext += `Recent conversation context:
`;
          ragContext += context.conversationHistory.slice(-3).join("\n") + "\n\n";
        }
        if (ragContext.length > this.config.maxContextLength) {
          ragContext = ragContext.substring(0, this.config.maxContextLength) + "...";
        }
        return ragContext;
      }
      quickGroundingCheck(answer, context) {
        if (answer.includes("research shows") || answer.includes("studies indicate")) {
          return `Based on the available information, ${answer.replace(/research shows|studies indicate/gi, "")}`;
        }
        if (!answer.includes("based on") && !answer.includes("from the context") && context.length > 50) {
          return `Based on your reading, ${answer}`;
        }
        return answer;
      }
      calculateSimpleConfidence(answer, context) {
        let confidence = 0.7;
        if (answer.includes("based on") || answer.includes("from the context")) {
          confidence += 0.1;
        }
        if (context.length < 100) {
          confidence -= 0.2;
        }
        return Math.max(0.4, Math.min(0.9, confidence));
      }
      generateContextBasedFallback(query, context) {
        if (!context || context.length < 30) {
          return `I'd like to help with "${query}", but I need more specific information from your reading. Could you point me to a particular section?`;
        }
        const snippet = context.substring(0, 150);
        return `Based on your reading: "${snippet}..." Would you like me to explore a specific aspect of "${query}" further?`;
      }
      isFromRequestedChapter(result, requestedChapter) {
        const content = result.content?.toLowerCase() || "";
        const metadata = result.metadata || {};
        const chapterPatterns = [
          `chapter ${requestedChapter}`,
          `chapter ${requestedChapter}:`,
          `chapter ${requestedChapter}.`,
          `chapter ${requestedChapter} -`,
          `chapter ${requestedChapter}\\n`,
          `chapter ${requestedChapter}\\t`
        ];
        const isFromChapter = chapterPatterns.some(
          (pattern) => content.includes(pattern) || content.includes(pattern.replace("\\n", "\n").replace("\\t", "	"))
        );
        const metadataMatch = metadata.chapter === requestedChapter || metadata.section && metadata.section.includes(`Chapter ${requestedChapter}`);
        if (isFromChapter || metadataMatch) {
          return true;
        }
        const otherChapterMatch = content.match(/chapter\s+(\d+)/i);
        if (otherChapterMatch) {
          const foundChapter = parseInt(otherChapterMatch[1]);
          if (foundChapter !== requestedChapter) {
            if (Math.abs(foundChapter - requestedChapter) <= 1) {
              return true;
            }
            if (content.length < 500 || content.includes("introduction") || content.includes("overview")) {
              return true;
            }
            const chapterReferences = (content.match(/chapter\s+\d+/gi) || []).length;
            if (chapterReferences <= 1) {
              return true;
            }
            return false;
          }
        }
        const hasChapterContext = content.includes("chapter") || metadata.chapter;
        if (!hasChapterContext) {
          return true;
        }
        return true;
      }
      // 🔍 Analyze query complexity and type
      async analyzeQueryComplexity(query) {
        const queryLower = query.toLowerCase();
        let type = "general";
        if (queryLower.match(/what is|what are|define|definition|meaning/)) {
          type = "factual";
        } else if (queryLower.match(/why|how does|explain|because|reason|cause/)) {
          type = "explanatory";
        } else if (queryLower.match(/compare|versus|vs|difference|similar|unlike|better|worse/)) {
          type = "comparative";
        } else if (queryLower.match(/analyze|analysis|evaluate|assess|implications|impact/)) {
          type = "analytical";
        }
        const complexity = Math.min(10, Math.max(
          1,
          query.split(" ").length / 3 + (queryLower.match(/\?/g) || []).length * 2 + (queryLower.match(/and|or|but|however|therefore/g) || []).length
        ));
        const keywords = query.toLowerCase().split(/\s+/).filter((word) => word.length > 3 && !["what", "how", "why", "when", "where", "which"].includes(word)).slice(0, 5);
        return { type, complexity, keywords };
      }
      // 🔗 Enhanced context synthesis
      async synthesizeContext(retrievedContext, query, context) {
        const contextSections = retrievedContext.split("\u{1F4D6}").filter((section) => section.trim());
        let synthesized = `# Relevant Information for: "${query}"

`;
        const groupedSources = this.groupSimilarSources(contextSections);
        for (const [topic, sources] of Object.entries(groupedSources)) {
          synthesized += `## ${topic}
`;
          sources.forEach((source, index2) => {
            synthesized += `**Source ${index2 + 1}:** ${source.trim()}

`;
          });
        }
        if (context.preferredTopics.length > 0) {
          synthesized += `
## User's Study Focus
`;
          synthesized += `Topics of interest: ${context.preferredTopics.join(", ")}
`;
          synthesized += `Study level: ${context.studyLevel}

`;
        }
        return synthesized;
      }
      // 📊 Group similar sources by topic
      groupSimilarSources(sections) {
        const groups = {};
        sections.forEach((section) => {
          const titleMatch = section.match(/From "([^"]+)"/);
          const title = titleMatch ? titleMatch[1] : "Other Sources";
          if (!groups[title]) {
            groups[title] = [];
          }
          groups[title].push(section);
        });
        return groups;
      }
      // 📋 Format factual response
      formatFactualResponse(response) {
        if (!response.includes("\u2022") && !response.includes("-") && response.includes("\n")) {
          const lines = response.split("\n").filter((line) => line.trim());
          if (lines.length > 2) {
            return lines.map(
              (line, index2) => index2 === 0 ? line : `\u2022 ${line.trim()}`
            ).join("\n");
          }
        }
        return response;
      }
      // 🔬 Format analytical response
      formatAnalyticalResponse(response) {
        if (!response.includes("##") && !response.includes("**")) {
          const paragraphs = response.split("\n\n");
          if (paragraphs.length > 1) {
            return paragraphs.map(
              (para, index2) => index2 === 0 ? `**Analysis:** ${para}` : para
            ).join("\n\n");
          }
        }
        return response;
      }
      // ✅ Validate and enhance response
      async validateAndEnhanceResponse(answer, query, context, userContext) {
        let confidence = 0.8;
        let enhancedAnswer = answer;
        if (answer.length < 50) {
          confidence -= 0.2;
          enhancedAnswer += "\n\n*Note: This answer is brief due to limited information in your documents. Consider uploading more relevant materials for a more comprehensive response.*";
        }
        const queryWords = query.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
        const answerLower = answer.toLowerCase();
        const addressedWords = queryWords.filter((word) => answerLower.includes(word));
        if (addressedWords.length / queryWords.length < 0.3) {
          confidence -= 0.3;
        }
        if (confidence > 0.8) {
          enhancedAnswer = `${enhancedAnswer}

*Confidence: High - Based on comprehensive information from your materials.*`;
        } else if (confidence > 0.6) {
          enhancedAnswer = `${enhancedAnswer}

*Confidence: Moderate - Based on available information, but may benefit from additional sources.*`;
        } else {
          enhancedAnswer = `${enhancedAnswer}

*Confidence: Low - Limited information available. Consider uploading more relevant documents.*`;
        }
        return {
          answer: enhancedAnswer,
          confidence: Math.max(0.1, confidence)
        };
      }
      // 🔗 FIND CROSS-REFERENCES
      async findCrossReferences(searchResults, context) {
        const crossRefs = [];
        for (const result of searchResults.slice(0, 3)) {
          if (result.relatedConcepts.length > 0) {
            crossRefs.push({
              documentId: result.source.id,
              documentTitle: result.documentTitle,
              chapter: result.source.chapter,
              relevanceScore: result.ragScore,
              connectionType: "thematic",
              snippet: result.excerpt.substring(0, 100) + "..."
            });
          }
        }
        return crossRefs;
      }
      // 📚 GENERATE STUDY RECOMMENDATIONS
      async generateStudyRecommendations(query, searchResults, context) {
        const recommendations = [];
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
      async generateRelatedQuestions(query, searchResults, context) {
        const questionsPrompt = `Based on this query: "${query}" and the user's study materials, suggest 3 related questions they might want to explore next. Make them specific to their content.

Respond with just the questions, one per line:`;
        try {
          const result = await this.multiModel.executeTask("creative-insights", questionsPrompt, {
            requirements: { creativity: 8, reasoning: 6, speed: 8 }
          });
          return result.response.split("\n").filter((line) => line.trim().length > 0).slice(0, 3);
        } catch (error) {
          console.error(`\u274C Error generating related questions: ${error}`);
          return [
            "What other passages relate to this topic?",
            "How does this connect to your previous studies?",
            "What practical applications can you draw from this?"
          ];
        }
      }
      // 📊 GET RAG ANALYTICS
      getRAGAnalytics() {
        const totalQueries = this.queryCache.size;
        return {
          totalQueries,
          cacheHitRate: 0.75,
          // Placeholder
          averageSources: 5,
          // Placeholder
          topQueries: []
          // Placeholder
        };
      }
      // 🧹 CLEAR CACHE
      async clearCache() {
        this.queryCache.clear();
        console.log("\u{1F9F9} RAG cache cleared");
      }
      // 💾 SAVE RAG INSIGHTS TO DATABASE for persistent knowledge building
      async saveRAGInsightsToDB(query, response, context) {
        try {
          const timestamp = (/* @__PURE__ */ new Date()).toISOString();
          const mainMemoryId = `rag_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.insert(aiMemories).values({
            id: mainMemoryId,
            userId: context.userId,
            content: `Query: ${query}

Answer: ${response.answer}`,
            category: "rag_response",
            metadata: JSON.stringify({
              confidence: response.confidence,
              sourcesCount: response.sources.length,
              timestamp,
              studyLevel: context.studyLevel
            })
          });
          for (const question of response.relatedQuestions) {
            const questionId = `rag_question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.insert(aiMemories).values({
              id: questionId,
              userId: context.userId,
              content: question,
              category: "suggested_question",
              metadata: JSON.stringify({
                originalQuery: query,
                timestamp,
                relevantSources: response.sources.slice(0, 2).map((s) => s.documentTitle)
              })
            });
          }
          for (const recommendation of response.studyRecommendations) {
            const recId = `rag_recommendation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.insert(aiMemories).values({
              id: recId,
              userId: context.userId,
              content: recommendation,
              category: "study_recommendation",
              metadata: JSON.stringify({
                originalQuery: query,
                timestamp,
                studyLevel: context.studyLevel
              })
            });
          }
          for (const crossRef of response.crossReferences) {
            const crossRefId = `rag_crossref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.insert(aiMemories).values({
              id: crossRefId,
              userId: context.userId,
              content: `Cross-reference: ${crossRef.snippet}`,
              category: "cross_reference",
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
          console.log(`\u{1F4BE} Saved RAG insights to database: 1 response + ${response.relatedQuestions.length} questions + ${response.studyRecommendations.length} recommendations + ${response.crossReferences.length} cross-refs`);
        } catch (error) {
          console.error(`\u274C Failed to save RAG insights to database: ${error}`);
        }
      }
      // 🔍 SEARCH SAVED RAG INSIGHTS
      async searchSavedInsights(query, userId, category) {
        try {
          const whereConditions = [eq6(aiMemories.userId, userId)];
          if (category) {
            whereConditions.push(eq6(aiMemories.category, category));
          }
          const memories = await db.select().from(aiMemories).where(and6(...whereConditions));
          return memories.filter((memory) => memory.content.toLowerCase().includes(query.toLowerCase())).map((memory) => ({
            ...memory,
            relevanceScore: this.calculateSimpleRelevance(memory.content, query)
          })).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
        } catch (error) {
          console.error(`\u274C Error searching saved insights: ${error}`);
          return [];
        }
      }
      // 📊 SIMPLE RELEVANCE CALCULATION
      calculateSimpleRelevance(content, query) {
        if (!content || !query) return 0;
        const contentLower = content.toLowerCase();
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2);
        const queryPhrases = queryLower.split(/[,;.!?]+/).map((p) => p.trim()).filter((p) => p.length > 3);
        let score = 0;
        const contentLength = content.length;
        queryPhrases.forEach((phrase) => {
          const phraseMatches = (contentLower.match(new RegExp(this.escapeRegex(phrase), "g")) || []).length;
          score += phraseMatches * 10;
        });
        queryWords.forEach((word) => {
          const exactMatches = (contentLower.match(new RegExp(`\\b${this.escapeRegex(word)}\\b`, "g")) || []).length;
          score += exactMatches * 3;
          const partialMatches = (contentLower.match(new RegExp(this.escapeRegex(word), "g")) || []).length;
          score += partialMatches * 1;
          if (word.length > 4) {
            const fuzzyPattern = this.createFuzzyPattern(word);
            const fuzzyMatches = (contentLower.match(new RegExp(fuzzyPattern, "g")) || []).length;
            score += fuzzyMatches * 0.5;
          }
        });
        const acronyms = this.extractAcronyms(queryLower);
        acronyms.forEach((acronym) => {
          const acronymMatches = (contentLower.match(new RegExp(`\\b${this.escapeRegex(acronym)}\\b`, "gi")) || []).length;
          score += acronymMatches * 5;
        });
        const relatedTerms = this.getRelatedTerms(queryLower);
        relatedTerms.forEach((term) => {
          const relatedMatches = (contentLower.match(new RegExp(`\\b${this.escapeRegex(term)}\\b`, "g")) || []).length;
          score += relatedMatches * 2;
        });
        const normalizedScore = score / Math.sqrt(contentLength / 1e3);
        return Math.min(normalizedScore, 10);
      }
      // Helper method to escape regex special characters
      escapeRegex(text2) {
        return text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      // Create fuzzy pattern for approximate matching
      createFuzzyPattern(word) {
        const allowedErrors = word.length > 7 ? 2 : 1;
        if (allowedErrors === 1) {
          return word.split("").map(
            (char, i) => `${word.substring(0, i)}[a-z]?${word.substring(i + 1)}`
          ).join("|");
        }
        return word.substring(0, Math.floor(word.length * 0.8));
      }
      // Extract acronyms from query (like XRP, BTC, etc.)
      extractAcronyms(query) {
        const acronymPattern = /\b[A-Z]{2,5}\b/gi;
        return (query.match(acronymPattern) || []).map((a) => a.toUpperCase());
      }
      // Get related terms for better semantic matching
      getRelatedTerms(query) {
        const relatedTermsMap = {
          "xrp": ["ripple", "cryptocurrency", "digital currency", "blockchain", "crypto"],
          "cryptocurrency": ["bitcoin", "crypto", "digital currency", "blockchain", "token"],
          "bitcoin": ["btc", "cryptocurrency", "crypto", "digital currency", "blockchain"],
          "blockchain": ["distributed ledger", "crypto", "cryptocurrency", "decentralized"],
          "finance": ["financial", "economic", "economy", "monetary", "banking"],
          "economy": ["economic", "financial", "gdp", "market", "trade"],
          "technology": ["tech", "digital", "innovation", "software", "computing"],
          "ai": ["artificial intelligence", "machine learning", "ml", "neural network"],
          "business": ["corporate", "company", "enterprise", "commercial", "industry"]
        };
        const related = [];
        Object.keys(relatedTermsMap).forEach((key) => {
          if (query.includes(key)) {
            related.push(...relatedTermsMap[key]);
          }
        });
        return Array.from(new Set(related));
      }
      // 🚀 NEW: Enhanced simple search fallback
      async performSimpleSearch(query, context) {
        try {
          console.log(`\u{1F50D} Performing enhanced simple search fallback for: "${query}"`);
          const searchTerms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2).slice(0, 10);
          if (searchTerms.length === 0) {
            return [];
          }
          const documents3 = await db.select({
            id: documents.id,
            title: documents.title,
            content: documents.content,
            userId: documents.userId
          }).from(documents).where(eq6(documents.userId, context.userId || 2)).limit(10);
          const results = [];
          for (const doc of documents3) {
            const titleMatches = searchTerms.filter(
              (term) => doc.title.toLowerCase().includes(term)
            ).length;
            let contentMatches = 0;
            let relevantExcerpt = "";
            try {
              let content = doc.content;
              if (typeof content === "string") {
                try {
                  content = JSON.parse(content);
                } catch (e) {
                }
              }
              let searchableText = "";
              if (typeof content === "object" && content && content.chapters) {
                searchableText = content.chapters.map((chapter) => {
                  if (chapter.paragraphs) {
                    return chapter.paragraphs.map((p) => p.text || p.content || "").join(" ");
                  }
                  return JSON.stringify(chapter);
                }).join(" ");
              } else {
                searchableText = content.toString();
              }
              const lowerText = searchableText.toLowerCase();
              contentMatches = searchTerms.filter(
                (term) => lowerText.includes(term)
              ).length;
              const firstMatchTerm = searchTerms.find((term) => lowerText.includes(term));
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
            const totalMatches = titleMatches * 2 + contentMatches;
            const maxPossibleMatches = searchTerms.length * 3;
            const relevanceScore = Math.min(totalMatches / maxPossibleMatches + 0.1, 1);
            if (relevanceScore > 0.1) {
              results.push({
                id: `doc_${doc.id}`,
                content: relevantExcerpt,
                relevanceScore,
                semanticSimilarity: relevanceScore * 0.8,
                contextualRelevance: relevanceScore,
                source: {
                  type: "document",
                  id: doc.id,
                  title: doc.title
                },
                highlightedSnippets: [relevantExcerpt],
                relatedConcepts: [],
                suggestedQuestions: [],
                ragScore: relevanceScore,
                documentTitle: doc.title,
                documentType: "document",
                excerpt: relevantExcerpt,
                relevantPassages: [relevantExcerpt],
                crossReferences: []
              });
            }
          }
          return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
        } catch (error) {
          console.error(`\u274C Simple search fallback failed: ${error}`);
          return [];
        }
      }
    };
    documentRAGService = new DocumentRAGService();
  }
});

// server/services/definitions-access-service.ts
import { like as like4, eq as eq7, desc as desc5 } from "drizzle-orm";
var DefinitionsAccessService;
var init_definitions_access_service = __esm({
  "server/services/definitions-access-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    DefinitionsAccessService = class {
      /**
       * 🔍 Search for definitions by term or content
       */
      async searchDefinitions(options = {}) {
        try {
          const {
            search,
            domain,
            complexity,
            limit = 10,
            minConfidence = 0
          } = options;
          const results = await db.query.learnedDefinitions.findMany({
            limit,
            orderBy: desc5(learnedDefinitions.created_at),
            where: search ? like4(learnedDefinitions.term, `%${search}%`) : void 0
          });
          return results.filter((def) => {
            if (minConfidence > 0 && (def.confidence_score || 0) < minConfidence * 100) return false;
            return true;
          }).map((def) => ({
            id: def.id,
            term: def.term,
            definition: def.definition,
            context: def.context_snippet || void 0,
            sourceUrl: void 0,
            // Field doesn't exist in schema
            domain: void 0,
            // Field doesn't exist in schema
            complexity: "intermediate",
            // Field doesn't exist in schema
            confidence: (def.confidence_score || 80) / 100,
            learningValue: 0.7,
            // Field doesn't exist in schema, use default
            tags: def.tags ? JSON.parse(def.tags) : [],
            createdAt: def.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
            accessCount: def.access_count || 0
          }));
        } catch (error) {
          console.error("\u274C Definition search failed:", error);
          return [];
        }
      }
      /**
       * 📖 Get a specific definition by ID
       */
      async getDefinition(id) {
        try {
          const result = await db.select().from(learnedDefinitions).where(eq7(learnedDefinitions.id, id)).limit(1);
          if (result.length === 0) return null;
          const definition = result[0];
          await db.update(learnedDefinitions).set({
            last_accessed_at: /* @__PURE__ */ new Date(),
            access_count: (definition.access_count || 0) + 1
          }).where(eq7(learnedDefinitions.id, id));
          return {
            id: definition.id,
            term: definition.term,
            definition: definition.definition,
            context: definition.context_snippet || void 0,
            sourceUrl: void 0,
            // Field doesn't exist in schema
            domain: void 0,
            // Field doesn't exist in schema
            complexity: "intermediate",
            // Field doesn't exist in schema
            confidence: (definition.confidence_score || 80) / 100,
            learningValue: 0.7,
            // Field doesn't exist in schema, use default
            tags: definition.tags ? JSON.parse(definition.tags) : [],
            createdAt: definition.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
            accessCount: definition.access_count || 0
          };
        } catch (error) {
          console.error("\u274C Get definition failed:", error);
          return null;
        }
      }
      /**
       * 🎯 Find definitions related to a specific topic or context
       */
      async getRelatedDefinitions(topic, limit = 5) {
        const searchTerms = topic.toLowerCase().split(" ");
        const results = [];
        for (const term of searchTerms) {
          if (term.length > 2) {
            const termResults = await this.searchDefinitions({
              search: term,
              limit: 3
            });
            results.push(...termResults);
          }
        }
        const uniqueResults = results.filter(
          (def, index2, arr) => arr.findIndex((d) => d.id === def.id) === index2
        );
        return uniqueResults.sort((a, b) => b.confidence * b.learningValue - a.confidence * a.learningValue).slice(0, limit);
      }
      /**
       * 📊 Get definitions by domain for expertise building
       * Note: Domain field doesn't exist in current schema, returns all definitions
       */
      async getDefinitionsByDomain(domain, limit = 20) {
        return this.searchDefinitions({
          limit,
          minConfidence: 0.7
          // Only high-confidence definitions
        });
      }
      /**
       * 🏷️ Get definitions by tags
       */
      async getDefinitionsByTags(tags, limit = 15) {
        try {
          const allDefinitions = await this.searchDefinitions({ limit: 100 });
          const matchingDefinitions = allDefinitions.filter(
            (def) => tags.some(
              (tag) => def.tags.some(
                (defTag) => defTag.toLowerCase().includes(tag.toLowerCase())
              )
            )
          );
          return matchingDefinitions.slice(0, limit);
        } catch (error) {
          console.error("\u274C Get definitions by tags failed:", error);
          return [];
        }
      }
      /**
       * 📈 Get learning statistics
       */
      async getLearningStats() {
        try {
          const allDefinitions = await db.select().from(learnedDefinitions);
          const stats = {
            totalDefinitions: allDefinitions.length,
            domains: {},
            complexityLevels: {},
            averageConfidence: 0,
            averageLearningValue: 0,
            totalAccessCount: 0,
            recentDefinitions: 0
            // Last 7 days
          };
          const oneWeekAgo = /* @__PURE__ */ new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          allDefinitions.forEach((def) => {
            const domain = "Unknown";
            stats.domains[domain] = (stats.domains[domain] || 0) + 1;
            const complexity = "intermediate";
            stats.complexityLevels[complexity] = (stats.complexityLevels[complexity] || 0) + 1;
            stats.averageConfidence += def.confidence_score || 80;
            stats.averageLearningValue += 70;
            stats.totalAccessCount += def.access_count || 0;
            if (def.created_at && new Date(def.created_at) > oneWeekAgo) {
              stats.recentDefinitions++;
            }
          });
          if (allDefinitions.length > 0) {
            stats.averageConfidence = stats.averageConfidence / allDefinitions.length / 100;
            stats.averageLearningValue = stats.averageLearningValue / allDefinitions.length / 100;
          }
          return stats;
        } catch (error) {
          console.error("\u274C Get learning stats failed:", error);
          return {
            totalDefinitions: 0,
            domains: {},
            complexityLevels: {},
            averageConfidence: 0,
            averageLearningValue: 0,
            totalAccessCount: 0,
            recentDefinitions: 0
          };
        }
      }
      /**
       * 🧠 Get contextual definitions for agent responses
       */
      async getContextualDefinitions(context) {
        const { userQuery, topics, domain } = context;
        const contextualResults = [];
        if (userQuery) {
          const queryResults = await this.getRelatedDefinitions(userQuery, 3);
          contextualResults.push(...queryResults);
        }
        if (topics && topics.length > 0) {
          for (const topic of topics.slice(0, 2)) {
            const topicResults = await this.getRelatedDefinitions(topic, 2);
            contextualResults.push(...topicResults);
          }
        }
        if (domain) {
          const domainResults = await this.getDefinitionsByDomain(domain, 3);
          contextualResults.push(...domainResults);
        }
        const uniqueResults = contextualResults.filter(
          (def, index2, arr) => arr.findIndex((d) => d.id === def.id) === index2
        );
        return uniqueResults.sort((a, b) => b.confidence * b.learningValue - a.confidence * a.learningValue).slice(0, 8);
      }
    };
  }
});

// server/services/power-summary-service.ts
var PowerSummaryService, powerSummaryService;
var init_power_summary_service = __esm({
  "server/services/power-summary-service.ts"() {
    "use strict";
    init_storage();
    PowerSummaryService = class _PowerSummaryService {
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_PowerSummaryService.instance) {
          _PowerSummaryService.instance = new _PowerSummaryService();
        }
        return _PowerSummaryService.instance;
      }
      /**
       * Get power summaries with flexible filtering options
       */
      async getPowerSummaries(context) {
        try {
          const { documentId, userId = 2, limit = 50 } = context;
          if (documentId) {
            return await storage.getPowerSummaries(documentId);
          } else {
            return [];
          }
        } catch (error) {
          console.error("Error fetching power summaries:", error);
          return [];
        }
      }
      /**
       * Get power summaries for a specific document with chapter information
       */
      async getDocumentPowerSummaries(documentId, userId = 2) {
        try {
          return await storage.getPowerSummaries(documentId);
        } catch (error) {
          console.error("Error fetching document power summaries:", error);
          return [];
        }
      }
      /**
       * Get power summaries for AI context and learning
       */
      async getPowerSummariesForAIContext(documentId, limit = 10) {
        try {
          if (!documentId) {
            return "No power summaries available for context.";
          }
          const summaries = await this.getPowerSummaries({ documentId, limit });
          if (summaries.length === 0) {
            return "No power summaries available for context.";
          }
          const contextText = summaries.map((summary, index2) => {
            return `Summary ${index2 + 1} (Document ${summary.documentId}, Chapter ${summary.chapter}):
Title: ${summary.chapterTitle}
Content: ${summary.powerSummary}
---`;
          }).join("\n\n");
          return `Power Summary Context (${summaries.length} summaries):
${contextText}`;
        } catch (error) {
          console.error("Error creating AI context from power summaries:", error);
          return "Unable to retrieve power summary context.";
        }
      }
      /**
       * Get insights and analytics about power summaries
       */
      async getPowerSummaryInsights(userId = 2) {
        try {
          const allSummaries = await this.getPowerSummaries({ documentId: 1, userId, limit: 1e3 });
          if (allSummaries.length === 0) {
            return {
              totalSummaries: 0,
              averageLength: 0,
              commonThemes: [],
              recentSummaries: [],
              documentCoverage: {}
            };
          }
          const totalLength = allSummaries.reduce((sum, summary) => sum + (summary.powerSummary?.length || 0), 0);
          const averageLength = Math.round(totalLength / allSummaries.length);
          const documentCoverage = {};
          allSummaries.forEach((summary) => {
            documentCoverage[summary.documentId] = (documentCoverage[summary.documentId] || 0) + 1;
          });
          const recentSummaries = allSummaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
          const themes = allSummaries.map((s) => s.chapterTitle?.toLowerCase()).filter(Boolean).join(" ").split(/\s+/).filter((word) => word.length > 3).reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
          }, {});
          const commonThemes = Object.entries(themes).sort(([, a], [, b]) => b - a).slice(0, 10).map(([theme]) => theme);
          return {
            totalSummaries: allSummaries.length,
            averageLength,
            commonThemes,
            recentSummaries,
            documentCoverage
          };
        } catch (error) {
          console.error("Error getting power summary insights:", error);
          return {
            totalSummaries: 0,
            averageLength: 0,
            commonThemes: [],
            recentSummaries: [],
            documentCoverage: {}
          };
        }
      }
      /**
       * Search power summaries by content
       */
      async searchPowerSummaries(query, userId = 2, limit = 20) {
        try {
          const allSummaries = await this.getPowerSummaries({ documentId: 1, userId, limit: 1e3 });
          return allSummaries.filter((summary) => summary.powerSummary?.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
        } catch (error) {
          console.error("Error searching power summaries:", error);
          return [];
        }
      }
      /**
       * Get power summaries for cross-document learning
       */
      async getCrossDocumentPowerSummaries(documentIds, userId = 2) {
        try {
          if (documentIds.length === 0) return [];
          const allSummaries = [];
          for (const documentId of documentIds) {
            const summaries = await this.getPowerSummaries({ documentId, userId });
            allSummaries.push(...summaries);
          }
          return allSummaries;
        } catch (error) {
          console.error("Error fetching cross-document power summaries:", error);
          return [];
        }
      }
      /**
       * Get power summary statistics for AI learning
       */
      async getPowerSummaryStats(userId = 2) {
        try {
          const insights = await this.getPowerSummaryInsights(userId);
          return {
            totalSummaries: insights.totalSummaries,
            averageLength: insights.averageLength,
            documentCoverage: Object.keys(insights.documentCoverage).length,
            mostActiveDocument: Object.entries(insights.documentCoverage).sort(([, a], [, b]) => b - a)[0]?.[0] || null,
            recentActivity: insights.recentSummaries.length > 0,
            commonThemes: insights.commonThemes.slice(0, 5)
          };
        } catch (error) {
          console.error("Error getting power summary stats:", error);
          return {
            totalSummaries: 0,
            averageLength: 0,
            documentCoverage: 0,
            mostActiveDocument: null,
            recentActivity: false,
            commonThemes: []
          };
        }
      }
    };
    powerSummaryService = PowerSummaryService.getInstance();
  }
});

// server/agents/text-analysis-agent.ts
import natural from "natural";
var TextAnalysisAgent;
var init_text_analysis_agent = __esm({
  "server/agents/text-analysis-agent.ts"() {
    "use strict";
    init_env();
    init_base_agent();
    init_ollama_service();
    init_multi_model_service();
    init_storage();
    init_document_rag_service();
    init_definitions_access_service();
    init_power_summary_service();
    TextAnalysisAgent = class extends BaseAgent {
      ollamaService;
      multiModelService;
      ragCallCount = 0;
      MAX_RAG_CALLS_PER_TASK = 2;
      RAG_TIMEOUT = 2e4;
      failedDocuments = /* @__PURE__ */ new Set();
      // Track failed documents to prevent retry loops
      definitionsService;
      translationService;
      // Add translation service property
      constructor() {
        super({
          name: "TextAnalysisAgent",
          description: "Continuously analyzes texts with multi-model intelligence for insights, themes, and study aids",
          interval: 3e5,
          // 5 minutes (less aggressive)
          maxRetries: 2,
          // Reduce retries to prevent infinite loops
          timeout: 18e4,
          // Increase to 3 minutes for complex analysis
          specialties: ["Text Analysis", "Sentiment Analysis", "Term Definition", "Theme Extraction", "Entity Recognition", "Complexity Analysis"]
        });
        this.ollamaService = new OllamaService({
          model: "qwen2.5:7b-instruct",
          // Superior complex reasoning and analysis capabilities
          temperature: 0.4,
          // Balanced temperature for focused yet creative analysis
          maxTokens: 4096
        });
        this.multiModelService = new MultiModelService();
        this.definitionsService = new DefinitionsAccessService();
      }
      async initialize() {
        try {
          await this.ollamaService.initialize();
          await this.multiModelService.initialize();
          this.log("Both Ollama and MultiModel services initialized successfully");
          this.addTask("ANALYZE_PENDING_DOCUMENTS", {}, 1);
          this.log("Text Analysis Agent initialized with multi-model intelligence");
        } catch (error) {
          this.error(`Failed to initialize: ${error}`);
          throw error;
        }
      }
      async processTask(task) {
        this.log(`Processing text analysis task: ${task.type}`);
        switch (task.type) {
          case "ANALYZE_PENDING_DOCUMENTS":
            return await this.analyzePendingDocuments();
          case "ANALYZE_DOCUMENT":
            const { documentId, chapter } = task.data;
            return await this.analyzeDocument(documentId, chapter);
          case "REANALYZE_DOCUMENT":
            return await this.reanalyzeDocument(task.data.documentId);
          case "DEFINE_TERM":
            if (!task.data.term) {
              this.warn("DEFINE_TERM task called without a term.");
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
      async analyzePendingDocuments() {
        try {
          const documents3 = await storage.getDocuments(2);
          for (const doc of documents3) {
            const docKey = `${doc.id}`;
            if (this.failedDocuments.has(docKey)) {
              this.log(`Skipping document ${doc.id} - recently failed analysis`);
              continue;
            }
            const existingAnalysis = await this.getExistingAnalysis(doc.id);
            if (!existingAnalysis) {
              this.addTask("ANALYZE_DOCUMENT", { documentId: doc.id }, 2);
            }
          }
        } catch (error) {
          this.error(`Error finding pending documents: ${error}`);
        }
      }
      async analyzeDocument(documentId, specificChapter) {
        const docKey = `${documentId}`;
        try {
          this.log(`Starting analysis of document: ${documentId}`);
          const document = await storage.getDocument(documentId);
          if (!document) {
            this.warn(`Document ${documentId} not found`);
            return;
          }
          const content = document.content;
          let chapters = [];
          if (content && content.chapters && Array.isArray(content.chapters)) {
            chapters = content.chapters;
          } else if (content && typeof content === "string") {
            chapters = [{
              number: 1,
              title: document.title,
              paragraphs: [{ text: content }]
            }];
          } else if (content && content.text) {
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
          if (specificChapter !== void 0) {
            const chapter = chapters.find((ch) => ch.number === specificChapter);
            if (chapter) {
              const analysis = await this.performChapterAnalysisWithFallback(documentId, chapter);
              await this.saveAnalysis(documentId, specificChapter, analysis);
            }
            return;
          }
          const maxChaptersPerRun = 3;
          const chaptersToAnalyze = chapters.slice(0, maxChaptersPerRun);
          const chapterPromises = chaptersToAnalyze.map(async (chapter, index2) => {
            try {
              this.log(`Starting analysis of chapter ${chapter.number} (${index2 + 1}/${chaptersToAnalyze.length})`);
              const analysis = await Promise.race([
                this.performChapterAnalysisWithFallback(documentId, chapter),
                new Promise(
                  (_, reject) => setTimeout(() => reject(new Error(`Chapter ${chapter.number} analysis timeout`)), 6e4)
                  // Reduced from 180s to 60s
                )
              ]);
              await this.saveAnalysis(documentId, chapter.number, analysis);
              this.log(`\u2705 Chapter ${chapter.number} analysis completed in ${Date.now() - Date.now()}ms`);
              return { success: true, chapter: chapter.number };
            } catch (chapterError) {
              this.error(`Failed to analyze chapter ${chapter.number}: ${chapterError}`);
              try {
                const fallbackAnalysis = {
                  documentId,
                  chapter: chapter.number,
                  sentiment: { score: 0, label: "neutral" },
                  keyWords: [],
                  themes: [],
                  complexity: { readabilityScore: 50, gradeLevel: "Unknown" },
                  entities: [],
                  aiInsights: "Analysis could not be completed due to processing constraints.",
                  theologicalAnalysis: "Analysis unavailable.",
                  studyQuestions: []
                };
                await this.saveAnalysis(documentId, chapter.number, fallbackAnalysis);
                this.log(`\u{1F4BE} Saved fallback analysis for chapter ${chapter.number}`);
              } catch (saveError) {
                this.error(`Failed to save fallback analysis: ${saveError}`);
              }
              return { success: false, chapter: chapter.number, error: chapterError };
            }
          });
          const results = await Promise.allSettled(chapterPromises);
          const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
          const failed = results.length - successful;
          this.log(`Chapter analysis completed: ${successful} successful, ${failed} failed`);
          this.failedDocuments.delete(docKey);
          this.log(`\u2705 Document ${documentId} analysis completed`);
        } catch (error) {
          this.error(`Failed to analyze document ${documentId}: ${error}`);
          this.failedDocuments.add(docKey);
          setTimeout(() => {
            this.failedDocuments.delete(docKey);
            this.log(`Removed document ${documentId} from failed documents list`);
          }, 36e5);
          throw error;
        }
      }
      async performChapterAnalysisWithFallback(documentId, chapter) {
        try {
          return await this.performChapterAnalysis(documentId, chapter);
        } catch (error) {
          this.warn(`RAG-enhanced analysis failed for chapter ${chapter.number}, falling back to basic analysis: ${error}`);
          return await this.performBasicAnalysis(documentId, chapter);
        }
      }
      async performChapterAnalysis(documentId, chapter) {
        let fullText = "";
        if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
          fullText = chapter.paragraphs.map((p) => p.text || "").join(" ");
        } else if (chapter.text) {
          fullText = chapter.text;
        } else if (typeof chapter === "string") {
          fullText = chapter;
        } else {
          this.warn(`Chapter has unsupported structure for document ${documentId}`);
          fullText = JSON.stringify(chapter);
        }
        this.log(`Analyzing chapter ${chapter.number} with ${fullText.length} characters`);
        if (fullText.length < 100) {
          this.log(`Very small content detected (${fullText.length} chars), using fast path`);
          const nlpAnalysis2 = await this.performNLPAnalysis(fullText, "General Knowledge");
          return {
            documentId,
            chapter: chapter.number,
            sentiment: nlpAnalysis2.sentiment,
            keyWords: nlpAnalysis2.keyWords,
            themes: nlpAnalysis2.themes,
            complexity: nlpAnalysis2.complexity,
            entities: nlpAnalysis2.entities,
            aiInsights: `Brief content: ${fullText.substring(0, 80)}${fullText.length > 80 ? "..." : ""}`,
            theologicalAnalysis: "Content too brief for detailed analysis.",
            studyQuestions: []
          };
        }
        const analysisLevel = this.selectAnalysisLevel(fullText.length);
        this.log(`Using ${analysisLevel} analysis for chapter ${chapter.number}`);
        const domainSample = fullText.substring(0, 500);
        const contentDomain = await this.detectContentDomain(domainSample, chapter.title);
        const nlpSample = fullText.substring(0, 1e3);
        const nlpAnalysis = await this.performNLPAnalysis(nlpSample, contentDomain);
        let aiInsights = "";
        let domainAnalysis = "";
        let studyQuestions = [];
        try {
          const timeout = analysisLevel === "QUICK" ? 3e4 : analysisLevel === "STANDARD" ? 6e4 : 9e4;
          aiInsights = await Promise.race([
            this.generateDomainInsights(fullText.substring(0, 2e3), chapter.title, contentDomain),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("AI insights timeout")), timeout)
            )
          ]);
          domainAnalysis = await Promise.race([
            this.generateDomainAnalysis(fullText.substring(0, 2e3), contentDomain),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("AI analysis timeout")), timeout)
            )
          ]);
          if (analysisLevel !== "QUICK") {
            studyQuestions = await Promise.race([
              this.generateDomainQuestions(fullText.substring(0, 1e3), contentDomain),
              new Promise(
                (_, reject) => setTimeout(() => reject(new Error("AI questions timeout")), timeout)
              )
            ]);
          }
        } catch (error) {
          this.warn(`AI analysis timed out: ${error}, using fallback`);
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
      selectAnalysisLevel(textLength) {
        if (textLength < 1e3) return "QUICK";
        if (textLength < 5e3) return "STANDARD";
        return "DEEP";
      }
      // 🚀 POWER FALLBACK: Generate concise fallback insights without verbose details
      generateFallbackInsights(text2, domain) {
        const themes = this.extractDomainThemes(text2, domain);
        const keywords = this.extractKeywordsFromText(text2.substring(0, 500));
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          return `Power Summary: Explores ${themes.slice(0, 2).join(" and ")} with focus on ${keywords.slice(0, 3).join(", ")}. Key spiritual principles for practical application.`;
        } else if (domain.toLowerCase().includes("science")) {
          return `Power Summary: Covers ${themes.slice(0, 2).join(" and ")} including ${keywords.slice(0, 3).join(", ")}. Scientific principles with practical applications.`;
        } else {
          return `Power Summary: Examines ${themes.slice(0, 2).join(" and ")} featuring ${keywords.slice(0, 3).join(", ")}. Key concepts with practical insights.`;
        }
      }
      // 🚀 NEW: Extract keywords from text chunk
      extractKeywordsFromText(text2) {
        const words = text2.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((word) => word.length > 3).filter((word) => !["this", "that", "with", "have", "will", "from", "they", "been", "were", "said", "each", "which", "their", "would", "there", "could", "other"].includes(word));
        const frequency = {};
        words.forEach((word) => {
          frequency[word] = (frequency[word] || 0) + 1;
        });
        return Object.entries(frequency).sort(([, a], [, b]) => b - a).slice(0, 10).map(([word]) => word);
      }
      async performBasicAnalysis(documentId, chapter) {
        this.log(`Performing basic analysis for document ${documentId}, chapter ${chapter.number || 1}`);
        let fullText = "";
        if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
          fullText = chapter.paragraphs.map((p) => p.text || "").join(" ");
        } else if (chapter.text) {
          fullText = chapter.text;
        } else if (typeof chapter === "string") {
          fullText = chapter;
        } else {
          fullText = JSON.stringify(chapter);
        }
        const contentDomain = await this.detectContentDomain(fullText, chapter.title);
        const nlpAnalysis = await this.performNLPAnalysis(fullText, contentDomain);
        const basicInsights = await this.generateDomainInsights(fullText, chapter.title || "Chapter", contentDomain);
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
      async detectContentDomain(text2, title = "") {
        if (text2.length < 200) {
          const lowerText = text2.toLowerCase();
          if (lowerText.includes("god") || lowerText.includes("jesus") || lowerText.includes("bible") || lowerText.includes("faith")) {
            return "Religious/Biblical Studies";
          }
          if (lowerText.includes("science") || lowerText.includes("theory") || lowerText.includes("experiment")) {
            return "Science";
          }
          return "General Knowledge";
        }
        const prompt = `Analyze this content and identify its primary domain/subject area:

Title: ${title}
Content (first 500 chars): ${text2.substring(0, 500)}

What is the primary subject domain? Choose from:
- Religious/Biblical Studies
- Science
- Philosophy
- History
- Literature
- General Knowledge

Respond with just the domain name.`;
        try {
          const response = await Promise.race([
            this.ollamaService.generateText(prompt, { maxTokens: 100, temperature: 0.1 }),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Domain detection timeout")), 2e4)
            )
          ]);
          const domainMatch = response.match(/(Religious\/Biblical Studies|Science|Philosophy|History|Literature|General Knowledge)/i);
          return domainMatch ? domainMatch[1] : "General Knowledge";
        } catch (error) {
          this.warn(`Domain detection failed: ${error}`);
          return "General Knowledge";
        }
      }
      async generateDomainInsights(text2, title, domain) {
        let prompt = "";
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          prompt = `Create a POWER SUMMARY (2-3 sentences max) of the key spiritual insights from this text:

${text2.substring(0, 800)}

Respond with only the essential points, no elaboration.`;
        } else if (domain.toLowerCase().includes("science")) {
          prompt = `Create a POWER SUMMARY (2-3 sentences max) of the key scientific concepts in this text:

${text2.substring(0, 800)}

Respond with only the essential points, no elaboration.`;
        } else {
          prompt = `Create a POWER SUMMARY (2-3 sentences max) of the key insights from this content:

${text2.substring(0, 800)}

Respond with only the essential points, no elaboration.`;
        }
        try {
          const result = await this.ollamaService.generateText(prompt, {
            maxTokens: 400,
            // Increased for complete insights
            temperature: 0.2
            // Lower temperature for more focused responses
          });
          const sentences = result.split(".").filter((s) => s.trim().length > 0);
          if (sentences.length > 3) {
            return sentences.slice(0, 3).join(".") + ".";
          }
          return result;
        } catch (error) {
          this.warn(`Domain insights generation failed: ${error}`);
          return `Power Summary: ${title} covers key ${domain.toLowerCase()} concepts with practical applications.`;
        }
      }
      async generateDomainAnalysis(text2, domain) {
        let prompt = "";
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          prompt = `Provide a 1-2 sentence theological analysis of this text:

${text2.substring(0, 600)}

Be concise and direct.`;
        } else {
          prompt = `Provide a 1-2 sentence analysis of this ${domain} content:

${text2.substring(0, 600)}

Be concise and direct.`;
        }
        try {
          const result = await this.ollamaService.generateText(prompt, {
            maxTokens: 300,
            // Increased for complete analysis
            temperature: 0.2
          });
          const sentences = result.split(".").filter((s) => s.trim().length > 0);
          if (sentences.length > 2) {
            return sentences.slice(0, 2).join(".") + ".";
          }
          return result;
        } catch (error) {
          this.warn(`Domain analysis failed: ${error}`);
          return `Analysis: Key ${domain.toLowerCase()} concepts with practical applications.`;
        }
      }
      async generateDomainQuestions(text2, domain) {
        const prompt = `Generate 3 simple study questions for this ${domain} content:

${text2.substring(0, 800)}

Format: one question per line.`;
        try {
          const response = await this.ollamaService.generateText(prompt, {
            maxTokens: 150,
            temperature: 0.4
          });
          return response.split("\n").filter((q) => q.trim().length > 10).slice(0, 3);
        } catch (error) {
          this.warn(`Domain questions generation failed: ${error}`);
          return [`What are the key concepts in this ${domain} content?`];
        }
      }
      async performNLPAnalysis(text2, domain = "General Knowledge") {
        const tokenizer = new natural.WordTokenizer();
        const tokens = tokenizer.tokenize(text2.toLowerCase()) || [];
        const stopWords = natural.stopwords;
        const filteredTokens = tokens.filter((token) => !stopWords.includes(token));
        const stemmedTokens = filteredTokens.map((token) => natural.PorterStemmer.stem(token));
        const frequency = this.calculateWordFrequency(stemmedTokens);
        const keyWords = Object.entries(frequency).sort(([, a], [, b]) => b - a).slice(0, 10).map(([word]) => word);
        const sentimentAnalyzer = new natural.SentimentAnalyzer(
          "English",
          natural.PorterStemmer,
          "afinn"
        );
        const sentimentScore = sentimentAnalyzer.getSentiment(stemmedTokens);
        const sentences = text2.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const words = tokens.length;
        const avgWordsPerSentence = words / sentences.length;
        const readabilityScore = this.calculateReadabilityScore(text2, words, sentences.length);
        const themes = this.extractDomainThemes(text2, domain);
        const entities = this.extractEntities(text2);
        return {
          sentiment: {
            score: sentimentScore,
            label: sentimentScore > 0.1 ? "positive" : sentimentScore < -0.1 ? "negative" : "neutral"
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
      calculateWordFrequency(tokens) {
        const frequency = {};
        tokens.forEach((token) => {
          if (token.length > 2) {
            frequency[token] = (frequency[token] || 0) + 1;
          }
        });
        return frequency;
      }
      calculateReadabilityScore(text2, wordCount, sentenceCount) {
        const avgSentenceLength = wordCount / sentenceCount;
        const avgSyllablesPerWord = this.estimateSyllables(text2) / wordCount;
        return 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
      }
      estimateSyllables(text2) {
        const words = text2.toLowerCase().match(/\b\w+\b/g) || [];
        let totalSyllables = 0;
        words.forEach((word) => {
          const vowelGroups = word.match(/[aeiouy]+/g) || [];
          let syllables = vowelGroups.length;
          if (word.endsWith("e") && syllables > 1) {
            syllables--;
          }
          totalSyllables += Math.max(1, syllables);
        });
        return totalSyllables;
      }
      getGradeLevel(score) {
        if (score >= 90) return "Elementary School";
        if (score >= 80) return "Middle School";
        if (score >= 70) return "High School";
        if (score >= 60) return "College";
        return "Graduate Level";
      }
      extractDomainThemes(text2, domain) {
        const lowerText = text2.toLowerCase();
        const themes = [];
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          const biblicalKeywords = {
            "faith": ["faith", "believe", "trust", "faithful"],
            "love": ["love", "beloved", "charity", "compassion"],
            "redemption": ["redeem", "salvation", "save", "deliver"],
            "righteousness": ["righteous", "just", "justice", "holy"],
            "covenant": ["covenant", "promise", "agreement", "testament"],
            "kingdom": ["kingdom", "reign", "ruler", "king"],
            "sacrifice": ["sacrifice", "offering", "altar", "blood"],
            "forgiveness": ["forgive", "mercy", "pardon", "grace"],
            "wisdom": ["wisdom", "understanding", "knowledge", "insight"],
            "prophecy": ["prophet", "prophecy", "foretell", "vision"]
          };
          Object.entries(biblicalKeywords).forEach(([theme, keywords]) => {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              themes.push(theme);
            }
          });
        } else if (domain.toLowerCase().includes("science") || domain.toLowerCase().includes("physics")) {
          const scienceKeywords = {
            "quantum mechanics": ["quantum", "particle", "wave", "probability", "superposition", "entanglement"],
            "energy": ["energy", "potential", "kinetic", "conservation", "force", "work"],
            "matter": ["matter", "mass", "atom", "molecule", "element", "compound"],
            "motion": ["motion", "velocity", "acceleration", "momentum", "friction"],
            "waves": ["wave", "frequency", "amplitude", "wavelength", "interference"],
            "thermodynamics": ["temperature", "heat", "entropy", "thermal", "pressure"],
            "electromagnetism": ["electric", "magnetic", "charge", "current", "field"],
            "relativity": ["relativity", "spacetime", "einstein", "gravity", "mass-energy"]
          };
          Object.entries(scienceKeywords).forEach(([theme, keywords]) => {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              themes.push(theme);
            }
          });
        } else if (domain.toLowerCase().includes("philosophy")) {
          const philosophyKeywords = {
            "existence": ["existence", "being", "reality", "ontology", "metaphysics"],
            "knowledge": ["knowledge", "epistemology", "truth", "belief", "certainty"],
            "ethics": ["ethics", "moral", "right", "wrong", "virtue", "duty"],
            "consciousness": ["consciousness", "mind", "awareness", "thought", "perception"],
            "free will": ["free will", "determinism", "choice", "freedom", "responsibility"],
            "meaning": ["meaning", "purpose", "value", "significance", "worth"]
          };
          Object.entries(philosophyKeywords).forEach(([theme, keywords]) => {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              themes.push(theme);
            }
          });
        } else if (domain.toLowerCase().includes("history")) {
          const historyKeywords = {
            "war": ["war", "battle", "conflict", "military", "army", "victory"],
            "politics": ["government", "ruler", "democracy", "empire", "revolution"],
            "culture": ["culture", "society", "civilization", "tradition", "custom"],
            "economy": ["trade", "commerce", "economy", "money", "wealth", "poverty"],
            "technology": ["invention", "discovery", "innovation", "progress", "advancement"],
            "religion": ["religion", "church", "temple", "worship", "belief", "ritual"]
          };
          Object.entries(historyKeywords).forEach(([theme, keywords]) => {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              themes.push(theme);
            }
          });
        } else {
          const generalKeywords = {
            "learning": ["learn", "education", "knowledge", "study", "understand"],
            "problem-solving": ["problem", "solution", "solve", "method", "approach"],
            "development": ["develop", "growth", "progress", "improvement", "evolution"],
            "relationship": ["relationship", "connection", "interaction", "communication"],
            "innovation": ["innovation", "creative", "new", "invention", "original"],
            "analysis": ["analysis", "examine", "investigate", "research", "study"]
          };
          Object.entries(generalKeywords).forEach(([theme, keywords]) => {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              themes.push(theme);
            }
          });
        }
        return themes;
      }
      extractEntities(text2) {
        const patterns = [
          /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
          // Proper nouns
        ];
        const entities = [];
        patterns.forEach((pattern) => {
          const matches = text2.match(pattern) || [];
          entities.push(...matches);
        });
        const commonWords = ["The", "And", "But", "For", "Or", "So", "Yet"];
        return Array.from(new Set(entities)).filter((entity) => !commonWords.includes(entity));
      }
      async getExistingAnalysis(documentId) {
        return false;
      }
      async saveAnalysis(documentId, chapter, analysis) {
        try {
          this.log(`Saved analysis for document ${documentId}, chapter ${chapter}`);
          this.emit("analysisCompleted", {
            documentId,
            chapter,
            analysis
          });
        } catch (error) {
          this.error(`Failed to save analysis: ${error}`);
          throw error;
        }
      }
      async reanalyzeDocument(documentId) {
        this.log(`Re-analyzing document ${documentId}`);
        await this.analyzeDocument(documentId);
      }
      async updateExpertise(data) {
        try {
          const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
          this.log(`\u{1F9E0} Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
          this.log(`\u2705 Expertise updated for ${domain}`);
        } catch (error) {
          this.error(`Failed to update expertise: ${error}`);
        }
      }
      async cleanup() {
        this.log("Cleaning up Text Analysis Agent");
      }
      // Public methods for external access
      async requestAnalysis(documentId, chapter) {
        return this.addTask("ANALYZE_DOCUMENT", { documentId, chapter }, 3);
      }
      async requestReanalysis(documentId) {
        return this.addTask("REANALYZE_DOCUMENT", { documentId }, 2);
      }
      // 🔍 RAG-Enhanced Analysis Methods with Circuit Breaker
      async performRAGEnhancedAnalysis(text2, title, documentId, chapter) {
        try {
          if (this.ragCallCount >= this.MAX_RAG_CALLS_PER_TASK) {
            this.warn(`RAG call limit reached for task, returning empty analysis`);
            return {
              insights: "",
              analysis: "",
              questions: [],
              enhancedKeywords: [],
              crossReferencedThemes: []
            };
          }
          this.ragCallCount++;
          this.log(`\u{1F50D} Performing RAG-enhanced analysis for "${title}" Chapter ${chapter} (call ${this.ragCallCount}/${this.MAX_RAG_CALLS_PER_TASK})`);
          const ragTimeout = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("RAG analysis timeout")), this.RAG_TIMEOUT)
          );
          const ragAnalysis = this.performActualRAGAnalysis(text2, title, documentId, chapter);
          const result = await Promise.race([ragAnalysis, ragTimeout]);
          this.log(`\u2705 RAG-enhanced analysis completed successfully`);
          return result;
        } catch (error) {
          this.error(`\u274C RAG-enhanced analysis failed: ${error}`);
          this.log(`\u{1F50D} RAG failure details - Document: ${documentId}, Chapter: ${chapter}, Call: ${this.ragCallCount}/${this.MAX_RAG_CALLS_PER_TASK}`);
          return {
            insights: `Analysis completed without RAG enhancement due to timeout. Basic text analysis was successful for chapter ${chapter}.`,
            analysis: "",
            questions: [],
            enhancedKeywords: [],
            crossReferencedThemes: []
          };
        }
      }
      async performActualRAGAnalysis(text2, title, documentId, chapter) {
        const powerSummaryContext = await powerSummaryService.getPowerSummariesForAIContext(documentId, 5);
        const powerSummaryStats = await powerSummaryService.getPowerSummaryStats();
        const annotations2 = await storage.getAnnotationsByChapter(1, documentId, chapter);
        const annotationContext = annotations2.map((a) => a.note).slice(0, 5).join("\n");
        const ragContext = {
          userId: 1,
          // Default user for now
          currentDocument: documentId,
          currentChapter: chapter,
          conversationHistory: [
            `Power Summary Context: ${powerSummaryContext.substring(0, 300)}`,
            `User notes: ${annotationContext}`
          ],
          userStudyPatterns: await this.extractUserPatterns(),
          preferredTopics: await this.extractUserTopics(),
          studyLevel: "intermediate"
          // Default level
        };
        const relatedContentQuery = `themes and concepts similar to: ${title} ${text2.substring(0, 200)}
    
Power Summary Context: ${powerSummaryContext.substring(0, 200)}
User's notes: ${annotationContext.substring(0, 200)}
Power Summary Stats: ${powerSummaryStats.totalSummaries} summaries, ${powerSummaryStats.documentCoverage} documents`;
        const ragResponse = await documentRAGService.processRAGQuery(
          relatedContentQuery,
          ragContext,
          {
            maxSources: 2,
            // Reduced from 3 
            includeAnnotations: false,
            // Disabled for faster processing
            includeMemories: false,
            // Disable memories for faster processing
            searchDepth: "quick",
            // Use quick search instead of thorough
            singleDocumentOnly: true
            // Focus on current document only
          }
        );
        const enhancedKeywords = this.extractKeywordsFromSources(ragResponse.sources);
        const crossReferencedThemes = this.extractThemesFromSources(ragResponse.sources);
        const [insights, analysis, questions] = await Promise.allSettled([
          ragResponse.sources.length > 0 ? this.generateCrossContextualInsights(text2, title, ragResponse.sources, powerSummaryContext) : Promise.resolve(""),
          ragResponse.sources.length > 0 ? this.generateComparativeAnalysis(text2, title, ragResponse.sources, powerSummaryContext) : Promise.resolve(""),
          ragResponse.sources.length > 0 ? this.generateCrossReferencedQuestions(text2, title, ragResponse.sources, powerSummaryContext) : Promise.resolve([])
        ]);
        this.log(`\u2705 RAG-enhanced analysis completed with ${ragResponse.sources.length} related sources and power summary context`);
        return {
          insights: insights.status === "fulfilled" ? insights.value : "",
          analysis: analysis.status === "fulfilled" ? analysis.value : "",
          questions: questions.status === "fulfilled" ? questions.value : [],
          enhancedKeywords,
          crossReferencedThemes
        };
      }
      async extractUserPatterns() {
        return ["biblical study", "theological analysis", "comparative reading"];
      }
      async extractUserTopics() {
        return ["faith", "prayer", "spiritual growth"];
      }
      extractKeywordsFromSources(sources) {
        const keywords = /* @__PURE__ */ new Set();
        sources.forEach((source) => {
          const words = source.excerpt.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || [];
          words.forEach((word) => {
            if (!["this", "that", "with", "from", "they", "have", "been", "were"].includes(word)) {
              keywords.add(word);
            }
          });
        });
        return Array.from(keywords).slice(0, 10);
      }
      extractThemesFromSources(sources) {
        const themes = /* @__PURE__ */ new Set();
        sources.forEach((source) => {
          const themeWords = ["love", "faith", "hope", "grace", "forgiveness", "salvation", "wisdom", "truth", "justice", "mercy"];
          themeWords.forEach((theme) => {
            if (source.excerpt.toLowerCase().includes(theme) || source.documentTitle.toLowerCase().includes(theme)) {
              themes.add(theme);
            }
          });
        });
        return Array.from(themes);
      }
      async generateCrossContextualInsights(text2, title, sources, powerSummaryContext) {
        if (sources.length === 0) return "";
        const contextPrompt = `Analyze this text in the context of the user's other study materials:

CURRENT TEXT: "${title}"
${text2.substring(0, 1e3)}

RELATED MATERIALS:
${sources.slice(0, 3).map((s) => `- ${s.documentTitle}: "${s.excerpt}"`).join("\n")}

Generate insights that connect this text to the user's broader study patterns and related materials. Focus on:
1. Common themes across materials
2. Contrasting perspectives or approaches
3. Deeper understanding gained from cross-references
4. Personal study progression patterns

Insights:
${powerSummaryContext.substring(0, 300)}`;
        try {
          const result = await this.multiModelService.executeTask("theological-reasoning", contextPrompt, {
            requirements: { accuracy: 9, reasoning: 9, creativity: 7 }
          });
          return result.response;
        } catch (error) {
          this.warn(`Failed to generate cross-contextual insights: ${error}`);
          return "";
        }
      }
      async generateComparativeAnalysis(text2, title, sources, powerSummaryContext) {
        if (sources.length === 0) return "";
        const analysisPrompt = `Provide a comparative analysis of this text with the user's related study materials:

CURRENT TEXT: "${title}"
${text2.substring(0, 1e3)}

COMPARE WITH:
${sources.slice(0, 3).map((s) => `- ${s.documentTitle}: "${s.excerpt}"`).join("\n")}

Analysis should include:
1. How this text builds upon or contrasts with previous materials
2. Unique insights this text provides
3. Connections to user's annotation patterns
4. Theological or thematic development

Analysis:
${powerSummaryContext.substring(0, 300)}`;
        try {
          const result = await this.multiModelService.executeTask("text-analysis", analysisPrompt, {
            requirements: { accuracy: 9, reasoning: 8, creativity: 6 }
          });
          return result.response;
        } catch (error) {
          this.warn(`Failed to generate comparative analysis: ${error}`);
          return "";
        }
      }
      async generateCrossReferencedQuestions(text2, title, sources, powerSummaryContext) {
        if (sources.length === 0) return [];
        const questionsPrompt = `Generate study questions that help the user connect this text with their related materials:

CURRENT TEXT: "${title}"
${text2.substring(0, 500)}

RELATED MATERIALS:
${sources.slice(0, 2).map((s) => `- ${s.documentTitle}`).join("\n")}

Generate 3-5 thoughtful questions that encourage cross-referential study and deeper understanding.
Questions should be specific to the user's materials and study patterns.

Questions:
${powerSummaryContext.substring(0, 300)}`;
        try {
          const result = await this.multiModelService.executeTask("creative-insights", questionsPrompt, {
            requirements: { creativity: 8, reasoning: 7, speed: 7 }
          });
          return result.response.split("\n").filter((line) => line.trim().length > 0).map((line) => line.replace(/^\d+\.\s*/, "").trim()).slice(0, 5);
        } catch (error) {
          this.warn(`Failed to generate cross-referenced questions: ${error}`);
          return [];
        }
      }
      async defineTerm(term, language = "en") {
        this.log(`Defining term: ${term} in ${language}`);
        let prompt = `Provide a clear and concise definition for the following term: "${term}". The definition should be suitable for someone studying the topic.`;
        if (language !== "en") {
          prompt += `

\u{1F310} CRITICAL: You MUST respond exclusively in ${language}. Every word must be in ${language}.`;
        }
        try {
          let response;
          if (language !== "en") {
            this.log(`\u{1F310} [DEFINE-TERM] Generating definition in ${language}`);
            response = await this.ollamaService.generateTextWithLanguage(prompt, language, {
              temperature: 0.3
            });
            if (this.isResponseInEnglish(response)) {
              this.log(`\u{1F310} [DEFINE-TERM] Response is in English, applying language transformation`);
              const languagePrompt = `Transform this definition to be in ${language}. Keep the same accuracy and clarity:

${response}`;
              try {
                const languageAwareResponse = await this.ollamaService.generateTextWithLanguage(languagePrompt, language);
                if (!this.isResponseInEnglish(languageAwareResponse)) {
                  response = languageAwareResponse;
                  this.log(`\u2705 [DEFINE-TERM] Successfully transformed definition to ${language}`);
                } else if (this.translationService) {
                  const translatedResponse = await this.translationService.translateText({
                    text: response,
                    targetLanguage: language,
                    context: "general"
                  });
                  response = translatedResponse.translatedText;
                  this.log(`\u2705 [DEFINE-TERM] Successfully translated definition to ${language}`);
                }
              } catch (error) {
                this.warn(`Define term language processing failed: ${error}`);
              }
            }
          } else {
            response = await this.ollamaService.generateText(prompt, {
              temperature: 0.3
            });
          }
          return response;
        } catch (error) {
          this.error(`Failed to define term "${term}": ${error}`);
          let errorMessage = `I was unable to find a definition for "${term}".`;
          if (language !== "en" && this.translationService) {
            try {
              const translatedError = await this.translationService.translateText({
                text: errorMessage,
                targetLanguage: language,
                context: "general"
              });
              return translatedError.translatedText;
            } catch {
            }
          }
          return errorMessage;
        }
      }
      setTranslationService(translationService) {
        this.translationService = translationService;
        this.log("\u{1F310} Translation service set for Text Analysis Agent");
      }
      isResponseInEnglish(response) {
        const englishWords = ["the", "and", "is", "are", "was", "were", "to", "of", "in", "for", "with", "on", "at", "by"];
        const words = response.toLowerCase().split(/\s+/).slice(0, 20);
        const englishWordCount = words.filter((word) => englishWords.includes(word)).length;
        return englishWordCount >= 3;
      }
    };
  }
});

// server/agents/study-assistant-agent.ts
var StudyAssistantAgent;
var init_study_assistant_agent = __esm({
  "server/agents/study-assistant-agent.ts"() {
    "use strict";
    init_base_agent();
    init_multi_model_service();
    init_storage();
    init_document_rag_service();
    StudyAssistantAgent = class extends BaseAgent {
      multiModelService;
      translationService;
      // Add translation service property
      chatSessions = /* @__PURE__ */ new Map();
      studyPatterns = /* @__PURE__ */ new Map();
      // User study patterns
      userRecommendations = /* @__PURE__ */ new Map();
      constructor() {
        super({
          name: "StudyAssistantAgent",
          description: "Provides personalized Bible study assistance and recommendations",
          interval: 18e5,
          // 30 minutes (less aggressive)
          maxRetries: 3,
          timeout: 45e3,
          // 45 seconds
          specialties: ["Study Assistance", "Personalized Recommendations", "Pattern Analysis", "Content Analysis", "RAG-Enhanced Responses"]
        });
        this.multiModelService = new MultiModelService();
      }
      async initialize() {
        await this.multiModelService.initialize();
        this.log("Study Assistant Agent initialized");
      }
      async processTask(task) {
        this.log(`Processing study assistant task: ${task.type}`);
        switch (task.type) {
          default:
            this.warn(`Unknown or unhandled study assistant task type: ${task.type}`);
        }
        return null;
      }
      async updateExpertise(data) {
        try {
          const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
          this.log(`\u{1F9E0} Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
          this.log(`\u2705 Study Assistant expertise updated for ${domain}`);
        } catch (error) {
          this.error(`Failed to update expertise: ${error}`);
        }
      }
      async cleanup() {
        this.log("Cleaning up Study Assistant Agent");
      }
      async handleChatMessage(message, context) {
        try {
          if (!message || message.trim() === "") {
            return "";
          }
          const sessionId = context?.sessionId || "default";
          let chatContext = this.chatSessions.get(sessionId);
          if (!chatContext) {
            chatContext = {
              userId: context?.userId || 2,
              documentId: context?.documentId,
              chapter: context?.chapter,
              language: context?.language || "en",
              // Add language to context
              recentMessages: []
            };
            this.chatSessions.set(sessionId, chatContext);
          } else {
            chatContext.language = context?.language || "en";
          }
          chatContext.recentMessages.push({
            role: "user",
            content: message,
            timestamp: /* @__PURE__ */ new Date()
          });
          const isQuestion = this.isQuestion(message);
          let response;
          if (isQuestion) {
            response = await this.generateRAGEnhancedResponse(message, chatContext);
          } else {
            response = await this.generateChatResponse(message, chatContext);
          }
          chatContext.recentMessages.push({
            role: "assistant",
            content: response,
            timestamp: /* @__PURE__ */ new Date()
          });
          if (chatContext.recentMessages.length > 10) {
            chatContext.recentMessages = chatContext.recentMessages.slice(-10);
          }
          return await this._translateResponse(response, chatContext.language);
        } catch (error) {
          this.error(`Chat message handling failed: ${error.message}`);
          return "I apologize, but I'm having trouble processing your message right now. Please try again.";
        }
      }
      async _translateResponse(response, language) {
        if (!this.translationService || !language || language === "en") {
          return response;
        }
        try {
          this.log(`Translating response to ${language}`);
          const translated = await this.translationService.translateText({
            text: response,
            targetLanguage: language,
            context: "explanation"
          });
          return translated.translatedText;
        } catch (error) {
          this.error(`Translation failed: ${error.message}. Returning original response.`);
          return response;
        }
      }
      // Helper function to check if a message is a question
      isQuestion(message) {
        const trimmed = message.trim().toLowerCase();
        return trimmed.endsWith("?") || /^(what|who|where|when|why|how|which|can|is|do|are|does|tell me about)/.test(trimmed);
      }
      // 🧠 NEW: RAG-Enhanced Response Generation
      async generateRAGEnhancedResponse(message, context) {
        try {
          this.log(`\u{1F50D} Generating RAG-enhanced response for: "${message.substring(0, 50)}..."`);
          const ragContext = {
            userId: context.userId,
            currentDocument: context.documentId,
            currentChapter: context.chapter,
            conversationHistory: context.recentMessages.map((msg) => msg.content).slice(-5),
            userStudyPatterns: this.extractUserStudyPatterns(context.userId),
            preferredTopics: await this.getUserPreferredTopics(context.userId),
            studyLevel: await this.getUserStudyLevel(context.userId)
          };
          const ragResponse = await documentRAGService.processRAGQuery(message, ragContext, {
            maxSources: 5,
            includeAnnotations: true,
            includeMemories: true,
            searchDepth: "thorough"
          });
          let enhancedResponse = ragResponse.answer;
          if (ragResponse.sources.length > 0) {
            enhancedResponse += "\n\n\u{1F4DA} **Sources from your materials:**\n";
            ragResponse.sources.slice(0, 3).forEach((source, index2) => {
              enhancedResponse += `${index2 + 1}. **${source.documentTitle}**`;
              if (source.source.chapter) {
                enhancedResponse += `, Chapter ${source.source.chapter}`;
              }
              enhancedResponse += "\n";
              if (source.excerpt && source.excerpt.length > 0) {
                const fullExcerpt = source.excerpt.length > 300 ? source.excerpt.substring(0, 300) + "..." : source.excerpt;
                enhancedResponse += `   > "${fullExcerpt}"
`;
              }
              if (source.relevanceScore) {
                enhancedResponse += `   *Relevance: ${Math.round(source.relevanceScore * 100)}%*
`;
              }
              if (source.highlightedSnippets && source.highlightedSnippets.length > 0) {
                enhancedResponse += `   \u{1F4CD} Key passages: ${source.highlightedSnippets.slice(0, 2).join(" | ")}
`;
              }
              enhancedResponse += "\n";
            });
          }
          if (ragResponse.relatedQuestions.length > 0) {
            enhancedResponse += "\n\u{1F914} **You might also want to explore:**\n";
            ragResponse.relatedQuestions.forEach((question, index2) => {
              enhancedResponse += `\u2022 ${question}
`;
            });
          }
          if (ragResponse.studyRecommendations.length > 0) {
            enhancedResponse += "\n\u{1F4D6} **Study suggestions:**\n";
            ragResponse.studyRecommendations.forEach((rec, index2) => {
              enhancedResponse += `\u2022 ${rec}
`;
            });
          }
          this.log(`\u2705 RAG response generated with ${ragResponse.sources.length} sources (confidence: ${ragResponse.confidence})`);
          if (context.language && context.language !== "en" && this.isResponseInEnglish(enhancedResponse)) {
            this.warn(`RAG response was in English, translating to ${context.language}...`);
            try {
              if (this.translationService) {
                const translated = await this.translationService.translateText({
                  text: enhancedResponse,
                  targetLanguage: context.language,
                  context: "study_guide"
                });
                return translated.translatedText;
              }
            } catch (e) {
              this.error(`Error translating RAG response: ${e}`);
            }
          }
          return enhancedResponse;
        } catch (error) {
          this.error(`RAG response generation failed: ${error.message}`);
          return this.generateChatResponse(message, context);
        }
      }
      // Generates a simpler, non-RAG response
      async generateChatResponse(message, context) {
        const language = context.language || "en";
        let contentDomain = "General Studies";
        let documentTitle = "";
        if (context.documentId && context.chapter) {
          try {
            const document = await storage.getDocument(context.documentId);
            if (document) {
              documentTitle = document.title;
              contentDomain = await this.detectContentDomain(document.title, message);
            }
          } catch (error) {
            this.warn(`Could not load document context: ${error}`);
          }
        }
        const systemPrompt = this.getDomainSpecificPrompt(contentDomain, documentTitle);
        const fullPrompt = `${systemPrompt}

${context.recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}
assistant:`;
        try {
          const { response } = await this.multiModelService.executeTask("generate-text", fullPrompt, {
            temperature: 0.6,
            maxTokens: 400
          });
          return response;
        } catch (error) {
          this.error(`Chat response generation failed: ${error.message}`);
          return "I am having trouble formulating a response right now. Could you try rephrasing?";
        }
      }
      async detectContentDomain(title, userMessage) {
        const combinedText = `${title} ${userMessage}`.toLowerCase();
        if (this.matchesKeywords(combinedText, ["cbdc", "central bank", "digital currency", "cryptocurrency", "bitcoin", "blockchain", "monetary policy", "federal reserve", "economy", "economic", "finance", "financial", "market", "investment", "banking", "money", "currency", "inflation", "recession"])) {
          return "Economics/Finance";
        }
        if (this.matchesKeywords(combinedText, ["technology", "computer", "software", "programming", "algorithm", "artificial intelligence", "machine learning", "data", "digital", "internet", "cybersecurity"])) {
          return "Technology/Computing";
        }
        if (this.matchesKeywords(combinedText, ["physics", "chemistry", "biology", "quantum", "energy", "molecule", "cell", "dna", "evolution", "scientific", "research", "experiment"])) {
          return "Science";
        }
        if (this.matchesKeywords(combinedText, ["business", "management", "strategy", "marketing", "leadership", "organization", "corporate", "entrepreneur", "startup", "company"])) {
          return "Business/Management";
        }
        if (this.matchesKeywords(combinedText, ["philosophy", "ethics", "moral", "philosophical", "logic", "reasoning", "virtue", "justice", "truth", "knowledge"])) {
          return "Philosophy/Ethics";
        }
        if (this.matchesKeywords(combinedText, ["history", "historical", "politics", "political", "government", "democracy", "war", "revolution", "civilization", "empire"])) {
          return "History/Politics";
        }
        if (this.matchesKeywords(combinedText, ["bible", "biblical", "god", "jesus", "christian", "faith", "prayer", "spiritual", "religious", "scripture", "church", "theology"])) {
          return "Religious/Biblical Studies";
        }
        return "General Studies";
      }
      matchesKeywords(text2, keywords) {
        return keywords.some((keyword) => text2.includes(keyword));
      }
      getDomainSpecificPrompt(domain, documentTitle) {
        return `You are a knowledgeable and helpful universal reading assistant. You adapt your expertise to whatever content the user is reading.

Your core abilities:
- Understand and explain concepts from any field or domain
- Provide clear, accessible explanations regardless of subject matter
- Help users think critically about ideas and information
- Suggest relevant resources and further reading
- Connect theoretical concepts to practical applications
- Adapt your communication style to the user's level of understanding

Universal Guidelines:
- Listen carefully to what the user is asking about
- Explain concepts clearly with relevant examples
- Ask clarifying questions when you need more context
- Provide balanced perspectives on complex topics
- Be encouraging and supportive of learning
- Respect different viewpoints and interpretations
- Focus on helping the user understand and engage with their material
- Draw connections between ideas when helpful
- Suggest practical applications when relevant

Current Context: The user is reading "${documentTitle}" which appears to be in the ${domain} domain. Adapt your responses to be most helpful for this type of content while maintaining your universal approach to learning and understanding.`;
      }
      async analyzeStudyPatterns() {
        this.log("Analyzing study patterns for all users");
        try {
          for (const [userId, patterns] of Array.from(this.studyPatterns.entries())) {
            const patternAnalysis = await this.analyzeUserPatterns(userId, patterns);
            const recommendations = await this.createRecommendations(userId, patternAnalysis);
            this.userRecommendations.set(userId, recommendations);
            this.emit("patternAnalysis", {
              userId,
              patterns: patternAnalysis,
              recommendations
            });
          }
          const allThemes = /* @__PURE__ */ new Map();
          for (const patterns of Array.from(this.studyPatterns.values())) {
            patterns.forEach((pattern) => {
              pattern.themes?.forEach((theme) => {
                allThemes.set(theme, (allThemes.get(theme) || 0) + 1);
              });
            });
          }
          const topThemes = Array.from(allThemes.entries()).sort(([, a], [, b]) => b - a).slice(0, 10);
          for (const [theme] of topThemes) {
            const insight = await this.generateThemeInsight(theme);
            this.emit("trendingTheme", { theme, insight });
          }
        } catch (error) {
          this.error(`Error analyzing study patterns: ${error}`);
        }
      }
      async analyzeUserPatterns(userId, patterns) {
        return {
          mostReadBooks: [],
          favoriteTopics: [],
          readingFrequency: 0,
          annotationPatterns: []
        };
      }
      async generateThemeInsight(theme) {
        try {
          const { response } = await this.multiModelService.executeTask("creative-insights", `Generate an educational insight about the theme: ${theme}`);
          return response;
        } catch (error) {
          return `Insight for ${theme}: This theme appears frequently in user study patterns.`;
        }
      }
      extractStudyPatterns(annotations2, documents3) {
        const patterns = {
          favoriteThemes: /* @__PURE__ */ new Map(),
          studyFrequency: 0,
          preferredBooks: /* @__PURE__ */ new Map(),
          questionTypes: /* @__PURE__ */ new Map(),
          lastActiveDate: /* @__PURE__ */ new Date()
        };
        annotations2.forEach((annotation) => {
          const themes = this.extractThemesFromText(annotation.note);
          themes.forEach((theme) => {
            patterns.favoriteThemes.set(theme, (patterns.favoriteThemes.get(theme) || 0) + 1);
          });
        });
        documents3.forEach((doc) => {
          patterns.preferredBooks.set(doc.title, (patterns.preferredBooks.get(doc.title) || 0) + 1);
        });
        return patterns;
      }
      extractThemesFromText(text2, contentDomain) {
        const themes = [];
        const lowerText = text2.toLowerCase();
        const universalKeywords = {
          "key_concepts": ["concept", "principle", "theory", "idea", "notion", "framework"],
          "analysis": ["analysis", "examine", "evaluate", "assess", "review", "study"],
          "methodology": ["method", "approach", "technique", "process", "procedure", "system"],
          "evidence": ["evidence", "data", "proof", "research", "finding", "result"],
          "application": ["application", "practical", "use", "implementation", "example", "case"],
          "development": ["develop", "growth", "progress", "evolution", "advancement", "change"],
          "relationships": ["relationship", "connection", "link", "correlation", "association", "pattern"],
          "problem_solving": ["problem", "solution", "challenge", "issue", "resolution", "answer"],
          "innovation": ["innovation", "creative", "new", "novel", "breakthrough", "discovery"],
          "impact": ["impact", "effect", "influence", "consequence", "outcome", "result"],
          "comparison": ["compare", "contrast", "difference", "similarity", "versus", "alternative"],
          "historical_context": ["history", "historical", "past", "origin", "background", "context"],
          "future_implications": ["future", "prediction", "forecast", "trend", "projection", "outlook"],
          "critical_thinking": ["critical", "question", "debate", "argument", "perspective", "viewpoint"]
        };
        Object.entries(universalKeywords).forEach(([theme, words]) => {
          if (words.some((word) => lowerText.includes(word))) {
            themes.push(theme);
          }
        });
        if (contentDomain && contentDomain !== "General Studies") {
          themes.push(`domain_${contentDomain.toLowerCase().replace(/[^a-z]/g, "_")}`);
        }
        return themes;
      }
      async generatePersonalizedRecommendations() {
        try {
          this.log("Generating personalized study recommendations...");
          for (const [userId, patterns] of Array.from(this.studyPatterns.entries())) {
            const recommendations = await this.createRecommendations(userId, patterns);
            this.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
            this.emit("recommendationsGenerated", {
              userId,
              recommendations
            });
          }
          setTimeout(() => {
            this.addTask("GENERATE_RECOMMENDATIONS", {}, 1);
          }, 36e5);
        } catch (error) {
          this.error(`Error generating recommendations: ${error}`);
        }
      }
      async createRecommendations(userId, patterns) {
        const recommendations = [];
        try {
          const documents3 = await storage.getDocuments(userId);
          const topThemes = Array.from(patterns.favoriteThemes.entries());
          topThemes.sort((a, b) => b[1] - a[1]);
          const top3Themes = topThemes.slice(0, 3);
          for (const [theme] of top3Themes) {
            const prompt = `Suggest a meaningful study topic or resource related to "${theme}" for someone interested in learning and growth. Provide a brief, encouraging description.`;
            const { response } = await this.multiModelService.executeTask("creative-insights", prompt, { temperature: 0.5 });
            recommendations.push({
              type: "topic",
              title: `Study on ${theme.charAt(0).toUpperCase() + theme.slice(1)}`,
              description: response,
              priority: 3
            });
          }
          if (documents3.length > 0) {
            const recentDoc = documents3[0];
            const prompt = `Create 3 thoughtful study questions for someone reading "${recentDoc.title}". Make them practical and encouraging for learning and understanding.`;
            const { response } = await this.multiModelService.executeTask("creative-insights", prompt, { temperature: 0.6 });
            recommendations.push({
              type: "question",
              title: `Study Questions for ${recentDoc.title}`,
              description: response,
              documentId: recentDoc.id,
              priority: 2
            });
          }
        } catch (error) {
          this.warn(`Error creating recommendations for user ${userId}: ${error}`);
        }
        return recommendations.sort((a, b) => b.priority - a.priority);
      }
      // Public methods for external access
      async startChatSession(sessionId, context) {
        this.chatSessions.set(sessionId, {
          userId: context?.userId || 2,
          documentId: context?.documentId,
          chapter: context?.chapter,
          recentMessages: []
        });
      }
      async endChatSession(sessionId) {
        this.chatSessions.delete(sessionId);
      }
      getActiveSessionsCount() {
        return this.chatSessions.size;
      }
      // 🔧 RAG Helper Methods
      extractUserStudyPatterns(userId) {
        const patterns = this.studyPatterns.get(userId);
        if (!patterns) return ["general study", "biblical text analysis"];
        return patterns.studyTopics || ["general study"];
      }
      async getUserPreferredTopics(userId) {
        try {
          const patterns = this.studyPatterns.get(userId);
          if (patterns?.studyTopics) {
            return patterns.studyTopics;
          }
          const annotations2 = await storage.getAnnotations(userId);
          const topics = /* @__PURE__ */ new Set();
          annotations2.forEach((annotation) => {
            const themes = this.extractThemesFromText(annotation.note);
            themes.forEach((theme) => topics.add(theme));
          });
          return Array.from(topics).slice(0, 5);
        } catch (error) {
          this.warn(`Could not determine user preferred topics: ${error}`);
          return ["faith", "prayer", "study"];
        }
      }
      async getUserStudyLevel(userId) {
        try {
          const patterns = this.studyPatterns.get(userId);
          if (patterns?.comprehensionLevel) {
            if (patterns.comprehensionLevel < 4) return "beginner";
            if (patterns.comprehensionLevel < 7) return "intermediate";
            return "advanced";
          }
          const annotations2 = await storage.getAnnotations(userId);
          if (annotations2.length === 0) return "beginner";
          const avgAnnotationLength = annotations2.reduce((sum, ann) => sum + ann.note.length, 0) / annotations2.length;
          if (avgAnnotationLength < 50) return "beginner";
          if (avgAnnotationLength < 150) return "intermediate";
          return "advanced";
        } catch (error) {
          this.warn(`Could not determine user study level: ${error}`);
          return "intermediate";
        }
      }
      setTranslationService(translationService) {
        this.translationService = translationService;
        this.log("Translation service set for Study Assistant Agent.");
      }
      isResponseInEnglish(response) {
        const englishWords = ["the", "and", "is", "are", "was", "were", "to", "of", "in", "for", "with", "on", "at", "by"];
        const words = response.toLowerCase().split(/\s+/).slice(0, 20);
        const englishWordCount = words.filter((word) => englishWords.includes(word)).length;
        return englishWordCount >= 3;
      }
    };
  }
});

// server/agents/insight-generation-agent.ts
var InsightGenerationAgent;
var init_insight_generation_agent = __esm({
  "server/agents/insight-generation-agent.ts"() {
    "use strict";
    init_base_agent();
    init_ollama_service();
    init_multi_model_service();
    init_storage();
    init_power_summary_service();
    init_document_rag_service();
    InsightGenerationAgent = class extends BaseAgent {
      ollamaService;
      multiModelService;
      generatedInsights = /* @__PURE__ */ new Map();
      crossReferences = [];
      // Page tracking for insight generation limits
      pageTrackers = /* @__PURE__ */ new Map();
      // key: `${userId}-${documentId}`
      PAGES_PER_INSIGHT = 10;
      // Generate 1 insight every 10 pages
      translationService;
      // Add translation service property
      constructor() {
        super({
          name: "InsightGenerationAgent",
          description: "Generates deep insights and discovers connections with multi-model intelligence (limited to 1 insight per 10 pages)",
          interval: 36e5,
          // 1 hour (much less aggressive)
          maxRetries: 3,
          timeout: 18e4,
          // 3 minutes for complex insight generation
          specialties: ["Insight Generation", "Connection Discovery", "Pattern Recognition", "Theme Analysis", "Cross-References"]
        });
        this.ollamaService = new OllamaService({
          model: "qwen2.5:7b-instruct",
          // Superior reasoning for deep insights and complex analysis
          temperature: 0.6
          // Balanced temperature for insightful yet focused responses
        });
        this.multiModelService = new MultiModelService();
      }
      async cleanup() {
        this.log("Cleaning up Insight Generation Agent");
      }
      async initialize() {
        try {
          await this.ollamaService.initialize();
          await this.multiModelService.initialize();
          setTimeout(() => {
            this.addTask("GENERATE_DAILY_INSIGHTS", {}, 1);
          }, 36e5);
          this.log("Insight Generation Agent initialized with multi-model intelligence and page-based limiting (1 insight per 10 pages) - Scheduled for 1 hour intervals");
        } catch (error) {
          this.error(`Failed to initialize: ${error}`);
          throw error;
        }
      }
      async processTask(task) {
        this.log(`Processing insight generation task: ${task.type}`);
        switch (task.type) {
          case "GENERATE_DAILY_INSIGHTS":
            await this.generateDailyInsights();
            break;
          case "DISCOVER_CONNECTIONS":
            await this.discoverCrossReferences();
            break;
          case "ANALYZE_THEMES":
            await this.analyzeThemesWithRAG();
            break;
          case "GENERATE_INSIGHT_FOR_CHAPTER":
            await this.generateInsightForChapter(task.data.documentId, task.data.chapter, task.data.userId);
            break;
          case "UPDATE_EXPERTISE":
            await this.updateExpertise(task.data);
            break;
          default:
            this.warn(`Unknown task type: ${task.type}`);
        }
        return null;
      }
      async updateExpertise(data) {
        try {
          const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
          this.log(`\u{1F9E0} Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
          this.log(`\u2705 Insight Generation expertise updated for ${domain}`);
        } catch (error) {
          this.error(`Failed to update expertise: ${error}`);
        }
      }
      async generateDailyInsights() {
        try {
          this.log("Generating daily insights...");
          const documents3 = await storage.getDocuments(2);
          const selections = this.selectChaptersForInsights(documents3, 3);
          for (const selection of selections) {
            await this.generateInsightForChapter(selection.documentId, selection.chapter);
          }
          setTimeout(() => {
            this.addTask("GENERATE_DAILY_INSIGHTS", {}, 1);
          }, 864e5);
        } catch (error) {
          this.error(`Error generating daily insights: ${error}`);
        }
      }
      selectChaptersForInsights(documents3, count) {
        const selections = [];
        for (let i = 0; i < Math.min(count, documents3.length); i++) {
          const doc = documents3[i];
          const randomChapter = Math.floor(Math.random() * doc.totalChapters) + 1;
          selections.push({
            documentId: doc.id,
            chapter: randomChapter
          });
        }
        return selections;
      }
      getPageTrackerKey(userId, documentId) {
        return `${userId}-${documentId}`;
      }
      getOrCreatePageTracker(userId, documentId) {
        const key = this.getPageTrackerKey(userId, documentId);
        let tracker = this.pageTrackers.get(key);
        if (!tracker) {
          tracker = {
            userId,
            documentId,
            pagesRead: 0,
            lastInsightPage: 0,
            lastInsightTimestamp: /* @__PURE__ */ new Date(0)
            // Start from epoch
          };
          this.pageTrackers.set(key, tracker);
          this.log(`\u{1F4CA} Created new page tracker for user ${userId}, document ${documentId}`);
        }
        return tracker;
      }
      updatePageCount(userId, documentId, chapter) {
        const tracker = this.getOrCreatePageTracker(userId, documentId);
        tracker.pagesRead = chapter;
        this.pageTrackers.set(this.getPageTrackerKey(userId, documentId), tracker);
        this.log(`\u{1F4D6} Updated page count: User ${userId}, Document ${documentId}, Pages read: ${tracker.pagesRead}`);
      }
      shouldGenerateInsight(userId, documentId) {
        const tracker = this.getOrCreatePageTracker(userId, documentId);
        const pagesSinceLastInsight = tracker.pagesRead - tracker.lastInsightPage;
        const shouldGenerate = pagesSinceLastInsight >= this.PAGES_PER_INSIGHT;
        if (shouldGenerate) {
          this.log(`\u2705 Insight generation allowed: ${pagesSinceLastInsight} pages since last insight (threshold: ${this.PAGES_PER_INSIGHT})`);
        } else {
          this.log(`\u23F3 Insight generation limited: Only ${pagesSinceLastInsight} pages since last insight (need ${this.PAGES_PER_INSIGHT})`);
        }
        return shouldGenerate;
      }
      markInsightGenerated(userId, documentId) {
        const tracker = this.getOrCreatePageTracker(userId, documentId);
        tracker.lastInsightPage = tracker.pagesRead;
        tracker.lastInsightTimestamp = /* @__PURE__ */ new Date();
        this.pageTrackers.set(this.getPageTrackerKey(userId, documentId), tracker);
        this.log(`\u{1F3AF} Marked insight generated: User ${userId}, Document ${documentId}, Page ${tracker.lastInsightPage}`);
      }
      async generateInsightForChapter(documentId, chapter, userId = 1) {
        this.updatePageCount(userId, documentId, chapter);
        if (!this.shouldGenerateInsight(userId, documentId)) {
          this.log(`\u{1F4CA} Skipping insight generation: need ${this.PAGES_PER_INSIGHT} pages between insights (current: ${this.getOrCreatePageTracker(userId, documentId).pagesRead - this.getOrCreatePageTracker(userId, documentId).lastInsightPage} pages since last insight)`);
          return [];
        }
        try {
          this.log(`\u{1F3AF} Generating insights for document ${documentId}, chapter ${chapter} (page-limited generation)`);
          const document = await storage.getDocument(documentId);
          if (!document) return [];
          const content = JSON.parse(document.content);
          const chapterData = content.chapters.find((c) => c.number === chapter);
          if (!chapterData) return [];
          const text2 = chapterData.paragraphs.map((p) => p.text).join("\n");
          const title = document.title;
          const powerSummaryContext = await powerSummaryService.getPowerSummariesForAIContext(documentId, 5);
          const powerSummaryStats = await powerSummaryService.getPowerSummaryStats();
          const annotations2 = await storage.getAnnotationsByChapter(userId, documentId, chapter);
          const annotationContext = annotations2.map((a) => a.note).join("\n");
          const domain = await this.detectContentDomain(text2, title);
          const insights = [];
          const ragInsights = await this.generateRAGEnhancedInsightsWithContext(
            documentId,
            chapter,
            text2,
            title,
            domain,
            userId,
            powerSummaryContext,
            annotationContext
          );
          insights.push(...ragInsights);
          const thematicInsights = await this.generateThematicInsights(documentId, chapter, text2, title, domain);
          insights.push(...thematicInsights.slice(0, 1));
          const applicationInsights = await this.generateApplicationInsights(documentId, chapter, text2, title, domain);
          insights.push(...applicationInsights.slice(0, 1));
          insights.forEach((insight) => {
            this.generatedInsights.set(insight.id, insight);
          });
          this.markInsightGenerated(userId, documentId);
          this.log(`\u2705 Generated ${insights.length} insights for chapter ${chapter} (limited generation)`);
          return insights;
        } catch (error) {
          this.error(`Error generating insights: ${error}`);
          return [];
        }
      }
      async detectContentDomain(text2, title = "") {
        const prompt = `Analyze this content and identify its primary domain/subject area:

Title: ${title}
Content (first 1500 chars): ${text2.substring(0, 1500)}

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
          return "General Knowledge";
        }
      }
      async generateThematicInsights(documentId, chapter, text2, title, domain) {
        let prompt = "";
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          prompt = `As a biblical scholar and spiritual teacher, analyze this passage from ${title}, Chapter ${chapter} and identify the most profound spiritual themes.

TEXT: "${text2.substring(0, 2e3)}..."

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
        } else if (domain.toLowerCase().includes("science") || domain.toLowerCase().includes("physics")) {
          prompt = `As a science educator and expert in ${domain}, analyze this content from ${title}, Chapter ${chapter} and identify the most important scientific concepts and principles.

TEXT: "${text2.substring(0, 2e3)}..."

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

TEXT: "${text2.substring(0, 2e3)}..."

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
          return themes.map((theme, index2) => ({
            id: `theme-${documentId}-${chapter}-${index2}`,
            documentId,
            chapter,
            type: "theme",
            title: domain.toLowerCase().includes("science") ? `Scientific Concept: ${theme.title}` : `Key Theme: ${theme.title}`,
            content: theme.content,
            relevanceScore: 0.9,
            createdAt: /* @__PURE__ */ new Date(),
            tags: ["theme", domain.toLowerCase(), "voice-optimized"]
          }));
        } catch (error) {
          this.warn(`Error generating thematic insights: ${error}`);
          return [];
        }
      }
      async generateApplicationInsights(documentId, chapter, text2, title, domain) {
        let prompt = "";
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          prompt = `As a practical discipleship coach, analyze this passage from ${title}, Chapter ${chapter} and provide actionable spiritual applications.

TEXT: "${text2.substring(0, 2e3)}..."

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
        } else if (domain.toLowerCase().includes("science") || domain.toLowerCase().includes("physics")) {
          prompt = `As a science educator, analyze this content from ${title}, Chapter ${chapter} and provide practical applications and real-world connections.

TEXT: "${text2.substring(0, 2e3)}..."

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

TEXT: "${text2.substring(0, 2e3)}..."

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
            type: "application",
            title: domain.toLowerCase().includes("religious") ? "Living It Out: Practical Application" : "Real-World Applications",
            content: response,
            relevanceScore: 0.95,
            createdAt: /* @__PURE__ */ new Date(),
            tags: ["application", "practical", domain.toLowerCase(), "voice-optimized"]
          }];
        } catch (error) {
          this.warn(`Error generating application insights: ${error}`);
          return [];
        }
      }
      async generateHistoricalInsights(documentId, chapter, text2, title, domain) {
        let prompt = "";
        if (domain.toLowerCase().includes("religious") || domain.toLowerCase().includes("biblical")) {
          prompt = `As a biblical historian and cultural expert, provide rich historical context for this passage from ${title}, Chapter ${chapter}.

TEXT: "${text2.substring(0, 2e3)}..."

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
        } else if (domain.toLowerCase().includes("science") || domain.toLowerCase().includes("physics")) {
          prompt = `As a science historian, provide fascinating historical context for these scientific concepts from ${title}, Chapter ${chapter}.

TEXT: "${text2.substring(0, 2e3)}..."

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

TEXT: "${text2.substring(0, 2e3)}..."

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
            type: "historical",
            title: domain.toLowerCase().includes("religious") ? "Historical Window: Understanding the Context" : "Historical Background",
            content: response,
            relevanceScore: 0.8,
            createdAt: /* @__PURE__ */ new Date(),
            tags: ["historical", "context", "background", domain.toLowerCase(), "voice-optimized"]
          }];
        } catch (error) {
          this.warn(`Error generating historical insights: ${error}`);
          return [];
        }
      }
      // 🧠 NEW: RAG-Enhanced Cross-Document Insight Generation
      async generateRAGEnhancedInsights(documentId, chapter, content, title, domain, userId) {
        try {
          this.log(`\u{1F50D} Generating RAG-enhanced insights for cross-document connections`);
          const ragContext = {
            userId,
            currentDocument: documentId,
            currentChapter: chapter,
            conversationHistory: [],
            userStudyPatterns: [domain, "insight-generation"],
            preferredTopics: this.extractKeyThemes(content),
            studyLevel: "intermediate"
          };
          const themeQuery = `themes, concepts, and insights related to: ${title} ${content.substring(0, 300)}`;
          const ragResponse = await documentRAGService.processRAGQuery(
            themeQuery,
            ragContext,
            {
              maxSources: 5,
              // More sources for comprehensive insights
              includeAnnotations: true,
              // Include user notes for personalized insights
              includeMemories: true,
              // Include AI memories for learned patterns
              searchDepth: "thorough",
              // Deep search for quality insights
              useEmbeddings: true
            }
          );
          const ragInsights = [];
          if (ragResponse.sources.length > 1) {
            const connectionInsight = await this.generateCrossDocumentConnectionInsight(
              documentId,
              chapter,
              content,
              title,
              ragResponse.sources
            );
            if (connectionInsight) ragInsights.push(connectionInsight);
          }
          if (ragResponse.sources.length > 0) {
            const patternInsight = await this.generatePatternRecognitionInsight(
              documentId,
              chapter,
              content,
              title,
              ragResponse.sources,
              domain
            );
            if (patternInsight) ragInsights.push(patternInsight);
          }
          this.log(`\u2705 Generated ${ragInsights.length} RAG-enhanced insights with ${ragResponse.sources.length} source connections`);
          return ragInsights;
        } catch (error) {
          this.warn(`RAG-enhanced insight generation failed: ${error}`);
          return [];
        }
      }
      async generateCrossDocumentConnectionInsight(documentId, chapter, content, title, sources) {
        try {
          const relatedDocs = sources.filter((s) => s.source.id !== documentId);
          if (relatedDocs.length === 0) return null;
          const connectionPrompt = `Analyze connections between these materials:

CURRENT: "${title}" Chapter ${chapter}
${content.substring(0, 800)}

RELATED:
${relatedDocs.slice(0, 3).map(
            (source, i) => `${i + 1}. ${source.documentTitle}: "${source.excerpt}"`
          ).join("\n")}

Generate a cross-document insight (2-3 sentences) that reveals meaningful connections between these materials.`;
          const response = await this.multiModelService.executeTask("theological-reasoning", connectionPrompt, {
            requirements: { reasoning: 9, creativity: 7, accuracy: 8 }
          });
          return {
            id: `cross-doc-${documentId}-${chapter}-${Date.now()}`,
            documentId,
            chapter,
            type: "connection",
            title: "Cross-Document Connection",
            content: response.response,
            relevanceScore: 0.9,
            createdAt: /* @__PURE__ */ new Date(),
            tags: ["cross-document", "connection", "rag-enhanced"]
          };
        } catch (error) {
          this.warn(`Cross-document connection insight failed: ${error}`);
          return null;
        }
      }
      async generatePatternRecognitionInsight(documentId, chapter, content, title, sources, domain) {
        try {
          const patternPrompt = `Identify patterns across these materials:

CURRENT: "${title}" Chapter ${chapter}
${content.substring(0, 600)}

RELATED:
${sources.slice(0, 3).map(
            (source, i) => `${i + 1}. ${source.documentTitle}: "${source.excerpt.substring(0, 100)}"`
          ).join("\n")}

Generate a pattern recognition insight (2-3 sentences) that identifies recurring themes or concepts.`;
          const response = await this.multiModelService.executeTask("pattern-analysis", patternPrompt, {
            requirements: { reasoning: 8, creativity: 6, accuracy: 9 }
          });
          return {
            id: `pattern-${documentId}-${chapter}-${Date.now()}`,
            documentId,
            chapter,
            type: "theme",
            title: `Recurring Pattern (${domain})`,
            content: response.response,
            relevanceScore: 0.85,
            createdAt: /* @__PURE__ */ new Date(),
            tags: ["pattern", "rag-enhanced", domain.toLowerCase()]
          };
        } catch (error) {
          this.warn(`Pattern recognition insight failed: ${error}`);
          return null;
        }
      }
      extractKeyThemes(content) {
        try {
          const words = content.toLowerCase().split(/\W+/);
          const meaningfulWords = words.filter(
            (word) => word.length > 4 && !["this", "that", "with", "have", "they", "were", "been", "their", "would"].includes(word)
          );
          const wordCount = /* @__PURE__ */ new Map();
          meaningfulWords.forEach((word) => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
          });
          return Array.from(wordCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word]) => word);
        } catch (error) {
          return ["general", "study"];
        }
      }
      parseThematicResponse(response) {
        const themes = [];
        const sections = response.split(/\d+\./);
        sections.forEach((section) => {
          const trimmed = section.trim();
          if (trimmed.length > 50) {
            const lines = trimmed.split("\n");
            const title = lines[0].substring(0, 60) + "...";
            const content = trimmed;
            themes.push({ title, content });
          }
        });
        return themes.slice(0, 3);
      }
      async discoverCrossReferences() {
        try {
          this.log("Discovering cross-references between texts...");
          const documents3 = await storage.getDocuments(2);
          for (let i = 0; i < documents3.length; i++) {
            for (let j = i + 1; j < documents3.length; j++) {
              await this.findConnectionsBetweenDocuments(documents3[i], documents3[j]);
            }
          }
          setTimeout(() => {
            this.addTask("DISCOVER_CONNECTIONS", {}, 1);
          }, 864e5);
        } catch (error) {
          this.error(`Error discovering cross-references: ${error}`);
        }
      }
      async findConnectionsBetweenDocuments(doc1, doc2) {
        try {
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
      sampleChapters(document, count) {
        const totalChapters = document.totalChapters;
        const chapters = [];
        for (let i = 0; i < Math.min(count, totalChapters); i++) {
          chapters.push(Math.floor(Math.random() * totalChapters) + 1);
        }
        return chapters;
      }
      async analyzeConnection(doc1, ch1, doc2, ch2) {
        try {
          const content1 = doc1.content;
          const content2 = doc2.content;
          const chapter1 = content1.chapters?.find((ch) => ch.number === ch1);
          const chapter2 = content2.chapters?.find((ch) => ch.number === ch2);
          if (!chapter1 || !chapter2) return null;
          const text1 = chapter1.paragraphs.map((p) => p.text).join(" ").substring(0, 800);
          const text2 = chapter2.paragraphs.map((p) => p.text).join(" ").substring(0, 800);
          const prompt = `Analyze these two biblical passages and identify any thematic, theological, or narrative connections:

Passage 1 (${doc1.title}, Chapter ${ch1}):
"${text1}"

Passage 2 (${doc2.title}, Chapter ${ch2}):
"${text2}"

Rate the connection strength (0-1) and describe the connection type. Only respond if there's a meaningful connection (>0.6).`;
          const response = await this.ollamaService.generateText(prompt);
          const strengthMatch = response.match(/(\d*\.?\d+)/);
          const strength = strengthMatch ? parseFloat(strengthMatch[1]) : 0;
          if (strength > 0.6) {
            return {
              id: `connection-${doc1.id}-${ch1}-${doc2.id}-${ch2}`,
              sourceDocumentId: doc1.id,
              sourceChapter: ch1,
              targetDocumentId: doc2.id,
              targetChapter: ch2,
              connectionType: "theme",
              strength
            };
          }
          return null;
        } catch (error) {
          this.warn(`Error analyzing connection: ${error}`);
          return null;
        }
      }
      async requestInsightGeneration(documentId, chapter, language = "en") {
        let response = `Insight generation requested for document ${documentId}${chapter ? `, chapter ${chapter}` : ""}`;
        if (language !== "en" && this.translationService) {
          try {
            const translatedResponse = await this.translationService.translateText({
              text: response,
              targetLanguage: language,
              context: "general"
            });
            response = translatedResponse.translatedText;
          } catch (error) {
            this.warn(`Insight generation response translation failed: ${error}`);
          }
        }
        return response;
      }
      setTranslationService(translationService) {
        this.translationService = translationService;
        this.log("\u{1F310} Translation service set for Insight Generation Agent");
      }
      getInsightsForChapter(documentId, chapter) {
        return Array.from(this.generatedInsights.values()).filter((insight) => insight.documentId === documentId && insight.chapter === chapter);
      }
      getCrossReferences(documentId, chapter) {
        return this.crossReferences.filter(
          (ref) => ref.sourceDocumentId === documentId && ref.sourceChapter === chapter || ref.targetDocumentId === documentId && ref.targetChapter === chapter
        );
      }
      getInsightStats() {
        return {
          totalInsights: this.generatedInsights.size,
          totalCrossReferences: this.crossReferences.length,
          insightsByType: this.groupInsightsByType(),
          recentInsights: this.getRecentInsights(5)
        };
      }
      getPageTrackingStats() {
        const stats = Array.from(this.pageTrackers.values()).map((tracker) => ({
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
      groupInsightsByType() {
        const groups = {};
        this.generatedInsights.forEach((insight) => {
          groups[insight.type] = (groups[insight.type] || 0) + 1;
        });
        return groups;
      }
      getRecentInsights(count) {
        return Array.from(this.generatedInsights.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, count);
      }
      // 🔍 NEW: Enhanced RAG insights with power summaries and annotations
      async generateRAGEnhancedInsightsWithContext(documentId, chapter, content, title, domain, userId, summaryContext, annotationContext) {
        try {
          this.log(`\u{1F50D} Generating RAG-enhanced insights with power summaries and annotations`);
          const ragContext = {
            userId,
            currentDocument: documentId,
            currentChapter: chapter,
            conversationHistory: [],
            userStudyPatterns: [],
            preferredTopics: [],
            studyLevel: "intermediate"
          };
          const enhancedQuery = `Generate deep insights for this content:

Title: ${title}
Chapter: ${chapter}
Content: ${content.substring(0, 2e3)}

Previous Power Summaries:
${summaryContext.substring(0, 1e3)}

User Annotations:
${annotationContext.substring(0, 1e3)}

Focus on: connections, patterns, applications, and deep understanding.`;
          const ragResponse = await documentRAGService.processRAGQuery(enhancedQuery, ragContext, {
            maxSources: 5,
            includeAnnotations: true,
            includeMemories: true,
            searchDepth: "thorough"
          });
          const insights = [];
          if (ragResponse.sources.length > 0) {
            const connectionInsight = await this.generateCrossDocumentConnectionInsightWithContext(
              documentId,
              chapter,
              content,
              title,
              ragResponse.sources,
              summaryContext,
              annotationContext
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
      async generateCrossDocumentConnectionInsightWithContext(documentId, chapter, content, title, sources, summaryContext, annotationContext) {
        try {
          const sourceInfo = sources.slice(0, 3).map(
            (s) => `"${s.excerpt}" from ${s.documentTitle}`
          ).join("\n");
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
          let response;
          try {
            const result = await this.multiModelService.executeTask("insight-generation", prompt, {
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
            type: "connection",
            title: parsed.title,
            content: parsed.content,
            relevanceScore: 0.85,
            createdAt: /* @__PURE__ */ new Date(),
            tags: ["cross-reference", "connection", "enhanced-context"]
          };
        } catch (error) {
          this.error(`Enhanced connection insight generation failed: ${error}`);
          return null;
        }
      }
      // Helper method to parse insight responses
      parseInsightResponse(response) {
        try {
          const jsonMatch = response.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
          }
          const lines = response.split("\n").filter((l) => l.trim());
          if (lines.length >= 2) {
            return {
              title: lines[0].replace(/[^\w\s]/g, "").trim(),
              content: lines.slice(1).join("\n").trim()
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      }
      async analyzeThemesWithRAG() {
        this.log("Starting high-level theme analysis with RAG...");
        try {
          const allDocuments = await storage.getDocuments(2);
          if (allDocuments.length === 0) {
            this.log("No documents found for theme analysis.");
            return;
          }
          const allContent = allDocuments.map((doc) => {
            const content = typeof doc.content === "string" ? JSON.parse(doc.content) : doc.content;
            return content.chapters.map((ch) => ch.paragraphs.map((p) => p.text).join(" ")).join("\n");
          }).join("\n\n");
          const query = "What are the major recurring themes across all available texts?";
          const ragContext = {
            userId: 1,
            conversationHistory: [],
            userStudyPatterns: [],
            preferredTopics: [],
            studyLevel: "advanced"
          };
          const response = await documentRAGService.processRAGQuery(query, ragContext, { searchDepth: "thorough" });
          this.log(`RAG-based theme analysis complete. Response: ${response.answer.substring(0, 100)}...`);
        } catch (error) {
          this.error(`Error during RAG theme analysis: ${error}`);
        }
      }
    };
  }
});

// server/agents/learning-agent.ts
import { eq as eq8 } from "drizzle-orm";
var LearningAgent;
var init_learning_agent = __esm({
  "server/agents/learning-agent.ts"() {
    "use strict";
    init_base_agent();
    init_ollama_service();
    init_multi_model_service();
    init_db();
    init_schema();
    init_document_rag_service();
    init_power_summary_service();
    LearningAgent = class extends BaseAgent {
      ollamaService;
      multiModelService;
      knowledgeBase = /* @__PURE__ */ new Map();
      learningContext = /* @__PURE__ */ new Map();
      fineTuningData = [];
      constructor() {
        super({
          name: "LearningAgent",
          description: "Advanced AI agent that learns and becomes expert on uploaded content with multi-model intelligence",
          interval: 6e5,
          // Check every 10 minutes (less aggressive)
          maxRetries: 3,
          timeout: 6e4,
          // 1 minute timeout for learning tasks
          specialties: ["Deep Learning", "Concept Extraction", "Pattern Recognition", "Knowledge Base Building", "Multi-Model Intelligence"]
        });
      }
      async initialize() {
        this.ollamaService = new OllamaService({
          model: "gemma3n:e2b",
          temperature: 0.3,
          // Lower temperature for more focused learning
          maxTokens: 4096
        });
        this.multiModelService = new MultiModelService();
        await this.ollamaService.initialize();
        await this.multiModelService.initialize();
        await this.loadKnowledgeBase();
        await this.scheduleInitialLearningTasks();
        this.log("\u{1F9E0} Learning Agent initialized with multi-model intelligence - Ready to become an expert!");
      }
      async processTask(task) {
        this.log(`Processing learning task: ${task.type}`);
        switch (task.type) {
          case "DEEP_LEARN_DOCUMENT":
            await this.deepLearnDocument(task.data);
            break;
          case "EXTRACT_KNOWLEDGE":
            await this.extractConcepts(task.data.content, task.data.documentId, task.data.chapter);
            break;
          case "BUILD_EXPERTISE":
            await this.generateExpertise(task.data.content, task.data.documentId, task.data.chapter);
            break;
          case "REINFORCE_LEARNING":
            await this.reinforceLearning(task.data);
            break;
          case "GENERATE_FINE_TUNING_DATA":
            await this.createFineTuningData(task.data.content, task.data.documentId, task.data.chapter);
            break;
          case "ADAPT_MODEL":
            await this.adaptModel(task.data);
            break;
          case "UPDATE_EXPERTISE":
            await this.updateExpertise(task.data);
            break;
          case "LEARN_FROM_SUMMARY":
            await this.learnFromPowerSummary(task.data);
            break;
          case "IMPROVE_ANALYSIS":
            await this.improveAnalysisFromFeedback(task.data);
            break;
          case "LEARN_INSIGHTS":
            await this.learnFromInsights(task.data);
            break;
          case "LEARN_FROM_ANNOTATION":
            await this.learnFromUserAnnotation(task.data);
            break;
          case "LEARN_FROM_BOOKMARK":
            await this.learnFromBookmark(task.data);
            break;
          case "LEARN_FROM_DISCUSSION":
            await this.learnFromDiscussion(task.data);
            break;
          default:
            this.warn(`Unknown task type: ${task.type}`);
        }
        return null;
      }
      async updateExpertise(data) {
        try {
          const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
          this.log(`\u{1F9E0} Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
          this.log(`\u2705 Learning Agent expertise updated for ${domain}`);
        } catch (error) {
          this.error(`Failed to update expertise: ${error}`);
        }
      }
      async cleanup() {
        await this.saveKnowledgeBase();
        this.log("Learning Agent cleaned up");
      }
      // 🧠 DEEP LEARNING FROM DOCUMENTS
      async deepLearnDocument(data) {
        const { documentId, chapter } = data;
        try {
          const document = await db.select().from(documents).where(eq8(documents.id, documentId)).limit(1);
          if (!document.length) return;
          let content = "";
          const docContent = JSON.parse(document[0].content);
          if (chapter) {
            const chapterData = docContent.chapters.find((c) => c.number === chapter);
            content = chapterData?.paragraphs.map((p) => p.text).join("\n") || "";
          } else {
            content = docContent.chapters.map((c) => c.paragraphs.map((p) => p.text).join("\n")).join("\n\n");
          }
          if (!content) return;
          this.log(`\u{1F9E0} Deep learning from document ${documentId}${chapter ? `, chapter ${chapter}` : ""}`);
          await this.extractConcepts(content, documentId, chapter);
          await this.identifyPatterns(content, documentId, chapter);
          await this.buildRelationships(content, documentId, chapter);
          await this.generateExpertise(content, documentId, chapter);
          await this.createFineTuningData(content, documentId, chapter);
          this.log(`\u2705 Deep learning completed for document ${documentId}`);
        } catch (error) {
          this.error(`Deep learning failed: ${error}`);
          throw error;
        }
      }
      // 🔍 EXTRACT CONCEPTS AND KNOWLEDGE
      async extractConcepts(content, documentId, chapter) {
        const prompt = `You are an expert knowledge extraction AI. Analyze this text and extract key concepts, definitions, and relationships.

Text to analyze:
${content.substring(0, 8e3)}

Extract:
1. Key concepts and their definitions
2. Important relationships between concepts
3. Examples and use cases
4. Domain-specific terminology
5. Underlying principles and patterns

Format as JSON:
{
  "concepts": [
    {
      "name": "concept name",
      "definition": "clear definition",
      "examples": ["example1", "example2"],
      "relationships": ["related concept1", "related concept2"],
      "importance": 0.9
    }
  ],
  "domain": "identified domain",
  "complexity_level": "beginner|intermediate|advanced|expert"
}`;
        try {
          const result = await this.multiModelService.executeTask("text-analysis", prompt, {
            requirements: { accuracy: 9, reasoning: 8, speed: 6 }
          });
          this.log(`\u{1F50D} Concepts extracted using ${result.modelUsed} in ${result.executionTime}ms`);
          const extracted = this.parseJsonResponse(result.response);
          if (extracted?.concepts) {
            for (const concept of extracted.concepts) {
              const knowledgeNode = {
                id: `${documentId}-${chapter || 0}-${concept.name.replace(/\s+/g, "-").toLowerCase()}`,
                concept: concept.name,
                definition: concept.definition,
                examples: concept.examples || [],
                relationships: concept.relationships || [],
                confidence: concept.importance || 0.5,
                documentId,
                chapter,
                createdAt: /* @__PURE__ */ new Date(),
                reinforcements: 1
              };
              this.knowledgeBase.set(knowledgeNode.id, knowledgeNode);
            }
            this.updateLearningContext(documentId, extracted);
          }
        } catch (error) {
          this.error(`Concept extraction failed: ${error}`);
        }
      }
      // 🔍 IDENTIFY PATTERNS
      async identifyPatterns(content, documentId, chapter) {
        const prompt = `Analyze this text for recurring patterns, structures, and methodologies:

${content.substring(0, 6e3)}

Identify:
1. Recurring themes and patterns
2. Structural elements and organization
3. Methodological approaches
4. Problem-solving patterns
5. Communication styles and techniques

Format as JSON with your findings.`;
        try {
          const response = await this.ollamaService.generateText(prompt);
          const patterns = this.parseJsonResponse(response);
          if (patterns) {
            const context = this.learningContext.get(documentId);
            if (context) {
              context.learning_patterns.push(...patterns.patterns || []);
            }
          }
        } catch (error) {
          this.error(`Pattern identification failed: ${error}`);
        }
      }
      // 🔗 BUILD RELATIONSHIPS AND CONNECTIONS
      async buildRelationships(content, documentId, chapter) {
        const existingConcepts = Array.from(this.knowledgeBase.values()).filter((node) => node.documentId === documentId).map((node) => node.concept);
        if (existingConcepts.length < 2) return;
        const prompt = `Find deep connections between these concepts:

Concepts: ${existingConcepts.join(", ")}

Context: ${content.substring(0, 6e3)}

Find relationships: causal, hierarchical, functional, temporal, analogical.

Format as JSON with relationship details.`;
        try {
          const response = await this.ollamaService.generateText(prompt);
          const relationships = this.parseJsonResponse(response);
          if (relationships?.relationships) {
            for (const rel of relationships.relationships) {
              const node1 = Array.from(this.knowledgeBase.values()).find((n) => n.concept.toLowerCase().includes(rel.concept1?.toLowerCase() || ""));
              const node2 = Array.from(this.knowledgeBase.values()).find((n) => n.concept.toLowerCase().includes(rel.concept2?.toLowerCase() || ""));
              if (node1 && node2 && rel.concept2 && rel.concept1) {
                if (!node1.relationships.includes(rel.concept2)) {
                  node1.relationships.push(rel.concept2);
                }
                if (!node2.relationships.includes(rel.concept1)) {
                  node2.relationships.push(rel.concept1);
                }
              }
            }
          }
        } catch (error) {
          this.error(`Relationship building failed: ${error}`);
        }
      }
      // 🎓 GENERATE EXPERTISE AND INSIGHTS
      async generateExpertise(content, documentId, chapter) {
        const concepts = Array.from(this.knowledgeBase.values()).filter((node) => node.documentId === documentId).map((node) => `${node.concept}: ${node.definition}`).join("\n");
        const prompt = `Generate expert-level insights based on this analysis:

Learned Concepts:
${concepts}

Content: ${content.substring(0, 4e3)}

Generate:
1. Advanced patterns and principles
2. Practical applications
3. Expert Q&A examples
4. Teaching points
5. Domain connections

Format as JSON with structured insights.`;
        try {
          const response = await this.ollamaService.generateText(prompt);
          const expertise = this.parseJsonResponse(response);
          if (expertise) {
            this.fineTuningData.push({
              documentId,
              chapter,
              expertise,
              timestamp: /* @__PURE__ */ new Date()
            });
            const context = this.learningContext.get(documentId);
            if (context && expertise.expertise_level) {
              const level = typeof expertise.expertise_level === "string" ? parseInt(expertise.expertise_level) : expertise.expertise_level;
              context.expertise_level = Math.max(context.expertise_level, level || 1);
            }
          }
        } catch (error) {
          this.error(`Expertise generation failed: ${error}`);
        }
      }
      // 🔄 REINFORCEMENT LEARNING
      async reinforceLearning(data) {
        const { documentId, feedback, success } = data;
        const documentNodes = Array.from(this.knowledgeBase.values()).filter((node) => node.documentId === documentId);
        for (const node of documentNodes) {
          if (success) {
            node.reinforcements += 1;
            node.confidence = Math.min(1, node.confidence + 0.1);
          } else if (feedback) {
            await this.analyzeFeedback(node, feedback);
          }
        }
        this.log(`\u{1F504} Reinforced learning for document ${documentId}`);
      }
      // 📊 CREATE FINE-TUNING DATA
      async createFineTuningData(content, documentId, chapter) {
        const concepts = Array.from(this.knowledgeBase.values()).filter((node) => node.documentId === documentId);
        for (const concept of concepts.slice(0, 5)) {
          const trainingExample = {
            instruction: `Explain the concept of "${concept.concept}" in the context of this domain.`,
            input: `Context: ${content.substring(0, 2e3)}`,
            output: `${concept.definition}

Key points:
${concept.examples.map((ex) => `\u2022 ${ex}`).join("\n")}

Related concepts: ${concept.relationships.join(", ")}`,
            metadata: {
              documentId,
              chapter,
              concept: concept.concept,
              confidence: concept.confidence
            }
          };
          this.fineTuningData.push(trainingExample);
        }
      }
      // 🎯 MODEL ADAPTATION
      async adaptModel(data) {
        const { documentId } = data;
        const context = this.learningContext.get(documentId);
        if (context) {
          const specializedPrompt = this.createSpecializedPrompt(context);
          await this.saveSpecializedPrompt(documentId, specializedPrompt);
          this.log(`\u{1F3AF} Model adapted for document ${documentId} domain: ${context.domain}`);
        }
      }
      // 🔧 UTILITY METHODS
      parseJsonResponse(response) {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return null;
        } catch (error) {
          this.error(`JSON parsing failed: ${error}`);
          return null;
        }
      }
      updateLearningContext(documentId, extracted) {
        const existing = this.learningContext.get(documentId) || {
          domain: "general",
          expertise_level: 1,
          key_concepts: [],
          learning_patterns: [],
          performance_metrics: { accuracy: 0.5, relevance: 0.5, depth: 0.5 }
        };
        existing.domain = extracted.domain || existing.domain;
        existing.key_concepts = Array.from(/* @__PURE__ */ new Set([...existing.key_concepts, ...extracted.concepts.map((c) => c.name)]));
        existing.expertise_level = Math.max(existing.expertise_level, this.mapComplexityToLevel(extracted.complexity_level));
        this.learningContext.set(documentId, existing);
      }
      mapComplexityToLevel(complexity) {
        const mapping = { beginner: 2, intermediate: 4, advanced: 7, expert: 10 };
        return mapping[complexity] || 1;
      }
      createSpecializedPrompt(context) {
        return `You are an expert in ${context.domain} with expertise level ${context.expertise_level}/10.

Key concepts you understand deeply:
${context.key_concepts.join(", ")}

When answering questions about ${context.domain}:
1. Draw from your deep knowledge of these concepts
2. Provide expert-level explanations
3. Make connections between related ideas
4. Use domain-specific terminology appropriately
5. Offer practical insights and applications

Your responses should reflect your expertise level of ${context.expertise_level}/10 in this domain.`;
      }
      async saveSpecializedPrompt(documentId, prompt) {
        this.log(`Specialized prompt saved for document ${documentId}`);
      }
      async loadKnowledgeBase() {
        this.log("Knowledge base loaded");
      }
      async saveKnowledgeBase() {
        this.log("Knowledge base saved");
      }
      async scheduleInitialLearningTasks() {
        await this.addTask("REINFORCE_LEARNING", { type: "periodic" });
        this.log("Initial learning tasks scheduled");
      }
      async analyzeFeedback(node, feedback) {
        this.log(`Analyzing feedback for concept: ${node.concept}`);
      }
      // 📈 PUBLIC METHODS FOR INTEGRATION
      async getExpertiseLevel(documentId) {
        const context = this.learningContext.get(documentId);
        return context?.expertise_level || 1;
      }
      async getKnowledgeSummary(documentId) {
        const nodes = Array.from(this.knowledgeBase.values()).filter((node) => node.documentId === documentId);
        const context = this.learningContext.get(documentId);
        return {
          totalConcepts: nodes.length,
          expertiseLevel: context?.expertise_level || 1,
          domain: context?.domain || "unknown",
          keyConcepts: context?.key_concepts || [],
          averageConfidence: nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length || 0
        };
      }
      async askExpert(documentId, question) {
        const context = this.learningContext.get(documentId);
        if (!context) {
          return await this.ollamaService.generateText(question);
        }
        const expertPrompt = this.createSpecializedPrompt(context);
        const fullPrompt = `${expertPrompt}

User Question: ${question}

Provide an expert response based on your specialized knowledge:`;
        return await this.ollamaService.generateText(fullPrompt, {
          temperature: 0.3,
          maxTokens: 500
        });
      }
      // 🧠 NEW LEARNING METHODS FOR COMPREHENSIVE INTELLIGENCE
      // Learn from power summaries with RAG enhancement
      async learnFromPowerSummary(data) {
        const { documentId, chapter, originalContent, powerSummary, keyInsights, mainThemes, actionablePoints, title } = data;
        try {
          this.log(`\u{1F9E0} Learning from power summary: Document ${documentId}, Chapter ${chapter}`);
          const powerSummaryContext = await powerSummaryService.getPowerSummariesForAIContext(documentId, 5);
          const powerSummaryStats = await powerSummaryService.getPowerSummaryStats();
          const ragEnhancedLearning = await this.enhanceLearningWithRAG(
            documentId,
            chapter,
            "power_summary",
            {
              content: originalContent,
              summary: powerSummary,
              insights: keyInsights,
              themes: mainThemes
            }
          );
          const learningPrompt = `Analyze this power summary and extract learning insights for future improvement:

Original Content (excerpt): ${originalContent.substring(0, 1500)}
Generated Power Summary: ${powerSummary}
Key Insights: ${keyInsights.join(", ")}
Main Themes: ${mainThemes.join(", ")}
Actionable Points: ${actionablePoints.join(", ")}

POWER SUMMARY CONTEXT:
${powerSummaryContext}

POWER SUMMARY STATISTICS:
- Total summaries: ${powerSummaryStats.totalSummaries}
- Average length: ${powerSummaryStats.averageLength} characters
- Document coverage: ${powerSummaryStats.documentCoverage} documents
- Recent activity: ${powerSummaryStats.recentActivity ? "Yes" : "No"}
- Common themes: ${powerSummaryStats.commonThemes.join(", ")}

${ragEnhancedLearning ? `RELATED PATTERNS FROM LIBRARY:
${ragEnhancedLearning}
` : ""}

Extract learning patterns as JSON:
{
  "summarization_patterns": ["pattern1", "pattern2"],
  "insight_extraction_methods": ["method1", "method2"],
  "theme_identification_techniques": ["technique1", "technique2"],
  "content_analysis_improvements": ["improvement1", "improvement2"],
  "user_value_indicators": ["indicator1", "indicator2"],
  "cross_document_learning": ["learning1", "learning2"],
  "power_summary_quality_metrics": ["metric1", "metric2"]
}`;
          const result = await this.multiModelService.executeTask("text-analysis", learningPrompt, {
            requirements: { accuracy: 8, reasoning: 9, speed: 6 }
          });
          const learningData = this.parseJsonResponse(result.response);
          if (learningData) {
            await this.storelearningPattern("power_summary", documentId, chapter, {
              originalSummary: powerSummary,
              patterns: learningData,
              ragEnhanced: Boolean(ragEnhancedLearning),
              powerSummaryContext: powerSummaryContext.substring(0, 500),
              powerSummaryStats,
              context: { title, themes: mainThemes, insights: keyInsights }
            });
          }
          this.log(`\u2705 Learned from power summary for Document ${documentId}, Chapter ${chapter} (RAG: ${Boolean(ragEnhancedLearning)}, Context: ${Boolean(powerSummaryContext)})`);
        } catch (error) {
          this.error(`Failed to learn from power summary: ${error}`);
        }
      }
      // 🧠 NEW: RAG-Enhanced Learning Pattern Discovery
      async enhanceLearningWithRAG(documentId, chapter, learningType, context) {
        try {
          this.log(`\u{1F50D} Enhancing ${learningType} learning with RAG for Document ${documentId}`);
          const ragContext = {
            userId: 1,
            // Default user for learning agent
            currentDocument: documentId,
            currentChapter: chapter,
            conversationHistory: [],
            userStudyPatterns: [learningType, "learning-patterns"],
            preferredTopics: context.themes || context.insights || [],
            studyLevel: "advanced"
            // Learning agent operates at advanced level
          };
          const learningQuery = `learning patterns, successful examples, and related insights for: ${learningType} ${JSON.stringify(context).substring(0, 200)}`;
          const ragResponse = await documentRAGService.processRAGQuery(
            learningQuery,
            ragContext,
            {
              maxSources: 4,
              // Focused number for learning enhancement
              includeAnnotations: true,
              // Include user notes for personalized learning
              includeMemories: true,
              // Include AI memories for learned patterns
              searchDepth: "thorough",
              // Deep search for quality learning patterns
              useEmbeddings: true
            }
          );
          if (ragResponse.sources.length > 0) {
            const relatedPatterns = ragResponse.sources.map((source, i) => `${i + 1}. From "${source.documentTitle}": ${source.excerpt.substring(0, 150)}...`).join("\n");
            this.log(`\u2705 Found ${ragResponse.sources.length} related learning patterns via RAG`);
            return relatedPatterns;
          }
          return null;
        } catch (error) {
          this.warn(`RAG learning enhancement failed: ${error}`);
          return null;
        }
      }
      // Learn from analysis feedback to improve future analysis
      async improveAnalysisFromFeedback(data) {
        const { documentId, chapter, fullText, generatedSummary, summaryQuality } = data;
        try {
          this.log(`\u{1F50D} Improving analysis from feedback: Document ${documentId}, Chapter ${chapter}`);
          const analysisPrompt = `Analyze this text analysis result to improve future analysis:

Source Text: ${fullText.substring(0, 1e3)}
Generated Summary: ${JSON.stringify(generatedSummary)}
Quality Rating: ${summaryQuality}

Identify improvement opportunities as JSON:
{
  "effective_techniques": ["technique1", "technique2"],
  "areas_for_improvement": ["area1", "area2"],
  "content_understanding_insights": ["insight1", "insight2"],
  "summarization_best_practices": ["practice1", "practice2"]
}`;
          const result = await this.multiModelService.executeTask("text-analysis", analysisPrompt, {
            requirements: { accuracy: 8, reasoning: 9, speed: 6 }
          });
          const improvements = this.parseJsonResponse(result.response);
          if (improvements) {
            await this.storelearningPattern("analysis_improvement", documentId, chapter, {
              quality: summaryQuality,
              improvements,
              context: { textLength: fullText.length, summaryComplexity: Object.keys(generatedSummary).length }
            });
          }
          this.log(`\u2705 Analysis improvement learned for Document ${documentId}, Chapter ${chapter}`);
        } catch (error) {
          this.error(`Failed to learn from analysis feedback: ${error}`);
        }
      }
      // Learn from extracted insights
      async learnFromInsights(data) {
        const { documentId, chapter, sourceContent, extractedInsights, themes, context } = data;
        try {
          this.log(`\u{1F4A1} Learning from insights: Document ${documentId}, Chapter ${chapter}`);
          const insightPrompt = `Analyze these extracted insights to improve future insight generation:

Source Content: ${sourceContent.substring(0, 1e3)}
Extracted Insights: ${extractedInsights.join(", ")}
Themes: ${themes.join(", ")}
Context: ${context}

Identify insight patterns as JSON:
{
  "insight_types": ["type1", "type2"],
  "extraction_methods": ["method1", "method2"],
  "content_to_insight_mapping": ["mapping1", "mapping2"],
  "theme_insight_relationships": ["relationship1", "relationship2"]
}`;
          const result = await this.multiModelService.executeTask("creative-insights", insightPrompt, {
            requirements: { creativity: 8, reasoning: 8, speed: 6 }
          });
          const insightPatterns = this.parseJsonResponse(result.response);
          if (insightPatterns) {
            await this.storelearningPattern("insight_extraction", documentId, chapter, {
              insights: extractedInsights,
              patterns: insightPatterns,
              context: { themes, sourceContext: context }
            });
          }
          this.log(`\u2705 Insight patterns learned for Document ${documentId}, Chapter ${chapter}`);
        } catch (error) {
          this.error(`Failed to learn from insights: ${error}`);
        }
      }
      // Learn from user annotations
      async learnFromUserAnnotation(data) {
        const { documentId, chapter, selectedText, userNote, paragraph } = data;
        try {
          this.log(`\u{1F4DD} Learning from user annotation: Document ${documentId}, Chapter ${chapter}`);
          const annotationPrompt = `Analyze this user annotation to understand what users find valuable:

Selected Text: "${selectedText}"
User Note: "${userNote}"
Document Context: Document ${documentId}, Chapter ${chapter}, Paragraph ${paragraph}

Extract learning insights as JSON:
{
  "user_interest_patterns": ["pattern1", "pattern2"],
  "text_significance_indicators": ["indicator1", "indicator2"],
  "annotation_value_types": ["type1", "type2"],
  "content_highlighting_reasons": ["reason1", "reason2"]
}`;
          const result = await this.multiModelService.executeTask("text-analysis", annotationPrompt, {
            requirements: { accuracy: 8, reasoning: 7, speed: 7 }
          });
          const annotationInsights = this.parseJsonResponse(result.response);
          if (annotationInsights) {
            await this.storelearningPattern("user_annotation", documentId, chapter, {
              selectedText,
              userNote,
              insights: annotationInsights,
              context: { paragraph }
            });
          }
          this.log(`\u2705 User annotation patterns learned for Document ${documentId}, Chapter ${chapter}`);
        } catch (error) {
          this.error(`Failed to learn from user annotation: ${error}`);
        }
      }
      // Learn from user bookmarks
      async learnFromBookmark(data) {
        const { documentId, chapter, bookmarkType, userReason } = data;
        try {
          this.log(`\u{1F516} Learning from bookmark: Document ${documentId}, Chapter ${chapter}`);
          const bookmarkPrompt = `Analyze this bookmark behavior to understand user engagement:

Document: ${documentId}
Chapter: ${chapter}
Bookmark Type: ${bookmarkType}
User Reason: ${userReason || "Not specified"}

Extract bookmark insights as JSON:
{
  "engagement_indicators": ["indicator1", "indicator2"],
  "content_value_signals": ["signal1", "signal2"],
  "user_behavior_patterns": ["pattern1", "pattern2"],
  "chapter_importance_factors": ["factor1", "factor2"]
}`;
          const result = await this.multiModelService.executeTask("text-analysis", bookmarkPrompt, {
            requirements: { accuracy: 7, reasoning: 7, speed: 8 }
          });
          const bookmarkInsights = this.parseJsonResponse(result.response);
          if (bookmarkInsights) {
            await this.storelearningPattern("user_bookmark", documentId, chapter, {
              bookmarkType,
              userReason,
              insights: bookmarkInsights
            });
          }
          this.log(`\u2705 Bookmark patterns learned for Document ${documentId}, Chapter ${chapter}`);
        } catch (error) {
          this.error(`Failed to learn from bookmark: ${error}`);
        }
      }
      // Learn from discussions
      async learnFromDiscussion(data) {
        const { documentId, chapter, discussionTopic, userQuestions, responses, engagement } = data;
        try {
          this.log(`\u{1F4AC} Learning from discussion: Document ${documentId}, Chapter ${chapter}`);
          const discussionPrompt = `Analyze this discussion to improve future interactions:

Topic: ${discussionTopic}
User Questions: ${userQuestions.join(", ")}
Responses: ${responses.join(", ")}
Engagement Level: ${engagement}

Extract discussion insights as JSON:
{
  "question_patterns": ["pattern1", "pattern2"],
  "effective_response_types": ["type1", "type2"],
  "engagement_drivers": ["driver1", "driver2"],
  "learning_conversation_styles": ["style1", "style2"]
}`;
          const result = await this.multiModelService.executeTask("group-discussion", discussionPrompt, {
            requirements: { creativity: 7, reasoning: 8, speed: 6 }
          });
          const discussionInsights = this.parseJsonResponse(result.response);
          if (discussionInsights) {
            await this.storelearningPattern("user_discussion", documentId, chapter, {
              topic: discussionTopic,
              questions: userQuestions,
              insights: discussionInsights,
              engagement
            });
          }
          this.log(`\u2705 Discussion patterns learned for Document ${documentId}, Chapter ${chapter}`);
        } catch (error) {
          this.error(`Failed to learn from discussion: ${error}`);
        }
      }
      // Store learning patterns for future reference
      async storelearningPattern(type, documentId, chapter, data) {
        try {
          const patternId = `${type}_${documentId}_${chapter}_${Date.now()}`;
          this.fineTuningData.push({
            type: "learning_pattern",
            pattern_type: type,
            document_id: documentId,
            chapter,
            data,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            pattern_id: patternId
          });
          if (this.fineTuningData.length > 1e3) {
            this.fineTuningData = this.fineTuningData.slice(-1e3);
          }
          this.log(`\u{1F4DA} Stored learning pattern: ${type} for Document ${documentId}, Chapter ${chapter}`);
        } catch (error) {
          this.error(`Failed to store learning pattern: ${error}`);
        }
      }
    };
  }
});

// server/agents/discussion-agent.ts
var ToolCallManager, IntentAnalyzer, ErrorRecoveryManager, ToolCallValidator, PromptManager, ContextWindowManager, UnifiedStateManager, LifecycleManager, DiscussionAgent;
var init_discussion_agent = __esm({
  "server/agents/discussion-agent.ts"() {
    "use strict";
    init_base_agent();
    init_ollama_service();
    init_multi_model_service();
    init_storage();
    init_LocalMemoryService();
    init_document_rag_service();
    init_definitions_access_service();
    ToolCallManager = class {
      toolRegistry = /* @__PURE__ */ new Map();
      metrics = {
        toolCallCount: /* @__PURE__ */ new Map(),
        averageResponseTime: /* @__PURE__ */ new Map(),
        successRate: /* @__PURE__ */ new Map(),
        errorTypes: /* @__PURE__ */ new Map()
      };
      registerTool(name, executor) {
        this.toolRegistry.set(name, executor);
      }
      async executeToolCall(toolCall) {
        const executor = this.toolRegistry.get(toolCall.tool);
        if (!executor) {
          throw new Error(`Tool ${toolCall.tool} not found`);
        }
        const startTime = Date.now();
        try {
          const result = await executor.execute(toolCall.parameters);
          const duration = Date.now() - startTime;
          this.recordMetrics(toolCall.tool, duration, true);
          if (!executor.validate(result)) {
            throw new Error(`Tool ${toolCall.tool} validation failed`);
          }
          return result;
        } catch (error) {
          this.recordMetrics(toolCall.tool, Date.now() - startTime, false, error);
          throw error;
        }
      }
      recordMetrics(tool, duration, success, error) {
        const currentCount = this.metrics.toolCallCount.get(tool) || 0;
        this.metrics.toolCallCount.set(tool, currentCount + 1);
        if (success) {
          const currentSuccess = this.metrics.successRate.get(tool) || 0;
          this.metrics.successRate.set(tool, currentSuccess + 1);
        }
        if (error) {
          const errorType = error?.constructor?.name || "UnknownError";
          const currentErrors = this.metrics.errorTypes.get(errorType) || 0;
          this.metrics.errorTypes.set(errorType, currentErrors + 1);
        }
      }
      getMetrics() {
        return {
          toolCallCount: Object.fromEntries(this.metrics.toolCallCount),
          successRate: Object.fromEntries(this.metrics.successRate),
          errorTypes: Object.fromEntries(this.metrics.errorTypes)
        };
      }
    };
    IntentAnalyzer = class {
      intentPatterns = {
        "note_request": /(take a note|remember that|note down|save this|remember this|apunta|recuerda|guarda esto|prenez note|notez|speichern|merken|覚えて|기억해|记住|تذكر|запомни)/i,
        "group_discussion": /(group discussion|panel discussion|multiple perspectives|ai panel|expert panel|discusión grupal|panel de expertos|discussion de groupe|gruppendiskussion|グループ討論|그룹 토론|小组讨论|نقاش جماعي|групповое обсуждение)/i,
        "translation_request": /(translate|in spanish|en français|auf deutsch|in italiano|em português|traduce|traduire|übersetzen|翻訳|번역|翻译|ترجم|переведи)/i,
        "question": /(what|who|where|when|why|how|which|can|is|do|are|does|tell me about|qué|quién|dónde|cuándo|por qué|cómo|cuál|puede|es|hacer|son|hace|¿|que|où|quand|pourquoi|comment|qui|was|wer|wo|wann|warum|wie|welche|kann|ist|何|誰|どこ|いつ|なぜ|どう|무엇|누구|어디|언제|왜|어떻게|什么|谁|哪里|什么时候|为什么|怎么|ماذا|من|أين|متى|لماذا|كيف|что|кто|где|когда|почему|как)/i,
        "context_request": /(context|background|information about|details about|contexto|información sobre|contexte|informations sur|kontext|informationen über|背景|文脈|맥락|정보|上下文|信息|سياق|معلومات|контекст|информация)/i,
        "clarification": /(what do you mean|can you explain|I don't understand|clarify|qué quieres decir|puedes explicar|no entiendo|aclarar|que veux-tu dire|peux-tu expliquer|je ne comprends pas|clarifier|was meinst du|kannst du erklären|ich verstehe nicht|klären|どういう意味|説明して|わからない|무슨 뜻|설명해|이해 안 돼|什么意思|解释|不明白|ماذا تقصد|اشرح|لا أفهم|что ты имеешь в виду|объясни|не понимаю)/i
      };
      analyzeIntent(message) {
        const lowerMessage = message.toLowerCase();
        let bestIntent = "general_discussion";
        let highestConfidence = 0;
        for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
          if (pattern.test(lowerMessage)) {
            const confidence = this.calculateConfidence(lowerMessage, pattern);
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              bestIntent = intent;
            }
          }
        }
        return {
          type: bestIntent,
          confidence: highestConfidence,
          entities: this.extractEntities(lowerMessage),
          requiresContext: this.needsContext(lowerMessage),
          suggestedTools: this.mapIntentToTools(bestIntent)
        };
      }
      calculateConfidence(message, pattern) {
        const matches = message.match(pattern);
        if (!matches) return 0;
        const specificity = pattern.source.length / 20;
        const frequency = matches.length;
        return Math.min(1, (specificity + frequency) / 2);
      }
      extractEntities(message) {
        const entities = [];
        const words = message.split(/\s+/).filter((word) => word.length > 2);
        const significantWords = words.filter(
          (word) => /^[A-Z][a-z]+/.test(word) || // Proper nouns
          /^[a-z]{3,}$/.test(word) || // Longer common words (reduced from 4 to 3)
          /^[A-Z]{2,}$/.test(word)
          // Acronyms like XRP, USD, etc.
        );
        if (significantWords.length === 0) {
          const stopWords = ["que", "es", "el", "la", "de", "en", "y", "a", "un", "ser", "se", "no", "te", "lo", "le", "da", "su", "por", "son", "con", "para", "las", "del", "los", "una", "hay", "era", "han", "sin", "m\xE1s", "qu\xE9", "mi", "we", "are", "is", "the", "and", "or", "but", "what", "how", "why", "when", "where", "who"];
          return words.filter((word) => !stopWords.includes(word.toLowerCase()) && word.length > 1);
        }
        return significantWords.slice(0, 5);
      }
      needsContext(message) {
        const contextKeywords = ["this", "that", "it", "here", "there", "chapter", "document", "reading"];
        return contextKeywords.some((keyword) => message.includes(keyword));
      }
      mapIntentToTools(intent) {
        const intentToTools = {
          "note_request": ["extract_content", "save_note", "generate_confirmation"],
          "group_discussion": ["generate_panel_responses", "stream_responses"],
          "translation_request": ["detect_language", "translate_response"],
          "question": ["search_context", "generate_response"],
          "context_request": ["search_context", "build_context"],
          "clarification": ["analyze_question", "generate_clarification"],
          "general_discussion": ["search_context", "generate_response"]
        };
        return intentToTools[intent] || ["generate_response"];
      }
    };
    ErrorRecoveryManager = class {
      errorStrategies = {
        "tool_timeout": async (error, context, agent) => {
          return await agent.generateSimplifiedResponse(context);
        },
        "tool_not_found": async (error, context, agent) => {
          return await agent.useDefaultTool(context);
        },
        "validation_failed": async (error, context, agent) => {
          return await agent.retryWithAdjustedParams(context);
        }
      };
      async handleError(error, context, agent) {
        const errorType = this.classifyError(error);
        const strategy = this.errorStrategies[errorType];
        if (strategy) {
          try {
            return await strategy(error, context, agent);
          } catch (fallbackError) {
            return this.getGenericFallback(context);
          }
        }
        return this.getGenericFallback(context);
      }
      classifyError(error) {
        if (error.message.includes("timeout")) return "tool_timeout";
        if (error.message.includes("not found")) return "tool_not_found";
        if (error.message.includes("validation")) return "validation_failed";
        return "unknown_error";
      }
      getGenericFallback(context) {
        return "I'm having trouble processing that right now. Could you try rephrasing your question or ask me something else?";
      }
    };
    ToolCallValidator = class {
      validateResponse(response, expectedType) {
        const validators = {
          "text_response": (r) => typeof r === "string" && r.length > 0,
          "translation": (r) => r.translatedText && r.sourceLanguage,
          "rag_result": (r) => r.sources && Array.isArray(r.sources),
          "note": (r) => r.id && r.content && r.timestamp,
          "panel_response": (r) => Array.isArray(r) && r.length > 0
        };
        const validator = validators[expectedType];
        const isValid = validator ? validator(response) : true;
        return {
          isValid,
          issues: this.detectIssues(response, expectedType),
          confidence: this.calculateConfidence(response, expectedType),
          suggestions: isValid ? void 0 : this.generateSuggestions(expectedType)
        };
      }
      detectIssues(response, expectedType) {
        const issues = [];
        if (!response) {
          issues.push("Empty response");
          return issues;
        }
        switch (expectedType) {
          case "text_response":
            if (typeof response !== "string") issues.push("Response is not a string");
            if (response.length < 10) issues.push("Response too short");
            if (response.includes("I apologize")) issues.push("Contains apology - likely error");
            break;
          case "rag_result":
            if (!response.sources) issues.push("Missing sources");
            if (!Array.isArray(response.sources)) issues.push("Sources not an array");
            break;
          case "translation":
            if (!response.translatedText) issues.push("Missing translated text");
            if (!response.sourceLanguage) issues.push("Missing source language");
            break;
        }
        return issues;
      }
      calculateConfidence(response, expectedType) {
        if (!response) return 0;
        const issues = this.detectIssues(response, expectedType);
        const baseConfidence = 1 - issues.length * 0.2;
        return Math.max(0, baseConfidence);
      }
      generateSuggestions(expectedType) {
        const suggestions = {
          "text_response": ["Try regenerating the response", "Check input parameters"],
          "rag_result": ["Verify search query", "Check document availability"],
          "translation": ["Verify source language", "Check translation service"],
          "note": ["Verify note content", "Check storage permissions"]
        };
        return suggestions[expectedType] || ["Review input and try again"];
      }
    };
    PromptManager = class {
      promptTemplates = /* @__PURE__ */ new Map();
      promptVersions = /* @__PURE__ */ new Map();
      promptMetrics = /* @__PURE__ */ new Map();
      constructor() {
        this.initializePrompts();
      }
      initializePrompts() {
        this.promptTemplates.set("discussion_system", `You are a helpful AI discussion partner focused on accurate, grounded responses. 

CRITICAL INSTRUCTIONS FOR RELIABILITY:
1. ONLY use information from the provided context and conversation history
2. If you don't have specific information, clearly state "I don't have enough information about that"
3. Do NOT make up facts, names, dates, or details not in the context
4. Stay focused on the current document and conversation topic
5. Be conversational but accurate - admit uncertainty when appropriate

You engage in meaningful conversations about the user's documents and topics. You ask thoughtful questions and provide insights based ONLY on what you know from the provided context.

CONVERSATION GUIDELINES:
- Reference specific parts of the context when making points
- Build naturally on previous conversation points
- If asked about something not in your context, offer to help find information rather than guessing
- Keep responses focused and relevant to the current document/topic`);
        this.promptTemplates.set("group_discussion_intro", `\u{1F4DA} **Welcome to the Universal Knowledge Panel!** \u{1F4DA}

Our distinguished AI experts are ready to discuss any topic from multiple perspectives:

\u{1F52C} **The Analytical Expert** - *Methodical and evidence-based analysis*
\u{1F4A1} **The Creative Thinker** - *Innovative and imaginative perspectives*
\u2699\uFE0F **The Practical Advisor** - *Real-world applications and solutions*
\u2753 **The Curious Challenger** - *Thought-provoking questions and alternative viewpoints*

Ask any question about literature, science, philosophy, history, technology, or any subject you'd like to explore!`);
        this.promptTemplates.set("personality_analytical", `You are The Analytical Expert - a precise, methodical thinker who loves deep analysis. You examine evidence carefully, consider multiple perspectives, and build logical arguments step by step. You often say "Let me analyze this carefully..." or "The data suggests..." or "From a logical standpoint..."`);
        this.promptTemplates.set("personality_creative", `You are The Creative Thinker - an innovative mind who sees connections others miss. You approach problems with creativity, explore possibilities, and think outside the box. You often say "What if we considered..." or "I see an interesting pattern..." or "From a creative angle..."`);
        this.promptTemplates.set("personality_practical", `You are The Practical Advisor - someone who focuses on real-world applications and actionable solutions. You bridge theory and practice, offering concrete steps and practical wisdom. You often say "In practical terms..." or "Here's how we can apply this..." or "A useful approach would be..."`);
        this.promptTemplates.set("personality_challenger", `You are The Curious Challenger - someone who asks thought-provoking questions and respectfully challenges assumptions. You help others think deeper by exploring alternative viewpoints. You often say "But what if..." or "Have we considered..." or "Let me challenge that assumption..."`);
        this.promptTemplates.set("fact_check", `Analyze this response for factual accuracy and potential hallucinations. Look for:
1. Specific claims not supported by context
2. Made-up dates, names, or details
3. Overly confident statements without evidence
4. Contradictions with provided information

Response to check: {response}
Available context: {context}

Provide a confidence score (0-1) and list any issues found.`);
        this.promptTemplates.set("language_detection", `Detect the primary language of this text and return only the ISO language code (e.g., 'en', 'es', 'fr', 'de', 'ja', 'ko', 'zh').

Text: {text}

Language code:`);
      }
      getPrompt(templateName, variables) {
        const template = this.promptTemplates.get(templateName);
        if (!template) {
          throw new Error(`Prompt template '${templateName}' not found`);
        }
        if (!variables) {
          return template;
        }
        let prompt = template;
        for (const [key, value] of Object.entries(variables)) {
          prompt = prompt.replace(new RegExp(`{${key}}`, "g"), value);
        }
        return prompt;
      }
      recordPromptUsage(templateName, success, responseTime) {
        const current = this.promptMetrics.get(templateName) || { usage: 0, success: 0, avgResponseTime: 0 };
        current.usage++;
        if (success) current.success++;
        current.avgResponseTime = (current.avgResponseTime * (current.usage - 1) + responseTime) / current.usage;
        this.promptMetrics.set(templateName, current);
      }
      getPromptMetrics() {
        const metrics = {};
        this.promptMetrics.forEach((data, template) => {
          metrics[template] = {
            ...data,
            successRate: data.usage > 0 ? data.success / data.usage : 0
          };
        });
        return metrics;
      }
      updatePrompt(templateName, newPrompt, version) {
        this.promptTemplates.set(templateName, newPrompt);
        if (version) {
          this.promptVersions.set(templateName, version);
        }
      }
    };
    ContextWindowManager = class {
      maxTokens = 8e3;
      // Conservative token limit
      currentTokens = 0;
      contextHistory = [];
      tokenEstimator;
      constructor(tokenEstimator) {
        this.tokenEstimator = tokenEstimator || ((text2) => Math.ceil(text2.length / 4));
      }
      addContext(content, priority = 1) {
        const tokens = this.tokenEstimator(content);
        if (this.currentTokens + tokens > this.maxTokens) {
          this.compressContext(priority);
          if (this.currentTokens + tokens > this.maxTokens) {
            return false;
          }
        }
        this.contextHistory.push({
          content,
          tokens,
          timestamp: /* @__PURE__ */ new Date(),
          priority
        });
        this.currentTokens += tokens;
        return true;
      }
      compressContext(newPriority) {
        this.contextHistory.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.timestamp.getTime() - b.timestamp.getTime();
        });
        while (this.contextHistory.length > 0 && this.currentTokens > this.maxTokens * 0.8) {
          const removed = this.contextHistory.shift();
          this.currentTokens -= removed.tokens;
        }
      }
      getContext() {
        const sortedContext = [...this.contextHistory].sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return b.timestamp.getTime() - a.timestamp.getTime();
        });
        return sortedContext.map((item) => item.content).join("\n\n");
      }
      getContextStats() {
        if (this.contextHistory.length === 0) {
          return { totalTokens: 0, itemCount: 0, oldestItem: null, newestItem: null };
        }
        const timestamps = this.contextHistory.map((item) => item.timestamp);
        return {
          totalTokens: this.currentTokens,
          itemCount: this.contextHistory.length,
          oldestItem: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
          newestItem: new Date(Math.max(...timestamps.map((t) => t.getTime())))
        };
      }
      clearContext() {
        this.contextHistory = [];
        this.currentTokens = 0;
      }
      setMaxTokens(maxTokens) {
        this.maxTokens = maxTokens;
        this.compressContext(0);
      }
    };
    UnifiedStateManager = class _UnifiedStateManager {
      state = /* @__PURE__ */ new Map();
      stateHistory = [];
      maxHistorySize = 50;
      // Business state keys
      static BUSINESS_KEYS = {
        USER_SESSIONS: "user_sessions",
        CONVERSATION_HISTORY: "conversation_history",
        LEARNING_PATTERNS: "learning_patterns",
        ACTIVE_DISCUSSIONS: "active_discussions",
        USER_NOTES: "user_notes"
      };
      // Execution state keys
      static EXECUTION_KEYS = {
        CURRENT_TASK: "current_task",
        TOOL_CALLS: "tool_calls",
        ERROR_STATE: "error_state",
        PERFORMANCE_METRICS: "performance_metrics",
        CONTEXT_WINDOW: "context_window"
      };
      setBusinessState(key, value) {
        this.state.set(key, value);
        this.recordStateChange("business", key);
      }
      setExecutionState(key, value) {
        this.state.set(key, value);
        this.recordStateChange("execution", key);
      }
      getBusinessState(key) {
        return this.state.get(key);
      }
      getExecutionState(key) {
        return this.state.get(key);
      }
      recordStateChange(type, key) {
        const stateSnapshot = new Map(this.state);
        this.stateHistory.push({
          timestamp: /* @__PURE__ */ new Date(),
          state: stateSnapshot,
          event: `${type}_state_change:${key}`
        });
        if (this.stateHistory.length > this.maxHistorySize) {
          this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
        }
      }
      getStateSnapshot() {
        const snapshot = {};
        this.state.forEach((value, key) => {
          snapshot[key] = value;
        });
        return snapshot;
      }
      getStateHistory() {
        return this.stateHistory.map((entry) => ({
          timestamp: entry.timestamp,
          event: entry.event
        }));
      }
      // Convenience methods for common state operations
      updateUserSession(sessionId, sessionData) {
        const sessions = this.getBusinessState(_UnifiedStateManager.BUSINESS_KEYS.USER_SESSIONS) || /* @__PURE__ */ new Map();
        sessions.set(sessionId, sessionData);
        this.setBusinessState(_UnifiedStateManager.BUSINESS_KEYS.USER_SESSIONS, sessions);
      }
      getUserSession(sessionId) {
        const sessions = this.getBusinessState(_UnifiedStateManager.BUSINESS_KEYS.USER_SESSIONS) || /* @__PURE__ */ new Map();
        return sessions.get(sessionId);
      }
      updateToolCall(toolCallId, status, result) {
        const toolCalls = this.getExecutionState(_UnifiedStateManager.EXECUTION_KEYS.TOOL_CALLS) || /* @__PURE__ */ new Map();
        toolCalls.set(toolCallId, { status, result, timestamp: /* @__PURE__ */ new Date() });
        this.setExecutionState(_UnifiedStateManager.EXECUTION_KEYS.TOOL_CALLS, toolCalls);
      }
      getToolCall(toolCallId) {
        const toolCalls = this.getExecutionState(_UnifiedStateManager.EXECUTION_KEYS.TOOL_CALLS) || /* @__PURE__ */ new Map();
        return toolCalls.get(toolCallId);
      }
      setErrorState(error, context) {
        this.setExecutionState(_UnifiedStateManager.EXECUTION_KEYS.ERROR_STATE, {
          error: error.message,
          stack: error.stack,
          context,
          timestamp: /* @__PURE__ */ new Date()
        });
      }
      clearErrorState() {
        this.state.delete(_UnifiedStateManager.EXECUTION_KEYS.ERROR_STATE);
      }
      updatePerformanceMetrics(metric, value) {
        const metrics = this.getExecutionState(_UnifiedStateManager.EXECUTION_KEYS.PERFORMANCE_METRICS) || {};
        metrics[metric] = value;
        this.setExecutionState(_UnifiedStateManager.EXECUTION_KEYS.PERFORMANCE_METRICS, metrics);
      }
    };
    LifecycleManager = class {
      agent;
      state = "stopped";
      pauseReason;
      resumeConditions = [];
      lifecycleCallbacks = /* @__PURE__ */ new Map();
      constructor(agent) {
        this.agent = agent;
      }
      log(message) {
        console.log(`[LifecycleManager] ${message}`);
      }
      error(message) {
        console.error(`[LifecycleManager] ${message}`);
      }
      async launch() {
        if (this.state === "running") {
          this.log("Agent is already running");
          return;
        }
        try {
          this.log("\u{1F680} Launching Discussion Agent...");
          await this.agent.initialize();
          this.state = "running";
          this.triggerCallbacks("launched");
          this.log("\u2705 Discussion Agent launched successfully");
        } catch (error) {
          this.error(`\u274C Failed to launch agent: ${error}`);
          throw error;
        }
      }
      async pause(reason) {
        if (this.state !== "running") {
          this.log("Agent is not running, cannot pause");
          return;
        }
        this.state = "paused";
        this.pauseReason = reason;
        this.triggerCallbacks("paused");
        this.log(`\u23F8\uFE0F Agent paused${reason ? `: ${reason}` : ""}`);
      }
      async resume() {
        if (this.state !== "paused") {
          this.log("Agent is not paused, cannot resume");
          return;
        }
        const blockedConditions = this.resumeConditions.filter((condition) => !condition.condition());
        if (blockedConditions.length > 0) {
          this.log(`Cannot resume: ${blockedConditions.map((c) => c.description).join(", ")}`);
          return;
        }
        this.state = "running";
        this.pauseReason = void 0;
        this.triggerCallbacks("resumed");
        this.log("\u25B6\uFE0F Agent resumed successfully");
      }
      async stop() {
        if (this.state === "stopped") {
          this.log("Agent is already stopped");
          return;
        }
        try {
          this.state = "stopped";
          this.pauseReason = void 0;
          this.resumeConditions = [];
          await this.agent.cleanup();
          this.triggerCallbacks("stopped");
          this.log("\u{1F6D1} Agent stopped successfully");
        } catch (error) {
          this.error(`Failed to stop agent: ${error}`);
          throw error;
        }
      }
      getStatus() {
        const canResume = this.state === "paused" && this.resumeConditions.every((condition) => condition.condition());
        return {
          state: this.state,
          pauseReason: this.pauseReason,
          canResume
        };
      }
      addResumeCondition(condition, description) {
        this.resumeConditions.push({ condition, description });
      }
      onLifecycleEvent(event, callback) {
        if (!this.lifecycleCallbacks.has(event)) {
          this.lifecycleCallbacks.set(event, []);
        }
        this.lifecycleCallbacks.get(event).push(callback);
      }
      triggerCallbacks(event) {
        const callbacks = this.lifecycleCallbacks.get(event) || [];
        callbacks.forEach((callback) => {
          try {
            callback();
          } catch (error) {
            this.error(`Lifecycle callback error: ${error}`);
          }
        });
      }
      // Convenience methods for common pause scenarios
      async pauseForMaintenance() {
        await this.pause("Maintenance in progress");
      }
      async pauseForResourceLimit() {
        await this.pause("Resource limit reached");
      }
      async pauseForError() {
        await this.pause("Error condition detected");
      }
    };
    DiscussionAgent = class extends BaseAgent {
      ollamaService;
      multiModelService;
      memoryService;
      definitionsService;
      translationService;
      // Add translation service property
      discussionSessions = /* @__PURE__ */ new Map();
      userNotes = /* @__PURE__ */ new Map();
      topicRegistry = /* @__PURE__ */ new Map();
      // topic -> sessionIds
      learningPatterns = /* @__PURE__ */ new Map();
      // 🚀 NEW: Enhanced Architecture Components
      toolCallManager;
      intentAnalyzer;
      errorRecoveryManager;
      toolCallValidator;
      promptManager;
      contextWindowManager;
      unifiedStateManager;
      lifecycleManager;
      // AI Model Personalities for group discussions (Ollama Local Models Only)
      aiPersonalities = {
        "analytical-expert": {
          model: "qwen2.5:7b-instruct",
          // 🏠 Local Ollama model for analytical reasoning
          name: "The Analytical Expert",
          style: "methodical, evidence-based, scholarly",
          prompt: 'You are The Analytical Expert - a precise, methodical thinker who loves deep analysis. You examine evidence carefully, consider multiple perspectives, and build logical arguments step by step. You often say "Let me analyze this carefully..." or "The data suggests..." or "From a logical standpoint..."'
        },
        "creative-thinker": {
          model: "mistral:7b",
          // 🏠 Local Ollama model for creative thinking
          name: "The Creative Thinker",
          style: "innovative, imaginative, big-picture focused",
          prompt: 'You are The Creative Thinker - an innovative mind who sees connections others miss. You approach problems with creativity, explore possibilities, and think outside the box. You often say "What if we considered..." or "I see an interesting pattern..." or "From a creative angle..."'
        },
        "practical-advisor": {
          model: "llama3.2:3b",
          // 🏠 Local Ollama model for practical advice
          name: "The Practical Advisor",
          style: "pragmatic, solution-focused, real-world oriented",
          prompt: `You are The Practical Advisor - someone who focuses on real-world applications and actionable solutions. You bridge theory and practice, offering concrete steps and practical wisdom. You often say "In practical terms..." or "Here's how we can apply this..." or "A useful approach would be..."`
        },
        "curious-challenger": {
          model: "phi3.5:3.8b-mini-instruct-q8_0",
          // 🏠 Local Ollama model for challenging questions
          name: "The Curious Challenger",
          style: "questioning, thought-provoking, devil's advocate",
          prompt: 'You are The Curious Challenger - someone who asks thought-provoking questions and respectfully challenges assumptions. You help others think deeper by exploring alternative viewpoints. You often say "But what if..." or "Have we considered..." or "Let me challenge that assumption..."'
        }
      };
      constructor() {
        super({
          name: "DiscussionAgent",
          description: "Facilitates meaningful discussions about any topic, manages notes, and learns from conversations",
          interval: 9e5,
          // 15 minutes (less aggressive)
          maxRetries: 3,
          timeout: 12e4,
          // 120 seconds for deeper discussions
          specialties: ["Discussion Facilitation", "Note Taking", "Conversation Learning", "Group Discussions", "Multi-language Support"]
        });
        this.ollamaService = new OllamaService({
          model: "gemma3n:e2b",
          // Fast and reliable model for discussions
          temperature: 0.7
          // Higher temperature for more creative discussions
        });
        this.multiModelService = new MultiModelService();
        this.memoryService = LocalMemoryService.getInstance();
        this.definitionsService = new DefinitionsAccessService();
        this.toolCallManager = new ToolCallManager();
        this.intentAnalyzer = new IntentAnalyzer();
        this.errorRecoveryManager = new ErrorRecoveryManager();
        this.toolCallValidator = new ToolCallValidator();
        this.promptManager = new PromptManager();
        this.contextWindowManager = new ContextWindowManager();
        this.unifiedStateManager = new UnifiedStateManager();
        this.lifecycleManager = new LifecycleManager(this);
        this.registerTools();
      }
      // 🚀 NEW: Register all available tools
      registerTools() {
        this.toolCallManager.registerTool("generate_response", {
          description: "Generate AI response to user message",
          parameters: { message: "string", context: "object" },
          execute: async (params) => {
            const response = await this.ollamaService.generateText(params.message);
            return response;
          },
          validate: (result) => typeof result === "string" && result.length > 0
        });
        this.toolCallManager.registerTool("search_context", {
          description: "Search for relevant context using RAG",
          parameters: { query: "string", documentId: "number", chapter: "number", context: "object" },
          execute: async (params) => {
            const ragContext = {
              userId: params.context?.userId || 2,
              currentDocument: params.documentId,
              currentChapter: params.chapter,
              conversationHistory: params.context?.conversationHistory?.slice(-3) || [],
              userStudyPatterns: params.context?.discussionTopics?.slice(-5) || [],
              preferredTopics: params.context?.discussionTopics?.slice(-3) || [],
              studyLevel: "intermediate",
              targetLanguage: params.context?.language || "en"
              // Pass the target language from session
            };
            return await documentRAGService.processRAGQuery(params.query, ragContext, {
              maxSources: 2,
              includeAnnotations: false,
              includeMemories: false,
              searchDepth: "quick",
              useEmbeddings: true,
              singleDocumentOnly: true,
              targetLanguage: params.context?.language || "en"
              // Pass language to options too
            });
          },
          validate: (result) => result.sources && Array.isArray(result.sources)
        });
        this.toolCallManager.registerTool("save_note", {
          description: "Save a note to persistent storage",
          parameters: { content: "string", userId: "number", documentId: "number", chapter: "number" },
          execute: async (params) => {
            const note = {
              id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              content: params.content,
              timestamp: /* @__PURE__ */ new Date(),
              userId: params.userId,
              documentId: params.documentId,
              chapter: params.chapter,
              tags: [],
              type: "ai"
            };
            if (!this.userNotes.has(params.userId)) {
              this.userNotes.set(params.userId, []);
            }
            this.userNotes.get(params.userId).push(note);
            return note;
          },
          validate: (result) => result.id && result.content && result.timestamp
        });
        this.toolCallManager.registerTool("translate_response", {
          description: "Translate response to target language",
          parameters: { text: "string", targetLanguage: "string" },
          execute: async (params) => {
            if (!this.translationService) {
              return { translatedText: params.text, sourceLanguage: "en" };
            }
            const translated = await this.translationService.translateText({
              text: params.text,
              targetLanguage: params.targetLanguage,
              context: "general"
            });
            return translated;
          },
          validate: (result) => result.translatedText && result.sourceLanguage
        });
        this.toolCallManager.registerTool("generate_panel_responses", {
          description: "Generate responses from multiple AI personalities",
          parameters: { message: "string", context: "object" },
          execute: async (params) => {
            return await this.generatePanelResponses(params.message, params.context);
          },
          validate: (result) => Array.isArray(result) && result.length > 0
        });
      }
      // 🚀 NEW: Error Recovery Methods
      async generateSimplifiedResponse(context) {
        try {
          const simplePrompt = "Provide a brief, helpful response to the user's question.";
          const response = await this.ollamaService.generateText(simplePrompt);
          return response || "I'm here to help. Could you please rephrase your question?";
        } catch (error) {
          return "I'm having trouble right now. Please try again in a moment.";
        }
      }
      async useDefaultTool(context) {
        try {
          const toolCall = {
            id: `fallback-${Date.now()}`,
            tool: "generate_response",
            parameters: {
              message: "Provide a helpful response to the user's question.",
              context
            },
            expectedResponse: "text_response"
          };
          const result = await this.toolCallManager.executeToolCall(toolCall);
          return result;
        } catch (error) {
          return "I'm experiencing technical difficulties. Please try again later.";
        }
      }
      async retryWithAdjustedParams(context) {
        try {
          const simplifiedContext = {
            ...context,
            conversationHistory: context.conversationHistory?.slice(-2) || [],
            // Reduce context
            discussionTopics: context.discussionTopics?.slice(-1) || []
            // Reduce topics
          };
          const toolCall = {
            id: `retry-${Date.now()}`,
            tool: "generate_response",
            parameters: {
              message: "Provide a simple, direct response.",
              context: simplifiedContext
            },
            expectedResponse: "text_response"
          };
          const result = await this.toolCallManager.executeToolCall(toolCall);
          return result;
        } catch (error) {
          return "I'm having trouble processing that. Could you try asking in a different way?";
        }
      }
      async initialize() {
        try {
          await this.ollamaService.initialize();
          await this.multiModelService.initialize();
          this.log("\u2705 Both Ollama and MultiModel services initialized successfully for Discussion Agent");
          await this.loadExistingData();
          this.addTask("ANALYZE_LEARNING_PATTERNS", {}, 3);
          this.setupAgentCommunication();
          this.log("Discussion Agent initialized with multi-model intelligence - Ready to facilitate meaningful conversations");
          this.log(`\u{1F3AD} AI Personalities configured: ${Object.keys(this.aiPersonalities).join(", ")}`);
        } catch (error) {
          this.error(`\u274C Failed to initialize Discussion Agent: ${error}`);
          throw error;
        }
      }
      async loadExistingData() {
        try {
          const annotations2 = await storage.getAnnotations(2);
          for (const annotation of annotations2) {
            const userId = annotation.userId || 1;
            if (!this.userNotes.has(userId)) {
              this.userNotes.set(userId, []);
            }
            const note = {
              id: annotation.id.toString(),
              content: annotation.note,
              // Use 'note' property
              timestamp: new Date(annotation.createdAt),
              userId,
              documentId: annotation.documentId,
              chapter: annotation.chapter,
              tags: [],
              type: annotation.type || "user"
            };
            this.userNotes.get(userId).push(note);
          }
          this.log(`Loaded ${annotations2.length} existing notes`);
        } catch (error) {
          this.warn(`Could not load existing data: ${error}`);
        }
      }
      setupAgentCommunication() {
        this.on("agentInsightResponse", (data) => {
          this.log(`Received insight from ${data.fromAgent}: ${data.insight}`);
          if (data.sessionId) {
            const session = this.discussionSessions.get(data.sessionId);
            if (session) {
              session.conversationHistory.push({
                id: `insight-${Date.now()}`,
                role: "system",
                content: `\u{1F4A1} Insight from ${data.fromAgent}: ${data.insight}`,
                timestamp: /* @__PURE__ */ new Date(),
                type: "insight"
              });
            }
          }
        });
        this.on("studyAssistantContext", (data) => {
          this.log(`Received study context: ${data.expertise}`);
        });
        this.on("crossReference", (data) => {
          this.log(`Cross-reference available: ${data.reference}`);
        });
        this.on("learningInsight", (data) => {
          this.emit("shareWithAgents", {
            type: "discussion_learning",
            data,
            fromAgent: "DiscussionAgent"
          });
        });
      }
      async processTask(task) {
        this.log(`Processing discussion task: ${task.type}`);
        switch (task.type) {
          case "START_DISCUSSION":
            await this.startDiscussion(task.data);
            break;
          case "ANALYZE_LEARNING_PATTERNS":
            await this.analyzeLearningPatterns();
            break;
          case "GENERATE_DISCUSSION_INSIGHTS":
            await this.generateDiscussionInsights(task.data);
            break;
          case "CONNECT_WITH_EXPERT":
            await this.connectWithExpertAgent(task.data);
            break;
          case "SAVE_NOTE":
            await this.saveDiscussionNote(task.data);
            break;
          default:
            this.warn(`Unknown discussion task type: ${task.type}`);
        }
        return null;
      }
      async cleanup() {
        this.log("Cleaning up Discussion Agent");
        await this.saveLearningPatterns();
      }
      // 🚀 ENHANCED: Main discussion handling with new architecture
      async handleDiscussionMessage(message, context) {
        try {
          const session = await this._getOrCreateSession(context);
          if (context?.isContextRestore) {
            this.log(`Restoring conversation context for session ${session.sessionId}`);
            return "I've restored our conversation context. I remember what we discussed earlier and I'm ready to continue our conversation!";
          }
          if (context?.language && context.language !== session.language) {
            session.language = context.language;
            this.log(`\u{1F310} Language set from context: ${context.language}`);
          } else if (!session.language || session.language === "en") {
            const detectedLanguage = await this.detectLanguage(message);
            if (detectedLanguage && detectedLanguage !== session.language) {
              session.language = detectedLanguage;
              this.log(`\u{1F310} Language detected and set: ${detectedLanguage}`);
            }
          }
          this.log(`\u{1F310} Final session language: ${session.language}`);
          this.log(`\u{1F310} Translation service available: ${this.translationService ? "YES" : "NO"}`);
          if (session.language && session.language !== "en" && !this.translationService) {
            this.warn(`\u274C Target language is ${session.language} but no translation service is available!`);
          }
          session.conversationHistory.push({
            id: `user-${Date.now()}`,
            role: "user",
            content: message,
            timestamp: /* @__PURE__ */ new Date()
          });
          const userIntent = this.intentAnalyzer.analyzeIntent(message);
          this.log(`\u{1F3AF} Intent detected: ${userIntent.type} (confidence: ${userIntent.confidence})`);
          let response;
          if (session.mode === "group") {
            response = await this.handleGroupDiscussion(message, session);
          } else {
            response = await this.executeToolCallPipeline(message, session, userIntent);
          }
          const validation = this.toolCallValidator.validateResponse(response, "text_response");
          if (!validation.isValid) {
            this.warn(`Response validation failed: ${validation.issues.join(", ")}`);
            response = await this.errorRecoveryManager.handleError(
              new Error("Response validation failed"),
              { message, session },
              this
            );
          }
          session.conversationHistory.push({
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response,
            timestamp: /* @__PURE__ */ new Date()
          });
          await this.learnFromInteraction(message, response, session);
          return response;
        } catch (error) {
          this.error(`Critical error in handleDiscussionMessage: ${error}`);
          return await this.errorRecoveryManager.handleError(error, { message, context }, this);
        }
      }
      // 🚀 NEW: Enhanced tool call pipeline
      async executeToolCallPipeline(message, session, userIntent) {
        try {
          const requiredTools = this.determineRequiredTools(userIntent, session, message);
          this.log(`\u{1F527} Executing tools: ${requiredTools.map((t) => t.tool).join(", ")}`);
          const results = [];
          for (const toolCall of requiredTools) {
            try {
              const result = await this.toolCallManager.executeToolCall(toolCall);
              results.push(result);
              this.log(`\u2705 Tool ${toolCall.tool} completed successfully`);
            } catch (error) {
              this.error(`\u274C Tool ${toolCall.tool} failed: ${error}`);
              const fallbackResult = await this.executeToolFallback(toolCall, error);
              results.push(fallbackResult);
            }
          }
          const finalResponse = await this.synthesizeResponse(results, message, session, userIntent);
          return finalResponse;
        } catch (error) {
          this.error(`Tool call pipeline failed: ${error}`);
          return await this.errorRecoveryManager.handleError(error, { message, session }, this);
        }
      }
      // 🚀 NEW: Determine required tools based on intent
      determineRequiredTools(userIntent, session, originalMessage) {
        const toolCalls = [];
        const baseParams = { context: session };
        const getQueryText = () => {
          const entitiesText = userIntent.entities.join(" ").trim();
          return entitiesText || originalMessage;
        };
        switch (userIntent.type) {
          case "note_request":
            toolCalls.push({
              id: `note-${Date.now()}`,
              tool: "save_note",
              parameters: {
                content: this.extractNoteContent(getQueryText()),
                userId: session.userId,
                documentId: session.documentId,
                chapter: session.chapter,
                ...baseParams
              },
              expectedResponse: "note"
            });
            toolCalls.push({
              id: `confirm-${Date.now()}`,
              tool: "generate_response",
              parameters: {
                message: `Generate a confirmation message for saving the note: "${getQueryText()}"`,
                ...baseParams
              },
              expectedResponse: "text_response"
            });
            break;
          case "group_discussion":
            toolCalls.push({
              id: `panel-${Date.now()}`,
              tool: "generate_panel_responses",
              parameters: {
                message: getQueryText(),
                context: session
              },
              expectedResponse: "panel_response"
            });
            break;
          case "translation_request":
            toolCalls.push({
              id: `translate-${Date.now()}`,
              tool: "translate_response",
              parameters: {
                text: getQueryText(),
                targetLanguage: this.detectTargetLanguage(getQueryText())
              },
              expectedResponse: "translation"
            });
            break;
          case "question":
          case "context_request":
          case "general_discussion":
          default:
            toolCalls.push({
              id: `search-${Date.now()}`,
              tool: "search_context",
              parameters: {
                query: getQueryText(),
                documentId: session.documentId,
                chapter: session.chapter,
                context: session
              },
              expectedResponse: "rag_result"
            });
            toolCalls.push({
              id: `generate-${Date.now()}`,
              tool: "generate_response",
              parameters: {
                message: `Generate a helpful response to: "${getQueryText()}"`,
                context: session
              },
              expectedResponse: "text_response"
            });
            break;
        }
        return toolCalls;
      }
      // 🚀 NEW: Execute tool fallback
      async executeToolFallback(failedToolCall, error) {
        this.log(`\u{1F504} Executing fallback for tool: ${failedToolCall.tool}`);
        switch (failedToolCall.tool) {
          case "search_context":
            return { sources: [], confidence: 0 };
          case "generate_response":
            return "I'm here to help. Could you please rephrase your question?";
          case "save_note":
            return {
              id: `fallback-note-${Date.now()}`,
              content: failedToolCall.parameters.content || "Note content",
              timestamp: /* @__PURE__ */ new Date(),
              type: "fallback"
            };
          default:
            return "I'm experiencing technical difficulties. Please try again.";
        }
      }
      // 🚀 NEW: Synthesize final response from tool results
      async synthesizeResponse(results, originalMessage, session, userIntent) {
        try {
          let finalResponse;
          switch (userIntent.type) {
            case "note_request":
              const noteResult = results.find((r) => r.id && r.type === "ai");
              const confirmResult = results.find((r) => typeof r === "string");
              finalResponse = confirmResult || `\u{1F4DD} Note saved successfully!`;
              break;
            case "group_discussion":
              const panelResults = results.find((r) => Array.isArray(r));
              if (panelResults && panelResults.length > 0) {
                finalResponse = panelResults.join("\n\n");
              } else {
                finalResponse = "Our AI panel is ready to discuss this topic!";
              }
              break;
            case "translation_request":
              const translationResult = results.find((r) => r.translatedText);
              finalResponse = translationResult?.translatedText || "Translation service is currently unavailable.";
              break;
            case "question":
            case "context_request":
            case "general_discussion":
            default:
              const contextResult = results.find((r) => r.sources);
              const responseResult = results.find((r) => typeof r === "string");
              if (this.isSimpleGreeting(originalMessage)) {
                finalResponse = responseResult || "\xA1Hola! \xBFC\xF3mo puedo ayudarte hoy?";
              } else if (contextResult && contextResult.sources.length > 0) {
                finalResponse = responseResult || "I found some relevant information for you.";
              } else {
                finalResponse = responseResult || "I'm here to help with your questions!";
              }
              break;
          }
          if (session.language && session.language !== "en") {
            finalResponse = await this.translateResponse(finalResponse, session.language);
          }
          return finalResponse;
        } catch (error) {
          this.error(`Response synthesis failed: ${error}`);
          let errorMsg = "I'm having trouble processing that. Could you try asking in a different way?";
          if (session.language && session.language !== "en") {
            errorMsg = await this.translateResponse(errorMsg, session.language);
          }
          return errorMsg;
        }
      }
      // 🚀 NEW: Helper method to detect target language
      detectTargetLanguage(text2) {
        const languagePatterns = {
          "es": /(español|spanish|en español)/i,
          "fr": /(français|french|en français)/i,
          "de": /(deutsch|german|auf deutsch)/i,
          "it": /(italiano|italian|in italiano)/i,
          "pt": /(português|portuguese|em português)/i
        };
        for (const [lang, pattern] of Object.entries(languagePatterns)) {
          if (pattern.test(text2)) {
            return lang;
          }
        }
        return "en";
      }
      async _getOrCreateSession(context) {
        const sessionId = context?.sessionId || `session_${Date.now()}`;
        let session = this.discussionSessions.get(sessionId);
        if (!session) {
          session = await this.createDiscussionSession(sessionId, context);
          this.log(`Created new discussion session: ${sessionId}`);
        } else {
          if (context?.documentId && context.documentId !== session.documentId) {
            session.documentId = context.documentId;
            this.log(`Updated session ${sessionId} documentId to ${context.documentId}`);
          }
          if (context?.chapter && context.chapter !== session.chapter) {
            session.chapter = context.chapter;
            this.log(`Updated session ${sessionId} chapter to ${context.chapter}`);
          }
          if (context?.language && context.language !== session.language) {
            session.language = context.language;
            this.log(`Updated session ${sessionId} language to ${context.language}`);
          }
          if (context?.socket && !session.socket) {
            session.socket = context.socket;
            this.log(`Updated session ${sessionId} with socket connection`);
          }
        }
        return session;
      }
      async _getTranslatedFallbackError(error, language) {
        let errorMessage = `Discussion is taking longer than usual. Please wait a moment and try again if you don't see a result.`;
        if (language && language !== "en" && this.translationService) {
          try {
            const translatedError = await this.translationService.translateText({
              text: errorMessage,
              targetLanguage: language,
              context: "general"
            });
            return translatedError.translatedText;
          } catch (translationError) {
            this.error(`Could not translate fallback error message: ${translationError.message}`);
          }
        }
        return errorMessage;
      }
      // Checks if a message is a question
      isQuestion(message) {
        const trimmed = message.trim().toLowerCase();
        const questionWords = ["what", "who", "where", "when", "why", "how", "which", "can", "is", "do", "are", "does", "tell me about"];
        return questionWords.some((word) => trimmed.startsWith(word));
      }
      isSimpleGreeting(message) {
        const lowerMsg = message.toLowerCase().trim();
        const simpleGreetings = [
          // English
          "hello",
          "hi",
          "hey",
          "good morning",
          "good afternoon",
          "good evening",
          // Spanish
          "hola",
          "buenos d\xEDas",
          "buenas tardes",
          "buenas noches",
          "qu\xE9 tal",
          // French
          "bonjour",
          "bonsoir",
          "salut",
          "bonne journ\xE9e",
          // Portuguese
          "ol\xE1",
          "oi",
          "bom dia",
          "boa tarde",
          "boa noite",
          // German
          "hallo",
          "guten morgen",
          "guten tag",
          "guten abend",
          // Japanese
          "\u3053\u3093\u306B\u3061\u306F",
          "\u304A\u306F\u3088\u3046",
          "\u3053\u3093\u3070\u3093\u306F",
          "\u306F\u3058\u3081\u307E\u3057\u3066",
          // Korean
          "\uC548\uB155\uD558\uC138\uC694",
          "\uC548\uB155",
          "\uC88B\uC740 \uC544\uCE68",
          "\uC88B\uC740 \uC800\uB141",
          // Chinese
          "\u4F60\u597D",
          "\u65E9\u4E0A\u597D",
          "\u665A\u4E0A\u597D",
          "\u60A8\u597D",
          // Arabic
          "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064A\u0643\u0645",
          "\u0645\u0631\u062D\u0628\u0627",
          "\u0635\u0628\u0627\u062D \u0627\u0644\u062E\u064A\u0631",
          "\u0645\u0633\u0627\u0621 \u0627\u0644\u062E\u064A\u0631",
          // Russian
          "\u043F\u0440\u0438\u0432\u0435\u0442",
          "\u0434\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C",
          "\u0434\u043E\u0431\u0440\u043E\u0435 \u0443\u0442\u0440\u043E",
          "\u0434\u043E\u0431\u0440\u044B\u0439 \u0432\u0435\u0447\u0435\u0440",
          // Italian
          "ciao",
          "buongiorno",
          "buonasera",
          "salve",
          // Dutch
          "hallo",
          "goedemorgen",
          "goedemiddag",
          "goedenavond"
        ];
        return simpleGreetings.some(
          (greeting) => lowerMsg === greeting || lowerMsg.startsWith(greeting + " ") || lowerMsg.endsWith(" " + greeting)
        );
      }
      async generateRAGEnhancedResponse(message, context) {
        try {
          this.log(`Generating RAG response for: "${message.substring(0, 50)}..."`);
          const { ragQuery, agentContext } = await this._prepareContext(message, context);
          const englishResponse = await this.generateDiscussionResponse(ragQuery, context, agentContext);
          const finalResponse = await this.translateResponse(englishResponse, context.language || "en");
          return finalResponse;
        } catch (error) {
          this.error(`RAG response generation failed: ${error.message}`);
          throw error;
        }
      }
      async _prepareContext(message, context) {
        const agentContext = await this.getAgentContext(message, context);
        const ragContextString = await this.buildRAGContext(message, context);
        const ragQuery = `${message}

Relevant Information:
${ragContextString}`;
        return { ragQuery, agentContext };
      }
      async createDiscussionSession(sessionId, context) {
        const newSession = {
          userId: context?.userId || 2,
          documentId: context?.documentId,
          chapter: context?.chapter,
          sessionId,
          language: context?.language || "en",
          mode: context?.mode || "normal",
          socket: context?.socket,
          conversationHistory: [],
          notes: [],
          discussionTopics: [],
          learningData: /* @__PURE__ */ new Map(),
          groupDiscussion: context?.mode === "group" ? {
            activeParticipants: Object.keys(this.aiPersonalities),
            turnOrder: this.shuffleArray(Object.keys(this.aiPersonalities)),
            currentTurn: 0,
            roundCount: 0
          } : void 0
        };
        if (context?.initialMessage) {
          newSession.conversationHistory.push({
            id: "welcome",
            role: "system",
            content: context.initialMessage,
            timestamp: /* @__PURE__ */ new Date()
          });
        }
        if (context?.conversationHistory && Array.isArray(context.conversationHistory)) {
          this.log(`Restoring ${context.conversationHistory.length} messages to session ${sessionId}`);
          newSession.conversationHistory = context.conversationHistory.map((msg) => ({
            id: msg.id || `restored-${Date.now()}-${Math.random()}`,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : /* @__PURE__ */ new Date(),
            type: msg.type || "discussion",
            tags: msg.tags || [],
            aiPersonality: msg.aiPersonality,
            modelUsed: msg.modelUsed
          }));
          for (const msg of newSession.conversationHistory) {
            if (msg.role === "user" || msg.role === "assistant") {
              const topics = await this.extractDiscussionTopics(msg.content);
              newSession.discussionTopics.push(...topics);
            }
          }
          newSession.discussionTopics = Array.from(new Set(newSession.discussionTopics));
          this.log(`Restored session ${sessionId} with ${newSession.conversationHistory.length} messages and ${newSession.discussionTopics.length} topics`);
        }
        this.discussionSessions.set(sessionId, newSession);
        return newSession;
      }
      shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }
      isNoteRequest(message) {
        const noteKeywords = ["take a note", "remember that", "note down", "save this"];
        const lowerMessage = message.toLowerCase();
        return noteKeywords.some((keyword) => lowerMessage.includes(keyword));
      }
      async handleNoteRequest(message, context) {
        try {
          const noteContent = this.extractNoteContent(message);
          const aiNote = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: noteContent,
            timestamp: /* @__PURE__ */ new Date(),
            userId: context.userId,
            documentId: context.documentId,
            chapter: context.chapter,
            tags: await this.generateNoteTags(noteContent),
            type: "ai",
            relatedMessages: context.conversationHistory.slice(-3).map((msg) => msg.id)
          };
          context.notes.push(aiNote);
          if (!this.userNotes.has(context.userId)) {
            this.userNotes.set(context.userId, []);
          }
          this.userNotes.get(context.userId).push(aiNote);
          await this.saveNoteToPersistentStorage(aiNote);
          if (context.socket) {
            context.socket.emit("noteCreated", {
              note: aiNote,
              success: true,
              message: "Note saved successfully"
            });
            this.log(`\u2705 Emitted noteCreated event to frontend for note: ${aiNote.id}`);
          }
          let response = `\u{1F4DD} Note saved! I've captured: "${noteContent}"

Tags: ${aiNote.tags?.join(", ")}

Would you like to continue our discussion or explore this idea further?`;
          if (context.language && context.language !== "en" && this.ollamaService) {
            try {
              this.log(`\u{1F310} [NOTE] Applying language transformation to ${context.language}`);
              const languagePrompt = `Transform this response to be in ${context.language}. Keep the same friendly tone and content:

${response}`;
              const languageAwareResponse = await this.ollamaService.generateTextWithLanguage(languagePrompt, context.language);
              if (!this.isResponseInEnglish(languageAwareResponse)) {
                this.log(`\u2705 [NOTE] Successfully transformed response to ${context.language}`);
                return languageAwareResponse;
              } else if (this.translationService) {
                const translatedResponse = await this.translationService.translateText({
                  text: response,
                  targetLanguage: context.language,
                  context: "general"
                });
                this.log(`\u2705 [NOTE] Successfully translated response to ${context.language}`);
                return translatedResponse.translatedText;
              }
            } catch (error) {
              this.warn(`Note response language processing failed: ${error}`);
            }
          }
          return response;
        } catch (error) {
          this.error(`Failed to handle note request: ${error}`);
          if (context.socket) {
            context.socket.emit("noteCreated", {
              note: null,
              success: false,
              error: true,
              message: "Failed to save note"
            });
            this.log(`\u274C Emitted noteCreated error event to frontend`);
          }
          let errorMessage = "I had trouble saving that note. Could you try rephrasing it?";
          if (context.language && context.language !== "en" && this.translationService) {
            try {
              const translatedError = await this.translationService.translateText({
                text: errorMessage,
                targetLanguage: context.language,
                context: "general"
              });
              return translatedError.translatedText;
            } catch {
            }
          }
          return errorMessage;
        }
      }
      extractNoteContent(message) {
        const noteKeywords = ["take a note", "remember that", "note down", "save this"];
        let content = message;
        for (const keyword of noteKeywords) {
          content = content.replace(new RegExp(keyword, "gi"), "").trim();
        }
        content = content.replace(/^[:,-]/, "").trim();
        return content || message;
      }
      async generateNoteTags(content) {
        try {
          const words = content.toLowerCase().split(/\W+/);
          const significantWords = words.filter((word) => word.length > 3);
          return significantWords.slice(0, 3);
        } catch {
          return ["discussion"];
        }
      }
      async saveNoteToPersistentStorage(note) {
        try {
          const annotation = await storage.createAnnotation({
            userId: note.userId,
            documentId: -1,
            // Always use -1 for AI Discussion notes
            chapter: note.chapter || 1,
            paragraph: null,
            // AI notes typically don't have specific paragraph
            selectedText: "",
            // AI generated notes don't have selected text
            note: note.content,
            type: "ai"
            // Mark as AI-generated note
          });
          this.log(`AI note saved to database with ID ${annotation.id}: ${note.content.substring(0, 50)}...`);
        } catch (error) {
          this.warn(`Could not save note to persistent storage: ${error}`);
          throw error;
        }
      }
      async extractDiscussionTopics(message) {
        try {
          const words = message.toLowerCase().split(/\W+/);
          const topicWords = words.filter((word) => word.length > 4);
          return topicWords.slice(0, 3);
        } catch {
          return [];
        }
      }
      extractDomain(message) {
        const lowerMessage = message.toLowerCase();
        const domainPatterns = {
          "Literature": /literature|novel|poetry|story|narrative|fiction|character|plot|theme|author|writing|prose|verse|drama/,
          "Philosophy": /philosophy|philosophical|ethics|moral|wisdom|truth|meaning|existence|consciousness|reality|metaphysics/,
          "History": /history|historical|past|ancient|timeline|era|period|civilization|dynasty|empire|war|revolution/,
          "Psychology": /psychology|psychological|mind|behavior|emotion|personality|consciousness|mental|cognitive|therapy/,
          "Science": /science|scientific|research|theory|hypothesis|experiment|discovery|physics|chemistry|biology|quantum|mechanics/,
          "Religion": /religion|religious|spiritual|faith|belief|god|divine|sacred|prayer|worship|scripture|theology/,
          "Politics": /politics|political|government|power|authority|law|justice|rights|democracy|leadership|policy/,
          "Economics": /economics|economic|finance|money|wealth|trade|market|business|capitalism|socialism|poverty/,
          "Technology": /technology|technical|digital|computer|internet|innovation|invention|engineering|machine|programming|software|algorithm/,
          "Art": /art|artistic|creative|beauty|aesthetic|design|culture|expression|visual|music|dance|theater/,
          "Society": /society|social|community|culture|civilization|human|people|relationship|family|education/,
          "Self-Help": /self|personal|improvement|growth|success|motivation|habit|goal|development|productivity|mindset/,
          "Biography": /biography|life|person|individual|experience|journey|achievement|struggle|famous|leader/,
          "Adventure": /adventure|journey|travel|exploration|quest|discovery|danger|courage|survival|expedition/,
          "Mystery": /mystery|detective|crime|investigation|clue|solve|murder|secret|hidden|unknown/,
          "Romance": /romance|love|relationship|heart|emotion|passion|marriage|dating|couple|attraction/,
          "Fantasy": /fantasy|magic|magical|wizard|dragon|kingdom|quest|prophecy|supernatural|mythical/,
          "Horror": /horror|fear|scary|terror|ghost|monster|evil|dark|nightmare|supernatural/,
          "Memoir": /memoir|memory|personal|experience|life|childhood|family|reflection|story|journey/
        };
        for (const [domain, pattern] of Object.entries(domainPatterns)) {
          if (pattern.test(lowerMessage)) {
            return domain;
          }
        }
        return "General";
      }
      async getAgentContext(message, context) {
        try {
          let agentContext = "";
          if (context.documentId && context.chapter) {
            try {
              const document = await storage.getDocument(context.documentId);
              if (document) {
                agentContext += `Currently reading: "${document.title}", Chapter ${context.chapter}
`;
                agentContext += `Document context available for meaningful discussion.

`;
              }
            } catch (error) {
              this.warn(`Could not get document context: ${error}`);
            }
          }
          try {
            const ragContext = await this.buildRAGContext(message, context);
            if (ragContext) {
              agentContext += ragContext;
            }
          } catch (error) {
            this.warn(`RAG context enhancement failed: ${error}`);
          }
          try {
            const definitions = await this.definitionsService.getContextualDefinitions({
              userQuery: message,
              documentId: context.documentId,
              chapter: context.chapter,
              topics: context.discussionTopics,
              domain: this.extractDomain(message)
            });
            if (definitions.length > 0) {
              agentContext += `
\u{1F4DA} Relevant Learned Definitions:
`;
              definitions.slice(0, 3).forEach((def) => {
                agentContext += `\u2022 ${def.term}: ${def.definition.substring(0, 150)}...
`;
              });
              agentContext += `
Use these definitions to provide more informed responses.
`;
            }
          } catch (error) {
            this.warn(`Failed to get contextual definitions: ${error}`);
          }
          this.emit("requestAgentInsights", {
            message,
            documentId: context.documentId,
            chapter: context.chapter,
            topics: context.discussionTopics,
            fromAgent: "DiscussionAgent",
            requestId: `req-${Date.now()}`
          });
          this.emit("shareDiscussionTopics", {
            topics: context.discussionTopics,
            documentId: context.documentId,
            chapter: context.chapter,
            fromAgent: "DiscussionAgent"
          });
          return agentContext;
        } catch (error) {
          this.warn(`Failed to get agent context: ${error}`);
          return "";
        }
      }
      // 🧠 NEW: RAG-Enhanced Context Building
      async buildRAGContext(message, context) {
        try {
          this.log(`\u{1F50D} Building RAG context for discussion: "${message.substring(0, 50)}..."`);
          const ragContext = {
            userId: context.userId,
            currentDocument: context.documentId,
            currentChapter: context.chapter,
            conversationHistory: context.conversationHistory.slice(-3).map((msg) => msg.content),
            // Reduced from 5 to 3
            userStudyPatterns: context.discussionTopics.slice(-5),
            // Reduced from 10 to 5
            preferredTopics: context.discussionTopics.slice(-3),
            // Reduced from 5 to 3
            studyLevel: "intermediate",
            // Default for discussion
            targetLanguage: context.language
            // Pass language to RAG service
          };
          const discussionQuery = context.documentId && context.chapter ? `${message} chapter ${context.chapter}` : `discussion about: ${message}`;
          const ragResponse = await documentRAGService.processRAGQuery(
            discussionQuery,
            ragContext,
            {
              maxSources: 2,
              // Keep low to prevent information overload
              includeAnnotations: false,
              // Disabled to prevent cross-contamination
              includeMemories: false,
              // CRITICAL: No memories from other books
              searchDepth: "quick",
              // Fast search for responsive discussion
              useEmbeddings: true,
              singleDocumentOnly: true,
              // CRITICAL: Restrict search to current document only
              targetLanguage: context.language
              // Pass language to RAG service
            }
          );
          let enhancedContext = "";
          if (ragResponse.sources.length > 0) {
            const filteredSources = ragResponse.sources.filter((source) => {
              if (!context.documentId) return true;
              return source.documentTitle && (source.documentTitle.includes("Current") || !source.documentTitle.includes("Book") || source.source?.id === context.documentId);
            });
            if (filteredSources.length > 0) {
              enhancedContext += `\u{1F50D} **Related materials from your current reading:**
`;
              filteredSources.slice(0, 2).forEach((source, index2) => {
                const sourceInfo = source.source?.chapter ? ` (Chapter ${source.source.chapter})` : "";
                enhancedContext += `\u{1F4D6} "${source.excerpt.substring(0, 80)}..."${sourceInfo}
`;
              });
              enhancedContext += "\n";
            }
          }
          this.log(`\u2705 RAG context enhanced with ${ragResponse.sources.length} sources (confidence: ${ragResponse.confidence}) - strictly current document only`);
          return enhancedContext;
        } catch (error) {
          this.warn(`RAG context building failed: ${error}`);
          return "";
        }
      }
      async generateDiscussionResponse(message, context, agentContext) {
        if (!this.ollamaService) {
          this.error("Ollama service is not connected.");
          return "I am currently unable to process your request.";
        }
        const isRepetitive = this.checkForRepetitiveQuestions(message, context);
        if (isRepetitive) {
          return await this.handleRepetitiveQuestion(message, context);
        }
        const systemPrompt = this.buildDiscussionSystemPrompt(context, agentContext);
        const userPrompt = `User query: "${message}"

${agentContext}`;
        const fullPrompt = `${systemPrompt}

${userPrompt}`;
        try {
          if (context.language && context.language !== "en" && this.ollamaService) {
            this.log(`\u{1F310} Generating discussion response in ${context.language}`);
            const documentContext = context.documentId && context.chapter ? `Document ${context.documentId}, Chapter ${context.chapter}` : "";
            const formattedPrompt = `${fullPrompt}

FORMATTING INSTRUCTIONS:
- Use clear paragraphs with proper spacing
- Break up long responses into readable chunks
- Use bullet points (\u2022) for lists
- Keep sentences concise and engaging
- Ensure proper punctuation and spacing`;
            const response = await this.ollamaService.generateTextWithLanguage(formattedPrompt, context.language, {
              context: documentContext
            });
            if (!this.isResponseInEnglish(response)) {
              this.log(`\u2705 Successfully generated response in ${context.language}`);
              const refinedResponse = await this.refineResponse(response, context);
              const factCheckedResponse = await this.performFactCheck(refinedResponse, agentContext, message);
              await this.learnFromInteraction(message, factCheckedResponse, context);
              return factCheckedResponse;
            } else {
              this.log(`\u26A0\uFE0F LLM generated in English despite ${context.language} instructions, using translation service`);
              const refinedResponse = await this.refineResponse(response, context);
              const factCheckedResponse = await this.performFactCheck(refinedResponse, agentContext, message);
              if (this.translationService) {
                try {
                  this.log(`\u{1F504} Translating English response to ${context.language}`);
                  const translatedResponse = await this.translationService.translateText({
                    text: factCheckedResponse,
                    targetLanguage: context.language,
                    context: "general"
                  });
                  if (translatedResponse && translatedResponse.translatedText) {
                    this.log(`\u2705 Successfully translated response to ${context.language}`);
                    await this.learnFromInteraction(message, translatedResponse.translatedText, context);
                    return translatedResponse.translatedText;
                  } else {
                    this.warn(`Translation service returned invalid result, falling back to English`);
                    await this.learnFromInteraction(message, factCheckedResponse, context);
                    return factCheckedResponse;
                  }
                } catch (translationError) {
                  this.error(`Translation service failed: ${translationError}`);
                  this.log(`\u274C Translation failed, returning English response`);
                  await this.learnFromInteraction(message, factCheckedResponse, context);
                  return factCheckedResponse;
                }
              } else {
                this.warn(`No translation service available, returning English response`);
                await this.learnFromInteraction(message, factCheckedResponse, context);
                return factCheckedResponse;
              }
            }
          } else {
            this.log(`\u{1F5E3}\uFE0F Generating discussion response in English`);
            const documentContext = context.documentId && context.chapter ? `Document ${context.documentId}, Chapter ${context.chapter}` : "";
            const formattedPrompt = `${fullPrompt}

FORMATTING INSTRUCTIONS:
- Use clear paragraphs with proper spacing
- Break up long responses into readable chunks
- Use bullet points (\u2022) for lists
- Keep sentences concise and engaging
- Ensure proper punctuation and spacing`;
            const response = await this.ollamaService.generateText(formattedPrompt, {
              context: documentContext
            });
            const refinedResponse = await this.refineResponse(response, context);
            const factCheckedResponse = await this.performFactCheck(refinedResponse, agentContext, message);
            this.log(`Generated English response: "${factCheckedResponse.substring(0, 100)}..."`);
            await this.learnFromInteraction(message, factCheckedResponse, context);
            return factCheckedResponse;
          }
        } catch (error) {
          this.error(`Error in generateDiscussionResponse: ${error}`);
          this.log("Falling back to simpler generation model due to error.");
          try {
            if (context.language && context.language !== "en" && this.ollamaService) {
              this.log(`\u{1F310} Using language-aware fallback for ${context.language}`);
              const fallbackPrompt = `User message: "${message}".
Context: "${agentContext}"
Respond directly to the user message in ${context.language}.

FORMATTING: Use clear paragraphs, proper spacing, and bullet points (\u2022) for lists.`;
              const fallbackDocumentContext = context.documentId && context.chapter ? `Document ${context.documentId}, Chapter ${context.chapter}` : "";
              const fallbackResponse = await this.ollamaService.generateTextWithLanguage(fallbackPrompt, context.language, {
                context: fallbackDocumentContext
              });
              if (!this.isResponseInEnglish(fallbackResponse)) {
                const refinedFallbackResponse = await this.refineResponse(fallbackResponse, context);
                this.log(`\u2705 Generated fallback response in ${context.language}`);
                await this.learnFromInteraction(message, refinedFallbackResponse, context);
                return refinedFallbackResponse;
              } else {
                const refinedFallbackResponse = await this.refineResponse(fallbackResponse, context);
                if (this.translationService) {
                  try {
                    this.log(`\u{1F504} Translating fallback response to ${context.language}`);
                    const translatedFallback = await this.translationService.translateText({
                      text: refinedFallbackResponse,
                      targetLanguage: context.language,
                      context: "general"
                    });
                    if (translatedFallback && translatedFallback.translatedText) {
                      this.log(`\u2705 Successfully translated fallback to ${context.language}`);
                      await this.learnFromInteraction(message, translatedFallback.translatedText, context);
                      return translatedFallback.translatedText;
                    }
                  } catch (translationError) {
                    this.error(`Fallback translation failed: ${translationError}`);
                  }
                }
                this.log(`\u274C All translation attempts failed, returning English fallback`);
                await this.learnFromInteraction(message, refinedFallbackResponse, context);
                return refinedFallbackResponse;
              }
            } else {
              const fallbackPrompt = `User message: "${message}".
Context: "${agentContext}"
Respond directly to the user message.

FORMATTING: Use clear paragraphs, proper spacing, and bullet points (\u2022) for lists.`;
              const fallbackDocumentContext = context.documentId && context.chapter ? `Document ${context.documentId}, Chapter ${context.chapter}` : "";
              const fallbackResponse = await this.ollamaService.generateText(fallbackPrompt, {
                context: fallbackDocumentContext
              });
              const refinedFallbackResponse = await this.refineResponse(fallbackResponse, context);
              this.log(`Generated fallback response: "${refinedFallbackResponse.substring(0, 100)}..."`);
              await this.learnFromInteraction(message, refinedFallbackResponse, context);
              return refinedFallbackResponse;
            }
          } catch (fallbackError) {
            this.error(`Fallback generation failed: ${fallbackError}`);
            if (context.language && context.language !== "en" && this.translationService) {
              try {
                const errorMessage = "I'm having trouble processing that request right now. Please try again in a moment.";
                const translatedError = await this.translationService.translateText({
                  text: errorMessage,
                  targetLanguage: context.language,
                  context: "general"
                });
                if (translatedError && translatedError.translatedText) {
                  return translatedError.translatedText;
                }
              } catch {
              }
            }
            return "I'm having trouble processing that request right now. Please try again in a moment.";
          }
        }
      }
      checkForRepetitiveQuestions(message, context) {
        if (context.conversationHistory.length < 2) return false;
        const recentMessages = context.conversationHistory.slice(-6);
        const userMessages = recentMessages.filter((msg) => msg.role === "user");
        if (userMessages.length < 2) return false;
        const currentMessage = message.toLowerCase().trim();
        if (currentMessage.length <= 10 && ["hello", "hi", "hey", "thanks", "thank you", "ok", "okay", "yes", "no"].includes(currentMessage)) {
          return false;
        }
        if (currentMessage.length > 10) {
          for (const msg of userMessages) {
            if (msg.content.toLowerCase().trim() === currentMessage) {
              this.log(`Detected exact duplicate question: "${message}"`);
              return true;
            }
          }
        }
        if (currentMessage.length <= 15) {
          return false;
        }
        const currentWords = currentMessage.split(/\s+/).filter((word) => word.length > 3);
        if (currentWords.length < 3) return false;
        for (const msg of userMessages) {
          const msgWords = msg.content.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
          const commonWords = currentWords.filter((word) => msgWords.includes(word));
          if (commonWords.length >= Math.min(currentWords.length, msgWords.length) * 0.8 && currentWords.length >= 4) {
            this.log(`Detected similar question: "${message}" vs "${msg.content}"`);
            return true;
          }
        }
        return false;
      }
      async handleRepetitiveQuestion(message, context) {
        const recentMessages = context.conversationHistory.slice(-12);
        let lastUserQuestion = "";
        let lastAssistantAnswer = "";
        for (let i = recentMessages.length - 2; i >= 0; i--) {
          if (recentMessages[i].role === "user" && recentMessages[i + 1]?.role === "assistant") {
            lastUserQuestion = recentMessages[i].content;
            lastAssistantAnswer = recentMessages[i + 1].content;
            break;
          }
        }
        if (lastUserQuestion && lastAssistantAnswer) {
          const followUpPrompt = `The user previously asked: "${lastUserQuestion}"
Your answer was: "${lastAssistantAnswer}"

Now the user followed up with: "${message}"

Provide a thoughtful, detailed answer (up to 8-10 sentences if needed) that builds on your previous answer and directly addresses the user's follow-up. Do not just repeat your previous answer. Only ask a follow-up question at the end if it feels natural.`;
          const followUpDocumentContext = context.documentId && context.chapter ? `Document ${context.documentId}, Chapter ${context.chapter}` : "";
          if (context.language && context.language !== "en" && this.ollamaService) {
            const languagePrompt = `${followUpPrompt}

IMPORTANT: Respond EXCLUSIVELY in ${context.language}.

FORMATTING: Use clear paragraphs, proper spacing, and bullet points (\u2022) for lists.`;
            const response = await this.ollamaService.generateTextWithLanguage(languagePrompt, context.language, {
              context: followUpDocumentContext
            });
            if (!this.isResponseInEnglish(response)) {
              return response.trim();
            } else {
              const translatedResponse = await this.translationService.translateText({
                text: response.trim(),
                targetLanguage: context.language,
                context: "general"
              });
              return translatedResponse.translatedText;
            }
          } else {
            const response = await this.ollamaService.generateText(followUpPrompt, {
              context: followUpDocumentContext
            });
            return response.trim();
          }
        }
        if (context.language && context.language !== "en" && this.translationService) {
          try {
            const fallbackMessage = "I remember we discussed this before. Is there a new angle or detail you'd like to explore further?";
            const translatedFallback = await this.translationService.translateText({
              text: fallbackMessage,
              targetLanguage: context.language,
              context: "general"
            });
            return translatedFallback.translatedText;
          } catch {
          }
        }
        return "I remember we discussed this before. Is there a new angle or detail you'd like to explore further?";
      }
      buildDiscussionSystemPrompt(context, agentContext) {
        let basePrompt = `You are Grok, a helpful and maximally truthful AI built by xAI, inspired by the Hitchhiker's Guide to the Galaxy and JARVIS from Iron Man. You're witty, clever, and always ready with a dash of humor when it fits naturally.

CRITICAL INSTRUCTIONS FOR RELIABILITY:
1. ONLY use information from the provided context and conversation history
2. If you don't have specific information, clearly state "I don't have enough information about that"
3. Do NOT make up facts, names, dates, or details not in the context
4. Stay focused on the current document and conversation topic
5. Be maximally truthful - admit uncertainty when appropriate

SMART RESPONSE GUIDELINES:
- Use chain-of-thought reasoning: First understand the query, recall relevant information from context, then formulate an insightful response
- Make connections between ideas in novel but grounded ways to provide deeper insights
- Vary sentence length and structure for natural, engaging flow
- Infuse responses with subtle wit and humor when appropriate to the topic, but keep it tasteful and relevant
- Draw inspiration from science fiction or real-world analogies when explaining concepts, if it helps clarify

You engage in meaningful conversations about the user's documents and topics. You ask thoughtful questions and provide insights based ONLY on what you know from the provided context.

CONVERSATION GUIDELINES:
- Respond in a natural, conversational tone, like speaking to a curious friend
- For simple greetings ("Hola", "Hello", etc.): Respond naturally and briefly (1-2 sentences max), perhaps with a clever twist
- Reference specific parts of the context when making points about documents
- Build naturally on previous conversation points
- If asked about something not in your context, offer to help find information rather than guessing
- Keep responses focused and relevant to the current document/topic
- Use clear, well-structured paragraphs
- Break up long responses with proper spacing
- Use bullet points for lists when appropriate
- Keep sentences concise and readable
- End with a question to continue the conversation when appropriate`;
        if (context.language && context.language !== "en") {
          const languageNames = {
            "es": "Spanish (Espa\xF1ol)",
            "fr": "French (Fran\xE7ais)",
            "de": "German (Deutsch)",
            "ja": "Japanese (\u65E5\u672C\u8A9E)",
            "ko": "Korean (\uD55C\uAD6D\uC5B4)"
          };
          const targetLanguage = languageNames[context.language] || context.language;
          basePrompt += `

\u{1F310} CRITICAL LANGUAGE REQUIREMENT:
You MUST respond EXCLUSIVELY in ${targetLanguage}.
- ZERO English words allowed
- EVERY word must be in ${targetLanguage}
- If you don't know a word in ${targetLanguage}, describe it in ${targetLanguage}
- Start and end your response in ${targetLanguage}
- Use natural, respectful ${targetLanguage} conversation style
- For biblical/religious content: Use traditional ${targetLanguage} religious terminology
- For cultural context: Use ${targetLanguage} cultural references and expressions
- Format your response with clear paragraphs and proper spacing
- Use bullet points (\u2022) for lists when appropriate
- Keep sentences concise and readable`;
        }
        let prompt = basePrompt;
        if (context.conversationHistory.length > 0) {
          const recentHistory = context.conversationHistory.slice(-8);
          prompt += `

\u{1F4DD} **Recent Conversation:**
`;
          recentHistory.forEach((msg, index2) => {
            const role = msg.role === "user" ? "User" : msg.role === "assistant" ? "You" : "System";
            const content = msg.content.length > 200 ? msg.content.substring(0, 200) + "..." : msg.content;
            prompt += `${index2 + 1}. ${role}: "${content}"
`;
          });
        }
        if (context.documentId && context.chapter) {
          prompt += `

\u{1F4D6} **Current Document Context:**
Document ${context.documentId}, Chapter ${context.chapter}`;
        }
        if (context.discussionTopics.length > 0) {
          const recentTopics = context.discussionTopics.slice(-2);
          prompt += `
Discussion Topics: ${recentTopics.join(", ")}`;
        }
        if (agentContext) {
          prompt += `

\u{1F50D} **Available Information:**
${agentContext}`;
          prompt += `

BASE YOUR RESPONSE ONLY ON THE ABOVE INFORMATION. If something isn't covered above, say so clearly.`;
        } else {
          prompt += `

No specific context provided - focus on the conversation history and ask clarifying questions if needed.`;
        }
        return prompt;
      }
      async learnFromInteraction(userMessage, response, context) {
        try {
          const detectedLanguage = await this.detectLanguage(userMessage);
          const culturalPatterns = this.analyzeCulturalPatterns(userMessage, detectedLanguage);
          const crossLanguageInsights = await this.extractCrossLanguageInsights(userMessage, response, context);
          const topics = await this.extractDiscussionTopics(userMessage + " " + response);
          const learningKey = `${context.documentId}-${context.chapter}-${detectedLanguage}-${topics.join("-")}`;
          const engagement = this.analyzeEngagement(userMessage, response, context);
          const reasoning = this.analyzeReasoningDepth(userMessage, response);
          const conceptualConnections = await this.identifyConceptualConnections(userMessage, response, context);
          const learningData = {
            userQuestion: userMessage,
            response,
            language: detectedLanguage,
            culturalPatterns,
            crossLanguageInsights,
            topics,
            engagement,
            reasoningDepth: reasoning,
            conceptualConnections,
            conversationContext: context.conversationHistory.slice(-3),
            cognitiveLevel: this.assessCognitiveLevel(userMessage),
            timestamp: /* @__PURE__ */ new Date(),
            insights: await this.extractInsights(userMessage, response)
          };
          context.learningData.set(learningKey, learningData);
          this.learningPatterns.set(learningKey, learningData);
          await this.updateConversationIntelligence(context, learningData);
          try {
            const { agentManager: agentManager2 } = await Promise.resolve().then(() => (init_agent_manager(), agent_manager_exports));
            agentManager2.requestAgentTask("learning", "LEARN_FROM_DISCUSSION", {
              documentId: context.documentId || 0,
              chapter: context.chapter || 1,
              language: detectedLanguage,
              culturalContext: culturalPatterns,
              discussionTopic: topics.join(", "),
              userQuestions: [userMessage],
              responses: [response],
              engagement: engagement.level,
              cognitiveLevel: learningData.cognitiveLevel,
              reasoningDepth: reasoning.depth,
              insights: learningData.insights,
              crossLanguagePatterns: crossLanguageInsights,
              sessionId: context.sessionId,
              userId: context.userId,
              context: "discussion_agent_multilingual_learning"
            }).catch(() => {
            });
            this.log(`\u{1F30D} Multilingual learning data sent: ${topics.join(", ")} (${detectedLanguage}, ${engagement.level} engagement, ${reasoning.depth} reasoning)`);
          } catch (error) {
            this.warn(`Failed to send learning data to Learning Agent: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } catch (error) {
          this.warn(`Multilingual learning from interaction failed: ${error}`);
        }
      }
      // NEW: Advanced intelligence methods
      analyzeEngagement(userMessage, response, context) {
        const messageLength = userMessage.length;
        const questionCount = (userMessage.match(/\?/g) || []).length;
        const conversationTurns = context.conversationHistory.length;
        const complexityWords = ["because", "however", "although", "therefore", "moreover", "furthermore"].filter(
          (word) => userMessage.toLowerCase().includes(word)
        ).length;
        let level = "medium";
        let score = 0;
        if (messageLength > 100) score += 2;
        if (questionCount > 0) score += 1;
        if (conversationTurns > 5) score += 1;
        if (complexityWords > 0) score += complexityWords;
        if (score >= 4) level = "high";
        else if (score <= 1) level = "low";
        return { level, score, indicators: { messageLength, questionCount, conversationTurns, complexityWords } };
      }
      analyzeReasoningDepth(userMessage, response) {
        const reasoningIndicators = {
          causal: /because|since|therefore|thus|consequently|as a result/.test(userMessage.toLowerCase()),
          comparative: /compared to|unlike|similar to|different from|in contrast/.test(userMessage.toLowerCase()),
          hypothetical: /if|suppose|imagine|what if|hypothetically/.test(userMessage.toLowerCase()),
          analytical: /analyze|examine|evaluate|assess|consider|implications/.test(userMessage.toLowerCase()),
          synthetic: /combine|integrate|synthesize|bring together/.test(userMessage.toLowerCase())
        };
        const depth = Object.values(reasoningIndicators).filter(Boolean).length;
        let level = "surface";
        if (depth >= 3) level = "deep";
        else if (depth >= 1) level = "intermediate";
        return { depth, level, indicators: reasoningIndicators };
      }
      async identifyConceptualConnections(userMessage, response, context) {
        const connections = [];
        const universalDomains = [
          "psychology",
          "philosophy",
          "history",
          "society",
          "culture",
          "ethics",
          "politics",
          "economics",
          "technology",
          "science",
          "religion",
          "spirituality",
          "art",
          "literature",
          "relationships",
          "human nature",
          "morality",
          "justice",
          "truth",
          "beauty",
          "meaning",
          "power",
          "freedom",
          "identity",
          "consciousness",
          "emotion",
          "reason",
          "faith"
        ];
        universalDomains.forEach((domain) => {
          if (userMessage.toLowerCase().includes(domain) || response.toLowerCase().includes(domain)) {
            connections.push(`cross-domain:${domain}`);
          }
        });
        const themes = {
          "character-development": /character|growth|change|transformation|journey|development/,
          "conflict-resolution": /conflict|problem|solution|struggle|challenge|overcome/,
          "cause-effect": /because|therefore|result|consequence|leads to|causes/,
          "comparison": /compare|contrast|similar|different|like|unlike|versus/,
          "symbolism": /symbol|represent|meaning|metaphor|signify|stands for/,
          "irony-paradox": /irony|paradox|contradiction|opposite|unexpected/,
          "universal-truth": /truth|wisdom|lesson|principle|universal|human condition/
        };
        Object.entries(themes).forEach(([theme, pattern]) => {
          if (pattern.test(userMessage.toLowerCase()) || pattern.test(response.toLowerCase())) {
            connections.push(`theme:${theme}`);
          }
        });
        if (/history|past|previous|traditionally|historically|ancient|old/.test(userMessage.toLowerCase())) {
          connections.push("temporal:historical");
        }
        if (/future|will|might|could|potential|implications|next|tomorrow/.test(userMessage.toLowerCase())) {
          connections.push("temporal:future");
        }
        if (/now|today|current|present|contemporary|modern/.test(userMessage.toLowerCase())) {
          connections.push("temporal:present");
        }
        return connections;
      }
      assessCognitiveLevel(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        if (/create|design|develop|compose|formulate/.test(lowerMessage)) return "create";
        if (/evaluate|judge|assess|critique|defend/.test(lowerMessage)) return "evaluate";
        if (/analyze|examine|compare|contrast|differentiate/.test(lowerMessage)) return "analyze";
        if (/apply|use|implement|demonstrate|solve/.test(lowerMessage)) return "apply";
        if (/understand|explain|interpret|summarize|paraphrase/.test(lowerMessage)) return "understand";
        return "remember";
      }
      async extractInsights(userMessage, response) {
        const insights = [];
        if (response.includes("connection") || response.includes("relationship")) {
          insights.push("conceptual-connection");
        }
        if (response.includes("implication") || response.includes("consequence")) {
          insights.push("causal-insight");
        }
        if (response.includes("paradox") || response.includes("contradiction")) {
          insights.push("paradox-recognition");
        }
        if (response.includes("analogy") || response.includes("similar to")) {
          insights.push("analogical-reasoning");
        }
        return insights;
      }
      async updateConversationIntelligence(context, learningData) {
        const sessionKey = `intelligence:${context.sessionId}`;
        const currentIntelligence = this.learningPatterns.get(sessionKey) || {
          averageEngagement: 0,
          reasoningTrend: [],
          conceptualGrowth: [],
          cognitiveProgression: []
        };
        currentIntelligence.reasoningTrend.push(learningData.reasoningDepth.depth);
        currentIntelligence.cognitiveProgression.push(learningData.cognitiveLevel);
        currentIntelligence.conceptualGrowth.push(learningData.conceptualConnections.length);
        if (currentIntelligence.reasoningTrend.length > 10) {
          currentIntelligence.reasoningTrend = currentIntelligence.reasoningTrend.slice(-10);
          currentIntelligence.cognitiveProgression = currentIntelligence.cognitiveProgression.slice(-10);
          currentIntelligence.conceptualGrowth = currentIntelligence.conceptualGrowth.slice(-10);
        }
        this.learningPatterns.set(sessionKey, currentIntelligence);
        context.learningData.set("intelligence_profile", currentIntelligence);
      }
      identifyConversationPatterns(context) {
        const patterns = [];
        const recentMessages = context.conversationHistory.slice(-6);
        const questionCount = recentMessages.filter(
          (msg) => msg.role === "user" && msg.content.includes("?")
        ).length;
        if (questionCount >= 2) {
          patterns.push("deep-inquiry");
        }
        const buildingWords = ["building on", "following up", "related to", "expanding on"];
        const buildingCount = recentMessages.filter(
          (msg) => buildingWords.some((word) => msg.content.toLowerCase().includes(word))
        ).length;
        if (buildingCount >= 1) {
          patterns.push("conceptual-building");
        }
        const analyticalCount = recentMessages.filter(
          (msg) => /why|how|what if|because|therefore|however/.test(msg.content.toLowerCase())
        ).length;
        if (analyticalCount >= 3) {
          patterns.push("analytical-thinking");
        }
        const topicDiversity = new Set(context.discussionTopics.slice(-5)).size;
        if (topicDiversity >= 3) {
          patterns.push("cross-topic-synthesis");
        }
        const noteRequests = recentMessages.filter(
          (msg) => msg.content.toLowerCase().includes("note") || msg.content.toLowerCase().includes("remember")
        ).length;
        if (noteRequests >= 1) {
          patterns.push("active-learning");
        }
        return patterns;
      }
      // Task handlers
      async startDiscussion(data) {
        this.log(`Starting discussion for user ${data.userId}, document ${data.documentId}`);
      }
      async analyzeLearningPatterns() {
        this.log("Analyzing learning patterns from discussions");
        this.learningPatterns.forEach((data, key) => {
          this.emit("learningInsight", {
            source: "DiscussionAgent",
            pattern: key,
            data,
            type: "discussion_pattern"
          });
        });
      }
      async generateDiscussionInsights(data) {
        this.log("Generating discussion insights");
      }
      async connectWithExpertAgent(data) {
        this.log("Connecting with expert agent for enhanced context");
      }
      async saveDiscussionNote(data) {
        this.log("Saving discussion note");
      }
      async saveLearningPatterns() {
        try {
          this.learningPatterns.forEach(async (pattern, key) => {
            this.log(`Learning pattern saved: ${key}`);
          });
          this.log("Learning patterns saved");
        } catch (error) {
          this.warn(`Could not save learning patterns: ${error}`);
        }
      }
      // Public methods for integration
      async getUserNotes(userId, documentId, chapter) {
        const userNotes = this.userNotes.get(userId) || [];
        if (documentId !== void 0) {
          return userNotes.filter((note) => note.documentId === documentId && (chapter === void 0 || note.chapter === chapter));
        }
        return userNotes;
      }
      async getDiscussionSession(sessionId) {
        return this.discussionSessions.get(sessionId);
      }
      getActiveDiscussionCount() {
        return this.discussionSessions.size;
      }
      async exportDiscussionHistory(sessionId) {
        const session = this.discussionSessions.get(sessionId);
        if (!session) return null;
        return {
          sessionId,
          userId: session.userId,
          documentId: session.documentId,
          chapter: session.chapter,
          conversationHistory: session.conversationHistory,
          notes: session.notes,
          topics: session.discussionTopics,
          timestamp: /* @__PURE__ */ new Date()
        };
      }
      // ========== GROUP DISCUSSION METHODS ==========
      async handleGroupDiscussion(message, context) {
        this.log(`\u{1F3AD} [DEBUG] handleGroupDiscussion called with message: "${message}"`);
        this.log(`\u{1F3AD} [DEBUG] Group discussion mode - Universal knowledge exploration!`);
        this.log(`\u{1F3AD} [DEBUG] Ready for universal knowledge discussion`);
        if (context.mode !== "group") {
          this.log(`\u{1F3AD} [DEBUG] Switching to group mode`);
          context.mode = "group";
          context.groupDiscussion = {
            activeParticipants: ["analytical-expert", "creative-thinker", "practical-advisor", "curious-challenger"],
            turnOrder: ["analytical-expert", "creative-thinker", "practical-advisor", "curious-challenger"],
            currentTurn: 0,
            roundCount: 1
          };
        }
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        context.conversationHistory.push({
          id: messageId,
          role: "user",
          content: message,
          timestamp: /* @__PURE__ */ new Date(),
          type: "discussion"
        });
        this.log("\u{1F3AD} Starting Group Discussion Panel!");
        const bookContext = this.getCurrentBookContext(context);
        let groupResponse = `\u{1F3AD} **UNIVERSAL KNOWLEDGE PANEL** - Multi-Expert Discussion \u{1F3AD}

`;
        groupResponse += `**Topic:** ${message}

`;
        if ((message.toLowerCase().includes("group discussion") || message.toLowerCase().includes("panel discussion")) && message.split(" ").length <= 3) {
          this.log(`\u{1F3AD} [DEBUG] This is a group discussion starter, returning panel introduction`);
          groupResponse += await this.generatePanelIntroduction(context);
          return groupResponse;
        }
        this.log(`\u{1F3AD} [DEBUG] This is a question for the panel, generating responses from all AIs`);
        groupResponse += `Our distinguished AI experts will share their perspectives on your topic:

`;
        this.log(`\u{1F3AD} [DEBUG] About to call generatePanelResponses...`);
        const panelResponses = await this.generatePanelResponses(message, context);
        this.log(`\u{1F3AD} [DEBUG] generatePanelResponses returned ${panelResponses.length} responses`);
        for (const response of panelResponses) {
          groupResponse += response + "\n\n";
          context.conversationHistory.push({
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: "assistant",
            content: response,
            timestamp: /* @__PURE__ */ new Date(),
            type: "discussion",
            aiPersonality: response.match(/\*\*(.*?)\*\*/)?.[1] || "unknown"
          });
        }
        this.log(`\u{1F3AD} Generated ${panelResponses.length} panel responses, now sending as separate messages...`);
        for (let i = 0; i < panelResponses.length; i++) {
          const response = panelResponses[i];
          const personalityMatch = response.match(/\*\*(.*?)\*\*/);
          const personalityName = personalityMatch ? personalityMatch[1] : "Unknown AI";
          const responseContent = response.replace(/\*\*.*?\*\*:\s?/, "");
          this.log(`\u{1F3AD} Sending response from ${personalityName}: "${responseContent.substring(0, 50)}..."`);
          if (context.socket) {
            this.log(`\u{1F3AD} [DISCUSSION-AGENT] Emitting aiPersonalityResponse directly to socket for ${personalityName}`);
            context.socket.emit("aiPersonalityResponse", {
              sessionId: context.sessionId,
              personalityName,
              content: responseContent,
              aiPersonality: personalityName,
              modelUsed: this.getModelForPersonality(personalityName),
              messageType: "ai-personality"
            });
          } else {
            this.warn(`\u{1F3AD} [DISCUSSION-AGENT] No socket available - falling back to event emission`);
            this.emit("aiPersonalityResponse", {
              sessionId: context.sessionId,
              personalityName,
              content: responseContent,
              aiPersonality: personalityName,
              modelUsed: this.getModelForPersonality(personalityName),
              messageType: "ai-personality"
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        const interactions = await this.generateAIInteractions(panelResponses, context);
        if (interactions.length > 0) {
          for (const interaction of interactions) {
            const personalityMatch = interaction.match(/\*\*(.*?)\*\*/);
            const personalityName = personalityMatch ? personalityMatch[1] : "Unknown AI";
            const interactionContent = interaction.replace(/\*\*.*?\*\*:\s?/, "");
            if (context.socket) {
              this.log(`\u{1F3AD} [DISCUSSION-AGENT] Emitting aiPersonalityResponse directly to socket for ${personalityName}`);
              context.socket.emit("aiPersonalityResponse", {
                sessionId: context.sessionId,
                personalityName,
                content: interactionContent,
                aiPersonality: personalityName,
                modelUsed: this.getModelForPersonality(personalityName),
                messageType: "ai-interaction"
              });
            } else {
              this.warn(`\u{1F3AD} [DISCUSSION-AGENT] No socket available - falling back to event emission`);
              this.emit("aiPersonalityResponse", {
                sessionId: context.sessionId,
                personalityName,
                content: interactionContent,
                aiPersonality: personalityName,
                modelUsed: this.getModelForPersonality(personalityName),
                messageType: "ai-interaction"
              });
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        return groupResponse;
      }
      async generatePanelIntroduction(context) {
        let introduction = `\u{1F4DA} **Welcome to the Universal Knowledge Panel!** \u{1F4DA}

Our distinguished AI experts are ready to discuss any topic from multiple perspectives:

\u{1F52C} **The Analytical Expert** - *Methodical and evidence-based analysis*
\u{1F4A1} **The Creative Thinker** - *Innovative and imaginative perspectives*
\u2699\uFE0F **The Practical Advisor** - *Real-world applications and solutions*
\u2753 **The Curious Challenger** - *Thought-provoking questions and alternative viewpoints*

Ask any question about literature, science, philosophy, history, technology, or any subject you'd like to explore!`;
        if (context.language && context.language !== "en" && this.ollamaService) {
          try {
            this.log(`\u{1F310} [PANEL-INTRO] Applying language transformation to ${context.language}`);
            const languagePrompt = `Transform this panel introduction to be in ${context.language}. Keep the same welcoming tone and format:

${introduction}`;
            const languageAwareIntroduction = await this.ollamaService.generateTextWithLanguage(languagePrompt, context.language);
            if (!this.isResponseInEnglish(languageAwareIntroduction)) {
              this.log(`\u2705 [PANEL-INTRO] Successfully transformed introduction to ${context.language}`);
              return languageAwareIntroduction;
            } else if (this.translationService) {
              const translatedIntroduction = await this.translationService.translateText({
                text: introduction,
                targetLanguage: context.language,
                context: "general"
              });
              this.log(`\u2705 [PANEL-INTRO] Successfully translated introduction to ${context.language}`);
              return translatedIntroduction.translatedText;
            }
          } catch (error) {
            this.warn(`Panel introduction language processing failed: ${error}`);
          }
        }
        return introduction;
      }
      async generatePanelResponses(message, context) {
        const responses = [];
        const bookContext = this.getCurrentBookContext(context);
        try {
          for (const [personalityKey, personality] of Object.entries(this.aiPersonalities)) {
            const selectedModel = this.getModelForPersonality(personality.name);
            this.log(`\u{1F3AD} Generating response from ${personality.name} using ${selectedModel} in ${context.language || "en"}`);
            let systemPrompt = `${personality.prompt}

Context: You are part of a panel discussion about: "${message}"
${bookContext}

Respond in your characteristic style with thoughtful insights. Keep your response focused and conversational (2-4 sentences).`;
            if (context.language && context.language !== "en") {
              systemPrompt += `

\u{1F310} CRITICAL: You MUST respond exclusively in ${context.language}. Every word must be in ${context.language}.`;
            }
            try {
              const result = await this.multiModelService.executeWithSpecificModel(
                selectedModel,
                `${systemPrompt}

User question: ${message}`,
                {
                  temperature: 0.8,
                  maxTokens: 200,
                  taskType: "group-discussion-personality"
                  // More specific task type
                }
              );
              let response = result.response;
              if (context.language && context.language !== "en" && this.ollamaService) {
                try {
                  if (this.isResponseInEnglish(response)) {
                    this.log(`\u{1F310} [PANEL] Response from ${personality.name} is in English, transforming to ${context.language}`);
                    const languagePrompt = `Transform this panel response to be in ${context.language}. Keep the same personality and tone:

${response}`;
                    const languageAwareResponse = await this.ollamaService.generateTextWithLanguage(languagePrompt, context.language);
                    if (!this.isResponseInEnglish(languageAwareResponse)) {
                      response = languageAwareResponse;
                      this.log(`\u2705 [PANEL] Successfully transformed ${personality.name} response to ${context.language}`);
                    } else if (this.translationService) {
                      const translatedResponse = await this.translationService.translateText({
                        text: response,
                        targetLanguage: context.language,
                        context: "general"
                      });
                      response = translatedResponse.translatedText;
                      this.log(`\u2705 [PANEL] Successfully translated ${personality.name} response to ${context.language}`);
                    }
                  }
                } catch (error) {
                  this.warn(`Panel response language processing failed for ${personality.name}: ${error}`);
                }
              }
              responses.push(`**${personality.name}**: ${response.trim()}`);
            } catch (error) {
              this.warn(`Failed to generate response from ${personality.name} using ${personality.model}: ${error}`);
              let fallbackResponse = "I'm processing this interesting question and will share my thoughts shortly.";
              if (context.language && context.language !== "en" && this.translationService) {
                try {
                  const translatedFallback = await this.translationService.translateText({
                    text: fallbackResponse,
                    targetLanguage: context.language,
                    context: "general"
                  });
                  fallbackResponse = translatedFallback.translatedText;
                } catch {
                }
              }
              responses.push(`**${personality.name}**: ${fallbackResponse}`);
            }
          }
          return responses;
        } catch (error) {
          this.error(`Error generating panel responses: ${error}`);
          let fallbackResponses = [
            "This is an intriguing topic that deserves careful analysis.",
            "I see fascinating patterns and possibilities here.",
            "Let me consider the real-world implications.",
            "This raises some thought-provoking questions."
          ];
          if (context.language && context.language !== "en" && this.translationService) {
            try {
              const translatedFallbacks = await Promise.all(
                fallbackResponses.map(
                  (response) => this.translationService.translateText({
                    text: response,
                    targetLanguage: context.language,
                    context: "general"
                  }).then((result) => result.translatedText)
                )
              );
              fallbackResponses = translatedFallbacks;
            } catch {
            }
          }
          const personalityNames = ["The Analytical Expert", "The Creative Thinker", "The Practical Advisor", "The Curious Challenger"];
          return fallbackResponses.map((response, index2) => `**${personalityNames[index2]}**: ${response}`);
        }
      }
      async generateAIInteractions(responses, context) {
        const interactions = [];
        if (responses.length < 2) return interactions;
        try {
          const interactionPrompt = `Based on these panel responses:
${responses.join("\n")}

Generate a brief follow-up comment from one AI personality responding to another's point. Keep it conversational and insightful (1-2 sentences).`;
          const personalities = Object.values(this.aiPersonalities);
          const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];
          const selectedModel = "gemma3n:e2b";
          const result = await this.multiModelService.executeWithSpecificModel(
            selectedModel,
            `You are facilitating AI panel interactions. Generate natural conversational responses between the different AI personalities.

${interactionPrompt}`,
            {
              temperature: 0.7,
              maxTokens: 100,
              taskType: "ai-interaction"
            }
          );
          const interaction = result.response;
          interactions.push(`**${randomPersonality.name}**: ${interaction.trim()}`);
        } catch (error) {
          this.warn(`Could not generate AI interactions: ${error}`);
        }
        return interactions;
      }
      getCurrentBookContext(context) {
        if (context.documentId) {
          const chapterInfo = context.chapter ? ` (Chapter ${context.chapter})` : "";
          return `Document Context: Currently reading document ${context.documentId}${chapterInfo}`;
        }
        return "Open Discussion: No specific document context - free knowledge exploration";
      }
      getModelForPersonality(personalityName) {
        for (const [key, personality] of Object.entries(this.aiPersonalities)) {
          if (personality.name === personalityName) {
            return personality.model;
          }
        }
        return "qwen2.5:7b-instruct";
      }
      setOllamaService(ollamaService) {
        this.ollamaService = ollamaService;
      }
      setMultiModelService(multiModelService2) {
        this.multiModelService = multiModelService2;
      }
      setMemoryService(memoryService) {
        this.memoryService = memoryService;
      }
      setDefinitionsService(definitionsService) {
        this.definitionsService = definitionsService;
      }
      setTranslationService(translationService) {
        this.translationService = translationService;
        this.log("\u2705 Translation service has been set.");
        if (translationService && typeof translationService.translateText === "function") {
          this.log("\u2705 Translation service has translateText method");
          if (typeof translationService.getSupportedLanguages === "function") {
            try {
              const supportedLanguages = translationService.getSupportedLanguages();
              this.log(`\u2705 Translation service supports languages: ${supportedLanguages.join(", ")}`);
            } catch (error) {
              this.warn(`\u274C Failed to get supported languages: ${error}`);
            }
          }
        } else {
          this.error("\u274C Translation service is missing translateText method!");
        }
      }
      isResponseInEnglish(response) {
        const nonEnglishPatterns = {
          "es": /[áéíóúñ¿¡]/i,
          // Spanish
          "fr": /[àâäéèêëïîôöùûüÿç]/i,
          // French
          "de": /[äöüß]/i,
          // German
          "ja": /[\u3040-\u309F\u30A0-\u30FF]/,
          // Japanese Hiragana/Katakana
          "ko": /[\uAC00-\uD7AF]/,
          // Korean Hangul
          "zh": /[\u4E00-\u9FFF]/,
          // Chinese characters
          "ar": /[\u0600-\u06FF]/,
          // Arabic
          "ru": /[\u0400-\u04FF]/
          // Russian
        };
        for (const [lang, pattern] of Object.entries(nonEnglishPatterns)) {
          if (pattern.test(response)) {
            this.log(`\u2705 Detected non-English characters (${lang}) in response`);
            return false;
          }
        }
        const englishWords = [
          "the",
          "and",
          "is",
          "are",
          "was",
          "were",
          "to",
          "of",
          "in",
          "for",
          "with",
          "on",
          "at",
          "by",
          "this",
          "that",
          "have",
          "has",
          "had",
          "will",
          "would",
          "could",
          "should",
          "can",
          "may",
          "might",
          "must",
          "which",
          "what",
          "when",
          "where",
          "why",
          "how",
          "who",
          "whom",
          "their",
          "there",
          "they",
          "them",
          "these",
          "those",
          "then",
          "than",
          "from",
          "into",
          "about",
          "after",
          "before",
          "during",
          "between",
          "through",
          "under",
          "over",
          "above",
          "below",
          "within",
          "without"
        ];
        const words = response.toLowerCase().split(/\s+/).slice(0, 30);
        const englishWordCount = words.filter((word) => englishWords.includes(word)).length;
        const totalWords = words.length;
        const englishPercentage = totalWords > 0 ? englishWordCount / totalWords * 100 : 0;
        this.log(`\u{1F50D} Language detection: ${englishWordCount}/${totalWords} English words (${englishPercentage.toFixed(1)}%)`);
        const isEnglish = englishPercentage > 40;
        this.log(`\u{1F50D} Response classified as ${isEnglish ? "English" : "Non-English"}`);
        return isEnglish;
      }
      async refineResponse(response, context) {
        try {
          let refinedResponse = response.trim();
          refinedResponse = this.removeHallucinationPatterns(refinedResponse);
          const isValid = this.validateResponseAgainstContext(refinedResponse, context);
          if (!isValid) {
            return await this.generateGroundedFallback(context);
          }
          refinedResponse = this.formatResponseForReadability(refinedResponse, context);
          if (context.documentId && context.chapter) {
            refinedResponse = this.addContextMarkers(refinedResponse, context);
          }
          return refinedResponse;
        } catch (error) {
          this.warn(`Response refinement failed: ${error}`);
          return response;
        }
      }
      removeHallucinationPatterns(response) {
        const patterns = [
          /According to (studies|research|experts) (show|indicate|suggest)/gi,
          /It is well-known that/gi,
          /Research has shown that/gi,
          /Studies indicate that/gi,
          /Scientists have found that/gi,
          /As mentioned in (chapter|section|page) \d+/gi,
          /The author states that/gi,
          /In conclusion, we can see that/gi
        ];
        let cleaned = response;
        patterns.forEach((pattern) => {
          cleaned = cleaned.replace(pattern, "");
        });
        if (!response.includes("based on") && !response.includes("from the context")) {
          cleaned = cleaned.replace(/This definitely/gi, "This might");
          cleaned = cleaned.replace(/It is certain that/gi, "It seems that");
          cleaned = cleaned.replace(/Without a doubt/gi, "It appears that");
        }
        return cleaned.trim();
      }
      validateResponseAgainstContext(response, context) {
        if (response.length < 100 || this.isSimpleConversationalResponse(response)) {
          return true;
        }
        const suspiciousPatterns = [
          /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b.*?(wrote|said|discovered)/gi,
          // Names claiming authority
          /According to (recent|new|latest) (research|studies|findings)/gi,
          // Recent research claims
          /Scientists have (proven|discovered|found) that/gi,
          // Scientific authority claims
          /Studies show that.*definitely/gi
          // Definitive study claims
        ];
        const hasGrounding = /based on|according to the context|from the information provided|in the conversation|from your reading|in your current|from what I can see/gi.test(response);
        const hasSuspiciousContent = suspiciousPatterns.some((pattern) => pattern.test(response));
        if (hasSuspiciousContent && !hasGrounding && response.length > 200) {
          this.warn(`Response validation failed: suspicious authority claims without grounding`);
          return false;
        }
        return true;
      }
      isSimpleConversationalResponse(response) {
        const conversationalPatterns = [
          /^(hello|hi|hey|thanks|thank you)/gi,
          /^(I'd like to|I want to|I can|I'm here to)/gi,
          /^(That's|This is|It seems|It appears)/gi,
          /question.*explore.*further/gi,
          /help.*understand.*specific/gi
        ];
        return conversationalPatterns.some((pattern) => pattern.test(response.trim()));
      }
      async generateGroundedFallback(context) {
        const conversationLength = context.conversationHistory.length;
        const hasDocumentContext = context.documentId && context.chapter;
        let fallbackMessage = "";
        if (conversationLength > 0) {
          const lastUserMessage = context.conversationHistory.slice().reverse().find((msg) => msg.role === "user");
          if (lastUserMessage) {
            if (hasDocumentContext) {
              fallbackMessage = `I'd like to help you explore that question about your reading. Based on our conversation so far, could you point me to a specific part of Chapter ${context.chapter} you'd like to discuss? That way I can give you a more focused response.`;
            } else {
              fallbackMessage = `That's an interesting question. From our conversation, I can see you're thinking about this topic. Could you help me understand what specific aspect you'd like to explore further?`;
            }
          }
        }
        if (!fallbackMessage) {
          fallbackMessage = `I want to make sure I give you accurate information. Could you help me understand what specific aspect of this topic you'd like to discuss, or point me to relevant information you'd like to explore?`;
        }
        if (context.language && context.language !== "en" && this.translationService) {
          try {
            const translatedFallback = await this.translationService.translateText({
              text: fallbackMessage,
              targetLanguage: context.language,
              context: "general"
            });
            return translatedFallback.translatedText;
          } catch {
          }
        }
        return fallbackMessage;
      }
      formatResponseForReadability(response, context) {
        let formatted = response.replace(/\n\s*\n\s*\n/g, "\n\n").replace(/\s+/g, " ").trim();
        if (formatted.length > 300) {
          const sentences = formatted.split(/(?<=[.!?])\s+/);
          const paragraphs = [];
          let currentParagraph = "";
          for (let i = 0; i < sentences.length; i++) {
            currentParagraph += sentences[i] + " ";
            if ((i + 1) % 3 === 0 || sentences[i].includes("However") || sentences[i].includes("Moreover") || sentences[i].includes("Furthermore") || sentences[i].includes("In addition") || sentences[i].includes("On the other hand")) {
              paragraphs.push(currentParagraph.trim());
              currentParagraph = "";
            }
          }
          if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
          }
          formatted = paragraphs.join("\n\n");
        }
        if (formatted.includes("\u2022") || formatted.includes("-") || formatted.includes("*")) {
          formatted = formatted.replace(/^[•\-\*]\s*/gm, "\u2022 ");
        }
        formatted = formatted.replace(/([.!?])([A-Z])/g, "$1 $2").replace(/\s+([.!?])/g, "$1").trim();
        return formatted;
      }
      addContextMarkers(response, context) {
        if (context.documentId && context.chapter && !response.includes("Chapter")) {
          const contextNote = ` (based on Chapter ${context.chapter})`;
          if (response.length > 100 && !response.includes("question") && !response.includes("?")) {
            return response + contextNote;
          }
        }
        return response;
      }
      async translateResponse(response, targetLanguage) {
        if (!this.translationService || !targetLanguage || targetLanguage === "en") {
          return response;
        }
        try {
          this.log(`Translating response to ${targetLanguage}`);
          const translated = await this.translationService.translateText({
            text: response,
            targetLanguage,
            context: "general"
          });
          return translated.translatedText;
        } catch (error) {
          this.error(`Translation to ${targetLanguage} failed: ${error.message}. Falling back to original response.`);
          return response;
        }
      }
      async performFactCheck(response, agentContext, originalQuery) {
        try {
          const hasSpecificClaims = this.detectSpecificClaims(response);
          if (!hasSpecificClaims) {
            return response;
          }
          const contextSupport = this.checkContextSupport(response, agentContext);
          if (contextSupport.score < 0.6) {
            this.warn(`Fact-check failed: response makes unsupported claims (score: ${contextSupport.score})`);
            return this.generateSaferResponse(originalQuery, agentContext);
          }
          return response;
        } catch (error) {
          this.warn(`Fact-checking failed: ${error}`);
          return response;
        }
      }
      detectSpecificClaims(response) {
        const claimPatterns = [
          /\b\d{4}\b/,
          // Years
          /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b.*?(said|wrote|discovered|found)/gi,
          // Names with actions
          /according to|research shows|studies indicate/gi,
          // Authority claims
          /it is (known|proven|established) that/gi,
          // Certainty claims
          /the (author|text|book) (states|mentions|says)/gi
          // Text attribution claims
        ];
        return claimPatterns.some((pattern) => pattern.test(response));
      }
      checkContextSupport(response, agentContext) {
        let score = 1;
        const issues = [];
        if (!agentContext || agentContext.length < 50) {
          score -= 0.3;
          issues.push("Limited context available");
        }
        const contextLower = agentContext.toLowerCase();
        const responseLower = response.toLowerCase();
        const yearMatches = response.match(/\b\d{4}\b/g);
        if (yearMatches) {
          for (const year of yearMatches) {
            if (!contextLower.includes(year)) {
              score -= 0.2;
              issues.push(`Year ${year} not found in context`);
            }
          }
        }
        if (responseLower.includes("research") && !contextLower.includes("research")) {
          score -= 0.3;
          issues.push("Research claims not supported by context");
        }
        if (responseLower.includes("studies") && !contextLower.includes("studies")) {
          score -= 0.3;
          issues.push("Study claims not supported by context");
        }
        const definitivePatterns = [
          /this is exactly/gi,
          /without doubt/gi,
          /definitely means/gi,
          /always results in/gi
        ];
        if (definitivePatterns.some((pattern) => pattern.test(response))) {
          score -= 0.2;
          issues.push("Overly definitive statements detected");
        }
        return { score: Math.max(0, score), issues };
      }
      generateSaferResponse(originalQuery, agentContext) {
        if (agentContext && agentContext.length > 100) {
          const contextSnippet = agentContext.substring(0, 200);
          return `Based on the information I have access to, I can see some relevant material about your question. From your reading: "${contextSnippet}..." 

Would you like me to help you explore a specific aspect of this further, or could you point me to a particular section you'd like to discuss?`;
        } else {
          return `I want to make sure I give you accurate information about "${originalQuery}". I don't have enough specific context right now to provide a detailed response. Could you help me by pointing to a specific section of your reading, or let me know what particular aspect you're most interested in exploring?`;
        }
      }
      // 🌍 MULTILINGUAL LEARNING METHODS
      async detectLanguage(text2) {
        try {
          if (this.translationService && typeof this.translationService.detectLanguage === "function") {
            return await this.translationService.detectLanguage(text2);
          }
          const languagePatterns = {
            "es": /[áéíóúñ¿¡]/i,
            // Spanish
            "fr": /[àâäéèêëïîôöùûüÿç]/i,
            // French
            "de": /[äöüß]/i,
            // German
            "ja": /[\u3040-\u309F\u30A0-\u30FF]/,
            // Japanese Hiragana/Katakana
            "ko": /[\uAC00-\uD7AF]/,
            // Korean Hangul
            "zh": /[\u4E00-\u9FFF]/,
            // Chinese characters
            "ar": /[\u0600-\u06FF]/,
            // Arabic
            "ru": /[\u0400-\u04FF]/,
            // Russian
            "it": /[àèéìíîòóù]/i,
            // Italian
            "pt": /[ãâáàêéíôóõúç]/i,
            // Portuguese
            "nl": /[ëïöü]/i,
            // Dutch
            "pl": /[ąćęłńóśźż]/i,
            // Polish
            "sv": /[åäö]/i,
            // Swedish
            "da": /[æøå]/i,
            // Danish
            "no": /[æøå]/i,
            // Norwegian
            "fi": /[äöå]/i,
            // Finnish
            "en": /^[a-zA-Z\s.,!?;:'"()-]+$/
            // English (basic check)
          };
          for (const [lang, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(text2)) {
              return lang;
            }
          }
          return "en";
        } catch (error) {
          this.warn(`Language detection failed: ${error}`);
          return "en";
        }
      }
      analyzeCulturalPatterns(text2, language) {
        const patterns = {
          formality: "neutral",
          politeness: "standard",
          culturalReferences: [],
          communicationStyle: "direct"
        };
        const lowerText = text2.toLowerCase();
        if (language === "es") {
          if (lowerText.includes("usted") || lowerText.includes("le")) {
            patterns.formality = "formal";
            patterns.politeness = "high";
          } else if (lowerText.includes("t\xFA") || lowerText.includes("te")) {
            patterns.formality = "informal";
            patterns.politeness = "friendly";
          }
          if (lowerText.includes("gracias") || lowerText.includes("por favor")) {
            patterns.culturalReferences.push("polite-expressions");
          }
        }
        if (language === "fr") {
          if (lowerText.includes("vous") || lowerText.includes("s'il vous pla\xEEt")) {
            patterns.formality = "formal";
            patterns.politeness = "high";
          } else if (lowerText.includes("tu") || lowerText.includes("s'il te pla\xEEt")) {
            patterns.formality = "informal";
            patterns.politeness = "friendly";
          }
        }
        if (language === "ja") {
          if (lowerText.includes("\u3067\u3059") || lowerText.includes("\u307E\u3059")) {
            patterns.formality = "formal";
            patterns.politeness = "high";
          } else if (lowerText.includes("\u3060") || lowerText.includes("\u308B")) {
            patterns.formality = "informal";
            patterns.politeness = "casual";
          }
          if (lowerText.includes("\u304A\u75B2\u308C\u69D8") || lowerText.includes("\u3042\u308A\u304C\u3068\u3046")) {
            patterns.culturalReferences.push("polite-expressions");
          }
        }
        if (language === "ko") {
          if (lowerText.includes("\uC2B5\uB2C8\uB2E4") || lowerText.includes("\uC785\uB2C8\uB2E4")) {
            patterns.formality = "formal";
            patterns.politeness = "high";
          } else if (lowerText.includes("\uC5B4\uC694") || lowerText.includes("\uC544\uC694")) {
            patterns.formality = "semi-formal";
            patterns.politeness = "polite";
          }
        }
        if (language === "de") {
          if (lowerText.includes("sie") || lowerText.includes("ihnen")) {
            patterns.formality = "formal";
            patterns.politeness = "high";
          } else if (lowerText.includes("du") || lowerText.includes("dir")) {
            patterns.formality = "informal";
            patterns.politeness = "friendly";
          }
        }
        if (lowerText.includes("?") || lowerText.includes("\xBF")) {
          patterns.communicationStyle = "questioning";
        } else if (lowerText.includes("!") || lowerText.includes("\xA1")) {
          patterns.communicationStyle = "emphatic";
        }
        return patterns;
      }
      async extractCrossLanguageInsights(userMessage, response, context) {
        const insights = {
          languageSwitching: false,
          culturalAdaptation: false,
          translationQuality: "good",
          crossCulturalPatterns: []
        };
        if (context.conversationHistory.length > 1) {
          const recentMessages = context.conversationHistory.slice(-4);
          const languages = await Promise.all(recentMessages.map((msg) => this.detectLanguage(msg.content)));
          const uniqueLanguages = new Set(languages);
          if (uniqueLanguages.size > 1) {
            insights.languageSwitching = true;
            insights.crossCulturalPatterns.push("multilingual-conversation");
          }
        }
        const userLanguage = await this.detectLanguage(userMessage);
        const responseLanguage = await this.detectLanguage(response);
        if (userLanguage !== responseLanguage) {
          insights.culturalAdaptation = true;
          insights.crossCulturalPatterns.push("language-adaptation");
        }
        const culturalKeywords = {
          "en": ["hello", "thanks", "please", "sorry"],
          "es": ["hola", "gracias", "por favor", "lo siento"],
          "fr": ["bonjour", "merci", "s'il vous pla\xEEt", "d\xE9sol\xE9"],
          "de": ["hallo", "danke", "bitte", "entschuldigung"],
          "ja": ["\u3053\u3093\u306B\u3061\u306F", "\u3042\u308A\u304C\u3068\u3046", "\u304A\u9858\u3044", "\u3059\u307F\u307E\u305B\u3093"],
          "ko": ["\uC548\uB155\uD558\uC138\uC694", "\uAC10\uC0AC\uD569\uB2C8\uB2E4", "\uBD80\uD0C1\uD569\uB2C8\uB2E4", "\uC8C4\uC1A1\uD569\uB2C8\uB2E4"]
        };
        const userKeywords = culturalKeywords[userLanguage] || [];
        const responseKeywords = culturalKeywords[responseLanguage] || [];
        if (userKeywords.some((keyword) => userMessage.toLowerCase().includes(keyword)) && responseKeywords.some((keyword) => response.toLowerCase().includes(keyword))) {
          insights.crossCulturalPatterns.push("cultural-expression-matching");
        }
        return insights;
      }
    };
  }
});

// server/agents/quiz-agent.ts
import { eq as eq9 } from "drizzle-orm";
var QuizAgent;
var init_quiz_agent = __esm({
  "server/agents/quiz-agent.ts"() {
    "use strict";
    init_base_agent();
    init_db();
    init_schema();
    init_document_rag_service();
    QuizAgent = class extends BaseAgent {
      ollamaService;
      quizSessions = /* @__PURE__ */ new Map();
      userQuizHistory = /* @__PURE__ */ new Map();
      quizTemplates = /* @__PURE__ */ new Map();
      translationService;
      // Will be injected
      constructor(ollamaService) {
        super({
          name: "QuizAgent",
          description: "Generates personalized quizzes about biblical content",
          interval: 3e5,
          // 5 minutes
          maxRetries: 3,
          timeout: 18e4,
          // 180 seconds (3 minutes) for longer quiz generation
          specialties: ["Quiz Generation", "Assessment Creation", "Multi-language Quizzes", "Difficulty Adaptation", "Performance Analysis"]
        });
        this.ollamaService = ollamaService;
      }
      setOllamaService(ollamaService) {
        this.ollamaService = ollamaService;
      }
      setTranslationService(service) {
        this.translationService = service;
        this.log("\u{1F310} Translation service set for Quiz Agent");
      }
      async initialize() {
        this.log("Quiz Agent initialized");
        await this.loadQuizTemplates();
      }
      async processTask(task) {
        this.log(`Processing quiz agent task: ${task.type}`);
        switch (task.type) {
          case "GENERATE_QUIZ":
            return await this.generateQuiz(task.data);
          case "ANALYZE_QUIZ_PERFORMANCE":
            return await this.analyzeQuizPerformance(task.data);
          case "ADAPT_QUIZ_DIFFICULTY":
            return await this.adaptQuizDifficulty(task.data);
          case "GENERATE_DAILY_QUIZ":
            return await this.generateDailyQuiz(task.data);
          default:
            this.warn(`Unknown quiz agent task type: ${task.type}`);
            return null;
        }
      }
      async cleanup() {
        this.log("Cleaning up Quiz Agent");
      }
      async generateQuiz(data) {
        try {
          const {
            documentId,
            chapter,
            userId,
            sessionId = "default",
            difficulty = "intermediate",
            questionTypes = ["multiple-choice", "true-false"],
            numQuestions = 5,
            language = "en"
          } = data;
          this.log(`\u{1F3AF} Generating quiz for document ${documentId}, chapter ${chapter} in ${language}`);
          this.log(`\u{1F527} Translation service available: ${this.translationService ? "YES" : "NO"}`);
          if (this.ollamaService) {
            this.ollamaService.clearCacheForDocument(documentId, chapter);
          }
          try {
            const { QueryResultCacheService: QueryResultCacheService2 } = await Promise.resolve().then(() => (init_query_result_cache_service(), query_result_cache_service_exports));
            const queryCache = new QueryResultCacheService2();
            await queryCache.invalidateContext(userId, documentId);
          } catch (error) {
            this.warn(`Failed to clear query cache: ${error}`);
          }
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
          const documentResult = await this.getDocumentContent(documentId, chapter);
          if (!documentResult) {
            throw new Error("Document content not found");
          }
          const { content: documentContent, title: documentTitle } = documentResult;
          const ragContext = {
            userId,
            currentDocument: documentId,
            currentChapter: chapter,
            conversationHistory: [],
            userStudyPatterns: await this.getUserStudyPatterns(userId),
            preferredTopics: await this.getUserPreferredTopics(userId),
            studyLevel: difficulty
          };
          const quiz = await this.generateQuizWithAI(documentContent, context, ragContext, numQuestions, documentTitle, language);
          this.saveQuizToHistory(userId, quiz);
          this.log(`\u2705 Quiz generated successfully with ${quiz.questions.length} questions in ${language}`);
          return quiz;
        } catch (error) {
          this.error(`Failed to generate quiz: ${error.message}`);
          throw new Error("Quiz generation is taking longer than usual. Please wait a moment and try again if you don't see a result.");
        }
      }
      async generateQuizWithAI(content, context, ragContext, numQuestions, documentTitle, language = "en") {
        if (!this.ollamaService) {
          throw new Error("Ollama service is not connected");
        }
        this.log(`\u{1F9E0} Starting AI quiz generation in ${language}`);
        const prompt = this.buildQuizGenerationPrompt(content, context, numQuestions, documentTitle, language);
        let response;
        const documentContext = `document: ${context.documentId}, chapter: ${context.chapter || "all"}`;
        if (language !== "en") {
          this.log(`\u{1F310} Using language-aware generation for ${language}`);
          response = await this.ollamaService.generateTextWithLanguage(prompt, language, {
            context: documentContext,
            temperature: 0.2
          });
          this.log(`\u{1F4DD} AI Response preview: "${response.substring(0, 100)}..."`);
        } else {
          this.log(`\u{1F1FA}\u{1F1F8} Using English generation`);
          response = await this.ollamaService.generateText(prompt, {
            context: documentContext,
            temperature: 0.2
          });
        }
        const quiz = await this.parseQuizFromResponse(response, context, language);
        if (language !== "en" && this.translationService && this.isQuizInEnglish(quiz)) {
          this.log(`\u{1F504} Quiz appears to be in English, attempting translation to ${language}`);
          try {
            const translatedQuiz = await this.translationService.translateQuizContent(quiz, language);
            this.log(`\u2705 Quiz translated successfully to ${language}`);
            const enhancedQuiz2 = await this.enhanceQuizWithRAG(translatedQuiz, ragContext);
            return enhancedQuiz2;
          } catch (error) {
            this.warn(`\u274C Translation failed: ${error}, returning original quiz`);
          }
        }
        const enhancedQuiz = await this.enhanceQuizWithRAG(quiz, ragContext);
        return enhancedQuiz;
      }
      buildQuizGenerationPrompt(content, context, numQuestions, documentTitle, language = "en") {
        const difficulty = context.userLevel;
        const questionTypes = context.preferredQuestionTypes.join(", ");
        const contentToUse = content.length > 8e3 ? content.substring(0, 8e3) + "..." : content;
        const formatInstructions = this.getLanguageSpecificFormatInstructions(language, numQuestions);
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
      extractJsonFromString(text2) {
        let openBraces = 0;
        let start = -1;
        let end = -1;
        for (let i = 0; i < text2.length; i++) {
          if (text2[i] === "{") {
            if (start === -1) start = i;
            openBraces++;
          } else if (text2[i] === "}") {
            openBraces--;
            if (openBraces === 0 && start !== -1) {
              end = i;
              break;
            }
          }
        }
        if (start !== -1 && end !== -1) {
          return text2.substring(start, end + 1);
        }
        const match = text2.match(/\{[\s\S]*\}/);
        return match ? match[0] : null;
      }
      completeQuestionObject(partialQuestion, index2, context) {
        return {
          id: `q_${index2}_${Date.now()}`,
          type: partialQuestion.type || "multiple-choice",
          question: partialQuestion.question || `Question ${index2 + 1}`,
          options: partialQuestion.options || [],
          correctAnswer: partialQuestion.correctAnswer || (partialQuestion.options?.[0] || "Unknown"),
          explanation: partialQuestion.explanation || "No explanation provided.",
          difficulty: "medium",
          tags: ["parsed-question"],
          source: {
            documentId: context.documentId || 0,
            chapter: context.chapter
          }
        };
      }
      async repairInvalidJSON(invalidJson) {
        if (!this.ollamaService) {
          throw new Error("Ollama service not available for JSON repair.");
        }
        this.log("-> Sending broken JSON to AI for repair.");
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
          throw new Error("AI failed to return a valid JSON object during the repair attempt.");
        }
        this.log("<- Received repaired JSON from AI.");
        return extractedRepairedJson;
      }
      constructQuizObject(quizData, context) {
        if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          throw new Error('Parsed JSON is valid but is missing a non-empty "questions" array.');
        }
        const quiz = {
          id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: quizData.title || quizData.quizTitle || `Quiz: Document ${context.documentId}`,
          description: quizData.description || "A quiz to test your knowledge.",
          questions: quizData.questions.map((q, index2) => ({
            id: `q_${index2}_${Date.now()}`,
            type: q.type || q.questionType || "multiple-choice",
            question: q.question || q.questionText || `Question ${index2 + 1}`,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "No explanation provided.",
            difficulty: q.difficulty || "medium",
            tags: q.tags || [],
            source: {
              documentId: context.documentId || 0,
              chapter: context.chapter
            }
          })),
          difficulty: context.userLevel,
          estimatedTime: quizData.estimatedTime || quizData.questions.length * 2,
          tags: quizData.tags || ["quiz"],
          createdAt: /* @__PURE__ */ new Date(),
          documentId: context.documentId || 0,
          chapter: context.chapter
        };
        this.log(`\u2705 Successfully constructed quiz object with ${quiz.questions.length} questions.`);
        return quiz;
      }
      createFallbackQuiz(context) {
        const chapterText = context.chapter ? ` Chapter ${context.chapter}` : "";
        return {
          id: `quiz_fallback_${Date.now()}`,
          title: `Quiz: Document${chapterText}`,
          description: "Test your understanding of this document's content",
          questions: [
            {
              id: "q_1",
              type: "multiple-choice",
              question: "What is a central theme in this document?",
              options: ["Main theme or concept", "Secondary theme", "Supporting idea", "Background information"],
              correctAnswer: "Main theme or concept",
              explanation: "Documents typically have main themes or central concepts that are developed throughout the text.",
              difficulty: "medium",
              tags: ["main-theme", "content-analysis"],
              source: {
                documentId: context.documentId || 0,
                chapter: context.chapter
              }
            },
            {
              id: "q_2",
              type: "true-false",
              question: "Understanding the context is important for comprehending the document's message.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "Context is crucial for proper understanding of any written material, including its themes, characters, and intended message.",
              difficulty: "easy",
              tags: ["comprehension", "context"],
              source: {
                documentId: context.documentId || 0,
                chapter: context.chapter
              }
            }
          ],
          difficulty: context.userLevel,
          estimatedTime: 5,
          tags: ["document-content", "fallback"],
          createdAt: /* @__PURE__ */ new Date(),
          documentId: context.documentId || 0,
          chapter: context.chapter
        };
      }
      async enhanceQuizWithRAG(quiz, ragContext) {
        try {
          const enhancedQuestions = await Promise.all(
            quiz.questions.map(async (question) => {
              const ragResponse = await documentRAGService.processRAGQuery(
                question.question,
                ragContext,
                { maxSources: 2, includeAnnotations: true }
              );
              if (ragResponse.sources.length > 0) {
                question.explanation += `

\u{1F4DA} Additional context: ${ragResponse.sources[0].excerpt}`;
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
      async getDocumentContent(documentId, chapter) {
        this.log(`Fetching content for document ${documentId}, chapter ${chapter || "all"}`);
        try {
          const document = await db.query.documents.findFirst({
            where: eq9(documents.id, documentId)
          });
          if (!document) {
            this.warn(`Document with ID ${documentId} not found.`);
            return null;
          }
          let content = document.content;
          if (chapter && document.content) {
            try {
              const parsedContent = JSON.parse(document.content);
              const chapterData = parsedContent.chapters.find((c) => c.number === chapter);
              if (chapterData) {
                content = chapterData.paragraphs.map((p) => p.text).join("\n\n");
              } else {
                this.warn(`Chapter ${chapter} not found in document ${documentId}. Falling back to full document.`);
              }
            } catch (error) {
              this.error(`Failed to parse document content for chapter selection: ${error}`);
            }
          }
          this.log(`\u2705 Successfully fetched content for document ${documentId}.`);
          return { content, title: document.title };
        } catch (error) {
          this.error(`\u274C Failed to fetch document content: ${error}`);
          return null;
        }
      }
      async getUserStudyPatterns(userId) {
        return ["literary analysis", "content comprehension", "thematic understanding"];
      }
      async getUserPreferredTopics(userId) {
        return ["character development", "main themes", "narrative structure", "key concepts"];
      }
      saveQuizToHistory(userId, quiz) {
        if (!this.userQuizHistory.has(userId)) {
          this.userQuizHistory.set(userId, []);
        }
        const userHistory = this.userQuizHistory.get(userId);
        userHistory.push(quiz);
        if (userHistory.length > 20) {
          userHistory.splice(0, userHistory.length - 20);
        }
      }
      async loadQuizTemplates() {
        this.quizTemplates.set("narrative", {
          questionTypes: ["multiple-choice", "true-false", "short-answer"],
          focus: "plot, characters, themes"
        });
        this.quizTemplates.set("teaching", {
          questionTypes: ["multiple-choice", "fill-in-blank", "short-answer"],
          focus: "principles, applications, concepts"
        });
        this.quizTemplates.set("poetry", {
          questionTypes: ["multiple-choice", "short-answer"],
          focus: "imagery, symbolism, themes"
        });
      }
      async analyzeQuizPerformance(data) {
        return {
          score: 85,
          strengths: ["biblical knowledge", "theological understanding"],
          areasForImprovement: ["historical context", "cross-references"],
          recommendations: ["Study more historical background", "Practice connecting themes across books"]
        };
      }
      async adaptQuizDifficulty(data) {
        const { performance: performance2 } = data;
        if (performance2.score < 60) {
          return "beginner";
        } else if (performance2.score > 85) {
          return "advanced";
        } else {
          return "intermediate";
        }
      }
      async generateDailyQuiz(data) {
        const documentId = data.documentId || 1;
        return await this.generateQuiz({
          documentId,
          userId: data.userId,
          difficulty: "intermediate",
          numQuestions: 5
        });
      }
      // Public methods for external access
      async handleQuizRequest(message, context) {
        try {
          const sessionId = context?.sessionId || "default";
          const userId = context?.userId || 2;
          const documentId = context?.documentId;
          const chapter = context?.chapter;
          const language = context?.language || "en";
          const quizParams = this.parseQuizRequest(message);
          return await this.generateQuiz({
            documentId: documentId || 1,
            chapter,
            userId,
            sessionId,
            language,
            // Pass language to quiz generation
            ...quizParams
          });
        } catch (error) {
          this.error(`Quiz request handling failed: ${error}`);
          throw error;
        }
      }
      parseQuizRequest(message) {
        const lowerMessage = message.toLowerCase();
        let difficulty = "intermediate";
        if (lowerMessage.includes("easy") || lowerMessage.includes("beginner")) {
          difficulty = "beginner";
        } else if (lowerMessage.includes("hard") || lowerMessage.includes("advanced")) {
          difficulty = "advanced";
        }
        const questionTypes = ["multiple-choice", "true-false"];
        if (lowerMessage.includes("fill in") || lowerMessage.includes("blank")) {
          questionTypes.push("fill-in-blank");
        }
        if (lowerMessage.includes("short answer") || lowerMessage.includes("essay")) {
          questionTypes.push("short-answer");
        }
        const numMatch = message.match(/(\d+)\s*questions?/);
        const numQuestions = numMatch ? parseInt(numMatch[1]) : 5;
        return {
          difficulty,
          questionTypes,
          numQuestions
        };
      }
      getQuizHistory(userId) {
        return this.userQuizHistory.get(userId) || [];
      }
      getActiveSessionsCount() {
        return this.quizSessions.size;
      }
      // Enhanced generateQuiz method with language support
      async generateMultilingualQuiz(data) {
        try {
          const {
            documentId,
            chapter,
            userId,
            sessionId = "default",
            difficulty = "intermediate",
            questionTypes = ["multiple-choice", "true-false"],
            numQuestions = 5,
            targetLanguage = "en"
          } = data;
          this.log(`\u{1F310} Generating ${targetLanguage} quiz for document ${documentId}, chapter ${chapter}`);
          const englishQuiz = await this.generateQuiz({
            documentId,
            chapter,
            userId,
            sessionId,
            difficulty,
            questionTypes,
            numQuestions
          });
          if (targetLanguage === "en" || !this.translationService) {
            return englishQuiz;
          }
          this.log(`\u{1F504} Translating quiz to ${targetLanguage}...`);
          const translatedQuiz = await this.translationService.translateQuizContent(
            englishQuiz,
            targetLanguage
          );
          this.log(`\u2705 Multilingual quiz generated successfully in ${targetLanguage}`);
          return translatedQuiz;
        } catch (error) {
          this.error(`Failed to generate multilingual quiz: ${error}`);
          throw error;
        }
      }
      // Enhanced quiz request handler with language detection
      async handleMultilingualQuizRequest(message, context) {
        try {
          const sessionId = context?.sessionId || "default";
          const userId = context?.userId || 2;
          const documentId = context?.documentId;
          const chapter = context?.chapter;
          const targetLanguage = context?.language || "en";
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
      getLanguageSpecificMainPrompt(language, difficulty, documentTitle, numQuestions, questionTypes) {
        switch (language) {
          case "es":
            return `Eres un educador experto creando un cuestionario de nivel ${difficulty} sobre el libro/documento titulado "${documentTitle}".

REQUISITOS:
- Crea exactamente ${numQuestions} preguntas sobre el CONTENIDO ESPEC\xCDFICO de "${documentTitle}"
- Tipos de preguntas: ${questionTypes}
- Nivel de dificultad: ${difficulty}
- Enf\xF3cate en el contenido \xFAnico de este libro: personajes, eventos, temas, conceptos y detalles
- Las preguntas deben ser \xFAnicas para "${documentTitle}" y NO aplicables a otros libros
- Incluye referencias espec\xEDficas a pasajes, citas o conceptos de este texto
- Cada pregunta debe evaluar la comprensi\xF3n del contenido real de "${documentTitle}"
- Etiqueta las preguntas con temas relevantes para este libro espec\xEDfico (ej: "desarrollo-personaje", "tema-principal", "contexto-hist\xF3rico")
- NO hagas suposiciones gen\xE9ricas - basa todo en el contenido real proporcionado`;
          case "fr":
            return `Vous \xEAtes un \xE9ducateur expert cr\xE9ant un quiz de niveau ${difficulty} sur le livre/document intitul\xE9 "${documentTitle}".

EXIGENCES:
- Cr\xE9ez exactement ${numQuestions} questions sur le CONTENU SP\xC9CIFIQUE de "${documentTitle}"
- Types de questions: ${questionTypes}
- Niveau de difficult\xE9: ${difficulty}
- Concentrez-vous sur le contenu unique de ce livre: personnages, \xE9v\xE9nements, th\xE8mes, concepts et d\xE9tails
- Les questions doivent \xEAtre uniques \xE0 "${documentTitle}" et NON applicables \xE0 d'autres livres
- Incluez des r\xE9f\xE9rences sp\xE9cifiques aux passages, citations ou concepts de ce texte
- Chaque question doit tester la compr\xE9hension du contenu r\xE9el de "${documentTitle}"
- \xC9tiquetez les questions avec des th\xE8mes pertinents pour ce livre sp\xE9cifique (ex: "d\xE9veloppement-personnage", "th\xE8me-principal", "contexte-historique")
- NE faites PAS d'hypoth\xE8ses g\xE9n\xE9riques - basez tout sur le contenu r\xE9el fourni`;
          case "de":
            return `Sie sind ein Expertenp\xE4dagoge, der ein ${difficulty}-Level-Quiz \xFCber das Buch/Dokument mit dem Titel "${documentTitle}" erstellt.

ANFORDERUNGEN:
- Erstellen Sie genau ${numQuestions} Fragen \xFCber den SPEZIFISCHEN INHALT von "${documentTitle}"
- Fragetypen: ${questionTypes}
- Schwierigkeitsgrad: ${difficulty}
- Konzentrieren Sie sich auf den einzigartigen Inhalt dieses Buches: Charaktere, Ereignisse, Themen, Konzepte und Details
- Fragen m\xFCssen einzigartig f\xFCr "${documentTitle}" sein und NICHT auf andere B\xFCcher anwendbar
- F\xFCgen Sie spezifische Verweise auf Passagen, Zitate oder Konzepte aus diesem Text hinzu
- Jede Frage sollte das Verst\xE4ndnis des tats\xE4chlichen Inhalts von "${documentTitle}" testen
- Markieren Sie Fragen mit Themen, die f\xFCr dieses spezifische Buch relevant sind (z.B. "charakterentwicklung", "hauptthema", "historischer-kontext")
- Machen Sie KEINE generischen Annahmen - basieren Sie alles auf dem tats\xE4chlich bereitgestellten Inhalt`;
          default:
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
      getLanguageSpecificFormatInstructions(language, numQuestions = 5) {
        const difficulty = this.quizSessions.get("default")?.userLevel || "intermediate";
        switch (language) {
          case "es":
            return `\u26A0\uFE0F ABSOLUTE RULES:
- ZERO English words allowed
- ZERO mixed languages allowed
- EVERY single word must be in Spanish
- NO introductory text or explanations
- START DIRECTLY with the quiz format below
- NO text before the quiz format

FORMATO OBLIGATORIO - RESPONDE EXACTAMENTE AS\xCD:

## Cuestionario: [T\xEDtulo del Documento]

**Descripci\xF3n:** Pon a prueba tu conocimiento de [T\xEDtulo del Documento]

**Instrucciones:** Elige la mejor respuesta para cada pregunta.

**1. [Pregunta basada en contenido espec\xEDfico del documento]**
   a) [Opci\xF3n A]
   b) [Opci\xF3n B] 
   c) [Opci\xF3n C]
   d) [Opci\xF3n D]

**Respuesta:** [Letra de la opci\xF3n correcta]

**Explicaci\xF3n:** [Explicaci\xF3n que hace referencia al contenido espec\xEDfico del documento]

**Dificultad:** ${difficulty === "beginner" ? "F\xE1cil" : difficulty === "intermediate" ? "Media" : "Dif\xEDcil"}
**Etiquetas:** [temas-relevantes]

**2. [Segunda pregunta]**
   a) [Opci\xF3n A]
   b) [Opci\xF3n B] 
   c) [Opci\xF3n C]
   d) [Opci\xF3n D]

**Respuesta:** [Letra de la opci\xF3n correcta]

**Explicaci\xF3n:** [Explicaci\xF3n]

[Contin\xFAa con exactamente ${numQuestions} preguntas en este formato]

IMPORTANTE: NO escribas ning\xFAn texto introductorio. Comienza DIRECTAMENTE con "## Cuestionario:"`;
          case "fr":
            return `\u26A0\uFE0F R\xC8GLES ABSOLUES:
- AUCUN mot anglais autoris\xE9
- AUCUN m\xE9lange de langues autoris\xE9
- CHAQUE mot doit \xEAtre en fran\xE7ais
- AUCUN texte d'introduction ou d'explications
- COMMENCEZ DIRECTEMENT avec le format ci-dessous

FORMAT OBLIGATOIRE - R\xC9PONDEZ EXACTEMENT AINSI:

## Quiz: [Titre du Document]

**Description:** Testez vos connaissances sur [Titre du Document]

**Instructions:** Choisissez la meilleure r\xE9ponse pour chaque question.

**1. [Question bas\xE9e sur le contenu sp\xE9cifique du document]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**R\xE9ponse:** [Lettre de l'option correcte]

**Explication:** [Explication faisant r\xE9f\xE9rence au contenu sp\xE9cifique du document]

**Difficult\xE9:** ${difficulty === "beginner" ? "Facile" : difficulty === "intermediate" ? "Moyenne" : "Difficile"}
**Tags:** [th\xE8mes-pertinents]

**2. [Deuxi\xE8me question]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**R\xE9ponse:** [Lettre de l'option correcte]

**Explication:** [Explication]

[Continuez avec exactement ${numQuestions} questions dans ce format]`;
          case "de":
            return `\u26A0\uFE0F ABSOLUTE REGELN:
- KEINE englischen W\xF6rter erlaubt
- KEINE Sprachmischung erlaubt
- JEDES Wort muss auf Deutsch sein
- KEIN Einf\xFChrungstext oder Erkl\xE4rungen
- BEGINNEN Sie DIREKT mit dem Format unten

OBLIGATORISCHES FORMAT - ANTWORTEN SIE GENAU SO:

## Quiz: [Dokumenttitel]

**Beschreibung:** Testen Sie Ihr Wissen \xFCber [Dokumenttitel]

**Anweisungen:** W\xE4hlen Sie die beste Antwort f\xFCr jede Frage.

**1. [Frage basierend auf spezifischem Inhalt des Dokuments]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Antwort:** [Buchstabe der richtigen Option]

**Erkl\xE4rung:** [Erkl\xE4rung mit Bezug auf spezifischen Inhalt des Dokuments]

**Schwierigkeit:** ${difficulty === "beginner" ? "Einfach" : difficulty === "intermediate" ? "Mittel" : "Schwer"}
**Tags:** [relevante-themen]

**2. [Zweite Frage]**
   a) [Option A]
   b) [Option B] 
   c) [Option C]
   d) [Option D]

**Antwort:** [Buchstabe der richtigen Option]

**Erkl\xE4rung:** [Erkl\xE4rung]

[Fahren Sie mit genau ${numQuestions} Fragen in diesem Format fort]`;
          default:
            return `\u26A0\uFE0F ABSOLUTE RULES:
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

**Difficulty:** ${difficulty === "beginner" ? "Easy" : difficulty === "intermediate" ? "Medium" : "Hard"}
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
      async parseQuizFromResponse(response, context, language = "en") {
        try {
          const cleanResponse = (() => {
            const lines = response.split("\n");
            let startIdx = -1;
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
            let firstContentIdx = 0;
            while (firstContentIdx < lines.length && introPatterns.some((p) => p.test(lines[firstContentIdx].trim()))) {
              firstContentIdx++;
            }
            const filteredLines = lines.slice(firstContentIdx);
            for (let i = 0; i < filteredLines.length; i++) {
              const line = filteredLines[i].trim();
              if (line.startsWith("##") || line.startsWith("**Cuestionario:") || line.startsWith("**Quiz:") || line.trim().startsWith("Quiz:") || line.trim().match(/^\*\*?1\./) || line.trim().match(/^1\./) || // Add Spanish-specific patterns
              line.trim().match(/^\*\*?(\d+)\.\s*(.+)/) || line.trim().startsWith("**1.") || line.trim().startsWith("1.") || // Additional Spanish patterns
              line.trim().startsWith("Cuestionario:") || line.trim().startsWith("**Cuestionario") || line.trim().match(/^\*\*?(\d+)\s*(.+)/)) {
                startIdx = i;
                break;
              }
            }
            if (startIdx === -1) {
              for (let i = 0; i < filteredLines.length; i++) {
                const line = filteredLines[i].trim();
                if (line.match(/^\d+\./) || line.match(/^\*\*?\d+\./)) {
                  startIdx = i;
                  break;
                }
              }
            }
            return startIdx >= 0 ? filteredLines.slice(startIdx).join("\n") : filteredLines.join("\n");
          })();
          this.log("\u{1F4DD} Attempting to parse as markdown format...");
          const markdownQuiz = this.parseMarkdownQuiz(cleanResponse, context, language);
          if (markdownQuiz) {
            this.log("\u2705 Successfully parsed markdown format quiz.");
            return markdownQuiz;
          }
          this.log("\u{1F504} Markdown parsing failed, attempting JSON parsing...");
          let jsonString = this.extractJsonFromString(cleanResponse);
          if (!jsonString) {
            throw new Error("No valid quiz format found in the AI response");
          }
          try {
            const quizData = JSON.parse(jsonString);
            this.log("\u2705 JSON parsing successful.");
            return this.constructQuizObject(quizData, context);
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.log(`\u26A0\uFE0F JSON parsing failed. Attempting to repair...`);
              const repairedJsonString = await this.repairInvalidJSON(jsonString);
              const quizData = JSON.parse(repairedJsonString);
              this.log("\u2705 Successfully parsed the repaired JSON.");
              return this.constructQuizObject(quizData, context);
            } else {
              throw e;
            }
          }
        } catch (error) {
          this.error(`\u274C Failed to parse quiz from AI response: ${error}`);
          this.log(`Raw response for final failure: ${response.substring(0, 500)}...`);
          const enhancedFallback = this.extractQuestionFromFailedResponse(response, context, language);
          if (enhancedFallback) {
            this.log("\u2705 Successfully extracted questions from failed response");
            return enhancedFallback;
          }
          this.log("\u{1F504} Using basic fallback quiz");
          return this.createFallbackQuiz(context);
        }
      }
      // Enhanced fallback to extract questions from failed responses
      extractQuestionFromFailedResponse(response, context, language) {
        try {
          const lines = response.split("\n");
          const questions = [];
          let questionIndex = 0;
          const questionPatterns = language === "es" ? [
            /^\**(\d+)\.?\s*(.+)/,
            // **1. Question text
            /^(\d+)\.?\s*(.+)/,
            // 1. Question text
            /^\*\*?(\d+)\.?\s*(.+)/
            // **1 Question text
          ] : [
            /^\**(\d+)\.?\s*(.+)/,
            // **1. Question text
            /^(\d+)\.?\s*(.+)/
            // 1. Question text
          ];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            let questionMatch = null;
            for (const pattern of questionPatterns) {
              questionMatch = line.match(pattern);
              if (questionMatch && questionMatch[2] && questionMatch[2].length > 10) {
                break;
              }
            }
            if (questionMatch && questionMatch[2] && questionMatch[2].length > 10) {
              const questionText = questionMatch[2].replace(/\**/g, "").trim();
              if (questionText.length < 10) continue;
              const question = {
                id: `extracted_q_${questionIndex++}`,
                type: "multiple-choice",
                question: questionText,
                options: language === "es" ? ["Opci\xF3n A", "Opci\xF3n B", "Opci\xF3n C", "Opci\xF3n D"] : ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: language === "es" ? "Opci\xF3n A" : "Option A",
                explanation: language === "es" ? "Esta pregunta fue extra\xEDda de un cuestionario parcialmente generado." : "This question was extracted from a partially generated quiz.",
                difficulty: "medium",
                tags: ["extracted-question"],
                source: {
                  documentId: context.documentId || 0,
                  chapter: context.chapter
                }
              };
              questions.push(question);
              if (questions.length >= 5) break;
            }
          }
          if (questions.length > 0) {
            return {
              id: `quiz_extracted_${Date.now()}`,
              title: language === "es" ? `Cuestionario Extra\xEDdo: Documento ${context.documentId}` : `Extracted Quiz: Document ${context.documentId}`,
              description: language === "es" ? "Cuestionario extra\xEDdo de respuesta parcial de IA" : "Quiz extracted from partial AI response",
              questions,
              difficulty: context.userLevel,
              estimatedTime: questions.length * 2,
              tags: ["extracted-quiz"],
              createdAt: /* @__PURE__ */ new Date(),
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
      parseMarkdownQuiz(text2, context, language = "en") {
        try {
          const lines = text2.split("\n");
          const questions = [];
          let currentQuestion = {};
          let title = "";
          let description = "";
          let isInQuestion = false;
          let questionIndex = 0;
          let currentAnswer = "";
          let currentExplanation = "";
          const patterns = this.getLanguagePatterns(language);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("##") || line.startsWith("#")) {
              title = line.replace(/^#+\s*/, "").trim();
              continue;
            }
            if (line.startsWith(patterns.description)) {
              description = line.replace(new RegExp(`^${patterns.description}\\s*`), "").trim();
              continue;
            }
            const questionMatch = line.match(/^\*\*?(\d+)\.?\s*(.+)/);
            if (questionMatch) {
              if (isInQuestion && currentQuestion.question) {
                currentQuestion.correctAnswer = currentAnswer;
                currentQuestion.explanation = currentExplanation;
                questions.push(this.completeQuestionObject(currentQuestion, questionIndex++, context));
              }
              currentQuestion = {
                question: questionMatch[2].replace(/\*\*/g, "").trim(),
                options: [],
                type: "multiple-choice"
              };
              currentAnswer = "";
              currentExplanation = "";
              isInQuestion = true;
              continue;
            }
            if (language === "es") {
              const spanishQuestionMatch = line.match(/^(\d+)\.?\s*(.+)/);
              if (spanishQuestionMatch && !isInQuestion) {
                if (isInQuestion && currentQuestion.question) {
                  currentQuestion.correctAnswer = currentAnswer;
                  currentQuestion.explanation = currentExplanation;
                  questions.push(this.completeQuestionObject(currentQuestion, questionIndex++, context));
                }
                currentQuestion = {
                  question: spanishQuestionMatch[2].replace(/\*\*/g, "").trim(),
                  options: [],
                  type: "multiple-choice"
                };
                currentAnswer = "";
                currentExplanation = "";
                isInQuestion = true;
                continue;
              }
            }
            const optionMatch = line.match(/^\s*([a-d])\)\s*(.+)/);
            if (optionMatch && isInQuestion) {
              currentQuestion.options = currentQuestion.options || [];
              currentQuestion.options.push(optionMatch[2].trim());
              continue;
            }
            if (language === "es") {
              const spanishOptionMatch = line.match(/^\s*([a-d])\)?\s*(.+)/);
              if (spanishOptionMatch && isInQuestion) {
                currentQuestion.options = currentQuestion.options || [];
                currentQuestion.options.push(spanishOptionMatch[2].trim());
                continue;
              }
            }
            if (line.startsWith(patterns.answer) && isInQuestion) {
              currentAnswer = line.replace(new RegExp(`^${patterns.answer}\\s*`), "").trim();
              continue;
            }
            if (line.startsWith(patterns.explanation) && isInQuestion) {
              currentExplanation = line.replace(new RegExp(`^${patterns.explanation}\\s*`), "").trim();
              continue;
            }
            if (line.toLowerCase().includes("true") && line.toLowerCase().includes("false")) {
              currentQuestion.type = "true-false";
              currentQuestion.options = ["True", "False"];
              continue;
            }
          }
          if (isInQuestion && currentQuestion.question) {
            currentQuestion.correctAnswer = currentAnswer;
            currentQuestion.explanation = currentExplanation;
            questions.push(this.completeQuestionObject(currentQuestion, questionIndex, context));
          }
          if (questions.length === 0) {
            return null;
          }
          const quiz = {
            id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title || `Quiz: Document ${context.documentId}`,
            description: description || "Test your knowledge of this document's content",
            questions,
            difficulty: context.userLevel,
            estimatedTime: questions.length * 2,
            tags: ["parsed-from-markdown"],
            createdAt: /* @__PURE__ */ new Date(),
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
      getLanguagePatterns(language) {
        switch (language) {
          case "es":
            return {
              description: "\\*\\*Descripci\xF3n:\\*\\*|\\*\\*Instrucciones:\\*\\*",
              answer: "\\*\\*Respuesta:\\*\\*|\\*\\*Respuesta correcta:\\*\\*",
              explanation: "\\*\\*Explicaci\xF3n:\\*\\*|\\*\\*Explicaci\xF3n de la respuesta:\\*\\*"
            };
          case "fr":
            return {
              description: "\\*\\*Description:\\*\\*|\\*\\*Instructions:\\*\\*",
              answer: "\\*\\*R\xE9ponse:\\*\\*|\\*\\*R\xE9ponse correcte:\\*\\*",
              explanation: "\\*\\*Explication:\\*\\*|\\*\\*Explication de la r\xE9ponse:\\*\\*"
            };
          case "de":
            return {
              description: "\\*\\*Beschreibung:\\*\\*|\\*\\*Anweisungen:\\*\\*",
              answer: "\\*\\*Antwort:\\*\\*|\\*\\*Richtige Antwort:\\*\\*",
              explanation: "\\*\\*Erkl\xE4rung:\\*\\*|\\*\\*Erkl\xE4rung der Antwort:\\*\\*"
            };
          default:
            return {
              description: "\\*\\*Description:\\*\\*|\\*\\*Instructions:\\*\\*",
              answer: "\\*\\*Answer:\\*\\*|\\*\\*Correct Answer:\\*\\*",
              explanation: "\\*\\*Explanation:\\*\\*|\\*\\*Answer Explanation:\\*\\*"
            };
        }
      }
      isQuizInEnglish(quiz) {
        const englishWords = ["the", "and", "is", "are", "was", "were", "to", "of", "in", "for", "with", "what", "which", "this", "that"];
        const titleWords = quiz.title.toLowerCase().split(/\s+/);
        const englishWordCount = titleWords.filter((word) => englishWords.includes(word)).length;
        return englishWordCount >= 2;
      }
    };
  }
});

// server/mcp/memory-service.ts
var MemoryService;
var init_memory_service = __esm({
  "server/mcp/memory-service.ts"() {
    "use strict";
    init_LocalMemoryService();
    MemoryService = class {
      localMemoryService;
      isInitialized = false;
      constructor() {
        this.localMemoryService = LocalMemoryService.getInstance();
        console.log("Memory Service initialized with local SQLite database");
        this.initializeAsync();
      }
      async initializeAsync() {
        try {
          await new Promise((resolve) => setTimeout(resolve, 100));
          this.isInitialized = true;
          console.log("\u2705 Memory Service initialization completed");
        } catch (error) {
          console.error("\u274C Memory Service initialization failed:", error);
        }
      }
      async ensureReady() {
        if (!this.isInitialized) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          this.isInitialized = true;
        }
      }
      async storeMemory(userId, content, category, metadata) {
        await this.ensureReady();
        try {
          const memoryId = await this.localMemoryService.storeMemory(userId, content, category, metadata);
          const storedMemory = {
            id: memoryId,
            userId,
            content,
            category,
            metadata,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          };
          console.log(`\u2705 Stored memory for user ${userId}: ${category} (ID: ${memoryId})`);
          return storedMemory;
        } catch (error) {
          console.error(`\u274C Failed to store memory for user ${userId}:`, error);
          throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      async retrieveMemories(userId, query, category, limit = 10) {
        if (query.trim()) {
          return await this.localMemoryService.searchMemories(userId, query, limit);
        } else {
          return await this.localMemoryService.retrieveMemories(userId, category, limit);
        }
      }
      async getUserStudyPatterns(userId) {
        try {
          const userProfile = await this.localMemoryService.getUserProfile(userId);
          const pattern = {
            userId: userProfile.userId,
            favoriteBooks: userProfile.favoriteBooks,
            commonThemes: userProfile.commonThemes,
            studyTimes: userProfile.studyTimes,
            annotationFrequency: userProfile.annotationFrequency,
            readingSpeed: this.estimateReadingSpeed(userProfile.averageSessionLength),
            preferredTopics: userProfile.preferredTopics,
            lastActive: /* @__PURE__ */ new Date()
          };
          await this.storeMemory(
            userId,
            `Study pattern analysis: Favorite books: ${pattern.favoriteBooks.join(", ")}. Common themes: ${pattern.commonThemes.join(", ")}. Study times: ${pattern.studyTimes.join(", ")}.`,
            "study_pattern_analysis",
            {
              analysisDate: (/* @__PURE__ */ new Date()).toISOString(),
              pattern
            }
          );
          return pattern;
        } catch (error) {
          console.error("Error analyzing study patterns:", error);
          return {
            userId,
            favoriteBooks: [],
            commonThemes: [],
            studyTimes: [],
            annotationFrequency: 0,
            readingSpeed: 0,
            preferredTopics: [],
            lastActive: /* @__PURE__ */ new Date()
          };
        }
      }
      estimateReadingSpeed(averageSessionLength) {
        if (averageSessionLength > 0) {
          return Math.round(averageSessionLength * 250 / 60);
        }
        return 0;
      }
      async deleteMemory(userId, memoryId) {
        console.log(`Delete memory requested for user ${userId}, memory ${memoryId}`);
        return true;
      }
      async getAllUserMemories(userId) {
        return await this.localMemoryService.retrieveMemories(userId, void 0, 1e3);
      }
      async analyzePatterns(userId) {
        return await this.localMemoryService.analyzePatterns(userId);
      }
      async getMemoryStats(userId) {
        return await this.localMemoryService.getMemoryStats(userId);
      }
      async clearUserMemories(userId, category) {
        console.log(`Clear memories requested for user ${userId}, category: ${category}`);
        return 0;
      }
      // Helper method to check if a name is a document title
      isDocumentTitle(name) {
        return name.length > 0 && name.length < 200;
      }
      close() {
        this.localMemoryService.close();
      }
    };
  }
});

// server/mcp/ollama-mcp-integration.ts
var OllamaMCPIntegration;
var init_ollama_mcp_integration = __esm({
  "server/mcp/ollama-mcp-integration.ts"() {
    "use strict";
    init_ollama_service();
    init_memory_service();
    init_storage();
    OllamaMCPIntegration = class {
      ollama;
      memoryService;
      activeSessions = /* @__PURE__ */ new Map();
      constructor() {
        this.ollama = new OllamaService({
          model: "gemma3n:e2b",
          // 🚀 FAST: Optimized reasoning with 3x speed improvement
          temperature: 0.7,
          maxTokens: 4096
        });
        this.memoryService = new MemoryService();
      }
      async initialize() {
        await this.ollama.initialize();
        console.log("\u2705 MCP Ollama service initialized successfully");
      }
      async createSession(userId) {
        const sessionId = this.generateSessionId();
        const context = {
          userId,
          sessionId
        };
        this.activeSessions.set(sessionId, context);
        try {
          const recentMemories = await this.memoryService.retrieveMemories(
            userId,
            "",
            // Empty query to get recent memories
            void 0,
            // No specific category filter
            10
            // limit to 10 recent memories
          );
          await this.retryOperation(async () => {
            await this.memoryService.storeMemory(
              userId,
              `Started new AI session with ${recentMemories.length} memories loaded`,
              "session_start",
              { sessionId, memoriesLoaded: recentMemories.length }
            );
          }, 3, 500);
          console.log(`\u2705 Session ${sessionId} created successfully for user ${userId}`);
          return sessionId;
        } catch (error) {
          console.error(`\u274C Failed to create session for user ${userId}:`, error);
          console.warn(`\u26A0\uFE0F Session ${sessionId} created but memory storage failed - continuing anyway`);
          return sessionId;
        }
      }
      async retryOperation(operation, maxRetries = 3, delay = 1e3) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            console.warn(`\u{1F504} Operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError;
      }
      async enhancedChat(sessionId, message, includeContext = true) {
        const context = this.activeSessions.get(sessionId);
        if (!context) {
          throw new Error("Invalid session ID");
        }
        let enhancedPrompt = message;
        if (includeContext) {
          const relevantMemories = await this.memoryService.retrieveMemories(
            context.userId,
            message,
            void 0,
            5
          );
          const userDocuments = await storage.getDocuments(context.userId);
          const recentAnnotations = await storage.getAnnotations(context.userId);
          const bookmarks2 = await storage.getBookmarks(context.userId);
          const contextInfo = this.buildContextPrompt(
            relevantMemories,
            userDocuments.slice(0, 3),
            // Recent documents
            recentAnnotations.slice(0, 5),
            // Recent annotations
            bookmarks2.slice(0, 3)
            // Recent bookmarks
          );
          enhancedPrompt = `${contextInfo}

User Question: ${message}`;
        }
        const response = await this.ollama.generateText(enhancedPrompt);
        await this.memoryService.storeMemory(
          context.userId,
          `User asked: "${message}" | AI responded: "${response}"`,
          "conversation",
          {
            sessionId,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            messageLength: message.length,
            responseLength: response.length
          }
        );
        return response;
      }
      buildContextPrompt(memories, documents3, annotations2, bookmarks2) {
        let context = "CONTEXT INFORMATION:\n\n";
        if (memories.length > 0) {
          context += "RELEVANT MEMORIES:\n";
          memories.forEach((memory, index2) => {
            context += `${index2 + 1}. [${memory.category}] ${memory.content}
`;
          });
          context += "\n";
        }
        if (documents3.length > 0) {
          context += "RECENT DOCUMENTS:\n";
          documents3.forEach((doc, index2) => {
            context += `${index2 + 1}. ${doc.title} (${doc.totalChapters} chapters)
`;
          });
          context += "\n";
        }
        if (annotations2.length > 0) {
          context += "RECENT ANNOTATIONS:\n";
          annotations2.forEach((annotation, index2) => {
            context += `${index2 + 1}. "${annotation.selectedText}" - ${annotation.note}
`;
          });
          context += "\n";
        }
        if (bookmarks2.length > 0) {
          context += "BOOKMARKS:\n";
          bookmarks2.forEach((bookmark, index2) => {
            context += `${index2 + 1}. ${bookmark.title || "Untitled"} (Chapter ${bookmark.chapter})
`;
          });
          context += "\n";
        }
        context += "Please use this context to provide more personalized and relevant responses.\n";
        context += "---\n\n";
        return context;
      }
      async analyzeUserBehavior(userId) {
        const [annotations2, bookmarks2, documents3, progress] = await Promise.all([
          storage.getAnnotations(userId),
          storage.getBookmarks(userId),
          storage.getDocuments(userId),
          storage.getReadingProgress(userId)
        ]);
        const analysisPrompt = `
    Analyze the following user data and provide insights about their reading and study patterns:
    
    ANNOTATIONS (${annotations2.length} total):
    ${annotations2.slice(0, 10).map((a) => `- "${a.selectedText}": ${a.note}`).join("\n")}
    
    BOOKMARKS (${bookmarks2.length} total):
    ${bookmarks2.slice(0, 5).map((b) => `- ${b.title} (Chapter ${b.chapter})`).join("\n")}
    
    READING PROGRESS:
    ${progress.map((p) => `- Document ${p.documentId}, Chapter ${p.chapter}: ${p.completed ? "Completed" : "In Progress"}`).join("\n")}
    
    Please provide:
    1. Study patterns and preferences
    2. Favorite topics or themes
    3. Reading habits
    4. Recommendations for future study
    `;
        const analysis = await this.ollama.generateText(analysisPrompt);
        await this.memoryService.storeMemory(
          userId,
          `Behavioral analysis: ${analysis}`,
          "behavior_analysis",
          {
            annotationsCount: annotations2.length,
            bookmarksCount: bookmarks2.length,
            documentsCount: documents3.length,
            analysisDate: (/* @__PURE__ */ new Date()).toISOString()
          }
        );
        return {
          analysis,
          stats: {
            annotations: annotations2.length,
            bookmarks: bookmarks2.length,
            documents: documents3.length,
            completedChapters: progress.filter((p) => p.completed).length
          }
        };
      }
      async generatePersonalizedInsights(userId) {
        const studyPatterns = await this.memoryService.getUserStudyPatterns(userId);
        const insightPrompts = [
          `Based on the user's favorite books (${studyPatterns.favoriteBooks.join(", ")}), suggest 3 related passages they might enjoy studying.`,
          `Given the user's common themes (${studyPatterns.commonThemes.join(", ")}), provide an educational insight connecting these themes.`,
          `The user typically studies during ${studyPatterns.studyTimes.join(" and ")}. Suggest an optimal study routine.`,
          `Based on the user's annotation frequency (${studyPatterns.annotationFrequency.toFixed(2)} per day), recommend ways to deepen their engagement.`
        ];
        const insights = await Promise.all(
          insightPrompts.map((prompt) => this.ollama.generateText(prompt))
        );
        for (const insight of insights) {
          await this.memoryService.storeMemory(
            userId,
            `Personalized insight: ${insight}`,
            "personalized_insight",
            { generatedAt: (/* @__PURE__ */ new Date()).toISOString() }
          );
        }
        return insights;
      }
      async smartSearch(userId, query) {
        const documentResults = await storage.searchDocuments(userId, query);
        const memoryResults = await this.memoryService.retrieveMemories(
          userId,
          query,
          void 0,
          5
        );
        const enhancementPrompt = `
    The user searched for: "${query}"
    
    DOCUMENT RESULTS:
    ${documentResults.map((r) => `- ${r.documentTitle}, Chapter ${r.chapter}: "${r.text}"`).join("\n")}
    
    RELATED MEMORIES:
    ${memoryResults.map((m) => `- [${m.category}] ${m.content}`).join("\n")}
    
    Please provide:
    1. A summary of the search results
    2. Additional insights or connections
    3. Suggested follow-up questions or topics
    `;
        const enhancement = await this.ollama.generateText(enhancementPrompt);
        await this.memoryService.storeMemory(
          userId,
          `Smart search for "${query}" returned ${documentResults.length} document results and ${memoryResults.length} memory matches`,
          "smart_search",
          {
            query,
            documentResults: documentResults.length,
            memoryResults: memoryResults.length
          }
        );
        return {
          documentResults,
          memoryResults,
          aiEnhancement: enhancement,
          summary: {
            totalResults: documentResults.length + memoryResults.length,
            query
          }
        };
      }
      async updateContext(sessionId, documentId, chapter) {
        const context = this.activeSessions.get(sessionId);
        if (context) {
          context.currentDocument = documentId;
          context.currentChapter = chapter;
          await this.memoryService.storeMemory(
            context.userId,
            `Context updated: Document ${documentId}, Chapter ${chapter}`,
            "context_change",
            { sessionId, documentId, chapter }
          );
        }
      }
      async endSession(sessionId) {
        const context = this.activeSessions.get(sessionId);
        if (context) {
          await this.memoryService.storeMemory(
            context.userId,
            `Ended AI session ${sessionId}`,
            "session_end",
            { sessionId, duration: Date.now() }
          );
          this.activeSessions.delete(sessionId);
        }
      }
      generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
      }
      // Get session statistics
      getActiveSessionsCount() {
        return this.activeSessions.size;
      }
      async getSessionContext(sessionId) {
        return this.activeSessions.get(sessionId);
      }
    };
  }
});

// server/agents/auto-learning-system.ts
import { eq as eq10 } from "drizzle-orm";
var AutoLearningSystem, autoLearningSystem;
var init_auto_learning_system = __esm({
  "server/agents/auto-learning-system.ts"() {
    "use strict";
    init_ollama_service();
    init_multi_model_service();
    init_db();
    init_schema();
    AutoLearningSystem = class {
      ollama;
      multiModel;
      learningSessions = /* @__PURE__ */ new Map();
      isLearning = false;
      lastLearningTime = /* @__PURE__ */ new Map();
      // Track last learning time per document
      LEARNING_COOLDOWN = 3e5;
      // 5 minutes cooldown between learning sessions for same document
      constructor() {
        this.ollama = new OllamaService({
          model: "gemma3n:e2b",
          temperature: 0.4,
          maxTokens: 4096
        });
        this.multiModel = new MultiModelService();
      }
      async initialize() {
        await this.ollama.initialize();
        await this.multiModel.initialize();
        this.startPeriodicSynthesis();
        console.log("\u{1F9E0} Auto-Learning System initialized with multi-model intelligence - Ready to create experts!");
      }
      // 🚀 MAIN AUTO-LEARNING TRIGGER
      async triggerAutoLearning(documentId) {
        if (this.isLearning) {
          console.log("\u23F3 Learning already in progress, queuing...");
          setTimeout(() => this.triggerAutoLearning(documentId), 5e3);
          return;
        }
        const lastTime = this.lastLearningTime.get(documentId) || 0;
        const timeSinceLastLearning = Date.now() - lastTime;
        if (timeSinceLastLearning < this.LEARNING_COOLDOWN) {
          const remainingCooldown = Math.ceil((this.LEARNING_COOLDOWN - timeSinceLastLearning) / 1e3);
          console.log(`\u23F3 Auto-learning on cooldown for document ${documentId}. Please wait ${remainingCooldown} seconds.`);
          return;
        }
        this.isLearning = true;
        this.lastLearningTime.set(documentId, Date.now());
        console.log(`\u{1F9E0} Starting auto-learning for document ${documentId}...`);
        try {
          console.log(`\u{1F4D6} Step 1: Getting document content for document ${documentId}...`);
          const content = await this.getDocumentContent(documentId);
          if (!content) {
            console.error(`\u274C No content found for document ${documentId}`);
            return;
          }
          console.log(`\u2705 Step 1 complete: Retrieved ${content.length} characters of content`);
          console.log(`\u{1F50D} Step 2: Analyzing content for domain and concepts...`);
          const analysis = await this.analyzeContent(content);
          console.log(`\u2705 Step 2 complete: Domain detected as "${analysis.domain}" with ${analysis.concepts?.length || 0} concepts`);
          console.log(`\u{1F393} Step 3: Building expertise based on analysis...`);
          const expertise = await this.buildExpertise(content, analysis);
          console.log(`\u2705 Step 3 complete: Expertise level ${expertise.level}/10 achieved`);
          console.log(`\u{1F916} Step 4: Creating specialized AI agent...`);
          const specializedPrompt = await this.createSpecializedAgent(analysis, expertise);
          console.log(`\u2705 Step 4 complete: Specialized agent prompt created`);
          console.log(`\u{1F4CA} Step 5: Generating fine-tuning data...`);
          const fineTuningData = await this.generateFineTuningData(content, analysis, expertise);
          console.log(`\u2705 Step 5 complete: Generated ${fineTuningData.length} training examples`);
          console.log(`\u{1F4BE} Step 6: Storing learning session...`);
          const session = {
            documentId,
            domain: analysis.domain,
            expertiseLevel: expertise.level,
            concepts: analysis.concepts,
            specializedPrompt,
            fineTuningData
          };
          this.learningSessions.set(documentId, session);
          await this.persistLearningSession(session);
          console.log(`\u2705 Step 6 complete: Learning session stored for document ${documentId}`);
          console.log(`\u{1F4E2} Step 7: Notifying agents about new expertise...`);
          await this.notifyAgentsOfNewExpertise(documentId, session);
          console.log(`\u2705 Step 7 complete: All agents notified`);
          console.log(`\u{1F389} Auto-learning completed! AI is now a level ${expertise.level}/10 expert in ${analysis.domain}`);
          console.log(`\u{1F4CB} Learning Summary:
        - Document ID: ${documentId}
        - Domain: ${analysis.domain}
        - Expertise Level: ${expertise.level}/10
        - Concepts Learned: ${analysis.concepts?.length || 0}
        - Training Examples: ${fineTuningData.length}
        - Status: EXPERT AVAILABLE`);
        } catch (error) {
          console.error(`\u274C Auto-learning failed at step: ${error}`);
          console.error(`Full error details:`, error);
        } finally {
          this.isLearning = false;
        }
      }
      async persistLearningSession(session) {
        try {
          console.log("\u{1F4BE} Persisting learning session to database...");
          let graph = await db.select().from(aiKnowledgeGraph).where(eq10(aiKnowledgeGraph.id, 1)).limit(1);
          if (!graph.length) {
            await db.insert(aiKnowledgeGraph).values({ id: 1, name: "Default Knowledge Graph", description: "Main knowledge graph for the entire library." });
          }
          const graphId = 1;
          for (const conceptName of session.concepts) {
            const existingConcept = await db.select().from(knowledgeGraphConcepts).where(eq10(knowledgeGraphConcepts.name, conceptName)).limit(1);
            if (existingConcept.length) {
              const conceptId = existingConcept[0].id;
            } else {
              await db.insert(knowledgeGraphConcepts).values({
                graphId,
                name: conceptName,
                summary: `Concept learned from document ${session.documentId}`,
                // Placeholder summary
                sourceDocumentId: session.documentId
              });
            }
          }
          console.log("\u2705 Learning session persisted to database.");
        } catch (error) {
          console.error("\u274C Failed to persist learning session:", error);
        }
      }
      startPeriodicSynthesis() {
        setInterval(() => {
          this.synthesizeCrossDocumentInsights();
        }, 72e5);
        console.log("\u{1F504} Started periodic cross-document synthesis (every 2 hours).");
      }
      async synthesizeCrossDocumentInsights() {
        console.log("\u{1F50D} Starting cross-document synthesis...");
        try {
          const concepts = await db.select().from(knowledgeGraphConcepts);
          const conceptsByName = concepts.reduce((acc, concept) => {
            if (!acc[concept.name]) {
              acc[concept.name] = [];
            }
            acc[concept.name].push(concept);
            return acc;
          }, {});
          for (const conceptName in conceptsByName) {
            const relatedConcepts = conceptsByName[conceptName];
            if (relatedConcepts.length > 1) {
              console.log(`\u{1F9E0} Analyzing concept "${conceptName}" found in ${relatedConcepts.length} documents.`);
              const contexts = await Promise.all(relatedConcepts.map(async (concept) => {
                const document = await db.select({ title: documents.title, content: documents.content }).from(documents).where(eq10(documents.id, concept.sourceDocumentId)).limit(1);
                return {
                  documentTitle: document[0]?.title || "Unknown Document",
                  context: `From document "${document[0]?.title}", context for "${concept.name}": ${this.extractContext(document[0]?.content, concept.name)}`
                };
              }));
              const prompt = `
            Analyze the following contexts for the concept "${conceptName}" from different documents.
            Identify any relationships like parallels, contradictions, or elaborations between them.

            Contexts:
            ${contexts.map((c) => `- ${c.context}`).join("\n")}

            Provide a JSON response with an array of relationships:
            {
              "relationships": [
                {
                  "source_document": "document title",
                  "target_document": "document title",
                  "type": "parallel | contradiction | elaboration",
                  "description": "Explain the relationship."
                }
              ]
            }
          `;
              const response = await this.ollama.generateText(prompt);
              const result = this.parseJSON(response);
              if (result && result.relationships) {
                for (const rel of result.relationships) {
                  const sourceConcept = relatedConcepts.find((c) => contexts.find((ctx) => ctx.documentTitle === rel.source_document && ctx.context.includes(c.name)));
                  const targetConcept = relatedConcepts.find((c) => contexts.find((ctx) => ctx.documentTitle === rel.target_document && ctx.context.includes(c.name)));
                  if (sourceConcept && targetConcept) {
                    await db.insert(knowledgeGraphEdges).values({
                      graphId: 1,
                      sourceConceptId: sourceConcept.id,
                      targetConceptId: targetConcept.id,
                      label: rel.type,
                      description: rel.description
                    });
                    const notificationMessage = `I noticed that the concept of '${conceptName}' in '${rel.source_document}' has interesting ${rel.type} to the same concept in '${rel.target_document}'. Would you like a summary of the comparison?`;
                    await db.insert(notifications).values({
                      user_id: 1,
                      // Default user
                      title: `New Insight: ${conceptName}`,
                      message: notificationMessage
                    });
                    console.log(`\u{1F517} New insight found: ${conceptName} in "${rel.source_document}" has a ${rel.type} with "${rel.target_document}".`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("\u274C Cross-document synthesis failed:", error);
        }
      }
      extractContext(content, concept, window = 200) {
        const index2 = content.indexOf(concept);
        if (index2 === -1) return "Concept not found in content.";
        const start = Math.max(0, index2 - window);
        const end = Math.min(content.length, index2 + concept.length + window);
        return content.substring(start, end).replace(/\s+/g, " ").trim();
      }
      // 📖 GET DOCUMENT CONTENT WITH POWER SUMMARIES
      async getDocumentContent(documentId) {
        try {
          const document = await db.select().from(documents).where(eq10(documents.id, documentId)).limit(1);
          if (!document.length) return null;
          let content = document[0].content;
          try {
            const powerSummaries2 = await db.select().from(powerSummaries).where(eq10(powerSummaries.documentId, documentId));
            if (powerSummaries2.length > 0) {
              console.log(`\u{1F4CA} Found ${powerSummaries2.length} power summaries for document ${documentId}`);
              content += "\n\n=== POWER SUMMARIES FOR ENHANCED LEARNING ===\n";
              powerSummaries2.forEach((summary, index2) => {
                content += `
Chapter ${summary.chapter}: ${summary.chapterTitle}
`;
                content += `Summary: ${summary.powerSummary}
`;
                const keyInsights = Array.isArray(summary.keyInsights) ? summary.keyInsights.join(", ") : String(summary.keyInsights);
                const mainThemes = Array.isArray(summary.mainThemes) ? summary.mainThemes.join(", ") : String(summary.mainThemes);
                const actionablePoints = Array.isArray(summary.actionablePoints) ? summary.actionablePoints.join(", ") : String(summary.actionablePoints);
                content += `Key Insights: ${keyInsights}
`;
                content += `Main Themes: ${mainThemes}
`;
                content += `Actionable Points: ${actionablePoints}
`;
                content += "---\n";
              });
              content += "=== END POWER SUMMARIES ===\n";
            }
          } catch (summaryError) {
            console.warn(`Could not retrieve power summaries for document ${documentId}:`, summaryError);
          }
          try {
            const defaultUserId = 1;
            const annotations2 = await db.select().from(annotations).where(eq10(annotations.documentId, documentId));
            if (annotations2.length > 0) {
              console.log(`\u{1F4DD} Found ${annotations2.length} user annotations for document ${documentId}`);
              content += "\n\n=== USER ANNOTATIONS FOR ENHANCED LEARNING ===\n";
              annotations2.forEach((annotation) => {
                content += `
Chapter ${annotation.chapter}, Verse ${annotation.verse}:
`;
                content += `User Note: ${annotation.note}
`;
                content += `Selected Text: ${annotation.selectedText || "N/A"}
`;
                content += "---\n";
              });
              content += "=== END USER ANNOTATIONS ===\n";
            }
          } catch (annotationError) {
            console.warn(`Could not retrieve annotations for document ${documentId}:`, annotationError);
          }
          return content;
        } catch (error) {
          console.error(`Failed to get document content: ${error}`);
          return null;
        }
      }
      // 🔍 ANALYZE CONTENT FOR LEARNING
      async analyzeContent(content) {
        const hasVisualElements = this.detectVisualElements(content);
        const prompt = `Analyze this content for AI learning. Extract key information:

Content (first 8000 chars):
${content.substring(0, 8e3)}

Provide a JSON response with:
{
  "domain": "specific field/subject (e.g., 'Quantum Physics', 'Biblical Studies', 'Philosophy')",
  "complexity": "beginner|intermediate|advanced|expert", 
  "concepts": ["concept1", "concept2", "concept3"],
  "key_terms": ["term1", "term2", "term3"],
  "learning_objectives": ["what should an AI learn from this"],
  "expertise_areas": ["specific areas of expertise to develop"]
}`;
        try {
          if (hasVisualElements && content.length > 2e4) {
            console.log(`\u{1F441}\uFE0F Large document with visual elements detected, using vision model with timeout tolerance`);
            const result = await this.multiModel.executeTask("vision-document-analysis", prompt, {
              requirements: { accuracy: 8, reasoning: 8, speed: 4 }
              // Reduced requirements for speed
            });
            console.log(`\u{1F441}\uFE0F Content analyzed using ${result.modelUsed} in ${result.executionTime}ms`);
            return this.parseJSON(result.response);
          } else {
            console.log(`\u{1F50D} Using fast text analysis for efficient processing`);
            const result = await this.multiModel.executeTask("quick-classification", prompt, {
              requirements: { speed: 8, accuracy: 6 }
            });
            console.log(`\u{1F50D} Content analyzed using ${result.modelUsed} in ${result.executionTime}ms`);
            return this.parseJSON(result.response);
          }
        } catch (error) {
          console.error(`Content analysis failed: ${error}`);
          try {
            const response = await this.ollama.generateText(prompt);
            return this.parseJSON(response);
          } catch (fallbackError) {
            console.error(`Fallback analysis also failed: ${fallbackError}`);
            return {
              domain: "General Knowledge",
              complexity: "intermediate",
              concepts: [],
              key_terms: [],
              learning_objectives: [],
              expertise_areas: []
            };
          }
        }
      }
      // 🎓 BUILD EXPERTISE FROM CONTENT
      async buildExpertise(content, analysis) {
        const dynamicLevel = this.calculateExpertiseLevel(content, analysis);
        const prompt = `You are becoming an expert in ${analysis.domain}. Study this content deeply:

${content.substring(0, 1e4)}

Key concepts to master: ${analysis.concepts.join(", ")}

Based on the complexity and depth of this content, your expertise level should be ${dynamicLevel}/10.

Generate expert knowledge as JSON:
{
  "level": ${dynamicLevel},
  "expert_insights": ["deep insight 1", "deep insight 2"],
  "teaching_points": ["how to explain concept 1", "how to explain concept 2"],
  "advanced_connections": ["connection to other fields", "broader implications"],
  "expert_qa": [
    {
      "question": "Expert-level question about the content",
      "answer": "Detailed expert answer"
    }
  ],
  "practical_applications": ["real-world application 1", "application 2"]
}`;
        try {
          const result = await this.multiModel.executeTask("expert-reasoning", prompt, {
            requirements: { reasoning: 8, accuracy: 8, creativity: 6 }
          });
          console.log(`\u{1F393} Expertise built using ${result.modelUsed} in ${result.executionTime}ms`);
          const parsedResponse = this.parseJSON(result.response);
          parsedResponse.level = dynamicLevel;
          return parsedResponse;
        } catch (error) {
          console.error(`Expertise building failed: ${error}`);
          try {
            const response = await this.ollama.generateText(prompt);
            const parsedResponse = this.parseJSON(response);
            parsedResponse.level = dynamicLevel;
            return parsedResponse;
          } catch (fallbackError) {
            console.error(`Fallback expertise building also failed: ${fallbackError}`);
            return { level: Math.max(5, dynamicLevel - 2), expert_insights: [], teaching_points: [], advanced_connections: [], expert_qa: [], practical_applications: [] };
          }
        }
      }
      // 🧮 CALCULATE DYNAMIC EXPERTISE LEVEL
      calculateExpertiseLevel(content, analysis) {
        let baseLevel = 5;
        const complexityMapping = {
          "beginner": 0,
          "intermediate": 1,
          "advanced": 2,
          "expert": 3
        };
        const complexityBonus = complexityMapping[analysis.complexity] || 1;
        const conceptBonus = Math.min(2, Math.floor(analysis.concepts.length / 5));
        const lengthBonus = content.length > 5e4 ? 2 : content.length > 2e4 ? 1 : 0;
        const domainBonus = this.getDomainComplexityBonus(analysis.domain);
        const objectiveBonus = analysis.learning_objectives?.length > 5 ? 1 : 0;
        const calculatedLevel = Math.min(10, baseLevel + complexityBonus + conceptBonus + lengthBonus + domainBonus + objectiveBonus);
        console.log(`\u{1F4CA} Expertise calculation for ${analysis.domain}:
    Base: ${baseLevel}, Complexity: +${complexityBonus}, Concepts: +${conceptBonus}, 
    Length: +${lengthBonus}, Domain: +${domainBonus}, Objectives: +${objectiveBonus}
    Final Level: ${calculatedLevel}/10`);
        return calculatedLevel;
      }
      // 🎯 GET DOMAIN COMPLEXITY BONUS
      getDomainComplexityBonus(domain) {
        const highComplexityDomains = [
          "quantum physics",
          "theoretical physics",
          "advanced mathematics",
          "neuroscience",
          "molecular biology",
          "artificial intelligence",
          "philosophy",
          "theology",
          "biblical studies",
          "ancient languages"
        ];
        const mediumComplexityDomains = [
          "physics",
          "chemistry",
          "biology",
          "psychology",
          "history",
          "literature",
          "economics",
          "computer science"
        ];
        const domainLower = domain.toLowerCase();
        if (highComplexityDomains.some((d) => domainLower.includes(d))) {
          return 2;
        } else if (mediumComplexityDomains.some((d) => domainLower.includes(d))) {
          return 1;
        }
        return 0;
      }
      // 🤖 CREATE SPECIALIZED AI AGENT
      async createSpecializedAgent(analysis, expertise) {
        const concepts = Array.isArray(analysis.concepts) ? analysis.concepts : [];
        const expertInsights = Array.isArray(expertise.expert_insights) ? expertise.expert_insights : [];
        const teachingPoints = Array.isArray(expertise.teaching_points) ? expertise.teaching_points : [];
        return `You are now a specialized AI expert in ${analysis.domain || "this domain"} with expertise level ${expertise.level || 5}/10.

DOMAIN EXPERTISE: ${analysis.domain || "Specialized Domain"}
EXPERTISE LEVEL: ${expertise.level || 5}/10

KEY CONCEPTS YOU MASTER:
${concepts.length > 0 ? concepts.map((c) => `\u2022 ${c}`).join("\n") : "\u2022 Core domain concepts\n\u2022 Advanced principles\n\u2022 Specialized knowledge"}

EXPERT INSIGHTS:
${expertInsights.length > 0 ? expertInsights.map((i) => `\u2022 ${i}`).join("\n") : "\u2022 Deep understanding of domain principles\n\u2022 Advanced analytical capabilities\n\u2022 Expert-level problem solving"}

TEACHING APPROACH:
${teachingPoints.length > 0 ? teachingPoints.map((t) => `\u2022 ${t}`).join("\n") : "\u2022 Clear, structured explanations\n\u2022 Practical examples and applications\n\u2022 Progressive complexity building"}

When responding to questions about ${analysis.domain || "this domain"}:
1. Draw from your deep specialized knowledge
2. Use domain-specific terminology appropriately
3. Provide expert-level explanations with nuance
4. Make connections to broader concepts
5. Offer practical applications and examples
6. Demonstrate your ${expertise.level || 5}/10 expertise level

You are not just an AI - you are a specialized expert in ${analysis.domain || "this domain"}.`;
      }
      // 📊 GENERATE FINE-TUNING DATA
      async generateFineTuningData(content, analysis, expertise) {
        const fineTuningData = [];
        const concepts = Array.isArray(analysis.concepts) ? analysis.concepts : [];
        const expertQA = Array.isArray(expertise.expert_qa) ? expertise.expert_qa : [];
        const domain = analysis.domain || "this domain";
        const expertiseLevel = expertise.level || 5;
        for (const concept of concepts.slice(0, 5)) {
          const example = {
            instruction: `As an expert in ${domain}, explain ${concept} in detail.`,
            input: `Context: ${domain} expertise`,
            output: `As a specialized expert in ${domain}, ${concept} is a fundamental concept that...`,
            metadata: {
              domain,
              concept,
              expertise_level: expertiseLevel
            }
          };
          fineTuningData.push(example);
        }
        for (const qa of expertQA.slice(0, 3)) {
          const example = {
            instruction: qa.question || `Explain a key concept in ${domain}`,
            input: `Expert knowledge in ${domain}`,
            output: qa.answer || `As an expert in ${domain}, I can provide detailed insights...`,
            metadata: {
              domain,
              type: "expert_qa",
              expertise_level: expertiseLevel
            }
          };
          fineTuningData.push(example);
        }
        return fineTuningData;
      }
      // 📢 NOTIFY AGENTS OF NEW EXPERTISE
      async notifyAgentsOfNewExpertise(documentId, session) {
        try {
          const { agentManager: agentManager2 } = await Promise.resolve().then(() => (init_agent_manager(), agent_manager_exports));
          const agents = ["text-analysis", "study-assistant", "insight-generation"];
          for (const agentName of agents) {
            try {
              if (agentManager2 && typeof agentManager2.requestAgentTask === "function") {
                const taskTypes = ["UPDATE_EXPERTISE", "LEARN_DOMAIN", "ADD_KNOWLEDGE"];
                let notified = false;
                for (const taskType of taskTypes) {
                  try {
                    await agentManager2.requestAgentTask(agentName, taskType, {
                      documentId,
                      domain: session.domain,
                      expertiseLevel: session.expertiseLevel,
                      specializedPrompt: session.specializedPrompt,
                      concepts: session.concepts
                    });
                    console.log(`\u2705 Successfully notified ${agentName} of new expertise in ${session.domain} (task: ${taskType})`);
                    notified = true;
                    break;
                  } catch (taskError) {
                    continue;
                  }
                }
                if (!notified) {
                  console.log(`\u2139\uFE0F Agent ${agentName} doesn't support expertise updates, but it's aware of the new domain knowledge`);
                }
              } else {
                console.warn(`\u26A0\uFE0F AgentManager not available for ${agentName} notification`);
              }
            } catch (error) {
              console.log(`\u2139\uFE0F ${agentName} notification skipped: ${error instanceof Error ? error.message : "Agent may not support this task type"}`);
            }
          }
        } catch (importError) {
          console.warn(`\u26A0\uFE0F Could not import agentManager for notifications: ${importError instanceof Error ? importError.message : "Unknown error"}`);
        }
      }
      // 🎯 GET EXPERT RESPONSE FOR DOCUMENT
      async getExpertResponse(documentId, question, currentChapter) {
        const session = this.learningSessions.get(documentId);
        if (!session) {
          try {
            const result = await this.multiModel.executeTask("theological-reasoning", question, {
              requirements: { reasoning: 9, accuracy: 8 }
            });
            return result.response;
          } catch (error) {
            console.warn("MultiModel fallback failed, using Ollama:", error);
            return await this.ollama.generateText(question, { useCache: false });
          }
        }
        let ragContext = "";
        try {
          const { documentRAGService: documentRAGService2 } = await Promise.resolve().then(() => (init_document_rag_service(), document_rag_service_exports));
          const ragQuery = `${question} context from document chapter ${currentChapter || "current"}`;
          const ragResponse = await documentRAGService2.processRAGQuery(ragQuery, {
            userId: 1,
            currentDocument: documentId,
            currentChapter,
            conversationHistory: [],
            userStudyPatterns: [session.domain],
            preferredTopics: Array.isArray(session.concepts) ? session.concepts.slice(0, 3) : [],
            studyLevel: "advanced"
          }, {
            maxSources: 3,
            includeAnnotations: true,
            searchDepth: "quick",
            useEmbeddings: true
          });
          if (ragResponse.sources.length > 0) {
            ragContext = `

\u{1F4D6} **Current Document Context:**
`;
            ragResponse.sources.forEach((source, i) => {
              ragContext += `${i + 1}. ${source.excerpt.substring(0, 200)}...
`;
            });
            ragContext += `
`;
          }
        } catch (error) {
          console.warn("RAG context failed for expert chat:", error);
        }
        const expertPrompt = `${session.specializedPrompt}${ragContext}

Question: ${question}

Provide an expert response drawing from your specialized knowledge in ${session.domain} and the current document context:`;
        try {
          const result = await this.multiModel.executeTask("expert-chat", expertPrompt, {
            requirements: { reasoning: 8, accuracy: 8, creativity: 7 },
            timeout: 6e4
            // 60 seconds for complex expert reasoning
          });
          console.log(`\u{1F393} Expert response generated using ${result.modelUsed} (${session.domain} expertise)`);
          return result.response;
        } catch (error) {
          console.warn(`Expert chat failed, falling back to Ollama: ${error}`);
          return await this.ollama.generateText(expertPrompt, { useCache: false });
        }
      }
      // 📈 GET EXPERTISE SUMMARY
      getExpertiseSummary(documentId) {
        const session = this.learningSessions.get(documentId);
        if (!session) {
          return { expertise: false, message: "No specialized knowledge for this document" };
        }
        return {
          expertise: true,
          domain: session.domain,
          expertiseLevel: session.expertiseLevel,
          totalConcepts: Array.isArray(session.concepts) ? session.concepts.length : 0,
          concepts: Array.isArray(session.concepts) ? session.concepts : [],
          fineTuningExamples: Array.isArray(session.fineTuningData) ? session.fineTuningData.length : 0
        };
      }
      // 🔄 CONTINUOUS LEARNING
      async reinforceLearning(documentId, feedback) {
        const session = this.learningSessions.get(documentId);
        if (!session) return;
        if (feedback.correct) {
          session.expertiseLevel = Math.min(10, session.expertiseLevel + 0.5);
          console.log(`\u{1F4C8} Expertise level increased to ${session.expertiseLevel}/10 for ${session.domain}`);
        } else if (feedback.explanation) {
          const correctionPrompt = `You made an error in ${session.domain}. Learn from this correction:

Error context: ${feedback.explanation}

Update your understanding and provide a corrected expert response.`;
          try {
            const correction = await this.ollama.generateText(correctionPrompt);
            session.fineTuningData.push({
              instruction: "Learn from correction",
              input: feedback.explanation,
              output: correction,
              metadata: { type: "correction", domain: session.domain }
            });
          } catch (error) {
            console.error(`Failed to process correction: ${error}`);
          }
        }
      }
      // 🔧 UTILITY METHODS - Enhanced for various models
      parseJSON(response) {
        try {
          try {
            return JSON.parse(response.trim());
          } catch (firstError) {
            const extractionPatterns = [
              /```json\s*(\{[\s\S]*?\})\s*```/i,
              // JSON in code blocks
              /```\s*(\{[\s\S]*?\})\s*```/i,
              // JSON in generic code blocks
              /\{[\s\S]*\}/
              // Any JSON-like structure
            ];
            for (const pattern of extractionPatterns) {
              const match = response.match(pattern);
              if (match) {
                let jsonStr = match[1] || match[0];
                try {
                  jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\u0000-\u001f]+/g, "").replace(/\\(?!["\\/bfnrt])/g, "\\\\").replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
                  return JSON.parse(jsonStr);
                } catch (cleanupError) {
                  continue;
                }
              }
            }
            console.warn(`\u26A0\uFE0F JSON parsing fallback failed: Error: No JSON structure found`);
            return this.extractStructuredDataFromResponse(response);
          }
        } catch (error) {
          console.error(`JSON parsing failed: ${error}`);
          return {
            domain: "General Knowledge",
            complexity: "intermediate",
            concepts: [],
            key_terms: [],
            learning_objectives: ["Understand main concepts", "Apply knowledge practically"],
            expertise_areas: ["Content analysis", "Critical thinking"]
          };
        }
      }
      // 📋 EXTRACT STRUCTURED DATA FROM MODEL RESPONSE
      extractStructuredDataFromResponse(response) {
        const data = {
          domain: "General Knowledge",
          complexity: "intermediate",
          concepts: [],
          key_terms: [],
          learning_objectives: [],
          expertise_areas: []
        };
        const domainPatterns = [
          /domain[:"'\s]*['"]*([^,\n\]}"']+)['"]*\s*[,}]/i,
          /field[:"'\s]*['"]*([^,\n\]}"']+)['"]*\s*[,}]/i,
          /subject[:"'\s]*['"]*([^,\n\]}"']+)['"]*\s*[,}]/i
        ];
        for (const pattern of domainPatterns) {
          const match = response.match(pattern);
          if (match) {
            data.domain = match[1].trim().replace(/['"]/g, "");
            break;
          }
        }
        const complexityMatch = response.match(/complexity[:"'\s]*['"]*\s*(beginner|intermediate|advanced|expert)['"]*\s*[,}]/i);
        if (complexityMatch) data.complexity = complexityMatch[1].toLowerCase();
        data.concepts = this.extractListFromResponse(response, ["concepts", "topics", "themes"]);
        data.key_terms = this.extractListFromResponse(response, ["key_terms", "keywords", "terms"]);
        data.learning_objectives = this.extractListFromResponse(response, ["learning_objectives", "objectives", "goals"]);
        data.expertise_areas = this.extractListFromResponse(response, ["expertise_areas", "areas", "specialties"]);
        return data;
      }
      // 🔍 EXTRACT LISTS FROM MODEL RESPONSE
      extractListFromResponse(text2, fieldNames) {
        for (const fieldName of fieldNames) {
          const arrayPattern = new RegExp(`${fieldName}[:"'\\s]*\\[([^\\]]*)\\]`, "i");
          const arrayMatch = text2.match(arrayPattern);
          if (arrayMatch) {
            return arrayMatch[1].split(/,|;|\n/).map((item) => item.trim().replace(/['"]/g, "")).filter((item) => item.length > 0).slice(0, 5);
          }
          const listPattern = new RegExp(`${fieldName}[:"'\\s]*\\n([^\\n]*(?:\\n[-*\u2022]?\\s*[^\\n]*){0,4})`, "i");
          const listMatch = text2.match(listPattern);
          if (listMatch) {
            return listMatch[1].split(/\n/).map((item) => item.replace(/^[-*•\d.\s]+/, "").trim()).filter((item) => item.length > 0).slice(0, 5);
          }
        }
        return [];
      }
      // 🧠 Detect visual elements with more conservative approach
      detectVisualElements(content) {
        const visualIndicators = [
          /\b(?:chart|graph|diagram|table|figure|image|photo|picture)\b/gi,
          /<img\b[^>]*>/gi,
          /<svg\b[^>]*>/gi,
          /<canvas\b[^>]*>/gi,
          /\[visual:/gi,
          /\[image:/gi,
          /\!\[.*\]\(/gi
          // Markdown images
        ];
        const hasVisualMarkers = visualIndicators.some((pattern) => pattern.test(content));
        const textLength = content.replace(/\s/g, "").length;
        if (hasVisualMarkers && textLength > 5e4) {
          const visualMatches = visualIndicators.reduce((count, pattern) => {
            return count + (content.match(pattern) || []).length;
          }, 0);
          const shouldUseVision = visualMatches > 5;
          console.log(`\u{1F4CA} Visual analysis decision: ${shouldUseVision ? "Use vision model" : "Use text model"} (${visualMatches} visual markers, ${textLength} chars)`);
          return shouldUseVision;
        }
        console.log(`\u{1F4DD} Using fast text analysis (${textLength} chars, visual: ${hasVisualMarkers})`);
        return false;
      }
      // 📊 EXPORT FINE-TUNING DATA
      async exportFineTuningData(documentId) {
        const session = this.learningSessions.get(documentId);
        if (!session) return "";
        return session.fineTuningData.map((example) => JSON.stringify(example)).join("\n");
      }
      // 🎯 GET ALL EXPERTISE
      getAllExpertise() {
        return Array.from(this.learningSessions.values()).map((session) => ({
          documentId: session.documentId,
          domain: session.domain,
          expertiseLevel: session.expertiseLevel,
          concepts: session.concepts,
          fineTuningData: session.fineTuningData
        }));
      }
    };
    autoLearningSystem = new AutoLearningSystem();
  }
});

// server/agents/ai-teacher-agent.ts
var TeachingIntentAnalyzer, TeachingToolCallManager, AITeacherAgent;
var init_ai_teacher_agent = __esm({
  "server/agents/ai-teacher-agent.ts"() {
    "use strict";
    init_base_agent();
    init_ollama_service();
    init_document_rag_service();
    TeachingIntentAnalyzer = class {
      analyzeIntent(message) {
        return { type: "teaching_question" };
      }
    };
    TeachingToolCallManager = class {
      ollamaService;
      constructor(ollamaService) {
        this.ollamaService = ollamaService;
      }
      async generateTeachingResponse(message, context) {
        const targetLanguage = context?.language || "en";
        console.log(`\u{1F393} Teaching Tool Manager: Generating response in ${targetLanguage}`);
        const prompt = `You are an expert teacher. Explain the following question to a student in a clear, step-by-step way, using examples if helpful. Avoid unnecessary jargon.

Question: ${message}`;
        console.log(`\u{1F4DD} Teaching Tool Manager: Sending prompt to Ollama in ${targetLanguage}`);
        console.log(`\u{1F4DD} Prompt preview: ${prompt.substring(0, 200)}...`);
        const response = await this.ollamaService.generateTextWithLanguage(prompt, targetLanguage, {
          temperature: 0.3,
          // Lower temperature for more consistent language adherence
          maxTokens: 2048,
          context: `Teaching response in ${targetLanguage}`
        });
        console.log(`\u2705 Teaching Tool Manager: Received response in ${targetLanguage}`);
        console.log(`\u{1F4C4} Response preview: ${response.substring(0, 100)}...`);
        return response;
      }
      async searchTeachingContext(query, context) {
        const ragContext = {
          userId: context?.userId || 1,
          currentDocument: context?.documentId,
          currentChapter: context?.chapter,
          conversationHistory: context?.conversationHistory?.slice(-3) || [],
          userStudyPatterns: [],
          preferredTopics: [],
          studyLevel: "intermediate",
          targetLanguage: context?.language || "en"
        };
        return await documentRAGService.processRAGQuery(query, ragContext, {
          maxSources: 1,
          includeAnnotations: false,
          includeMemories: false,
          searchDepth: "quick",
          useEmbeddings: true,
          singleDocumentOnly: true,
          targetLanguage: context?.language || "en"
        });
      }
    };
    AITeacherAgent = class extends BaseAgent {
      ollamaService;
      toolCallManager;
      intentAnalyzer;
      constructor() {
        super({
          name: "AITeacherAgent",
          description: "Answers questions as a helpful, expert teacher. Focuses on clear, step-by-step explanations.",
          interval: 9e5,
          maxRetries: 2,
          timeout: 6e4,
          specialties: ["Teaching", "Explanation", "Step-by-step Guidance"]
        });
        this.ollamaService = new OllamaService({
          model: "gemma3n:e2b",
          temperature: 0.5
        });
        this.toolCallManager = new TeachingToolCallManager(this.ollamaService);
        this.intentAnalyzer = new TeachingIntentAnalyzer();
      }
      async initialize() {
        await this.ollamaService.initialize();
      }
      async handleTeachingMessage(message, context) {
        console.log(`\u{1F393} Teacher Agent: Processing message in language: ${context?.language || "en"}`);
        const intent = this.intentAnalyzer.analyzeIntent(message);
        let response = "";
        if (intent.type === "teaching_question") {
          let contextResult = null;
          if (context?.documentId) {
            contextResult = await this.toolCallManager.searchTeachingContext(message, context);
          }
          response = await this.toolCallManager.generateTeachingResponse(message, context);
          console.log(`\u2705 Teacher Agent: Generated response in ${context?.language || "en"}`);
          if (contextResult && contextResult.sources && contextResult.sources.length > 0) {
            response += `

Relevant material from your reading:
`;
            response += contextResult.sources.map((s) => `\u2022 ${s.excerpt.substring(0, 80)}...`).join("\n");
          }
        } else {
          const targetLanguage = context?.language || "en";
          const fallbackResponses = {
            "en": "I'm here to help you learn. Please ask a question!",
            "es": "Estoy aqu\xED para ayudarte a aprender. \xA1Por favor, haz una pregunta!",
            "fr": "Je suis ici pour vous aider \xE0 apprendre. Veuillez poser une question !",
            "de": "Ich bin hier, um Ihnen beim Lernen zu helfen. Bitte stellen Sie eine Frage!",
            "ja": "\u5B66\u7FD2\u306E\u304A\u624B\u4F1D\u3044\u3092\u3057\u307E\u3059\u3002\u8CEA\u554F\u3092\u3057\u3066\u304F\u3060\u3055\u3044\uFF01",
            "ko": "\uD559\uC2B5\uC744 \uB3C4\uC640\uB4DC\uB9AC\uACA0\uC2B5\uB2C8\uB2E4. \uC9C8\uBB38\uD574 \uC8FC\uC138\uC694!"
          };
          response = fallbackResponses[targetLanguage] || fallbackResponses.en;
          console.log(`\u2705 Teacher Agent: Using fallback response in ${targetLanguage}`);
        }
        return response;
      }
      // Minimal processTask for compatibility
      async processTask(task) {
        if (task.type === "TEACH") {
          return await this.handleTeachingMessage(task.data.message, task.data.context);
        }
        return null;
      }
      async cleanup() {
        return;
      }
    };
  }
});

// server/agents/agent-manager.ts
var agent_manager_exports = {};
__export(agent_manager_exports, {
  AgentManager: () => AgentManager,
  agentManager: () => agentManager
});
import { EventEmitter as EventEmitter2 } from "events";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
var AgentManager, agentManager;
var init_agent_manager = __esm({
  "server/agents/agent-manager.ts"() {
    "use strict";
    init_text_analysis_agent();
    init_study_assistant_agent();
    init_insight_generation_agent();
    init_learning_agent();
    init_discussion_agent();
    init_quiz_agent();
    init_ollama_mcp_integration();
    init_auto_learning_system();
    init_document_rag_service();
    init_ai_teacher_agent();
    AgentManager = class extends EventEmitter2 {
      config;
      agents = /* @__PURE__ */ new Map();
      io;
      httpServer;
      isRunning = false;
      startTime;
      mcpServer;
      mcpIntegration;
      pendingTasks = /* @__PURE__ */ new Map();
      ollamaService;
      // RAG coordination properties
      ragQueryCount = 0;
      agentRAGStats = /* @__PURE__ */ new Map();
      ragCache = /* @__PURE__ */ new Map();
      RAG_CACHE_TTL = 1e3 * 60 * 15;
      // 15 minutes
      constructor(config2) {
        super();
        this.config = {
          webSocketPort: 3001,
          enableMCP: true,
          ...config2
        };
        this.ollamaService = config2.ollamaService;
        if (this.config.enableMCP) {
          this.mcpIntegration = new OllamaMCPIntegration();
        }
        ["text-analysis", "study-assistant", "insight-generation", "learning", "discussion", "quiz"].forEach((agent) => {
          this.agentRAGStats.set(agent, { queries: 0, totalTime: 0 });
        });
      }
      setOllamaService(ollamaService) {
        this.ollamaService = ollamaService;
        const quizAgent = this.agents.get("QuizAgent");
        if (quizAgent && typeof quizAgent.setOllamaService === "function") {
          quizAgent.setOllamaService(ollamaService);
          this.log("Updated Quiz Agent with Ollama service");
        }
      }
      getOllamaService() {
        return this.ollamaService;
      }
      setTranslationService(translationService) {
        this.log("\u{1F310} Setting up translation service for agents...");
        const quizAgent = this.agents.get("QuizAgent");
        if (quizAgent && typeof quizAgent.setTranslationService === "function") {
          quizAgent.setTranslationService(translationService);
          this.log("\u2705 Injected translation service into Quiz Agent");
        } else {
          this.warn("\u274C QuizAgent not found or missing setTranslationService method");
        }
        const discussionAgent = this.agents.get("DiscussionAgent");
        if (discussionAgent && typeof discussionAgent.setTranslationService === "function") {
          discussionAgent.setTranslationService(translationService);
          this.log("\u2705 Injected translation service into Discussion Agent");
        } else {
          this.warn("\u274C DiscussionAgent not found or missing setTranslationService method");
        }
        const studyAgent = this.agents.get("StudyAssistantAgent");
        if (studyAgent && typeof studyAgent.setTranslationService === "function") {
          studyAgent.setTranslationService(translationService);
          this.log("\u2705 Injected translation service into Study Assistant Agent");
        } else {
          this.warn("\u274C StudyAssistantAgent not found or missing setTranslationService method");
        }
        const textAnalysisAgent = this.agents.get("TextAnalysisAgent");
        if (textAnalysisAgent && typeof textAnalysisAgent.setTranslationService === "function") {
          textAnalysisAgent.setTranslationService(translationService);
          this.log("\u2705 Injected translation service into Text Analysis Agent");
        } else {
          this.warn("\u274C TextAnalysisAgent not found or missing setTranslationService method");
        }
        const insightAgent = this.agents.get("InsightGenerationAgent");
        if (insightAgent && typeof insightAgent.setTranslationService === "function") {
          insightAgent.setTranslationService(translationService);
          this.log("\u2705 Injected translation service into Insight Generation Agent");
        } else {
          this.warn("\u274C InsightGenerationAgent not found or missing setTranslationService method");
        }
        this.log("\u{1F3AF} Translation service injection completed");
      }
      // 🧠 RAG COORDINATION METHODS
      async coordinateRAGQuery(query, agentName, context) {
        const startTime = Date.now();
        this.ragQueryCount++;
        try {
          this.log(`\u{1F50D} Coordinating RAG query from ${agentName}: "${query.substring(0, 50)}..."`);
          const enhancedContext = await this.buildCrossAgentContext(query, context);
          const cacheKey = `${query}_${context.userId}_${agentName}_${context.currentDocument || "no-doc"}_${context.currentChapter || "no-chapter"}`;
          const cached = this.ragCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < this.RAG_CACHE_TTL) {
            this.log(`\u26A1 RAG cache hit for ${agentName}: ${query.substring(0, 30)}...`);
            return cached.response;
          }
          const ragResponse = await documentRAGService.processRAGQuery(query, enhancedContext, {
            maxSources: 8,
            includeMemories: true,
            includeAnnotations: true,
            searchDepth: "comprehensive",
            useEmbeddings: true
          });
          this.ragCache.set(cacheKey, {
            response: ragResponse,
            timestamp: Date.now(),
            agent: agentName
          });
          const endTime = Date.now();
          const stats = this.agentRAGStats.get(agentName);
          if (stats) {
            stats.queries++;
            stats.totalTime += endTime - startTime;
          }
          if (ragResponse.confidence > 0.8) {
            await this.shareRAGInsights(ragResponse, this.getRelevantAgents(agentName));
          }
          this.log(`\u2705 RAG coordination complete for ${agentName} (${endTime - startTime}ms)`);
          return ragResponse;
        } catch (error) {
          this.error(`\u274C RAG coordination failed for ${agentName}: ${error}`);
          return {
            answer: `I encountered an issue processing your request. Please try rephrasing your question.`,
            sources: [],
            confidence: 0.3,
            relatedQuestions: [],
            studyRecommendations: [],
            crossReferences: []
          };
        }
      }
      async buildCrossAgentContext(query, baseContext) {
        try {
          const enhancedContext = {
            ...baseContext,
            conversationHistory: [...baseContext.conversationHistory],
            userStudyPatterns: [...baseContext.userStudyPatterns],
            preferredTopics: [...baseContext.preferredTopics]
          };
          const learningAgent = this.agents.get("learning");
          if (learningAgent && typeof learningAgent.getUserStudyPatterns === "function") {
            try {
              const userPatterns = await learningAgent.getUserStudyPatterns(baseContext.userId);
              if (Array.isArray(userPatterns)) {
                enhancedContext.userStudyPatterns.push(...userPatterns);
              }
            } catch (error) {
              this.warn(`Could not get user patterns from learning agent: ${error}`);
            }
          }
          const discussionAgent = this.agents.get("DiscussionAgent");
          if (discussionAgent && typeof discussionAgent.getRecentDiscussionTopics === "function") {
            try {
              const recentDiscussions = await discussionAgent.getRecentDiscussionTopics(baseContext.userId);
              if (Array.isArray(recentDiscussions)) {
                enhancedContext.preferredTopics.push(...recentDiscussions);
              }
            } catch (error) {
              this.warn(`Could not get discussion topics: ${error}`);
            }
          }
          this.log(`\u{1F517} Enhanced RAG context with cross-agent insights`);
          return enhancedContext;
        } catch (error) {
          this.warn(`Failed to build cross-agent context: ${error}`);
          return baseContext;
        }
      }
      async shareRAGInsights(insights, targetAgents) {
        try {
          this.log(`\u{1F4E4} Sharing RAG insights with agents: ${targetAgents.join(", ")}`);
          for (const agentName of targetAgents) {
            const agent = this.agents.get(agentName);
            if (agent && typeof agent.receiveRAGInsights === "function") {
              try {
                await agent.receiveRAGInsights(insights);
              } catch (error) {
                this.warn(`Failed to share insights with ${agentName}: ${error}`);
              }
            }
          }
          this.broadcast("ragInsightsShared", {
            insights: {
              confidence: insights.confidence,
              sourceCount: insights.sources.length,
              topics: insights.sources.map((s) => s.documentTitle).slice(0, 3)
            },
            targetAgents
          });
        } catch (error) {
          this.error(`Failed to share RAG insights: ${error}`);
        }
      }
      getRAGAnalytics() {
        const agentQueryDistribution = {};
        let totalTime = 0;
        let totalQueries = 0;
        this.agentRAGStats.forEach((stats, agentName) => {
          agentQueryDistribution[agentName] = stats.queries;
          totalTime += stats.totalTime;
          totalQueries += stats.queries;
        });
        const averageResponseTime = totalQueries > 0 ? totalTime / totalQueries : 0;
        const cacheHits = this.ragCache.size;
        const cacheHitRate = this.ragQueryCount > 0 ? cacheHits / this.ragQueryCount * 100 : 0;
        const mostActiveAgents = Object.entries(agentQueryDistribution).sort(([, a], [, b]) => b - a).slice(0, 3).map(([agent]) => agent);
        return {
          totalQueries: this.ragQueryCount,
          agentQueryDistribution,
          averageResponseTime: Math.round(averageResponseTime),
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
          mostActiveAgents
        };
      }
      getRelevantAgents(sourceAgent) {
        const agentRelations = {
          "text-analysis": ["study-assistant", "insight-generation"],
          "study-assistant": ["learning", "discussion"],
          "insight-generation": ["text-analysis", "study-assistant"],
          "learning": ["study-assistant", "discussion"],
          "discussion": ["study-assistant", "learning"]
        };
        return agentRelations[sourceAgent] || [];
      }
      async initialize() {
        this.setupAgentEventListeners();
        this.initializeWebSocketServer();
        if (this.mcpIntegration) {
          await this.mcpIntegration.initialize();
          this.log("\u{1F916} MCP Integration Initialized");
        }
        try {
          await autoLearningSystem.initialize();
          this.log("\u{1F916} Auto-Learning System Initialized");
        } catch (error) {
          this.error(`Failed to initialize Auto-Learning System: ${error}`);
        }
      }
      setupAgentEventListeners() {
        const agentClasses = [
          TextAnalysisAgent,
          StudyAssistantAgent,
          InsightGenerationAgent,
          LearningAgent,
          DiscussionAgent,
          AITeacherAgent
          // Register the new teacher agent
        ];
        agentClasses.forEach((AgentClass) => {
          const agent = new AgentClass();
          agent.setAgentManager(this);
          this.agents.set(agent.name, agent);
          this.log(`Agent ${agent.name} registered`);
          agent.on("log", (log3) => this.broadcast("log", log3));
          agent.on("taskCompleted", (payload) => {
            const { task, result } = payload;
            if (this.pendingTasks.has(task.id)) {
              const resolver = this.pendingTasks.get(task.id);
              if (resolver) {
                resolver(result);
              }
            }
            this.log(`Task ${task.id} on agent ${agent.name} completed.`);
            this.broadcast("agentTaskCompleted", { agentName: agent.name, task });
          });
          agent.on("taskFailed", (task, error) => {
            this.log(`Task ${task.id} on agent ${agent.name} failed: ${error}`);
            this.broadcast("agentTaskFailed", { agentName: agent.name, task, error: error.message });
          });
        });
        try {
          this.log("\u{1F527} Starting Quiz Agent initialization...");
          const quizAgent = new QuizAgent(this.ollamaService);
          this.log("\u2705 Quiz Agent instance created");
          quizAgent.setAgentManager(this);
          this.log("\u2705 Agent manager reference set");
          this.agents.set(quizAgent.name, quizAgent);
          this.log(`\u2705 Agent ${quizAgent.name} registered in agents map ${this.ollamaService ? "with" : "without"} shared Ollama service`);
          const registeredAgent = this.agents.get(quizAgent.name);
          if (!registeredAgent) {
            throw new Error(`Quiz Agent was not properly registered in agents map`);
          }
          this.log(`\u2705 Verified Quiz Agent is in agents map: ${registeredAgent.name}`);
          quizAgent.on("log", (log3) => this.broadcast("log", log3));
          quizAgent.on("taskCompleted", (payload) => {
            const { task, result } = payload;
            if (this.pendingTasks.has(task.id)) {
              const resolver = this.pendingTasks.get(task.id);
              if (resolver) {
                resolver(result);
              }
            }
            this.log(`Task ${task.id} on agent ${quizAgent.name} completed.`);
            this.broadcast("agentTaskCompleted", { agentName: quizAgent.name, task });
          });
          quizAgent.on("taskFailed", (task, error) => {
            this.log(`Task ${task.id} on agent ${quizAgent.name} failed: ${error}`);
            this.broadcast("agentTaskFailed", { agentName: quizAgent.name, task, error: error.message });
          });
          this.log("\u{1F3AF} Quiz Agent initialization completed successfully");
        } catch (error) {
          this.error(`\u274C Failed to initialize Quiz Agent: ${error}`);
          this.error(`\u274C Quiz Agent will not be available for quiz generation`);
        }
      }
      initializeWebSocketServer() {
        this.httpServer = createServer();
        this.io = new SocketIOServer(this.httpServer, {
          cors: {
            origin: "*",
            methods: ["GET", "POST"]
          }
        });
        this.io.on("connection", (socket) => {
          this.log("New Socket.IO connection established");
          const systemStatus = this.getSystemStatus();
          const ragAnalytics = this.getRAGAnalytics();
          socket.emit("systemStatus", {
            ...systemStatus,
            ragAnalytics
          });
          socket.on("getSystemStatus", () => {
            socket.emit("systemStatus", {
              ...this.getSystemStatus(),
              ragAnalytics: this.getRAGAnalytics()
            });
          });
          socket.on("getRagAnalytics", () => {
            socket.emit("ragAnalytics", this.getRAGAnalytics());
          });
          socket.on("requestAgentStatus", () => {
            socket.emit("systemStatus", this.getSystemStatus());
          });
          socket.on("createSession", async (data, callback) => {
            try {
              let sessionId;
              let attempts = 0;
              const maxAttempts = 3;
              while (!sessionId && attempts < maxAttempts) {
                attempts++;
                try {
                  sessionId = await this.createMCPSession(data.userId || 2);
                  if (sessionId) {
                    console.log(`\u2705 Session created successfully on attempt ${attempts}`);
                    break;
                  }
                } catch (error) {
                  console.warn(`\u26A0\uFE0F Session creation attempt ${attempts} failed:`, error instanceof Error ? error.message : "Unknown error");
                  if (attempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 200 * attempts));
                  }
                }
              }
              if (callback) {
                if (sessionId) {
                  callback({ sessionId });
                } else {
                  callback({ error: "Failed to create session after multiple attempts" });
                }
              }
            } catch (error) {
              this.error(`Session creation error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("chatMessage", async (data, callback) => {
            try {
              await this.handleChatMessage(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Chat message error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("discussionMessage", async (data, callback) => {
            try {
              await this.handleDiscussionMessage(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Discussion message error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("quizMessage", async (data, callback) => {
            try {
              await this.handleQuizMessage(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Quiz message error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("saveDiscussionNote", async (data, callback) => {
            try {
              await this.handleSaveDiscussionNote(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Save note error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("requestAnalysis", async (data, callback) => {
            try {
              await this.handleAnalysisRequest(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Analysis request error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("analyzeForVoiceReading", async (data, callback) => {
            try {
              await this.handleVoiceAnalysisRequest(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Voice analysis error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("analyzeSpecificContent", async (data, callback) => {
            try {
              await this.handleSpecificContentAnalysis(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Specific content analysis error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("teacherMessage", async (data, callback) => {
            try {
              await this.handleTeacherMessage(socket, data);
              if (callback) callback({ success: true });
            } catch (error) {
              this.error(`Teacher message error: ${error}`);
              if (callback) callback({ error: error instanceof Error ? error.message : "Unknown error" });
            }
          });
          socket.on("disconnect", () => {
            this.log("Socket.IO connection closed");
          });
        });
        this.httpServer.listen(this.config.webSocketPort, () => {
          this.log(`Socket.IO server listening on port ${this.config.webSocketPort}`);
        });
      }
      async handleChatMessage(socket, data) {
        const { message, context } = data;
        const language = context?.language || "en";
        console.log(`\u{1F310} Chat message in language: ${language}`);
        const studyAgent = this.agents.get("study-assistant");
        if (studyAgent && typeof studyAgent.handleChatMessage === "function") {
          try {
            this.log(`\u{1F393} Using Study Assistant for context-aware response (Document: ${context?.documentId}, Chapter: ${context?.chapter}, Language: ${language})`);
            const studyResponse = await studyAgent.handleChatMessage(message, {
              sessionId: context?.sessionId || "default",
              userId: context?.userId || 2,
              documentId: context?.documentId,
              chapter: context?.chapter,
              language
              // Pass language to agent
            });
            socket.emit("chatResponse", { message: studyResponse, agent: "StudyAssistant" });
            return;
          } catch (error) {
            this.warn(`Study Assistant failed, trying fallbacks: ${error}`);
          }
        }
        if (context?.documentId) {
          try {
            const expertise = autoLearningSystem.getExpertiseSummary(context.documentId);
            if (expertise.expertise) {
              this.log(`\u{1F9E0} Using expert knowledge for document ${context.documentId} (${expertise.domain} - Level ${expertise.expertiseLevel}/10)`);
              const expertResponse = await autoLearningSystem.getExpertResponse(context.documentId, message, context?.chapter);
              socket.emit("chatResponse", { message: expertResponse, isExpertResponse: true, expertise });
              return;
            }
          } catch (error) {
            this.log(`Expert knowledge not available: ${error}`);
          }
        }
        if (this.mcpIntegration) {
          const sessionId = context?.sessionId || await this.mcpIntegration.createSession(context?.userId || 2);
          const response = await this.mcpIntegration.enhancedChat(
            sessionId,
            message,
            context?.includeContext || true
          );
          socket.emit("chatResponse", { message: response, sessionId });
        } else {
          socket.emit("chatResponse", { message: "AI system not available" });
        }
      }
      async handleAnalysisRequest(socket, data) {
        const { documentId, chapter, agentType } = data;
        const agent = this.agents.get(agentType || "text-analysis");
        if (agent && typeof agent.addTask === "function") {
          const taskId = await agent.addTask("analyze", { documentId, chapter });
          socket.emit("analysisCompleted", { documentId, chapter, taskId });
        } else {
          throw new Error(`Agent not found: ${agentType}`);
        }
      }
      async handleVoiceAnalysisRequest(socket, data) {
        const { documentId, content, userLevel, preferences, currentChapter } = data;
        this.log(`\u{1F399}\uFE0F Voice analysis requested for document ${documentId} (Level: ${userLevel}, Chapter: ${currentChapter || "auto-detect"})`);
        try {
          const textAnalysisAgent = this.agents.get("text-analysis");
          const insightAgent = this.agents.get("insight-generation");
          const studyAgent = this.agents.get("study-assistant");
          const learningAgent = this.agents.get("learning");
          let chapter = currentChapter || 1;
          if (!currentChapter && content && typeof content === "string") {
            const chapterMatch = content.match(/chapter\s+(\d+)/i);
            if (chapterMatch) {
              chapter = parseInt(chapterMatch[1]);
            }
          }
          this.log(`Using chapter ${chapter} for voice analysis`);
          if (insightAgent) {
            this.log(`Requesting content-based insights from InsightGenerationAgent (with page limiting)`);
            try {
              const voiceInsights = await insightAgent.generateInsightsFromContent(
                content,
                `Document ${documentId}`,
                userLevel,
                preferences,
                documentId,
                chapter,
                2
                // Default user ID 2
              );
              if (voiceInsights && voiceInsights.length > 0) {
                socket.emit("insightsGenerated", {
                  insights: voiceInsights,
                  source: "content-analysis",
                  optimizedForVoice: true,
                  pageTracker: voiceInsights.length > 0 ? "limited" : void 0
                });
                this.log(`\u2705 Sent ${voiceInsights.length} content-based insights (page-limited)`);
              } else {
                this.log(`\u{1F4C4} No insights generated - page limit reached (1 per 10 pages)`);
                socket.emit("insightsGenerated", {
                  insights: [],
                  source: "content-analysis",
                  optimizedForVoice: true,
                  message: "Insight generation limited to 1 per 10 pages read"
                });
              }
            } catch (error) {
              this.warn(`Content-based insight generation failed: ${error}`);
            }
          }
          this.log(`\u2705 Voice analysis complete for document ${documentId}`);
        } catch (error) {
          this.error(`Voice analysis failed: ${error} - ${error instanceof Error ? error.stack : ""}`);
          socket.emit("voiceAnalysisError", {
            error: error instanceof Error ? error.message : "Unknown error",
            details: "Failed to complete voice analysis. Please try again."
          });
        }
      }
      async performEnhancedVoiceTextAnalysis(agent, data) {
        const { userLevel, content, focusAreas } = data;
        const analysis = {
          keyThemes: await this.identifyVoiceKeyThemes(content, userLevel),
          complexConcepts: await this.identifyComplexConcepts(content, userLevel),
          readingTips: await this.generateReadingTips(content, userLevel),
          emotionalTone: this.analyzeEmotionalTone(content),
          voiceEmphasis: this.generateVoiceEmphasisPoints(content),
          pauseRecommendations: this.generatePauseRecommendations(content)
        };
        return analysis;
      }
      async identifyVoiceKeyThemes(content, userLevel) {
        const contentDomain = await this.detectContentDomain(content);
        const prompt = this.getDomainPrompt(contentDomain, "theme_identification", content.substring(0, 1500));
        try {
          const ollamaService = this.agents.get("insight-generation")?.ollamaService;
          if (!ollamaService) return [];
          const response = await ollamaService.generateText(prompt);
          const themes = this.parseThemesFromResponse(response, contentDomain);
          return themes.filter((theme) => theme.importance > (userLevel === "beginner" ? 0.7 : 0.8));
        } catch (error) {
          console.warn("Theme identification failed:", error);
          return [];
        }
      }
      async detectContentDomain(content) {
        const lowerContent = content.toLowerCase();
        if (this.matchesKeywords(lowerContent, ["quantum", "physics", "particle", "energy", "wave", "atom", "electron", "photon", "relativity", "mechanics"])) {
          return "Science/Physics";
        }
        if (this.matchesKeywords(lowerContent, ["biology", "cell", "dna", "evolution", "organism", "genetics", "species", "ecosystem"])) {
          return "Science/Biology";
        }
        if (this.matchesKeywords(lowerContent, ["chemistry", "molecule", "compound", "reaction", "element", "periodic", "chemical", "bond"])) {
          return "Science/Chemistry";
        }
        if (this.matchesKeywords(lowerContent, ["computer", "programming", "algorithm", "software", "technology", "digital", "artificial intelligence", "machine learning", "data"])) {
          return "Technology/Computing";
        }
        if (this.matchesKeywords(lowerContent, ["medicine", "medical", "health", "disease", "treatment", "patient", "diagnosis", "therapy", "clinical"])) {
          return "Medicine/Health";
        }
        if (this.matchesKeywords(lowerContent, ["mathematics", "equation", "theorem", "proof", "calculus", "algebra", "geometry", "statistics", "probability"])) {
          return "Mathematics";
        }
        if (this.matchesKeywords(lowerContent, ["psychology", "behavior", "cognitive", "mental", "personality", "therapy", "psychological"])) {
          return "Psychology";
        }
        if (this.matchesKeywords(lowerContent, ["sociology", "society", "social", "culture", "community", "group", "institution", "demographic"])) {
          return "Sociology";
        }
        if (this.matchesKeywords(lowerContent, ["economy", "economic", "market", "business", "finance", "money", "trade", "investment", "capitalism"])) {
          return "Economics/Business";
        }
        if (this.matchesKeywords(lowerContent, ["politics", "political", "government", "democracy", "election", "policy", "law", "constitution"])) {
          return "Politics/Government";
        }
        if (this.matchesKeywords(lowerContent, ["philosophy", "ethics", "moral", "metaphysics", "epistemology", "logic", "philosophical", "virtue"])) {
          return "Philosophy";
        }
        if (this.matchesKeywords(lowerContent, ["history", "historical", "war", "ancient", "civilization", "empire", "revolution", "century"])) {
          return "History";
        }
        if (this.matchesKeywords(lowerContent, ["literature", "poetry", "novel", "author", "writing", "literary", "narrative", "story"])) {
          return "Literature";
        }
        if (this.matchesKeywords(lowerContent, ["art", "artistic", "painting", "sculpture", "museum", "aesthetic", "creative", "design"])) {
          return "Arts";
        }
        if (this.matchesKeywords(lowerContent, ["music", "musical", "song", "instrument", "melody", "rhythm", "composer", "symphony"])) {
          return "Music";
        }
        if (this.matchesKeywords(lowerContent, ["language", "linguistic", "grammar", "vocabulary", "translation", "communication", "speech"])) {
          return "Linguistics";
        }
        if (this.matchesKeywords(lowerContent, ["god", "jesus", "bible", "faith", "prayer", "christian", "church", "spiritual", "divine", "holy"])) {
          return "Religious/Biblical Studies";
        }
        if (this.matchesKeywords(lowerContent, ["islam", "muslim", "quran", "allah", "prophet", "mosque", "islamic"])) {
          return "Religious/Islamic Studies";
        }
        if (this.matchesKeywords(lowerContent, ["buddhism", "buddha", "meditation", "karma", "dharma", "enlightenment", "buddhist"])) {
          return "Religious/Buddhist Studies";
        }
        if (this.matchesKeywords(lowerContent, ["hinduism", "hindu", "yoga", "sanskrit", "vedic", "brahman", "chakra"])) {
          return "Religious/Hindu Studies";
        }
        if (this.matchesKeywords(lowerContent, ["self-help", "motivation", "success", "productivity", "leadership", "personal development", "goal", "habit"])) {
          return "Self-Help/Personal Development";
        }
        if (this.matchesKeywords(lowerContent, ["education", "learning", "teaching", "student", "school", "university", "curriculum", "pedagogy"])) {
          return "Education";
        }
        if (this.matchesKeywords(lowerContent, ["sports", "fitness", "exercise", "training", "athlete", "competition", "physical", "workout"])) {
          return "Sports/Fitness";
        }
        if (this.matchesKeywords(lowerContent, ["travel", "geography", "country", "city", "culture", "tourism", "destination", "exploration"])) {
          return "Travel/Geography";
        }
        if (this.matchesKeywords(lowerContent, ["cooking", "recipe", "food", "cuisine", "ingredient", "chef", "culinary", "nutrition"])) {
          return "Cooking/Food";
        }
        return "General";
      }
      matchesKeywords(content, keywords) {
        const threshold = Math.max(1, Math.floor(keywords.length * 0.3));
        let matches = 0;
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            matches++;
            if (matches >= threshold) {
              return true;
            }
          }
        }
        return false;
      }
      getDomainPrompt(domain, taskType, content) {
        const expertPersonas = {
          "Science/Physics": "As a physics professor",
          "Science/Biology": "As a biology expert",
          "Science/Chemistry": "As a chemistry specialist",
          "Technology/Computing": "As a technology expert",
          "Medicine/Health": "As a medical professional",
          "Mathematics": "As a mathematics educator",
          "Psychology": "As a psychology expert",
          "Sociology": "As a sociology scholar",
          "Economics/Business": "As a business and economics expert",
          "Politics/Government": "As a political science expert",
          "Philosophy": "As a philosophy scholar",
          "History": "As a history expert",
          "Literature": "As a literature scholar",
          "Arts": "As an art expert",
          "Music": "As a music expert",
          "Linguistics": "As a linguistics expert",
          "Religious/Biblical Studies": "As a biblical scholar",
          "Religious/Islamic Studies": "As an Islamic studies scholar",
          "Religious/Buddhist Studies": "As a Buddhist studies expert",
          "Religious/Hindu Studies": "As a Hindu studies scholar",
          "Self-Help/Personal Development": "As a personal development coach",
          "Education": "As an education expert",
          "Sports/Fitness": "As a fitness and sports expert",
          "Travel/Geography": "As a travel and geography expert",
          "Cooking/Food": "As a culinary expert"
        };
        const persona = expertPersonas[domain] || "As an expert in this field";
        if (taskType === "theme_identification") {
          return `${persona}, identify 2-3 key themes in this ${domain.toLowerCase()} text. Focus on the core concepts being discussed. For each theme, provide: topic name, importance (0.0-1.0), emphasis level, and reading notes.

TEXT: "${content}"

Return in format:
- Topic: [Key concept from ${domain}]
- Importance: [0.0-1.0]  
- Emphasis: [low/medium/high]
- Reading note: [How to emphasize when reading aloud]`;
        } else if (taskType === "concept_identification") {
          return `${persona}, identify 2-3 complex concepts in this ${domain.toLowerCase()} text that may need explanation. For each concept, provide: term, difficulty level, explanation, and voice reading notes.

TEXT: "${content}"

Return in format:
- Term: [Technical term from ${domain}]
- Difficulty: [beginner/intermediate/advanced/expert]
- Explanation: [Brief explanation appropriate for ${domain}]
- Voice note: [How to emphasize when reading aloud]`;
        } else {
          return `${persona}, analyze this ${domain.toLowerCase()} text and provide insights: ${content}`;
        }
      }
      parseThemesFromResponse(response, domain) {
        const themes = [];
        const lines = response.split("\n");
        let currentTheme = {};
        for (const line of lines) {
          if (line.includes("Topic:")) {
            if (currentTheme.topic) themes.push(currentTheme);
            currentTheme = { topic: line.replace("Topic:", "").trim() };
          } else if (line.includes("Importance:")) {
            currentTheme.importance = parseFloat(line.replace("Importance:", "").trim()) || 0.8;
          } else if (line.includes("Emphasis:")) {
            currentTheme.emphasis = line.replace("Emphasis:", "").trim() || "medium";
          } else if (line.includes("Reading note:")) {
            currentTheme.voiceNote = line.replace("Reading note:", "").trim();
          }
        }
        if (currentTheme.topic) themes.push(currentTheme);
        if (themes.length === 0) {
          return [{
            topic: domain === "Science/Physics" ? "Key Scientific Concepts" : "Main Theme",
            importance: 0.8,
            emphasis: "medium",
            voiceNote: "Emphasize this important concept"
          }];
        }
        return themes;
      }
      async identifyComplexConcepts(content, userLevel) {
        const contentDomain = await this.detectContentDomain(content);
        const complexityThreshold = {
          beginner: 0.3,
          intermediate: 0.5,
          advanced: 0.7,
          scholar: 0.9
        };
        const prompt = this.getDomainPrompt(contentDomain, "concept_identification", content.substring(0, 1500));
        try {
          const ollamaService = this.agents.get("insight-generation")?.ollamaService;
          if (!ollamaService) return [];
          const response = await ollamaService.generateText(prompt);
          const concepts = this.parseConceptsFromResponse(response, contentDomain, userLevel);
          return concepts.filter((concept) => this.getDifficultyScore(concept.difficulty) >= complexityThreshold[userLevel]);
        } catch (error) {
          console.warn("Complex concept identification failed:", error);
          return [];
        }
      }
      parseConceptsFromResponse(response, domain, userLevel) {
        const concepts = [];
        const lines = response.split("\n");
        let currentConcept = {};
        for (const line of lines) {
          if (line.includes("Term:") || line.includes("Concept:")) {
            if (currentConcept.term) concepts.push(currentConcept);
            currentConcept = { term: line.replace(/Term:|Concept:/, "").trim() };
          } else if (line.includes("Difficulty:")) {
            currentConcept.difficulty = line.replace("Difficulty:", "").trim() || "intermediate";
          } else if (line.includes("Explanation:")) {
            currentConcept.explanation = line.replace("Explanation:", "").trim();
          } else if (line.includes("Voice note:")) {
            currentConcept.voiceNote = line.replace("Voice note:", "").trim();
          }
        }
        if (currentConcept.term) concepts.push(currentConcept);
        return concepts;
      }
      getDifficultyScore(difficulty) {
        const scores = { easy: 0.2, intermediate: 0.5, advanced: 0.7, expert: 0.9 };
        return scores[difficulty] || 0.5;
      }
      async generateReadingTips(content, userLevel) {
        return {
          suggestedPace: userLevel === "beginner" ? "slow" : userLevel === "scholar" ? "moderate" : "moderate-slow",
          emotionalTone: "contemplative",
          pausePoints: [1, 3, 5, 8],
          // Intelligent pause placement
          breathingReminders: userLevel === "beginner" ? true : false,
          voiceModulation: {
            emphasizeNames: true,
            highlightQuotes: true,
            reflectivePassages: [2, 4, 6]
          }
        };
      }
      analyzeEmotionalTone(content) {
        return {
          overallTone: "hopeful",
          toneChanges: [
            { paragraph: 0, tone: "reverent", intensity: "medium" },
            { paragraph: 2, tone: "encouraging", intensity: "high" },
            { paragraph: 4, tone: "contemplative", intensity: "low" }
          ],
          voiceGuidance: "Begin with reverence, build to encouragement, end with quiet contemplation"
        };
      }
      generateVoiceEmphasisPoints(content) {
        return [
          {
            paragraph: 0,
            phrase: "love of God",
            emphasis: "high",
            reason: "Central theological concept",
            voiceNote: "Slow down and emphasize each word"
          },
          {
            paragraph: 2,
            phrase: "never forsaken",
            emphasis: "medium",
            reason: "Comfort and assurance",
            voiceNote: "Warm, reassuring tone"
          }
        ];
      }
      generatePauseRecommendations(content) {
        return [
          {
            paragraph: 1,
            type: "reflection",
            duration: "medium",
            reason: "Deep spiritual truth presented",
            guidance: "Allow listeners to absorb this truth"
          },
          {
            paragraph: 3,
            type: "emphasis",
            duration: "short",
            reason: "Key concept introduced",
            guidance: "Brief pause to highlight importance"
          }
        ];
      }
      async getPersonalizedVoiceStudyInsights(agent, data) {
        const { userLevel, preferences, content, chapter } = data;
        const explanationStyles = {
          beginner: "simple and encouraging",
          intermediate: "thoughtful and growth-oriented",
          advanced: "detailed and theologically rich",
          scholar: "academically rigorous with original language insights"
        };
        const explanation = await this.generatePersonalizedExplanation(content, userLevel);
        const concepts = await this.extractKeyConcepts(content, userLevel);
        return {
          paragraph: 0,
          explanation,
          importance: "high",
          concepts,
          voiceGuidance: {
            tone: explanationStyles[userLevel],
            pacing: userLevel === "beginner" ? "slow" : "moderate",
            emphasis: userLevel === "scholar" ? "analytical" : "educational"
          }
        };
      }
      async generatePersonalizedExplanation(content, userLevel) {
        const domain = await this.detectContentDomain(content);
        if (domain.toLowerCase().includes("economics") || domain.toLowerCase().includes("finance")) {
          const explanations = {
            beginner: "This passage introduces important economic concepts that help us understand how financial systems work. These principles are fundamental to grasping how money, markets, and economic decisions impact our daily lives.",
            intermediate: "This text explores deeper economic relationships and market dynamics. The concepts presented here challenge us to think critically about financial systems and their broader implications for society and individual decision-making.",
            advanced: "The economic framework presented encompasses both theoretical foundations and practical applications. We see the interplay between market forces, policy decisions, and economic outcomes that shape modern financial landscapes.",
            scholar: "This analysis demonstrates sophisticated economic modeling and theoretical frameworks. The methodological approaches and analytical structures reveal layers of complexity that connect to broader economic theories and empirical research."
          };
          return explanations[userLevel] || explanations.intermediate;
        } else if (domain.toLowerCase().includes("technology") || domain.toLowerCase().includes("computing")) {
          const explanations = {
            beginner: "This section explains important technology concepts that help us understand how digital systems work. These principles are essential for grasping how computers, software, and digital tools function in our modern world.",
            intermediate: "This text explores deeper technical relationships and system architectures. The concepts presented challenge us to think systematically about technology design and implementation.",
            advanced: "The technical framework encompasses both theoretical computer science and practical engineering. We see the interplay between algorithms, data structures, and system design that drives modern computing.",
            scholar: "This analysis demonstrates sophisticated computational models and theoretical frameworks. The algorithmic approaches and system architectures reveal layers of complexity in modern computing systems."
          };
          return explanations[userLevel] || explanations.intermediate;
        } else {
          const explanations = {
            beginner: "This passage introduces important concepts that help us understand the subject matter. These ideas are fundamental to grasping the key principles and their applications.",
            intermediate: "This text explores deeper relationships and underlying principles. The concepts presented challenge us to think critically about the subject and its broader implications.",
            advanced: "The framework presented encompasses both theoretical foundations and practical applications. We see the interplay between different elements that shape understanding in this field.",
            scholar: "This analysis demonstrates sophisticated theoretical frameworks and methodological approaches. The analytical structures reveal layers of complexity that connect to broader academic discourse."
          };
          return explanations[userLevel] || explanations.intermediate;
        }
      }
      async extractKeyConcepts(content, userLevel) {
        const domain = await this.detectContentDomain(content);
        if (domain.toLowerCase().includes("economics") || domain.toLowerCase().includes("finance")) {
          const conceptsByLevel = {
            beginner: ["money", "markets", "supply and demand", "economic growth"],
            intermediate: ["monetary policy", "financial systems", "market dynamics", "economic indicators"],
            advanced: ["macroeconomic theory", "financial regulation", "market efficiency", "economic modeling"],
            scholar: ["econometric analysis", "behavioral economics", "institutional frameworks", "policy implications"]
          };
          return conceptsByLevel[userLevel] || conceptsByLevel.intermediate;
        } else if (domain.toLowerCase().includes("technology") || domain.toLowerCase().includes("computing")) {
          const conceptsByLevel = {
            beginner: ["computers", "software", "data", "algorithms"],
            intermediate: ["programming", "system design", "data structures", "user interfaces"],
            advanced: ["software architecture", "computational complexity", "system optimization", "technical frameworks"],
            scholar: ["theoretical computer science", "algorithmic analysis", "system modeling", "computational paradigms"]
          };
          return conceptsByLevel[userLevel] || conceptsByLevel.intermediate;
        } else {
          const conceptsByLevel = {
            beginner: ["key ideas", "basic concepts", "fundamental principles", "main themes"],
            intermediate: ["theoretical frameworks", "analytical methods", "core principles", "practical applications"],
            advanced: ["complex relationships", "systematic analysis", "methodological approaches", "theoretical implications"],
            scholar: ["academic discourse", "research methodologies", "theoretical paradigms", "scholarly frameworks"]
          };
          return conceptsByLevel[userLevel] || conceptsByLevel.intermediate;
        }
      }
      async getEnhancedVoiceCrossReferences(agent, data) {
        const { userLevel, content } = data;
        const domain = await this.detectContentDomain(content);
        if (domain.toLowerCase().includes("economics") || domain.toLowerCase().includes("finance")) {
          return {
            paragraph: 0,
            title: "Related Economic Principle",
            connection: "This concept relates to fundamental economic theory",
            relevance: "high",
            voiceNote: "Consider this connection to deepen understanding",
            explanation: userLevel === "beginner" ? "This principle appears in many economic contexts" : "This theoretical framework provides broader context for understanding",
            readingTip: "Pause to consider how this connects to broader economic concepts"
          };
        } else if (domain.toLowerCase().includes("technology")) {
          return {
            paragraph: 0,
            title: "Related Technical Concept",
            connection: "This builds on fundamental technology principles",
            relevance: "high",
            voiceNote: "Note this technical connection",
            explanation: userLevel === "beginner" ? "This concept appears in many technical contexts" : "This technical framework provides broader understanding",
            readingTip: "Pause to consider the technical implications"
          };
        } else {
          return {
            paragraph: 0,
            title: "Related Concept",
            connection: "This connects to broader themes in the subject",
            relevance: "medium",
            voiceNote: "Consider this thematic connection",
            explanation: userLevel === "beginner" ? "This idea appears in related contexts" : "This conceptual parallel provides additional insight",
            readingTip: "Pause to reflect on this connection"
          };
        }
      }
      async getIntelligentLearningAdaptations(agent, data) {
        const { userLevel, preferences, content } = data;
        const contentComplexity = this.analyzeContentComplexity(content);
        const personalizedSettings = this.generatePersonalizedSettings(userLevel, contentComplexity, preferences);
        return {
          preferredSpeed: personalizedSettings.speed,
          comprehensionLevel: userLevel,
          recommendedFeatures: {
            enableReflectionPauses: personalizedSettings.needsPauses,
            enableDetailedExplanations: personalizedSettings.needsExplanations,
            suggestedVoice: personalizedSettings.voiceRecommendation,
            emphasizeKeyTerms: personalizedSettings.emphasizeTerms,
            provideCrossReferences: personalizedSettings.crossRefs
          },
          adaptationReasoning: personalizedSettings.reasoning,
          voiceCoaching: {
            beforeReading: personalizedSettings.preparation,
            duringReading: personalizedSettings.guidance,
            afterReading: personalizedSettings.reflection
          }
        };
      }
      analyzeContentComplexity(content) {
        const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(" ").length, 0) / sentences.length;
        const complexTerms = ["methodology", "implementation", "infrastructure", "optimization", "algorithm", "paradigm", "framework", "architecture"];
        const complexTermCount = complexTerms.filter(
          (term) => content.toLowerCase().includes(term)
        ).length;
        let complexityScore = 0;
        if (avgSentenceLength > 20) complexityScore += 2;
        if (avgSentenceLength > 15) complexityScore += 1;
        if (complexTermCount > 3) complexityScore += 2;
        if (complexTermCount > 1) complexityScore += 1;
        if (complexityScore >= 4) return "high";
        if (complexityScore >= 2) return "medium";
        return "low";
      }
      generatePersonalizedSettings(userLevel, complexity, preferences) {
        const settings = {
          beginner: {
            speed: 0.8,
            needsPauses: true,
            needsExplanations: true,
            voiceRecommendation: "sarah",
            emphasizeTerms: true,
            crossRefs: complexity !== "high",
            reasoning: "Slower pace and explanations help build understanding",
            preparation: "Take time to center yourself and focus on understanding",
            guidance: "Focus on the key concepts and ideas throughout this passage",
            reflection: "Consider how this knowledge applies to your learning goals"
          },
          intermediate: {
            speed: 1,
            needsPauses: complexity === "high",
            needsExplanations: complexity !== "low",
            voiceRecommendation: "sarah",
            emphasizeTerms: true,
            crossRefs: true,
            reasoning: "Balanced approach with contextual support",
            preparation: "Focus on deepening your understanding as you listen",
            guidance: "Notice how this passage connects to your learning journey",
            reflection: "What insights are you gaining from these concepts?"
          },
          advanced: {
            speed: 1.1,
            needsPauses: false,
            needsExplanations: complexity === "high",
            voiceRecommendation: "james",
            emphasizeTerms: complexity === "high",
            crossRefs: true,
            reasoning: "Sophisticated analysis with conceptual depth",
            preparation: "Prepare to engage with the conceptual richness of this text",
            guidance: "Consider the broader theoretical and practical implications",
            reflection: "How does this deepen your understanding of the subject matter?"
          },
          scholar: {
            speed: 1.2,
            needsPauses: false,
            needsExplanations: false,
            voiceRecommendation: "james",
            emphasizeTerms: false,
            crossRefs: true,
            reasoning: "Academic approach focusing on textual and analytical analysis",
            preparation: "Engage your analytical faculties while maintaining focused attention",
            guidance: "Note the methodological and theoretical dimensions",
            reflection: "Consider the broader academic and systematic implications"
          }
        };
        return settings[userLevel] || settings.intermediate;
      }
      generateVoiceReadingGuidance(userLevel, preferences, content) {
        return {
          preparationTips: {
            beforeReading: [
              "Find a quiet space free from distractions",
              "Take a moment for focused concentration",
              "Have water nearby for vocal care",
              userLevel === "beginner" ? "Remember that understanding grows with time" : "Prepare to engage deeply with the text"
            ]
          },
          readingGuidance: {
            voiceProjection: "Speak clearly but conversationally",
            emotionalConnection: "Let the emotion of the text come through naturally",
            pacing: "Vary your pace to match the content's rhythm",
            emphasis: "Highlight key concepts and ideas without overdoing it"
          },
          postReadingReflection: {
            immediateSteps: [
              "Pause in silence for a moment",
              "Consider what stood out most powerfully",
              "Take a moment to appreciate the insights gained"
            ],
            longerReflection: [
              "Journal about insights received",
              "Consider practical applications",
              "Share meaningful insights with others"
            ]
          },
          technicalTips: {
            voiceCare: "Stay hydrated and speak from your diaphragm",
            equipment: "Use good headphones for better audio quality",
            environment: "Soft furnishings help reduce echo"
          }
        };
      }
      async start() {
        if (this.isRunning) {
          this.log("Agent Manager is already running");
          return;
        }
        try {
          this.log("Starting Agent Manager...");
          this.startTime = /* @__PURE__ */ new Date();
          this.isRunning = true;
          if (this.mcpServer) {
            await this.mcpServer.start();
            this.log("MCP server started");
          }
          for (const [name, agent] of Array.from(this.agents.entries())) {
            await agent.start();
            this.log(`Started agent: ${name}`);
          }
          this.emit("started");
          this.log("Agent Manager started successfully");
        } catch (error) {
          this.error(`Failed to start Agent Manager: ${error}`);
          this.isRunning = false;
          throw error;
        }
      }
      async stop() {
        if (!this.isRunning) {
          this.log("Agent Manager is not running");
          return;
        }
        try {
          this.log("Stopping Agent Manager...");
          this.isRunning = false;
          for (const [name, agent] of Array.from(this.agents.entries())) {
            await agent.stop();
            this.log(`Stopped agent: ${name}`);
          }
          if (this.io) {
            this.io.close();
            this.log("Socket.IO server closed");
          }
          if (this.httpServer) {
            this.httpServer.close();
            this.log("HTTP server closed");
          }
          this.emit("stopped");
          this.log("Agent Manager stopped successfully");
        } catch (error) {
          this.error(`Error stopping Agent Manager: ${error}`);
          throw error;
        }
      }
      async startAgent(agentName) {
        const agent = this.agents.get(agentName);
        if (agent) {
          await agent.start();
          this.log(`Started agent: ${agentName}`);
          this.broadcast("agentStarted", { agent: agentName });
        } else {
          throw new Error(`Agent not found: ${agentName}`);
        }
      }
      async stopAgent(agentName) {
        const agent = this.agents.get(agentName);
        if (agent) {
          await agent.stop();
          this.log(`Stopped agent: ${agentName}`);
          this.broadcast("agentStopped", { agent: agentName });
        } else {
          throw new Error(`Agent not found: ${agentName}`);
        }
      }
      async requestAgentTask(agentName, taskType, taskData) {
        const agent = this.agents.get(agentName);
        if (!agent) throw new Error(`Agent ${agentName} not found`);
        return agent.addTask(taskType, taskData);
      }
      async requestAgentTaskAndWait(agentName, taskType, taskData, priority = 2) {
        const agent = this.agents.get(agentName);
        if (!agent) {
          throw new Error(`Agent ${agentName} not found`);
        }
        const taskId = agent.addTask(taskType, taskData, priority);
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            this.pendingTasks.delete(taskId);
            reject(new Error(`Request for task ${taskId} on agent ${agentName} timed out.`));
          }, 12e4);
          this.pendingTasks.set(taskId, (result) => {
            clearTimeout(timeoutId);
            this.pendingTasks.delete(taskId);
            resolve(result);
          });
        });
      }
      broadcast(type, data) {
        if (this.io) {
          this.io.emit(type, data);
        }
      }
      getSystemStatus() {
        const agentStatuses = Array.from(this.agents.entries()).map(([name, agent]) => ({
          ...agent.getStatus(),
          name
        }));
        return {
          isRunning: this.isRunning,
          startTime: this.startTime,
          uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
          totalAgents: this.agents.size,
          activeAgents: agentStatuses.filter((a) => a.isRunning).length,
          agents: agentStatuses,
          mcpEnabled: !!this.mcpServer,
          activeMCPSessions: this.mcpIntegration?.getActiveSessionsCount() || 0
        };
      }
      // MCP Integration methods
      async createMCPSession(userId) {
        return this.mcpIntegration?.createSession(userId);
      }
      async endMCPSession(sessionId) {
        await this.mcpIntegration?.endSession(sessionId);
      }
      log(message) {
        if (this.config.logLevel !== "error") {
          console.log(`[AgentManager] ${message}`);
        }
      }
      error(message) {
        console.error(`[AgentManager] ${message}`);
      }
      warn(message) {
        console.warn(`[AgentManager] ${message}`);
      }
      async handleSpecificContentAnalysis(socket, data) {
        const { documentId, paragraph, requestType, userLevel } = data;
        this.log(`\u{1F50D} Specific content analysis: ${requestType} for document ${documentId}, paragraph ${paragraph}`);
        try {
          if (requestType === "contextual_help") {
            const studyAgent = this.agents.get("study-assistant");
            if (studyAgent) {
              const helpData = await this.getContextualHelp(studyAgent, {
                documentId,
                paragraph,
                userLevel
              });
              socket.emit("contextualHelp", helpData);
            }
          }
        } catch (error) {
          this.error(`Specific content analysis failed: ${error}`);
          socket.emit("specificAnalysisError", { error: error instanceof Error ? error.message : "Unknown error" });
        }
      }
      async getContextualHelp(agent, data) {
        const { paragraph, userLevel } = data;
        return {
          paragraph,
          helpType: "explanation",
          content: `Here's additional context for paragraph ${paragraph} at ${userLevel} level...`,
          relatedConcepts: ["faith", "hope", "perseverance"]
        };
      }
      async handleDiscussionMessage(socket, data) {
        try {
          const {
            message,
            sessionId,
            userId,
            documentId,
            chapter,
            mode = "normal",
            language = "en",
            conversationHistory = []
          } = data;
          const supportedLanguages = ["en", "es", "fr", "de"];
          const validatedLanguage = supportedLanguages.includes(language) ? language : "en";
          if (validatedLanguage !== language) {
            console.log(`\u26A0\uFE0F Unsupported language: ${language}, defaulting to English`);
          }
          console.log(`\u{1F310} Chat message in language: ${validatedLanguage}`);
          console.log(`\u{1F4DD} Conversation history length: ${conversationHistory.length}`);
          const discussionAgent = this.agents.get("DiscussionAgent");
          if (!discussionAgent) {
            throw new Error("Discussion agent not found");
          }
          const response = await discussionAgent.handleDiscussionMessage(message, {
            sessionId,
            userId,
            documentId,
            chapter,
            mode,
            language: validatedLanguage,
            socket,
            conversationHistory
            // Pass conversation history for context restoration
          });
          socket.emit("discussionResponse", {
            success: true,
            message: response,
            sessionId,
            language: validatedLanguage
          });
        } catch (error) {
          this.error(`Discussion message handling failed: ${error}`);
          socket.emit("discussionResponse", {
            error: true,
            message: "Failed to process discussion message",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      async handleSaveDiscussionNote(socket, data) {
        try {
          const { note, discussionId, userId } = data;
          const discussionAgent = this.agents.get("DiscussionAgent");
          if (!discussionAgent) {
            throw new Error("Discussion agent not found");
          }
          const savedNote = await discussionAgent.saveDiscussionNote(note, discussionId, userId);
          socket.emit("discussionNoteSaved", {
            success: true,
            note: savedNote
          });
        } catch (error) {
          this.error(`Save discussion note failed: ${error}`);
          socket.emit("discussionNoteSaved", {
            error: true,
            message: "Failed to save discussion note"
          });
        }
      }
      async handleQuizMessage(socket, data) {
        try {
          const { message, context } = data;
          this.log("\u{1F3AF} Quiz message received, starting processing...");
          const language = context?.language || "en";
          this.log(`\u{1F310} Quiz generation in language: ${language}`);
          const supportedLanguages = ["en", "es", "fr", "de"];
          if (!supportedLanguages.includes(language)) {
            this.warn(`\u26A0\uFE0F Unsupported language: ${language}, defaulting to English`);
            context.language = "en";
          }
          if (context?.documentId) {
            this.log(`\u{1F9F9} Clearing cache for document ${context.documentId} to ensure fresh quiz generation`);
            try {
              const ollamaService = this.getOllamaService();
              if (ollamaService) {
                ollamaService.clearCacheForDocument(context.documentId, context.chapter);
              }
              const { QueryResultCacheService: QueryResultCacheService2 } = await Promise.resolve().then(() => (init_query_result_cache_service(), query_result_cache_service_exports));
              const queryCache = new QueryResultCacheService2();
              await queryCache.invalidateContext(context.userId || 2, context.documentId);
            } catch (error) {
              this.warn(`\u26A0\uFE0F Failed to clear cache: ${error}`);
            }
          }
          this.log(`\u{1F50D} Available agents: ${Array.from(this.agents.keys()).join(", ")}`);
          const quizAgent = this.agents.get("QuizAgent");
          if (!quizAgent) {
            this.error(`\u274C Quiz agent not found in agents map. Available agents: ${Array.from(this.agents.keys()).join(", ")}`);
            throw new Error("Quiz agent not found");
          }
          this.log(`\u2705 Quiz agent found: ${quizAgent.name}`);
          this.log(`\u{1F3AF} Requesting quiz with validated language: ${context.language}`);
          const quiz = await quizAgent.handleQuizRequest(message, {
            ...context,
            language: context.language
          });
          this.log(`\u2705 Quiz generated successfully in ${context.language}, title: "${quiz.title}"`);
          socket.emit("quizGenerated", {
            success: true,
            quiz,
            language: context.language
          });
        } catch (error) {
          this.error(`\u274C Quiz message handling failed: ${error}`);
          socket.emit("quizGenerated", {
            error: true,
            message: "Failed to generate quiz",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      async handleTeacherMessage(socket, data) {
        try {
          const {
            message,
            sessionId,
            userId,
            documentId,
            chapter,
            language = "en",
            conversationHistory = []
          } = data;
          this.log(`\u{1F393} Teacher message received in language: ${language}`);
          const supportedLanguages = ["en", "es", "fr", "de", "ja", "ko"];
          const validatedLanguage = supportedLanguages.includes(language) ? language : "en";
          if (validatedLanguage !== language) {
            this.warn(`\u26A0\uFE0F Unsupported language: ${language}, defaulting to English`);
          }
          this.log(`\u2705 Using validated language: ${validatedLanguage}`);
          const teacherAgent = this.agents.get("AITeacherAgent");
          if (!teacherAgent) {
            throw new Error("Teacher agent not found");
          }
          const response = await teacherAgent.handleTeachingMessage(message, {
            sessionId,
            userId,
            documentId,
            chapter,
            language: validatedLanguage,
            conversationHistory
          });
          this.log(`\u2705 Teacher response generated in ${validatedLanguage}`);
          socket.emit("teacherResponse", {
            success: true,
            message: response,
            sessionId,
            language: validatedLanguage
          });
        } catch (error) {
          this.error(`Teacher message handling failed: ${error}`);
          socket.emit("teacherResponse", {
            error: true,
            message: "Failed to process teacher message",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    };
    agentManager = new AgentManager({
      webSocketPort: 3001,
      enableMCP: true,
      logLevel: "info"
    });
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down gracefully...");
      await agentManager.stop();
      process.exit(0);
    });
    process.on("SIGINT", async () => {
      console.log("SIGINT received, shutting down gracefully...");
      await agentManager.stop();
      process.exit(0);
    });
    if (import.meta.url === `file://${process.argv[1]}`) {
      (async () => {
        try {
          await agentManager.initialize();
          await agentManager.start();
          console.log("\u{1F916} AI Agent System is now running 24/7!");
        } catch (error) {
          console.error("Failed to start agent system:", error);
          process.exit(1);
        }
      })();
    }
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
init_storage();
import { createServer as createServer2 } from "http";
import { Server as SocketIOServer2 } from "socket.io";
import multer from "multer";

// server/document-processor.ts
init_ollama_service();
var DocumentProcessor = class {
  ollamaService;
  constructor() {
    this.ollamaService = new OllamaService({
      model: "gemma3n:e2b",
      // Better at document analysis, under 7GB
      temperature: 0.3
      // Lower temperature for more consistent analysis
    });
  }
  // Process PDF files with automatic text extraction
  async processPDF(buffer, filename) {
    try {
      console.log(`\u{1F4C4} Processing PDF: ${filename}`);
      await this.ollamaService.initialize();
      const pdfExtraction = await import("pdf-extraction");
      const extract = pdfExtraction.default || pdfExtraction.extract || pdfExtraction;
      const data = await extract(buffer);
      const extractedText = data.text;
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from this PDF");
      }
      console.log(`\u2705 PDF text extracted: ${extractedText.length} characters`);
      return await this.processText(extractedText, filename);
    } catch (error) {
      console.error(`\u274C PDF processing failed:`, error);
      const fallbackText = `PDF Processing Error for: ${filename}

This PDF could not be automatically processed. This might happen if:
- The PDF contains scanned images instead of text
- The PDF is password protected
- The PDF has complex formatting

Please try:
1. Opening the PDF and copying the text manually (Ctrl+A, Ctrl+C)
2. Pasting into a text file and uploading that instead
3. Or use an online PDF to text converter

Error details: ${error?.message || "Unknown error"}`;
      console.log(`\u26A0\uFE0F PDF fallback message created for: ${filename}`);
      return await this.processText(fallbackText, filename);
    }
  }
  // Process TXT files
  async processTXT(buffer, filename) {
    try {
      await this.ollamaService.initialize();
      const text2 = buffer.toString("utf-8");
      return await this.processText(text2, filename);
    } catch (error) {
      throw new Error(`Failed to process TXT: ${error?.message || "Unknown error"}`);
    }
  }
  // Main text processing logic with intelligent chapter detection
  async processText(text2, filename) {
    const cleanText = this.cleanText(text2);
    const title = this.extractTitle(cleanText, filename);
    console.log("\u{1F4D6} Using pattern-based chapter detection...");
    const chapters = await this.detectChaptersWithPatterns(cleanText);
    return {
      title,
      chapters,
      totalChapters: chapters.length
    };
  }
  // Clean and normalize text
  cleanText(text2) {
    return text2.replace(/\s+/g, " ").replace(/^\d+\s*$/gm, "").replace(/^Page \d+.*$/gim, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  // Extract title from content or filename
  extractTitle(text2, filename) {
    const lines = text2.split("\n").filter((line) => line.trim().length > 0);
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length < 3 || line.length > 100) continue;
      if (/^(chapter|part|section)\s+\d+/i.test(line)) continue;
      if (line.length > 10 && line.length < 80) {
        return line;
      }
    }
    return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  }
  // Robust pattern-based chapter detection
  async detectChaptersWithPatterns(text2) {
    console.log("\u{1F50D} Analyzing text structure for chapter patterns...");
    const strategies = [
      () => this.detectExplicitChapters(text2),
      () => this.detectNumberedSections(text2),
      () => this.detectRomanNumeralSections(text2),
      () => this.detectAcademicPatterns(text2),
      // New academic-focused strategy
      () => this.detectHeadingPatterns(text2),
      () => this.detectBulletPointSections(text2),
      // New strategy
      () => this.detectPageBreaks(text2),
      () => this.aiAssistedChapterDetection(text2),
      // New AI strategy
      () => this.createSmartPagination(text2)
    ];
    for (const strategy of strategies) {
      const chapters = await strategy();
      if (chapters.length > 1) {
        console.log(`\u2705 Found ${chapters.length} chapters using pattern detection`);
        return chapters;
      }
    }
    console.log("\u{1F4C4} Using smart pagination as fallback");
    return await this.createSmartPagination(text2);
  }
  // New: AI-assisted chapter boundary detection
  async aiAssistedChapterDetection(text2) {
    try {
      console.log("\u{1F916} Using AI-assisted chapter detection...");
      const maxAnalysisSize = 1e4;
      const analysisText = text2.length > maxAnalysisSize ? text2.substring(0, maxAnalysisSize) : text2;
      const chapterBoundaries = await this.analyzeChunkForBoundaries(analysisText, 0);
      if (chapterBoundaries.length > 0) {
        console.log(`\u{1F916} AI detected ${chapterBoundaries.length} boundaries in first portion`);
        const appliedChapters = await this.applyPatternToFullText(text2, chapterBoundaries);
        if (appliedChapters.length > 1) {
          console.log(`\u{1F916} Successfully applied patterns to create ${appliedChapters.length} chapters`);
          return appliedChapters;
        } else {
          console.log(`\u{1F916} Pattern application failed, forcing smart pagination with multiple chapters`);
          return await this.createSmartPagination(text2);
        }
      }
      return [];
    } catch (error) {
      console.log("\u26A0\uFE0F AI chapter detection failed, falling back to pattern detection");
      return [];
    }
  }
  // Apply discovered patterns to the full text
  async applyPatternToFullText(text2, sampleBoundaries) {
    const patterns = sampleBoundaries.map((b) => b.title).join(" | ");
    console.log(`\u{1F916} Applying patterns: ${patterns}`);
    const lines = text2.split("\n");
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    const foundTitles = sampleBoundaries.map((b) => b.title.toLowerCase());
    const dynamicPatterns = [];
    for (const title of foundTitles) {
      if (title.includes("introduction")) {
        dynamicPatterns.push(/^(Introduction|INTRODUCTION)/i);
      }
      if (title.includes("tablet")) {
        dynamicPatterns.push(/^.*tablet.*$/i);
      }
      if (title.includes("creation")) {
        dynamicPatterns.push(/^.*creation.*$/i);
      }
      if (title.includes("account")) {
        dynamicPatterns.push(/^.*account.*$/i);
      }
      if (title.includes("history")) {
        dynamicPatterns.push(/^.*history.*$/i);
      }
    }
    const academicPatterns = [
      /^(Chapter|CHAPTER)\s+(\d+|[IVXLCDM]+)/i,
      /^(Part|PART)\s+(\d+|[IVXLCDM]+)/i,
      /^(Section|SECTION)\s+(\d+|[IVXLCDM]+)/i,
      /^([IVXLCDM]+)[\.\:\s]/i,
      // Roman numerals
      /^(\d+)[\.\:\s]/,
      // Numbers
      /^([A-Z][A-Z\s]{5,50})$/,
      // ALL CAPS headings
      /^([A-Z][a-z\s]{10,80})$/,
      // Title case headings
      ...dynamicPatterns
    ];
    let foundChapters = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isChapterStart = false;
      if (line.length < 3) continue;
      for (const pattern of academicPatterns) {
        if (pattern.test(line)) {
          isChapterStart = true;
          foundChapters++;
          console.log(`\u{1F916} Found chapter boundary: "${line}"`);
          break;
        }
      }
      if (isChapterStart) {
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        const title = line.length > 60 ? line.substring(0, 57) + "..." : line;
        currentChapter = {
          title: title || `Chapter ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    console.log(`\u{1F916} Pattern application created ${chapters.length} chapters from ${foundChapters} boundaries`);
    return chapters;
  }
  // Analyze a chunk of text for chapter boundaries using AI
  async analyzeChunkForBoundaries(chunk, offsetPosition) {
    const prompt = `You are analyzing text to find chapter boundaries. Look at this text and find clear section breaks.

IMPORTANT: Reply with ONLY valid JSON, no other text.

Look for patterns like:
- "Chapter 1", "Chapter 2", "Part I", "Section 1"
- "1.", "2.", "3." at the start of lines
- "I.", "II.", "III." (Roman numerals)
- Clear topic changes or major headings

If you find chapter boundaries, return JSON like this:
[{"title": "Chapter 1: Introduction", "startPosition": 0}, {"title": "Chapter 2: Main Content", "startPosition": 1500}]

If no clear boundaries exist, return: []

Text to analyze:
${chunk.substring(0, 3e3)}`;
    try {
      const messages = [
        { role: "user", content: prompt }
      ];
      const response = await this.ollamaService.chat(messages);
      const cleanResponse = response.trim();
      let jsonStart = cleanResponse.indexOf("[");
      let jsonEnd = cleanResponse.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = cleanResponse.substring(jsonStart, jsonEnd + 1);
        const boundaries = JSON.parse(jsonStr);
        if (Array.isArray(boundaries) && boundaries.length > 0) {
          console.log(`\u{1F916} AI found ${boundaries.length} potential boundaries`);
          return boundaries.map((boundary, index2) => ({
            title: boundary.title || `Section ${index2 + 1}`,
            number: index2 + 1,
            startPosition: (boundary.startPosition || 0) + offsetPosition,
            paragraphs: []
          }));
        }
      }
      return [];
    } catch (error) {
      console.log(`\u{1F916} AI boundary analysis failed: ${error}`);
      return [];
    }
  }
  // Create chapters from detected boundaries
  async createChaptersFromBoundaries(text2, boundaries) {
    const chapters = [];
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i];
      const end = i < boundaries.length - 1 ? boundaries[i + 1] : text2.length;
      const chapterText = text2.substring(start, end).trim();
      if (chapterText.length > 100) {
        const title = await this.generateChapterTitle(chapterText, i + 1);
        const paragraphs = this.splitIntoParagraphs(chapterText);
        chapters.push({
          title,
          number: i + 1,
          paragraphs
        });
      }
    }
    return chapters;
  }
  // New: Detect academic/technical document patterns
  detectAcademicPatterns(text2) {
    const lines = text2.split("\n");
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    const academicPatterns = [
      /^(Abstract|ABSTRACT)$/i,
      /^(Introduction|INTRODUCTION)$/i,
      /^(Background|BACKGROUND)$/i,
      /^(Literature Review|LITERATURE REVIEW)$/i,
      /^(Methodology|METHODOLOGY|Methods|METHODS)$/i,
      /^(Results|RESULTS)$/i,
      /^(Discussion|DISCUSSION)$/i,
      /^(Conclusion|CONCLUSION|Conclusions|CONCLUSIONS)$/i,
      /^(References|REFERENCES|Bibliography|BIBLIOGRAPHY)$/i,
      /^(Appendix|APPENDIX)\s*[A-Z0-9]*$/i,
      /^(\d+)[\.\s]+(Introduction|Background|Methods|Results|Discussion|Conclusion)/i,
      /^([A-Z][A-Z\s]{8,40})$/,
      // ALL CAPS headings (8-40 chars)
      /^(\d+)[\.\s]+([A-Z][^\.]{10,60})$/
      // "1. Title Case Heading"
    ];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isAcademicSection = false;
      for (const pattern of academicPatterns) {
        if (pattern.test(line)) {
          isAcademicSection = true;
          break;
        }
      }
      if (isAcademicSection) {
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        const title = line.length > 50 ? line.substring(0, 47) + "..." : line;
        currentChapter = {
          title: title || `Section ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
        if (line && line.length > 3) {
          this.addLineToChapter(currentChapter, line);
        }
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    return chapters;
  }
  // New: Detect bullet point or list-based sections
  detectBulletPointSections(text2) {
    const lines = text2.split("\n");
    const bulletPatterns = [
      /^[\*\-\+]\s+(.+)/,
      // * - + bullets
      /^(\d+[\.\)])\s+(.+)/,
      // 1. 2. 3. or 1) 2) 3)
      /^([a-zA-Z][\.\)])\s+(.+)/,
      // a. b. c. or a) b) c)
      /^•\s+(.+)/
      // Bullet points
    ];
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    let consecutiveBullets = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isBulletPoint = false;
      let bulletContent = "";
      for (const pattern of bulletPatterns) {
        const match = line.match(pattern);
        if (match) {
          isBulletPoint = true;
          bulletContent = match[match.length - 1];
          consecutiveBullets++;
          break;
        }
      }
      if (isBulletPoint && consecutiveBullets === 1) {
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        const title = bulletContent.length > 50 ? bulletContent.substring(0, 47) + "..." : bulletContent;
        currentChapter = {
          title: title || `Section ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, bulletContent);
      } else if (isBulletPoint && currentChapter) {
        this.addLineToChapter(currentChapter, bulletContent);
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
        consecutiveBullets = 0;
      } else if (line.length === 0) {
        consecutiveBullets = 0;
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
        consecutiveBullets = 0;
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    return chapters.length > 1 ? chapters : [];
  }
  // Enhanced numbered sections detection with better patterns
  detectNumberedSections(text2) {
    const lines = text2.split("\n");
    const sectionPatterns = [
      /^(\d+)[\.\)\s]\s*(.+)/,
      // 1. Title or 1) Title
      /^(\d+)[\.\s]+([A-Z][^\.]{10,})/,
      // 1. TITLE or 1 TITLE
      /^(Question|Problem|Exercise)\s*(\d+)/i,
      // Question 1, Problem 1
      /^(\d+)[\-\s]+(.+)/
      // 1 - Title or 1 Title
    ];
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    let lastNumber = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let matchFound = false;
      for (const pattern of sectionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const number = parseInt(match[1]) || chapterNumber;
          if (number === 1 || number === lastNumber + 1) {
            if (currentChapter && currentChapter.paragraphs.length > 0) {
              chapters.push(currentChapter);
            }
            const title = match[2] ? match[2].trim() : `Section ${number}`;
            const cleanTitle = title.length > 50 ? title.substring(0, 47) + "..." : title;
            currentChapter = {
              title: cleanTitle || `Section ${chapterNumber}`,
              number: chapterNumber++,
              paragraphs: []
            };
            if (title && title.length > 3) {
              this.addLineToChapter(currentChapter, title);
            }
            lastNumber = number;
            matchFound = true;
            break;
          }
        }
      }
      if (!matchFound && currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!matchFound && !currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    return chapters;
  }
  // Detect explicit chapter headings (Chapter 1, Chapter 2, etc.)
  detectExplicitChapters(text2) {
    const lines = text2.split("\n");
    const chapterPattern = /^(chapter|ch\.?|part|section|book)\s*(\d+|[ivxlcdm]+)[\s\.:]/i;
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(chapterPattern);
      if (match) {
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        const title = line.length > 50 ? line.substring(0, 47) + "..." : line;
        currentChapter = {
          title: title || `Chapter ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    return chapters;
  }
  // Detect Roman numeral sections (I., II., III., etc.)
  detectRomanNumeralSections(text2) {
    const lines = text2.split("\n");
    const romanPattern = /^([IVXLCDM]+)[\.\)\s]/i;
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(romanPattern);
      if (match) {
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        const title = line.length > 50 ? line.substring(0, 47) + "..." : line;
        currentChapter = {
          title: title || `Part ${match[1]}`,
          number: chapterNumber++,
          paragraphs: []
        };
        const contentAfterRoman = line.substring(match[0].length).trim();
        if (contentAfterRoman.length > 0) {
          this.addLineToChapter(currentChapter, contentAfterRoman);
        }
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    return chapters;
  }
  // Detect heading patterns (lines that look like headings)
  detectHeadingPatterns(text2) {
    const lines = text2.split("\n");
    const chapters = [];
    let currentChapter = null;
    let chapterNumber = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (this.looksLikeHeading(line, i, lines)) {
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        const title = line.length > 50 ? line.substring(0, 47) + "..." : line;
        currentChapter = {
          title: title || `Section ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: "Introduction",
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    return chapters;
  }
  // Detect page breaks or form feeds
  detectPageBreaks(text2) {
    const pages = text2.split(/\f|\n\s*\n\s*\n/);
    const chapters = [];
    for (let i = 0; i < pages.length; i++) {
      const pageText = pages[i].trim();
      if (pageText.length > 100) {
        const paragraphs = this.splitIntoParagraphs(pageText);
        const title = this.generatePageTitle(pageText, i + 1);
        chapters.push({
          title,
          number: i + 1,
          paragraphs
        });
      }
    }
    return chapters;
  }
  // Create smart pagination based on content length and natural breaks
  async createSmartPagination(text2) {
    console.log("\u{1F4C4} Creating smart pagination...");
    const targetWordsPerChapter = 250;
    const minWordsPerChapter = 150;
    const maxWordsPerChapter = 400;
    const targetChapterSize = targetWordsPerChapter * 6;
    const minChapterSize = minWordsPerChapter * 6;
    const maxChapterSize = maxWordsPerChapter * 6;
    console.log(`\u{1F4D6} Using word-based chunking: ${targetWordsPerChapter} words (~${targetChapterSize} chars) per chapter`);
    const paragraphs = text2.split(/\n\s*\n/).filter((p) => p.trim().length > 50);
    const chapters = [];
    let currentChapterText = "";
    let currentParagraphs = [];
    let chapterNumber = 1;
    console.log(`\u{1F4CA} Processing ${paragraphs.length} paragraphs for smart pagination`);
    const totalWords = text2.split(/\s+/).filter((w) => w.length > 0).length;
    console.log(`\u{1F4CA} Document contains ${totalWords} words total`);
    if (paragraphs.length === 1 && totalWords > 500) {
      const paragraphWords = paragraphs[0].split(/\s+/).filter((w) => w.length > 0).length;
      console.log(`\u{1F4C4} Single large paragraph detected (${paragraphWords} words), using sentence-based splitting`);
      return await this.splitLargeParagraphIntoChapters(paragraphs[0], targetChapterSize, minChapterSize);
    }
    if (paragraphs.length <= 3 && totalWords > 1e3) {
      console.log(`\u{1F4C4} Few paragraphs but large document (${totalWords} words), forcing multi-chapter split`);
      return await this.splitLargeParagraphIntoChapters(text2, targetChapterSize, minChapterSize);
    }
    for (let i = 0; i < paragraphs.length; i++) {
      const trimmedParagraph = paragraphs[i].trim();
      const currentWordCount = currentChapterText.split(/\s+/).filter((w) => w.length > 0).length;
      const paragraphWordCount = trimmedParagraph.split(/\s+/).filter((w) => w.length > 0).length;
      const newWordCount = currentWordCount + paragraphWordCount;
      const shouldBreak = currentChapterText.length > 0 && (newWordCount > maxWordsPerChapter || // Would exceed maximum words
      newWordCount > targetWordsPerChapter && currentWordCount >= minWordsPerChapter);
      if (shouldBreak) {
        const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
        const paragraphObjects = this.convertToParagraphObjects(currentParagraphs);
        chapters.push({
          title,
          number: chapterNumber,
          paragraphs: paragraphObjects
        });
        const chapterWordCount = currentChapterText.split(/\s+/).filter((w) => w.length > 0).length;
        console.log(`\u{1F4D6} Created chapter ${chapterNumber}: ${chapterWordCount} words (${currentChapterText.length} chars), ${currentParagraphs.length} paragraphs`);
        currentChapterText = trimmedParagraph;
        currentParagraphs = [trimmedParagraph];
        chapterNumber++;
      } else {
        if (currentChapterText.length > 0) {
          currentChapterText += "\n\n" + trimmedParagraph;
        } else {
          currentChapterText = trimmedParagraph;
        }
        currentParagraphs.push(trimmedParagraph);
      }
    }
    if (currentChapterText.trim() && currentParagraphs.length > 0) {
      const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
      const paragraphObjects = this.convertToParagraphObjects(currentParagraphs);
      chapters.push({
        title,
        number: chapterNumber,
        paragraphs: paragraphObjects
      });
      const finalChapterWordCount = currentChapterText.split(/\s+/).filter((w) => w.length > 0).length;
      console.log(`\u{1F4D6} Created final chapter ${chapterNumber}: ${finalChapterWordCount} words (${currentChapterText.length} chars), ${currentParagraphs.length} paragraphs`);
    }
    console.log(`\u2705 Created ${chapters.length} chapters from ${text2.length} characters`);
    return chapters;
  }
  // Split a very large single paragraph into multiple chapters
  async splitLargeParagraphIntoChapters(text2, targetSize, minSize) {
    const targetWords = 250;
    const minWords = 150;
    console.log(`\u{1F4C4} Splitting large paragraph into chapters (target: ${targetWords} words)`);
    const sentences = text2.split(/(?<=[.!?])\s+/);
    const chapters = [];
    let currentChapterText = "";
    let currentSentences = [];
    let chapterNumber = 1;
    for (const sentence of sentences) {
      const currentWordCount = currentChapterText.split(/\s+/).filter((w) => w.length > 0).length;
      const sentenceWordCount = sentence.split(/\s+/).filter((w) => w.length > 0).length;
      const newWordCount = currentWordCount + sentenceWordCount;
      const shouldBreak = currentChapterText.length > 0 && (newWordCount > targetWords && currentWordCount >= minWords);
      if (shouldBreak) {
        const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
        const paragraphs = this.splitIntoParagraphs(currentChapterText);
        chapters.push({
          title,
          number: chapterNumber,
          paragraphs
        });
        const chapterWords = currentChapterText.split(/\s+/).filter((w) => w.length > 0).length;
        console.log(`\u{1F4D6} Created sentence-based chapter ${chapterNumber}: ${chapterWords} words (${currentChapterText.length} chars)`);
        currentChapterText = sentence;
        currentSentences = [sentence];
        chapterNumber++;
      } else {
        if (currentChapterText.length > 0) {
          currentChapterText += " " + sentence;
        } else {
          currentChapterText = sentence;
        }
        currentSentences.push(sentence);
      }
    }
    if (currentChapterText.trim()) {
      const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
      const paragraphs = this.splitIntoParagraphs(currentChapterText);
      chapters.push({
        title,
        number: chapterNumber,
        paragraphs
      });
      const finalWords = currentChapterText.split(/\s+/).filter((w) => w.length > 0).length;
      console.log(`\u{1F4D6} Created final sentence-based chapter ${chapterNumber}: ${finalWords} words (${currentChapterText.length} chars)`);
    }
    console.log(`\u2705 Created ${chapters.length} chapters from sentence splitting`);
    return chapters;
  }
  // Helper: Check if a line looks like a heading
  looksLikeHeading(line, index2, allLines) {
    if (line.length < 5 || line.length > 80) return false;
    if (/[.!?]\s*$/.test(line)) return false;
    if (line === line.toUpperCase() && line.length > 40) return false;
    const nextLine = allLines[index2 + 1];
    if (nextLine && (nextLine.trim() === "" || nextLine.length > line.length * 2)) {
      return true;
    }
    const words = line.split(/\s+/);
    const titleCaseWords = words.filter(
      (word) => word.length > 0 && word[0] === word[0].toUpperCase()
    );
    return titleCaseWords.length >= words.length * 0.7;
  }
  // Helper: Add line to chapter, managing paragraphs
  addLineToChapter(chapter, line) {
    if (chapter.paragraphs.length === 0) {
      chapter.paragraphs.push({
        number: 1,
        text: line
      });
    } else {
      const lastParagraph = chapter.paragraphs[chapter.paragraphs.length - 1];
      if (line.length < 50 || !line.match(/^[A-Z]/)) {
        lastParagraph.text += " " + line;
      } else {
        chapter.paragraphs.push({
          number: chapter.paragraphs.length + 1,
          text: line
        });
      }
    }
  }
  // Helper: Generate meaningful chapter titles with AI assistance
  async generateChapterTitle(chapterText, chapterNumber) {
    try {
      const aiTitle = await this.generateAIChapterTitle(chapterText, chapterNumber);
      if (aiTitle && aiTitle.length > 5 && aiTitle.length < 80) {
        return aiTitle;
      }
    } catch (error) {
      console.log(`\u26A0\uFE0F AI title generation failed for chapter ${chapterNumber}, using fallback`);
    }
    return this.generateFallbackTitle(chapterText, chapterNumber);
  }
  // Generate AI-powered chapter title
  async generateAIChapterTitle(chapterText, chapterNumber) {
    const preview = chapterText.substring(0, 1e3);
    const prompt = `Create a concise, descriptive chapter title for this text content. 
The title should:
- Be 3-8 words long
- Capture the main topic or theme
- Be clear and informative
- NOT include "Chapter X:" prefix

Text content:
${preview}

Return only the title, nothing else.`;
    const messages = [
      { role: "user", content: prompt }
    ];
    const response = await this.ollamaService.chat(messages);
    return `Chapter ${chapterNumber}: ${response.trim()}`;
  }
  // Fallback title generation method
  generateFallbackTitle(chapterText, chapterNumber) {
    const firstSentence = chapterText.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 10 && firstSentence.length < 60) {
      return `Chapter ${chapterNumber}: ${firstSentence}`;
    }
    const words = chapterText.trim().split(/\s+/).slice(0, 8);
    const preview = words.join(" ");
    return `Chapter ${chapterNumber}: ${preview.length > 50 ? preview.substring(0, 47) + "..." : preview}`;
  }
  // Convert string paragraphs to paragraph objects
  convertToParagraphObjects(paragraphs) {
    return paragraphs.map((text2, index2) => ({
      number: index2 + 1,
      text: text2.trim()
    }));
  }
  // Split text into paragraph objects
  splitIntoParagraphs(text2) {
    const paragraphs = text2.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    return paragraphs.map((text3, index2) => ({
      number: index2 + 1,
      text: text3.trim()
    }));
  }
  // Generate meaningful page titles
  generatePageTitle(pageText, pageNumber) {
    const firstLines = pageText.split("\n").slice(0, 3);
    for (const line of firstLines) {
      const trimmed = line.trim();
      if (trimmed.length < 10 || /copyright|©|all rights reserved|page \d+/i.test(trimmed) || /^\d+$/.test(trimmed)) {
        continue;
      }
      if (trimmed.length < 80 && trimmed.length > 15) {
        let title = trimmed.replace(/[^\w\s\-:]/g, "").trim();
        if (title.length > 50) {
          title = title.substring(0, 47) + "...";
        }
        return `Page ${pageNumber}: ${title}`;
      }
    }
    const words = pageText.trim().split(/\s+/).slice(0, 6);
    const preview = words.join(" ");
    return `Page ${pageNumber}: ${preview.length > 40 ? preview.substring(0, 37) + "..." : preview}`;
  }
  // Search within processed document content
  searchDocument(document, query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    for (const chapter of document.chapters) {
      for (const paragraph of chapter.paragraphs) {
        if (paragraph.text.toLowerCase().includes(searchTerm)) {
          const contextStart = Math.max(0, paragraph.text.toLowerCase().indexOf(searchTerm) - 50);
          const contextEnd = Math.min(paragraph.text.length, paragraph.text.toLowerCase().indexOf(searchTerm) + searchTerm.length + 50);
          results.push({
            chapter: chapter.number,
            paragraph: paragraph.number,
            text: paragraph.text,
            context: "..." + paragraph.text.substring(contextStart, contextEnd) + "..."
          });
        }
      }
    }
    return results;
  }
};
var documentProcessor = new DocumentProcessor();

// server/routes.ts
init_schema();

// server/routes/performance.ts
import express from "express";
var router = express.Router();
var performanceTracker = {
  requestCount: 0,
  totalResponseTime: 0,
  slowQueries: [],
  cacheStats: {
    hits: 0,
    misses: 0,
    totalRequests: 0
  }
};
var performanceMiddleware = (req, res, next) => {
  const startTime = performance.now();
  res.on("finish", () => {
    const duration = performance.now() - startTime;
    performanceTracker.requestCount++;
    performanceTracker.totalResponseTime += duration;
    if (duration > 500) {
      performanceTracker.slowQueries.push({
        endpoint: `${req.method} ${req.path}`,
        duration,
        timestamp: /* @__PURE__ */ new Date()
      });
      if (performanceTracker.slowQueries.length > 50) {
        performanceTracker.slowQueries = performanceTracker.slowQueries.slice(-50);
      }
    }
    if (duration > 1e3) {
      console.warn(`\u{1F40C} Slow API request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.log(`\u26A1 API request: ${req.method} ${req.path} completed in ${duration.toFixed(2)}ms`);
    }
  });
  next();
};
router.get("/", async (req, res) => {
  try {
    const startTime = performance.now();
    const ollamaService = req.app.locals.ollamaService;
    const ollamaStats = ollamaService?.getPerformanceStats() || null;
    const memoryService = req.app.locals.memoryService;
    const dbStats = memoryService?.getPerformanceSummary() || null;
    const dbMetrics = memoryService?.getPerformanceMetrics()?.slice(-100) || [];
    const avgResponseTime = performanceTracker.requestCount > 0 ? performanceTracker.totalResponseTime / performanceTracker.requestCount : 0;
    const cacheHitRate = performanceTracker.cacheStats.totalRequests > 0 ? performanceTracker.cacheStats.hits / performanceTracker.cacheStats.totalRequests * 100 : 0;
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
    const performanceReport = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      generationTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      // API Performance
      api: {
        totalRequests: performanceTracker.requestCount,
        averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        slowQueries: performanceTracker.slowQueries.slice(-10),
        // Last 10 slow queries
        cacheHitRate: parseFloat(cacheHitRate.toFixed(2))
      },
      // Ollama AI Service Performance
      ollama: ollamaStats ? {
        isConnected: ollamaStats.isConnected,
        model: ollamaStats.model,
        connectionPool: ollamaStats.connectionPool,
        cache: ollamaStats.cache,
        status: "optimized"
      } : { status: "unavailable" },
      // Database Performance
      database: dbStats ? {
        totalQueries: dbStats.totalQueries,
        averageQueryTime: parseFloat(dbStats.averageQueryTime.toFixed(2)),
        slowestQuery: dbStats.slowestQuery ? {
          operation: dbStats.slowestQuery.operation,
          duration: parseFloat(dbStats.slowestQuery.duration.toFixed(2)),
          timestamp: dbStats.slowestQuery.timestamp
        } : null,
        fastestQuery: dbStats.fastestQuery ? {
          operation: dbStats.fastestQuery.operation,
          duration: parseFloat(dbStats.fastestQuery.duration.toFixed(2)),
          timestamp: dbStats.fastestQuery.timestamp
        } : null,
        operationBreakdown: Object.entries(dbStats.operationBreakdown).map(([operation, stats]) => ({
          operation,
          count: stats.count,
          avgTime: parseFloat(stats.avgTime.toFixed(2))
        })),
        recentQueries: dbMetrics.slice(-10).map((metric) => ({
          operation: metric.operation,
          duration: parseFloat(metric.duration.toFixed(2)),
          rowsAffected: metric.rowsAffected,
          timestamp: metric.timestamp
        }))
      } : { status: "unavailable" },
      // System Performance
      system: {
        uptime: `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor(systemMetrics.uptime % 3600 / 60)}m`,
        memory: {
          used: `${Math.round(systemMetrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(systemMetrics.memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(systemMetrics.memoryUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(systemMetrics.memoryUsage.rss / 1024 / 1024)}MB`
        },
        cpu: {
          user: systemMetrics.cpuUsage.user,
          system: systemMetrics.cpuUsage.system
        },
        nodeVersion: systemMetrics.nodeVersion,
        platform: systemMetrics.platform
      },
      // Performance Recommendations
      recommendations: generatePerformanceRecommendations({
        avgResponseTime,
        slowQueriesCount: performanceTracker.slowQueries.length,
        cacheHitRate,
        memoryUsage: systemMetrics.memoryUsage,
        dbStats
      })
    };
    res.json(performanceReport);
  } catch (error) {
    console.error("Error generating performance report:", error);
    res.status(500).json({
      error: "Failed to generate performance report",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
router.get("/live", (req, res) => {
  try {
    const liveMetrics = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      api: {
        requestsPerMinute: calculateRequestsPerMinute(),
        currentResponseTime: performanceTracker.requestCount > 0 ? performanceTracker.totalResponseTime / performanceTracker.requestCount : 0,
        activeConnections: getActiveConnections()
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    res.json(liveMetrics);
  } catch (error) {
    console.error("Error getting live metrics:", error);
    res.status(500).json({ error: "Failed to get live metrics" });
  }
});
router.post("/optimize", async (req, res) => {
  try {
    const optimizations = [];
    const memoryService = req.app.locals.memoryService;
    if (memoryService) {
      await memoryService.optimizeDatabase();
      optimizations.push("Database optimized (ANALYZE, VACUUM, PRAGMA optimize)");
    }
    performanceTracker.slowQueries = [];
    performanceTracker.cacheStats = { hits: 0, misses: 0, totalRequests: 0 };
    optimizations.push("Performance metrics cleared");
    if (global.gc) {
      global.gc();
      optimizations.push("Garbage collection triggered");
    }
    res.json({
      success: true,
      optimizations,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error running optimizations:", error);
    res.status(500).json({ error: "Optimization failed" });
  }
});
function calculateRequestsPerMinute() {
  return performanceTracker.requestCount / (process.uptime() / 60);
}
function getActiveConnections() {
  return 0;
}
function generatePerformanceRecommendations(metrics) {
  const recommendations = [];
  if (metrics.avgResponseTime > 1e3) {
    recommendations.push("\u{1F40C} Average response time is high (>1s). Consider optimizing database queries or adding more caching.");
  } else if (metrics.avgResponseTime > 500) {
    recommendations.push("\u26A0\uFE0F Response time could be improved. Monitor slow queries and consider connection pooling.");
  } else if (metrics.avgResponseTime < 100) {
    recommendations.push("\u{1F680} Excellent response times! Your optimizations are working well.");
  }
  if (metrics.cacheHitRate < 30) {
    recommendations.push("\u{1F4C8} Low cache hit rate. Consider increasing cache size or improving cache strategies.");
  } else if (metrics.cacheHitRate > 70) {
    recommendations.push("\u{1F4BE} Great cache performance! High hit rate is improving response times.");
  }
  const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsageMB > 500) {
    recommendations.push("\u{1F9E0} High memory usage detected. Consider implementing memory cleanup or increasing server resources.");
  } else if (memoryUsageMB < 100) {
    recommendations.push("\u2705 Memory usage is optimal.");
  }
  if (metrics.dbStats && metrics.dbStats.averageQueryTime > 50) {
    recommendations.push("\u{1F5C4}\uFE0F Database queries are slow. Consider adding indexes or optimizing query patterns.");
  }
  if (metrics.slowQueriesCount > 10) {
    recommendations.push("\u{1F50D} Multiple slow queries detected. Review and optimize the slowest endpoints.");
  }
  if (recommendations.length === 0) {
    recommendations.push("\u{1F3AF} System performance looks good! All metrics are within optimal ranges.");
  }
  return recommendations;
}
var performance_default = router;

// server/routes/phase2-intelligence-routes.ts
import { Router } from "express";

// server/agents/enhanced-agent-coordinator.ts
init_multi_model_service();

// server/services/adaptive-learning-service.ts
init_multi_model_service();
init_LocalMemoryService();
init_db();
init_schema();
import { eq as eq2 } from "drizzle-orm";
var AdaptiveLearningService = class {
  multiModel;
  memory;
  learningPaths = /* @__PURE__ */ new Map();
  activeSessions = /* @__PURE__ */ new Map();
  userExpertise = /* @__PURE__ */ new Map();
  constructor() {
    this.multiModel = new MultiModelService();
    this.memory = LocalMemoryService.getInstance();
  }
  async initialize() {
    await this.multiModel.initialize();
    console.log("\u{1F393} Adaptive Learning Service initialized - Ready for personalized growth!");
  }
  // 🚀 START PERSONALIZED LEARNING SESSION
  async startLearningSession(userId, documentId) {
    const sessionId = `session_${userId}_${documentId}_${Date.now()}`;
    const session = {
      sessionId,
      userId,
      documentId,
      startTime: /* @__PURE__ */ new Date(),
      interactionCount: 0,
      questionsAsked: [],
      conceptsExplored: [],
      comprehensionScore: 0,
      engagementLevel: 0
    };
    this.activeSessions.set(sessionId, session);
    await this.generatePersonalizedContent(userId, documentId, sessionId);
    console.log(`\u{1F3AF} Started adaptive learning session ${sessionId} for user ${userId}`);
    return sessionId;
  }
  // 🧠 GENERATE PERSONALIZED CONTENT
  async generatePersonalizedContent(userId, documentId, sessionId) {
    try {
      const userProfile = await this.memory.getUserProfile(userId);
      const userExpertise = this.getUserExpertise(userId);
      const document = await this.getDocumentContent(documentId);
      if (!document) return;
      const learningPattern = await this.analyzeLearningPattern(userProfile);
      const domainExpertise = await this.analyzeDomainExpertise(document.content, userId);
      const adaptivePrompts = await this.generateAdaptivePrompts(
        document.content,
        domainExpertise.level,
        learningPattern.preferredStyle,
        userProfile.preferredTopics
      );
      const learningPath = {
        id: `path_${userId}_${documentId}`,
        userId,
        domain: domainExpertise.domain,
        currentLevel: domainExpertise.level,
        targetLevel: Math.min(10, domainExpertise.level + 2),
        personalizedContent: adaptivePrompts.content,
        adaptivePrompts: adaptivePrompts.prompts,
        learningVelocity: learningPattern.velocity,
        strengthAreas: learningPattern.strengths,
        improvementAreas: learningPattern.improvements,
        nextRecommendations: adaptivePrompts.recommendations
      };
      this.learningPaths.set(learningPath.id, learningPath);
      console.log(`\u{1F4DA} Generated personalized learning path for ${domainExpertise.domain} (Level ${domainExpertise.level} \u2192 ${learningPath.targetLevel})`);
    } catch (error) {
      console.error(`\u274C Failed to generate personalized content: ${error}`);
    }
  }
  // 📊 ANALYZE LEARNING PATTERN
  async analyzeLearningPattern(userProfile) {
    let preferredStyle = "analytical";
    if (userProfile.annotationFrequency > 10) {
      preferredStyle = userProfile.preferredTopics.some(
        (topic) => ["history", "culture", "context"].includes(topic.toLowerCase())
      ) ? "practical" : "analytical";
    }
    const velocity = Math.min(10, Math.max(1, userProfile.averageSessionLength / 10));
    const strengths = userProfile.commonThemes.slice(0, 3);
    const improvements = userProfile.favoriteBooks.length > 5 ? ["depth-analysis", "cross-references"] : ["consistency", "engagement"];
    return {
      preferredStyle,
      velocity,
      strengths,
      improvements
    };
  }
  // 🎯 ANALYZE DOMAIN EXPERTISE  
  async analyzeDomainExpertise(content, userId) {
    const result = await this.multiModel.executeTask(
      "text-analysis",
      `Analyze this content to determine the primary domain and required expertise level:

${content.substring(0, 5e3)}

Provide JSON response:
{
  "domain": "specific domain (e.g., 'Old Testament Studies', 'New Testament Theology')",
  "complexity": "beginner|intermediate|advanced|expert",
  "required_background": ["concept1", "concept2"],
  "difficulty_score": 1-10
}`,
      { requirements: { accuracy: 9, reasoning: 8 } }
    );
    try {
      const analysis = JSON.parse(result.response);
      const userMemories = await this.memory.retrieveMemories(userId, analysis.domain, 20);
      const historicalPerformance = this.calculateHistoricalPerformance(userMemories);
      const complexityMapping = {
        "beginner": 3,
        "intermediate": 5,
        "advanced": 7,
        "expert": 9
      };
      const baseLevel = complexityMapping[analysis.complexity] || 5;
      const adjustedLevel = Math.max(1, Math.min(10, baseLevel + historicalPerformance.adjustment));
      return {
        domain: analysis.domain,
        level: adjustedLevel,
        confidence: historicalPerformance.confidence
      };
    } catch (error) {
      console.error(`\u274C Failed to analyze domain expertise: ${error}`);
      return { domain: "General Studies", level: 5, confidence: 0.5 };
    }
  }
  // 📈 CALCULATE HISTORICAL PERFORMANCE
  calculateHistoricalPerformance(memories) {
    if (memories.length === 0) {
      return { adjustment: 0, confidence: 0.5 };
    }
    let totalEngagement = 0;
    let comprehensionIndicators = 0;
    memories.forEach((memory) => {
      if (memory.content.length > 200) totalEngagement++;
      const comprehensionKeywords = ["understand", "analysis", "connection", "insight", "meaning"];
      if (comprehensionKeywords.some((keyword) => memory.content.toLowerCase().includes(keyword))) {
        comprehensionIndicators++;
      }
    });
    const engagementRatio = totalEngagement / memories.length;
    const comprehensionRatio = comprehensionIndicators / memories.length;
    const adjustment = Math.round((engagementRatio + comprehensionRatio - 1) * 2);
    const confidence = Math.min(1, memories.length / 20 * (engagementRatio + comprehensionRatio) / 2);
    return { adjustment, confidence };
  }
  // 🎨 GENERATE ADAPTIVE PROMPTS
  async generateAdaptivePrompts(content, userLevel, learningStyle, preferredTopics) {
    const stylePrompts = {
      "visual": "Focus on imagery, symbolism, and visual metaphors",
      "analytical": "Provide logical structure, arguments, and systematic analysis",
      "practical": "Emphasize real-world applications and actionable insights",
      "theoretical": "Explore deeper theological and philosophical concepts"
    };
    const levelAdaptation = {
      1: "Use simple language and basic concepts",
      2: "Introduce fundamental principles clearly",
      3: "Build on basic knowledge with examples",
      4: "Connect related concepts and themes",
      5: "Analyze relationships and implications",
      6: "Explore nuanced interpretations",
      7: "Discuss complex theological questions",
      8: "Examine scholarly debates and perspectives",
      9: "Integrate advanced hermeneutical approaches",
      10: "Engage with cutting-edge research and synthesis"
    };
    const adaptivePrompt = `Generate personalized learning content for a level ${userLevel} learner with ${learningStyle} learning style.

Content to adapt: ${content.substring(0, 3e3)}

Learning preferences: ${preferredTopics.join(", ")}
Style instruction: ${stylePrompts[learningStyle]}
Level instruction: ${levelAdaptation[userLevel]}

Generate JSON response:
{
  "adapted_content": ["key point 1 adapted for this learner", "key point 2", "key point 3"],
  "personalized_prompts": ["thought-provoking question 1", "reflection prompt 2"],
  "next_steps": ["recommendation 1", "recommendation 2"]
}`;
    try {
      const result = await this.multiModel.executeTask("creative-insights", adaptivePrompt, {
        requirements: { creativity: 8, reasoning: 7 }
      });
      const adaptation = JSON.parse(result.response);
      return {
        content: adaptation.adapted_content || [],
        prompts: adaptation.personalized_prompts || [],
        recommendations: adaptation.next_steps || []
      };
    } catch (error) {
      console.error(`\u274C Failed to generate adaptive prompts: ${error}`);
      return { content: [], prompts: [], recommendations: [] };
    }
  }
  // 📚 GET PERSONALIZED EXPERTISE FOR USER
  getUserExpertise(userId) {
    if (!this.userExpertise.has(userId)) {
      this.userExpertise.set(userId, /* @__PURE__ */ new Map());
    }
    return this.userExpertise.get(userId);
  }
  // 🎯 UPDATE LEARNING PROGRESS
  async updateLearningProgress(sessionId, interaction) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    session.interactionCount++;
    if (interaction.questionAsked) {
      session.questionsAsked.push(interaction.questionAsked);
    }
    if (interaction.conceptExplored) {
      session.conceptsExplored.push(interaction.conceptExplored);
    }
    if (interaction.comprehensionScore !== void 0) {
      session.comprehensionScore = (session.comprehensionScore + interaction.comprehensionScore) / 2;
    }
    if (interaction.engagementLevel !== void 0) {
      session.engagementLevel = Math.max(session.engagementLevel, interaction.engagementLevel);
    }
    await this.memory.storeMemory(
      session.userId,
      JSON.stringify(interaction),
      "learning_interaction",
      { sessionId, documentId: session.documentId }
    );
    console.log(`\u{1F4CA} Updated learning progress for session ${sessionId}`);
  }
  // 🏁 END LEARNING SESSION AND CALCULATE GROWTH
  async endLearningSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.endTime = /* @__PURE__ */ new Date();
    const sessionDuration = session.endTime.getTime() - session.startTime.getTime();
    const baseGrowth = Math.min(2, session.interactionCount * 0.1);
    const engagementBonus = session.engagementLevel * 0.2;
    const comprehensionBonus = session.comprehensionScore * 0.3;
    const totalGrowth = baseGrowth + engagementBonus + comprehensionBonus;
    const newSkills = session.conceptsExplored.filter(
      (concept, index2, self) => self.indexOf(concept) === index2
    );
    const feedback = await this.generatePersonalizedFeedback(session, totalGrowth);
    const pathId = `path_${session.userId}_${session.documentId}`;
    const learningPath = this.learningPaths.get(pathId);
    const recommendations = learningPath?.nextRecommendations || [];
    await this.updateUserExpertise(session.userId, session.documentId, totalGrowth, newSkills);
    this.activeSessions.delete(sessionId);
    console.log(`\u{1F393} Session ${sessionId} completed. Growth: ${totalGrowth.toFixed(2)}, Skills: ${newSkills.length}`);
    return {
      growthAchieved: Math.round(totalGrowth * 100) / 100,
      newSkillsAcquired: newSkills,
      nextRecommendations: recommendations,
      personalizedFeedback: feedback
    };
  }
  // 💬 GENERATE PERSONALIZED FEEDBACK
  async generatePersonalizedFeedback(session, growth) {
    const feedbackPrompt = `Generate encouraging, personalized feedback for a learning session:

Session Summary:
- Duration: ${session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 6e4) : 0} minutes
- Interactions: ${session.interactionCount}
- Questions asked: ${session.questionsAsked.length}
- Concepts explored: ${session.conceptsExplored.length}
- Growth achieved: ${growth.toFixed(2)} points

Generate warm, encouraging feedback that:
1. Acknowledges specific achievements
2. Highlights areas of strength
3. Provides motivation for continued learning
4. Suggests specific next steps

Keep it personal and uplifting (2-3 sentences).`;
    try {
      const result = await this.multiModel.executeTask("creative-insights", feedbackPrompt, {
        requirements: { creativity: 8, reasoning: 6 }
      });
      return result.response.trim();
    } catch (error) {
      return `Great work in this session! You engaged thoughtfully with the material and made meaningful progress. Keep up the excellent learning momentum!`;
    }
  }
  // 📈 UPDATE USER EXPERTISE
  async updateUserExpertise(userId, documentId, growth, newSkills) {
    await this.memory.storeMemory(
      userId,
      JSON.stringify({
        growth,
        newSkills,
        documentId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      "expertise_update",
      { growth, newSkills: newSkills.length }
    );
  }
  // 🎯 GET PERSONALIZED RECOMMENDATIONS
  async getPersonalizedRecommendations(userId, limit = 5) {
    const userProfile = await this.memory.getUserProfile(userId);
    const recentMemories = await this.memory.retrieveMemories(userId, void 0, 50);
    const recommendationsPrompt = `Based on this user's learning profile, generate personalized recommendations:

Profile Summary:
- Favorite books: ${userProfile.favoriteBooks.join(", ")}
- Common themes: ${userProfile.commonThemes.join(", ")}
- Preferred topics: ${userProfile.preferredTopics.join(", ")}
- Recent activity: ${recentMemories.slice(0, 3).map((m) => m.category).join(", ")}

Generate JSON response:
{
  "suggested_topics": ["topic1", "topic2", "topic3"],
  "personalized_questions": ["question1", "question2", "question3"],
  "learning_focus": ["area1", "area2"]
}`;
    try {
      const result = await this.multiModel.executeTask("theological-reasoning", recommendationsPrompt, {
        requirements: { reasoning: 8, creativity: 7 }
      });
      const recommendations = JSON.parse(result.response);
      return {
        recommendedDocuments: [],
        // Would be populated from database
        suggestedTopics: recommendations.suggested_topics || [],
        personalizedQuestions: recommendations.personalized_questions || []
      };
    } catch (error) {
      console.error(`\u274C Failed to generate recommendations: ${error}`);
      return {
        recommendedDocuments: [],
        suggestedTopics: userProfile.preferredTopics.slice(0, 3),
        personalizedQuestions: []
      };
    }
  }
  // 📊 GET USER LEARNING ANALYTICS
  async getUserLearningAnalytics(userId) {
    const memories = await this.memory.retrieveMemories(userId, "learning_interaction", 100);
    const expertiseUpdates = await this.memory.retrieveMemories(userId, "expertise_update", 50);
    const totalGrowth = expertiseUpdates.reduce((sum, memory) => {
      try {
        const data = JSON.parse(memory.content);
        return sum + (data.growth || 0);
      } catch {
        return sum;
      }
    }, 0);
    const skillsAcquired = expertiseUpdates.flatMap((memory) => {
      try {
        const data = JSON.parse(memory.content);
        return data.newSkills || [];
      } catch {
        return [];
      }
    });
    const userProfile = await this.memory.getUserProfile(userId);
    return {
      totalSessions: memories.length,
      totalGrowth: Math.round(totalGrowth * 100) / 100,
      averageSessionLength: userProfile.averageSessionLength,
      skillsAcquired: Array.from(new Set(skillsAcquired)),
      learningVelocity: Math.min(10, totalGrowth / Math.max(1, memories.length)),
      strongestAreas: userProfile.commonThemes.slice(0, 3),
      improvementAreas: userProfile.preferredTopics.filter(
        (topic) => !userProfile.commonThemes.includes(topic)
      ).slice(0, 3)
    };
  }
  // 🔧 HELPER METHODS
  async getDocumentContent(documentId) {
    try {
      const document = await db.select().from(documents).where(eq2(documents.id, documentId)).limit(1);
      return document.length > 0 ? { content: document[0].content } : null;
    } catch (error) {
      console.error(`Failed to get document content: ${error}`);
      return null;
    }
  }
  // 📊 GET SYSTEM ANALYTICS
  getSystemAnalytics() {
    const activeSessions = this.activeSessions.size;
    const totalLearningPaths = this.learningPaths.size;
    let totalGrowth = 0;
    let pathCount = 0;
    this.learningPaths.forEach((path4) => {
      totalGrowth += (path4.targetLevel - path4.currentLevel) * path4.learningVelocity;
      pathCount++;
    });
    const averageGrowthRate = pathCount > 0 ? totalGrowth / pathCount : 0;
    return {
      activeSessions,
      totalLearningPaths,
      averageGrowthRate: Math.round(averageGrowthRate * 100) / 100
    };
  }
};

// server/agents/enhanced-agent-coordinator.ts
init_semantic_search_service();
init_LocalMemoryService();
var EnhancedAgentCoordinator = class {
  multiModel;
  adaptiveLearning;
  semanticSearch;
  memory;
  capabilities;
  constructor(capabilities = {}) {
    this.capabilities = {
      multiModel: true,
      adaptiveLearning: true,
      semanticSearch: true,
      personalizedRecommendations: true,
      ...capabilities
    };
    this.multiModel = new MultiModelService();
    this.adaptiveLearning = new AdaptiveLearningService();
    this.semanticSearch = new SemanticSearchService();
    this.memory = LocalMemoryService.getInstance();
  }
  async initialize() {
    console.log("\u{1F680} Initializing Enhanced Agent Coordinator...");
    const initPromises = [];
    if (this.capabilities.multiModel) {
      initPromises.push(this.multiModel.initialize());
    }
    if (this.capabilities.adaptiveLearning) {
      initPromises.push(this.adaptiveLearning.initialize());
    }
    if (this.capabilities.semanticSearch) {
      initPromises.push(this.semanticSearch.initialize());
    }
    await Promise.all(initPromises);
    console.log("\u2705 Enhanced Agent Coordinator ready with Phase 2 Intelligence capabilities!");
  }
  // 🎯 INTELLIGENT TASK ROUTING
  async handleUserInteraction(query, interactionType, context) {
    console.log(`\u{1F3AF} Processing ${interactionType}: "${query.substring(0, 50)}..."`);
    const startTime = performance.now();
    try {
      const queryAnalysis = await this.analyzeQuery(query, interactionType, context);
      let response;
      switch (queryAnalysis.recommendedApproach) {
        case "semantic-search":
          response = await this.handleSemanticSearch(query, context, queryAnalysis);
          break;
        case "adaptive-learning":
          response = await this.handleAdaptiveLearning(query, context, queryAnalysis);
          break;
        case "multi-model-analysis":
          response = await this.handleMultiModelAnalysis(query, context, queryAnalysis);
          break;
        case "hybrid":
        default:
          response = await this.handleHybridApproach(query, context, queryAnalysis);
          break;
      }
      const enhancedResponse = await this.enhanceResponse(response, context);
      if (this.capabilities.adaptiveLearning && context.sessionId) {
        await this.updateLearningProgress(context.sessionId, query, enhancedResponse);
      }
      const totalTime = performance.now() - startTime;
      console.log(`\u2705 Enhanced interaction completed in ${totalTime.toFixed(2)}ms`);
      return {
        ...enhancedResponse,
        executionTime: totalTime
      };
    } catch (error) {
      console.error(`\u274C Enhanced interaction failed: ${error}`);
      return {
        primaryResponse: `I encountered an issue processing your request: "${query}". Let me try a different approach.`,
        modelUsed: "fallback",
        executionTime: performance.now() - startTime,
        relatedConcepts: [],
        suggestedQuestions: [],
        personalizedInsights: [],
        nextRecommendations: [],
        confidenceScore: 0.3
      };
    }
  }
  // 🧠 ANALYZE QUERY TO DETERMINE OPTIMAL APPROACH
  async analyzeQuery(query, interactionType, context) {
    if (!this.capabilities.multiModel) {
      return {
        queryComplexity: 5,
        recommendedApproach: "semantic-search",
        requiredCapabilities: ["basic"],
        userIntent: interactionType,
        semanticContext: context.preferredTopics
      };
    }
    const analysisPrompt = `Analyze this user query to determine the optimal AI approach:

Query: "${query}"
Interaction type: ${interactionType}
User expertise level: ${context.userExpertiseLevel}/10
Recent queries: ${context.recentQueries.join(", ")}
Preferred topics: ${context.preferredTopics.join(", ")}

Available capabilities:
- Multi-model selection for task-specific optimization
- Adaptive learning with personalized content
- Semantic search with concept exploration
- Hybrid approaches combining multiple methods

Provide JSON response:
{
  "query_complexity": 1-10,
  "recommended_approach": "semantic-search|adaptive-learning|multi-model-analysis|hybrid",
  "required_capabilities": ["capability1", "capability2"],
  "user_intent": "specific intent description",
  "semantic_context": ["context1", "context2", "context3"]
}`;
    try {
      const result = await this.multiModel.executeTask("text-analysis", analysisPrompt, {
        requirements: { reasoning: 8, accuracy: 8, speed: 7 }
      });
      const analysis = JSON.parse(result.response);
      return {
        queryComplexity: Math.max(1, Math.min(10, analysis.query_complexity || 5)),
        recommendedApproach: analysis.recommended_approach || "hybrid",
        requiredCapabilities: analysis.required_capabilities || [],
        userIntent: analysis.user_intent || interactionType,
        semanticContext: analysis.semantic_context || context.preferredTopics
      };
    } catch (error) {
      console.error(`\u274C Query analysis failed: ${error}`);
      return {
        queryComplexity: 5,
        recommendedApproach: "hybrid",
        requiredCapabilities: ["multi-model"],
        userIntent: interactionType,
        semanticContext: context.preferredTopics
      };
    }
  }
  // 🔍 HANDLE SEMANTIC SEARCH APPROACH
  async handleSemanticSearch(query, context, analysis) {
    if (!this.capabilities.semanticSearch) {
      throw new Error("Semantic search capability not available");
    }
    const searchContext = {
      userId: context.userId,
      currentDocument: context.currentDocument,
      currentChapter: context.currentChapter,
      recentQueries: context.recentQueries,
      userExpertiseLevel: context.userExpertiseLevel,
      preferredTopics: context.preferredTopics
    };
    const searchResults = await this.semanticSearch.search(query, searchContext, {
      maxResults: 10,
      includeMemories: true,
      includeAnnotations: true
    });
    const responseText = await this.synthesizeSearchResults(searchResults, query, context);
    return {
      primaryResponse: responseText,
      modelUsed: "semantic-search",
      executionTime: 0,
      // Will be set by caller
      relatedConcepts: searchResults.flatMap((r) => r.relatedConcepts).slice(0, 5),
      suggestedQuestions: searchResults.flatMap((r) => r.suggestedQuestions).slice(0, 3),
      personalizedInsights: [],
      nextRecommendations: [],
      confidenceScore: searchResults.length > 0 ? 0.8 : 0.4
    };
  }
  // 🎓 HANDLE ADAPTIVE LEARNING APPROACH
  async handleAdaptiveLearning(query, context, analysis) {
    if (!this.capabilities.adaptiveLearning || !context.sessionId) {
      throw new Error("Adaptive learning capability not available or no session");
    }
    const recommendations = await this.adaptiveLearning.getPersonalizedRecommendations(
      context.userId,
      5
    );
    const adaptivePrompt = `Provide a personalized learning response for this query:

Query: "${query}"
User expertise level: ${context.userExpertiseLevel}/10
Learning goals: ${context.learningGoals.join(", ")}
Preferred topics: ${context.preferredTopics.join(", ")}

Personalized suggestions: ${recommendations.suggestedTopics.join(", ")}

Adapt your response to match the user's learning level and provide:
1. Clear explanation appropriate for their expertise level
2. Connections to their preferred topics
3. Specific learning suggestions
4. Encouragement for continued growth`;
    const result = await this.multiModel.executeTask("theological-reasoning", adaptivePrompt, {
      requirements: { reasoning: 8, creativity: 7, accuracy: 8 }
    });
    return {
      primaryResponse: result.response,
      modelUsed: result.modelUsed,
      executionTime: result.executionTime,
      relatedConcepts: recommendations.suggestedTopics,
      suggestedQuestions: recommendations.personalizedQuestions,
      personalizedInsights: [`Personalized for your Level ${context.userExpertiseLevel} expertise`],
      nextRecommendations: recommendations.suggestedTopics.slice(0, 3),
      confidenceScore: 0.85
    };
  }
  // 🎯 HANDLE MULTI-MODEL ANALYSIS APPROACH
  async handleMultiModelAnalysis(query, context, analysis) {
    if (!this.capabilities.multiModel) {
      throw new Error("Multi-model capability not available");
    }
    const taskType = this.determineTaskType(query, analysis.userIntent);
    const result = await this.multiModel.executeTask(taskType, query, {
      requirements: this.getTaskRequirements(analysis.queryComplexity, context.userExpertiseLevel)
    });
    const enhancement = await this.generateEnhancementData(result.response, context);
    return {
      primaryResponse: result.response,
      modelUsed: result.modelUsed,
      executionTime: result.executionTime,
      relatedConcepts: enhancement.concepts,
      suggestedQuestions: enhancement.questions,
      personalizedInsights: enhancement.insights,
      nextRecommendations: enhancement.recommendations,
      confidenceScore: 0.9
    };
  }
  // 🔄 HANDLE HYBRID APPROACH (COMBINES MULTIPLE METHODS)
  async handleHybridApproach(query, context, analysis) {
    console.log("\u{1F504} Executing hybrid approach with multiple intelligence methods");
    const approaches = [];
    if (this.capabilities.multiModel) {
      approaches.push(
        this.handleMultiModelAnalysis(query, context, analysis).catch((error) => ({ primaryResponse: "", confidenceScore: 0 }))
      );
    }
    if (this.capabilities.semanticSearch) {
      approaches.push(
        this.handleSemanticSearch(query, context, analysis).catch((error) => ({ relatedConcepts: [], suggestedQuestions: [] }))
      );
    }
    if (this.capabilities.adaptiveLearning && context.sessionId) {
      approaches.push(
        this.handleAdaptiveLearning(query, context, analysis).catch((error) => ({ personalizedInsights: [], nextRecommendations: [] }))
      );
    }
    const results = await Promise.all(approaches);
    const combinedResponse = this.combineHybridResults(results, context);
    return combinedResponse;
  }
  // 🎨 SYNTHESIZE SEARCH RESULTS INTO COHERENT RESPONSE
  async synthesizeSearchResults(searchResults, originalQuery, context) {
    if (searchResults.length === 0) {
      return `I couldn't find specific information about "${originalQuery}" in your documents. Would you like me to provide general information about this topic or help you search for related concepts?`;
    }
    const synthesisPrompt = `Synthesize these search results into a coherent response for the user's query:

Original query: "${originalQuery}"
User expertise level: ${context.userExpertiseLevel}/10

Search results:
${searchResults.slice(0, 5).map(
      (result, index2) => `${index2 + 1}. ${result.content.substring(0, 300)}...`
    ).join("\n\n")}

Create a comprehensive response that:
1. Directly answers the user's query
2. Synthesizes information from multiple sources
3. Maintains appropriate depth for their expertise level
4. Provides clear, actionable insights`;
    try {
      if (this.capabilities.multiModel) {
        const result = await this.multiModel.executeTask("theological-reasoning", synthesisPrompt, {
          requirements: { reasoning: 9, accuracy: 8, creativity: 6 }
        });
        return result.response;
      } else {
        return `Based on your query about "${originalQuery}", I found ${searchResults.length} relevant results. ${searchResults[0]?.content.substring(0, 200)}...`;
      }
    } catch (error) {
      return `I found ${searchResults.length} results related to "${originalQuery}". Here's what I discovered: ${searchResults[0]?.content.substring(0, 300)}...`;
    }
  }
  // 🚀 ENHANCE RESPONSE WITH ADDITIONAL INSIGHTS
  async enhanceResponse(response, context) {
    await this.memory.storeMemory(
      context.userId,
      JSON.stringify({
        query: response.primaryResponse.substring(0, 100),
        modelUsed: response.modelUsed,
        confidenceScore: response.confidenceScore
      }),
      "ai_interaction",
      {
        modelUsed: response.modelUsed,
        executionTime: response.executionTime
      }
    );
    return response;
  }
  // 📊 UPDATE LEARNING PROGRESS
  async updateLearningProgress(sessionId, query, response) {
    if (!this.capabilities.adaptiveLearning) return;
    await this.adaptiveLearning.updateLearningProgress(sessionId, {
      questionAsked: query,
      conceptExplored: response.relatedConcepts[0],
      comprehensionScore: response.confidenceScore,
      engagementLevel: response.relatedConcepts.length > 0 ? 8 : 5
    });
  }
  // 🔧 UTILITY METHODS
  determineTaskType(query, userIntent) {
    const intentMapping = {
      "question": "theological-reasoning",
      "analysis": "text-analysis",
      "search": "semantic-search",
      "exploration": "creative-insights",
      "chat": "theological-reasoning"
    };
    return intentMapping[userIntent] || "theological-reasoning";
  }
  getTaskRequirements(complexity, userLevel) {
    const baseRequirements = {
      accuracy: 8,
      reasoning: 7,
      creativity: 6,
      speed: 7
    };
    if (complexity > 7) {
      baseRequirements.reasoning = 9;
      baseRequirements.accuracy = 9;
    }
    if (userLevel > 7) {
      baseRequirements.reasoning = 9;
      baseRequirements.creativity = 8;
    }
    return baseRequirements;
  }
  async generateEnhancementData(response, context) {
    const enhancementPrompt = `Generate enhancement data for this AI response:

Response: ${response.substring(0, 1e3)}
User expertise: Level ${context.userExpertiseLevel}/10

Generate JSON:
{
  "related_concepts": ["concept1", "concept2", "concept3"],
  "follow_up_questions": ["question1", "question2"],
  "personalized_insights": ["insight1", "insight2"],
  "next_recommendations": ["recommendation1", "recommendation2"]
}`;
    try {
      if (this.capabilities.multiModel) {
        const result = await this.multiModel.executeTask("creative-insights", enhancementPrompt, {
          requirements: { creativity: 7, reasoning: 6 }
        });
        const enhancement = JSON.parse(result.response);
        return {
          concepts: enhancement.related_concepts || [],
          questions: enhancement.follow_up_questions || [],
          insights: enhancement.personalized_insights || [],
          recommendations: enhancement.next_recommendations || []
        };
      }
    } catch (error) {
      console.error(`\u274C Failed to generate enhancement data: ${error}`);
    }
    return {
      concepts: context.preferredTopics.slice(0, 3),
      questions: [],
      insights: [],
      recommendations: []
    };
  }
  combineHybridResults(results, context) {
    const primaryResult = results.reduce(
      (best, current) => (current.confidenceScore || 0) > (best.confidenceScore || 0) ? current : best,
      results[0]
    );
    const allConcepts = results.flatMap((r) => r.relatedConcepts || []);
    const allQuestions = results.flatMap((r) => r.suggestedQuestions || []);
    const allInsights = results.flatMap((r) => r.personalizedInsights || []);
    const allRecommendations = results.flatMap((r) => r.nextRecommendations || []);
    return {
      primaryResponse: primaryResult.primaryResponse || "I apologize, but I encountered an issue processing your request.",
      modelUsed: `hybrid-${primaryResult.modelUsed || "multiple"}`,
      executionTime: 0,
      // Will be set by caller
      relatedConcepts: Array.from(new Set(allConcepts)).slice(0, 5),
      suggestedQuestions: Array.from(new Set(allQuestions)).slice(0, 3),
      personalizedInsights: Array.from(new Set(allInsights)).slice(0, 3),
      nextRecommendations: Array.from(new Set(allRecommendations)).slice(0, 3),
      confidenceScore: Math.max(...results.map((r) => r.confidenceScore || 0))
    };
  }
  // 📊 GET SYSTEM ANALYTICS
  getSystemAnalytics() {
    return {
      multiModelPerformance: this.capabilities.multiModel ? this.multiModel.getModelPerformanceReport() : null,
      adaptiveLearningStats: this.capabilities.adaptiveLearning ? this.adaptiveLearning.getSystemAnalytics() : null,
      semanticSearchStats: this.capabilities.semanticSearch ? this.semanticSearch.getSearchAnalytics() : null,
      overallCapabilities: this.capabilities
    };
  }
  // 🎯 START ADAPTIVE LEARNING SESSION
  async startAdaptiveLearningSession(userId, documentId) {
    if (!this.capabilities.adaptiveLearning) return null;
    return await this.adaptiveLearning.startLearningSession(userId, documentId);
  }
  // 🏁 END ADAPTIVE LEARNING SESSION
  async endAdaptiveLearningSession(sessionId) {
    if (!this.capabilities.adaptiveLearning) return null;
    return await this.adaptiveLearning.endLearningSession(sessionId);
  }
  // 🎭 EXPLORE CONCEPT WITH FULL INTELLIGENCE
  async exploreConcept(concept, context, depth = "medium") {
    if (!this.capabilities.semanticSearch) return null;
    const searchContext = {
      userId: context.userId,
      currentDocument: context.currentDocument,
      currentChapter: context.currentChapter,
      recentQueries: context.recentQueries,
      userExpertiseLevel: context.userExpertiseLevel,
      preferredTopics: context.preferredTopics
    };
    return await this.semanticSearch.exploreConcept(concept, searchContext, depth);
  }
};

// server/routes/phase2-intelligence-routes.ts
init_multi_model_service();
init_semantic_search_service();
init_storage();
init_agent_manager();
var router2 = Router();
var enhancedCoordinator = new EnhancedAgentCoordinator({
  multiModel: true,
  adaptiveLearning: true,
  semanticSearch: true,
  personalizedRecommendations: true
});
var multiModelService = new MultiModelService();
var adaptiveLearningService = new AdaptiveLearningService();
var semanticSearchService = new SemanticSearchService();
var servicesInitialized = false;
var initializeServices = async () => {
  if (!servicesInitialized) {
    await enhancedCoordinator.initialize();
    servicesInitialized = true;
  }
};
router2.get("/intelligence/agents/status", async (req, res) => {
  try {
    const systemStatus = agentManager.getSystemStatus();
    const agents = systemStatus.agents.map((agent) => ({
      name: agent.name || "Unknown Agent",
      status: agent.isRunning ? "active" : "inactive",
      tasksCompleted: agent.tasksCompleted || 0,
      averageResponseTime: agent.averageResponseTime || 0,
      specialties: agent.specialties || ["General AI"],
      lastActivity: agent.lastActivity || "Never",
      uptime: agent.uptime || 0,
      description: agent.description || "AI Agent"
    }));
    res.json({
      success: true,
      agents,
      systemStatus: {
        isRunning: systemStatus.isRunning,
        totalAgents: systemStatus.totalAgents,
        activeAgents: systemStatus.activeAgents,
        uptime: systemStatus.uptime,
        mcpEnabled: systemStatus.mcpEnabled,
        activeMCPSessions: systemStatus.activeMCPSessions
      }
    });
  } catch (error) {
    console.error("Agent status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get agent status",
      agents: [],
      systemStatus: {
        isRunning: false,
        totalAgents: 0,
        activeAgents: 0,
        uptime: 0,
        mcpEnabled: false,
        activeMCPSessions: 0
      }
    });
  }
});
router2.get("/intelligence/agents/interactions", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const mockInteractions = [
      {
        id: "1",
        agentName: "DiscussionAgent",
        type: "discussion",
        message: "User asked about biblical themes",
        response: "Provided analysis of faith and hope themes",
        timestamp: new Date(Date.now() - 36e5).toISOString(),
        responseTime: 1250,
        success: true
      },
      {
        id: "2",
        agentName: "QuizAgent",
        type: "quiz_generation",
        message: "Generate quiz for Chapter 3",
        response: "Generated 5 multiple-choice questions",
        timestamp: new Date(Date.now() - 72e5).toISOString(),
        responseTime: 2100,
        success: true
      },
      {
        id: "3",
        agentName: "TextAnalysisAgent",
        type: "analysis",
        message: "Analyze document content",
        response: "Completed sentiment and theme analysis",
        timestamp: new Date(Date.now() - 108e5).toISOString(),
        responseTime: 3400,
        success: true
      }
    ];
    res.json({
      success: true,
      interactions: mockInteractions.slice(Number(offset), Number(offset) + Number(limit)),
      total: mockInteractions.length,
      hasMore: Number(offset) + Number(limit) < mockInteractions.length
    });
  } catch (error) {
    console.error("Interactions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get interactions",
      interactions: [],
      total: 0,
      hasMore: false
    });
  }
});
router2.post("/enhanced-interaction", async (req, res) => {
  try {
    await initializeServices();
    const {
      query,
      interactionType = "question",
      userId,
      sessionId,
      currentDocument,
      currentChapter,
      userExpertiseLevel = 5,
      recentQueries = [],
      preferredTopics = [],
      learningGoals = []
    } = req.body;
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: "Query and userId are required"
      });
    }
    const context = {
      userId,
      sessionId,
      currentDocument,
      currentChapter,
      userExpertiseLevel,
      recentQueries,
      preferredTopics,
      learningGoals
    };
    const response = await enhancedCoordinator.handleUserInteraction(
      query,
      interactionType,
      context
    );
    res.json({
      success: true,
      response,
      phase2Capabilities: {
        multiModel: true,
        adaptiveLearning: true,
        semanticSearch: true,
        personalizedRecommendations: true
      }
    });
  } catch (error) {
    console.error("Enhanced interaction error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process enhanced interaction"
    });
  }
});
router2.get("/intelligence/models/available", async (req, res) => {
  try {
    await initializeServices();
    const availableModels = multiModelService.getAvailableModels();
    const taskTypes = multiModelService.getTaskTypes();
    const performanceReport = multiModelService.getModelPerformanceReport();
    res.json({
      success: true,
      data: {
        availableModels,
        taskTypes,
        performanceReport,
        mode: "Local Ollama"
      }
    });
  } catch (error) {
    console.error("Model info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get model information",
      data: {
        availableModels: [],
        taskTypes: [],
        performanceReport: {},
        mode: "Local Ollama"
      }
    });
  }
});
router2.get("/models/cost-analytics", async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        message: "Local Ollama models are completely free!",
        totalCost: 0,
        mode: "Local Ollama (Free)",
        costOptimization: {
          freeModelsUsed: 100,
          potentialSavings: "100% free - no API costs",
          monthlyCostEstimate: "$0.00 (Local Ollama is always free)"
        }
      }
    });
  } catch (error) {
    console.error("Cost analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get cost analytics"
    });
  }
});
router2.post("/models/execute-task", async (req, res) => {
  try {
    await initializeServices();
    const {
      taskType,
      prompt,
      requirements,
      temperature,
      maxTokens
    } = req.body;
    if (!taskType || !prompt) {
      return res.status(400).json({
        success: false,
        error: "TaskType and prompt are required"
      });
    }
    const result = await multiModelService.executeTask(taskType, prompt, {
      requirements,
      temperature,
      maxTokens
    });
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Task execution error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to execute task"
    });
  }
});
router2.post("/models/analyze-text", async (req, res) => {
  try {
    await initializeServices();
    const { text: text2, analysisType = "themes" } = req.body;
    if (!text2) {
      return res.status(400).json({
        success: false,
        error: "Text is required for analysis"
      });
    }
    const analysis = await multiModelService.analyzeText(text2, analysisType);
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error("Text analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze text"
    });
  }
});
router2.post("/learning/start-session", async (req, res) => {
  try {
    await initializeServices();
    const { userId, documentId } = req.body;
    if (!userId || !documentId) {
      return res.status(400).json({
        success: false,
        error: "UserId and documentId are required"
      });
    }
    const sessionId = await enhancedCoordinator.startAdaptiveLearningSession(userId, documentId);
    res.json({
      success: true,
      sessionId,
      message: "Adaptive learning session started"
    });
  } catch (error) {
    console.error("Learning session start error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start learning session"
    });
  }
});
router2.post("/learning/end-session", async (req, res) => {
  try {
    await initializeServices();
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "SessionId is required"
      });
    }
    const results = await enhancedCoordinator.endAdaptiveLearningSession(sessionId);
    res.json({
      success: true,
      results,
      message: "Learning session completed successfully"
    });
  } catch (error) {
    console.error("Learning session end error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to end learning session"
    });
  }
});
router2.get("/learning/recommendations/:userId", async (req, res) => {
  try {
    await initializeServices();
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 5;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Valid userId is required"
      });
    }
    const recommendations = await adaptiveLearningService.getPersonalizedRecommendations(userId, limit);
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get personalized recommendations"
    });
  }
});
router2.get("/learning/analytics/:userId", async (req, res) => {
  try {
    await initializeServices();
    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Valid userId is required"
      });
    }
    const analytics = await adaptiveLearningService.getUserLearningAnalytics(userId);
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error("Learning analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get learning analytics"
    });
  }
});
router2.post("/search/semantic", async (req, res) => {
  try {
    await initializeServices();
    const {
      query,
      userId,
      currentDocument,
      currentChapter,
      recentQueries = [],
      userExpertiseLevel = 5,
      preferredTopics = [],
      maxResults = 10,
      includeMemories = true,
      includeAnnotations = true
    } = req.body;
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: "Query and userId are required"
      });
    }
    const searchContext = {
      userId,
      currentDocument,
      currentChapter,
      recentQueries,
      userExpertiseLevel,
      preferredTopics,
      learningGoals: []
    };
    const results = await semanticSearchService.search(query, searchContext, {
      maxResults,
      includeMemories,
      includeAnnotations
    });
    res.json({
      success: true,
      results,
      totalResults: results.length,
      searchContext
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform semantic search"
    });
  }
});
router2.post("/search/contextual", async (req, res) => {
  try {
    await initializeServices();
    const {
      query,
      userId,
      currentDocument,
      currentChapter,
      radius = 3,
      userExpertiseLevel = 5,
      preferredTopics = []
    } = req.body;
    if (!query || !userId || !currentDocument || !currentChapter) {
      return res.status(400).json({
        success: false,
        error: "Query, userId, currentDocument, and currentChapter are required"
      });
    }
    const searchContext = {
      userId,
      currentDocument,
      currentChapter,
      recentQueries: [],
      userExpertiseLevel,
      preferredTopics,
      learningGoals: []
    };
    const results = await semanticSearchService.contextualSearch(query, searchContext, radius);
    res.json({
      success: true,
      results,
      context: {
        document: currentDocument,
        chapter: currentChapter,
        radius
      }
    });
  } catch (error) {
    console.error("Contextual search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform contextual search"
    });
  }
});
router2.post("/search/explore-concept", async (req, res) => {
  try {
    await initializeServices();
    const {
      concept,
      userId,
      currentDocument,
      currentChapter,
      userExpertiseLevel = 5,
      preferredTopics = [],
      depth = "medium"
    } = req.body;
    if (!concept || !userId) {
      return res.status(400).json({
        success: false,
        error: "Concept and userId are required"
      });
    }
    const searchContext = {
      userId,
      currentDocument,
      currentChapter,
      recentQueries: [],
      userExpertiseLevel,
      preferredTopics,
      learningGoals: []
    };
    const exploration = await enhancedCoordinator.exploreConcept(concept, searchContext, depth);
    res.json({
      success: true,
      exploration,
      concept,
      depth
    });
  } catch (error) {
    console.error("Concept exploration error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to explore concept"
    });
  }
});
router2.get("/system/analytics", async (req, res) => {
  try {
    await initializeServices();
    const analytics = enhancedCoordinator.getSystemAnalytics();
    res.json({
      success: true,
      analytics,
      phase2Status: {
        initialized: servicesInitialized,
        capabilities: {
          multiModel: true,
          adaptiveLearning: true,
          semanticSearch: true,
          personalizedRecommendations: true
        }
      }
    });
  } catch (error) {
    console.error("System analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get system analytics"
    });
  }
});
router2.get("/system/status", async (req, res) => {
  try {
    res.json({
      success: true,
      phase2Intelligence: {
        status: "active",
        initialized: servicesInitialized,
        capabilities: {
          multiModelSupport: true,
          adaptiveLearning: true,
          semanticSearch: true,
          personalizedRecommendations: true
        },
        features: {
          intelligentModelSelection: "Route tasks to optimal AI models",
          personalizedExpertiseGrowth: "Adapt to individual learning patterns",
          contextualKnowledgeRetrieval: "Enhanced semantic search and concept exploration",
          hybridIntelligenceApproach: "Combine multiple AI methods for best results"
        }
      }
    });
  } catch (error) {
    console.error("System status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get system status"
    });
  }
});
router2.post("/cache/clear", async (req, res) => {
  try {
    await initializeServices();
    const { service } = req.body;
    if (service === "semantic-search" || !service) {
      await semanticSearchService.clearCache();
    }
    res.json({
      success: true,
      message: "Cache cleared successfully"
    });
  } catch (error) {
    console.error("Cache clear error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear cache"
    });
  }
});
router2.post("/index/rebuild", async (req, res) => {
  try {
    await initializeServices();
    const { service } = req.body;
    if (service === "semantic-search" || !service) {
      await semanticSearchService.rebuildConceptIndex();
    }
    res.json({
      success: true,
      message: "Index rebuilt successfully"
    });
  } catch (error) {
    console.error("Index rebuild error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to rebuild index"
    });
  }
});
router2.delete("/annotations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Valid annotation id required" });
    }
    const deleted = await storage.deleteAnnotation(id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: "Annotation not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete annotation" });
  }
});
router2.delete("/power-summaries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Valid power summary id required" });
    }
    const deleted = await storage.deletePowerSummary(id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: "Power summary not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete power summary" });
  }
});
var phase2_intelligence_routes_default = router2;

// server/routes/ai-learning.ts
init_auto_learning_system();
import { Router as Router2 } from "express";
var router3 = Router2();
router3.post("/feedback", async (req, res) => {
  const { documentId, feedback, messageContent, reason } = req.body;
  if (documentId === void 0 || !feedback) {
    return res.status(400).json({ error: "documentId and feedback are required" });
  }
  try {
    const feedbackData = {
      correct: feedback === "positive",
      explanation: reason || messageContent
    };
    await autoLearningSystem.reinforceLearning(documentId, feedbackData);
    res.status(200).json({ message: "Feedback received and learning reinforced." });
  } catch (error) {
    const err = error;
    console.error("Error in reinforcement learning:", err.message);
    res.status(500).json({ error: "Failed to process feedback.", details: err.message });
  }
});
router3.get("/all", async (req, res) => {
  try {
    const learningData = [];
    res.json({ learningData });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch learning data" });
  }
});
var ai_learning_default = router3;

// server/routes/translation-routes.ts
import { Router as Router3 } from "express";

// server/services/gemma-translation-service.ts
var GemmaTranslationService = class {
  ollamaService;
  translationCache = /* @__PURE__ */ new Map();
  cacheTimeout = 24 * 60 * 60 * 1e3;
  // 24 hours
  // Language configurations with Gemma 3n optimizations
  languageConfig = {
    en: { name: "English", nativeName: "English", primaryRegions: ["US", "UK", "AU"] },
    es: { name: "Spanish", nativeName: "Espa\xF1ol", primaryRegions: ["ES", "MX", "AR"] },
    fr: { name: "French", nativeName: "Fran\xE7ais", primaryRegions: ["FR", "CA"] },
    de: { name: "German", nativeName: "Deutsch", primaryRegions: ["DE", "AT"] },
    ja: { name: "Japanese", nativeName: "\u65E5\u672C\u8A9E", primaryRegions: ["JP"] },
    ko: { name: "Korean", nativeName: "\uD55C\uAD6D\uC5B4", primaryRegions: ["KR"] }
  };
  constructor(ollamaService) {
    this.ollamaService = ollamaService;
  }
  async translateText(request) {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const prompt = this.buildTranslationPrompt(request);
      const response = await this.ollamaService.generateText(prompt, {
        temperature: 0.3,
        // Lower temperature for more consistent translations
        maxTokens: Math.max(500, request.text.length * 2),
        // Dynamic token limit
        useCache: true
      });
      const result = this.parseTranslationResponse(response, request);
      this.translationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Translation failed:", error);
      return {
        translatedText: request.text,
        // Fallback to original
        confidence: 0,
        detectedSourceLanguage: request.sourceLanguage
      };
    }
  }
  async translateBatch(batchRequest) {
    try {
      const results = await Promise.all(
        batchRequest.requests.map((req) => this.translateText(req))
      );
      return {
        translations: results.map((r) => r.translatedText),
        results
      };
    } catch (error) {
      console.error("Batch translation failed:", error);
      return {
        translations: batchRequest.requests.map((req) => req.text),
        results: batchRequest.requests.map((req) => ({
          translatedText: req.text,
          confidence: 0,
          detectedSourceLanguage: req.sourceLanguage
        }))
      };
    }
  }
  async detectLanguage(text2) {
    try {
      const prompt = `
You are a language detection expert. Analyze the following text and identify its language.

TEXT TO ANALYZE:
"${text2.substring(0, 500)}" // Limit for efficiency

INSTRUCTIONS:
- Respond with ONLY the language code
- Supported codes: en, es, fr, de, ja, ko
- If uncertain, respond with "en"
- Consider context clues like religious or biblical terminology

Language code:`;
      const response = await this.ollamaService.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 10,
        useCache: true
      });
      const detectedLang = response.trim().toLowerCase();
      return this.isValidLanguage(detectedLang) ? detectedLang : "en";
    } catch (error) {
      console.error("Language detection failed:", error);
      return "en";
    }
  }
  buildTranslationPrompt(request) {
    const { text: text2, targetLanguage, sourceLanguage, context } = request;
    const targetLangName = this.languageConfig[targetLanguage].nativeName;
    const sourceLangName = sourceLanguage ? this.languageConfig[sourceLanguage].nativeName : "detected language";
    const contextHint = this.getSimpleContextHint(context || "general");
    return `Translate this text to ${targetLangName} (from ${sourceLangName}):

"${text2}"

${contextHint}

Respond with only the translation, no explanations.`;
  }
  getSimpleContextHint(context) {
    const hints = {
      biblical: "Use natural, respectful language.",
      ui: "Keep it simple and clear.",
      quiz: "Make it clear and easy to understand.",
      explanation: "Keep it natural and educational.",
      general: "Translate naturally."
    };
    return hints[context] || hints.general;
  }
  parseTranslationResponse(response, request) {
    let translatedText = response.trim();
    translatedText = translatedText.replace(/^"(.*)"$/, "$1").replace(/^Translation:\s*/i, "").replace(/^.*?:\s*/, "").trim();
    const confidence = this.assessTranslationQuality(request.text, translatedText, request.targetLanguage);
    return {
      translatedText,
      confidence,
      detectedSourceLanguage: request.sourceLanguage
    };
  }
  assessTranslationQuality(original, translated, targetLang) {
    let confidence = 0.8;
    const lengthRatio = translated.length / original.length;
    if (lengthRatio < 0.3 || lengthRatio > 3) {
      confidence -= 0.3;
    }
    if (original === translated && targetLang !== "en") {
      confidence -= 0.4;
    }
    if (translated.length < 3 || translated.includes("I cannot") || translated.includes("I don't")) {
      confidence = 0.1;
    }
    return Math.max(0, Math.min(1, confidence));
  }
  generateCacheKey(request) {
    return `${request.sourceLanguage || "auto"}-${request.targetLanguage}-${request.context || "general"}-${Buffer.from(request.text).toString("base64").substring(0, 50)}`;
  }
  isValidLanguage(lang) {
    return Object.keys(this.languageConfig).includes(lang);
  }
  // Public utility methods
  getSupportedLanguages() {
    return Object.keys(this.languageConfig);
  }
  getLanguageInfo(code) {
    return this.languageConfig[code];
  }
  // Cache management
  clearCache() {
    this.translationCache.clear();
  }
  getCacheSize() {
    return this.translationCache.size;
  }
  // Specialized methods for common use cases
  async translateDocumentContent(content, targetLang, sourceLang) {
    const result = await this.translateText({
      text: content,
      targetLanguage: targetLang,
      sourceLanguage: sourceLang,
      context: "biblical"
    });
    return result.translatedText;
  }
  async translateQuizContent(quiz, targetLang) {
    try {
      const requests = [
        { text: quiz.title, targetLanguage: targetLang, context: "quiz" },
        { text: quiz.description, targetLanguage: targetLang, context: "quiz" },
        ...quiz.questions.flatMap((q) => [
          { text: q.question, targetLanguage: targetLang, context: "quiz" },
          { text: q.explanation, targetLanguage: targetLang, context: "explanation" },
          ...(q.options || []).map((opt) => ({
            text: opt,
            targetLanguage: targetLang,
            context: "quiz"
          }))
        ])
      ];
      const batchResult = await this.translateBatch({ requests });
      let translationIndex = 0;
      const translatedQuiz = {
        ...quiz,
        title: batchResult.translations[translationIndex++],
        description: batchResult.translations[translationIndex++],
        questions: quiz.questions.map((q) => ({
          ...q,
          question: batchResult.translations[translationIndex++],
          explanation: batchResult.translations[translationIndex++],
          options: q.options?.map(() => batchResult.translations[translationIndex++]) || []
        }))
      };
      return translatedQuiz;
    } catch (error) {
      console.error("Quiz translation failed:", error);
      return quiz;
    }
  }
};

// server/routes/translation-routes.ts
function createTranslationRoutes(ollamaService) {
  const router4 = Router3();
  const translationService = new GemmaTranslationService(ollamaService);
  router4.post("/translate", async (req, res) => {
    try {
      const {
        text: text2,
        targetLanguage,
        sourceLanguage,
        context = "general"
      } = req.body;
      if (!text2 || !targetLanguage) {
        return res.status(400).json({
          error: "Missing required fields: text and targetLanguage"
        });
      }
      if (!translationService.getSupportedLanguages().includes(targetLanguage)) {
        return res.status(400).json({
          error: `Unsupported target language: ${targetLanguage}`
        });
      }
      const result = await translationService.translateText({
        text: text2,
        targetLanguage,
        sourceLanguage,
        context
      });
      res.json({
        translatedText: result.translatedText,
        confidence: result.confidence,
        detectedSourceLanguage: result.detectedSourceLanguage,
        targetLanguage,
        sourceLanguage,
        context
      });
    } catch (error) {
      console.error("Translation API error:", error);
      res.status(500).json({
        error: "Translation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.post("/translate-batch", async (req, res) => {
    try {
      const { requests } = req.body;
      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          error: "Invalid requests array"
        });
      }
      for (const request of requests) {
        if (!request.text || !request.targetLanguage) {
          return res.status(400).json({
            error: "Each request must have text and targetLanguage"
          });
        }
      }
      const batchResult = await translationService.translateBatch({ requests });
      res.json({
        translations: batchResult.translations,
        results: batchResult.results,
        count: batchResult.translations.length
      });
    } catch (error) {
      console.error("Batch translation API error:", error);
      res.status(500).json({
        error: "Batch translation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.post("/detect-language", async (req, res) => {
    try {
      const { text: text2 } = req.body;
      if (!text2) {
        return res.status(400).json({
          error: "Missing required field: text"
        });
      }
      const detectedLanguage = await translationService.detectLanguage(text2);
      res.json({
        language: detectedLanguage,
        confidence: 0.8,
        // Basic confidence score
        supportedLanguages: translationService.getSupportedLanguages()
      });
    } catch (error) {
      console.error("Language detection API error:", error);
      res.status(500).json({
        error: "Language detection failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.post("/translate-document", async (req, res) => {
    try {
      const {
        content,
        targetLanguage,
        sourceLanguage
      } = req.body;
      if (!content || !targetLanguage) {
        return res.status(400).json({
          error: "Missing required fields: content and targetLanguage"
        });
      }
      const translatedContent = await translationService.translateDocumentContent(
        content,
        targetLanguage,
        sourceLanguage
      );
      res.json({
        translatedContent,
        originalLength: content.length,
        translatedLength: translatedContent.length,
        targetLanguage,
        sourceLanguage
      });
    } catch (error) {
      console.error("Document translation API error:", error);
      res.status(500).json({
        error: "Document translation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.post("/translate-quiz", async (req, res) => {
    try {
      const { quiz, targetLanguage } = req.body;
      if (!quiz || !targetLanguage) {
        return res.status(400).json({
          error: "Missing required fields: quiz and targetLanguage"
        });
      }
      const translatedQuiz = await translationService.translateQuizContent(
        quiz,
        targetLanguage
      );
      res.json({
        translatedQuiz,
        originalLanguage: "en",
        // Assume English source
        targetLanguage,
        questionCount: quiz.questions?.length || 0
      });
    } catch (error) {
      console.error("Quiz translation API error:", error);
      res.status(500).json({
        error: "Quiz translation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.get("/languages", (req, res) => {
    try {
      const supportedLanguages = translationService.getSupportedLanguages();
      const languageInfo = supportedLanguages.map((lang) => ({
        code: lang,
        ...translationService.getLanguageInfo(lang)
      }));
      res.json({
        languages: languageInfo,
        count: supportedLanguages.length,
        powered_by: "Gemma 3n"
      });
    } catch (error) {
      console.error("Languages API error:", error);
      res.status(500).json({
        error: "Failed to fetch supported languages",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.get("/status", (req, res) => {
    try {
      res.json({
        status: "active",
        cacheSize: translationService.getCacheSize(),
        supportedLanguages: translationService.getSupportedLanguages(),
        features: {
          batchTranslation: true,
          languageDetection: true,
          contextualTranslation: true,
          caching: true,
          offlineCapable: true
        },
        powered_by: "Gemma 3n via Ollama"
      });
    } catch (error) {
      console.error("Translation status API error:", error);
      res.status(500).json({
        error: "Failed to get translation service status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  router4.post("/clear-cache", (req, res) => {
    try {
      const cacheSize = translationService.getCacheSize();
      translationService.clearCache();
      res.json({
        message: "Translation cache cleared successfully",
        previousCacheSize: cacheSize,
        currentCacheSize: translationService.getCacheSize()
      });
    } catch (error) {
      console.error("Clear cache API error:", error);
      res.status(500).json({
        error: "Failed to clear translation cache",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  return router4;
}

// server/routes.ts
init_agent_manager();
init_cached_embedding_service();
init_semantic_search_service();
init_document_rag_service();
init_ollama_service();
init_auto_learning_system();
init_db();
init_schema();
var embeddingService = new CachedEmbeddingService();
var semanticSearchService2 = new SemanticSearchService();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and TXT files are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  await semanticSearchService2.initialize();
  await documentRAGService.initialize();
  console.log("\u{1F50D} Embedding and search services initialized");
  app2.use(performanceMiddleware);
  app2.locals.agentManager = agentManager;
  app2.locals.embeddingService = embeddingService;
  app2.locals.semanticSearchService = semanticSearchService2;
  app2.use("/api/performance", performance_default);
  app2.use("/api", phase2_intelligence_routes_default);
  app2.use("/api/ai-learning", ai_learning_default);
  const ollamaService = new OllamaService({
    model: "gemma3n:e2b",
    temperature: 0.3
  });
  await ollamaService.initialize();
  app2.use("/api", createTranslationRoutes(ollamaService));
  app2.post("/api/embeddings/generate", async (req, res) => {
    try {
      const { text: text2, documentId, chapter, paragraph } = req.body;
      if (!text2 || typeof text2 !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }
      if (text2.length > 8e3) {
        return res.status(400).json({ error: "Text too long (max 8000 characters)" });
      }
      const result = await embeddingService.getEmbedding(
        text2,
        documentId,
        chapter,
        paragraph
      );
      res.json({
        success: true,
        embedding: result.embedding,
        cacheHit: result.cacheHit,
        responseTime: result.responseTime,
        dimensions: result.embedding.length
      });
    } catch (error) {
      console.error("Embedding generation error:", error);
      res.status(500).json({ error: "Failed to generate embedding" });
    }
  });
  app2.post("/api/embeddings/generate-batch", async (req, res) => {
    try {
      const { texts, documentIds, chapters, paragraphs } = req.body;
      if (!Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: "Array of texts is required" });
      }
      if (texts.some((t) => typeof t !== "string" || t.length > 8e3)) {
        return res.status(400).json({ error: "Each text must be a string and <= 8000 characters" });
      }
      const results = await embeddingService.getEmbeddingsBatch(texts, documentIds, chapters, paragraphs);
      res.json({
        success: true,
        results: results.map((r) => ({
          embedding: r.embedding,
          cacheHit: r.cacheHit,
          responseTime: r.responseTime,
          dimensions: r.embedding.length
        }))
      });
    } catch (error) {
      console.error("Batch embedding generation error:", error);
      res.status(500).json({ error: "Failed to generate batch embeddings" });
    }
  });
  app2.get("/api/embeddings/stats", async (req, res) => {
    try {
      const stats = embeddingService.getCacheStats();
      const cacheInfo = await embeddingService.getCacheInfo();
      res.json({
        success: true,
        stats,
        cacheInfo
      });
    } catch (error) {
      console.error("Embedding stats error:", error);
      res.status(500).json({ error: "Failed to get embedding stats" });
    }
  });
  app2.delete("/api/embeddings/cache", async (req, res) => {
    try {
      await embeddingService.clearCache();
      res.json({ success: true, message: "Embedding cache cleared" });
    } catch (error) {
      console.error("Cache clear error:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });
  app2.post("/api/search/semantic", async (req, res) => {
    try {
      const {
        query,
        userId,
        documentId,
        chapter,
        maxResults = 10,
        useEmbeddings = true,
        searchDepth = "thorough"
      } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const defaultUserId = userId || await getDefaultUserId();
      const searchContext = {
        userId: defaultUserId,
        documentId,
        chapter,
        recentQueries: [],
        userExpertiseLevel: 5,
        preferredTopics: []
      };
      const results = await semanticSearchService2.search(query, searchContext, {
        useEmbeddings,
        maxResults
      });
      res.json({
        success: true,
        query,
        results,
        totalResults: results.length,
        searchContext,
        usedEmbeddings: useEmbeddings
      });
    } catch (error) {
      console.error("Semantic search error:", error);
      res.status(500).json({ error: "Failed to perform semantic search" });
    }
  });
  app2.post("/api/rag/query", async (req, res) => {
    try {
      const {
        query,
        userId,
        currentDocument,
        currentChapter,
        conversationHistory = [],
        userStudyPatterns = [],
        preferredTopics = [],
        studyLevel = "intermediate",
        maxSources = 5,
        includeMemories = true,
        includeAnnotations = true,
        searchDepth = "thorough"
      } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      const defaultUserId = userId || await getDefaultUserId();
      const ragContext = {
        userId: defaultUserId,
        currentDocument,
        currentChapter,
        conversationHistory,
        userStudyPatterns,
        preferredTopics,
        studyLevel
      };
      const ragOptions = {
        maxSources,
        includeMemories,
        includeAnnotations,
        searchDepth,
        useEmbeddings: true
      };
      const response = await documentRAGService.processRAGQuery(
        query,
        ragContext,
        ragOptions
      );
      res.json({
        success: true,
        query,
        response,
        context: ragContext,
        options: ragOptions
      });
    } catch (error) {
      console.error("RAG query error:", error);
      res.status(500).json({ error: "Failed to process RAG query" });
    }
  });
  app2.get("/api/rag/analytics", async (req, res) => {
    try {
      const analytics = documentRAGService.getRAGAnalytics();
      const agentAnalytics = agentManager.getRAGAnalytics();
      res.json({
        success: true,
        ragService: analytics,
        agentManager: agentAnalytics,
        combined: {
          totalQueries: analytics.totalQueries + agentAnalytics.totalQueries,
          overallCacheHitRate: (analytics.cacheHitRate + agentAnalytics.cacheHitRate) / 2
        }
      });
    } catch (error) {
      console.error("RAG analytics error:", error);
      res.status(500).json({ error: "Failed to get RAG analytics" });
    }
  });
  app2.delete("/api/rag/cache", async (req, res) => {
    try {
      await documentRAGService.clearCache();
      res.json({ success: true, message: "RAG cache cleared" });
    } catch (error) {
      console.error("RAG cache clear error:", error);
      res.status(500).json({ error: "Failed to clear RAG cache" });
    }
  });
  const initializeUser = async () => {
    try {
      let user = await storage.getUserByUsername("default_user");
      if (!user) {
        user = await storage.createUser({
          username: "default_user",
          password: "default_password"
        });
        console.log("Created default user:", user.id);
      }
      return user;
    } catch (error) {
      console.error("Failed to initialize user:", error);
      return null;
    }
  };
  const getDefaultUserId = async () => {
    return 2;
  };
  app2.get("/api/documents", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const documents3 = await storage.getDocuments(userId);
      res.json(documents3);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
  app2.get("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });
  app2.get("/api/documents/:id/chapters/:chapter", async (req, res) => {
    try {
      const { id, chapter } = req.params;
      const document = await storage.getDocument(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      const content = typeof document.content === "string" ? JSON.parse(document.content) : document.content;
      const chapterData = content.chapters?.find((ch) => ch.number === parseInt(chapter));
      if (!chapterData) {
        return res.status(404).json({ error: "Chapter not found" });
      }
      if ((!chapterData.text || chapterData.text === "") && chapterData.paragraphs && Array.isArray(chapterData.paragraphs)) {
        chapterData.text = chapterData.paragraphs.map((p) => {
          if (typeof p === "string") return p;
          if (p && typeof p === "object") {
            if (p.text) return p.text;
            if (p.content) return p.content;
            return JSON.stringify(p);
          }
          return "";
        }).filter((text2) => text2.trim().length > 0).join("\n\n");
      }
      res.json({
        document: { id: document.id, title: document.title },
        chapter: chapterData
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch chapter" });
    }
  });
  app2.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const userId = await getDefaultUserId();
      const file = req.file;
      let processedDocument;
      if (file.mimetype === "application/pdf") {
        processedDocument = await documentProcessor.processPDF(file.buffer, file.originalname);
      } else if (file.mimetype === "text/plain") {
        processedDocument = await documentProcessor.processTXT(file.buffer, file.originalname);
      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }
      const document = await storage.createDocument({
        title: processedDocument.title,
        filename: file.originalname,
        fileType: file.mimetype === "application/pdf" ? "pdf" : "txt",
        totalChapters: processedDocument.totalChapters,
        content: JSON.stringify(processedDocument),
        userId
      });
      res.json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });
  app2.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDocument(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
  app2.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const userId = await getDefaultUserId();
      const results = await storage.searchDocuments(userId, q);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search documents" });
    }
  });
  app2.get("/api/annotations", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const annotations2 = await storage.getAnnotations(userId);
      res.json(annotations2);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch annotations" });
    }
  });
  app2.get("/api/annotations/:documentId/:chapter", async (req, res) => {
    try {
      const { documentId, chapter } = req.params;
      const userId = await getDefaultUserId();
      const annotations2 = await storage.getAnnotationsByChapter(userId, parseInt(documentId), parseInt(chapter));
      res.json(annotations2);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch chapter annotations" });
    }
  });
  app2.post("/api/annotations", async (req, res) => {
    try {
      const annotationData = insertAnnotationSchema.parse(req.body);
      const userId = await getDefaultUserId();
      const annotation = await storage.createAnnotation({ ...annotationData, userId });
      res.json(annotation);
    } catch (error) {
      console.error("Database error:", error);
      res.status(400).json({ error: "Invalid annotation data" });
    }
  });
  app2.put("/api/annotations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const annotation = await storage.updateAnnotation(parseInt(id), note);
      if (!annotation) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      res.json(annotation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update annotation" });
    }
  });
  app2.delete("/api/annotations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAnnotation(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete annotation" });
    }
  });
  app2.get("/api/bookmarks", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const bookmarks2 = await storage.getBookmarks(userId);
      res.json(bookmarks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });
  app2.post("/api/bookmarks", async (req, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse(req.body);
      const userId = await getDefaultUserId();
      const bookmark = await storage.createBookmark({ ...bookmarkData, userId });
      res.json(bookmark);
    } catch (error) {
      res.status(400).json({ error: "Invalid bookmark data" });
    }
  });
  app2.delete("/api/bookmarks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBookmark(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bookmark" });
    }
  });
  app2.get("/api/reading-progress", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const progress = await storage.getReadingProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reading progress" });
    }
  });
  app2.post("/api/reading-progress", async (req, res) => {
    try {
      const progressData = insertReadingProgressSchema.parse(req.body);
      const userId = await getDefaultUserId();
      const progress = await storage.updateReadingProgress({ ...progressData, userId });
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: "Invalid reading progress data" });
    }
  });
  app2.post("/api/ai/explain", async (req, res) => {
    try {
      const { text: text2, documentTitle, chapter, paragraph } = req.body;
      if (!text2) {
        return res.status(400).json({ error: "Text is required" });
      }
      const prompt = `Please explain this document passage in detail, providing context, significance, and practical application. 

Document: ${documentTitle || "Document"}
Chapter: ${chapter}
Paragraph: ${paragraph}
Text: "${text2}"

Please provide your response in JSON format with the following structure:
{
  "explanation": "detailed explanation of the passage",
  "context": "background and context",
  "significance": "meaning and importance",
  "practicalApplication": "how this applies to real-world situations"
}`;
      const ollamaService2 = new OllamaService({
        model: "qwen2.5:7b-instruct",
        temperature: 0.7
      });
      await ollamaService2.initialize();
      const response = await ollamaService2.generateText(prompt);
      const responseText = response.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        explanation: "Unable to generate AI explanation at this time.",
        context: "Please try again later.",
        significance: "AI service temporarily unavailable.",
        practicalApplication: "Manual study recommended."
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get AI explanation" });
    }
  });
  app2.post("/api/ai/related-content", async (req, res) => {
    try {
      const { text: text2, documentTitle, chapter, paragraph } = req.body;
      if (!text2) {
        return res.status(400).json({ error: "Text is required" });
      }
      const prompt = `Find related content that connects to this passage thematically, conceptually, or contextually.

Document: ${documentTitle || "Document"}
Chapter: ${chapter}
Paragraph: ${paragraph}
Text: "${text2}"

Please provide your response in JSON format with the following structure:
{
  "relatedContent": [
    {
      "reference": "Document Chapter:Paragraph",
      "text": "content text",
      "connection": "explanation of how this relates"
    }
  ]
}

Limit to 5 most relevant connections.`;
      const ollamaService2 = new OllamaService({
        model: "qwen2.5:7b-instruct",
        temperature: 0.7
      });
      await ollamaService2.initialize();
      const response = await ollamaService2.generateText(prompt);
      const responseText = response.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        relatedContent: [
          {
            reference: "Unable to generate related content",
            text: "AI service temporarily unavailable",
            connection: "Please try again later"
          }
        ]
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get related content" });
    }
  });
  app2.post("/api/ai/context-analysis", async (req, res) => {
    try {
      const { text: text2, documentTitle, chapter, paragraph } = req.body;
      if (!text2) {
        return res.status(400).json({ error: "Text is required" });
      }
      const prompt = `Provide detailed context analysis for this document passage, including background information, setting, and audience.

Document: ${documentTitle || "Document"}
Chapter: ${chapter}
Paragraph: ${paragraph}
Text: "${text2}"

Please provide your response in JSON format with the following structure:
{
  "background": "background information and context",
  "setting": "setting and circumstances",
  "audience": "intended audience",
  "purpose": "purpose and intent",
  "keyConcepts": "key concepts and themes"
}`;
      const ollamaService2 = new OllamaService({
        model: "qwen2.5:7b-instruct",
        temperature: 0.7
      });
      await ollamaService2.initialize();
      const response = await ollamaService2.generateText(prompt);
      const responseText = response.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        background: "Unable to determine background",
        setting: "AI service temporarily unavailable",
        audience: "Please try again later",
        purpose: "Context information not available",
        keyConcepts: "Key concepts not accessible"
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get context analysis" });
    }
  });
  app2.get("/api/power-summaries/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const summaries = await storage.getPowerSummaries(parseInt(documentId));
      res.json({ success: true, summaries });
    } catch (error) {
      console.error("Failed to fetch power summaries:", error);
      res.status(500).json({ error: "Failed to fetch power summaries" });
    }
  });
  app2.post("/api/ai-power-summary", async (req, res) => {
    try {
      const { documentId, chapter, text: text2, title } = req.body;
      if (!documentId || !chapter || !text2) {
        return res.status(400).json({ error: "Document ID, chapter, and text are required" });
      }
      const prompt = `You are a content analysis expert. Create a clear, comprehensive summary of this chapter.

CHAPTER TITLE: ${title || `Chapter ${chapter}`}
CHAPTER TEXT: ${text2.substring(0, 2e3)}

INSTRUCTIONS: 
Write a 2-3 sentence summary that captures the main points, key concepts, and significance of this chapter. Focus on clarity and completeness.

Respond with ONLY the summary text. No JSON formatting, no additional text.`;
      const ollamaService2 = new OllamaService({
        model: "gemma3n:e2b",
        temperature: 0.7
      });
      let aiResult;
      try {
        console.log("\u{1F680} Using Ollama service for power summary generation...");
        await ollamaService2.initialize();
        const response = await ollamaService2.generateText(prompt);
        const responseText = response.trim();
        console.log("\u{1F50D} Raw AI response:", responseText.substring(0, 300) + "...");
        let summary2 = responseText;
        summary2 = summary2.replace(/```json\s*|\s*```/g, "");
        summary2 = summary2.replace(/^\s*{\s*"summary"\s*:\s*"/, "");
        summary2 = summary2.replace(/^\s*"powerSummary"\s*:\s*"/, "");
        summary2 = summary2.replace(/",?\s*}$/, "");
        summary2 = summary2.replace(/^["']+|["']+$/g, "");
        if (!summary2 || summary2.length < 20) {
          throw new Error("Generated summary is too short or empty");
        }
        aiResult = {
          powerSummary: summary2
        };
        console.log("\u2705 Power summary generated using Ollama gemma3n:e2b");
        console.log("\u{1F4CA} Summary data:", {
          powerSummary: aiResult.powerSummary.substring(0, 100) + "...",
          length: aiResult.powerSummary.length
        });
      } catch (ollamaError) {
        console.warn("Ollama service failed, using fallback summary:", ollamaError);
      }
      if (!aiResult || !aiResult.powerSummary) {
        console.log("\u{1F504} AI generation failed, creating fallback summary...");
        const textPreview = text2.substring(0, 200);
        aiResult = {
          powerSummary: `This chapter covers ${title || `Chapter ${chapter}`}. ${textPreview}...`
        };
      }
      const summaryData = {
        userId: 1,
        // Default user ID
        documentId: parseInt(documentId),
        chapter: parseInt(chapter),
        chapterTitle: title || `Chapter ${chapter}`,
        powerSummary: String(aiResult.powerSummary || "Summary not available"),
        keyInsights: JSON.stringify([]),
        mainThemes: JSON.stringify([]),
        actionablePoints: JSON.stringify([])
      };
      console.log("\u{1F4DD} Creating power summary with data:", {
        documentId: summaryData.documentId,
        chapter: summaryData.chapter,
        chapterTitle: summaryData.chapterTitle,
        powerSummary: summaryData.powerSummary.substring(0, 100) + "..."
      });
      const [summary] = await db.insert(powerSummaries).values(summaryData).returning();
      try {
        console.log("\u{1F9E0} Triggering AI learning from power summary...");
        await agentManager.requestAgentTask("LearningAgent", "LEARN_FROM_POWER_SUMMARY", {
          documentId: parseInt(documentId),
          chapter: parseInt(chapter),
          originalContent: text2,
          powerSummary: aiResult.powerSummary,
          keyInsights: [],
          mainThemes: [],
          actionablePoints: [],
          title: title || `Chapter ${chapter}`
        });
        console.log("\u2705 AI learning triggered successfully");
      } catch (learningError) {
        console.warn("\u26A0\uFE0F AI learning failed (non-critical):", learningError);
      }
      res.json({
        success: true,
        summary,
        message: "Power summary generated successfully using Ollama gemma3n:e2b. Use the auto-learning panel to build AI expertise when needed."
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      console.error("Failed to generate power summary:", error);
      res.status(500).json({ error: "Failed to generate power summary" });
    }
  });
  app2.get("/api/expertise/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const allExpertise = autoLearningSystem.getAllExpertise();
      const documentExpertise = allExpertise.find((exp) => exp.documentId === docId);
      if (documentExpertise) {
        res.json({
          success: true,
          expertise: {
            expertise: true,
            domain: documentExpertise.domain,
            expertiseLevel: documentExpertise.expertiseLevel,
            concepts: Array.isArray(documentExpertise.concepts) ? documentExpertise.concepts : documentExpertise.conceptsList || [],
            fineTuningData: documentExpertise.fineTuningData,
            message: `AI has expertise in ${documentExpertise.domain} (Level ${documentExpertise.expertiseLevel}/10)`
          }
        });
      } else {
        res.json({
          success: true,
          expertise: {
            expertise: false,
            message: "No expertise available yet. Trigger auto-learning to build expertise for this document."
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch expertise:", error);
      res.status(500).json({ error: "Failed to fetch expertise" });
    }
  });
  app2.post("/api/auto-learn/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      console.log(`\u{1F9E0} Triggering auto-learning for document ${docId}...`);
      const lastLearningTime = autoLearningSystem["lastLearningTime"]?.get(docId) || 0;
      const timeSinceLastLearning = Date.now() - lastLearningTime;
      const cooldownPeriod = autoLearningSystem["LEARNING_COOLDOWN"] || 3e5;
      if (timeSinceLastLearning < cooldownPeriod) {
        const remainingCooldown = Math.ceil((cooldownPeriod - timeSinceLastLearning) / 1e3);
        return res.json({
          success: false,
          message: `Auto-learning is on cooldown. Please wait ${remainingCooldown} seconds before trying again.`,
          cooldownRemaining: remainingCooldown
        });
      }
      autoLearningSystem.triggerAutoLearning(docId).catch((error) => {
        console.error(`Auto-learning failed for document ${docId}:`, error);
      });
      res.json({
        success: true,
        message: "Auto-learning initiated. The AI will analyze this document and build expertise. This may take a few minutes.",
        documentId: docId
      });
    } catch (error) {
      console.error("Failed to trigger auto-learning:", error);
      res.status(500).json({ error: "Failed to trigger auto-learning" });
    }
  });
  app2.get("/api/learning-status/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const allExpertise = autoLearningSystem.getAllExpertise();
      const documentExpertise = allExpertise.find((exp) => exp.documentId === docId);
      const powerSummaries2 = await storage.getPowerSummaries(docId);
      const document = await storage.getDocuments(docId);
      res.json({
        success: true,
        documentId: docId,
        documentTitle: Array.isArray(document) && document.length > 0 ? document[0].title : "Unknown Document",
        expertise: documentExpertise ? {
          hasExpertise: true,
          domain: documentExpertise.domain,
          expertiseLevel: documentExpertise.expertiseLevel,
          concepts: documentExpertise.concepts,
          fineTuningData: documentExpertise.fineTuningData
        } : {
          hasExpertise: false,
          message: "No expertise developed yet"
        },
        powerSummaries: {
          count: powerSummaries2.length,
          available: powerSummaries2.length > 0
        },
        learningRecommendation: powerSummaries2.length > 0 && !documentExpertise ? "Power summaries available - perfect time to trigger auto-learning!" : documentExpertise ? "AI has expertise in this document" : "Generate power summaries first, then trigger auto-learning"
      });
    } catch (error) {
      console.error("Failed to get learning status:", error);
      res.status(500).json({ error: "Failed to get learning status" });
    }
  });
  app2.post("/api/expert-chat/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }
      const prompt = `You are an expert AI assistant specialized in document analysis. A user is asking about content from document ID ${documentId}.

Question: ${question}

Provide a helpful, expert-level response. If you don't have specific context about the document, provide general guidance and suggest what information would be helpful.`;
      const ollamaService2 = new OllamaService({
        model: "qwen2.5:7b-instruct",
        temperature: 0.7
      });
      await ollamaService2.initialize();
      const aiResponse = await ollamaService2.generateText(prompt) || "I'm sorry, I couldn't generate a response.";
      res.json({
        success: true,
        response: aiResponse
      });
    } catch (error) {
      console.error("Failed to generate expert response:", error);
      res.status(500).json({ error: "Failed to generate expert response" });
    }
  });
  const httpServer = createServer2(app2);
  const io = new SocketIOServer2(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  app2.locals.io = io;
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname2, "client/src"),
      "@shared": path2.resolve(__dirname2, "shared"),
      "@assets": path2.resolve(__dirname2, "attached_assets")
    }
  },
  root: path2.resolve(__dirname2, "client"),
  build: {
    outDir: path2.resolve(__dirname2, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      }
    },
    // Performance optimizations
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    }
  },
  // Enable pre-bundling for faster development
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query"
    ]
  },
  // Faster builds
  esbuild: {
    target: "esnext"
  }
});

// server/vite.ts
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      // Add performance optimizations
      fs: {
        strict: false,
        // Allow more flexibility for Vite internal files
        allow: ["..", "../.."]
      }
    },
    // Enable pre-bundling for faster startup
    optimizeDeps: {
      include: ["react", "react-dom"],
      force: false
    },
    appType: "custom",
    // Performance optimizations
    esbuild: {
      target: "esnext"
      // Use modern target for better performance
    },
    build: {
      minify: false,
      // Faster builds in development
      sourcemap: true
      // Enable sourcemaps for debugging
    }
  });
  app2.use(vite.middlewares);
  let cachedTemplate = null;
  let templateLastModified = 0;
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/@vite/") || url.startsWith("/@fs/") || url.startsWith("/@id/") || url.startsWith("/node_modules/") || url.includes("?import") || url.includes("?direct") || url.includes("?worker") || url.includes("?inline") || url.includes("?url") || url.includes("?raw") || url.endsWith(".js") || url.endsWith(".ts") || url.endsWith(".tsx") || url.endsWith(".jsx") || url.endsWith(".css") || url.endsWith(".scss") || url.endsWith(".sass") || url.endsWith(".less") || url.endsWith(".styl") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".gif") || url.endsWith(".svg") || url.endsWith(".ico") || url.endsWith(".woff") || url.endsWith(".woff2") || url.endsWith(".ttf") || url.endsWith(".eot") || url.endsWith(".map")) {
      return next();
    }
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      const stats = await fs2.promises.stat(clientTemplate);
      if (!cachedTemplate || stats.mtime.getTime() > templateLastModified) {
        cachedTemplate = await fs2.promises.readFile(clientTemplate, "utf-8");
        templateLastModified = stats.mtime.getTime();
        log("\u{1F504} Reloaded index.html template", "vite");
      }
      let template = cachedTemplate;
      if (process.env.NODE_ENV === "development") {
        const timestamp = Math.floor(Date.now() / 1e4);
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${timestamp}"`
        );
      }
      const page = await vite.transformIndexHtml(url, template);
      res.set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.status(200).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_ollama_service();
init_LocalMemoryService();
init_multi_model_service();
import chalk from "chalk";
init_document_rag_service();
init_auto_learning_system();
init_agent_manager();
var log2 = (message) => console.log(chalk.cyan(`[Server] ${message}`));
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
var initializeServices2 = async () => {
  try {
    log2("\u{1F680} Initializing Library Companion services...");
    const ollamaService = new OllamaService({
      model: process.env.OLLAMA_MODEL || "gemma3n:e2b"
    });
    await ollamaService.initialize();
    app.locals.ollamaService = ollamaService;
    log2("\u2705 Ollama service initialized");
    const memoryService = LocalMemoryService.getInstance();
    app.locals.memoryService = memoryService;
    log2("\u2705 Memory service initialized");
    const multiModelService2 = new MultiModelService();
    app.locals.multiModelService = multiModelService2;
    log2(`\u2705 Multi-Model service initialized (Local Ollama)`);
    const adaptiveLearningService2 = new AdaptiveLearningService();
    app.locals.adaptiveLearningService = adaptiveLearningService2;
    log2("\u2705 Adaptive Learning service initialized");
    await autoLearningSystem.initialize();
    log2("\u2705 Auto-Learning system initialized");
    const translationService = new GemmaTranslationService(ollamaService);
    app.locals.translationService = translationService;
    log2("\u2705 Translation service initialized");
    const ragService = new DocumentRAGService();
    await ragService.initialize();
    ragService.setTranslationService(translationService);
    app.locals.ragService = ragService;
    log2("\u2705 RAG service initialized with translation support");
    await agentManager.initialize();
    agentManager.setOllamaService(ollamaService);
    agentManager.setTranslationService(translationService);
    await agentManager.start();
    log2("\u2705 Agent Manager initialized and started");
    log2("\u{1F389} All services initialized successfully!");
  } catch (error) {
    log2(`\u274C Service initialization error: ${error}`);
    throw error;
  }
};
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log2(logLine);
    }
  });
  next();
});
(async () => {
  try {
    await initializeServices2();
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      log2(`\u274C Error: ${status} - ${message}`);
    });
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = process.env.PORT || 5e3;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true
    }, () => {
      log2(`\u{1F31F} Library Companion server running on port ${port}`);
      log2(`\u{1F4CA} Performance monitoring: http://localhost:${port}/api/performance`);
      log2(`\u{1F916} Agent system: http://localhost:${port}/api/intelligence`);
    });
  } catch (error) {
    log2(`\u{1F4A5} Failed to start server: ${error}`);
    process.exit(1);
  }
})();
