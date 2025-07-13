import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Bot, 
  ChevronRight, 
  ChevronDown, 
  Sparkles,
  Clock,
  Quote,
  StickyNote,
  Trash2,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AINote {
  id: number;
  userId: number;
  documentId: number;
  chapter: number;
  paragraph: number | null;
  selectedText: string;
  note: string;
  createdAt: string;
}

interface AIChapterNotesProps {
  documentId: number;
  chapter: number;
  isVisible: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'aiChapterNotesPanelPosition';
const MINIMIZED_KEY = 'aiChapterNotesPanelMinimized';

export default function AIChapterNotes({ 
  documentId, 
  chapter, 
  isVisible,
  onToggle 
}: AIChapterNotesProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });
  const queryClient = useQueryClient();

  // Drag state - initialize with proper default position
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        } catch {}
      }
    }
    const defaultX = window.innerWidth - 420 - 16;
    const defaultY = window.innerHeight - 600 - 16;
    return { x: Math.max(20, defaultX), y: Math.max(96, defaultY) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Update position when state changes
  useEffect(() => {
    if (isVisible) {
      // Recalculate position when state changes
      const defaultX = window.innerWidth - 420 - 16; // width + padding
      const defaultY = window.innerHeight - (isMinimized ? 64 : 600) - 16; // height + padding
      setPosition({
        x: Math.max(20, defaultX),
        y: Math.max(96, defaultY) // 96px to stay below top bar
      });
    }
  }, [isMinimized]);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  // Save minimized state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, isMinimized ? 'true' : 'false');
  }, [isMinimized]);

  // Fetch all AI annotations for this user
  const { data: allAnnotations = [] } = useQuery<AINote[]>({
    queryKey: ['/api/annotations'],
  });

  // Delete annotation mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return await apiRequest(`/api/annotations/${noteId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      // Invalidate and refetch annotations
      queryClient.invalidateQueries({ queryKey: ['/api/annotations'] });
    },
  });

  // Filter AI notes for current chapter
  const aiNotesForChapter = allAnnotations.filter((annotation) => 
    (annotation.documentId === -1 || annotation.documentId === -2) && // AI notes
    annotation.chapter === chapter
  );

  const toggleNoteExpansion = (noteId: number) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const handleDeleteNote = (noteId: number, agentName: string) => {
    if (window.confirm(`Are you sure you want to delete this ${agentName} note? This action cannot be undone.`)) {
      deleteNoteMutation.mutate(noteId);
    }
  };

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
    if (panelRef.current) {
      panelRef.current.style.cursor = 'grabbing';
      panelRef.current.style.transform = 'scale(1.02)';
      panelRef.current.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
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
      const width = isMinimized ? 300 : 400;
      const height = isMinimized ? 60 : 600;
      
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
    if (panelRef.current) {
      panelRef.current.style.cursor = '';
      panelRef.current.style.transform = '';
      panelRef.current.style.boxShadow = '';
    }
    
    // Clear any text selection that might have been accidentally created during drag
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
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

  const getAIAgentInfo = (documentId: number) => {
    if (documentId === -1) {
      return {
        name: 'AI Discussion',
        icon: MessageSquare,
        color: 'from-pink-500 to-rose-600',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        textColor: 'text-pink-700 dark:text-pink-300'
      };
    } else if (documentId === -2) {
      return {
        name: 'AI Chat',
        icon: Bot,
        color: 'from-blue-500 to-purple-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
        textColor: 'text-blue-700 dark:text-blue-300'
      };
    }
    return {
      name: 'AI Note',
      icon: StickyNote,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-300'
    };
  };

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-40 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ${
        isDragging ? 'select-none cursor-grabbing' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '300px' : '400px',
        height: isMinimized ? '60px' : '600px',
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
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white select-none transition-all duration-200 ${
          isDragging ? 'cursor-grabbing bg-gradient-to-r from-purple-600 to-indigo-700' : 'cursor-grab hover:from-purple-550 hover:to-indigo-650'
        }`}
        onMouseDown={handleMouseDown}
        onDragStart={(e) => e.preventDefault()}
        style={{ 
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="select-none" style={{ userSelect: 'none' }}>
            <h3 className="font-semibold select-none" style={{ userSelect: 'none' }}>AI Chapter Notes</h3>
            <p className="text-xs opacity-90 select-none" style={{ userSelect: 'none' }}>
              Chapter {chapter} • {aiNotesForChapter.length} {aiNotesForChapter.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
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
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
          <div className="space-y-4">
            {aiNotesForChapter.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No AI notes for this chapter yet</p>
                <p className="text-xs mt-1">
                  Use the AI Discussion or AI Chat to create notes for this chapter
                </p>
              </div>
            ) : (
              aiNotesForChapter
                .sort((a: AINote, b: AINote) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((note: AINote) => {
                  const agentInfo = getAIAgentInfo(note.documentId);
                  const IconComponent = agentInfo.icon;
                  const isExpanded = expandedNotes.has(note.id);
                  
                  return (
                    <div 
                      key={note.id} 
                      className={`border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 ${agentInfo.bgColor} rounded-lg p-4`}
                    >
                      {/* Note Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${agentInfo.color} flex items-center justify-center`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${agentInfo.textColor}`}>
                              {agentInfo.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(() => {
                                try {
                                  const date = new Date(note.createdAt);
                                  if (isNaN(date.getTime()) || note.createdAt === 'CURRENT_TIMESTAMP') {
                                    return 'Recently created';
                                  }
                                  return date.toLocaleDateString();
                                } catch (error) {
                                  return 'Recently created';
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id, agentInfo.name)}
                            className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 hover:text-red-700 border border-red-200 dark:border-red-800"
                            title={`Delete ${agentInfo.name} note`}
                            disabled={deleteNoteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleNoteExpansion(note.id)}
                            className="h-7 w-7 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* AI Generated Content */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-2">
                          <StickyNote className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {note.documentId === -1 ? 'AI Discussion Note' : note.documentId === -2 ? 'AI Chat Note' : 'AI Note'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                            {isExpanded ? note.note : `${note.note.substring(0, 150)}${note.note.length > 150 ? '...' : ''}`}
                          </p>
                        </div>
                      </div>

                      {/* Selected Text (for user annotations only) */}
                      {note.selectedText && note.selectedText.trim() && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <Quote className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              Selected Text
                            </span>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 border-l-4 border-purple-400">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {isExpanded ? note.selectedText : `${note.selectedText.substring(0, 100)}${note.selectedText.length > 100 ? '...' : ''}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Expand/Collapse hint */}
                      {(note.note.length > 150 || (note.selectedText && note.selectedText.length > 100)) && (
                        <div className="mt-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleNoteExpansion(note.id)}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
} 