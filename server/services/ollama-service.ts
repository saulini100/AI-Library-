import { Ollama } from 'ollama';
import axios from 'axios';

export interface OllamaConfig {
  host?: string;
  port?: number;
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxConnections?: number;
  cacheSize?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  context?: string;
  useCache?: boolean;
  timeout?: number;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  hitCount: number;
}

interface ConnectionInfo {
  ollama: Ollama;
  inUse: boolean;
  lastUsed: number;
}

export class OllamaService {
  private config: OllamaConfig;
  private isConnected: boolean = false;
  private connectionPool: ConnectionInfo[] = [];
  private responseCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly CONNECTION_TIMEOUT = 1000 * 60 * 5; // 5 minutes

  constructor(config: OllamaConfig) {
    this.config = {
      host: 'localhost',
      port: 11434,
      temperature: 0.7,
      maxTokens: 4096,
      maxConnections: 3, // Pool of 3 connections
      cacheSize: 1000, // Cache up to 1000 responses
      ...config
    };

    this.initializeConnectionPool();
    this.startCacheCleanup();
  }

  private initializeConnectionPool(): void {
    for (let i = 0; i < this.config.maxConnections!; i++) {
      this.connectionPool.push({
        ollama: new Ollama({
          host: `http://${this.config.host}:${this.config.port}`
        }),
        inUse: false,
        lastUsed: Date.now()
      });
    }
  }

  private async getAvailableConnection(): Promise<Ollama> {
    // Find available connection
    let connection = this.connectionPool.find(conn => !conn.inUse);
    
    if (!connection) {
      // Wait for a connection to become available
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getAvailableConnection();
    }

    connection.inUse = true;
    connection.lastUsed = Date.now();
    return connection.ollama;
  }

