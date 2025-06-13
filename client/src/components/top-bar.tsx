import { Button } from "@/components/ui/button";
import { Menu, Play, Pause, Sun, Moon, Type } from "lucide-react";

interface TopBarProps {
  book: string;
  chapter: number;
  onToggleSidebar: () => void;
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
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onToggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {book} {chapter}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              New International Version
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Audio Controls */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePlayback}
              className="p-1 h-8 w-8"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-primary" />
              ) : (
                <Play className="h-4 w-4 text-primary" />
              )}
            </Button>
            
            {isPlaying && (
              <div className="flex items-center space-x-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
            
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleDarkMode}
              className="p-2"
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
