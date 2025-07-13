import { Router } from 'express';
import { EnhancedAgentCoordinator } from '../agents/enhanced-agent-coordinator.js';
import { MultiModelService } from '../services/multi-model-service.js';
import { AdaptiveLearningService } from '../services/adaptive-learning-service.js';
import { SemanticSearchService } from '../services/semantic-search-service.js';
import { storage } from '../storage';
import { agentManager } from '../agents/agent-manager.js';

const router = Router();

// Initialize Phase 2 Intelligence services
const enhancedCoordinator = new EnhancedAgentCoordinator({
  multiModel: true,
  adaptiveLearning: true,
  semanticSearch: true,
  personalizedRecommendations: true
});

// Initialize MultiModelService with local Ollama models only
const multiModelService = new MultiModelService();
const adaptiveLearningService = new AdaptiveLearningService();
const semanticSearchService = new SemanticSearchService();

// Initialize services (this would typically be done in server startup)
let servicesInitialized = false;
const initializeServices = async () => {
  if (!servicesInitialized) {
    await enhancedCoordinator.initialize();
    servicesInitialized = true;
  }
};

// 🚀 AGENT STATUS ENDPOINTS
router.get('/intelligence/agents/status', async (req, res) => {
  try {
    const systemStatus = agentManager.getSystemStatus();
    
    // Transform agent data to match frontend expectations
    const agents = systemStatus.agents.map((agent: any) => ({
      name: agent.name || 'Unknown Agent',
      status: agent.isRunning ? 'active' : 'inactive',
      tasksCompleted: agent.tasksCompleted || 0,
      averageResponseTime: agent.averageResponseTime || 0,
      specialties: agent.specialties || ['General AI'],
      lastActivity: agent.lastActivity || 'Never',
      uptime: agent.uptime || 0,
      description: agent.description || 'AI Agent'
    }));

    res.json({
      success: true,
      agents,
      systemStatus: {
        isRunning: systemStatus.isRunning,
        totalAgents: systemStatus.totalAgents,
        activeAgents: systemStatus.activeAgents,
        uptime: systemStatus.uptime,
        mcpEnabled: systemStatus.mcpEnabled,
        activeMCPSessions: systemStatus.activeMCPSessions
      }
    });

  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent status',
      agents: [],
      systemStatus: {
        isRunning: false,
        totalAgents: 0,
        activeAgents: 0,
        uptime: 0,
        mcpEnabled: false,
        activeMCPSessions: 0
      }
    });
  }
});

// 🚀 AGENT INTERACTIONS ENDPOINT
router.get('/intelligence/agents/interactions', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // For now, return mock interaction data since we don't have a interaction logging system yet
    // In a real implementation, this would fetch from a database of agent interactions
    const mockInteractions = [
      {
        id: '1',
        agentName: 'DiscussionAgent',
        type: 'discussion',
        message: 'User asked about biblical themes',
        response: 'Provided analysis of faith and hope themes',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        responseTime: 1250,
        success: true
      },
      {
        id: '2',
        agentName: 'QuizAgent',
        type: 'quiz_generation',
        message: 'Generate quiz for Chapter 3',
        response: 'Generated 5 multiple-choice questions',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        responseTime: 2100,
        success: true
      },
      {
        id: '3',
        agentName: 'TextAnalysisAgent',
        type: 'analysis',
        message: 'Analyze document content',
        response: 'Completed sentiment and theme analysis',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        responseTime: 3400,
        success: true
      }
    ];

    res.json({
      success: true,
      interactions: mockInteractions.slice(Number(offset), Number(offset) + Number(limit)),
      total: mockInteractions.length,
      hasMore: Number(offset) + Number(limit) < mockInteractions.length
    });

  } catch (error) {
    console.error('Interactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interactions',
      interactions: [],
      total: 0,
      hasMore: false
    });
  }
});

// 🚀 ENHANCED AI INTERACTION ENDPOINT
router.post('/enhanced-interaction', async (req, res) => {
  try {
    await initializeServices();

    const {
      query,
      interactionType = 'question',
      userId,
      sessionId,
      currentDocument,
      currentChapter,
      userExpertiseLevel = 5,
      recentQueries = [],
      preferredTopics = [],
      learningGoals = []
    } = req.body;

    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      });
    }

    const context = {
      userId,
      sessionId,
      currentDocument,
      currentChapter,
      userExpertiseLevel,
      recentQueries,
      preferredTopics,
      learningGoals
    };

    const response = await enhancedCoordinator.handleUserInteraction(
      query,
      interactionType,
      context
    );

    res.json({
      success: true,
      response,
      phase2Capabilities: {
        multiModel: true,
        adaptiveLearning: true,
        semanticSearch: true,
        personalizedRecommendations: true
      }
    });

  } catch (error) {
    console.error('Enhanced interaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process enhanced interaction'
    });
  }
});

