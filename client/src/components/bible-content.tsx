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
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Chapter Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              {chapterData.book} {chapterData.chapter}
            </h1>
            <div className="w-3 h-3 bg-primary rounded-full"></div>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            New International Version
          </p>
        </div>

        {/* Bible Text */}
        <div className="space-y-6 mb-16">
          {chapterData.verses.map((verse) => {
            const verseAnnotations = annotationsByVerse[verse.number] || [];
            
            return (
              <div key={verse.number} className="group relative">
                <div className="flex items-start space-x-4 p-6 rounded-2xl border border-border/50 bg-card/30 hover:bg-card/60 hover:shadow-sm transition-all duration-300">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {verse.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p 
                      className="text-foreground leading-relaxed text-lg font-medium"
                      data-verse={verse.number}
                      style={{ lineHeight: 1.8 }}
                    >
                      <span className="select-text">
                        {verse.text}
                      </span>
                    </p>
                    
                    {/* Show annotation indicators */}
                    {verseAnnotations.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {verseAnnotations.map((annotation) => (
                          <Badge
                            key={annotation.id}
                            variant="secondary"
                            className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            <StickyNote className="h-3 w-3 mr-1" />
                            Annotation
                          </Badge>
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
        <div className="flex items-center justify-between pt-12 border-t border-border">
          <Button
            variant="outline"
            onClick={() => handleNavigation("prev")}
            disabled={chapterData.chapter <= 1}
            className="flex items-center space-x-2 h-12 px-6 bg-card hover:bg-muted border-border"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">
              {chapterData.book} {chapterData.chapter - 1}
            </span>
          </Button>

          <div className="flex space-x-3">
            <Button 
              onClick={onAddAnnotation}
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <StickyNote className="h-4 w-4 mr-2" />
              Add Annotation
            </Button>
            <Button 
              variant="outline"
              onClick={handleAddBookmark}
              disabled={createBookmarkMutation.isPending}
              className="h-12 px-6 bg-card hover:bg-muted border-border font-medium"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {createBookmarkMutation.isPending ? "Saving..." : "Bookmark"}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => handleNavigation("next")}
            className="flex items-center space-x-2 h-12 px-6 bg-card hover:bg-muted border-border"
          >
            <span className="font-medium">
              {chapterData.book} {chapterData.chapter + 1}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
