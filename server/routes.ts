import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import multer from "multer";
import { documentProcessor } from "./document-processor";
import { insertDocumentSchema, insertAnnotationSchema, insertBookmarkSchema, insertReadingProgressSchema } from "@shared/schema";

// Import new route modules
import performanceRouter, { performanceMiddleware } from "./routes/performance.js";
import phase2IntelligenceRoutes from './routes/phase2-intelligence-routes.js';
import aiLearningRoutes from './routes/ai-learning';
import { createTranslationRoutes } from './routes/translation-routes.js';
import definitionRoutes from './routes/definition-routes.js';
// Note: phase2-intelligence-routes may not exist yet, will be created if needed

// Import Agent Manager and Services
import { agentManager } from "./agents/agent-manager.js";
import { CachedEmbeddingService } from "./services/cached-embedding-service.js";
import { SemanticSearchService } from "./services/semantic-search-service.js";
import { documentRAGService } from "./services/document-rag-service.js";
import { OllamaService } from "./services/ollama-service.js";
import { autoLearningSystem } from "./agents/auto-learning-system.js";
import { db } from "./db.js";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// Initialize embedding and search services
const embeddingService = new CachedEmbeddingService();
const semanticSearchService = new SemanticSearchService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  await semanticSearchService.initialize();
  await documentRAGService.initialize();
  console.log('🔍 Embedding and search services initialized');

  // Add performance monitoring middleware
  app.use(performanceMiddleware);

  // Store services in app.locals for use in routes
  app.locals.agentManager = agentManager;
  app.locals.embeddingService = embeddingService;
  app.locals.semanticSearchService = semanticSearchService;

  // Register new route modules
  app.use('/api/performance', performanceRouter);
  app.use('/api', phase2IntelligenceRoutes);
  app.use('/api/ai-learning', aiLearningRoutes);
  app.use('/api/definitions', definitionRoutes);
  
  // Initialize Ollama service for translation routes
  const ollamaService = new OllamaService({
    model: 'gemma3n:e2b',
    temperature: 0.3
  });
  await ollamaService.initialize();
  app.use('/api', createTranslationRoutes(ollamaService));
  
  // Intelligence routes will be added separately if needed

  // 🔗 EMBEDDING ROUTES
  app.post("/api/embeddings/generate", async (req, res) => {
    try {
      const { text, documentId, chapter, paragraph } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 8000) {
        return res.status(400).json({ error: "Text too long (max 8000 characters)" });
      }

      const result = await embeddingService.getEmbedding(
        text,
        documentId,
        chapter,
        paragraph
      );

      res.json({
        success: true,
        embedding: result.embedding,
        cacheHit: result.cacheHit,
        responseTime: result.responseTime,
        dimensions: result.embedding.length
      });

    } catch (error) {
      console.error("Embedding generation error:", error);
      res.status(500).json({ error: "Failed to generate embedding" });
    }
  });

  // Batch embedding endpoint
  app.post("/api/embeddings/generate-batch", async (req, res) => {
    try {
      const { texts, documentIds, chapters, paragraphs } = req.body;
      if (!Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: "Array of texts is required" });
      }
      if (texts.some(t => typeof t !== 'string' || t.length > 8000)) {
        return res.status(400).json({ error: "Each text must be a string and <= 8000 characters" });
      }
      const results = await embeddingService.getEmbeddingsBatch(texts, documentIds, chapters, paragraphs);
      res.json({
        success: true,
        results: results.map(r => ({
          embedding: r.embedding,
          cacheHit: r.cacheHit,
          responseTime: r.responseTime,
          dimensions: r.embedding.length
        }))
      });
    } catch (error) {
      console.error("Batch embedding generation error:", error);
      res.status(500).json({ error: "Failed to generate batch embeddings" });
    }
  });

  app.get("/api/embeddings/stats", async (req, res) => {
    try {
      const stats = embeddingService.getCacheStats();
      const cacheInfo = await embeddingService.getCacheInfo();

      res.json({
        success: true,
        stats,
        cacheInfo
      });

    } catch (error) {
      console.error("Embedding stats error:", error);
      res.status(500).json({ error: "Failed to get embedding stats" });
    }
  });

  app.delete("/api/embeddings/cache", async (req, res) => {
    try {
      await embeddingService.clearCache();
      res.json({ success: true, message: "Embedding cache cleared" });

    } catch (error) {
      console.error("Cache clear error:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // 🧹 CACHE MANAGEMENT ROUTES
  app.delete("/api/cache/clear", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId) {
        // Clear cache for specific user
        await documentRAGService.clearCacheForUser(userId);
        res.json({ success: true, message: `Cache cleared for user ${userId}` });
      } else {
        // Clear all caches
        await documentRAGService.clearCache();
        await embeddingService.clearCache();
        res.json({ success: true, message: "All caches cleared" });
      }
    } catch (error) {
      console.error("Cache clear error:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  app.get("/api/cache/stats", async (req, res) => {
    try {
      const ragStats = documentRAGService.getRAGAnalytics();
      const embeddingStats = embeddingService.getCacheStats();
      
      res.json({
        success: true,
        rag: ragStats,
        embedding: embeddingStats
      });
    } catch (error) {
      console.error("Cache stats error:", error);
      res.status(500).json({ error: "Failed to get cache stats" });
    }
  });

  // 🔍 ENHANCED SEARCH ROUTES
  app.post("/api/search/semantic", async (req, res) => {
    try {
      const { 
        query, 
        userId, 
        documentId, 
        chapter, 
        maxResults = 10,
        useEmbeddings = true,
        searchDepth = 'thorough'
      } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const defaultUserId = userId || await getDefaultUserId();
      
      const searchContext = {
        userId: defaultUserId,
        documentId,
        chapter,
        recentQueries: [],
        userExpertiseLevel: 5,
        preferredTopics: []
      };

      const results = await semanticSearchService.search(query, searchContext, {
        useEmbeddings,
        maxResults
      });

      res.json({
        success: true,
        query,
        results,
        totalResults: results.length,
        searchContext,
        usedEmbeddings: useEmbeddings
      });

    } catch (error) {
      console.error("Semantic search error:", error);
      res.status(500).json({ error: "Failed to perform semantic search" });
    }
  });

  // 🧠 RAG ROUTES
  app.post("/api/rag/query", async (req, res) => {
    try {
      const {
        query,
        userId,
        currentDocument,
        currentChapter,
        conversationHistory = [],
        userStudyPatterns = [],
        preferredTopics = [],
        studyLevel = 'intermediate',
        maxSources = 5,
        includeMemories = true,
        includeAnnotations = true,
        searchDepth = 'thorough'
      } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }

      const defaultUserId = userId || await getDefaultUserId();

      const ragContext = {
        userId: defaultUserId,
        currentDocument,
        currentChapter,
        conversationHistory,
        userStudyPatterns,
        preferredTopics,
        studyLevel
      };

      const ragOptions = {
        maxSources,
        includeMemories,
        includeAnnotations,
        searchDepth,
        useEmbeddings: true
      };

      const response = await documentRAGService.processRAGQuery(
        query,
        ragContext,
        ragOptions
      );

      res.json({
        success: true,
        query,
        response,
        context: ragContext,
        options: ragOptions
      });

    } catch (error) {
      console.error("RAG query error:", error);
      res.status(500).json({ error: "Failed to process RAG query" });
    }
  });

  app.get("/api/rag/analytics", async (req, res) => {
    try {
      const analytics = documentRAGService.getRAGAnalytics();
      const agentAnalytics = agentManager.getRAGAnalytics();

      res.json({
        success: true,
        ragService: analytics,
        agentManager: agentAnalytics,
        combined: {
          totalQueries: analytics.totalQueries + agentAnalytics.totalQueries,
          overallCacheHitRate: (analytics.cacheHitRate + agentAnalytics.cacheHitRate) / 2
        }
      });

    } catch (error) {
      console.error("RAG analytics error:", error);
      res.status(500).json({ error: "Failed to get RAG analytics" });
    }
  });

  app.delete("/api/rag/cache", async (req, res) => {
    try {
      await documentRAGService.clearCache();
      res.json({ success: true, message: "RAG cache cleared" });

    } catch (error) {
      console.error("RAG cache clear error:", error);
      res.status(500).json({ error: "Failed to clear RAG cache" });
    }
  });

  // Initialize default user
  const initializeUser = async () => {
    try {
      let user = await storage.getUserByUsername("default_user");
      if (!user) {
        user = await storage.createUser({
          username: "default_user",
          password: "default_password"
        });
        console.log("Created default user:", user.id);
      }
      return user;
    } catch (error) {
      console.error("Failed to initialize user:", error);
      return null;
    }
  };

  // Get or create default user for all requests
  const getDefaultUserId = async () => {
    // Always return userId 2 for consistency
    return 2;
  };

  // Document management routes
  app.get("/api/documents", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(parseInt(id));
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.get("/api/documents/:id/chapters/:chapter", async (req, res) => {
    try {
      const { id, chapter } = req.params;
      const document = await storage.getDocument(parseInt(id));
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Parse content if it's a string, otherwise use as-is
      const content = typeof document.content === 'string' 
        ? JSON.parse(document.content) 
        : document.content;
      const chapterData = content.chapters?.find((ch: any) => ch.number === parseInt(chapter));
      
      if (!chapterData) {
        return res.status(404).json({ error: "Chapter not found" });
      }
      
      // Extract text from paragraphs if text field is not available
      if ((!chapterData.text || chapterData.text === '') && chapterData.paragraphs && Array.isArray(chapterData.paragraphs)) {
        chapterData.text = chapterData.paragraphs
          .map((p: any) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') {
              // Handle paragraph objects with text property
              if (p.text) return p.text;
              if (p.content) return p.content;
              // If it's an object but no text property, stringify it
              return JSON.stringify(p);
            }
            return '';
          })
          .filter((text: string) => text.trim().length > 0)
          .join('\n\n');
      }
      
      res.json({
        document: { id: document.id, title: document.title },
        chapter: chapterData
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch chapter" });
    }
  });

  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = await getDefaultUserId();
      const file = req.file;
      
      let processedDocument;

      if (file.mimetype === 'application/pdf') {
        processedDocument = await documentProcessor.processPDF(file.buffer, file.originalname);
      } else if (file.mimetype === 'text/plain') {
        processedDocument = await documentProcessor.processTXT(file.buffer, file.originalname);
      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      const document = await storage.createDocument({
        title: processedDocument.title,
        filename: file.originalname,
        fileType: file.mimetype === 'application/pdf' ? 'pdf' : 'txt',
        totalChapters: processedDocument.totalChapters,
        content: JSON.stringify(processedDocument),
        userId
      });

      res.json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDocument(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const userId = await getDefaultUserId();
      const results = await storage.searchDocuments(userId, q);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search documents" });
    }
  });

  // Annotations routes
  app.get("/api/annotations", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const annotations = await storage.getAnnotations(userId);
      res.json(annotations);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch annotations" });
    }
  });

  app.get("/api/annotations/:documentId/:chapter", async (req, res) => {
    try {
      const { documentId, chapter } = req.params;
      const userId = await getDefaultUserId();
      const annotations = await storage.getAnnotationsByChapter(userId, parseInt(documentId), parseInt(chapter));
      res.json(annotations);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch chapter annotations" });
    }
  });

  app.post("/api/annotations", async (req, res) => {
    try {
      const annotationData = insertAnnotationSchema.parse(req.body);
      const userId = await getDefaultUserId();
      const annotation = await storage.createAnnotation({ ...annotationData, userId });
      res.json(annotation);
    } catch (error) {
      console.error("Database error:", error);
      res.status(400).json({ error: "Invalid annotation data" });
    }
  });

  app.put("/api/annotations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const annotation = await storage.updateAnnotation(parseInt(id), note);
      
      if (!annotation) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      
      res.json(annotation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update annotation" });
    }
  });

  app.delete("/api/annotations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAnnotation(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete annotation" });
    }
  });

  // Bookmarks routes
  app.get("/api/bookmarks", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const bookmarks = await storage.getBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse(req.body);
      const userId = await getDefaultUserId();
      const bookmark = await storage.createBookmark({ ...bookmarkData, userId });
      res.json(bookmark);
    } catch (error) {
      res.status(400).json({ error: "Invalid bookmark data" });
    }
  });

  app.delete("/api/bookmarks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBookmark(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: "Bookmark not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bookmark" });
    }
  });

  // Reading progress routes
  app.get("/api/reading-progress", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const progress = await storage.getReadingProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reading progress" });
    }
  });

  app.post("/api/reading-progress", async (req, res) => {
    try {
      const progressData = insertReadingProgressSchema.parse(req.body);
      const userId = await getDefaultUserId();
      const progress = await storage.updateReadingProgress({ ...progressData, userId });
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: "Invalid reading progress data" });
    }
  });

  // AI study assistant routes
  app.post("/api/ai/explain", async (req, res) => {
    try {
      const { text, documentTitle, chapter, paragraph } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const prompt = `Please explain this document passage in detail, providing context, significance, and practical application. 

Document: ${documentTitle || 'Document'}
Chapter: ${chapter}
Paragraph: ${paragraph}
Text: "${text}"

Please provide your response in JSON format with the following structure:
{
  "explanation": "detailed explanation of the passage",
  "context": "background and context",
  "significance": "meaning and importance",
  "practicalApplication": "how this applies to real-world situations"
}`;

      // Use Ollama service for AI explanations
      const ollamaService = new OllamaService({
        model: 'qwen2.5:7b-instruct',
        temperature: 0.7
      });
      
      await ollamaService.initialize();
      const response = await ollamaService.generateText(prompt);
      
      // Parse JSON response
      const responseText = response.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        explanation: "Unable to generate AI explanation at this time.",
        context: "Please try again later.",
        significance: "AI service temporarily unavailable.",
        practicalApplication: "Manual study recommended."
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get AI explanation" });
    }
  });

  app.post("/api/ai/related-content", async (req, res) => {
    try {
      const { text, documentTitle, chapter, paragraph } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const prompt = `Find related content that connects to this passage thematically, conceptually, or contextually.

Document: ${documentTitle || 'Document'}
Chapter: ${chapter}
Paragraph: ${paragraph}
Text: "${text}"

Please provide your response in JSON format with the following structure:
{
  "relatedContent": [
    {
      "reference": "Document Chapter:Paragraph",
      "text": "content text",
      "connection": "explanation of how this relates"
    }
  ]
}

Limit to 5 most relevant connections.`;

      // Use Ollama service for related content
      const ollamaService = new OllamaService({
        model: 'qwen2.5:7b-instruct',
        temperature: 0.7
      });
      
      await ollamaService.initialize();
      const response = await ollamaService.generateText(prompt);
      
      // Parse JSON response
      const responseText = response.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        relatedContent: [
          {
            reference: "Unable to generate related content",
            text: "AI service temporarily unavailable",
            connection: "Please try again later"
          }
        ]
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get related content" });
    }
  });

  app.post("/api/ai/context-analysis", async (req, res) => {
    try {
      const { text, documentTitle, chapter, paragraph } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const prompt = `Provide detailed context analysis for this document passage, including background information, setting, and audience.

Document: ${documentTitle || 'Document'}
Chapter: ${chapter}
Paragraph: ${paragraph}
Text: "${text}"

Please provide your response in JSON format with the following structure:
{
  "background": "background information and context",
  "setting": "setting and circumstances",
  "audience": "intended audience",
  "purpose": "purpose and intent",
  "keyConcepts": "key concepts and themes"
}`;

      // Use Ollama service for context analysis
      const ollamaService = new OllamaService({
        model: 'qwen2.5:7b-instruct',
        temperature: 0.7
      });
      
      await ollamaService.initialize();
      const response = await ollamaService.generateText(prompt);
      
      // Parse JSON response
      const responseText = response.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        background: "Unable to determine background",
        setting: "AI service temporarily unavailable",
        audience: "Please try again later",
        purpose: "Context information not available",
        keyConcepts: "Key concepts not accessible"
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get context analysis" });
    }
  });

  // Power Summaries routes
  app.get("/api/power-summaries/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const summaries = await storage.getPowerSummaries(parseInt(documentId));
      res.json({ success: true, summaries });
    } catch (error) {
      console.error("Failed to fetch power summaries:", error);
      res.status(500).json({ error: "Failed to fetch power summaries" });
    }
  });

  app.post("/api/ai-power-summary", async (req, res) => {
    try {
      const { documentId, chapter, text, title } = req.body;
      
      if (!documentId || !chapter || !text) {
        return res.status(400).json({ error: "Document ID, chapter, and text are required" });
      }

      // Generate power summary using Ollama with simplified prompt
      const prompt = `You are a content analysis expert. Create a clear, comprehensive summary of this chapter.

CHAPTER TITLE: ${title || `Chapter ${chapter}`}
CHAPTER TEXT: ${text.substring(0, 2000)}

INSTRUCTIONS: 
Write a 2-3 sentence summary that captures the main points, key concepts, and significance of this chapter. Focus on clarity and completeness.

Respond with ONLY the summary text. No JSON formatting, no additional text.`;

      // Use Ollama service directly for power summaries
      const ollamaService = new OllamaService({
        model: 'gemma3n:e2b',
        temperature: 0.7
      });
      
      let aiResult;
      
      try {
        console.log('🚀 Using Ollama service for power summary generation...');
        await ollamaService.initialize();
        
        const response = await ollamaService.generateText(prompt);
        
        // Clean up the response
        const responseText = response.trim();
        console.log('🔍 Raw AI response:', responseText.substring(0, 300) + '...');
        
        // Simple text extraction - no JSON parsing needed
        let summary = responseText;
        
        // Remove any markdown formatting if present
        summary = summary.replace(/```json\s*|\s*```/g, '');
        summary = summary.replace(/^\s*{\s*"summary"\s*:\s*"/, '');
        summary = summary.replace(/^\s*"powerSummary"\s*:\s*"/, '');
        summary = summary.replace(/",?\s*}$/, '');
        
        // Clean up any remaining quotes or formatting
        summary = summary.replace(/^["']+|["']+$/g, '');
        
        // Validate the summary
        if (!summary || summary.length < 20) {
          throw new Error('Generated summary is too short or empty');
        }
        
        aiResult = {
          powerSummary: summary
        };
        
        console.log('✅ Power summary generated using Ollama gemma3n:e2b');
        console.log('📊 Summary data:', {
          powerSummary: aiResult.powerSummary.substring(0, 100) + '...',
          length: aiResult.powerSummary.length
        });
        
      } catch (ollamaError) {
        console.warn('Ollama service failed, using fallback summary:', ollamaError);
        // Continue to fallback section below
      }

      // Fallback: Create a basic summary if AI fails
      if (!aiResult || !aiResult.powerSummary) {
        console.log('🔄 AI generation failed, creating fallback summary...');
        const textPreview = text.substring(0, 200);
        aiResult = {
          powerSummary: `This chapter covers ${title || `Chapter ${chapter}`}. ${textPreview}...`
        };
      }
      
      // Store the power summary in the database
      const summaryData = {
        userId: 1, // Default user ID
        documentId: parseInt(documentId),
        chapter: parseInt(chapter),
        chapterTitle: title || `Chapter ${chapter}`,
        powerSummary: String(aiResult.powerSummary || "Summary not available"),
        keyInsights: JSON.stringify([]),
        mainThemes: JSON.stringify([]),
        actionablePoints: JSON.stringify([])
      };

      console.log('📝 Creating power summary with data:', {
        documentId: summaryData.documentId,
        chapter: summaryData.chapter,
        chapterTitle: summaryData.chapterTitle,
        powerSummary: summaryData.powerSummary.substring(0, 100) + '...'
      });

      const [summary] = await db.insert(schema.powerSummaries).values(summaryData).returning();

      // 🧠 NEW: Trigger AI learning from the power summary
      try {
        console.log('🧠 Triggering AI learning from power summary...');
        await agentManager.requestAgentTask('LearningAgent', 'LEARN_FROM_POWER_SUMMARY', {
          documentId: parseInt(documentId),
          chapter: parseInt(chapter),
          originalContent: text,
          powerSummary: aiResult.powerSummary,
          keyInsights: [],
          mainThemes: [],
          actionablePoints: [],
          title: title || `Chapter ${chapter}`
        });
        console.log('✅ AI learning triggered successfully');
      } catch (learningError) {
        console.warn('⚠️ AI learning failed (non-critical):', learningError);
        // Don't fail the power summary generation if learning fails
      }
      
      res.json({ 
        success: true, 
        summary,
        message: "Power summary generated successfully using Ollama gemma3n:e2b. Use the auto-learning panel to build AI expertise when needed."
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      console.error("Failed to generate power summary:", error);
      res.status(500).json({ error: "Failed to generate power summary" });
    }
  });

  // Auto-Learning and Expertise routes
  app.get("/api/expertise/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const docId = parseInt(documentId);
      
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      // Check if we have stored expertise for this document from auto-learning system
      const allExpertise = autoLearningSystem.getAllExpertise();
      const documentExpertise = allExpertise.find(exp => exp.documentId === docId);
      
      if (documentExpertise) {
        res.json({ 
          success: true, 
          expertise: {
            expertise: true,
            domain: documentExpertise.domain,
            expertiseLevel: documentExpertise.expertiseLevel,
            concepts: Array.isArray(documentExpertise.concepts) ? documentExpertise.concepts : (documentExpertise.conceptsList || []),
            fineTuningData: documentExpertise.fineTuningData,
            message: `AI has expertise in ${documentExpertise.domain} (Level ${documentExpertise.expertiseLevel}/10)`
          }
        });
      } else {
        res.json({ 
          success: true, 
          expertise: {
            expertise: false,
            message: "No expertise available yet. Trigger auto-learning to build expertise for this document."
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch expertise:", error);
      res.status(500).json({ error: "Failed to fetch expertise" });
    }
  });

  app.post("/api/auto-learn/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const docId = parseInt(documentId);
      
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      console.log(`🧠 Triggering auto-learning for document ${docId}...`);
      
      // Check if auto-learning is available (not on cooldown)
      const lastLearningTime = autoLearningSystem['lastLearningTime']?.get(docId) || 0;
      const timeSinceLastLearning = Date.now() - lastLearningTime;
      const cooldownPeriod = autoLearningSystem['LEARNING_COOLDOWN'] || 300000;
      
      if (timeSinceLastLearning < cooldownPeriod) {
        const remainingCooldown = Math.ceil((cooldownPeriod - timeSinceLastLearning) / 1000);
        return res.json({ 
          success: false, 
          message: `Auto-learning is on cooldown. Please wait ${remainingCooldown} seconds before trying again.`,
          cooldownRemaining: remainingCooldown
        });
      }
      
      // Trigger the auto-learning system
      // This runs in the background and will notify agents when complete
      autoLearningSystem.triggerAutoLearning(docId).catch(error => {
        console.error(`Auto-learning failed for document ${docId}:`, error);
      });
      
      res.json({ 
        success: true, 
        message: "Auto-learning initiated. The AI will analyze this document and build expertise. This may take a few minutes.",
        documentId: docId
      });
      
    } catch (error) {
      console.error("Failed to trigger auto-learning:", error);
      res.status(500).json({ error: "Failed to trigger auto-learning" });
    }
  });

  // Enhanced learning status endpoint
  app.get("/api/learning-status/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const docId = parseInt(documentId);
      
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      // Get comprehensive learning status
      const allExpertise = autoLearningSystem.getAllExpertise();
      const documentExpertise = allExpertise.find(exp => exp.documentId === docId);
      
      // Get power summaries count
      const powerSummaries = await storage.getPowerSummaries(docId);
      
      // Get document info
      const document = await storage.getDocuments(docId);
      
      res.json({
        success: true,
        documentId: docId,
        documentTitle: Array.isArray(document) && document.length > 0 ? document[0].title : 'Unknown Document',
        expertise: documentExpertise ? {
          hasExpertise: true,
          domain: documentExpertise.domain,
          expertiseLevel: documentExpertise.expertiseLevel,
          concepts: documentExpertise.concepts,
          fineTuningData: documentExpertise.fineTuningData
        } : {
          hasExpertise: false,
          message: "No expertise developed yet"
        },
        powerSummaries: {
          count: powerSummaries.length,
          available: powerSummaries.length > 0
        },
        learningRecommendation: powerSummaries.length > 0 && !documentExpertise ? 
          "Power summaries available - perfect time to trigger auto-learning!" : 
          documentExpertise ? "AI has expertise in this document" : "Generate power summaries first, then trigger auto-learning"
      });
      
    } catch (error) {
      console.error("Failed to get learning status:", error);
      res.status(500).json({ error: "Failed to get learning status" });
    }
  });

  app.post("/api/expert-chat/:documentId", async (req, res) => {
    try {
      const { documentId } = req.params;
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      // Generate expert response using AI
      const prompt = `You are an expert AI assistant specialized in document analysis. A user is asking about content from document ID ${documentId}.

Question: ${question}

Provide a helpful, expert-level response. If you don't have specific context about the document, provide general guidance and suggest what information would be helpful.`;

      // Use Ollama service for expert chat
      const ollamaService = new OllamaService({
        model: 'qwen2.5:7b-instruct',
        temperature: 0.7
      });
      
      await ollamaService.initialize();
      const aiResponse = await ollamaService.generateText(prompt) || "I'm sorry, I couldn't generate a response.";
      
      res.json({ 
        success: true, 
        response: aiResponse
      });
    } catch (error) {
      console.error("Failed to generate expert response:", error);
      res.status(500).json({ error: "Failed to generate expert response" });
    }
  });

  // Ollama Generate endpoint for navigation agent
  app.post("/api/ollama/generate", async (req, res) => {
    try {
      const { model, prompt, temperature, maxTokens } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Use Ollama service for text generation
      const ollamaService = new OllamaService({
        model: model || 'gemma3n:e2b',
        temperature: temperature || 0.3,
        maxTokens: maxTokens || 1000
      });
      
      await ollamaService.initialize();
      const response = await ollamaService.generateText(prompt, {
        temperature: temperature || 0.3,
        maxTokens: maxTokens || 1000
      });
      
      res.json({ 
        success: true, 
        response: response || "I'm sorry, I couldn't generate a response."
      });
    } catch (error) {
      console.error("Failed to generate text with Ollama:", error);
      res.status(500).json({ error: "Failed to generate text" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize Socket.IO for real-time agent communication
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Store Socket.IO instance for use by agents
  app.locals.io = io;

  return httpServer;
}
