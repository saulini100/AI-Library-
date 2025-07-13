import { MultiModelService } from '../services/multi-model-service.js';
import { AdaptiveLearningService } from '../services/adaptive-learning-service.js';
import { SemanticSearchService, SearchContext } from '../services/semantic-search-service.js';
import { LocalMemoryService } from '../services/LocalMemoryService.js';

export interface EnhancedAgentCapabilities {
  multiModel: boolean;
  adaptiveLearning: boolean;
  semanticSearch: boolean;
  personalizedRecommendations: boolean;
}

export interface UserInteractionContext {
  userId: number;
  sessionId?: string;
  currentDocument?: number;
  currentChapter?: number;
  userExpertiseLevel: number;
  recentQueries: string[];
  preferredTopics: string[];
  learningGoals: string[];
}

export interface EnhancedResponse {
  primaryResponse: string;
  modelUsed: string;
  executionTime: number;
  relatedConcepts: string[];
  suggestedQuestions: string[];
  personalizedInsights: string[];
  nextRecommendations: string[];
  confidenceScore: number;
}

export class EnhancedAgentCoordinator {
  private multiModel: MultiModelService;
  private adaptiveLearning: AdaptiveLearningService;
  private semanticSearch: SemanticSearchService;
  private memory: LocalMemoryService;
  private capabilities: EnhancedAgentCapabilities;

  constructor(capabilities: Partial<EnhancedAgentCapabilities> = {}) {
    this.capabilities = {
      multiModel: true,
      adaptiveLearning: true,
      semanticSearch: true,
      personalizedRecommendations: true,
      ...capabilities
    };

    this.multiModel = new MultiModelService();
    this.adaptiveLearning = new AdaptiveLearningService();
    this.semanticSearch = new SemanticSearchService();
    this.memory = LocalMemoryService.getInstance();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Enhanced Agent Coordinator...');
    
    const initPromises: Promise<void>[] = [];

    if (this.capabilities.multiModel) {
      initPromises.push(this.multiModel.initialize());
    }

    if (this.capabilities.adaptiveLearning) {
      initPromises.push(this.adaptiveLearning.initialize());
    }

    if (this.capabilities.semanticSearch) {
      initPromises.push(this.semanticSearch.initialize());
    }

    await Promise.all(initPromises);
    
    console.log('✅ Enhanced Agent Coordinator ready with Phase 2 Intelligence capabilities!');
  }

  // 🎯 INTELLIGENT TASK ROUTING
  async handleUserInteraction(
    query: string,
    interactionType: 'question' | 'search' | 'analysis' | 'chat' | 'exploration',
    context: UserInteractionContext
  ): Promise<EnhancedResponse> {
    
    console.log(`🎯 Processing ${interactionType}: "${query.substring(0, 50)}..."`);
    const startTime = performance.now();

    try {
      // Step 1: Analyze query and determine optimal approach
      const queryAnalysis = await this.analyzeQuery(query, interactionType, context);
      
      // Step 2: Route to appropriate services based on query type
      let response: EnhancedResponse;
      
      switch (queryAnalysis.recommendedApproach) {
        case 'semantic-search':
          response = await this.handleSemanticSearch(query, context, queryAnalysis);
          break;
        case 'adaptive-learning':
          response = await this.handleAdaptiveLearning(query, context, queryAnalysis);
          break;
        case 'multi-model-analysis':
          response = await this.handleMultiModelAnalysis(query, context, queryAnalysis);
          break;
        case 'hybrid':
        default:
          response = await this.handleHybridApproach(query, context, queryAnalysis);
          break;
      }

      // Step 3: Post-process and enhance response
      const enhancedResponse = await this.enhanceResponse(response, context);
      
      // Step 4: Update user context and learning progress
      if (this.capabilities.adaptiveLearning && context.sessionId) {
        await this.updateLearningProgress(context.sessionId, query, enhancedResponse);
      }

      const totalTime = performance.now() - startTime;
      console.log(`✅ Enhanced interaction completed in ${totalTime.toFixed(2)}ms`);

      return {
        ...enhancedResponse,
        executionTime: totalTime
      };

    } catch (error) {
      console.error(`❌ Enhanced interaction failed: ${error}`);
      
      // Fallback to basic response
      return {
        primaryResponse: `I encountered an issue processing your request: "${query}". Let me try a different approach.`,
        modelUsed: 'fallback',
        executionTime: performance.now() - startTime,
        relatedConcepts: [],
        suggestedQuestions: [],
        personalizedInsights: [],
        nextRecommendations: [],
        confidenceScore: 0.3
      };
    }
  }

