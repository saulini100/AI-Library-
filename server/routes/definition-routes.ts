import { Router } from 'express';
import { definitionStorage } from '../services/definition-storage-service.js';

const router = Router();

// Store a new definition
router.post('/store', async (req, res) => {
  try {
    const { 
      term, 
      definition, 
      examples, 
      relatedTerms, 
      sources, 
      confidence, 
      documentId, 
      chapter, 
      context,
      gemma3nAnalysis 
    } = req.body;
    
    if (!term || !definition) {
      return res.status(400).json({ error: 'Term and definition are required' });
    }

    const id = await definitionStorage.storeDefinition(term, definition, {
      examples: examples || [],
      relatedTerms: relatedTerms || [],
      sources: sources || [],
      confidence: confidence || 0.8,
      documentId: documentId ? parseInt(documentId) : undefined,
      chapter: chapter ? parseInt(chapter) : undefined,
      context: context || {},
      gemma3nAnalysis: gemma3nAnalysis || false
    });

    res.json({
      success: true,
      id,
      message: 'Definition stored successfully',
      term
    });
  } catch (error) {
    console.error('Store definition error:', error);
    res.status(500).json({ error: 'Failed to store definition' });
  }
});

// Get definitions by term
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { documentId, limit } = req.query;

    const definitions = await definitionStorage.getDefinitions({
      term,
      documentId: documentId ? parseInt(documentId as string) : undefined,
      limit: limit ? parseInt(limit as string) : 5
    });

    res.json({
      success: true,
      definitions,
      count: definitions.length
    });
  } catch (error) {
    console.error('Search definitions error:', error);
    res.status(500).json({ error: 'Failed to search definitions' });
  }
});

// Get a specific definition
router.get('/get/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { documentId } = req.query;

    const definition = await definitionStorage.getDefinition(
      term, 
      documentId ? parseInt(documentId as string) : undefined
    );

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    res.json({
      success: true,
      definition
    });
  } catch (error) {
    console.error('Get definition error:', error);
    res.status(500).json({ error: 'Failed to get definition' });
  }
});

// Reinforce a definition (increase confidence)
router.post('/reinforce', async (req, res) => {
  try {
    const { term, documentId } = req.body;
    
    if (!term) {
      return res.status(400).json({ error: 'Term is required' });
    }

    const success = await definitionStorage.reinforceDefinition(
      term, 
      documentId ? parseInt(documentId) : undefined
    );

    if (!success) {
      return res.status(404).json({ error: 'Definition not found for reinforcement' });
    }

    res.json({
      success: true,
      message: 'Definition reinforced successfully'
    });
  } catch (error) {
    console.error('Reinforce definition error:', error);
    res.status(500).json({ error: 'Failed to reinforce definition' });
  }
});

// Get definitions for a document
router.get('/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { chapter, confidence, limit } = req.query;

    const definitions = await definitionStorage.getDefinitions({
      documentId: parseInt(documentId),
      chapter: chapter ? parseInt(chapter as string) : undefined,
      confidence: confidence ? parseFloat(confidence as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      definitions,
      count: definitions.length
    });
  } catch (error) {
    console.error('Get document definitions error:', error);
    res.status(500).json({ error: 'Failed to get document definitions' });
  }
});

// Get related terms
router.get('/related/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { documentId } = req.query;

    const relatedTerms = await definitionStorage.getRelatedTerms(
      term,
      documentId ? parseInt(documentId as string) : undefined
    );

    res.json({
      success: true,
      relatedTerms,
      count: relatedTerms.length
    });
  } catch (error) {
    console.error('Get related terms error:', error);
    res.status(500).json({ error: 'Failed to get related terms' });
  }
});

// Export definitions for agent use
router.get('/export/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    const { documentId } = req.query;

    const definitions = await definitionStorage.exportDefinitionsForAgent(
      agentType,
      documentId ? parseInt(documentId as string) : undefined
    );

    res.json({
      success: true,
      definitions,
      count: definitions.length,
      agentType
    });
  } catch (error) {
    console.error('Export definitions error:', error);
    res.status(500).json({ error: 'Failed to export definitions' });
  }
});

// Get definitions that need learning reinforcement
router.get('/learning/candidates', async (req, res) => {
  try {
    const { threshold } = req.query;
    
    const definitions = await definitionStorage.getDefinitionsForLearning(
      threshold ? parseInt(threshold as string) : 5
    );

    res.json({
      success: true,
      definitions,
      count: definitions.length,
      message: 'Definitions ready for learning reinforcement'
    });
  } catch (error) {
    console.error('Get learning candidates error:', error);
    res.status(500).json({ error: 'Failed to get learning candidates' });
  }
});

// Batch trigger learning for accumulated definitions
router.post('/learning/batch-trigger', async (req, res) => {
  try {
    const { threshold, documentId } = req.body;
    
    const candidates = await definitionStorage.getDefinitionsForLearning(threshold || 5);
    
    if (candidates.length === 0) {
      return res.json({
        success: true,
        message: 'No definitions ready for learning reinforcement',
        triggered: 0
      });
    }

    // Trigger learning for accumulated definitions (selective, not per-definition)
    try {
      await fetch('/api/ai-learning/trigger-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: documentId || candidates[0].documentId,
          learningType: 'batch-definitions',
          definitionCount: candidates.length,
          definitions: candidates.map(def => ({
            term: def.term,
            definition: def.definition,
            confidence: def.confidence,
            reinforcements: def.reinforcements
          }))
        })
      });
    } catch (learningError) {
      console.warn('Failed to trigger batch learning:', learningError);
    }

    res.json({
      success: true,
      message: 'Batch learning triggered for accumulated definitions',
      triggered: candidates.length,
      documentId: documentId || candidates[0].documentId
    });
  } catch (error) {
    console.error('Batch trigger learning error:', error);
    res.status(500).json({ error: 'Failed to trigger batch learning' });
  }
});

export default router; 