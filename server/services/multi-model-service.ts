import '../env.js'; // Load environment variables first
import { Ollama } from 'ollama';
import axios from 'axios';
import { getModelConfig } from '../config/models-config.js';

export interface ModelConfig {
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'local';
  host?: string;
  port?: number;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  specialties: string[];
  performance: {
    speed: number; // 1-10 scale
    accuracy: number; // 1-10 scale
    reasoning: number; // 1-10 scale
    creativity: number; // 1-10 scale
  };
}

export interface TaskType {
  name: string;
  requirements: {
    speed?: number;
    accuracy?: number;
    reasoning?: number;
    creativity?: number;
  };
  preferredModels: string[];
}

export class MultiModelService {
  private models: Map<string, ModelConfig> = new Map();
  private taskTypes: Map<string, TaskType> = new Map();
  private modelInstances: Map<string, any> = new Map();
  private modelPerformance: Map<string, { totalRequests: number; totalTime: number; successRate: number }> = new Map();

  constructor() {
    this.initializeDefaultModels();
    this.initializeTaskTypes();
  }

  private initializeDefaultModels(): void {
    // Use externalized configuration
    const { models } = getModelConfig();
    
    models.forEach(model => {
      this.models.set(model.name, model);
      this.modelPerformance.set(model.name, {
        totalRequests: 0,
        totalTime: 0,
        successRate: 1.0
      });
    });
  }

