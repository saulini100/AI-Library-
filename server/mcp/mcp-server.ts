import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { storage } from '../storage.js';
import { MemoryService } from './memory-service.ts';

export class BibleCompanionMCPServer {
  private server: Server;
  private memoryService: MemoryService;

  constructor() {
    this.server = new Server(
      {
        name: 'bible-companion-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.memoryService = new MemoryService();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_user_annotations',
            description: 'Retrieve all annotations for a specific user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'number',
                  description: 'The ID of the user',
                },
              },
              required: ['userId'],
            },
          },
          {
            name: 'get_annotations_by_chapter',
            description: 'Get annotations for a specific chapter',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
                documentId: { type: 'number', description: 'Document ID' },
                chapter: { type: 'number', description: 'Chapter number' },
              },
              required: ['userId', 'documentId', 'chapter'],
            },
          },
          {
            name: 'create_annotation',
            description: 'Create a new annotation',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
                documentId: { type: 'number', description: 'Document ID' },
                chapter: { type: 'number', description: 'Chapter number' },
                paragraph: { type: 'number', description: 'Paragraph number (optional)' },
                selectedText: { type: 'string', description: 'Selected text' },
                note: { type: 'string', description: 'Annotation note' },
              },
              required: ['userId', 'documentId', 'chapter', 'selectedText', 'note'],
            },
          },
          {
            name: 'get_user_bookmarks',
            description: 'Retrieve all bookmarks for a user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
              },
              required: ['userId'],
            },
          },
          {
            name: 'get_reading_progress',
            description: 'Get reading progress for a user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
              },
              required: ['userId'],
            },
          },
          {
            name: 'search_documents',
            description: 'Search through user documents',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
                query: { type: 'string', description: 'Search query' },
              },
              required: ['userId', 'query'],
            },
          },
          {
            name: 'get_user_documents',
            description: 'Get all documents for a user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
              },
              required: ['userId'],
            },
          },
          {
            name: 'store_memory',
            description: 'Store information in AI memory for future reference',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
                content: { type: 'string', description: 'Content to remember' },
                category: { type: 'string', description: 'Memory category (study_pattern, preference, insight, etc.)' },
                metadata: { type: 'object', description: 'Additional metadata' },
              },
              required: ['userId', 'content', 'category'],
            },
          },
          {
            name: 'retrieve_memories',
            description: 'Retrieve relevant memories based on query',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
                query: { type: 'string', description: 'Query to find relevant memories' },
                category: { type: 'string', description: 'Optional category filter' },
                limit: { type: 'number', description: 'Maximum number of memories to return' },
              },
              required: ['userId', 'query'],
            },
          },
          {
            name: 'get_user_study_patterns',
            description: 'Analyze and return user study patterns from memory',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'number', description: 'User ID' },
              },
              required: ['userId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const typedArgs = args as any;

      try {
        switch (name) {
          case 'get_user_annotations':
            return await this.getUserAnnotations(typedArgs.userId);

          case 'get_annotations_by_chapter':
            return await this.getAnnotationsByChapter(
              typedArgs.userId,
              typedArgs.documentId,
              typedArgs.chapter
            );

          case 'create_annotation':
            return await this.createAnnotation(typedArgs);

          case 'get_user_bookmarks':
            return await this.getUserBookmarks(typedArgs.userId);

          case 'get_reading_progress':
            return await this.getReadingProgress(typedArgs.userId);

          case 'search_documents':
            return await this.searchDocuments(typedArgs.userId, typedArgs.query);

          case 'get_user_documents':
            return await this.getUserDocuments(typedArgs.userId);

          case 'store_memory':
            return await this.storeMemory(
              typedArgs.userId,
              typedArgs.content,
              typedArgs.category,
              typedArgs.metadata
            );

          case 'retrieve_memories':
            return await this.retrieveMemories(
              typedArgs.userId,
              typedArgs.query,
              typedArgs.category,
              typedArgs.limit
            );

          case 'get_user_study_patterns':
            return await this.getUserStudyPatterns(typedArgs.userId);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error}`
        );
      }
    });
  }

  private async getUserAnnotations(userId: number) {
    const annotations = await storage.getAnnotations(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(annotations, null, 2),
        },
      ],
    };
  }

  private async getAnnotationsByChapter(userId: number, documentId: number, chapter: number) {
    const annotations = await storage.getAnnotationsByChapter(userId, documentId, chapter);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(annotations, null, 2),
        },
      ],
    };
  }

  private async createAnnotation(args: any) {
    const annotation = await storage.createAnnotation({
      userId: args.userId,
      documentId: args.documentId,
      chapter: args.chapter,
      paragraph: args.paragraph,
      selectedText: args.selectedText,
      note: args.note,
    });

    // Store in memory for future reference
    await this.memoryService.storeMemory(
      args.userId,
      `User created annotation: "${args.note}" for text: "${args.selectedText}"`,
      'annotation',
      {
        documentId: args.documentId,
        chapter: args.chapter,
        paragraph: args.paragraph,
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(annotation, null, 2),
        },
      ],
    };
  }

  private async getUserBookmarks(userId: number) {
    const bookmarks = await storage.getBookmarks(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(bookmarks, null, 2),
        },
      ],
    };
  }

  private async getReadingProgress(userId: number) {
    const progress = await storage.getReadingProgress(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(progress, null, 2),
        },
      ],
    };
  }

  private async searchDocuments(userId: number, query: string) {
    const results = await storage.searchDocuments(userId, query);
    
    // Store search query in memory
    await this.memoryService.storeMemory(
      userId,
      `User searched for: "${query}"`,
      'search_query',
      { query, resultsCount: results.length }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async getUserDocuments(userId: number) {
    const documents = await storage.getDocuments(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(documents, null, 2),
        },
      ],
    };
  }

  private async storeMemory(userId: number, content: string, category: string, metadata?: any) {
    const memory = await this.memoryService.storeMemory(userId, content, category, metadata);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(memory, null, 2),
        },
      ],
    };
  }

  private async retrieveMemories(userId: number, query: string, category?: string, limit?: number) {
    const memories = await this.memoryService.retrieveMemories(userId, query, category, limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(memories, null, 2),
        },
      ],
    };
  }

  private async getUserStudyPatterns(userId: number) {
    const patterns = await this.memoryService.getUserStudyPatterns(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(patterns, null, 2),
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Library Companion MCP Server started');
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new BibleCompanionMCPServer();
  server.start().catch(console.error);
} 