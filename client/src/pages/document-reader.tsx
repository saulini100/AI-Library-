import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import TopBar from "@/components/top-bar";
import Sidebar from "@/components/sidebar";
import SidebarNew from "@/components/sidebar-new";
import DocumentLibrary from "@/components/document-library";
import AnnotationModal from "@/components/annotation-modal";
import ReadingProgress from "@/components/reading-progress";
import EnhancedTextSelection from "@/components/enhanced-text-selection";
import AIAgentChat from "@/components/ai-agent-chat";
import AutoLearningPanel from "@/components/auto-learning-panel";
import AIChapterNotes from "@/components/ai-chapter-notes";
import AIDiscussionAgent from "@/components/ai-discussion-agent";
import AIPowerSummaries from "@/components/ai-power-summaries";
import AIQuizAgent from "@/components/ai-quiz-agent";
import { AIVoiceReader } from "@/components/ai-voice-reader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bot, Brain, MessageSquare, StickyNote, Activity, Menu, Users, FileText, Zap, BookOpen, Clock, Target, ArrowLeft, ArrowRight, Bookmark, Volume2 } from "lucide-react";
import { Document, DocumentChapter } from "@shared/schema";
import { useSpeech } from "@/hooks/use-speech";
import { useSelection } from "@/hooks/use-selection";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import React from "react";
import { saveBookmark, saveNote, saveHighlight } from "@/lib/storage";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import AITeacherAgent from "@/components/ai-teacher-agent";

interface DocumentContentProps {
  document: Document;
  chapter: DocumentChapter;
  annotations: any[];
  onTextSelected: (text: string, range: Range, type?: string) => void;
  currentChapter: number;
  totalChapters: number;
  onNextChapter: () => void;
  onPrevChapter: () => void;
}

// NotePopover component for inline notes
function NotePopover({ note }: { note: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ml-1 align-middle text-amber-500 hover:text-amber-700 focus:outline-none" title="Show note">
          <StickyNote className="w-4 h-4 inline" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">
        <div className="font-semibold mb-1 text-amber-700">Your Note</div>
        <div className="text-foreground whitespace-pre-line">{note}</div>
      </PopoverContent>
    </Popover>
  );
}

