// Utility functions for Bible API interactions
export interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBookInfo {
  name: string;
  chapters: number;
}

export async function fetchBibleBooks(): Promise<BibleBookInfo[]> {
  const response = await fetch("/api/bible/books");
  if (!response.ok) {
    throw new Error("Failed to fetch Bible books");
  }
  return response.json();
}

export async function fetchBibleChapter(book: string, chapter: number) {
  const response = await fetch(`/api/bible/${book}/${chapter}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${book} ${chapter}`);
  }
  return response.json();
}

export async function searchBible(query: string): Promise<SearchResult[]> {
  if (query.length < 3) return [];
  
  const response = await fetch(`/api/bible/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("Failed to search Bible");
  }
  return response.json();
}

export async function createAnnotation(data: {
  book: string;
  chapter: number;
  verse: number;
  selectedText: string;
  note: string;
}) {
  const response = await fetch("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create annotation");
  }
  
  return response.json();
}

export async function createBookmark(data: {
  book: string;
  chapter: number;
  verse?: number;
  title?: string;
}) {
  const response = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create bookmark");
  }
  
  return response.json();
}

export async function getAiExplanation(data: {
  text: string;
  book: string;
  chapter: number;
  verse: number;
}) {
  const response = await fetch("/api/ai/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error("Failed to get AI explanation");
  }
  
  return response.json();
}
