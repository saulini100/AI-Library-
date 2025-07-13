import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { DocumentChapter } from "@shared/schema";
import { ChevronLeft, ChevronRight, StickyNote, Bookmark, Smartphone, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";

interface DocumentContentProps {
  chapterData: DocumentChapter | null;
  documentTitle?: string;
  annotations: any[];
  onAddAnnotation: () => void;
}

export default function DocumentContent({ chapterData, documentTitle, annotations, onAddAnnotation }: DocumentContentProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [swipeDirection, setSwipeDirection] = useState('');
  const [isSwipping, setIsSwipping] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const createBookmarkMutation = useMutation({
    mutationFn: async (data: { documentId: number; chapter: number; title?: string }) => {
      await apiRequest("/api/bookmarks", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
  });

  if (!chapterData) {
    return (
      <main className="flex-1 overflow-auto bg-white dark:bg-slate-800 px-6 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400">Chapter not found</p>
        </div>
      </main>
    );
  }

  const handleNavigation = (direction: "prev" | "next") => {
    const currentChapter = chapterData.number || 1;
    const newChapter = direction === "prev" ? currentChapter - 1 : currentChapter + 1;
    if (newChapter > 0) {
      // Update this to use document-based routing
      setLocation(`/document/${documentTitle || 'document'}/${newChapter}`);
    }
  };

  const handleAddBookmark = () => {
    createBookmarkMutation.mutate({
      documentId: 1, // This should come from props or context
      chapter: chapterData.number || 1,
      title: `${documentTitle || 'Document'} - Chapter ${chapterData.number || 1}`
    });
  };

  // Mobile swipe handlers
  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    setIsSwipping(true);
    if (contentRef.current) {
      contentRef.current.classList.add('touch-press');
    }
  }, []);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    setIsSwipping(false);
    if (contentRef.current) {
      contentRef.current.classList.remove('touch-press');
    }
  }, []);

  // Create a map of annotations by paragraph for quick lookup
  const annotationsByParagraph = annotations?.reduce((acc, annotation) => {
    if (!acc[annotation.paragraph]) acc[annotation.paragraph] = [];
    acc[annotation.paragraph].push(annotation);
    return acc;
  }, {} as Record<number, any[]>) || {};

  return (
    <main 
      ref={contentRef}
      className={`flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 transition-all duration-300 mobile-optimized reading-content ${swipeDirection} ${isSwipping ? 'touch-hover' : ''}`}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="max-w-4xl mx-auto px-8 py-10 animate-in fade-in duration-500">
        {/* Mobile Gesture Hint */}
        <div className="md:hidden bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800 mobile-stagger-1">
          <div className="flex items-center gap-3 text-sm">
            <Smartphone className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">Mobile tip:</span> Swipe left/right to navigate chapters, or use the buttons below
            </div>
          </div>
        </div>

        {/* Chapter Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 mb-8 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2 animate-in slide-in-from-top duration-700">
              {chapterData.title || `Chapter ${chapterData.number || 1}`}
            </h1>
            {documentTitle && (
              <p className="text-gray-500 dark:text-gray-400 text-sm animate-in fade-in duration-700 delay-200">
                {documentTitle}
              </p>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="space-y-4 mb-8">
          {(chapterData.paragraphs || []).map((paragraph) => {
            const paragraphAnnotations = annotationsByParagraph[paragraph.number] || [];
            
            return (
              <div 
                key={paragraph.number} 
                className="group relative animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${paragraph.number * 50}ms` }}
              >
                <div className={`
                  flex items-start space-x-4 p-6 rounded-lg border transition-all duration-300 hover:scale-[1.02]
                  ${paragraphAnnotations.length > 0 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md'
                  }
                `}>
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${paragraphAnnotations.length > 0 
                      ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                    }
                  `}>
                    {paragraph.number}
                  </div>
                  <div className="flex-1">
                    <p 
                      className="text-gray-900 dark:text-gray-100 leading-relaxed text-lg document-paragraph-text"
                      data-paragraph={paragraph.number}
                      style={{ lineHeight: 1.8 }}
                    >
                      {paragraph.text}
                    </p>
                    
                    {/* Show annotation indicators */}
                    {paragraphAnnotations.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        {paragraphAnnotations.map((annotation: any) => (
                          <div key={annotation.id} className="flex items-start space-x-2">
                            <StickyNote className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Your Note:</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">{annotation.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={() => handleNavigation("prev")}
            disabled={(chapterData.number || 1) <= 1}
            className="flex items-center space-x-2 h-12 px-6 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 mobile-enhanced-touch touch-ripple"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Chapter {(chapterData.number || 1) - 1}</span>
          </Button>

          <div className="flex space-x-3 study-stagger-1">
            <Button 
              onClick={onAddAnnotation}
              className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all duration-300 hover:scale-105 btn-hover btn-shine shadow-lg mobile-enhanced-touch touch-ripple haptic-medium"
            >
              <StickyNote className="h-4 w-4 mr-2 transition-transform duration-300 hover:rotate-12" />
              Add Note
            </Button>
            <Button 
              variant="outline"
              onClick={handleAddBookmark}
              disabled={createBookmarkMutation.isPending}
              className={`h-12 px-6 border-2 transition-all duration-500 hover:scale-105 btn-hover mobile-enhanced-touch touch-ripple haptic-light ${
                createBookmarkMutation.isPending 
                  ? 'bookmark-save bg-amber-50 border-amber-300 text-amber-700' 
                  : 'bg-white border-gray-300 hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <Bookmark className={`h-4 w-4 mr-2 transition-all duration-500 ${
                createBookmarkMutation.isPending ? 'bookmark-fold text-amber-600' : ''
              }`} />
              {createBookmarkMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                "Bookmark"
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => handleNavigation("next")}
            className="flex items-center space-x-2 h-12 px-6 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 mobile-enhanced-touch touch-ripple"
          >
            <span>Chapter {(chapterData.number || 1) + 1}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
} 