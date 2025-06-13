import { 
  users, annotations, bookmarks, readingProgress,
  type User, type InsertUser,
  type Annotation, type InsertAnnotation,
  type Bookmark, type InsertBookmark,
  type ReadingProgress, type InsertReadingProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Annotations
  getAnnotations(userId: number): Promise<Annotation[]>;
  getAnnotationsByChapter(userId: number, book: string, chapter: number): Promise<Annotation[]>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private annotations: Map<number, Annotation>;
  private bookmarks: Map<number, Bookmark>;
  private readingProgress: Map<number, ReadingProgress>;
  private currentUserId: number;
  private currentAnnotationId: number;
  private currentBookmarkId: number;
  private currentProgressId: number;

  constructor() {
    this.users = new Map();
    this.annotations = new Map();
    this.bookmarks = new Map();
    this.readingProgress = new Map();
    this.currentUserId = 1;
    this.currentAnnotationId = 1;
    this.currentBookmarkId = 1;
    this.currentProgressId = 1;
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

  async getAnnotations(userId: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values())
      .filter(annotation => annotation.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getAnnotationsByChapter(userId: number, book: string, chapter: number): Promise<Annotation[]> {
    return Array.from(this.annotations.values())
      .filter(annotation => 
        annotation.userId === userId && 
        annotation.book === book && 
        annotation.chapter === chapter
      );
  }

  async createAnnotation(annotation: InsertAnnotation & { userId: number }): Promise<Annotation> {
    const id = this.currentAnnotationId++;
    const newAnnotation: Annotation = { 
      ...annotation, 
      id, 
      createdAt: new Date() 
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
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createBookmark(bookmark: InsertBookmark & { userId: number }): Promise<Bookmark> {
    const id = this.currentBookmarkId++;
    const newBookmark: Bookmark = { 
      ...bookmark, 
      id, 
      createdAt: new Date() 
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
      .find(p => p.userId === progress.userId && p.book === progress.book && p.chapter === progress.chapter);
    
    if (existing) {
      const updated = { ...existing, completed: progress.completed };
      this.readingProgress.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentProgressId++;
      const newProgress: ReadingProgress = { 
        ...progress, 
        id, 
        createdAt: new Date() 
      };
      this.readingProgress.set(id, newProgress);
      return newProgress;
    }
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

  async getAnnotations(userId: number): Promise<Annotation[]> {
    return await db
      .select()
      .from(annotations)
      .where(eq(annotations.userId, userId));
  }

  async getAnnotationsByChapter(userId: number, book: string, chapter: number): Promise<Annotation[]> {
    return await db
      .select()
      .from(annotations)
      .where(and(
        eq(annotations.userId, userId),
        eq(annotations.book, book),
        eq(annotations.chapter, chapter)
      ));
  }

  async createAnnotation(annotation: InsertAnnotation & { userId: number }): Promise<Annotation> {
    const [newAnnotation] = await db
      .insert(annotations)
      .values(annotation)
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
    return (result.rowCount ?? 0) > 0;
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
    return (result.rowCount ?? 0) > 0;
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
        eq(readingProgress.book, progress.book),
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
}

export const storage = new DatabaseStorage();