  private releaseConnection(ollama: Ollama): void {
    const connection = this.connectionPool.find(conn => conn.ollama === ollama);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  private generateCacheKey(prompt: string, options: GenerationOptions): string {
    // Extract document context from prompt if available
    let documentContext = '';
    let documentId = '';
    let chapterId = '';
    
    if (options.context) {
      // Look for document/chapter references in context
      const contextMatch = options.context.match(/document[:\s]*(\d+)|chapter[:\s]*(\d+)/i);
      if (contextMatch) {
        documentContext = contextMatch[0];
      }
      
      // Extract specific document and chapter IDs
      const docMatch = options.context.match(/document[:\s]*(\d+)/i);
      const chapterMatch = options.context.match(/chapter[:\s]*(\d+)/i);
      
      if (docMatch) documentId = docMatch[1];
      if (chapterMatch) chapterId = chapterMatch[1];
    }
    
    // Also check prompt for document references
    const promptMatch = prompt.match(/document[:\s]*(\d+)|chapter[:\s]*(\d+)/i);
    if (promptMatch && !documentContext) {
      documentContext = promptMatch[0];
    }
    
    // Extract document and chapter from prompt as well
    const promptDocMatch = prompt.match(/document[:\s]*(\d+)/i);
    const promptChapterMatch = prompt.match(/chapter[:\s]*(\d+)/i);
    
    if (promptDocMatch && !documentId) documentId = promptDocMatch[1];
    if (promptChapterMatch && !chapterId) chapterId = promptChapterMatch[1];
    
    // Create a more specific cache key that includes document and chapter
    const keyData = {
      prompt: prompt.substring(0, 500), // Limit key size
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      model: this.config.model,
      documentContext: documentContext,
      documentId: documentId || 'none',
      chapterId: chapterId || 'none',
      // Add a hash of the full prompt to ensure uniqueness
      promptHash: this.hashString(prompt)
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private getCachedResponse(cacheKey: string): string | null {
    const entry = this.responseCache.get(cacheKey);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    entry.hitCount++;
    console.log(`🚀 Cache hit for key: ${cacheKey.substring(0, 20)}... (hits: ${entry.hitCount})`);
    return entry.response;
  }

  private setCachedResponse(cacheKey: string, response: string): void {
    // Implement LRU cache eviction
    if (this.responseCache.size >= this.config.cacheSize!) {
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      this.responseCache.forEach((entry, key) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      });
      
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      hitCount: 0
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.responseCache.forEach((entry, key) => {
        if (now - entry.timestamp > this.CACHE_TTL) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.responseCache.delete(key));
      console.log(`🧹 Cache cleanup: ${this.responseCache.size} entries remaining`);
    }, this.CACHE_TTL);
  }

  async initialize(): Promise<void> {
    try {
      // Check if Ollama is running
      await this.checkConnection();
      
      // Ensure the model is available
      await this.ensureModel();
      
      // Clear existing cache to ensure document-aware caching takes effect
      this.responseCache.clear();
      console.log(`🧹 Cleared existing cache for document-aware caching`);
      
      this.isConnected = true;
      console.log(`✅ Ollama service initialized with model: ${this.config.model}`);
      console.log(`🔗 Connection pool: ${this.config.maxConnections} connections`);
      console.log(`💾 Cache size: ${this.config.cacheSize} entries`);
    } catch (error) {
      console.error('❌ Failed to initialize Ollama service:', error);
      throw error;
    }
  }

  // Clear cache entries for specific document to ensure fresh content
  clearCacheForDocument(documentId: number, chapter?: number): void {
    const keysToDelete: string[] = [];
    
    this.responseCache.forEach((entry, key) => {
      try {
        const keyData = JSON.parse(Buffer.from(key, 'base64').toString());
        if (keyData.documentId === documentId.toString() || 
            (chapter && keyData.chapterId === chapter.toString())) {
          keysToDelete.push(key);
        }
      } catch (error) {
        // Skip invalid cache keys
      }
    });
    
    keysToDelete.forEach(key => this.responseCache.delete(key));
    console.log(`🧹 Cleared ${keysToDelete.length} cache entries for document ${documentId}${chapter ? ` chapter ${chapter}` : ''}`);
  }

  private async checkConnection(): Promise<void> {
    try {
      const response = await axios.get(`http://${this.config.host}:${this.config.port}/api/tags`, {
        timeout: 5000
      });
      if (response.status !== 200) {
        throw new Error('Ollama server is not responding');
      }
    } catch (error) {
      throw new Error(`Cannot connect to Ollama server at ${this.config.host}:${this.config.port}. Please ensure Ollama is running.`);
    }
  }

  private async ensureModel(): Promise<void> {
    try {
      const connection = await this.getAvailableConnection();
      const models = await connection.list();
      this.releaseConnection(connection);
      
      const hasModel = models.models.some(m => m.name.includes(this.config.model));
      
      if (!hasModel) {
        console.log(`⚠️  Model ${this.config.model} not found. Checking for available alternatives...`);
        
        // Define fallback models in order of preference
        const fallbackModels = [
          'openthinker:7b',
          'phi3.5:3.8b-mini-instruct-q8_0',
          'llama3.2:3b',
          'mistral:7b'
        ];
        
        // Find the first available fallback model
        let fallbackModel = null;
        for (const model of fallbackModels) {
          const hasAlternative = models.models.some(m => m.name.includes(model));
          if (hasAlternative) {
            fallbackModel = model;
            break;
          }
        }
        
        if (fallbackModel) {
          console.log(`🔄 Using fallback model: ${fallbackModel}`);
          this.config.model = fallbackModel;
        } else {
          // Try to pull the original model as last resort
          console.log(`📥 Attempting to pull model ${this.config.model}...`);
          try {
            const pullConnection = await this.getAvailableConnection();
            await pullConnection.pull({ model: this.config.model });
            this.releaseConnection(pullConnection);
            console.log(`✅ Model ${this.config.model} downloaded successfully`);
          } catch (pullError) {
            console.error(`❌ Failed to pull model ${this.config.model}: ${pullError}`);
            // Use the first available model as final fallback
            if (models.models.length > 0) {
              const firstAvailable = models.models[0].name;
              console.log(`🆘 Using first available model: ${firstAvailable}`);
              this.config.model = firstAvailable;
            } else {
              throw new Error('No models available in Ollama');
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to ensure model availability: ${error}`);
    }
  }

  async generateText(prompt: string, options: GenerationOptions = {}): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Ollama service is not connected');
    }

    const startTime = performance.now();
    
    // 🚀 SMART DEFAULTS: Balance speed with completeness
    const defaultMaxTokens = prompt.length < 500 ? 800 : prompt.length < 1500 ? 1200 : 2000;
    // 🚀 INCREASED TIMEOUTS: Handle vision models and complex analysis tasks
    const defaultTimeout = options.timeout || (prompt.length < 500 ? 60000 : prompt.length < 1500 ? 90000 : 120000);
    
    // Check cache first (unless explicitly disabled)
    if (options.useCache !== false) {
      const cacheKey = this.generateCacheKey(prompt, options);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        const duration = performance.now() - startTime;
        console.log(`⚡ Cached response returned in ${duration.toFixed(2)}ms`);
        return cachedResponse;
      }
    }

    let connection: Ollama | null = null;
    try {
      connection = await this.getAvailableConnection();
      
      // 🚀 PERFORMANCE OPTIMIZED: More aggressive settings for speed
      const generateOptions = {
        temperature: options.temperature || this.config.temperature || 0.3,
        num_predict: options.maxTokens || defaultMaxTokens,
        // Performance optimizations
        top_p: 0.85, // Reduced from 0.9 for faster sampling
        repeat_penalty: 1.05, // Reduced from 1.1
        num_ctx: Math.min(2048, prompt.length + (options.maxTokens || defaultMaxTokens)), // Dynamic context size
        // Additional speed optimizations
        num_thread: 4, // Limit threads for faster response
        num_batch: 512, // Optimize batch size
        num_gqa: 1, // Grouped query attention optimization
      };

      // 🚀 ADD TIMEOUT: Prevent hanging requests
      const generatePromise = connection.generate({
        model: this.config.model,
        prompt: prompt.substring(0, 2000), // Limit prompt size for speed
        options: generateOptions,
        stream: false
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Ollama generation timeout')), defaultTimeout)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      // Cache the response
      if (options.useCache !== false) {
        const cacheKey = this.generateCacheKey(prompt, options);
        this.setCachedResponse(cacheKey, response.response);
      }

      const duration = performance.now() - startTime;
      console.log(`🚀 Generated response in ${duration.toFixed(2)}ms`);
      
      return response.response;
    } catch (error) {
      console.error('Error generating text:', error);
      
      // 🚀 FALLBACK: Return a template response for timeouts
      if (error instanceof Error && error.message.includes('timeout')) {
        const fallback = `Analysis of this content: The material appears to cover key concepts and themes. Due to processing constraints, a complete analysis is not available at this time.`;
        console.log('⚠️ Using fallback response due to timeout');
        return fallback;
      }
      
      throw new Error(`Text generation failed: ${error}`);
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  async chat(messages: ChatMessage[], options: GenerationOptions = {}): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Ollama service is not connected');
    }

    const startTime = performance.now();
    let connection: Ollama | null = null;

    try {
      connection = await this.getAvailableConnection();
      
      const response = await connection.chat({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        options: {
          temperature: options.temperature || this.config.temperature,
          num_predict: options.maxTokens || this.config.maxTokens,
          // Performance optimizations
          top_p: 0.9,
          repeat_penalty: 1.1,
        },
        stream: false
      });

      const duration = performance.now() - startTime;
      console.log(`💬 Chat response generated in ${duration.toFixed(2)}ms`);

      return response.message.content;
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error(`Chat failed: ${error}`);
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  async streamChat(messages: ChatMessage[], onChunk: (chunk: string) => void, options: GenerationOptions = {}): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Ollama service is not connected');
    }

    let connection: Ollama | null = null;
    try {
      connection = await this.getAvailableConnection();
      
      const response = await connection.chat({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        options: {
          temperature: options.temperature || this.config.temperature,
          num_predict: options.maxTokens || this.config.maxTokens,
        },
        stream: true
      });

      for await (const part of response) {
        if (part.message?.content) {
          onChunk(part.message.content);
        }
      }
    } catch (error) {
      console.error('Error in streaming chat:', error);
      throw new Error(`Streaming chat failed: ${error}`);
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  // Specialized methods for biblical text analysis
  async analyzeTextTheologically(text: string): Promise<string> {
    const prompt = `
As a biblical scholar and theologian, analyze the following text:

"${text}"

Please provide:
1. Theological themes and concepts
2. Historical context
3. Literary analysis (genre, structure, etc.)
4. Key insights and interpretations
5. Cross-references to related passages
6. Practical applications for modern readers

Be scholarly but accessible in your analysis.
`;

    return await this.generateText(prompt, { temperature: 0.3, useCache: true });
  }

  async generateStudyQuestions(text: string): Promise<string[]> {
    const prompt = `
Create thoughtful study questions for this biblical text:

"${text}"

Generate 8-10 questions that:
- Encourage deep reflection
- Explore different aspects of the text
- Connect to personal application
- Range from basic comprehension to advanced analysis
- Promote discussion and contemplation

Return each question on a new line.
`;

    const response = await this.generateText(prompt, { temperature: 0.6, useCache: true });
    return response.split('\n').filter(q => q.trim().length > 0);
  }

  async suggestStudyQuestions(text: string): Promise<string[]> {
    return this.generateStudyQuestions(text);
  }

  // Performance monitoring methods
  getPerformanceStats() {
    const totalConnections = this.connectionPool.length;
    const activeConnections = this.connectionPool.filter(conn => conn.inUse).length;
    const cacheSize = this.responseCache.size;
    const cacheHitRate = this.calculateCacheHitRate();

    return {
      isConnected: this.isConnected,
      model: this.config.model,
      host: this.config.host,
      port: this.config.port,
      connectionPool: {
        total: totalConnections,
        active: activeConnections,
        available: totalConnections - activeConnections
      },
      cache: {
        size: cacheSize,
        maxSize: this.config.cacheSize,
        hitRate: cacheHitRate
      }
    };
  }

  private calculateCacheHitRate(): number {
    const entries = Array.from(this.responseCache.values());
    if (entries.length === 0) return 0;
    
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalRequests = entries.length + totalHits;
    
    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  getStatus() {
    return this.getPerformanceStats();
  }

  // Language-aware text generation methods
  async generateTextWithLanguage(prompt: string, language: string = 'en', options: GenerationOptions = {}): Promise<string> {
    console.log(`🌐 [OLLAMA] Generating response in language: ${language}`);
    
    if (language === 'en') {
      console.log(`🌐 [OLLAMA] Using English generation (no language modification)`);
      return await this.generateText(prompt, options);
    }
    
    const languagePrompt = this.addLanguageContext(prompt, language);
    console.log(`🌐 [OLLAMA] Language prompt length: ${languagePrompt.length} chars`);
    console.log(`🌐 [OLLAMA] Language instructions preview: ${languagePrompt.substring(0, 200)}...`);
    
    const response = await this.generateText(languagePrompt, options);
    
    // Check if response is actually in the requested language
    const isEnglish = this.detectEnglishResponse(response);
    console.log(`🌐 [OLLAMA] Response language check - appears to be English: ${isEnglish}`);
    console.log(`🌐 [OLLAMA] Response preview: ${response.substring(0, 100)}...`);
    
    return response;
  }

  private detectEnglishResponse(response: string): boolean {
    // Simple English detection - check for common English words
    const englishIndicators = [
      'the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
      'this', 'that', 'these', 'those', 'with', 'from', 'they', 'their',
      'would', 'could', 'should', 'about', 'according', 'what', 'when', 'where'
    ];
    
    const lowerResponse = response.toLowerCase();
    const englishWordCount = englishIndicators.filter(word => 
      lowerResponse.includes(' ' + word + ' ') || 
      lowerResponse.startsWith(word + ' ') ||
      lowerResponse.includes(' ' + word + '.')
    ).length;
    
    // If more than 3 English indicators found, likely English
    return englishWordCount > 3;
  }

  async chatWithLanguage(messages: ChatMessage[], language: string = 'en', options: GenerationOptions = {}): Promise<string> {
    const languageSystemMessage = this.getLanguageSystemMessage(language);
    const messagesWithLanguage = [
      languageSystemMessage,
      ...messages
    ];
    return await this.chat(messagesWithLanguage, options);
  }

  private addLanguageContext(prompt: string, language: string): string {
    if (language === 'en') {
      return prompt; // No modification for English
    }

    const languageInstructions = this.getLanguageInstructions(language);
    return `${languageInstructions}\n\n${prompt}`;
  }

  private getLanguageSystemMessage(language: string): ChatMessage {
    const instructions = this.getLanguageInstructions(language);
    return {
      role: 'system',
      content: instructions
    };
  }

  private getLanguageInstructions(language: string): string {
    const languageMap = {
      'es': 'Spanish (Español)',
      'fr': 'French (Français)', 
      'de': 'German (Deutsch)',
      'ja': 'Japanese (日本語)',
      'ko': 'Korean (한국어)',
      'en': 'English'
    };

    const languageName = languageMap[language as keyof typeof languageMap] || language;

    if (language === 'en') {
      return 'You are a helpful AI assistant. Respond naturally in English.';
    }

    // MUCH STRONGER language enforcement
    return `🚨 CRITICAL LANGUAGE REQUIREMENT 🚨

YOU MUST RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()}. 

⚠️ ABSOLUTE RULES:
- ZERO English words allowed
- ZERO mixed languages allowed  
- EVERY single word must be in ${languageName}
- If you don't know a word in ${languageName}, describe it in ${languageName}
- Start your response immediately in ${languageName}
- End your response in ${languageName}

🌐 LANGUAGE: ${languageName}
📝 RESPONSE LANGUAGE: ${languageName} ONLY
🔒 ENFORCEMENT: STRICT

For biblical/religious content: Use traditional ${languageName} religious terminology.
For cultural context: Use ${languageName} cultural references and expressions.
For tone: Maintain natural, respectful ${languageName} conversation style.

⚡ BEGIN RESPONSE IN ${languageName} NOW:`;
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    this.responseCache.clear();
    console.log('🧹 OllamaService cleanup completed');
  }
} 