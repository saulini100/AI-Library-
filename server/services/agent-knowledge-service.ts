import { definitionStorage } from './definition-storage-service.js';

interface AgentKnowledgeQuery {
  agentType: string;
  documentId?: number;
  chapter?: number;
  term?: string;
  context?: string;
}

interface SharedKnowledge {
  definitions: any[];
  relatedTerms: string[];
  suggestions: string[];
  confidence: number;
}

export class AgentKnowledgeService {
  private static instance: AgentKnowledgeService;

  private constructor() {}

  static getInstance(): AgentKnowledgeService {
    if (!AgentKnowledgeService.instance) {
      AgentKnowledgeService.instance = new AgentKnowledgeService();
    }
    return AgentKnowledgeService.instance;
  }

  /**
   * Get knowledge for a specific agent type
   */
  async getKnowledgeForAgent(query: AgentKnowledgeQuery): Promise<SharedKnowledge> {
    const { agentType, documentId, chapter, term, context } = query;

    // Get relevant definitions based on query
    let definitions: any[] = [];
    let relatedTerms: string[] = [];

    if (term) {
      // Get specific definition and related terms
      const definition = await definitionStorage.getDefinition(term, documentId);
      if (definition) {
        definitions = [this.formatDefinitionForAgent(definition, agentType)];
        relatedTerms = await definitionStorage.getRelatedTerms(term, documentId);
      }
    } else if (documentId) {
      // Get definitions for document/chapter
      const docDefinitions = await definitionStorage.getDefinitions({
        documentId,
        chapter,
        confidence: 0.7,
        limit: 10
      });
      definitions = docDefinitions.map(def => this.formatDefinitionForAgent(def, agentType));
    } else {
      // Get general high-confidence definitions
      const generalDefinitions = await definitionStorage.getDefinitions({
        confidence: 0.8,
        limit: 5
      });
      definitions = generalDefinitions.map(def => this.formatDefinitionForAgent(def, agentType));
    }

    // Generate suggestions based on agent type and context
    const suggestions = this.generateSuggestionsForAgent(agentType, definitions, context);

    // Calculate overall confidence
    const confidence = definitions.length > 0 
      ? definitions.reduce((acc, def) => acc + def.confidence, 0) / definitions.length
      : 0;

    return {
      definitions,
      relatedTerms,
      suggestions,
      confidence
    };
  }

  /**
   * Check if an agent has access to a definition
   */
  async hasDefinition(agentType: string, term: string, documentId?: number): Promise<boolean> {
    return await definitionStorage.hasDefinition(term, documentId);
  }

  /**
   * Reinforce knowledge when an agent uses a definition
   */
  async reinforceKnowledge(agentType: string, term: string, documentId?: number): Promise<void> {
    console.log(`🔄 Agent ${agentType} used definition: "${term}"`);
    await definitionStorage.reinforceDefinition(term, documentId);
  }

  /**
   * Get suggestions for agent responses
   */
  async getSuggestionsForResponse(
    agentType: string, 
    userMessage: string, 
    documentId?: number
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Extract potential terms from user message
    const words = userMessage.toLowerCase().split(/\s+/);
    const potentialTerms = words.filter(word => word.length > 3);

    for (const term of potentialTerms) {
      const definition = await definitionStorage.getDefinition(term, documentId);
      if (definition) {
        suggestions.push(`Reference definition of "${term}": ${definition.definition.substring(0, 100)}...`);
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Share knowledge between agents
   */
  async shareKnowledgeBetweenAgents(
    fromAgent: string, 
    toAgent: string, 
    term: string, 
    documentId?: number
  ): Promise<boolean> {
    const definition = await definitionStorage.getDefinition(term, documentId);
    if (!definition) {
      return false;
    }

    console.log(`🔄 Knowledge shared: ${fromAgent} → ${toAgent} ("${term}")`);
    await this.reinforceKnowledge(toAgent, term, documentId);
    
    return true;
  }

  /**
   * Get knowledge context for agent prompts
   */
  async getContextForPrompt(
    agentType: string, 
    documentId?: number, 
    maxTerms: number = 5
  ): Promise<string> {
    const knowledge = await this.getKnowledgeForAgent({
      agentType,
      documentId
    });

    if (knowledge.definitions.length === 0) {
      return '';
    }

    const contextTerms = knowledge.definitions
      .slice(0, maxTerms)
      .map(def => `${def.term}: ${def.definition}`)
      .join('\n');

    return `\nRelevant definitions available:\n${contextTerms}\n`;
  }

  // Private helper methods
  private formatDefinitionForAgent(definition: any, agentType: string): any {
    // Customize definition format based on agent type
    const baseFormat = {
      term: definition.term,
      definition: definition.definition,
      confidence: definition.confidence,
      source: 'navigation-agent'
    };

    switch (agentType) {
      case 'discussion':
        return {
          ...baseFormat,
          examples: definition.examples.slice(0, 2), // Fewer examples for discussion
          relatedTerms: definition.relatedTerms.slice(0, 3)
        };

      case 'teacher':
        return {
          ...baseFormat,
          examples: definition.examples, // All examples for teaching
          relatedTerms: definition.relatedTerms,
          context: definition.context,
          teachingNotes: this.generateTeachingNotes(definition)
        };

      case 'quiz':
        return {
          ...baseFormat,
          difficulty: this.assessDifficulty(definition),
          quizPotential: definition.examples.length > 0 ? 'high' : 'medium'
        };

      default:
        return baseFormat;
    }
  }

  private generateSuggestionsForAgent(
    agentType: string, 
    definitions: any[], 
    context?: string
  ): string[] {
    const suggestions: string[] = [];

    if (definitions.length === 0) {
      return suggestions;
    }

    switch (agentType) {
      case 'discussion':
        suggestions.push('Reference stored definitions to enhance conversation');
        if (definitions.length > 1) {
          suggestions.push('Compare related concepts from stored knowledge');
        }
        break;

      case 'teacher':
        suggestions.push('Use stored definitions to provide comprehensive explanations');
        suggestions.push('Reference examples from knowledge base');
        if (definitions.some(def => def.examples?.length > 0)) {
          suggestions.push('Incorporate concrete examples from stored knowledge');
        }
        break;

      case 'quiz':
        suggestions.push('Generate questions based on stored definitions');
        if (definitions.length > 2) {
          suggestions.push('Create comparison questions using related terms');
        }
        break;
    }

    return suggestions;
  }

  private generateTeachingNotes(definition: any): string {
    const notes: string[] = [];
    
    if (definition.examples && definition.examples.length > 0) {
      notes.push('Use examples to illustrate concept');
    }
    
    if (definition.relatedTerms && definition.relatedTerms.length > 0) {
      notes.push('Connect to related concepts');
    }

    if (definition.confidence > 0.9) {
      notes.push('High-confidence definition - use as authoritative source');
    }

    return notes.join('. ');
  }

  private assessDifficulty(definition: any): 'easy' | 'medium' | 'hard' {
    const wordCount = definition.definition.split(' ').length;
    const hasComplexTerms = definition.relatedTerms && definition.relatedTerms.length > 3;
    
    if (wordCount < 20 && !hasComplexTerms) {
      return 'easy';
    } else if (wordCount < 50) {
      return 'medium';
    } else {
      return 'hard';
    }
  }
}

// Export singleton instance
export const agentKnowledgeService = AgentKnowledgeService.getInstance(); 