  private initializeTaskTypes(): void {
    // Use externalized configuration
    const { taskTypes } = getModelConfig();

    taskTypes.forEach(task => {
      this.taskTypes.set(task.name, task);
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Multi-Model Service...');
    
    // Initialize Ollama models (fallback/local mode)
    console.log('🏠 Using local Ollama models');
    for (const [modelName, config] of Array.from(this.models.entries())) {
      if (config.provider === 'ollama') {
        try {
          const ollama = new Ollama({
            host: `http://${config.host}:${config.port}`
          });
          
          // Check if model is available
          const models = await ollama.list();
          const availableModelNames = models.models.map(m => m.name);
          console.log(`🔍 Available models: ${availableModelNames.join(', ')}`);
          console.log(`🎯 Looking for model: ${modelName}`);
          
          const isAvailable = models.models.some(m => 
            m.name === modelName || 
            m.name === `${modelName}:latest` || 
            m.name.startsWith(`${modelName}:`)
          );
          
          if (isAvailable) {
            this.modelInstances.set(modelName, ollama);
            console.log(`✅ Model ${modelName} initialized successfully`);
          } else {
            console.log(`⚠️  Model ${modelName} not found, attempting to pull...`);
            try {
              await ollama.pull({ model: modelName });
              this.modelInstances.set(modelName, ollama);
              console.log(`✅ Model ${modelName} pulled and initialized`);
            } catch (pullError) {
              console.log(`❌ Failed to pull model ${modelName}: ${pullError}`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to initialize ${modelName}: ${error}`);
        }
      }
    }

    console.log(`🎯 Multi-Model Service initialized with ${this.modelInstances.size} active models`);
  }

  // 🧠 INTELLIGENT MODEL SELECTION
  selectOptimalModel(taskType: string, requirements?: Partial<TaskType['requirements']>): string {
    const task = this.taskTypes.get(taskType);
    if (!task) {
      console.warn(`Unknown task type: ${taskType}, using default model`);
      return 'gemma3n:e2b';
    }

    // Merge task requirements with custom requirements
    const finalRequirements = { ...task.requirements, ...requirements };
    
    // Score each model based on requirements
    let bestModel = '';
    let bestScore = -1;

    for (const modelName of task.preferredModels) {
      const model = this.models.get(modelName);
      if (!model || !this.modelInstances.has(modelName)) continue;

      // Calculate weighted score
      let score = 0;
      let totalWeight = 0;

      Object.entries(finalRequirements).forEach(([req, importance]) => {
        if (importance && req in model.performance) {
          const modelCapability = model.performance[req as keyof typeof model.performance];
          score += modelCapability * importance;
          totalWeight += importance;
        }
      });

      // Normalize score
      score = totalWeight > 0 ? score / totalWeight : 0;

      // Add speed preference bonus (favor faster models for equal capability)
      const speedBonus = model.performance.speed * 0.1; // 10% bonus based on speed rating
      score += speedBonus;

      // Apply performance bonus based on historical data
      const perf = this.modelPerformance.get(modelName);
      if (perf && perf.totalRequests > 0) {
        const avgResponseTime = perf.totalTime / perf.totalRequests;
        const reliabilityBonus = perf.successRate;
        score = score * (1 + reliabilityBonus * 0.1);
      }

      if (score > bestScore) {
        bestScore = score;
        bestModel = modelName;
      }
    }

    console.log(`🎯 Selected ${bestModel} for ${taskType} (score: ${bestScore.toFixed(2)})`);
    return bestModel || 'gemma3n:e2b';
  }

  // 🚀 EXECUTE TASK WITH OPTIMAL MODEL
  async executeTask(taskType: string, prompt: string, options: {
    requirements?: Partial<TaskType['requirements']>;
    temperature?: number;
    maxTokens?: number;
    useCache?: boolean;
    timeout?: number;
    costSensitive?: boolean;
  } = {}): Promise<{ response: string; modelUsed: string; executionTime: number; cost?: number }> {
    
    // 🏠 Fallback to local Ollama models
    const selectedModel = this.selectOptimalModel(taskType, options.requirements);
    
    // Try primary model first, then fallback to faster model if timeout
    try {
      const result = await this.executeWithModel(selectedModel, taskType, prompt, options);
      return { ...result, cost: 0 }; // Local models are free
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn(`⚡ ${selectedModel} timed out for ${taskType}, trying faster fallback model...`);
        
        // Select a faster model for fallback
        const fastModel = this.selectFastFallbackModel(taskType);
        if (fastModel !== selectedModel) {
          console.log(`🏃‍♂️ Fallback: ${selectedModel} → ${fastModel} for ${taskType}`);
          const fastOptions = {
            ...options,
            timeout: (options.timeout || 60000) * 0.9 // Reduce timeout to 90% for fast model (less aggressive)
          };
          
          try {
            const result = await this.executeWithModel(fastModel, taskType, prompt, fastOptions);
            console.log(`✅ Fallback succeeded: ${fastModel} completed ${taskType} in ${result.executionTime.toFixed(2)}ms`);
            return { ...result, cost: 0 }; // Local models are free
          } catch (fallbackError) {
            console.error(`❌ Fallback failed: ${fastModel} also failed for ${taskType}: ${fallbackError}`);
            throw fallbackError;
          }
        }
      }
      throw error;
    }
  }

  // 🏃‍♂️ SELECT FAST FALLBACK MODEL
  private selectFastFallbackModel(taskType: string): string {
    // Primary fallback: llama3.2:3b - fastest for most tasks
    if (this.modelInstances.has('llama3.2:3b')) {
      return 'llama3.2:3b';
    }
    
    // Secondary fallback: gemma3n:e2b - excellent balance of speed and accuracy
    if (this.modelInstances.has('gemma3n:e2b')) {
      return 'gemma3n:e2b';
    }
    
    // Tertiary fallback options in order of speed
    const fallbackOrder = ['phi3.5:3.8b-mini-instruct-q8_0', 'mistral:7b'];
    
    for (const model of fallbackOrder) {
      if (this.modelInstances.has(model)) {
        return model;
      }
    }
    
    // If nothing else is available, return the first available model
    return Array.from(this.modelInstances.keys())[0] || 'gemma3n:e2b';
  }

  // 🎯 EXECUTE WITH SPECIFIC MODEL (PUBLIC METHOD)
  async executeWithSpecificModel(
    modelName: string, 
    prompt: string, 
    options: {
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
      taskType?: string; // Optional task type for logging/optimization
    } = {}
  ): Promise<{ response: string; modelUsed: string; executionTime: number }> {
    const taskType = options.taskType || 'direct-execution';
    
    // Validate model exists
    if (!this.modelInstances.has(modelName)) {
      throw new Error(`Model ${modelName} is not available. Available models: ${this.getAvailableModels().join(', ')}`);
    }
    
    return await this.executeWithModel(modelName, taskType, prompt, options);
  }

  // 🎯 EXECUTE WITH SPECIFIC MODEL
  private async executeWithModel(
    modelName: string, 
    taskType: string, 
    prompt: string, 
    options: any
  ): Promise<{ response: string; modelUsed: string; executionTime: number }> {
    
    const modelConfig = this.models.get(modelName);
    const modelInstance = this.modelInstances.get(modelName);

    if (!modelConfig || !modelInstance) {
      throw new Error(`Model ${modelName} not available`);
    }

    // Optimize prompt for the specific model
    const optimizedPrompt = this.optimizePromptForModel(prompt, modelName);

    const startTime = performance.now();
    
    // Smart timeout based on model characteristics
    const modelTimeout = this.calculateSmartTimeout(modelName, taskType, options.timeout);
    
    try {
      let response: string;
      
      if (modelConfig.provider === 'ollama') {
        // Add timeout wrapper for Ollama requests
        const ollamaRequest = modelInstance.generate({
          model: modelName,
          prompt: optimizedPrompt,
          options: {
            temperature: options.temperature || modelConfig.temperature,
            num_predict: options.maxTokens || modelConfig.maxTokens
          }
        }).then((result: any) => result.response);

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${modelName} timeout after ${modelTimeout}ms`)), modelTimeout)
        );

        response = await Promise.race([ollamaRequest, timeoutPromise]);
        
      } else {
        throw new Error(`Provider ${modelConfig.provider} not yet implemented`);
      }

      const executionTime = performance.now() - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(modelName, executionTime, true);
      
      console.log(`✅ ${modelName} completed ${taskType} in ${executionTime.toFixed(2)}ms`);
      
      return {
        response,
        modelUsed: modelName,
        executionTime
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(modelName, executionTime, false);
      
      console.error(`❌ ${modelName} failed for ${taskType}: ${error}`);
      
      // Provide a meaningful fallback response for timeouts
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Model response timeout (${modelTimeout}ms exceeded). Try reducing complexity or increasing timeout.`);
      }
      
      throw error;
    }
  }

  // ⏱️ CALCULATE SMART TIMEOUT
  private calculateSmartTimeout(modelName: string, taskType: string, explicitTimeout?: number): number {
    if (explicitTimeout) return explicitTimeout;
    // Fast timeout for embedding tasks
    if (taskType === 'embedding-generation' || taskType === 'vector-similarity') {
      return 20000;
    }
    // Base timeouts for each model (in milliseconds) - optimized for reliability
    const modelBaseTimeouts: { [key: string]: number } = {
      'gemma3n:e4b': 75000,   // 75s for advanced thesis work
      'gemma3n:e2b': 60000,   // Increased to 60s to prevent 30s timeout
      'llama3.2:3b': 45000,   // Increased to 45s  
      'mistral:7b': 60000,    // Increased to 60s
      'phi3.5:3.8b-mini-instruct-q8_0': 50000, // Increased to 50s
      'nomic-embed-text:v1.5': 35000,          // Increased to 35s
      'qwen2.5vl:7b': 120000  // Increased to 120s for vision processing
    };
    // Task complexity multipliers
    const taskMultipliers: Record<string, number> = {
      'theological-reasoning': 1.5,
      'expert-reasoning': 1.5,
      'universal-reasoning': 1.3,  // Added for RAG responses
      'thesis-analysis': 2.0,      // Longest timeout for thesis work
      'academic-writing': 1.8,     // Extended for academic writing
      'scholarly-research': 1.7,   // Extended for research tasks
      'dissertation-support': 2.2, // Maximum timeout for dissertation work
      'text-analysis': 1.2,
      'creative-insights': 1.3,
      'quick-classification': 0.6,
      'summarization': 0.8,
      'embedding-generation': 0.4,
      'group-discussion': 1.0,
      'ai-interaction': 0.9
    };
    const baseTimeout = modelBaseTimeouts[modelName] || 60000; // Increased default to 60s
    const multiplier = taskMultipliers[taskType] || 1.0;
    return Math.round(baseTimeout * multiplier);
  }

  // 🔧 OPTIMIZE PROMPT FOR SPECIFIC MODEL
  private optimizePromptForModel(prompt: string, modelName: string): string {
    if (modelName.includes('gemma3n:e4b')) {
      // Gemma3n:e4b excels at advanced academic work - give it detailed instructions
      return `${prompt}\n\nIMPORTANT: You are an advanced academic AI assistant. Provide comprehensive, well-structured responses with:\n- Deep analytical thinking\n- Scholarly precision\n- Critical evaluation\n- Proper academic reasoning\n- Detailed explanations\nRespond directly without showing your thinking process.`;
    }
    
    if (modelName.includes('llama3.2')) {
      // Llama3.2 prefers concise, direct prompts
      return `${prompt}\n\nProvide a clear, concise response.`;
    }
    
    if (modelName.includes('gemma3n')) {
      // Disable thinking mode for gemma3n - direct response only
      return `${prompt}\n\nIMPORTANT: Respond directly without showing your thinking process. Provide only the final answer.`;
    }
    
    if (modelName.includes('mistral')) {
      // Mistral is good with creative tasks
      return `${prompt}\n\nBe creative and insightful in your response.`;
    }
    
    if (modelName.includes('phi3.5')) {
      // Phi3.5 excels at structured reasoning
      return `${prompt}\n\nProvide a well-structured, logical response.`;
    }
    
    // Default optimization
    return prompt;
  }

  // 📊 UPDATE PERFORMANCE METRICS
  private updatePerformanceMetrics(modelName: string, executionTime: number, success: boolean): void {
    const perf = this.modelPerformance.get(modelName);
    if (perf) {
      perf.totalRequests++;
      perf.totalTime += executionTime;
      perf.successRate = (perf.successRate * (perf.totalRequests - 1) + (success ? 1 : 0)) / perf.totalRequests;
    }
  }

  // 📈 PERFORMANCE ANALYTICS
  getModelPerformanceReport(): any {
    const report: any = {};
    
    this.modelPerformance.forEach((perf, modelName) => {
      const model = this.models.get(modelName);
      report[modelName] = {
        totalRequests: perf.totalRequests,
        averageResponseTime: perf.totalRequests > 0 ? perf.totalTime / perf.totalRequests : 0,
        successRate: perf.successRate,
        specialties: model?.specialties || [],
        capabilities: model?.performance || {}
      };
    });

    return report;
  }

  // 🔧 DYNAMIC MODEL MANAGEMENT
  async addModel(config: ModelConfig): Promise<void> {
    this.models.set(config.name, config);
    
    if (config.provider === 'ollama') {
      try {
        const ollama = new Ollama({
          host: `http://${config.host}:${config.port}`
        });
        this.modelInstances.set(config.name, ollama);
        console.log(`✅ Added new model: ${config.name}`);
      } catch (error) {
        console.error(`❌ Failed to add model ${config.name}: ${error}`);
      }
    }
  }

