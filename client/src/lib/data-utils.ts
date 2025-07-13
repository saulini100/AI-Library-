// Date and time utilities
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Text utilities
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function extractExcerpt(content: string, searchTerm: string, contextLength: number = 150): string {
  if (!searchTerm.trim()) return truncateText(content, contextLength);
  
  const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (index === -1) return truncateText(content, contextLength);
  
  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(content.length, start + contextLength);
  const excerpt = content.slice(start, end);
  
  return start > 0 ? '...' + excerpt : excerpt;
}

// Array utilities
export function removeDuplicates<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return Array.from(new Set(array));
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key]);
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Search utilities
export function fuzzySearch(items: any[], query: string, fields: string[]): any[] {
  if (!query.trim()) return items;
  
  const searchTerms = query.toLowerCase().split(/\s+/);
  
  return items.filter(item => {
    return searchTerms.every(term =>
      fields.some(field => {
        const value = getNestedValue(item, field);
        return String(value).toLowerCase().includes(term);
      })
    );
  });
}

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
}

// Document utilities
export function buildDocumentUrl(documentId: string | number, chapter?: number): string {
  const base = `/reader/${documentId}`;
  return chapter ? `${base}/${chapter}` : base;
}

export function parseDocumentContent(content: string | object): any {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return { content, totalChapters: 1 };
    }
  }
  return content;
}

// Color utilities for highlights
export function getHighlightColorName(colorClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-yellow-200 dark:bg-yellow-800/40': 'Yellow',
    'bg-blue-200 dark:bg-blue-800/40': 'Blue',
    'bg-green-200 dark:bg-green-800/40': 'Green',
    'bg-pink-200 dark:bg-pink-800/40': 'Pink',
    'bg-purple-200 dark:bg-purple-800/40': 'Purple',
    'bg-orange-200 dark:bg-orange-800/40': 'Orange',
  };
  return colorMap[colorClass] || 'Gray';
}

// File size utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Performance utilities
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Type guards
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
} 