// 🎯 MULTI-MODEL SERVICE ENDPOINTS
router.get('/intelligence/models/available', async (req, res) => {
  try {
    await initializeServices();
    
    const availableModels = multiModelService.getAvailableModels();
    const taskTypes = multiModelService.getTaskTypes();
    const performanceReport = multiModelService.getModelPerformanceReport();

    res.json({
      success: true,
      data: {
        availableModels,
        taskTypes,
        performanceReport,
        mode: 'Local Ollama'
      }
    });

  } catch (error) {
    console.error('Model info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model information',
      data: {
        availableModels: [],
        taskTypes: [],
        performanceReport: {},
        mode: 'Local Ollama'
      }
    });
  }
});

// 💰 LOCAL OLLAMA COST INFO ENDPOINT
router.get('/models/cost-analytics', async (req, res) => {
  try {
    // Local Ollama models are completely free
    res.json({
      success: true,
      data: {
        message: 'Local Ollama models are completely free!',
        totalCost: 0,
        mode: 'Local Ollama (Free)',
        costOptimization: {
          freeModelsUsed: 100,
          potentialSavings: '100% free - no API costs',
          monthlyCostEstimate: '$0.00 (Local Ollama is always free)'
        }
      }
    });
  } catch (error) {
    console.error('Cost analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cost analytics'
    });
  }
});

router.post('/models/execute-task', async (req, res) => {
  try {
    await initializeServices();

    const {
      taskType,
      prompt,
      requirements,
      temperature,
      maxTokens
    } = req.body;

    if (!taskType || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'TaskType and prompt are required'
      });
    }

    const result = await multiModelService.executeTask(taskType, prompt, {
      requirements,
      temperature,
      maxTokens
    });

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Task execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute task'
    });
  }
});

router.post('/models/analyze-text', async (req, res) => {
  try {
    await initializeServices();

    const { text, analysisType = 'themes' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for analysis'
      });
    }

    const analysis = await multiModelService.analyzeText(text, analysisType);

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze text'
    });
  }
});

// 🎓 ADAPTIVE LEARNING ENDPOINTS
router.post('/learning/start-session', async (req, res) => {
  try {
    await initializeServices();

    const { userId, documentId } = req.body;

    if (!userId || !documentId) {
      return res.status(400).json({
        success: false,
        error: 'UserId and documentId are required'
      });
    }

    const sessionId = await enhancedCoordinator.startAdaptiveLearningSession(userId, documentId);

    res.json({
      success: true,
      sessionId,
      message: 'Adaptive learning session started'
    });

  } catch (error) {
    console.error('Learning session start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start learning session'
    });
  }
});

router.post('/learning/end-session', async (req, res) => {
  try {
    await initializeServices();

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'SessionId is required'
      });
    }

    const results = await enhancedCoordinator.endAdaptiveLearningSession(sessionId);

    res.json({
      success: true,
      results,
      message: 'Learning session completed successfully'
    });

  } catch (error) {
    console.error('Learning session end error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end learning session'
    });
  }
});

router.get('/learning/recommendations/:userId', async (req, res) => {
  try {
    await initializeServices();

    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 5;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const recommendations = await adaptiveLearningService.getPersonalizedRecommendations(userId, limit);

    res.json({
      success: true,
      recommendations
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get personalized recommendations'
    });
  }
});

router.get('/learning/analytics/:userId', async (req, res) => {
  try {
    await initializeServices();

    const userId = parseInt(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const analytics = await adaptiveLearningService.getUserLearningAnalytics(userId);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Learning analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get learning analytics'
    });
  }
});

