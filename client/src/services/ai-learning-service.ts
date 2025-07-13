interface LearningData {
  id: string;
  agentSource: 'navigation' | 'voice' | 'chat' | 'auto-learning';
  type: 'definition' | 'insight' | 'analysis' | 'conversation' | 'search-result';
  term: string;
  content: string;
  context: {
    book?: string;
    chapter?: number;
    timestamp: string;
    confidence: number;
  };
  relatedTerms: string[];
  sources: string[];
  metadata?: any;
  bookContext?: string;
  complexity?: 'basic' | 'intermediate' | 'advanced';
}

interface AgentCommunication {
  fromAgent: string;
  toAgent: string | 'all';
  type: 'share-learning' | 'request-info' | 'update-context';
  data: any;
  timestamp: string;
}

export interface FeedbackData {
  messageId: string;
  feedback: 'positive' | 'negative';
  reason?: string;
  documentId?: number;
  chapter?: number;
  userId?: number;
  agentId?: string;
  messageContent?: string;
}

class AILearningService {
  private learningDatabase: Map<string, LearningData> = new Map();
  private agentSubscriptions: Map<string, ((data: AgentCommunication) => void)[]> = new Map();
  private crossReferences: Map<string, string[]> = new Map();

  // Subscribe an agent to receive communications
  subscribeAgent(agentId: string, callback: (data: AgentCommunication) => void) {
    if (!this.agentSubscriptions.has(agentId)) {
      this.agentSubscriptions.set(agentId, []);
    }
    this.agentSubscriptions.get(agentId)!.push(callback);
  }

  // Unsubscribe an agent
  unsubscribeAgent(agentId: string) {
    this.agentSubscriptions.delete(agentId);
  }