  // 🧠 ANALYZE QUERY TO DETERMINE OPTIMAL APPROACH
  private async analyzeQuery(
    query: string,
    interactionType: string,
    context: UserInteractionContext
  ): Promise<{
    queryComplexity: number;
    recommendedApproach: 'semantic-search' | 'adaptive-learning' | 'multi-model-analysis' | 'hybrid';
    requiredCapabilities: string[];
    userIntent: string;
    semanticContext: string[];
  }> {
    
    if (!this.capabilities.multiModel) {
      return {
        queryComplexity: 5,
        recommendedApproach: 'semantic-search',
        requiredCapabilities: ['basic'],
        userIntent: interactionType,
        semanticContext: context.preferredTopics
      };
    }

    const analysisPrompt = `Analyze this user query to determine the optimal AI approach:

Query: "${query}"
Interaction type: ${interactionType}
User expertise level: ${context.userExpertiseLevel}/10
Recent queries: ${context.recentQueries.join(', ')}
Preferred topics: ${context.preferredTopics.join(', ')}

Available capabilities:
- Multi-model selection for task-specific optimization
- Adaptive learning with personalized content
- Semantic search with concept exploration
- Hybrid approaches combining multiple methods

Provide JSON response:
{
  "query_complexity": 1-10,
  "recommended_approach": "semantic-search|adaptive-learning|multi-model-analysis|hybrid",
  "required_capabilities": ["capability1", "capability2"],
  "user_intent": "specific intent description",
  "semantic_context": ["context1", "context2", "context3"]
}`;

    try {
      const result = await this.multiModel.executeTask('text-analysis', analysisPrompt, {
        requirements: { reasoning: 8, accuracy: 8, speed: 7 }
      });

      const analysis = JSON.parse(result.response);

      return {
        queryComplexity: Math.max(1, Math.min(10, analysis.query_complexity || 5)),
        recommendedApproach: analysis.recommended_approach || 'hybrid',
        requiredCapabilities: analysis.required_capabilities || [],
        userIntent: analysis.user_intent || interactionType,
        semanticContext: analysis.semantic_context || context.preferredTopics
      };

    } catch (error) {
      console.error(`❌ Query analysis failed: ${error}`);
      return {
        queryComplexity: 5,
        recommendedApproach: 'hybrid',
        requiredCapabilities: ['multi-model'],
        userIntent: interactionType,
        semanticContext: context.preferredTopics
      };
    }
  }

  // 🔍 HANDLE SEMANTIC SEARCH APPROACH
  private async handleSemanticSearch(
    query: string,
    context: UserInteractionContext,
    analysis: any
  ): Promise<EnhancedResponse> {
    
    if (!this.capabilities.semanticSearch) {
      throw new Error('Semantic search capability not available');
    }

    const searchContext: SearchContext = {
      userId: context.userId,
      currentDocument: context.currentDocument,
      currentChapter: context.currentChapter,
      recentQueries: context.recentQueries,
      userExpertiseLevel: context.userExpertiseLevel,
      preferredTopics: context.preferredTopics
    };

    // Perform semantic search
    const searchResults = await this.semanticSearch.search(query, searchContext, {
      maxResults: 10,
      includeMemories: true,
      includeAnnotations: true
    });

    // Generate comprehensive response from search results
    const responseText = await this.synthesizeSearchResults(searchResults, query, context);

    return {
      primaryResponse: responseText,
      modelUsed: 'semantic-search',
      executionTime: 0, // Will be set by caller
      relatedConcepts: searchResults.flatMap(r => r.relatedConcepts).slice(0, 5),
      suggestedQuestions: searchResults.flatMap(r => r.suggestedQuestions).slice(0, 3),
      personalizedInsights: [],
      nextRecommendations: [],
      confidenceScore: searchResults.length > 0 ? 0.8 : 0.4
    };
  }

