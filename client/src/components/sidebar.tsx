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
  Home,
  BarChart3,
  Table,
  CreditCard,
  Headphones,
  Code,
  Bell,
  UserCircle,
  LogIn,
  UserPlus
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-sm ml-0.5"></div>
            </div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">
              Document Reader
            </h2>
          </div>
        </div>

        {/* Main Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {/* Home Button */}
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 rounded-md hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
              >
                <Home className="w-4 h-4 mr-3" />
                Document Library
              </button>
            )}

            {/* Chapter Navigation */}
            <div className="space-y-3 mt-4">
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Chapter"
                  value={chapterInput}
                  onChange={(e) => setChapterInput(e.target.value)}
                  className="flex-1 h-8 text-xs"
                  min="1"
                  max={totalChapters || 999}
                />
                <Button size="sm" onClick={goToChapter} className="px-3 h-8 text-xs">
                  Go
                </Button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3">
                Chapter {currentChapter} / {totalChapters || '?'}
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChapterSelect?.(Math.max(1, currentChapter - 1))}
                  disabled={currentChapter <= 1}
                  className="flex-1 h-8 text-xs"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChapterSelect?.(currentChapter + 1)}
                  disabled={currentChapter >= (totalChapters || 999)}
                  className="flex-1 h-8 text-xs"
                >
                  Next
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Document Search */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <Input
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* Reading Stats */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{currentChapter}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Current</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <StickyNote className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {Array.isArray(annotations) ? annotations.length : 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Notes</div>
              </div>
            </div>

            {/* Bookmarks Section */}
            <div className="mt-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Quick Access
              </div>
              <div className="space-y-1">
                <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                  <Bookmark className="w-4 h-4 mr-3" />
                  Bookmarks
                </button>

                <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                  <StickyNote className="w-4 h-4 mr-3" />
                  My Notes
                </button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}