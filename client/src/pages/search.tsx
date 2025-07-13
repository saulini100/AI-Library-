import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  BookOpen, 
  FileText, 
  Calendar,
  ArrowRight,
  Filter,
  SortAsc,
  SortDesc,
  Bookmark,
  StickyNote,
  Highlighter,
  Tag,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from 'wouter';
import { 
  searchBookmarks, 
  searchNotes, 
  searchHighlights,
  type Bookmark as BookmarkType,
  type Note as NoteType,
  type Highlight as HighlightType
} from '@/lib/storage';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'note' | 'highlight' | 'bookmark';
  documentId?: string;
  documentTitle?: string;
  chapter?: number;
  timestamp: number;
  tags?: string[];
  color?: string;
  category?: string;
  folder?: string;
}

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'document' | 'note' | 'highlight' | 'bookmark'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Perform search when query or type changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, searchType]);

  const performSearch = () => {
    setIsSearching(true);
    
    const query = searchQuery.trim();
    if (!query) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const allResults: SearchResult[] = [];

    // Search bookmarks
    if (searchType === 'all' || searchType === 'bookmark') {
      const bookmarks = searchBookmarks(query);
      bookmarks.forEach(bookmark => {
        allResults.push({
          id: bookmark.id,
          title: bookmark.title,
          content: bookmark.content,
          type: 'bookmark',
          documentId: bookmark.documentId,
          documentTitle: bookmark.documentTitle,
          chapter: bookmark.chapter,
          timestamp: bookmark.timestamp,
          tags: bookmark.tags,
          folder: bookmark.folder,
        });
      });
    }

    // Search notes
    if (searchType === 'all' || searchType === 'note') {
      const notes = searchNotes(query);
      notes.forEach(note => {
        allResults.push({
          id: note.id,
          title: note.title,
          content: note.content,
          type: 'note',
          documentId: note.documentId,
          documentTitle: note.documentTitle,
          chapter: note.chapter,
          timestamp: note.timestamp,
          tags: note.tags,
          category: note.category,
        });
      });
    }

    // Search highlights
    if (searchType === 'all' || searchType === 'highlight') {
      const highlights = searchHighlights(query);
      highlights.forEach(highlight => {
        allResults.push({
          id: highlight.id,
          title: `Highlight from ${highlight.documentTitle}`,
          content: highlight.text,
          type: 'highlight',
          documentId: highlight.documentId,
          documentTitle: highlight.documentTitle,
          chapter: highlight.chapter,
          timestamp: highlight.timestamp,
          color: highlight.color,
        });
      });
    }

    // Sort by timestamp (newest first)
    allResults.sort((a, b) => b.timestamp - a.timestamp);
    
    setResults(allResults);
    setIsSearching(false);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.documentId && result.chapter) {
      setLocation(`/reader/${result.documentId}/${result.chapter}`);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'note': return <StickyNote className="w-4 h-4" />;
      case 'highlight': return <Highlighter className="w-4 h-4" />;
      case 'bookmark': return <Bookmark className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getResultBadgeClass = (type: string) => {
    switch (type) {
      case 'note': return 'bg-green-100 text-green-700';
      case 'highlight': return 'bg-yellow-100 text-yellow-700';
      case 'bookmark': return 'bg-purple-100 text-purple-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getColorClass = (color?: string) => {
    if (!color) return '';
    const colorMap: Record<string, string> = {
      'bg-yellow-200 dark:bg-yellow-800/40': 'bg-yellow-200 dark:bg-yellow-800/40',
      'bg-blue-200 dark:bg-blue-800/40': 'bg-blue-200 dark:bg-blue-800/40',
      'bg-green-200 dark:bg-green-800/40': 'bg-green-200 dark:bg-green-800/40',
      'bg-pink-200 dark:bg-pink-800/40': 'bg-pink-200 dark:bg-pink-800/40',
      'bg-purple-200 dark:bg-purple-800/40': 'bg-purple-200 dark:bg-purple-800/40',
      'bg-orange-200 dark:bg-orange-800/40': 'bg-orange-200 dark:bg-orange-800/40',
    };
    return colorMap[color] || '';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 hover:bg-muted/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Search through your documents, notes, highlights, and bookmarks
        </p>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search for content, notes, or highlights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="highlight">Highlights</SelectItem>
            <SelectItem value="bookmark">Bookmarks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {isSearching && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {!isSearching && searchQuery && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {!isSearching && results.map((result) => (
          <Card 
            key={result.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => handleResultClick(result)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getResultIcon(result.type)}
                    <Badge variant="secondary" className={getResultBadgeClass(result.type)}>
                      {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {result.title}
                  </CardTitle>
                  {result.documentTitle && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <FileText className="w-3 h-3" />
                      <span>{result.documentTitle}</span>
                      {result.chapter && (
                        <span>Chapter {result.chapter}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className={`p-3 rounded-lg mb-3 ${result.color ? getColorClass(result.color) : 'bg-muted/50'}`}>
                <p className="text-sm line-clamp-3">
                  {result.content}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(result.timestamp).toLocaleDateString()}
                  {result.category && (
                    <>
                      <span>•</span>
                      <span>{result.category}</span>
                    </>
                  )}
                  {result.folder && (
                    <>
                      <span>•</span>
                      <span>{result.folder}</span>
                    </>
                  )}
                </div>
              </div>
              
              {result.tags && result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tag className="w-2 h-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Results Count */}
        {!isSearching && results.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <span>{results.length} result{results.length !== 1 ? 's' : ''} found</span>
          </div>
        )}
      </div>
    </div>
  );
} 