  // 🎓 HANDLE ADAPTIVE LEARNING APPROACH
  private async handleAdaptiveLearning(
    query: string,
    context: UserInteractionContext,
    analysis: any
  ): Promise<EnhancedResponse> {
    
    if (!this.capabilities.adaptiveLearning || !context.sessionId) {
      throw new Error('Adaptive learning capability not available or no session');
    }

    // Get personalized recommendations
    const recommendations = await this.adaptiveLearning.getPersonalizedRecommendations(
      context.userId,
      5
    );

    // Generate adaptive response based on user's learning level
    const adaptivePrompt = `Provide a personalized learning response for this query:

Query: "${query}"
User expertise level: ${context.userExpertiseLevel}/10
Learning goals: ${context.learningGoals.join(', ')}
Preferred topics: ${context.preferredTopics.join(', ')}

Personalized suggestions: ${recommendations.suggestedTopics.join(', ')}

Adapt your response to match the user's learning level and provide:
1. Clear explanation appropriate for their expertise level
2. Connections to their preferred topics
3. Specific learning suggestions
4. Encouragement for continued growth`;

    const result = await this.multiModel.executeTask('theological-reasoning', adaptivePrompt, {
      requirements: { reasoning: 8, creativity: 7, accuracy: 8 }
    });

    return {
      primaryResponse: result.response,
      modelUsed: result.modelUsed,
      executionTime: result.executionTime,
      relatedConcepts: recommendations.suggestedTopics,
      suggestedQuestions: recommendations.personalizedQuestions,
      personalizedInsights: [`Personalized for your Level ${context.userExpertiseLevel} expertise`],
      nextRecommendations: recommendations.suggestedTopics.slice(0, 3),
      confidenceScore: 0.85
    };
  }

  // 🎯 HANDLE MULTI-MODEL ANALYSIS APPROACH
  private async handleMultiModelAnalysis(
    query: string,
    context: UserInteractionContext,
    analysis: any
  ): Promise<EnhancedResponse> {
    
    if (!this.capabilities.multiModel) {
      throw new Error('Multi-model capability not available');
    }

    // Determine the best task type based on query
    const taskType = this.determineTaskType(query, analysis.userIntent);
    
    // Execute with optimal model selection
    const result = await this.multiModel.executeTask(taskType, query, {
      requirements: this.getTaskRequirements(analysis.queryComplexity, context.userExpertiseLevel)
    });

    // Generate related concepts and questions
    const enhancement = await this.generateEnhancementData(result.response, context);

    return {
      primaryResponse: result.response,
      modelUsed: result.modelUsed,
      executionTime: result.executionTime,
      relatedConcepts: enhancement.concepts,
      suggestedQuestions: enhancement.questions,
      personalizedInsights: enhancement.insights,
      nextRecommendations: enhancement.recommendations,
      confidenceScore: 0.9
    };
  }

  // 🔄 HANDLE HYBRID APPROACH (COMBINES MULTIPLE METHODS)
  private async handleHybridApproach(
    query: string,
    context: UserInteractionContext,
    analysis: any
  ): Promise<EnhancedResponse> {
    
    console.log('🔄 Executing hybrid approach with multiple intelligence methods');

    // Execute multiple approaches in parallel
    const approaches: Promise<Partial<EnhancedResponse>>[] = [];

    // Always include multi-model analysis
    if (this.capabilities.multiModel) {
      approaches.push(
        this.handleMultiModelAnalysis(query, context, analysis)
          .catch(error => ({ primaryResponse: '', confidenceScore: 0 }))
      );
    }

    // Include semantic search for broader context
    if (this.capabilities.semanticSearch) {
      approaches.push(
        this.handleSemanticSearch(query, context, analysis)
          .catch(error => ({ relatedConcepts: [], suggestedQuestions: [] }))
      );
    }

    // Include adaptive learning insights
    if (this.capabilities.adaptiveLearning && context.sessionId) {
      approaches.push(
        this.handleAdaptiveLearning(query, context, analysis)
          .catch(error => ({ personalizedInsights: [], nextRecommendations: [] }))
      );
    }

    const results = await Promise.all(approaches);

    // Combine results intelligently
    const combinedResponse = this.combineHybridResults(results, context);

    return combinedResponse;
  }