  getAvailableModels(): string[] {
    return Array.from(this.modelInstances.keys());
  }

  getTaskTypes(): string[] {
    return Array.from(this.taskTypes.keys());
  }

  // 🎯 SPECIALIZED METHODS FOR COMMON TASKS
  async analyzeText(text: string, analysisType: 'sentiment' | 'themes' | 'complexity' | 'theological' = 'themes'): Promise<any> {
    const taskType = analysisType === 'theological' ? 'theological-reasoning' : 'text-analysis';
    const result = await this.executeTask(taskType, 
      `Analyze this text for ${analysisType}:\n\n${text}\n\nProvide detailed analysis as JSON.`,
      { requirements: { accuracy: 9, reasoning: 8 } }
    );
    
    try {
      return JSON.parse(result.response);
    } catch {
      return { analysis: result.response, modelUsed: result.modelUsed };
    }
  }

  async generateInsights(content: string, insightType: 'creative' | 'analytical' | 'theological' = 'analytical'): Promise<string> {
    const taskType = insightType === 'creative' ? 'creative-insights' : 'theological-reasoning';
    const result = await this.executeTask(taskType,
      `Generate ${insightType} insights about this content:\n\n${content}`,
      { requirements: insightType === 'creative' ? { creativity: 9 } : { reasoning: 9, accuracy: 8 } }
    );
    
    return result.response;
  }

