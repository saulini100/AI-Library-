import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home,
  Library,
  BookOpen,
  Search, 
  Settings,
  User,
  Clock,
  Target,
  TrendingUp,
  Bot,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  BarChart3,
  Bookmark
} from "lucide-react";
import { useLocation } from "wouter";
import { getBookmarks } from "@/lib/storage";

interface SidebarNewProps {
  isOpen?: boolean;
  onToggle?: () => void;
  currentPage?: string;
  documentId?: string | number;
  currentChapter?: number;
  totalChapters?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  section?: string;
  active?: boolean;
}

export default function SidebarNew({ 
  isOpen = true, 
  onToggle,
  currentPage = "reader",
  documentId,
  currentChapter = 1,
  totalChapters = 1
}: SidebarNewProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [, setLocation] = useLocation();

  // Always show sidebar, start collapsed
  useEffect(() => {
    setCollapsed(true);
    setAutoExpanded(true);
  }, []);

  // Load bookmark count
  useEffect(() => {
    const bookmarks = getBookmarks();
    setBookmarkCount(bookmarks.length);
  }, []);

  // Expand on hover with smooth animations
  const handleSidebarMouseEnter = () => {
    setHoveredItem('sidebar');
    setCollapsed(false);
  };

  const handleSidebarMouseLeave = () => {
    setHoveredItem(null);
    setCollapsed(true);
  };

  const navigationItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="w-6 h-6" />,
      href: "/",
      section: "main"
    },
    {
      id: "library",
      label: "Library",
      icon: <Library className="w-6 h-6" />,
      href: "/library",
      section: "main",
      active: currentPage === "library"
    },
    {
      id: "reader",
      label: "Reader",
      icon: <BookOpen className="w-6 h-6" />,
      section: "main",
      active: currentPage === "reader",
      badge: documentId ? `${currentChapter}/${totalChapters}` : undefined
    },
    {
      id: "search",
      label: "Search",
      icon: <Search className="w-6 h-6" />,
      href: "/search",
      section: "main"
    },
    {
      id: "bookmarks",
      label: "Bookmarks",
      icon: <Bookmark className="w-6 h-6" />,
      href: "/bookmarks",
      section: "main",
      badge: bookmarkCount > 0 ? bookmarkCount.toString() : undefined
    },

    {
      id: "reading-progress",
      label: "Progress",
      icon: <TrendingUp className="w-6 h-6" />,
      section: "analytics"
    },
    {
      id: "performance",
      label: "Analytics",
      icon: <BarChart3 className="w-6 h-6" />,
      href: "/performance",
      section: "analytics"
    },

    {
      id: "ai-chat",
      label: "AI Chat",
      icon: <MessageSquare className="w-6 h-6" />,
      href: "/agents",
      section: "ai",
      badge: "New"
    },
    {
      id: "ai-assistant",
      label: "Assistant",
      icon: <Bot className="w-6 h-6" />,
      href: "/agents",
      section: "ai"
    },

  ];

  const settingsItems: NavItem[] = [
    {
      id: "preferences",
      label: "Settings",
      icon: <Settings className="w-6 h-6" />,
      href: "/settings",
      section: "settings"
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User className="w-6 h-6" />,
      section: "settings"
    }
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      setLocation(item.href);
      // Refresh bookmark count when navigating to bookmarks
      if (item.href === '/bookmarks') {
        const bookmarks = getBookmarks();
        setBookmarkCount(bookmarks.length);
      }
    }
    if (item.onClick) {
      item.onClick();
    }
  };

  const renderNavItem = (item: NavItem) => (
    <div
      key={item.id}
      className="relative group"
      onMouseEnter={() => setHoveredItem(item.id)}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <Button
        variant={item.active ? "default" : "ghost"}
        className={`
          w-full h-11 px-3 transition-all duration-300 ease-out
          ${collapsed ? 'justify-center px-2' : 'justify-start gap-3'}
          ${item.active 
            ? 'bg-primary text-primary-foreground shadow-md scale-[1.02] ring-1 ring-primary/20' 
            : 'hover:bg-muted/60 hover:shadow-sm hover:translate-x-1'}
          group-hover:shadow-lg transform-gpu
          rounded-lg
        `}
        onClick={() => handleNavClick(item)}
      >
        <div className={`
          flex items-center justify-center transition-all duration-200 ease-out
          ${item.active ? 'scale-110' : 'group-hover:scale-110'}
          ${collapsed ? 'w-5 h-5' : 'w-5 h-5'}
        `}>
          {item.icon}
        </div>
        
        <div className={`
          flex-1 flex items-center justify-between overflow-hidden transition-all duration-300 ease-out
          ${collapsed ? 'w-0 opacity-0 translate-x-2' : 'w-full opacity-100 translate-x-0'}
        `}>
          <span className="font-medium text-sm truncate">
            {item.label}
          </span>
          {item.badge && (
            <Badge 
              variant={item.active ? "secondary" : "outline"} 
              className={`
                ml-2 text-xs px-1.5 py-0.5 transition-all duration-200
                ${item.badge === "New" ? "bg-green-100 text-green-700 border-green-200" : ""}
                ${item.badge === "AI" ? "bg-blue-100 text-blue-700 border-blue-200" : ""}
                ${item.badge === "Pro" ? "bg-purple-100 text-purple-700 border-purple-200" : ""}
                hover:scale-105
              `}
            >
              {item.badge}
            </Badge>
          )}
        </div>
      </Button>

      {/* Tooltip for collapsed state */}
      {collapsed && hoveredItem === item.id && (
        <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 z-50 animate-in slide-in-from-left-4 zoom-in-95 duration-300">
          <div className="bg-popover text-popover-foreground px-4 py-3 rounded-lg shadow-2xl border text-sm whitespace-nowrap backdrop-blur-lg">
            <div className="font-medium">{item.label}</div>
            {item.badge && (
              <Badge variant="outline" className="mt-1 text-xs animate-in scale-in-50 duration-200 delay-100">
                {item.badge}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const groupedItems = navigationItems.reduce((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const sectionLabels = {
    main: "Navigation",
    analytics: "Analytics",
    ai: "AI Tools",
    settings: "Settings"
  };

     // Always show the sidebar

  return (
    <>
      {/* Backdrop - only for mobile */}
      <div 
        className={`
          fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onToggle}
      />

             {/* Sidebar */}
       <div 
         className={`
           fixed left-0 top-0 h-full bg-background/95 backdrop-blur-sm border-r border-border/50 z-50
           transition-all duration-300 ease-out shadow-lg
           ${collapsed ? 'w-16 hover:w-72' : 'w-72'}
           translate-x-0
           group
         `}
         onMouseEnter={handleSidebarMouseEnter}
         onMouseLeave={handleSidebarMouseLeave}
      >
        {/* Header */}
         <div className="flex items-center justify-between p-4 border-b border-border/50 h-14">
           <div className="flex items-center gap-3">
             <div className="p-1.5 bg-primary rounded-lg shadow-sm">
               <BookOpen className="w-4 h-4 text-primary-foreground" />
             </div>
             <div className={`
               transition-all duration-300 ease-out overflow-hidden
               ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
             `}>
               <h2 className="font-semibold text-base whitespace-nowrap">Library Companion</h2>
             </div>
           </div>
           <Button
             variant="ghost"
             size="sm"
             onClick={() => setCollapsed(!collapsed)}
             className={`
               h-8 w-8 p-0 transition-all duration-300 ease-out hover:bg-muted/60
               ${collapsed ? 'rotate-180' : 'rotate-0'}
             `}
            >
              <ChevronLeft className="w-4 h-4 transition-transform duration-300" />
           </Button>
         </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="space-y-2">
              <div className={`
                transition-all duration-300 ease-out overflow-hidden
                ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}
              `}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                  {sectionLabels[section as keyof typeof sectionLabels]}
                </h3>
              </div>
              <div className="space-y-1">
                {items.map(renderNavItem)}
              </div>
              {section !== 'settings' && (
                <div className={`
                  transition-all duration-300 ease-out
                  ${collapsed ? 'opacity-0' : 'opacity-100'}
                `}>
                  <Separator className="my-2" />
                </div>
              )}
            </div>
          ))}

          {/* Settings Section */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className={`
              transition-all duration-300 ease-out overflow-hidden
              ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}
            `}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Settings
              </h3>
            </div>
            <div className="space-y-1">
              {settingsItems.map(renderNavItem)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/50">
          <div className={`
            transition-all duration-300 ease-out overflow-hidden
            ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}
          `}>
            <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground font-medium">Reading Session Active</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {documentId && `Chapter ${currentChapter} of ${totalChapters}`}
              </div>
            </div>
          </div>
        </div>
                  
        {/* Floating Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={`
            absolute -right-3 top-4 w-6 h-6 rounded-full bg-background border shadow-md
            hover:scale-110 transition-all duration-200 lg:hidden
            ${collapsed && !autoExpanded ? 'opacity-0' : 'opacity-100'}
          `}
        >
          <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${!isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </>
  );
}