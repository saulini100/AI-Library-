import { storage } from '../storage.js';
import { db } from '../db.js';
import { eq, and, desc } from 'drizzle-orm';

interface StoredDefinition {
  id: string;
  term: string;
  definition: string;
  examples: string[];
  relatedTerms: string[];
  sources: string[];
  confidence: number;
  documentId?: number;
  chapter?: number;
  context?: {
    book?: string;
    chapter?: number;
    complexity?: string;
    model?: string;
    gemma3nAnalysis?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  reinforcements: number;
}

interface DefinitionQuery {
  term?: string;
  documentId?: number;
  chapter?: number;
  confidence?: number;
  limit?: number;
}

export class DefinitionStorageService {
  private static instance: DefinitionStorageService;
  private definitions: Map<string, StoredDefinition> = new Map();
  private termIndex: Map<string, Set<string>> = new Map(); // term -> definition IDs
  private documentIndex: Map<number, Set<string>> = new Map(); // documentId -> definition IDs

  private constructor() {
    this.loadDefinitionsFromStorage();
  }

  static getInstance(): DefinitionStorageService {
    if (!DefinitionStorageService.instance) {
      DefinitionStorageService.instance = new DefinitionStorageService();
    }
    return DefinitionStorageService.instance;
  }

  /**
   * Store a new definition or update existing one
   */
  async storeDefinition(
    term: string,
    definition: string,
    options: {
      examples?: string[];
      relatedTerms?: string[];
      sources?: string[];
      confidence?: number;
      documentId?: number;
      chapter?: number;
      context?: any;
      gemma3nAnalysis?: boolean;
    } = {}
  ): Promise<string> {
    const normalizedTerm = this.normalizeTerm(term);
    const existingId = this.findExistingDefinition(normalizedTerm, options.documentId);
    
    if (existingId) {
      // Update existing definition
      return await this.updateDefinition(existingId, definition, options);
    }

    // Create new definition
    const id = `def-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const storedDef: StoredDefinition = {
      id,
      term: normalizedTerm,
      definition,
      examples: options.examples || [],
      relatedTerms: options.relatedTerms || [],
      sources: options.sources || [],
      confidence: options.confidence || 0.8,
      documentId: options.documentId,
      chapter: options.chapter,
      context: {
        ...options.context,
        gemma3nAnalysis: options.gemma3nAnalysis || false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
      reinforcements: 1
    };

    this.definitions.set(id, storedDef);
    this.updateIndexes(id, storedDef);
    await this.persistToStorage();

    console.log(`📚 Definition stored: "${term}" (ID: ${id})`);
    return id;
  }

  /**
   * Retrieve definitions by various criteria
   */
  async getDefinitions(query: DefinitionQuery): Promise<StoredDefinition[]> {
    let results: StoredDefinition[] = [];

    if (query.term) {
      const normalizedTerm = this.normalizeTerm(query.term);
      const definitionIds = this.termIndex.get(normalizedTerm) || new Set();
      results = Array.from(definitionIds).map(id => this.definitions.get(id)!).filter(Boolean);
    } else if (query.documentId) {
      const definitionIds = this.documentIndex.get(query.documentId) || new Set();
      results = Array.from(definitionIds).map(id => this.definitions.get(id)!).filter(Boolean);
    } else {
      results = Array.from(this.definitions.values());
    }

    // Apply additional filters
    if (query.confidence !== undefined) {
      results = results.filter(def => def.confidence >= query.confidence!);
    }

    // Sort by confidence and recency
    results.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Update access count for retrieved definitions
    results.forEach(def => {
      def.accessCount++;
      this.definitions.set(def.id, def);
    });

    return results;
  }

  /**
   * Get a specific definition by term (most confident match)
   */
  async getDefinition(term: string, documentId?: number): Promise<StoredDefinition | null> {
    const results = await this.getDefinitions({ 
      term, 
      documentId, 
      limit: 1 
    });
    return results[0] || null;
  }

  /**
   * Check if a definition exists for a term
   */
  async hasDefinition(term: string, documentId?: number): Promise<boolean> {
    const def = await this.getDefinition(term, documentId);
    return def !== null;
  }

  /**
   * Reinforce a definition (increase confidence and reinforcement count)
   */
  async reinforceDefinition(termOrId: string, documentId?: number): Promise<boolean> {
    let definition: StoredDefinition | null = null;

    // Try to find by ID first, then by term
    if (this.definitions.has(termOrId)) {
      definition = this.definitions.get(termOrId)!;
    } else {
      definition = await this.getDefinition(termOrId, documentId);
    }

    if (!definition) {
      return false;
    }

    definition.reinforcements++;
    definition.confidence = Math.min(0.99, definition.confidence + 0.05);
    definition.updatedAt = new Date();
    
    this.definitions.set(definition.id, definition);
    await this.persistToStorage();

    console.log(`🔄 Definition reinforced: "${definition.term}" (confidence: ${definition.confidence.toFixed(2)})`);
    return true;
  }

  /**
   * Get related terms for a given term
   */
  async getRelatedTerms(term: string, documentId?: number): Promise<string[]> {
    const definition = await this.getDefinition(term, documentId);
    if (!definition) {
      return [];
    }

    const related = new Set(definition.relatedTerms);
    
    // Find terms that reference this term in their related terms
    for (const def of Array.from(this.definitions.values())) {
      if (def.relatedTerms.includes(term) && def.term !== term) {
        related.add(def.term);
      }
    }

    return Array.from(related);
  }

  /**
   * Get definitions that need learning reinforcement
   */
  async getDefinitionsForLearning(threshold: number = 5): Promise<StoredDefinition[]> {
    return Array.from(this.definitions.values())
      .filter(def => def.accessCount >= threshold || def.reinforcements >= 3)
      .sort((a, b) => (b.accessCount + b.reinforcements) - (a.accessCount + a.reinforcements));
  }

  /**
   * Export definitions for other agents
   */
  async exportDefinitionsForAgent(agentType: string, documentId?: number): Promise<any[]> {
    const query: DefinitionQuery = { confidence: 0.6 };
    if (documentId) {
      query.documentId = documentId;
    }

    const definitions = await this.getDefinitions(query);
    
    return definitions.map(def => ({
      term: def.term,
      definition: def.definition,
      examples: def.examples,
      relatedTerms: def.relatedTerms,
      confidence: def.confidence,
      context: def.context,
      source: 'navigation-agent'
    }));
  }

  /**
   * Clear old or low-confidence definitions
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000, minConfidence: number = 0.3): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [id, definition] of Array.from(this.definitions.entries())) {
      if (definition.createdAt < cutoffDate && definition.confidence < minConfidence && definition.accessCount < 2) {
        this.definitions.delete(id);
        this.removeFromIndexes(id, definition);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.persistToStorage();
      console.log(`🧹 Cleaned up ${cleaned} old definitions`);
    }

    return cleaned;
  }

  // Private helper methods
  private normalizeTerm(term: string): string {
    return term.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  private findExistingDefinition(term: string, documentId?: number): string | null {
    const definitionIds = this.termIndex.get(term) || new Set();
    
    for (const id of Array.from(definitionIds)) {
      const def = this.definitions.get(id);
      if (def && (!documentId || def.documentId === documentId)) {
        return id;
      }
    }
    
    return null;
  }

  private async updateDefinition(
    id: string, 
    definition: string, 
    options: any
  ): Promise<string> {
    const existing = this.definitions.get(id)!;
    
    existing.definition = definition;
    existing.examples = options.examples || existing.examples;
    existing.relatedTerms = options.relatedTerms || existing.relatedTerms;
    existing.sources = Array.from(new Set([...existing.sources, ...(options.sources || [])]));
    existing.confidence = Math.max(existing.confidence, options.confidence || 0.8);
    existing.updatedAt = new Date();
    existing.reinforcements++;
    
    if (options.context) {
      existing.context = { ...existing.context, ...options.context };
    }

    this.definitions.set(id, existing);
    await this.persistToStorage();

    console.log(`📝 Definition updated: "${existing.term}" (ID: ${id})`);
    return id;
  }

  private updateIndexes(id: string, definition: StoredDefinition): void {
    // Update term index
    if (!this.termIndex.has(definition.term)) {
      this.termIndex.set(definition.term, new Set());
    }
    this.termIndex.get(definition.term)!.add(id);

    // Update document index
    if (definition.documentId) {
      if (!this.documentIndex.has(definition.documentId)) {
        this.documentIndex.set(definition.documentId, new Set());
      }
      this.documentIndex.get(definition.documentId)!.add(id);
    }
  }

  private removeFromIndexes(id: string, definition: StoredDefinition): void {
    // Remove from term index
    const termSet = this.termIndex.get(definition.term);
    if (termSet) {
      termSet.delete(id);
      if (termSet.size === 0) {
        this.termIndex.delete(definition.term);
      }
    }

    // Remove from document index
    if (definition.documentId) {
      const docSet = this.documentIndex.get(definition.documentId);
      if (docSet) {
        docSet.delete(id);
        if (docSet.size === 0) {
          this.documentIndex.delete(definition.documentId);
        }
      }
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const data = {
        definitions: Array.from(this.definitions.entries()),
        timestamp: Date.now()
      };
      // Store in memory for now - can be extended to database later
      (storage as any)._definitionData = data;
    } catch (error) {
      console.error('Failed to persist definitions:', error);
    }
  }

  private async loadDefinitionsFromStorage(): Promise<void> {
    try {
      const data = (storage as any)._definitionData;
      if (data && data.definitions) {
        this.definitions.clear();
        this.termIndex.clear();
        this.documentIndex.clear();

                 for (const [id, definition] of (data.definitions as [string, StoredDefinition][])) {
          this.definitions.set(id, {
            ...definition,
            createdAt: new Date(definition.createdAt),
            updatedAt: new Date(definition.updatedAt)
          });
          this.updateIndexes(id, definition);
        }

        console.log(`📚 Loaded ${this.definitions.size} definitions from storage`);
      }
    } catch (error) {
      console.error('Failed to load definitions from storage:', error);
    }
  }
}

// Export singleton instance
export const definitionStorage = DefinitionStorageService.getInstance(); 