  // 🎨 SYNTHESIZE SEARCH RESULTS INTO COHERENT RESPONSE
  private async synthesizeSearchResults(
    searchResults: any[],
    originalQuery: string,
    context: UserInteractionContext
  ): Promise<string> {
    
    if (searchResults.length === 0) {
      return `I couldn't find specific information about "${originalQuery}" in your documents. Would you like me to provide general information about this topic or help you search for related concepts?`;
    }

    const synthesisPrompt = `Synthesize these search results into a coherent response for the user's query:

Original query: "${originalQuery}"
User expertise level: ${context.userExpertiseLevel}/10

Search results:
${searchResults.slice(0, 5).map((result, index) => 
  `${index + 1}. ${result.content.substring(0, 300)}...`
).join('\n\n')}

Create a comprehensive response that:
1. Directly answers the user's query
2. Synthesizes information from multiple sources
3. Maintains appropriate depth for their expertise level
4. Provides clear, actionable insights`;

    try {
      if (this.capabilities.multiModel) {
        const result = await this.multiModel.executeTask('theological-reasoning', synthesisPrompt, {
          requirements: { reasoning: 9, accuracy: 8, creativity: 6 }
        });
        return result.response;
      } else {
        // Fallback to simple synthesis
        return `Based on your query about "${originalQuery}", I found ${searchResults.length} relevant results. ${searchResults[0]?.content.substring(0, 200)}...`;
      }
    } catch (error) {
      return `I found ${searchResults.length} results related to "${originalQuery}". Here's what I discovered: ${searchResults[0]?.content.substring(0, 300)}...`;
    }
  }

  // 🚀 ENHANCE RESPONSE WITH ADDITIONAL INSIGHTS
  private async enhanceResponse(
    response: EnhancedResponse,
    context: UserInteractionContext
  ): Promise<EnhancedResponse> {
    
    // Store interaction in memory for future personalization
    await this.memory.storeMemory(
      context.userId,
      JSON.stringify({
        query: response.primaryResponse.substring(0, 100),
        modelUsed: response.modelUsed,
        confidenceScore: response.confidenceScore
      }),
      'ai_interaction',
      { 
        modelUsed: response.modelUsed,
        executionTime: response.executionTime
      }
    );

    return response;
  }

  // 📊 UPDATE LEARNING PROGRESS
  private async updateLearningProgress(
    sessionId: string,
    query: string,
    response: EnhancedResponse
  ): Promise<void> {
    
    if (!this.capabilities.adaptiveLearning) return;

    await this.adaptiveLearning.updateLearningProgress(sessionId, {
      questionAsked: query,
      conceptExplored: response.relatedConcepts[0],
      comprehensionScore: response.confidenceScore,
      engagementLevel: response.relatedConcepts.length > 0 ? 8 : 5
    });
  }

  // 🔧 UTILITY METHODS
  private determineTaskType(query: string, userIntent: string): string {
    const intentMapping: Record<string, string> = {
      'question': 'theological-reasoning',
      'analysis': 'text-analysis',
      'search': 'semantic-search',
      'exploration': 'creative-insights',
      'chat': 'theological-reasoning'
    };

    return intentMapping[userIntent] || 'theological-reasoning';
  }

  private getTaskRequirements(complexity: number, userLevel: number): any {
    const baseRequirements = {
      accuracy: 8,
      reasoning: 7,
      creativity: 6,
      speed: 7
    };

    // Adjust requirements based on complexity and user level
    if (complexity > 7) {
      baseRequirements.reasoning = 9;
      baseRequirements.accuracy = 9;
    }

    if (userLevel > 7) {
      baseRequirements.reasoning = 9;
      baseRequirements.creativity = 8;
    }

    return baseRequirements;
  }

