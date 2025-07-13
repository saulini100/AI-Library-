import { 
  users, documents, annotations, bookmarks, readingProgress, powerSummaries,
  knowledgeGraphConcepts, learnedDefinitions,
  type User, type InsertUser,
  type Document, type InsertDocument,
  type Annotation, type InsertAnnotation,
  type Bookmark, type InsertBookmark,
  type ReadingProgress, type InsertReadingProgress,
  type PowerSummary, type InsertPowerSummary
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Documents
  getDocuments(userId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument & { userId: number }): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  searchDocuments(userId: number, query: string): Promise<Array<{
    documentId: number;
    documentTitle: string;
    chapter: number;
    paragraph: number;
    text: string;
    context: string;
  }>>;
  
  // Annotations
  getAnnotations(userId: number): Promise<Annotation[]>;
  getAnnotationsByChapter(userId: number, documentId: number, chapter: number): Promise<Annotation[]>;
  createAnnotation(annotation: InsertAnnotation & { userId: number }): Promise<Annotation>;
  updateAnnotation(id: number, note: string): Promise<Annotation | undefined>;
  deleteAnnotation(id: number): Promise<boolean>;
  
  // Bookmarks
  getBookmarks(userId: number): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark & { userId: number }): Promise<Bookmark>;
  deleteBookmark(id: number): Promise<boolean>;
  
  // Reading Progress
  getReadingProgress(userId: number): Promise<ReadingProgress[]>;
  updateReadingProgress(progress: InsertReadingProgress & { userId: number }): Promise<ReadingProgress>;
  
  // Power Summaries
  getPowerSummaries(documentId: number): Promise<PowerSummary[]>;
  createPowerSummary(summary: Omit<InsertPowerSummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<PowerSummary>;
  deletePowerSummary(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private annotations: Map<number, Annotation>;
  private bookmarks: Map<number, Bookmark>;
  private readingProgress: Map<number, ReadingProgress>;
  private powerSummaries: Map<number, PowerSummary>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentAnnotationId: number;
  private currentBookmarkId: number;
  private currentProgressId: number;
  private currentSummaryId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.annotations = new Map();
    this.bookmarks = new Map();
    this.readingProgress = new Map();
    this.powerSummaries = new Map();
    this.currentUserId = 2;
    this.currentDocumentId = 1;
    this.currentAnnotationId = 1;
    this.currentBookmarkId = 1;
    this.currentProgressId = 1;
    this.currentSummaryId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Document methods
  async getDocuments(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(document: InsertDocument & { userId: number }): Promise<Document> {
    const id = this.currentDocumentId++;
    const newDocument: Document = { 
      ...document, 
      id, 
      createdAt: new Date().toISOString() 
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async searchDocuments(userId: number, query: string): Promise<Array<{
    documentId: number;
    documentTitle: string;
    chapter: number;
    paragraph: number;
    text: string;
    context: string;
  }>> {
    const userDocuments = Array.from(this.documents.values())
      .filter(doc => doc.userId === userId);
    
    const results: Array<{
      documentId: number;
      documentTitle: string;
      chapter: number;
      paragraph: number;
      text: string;
      context: string;
    }> = [];

    // Simple text search through document content
    userDocuments.forEach(doc => {
      const content = doc.content as any;
      if (content && content.chapters) {
        content.chapters.forEach((chapter: any, chapterIndex: number) => {
          if (chapter.paragraphs) {
            chapter.paragraphs.forEach((paragraph: any, paragraphIndex: number) => {
              if (paragraph.text && paragraph.text.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  documentId: doc.id,
                  documentTitle: doc.title,
                  chapter: chapterIndex + 1,
                  paragraph: paragraphIndex + 1,
                  text: paragraph.text,
                  context: paragraph.text.substring(0, 200) + '...'
                });
              }
            });
          }
        });
      }
    });

    return results;
  }

  async getAnnotations(userId: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values())
      .filter(annotation => annotation.userId === userId)
      .sort((a, b) => {
        const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
        const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async getAnnotationsByChapter(userId: number, documentId: number, chapter: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values())
      .filter(annotation => 
        annotation.userId === userId && 
        annotation.documentId === documentId && 
        annotation.chapter === chapter
      );
  }

  async createAnnotation(annotation: InsertAnnotation & { userId: number }): Promise<Annotation> {
    const id = this.currentAnnotationId++;
    const newAnnotation: Annotation = { 
      ...annotation, 
      id, 
      createdAt: new Date().toISOString(),
      paragraph: annotation.paragraph ?? null,
      type: annotation.type ?? 'user'
    };
    this.annotations.set(id, newAnnotation);
    return newAnnotation;
  }

  async updateAnnotation(id: number, note: string): Promise<Annotation | undefined> {
    const annotation = this.annotations.get(id);
    if (annotation) {
      const updated = { ...annotation, note };
      this.annotations.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteAnnotation(id: number): Promise<boolean> {
    return this.annotations.delete(id);
  }

  async getBookmarks(userId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.userId === userId)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async createBookmark(bookmark: InsertBookmark & { userId: number }): Promise<Bookmark> {
    const id = this.currentBookmarkId++;
          const newBookmark: Bookmark = { 
        ...bookmark, 
        id, 
        createdAt: new Date().toISOString(),
        paragraph: bookmark.paragraph ?? null,
        title: bookmark.title ?? null
      };
    this.bookmarks.set(id, newBookmark);
    return newBookmark;
  }

  async deleteBookmark(id: number): Promise<boolean> {
    return this.bookmarks.delete(id);
  }

  async getReadingProgress(userId: number): Promise<ReadingProgress[]> {
    return Array.from(this.readingProgress.values())
      .filter(progress => progress.userId === userId);
  }

  async updateReadingProgress(progress: InsertReadingProgress & { userId: number }): Promise<ReadingProgress> {
    // Find existing progress for this chapter
    const existing = Array.from(this.readingProgress.values())
      .find(p => p.userId === progress.userId && p.documentId === progress.documentId && p.chapter === progress.chapter);
    
    if (existing) {
      const updated = { ...existing, completed: progress.completed ?? 0 };
      this.readingProgress.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentProgressId++;
      const newProgress: ReadingProgress = { 
        ...progress, 
        id, 
        createdAt: new Date(),
        completed: progress.completed ?? 0
      };
      this.readingProgress.set(id, newProgress);
      return newProgress;
    }
  }

  async getPowerSummaries(documentId: number): Promise<PowerSummary[]> {
    return Array.from(this.powerSummaries.values())
      .filter(summary => summary.documentId === documentId)
      .sort((a, b) => a.chapter - b.chapter);
  }

  async createPowerSummary(summary: Omit<InsertPowerSummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<PowerSummary> {
    const id = this.currentSummaryId++;
    const now = new Date().toISOString();
    const newSummary: PowerSummary = {
      ...summary,
      id,
      userId: 2, // Use correct default user ID 2
      createdAt: now,
      updatedAt: now
    };
    this.powerSummaries.set(id, newSummary);
    return newSummary;
  }

  async deletePowerSummary(id: number): Promise<boolean> {
    return this.powerSummaries.delete(id);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Document methods
  async getDocuments(userId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(documents.createdAt);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(document: InsertDocument & { userId: number }): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    try {
      // Delete related records first (in order of dependencies)
      
      // Delete annotations for this document
      await db
        .delete(annotations)
        .where(eq(annotations.documentId, id));
      
      // Delete bookmarks for this document
      await db
        .delete(bookmarks)
        .where(eq(bookmarks.documentId, id));
      
      // Delete reading progress for this document
      await db
        .delete(readingProgress)
        .where(eq(readingProgress.documentId, id));
      
      // Delete power summaries for this document
      await db
        .delete(powerSummaries)
        .where(eq(powerSummaries.documentId, id));
      
      // Delete knowledge graph concepts that reference this document
      await db
        .delete(knowledgeGraphConcepts)
        .where(eq(knowledgeGraphConcepts.sourceDocumentId, id));
      
      // Delete learned definitions that reference this document
      await db
        .delete(learnedDefinitions)
        .where(eq(learnedDefinitions.source_document_id, id));
      
      // Finally delete the document itself
    const result = await db
      .delete(documents)
      .where(eq(documents.id, id));
      
    return result.changes > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  async searchDocuments(userId: number, query: string): Promise<Array<{
    documentId: number;
    documentTitle: string;
    chapter: number;
    paragraph: number;
    text: string;
    context: string;
  }>> {
    // This is a simplified search - in production, you'd want full-text search
    const userDocuments = await this.getDocuments(userId);
    const results: Array<{
      documentId: number;
      documentTitle: string;
      chapter: number;
      paragraph: number;
      text: string;
      context: string;
    }> = [];

    const searchTerm = query.toLowerCase();

    for (const doc of userDocuments) {
      const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
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
                  context: '...' + paragraph.text.substring(contextStart, contextEnd) + '...'
                });
              }
            }
          }
        }
      }
    }

    return results;
  }

  async getAnnotations(userId: number): Promise<Annotation[]> {
    return await db
      .select()
      .from(annotations)
      .where(eq(annotations.userId, userId));
  }

  async getAnnotationsByChapter(userId: number, documentId: number, chapter: number): Promise<Annotation[]> {
    return await db
      .select()
      .from(annotations)
      .where(and(
        eq(annotations.userId, userId),
        eq(annotations.documentId, documentId),
        eq(annotations.chapter, chapter)
      ));
  }

  async createAnnotation(annotation: InsertAnnotation & { userId: number }): Promise<Annotation> {
    const [newAnnotation] = await db
      .insert(annotations)
      .values({
        ...annotation,
        type: annotation.type ?? 'user'
      })
      .returning();
    return newAnnotation;
  }

  async updateAnnotation(id: number, note: string): Promise<Annotation | undefined> {
    const [updated] = await db
      .update(annotations)
      .set({ note })
      .where(eq(annotations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAnnotation(id: number): Promise<boolean> {
    const result = await db
      .delete(annotations)
      .where(eq(annotations.id, id));
    return result.changes > 0;
  }

  async getBookmarks(userId: number): Promise<Bookmark[]> {
    return await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));
  }

  async createBookmark(bookmark: InsertBookmark & { userId: number }): Promise<Bookmark> {
    const [newBookmark] = await db
      .insert(bookmarks)
      .values(bookmark)
      .returning();
    return newBookmark;
  }

  async deleteBookmark(id: number): Promise<boolean> {
    const result = await db
      .delete(bookmarks)
      .where(eq(bookmarks.id, id));
    return result.changes > 0;
  }

  async getReadingProgress(userId: number): Promise<ReadingProgress[]> {
    return await db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.userId, userId));
  }

  async updateReadingProgress(progress: InsertReadingProgress & { userId: number }): Promise<ReadingProgress> {
    // Check if progress already exists for this user/book/chapter
    const [existing] = await db
      .select()
      .from(readingProgress)
      .where(and(
        eq(readingProgress.userId, progress.userId),
        eq(readingProgress.documentId, progress.documentId),
        eq(readingProgress.chapter, progress.chapter)
      ));

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(readingProgress)
        .set({
          completed: progress.completed
        })
        .where(eq(readingProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [newProgress] = await db
        .insert(readingProgress)
        .values(progress)
        .returning();
      return newProgress;
    }
  }

  async getPowerSummaries(documentId: number): Promise<PowerSummary[]> {
    return await db
      .select()
      .from(powerSummaries)
      .where(eq(powerSummaries.documentId, documentId))
      .orderBy(powerSummaries.chapter);
  }

  async createPowerSummary(summary: Omit<InsertPowerSummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<PowerSummary> {
    try {
      const [newSummary] = await db
        .insert(powerSummaries)
        .values({
          ...summary,
          userId: 2, // Use correct default user ID 2
          keyInsights: typeof summary.keyInsights === 'string' ? summary.keyInsights : JSON.stringify(summary.keyInsights || []),
          mainThemes: typeof summary.mainThemes === 'string' ? summary.mainThemes : JSON.stringify(summary.mainThemes || []),
          actionablePoints: typeof summary.actionablePoints === 'string' ? summary.actionablePoints : JSON.stringify(summary.actionablePoints || [])
        })
        .returning();
      // Parse JSON fields back to arrays for the return type
      return {
        ...newSummary,
        keyInsights: typeof newSummary.keyInsights === 'string' ? JSON.parse(newSummary.keyInsights) : newSummary.keyInsights,
        mainThemes: typeof newSummary.mainThemes === 'string' ? JSON.parse(newSummary.mainThemes) : newSummary.mainThemes,
        actionablePoints: typeof newSummary.actionablePoints === 'string' ? JSON.parse(newSummary.actionablePoints) : newSummary.actionablePoints
      };
    } catch (error: any) {
      if (error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('A power summary for this chapter already exists.');
      }
      throw error;
    }
  }

  async deletePowerSummary(id: number): Promise<boolean> {
    const deleted = await db.delete(powerSummaries).where(eq(powerSummaries.id, id));
    return deleted.changes > 0;
  }
}

export const storage = new DatabaseStorage();
