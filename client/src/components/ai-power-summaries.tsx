import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Zap, 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  Hash,
  Calendar,
  X,
  Plus,
  Loader2,
  Sparkles,
  ChevronUp,
  Minimize2,
  Maximize2,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PowerSummary {
  id: number;
  chapter: number;
  chapterTitle: string;
  powerSummary: string;
  createdAt: string;
}

interface AIPowerSummariesProps {
  documentId: number;
  currentChapter: number;
  currentChapterData?: {
    title: string;
    paragraphs: Array<{ text: string }>;
  };
  isVisible: boolean;
  onToggle: () => void;
}

const MINIMIZED_KEY = 'powerSummariesPanelMinimized';

export default function AIPowerSummaries({
  documentId,
  currentChapter,
  currentChapterData,
  isVisible,
  onToggle
}: AIPowerSummariesProps) {
  // Safety check - don't render if documentId is not available
  if (!documentId) {
    return null;
  }

  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  
  // Draggable panel state - initialize with proper default position
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('powerSummariesPanelPosition');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        } catch {}
      }
    }
    // Default position
    const defaultX = window.innerWidth - 420 - 16;
    const defaultY = window.innerHeight - 600 - 16;
    return {
      x: Math.max(20, defaultX),
      y: Math.max(96, defaultY)
    };
  });

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('powerSummariesPanelPosition', JSON.stringify(position));
  }, [position]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });
  
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const expandedCardRef = useRef<HTMLDivElement>(null);
  const summaryPanelRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fetch all power summaries for this document
  const { data: summariesData, isLoading, error, refetch } = useQuery({
    queryKey: [`power-summaries-${documentId}`],
    queryFn: () => apiRequest(`/api/power-summaries/${documentId}`),
    enabled: isVisible && !!documentId
  });

  const summaries = summariesData?.summaries || [];
  const currentChapterSummary = summaries.find((s: PowerSummary) => s.chapter === currentChapter);

  // Power summary generation mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      let text: string;
      let title: string;
      
      if (currentChapterData) {
        // Use provided chapter data
        text = currentChapterData.paragraphs.map((p: any) => p.text).join(' ');
        title = currentChapterData.title;
      } else {
        // Fetch chapter data from API
        const chapterResponse = await fetch(`/api/documents/${documentId}/chapter/${currentChapter}`);
        if (!chapterResponse.ok) {
          throw new Error('Failed to fetch chapter data');
        }
        const chapterInfo = await chapterResponse.json();
        text = chapterInfo.paragraphs.map((p: any) => p.text).join(' ');
        title = chapterInfo.title;
      }
      
      const response = await fetch('/api/ai-power-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          chapter: currentChapter,
          text,
          title
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate power summary');
      }

      const data = await response.json();
      return data.summary;
    },
    onSuccess: () => {
      // Refresh the summaries list
      refetch();
      // Auto-expand the new summary
      setTimeout(() => {
        const newSummary = summaries.find((s: PowerSummary) => s.chapter === currentChapter);
        if (newSummary) {
          setExpandedSummary(newSummary.id);
        }
      }, 100);
    },
  });

  // Update position when state changes
  useEffect(() => {
    if (isVisible) {
      // Recalculate position when state changes
      const defaultX = window.innerWidth - 420 - 16; // width + padding
      const defaultY = window.innerHeight - (isMinimized ? 64 : Math.min(window.innerHeight - 80, 600)) - 16; // height + padding
      setPosition({
        x: Math.max(20, defaultX),
        y: Math.max(96, defaultY) // 96px to stay below top bar
      });
    }
  }, [isMinimized]);

  // Save minimized state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, isMinimized ? 'true' : 'false');
  }, [isMinimized]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    
    // Prevent text selection during drag
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    
    // Add visual feedback
    if (summaryPanelRef.current) {
      summaryPanelRef.current.style.cursor = 'grabbing';
      summaryPanelRef.current.style.transform = 'scale(1.02)';
      summaryPanelRef.current.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Prevent text selection during drag
    e.preventDefault();
    e.stopPropagation();
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      const width = 420;
      const height = isMinimized ? 64 : Math.min(window.innerHeight - 80, 600);
      
      // Calculate new position with smooth boundaries
      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, e.clientX - dragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, e.clientY - dragOffset.y));
      
      setPosition({ x: newX, y: newY });
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset visual feedback
    if (summaryPanelRef.current) {
      summaryPanelRef.current.style.cursor = '';
      summaryPanelRef.current.style.transform = '';
      summaryPanelRef.current.style.boxShadow = '';
    }
    
    // Clear any text selection that might have been accidentally created during drag
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // Save position to localStorage on drag end
    localStorage.setItem('powerSummariesPanelPosition', JSON.stringify(position));
  };

  useEffect(() => {
    if (isDragging) {
      // Use passive listeners for better performance
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
      
      // Also add touchmove and touchend for mobile support
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const mouseEvent = {
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            clientX: touch.clientX,
            clientY: touch.clientY
          } as MouseEvent;
          handleMouseMove(mouseEvent);
        }
      };
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp, { passive: true });
      
      // Prevent body scroll during drag
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [isDragging, dragOffset]);

  const toggleSummary = (summaryId: number) => {
    const wasExpanded = expandedSummary === summaryId;
    setExpandedSummary(wasExpanded ? null : summaryId);
    
    // Auto-scroll to expanded content after a short delay
    if (!wasExpanded) {
      setTimeout(() => {
        expandedCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 150);
    }
  };

  // Handle scroll events for scroll indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      setShowScrollTop(scrollTop > 100);
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - 50);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || dateString === 'CURRENT_TIMESTAMP') {
        return 'Recently created';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Recently created';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-56 right-6 z-10">
        <Button
          onClick={onToggle}
          className="h-14 w-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 relative"
          title="Open Power Summaries"
        >
          <Zap className="h-6 w-6" />
          {summaries.length > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/50">
              <span className="text-xs font-bold text-white">{summaries.length}</span>
            </div>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>      
      {/* Power Summaries Panel - now draggable with dynamic positioning */}
      <div 
        ref={summaryPanelRef}
        className={`fixed bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl z-20 overflow-hidden transition-all duration-300 ${
          isDragging ? 'select-none cursor-grabbing' : ''
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: isMinimized ? '300px' : '400px',
          height: isMinimized ? '60px' : `${Math.min(window.innerHeight - 80, 600)}px`,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overscrollBehavior: 'contain',
          willChange: isDragging ? 'transform' : 'auto',
          transition: isDragging ? 'box-shadow 0.2s ease-out, transform 0.2s ease-out' : 'all 0.3s ease-out',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          zIndex: isDragging ? 80 : 60
        }}
        onWheel={(e) => e.stopPropagation()}
        onScroll={(e) => e.stopPropagation()}
        onMouseEnter={(e) => e.stopPropagation()}
      >
        {/* Header - draggable */}
        <div 
          className={`flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white select-none transition-all duration-200 ${
            isDragging ? 'cursor-grabbing bg-gradient-to-r from-purple-600 to-pink-600' : 'cursor-grab hover:from-purple-550 hover:to-pink-550'
          }`}
          onMouseDown={handleMouseDown}
          onDragStart={(e) => e.preventDefault()}
          style={{ 
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
            <div className="select-none" style={{ userSelect: 'none' }}>
              <h3 className="font-semibold select-none" style={{ userSelect: 'none' }}>
                Power Summaries
              </h3>
              {!isMinimized && (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Hash className="h-3 w-3" />
                  <span>{summaries.length} {summaries.length === 1 ? 'summary' : 'summaries'}</span>
                  {!currentChapterSummary && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-white/60 text-xs">
                        <Sparkles className="h-3 w-3" />
                        <span>Ch. {currentChapter} ready to summarize</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Generate Summary for Current Chapter Button */}
            {!isMinimized && !currentChapterSummary && !generateSummaryMutation.isPending && (
              <Button
                onClick={() => generateSummaryMutation.mutate()}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 h-8 w-8 group"
                title={`Generate summary for Chapter ${currentChapter}`}
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
              </Button>
            )}
            
            {/* Loading indicator */}
            {!isMinimized && generateSummaryMutation.isPending && (
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Generating...</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 hover:bg-white/20 text-white"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              title="Close Power Summaries"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content container with scroll indicators */}
        {!isMinimized && (
          <div className="flex-1 relative" style={{ height: 'calc(100% - 80px)' }}>
            {/* Content with enhanced scrolling */}
            <div 
              ref={scrollContainerRef}
              className="h-full overflow-y-auto p-4 scrollbar-thin"
              style={{ scrollBehavior: 'smooth' }}
            >
            {/* Generation Error */}
            {generateSummaryMutation.isError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">
                  Failed to generate summary. Please try again.
                </p>
              </div>
            )}
            
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">Failed to load summaries</p>
                <p className="text-xs text-slate-500 mt-1">Please try again later</p>
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-8">
                <div className="relative mb-6">
                  <Zap className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  {!currentChapterSummary && (
                    <Button
                      onClick={() => generateSummaryMutation.mutate()}
                      disabled={generateSummaryMutation.isPending}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg"
                      title="Generate your first power summary"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-400">No power summaries yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click the + icon to generate your first power summary
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Current Chapter Summary (if exists) */}
                {currentChapterSummary && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Current Chapter</span>
                    </div>
                    <PowerSummaryCard
                      ref={expandedSummary === currentChapterSummary.id ? expandedCardRef : undefined}
                      summary={currentChapterSummary}
                      isExpanded={expandedSummary === currentChapterSummary.id}
                      onToggle={() => toggleSummary(currentChapterSummary.id)}
                      isCurrentChapter={true}
                    />
                  </div>
                )}
                
                {/* Generate Summary for Current Chapter if missing */}
                {!currentChapterSummary && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Current Chapter</span>
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-600/50 bg-slate-800/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                            {currentChapter}
                          </div>
                          <div>
                            <h5 className="font-medium text-white text-sm">
                              Chapter {currentChapter}
                            </h5>
                            <p className="text-xs text-slate-400">
                              No summary yet
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => generateSummaryMutation.mutate()}
                          disabled={generateSummaryMutation.isPending}
                          size="sm"
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                        >
                          {generateSummaryMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Summaries */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">All Summaries</h4>
                  {summaries
                    .filter((summary: PowerSummary) => summary.chapter !== currentChapter)
                    .map((summary: PowerSummary) => (
                      <PowerSummaryCard
                        key={summary.id}
                        ref={expandedSummary === summary.id ? expandedCardRef : undefined}
                        summary={summary}
                        isExpanded={expandedSummary === summary.id}
                        onToggle={() => toggleSummary(summary.id)}
                        isCurrentChapter={false}
                      />
                    ))}
                </div>
              </div>
            )}
            </div>

            {/* Bottom fade indicator */}
            {showBottomFade && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/95 to-transparent pointer-events-none" />
            )}
          </div>
        )}

        {/* Scroll to top button - positioned relative to panel */}
        {!isMinimized && showScrollTop && (
          <button
            onClick={scrollToTop}
            className="absolute right-4 bottom-4 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-10 group"
            title="Scroll to top"
          >
            <ChevronUp className="h-3 w-3 group-hover:animate-bounce" />
          </button>
        )}
      </div>
    </>
  );
}

interface PowerSummaryCardProps {
  summary: PowerSummary;
  isExpanded: boolean;
  onToggle: () => void;
  isCurrentChapter: boolean;
}

const PowerSummaryCard = React.forwardRef<HTMLDivElement, PowerSummaryCardProps>(
  ({ summary, isExpanded, onToggle, isCurrentChapter }, ref) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
      if (!window.confirm('Delete this power summary?')) return;
      setDeleting(true);
      try {
        const res = await fetch(`/api/power-summaries/${summary.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        toast({ title: 'Power summary deleted', variant: 'default' });
        queryClient.invalidateQueries();
      } catch (e) {
        toast({ title: 'Failed to delete power summary', variant: 'destructive' });
      } finally {
        setDeleting(false);
      }
    };
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || dateString === 'CURRENT_TIMESTAMP') {
        return 'Recently created';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Recently created';
    }
  };
  return (
    <div 
      ref={ref}
      className={`rounded-xl border transition-all duration-300 ${
        isCurrentChapter 
          ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10' 
          : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors rounded-xl"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
              isCurrentChapter 
                ? 'bg-blue-500 text-white' 
                : 'bg-purple-500 text-white'
            }`}>
              {summary.chapter}
            </div>
            <h5 className="font-medium text-white text-sm truncate">
              {summary.chapterTitle}
            </h5>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            {summary.powerSummary}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-500">
              {formatDate(summary.createdAt)}
            </span>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 mt-2 pt-4">
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete power summary"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
          {/* Power Summary - Enhanced */}
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/20">
            <h6 className="flex items-center gap-2 text-sm font-medium text-blue-300 mb-3">
              <Zap className="h-4 w-4" />
              Power Summary
            </h6>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {summary.powerSummary}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PowerSummaryCard.displayName = 'PowerSummaryCard';