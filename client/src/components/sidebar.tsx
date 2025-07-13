import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  Bot,
  Target,
  Clock,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Link from 'next/link';

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
  const [location, navigate] = useLocation();
  const [isHovered, setIsHovered] = useState(false);

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

  const sidebarItems = [
    {
      label: 'Home',
      icon: Home,
      action: () => onGoHome && onGoHome(),
      active: false
    },
    {
      label: 'Reading Progress',
      icon: Activity,
      action: () => toggleSection('readingProgress'),
      active: activeSection === 'readingProgress'
    },
    {
      label: 'Quick Navigation',
      icon: ChevronDown,
      action: () => toggleSection('navigation'),
      active: activeSection === 'navigation'
    },
    {
      label: 'Dashboard',
      icon: BarChart3,
      action: () => navigate('/performance'),
      active: false
    },
    {
      label: 'AI Agents',
      icon: Bot,
      action: () => navigate('/agents'),
      active: false
    },
    {
      label: 'Document Search',
      icon: Search,
      action: () => toggleSection('search'),
      active: activeSection === 'search'
    }
  ];

  const renderTabContent = () => {
    switch (activeSection) {
      case 'readingProgress':
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Reading Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="p-2 rounded-full bg-primary/10 mx-auto w-12 h-12 flex items-center justify-center mb-2">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{currentChapter}</p>
                  <p className="text-xs text-muted-foreground">Chapters Read</p>
                </div>
                <div className="text-center">
                  <div className="p-2 rounded-full bg-secondary/10 mx-auto w-12 h-12 flex items-center justify-center mb-2">
                    <StickyNote className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    {Array.isArray(annotations) ? annotations.length : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Notes</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round((currentChapter / (totalChapters || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentChapter / (totalChapters || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'navigation':
        return (
          <Collapsible open={activeSection === 'navigation'} onOpenChange={() => toggleSection('navigation')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Quick Navigation</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === 'navigation' ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Chapter"
                  value={chapterInput}
                  onChange={(e) => setChapterInput(e.target.value)}
                  className="flex-1"
                  min="1"
                  max={totalChapters || 999}
                />
                <Button size="sm" onClick={goToChapter}>
                  Go
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChapterSelect?.(Math.max(1, currentChapter - 1))}
                  disabled={currentChapter <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  {currentChapter} / {totalChapters || '?'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChapterSelect?.(currentChapter + 1)}
                  disabled={currentChapter >= (totalChapters || 999)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      case 'search':
        return (
          <Collapsible open={activeSection === 'search'} onOpenChange={() => toggleSection('search')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Document Search</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === 'search' ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search verses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-lg transform transition-transform duration-300 ease-in-out overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <Library className="w-4 h-4 text-white dark:text-black" />
              </div>
              <Link href="/" className="flex items-center gap-2 px-4">
                <Bot className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Library Companion</h2>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Section */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Hello, Reader</h3>
                <p className="text-xs text-muted-foreground">Continue your study journey</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-6">
              {/* Home Button */}
              {onGoHome && (
                <Button
                  onClick={onGoHome}
                  className="w-full justify-start"
                >
                  <Home className="w-4 h-4 mr-3" />
                  Back to Library
                </Button>
              )}

              {/* Reading Progress */}
              {renderTabContent()}

              {/* Quick Navigation */}
              {renderTabContent()}

              {/* Dashboard Section */}
              {renderTabContent()}

              {/* Document Search */}
              {renderTabContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}