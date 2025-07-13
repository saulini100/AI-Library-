import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Highlighter, 
  Search, 
  FileText, 
  Calendar, 
  Trash2,
  Tag,
  ArrowLeft
} from 'lucide-react';

// Import our new utilities
import { useSearchableList } from '@/hooks/use-searchable-list';
import { useStandardToasts } from '@/hooks/use-standard-toasts';
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_NAMES } from '@/lib/constants';
import { formatTimestamp, buildDocumentUrl, getHighlightColorName, removeDuplicates } from '@/lib/data-utils';

import { 
  getHighlights, 
  deleteHighlight,
  type Highlight as HighlightType 
} from '@/lib/storage';

export default function HighlightsPage() {
  const [location, setLocation] = useLocation();
  const toasts = useStandardToasts();
  const [highlights, setHighlights] = useState<HighlightType[]>([]);

  // Create filter options from highlights data
  const documents = removeDuplicates(highlights.map(h => h.documentTitle)).filter(Boolean);
  const colors = removeDuplicates(highlights.map(h => h.color)).filter(Boolean);

  // Use our new searchable list hook
  const {
    searchQuery,
    setSearchQuery,
    filteredItems: filteredHighlights,
    filterValues,
    updateFilter,
    totalItems,
    filteredCount
  } = useSearchableList({
    items: highlights,
    searchFields: ['text'],
    filters: {
      color: {
        value: 'all',
        condition: (highlight, value) => value === 'all' || highlight.color === value
      },
      document: {
        value: 'all',
        condition: (highlight, value) => value === 'all' || highlight.documentTitle === value
      }
    }
  });

  // Load highlights
  useEffect(() => {
    loadHighlights();
  }, []);

  const loadHighlights = () => {
    const allHighlights = getHighlights();
    setHighlights(allHighlights);
  };

  const handleHighlightClick = (highlight: HighlightType) => {
    setLocation(buildDocumentUrl(highlight.documentId, highlight.chapter));
  };

  const handleDeleteHighlight = (id: string) => {
    if (deleteHighlight(id)) {
      loadHighlights();
      toasts.success.deleted('Highlight');
    } else {
      toasts.error.general('delete highlight');
    }
  };

  const getColorClass = (color: string) => {
    return Object.values(HIGHLIGHT_COLORS).includes(color as any) 
      ? color 
      : 'bg-gray-200 dark:bg-gray-800/40';
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
        <h1 className="text-3xl font-bold mb-2">Highlights</h1>
        <p className="text-muted-foreground">
          Your highlighted passages and important text selections ({filteredCount} of {totalItems})
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search highlights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select 
            value={filterValues.color || 'all'} 
            onValueChange={(value) => updateFilter('color', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors</SelectItem>
              {colors.map(color => (
                <SelectItem key={color} value={color}>
                  {getHighlightColorName(color)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filterValues.document || 'all'} 
            onValueChange={(value) => updateFilter('document', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Document" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              {documents.map(doc => (
                <SelectItem key={doc} value={doc}>
                  {doc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredHighlights.map((highlight) => (
          <Card 
            key={highlight.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => handleHighlightClick(highlight)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <FileText className="w-3 h-3" />
                    <span>{highlight.documentTitle}</span>
                    <span>Chapter {highlight.chapter}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHighlight(highlight.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className={`p-3 rounded-lg mb-3 ${getColorClass(highlight.color)}`}>
                <p className="text-sm line-clamp-4">
                  {highlight.text}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Highlighter className="w-3 h-3" />
                  <span>{getHighlightColorName(highlight.color)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatTimestamp(highlight.timestamp)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredHighlights.length === 0 && (
        <div className="text-center py-12">
          <Highlighter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || filterValues.color !== 'all' || filterValues.document !== 'all' 
              ? 'No highlights found' 
              : 'No highlights yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || filterValues.color !== 'all' || filterValues.document !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Start highlighting important passages in your documents.'}
          </p>
        </div>
      )}
    </div>
  );
} 