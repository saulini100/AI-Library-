import { LocalMemoryService, Memory, MemoryPattern, UserProfile } from '../services/LocalMemoryService.js';

export interface StudyPattern {
  userId: number;
  favoriteBooks: string[];
  commonThemes: string[];
  studyTimes: string[];
  annotationFrequency: number;
  readingSpeed: number;
  preferredTopics: string[];
  lastActive: Date;
}

export class MemoryService {
  private localMemoryService: LocalMemoryService;
  private isInitialized: boolean = false;

  constructor() {
    this.localMemoryService = LocalMemoryService.getInstance();
    console.log('Memory Service initialized with local SQLite database');
    // Ensure initialization completes
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    try {
      // Wait a brief moment for LocalMemoryService to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      this.isInitialized = true;
      console.log('✅ Memory Service initialization completed');
    } catch (error) {
      console.error('❌ Memory Service initialization failed:', error);
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.isInitialized = true;
    }
  }

  async storeMemory(
    userId: number, 
    content: string, 
    category: string, 
    metadata?: any
  ): Promise<Memory> {
    await this.ensureReady();
    
    try {
      const memoryId = await this.localMemoryService.storeMemory(userId, content, category, metadata);
      
      // Create the memory object to return (we know it was stored successfully)
      const storedMemory: Memory = {
        id: memoryId,
        userId,
        content,
        category,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log(`✅ Stored memory for user ${userId}: ${category} (ID: ${memoryId})`);
      return storedMemory;
    } catch (error) {
      console.error(`❌ Failed to store memory for user ${userId}:`, error);
      throw new Error(`Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieveMemories(
    userId: number, 
    query: string, 
    category?: string, 
    limit: number = 10
  ): Promise<Memory[]> {
    if (query.trim()) {
      return await this.localMemoryService.searchMemories(userId, query, limit);
    } else {
      return await this.localMemoryService.retrieveMemories(userId, category, limit);
    }
  }

  async getUserStudyPatterns(userId: number): Promise<StudyPattern> {
    try {
      // Get user profile from local memory service
      const userProfile = await this.localMemoryService.getUserProfile(userId);
      
      // Convert UserProfile to StudyPattern format
      const pattern: StudyPattern = {
        userId: userProfile.userId,
        favoriteBooks: userProfile.favoriteBooks,
        commonThemes: userProfile.commonThemes,
        studyTimes: userProfile.studyTimes,
        annotationFrequency: userProfile.annotationFrequency,
        readingSpeed: this.estimateReadingSpeed(userProfile.averageSessionLength),
        preferredTopics: userProfile.preferredTopics,
        lastActive: new Date()
      };

      // Store the analyzed pattern as a memory
      await this.storeMemory(
        userId,
        `Study pattern analysis: Favorite books: ${pattern.favoriteBooks.join(', ')}. Common themes: ${pattern.commonThemes.join(', ')}. Study times: ${pattern.studyTimes.join(', ')}.`,
        'study_pattern_analysis',
        { 
          analysisDate: new Date().toISOString(),
          pattern: pattern
        }
      );

      return pattern;

    } catch (error) {
      console.error('Error analyzing study patterns:', error);
      
      // Return default pattern
      return {
        userId,
        favoriteBooks: [],
        commonThemes: [],
        studyTimes: [],
        annotationFrequency: 0,
        readingSpeed: 0,
        preferredTopics: [],
        lastActive: new Date()
      };
    }
  }

  private estimateReadingSpeed(averageSessionLength: number): number {
    // Estimate words per minute based on session length
    // Assuming average reading speed of 200-300 words per minute
    if (averageSessionLength > 0) {
      return Math.round(averageSessionLength * 250 / 60); // 250 WPM average
    }
    return 0;
  }

  async deleteMemory(userId: number, memoryId: string): Promise<boolean> {
    // For now, return true as a placeholder since deleteMemory method doesn't exist yet
    console.log(`Delete memory requested for user ${userId}, memory ${memoryId}`);
    return true;
  }

  async getAllUserMemories(userId: number): Promise<Memory[]> {
    return await this.localMemoryService.retrieveMemories(userId, undefined, 1000);
  }

  async analyzePatterns(userId: number): Promise<MemoryPattern[]> {
    return await this.localMemoryService.analyzePatterns(userId);
  }

  async getMemoryStats(userId: number) {
    return await this.localMemoryService.getMemoryStats(userId);
  }

  async clearUserMemories(userId: number, category?: string): Promise<number> {
    // For now, return 0 as a placeholder since clearUserMemories method doesn't exist yet
    console.log(`Clear memories requested for user ${userId}, category: ${category}`);
    return 0;
  }

  // Helper method to check if a name is a document title
  private isDocumentTitle(name: string): boolean {
    // This can be expanded to check against actual document titles in the database
    // For now, we'll use a simple heuristic
    return name.length > 0 && name.length < 200;
  }

  close() {
    this.localMemoryService.close();
  }
} 