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
    <main className="flex-1 overflow-auto bg-white dark:bg-slate-800 px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Chapter Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {chapterData.book} {chapterData.chapter}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">New International Version</p>
        </div>

        {/* Bible Text */}
        <div className="space-y-4 mb-12">
          {chapterData.verses.map((verse) => {
            const verseAnnotations = annotationsByVerse[verse.number] || [];
            
            return (
              <div key={verse.number} className="group relative">
                <p 
                  className="text-gray-900 dark:text-gray-100 leading-relaxed text-lg"
                  data-verse={verse.number}
                  style={{ lineHeight: 1.7 }}
                >
                  <span className="text-xs text-gray-400 font-medium mr-2 align-super">
                    {verse.number}
                  </span>
                  <span className="select-text">
                    {verse.text}
                  </span>
                </p>
                
                {/* Show annotation indicators */}
                {verseAnnotations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {verseAnnotations.map((annotation) => (
                      <Badge
                        key={annotation.id}
                        variant="secondary"
                        className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      >
                        <StickyNote className="h-3 w-3 mr-1" />
                        Note
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-200 dark:border-slate-600">
          <Button
            variant="ghost"
            onClick={() => handleNavigation("prev")}
            disabled={chapterData.chapter <= 1}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>
              {chapterData.book} {chapterData.chapter - 1}
            </span>
          </Button>

          <div className="flex space-x-2">
            <Button onClick={onAddAnnotation}>
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button 
              variant="secondary"
              onClick={handleAddBookmark}
              disabled={createBookmarkMutation.isPending}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmark
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => handleNavigation("next")}
            className="flex items-center space-x-2"
          >
            <span>
              {chapterData.book} {chapterData.chapter + 1}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
