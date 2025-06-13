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
                Dashboard
              </button>
            )}

            {/* Navigation Items */}
            <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
              <Table className="w-4 h-4 mr-3" />
              Tables
            </button>

            <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
              <CreditCard className="w-4 h-4 mr-3" />
              Billing
            </button>

            <button 
              onClick={() => toggleSection('navigation')}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-3" />
              Navigation
            </button>

            {activeSection === 'navigation' && (
              <div className="ml-7 space-y-2 mt-2">
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
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Chapter {currentChapter} / {totalChapters || '?'}
                </div>
              </div>
            )}

            <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
              <Code className="w-4 h-4 mr-3" />
              RTL
            </button>

            <button 
              onClick={() => toggleSection('search')}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <Bell className="w-4 h-4 mr-3" />
              Search
            </button>

            {activeSection === 'search' && (
              <div className="ml-7 mt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <Input
                    placeholder="Search text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Account Pages Section */}
          <div className="px-3 py-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Account Pages
            </div>
            <div className="space-y-1">
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                <UserCircle className="w-4 h-4 mr-3" />
                Profile
              </button>

              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                <LogIn className="w-4 h-4 mr-3" />
                Sign In
              </button>

              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                <UserPlus className="w-4 h-4 mr-3" />
                Sign Up
              </button>
            </div>
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button variant="outline" className="w-full justify-center text-sm">
            Documentation
          </Button>
          <Button className="w-full justify-center text-sm bg-gray-800 hover:bg-gray-900 text-white">
            Upgrade to pro
          </Button>
        </div>
      </div>
    </div>
  );
}