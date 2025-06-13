import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { getBibleBooks, getBibleChapter, searchBible } from "./bible-data";
import { insertAnnotationSchema, insertBookmarkSchema, insertReadingProgressSchema } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function registerRoutes(app: Express): Promise<Server> {
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
    const user = await initializeUser();
    return user?.id || 1;
  };

  // Bible content routes
  app.get("/api/bible/books", async (req, res) => {
    try {
      const books = getBibleBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Bible books" });
    }
  });

  app.get("/api/bible/:book/:chapter", async (req, res) => {
    try {
      const { book, chapter } = req.params;
      const chapterData = getBibleChapter(book, parseInt(chapter));
      
      if (!chapterData) {
        return res.status(404).json({ error: "Chapter not found" });
      }
      
      res.json(chapterData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Bible chapter" });
    }
  });

  app.get("/api/bible/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const results = searchBible(q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search Bible" });
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

  app.get("/api/annotations/:book/:chapter", async (req, res) => {
    try {
      const { book, chapter } = req.params;
      const userId = await getDefaultUserId();
      const annotations = await storage.getAnnotationsByChapter(userId, book, parseInt(chapter));
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
      const userId = 1;
      const bookmarks = await storage.getBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse(req.body);
      const userId = 1;
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
      const userId = 1;
      const progress = await storage.getReadingProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reading progress" });
    }
  });

  app.post("/api/reading-progress", async (req, res) => {
    try {
      const progressData = insertReadingProgressSchema.parse(req.body);
      const userId = 1;
      const progress = await storage.updateReadingProgress({ ...progressData, userId });
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: "Invalid reading progress data" });
    }
  });

  // AI study assistant routes
  app.post("/api/ai/explain", async (req, res) => {
    try {
      const { text, book, chapter, verse } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const prompt = `Please explain this Bible verse in detail, providing historical context, theological significance, and practical application. 

Verse: ${book} ${chapter}:${verse}
Text: "${text}"

Please provide your response in JSON format with the following structure:
{
  "explanation": "detailed explanation of the verse",
  "historicalContext": "historical background and context",
  "theologicalSignificance": "theological meaning and importance",
  "practicalApplication": "how this applies to modern life"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get AI explanation" });
    }
  });

  app.post("/api/ai/cross-references", async (req, res) => {
    try {
      const { text, book, chapter, verse } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const prompt = `Find related Bible verses that connect to this passage thematically, theologically, or contextually.

Verse: ${book} ${chapter}:${verse}
Text: "${text}"

Please provide your response in JSON format with the following structure:
{
  "crossReferences": [
    {
      "reference": "Book Chapter:Verse",
      "text": "verse text",
      "connection": "explanation of how this relates"
    }
  ]
}

Limit to 5 most relevant cross-references.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cross-references" });
    }
  });

  app.post("/api/ai/historical-context", async (req, res) => {
    try {
      const { text, book, chapter, verse } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const prompt = `Provide detailed historical context for this Bible verse, including cultural background, historical setting, and original audience.

Verse: ${book} ${chapter}:${verse}
Text: "${text}"

Please provide your response in JSON format with the following structure:
{
  "historicalPeriod": "time period and dating",
  "culturalContext": "cultural and social background",
  "originalAudience": "who this was written for",
  "historicalSetting": "specific historical circumstances",
  "archaeologicalInsights": "relevant archaeological findings if any"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get historical context" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
