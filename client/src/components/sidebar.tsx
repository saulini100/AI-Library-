import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  X, 
  Search, 
  Bookmark, 
  StickyNote, 
  Bot,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchBibleBooks, searchBible, getAiExplanation } from '@/lib/bible-api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentChapter: number;
}

export default function Sidebar({ isOpen, onClose, currentBook, currentChapter }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [chapterInput, setChapterInput] = useState(currentChapter.toString());

  const { data: books = [] } = useQuery({
    queryKey: ['/api/bible/books'],
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/bible/search', searchQuery],
    enabled: searchQuery.length > 2,
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ['/api/annotations'],
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['/api/bookmarks'],
  });

  const handleNavigation = (book: string, chapter: number) => {
    window.location.hash = `${book}/${chapter}`;
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    
    try {
      await getAiExplanation({
        book: currentBook,
        chapter: currentChapter,
        verse: null,
        question: aiQuery
      });
      setAiQuery('');
    } catch (error) {
      console.error('AI query failed:', error);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`
        w-80 bg-white border-r border-gray-200
        flex flex-col transition-all duration-300 transform z-50 h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:relative
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              Scripture
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Hello, Reader</p>
              <p className="text-xs text-gray-500">Continue your study journey</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="study" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-6 mt-6 bg-gray-100">
              <TabsTrigger value="study" className="text-xs">Study</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Study Tab */}
              <TabsContent value="study" className="h-full m-0">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-6 py-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">23</p>
                            <p className="text-xs text-gray-500">Chapters Read</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <StickyNote className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{annotations.length}</p>
                            <p className="text-xs text-gray-500">Notes</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Navigation */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium">Quick Navigation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Select value={currentBook} onValueChange={(book) => handleNavigation(book, 1)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select book" />
                          </SelectTrigger>
                          <SelectContent>
                            {books.map((book: any) => (
                              <SelectItem key={book.name} value={book.name}>
                                {book.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Chapter"
                            value={chapterInput}
                            onChange={(e) => setChapterInput(e.target.value)}
                            className="flex-1"
                            type="number"
                            min="1"
                          />
                          <Button 
                            onClick={() => handleNavigation(currentBook, parseInt(chapterInput) || 1)}
                            className="bg-black text-white hover:bg-gray-800"
                          >
                            Go
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Search */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium">Scripture Search</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search verses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {searchResults.length > 0 && (
                          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                            {searchResults.slice(0, 5).map((result: any, index: number) => (
                              <div
                                key={index}
                                className="p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleNavigation(result.book, result.chapter)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-900">
                                    {result.book} {result.chapter}:{result.verse}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {result.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="h-full m-0">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-4 py-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Recent Notes</h3>
                      <Badge variant="secondary">{annotations.length}</Badge>
                    </div>
                    
                    {annotations.length > 0 ? (
                      <div className="space-y-3">
                        {annotations.slice(0, 10).map((annotation: any) => (
                          <Card key={annotation.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-medium text-gray-900">
                                {annotation.book} {annotation.chapter}:{annotation.verse}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Note
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {annotation.note}
                            </p>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-sm text-gray-500">No notes yet</p>
                        <p className="text-xs text-gray-400">Start highlighting text to add notes</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-medium mb-3">Bookmarks</h3>
                      {bookmarks.length > 0 ? (
                        <div className="space-y-2">
                          {bookmarks.slice(0, 5).map((bookmark: any) => (
                            <div
                              key={bookmark.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                              onClick={() => handleNavigation(bookmark.book, bookmark.chapter)}
                            >
                              <div className="flex items-center space-x-3">
                                <Bookmark className="h-4 w-4 text-blue-500" />
                                <span className="text-sm text-gray-900">
                                  {bookmark.book} {bookmark.chapter}:{bookmark.verse}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No bookmarks yet</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai" className="h-full m-0">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-4 py-6">
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium flex items-center space-x-2">
                          <Bot className="h-4 w-4" />
                          <span>AI Study Assistant</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Input
                            placeholder="Ask about this passage..."
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
                          />
                          <Button 
                            onClick={handleAiQuery}
                            className="w-full bg-black text-white hover:bg-gray-800"
                            disabled={!aiQuery.trim()}
                          >
                            Ask AI
                          </Button>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          <p className="mb-2">Currently reading:</p>
                          <p className="font-medium text-gray-900">{currentBook} Chapter {currentChapter}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium">Quick Questions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[
                            'What is the main theme of this chapter?',
                            'How does this relate to other scriptures?',
                            'What is the historical context?',
                            'What can I learn from this passage?'
                          ].map((question, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-2 px-3"
                              onClick={() => setAiQuery(question)}
                            >
                              {question}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}