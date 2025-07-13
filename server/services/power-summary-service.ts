import { storage } from '../storage.js';

export interface PowerSummaryContext {
  documentId?: number;
  chapter?: number;
  userId?: number;
  limit?: number;
}

export interface PowerSummaryInsights {
  totalSummaries: number;
  averageLength: number;
  commonThemes: string[];
  recentSummaries: any[];
  documentCoverage: { [documentId: number]: number };
}

export class PowerSummaryService {
  private static instance: PowerSummaryService;

  private constructor() {}

  static getInstance(): PowerSummaryService {
    if (!PowerSummaryService.instance) {
      PowerSummaryService.instance = new PowerSummaryService();
    }
    return PowerSummaryService.instance;
  }

  /**
   * Get power summaries with flexible filtering options
   */
  async getPowerSummaries(context: PowerSummaryContext): Promise<any[]> {
    try {
      const { documentId, userId = 2, limit = 50 } = context;
      
      if (documentId) {
        // Use existing storage method for specific document
        return await storage.getPowerSummaries(documentId);
      } else {
        // For now, return empty array if no documentId specified
        // This can be enhanced later with a getAllPowerSummaries method
        return [];
      }
    } catch (error) {
      console.error('Error fetching power summaries:', error);
      return [];
    }
  }

  /**
   * Get power summaries for a specific document with chapter information
   */
  async getDocumentPowerSummaries(documentId: number, userId: number = 2): Promise<any[]> {
    try {
      return await storage.getPowerSummaries(documentId);
    } catch (error) {
      console.error('Error fetching document power summaries:', error);
      return [];
    }
  }

  /**
   * Get power summaries for AI context and learning
   */
  async getPowerSummariesForAIContext(documentId?: number, limit: number = 10): Promise<string> {
    try {
      if (!documentId) {
        return 'No power summaries available for context.';
      }
      
      const summaries = await this.getPowerSummaries({ documentId, limit });
      
      if (summaries.length === 0) {
        return 'No power summaries available for context.';
      }
      
      // Format summaries for AI context
      const contextText = summaries.map((summary, index) => {
        return `Summary ${index + 1} (Document ${summary.documentId}, Chapter ${summary.chapter}):
Title: ${summary.chapterTitle}
Content: ${summary.powerSummary}
---`;
      }).join('\n\n');
      
      return `Power Summary Context (${summaries.length} summaries):
${contextText}`;
    } catch (error) {
      console.error('Error creating AI context from power summaries:', error);
      return 'Unable to retrieve power summary context.';
    }
  }

  /**
   * Get insights and analytics about power summaries
   */
  async getPowerSummaryInsights(userId: number = 2): Promise<PowerSummaryInsights> {
    try {
      // For now, get insights from document 1 as an example
      const allSummaries = await this.getPowerSummaries({ documentId: 1, userId, limit: 1000 });
      
      if (allSummaries.length === 0) {
        return {
          totalSummaries: 0,
          averageLength: 0,
          commonThemes: [],
          recentSummaries: [],
          documentCoverage: {}
        };
      }
      
      // Calculate average length
      const totalLength = allSummaries.reduce((sum, summary) => 
        sum + (summary.powerSummary?.length || 0), 0);
      const averageLength = Math.round(totalLength / allSummaries.length);
      
      // Get document coverage
      const documentCoverage: { [documentId: number]: number } = {};
      allSummaries.forEach(summary => {
        documentCoverage[summary.documentId] = (documentCoverage[summary.documentId] || 0) + 1;
      });
      
      // Get recent summaries
      const recentSummaries = allSummaries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      // Extract common themes from chapter titles
      const themes = allSummaries
        .map(s => s.chapterTitle?.toLowerCase())
        .filter(Boolean)
        .join(' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .reduce((acc: { [key: string]: number }, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {});
      
      const commonThemes = Object.entries(themes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([theme]) => theme);
      
      return {
        totalSummaries: allSummaries.length,
        averageLength,
        commonThemes,
        recentSummaries,
        documentCoverage
      };
    } catch (error) {
      console.error('Error getting power summary insights:', error);
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
  async searchPowerSummaries(query: string, userId: number = 2, limit: number = 20): Promise<any[]> {
    try {
      // For now, search in document 1
      const allSummaries = await this.getPowerSummaries({ documentId: 1, userId, limit: 1000 });
      
      return allSummaries
        .filter(summary => summary.powerSummary?.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching power summaries:', error);
      return [];
    }
  }

  /**
   * Get power summaries for cross-document learning
   */
  async getCrossDocumentPowerSummaries(documentIds: number[], userId: number = 2): Promise<any[]> {
    try {
      if (documentIds.length === 0) return [];
      
      const allSummaries: any[] = [];
      
      // Get summaries from each document
      for (const documentId of documentIds) {
        const summaries = await this.getPowerSummaries({ documentId, userId });
        allSummaries.push(...summaries);
      }
      
      return allSummaries;
    } catch (error) {
      console.error('Error fetching cross-document power summaries:', error);
      return [];
    }
  }

  /**
   * Get power summary statistics for AI learning
   */
  async getPowerSummaryStats(userId: number = 2): Promise<any> {
    try {
      const insights = await this.getPowerSummaryInsights(userId);
      
      return {
        totalSummaries: insights.totalSummaries,
        averageLength: insights.averageLength,
        documentCoverage: Object.keys(insights.documentCoverage).length,
        mostActiveDocument: Object.entries(insights.documentCoverage)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || null,
        recentActivity: insights.recentSummaries.length > 0,
        commonThemes: insights.commonThemes.slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting power summary stats:', error);
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
}

// Export singleton instance
export const powerSummaryService = PowerSummaryService.getInstance(); 