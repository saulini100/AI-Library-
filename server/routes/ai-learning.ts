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

export default router; 