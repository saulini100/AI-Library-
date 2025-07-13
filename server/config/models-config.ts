import type { ModelConfig, TaskType } from '../services/multi-model-service.js';

// Default AI Models Configuration
export const DEFAULT_MODELS: ModelConfig[] = [
  {
    name: 'gemma3n:e4b',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.7,
    maxTokens: 16384, // Increased for thesis-level content
    specialties: [
      'advanced-reasoning', 
      'thesis-analysis', 
      'academic-writing', 
      'complex-argumentation', 
      'scholarly-research', 
      'critical-analysis', 
      'dissertation-support', 
      'advanced-synthesis'
    ],
    performance: { speed: 7, accuracy: 10, reasoning: 10, creativity: 9 }
  },
  {
    name: 'gemma3n:e2b',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.7,
    maxTokens: 8192,
    specialties: [
      'fast-reasoning', 
      'text-analysis', 
      'theological-reasoning', 
      'complex-reasoning', 
      'multilingual-analysis', 
      'instruction-following', 
      'creative-insights'
    ],
    performance: { speed: 9, accuracy: 10, reasoning: 10, creativity: 8 }
  },
  {
    name: 'llama3.2:3b',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.5,
    maxTokens: 2048,
    specialties: ['fast-analysis', 'summarization', 'classification'],
    performance: { speed: 9, accuracy: 7, reasoning: 6, creativity: 6 }
  },
  {
    name: 'mistral:7b',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.8,
    maxTokens: 4096,
    specialties: ['creative-writing', 'poetry-analysis', 'cultural-context'],
    performance: { speed: 7, accuracy: 8, reasoning: 8, creativity: 9 }
  },
  {
    name: 'phi3.5:3.8b-mini-instruct-q8_0',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.3,
    maxTokens: 4096,
    specialties: ['reasoning', 'critical-thinking', 'structured-analysis', 'logical-reasoning'],
    performance: { speed: 9, accuracy: 8, reasoning: 9, creativity: 6 }
  },
  {
    name: 'nomic-embed-text:v1.5',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.0, // No temperature for embeddings
    maxTokens: 2048,
    specialties: ['embeddings', 'semantic-similarity', 'vector-search', 'rag-embedding'],
    performance: { speed: 10, accuracy: 10, reasoning: 10, creativity: 1 }
  },
  {
    name: 'qwen2.5vl:7b',
    provider: 'ollama',
    host: 'localhost',
    port: 11434,
    temperature: 0.7,
    maxTokens: 4096,
    specialties: [
      'vision-analysis', 
      'document-layout', 
      'visual-reasoning', 
      'multimodal-analysis', 
      'scanned-text', 
      'chart-analysis'
    ],
    performance: { speed: 7, accuracy: 9, reasoning: 10, creativity: 8 }
  }
];

