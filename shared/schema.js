import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
});
// Documents table to store uploaded books/documents
export const documents = sqliteTable("documents", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    title: text("title").notNull(),
    filename: text("filename").notNull(),
    fileType: text("file_type").notNull(), // 'pdf' or 'txt'
    totalChapters: integer("total_chapters").notNull(),
    content: text("content").notNull(), // JSON string of parsed content with chapters
    createdAt: text("created_at").default("datetime('now')").notNull(),
});
export const annotations = sqliteTable("annotations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    documentId: integer("document_id").notNull(),
    chapter: integer("chapter").notNull(),
    paragraph: integer("paragraph"),
    selectedText: text("selected_text").notNull(),
    note: text("note").notNull(),
    type: text("type").default("user").notNull(), // 'user' or 'ai'
    createdAt: text("created_at").default("datetime('now')").notNull(),
});
export const bookmarks = sqliteTable("bookmarks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    documentId: integer("document_id").notNull(),
    chapter: integer("chapter").notNull(),
    paragraph: integer("paragraph"),
    title: text("title"),
    createdAt: text("created_at").default("datetime('now')").notNull(),
});
export const readingProgress = sqliteTable("reading_progress", {
    id: integer("id").primaryKey(),
    userId: integer("user_id").notNull(),
    documentId: integer("document_id").notNull(),
    chapter: integer("chapter").notNull(),
    completed: integer("completed").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .default(sql `(strftime('%s', 'now'))`)
        .notNull(),
});
export const aiMemories = sqliteTable("ai_memories", {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull(), // e.g., 'definition', 'insight', 'question'
    metadata: text("metadata", { mode: "json" }), // Store any extra data, like source text
    embedding: text("embedding"), // Store vector embeddings for semantic search
    createdAt: integer("created_at", { mode: "timestamp" })
        .default(sql `(strftime('%s', 'now'))`)
        .notNull(),
});
// 🚀 NEW: Power summaries table for storing AI-generated chapter summaries
export const powerSummaries = sqliteTable("power_summaries", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    documentId: integer("document_id").notNull(),
    chapter: integer("chapter").notNull(),
    chapterTitle: text("chapter_title").notNull(),
    powerSummary: text("power_summary").notNull(), // Main summary text
    keyInsights: text("key_insights").notNull(), // JSON array of insights
    mainThemes: text("main_themes").notNull(), // JSON array of themes
    actionablePoints: text("actionable_points").notNull(), // JSON array of action points
    createdAt: text("created_at").default("datetime('now')").notNull(),
    updatedAt: text("updated_at").default("datetime('now')").notNull(),
});
// 🚀 NEW: Embedding cache for performance optimization
export const embeddingCache = sqliteTable("embedding_cache", {
    id: integer("id").primaryKey(),
    userId: integer("user_id").notNull(),
    text_hash: text("text_hash").notNull().unique(),
    model: text("model").notNull(),
    embedding: text("embedding").notNull(), // Stored as JSON string
    created_at: integer("created_at", { mode: "timestamp" })
        .default(sql `(strftime('%s', 'now'))`)
        .notNull(),
    last_accessed_at: integer("last_accessed_at", { mode: "timestamp" })
        .default(sql `(strftime('%s', 'now'))`)
        .notNull(),
    access_count: integer("access_count").default(0).notNull(),
}, (table) => {
    return {
        textHashIdx: index("text_hash_idx").on(table.text_hash),
    };
});
// 🚀 NEW: Query result cache for Phase 2 performance optimization
export const queryResultCache = sqliteTable("query_result_cache", {
    id: integer("id").primaryKey(),
    userId: integer("user_id").notNull(),
    query_hash: text("query_hash").notNull().unique(),
    query_text: text("query_text").notNull(),
    embedding: text("embedding"), // Stored as JSON string
    model: text("model").notNull(),
    result: text("result").notNull(), // Stored as JSON string
    metadata: text("metadata", { mode: "json" }),
    created_at: integer("created_at", { mode: "timestamp" })
        .default(sql `(strftime('%s', 'now'))`)
        .notNull(),
    last_accessed_at: integer("last_accessed_at", { mode: "timestamp" })
        .default(sql `(strftime('%s', 'now'))`)
        .notNull(),
    access_count: integer("access_count").default(0).notNull(),
}, (table) => {
    return {
        queryHashIdx: index("query_hash_idx").on(table.query_hash),
    };
});
// 🧠 NEW: Learned definitions table for organized knowledge storage
export const learnedDefinitions = sqliteTable('learned_definitions', {
    id: integer('id').primaryKey(),
    term: text('term').notNull().unique(),
    definition: text('definition').notNull(),
    source_document_id: integer('source_document_id'),
    context_snippet: text('context_snippet'),
    user_feedback: text('user_feedback'), // 'positive', 'negative', 'neutral'
    confidence_score: integer('confidence_score').notNull().default(0),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql `(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql `(strftime('%s', 'now'))`),
    related_terms: text('related_terms', { mode: 'json' }), // JSON array of related term IDs or names
    embedding: text('embedding'), // Stored as JSON string of numbers
    tags: text('tags', { mode: 'json' }), // JSON array of strings
    access_count: integer('access_count').default(0),
    last_accessed_at: integer('last_accessed_at', { mode: 'timestamp' }),
});
export const aiKnowledgeGraph = sqliteTable('ai_knowledge_graph', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql `(strftime('%s', 'now'))`),
});
export const knowledgeGraphConcepts = sqliteTable('knowledge_graph_concepts', {
    id: integer('id').primaryKey(),
    graphId: integer('graph_id').references(() => aiKnowledgeGraph.id),
    name: text('name').notNull(),
    summary: text('summary'),
    sourceDocumentId: integer('source_document_id').references(() => documents.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql `(strftime('%s', 'now'))`),
});
export const knowledgeGraphEdges = sqliteTable('knowledge_graph_edges', {
    id: integer('id').primaryKey(),
    graphId: integer('graph_id').references(() => aiKnowledgeGraph.id),
    sourceConceptId: integer('source_concept_id').references(() => knowledgeGraphConcepts.id),
    targetConceptId: integer('target_concept_id').references(() => knowledgeGraphConcepts.id),
    label: text('label').notNull(), // e.g., 'is_a', 'part_of', 'contradicts'
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql `(strftime('%s', 'now'))`),
});
export const notifications = sqliteTable('notifications', {
    id: integer('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id),
    title: text('title').notNull(),
    message: text('message').notNull(),
    is_read: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql `(strftime('%s', 'now'))`),
});
export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
});
export const insertDocumentSchema = createInsertSchema(documents).omit({
    id: true,
    userId: true,
    createdAt: true,
});
export const insertAnnotationSchema = createInsertSchema(annotations).omit({
    id: true,
    userId: true,
    createdAt: true,
});
export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
    id: true,
    userId: true,
    createdAt: true,
});
export const insertReadingProgressSchema = createInsertSchema(readingProgress).omit({
    id: true,
    userId: true,
    createdAt: true,
});
export const insertAiMemorySchema = createInsertSchema(aiMemories).omit({
    userId: true,
    createdAt: true,
});
export const insertPowerSummarySchema = createInsertSchema(powerSummaries).omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
});
export const insertEmbeddingCacheSchema = createInsertSchema(embeddingCache).omit({
    id: true,
    created_at: true,
    last_accessed_at: true,
});
export const insertQueryResultCacheSchema = createInsertSchema(queryResultCache).omit({
    id: true,
    created_at: true,
    last_accessed_at: true,
    access_count: true,
});
export const insertLearnedDefinitionSchema = createInsertSchema(learnedDefinitions).omit({
    id: true,
    created_at: true,
    updated_at: true,
    last_accessed_at: true,
    access_count: true,
});
