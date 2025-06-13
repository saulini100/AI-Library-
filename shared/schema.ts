import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Documents table to store uploaded books/documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // 'pdf' or 'txt'
  totalChapters: integer("total_chapters").notNull(),
  content: jsonb("content").notNull(), // Parsed content with chapters
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentId: integer("document_id").notNull(),
  chapter: integer("chapter").notNull(),
  paragraph: integer("paragraph"),
  selectedText: text("selected_text").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentId: integer("document_id").notNull(),
  chapter: integer("chapter").notNull(),
  paragraph: integer("paragraph"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const readingProgress = pgTable("reading_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentId: integer("document_id").notNull(),
  chapter: integer("chapter").notNull(),
  completed: integer("completed").default(0).notNull(), // 0 = not started, 1 = completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Universal document interfaces
export interface DocumentParagraph {
  number: number;
  text: string;
}

export interface DocumentChapter {
  title: string;
  number: number;
  paragraphs: DocumentParagraph[];
}

export interface ProcessedDocument {
  title: string;
  chapters: DocumentChapter[];
  totalChapters: number;
}

// Search result interface
export interface SearchResult {
  documentId: number;
  documentTitle: string;
  chapter: number;
  paragraph: number;
  text: string;
  context: string;
}
