import { Router } from 'express';
import { autoLearningSystem } from '../agents/auto-learning-system.js';

const router = Router();

router.post('/feedback', async (req, res) => {
  const { documentId, feedback, messageContent, reason } = req.body;

  if (documentId === undefined || !feedback) {
    return res.status(400).json({ error: 'documentId and feedback are required' });
  }

  try {
    const feedbackData = {
      correct: feedback === 'positive',
      explanation: reason || messageContent,
    };

    await autoLearningSystem.reinforceLearning(documentId, feedbackData);
    
    res.status(200).json({ message: 'Feedback received and learning reinforced.' });
  } catch (error) {
    const err = error as Error;
    console.error('Error in reinforcement learning:', err.message);
    res.status(500).json({ error: 'Failed to process feedback.', details: err.message });
  }
});

// Placeholder: return empty array for now
router.get('/all', async (req, res) => {
  try {
    const learningData: any[] = [];
    res.json({ learningData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch learning data' });
  }
});

// AI Navigation Agent - Definition Analysis Endpoint
router.post('/ai-analyze-definition', async (req, res) => {
  try {
    const { term, searchResults, context } = req.body;
    
    if (!term) {
      return res.status(400).json({ error: 'Term is required' });
    }

    // Analyze the search results and generate a comprehensive definition
    const analysis = await analyzeDefinitionWithContext(term, searchResults || [], context);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Definition analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze definition' });
  }
});

// AI Navigation Agent - Knowledge Stats Endpoint
router.get('/knowledge-stats', async (req, res) => {
  try {
    // Get learning statistics from the auto learning system
    const expertise = autoLearningSystem.getAllExpertise();
    
    res.json({
      success: true,
      stats: {
        totalTerms: expertise.length,
        recentActivity: expertise.slice(0, 5).map(exp => ({
          domain: exp.domain,
          level: exp.expertiseLevel,
          documentId: exp.documentId
        })),
        topConcepts: expertise.flatMap(exp => exp.concepts || []).slice(0, 10),
        learningProgress: {
          totalDocuments: expertise.length,
          averageExpertise: expertise.length > 0 
            ? expertise.reduce((sum, exp) => sum + exp.expertiseLevel, 0) / expertise.length 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Knowledge stats error:', error);
    res.status(500).json({ error: 'Failed to get knowledge stats' });
  }
});

// Helper function to analyze definitions with context
async function analyzeDefinitionWithContext(term: string, searchResults: any[], context?: any) {
  // Extract key information from search results
  const definitions = searchResults
    .filter(result => result.snippet && result.snippet.length > 0)
    .map(result => result.snippet)
    .slice(0, 3);

  // Generate a comprehensive definition based on search results and context
  const definition = definitions.length > 0 
    ? definitions[0] 
    : `A comprehensive definition for "${term}" based on available sources.`;

  const contextInfo = context?.book 
    ? `Context: ${context.book}${context.chapter ? ` Chapter ${context.chapter}` : ''}`
    : '';

  const examples = searchResults
    .filter(result => result.title && result.title.includes('example'))
    .map(result => result.snippet)
    .slice(0, 2);

  const relatedTerms = extractRelatedTerms(term, searchResults);

  return {
    definition,
    context: contextInfo,
    examples: examples.length > 0 ? examples : [`Example usage of ${term} in context`],
    relatedTerms,
    sources: searchResults.map(result => ({
      title: result.title,
      url: result.url,
      source: result.source
    }))
  };
}

// Trigger learning agent for deep learning (now selective)
router.post('/trigger-learning', async (req, res) => {
  try {
    const { documentId, learningType, definitionCount, definitions } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    // Only trigger learning for significant patterns or batch operations
    const shouldTriggerLearning = 
      learningType === 'batch-definitions' && definitionCount >= 5 ||
      learningType === 'gemma3n-enhanced' ||
      learningType === 'critical-concept';

    if (shouldTriggerLearning) {
      console.log(`🧠 Triggering selective learning for ${learningType} (${definitionCount || 1} items)`);
      await autoLearningSystem.triggerAutoLearning(parseInt(documentId));
    } else {
      console.log(`📚 Learning data accumulated for document ${documentId} (${learningType})`);
    }

    res.json({
      success: true,
      message: shouldTriggerLearning ? 'Learning triggered' : 'Learning data accumulated',
      documentId: parseInt(documentId),
      learningType: learningType,
      triggered: shouldTriggerLearning,
      itemCount: definitionCount || 1
    });
  } catch (error) {
    console.error('Trigger learning error:', error);
    res.status(500).json({ error: 'Failed to trigger learning task' });
  }
});

// Helper function to extract related terms
function extractRelatedTerms(term: string, searchResults: any[]): string[] {
  const relatedTerms: string[] = [];
  
  // Extract terms that might be related based on search results
  searchResults.forEach(result => {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    const words = text.split(/\s+/);
    
    words.forEach(word => {
      if (word.length > 3 && 
          word !== term.toLowerCase() && 
          !relatedTerms.includes(word) &&
          !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(word)) {
        relatedTerms.push(word);
      }
    });
  });

  return relatedTerms.slice(0, 5);
}

export default router; 