import { db } from '../db.js';
import { learnedDefinitions } from '../../shared/schema';
import { like, eq, desc, and } from 'drizzle-orm';

export interface DefinitionSearchOptions {
  search?: string;
  domain?: string; // Note: Not implemented in current schema
  complexity?: 'beginner' | 'intermediate' | 'advanced' | 'expert'; // Note: Not implemented in current schema
  limit?: number;
  minConfidence?: number;
  tags?: string[];
}

export interface LearnedDefinition {
  id: number;
  term: string;
  definition: string;
  context?: string;
  sourceUrl?: string;
  domain?: string;
  complexity: string;
  confidence: number;
  learningValue: number;
  tags: string[];
  createdAt: string;
  accessCount: number;
}

/**
 * 📚 DEFINITIONS ACCESS SERVICE
 * Provides all AI agents with easy access to learned definitions
 */
export class DefinitionsAccessService {
  
  /**
   * 🔍 Search for definitions by term or content
   */
  async searchDefinitions(options: DefinitionSearchOptions = {}): Promise<LearnedDefinition[]> {
    try {
      const {
        search,
        domain,
        complexity,
        limit = 10,
        minConfidence = 0
      } = options;

      // Use db.query for simpler type handling
      const results = await db.query.learnedDefinitions.findMany({
        limit,
        orderBy: desc(learnedDefinitions.created_at),
        where: search ? like(learnedDefinitions.term, `%${search}%`) : undefined
      });

      // Filter and format results
      return results
        .filter(def => {
          if (minConfidence > 0 && (def.confidence_score || 0) < minConfidence * 100) return false;
          return true;
        })
        .map(def => ({
          id: def.id,
          term: def.term,
          definition: def.definition,
          context: def.context_snippet || undefined,
          sourceUrl: undefined, // Field doesn't exist in schema
          domain: undefined, // Field doesn't exist in schema
          complexity: 'intermediate', // Field doesn't exist in schema
          confidence: (def.confidence_score || 80) / 100,
          learningValue: 0.7, // Field doesn't exist in schema, use default
          tags: def.tags ? JSON.parse(def.tags as string) : [],
          createdAt: def.created_at?.toISOString() || new Date().toISOString(),
          accessCount: def.access_count || 0
        }));

    } catch (error) {
      console.error('❌ Definition search failed:', error);
      return [];
    }
  }

  /**
   * 📖 Get a specific definition by ID
   */
  async getDefinition(id: number): Promise<LearnedDefinition | null> {
    try {
      const result = await db
        .select()
        .from(learnedDefinitions)
        .where(eq(learnedDefinitions.id, id))
        .limit(1);

      if (result.length === 0) return null;

      const definition = result[0];

      // Update access count
      await db
        .update(learnedDefinitions)
        .set({
          last_accessed_at: new Date(),
          access_count: (definition.access_count || 0) + 1
        })
        .where(eq(learnedDefinitions.id, id));

      return {
        id: definition.id,
        term: definition.term,
        definition: definition.definition,
        context: definition.context_snippet || undefined,
        sourceUrl: undefined, // Field doesn't exist in schema
        domain: undefined, // Field doesn't exist in schema
        complexity: 'intermediate', // Field doesn't exist in schema
        confidence: (definition.confidence_score || 80) / 100,
        learningValue: 0.7, // Field doesn't exist in schema, use default
        tags: definition.tags ? JSON.parse(definition.tags as string) : [],
        createdAt: definition.created_at?.toISOString() || new Date().toISOString(),
        accessCount: definition.access_count || 0
      };

    } catch (error) {
      console.error('❌ Get definition failed:', error);
      return null;
    }
  }