  async quickClassify(text: string, categories: string[]): Promise<string> {
    const result = await this.executeTask('quick-classification',
      `Classify this text into one of these categories: ${categories.join(', ')}\n\nText: ${text}\n\nReturn only the category name.`,
      { requirements: { speed: 8, accuracy: 6 } }
    );
    
    return result.response.trim();
  }

  // 🎓 THESIS & ACADEMIC METHODS
  async analyzeThesis(content: string, analysisType: 'argument' | 'structure' | 'evidence' | 'methodology' = 'argument'): Promise<string> {
    const result = await this.executeTask('thesis-analysis',
      `Perform a ${analysisType} analysis of this thesis content:\n\n${content}\n\nProvide detailed academic analysis with specific recommendations.`,
      { requirements: { reasoning: 10, accuracy: 10 } }
    );
    
    return result.response;
  }

  async generateAcademicWriting(prompt: string, style: 'formal' | 'analytical' | 'argumentative' = 'formal'): Promise<string> {
    const result = await this.executeTask('academic-writing',
      `Generate ${style} academic writing for: ${prompt}\n\nEnsure proper academic tone, structure, and scholarly language.`,
      { requirements: { reasoning: 9, accuracy: 9, creativity: 8 } }
    );
    
    return result.response;
  }

  async conductScholarlyResearch(query: string, domain: string): Promise<string> {
    const result = await this.executeTask('scholarly-research',
      `Conduct scholarly research on: ${query}\n\nDomain: ${domain}\n\nProvide comprehensive research findings with analysis and implications.`,
      { requirements: { reasoning: 10, accuracy: 10 } }
    );
    
    return result.response;
  }

