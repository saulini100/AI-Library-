import { API_CONFIG } from './constants';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.defaultTimeout = API_CONFIG.TIMEOUT;
    this.defaultRetries = API_CONFIG.RETRY_ATTEMPTS;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(endpoint, `${window.location.origin}${this.baseURL}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private async executeRequest<T>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries
    } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(1000);
        return this.executeRequest<T>(url, { ...options, retries: retries - 1 });
      }
      
      throw this.createApiError(error);
    }
  }

  private isRetryableError(error: any): boolean {
    return (
      error.name === 'AbortError' ||
      error.message?.includes('fetch') ||
      error.message?.includes('network')
    );
  }

  private createApiError(error: any): Error {
    if (error.name === 'AbortError') {
      return new Error('Request timeout');
    }
    return error instanceof Error ? error : new Error('Unknown API error');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP Methods
  async get<T>(endpoint: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const response = await this.executeRequest<T>(url, { ...options, method: 'GET' });
    return response.data;
  }

  async post<T>(endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const response = await this.executeRequest<T>(url, { ...options, method: 'POST', body });
    return response.data;
  }

  async put<T>(endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const response = await this.executeRequest<T>(url, { ...options, method: 'PUT', body });
    return response.data;
  }

  async patch<T>(endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const response = await this.executeRequest<T>(url, { ...options, method: 'PATCH', body });
    return response.data;
  }

  async delete<T>(endpoint: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const response = await this.executeRequest<T>(url, { ...options, method: 'DELETE' });
    return response.data;
  }

  // Specialized methods for common patterns
  async uploadFile(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value));
      });
    }

    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async downloadFile(endpoint: string, filename?: string): Promise<Blob> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    if (filename) {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }

    return blob;
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Document-specific API methods
export const documentApi = {
  getDocuments: () => apiClient.get('/documents'),
  getDocument: (id: string | number) => apiClient.get(`/documents/${id}`),
  getChapter: (documentId: string | number, chapter: number) => 
    apiClient.get(`/documents/${documentId}/${chapter}`),
  uploadDocument: (file: File) => apiClient.uploadFile('/documents/upload', file),
  deleteDocument: (id: string | number) => apiClient.delete(`/documents/${id}`),
};

// AI-specific API methods
export const aiApi = {
  generatePowerSummary: (data: any) => apiClient.post('/ai-power-summary', data),
  getIntelligence: (params?: any) => apiClient.get('/intelligence', { params }),
  getLearningData: () => apiClient.get('/ai-learning/all'),
  chat: (message: string, context?: any) => apiClient.post('/ai/chat', { message, context }),
};

// Performance API methods
export const performanceApi = {
  getMetrics: () => apiClient.get('/performance'),
  getHealth: () => apiClient.get('/health'),
  getAgentHealth: () => apiClient.get('/agents/health'),
  getDatabaseHealth: () => apiClient.get('/db/health'),
};

// Storage API methods (for server-side storage operations)
export const storageApi = {
  getNotes: () => apiClient.get('/notes'),
  saveNote: (note: any) => apiClient.post('/notes', note),
  updateNote: (id: string, note: any) => apiClient.put(`/notes/${id}`, note),
  deleteNote: (id: string) => apiClient.delete(`/notes/${id}`),
  
  getHighlights: () => apiClient.get('/highlights'),
  saveHighlight: (highlight: any) => apiClient.post('/highlights', highlight),
  deleteHighlight: (id: string) => apiClient.delete(`/highlights/${id}`),
  
  getBookmarks: () => apiClient.get('/bookmarks'),
  saveBookmark: (bookmark: any) => apiClient.post('/bookmarks', bookmark),
  updateBookmark: (id: string, bookmark: any) => apiClient.put(`/bookmarks/${id}`, bookmark),
  deleteBookmark: (id: string) => apiClient.delete(`/bookmarks/${id}`),
};

// Cache-related API methods
export const cacheApi = {
  getStats: () => apiClient.get('/cache/stats'),
  clearCache: (type?: string) => apiClient.delete('/cache', { params: type ? { type } : {} }),
  getEmbeddings: (texts: string[]) => apiClient.post('/embeddings/batch', { texts }),
};

// RAG (Retrieval-Augmented Generation) API methods
export const ragApi = {
  search: (query: string, options?: any) => apiClient.post('/rag/search', { query, ...options }),
  getPowerSummaries: (documentId: string | number) => apiClient.get(`/power-summaries/${documentId}`),
  deletePowerSummary: (id: string) => apiClient.delete(`/power-summaries/${id}`),
};

// Translation API methods
export const translationApi = {
  translate: (text: string, targetLanguage: string, sourceLanguage?: string) =>
    apiClient.post('/translate', { text, targetLanguage, sourceLanguage }),
  getLanguages: () => apiClient.get('/languages'),
  detectLanguage: (text: string) => apiClient.post('/detect-language', { text }),
};

export default apiClient; 