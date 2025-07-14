import { Router } from 'express';
import { GemmaTranslationService, SupportedLanguage, TranslationContext } from '../services/gemma-translation-service';
import { OllamaService } from '../services/ollama-service';

export function createTranslationRoutes(ollamaService: OllamaService): Router {
  const router = Router();
  const translationService = new GemmaTranslationService(ollamaService);

  // Single text translation
  router.post('/translate', async (req, res) => {
    console.log('🌐 Translation request received:', req.body);
    try {
      const { 
        text, 
        targetLanguage, 
        sourceLanguage, 
        context = 'general' 
      }: {
        text: string;
        targetLanguage: SupportedLanguage;
        sourceLanguage?: SupportedLanguage;
        context?: TranslationContext;
      } = req.body;

      console.log('📝 Translation details:', { text: text.substring(0, 100) + '...', targetLanguage, sourceLanguage, context });

      if (!text || !targetLanguage) {
        console.error('❌ Missing required fields:', { text: !!text, targetLanguage: !!targetLanguage });
        return res.status(400).json({
          error: 'Missing required fields: text and targetLanguage'
        });
      }

      if (!translationService.getSupportedLanguages().includes(targetLanguage)) {
        return res.status(400).json({
          error: `Unsupported target language: ${targetLanguage}`
        });
      }

      const result = await translationService.translateText({
        text,
        targetLanguage,
        sourceLanguage,
        context
      });

      res.json({
        translatedText: result.translatedText,
        confidence: result.confidence,
        detectedSourceLanguage: result.detectedSourceLanguage,
        targetLanguage,
        sourceLanguage,
        context
      });

    } catch (error) {
      console.error('Translation API error:', error);
      res.status(500).json({
        error: 'Translation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Batch translation
  router.post('/translate-batch', async (req, res) => {
    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          error: 'Invalid requests array'
        });
      }

      // Validate each request
      for (const request of requests) {
        if (!request.text || !request.targetLanguage) {
          return res.status(400).json({
            error: 'Each request must have text and targetLanguage'
          });
        }
      }

      const batchResult = await translationService.translateBatch({ requests });

      res.json({
        translations: batchResult.translations,
        results: batchResult.results,
        count: batchResult.translations.length
      });

    } catch (error) {
      console.error('Batch translation API error:', error);
      res.status(500).json({
        error: 'Batch translation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Language detection
  router.post('/detect-language', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          error: 'Missing required field: text'
        });
      }

      const detectedLanguage = await translationService.detectLanguage(text);

      res.json({
        language: detectedLanguage,
        confidence: 0.8, // Basic confidence score
        supportedLanguages: translationService.getSupportedLanguages()
      });

    } catch (error) {
      console.error('Language detection API error:', error);
      res.status(500).json({
        error: 'Language detection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Document content translation
  router.post('/translate-document', async (req, res) => {
    try {
      const { 
        content, 
        targetLanguage, 
        sourceLanguage 
      }: {
        content: string;
        targetLanguage: SupportedLanguage;
        sourceLanguage?: SupportedLanguage;
      } = req.body;

      if (!content || !targetLanguage) {
        return res.status(400).json({
          error: 'Missing required fields: content and targetLanguage'
        });
      }

      const translatedContent = await translationService.translateDocumentContent(
        content,
        targetLanguage,
        sourceLanguage
      );

      res.json({
        translatedContent,
        originalLength: content.length,
        translatedLength: translatedContent.length,
        targetLanguage,
        sourceLanguage
      });

    } catch (error) {
      console.error('Document translation API error:', error);
      res.status(500).json({
        error: 'Document translation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Quiz content translation
  router.post('/translate-quiz', async (req, res) => {
    try {
      const { quiz, targetLanguage } = req.body;

      if (!quiz || !targetLanguage) {
        return res.status(400).json({
          error: 'Missing required fields: quiz and targetLanguage'
        });
      }

      const translatedQuiz = await translationService.translateQuizContent(
        quiz,
        targetLanguage
      );

      res.json({
        translatedQuiz,
        originalLanguage: 'en', // Assume English source
        targetLanguage,
        questionCount: quiz.questions?.length || 0
      });

    } catch (error) {
      console.error('Quiz translation API error:', error);
      res.status(500).json({
        error: 'Quiz translation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get supported languages
  router.get('/languages', (req, res) => {
    try {
      const supportedLanguages = translationService.getSupportedLanguages();
      const languageInfo = supportedLanguages.map(lang => ({
        code: lang,
        ...translationService.getLanguageInfo(lang)
      }));

      res.json({
        languages: languageInfo,
        count: supportedLanguages.length,
        powered_by: 'Gemma 3n'
      });

    } catch (error) {
      console.error('Languages API error:', error);
      res.status(500).json({
        error: 'Failed to fetch supported languages',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Translation service status and stats
  router.get('/status', (req, res) => {
    try {
      res.json({
        status: 'active',
        cacheSize: translationService.getCacheSize(),
        supportedLanguages: translationService.getSupportedLanguages(),
        features: {
          batchTranslation: true,
          languageDetection: true,
          contextualTranslation: true,
          caching: true,
          offlineCapable: true
        },
        powered_by: 'Gemma 3n via Ollama'
      });

    } catch (error) {
      console.error('Translation status API error:', error);
      res.status(500).json({
        error: 'Failed to get translation service status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clear translation cache (admin endpoint)
  router.post('/clear-cache', (req, res) => {
    try {
      const cacheSize = translationService.getCacheSize();
      translationService.clearCache();

      res.json({
        message: 'Translation cache cleared successfully',
        previousCacheSize: cacheSize,
        currentCacheSize: translationService.getCacheSize()
      });

    } catch (error) {
      console.error('Clear cache API error:', error);
      res.status(500).json({
        error: 'Failed to clear translation cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
} 