  async provideDissertationSupport(content: string, supportType: 'review' | 'critique' | 'improvement' | 'structure' = 'review'): Promise<string> {
    const result = await this.executeTask('dissertation-support',
      `Provide ${supportType} support for this dissertation content:\n\n${content}\n\nOffer detailed academic guidance and specific recommendations.`,
      { requirements: { reasoning: 10, accuracy: 10, creativity: 9 } }
    );
    
    return result.response;
  }

  // 🔗 EMBEDDING METHODS for RAG with Nomic Embed
  async generateEmbedding(text: string): Promise<number[]> {
    // 🏠 Always use local Ollama for embeddings - faster, no rate limits, cost-effective!
    console.log(`🏠 Generating embedding with local Ollama (avoiding rate limits & costs)`);
    
    const modelName = this.selectOptimalModel('embedding-generation');
    const ollama = this.modelInstances.get(modelName);
    
    if (!ollama) {
      throw new Error(`Embedding model ${modelName} not available`);
    }

    try {
      const startTime = Date.now();
      
      // Use Ollama's embedding API
      const response = await ollama.embeddings({
        model: modelName,
        prompt: text
      });
      
      const executionTime = Date.now() - startTime;
      this.updatePerformanceMetrics(modelName, executionTime, true);
      
      console.log(`🔗 Generated embedding with ${modelName} in ${executionTime}ms`);
      return response.embedding;
      
    } catch (error) {
      this.updatePerformanceMetrics(modelName, 0, false);
      console.error(`❌ Embedding generation failed with ${modelName}: ${error}`);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // 🏠 Always use local Ollama for batch embeddings - no rate limits, cost-effective!
    console.log(`🏠 Generating ${texts.length} embeddings with local Ollama (avoiding rate limits & costs)`);
    
    const modelName = this.selectOptimalModel('embedding-generation');
    const ollama = this.modelInstances.get(modelName);
    
    if (!ollama) {
      throw new Error(`Embedding model ${modelName} not available`);
    }

    try {
      const startTime = Date.now();
      const embeddings: number[][] = [];
      
      // Process in batches for efficiency
      const batchSize = 5; // Smaller batches for embeddings
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => 
          ollama.embeddings({
            model: modelName,
            prompt: text
          }).then((response: any) => response.embedding)
        );
        
        const batchEmbeddings = await Promise.all(batchPromises);
        embeddings.push(...batchEmbeddings);
      }
      
      const executionTime = Date.now() - startTime;
      this.updatePerformanceMetrics(modelName, executionTime, true);
      
      console.log(`🔗 Generated ${embeddings.length} embeddings with ${modelName} in ${executionTime}ms`);
      return embeddings;
      
    } catch (error) {
      this.updatePerformanceMetrics(modelName, 0, false);
      console.error(`❌ Batch embedding generation failed with ${modelName}: ${error}`);
      throw error;
    }
  }

  // Calculate cosine similarity between two embeddings
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  // Find most similar embeddings
  findMostSimilarEmbeddings(
    queryEmbedding: number[], 
    candidateEmbeddings: { embedding: number[]; metadata: any }[], 
    topK: number = 5
  ): { similarity: number; metadata: any }[] {
    const similarities = candidateEmbeddings.map(candidate => ({
      similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  // 👁️ VISION-ENABLED ANALYSIS with Qwen2.5-VL
  async analyzeDocumentWithVision(
    text: string,
    imageData?: string, // Base64 encoded image
    analysisType: 'layout' | 'content' | 'combined' = 'combined'
  ): Promise<{
    textAnalysis: any;
    layoutAnalysis?: any;
    visualElements?: any;
    combinedInsights?: string;
  }> {
    const startTime = performance.now();
    
    try {
      let prompt = '';
      let useVisionModel = false;
      
      if (imageData && analysisType !== 'content') {
        useVisionModel = true;
        prompt = `Analyze this document image and text. Focus on:
${analysisType === 'layout' ? 'Document structure, headers, formatting, layout elements' : 
  analysisType === 'combined' ? 'Both content analysis and visual structure' : 'Content analysis'}

Text content:
${text}

Provide structured analysis including:
- Document structure and layout
- Visual elements (headers, tables, charts, etc.)
- Content themes and insights
- Formatting observations
- Recommendations for better organization`;
      } else {
        prompt = `Analyze this text content: ${text}`;
      }

      const modelName = useVisionModel ? 
        this.selectOptimalModel('vision-document-analysis') : 
        this.selectOptimalModel('text-analysis');
      
      const result = await this.executeTask(
        useVisionModel ? 'vision-document-analysis' : 'text-analysis',
        prompt,
        { useCache: true }
      );

      const executionTime = performance.now() - startTime;
      console.log(`👁️ Vision-enhanced analysis completed in ${executionTime.toFixed(2)}ms using ${result.modelUsed}`);

      return {
        textAnalysis: result.response,
        layoutAnalysis: useVisionModel ? result.response : undefined,
        visualElements: useVisionModel ? result.response : undefined,
        combinedInsights: analysisType === 'combined' ? result.response : undefined
      };

    } catch (error) {
      console.error('❌ Vision analysis failed:', error);
      throw error;
    }
  }

  async detectDocumentLayout(imageData: string): Promise<{
    structure: any;
    elements: string[];
    suggestions: string[];
  }> {
    try {
      const prompt = `Analyze this document image for layout and structure. Identify:
1. Headers and subheaders
2. Paragraph organization
3. Lists and bullet points
4. Tables and charts
5. Column layouts
6. Visual hierarchy
7. Suggestions for improvement

Provide a structured response with clear identification of layout elements.`;

      const result = await this.executeTask('layout-detection', prompt);
      
      return {
        structure: result.response,
        elements: ['headers', 'paragraphs', 'lists'], // Parse from response
        suggestions: ['Improve spacing', 'Add visual hierarchy'] // Parse from response
      };
    } catch (error) {
      console.error('❌ Layout detection failed:', error);
      throw error;
    }
  }

  async processScannedDocument(imageData: string): Promise<{
    extractedText: string;
    confidence: number;
    analysis: any;
  }> {
    try {
      const prompt = `This is a scanned document image. Please:
1. Extract all readable text accurately
2. Maintain original formatting and structure
3. Identify any unclear or damaged text
4. Provide analysis of the document content
5. Rate your confidence in the text extraction (0-100%)

Format the response with clear sections for extracted text and analysis.`;

      const result = await this.executeTask('scanned-text-processing', prompt);
      
      return {
        extractedText: result.response, // Parse extracted text section
        confidence: 95, // Parse confidence from response
        analysis: result.response // Full analysis
      };
    } catch (error) {
      console.error('❌ Scanned document processing failed:', error);
      throw error;
    }
  }

  // 📊 TIMEOUT AND PERFORMANCE MONITORING
  getTimeoutReport(): {
    modelTimeouts: { [modelName: string]: number };
    averageResponseTimes: { [modelName: string]: number };
    successRates: { [modelName: string]: number };
    slowQueries: Array<{ taskType: string; executionTime: number; modelUsed: string }>;
  } {
    const report = {
      modelTimeouts: {} as { [modelName: string]: number },
      averageResponseTimes: {} as { [modelName: string]: number },
      successRates: {} as { [modelName: string]: number },
      slowQueries: [] as Array<{ taskType: string; executionTime: number; modelUsed: string }>
    };

    this.modelPerformance.forEach((perf, modelName) => {
      report.averageResponseTimes[modelName] = perf.totalRequests > 0 ? 
        perf.totalTime / perf.totalRequests : 0;
      report.successRates[modelName] = perf.successRate;
      report.modelTimeouts[modelName] = perf.totalRequests - Math.round(perf.totalRequests * perf.successRate);
    });

    return report;
  }

  // 🔍 DEBUGGING HELPER - Log system status
  logSystemStatus(): void {
    console.log('\n🔍 MultiModel System Status:');
    console.log('Available Models:', this.getAvailableModels());
    console.log('Model Performance:', this.getModelPerformanceReport());
    console.log('Timeout Report:', this.getTimeoutReport());
    console.log('Task Types:', this.getTaskTypes());
  }

  // 🕒 GET SMART TIMEOUT FOR MODEL AND TASK
  private getSmartTimeout(modelName: string, taskType: string, defaultTimeout = 60000): number {
    if (taskType === 'embedding-generation' || taskType === 'vector-similarity') {
      return 25000;
    }
    // Base timeouts for each model (in milliseconds) - optimized for reliability
    const modelBaseTimeouts: { [key: string]: number } = {
      'gemma3n:e4b': 75000,   // 75s for advanced thesis work
      'gemma3n:e2b': 60000,   // Increased to 60s to prevent 30s timeout
      'llama3.2:3b': 45000,   // Increased to 45s  
      'mistral:7b': 60000,    // Increased to 60s
      'phi3.5:3.8b-mini-instruct-q8_0': 50000, // Increased to 50s
      'nomic-embed-text:v1.5': 35000,          // Increased to 35s
      'qwen2.5vl:7b': 120000  // Increased to 120s for vision processing
    };
    // Task complexity multipliers
    const taskMultipliers: Record<string, number> = {
      'theological-reasoning': 1.5,
      'expert-reasoning': 1.4,
      'text-analysis': 1.2,
      'creative-insights': 1.3,
      'semantic-search': 1.1,
      'vision-document-analysis': 1.8,
      'quick-classification': 0.8,
      'summarization': 0.9,
      'group-discussion': 1.0,
      'ai-interaction': 0.9,
      'embedding-generation': 0.7,
      'vector-similarity': 0.6,
      'universal-reasoning': 1.3  // Added for RAG responses
    };
    const baseTimeout = modelBaseTimeouts[modelName] || defaultTimeout;
    const multiplier = taskMultipliers[taskType] || 1.0;
    return Math.round(baseTimeout * multiplier);
  }
} 