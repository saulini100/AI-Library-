import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { BibleChapter } from "@shared/schema";
import { ChevronLeft, ChevronRight, StickyNote, Bookmark } from "lucide-react";
import { useLocation } from "wouter";

interface BibleContentProps {
  chapterData: BibleChapter | null;
  annotations: any[];
  onAddAnnotation: () => void;
}

export default function BibleContent({ chapterData, annotations, onAddAnnotation }: BibleContentProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const createBookmarkMutation = useMutation({
    mutationFn: async (data: { book: string; chapter: number; title?: string }) => {
      await apiRequest("POST", "/api/bookmarks", data);
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
    const newChapter = direction === "prev" ? chapterData.chapter - 1 : chapterData.chapter + 1;
    if (newChapter > 0) {
      setLocation(`/bible/${chapterData.book}/${newChapter}`);
    }
  };

  const handleAddBookmark = () => {
    createBookmarkMutation.mutate({
      book: chapterData.book,
      chapter: chapterData.chapter,
      title: `${chapterData.book} ${chapterData.chapter}`
    });
  };

  // Create a map of annotations by verse for quick lookup
  const annotationsByVerse = annotations?.reduce((acc, annotation) => {
    if (!acc[annotation.verse]) acc[annotation.verse] = [];
    acc[annotation.verse].push(annotation);
    return acc;
  }, {} as Record<number, any[]>) || {};

  return (
    <main className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Chapter Header */}
        <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              {chapterData.book} Chapter {chapterData.chapter}
            </h1>
            <p className="text-gray-500 text-sm">
              New International Version
            </p>
          </div>
        </div>

        {/* Bible Text */}
        <div className="space-y-4 mb-8">
          {chapterData.verses.map((verse) => {
            const verseAnnotations = annotationsByVerse[verse.number] || [];
            
            return (
              <div key={verse.number} className="group relative">
                <div className={`
                  flex items-start space-x-4 p-6 rounded-lg border transition-all duration-200
                  ${verseAnnotations.length > 0 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}>
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${verseAnnotations.length > 0 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {verse.number}
                  </div>
                  <div className="flex-1">
                    <p 
                      className="text-gray-900 leading-relaxed text-lg"
                      data-verse={verse.number}
                      style={{ lineHeight: 1.8 }}
                    >
                      {verse.text}
                    </p>
                    
                    {/* Show annotation indicators */}
                    {verseAnnotations.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        {verseAnnotations.map((annotation) => (
                          <div key={annotation.id} className="flex items-start space-x-2">
                            <StickyNote className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 mb-1">Your Note:</p>
                              <p className="text-sm text-blue-700">{annotation.note}</p>
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
        <div className="flex items-center justify-between pt-8 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => handleNavigation("prev")}
            disabled={chapterData.chapter <= 1}
            className="flex items-center space-x-2 h-12 px-6 bg-white border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Chapter {chapterData.chapter - 1}</span>
          </Button>

          <div className="flex space-x-3">
            <Button 
              onClick={onAddAnnotation}
              className="h-12 px-6 bg-black text-white hover:bg-gray-800"
            >
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button 
              variant="outline"
              onClick={handleAddBookmark}
              disabled={createBookmarkMutation.isPending}
              className="h-12 px-6 bg-white border-gray-300 hover:bg-gray-50"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {createBookmarkMutation.isPending ? "Saving..." : "Bookmark"}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => handleNavigation("next")}
            className="flex items-center space-x-2 h-12 px-6 bg-white border-gray-300 hover:bg-gray-50"
          >
            <span>Chapter {chapterData.chapter + 1}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
