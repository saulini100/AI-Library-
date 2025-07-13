import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { db } from "./db";
import chalk from "chalk";

// Import services for initialization
import { OllamaService } from "./services/ollama-service.js";
import { LocalMemoryService } from "./services/LocalMemoryService.js";
import { MultiModelService } from "./services/multi-model-service.js";
import { AdaptiveLearningService } from "./services/adaptive-learning-service.js";
import { GemmaTranslationService } from "./services/gemma-translation-service.js";
import { DocumentRAGService } from "./services/document-rag-service.js";
import { autoLearningSystem } from "./agents/auto-learning-system.js";
import { agentManager } from "./agents/agent-manager.js";

const log = (message: string) => console.log(chalk.cyan(`[Server] ${message}`));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize services
const initializeServices = async () => {
  try {
    log("🚀 Initializing Library Companion services...");
    
    // Initialize Ollama service
    const ollamaService = new OllamaService({
      model: process.env.OLLAMA_MODEL || 'gemma3n:e2b'
    });
    await ollamaService.initialize();
    app.locals.ollamaService = ollamaService;
    log("✅ Ollama service initialized");

    // Initialize Memory service
    const memoryService = LocalMemoryService.getInstance();
    app.locals.memoryService = memoryService;
    log("✅ Memory service initialized");

    // Initialize Multi-Model service
    const multiModelService = new MultiModelService();
    app.locals.multiModelService = multiModelService;
    log(`✅ Multi-Model service initialized (Local Ollama)`);

    // Initialize Adaptive Learning service
    const adaptiveLearningService = new AdaptiveLearningService();
    app.locals.adaptiveLearningService = adaptiveLearningService;
    log("✅ Adaptive Learning service initialized");

    // Initialize Auto-Learning System
    await autoLearningSystem.initialize();
    log("✅ Auto-Learning system initialized");

    // Initialize Translation service
    const translationService = new GemmaTranslationService(ollamaService);
    app.locals.translationService = translationService;
    log("✅ Translation service initialized");

    // Initialize RAG service and connect translation service
    const ragService = new DocumentRAGService();
    await ragService.initialize();
    ragService.setTranslationService(translationService);
    app.locals.ragService = ragService;
    log("✅ RAG service initialized with translation support");

    // Initialize and start the Agent Manager
    await agentManager.initialize();
    agentManager.setOllamaService(ollamaService);
    agentManager.setTranslationService(translationService);
    await agentManager.start();
    log("✅ Agent Manager initialized and started");

    log("🎉 All services initialized successfully!");
  } catch (error) {
    log(`❌ Service initialization error: ${error}`);
    throw error;
  }
};

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize services first
    await initializeServices();

    // Register routes (this will also initialize Agent Manager)
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      log(`❌ Error: ${status} - ${message}`);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = process.env.PORT || 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🌟 Library Companion server running on port ${port}`);
      log(`📊 Performance monitoring: http://localhost:${port}/api/performance`);
      log(`🤖 Agent system: http://localhost:${port}/api/intelligence`);
    });
  } catch (error) {
    log(`💥 Failed to start server: ${error}`);
    process.exit(1);
  }
})();
