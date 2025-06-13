import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  X, 
  Search, 
  Bookmark, 
  StickyNote, 
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  FileText,
  ChevronDown,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentChapter: number;
  documentId?: number;
  totalChapters?: number;
  onChapterSelect?: (chapter: number) => void;
  onToggle?: () => void;
  onGoHome?: () => void;
}

export default function Sidebar({ isOpen, onClose, currentBook, currentChapter, documentId, totalChapters, onChapterSelect, onGoHome }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterInput, setChapterInput] = useState(currentChapter.toString());
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: annotations = [] } = useQuery({
    queryKey: ['/api/annotations'],
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['/api/bookmarks'],
  });

  const goToChapter = () => {
    const chapter = parseInt(chapterInput);
    if (chapter >= 1 && chapter <= (totalChapters || 999)) {
      onChapterSelect?.(chapter);
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white dark:text-black" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Document
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Section */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Hello, Reader</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Continue your study journey</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button className="flex-1 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm">
              Study
            </button>
            <button className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Notes
            </button>
            <button className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              AI
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Home Button */}
            {onGoHome && (
              <div>
                <Button
                  onClick={onGoHome}
                  className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Home className="w-4 h-4 mr-3" />
                  Back to Library
                </Button>
              </div>
            )}

            {/* Reading Progress */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentChapter}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Chapters Read</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                <StickyNote className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Array.isArray(annotations) ? annotations.length : 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Notes</div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div>
              <button
                onClick={() => toggleSection('navigation')}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">Quick Navigation</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'navigation' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeSection === 'navigation' && (
                <div className="mt-3 space-y-3 pl-3">
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Chapter"
                      value={chapterInput}
                      onChange={(e) => setChapterInput(e.target.value)}
                      className="flex-1 h-9"
                      min="1"
                      max={totalChapters || 999}
                    />
                    <Button size="sm" onClick={goToChapter} className="px-4 h-9 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                      Go
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onChapterSelect?.(Math.max(1, currentChapter - 1))}
                      disabled={currentChapter <= 1}
                      className="h-9"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {currentChapter} / {totalChapters || '?'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onChapterSelect?.(currentChapter + 1)}
                      disabled={currentChapter >= (totalChapters || 999)}
                      className="h-9"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Document Search */}
            <div>
              <button
                onClick={() => toggleSection('search')}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">Document Search</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'search' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeSection === 'search' && (
                <div className="mt-3 pl-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search verses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}