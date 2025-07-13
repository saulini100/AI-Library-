// API Configuration
export const API_CONFIG = {
  BASE_URL: '/api',
  WEBSOCKET_URL: 'ws://localhost:3001',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

// Server Configuration
export const SERVER_CONFIG = {
  PORT: 5000,
  WEBSOCKET_PORT: 3001,
  OLLAMA_BASE_URL: 'http://localhost:11434',
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 4000,
  SIDEBAR_WIDTH: {
    COLLAPSED: 64,
    EXPANDED: 288,
  },
  MOBILE_BREAKPOINT: 768,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  THEME: 'darkMode',
  LANGUAGE: 'selectedLanguage',
  SIDEBAR_STATE: 'sidebarOpen',
  READING_POSITIONS: 'readingPositions',
  AI_PANELS: {
    CHAT: 'aiChatOpen',
    AUTO_LEARNING: 'autoLearningOpen',
    CHAPTER_NOTES: 'chapterNotesOpen',
    DISCUSSION: 'discussionAgentOpen',
    POWER_SUMMARIES: 'powerSummariesOpen',
    QUIZ: 'quizAgentOpen',
    VOICE_READER: 'voiceReaderOpen',
  },
} as const;

// Pagination & Limits
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_RESULTS: 100,
  SEARCH_DEBOUNCE: 300,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: '50MB',
  ALLOWED_TYPES: ['pdf', 'txt', 'docx'],
  CHUNK_SIZE: 1024 * 1024, // 1MB
} as const;

// AI Configuration
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  MODELS: {
    DEFAULT: 'qwen2.5:7b-instruct',
    EMBEDDING: 'nomic-embed-text:v1.5',
    VISION: 'qwen2.5vl:7b',
  },
} as const;

// Color Scheme for Highlights
export const HIGHLIGHT_COLORS = {
  YELLOW: 'bg-yellow-200 dark:bg-yellow-800/40',
  BLUE: 'bg-blue-200 dark:bg-blue-800/40',
  GREEN: 'bg-green-200 dark:bg-green-800/40',
  PINK: 'bg-pink-200 dark:bg-pink-800/40',
  PURPLE: 'bg-purple-200 dark:bg-purple-800/40',
  ORANGE: 'bg-orange-200 dark:bg-orange-800/40',
} as const;

export const HIGHLIGHT_COLOR_NAMES = {
  [HIGHLIGHT_COLORS.YELLOW]: 'Yellow',
  [HIGHLIGHT_COLORS.BLUE]: 'Blue',
  [HIGHLIGHT_COLORS.GREEN]: 'Green',
  [HIGHLIGHT_COLORS.PINK]: 'Pink',
  [HIGHLIGHT_COLORS.PURPLE]: 'Purple',
  [HIGHLIGHT_COLORS.ORANGE]: 'Orange',
} as const;

// Default Values
export const DEFAULTS = {
  DOCUMENT_CHAPTER: 1,
  REFRESH_INTERVAL: 5000,
  USER_ID: 2, // TODO: Make this dynamic based on authentication. Using 2 as a safe default.
  CATEGORY: {
    NOTE: 'Personal Notes',
    BOOKMARK: 'General',
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'This file type is not supported.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ITEM_CREATED: 'Item created successfully',
  ITEM_UPDATED: 'Item updated successfully',
  ITEM_DELETED: 'Item deleted successfully',
  FILE_UPLOADED: 'File uploaded successfully',
} as const;

// Feature Flags (can be moved to environment variables)
export const FEATURES = {
  VOICE_READER: true,
  TRANSLATION: true,
  ANALYTICS: true,
  PERFORMANCE_MONITORING: true,
  AGENT_SYSTEM: true,
  MCP_INTEGRATION: true,
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  READER: '/reader',
  SEARCH: '/search',
  NOTES: '/notes',
  HIGHLIGHTS: '/highlights',
  BOOKMARKS: '/bookmarks',
  AGENT_DASHBOARD: '/agents',
  PERFORMANCE: '/performance',
} as const; 