  /**
   * 🎯 Find definitions related to a specific topic or context
   */
  async getRelatedDefinitions(topic: string, limit: number = 5): Promise<LearnedDefinition[]> {
    const searchTerms = topic.toLowerCase().split(' ');
    const results: LearnedDefinition[] = [];

    // Search for each term
    for (const term of searchTerms) {
      if (term.length > 2) { // Skip very short words
        const termResults = await this.searchDefinitions({
          search: term,
          limit: 3
        });
        results.push(...termResults);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = results.filter((def, index, arr) => 
      arr.findIndex(d => d.id === def.id) === index
    );

    return uniqueResults
      .sort((a, b) => (b.confidence * b.learningValue) - (a.confidence * a.learningValue))
      .slice(0, limit);
  }

  /**
   * 📊 Get definitions by domain for expertise building
   * Note: Domain field doesn't exist in current schema, returns all definitions
   */
  async getDefinitionsByDomain(domain: string, limit: number = 20): Promise<LearnedDefinition[]> {
    return this.searchDefinitions({
      limit,
      minConfidence: 0.7 // Only high-confidence definitions
    });
  }

  /**
   * 🏷️ Get definitions by tags
   */
  async getDefinitionsByTags(tags: string[], limit: number = 15): Promise<LearnedDefinition[]> {
    try {
      // This is a simplified approach - in a real implementation, you'd want proper JSON querying
      const allDefinitions = await this.searchDefinitions({ limit: 100 });
      
      const matchingDefinitions = allDefinitions.filter(def => 
        tags.some(tag => 
          def.tags.some(defTag => 
            defTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );

      return matchingDefinitions.slice(0, limit);

    } catch (error) {
      console.error('❌ Get definitions by tags failed:', error);
      return [];
    }
  }

  /**
   * 📈 Get learning statistics
   */
  async getLearningStats(): Promise<any> {
    try {
      const allDefinitions = await db.select().from(learnedDefinitions);
      
      const stats = {
        totalDefinitions: allDefinitions.length,
        domains: {} as Record<string, number>,
        complexityLevels: {} as Record<string, number>,
        averageConfidence: 0,
        averageLearningValue: 0,
        totalAccessCount: 0,
        recentDefinitions: 0 // Last 7 days
      };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      allDefinitions.forEach(def => {
        // Count by domain (field doesn't exist in schema, use default)
        const domain = 'Unknown';
        stats.domains[domain] = (stats.domains[domain] || 0) + 1;

        // Count by complexity (field doesn't exist in schema, use default)
        const complexity = 'intermediate';
        stats.complexityLevels[complexity] = (stats.complexityLevels[complexity] || 0) + 1;

        // Sum for averages
        stats.averageConfidence += (def.confidence_score || 80);
        stats.averageLearningValue += 70; // Field doesn't exist, use default
        stats.totalAccessCount += (def.access_count || 0);

        // Count recent definitions
        if (def.created_at && new Date(def.created_at) > oneWeekAgo) {
          stats.recentDefinitions++;
        }
      });

      // Calculate averages
      if (allDefinitions.length > 0) {
        stats.averageConfidence = (stats.averageConfidence / allDefinitions.length) / 100;
        stats.averageLearningValue = (stats.averageLearningValue / allDefinitions.length) / 100;
      }

      return stats;

    } catch (error) {
      console.error('❌ Get learning stats failed:', error);
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
  async getContextualDefinitions(context: {
    userQuery?: string;
    documentId?: number;
    chapter?: number;
    topics?: string[];
    domain?: string;
  }): Promise<LearnedDefinition[]> {
    const { userQuery, topics, domain } = context;
    const contextualResults: LearnedDefinition[] = [];

    // Search based on user query
    if (userQuery) {
      const queryResults = await this.getRelatedDefinitions(userQuery, 3);
      contextualResults.push(...queryResults);
    }

    // Search based on topics
    if (topics && topics.length > 0) {
      for (const topic of topics.slice(0, 2)) { // Limit to 2 topics
        const topicResults = await this.getRelatedDefinitions(topic, 2);
        contextualResults.push(...topicResults);
      }
    }

    // Search by domain
    if (domain) {
      const domainResults = await this.getDefinitionsByDomain(domain, 3);
      contextualResults.push(...domainResults);
    }

    // Remove duplicates and return top results
    const uniqueResults = contextualResults.filter((def, index, arr) => 
      arr.findIndex(d => d.id === def.id) === index
    );

    return uniqueResults
      .sort((a, b) => (b.confidence * b.learningValue) - (a.confidence * a.learningValue))
      .slice(0, 8); // Return top 8 most relevant definitions
  }
} 