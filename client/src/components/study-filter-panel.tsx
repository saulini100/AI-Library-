import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Search, 
  Filter,
  X,
  Calendar,
  Tag,
  Bookmark,
  StickyNote,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  FileText,
  Highlighter
} from 'lucide-react';
import { getBookmarks, getNotes, getHighlights } from "@/lib/storage";

interface StudyFilterPanelProps {
  onFiltersChange: (filters: any) => void;
  className?: string;
}

interface FilterChip {
  id: string;
  label: string;
  type: 'book' | 'date' | 'tag' | 'author' | 'category';
  value: string;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  type: 'bookmark' | 'note' | 'highlight';
  source?: string;
  timestamp: string;
}

export default function StudyFilterPanel({
  onFiltersChange,
  className = ''
}: StudyFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterChip[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allData, setAllData] = useState<{
    bookmarks: any[];
    notes: any[];
    highlights: any[];
  }>({ bookmarks: [], notes: [], highlights: [] });

  // Load all data from storage
  useEffect(() => {
    const loadData = () => {
      const bookmarks = getBookmarks();
      const notes = getNotes();
      const highlights = getHighlights();
      setAllData({ bookmarks, notes, highlights });
    };
    
    loadData();
    // Refresh data every 5 seconds to catch updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate filter options from real data
  const generateFilterOptions = () => {
    const options = [];
    
    // Book filters (from data sources)
    const books = new Set([
      ...allData.bookmarks.map(b => b.book || 'Unknown'),
      ...allData.notes.map(n => n.book || 'Unknown'),
      ...allData.highlights.map(h => h.book || 'Unknown')
    ]);
    
    books.forEach(book => {
      if (book && book !== 'Unknown') {
        options.push({ label: book, value: book.toLowerCase(), type: 'book' as const });
      }
    });

    // Date filters
    options.push(
      { label: 'This Week', value: 'week', type: 'date' as const },
      { label: 'This Month', value: 'month', type: 'date' as const },
      { label: 'This Year', value: 'year', type: 'date' as const }
    );

    // Tag filters (from notes)
    const tags = new Set<string>();
    allData.notes.forEach(note => {
      if (note.tags) {
        note.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    
    tags.forEach(tag => {
      options.push({ label: tag, value: tag.toLowerCase(), type: 'tag' as const });
    });

    return options;
  };

  const filterOptions = generateFilterOptions();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 0);
    
    if (query.length > 0) {
      const results: SearchResult[] = [];
      
      // Search in bookmarks
      allData.bookmarks.forEach(bookmark => {
        if (bookmark.title?.toLowerCase().includes(query.toLowerCase()) ||
            bookmark.content?.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: bookmark.id,
            title: bookmark.title || 'Untitled Bookmark',
            snippet: bookmark.content?.substring(0, 100) + '...' || '',
            type: 'bookmark',
            source: bookmark.book,
            timestamp: bookmark.timestamp
          });
        }
      });

      // Search in notes
      allData.notes.forEach(note => {
        if (note.title?.toLowerCase().includes(query.toLowerCase()) ||
            note.content?.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: note.id,
            title: note.title || 'Untitled Note',
            snippet: note.content?.substring(0, 100) + '...' || '',
            type: 'note',
            source: note.book,
            timestamp: note.timestamp
          });
        }
      });

      // Search in highlights
      allData.highlights.forEach(highlight => {
        if (highlight.content?.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: highlight.id,
            title: `Highlight in ${highlight.book || 'Unknown'}`,
            snippet: highlight.content?.substring(0, 100) + '...' || '',
            type: 'highlight',
            source: highlight.book,
            timestamp: highlight.timestamp
          });
        }
      });

      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addFilter = (option: typeof filterOptions[0]) => {
    const newFilter: FilterChip = {
      id: `${option.type}-${option.value}`,
      label: option.label,
      type: option.type as FilterChip['type'],
      value: option.value
    };

    if (!activeFilters.find(f => f.id === newFilter.id)) {
      setActiveFilters(prev => [...prev, newFilter]);
    }
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsExporting(false);
  };

  const getFilterTypeIcon = (type: FilterChip['type']) => {
    switch (type) {
      case 'book': return <BookOpen className="w-3 h-3" />;
      case 'date': return <Calendar className="w-3 h-3" />;
      case 'tag': return <Tag className="w-3 h-3" />;
      case 'author': return <Users className="w-3 h-3" />;
      case 'category': return <TrendingUp className="w-3 h-3" />;
    }
  };

  const getFilterTypeColor = (type: FilterChip['type']) => {
    switch (type) {
      case 'book': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'date': return 'bg-green-100 text-green-800 border-green-200';
      case 'tag': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'author': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'category': return 'bg-pink-100 text-pink-800 border-pink-200';
    }
  };

  const getResultTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'bookmark': return <Bookmark className="w-4 h-4" />;
      case 'note': return <FileText className="w-4 h-4" />;
      case 'highlight': return <Highlighter className="w-4 h-4" />;
    }
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'bookmark': return 'text-blue-600';
      case 'note': return 'text-green-600';
      case 'highlight': return 'text-yellow-600';
    }
  };

  useEffect(() => {
    onFiltersChange({
      search: searchQuery,
      filters: activeFilters
    });
  }, [searchQuery, activeFilters, onFiltersChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <Card className="study-session-start">
        <CardContent className="p-4">
          <div className="relative">
            <div className={`flex items-center transition-all duration-300 ${
              isSearchFocused ? 'search-expand' : ''
            }`}>
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search notes, bookmarks, and verses..."
                className="pl-10 pr-4 py-2 transition-all duration-300 focus:scale-105"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearch('')}
                  className="absolute right-2 p-1 hover:scale-110 transition-transform"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Options */}
      <Card className="study-stagger-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-500" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option, index) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                onClick={() => addFilter(option)}
                className={`text-xs transition-all duration-300 hover:scale-105 filter-chip`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {getFilterTypeIcon(option.type as FilterChip['type'])}
                <span className="ml-1">{option.label}</span>
              </Button>
            ))}
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active Filters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs hover:scale-105 transition-transform"
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, index) => (
                  <Badge
                    key={filter.id}
                    variant="outline"
                    className={`${getFilterTypeColor(filter.type)} border transition-all duration-300 hover:scale-105 filter-chip`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {getFilterTypeIcon(filter.type)}
                    <span className="ml-1">{filter.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(filter.id)}
                      className="ml-1 p-0 h-4 w-4 hover:scale-125 transition-transform"
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {showResults && (
        <Card className="search-results study-stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`${getResultTypeColor(result.type)}`}>
                        {getResultTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{result.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.snippet}
                        </p>
                        {result.source && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Source: {result.source}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <Card className="study-stagger-3">
        <CardContent className="p-4">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full transition-all duration-300 hover:scale-105"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Export Study Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Study Statistics */}
      <Card className="study-stagger-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Study Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg card-hover">
              <StickyNote className="w-5 h-5 text-blue-600 mx-auto mb-1 study-timer" />
              <div className="text-lg font-bold text-blue-600">24</div>
              <div className="text-xs text-muted-foreground">Notes</div>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg card-hover">
              <Bookmark className="w-5 h-5 text-amber-600 mx-auto mb-1 study-timer" />
              <div className="text-lg font-bold text-amber-600">12</div>
              <div className="text-xs text-muted-foreground">Bookmarks</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg card-hover">
              <Clock className="w-5 h-5 text-green-600 mx-auto mb-1 study-timer" />
              <div className="text-lg font-bold text-green-600">2.5h</div>
              <div className="text-xs text-muted-foreground">Study Time</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg card-hover">
              <BookOpen className="w-5 h-5 text-purple-600 mx-auto mb-1 study-timer" />
              <div className="text-lg font-bold text-purple-600">8</div>
              <div className="text-xs text-muted-foreground">Chapters</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 