// Task Types Configuration
export const DEFAULT_TASK_TYPES: TaskType[] = [
  {
    name: 'text-analysis',
    requirements: { accuracy: 9, reasoning: 8, speed: 6 },
    preferredModels: ['gemma3n:e2b', 'phi3.5:3.8b-mini-instruct-q8_0']
  },
  {
    name: 'theological-reasoning',
    requirements: { reasoning: 8, accuracy: 8, creativity: 7 },
    preferredModels: ['gemma3n:e2b', 'mistral:7b']
  },
  {
    name: 'expert-reasoning',
    requirements: { reasoning: 8, accuracy: 8, creativity: 6 },
    preferredModels: ['gemma3n:e2b']
  },
  {
    name: 'quick-classification',
    requirements: { speed: 10, accuracy: 8 },
    preferredModels: ['llama3.2:3b', 'phi3.5:3.8b-mini-instruct-q8_0', 'gemma3n:e2b']
  },
  {
    name: 'creative-insights',
    requirements: { creativity: 9, reasoning: 7 },
    preferredModels: ['mistral:7b', 'gemma3n:e2b']
  },
  {
    name: 'semantic-search',
    requirements: { accuracy: 9, speed: 8, reasoning: 8 },
    preferredModels: ['gemma3n:e2b', 'phi3.5:3.8b-mini-instruct-q8_0']
  },
  {
    name: 'summarization',
    requirements: { speed: 9, accuracy: 8 },
    preferredModels: ['llama3.2:3b', 'gemma3n:e2b']
  },
  {
    name: 'group-discussion',
    requirements: { creativity: 8, reasoning: 7, speed: 6 },
    preferredModels: ['mistral:7b', 'gemma3n:e2b', 'llama3.2:3b', 'phi3.5:3.8b-mini-instruct-q8_0']
  },
  {
    name: 'ai-interaction',
    requirements: { creativity: 7, reasoning: 6, speed: 8 },
    preferredModels: ['mistral:7b', 'gemma3n:e2b', 'llama3.2:3b']
  },
  {
    name: 'embedding-generation',
    requirements: { accuracy: 9, speed: 9, reasoning: 8, creativity: 1 },
    preferredModels: ['nomic-embed-text:v1.5']
  },
  {
    name: 'vector-similarity',
    requirements: { accuracy: 10, speed: 8, reasoning: 9, creativity: 1 },
    preferredModels: ['nomic-embed-text:v1.5']
  },
  {
    name: 'vision-document-analysis',
    requirements: { accuracy: 8, reasoning: 8, speed: 5, creativity: 6 },
    preferredModels: ['qwen2.5vl:7b']
  },
  {
    name: 'layout-detection',
    requirements: { accuracy: 9, speed: 7, reasoning: 8, creativity: 6 },
    preferredModels: ['qwen2.5vl:7b']
  },
  {
    name: 'scanned-text-processing',
    requirements: { accuracy: 10, reasoning: 8, speed: 6, creativity: 5 },
    preferredModels: ['qwen2.5vl:7b']
  },
  {
    name: 'visual-content-analysis',
    requirements: { accuracy: 9, reasoning: 9, speed: 6, creativity: 8 },
    preferredModels: ['qwen2.5vl:7b']
  },
  {
    name: 'universal-reasoning',
    requirements: { reasoning: 9, accuracy: 8, speed: 7, creativity: 6 },
    preferredModels: ['gemma3n:e4b', 'gemma3n:e2b', 'phi3.5:3.8b-mini-instruct-q8_0', 'llama3.2:3b']
  },
  {
    name: 'thesis-analysis',
    requirements: { reasoning: 10, accuracy: 10, speed: 5, creativity: 8 },
    preferredModels: ['gemma3n:e4b']
  },
  {
    name: 'academic-writing',
    requirements: { reasoning: 9, accuracy: 9, speed: 6, creativity: 8 },
    preferredModels: ['gemma3n:e4b', 'mistral:7b']
  },
  {
    name: 'scholarly-research',
    requirements: { reasoning: 10, accuracy: 10, speed: 5, creativity: 7 },
    preferredModels: ['gemma3n:e4b', 'gemma3n:e2b']
  },
  {
    name: 'dissertation-support',
    requirements: { reasoning: 10, accuracy: 10, speed: 4, creativity: 9 },
    preferredModels: ['gemma3n:e4b']
  }
];

// Model Timeout Configuration (in milliseconds)
export const MODEL_TIMEOUTS: Record<string, number> = {
  'gemma3n:e4b': 75000,   // 75s for advanced thesis work
  'gemma3n:e2b': 60000,   // Increased to 60s for complex reasoning
  'llama3.2:3b': 45000,   // 45s for fast responses
  'mistral:7b': 60000,    // 60s for creative work
  'phi3.5:3.8b-mini-instruct-q8_0': 50000, // 50s for balanced performance
  'nomic-embed-text:v1.5': 30000, // 30s for embeddings
  'qwen2.5vl:7b': 90000,  // 90s for vision processing
};

// Environment-based configuration overrides
export function getModelConfig(): {
  models: ModelConfig[];
  taskTypes: TaskType[];
  timeouts: Record<string, number>;
} {
  const ollamaHost = process.env.OLLAMA_HOST || 'localhost';
  const ollamaPort = parseInt(process.env.OLLAMA_PORT || '11434');

  // Override host/port if environment variables are set
  const models = DEFAULT_MODELS.map(model => ({
    ...model,
    host: model.provider === 'ollama' ? ollamaHost : model.host,
    port: model.provider === 'ollama' ? ollamaPort : model.port,
  }));

  return {
    models,
    taskTypes: DEFAULT_TASK_TYPES,
    timeouts: MODEL_TIMEOUTS,
  };
} 