// 🔍 SEMANTIC SEARCH ENDPOINTS
router.post('/search/semantic', async (req, res) => {
  try {
    await initializeServices();

    const {
      query,
      userId,
      currentDocument,
      currentChapter,
      recentQueries = [],
      userExpertiseLevel = 5,
      preferredTopics = [],
      maxResults = 10,
      includeMemories = true,
      includeAnnotations = true
    } = req.body;

    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      });
    }

    const searchContext = {
      userId,
      currentDocument,
      currentChapter,
      recentQueries,
      userExpertiseLevel,
      preferredTopics,
      learningGoals: []
    };

    const results = await semanticSearchService.search(query, searchContext, {
      maxResults,
      includeMemories,
      includeAnnotations
    });

    res.json({
      success: true,
      results,
      totalResults: results.length,
      searchContext
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform semantic search'
    });
  }
});

router.post('/search/contextual', async (req, res) => {
  try {
    await initializeServices();

    const {
      query,
      userId,
      currentDocument,
      currentChapter,
      radius = 3,
      userExpertiseLevel = 5,
      preferredTopics = []
    } = req.body;

    if (!query || !userId || !currentDocument || !currentChapter) {
      return res.status(400).json({
        success: false,
        error: 'Query, userId, currentDocument, and currentChapter are required'
      });
    }

    const searchContext = {
      userId,
      currentDocument,
      currentChapter,
      recentQueries: [],
      userExpertiseLevel,
      preferredTopics,
      learningGoals: []
    };

    const results = await semanticSearchService.contextualSearch(query, searchContext, radius);

    res.json({
      success: true,
      results,
      context: {
        document: currentDocument,
        chapter: currentChapter,
        radius
      }
    });

  } catch (error) {
    console.error('Contextual search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform contextual search'
    });
  }
});

router.post('/search/explore-concept', async (req, res) => {
  try {
    await initializeServices();

    const {
      concept,
      userId,
      currentDocument,
      currentChapter,
      userExpertiseLevel = 5,
      preferredTopics = [],
      depth = 'medium'
    } = req.body;

    if (!concept || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Concept and userId are required'
      });
    }

    const searchContext = {
      userId,
      currentDocument,
      currentChapter,
      recentQueries: [],
      userExpertiseLevel,
      preferredTopics,
      learningGoals: []
    };

    const exploration = await enhancedCoordinator.exploreConcept(concept, searchContext, depth);

    res.json({
      success: true,
      exploration,
      concept,
      depth
    });

  } catch (error) {
    console.error('Concept exploration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to explore concept'
    });
  }
});

// 📊 SYSTEM ANALYTICS AND STATUS
router.get('/system/analytics', async (req, res) => {
  try {
    await initializeServices();

    const analytics = enhancedCoordinator.getSystemAnalytics();

    res.json({
      success: true,
      analytics,
      phase2Status: {
        initialized: servicesInitialized,
        capabilities: {
          multiModel: true,
          adaptiveLearning: true,
          semanticSearch: true,
          personalizedRecommendations: true
        }
      }
    });

  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system analytics'
    });
  }
});

router.get('/system/status', async (req, res) => {
  try {
    res.json({
      success: true,
      phase2Intelligence: {
        status: 'active',
        initialized: servicesInitialized,
        capabilities: {
          multiModelSupport: true,
          adaptiveLearning: true,
          semanticSearch: true,
          personalizedRecommendations: true
        },
        features: {
          intelligentModelSelection: 'Route tasks to optimal AI models',
          personalizedExpertiseGrowth: 'Adapt to individual learning patterns',
          contextualKnowledgeRetrieval: 'Enhanced semantic search and concept exploration',
          hybridIntelligenceApproach: 'Combine multiple AI methods for best results'
        }
      }
    });

  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

// 🔧 UTILITY ENDPOINTS
router.post('/cache/clear', async (req, res) => {
  try {
    await initializeServices();
    
    const { service } = req.body;

    if (service === 'semantic-search' || !service) {
      await semanticSearchService.clearCache();
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

router.post('/index/rebuild', async (req, res) => {
  try {
    await initializeServices();
    
    const { service } = req.body;

    if (service === 'semantic-search' || !service) {
      await semanticSearchService.rebuildConceptIndex();
    }

    res.json({
      success: true,
      message: 'Index rebuilt successfully'
    });

  } catch (error) {
    console.error('Index rebuild error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rebuild index'
    });
  }
});

router.delete('/annotations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Valid annotation id required' });
    }
    const deleted = await storage.deleteAnnotation(id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Annotation not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete annotation' });
  }
});

router.delete('/power-summaries/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Valid power summary id required' });
    }
    const deleted = await storage.deletePowerSummary(id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Power summary not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete power summary' });
  }
});

export default router; 