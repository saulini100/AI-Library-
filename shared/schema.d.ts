import { z } from "zod";
export declare const users: any;
export declare const documents: any;
export declare const annotations: any;
export declare const bookmarks: any;
export declare const readingProgress: any;
export declare const aiMemories: any;
export declare const powerSummaries: any;
export declare const embeddingCache: any;
export declare const queryResultCache: any;
export declare const learnedDefinitions: any;
export declare const aiKnowledgeGraph: any;
export declare const knowledgeGraphConcepts: any;
export declare const knowledgeGraphEdges: any;
export declare const notifications: any;
export declare const insertUserSchema: any;
export declare const insertDocumentSchema: any;
export declare const insertAnnotationSchema: any;
export declare const insertBookmarkSchema: any;
export declare const insertReadingProgressSchema: any;
export declare const insertAiMemorySchema: any;
export declare const insertPowerSummarySchema: any;
export declare const insertEmbeddingCacheSchema: any;
export declare const insertQueryResultCacheSchema: any;
export declare const insertLearnedDefinitionSchema: any;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type Annotation = typeof annotations.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertReadingProgress = z.infer<typeof insertReadingProgressSchema>;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type InsertAiMemory = z.infer<typeof insertAiMemorySchema>;
export type AiMemory = typeof aiMemories.$inferSelect;
export type InsertPowerSummary = z.infer<typeof insertPowerSummarySchema>;
export type PowerSummary = typeof powerSummaries.$inferSelect;
export type InsertEmbeddingCache = z.infer<typeof insertEmbeddingCacheSchema>;
export type EmbeddingCache = typeof embeddingCache.$inferSelect;
export type InsertQueryResultCache = z.infer<typeof insertQueryResultCacheSchema>;
export type QueryResultCache = typeof queryResultCache.$inferSelect;
export type InsertLearnedDefinition = z.infer<typeof insertLearnedDefinitionSchema>;
export type LearnedDefinition = typeof learnedDefinitions.$inferSelect;
export interface DocumentParagraph {
    number: number;
    text: string;
}
export interface DocumentChapter {
    title: string;
    number: number;
    paragraphs: DocumentParagraph[];
}
export interface BibleChapter extends DocumentChapter {
    verses?: DocumentParagraph[];
    book?: string;
    chapter?: number;
}
export interface ProcessedDocument {
    title: string;
    chapters: DocumentChapter[];
    totalChapters: number;
}
export interface SearchResult {
    documentId: number;
    documentTitle: string;
    chapter: number;
    paragraph: number;
    text: string;
    context: string;
}
//# sourceMappingURL=schema.d.ts.map