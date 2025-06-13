import { Button } from "@/components/ui/button";
import { Menu, Play, Pause, Sun, Moon, Type, PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface TopBarProps {
  book: string;
  chapter: number;
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  currentTime: number;
  duration: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function TopBar({
  book,
  chapter,
  onToggleSidebar,
  sidebarOpen = true,
  isPlaying,
  onTogglePlayback,
  currentTime,
  duration,
  darkMode,
  onToggleDarkMode,
}: TopBarProps) {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={onToggleSidebar}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {book} Chapter {chapter}
            </h1>
            <p className="text-sm text-gray-500">May 10, 2023</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Audio Controls */}
          <div className="flex items-center space-x-3 bg-gray-100 rounded-lg px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePlayback}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="text-xs text-gray-500">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleDarkMode}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">R</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
