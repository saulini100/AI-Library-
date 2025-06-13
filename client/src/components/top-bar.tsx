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
    <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-xl font-semibold text-foreground">
                {book} {chapter}
              </span>
            </div>
            <div className="hidden sm:flex items-center">
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                NIV
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Audio Controls */}
          <div className="flex items-center space-x-3 bg-muted/50 border border-border rounded-xl px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePlayback}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-primary" />
              ) : (
                <Play className="h-4 w-4 text-primary" />
              )}
            </Button>
            
            {isPlaying && (
              <div className="flex items-center space-x-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 12 + 6}px`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleDarkMode}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
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
