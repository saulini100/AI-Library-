// Storage utilities for bookmarks and notes
export interface Bookmark {
  id: string;
  title: string;
  content: string;
  documentId: string;
  documentTitle: string;
  chapter: number;
  paragraph?: number;
  folder: string;
  tags: string[];
  notes?: string;
  timestamp: number;
  userId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  documentId?: string;
  documentTitle?: string;
  chapter?: number;
  paragraph?: number;
  timestamp: number;
  userId?: string;
}

export interface Highlight {
  id: string;
  text: string;
  color: string;
  documentId: string;
  documentTitle: string;
  chapter: number;
  paragraph?: number;
  timestamp: number;
  userId?: string;
}

const STORAGE_KEYS = {
  BOOKMARKS: 'bible-companion-bookmarks',
  NOTES: 'bible-companion-notes',
  HIGHLIGHTS: 'bible-companion-highlights',
} as const;

// Generic storage functions
function getStorageData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Failed to load data from ${key}:`, error);
    return [];
  }
}

function setStorageData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save data to ${key}:`, error);
  }
}

// Bookmark functions
export function getBookmarks(): Bookmark[] {
  return getStorageData<Bookmark>(STORAGE_KEYS.BOOKMARKS);
}

export function saveBookmark(bookmark: Omit<Bookmark, 'id' | 'timestamp'>): Bookmark {
  const bookmarks = getBookmarks();
  const newBookmark: Bookmark = {
    ...bookmark,
    id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  bookmarks.unshift(newBookmark); // Add to beginning
  setStorageData(STORAGE_KEYS.BOOKMARKS, bookmarks);
  return newBookmark;
}

export function updateBookmark(id: string, updates: Partial<Bookmark>): Bookmark | null {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex(b => b.id === id);
  
  if (index === -1) return null;
  
  bookmarks[index] = { ...bookmarks[index], ...updates };
  setStorageData(STORAGE_KEYS.BOOKMARKS, bookmarks);
  return bookmarks[index];
}

export function deleteBookmark(id: string): boolean {
  const bookmarks = getBookmarks();
  const filtered = bookmarks.filter(b => b.id !== id);
  
  if (filtered.length === bookmarks.length) return false;
  
  setStorageData(STORAGE_KEYS.BOOKMARKS, filtered);
  return true;
}

// Note functions
export function getNotes(): Note[] {
  return getStorageData<Note>(STORAGE_KEYS.NOTES);
}

export function saveNote(note: Omit<Note, 'id' | 'timestamp'>): Note {
  const notes = getNotes();
  const newNote: Note = {
    ...note,
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  notes.unshift(newNote); // Add to beginning
  setStorageData(STORAGE_KEYS.NOTES, notes);
  return newNote;
}

export function updateNote(id: string, updates: Partial<Note>): Note | null {
  const notes = getNotes();
  const index = notes.findIndex(n => n.id === id);
  
  if (index === -1) return null;
  
  notes[index] = { ...notes[index], ...updates };
  setStorageData(STORAGE_KEYS.NOTES, notes);
  return notes[index];
}

export function deleteNote(id: string): boolean {
  const notes = getNotes();
  const filtered = notes.filter(n => n.id !== id);
  
  if (filtered.length === notes.length) return false;
  
  setStorageData(STORAGE_KEYS.NOTES, filtered);
  return true;
}

// Highlight functions
export function getHighlights(): Highlight[] {
  return getStorageData<Highlight>(STORAGE_KEYS.HIGHLIGHTS);
}

export function saveHighlight(highlight: Omit<Highlight, 'id' | 'timestamp'>): Highlight {
  const highlights = getHighlights();
  const newHighlight: Highlight = {
    ...highlight,
    id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  highlights.unshift(newHighlight); // Add to beginning
  setStorageData(STORAGE_KEYS.HIGHLIGHTS, highlights);
  return newHighlight;
}

export function deleteHighlight(id: string): boolean {
  const highlights = getHighlights();
  const filtered = highlights.filter(h => h.id !== id);
  
  if (filtered.length === highlights.length) return false;
  
  setStorageData(STORAGE_KEYS.HIGHLIGHTS, filtered);
  return true;
}

// Search functions
export function searchBookmarks(query: string): Bookmark[] {
  const bookmarks = getBookmarks();
  const lowerQuery = query.toLowerCase();
  
  return bookmarks.filter(bookmark => 
    bookmark.title.toLowerCase().includes(lowerQuery) ||
    bookmark.content.toLowerCase().includes(lowerQuery) ||
    bookmark.notes?.toLowerCase().includes(lowerQuery) ||
    bookmark.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function searchNotes(query: string): Note[] {
  const notes = getNotes();
  const lowerQuery = query.toLowerCase();
  
  return notes.filter(note => 
    note.title.toLowerCase().includes(lowerQuery) ||
    note.content.toLowerCase().includes(lowerQuery) ||
    note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function searchHighlights(query: string): Highlight[] {
  const highlights = getHighlights();
  const lowerQuery = query.toLowerCase();
  
  return highlights.filter(highlight => 
    highlight.text.toLowerCase().includes(lowerQuery)
  );
}

// Get unique folders, categories, and tags
export function getBookmarkFolders(): string[] {
  const bookmarks = getBookmarks();
  return Array.from(new Set(bookmarks.map(b => b.folder)));
}

export function getNoteCategories(): string[] {
  const notes = getNotes();
  return Array.from(new Set(notes.map(n => n.category)));
}

export function getAllTags(): string[] {
  const bookmarks = getBookmarks();
  const notes = getNotes();
  const bookmarkTags = bookmarks.flatMap(b => b.tags);
  const noteTags = notes.flatMap(n => n.tags);
  return Array.from(new Set([...bookmarkTags, ...noteTags]));
} 