  private async generateEnhancementData(
    response: string,
    context: UserInteractionContext
  ): Promise<{
    concepts: string[];
    questions: string[];
    insights: string[];
    recommendations: string[];
  }> {
    
    const enhancementPrompt = `Generate enhancement data for this AI response:

Response: ${response.substring(0, 1000)}
User expertise: Level ${context.userExpertiseLevel}/10

Generate JSON:
{
  "related_concepts": ["concept1", "concept2", "concept3"],
  "follow_up_questions": ["question1", "question2"],
  "personalized_insights": ["insight1", "insight2"],
  "next_recommendations": ["recommendation1", "recommendation2"]
}`;

    try {
      if (this.capabilities.multiModel) {
        const result = await this.multiModel.executeTask('creative-insights', enhancementPrompt, {
          requirements: { creativity: 7, reasoning: 6 }
        });

        const enhancement = JSON.parse(result.response);
        
        return {
          concepts: enhancement.related_concepts || [],
          questions: enhancement.follow_up_questions || [],
          insights: enhancement.personalized_insights || [],
          recommendations: enhancement.next_recommendations || []
        };
      }
    } catch (error) {
      console.error(`❌ Failed to generate enhancement data: ${error}`);
    }

    return {
      concepts: context.preferredTopics.slice(0, 3),
      questions: [],
      insights: [],
      recommendations: []
    };
  }

  private combineHybridResults(
    results: Partial<EnhancedResponse>[],
    context: UserInteractionContext
  ): EnhancedResponse {
    
    // Find the result with the highest confidence
    const primaryResult = results.reduce((best, current) => 
      (current.confidenceScore || 0) > (best.confidenceScore || 0) ? current : best
    , results[0]);

    // Combine all enhancement data
    const allConcepts = results.flatMap(r => r.relatedConcepts || []);
    const allQuestions = results.flatMap(r => r.suggestedQuestions || []);
    const allInsights = results.flatMap(r => r.personalizedInsights || []);
    const allRecommendations = results.flatMap(r => r.nextRecommendations || []);

    return {
      primaryResponse: primaryResult.primaryResponse || 'I apologize, but I encountered an issue processing your request.',
      modelUsed: `hybrid-${primaryResult.modelUsed || 'multiple'}`,
      executionTime: 0, // Will be set by caller
      relatedConcepts: Array.from(new Set(allConcepts)).slice(0, 5),
      suggestedQuestions: Array.from(new Set(allQuestions)).slice(0, 3),
      personalizedInsights: Array.from(new Set(allInsights)).slice(0, 3),
      nextRecommendations: Array.from(new Set(allRecommendations)).slice(0, 3),
      confidenceScore: Math.max(...results.map(r => r.confidenceScore || 0))
    };
  }

  // 📊 GET SYSTEM ANALYTICS
  getSystemAnalytics(): {
    multiModelPerformance: any;
    adaptiveLearningStats: any;
    semanticSearchStats: any;
    overallCapabilities: EnhancedAgentCapabilities;
  } {
    return {
      multiModelPerformance: this.capabilities.multiModel ? 
        this.multiModel.getModelPerformanceReport() : null,
      adaptiveLearningStats: this.capabilities.adaptiveLearning ? 
        this.adaptiveLearning.getSystemAnalytics() : null,
      semanticSearchStats: this.capabilities.semanticSearch ? 
        this.semanticSearch.getSearchAnalytics() : null,
      overallCapabilities: this.capabilities
    };
  }

  // 🎯 START ADAPTIVE LEARNING SESSION
  async startAdaptiveLearningSession(
    userId: number,
    documentId: number
  ): Promise<string | null> {
    if (!this.capabilities.adaptiveLearning) return null;
    
    return await this.adaptiveLearning.startLearningSession(userId, documentId);
  }

  // 🏁 END ADAPTIVE LEARNING SESSION
  async endAdaptiveLearningSession(sessionId: string): Promise<any> {
    if (!this.capabilities.adaptiveLearning) return null;
    
    return await this.adaptiveLearning.endLearningSession(sessionId);
  }

  // 🎭 EXPLORE CONCEPT WITH FULL INTELLIGENCE
  async exploreConcept(
    concept: string,
    context: UserInteractionContext,
    depth: 'surface' | 'medium' | 'deep' = 'medium'
  ): Promise<any> {
    if (!this.capabilities.semanticSearch) return null;

    const searchContext: SearchContext = {
      userId: context.userId,
      currentDocument: context.currentDocument,
      currentChapter: context.currentChapter,
      recentQueries: context.recentQueries,
      userExpertiseLevel: context.userExpertiseLevel,
      preferredTopics: context.preferredTopics
    };

    return await this.semanticSearch.exploreConcept(concept, searchContext, depth);
  }
} 