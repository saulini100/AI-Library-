import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { 
  X, 
  Search, 
  Bookmark, 
  BookOpen, 
  StickyNote, 
  Bot,
  Edit,
  Trash2,
  Copy
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentChapter: number;
}

export default function Sidebar({ isOpen, onClose, currentBook, currentChapter }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch Bible books
  const { data: books } = useQuery({
    queryKey: ["/api/bible/books"],
  });

  // Fetch annotations
  const { data: annotations } = useQuery({
    queryKey: ["/api/annotations"],
  });

  // Fetch bookmarks
  const { data: bookmarks } = useQuery({
    queryKey: ["/api/bookmarks"],
  });

  // Fetch reading progress
  const { data: readingProgress } = useQuery({
    queryKey: ["/api/reading-progress"],
  });

  // Search Bible
  const { data: searchResults } = useQuery({
    queryKey: ["/api/bible/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  // Delete annotation mutation
  const deleteAnnotationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/annotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
    },
  });

  // Delete bookmark mutation
  const deleteBookmarkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bookmarks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
  });

  // Update reading progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { book: string; chapter: number; completed: number }) => {
      await apiRequest("POST", "/api/reading-progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-progress"] });
    },
  });

  const handleNavigation = (book: string, chapter: number) => {
    setLocation(`/bible/${book}/${chapter}`);
  };

  const handleAiRequest = async (type: "explain" | "cross-references" | "historical-context") => {
    setIsAiLoading(true);
    try {
      const response = await apiRequest("POST", `/api/ai/${type}`, {
        text: `Sample text from ${currentBook} ${currentChapter}`,
        book: currentBook,
        chapter: currentChapter,
        verse: 1
      });
      const data = await response.json();
      
      if (type === "explain") {
        setAiResponse(data.explanation || "No explanation available");
      } else if (type === "cross-references") {
        const refs = data.crossReferences?.map((ref: any) => 
          `${ref.reference}: ${ref.text} (${ref.connection})`
        ).join("\n\n") || "No cross-references found";
        setAiResponse(refs);
      } else if (type === "historical-context") {
        setAiResponse(data.historicalPeriod + "\n\n" + data.culturalContext || "No historical context available");
      }
    } catch (error) {
      setAiResponse("Failed to get AI response. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const progressCompleted = readingProgress?.filter((p: any) => p.completed === 1).length || 0;
  const progressTotal = readingProgress?.length || 1;
  const progressPercentage = Math.round((progressCompleted / progressTotal) * 100);

  return (
    <>
      {/* Sidebar */}
      <div className={`
        w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        flex flex-col transition-all duration-300 transform z-50 h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:relative shadow-lg lg:shadow-none
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Scripture Studio
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="study" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-6 mt-6 bg-sidebar-accent">
              <TabsTrigger value="study" className="text-xs text-sidebar-foreground data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                <BookOpen className="h-4 w-4 mr-1" />
                Study
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs text-sidebar-foreground data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                <StickyNote className="h-4 w-4 mr-1" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs text-sidebar-foreground data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                <Bot className="h-4 w-4 mr-1" />
                AI
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Study Tab */}
              <TabsContent value="study" className="h-full m-0">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    {/* Navigation Widget */}
                    <Card className="bg-sidebar-accent border-sidebar-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm text-sidebar-foreground font-medium">Quick Navigation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select 
                          value={currentBook} 
                          onValueChange={(book) => handleNavigation(book, 1)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {books?.map((book: any) => (
                              <SelectItem key={book.name} value={book.name}>
                                {book.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            placeholder="Chapter"
                            value={currentChapter}
                            onChange={(e) => {
                              const chapter = parseInt(e.target.value);
                              if (chapter > 0) {
                                handleNavigation(currentBook, chapter);
                              }
                            }}
                            className="flex-1"
                            min="1"
                          />
                          <Input
                            type="number"
                            placeholder="Verse"
                            className="flex-1"
                            min="1"
                          />
                        </div>
                        <Button 
                          className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                          onClick={() => handleNavigation(currentBook, currentChapter)}
                        >
                          Go to Verse
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Search Widget */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Search</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative mb-3">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search verses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                        {searchResults && searchResults.length > 0 && (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {searchResults.map((result: any, index: number) => (
                              <div
                                key={index}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                                onClick={() => handleNavigation(result.book, result.chapter)}
                              >
                                <div className="font-medium text-sm">
                                  {result.book} {result.chapter}:{result.verse}
                                </div>
                                <div className="text-gray-600 dark:text-gray-300 text-xs truncate">
                                  {result.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Bookmarks Widget */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Bookmarks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {bookmarks?.map((bookmark: any) => (
                            <div
                              key={bookmark.id}
                              className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                              onClick={() => handleNavigation(bookmark.book, bookmark.chapter)}
                            >
                              <div>
                                <div className="font-medium text-sm">
                                  {bookmark.book} {bookmark.chapter}
                                  {bookmark.verse && `:${bookmark.verse}`}
                                </div>
                                {bookmark.title && (
                                  <div className="text-xs text-gray-600 dark:text-gray-300">
                                    {bookmark.title}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                <Bookmark className="h-4 w-4 text-amber-500" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteBookmarkMutation.mutate(bookmark.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {(!bookmarks || bookmarks.length === 0) && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No bookmarks yet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reading Plan Widget */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Today's Reading</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {readingProgress?.slice(0, 3).map((progress: any) => (
                            <div key={progress.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={progress.completed === 1}
                                onCheckedChange={(checked) => {
                                  updateProgressMutation.mutate({
                                    book: progress.book,
                                    chapter: progress.chapter,
                                    completed: checked ? 1 : 0
                                  });
                                }}
                              />
                              <span 
                                className={`text-sm cursor-pointer ${
                                  progress.completed === 1 
                                    ? 'line-through text-gray-600 dark:text-gray-300' 
                                    : ''
                                }`}
                                onClick={() => handleNavigation(progress.book, progress.chapter)}
                              >
                                {progress.book} {progress.chapter}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Progress: {progressCompleted} of {progressTotal} completed
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {annotations?.map((annotation: any) => (
                      <Card key={annotation.id} className="border-l-4 border-l-amber-500">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {annotation.book} {annotation.chapter}:{annotation.verse}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(annotation.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {annotation.note}
                          </p>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs hover:text-red-500"
                              onClick={() => deleteAnnotationMutation.mutate(annotation.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(!annotations || annotations.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No annotations yet. Select text in the Bible to add notes.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">AI Study Assistant</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAiRequest("explain")}
                          disabled={isAiLoading}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Explain this passage</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Get contextual explanation
                            </div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAiRequest("historical-context")}
                          disabled={isAiLoading}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Historical context</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Learn about the background
                            </div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAiRequest("cross-references")}
                          disabled={isAiLoading}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Cross references</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Find related verses
                            </div>
                          </div>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">AI Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 border min-h-32">
                          {isAiLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                AI is thinking...
                              </span>
                            </div>
                          ) : aiResponse ? (
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {aiResponse}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Click one of the buttons above to get AI assistance
                            </div>
                          )}
                        </div>
                        {aiResponse && !isAiLoading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 h-6 px-2 text-xs"
                            onClick={() => navigator.clipboard.writeText(aiResponse)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy response
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
