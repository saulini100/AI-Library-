# DocumentCompanion Developer Guide

## 👋 Welcome Developers

This guide provides comprehensive information for developers working on DocumentCompanion. Whether you're contributing to the core platform, building extensions, or integrating with the API, this guide will help you understand the codebase and development practices.

## 📋 Table of Contents

- [🏗️ Code Architecture](#️-code-architecture)
- [🔧 Development Workflow](#-development-workflow)
- [📁 Code Organization](#-code-organization)
- [🎨 Component Development](#-component-development)
- [🤖 AI Agent Development](#-ai-agent-development)
- [🔌 API Development](#-api-development)
- [🗄️ Database Development](#️-database-development)
- [🧪 Testing](#-testing)
- [🚀 Performance Optimization](#-performance-optimization)
- [🔒 Security Practices](#-security-practices)
- [🌐 Internationalization](#-internationalization)
- [📦 Package Management](#-package-management)
- [🛠️ Build & Deployment](#️-build--deployment)
- [📝 Code Standards](#-code-standards)
- [🔍 Debugging](#-debugging)

## 🏗️ Code Architecture

### **Project Structure**
```
DocumentCompanion/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Base UI components (Radix UI)
│   │   │   ├── ai-*.tsx       # AI-specific components
│   │   │   └── *.tsx          # Feature components
│   │   ├── pages/             # Page components (routes)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── contexts/          # React context providers
│   │   ├── services/          # API service layer
│   │   ├── lib/               # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── index.html             # HTML template
├── server/                     # Backend Node.js application
│   ├── agents/                # AI agent system
│   │   ├── base-agent.ts      # Base agent class
│   │   ├── *-agent.ts         # Specific agent implementations
│   │   └── agent-manager.ts   # Agent coordination
│   ├── services/              # Business logic services
│   │   ├── ollama-service.ts  # AI model integration
│   │   ├── *-service.ts       # Feature services
│   │   └── LocalMemoryService.ts
│   ├── routes/                # API route handlers
│   │   ├── *.ts               # Route definitions
│   │   └── index.ts           # Route registration
│   ├── mcp/                   # Model Context Protocol
│   ├── config/                # Configuration files
│   ├── db.ts                  # Database configuration
│   └── index.ts               # Server entry point
├── shared/                     # Shared TypeScript definitions
│   ├── schema.ts              # Database schema & types
│   └── types.ts               # Shared type definitions
├── migrations/                 # Database migrations
├── docs/                      # Documentation
└── config files               # Various configuration files
```

### **Architecture Patterns**
- **Clean Architecture**: Separation of concerns with clear boundaries
- **Service Layer**: Business logic isolated from API routes
- **Repository Pattern**: Data access abstraction
- **Event-Driven**: Real-time updates through WebSockets
- **Modular Design**: Feature-based code organization

## 🔧 Development Workflow

### **Getting Started**
```bash
# Clone and setup
git clone https://github.com/saulini100/AI-Library-.git
cd DocumentCompanion
npm install

# Database setup
npm run db:generate
npm run db:migrate

# Start development
npm run dev
```

### **Daily Development Workflow**
1. **Pull Latest Changes**
   ```bash
   git pull origin main
   npm install  # If dependencies changed
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Loop**
   ```bash
   npm run dev        # Start development server
   npm run check      # Type check
   npm run test       # Run tests
   ```

4. **Before Committing**
   ```bash
   npm run check      # Type check
   npm run test       # Run tests
   npm run build      # Test build
   ```

### **Git Workflow**
- **Main Branch**: Stable, production-ready code
- **Feature Branches**: Individual feature development
- **Conventional Commits**: Structured commit messages
- **Pull Requests**: Code review before merging

## 📁 Code Organization

### **Frontend Structure**
```typescript
// Component organization
client/src/components/
├── ui/                    # Base UI components
│   ├── button.tsx         # <Button /> component
│   ├── dialog.tsx         # <Dialog /> component
│   └── index.ts           # Component exports
├── ai-agent-chat.tsx      # AI chat interface
├── document-reader.tsx    # Document reading component
└── theme-provider.tsx     # Theme context provider

// Page organization
client/src/pages/
├── document-reader.tsx    # /reader/:id/:chapter
├── search.tsx            # /search
└── index.ts              # Page exports
```

### **Backend Structure**
```typescript
// Service organization
server/services/
├── ollama-service.ts      # AI model integration
├── document-rag-service.ts # RAG implementation
├── semantic-search-service.ts
└── multi-model-service.ts

// Route organization
server/routes/
├── documents.ts          # Document CRUD operations
├── ai-services.ts        # AI-related endpoints
├── user-features.ts      # User annotations, bookmarks
└── index.ts             # Route registration
```

### **Type Organization**
```typescript
// Shared types
shared/
├── schema.ts            # Database schema & types
├── types.ts             # Application types
└── api-types.ts         # API request/response types

// Example type definitions
export interface Document {
  id: number;
  title: string;
  content: ProcessedDocument;
  metadata: DocumentMetadata;
}

export interface AIResponse {
  response: string;
  confidence: number;
  sources: Source[];
}
```

## 🎨 Component Development

### **React Component Standards**
```typescript
// Component template
import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary';
}

export function Component({ 
  children, 
  className, 
  variant = 'default' 
}: ComponentProps) {
  return (
    <div className={cn(
      'base-styles',
      variant === 'secondary' && 'secondary-styles',
      className
    )}>
      {children}
    </div>
  );
}
```

### **Custom Hooks**
```typescript
// Custom hook example
import { useState, useEffect } from 'react';

export function useDocumentReader(documentId: number, chapter: number) {
  const [content, setContent] = useState<DocumentChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}/chapters/${chapter}`);
        const data = await response.json();
        setContent(data.chapter);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [documentId, chapter]);

  return { content, loading, error };
}
```

### **Context Providers**
```typescript
// Context example
import React, { createContext, useContext, useState } from 'react';

interface LanguageContext {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContext | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('en');

  const t = (key: string) => {
    // Translation logic
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
```

## 🤖 AI Agent Development

### **Creating Custom Agents**
```typescript
// Base agent implementation
import { BaseAgent } from './base-agent.js';

export class CustomAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    this.name = 'CustomAgent';
    this.capabilities = ['custom_analysis', 'special_processing'];
  }

  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!this.validateInput(message)) {
        throw new Error('Invalid input');
      }

      // Process with AI
      const result = await this.processWithAI(message.content);

      // Format response
      const response = this.formatResponse(result);

      return {
        success: true,
        data: response,
        processingTime: Date.now() - startTime,
        confidence: this.calculateConfidence(result)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  private validateInput(message: AgentMessage): boolean {
    // Input validation logic
    return message.content && message.content.length > 0;
  }

  private async processWithAI(content: string): Promise<any> {
    // AI processing logic
    return await this.ollamaService.generateText(content);
  }

  private formatResponse(result: any): any {
    // Response formatting logic
    return {
      response: result.text,
      metadata: result.metadata
    };
  }

  private calculateConfidence(result: any): number {
    // Confidence calculation logic
    return 0.85; // Example confidence score
  }
}
```

### **Agent Registration**
```typescript
// Register agent in agent manager
import { AgentManager } from './agent-manager.js';
import { CustomAgent } from './custom-agent.js';

const agentManager = new AgentManager();

agentManager.registerAgent('custom-agent', CustomAgent, {
  model: 'qwen2.5:7b-instruct',
  temperature: 0.7,
  maxTokens: 1024,
  enableLogging: true
});
```

### **Agent Communication**
```typescript
// Agent-to-agent communication
export class CoordinatingAgent extends BaseAgent {
  async processComplexTask(task: ComplexTask): Promise<any> {
    // Request analysis from text analysis agent
    const analysis = await this.requestFromAgent('text-analysis', {
      type: 'ANALYZE_CONTENT',
      content: task.content
    });

    // Request insights from insight generation agent
    const insights = await this.requestFromAgent('insight-generation', {
      type: 'GENERATE_INSIGHTS',
      content: task.content,
      analysis: analysis.data
    });

    // Combine results
    return this.combineResults(analysis, insights);
  }
}
```

## 🔌 API Development

### **Route Handler Pattern**
```typescript
// Route handler example
import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { documents } from '../shared/schema.js';

const router = Router();

// GET /api/documents
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));

    res.json({
      success: true,
      data: userDocuments,
      total: userDocuments.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;
```

### **Service Layer Pattern**
```typescript
// Service implementation
export class DocumentService {
  constructor(private db: Database) {}

  async createDocument(userId: number, file: Express.Multer.File): Promise<Document> {
    // Process file
    const processedContent = await this.processFile(file);
    
    // Save to database
    const [document] = await this.db
      .insert(documents)
      .values({
        userId,
        title: file.originalname,
        filename: file.filename,
        fileType: file.mimetype,
        content: JSON.stringify(processedContent),
        totalChapters: processedContent.chapters.length
      })
      .returning();

    // Trigger AI analysis
    await this.triggerAIAnalysis(document.id);

    return document;
  }

  private async processFile(file: Express.Multer.File): Promise<ProcessedDocument> {
    // File processing logic
    return new DocumentProcessor().process(file);
  }

  private async triggerAIAnalysis(documentId: number): Promise<void> {
    // Trigger background AI analysis
    await agentManager.requestAgentTask('text-analysis', 'ANALYZE_DOCUMENT', {
      documentId,
      priority: 'high'
    });
  }
}
```

### **Middleware Development**
```typescript
// Authentication middleware
export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'No session provided' });
  }

  // Validate session
  const user = validateSession(sessionId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.user = user;
  next();
}

// Rate limiting middleware
export function rateLimit(windowMs: number, max: number) {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests
    let userRequests = requests.get(key) || [];
    
    // Filter out old requests
    userRequests = userRequests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (userRequests.length >= max) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Add current request
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
}
```

## 🗄️ Database Development

### **Schema Definition**
```typescript
// Database schema using Drizzle ORM
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').default("datetime('now')").notNull(),
  updatedAt: text('updated_at').default("datetime('now')").notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  titleIdx: index('title_idx').on(table.title),
}));

// Type inference
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
```

### **Database Queries**
```typescript
// Query examples
import { db } from '../db.js';
import { documents, annotations } from '../shared/schema.js';
import { eq, and, desc, like } from 'drizzle-orm';

// Complex query with joins
export async function getDocumentWithAnnotations(documentId: number, userId: number) {
  const result = await db
    .select({
      document: documents,
      annotations: {
        id: annotations.id,
        selectedText: annotations.selectedText,
        note: annotations.note,
        createdAt: annotations.createdAt,
      }
    })
    .from(documents)
    .leftJoin(annotations, and(
      eq(annotations.documentId, documents.id),
      eq(annotations.userId, userId)
    ))
    .where(and(
      eq(documents.id, documentId),
      eq(documents.userId, userId)
    ));

  return result;
}

// Search query
export async function searchDocuments(userId: number, query: string) {
  return await db
    .select()
    .from(documents)
    .where(and(
      eq(documents.userId, userId),
      like(documents.title, `%${query}%`)
    ))
    .orderBy(desc(documents.createdAt));
}
```

### **Migration Example**
```typescript
// Migration file: migrations/001_add_ai_features.sql
CREATE TABLE IF NOT EXISTS ai_memories (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX ai_memories_user_id_idx ON ai_memories(user_id);
CREATE INDEX ai_memories_category_idx ON ai_memories(category);
```

## 🧪 Testing

### **Unit Testing**
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentReader } from '../components/document-reader';

describe('DocumentReader', () => {
  it('renders document content', () => {
    const mockDocument = {
      id: 1,
      title: 'Test Document',
      chapters: [
        {
          number: 1,
          title: 'Chapter 1',
          paragraphs: [
            { number: 1, text: 'Test paragraph' }
          ]
        }
      ]
    };

    render(<DocumentReader document={mockDocument} />);
    
    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('Test paragraph')).toBeInTheDocument();
  });

  it('handles chapter navigation', () => {
    // Test implementation
  });
});
```

### **API Testing**
```typescript
// API route testing
import request from 'supertest';
import { app } from '../server/index.js';

describe('Documents API', () => {
  it('GET /api/documents returns user documents', async () => {
    const response = await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer test-session-id')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('POST /api/documents creates new document', async () => {
    const response = await request(app)
      .post('/api/documents')
      .set('Authorization', 'Bearer test-session-id')
      .attach('file', 'test-files/sample.pdf')
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('sample.pdf');
  });
});
```

### **AI Agent Testing**
```typescript
// Agent testing
import { TextAnalysisAgent } from '../server/agents/text-analysis-agent.js';

describe('TextAnalysisAgent', () => {
  let agent: TextAnalysisAgent;

  beforeEach(() => {
    agent = new TextAnalysisAgent({
      model: 'test-model',
      temperature: 0.7
    });
  });

  it('analyzes document themes', async () => {
    const result = await agent.analyzeDocument({
      documentId: 1,
      chapter: 1,
      analysisType: 'themes'
    });

    expect(result.success).toBe(true);
    expect(result.data.themes).toBeDefined();
    expect(Array.isArray(result.data.themes)).toBe(true);
  });
});
```

## 🚀 Performance Optimization

### **Frontend Optimization**
```typescript
// Component optimization
import React, { memo, useMemo, useCallback } from 'react';

// Memoized component
export const DocumentParagraph = memo(({ paragraph, onSelect }: {
  paragraph: DocumentParagraph;
  onSelect: (text: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(paragraph.text);
  }, [paragraph.text, onSelect]);

  return (
    <div onClick={handleSelect}>
      {paragraph.text}
    </div>
  );
});

// Optimized list rendering
export function DocumentContent({ chapters }: { chapters: DocumentChapter[] }) {
  const renderedChapters = useMemo(() => {
    return chapters.map(chapter => (
      <ChapterComponent key={chapter.id} chapter={chapter} />
    ));
  }, [chapters]);

  return <div>{renderedChapters}</div>;
}
```

### **API Optimization**
```typescript
// Response caching
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 15 // 15 minutes
});

export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = `${req.method}:${req.url}`;
  const cached = cache.get(key);
  
  if (cached) {
    return res.json(cached);
  }

  const originalSend = res.json;
  res.json = function(data) {
    cache.set(key, data);
    return originalSend.call(this, data);
  };

  next();
}
```

### **Database Optimization**
```typescript
// Query optimization
export async function getDocumentsWithStats(userId: number) {
  // Optimized query with aggregations
  const result = await db
    .select({
      id: documents.id,
      title: documents.title,
      createdAt: documents.createdAt,
      annotationCount: count(annotations.id),
      lastRead: max(readingProgress.createdAt)
    })
    .from(documents)
    .leftJoin(annotations, eq(annotations.documentId, documents.id))
    .leftJoin(readingProgress, eq(readingProgress.documentId, documents.id))
    .where(eq(documents.userId, userId))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));

  return result;
}
```

## 🔒 Security Practices

### **Input Validation**
```typescript
import { z } from 'zod';

// Input validation schemas
const DocumentUploadSchema = z.object({
  title: z.string().min(1).max(255),
  file: z.object({
    mimetype: z.enum(['application/pdf', 'text/plain']),
    size: z.number().max(50 * 1024 * 1024) // 50MB
  })
});

// Validation middleware
export function validateInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
  };
}
```

### **SQL Injection Prevention**
```typescript
// Always use parameterized queries
export async function getUserDocuments(userId: number) {
  // Good: Using Drizzle ORM with type safety
  return await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId));
}

// Never: String concatenation
// const query = `SELECT * FROM documents WHERE user_id = ${userId}`;
```

### **XSS Prevention**
```typescript
// HTML sanitization
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}
```

## 🌐 Internationalization

### **Translation Setup**
```typescript
// Translation system
interface Translations {
  [key: string]: {
    [locale: string]: string;
  };
}

const translations: Translations = {
  'document.title': {
    en: 'Document',
    es: 'Documento',
    fr: 'Document',
    de: 'Dokument'
  },
  'ai.chat.placeholder': {
    en: 'Ask me anything about this document...',
    es: 'Pregúntame cualquier cosa sobre este documento...',
    fr: 'Demandez-moi tout sur ce document...',
    de: 'Fragen Sie mich alles über dieses Dokument...'
  }
};

export function t(key: string, locale: string = 'en'): string {
  return translations[key]?.[locale] || key;
}
```

### **Component Localization**
```typescript
// Localized component
import { useLanguage } from '../contexts/LanguageContext';

export function LocalizedComponent() {
  const { language, t } = useLanguage();

  return (
    <div>
      <h1>{t('document.title')}</h1>
      <input placeholder={t('ai.chat.placeholder')} />
    </div>
  );
}
```

## 📦 Package Management

### **Dependency Management**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "express": "^4.18.0",
    "drizzle-orm": "^0.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}
```

### **Version Management**
```bash
# Check outdated packages
npm outdated

# Update packages
npm update

# Audit security vulnerabilities
npm audit
npm audit fix
```

## 🛠️ Build & Deployment

### **Build Configuration**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

### **Production Build**
```bash
# Build for production
npm run build

# Start production server
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

## 📝 Code Standards

### **TypeScript Configuration**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["client/src/**/*", "server/**/*", "shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### **ESLint Configuration**
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "react-hooks/recommended"
  ],
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### **Prettier Configuration**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 🔍 Debugging

### **Frontend Debugging**
```typescript
// React DevTools
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Add to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.__APP_STATE__ = {
    version: '1.0.0',
    debug: true
  };
}
```

### **Backend Debugging**
```typescript
// Debug middleware
export function debugMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.url}`, {
      headers: req.headers,
      body: req.body,
      query: req.query
    });
  }
  next();
}
```

### **AI Agent Debugging**
```typescript
// Agent debugging
export class DebugAgent extends BaseAgent {
  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now();
    
    this.log(`Processing message: ${message.type}`);
    this.log(`Input: ${JSON.stringify(message.payload)}`);
    
    const result = await super.processMessage(message);
    
    this.log(`Processing time: ${Date.now() - startTime}ms`);
    this.log(`Output: ${JSON.stringify(result)}`);
    
    return result;
  }
}
```

## 🎯 Best Practices

### **Code Quality**
- Write self-documenting code
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic
- Use TypeScript for type safety

### **Performance**
- Implement proper caching strategies
- Optimize database queries
- Use code splitting for large applications
- Implement lazy loading where appropriate
- Monitor and profile performance regularly

### **Security**
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Follow OWASP guidelines
- Regular security audits

### **Testing**
- Write tests for critical functionality
- Maintain good test coverage
- Use appropriate testing strategies
- Test edge cases and error conditions
- Automate testing in CI/CD pipeline

## 🔗 Additional Resources

### **Documentation**
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### **Tools**
- [React DevTools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)

---

This developer guide provides comprehensive coverage of the DocumentCompanion codebase and development practices. For specific questions or contributions, please refer to the contributing guidelines or contact the development team. 