// Utility functions for Document API interactions
export interface SearchResult {
  documentId: number;
  chapter: number;
  paragraph: number;
  text: string;
}

export interface DocumentInfo {
  id: number;
  title: string;
  totalChapters: number;
}

// Universal document API functions
export async function getDocuments(): Promise<DocumentInfo[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  return response.json();
}

export async function getDocumentChapter(documentId: number, chapter: number): Promise<any> {
  const response = await fetch(`/api/documents/${documentId}/chapters/${chapter}`);
  if (!response.ok) {
    throw new Error("Failed to fetch chapter");
  }
  return response.json();
}

export async function searchDocuments(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/search/semantic?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("Failed to search documents");
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