  // Add learning data from any agent
  async addLearning(data: LearningData): Promise<void> {
    // Store in local database
    this.learningDatabase.set(data.id, data);
    
    // Update cross-references
    this.updateCrossReferences(data);
    
    // Persist to server (optional - don't fail if server is down)
    try {
      await fetch('/api/ai-learning/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
          } catch (error) {
        console.warn('Server persistence failed, continuing with local storage:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Notify other agents (graceful handling)
      this.safelyBroadcastToAgents({
      fromAgent: data.agentSource,
      toAgent: 'all',
      type: 'share-learning',
      data: {
        term: data.term,
        content: data.content,
        context: data.context,
        relatedTerms: data.relatedTerms
      },
      timestamp: new Date().toISOString()
    });
  }

  // Get learning data by term
  getLearning(term: string): LearningData[] {
    const results: LearningData[] = [];
    
    // Direct matches
    Array.from(this.learningDatabase.entries()).forEach(([id, data]) => {
      if (data.term.toLowerCase().includes(term.toLowerCase()) || 
          data.content.toLowerCase().includes(term.toLowerCase())) {
        results.push(data);
      }
    });

    // Related term matches
    const relatedTerms = this.crossReferences.get(term.toLowerCase()) || [];
    for (const relatedTerm of relatedTerms) {
      Array.from(this.learningDatabase.entries()).forEach(([id, data]) => {
        if (data.term.toLowerCase() === relatedTerm && !results.includes(data)) {
          results.push(data);
        }
      });
    }

    return results.sort((a, b) => b.context.confidence - a.context.confidence);
  }

  // Get contextual learning for a specific book/chapter
  getContextualLearning(book: string, chapter?: number): LearningData[] {
    const results: LearningData[] = [];
    
    Array.from(this.learningDatabase.entries()).forEach(([id, data]) => {
      if (data.context.book?.toLowerCase() === book.toLowerCase()) {
        if (!chapter || data.context.chapter === chapter) {
          results.push(data);
        }
      }
    });

    return results.sort((a, b) => new Date(b.context.timestamp).getTime() - new Date(a.context.timestamp).getTime());
  }

  // Get suggestions based on learned content
  getSmartSuggestions(book?: string, chapter?: number, agentType?: string): string[] {
    const contextualLearning = book ? this.getContextualLearning(book, chapter) : [];
    const recentLearning = Array.from(this.learningDatabase.values())
      .sort((a, b) => new Date(b.context.timestamp).getTime() - new Date(a.context.timestamp).getTime())
      .slice(0, 10);

    const suggestions: string[] = [];

    // Add contextual suggestions
    contextualLearning.slice(0, 3).forEach(data => {
      suggestions.push(`Explain: ${data.term}`);
      data.relatedTerms.slice(0, 2).forEach(term => {
        suggestions.push(`Define: ${term}`);
      });
    });

    // Add recent learning suggestions
    recentLearning.slice(0, 2).forEach(data => {
      if (!suggestions.some(s => s.includes(data.term))) {
        suggestions.push(`More about: ${data.term}`);
      }
    });

    return suggestions.slice(0, 6);
  }

  // Request information from other agents
  async requestInformation(fromAgent: string, query: string, context?: any): Promise<LearningData[]> {
    // First check local learning
    const localResults = this.getLearning(query);
    
    // Safely broadcast request to other agents
    this.safelyBroadcastToAgents({
      fromAgent,
      toAgent: 'all',
      type: 'request-info',
      data: { query, context },
      timestamp: new Date().toISOString()
    });

    return localResults;
  }

  // Share insights between agents
  shareInsight(fromAgent: string, insight: string, context: any, relatedTerms: string[] = []) {
    const learningData: LearningData = {
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentSource: fromAgent as any,
      type: 'insight',
      term: context.term || 'general insight',
      content: insight,
      context: {
        book: context.book,
        chapter: context.chapter,
        timestamp: new Date().toISOString(),
        confidence: 0.8
      },
      relatedTerms,
      sources: context.sources || [],
      metadata: context
    };

    this.addLearning(learningData);
  }

  // Get expert-level insights for a specific book
  async getExpertInsights(bookTitle: string): Promise<{ masteredConcepts: string[] } | null> {
    try {
      // Get all learning data for this book
      const bookLearning = this.getContextualLearning(bookTitle);
      
      if (bookLearning.length === 0) {
        return null;
      }

      // Extract mastered concepts from high-confidence learning data
      const masteredConcepts = bookLearning
        .filter(data => data.context.confidence > 0.7)
        .map(data => data.term)
        .filter((term, index, array) => array.indexOf(term) === index) // Remove duplicates
        .slice(0, 10);

      return {
        masteredConcepts
      };
    } catch (error) {
      console.error('Failed to get expert insights:', error);
      return null;
    }
  }

  // Get agent statistics
  getAgentStats(): { [agentId: string]: { learningCount: number; lastActivity: string } } {
    const stats: { [agentId: string]: { learningCount: number; lastActivity: string } } = {};
    
    Array.from(this.learningDatabase.entries()).forEach(([id, data]) => {
      const agent = data.agentSource;
      if (!stats[agent]) {
        stats[agent] = { learningCount: 0, lastActivity: data.context.timestamp };
      }
      stats[agent].learningCount++;
      if (new Date(data.context.timestamp) > new Date(stats[agent].lastActivity)) {
        stats[agent].lastActivity = data.context.timestamp;
      }
    });

    return stats;
  }

  // Private methods
  private updateCrossReferences(data: LearningData) {
    const term = data.term.toLowerCase();
    
    // Add related terms
    data.relatedTerms.forEach(relatedTerm => {
      const key = relatedTerm.toLowerCase();
      if (!this.crossReferences.has(key)) {
        this.crossReferences.set(key, []);
      }
      if (!this.crossReferences.get(key)!.includes(term)) {
        this.crossReferences.get(key)!.push(term);
      }
    });

    // Add reverse references
    if (!this.crossReferences.has(term)) {
      this.crossReferences.set(term, []);
    }
    data.relatedTerms.forEach(relatedTerm => {
      const key = relatedTerm.toLowerCase();
      if (!this.crossReferences.get(term)!.includes(key)) {
        this.crossReferences.get(term)!.push(key);
      }
    });
  }

  private broadcastToAgents(communication: AgentCommunication) {
    if (communication.toAgent === 'all') {
      // Broadcast to all subscribed agents except sender
      Array.from(this.agentSubscriptions.entries()).forEach(([agentId, callbacks]) => {
        if (agentId !== communication.fromAgent) {
          callbacks.forEach((callback: (data: AgentCommunication) => void) => {
            try {
              callback(communication);
            } catch (error) {
              console.error(`Error broadcasting to agent ${agentId}:`, error);
            }
          });
        }
      });
    } else {
      // Send to specific agent
      const callbacks = this.agentSubscriptions.get(communication.toAgent);
      if (callbacks) {
        callbacks.forEach((callback: (data: AgentCommunication) => void) => {
          try {
            callback(communication);
          } catch (error) {
            console.error(`Error sending to agent ${communication.toAgent}:`, error);
          }
        });
      }
    }
  }

  // Safely broadcast to agents with better error handling
  private safelyBroadcastToAgents(communication: AgentCommunication) {
    const subscribedAgents = Array.from(this.agentSubscriptions.keys());
    const targetAgents = communication.toAgent === 'all' 
      ? subscribedAgents.filter(id => id !== communication.fromAgent)
      : [communication.toAgent];

    if (targetAgents.length === 0) {
      console.info(`🤖 No agents subscribed to receive communication from ${communication.fromAgent}`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    targetAgents.forEach(agentId => {
      const callbacks = this.agentSubscriptions.get(agentId);
      if (callbacks) {
        callbacks.forEach((callback: (data: AgentCommunication) => void) => {
          try {
            callback(communication);
            successCount++;
          } catch (error) {
            errorCount++;
            console.warn(`⚠️ Agent ${agentId} failed to receive communication:`, error instanceof Error ? error.message : 'Unknown error');
          }
        });
      } else {
        console.info(`🤖 Agent ${agentId} not currently subscribed`);
      }
    });

    if (successCount > 0) {
      console.info(`✅ Successfully notified ${successCount} agents about "${communication.data.term}"`);
    }
    if (errorCount > 0) {
      console.warn(`⚠️ Failed to notify ${errorCount} agents (they may not be running)`);
    }
  }

  // Initialize with existing data
  async initialize(): Promise<void> {
    try {
      const response = await fetch('/api/ai-learning/all');
      if (response.ok) {
        const data = await response.json();
        data.learningData.forEach((item: LearningData) => {
          this.learningDatabase.set(item.id, item);
          this.updateCrossReferences(item);
        });
      }
    } catch (error) {
      console.error('Failed to initialize learning service:', error);
    }
  }

  async sendFeedback(feedbackData: FeedbackData): Promise<void> {
    try {
      const response = await fetch('/api/ai-learning/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit feedback' }));
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const aiLearningService = new AILearningService();

// Initialize on import
aiLearningService.initialize();

export type { LearningData, AgentCommunication }; 