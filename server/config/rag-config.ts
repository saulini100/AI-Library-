export interface RAGConfig {
  // Relevance thresholds
  minRelevanceScore: number;
  semanticRelevanceThreshold: number;
  fallbackRelevanceThreshold: number;
  
  // Search limits
  maxResults: number;
  maxSources: number;
  maxContextLength: number;
  
  // Cache settings
  cacheTTL: number; // milliseconds
  enableQueryCache: boolean;
  enableEmbeddingCache: boolean;
  
  // Search behavior
  enableEmbeddings: boolean;
  enableFallbackSearch: boolean;
  includeMemoriesByDefault: boolean;
  includeAnnotationsByDefault: boolean;
  
  // Content processing
  enableDocumentFiltering: boolean;
  contentChunkSize: number;
  excerptLength: number;
  
  // Response generation
  enableRelatedQuestions: boolean;
  enableStudyRecommendations: boolean;
  enableCrossReferences: boolean;
}

// Default RAG configuration - Optimized for better results
export const defaultRAGConfig: RAGConfig = {
  // Relevance thresholds - Lowered for better recall
  minRelevanceScore: 0.4,           // Reduced from 0.7
  semanticRelevanceThreshold: 0.5,  // Reduced from 0.7  
  fallbackRelevanceThreshold: 0.1,  // Very low for fallback
  
  // Search limits
  maxResults: 20,
  maxSources: 5,
  maxContextLength: 4000,
  
  // Cache settings  
  cacheTTL: 1000 * 60 * 10, // 10 minutes
  enableQueryCache: true,
  enableEmbeddingCache: true,
  
  // Search behavior
  enableEmbeddings: true,
  enableFallbackSearch: true,
  includeMemoriesByDefault: true,
  includeAnnotationsByDefault: true,
  
  // Content processing
  enableDocumentFiltering: false,    // Disabled for better recall
  contentChunkSize: 500,
  excerptLength: 300,
  
  // Response generation
  enableRelatedQuestions: true,
  enableStudyRecommendations: true,
  enableCrossReferences: true
};

// Get current RAG configuration
export function getRAGConfig(): RAGConfig {
  return { ...defaultRAGConfig };
}

// Update RAG configuration
export function updateRAGConfig(updates: Partial<RAGConfig>): RAGConfig {
  Object.assign(defaultRAGConfig, updates);
  return { ...defaultRAGConfig };
}

// Reset to default configuration
export function resetRAGConfig(): RAGConfig {
  const originalDefaults: RAGConfig = {
    minRelevanceScore: 0.4,
    semanticRelevanceThreshold: 0.5,
    fallbackRelevanceThreshold: 0.1,
    maxResults: 20,
    maxSources: 5,
    maxContextLength: 4000,
    cacheTTL: 1000 * 60 * 10,
    enableQueryCache: true,
    enableEmbeddingCache: true,
    enableEmbeddings: true,
    enableFallbackSearch: true,
    includeMemoriesByDefault: true,
    includeAnnotationsByDefault: true,
    enableDocumentFiltering: false,
    contentChunkSize: 500,
    excerptLength: 300,
    enableRelatedQuestions: true,
    enableStudyRecommendations: true,
    enableCrossReferences: true
  };
  
  Object.assign(defaultRAGConfig, originalDefaults);
  return { ...defaultRAGConfig };
} 