function DocumentContent({ 
  document, 
  chapter, 
  annotations, 
  onTextSelected, 
  currentChapter, 
  totalChapters,
  onNextChapter,
  onPrevChapter
}: DocumentContentProps) {
  const [paragraphsRead, setParagraphsRead] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [wordsRead, setWordsRead] = useState(0);
  const [startTime] = useState(Date.now());
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  const { toast } = useToast();
  
  const paragraphs = chapter.paragraphs || [];
  const { isPlaying, togglePlayback, currentTime, duration } = useSpeech(paragraphs);
  
  const { startSelection } = useSelection({
    onSelection: (text: string, paragraph: number | null) => {
      // Open annotation modal when text is selected
      if (text && text.trim()) {
        // Create a mock range for the selection
        const mockRange = window.document.createRange();
        onTextSelected(text.trim(), mockRange, 'note');
      }
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onPrevChapter();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNextChapter();
          break;
        case 'b':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Add bookmark functionality
          }
          break;
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Add note functionality
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onNextChapter, onPrevChapter]);

  // Track reading progress
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.round((Date.now() - startTime) / 60000));
    }, 30000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Count words read based on visible paragraphs
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.8
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const paragraphElement = entry.target as HTMLElement;
          const paragraphNumber = parseInt(paragraphElement.dataset.paragraph || '0');
          
          if (paragraphNumber > paragraphsRead) {
            setParagraphsRead(paragraphNumber);
            
            const text = paragraphElement.textContent || '';
            const words = text.split(/\s+/).length;
            setWordsRead(prev => prev + words);
          }
        }
      });
    }, observerOptions);

    const paragraphElements = window.document.querySelectorAll('[data-paragraph]');
    paragraphElements.forEach((el: Element) => observer.observe(el));

    return () => observer.disconnect();
  }, [paragraphsRead]);

  useEffect(() => {
    const cleanup = startSelection();
    return cleanup;
  }, [startSelection]);

  const handleTextHighlight = (text: string, range: Range, color?: string) => {
    onTextSelected(text, range, 'highlight');
  };

  const handleParagraphClick = (paragraphNumber: number) => {
    setSelectedParagraph(selectedParagraph === paragraphNumber ? null : paragraphNumber);
  };

  const deleteAnnotationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: 'Note deleted', variant: 'default' });
    },
    onError: () => {
      toast({ title: 'Failed to delete note', variant: 'destructive' });
    }
  });

  return (
    <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 reading-content">
      <EnhancedTextSelection 
        onTextSelected={onTextSelected} 
        onHighlightRemoved={(highlightId) => {
          // Remove from local state if needed
          console.log('Highlight removed:', highlightId);
        }}
      />
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Minimal Header */}
        <header className="mb-16 text-center animate-in fade-in-0 slide-in-from-top-4 duration-800">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-4">
            {document.title}
          </h1>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Chapter {currentChapter}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{paragraphs.length} sections</span>
            <Separator orientation="vertical" className="h-4" />
            <span>~{Math.round(wordsRead / 200 || paragraphs.length * 2)} min read</span>
          </div>
        </header>

        {/* Clean Content */}
        <article className="space-y-8">
          {paragraphs.map((paragraph, index) => {
            const hasAnnotation = annotations.some(
              (ann: any) => ann.paragraph === paragraph.number || (ann.paragraph === null && paragraphs.length === 1)
            );
            const isSelected = selectedParagraph === paragraph.number;

            return (
              <section 
                key={paragraph.number} 
                className={`
                  group relative transition-all duration-500 ease-out cursor-pointer
                  ${paragraph.number <= paragraphsRead ? 'opacity-100' : 'opacity-75'}
                  ${isSelected ? 'scale-105 bg-muted/30 rounded-lg p-6 shadow-lg' : 'hover:bg-muted/10 rounded-lg p-4'}
                  animate-in slide-in-from-bottom-4 duration-700
                `}
                style={{ animationDelay: `${index * 100}ms` }}
                data-paragraph={paragraph.number}
                onClick={() => handleParagraphClick(paragraph.number)}
              >
                {/* Paragraph Indicator */}
                <div className={`
                  absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 opacity-0 group-hover:opacity-100 transition-all duration-300
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${hasAnnotation 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {hasAnnotation ? <Bookmark className="w-3 h-3" /> : paragraph.number}
                </div>
                
                {/* Content */}
                <div className="relative">
                  <p 
                    className="text-lg md:text-xl leading-relaxed text-foreground font-light tracking-wide selection:bg-primary/20 document-paragraph"
                    data-paragraph-text={paragraph.number}
                  >
                    {(() => {
                      let text = paragraph.text;
                      const anns = annotations.filter((ann: any) => 
                        (ann.paragraph === paragraph.number || (ann.paragraph === null && paragraphs.length === 1)) && 
                        ann.selectedText && 
                        ann.selectedText.trim().length > 0
                      );
                      
                      if (anns.length > 0) {
                        console.log(`🎨 Applying ${anns.length} highlights to paragraph ${paragraph.number}`);
                        anns.forEach(ann => {
                          console.log(`🎨 Highlighting: "${ann.selectedText}"`);
                        });
                      }
                      
                      if (anns.length === 0) return text;
                      
                      // Sort by length descending to avoid nested highlights
                      anns.sort((a, b) => b.selectedText.length - a.selectedText.length);
                      
                      let parts: (string | React.ReactNode)[] = [text];
                      
                      anns.forEach((ann, i) => {
                        const newParts: (string | React.ReactNode)[] = [];
                        let foundMatch = false; // Track if we've already highlighted this annotation
                        
                        parts.forEach((part, partIndex) => {
                                                      if (typeof part === 'string' && ann.selectedText && part.includes(ann.selectedText) && !foundMatch) {
                             // Clean and prepare the search text
                             const searchText = ann.selectedText.trim();
                             
                             // More precise text matching - look for exact boundaries
                             const index = part.indexOf(searchText);
                             
                             if (index !== -1) {
                               const beforeText = part.substring(0, index);
                               const afterText = part.substring(index + searchText.length);
                               
                               console.log(`🎯 Highlighting "${searchText.substring(0, 50)}..." (${searchText.length} chars)`);
                               console.log(`🎯 Found at position ${index}`);
                               console.log(`🎯 Before: "${beforeText.substring(Math.max(0, beforeText.length - 20))}"`);
                               console.log(`🎯 After: "${afterText.substring(0, 20)}..."`);
                               
                               // Add text before the highlight
                               if (beforeText) {
                                 newParts.push(beforeText);
                               }
                               
                               // Add the highlighted text (exact match only)
                               newParts.push(
                                 <span 
                                   key={`ann-${ann.id}-${i}-${partIndex}`} 
                                   className="inline-flex items-center annotation-highlight"
                                 >
                                   <mark className="bg-yellow-200 dark:bg-yellow-600 px-1 rounded highlight-text">
                                     {searchText}
                                   </mark>
                                   {ann.note && <NotePopover note={ann.note} />}
                                 </span>
                               );
                               
                               // Add text after the highlight
                               if (afterText) {
                                 newParts.push(afterText);
                               }
                               
                               foundMatch = true; // Mark that we've highlighted this annotation
                             } else {
                               newParts.push(part);
                             }
                           } else {
                             newParts.push(part);
                           }
                        });
                        parts = newParts;
                      });
                      return parts;
                    })()}
                  </p>
                  
                  {/* Inline Actions */}
                  {isSelected && (
                    <div className="mt-4 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => onTextSelected(paragraph.text, new Range(), 'note')}
                      >
                        <StickyNote className="w-3 h-3 mr-1" />
                        Add Note
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => onTextSelected(paragraph.text, new Range(), 'bookmark')}
                      >
                        <Bookmark className="w-3 h-3 mr-1" />
                        Bookmark
                      </Button>
                      {hasAnnotation && (
                        <Badge variant="secondary" className="text-xs">
                          Has annotation
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {hasAnnotation && (
                  <div className="mt-4 space-y-3">
                    {annotations.filter((ann: any) => ann.paragraph === paragraph.number || (ann.paragraph === null && paragraphs.length === 1)).map((ann: any) => (
                      <div key={ann.id} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-amber-700 dark:text-amber-200 mb-1 font-semibold">Highlighted:</div>
                            <div className="italic text-amber-900 dark:text-amber-100 mb-2">"{ann.selectedText}"</div>
                            <div className="text-xs text-green-700 dark:text-green-200 mb-1 font-semibold">Your Note:</div>
                            <div className="text-green-900 dark:text-green-100">{ann.note}</div>
                          </div>
                          <button
                            className="ml-4 text-xs text-red-600 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotationMutation.mutate(ann.id);
                            }}
                            disabled={deleteAnnotationMutation.isPending}
                            title="Delete note"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </article>

        {/* Navigation Footer */}
        <footer className="mt-20 pt-12 border-t border-border/50">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={onPrevChapter}
              disabled={currentChapter <= 1}
              className="group hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Previous Chapter
            </Button>
            
            <div className="text-center">
              <div className="text-2xl font-light text-muted-foreground">
                {currentChapter} / {totalChapters}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Use ← → arrow keys to navigate
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={onNextChapter}
              disabled={currentChapter >= totalChapters}
              className="group hover:scale-105 transition-all duration-200"
            >
              Next Chapter
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </footer>
      </div>


    </main>
  );
}

export default function DocumentReader() {
  const params = useParams();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  
  // AI Component states
  const [aiChatOpen, setAiChatOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiChatOpen') === 'true';
    }
    return false;
  });
  const [autoLearningOpen, setAutoLearningOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoLearningOpen') === 'true';
    }
    return false;
  });
  const [chapterNotesOpen, setChapterNotesOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chapterNotesOpen') === 'true';
    }
    return false;
  });
  const [discussionAgentOpen, setDiscussionAgentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('discussionAgentOpen') === 'true';
    }
    return false;
  });
  const [powerSummariesOpen, setPowerSummariesOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('powerSummariesOpen') === 'true';
    }
    return false;
  });
  const [quizAgentOpen, setQuizAgentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quizAgentOpen') === 'true';
    }
    return false;
  });
  const [voiceReaderOpen, setVoiceReaderOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voiceReaderOpen') === 'true';
    }
    return false;
  });
  const [teacherAgentOpen, setTeacherAgentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('teacherAgentOpen') === 'true';
    }
    return false;
  });

  const [activeRightPanel, setActiveRightPanel] = useState<string | null>(null);
  const highlightRemovedCallbackRef = useRef<((highlightId: string) => void) | null>(null);

  const { toast } = useToast();

  // Parse URL to get document and chapter
  const documentId = params.documentId ? parseInt(params.documentId) : null;
  const chapterFromUrl = params.chapter ? parseInt(params.chapter) : 1;

  // Fetch full document data
  const { data: fullDocument } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: () => apiRequest(`/api/documents/${documentId}`),
    enabled: !!documentId
  });

  // Fetch document chapter data
  const { data: documentData, error: documentError, isLoading: documentLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/chapters/${chapterFromUrl}`],
    queryFn: () => apiRequest(`/api/documents/${documentId}/chapters/${chapterFromUrl}`),
    enabled: !!documentId
  });

  // Fetch annotations for current chapter
  const { data: annotations = [], refetch: refetchAnnotations } = useQuery({
    queryKey: [`/api/annotations/${documentId}/${chapterFromUrl}`],
    queryFn: () => apiRequest(`/api/annotations/${documentId}/${chapterFromUrl}`),
    enabled: !!documentId
  });

  // Debug annotations loading
  useEffect(() => {
    if (annotations.length > 0) {
      console.log('📚 Loaded annotations:', annotations);
    }
  }, [annotations]);

  // Function to restore highlights from saved annotations
  const restoreHighlights = useCallback((annotations: any[]) => {
    // Clear existing highlights first
    const existingHighlights = document.querySelectorAll('.highlight-text[data-annotation-id]');
    existingHighlights.forEach(highlight => {
      const nextNode = highlight.nextSibling;
      if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
        const highlightText = highlight.textContent || '';
        const nextText = (nextNode as Text).textContent || '';
        (nextNode as Text).textContent = highlightText + nextText;
      }
      highlight.remove();
    });

    // Apply highlights for each annotation
    annotations.forEach(annotation => {
      if (annotation.selectedText) {
        applyVisualHighlight(annotation.selectedText, annotation.id);
      }
    });
  }, []);

  // Function to apply visual highlighting to text
  const applyVisualHighlight = useCallback((text: string, annotationId?: string) => {
    // Find all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    // Find the text node containing our selected text
    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const index = nodeText.indexOf(text);
      
      if (index !== -1) {
        // Create a highlight span
        const span = document.createElement('span');
        span.className = 'highlight-text bg-yellow-200 dark:bg-yellow-800/40';
        span.setAttribute('data-highlight-id', annotationId ? `annotation-${annotationId}` : `highlight-${Date.now()}`);
        if (annotationId) {
          span.setAttribute('data-annotation-id', annotationId);
        }
        span.textContent = text;
        span.title = 'Annotated text';
        
        // Split the text node and insert the highlight
        const beforeText = nodeText.substring(0, index);
        const afterText = nodeText.substring(index + text.length);
        
        if (beforeText) {
          const beforeNode = document.createTextNode(beforeText);
          textNode.parentNode?.insertBefore(beforeNode, textNode);
        }
        
        textNode.parentNode?.insertBefore(span, textNode);
        textNode.textContent = afterText;
        
        // Note: Click handler is now handled globally in the DocumentReader component
        
        break;
      }
    }
  }, [documentId, chapterFromUrl, toast]);

  useEffect(() => {
    if (fullDocument) {
      setSelectedDocument(fullDocument);
    }
  }, [fullDocument]);

  useEffect(() => {
    if (documentData) {
      setCurrentChapter(chapterFromUrl);
    }
  }, [documentData, chapterFromUrl]);

  // Global click handler for highlight removal
  useEffect(() => {
    const handleHighlightClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('highlight-text')) {
        event.preventDefault();
        event.stopPropagation();
        
        if (confirm('Remove this highlight?')) {
          // Check if this is an annotation highlight
          const annotationId = target.getAttribute('data-annotation-id');
          if (annotationId) {
            // Delete the annotation from the database
            fetch(`/api/annotations/${annotationId}`, { method: 'DELETE' })
              .then(response => {
                if (response.ok) {
                  // Invalidate queries to refresh the annotations
                  queryClient.invalidateQueries({ queryKey: [`/api/annotations/${documentId}/${chapterFromUrl}`] });
                  queryClient.invalidateQueries({ queryKey: ['/api/annotations'] });
                  
                  // Show success toast
                  toast({
                    title: "Highlight removed",
                    description: "The highlight has been permanently removed.",
                  });
                } else {
                  throw new Error('Failed to delete annotation');
                }
              })
              .catch(error => {
                console.error('Failed to delete annotation:', error);
                toast({
                  title: "Error",
                  description: "Failed to remove highlight. Please try again.",
                  variant: "destructive",
                });
              });
          } else {
            // This is a selection highlight (not from database)
            toast({
              title: "Highlight removed",
              description: "The highlight has been removed.",
            });
          }
          
          // Merge the text back
          const nextNode = target.nextSibling;
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            const spanText = target.textContent || '';
            const nextText = (nextNode as Text).textContent || '';
            (nextNode as Text).textContent = spanText + nextText;
          }
          target.remove();
        }
      }
    };

    document.addEventListener('click', handleHighlightClick);
    return () => document.removeEventListener('click', handleHighlightClick);
  }, [documentId, chapterFromUrl, toast]);

  // Note: Disabled DOM manipulation highlighting to prevent conflicts with React-based highlighting
  // The React template now handles all highlighting through the annotation display logic

  const handleDocumentSelect = (document: Document, chapter = 1) => {
    navigate(`/reader/${document.id}/${chapter}`);
  };

  const handleTextSelected = (text: string, range: Range, type?: string) => {
    if (!selectedDocument || !documentId || !currentChapter) {
      return;
    }

    // Clean the selected text to match exactly what was selected
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Check for any text processing issues
    if (text !== cleanText) {
      console.log('🧹 Text was cleaned:');
      console.log('🧹 Original:', `"${text}"`);
      console.log('🧹 Cleaned:', `"${cleanText}"`);
      console.log('🧹 Length difference:', text.length - cleanText.length);
    }

    // Determine the paragraph number from the range - improved logic
    let paragraphNumber: number | null = null;
    
    // Try to find the paragraph element from the range
    let element = range.startContainer;
    
    // If it's a text node, get the parent element
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as Element;
    }
    
    // Look for the section element with data-paragraph attribute
    if (element instanceof Element) {
      const paragraphSection = element.closest('[data-paragraph]');
      if (paragraphSection) {
        paragraphNumber = parseInt(paragraphSection.getAttribute('data-paragraph') || '0');
        console.log('📍 Found paragraph section with number:', paragraphNumber);
      } else {
        // Try to find the paragraph text element
        const paragraphTextElement = element.closest('[data-paragraph-text]');
        if (paragraphTextElement) {
          paragraphNumber = parseInt(paragraphTextElement.getAttribute('data-paragraph-text') || '0');
          console.log('📍 Found paragraph text element with number:', paragraphNumber);
        } else {
          console.log('⚠️ Could not find paragraph section with data-paragraph attribute');
          console.log('🔍 Current element:', element);
          console.log('🔍 Element className:', element.className);
          console.log('🔍 Element tagName:', element.tagName);
        }
      }
    }
    
    // Fallback: If no paragraph found, try to infer from document structure
    if (paragraphNumber === null) {
      // If there's only one paragraph in the chapter, use that
      const chapterData = documentData?.chapter;
      if (selectedDocument && chapterData?.paragraphs?.length === 1) {
        paragraphNumber = chapterData.paragraphs[0].number;
        console.log('📍 Using fallback paragraph number:', paragraphNumber);
      }
    }
    
    console.log('📝 Selected text:', text);
    console.log('📝 Text length:', text.length);
    console.log('📝 Cleaned text:', cleanText);
    console.log('📝 Detected paragraph:', paragraphNumber);
    
    // Log the exact selection boundaries for debugging
    if (range.startContainer && range.endContainer) {
      console.log('📍 Selection start:', range.startOffset);
      console.log('📍 Selection end:', range.endOffset);
      console.log('📍 Start container:', range.startContainer.textContent?.substring(0, 50) + '...');
      console.log('📍 Selected range text:', range.toString());
    }

    if (type === 'note') {
      // Open annotation modal for note creation
      setSelectedText(cleanText);
      setSelectedParagraph(paragraphNumber);
      setAnnotationModalOpen(true);
    } else if (type === 'highlight') {
      // Open annotation modal for highlight with note
      setSelectedText(cleanText);
      setSelectedParagraph(paragraphNumber);
      setAnnotationModalOpen(true);
    } else if (type === 'bookmark') {
      // Create a bookmark directly
      try {
        const newBookmark = saveBookmark({
          title: `Bookmark from ${selectedDocument.title} Chapter ${currentChapter}`,
          content: text,
          documentId: documentId?.toString() || '',
          documentTitle: selectedDocument.title,
          chapter: currentChapter,
          paragraph: paragraphNumber || undefined,
          folder: 'General',
          tags: ['manual'],
          notes: `Bookmarked from ${selectedDocument.title} Chapter ${currentChapter}`,
        });
        
        toast({
          title: "Bookmark created",
          description: "Your bookmark has been saved to your collection.",
        });
      } catch (error) {
        console.error('Failed to save bookmark:', error);
        toast({
          title: "Error",
          description: "Failed to save bookmark. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // No specific type provided - don't auto-create anything
      // User must explicitly choose to create a note, highlight, or bookmark
      console.log('Text selected without specific action:', text);
    }
  };

  const handleCloseAnnotationModal = () => {
    setSelectedText("");
    setSelectedParagraph(null);
    setAnnotationModalOpen(false);
    
    // Clear any text selections
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const newState = !prev;
      toast({
        title: !newState ? "Sidebar Opened" : "Sidebar Closed",
        description: !newState ? "Navigation panel is now visible" : "Navigation panel has been hidden",
        duration: 1000,
      });
      return newState;
    });
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    toast({
      title: !darkMode ? "Dark Mode Enabled" : "Light Mode Enabled",
      description: !darkMode ? "Switched to dark theme" : "Switched to light theme",
      duration: 1000,
    });
  };

  const handleNextChapter = useCallback(() => {
    const totalChapters = typeof selectedDocument?.content === 'string' 
      ? JSON.parse(selectedDocument.content).totalChapters 
      : selectedDocument?.totalChapters || 1;
    
    if (documentId && currentChapter < totalChapters) {
      // Clear highlights before navigating
      const existingHighlights = document.querySelectorAll('.highlight-text[data-annotation-id]');
      existingHighlights.forEach(highlight => highlight.remove());
      
      navigate(`/reader/${documentId}/${currentChapter + 1}`);
      toast({
        title: `Chapter ${currentChapter + 1}`,
        description: "Moving to next chapter",
        duration: 1000,
      });
    }
  }, [currentChapter, selectedDocument, documentId, navigate, toast]);

  const handlePrevChapter = useCallback(() => {
    if (documentId && currentChapter > 1) {
      // Clear highlights before navigating
      const existingHighlights = document.querySelectorAll('.highlight-text[data-annotation-id]');
      existingHighlights.forEach(highlight => highlight.remove());
      
      navigate(`/reader/${documentId}/${currentChapter - 1}`);
      toast({
        title: `Chapter ${currentChapter - 1}`,
        description: "Moving to previous chapter",
        duration: 1000,
      });
    }
  }, [currentChapter, documentId, navigate, toast]);

  const toggleAiChat = () => {
    setAiChatOpen(!aiChatOpen);
    toast({
      title: !aiChatOpen ? "AI Chat Opened" : "AI Chat Closed",
      description: !aiChatOpen ? "AI assistant is ready to help" : "AI chat has been closed",
      duration: 1500,
    });
  };

  const toggleAutoLearning = () => {
    setAutoLearningOpen(!autoLearningOpen);
    toast({
      title: !autoLearningOpen ? "Auto Learning Activated" : "Auto Learning Deactivated",
      description: !autoLearningOpen ? "AI is now learning from your reading" : "Auto learning has been turned off",
      duration: 1500,
    });
  };

  const toggleChapterNotes = () => {
    setChapterNotesOpen(!chapterNotesOpen);
    toast({
      title: !chapterNotesOpen ? "Chapter Notes Opened" : "Chapter Notes Closed",
      description: !chapterNotesOpen ? "AI-generated chapter insights available" : "Chapter notes have been closed",
      duration: 1500,
    });
  };

  const toggleDiscussionAgent = () => {
    const isOpening = !discussionAgentOpen;
    setDiscussionAgentOpen(isOpening);
    if (isOpening) {
        setActiveRightPanel('discussion');
    }
    toast({
        title: isOpening ? "Discussion Agent Activated" : "Discussion Agent Closed",
        description: isOpening ? "Ready to discuss chapter content" : "Discussion has been closed",
        duration: 1500,
    });
  };

  const togglePowerSummaries = () => {
    setPowerSummariesOpen(!powerSummariesOpen);
    toast({
      title: !powerSummariesOpen ? "Power Summaries Opened" : "Power Summaries Closed",
      description: !powerSummariesOpen ? "AI-powered chapter summaries available" : "Power summaries have been closed",
      duration: 1500,
    });
  };

  const toggleQuizAgent = () => {
    setQuizAgentOpen(!quizAgentOpen);
    toast({
      title: !quizAgentOpen ? "Quiz Agent Opened" : "Quiz Agent Closed",
      description: !quizAgentOpen ? "Ready to create quizzes about this content" : "Quiz agent has been closed",
      duration: 1500,
    });
  };

  const toggleVoiceReader = () => {
    setVoiceReaderOpen(!voiceReaderOpen);
    toast({
      title: !voiceReaderOpen ? "Voice Reader Opened" : "Voice Reader Closed",
      description: !voiceReaderOpen ? "AI voice reader is ready to narrate content" : "Voice reader has been closed",
      duration: 1500,
    });
  };

  const toggleTeacherAgent = () => {
    const newState = !teacherAgentOpen;
    setTeacherAgentOpen(newState);
    localStorage.setItem('teacherAgentOpen', newState.toString());
  };

  // Persist AI panel open/close state to localStorage
  useEffect(() => { localStorage.setItem('aiChatOpen', aiChatOpen ? 'true' : 'false'); }, [aiChatOpen]);
  useEffect(() => { localStorage.setItem('autoLearningOpen', autoLearningOpen ? 'true' : 'false'); }, [autoLearningOpen]);
  useEffect(() => { localStorage.setItem('chapterNotesOpen', chapterNotesOpen ? 'true' : 'false'); }, [chapterNotesOpen]);
  useEffect(() => { localStorage.setItem('discussionAgentOpen', discussionAgentOpen ? 'true' : 'false'); }, [discussionAgentOpen]);
  useEffect(() => { localStorage.setItem('powerSummariesOpen', powerSummariesOpen ? 'true' : 'false'); }, [powerSummariesOpen]);
  useEffect(() => { localStorage.setItem('quizAgentOpen', quizAgentOpen ? 'true' : 'false'); }, [quizAgentOpen]);
  useEffect(() => { localStorage.setItem('voiceReaderOpen', voiceReaderOpen ? 'true' : 'false'); }, [voiceReaderOpen]);

  // Save reading position to localStorage whenever documentId or currentChapter changes
  useEffect(() => {
    if (!documentId || !currentChapter) return;
    try {
      const savedPositions = JSON.parse(localStorage.getItem('readingPositions') || '{}');
      savedPositions[documentId] = { chapter: currentChapter };
      localStorage.setItem('readingPositions', JSON.stringify(savedPositions));
    } catch (e) {
      // Fails silently
    }
  }, [documentId, currentChapter]);



  // If no document is selected, show the document library
  if (!documentId || !selectedDocument) {
    return <DocumentLibrary onSelectDocument={handleDocumentSelect} />;
  }

  // If document data is loading or not found
  if (!documentData) {
    if (documentError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center animate-in scale-in duration-500">
            <h2 className="text-2xl font-semibold text-destructive mb-2">Error Loading Document</h2>
            <p className="text-muted-foreground">Failed to load the document. Please try again.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Back to Library
            </Button>
          </div>
        </div>
      );
    }

    if (documentLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center animate-in fade-in duration-500">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-medium mb-2">Loading Document</h2>
            <p className="text-muted-foreground">Preparing your reading experience...</p>
          </div>
        </div>
      );
    }

    return null;
  }

  const currentChapterData = documentData.chapter;
  
  // Debug AI Voice Reader content
  console.log('📖 DocumentReader - currentChapterData:', currentChapterData);
  console.log('📖 DocumentReader - paragraphs:', currentChapterData?.paragraphs);
  console.log('📖 DocumentReader - paragraphs length:', currentChapterData?.paragraphs?.length);

  return (
    <div className={`min-h-screen theme-transition-root ${darkMode ? 'dark' : ''}`}>
      <div className="bg-background text-foreground theme-transition-content">
        <TopBar
          book={selectedDocument.title}
          chapter={currentChapter}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onToggleAiChat={toggleAiChat}
          onToggleAutoLearning={toggleAutoLearning}
          onToggleChapterNotes={toggleChapterNotes}
          onToggleDiscussionAgent={toggleDiscussionAgent}
          onTogglePowerSummaries={togglePowerSummaries}
          onToggleQuizAgent={toggleQuizAgent}
          onToggleTeacherAgent={toggleTeacherAgent}
          aiChatOpen={aiChatOpen}
          autoLearningOpen={autoLearningOpen}
          chapterNotesOpen={chapterNotesOpen}
          discussionAgentOpen={discussionAgentOpen}
          powerSummariesOpen={powerSummariesOpen}
          quizAgentOpen={quizAgentOpen}
          teacherAgentOpen={teacherAgentOpen}
        />
        
        <div className="flex relative">
          <SidebarNew
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            currentPage="reader"
            documentId={selectedDocument.id}
            currentChapter={currentChapter}
            totalChapters={
              typeof selectedDocument.content === 'string' 
                ? JSON.parse(selectedDocument.content).totalChapters 
                : selectedDocument.totalChapters
            }
          />
          
          <div className={`flex-1 transition-all duration-500 ease-out ${
            sidebarOpen ? 'lg:ml-72' : 'lg:ml-16'
          } ml-0`}>
            <DocumentContent
              document={selectedDocument}
              chapter={currentChapterData}
              annotations={annotations}
              onTextSelected={handleTextSelected}
              currentChapter={currentChapter}
              totalChapters={
                typeof selectedDocument.content === 'string' 
                  ? JSON.parse(selectedDocument.content).totalChapters 
                  : selectedDocument.totalChapters
              }
              onNextChapter={handleNextChapter}
              onPrevChapter={handlePrevChapter}
            />
          </div>
        </div>

        {/* Minimal AI Actions */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-40">
          <Button
            onClick={toggleVoiceReader}
            size="lg"
            className={`w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${
              voiceReaderOpen 
                ? 'bg-green-500 scale-110 shadow-green-500/30' 
                : 'bg-secondary hover:scale-105'
            }`}
            title="AI Voice Reader"
          >
            <Volume2 className="w-6 h-6" />
          </Button>
          
          <Button
            onClick={toggleDiscussionAgent}
            size="lg"
            className={`w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${
              discussionAgentOpen 
                ? 'bg-blue-500 scale-110 shadow-blue-500/30' 
                : 'bg-secondary hover:scale-105'
            }`}
            title="AI Discussion Panel"
          >
            <Bot className="w-6 h-6" />
          </Button>
          
          <Button
            onClick={toggleAiChat}
            size="lg"
            className={`w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${
              aiChatOpen 
                ? 'bg-primary scale-110 shadow-primary/30' 
                : 'bg-secondary hover:scale-105'
            }`}
            title="AI Chat Assistant"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>

        {/* AI Components */}
        {documentId && (
          <>
            <AIAgentChat
              documentId={documentId}
              chapter={currentChapter}
              isOpen={aiChatOpen}
              onToggle={toggleAiChat}
            />
            
            <AIDiscussionAgent
              documentId={documentId}
              chapter={currentChapter}
              isOpen={discussionAgentOpen}
              onToggle={toggleDiscussionAgent}
              currentBook={selectedDocument.title}
            />
            
            <AutoLearningPanel
              documentId={documentId}
              documentTitle={selectedDocument.title}
              isOpen={autoLearningOpen}
              onToggle={toggleAutoLearning}
            />
            
            <AIChapterNotes
              documentId={documentId}
              chapter={currentChapter}
              isVisible={chapterNotesOpen}
              onToggle={toggleChapterNotes}
            />
            
            <AIPowerSummaries
              documentId={documentId}
              currentChapter={currentChapter}
              currentChapterData={currentChapterData}
              isVisible={powerSummariesOpen}
              onToggle={togglePowerSummaries}
            />
            
            <AIQuizAgent
              documentId={documentId}
              chapter={currentChapter}
              isOpen={quizAgentOpen}
              onToggle={toggleQuizAgent}
            />
            
            <AIVoiceReader
              content={currentChapterData?.paragraphs || []}
              documentId={documentId}
              currentChapter={currentChapter}
              onNavigateNext={handleNextChapter}
              canNavigateNext={currentChapter < (
                typeof selectedDocument?.content === 'string' 
                  ? JSON.parse(selectedDocument.content).totalChapters 
                  : selectedDocument?.totalChapters || 1
              )}
              isOpen={voiceReaderOpen}
              onToggle={toggleVoiceReader}
            />
          </>
        )}

        {/* Annotation Modal */}
        <AnnotationModal
          isOpen={annotationModalOpen}
          onClose={handleCloseAnnotationModal}
          selectedText={selectedText}
          documentId={documentId || 0}
          documentTitle={selectedDocument.title}
          chapter={currentChapter}
          paragraph={selectedParagraph}
          onAnnotationSaved={(annotation) => {
            console.log('🎉 Annotation saved:', annotation);
            console.log('📝 Selected text:', selectedText);
            console.log('📄 Paragraph:', selectedParagraph);
            
            // Manually add the new annotation to the cache to avoid a refetch
            queryClient.setQueryData([`/api/annotations/${documentId}/${currentChapter}`], (oldData: any[] | undefined) => {
              const newAnnotation = {
                ...annotation,
                id: annotation.id || Date.now(), // Ensure we have an ID
                documentId: documentId,
                chapter: currentChapter,
                selectedText: selectedText.replace(/\s+/g, ' ').trim(), // Clean the text for storage
                note: annotation.note,
                paragraph: selectedParagraph,
                createdAt: annotation.createdAt || new Date().toISOString()
              };
              
              console.log('✅ New annotation to cache:', newAnnotation);
              
              if (oldData) {
                return [...oldData, newAnnotation];
              }
              return [newAnnotation];
            });
            
            // Force a re-render by invalidating the query as well
            queryClient.invalidateQueries({ queryKey: [`/api/annotations/${documentId}/${currentChapter}`] });
          }}
        />

        {/* Teacher Agent */}
        {documentId && (
          <AITeacherAgent
            documentId={documentId}
            chapter={currentChapter}
            isOpen={teacherAgentOpen}
            onToggle={toggleTeacherAgent}
          />
        )}
      </div>
    </div>
  );
}