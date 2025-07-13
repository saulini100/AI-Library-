import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Hand,
  RefreshCw,
  ArrowUp,
  Vibrate,
  MousePointer
} from 'lucide-react';

interface MobileSwipeNavigationProps {
  currentChapter: number;
  totalChapters: number;
  onChapterChange: (chapter: number) => void;
  className?: string;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

export default function MobileSwipeNavigation({
  currentChapter,
  totalChapters,
  onChapterChange,
  className = ''
}: MobileSwipeNavigationProps) {
  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    direction: null
  });
  
  const [gestureRecognized, setGestureRecognized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState<'light' | 'medium' | 'heavy' | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<string>('');
  const navigationRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<HTMLDivElement>(null);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: true,
      direction: null
    });
    
    // Add touch press animation
    if (touchRef.current) {
      touchRef.current.classList.add('touch-press');
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    
    // Determine primary direction
    let direction: TouchState['direction'] = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    setTouchState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction
    }));

    // Visual feedback during swipe
    if (navigationRef.current && Math.abs(deltaX) > 50) {
      const translateX = Math.max(-100, Math.min(100, deltaX / 3));
      navigationRef.current.style.transform = `translateX(${translateX}px)`;
      navigationRef.current.style.opacity = `${1 - Math.abs(translateX) / 200}`;
    }
  }, [touchState]);

  const handleTouchEnd = useCallback(() => {
    const deltaX = touchState.currentX - touchState.startX;
    const deltaY = touchState.currentY - touchState.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Reset visual state
    if (navigationRef.current) {
      navigationRef.current.style.transform = '';
      navigationRef.current.style.opacity = '';
    }
    
    if (touchRef.current) {
      touchRef.current.classList.remove('touch-press');
    }

    // Detect swipe gestures (minimum 80px movement)
    if (absDeltaX > 80 || absDeltaY > 80) {
      setGestureRecognized(true);
      
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          // Swipe right - previous chapter
          if (currentChapter > 1) {
            setSwipeDirection('swipe-right');
            setHapticFeedback('medium');
            setTimeout(() => onChapterChange(currentChapter - 1), 150);
          }
        } else {
          // Swipe left - next chapter
          if (currentChapter < totalChapters) {
            setSwipeDirection('swipe-left');
            setHapticFeedback('medium');
            setTimeout(() => onChapterChange(currentChapter + 1), 150);
          }
        }
      } else {
        // Vertical swipe
        if (deltaY < 0 && absDeltaY > 120) {
          // Swipe up - refresh
          handleRefresh();
        }
      }
      
      setTimeout(() => {
        setGestureRecognized(false);
        setSwipeDirection('');
      }, 800);
    }
    
    // Reset touch state
    setTouchState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      direction: null
    });
  }, [touchState, currentChapter, totalChapters, onChapterChange]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setHapticFeedback('heavy');
    
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsRefreshing(false);
  }, []);

  const simulateHaptic = useCallback((type: 'light' | 'medium' | 'heavy') => {
    setHapticFeedback(type);
    
    // Try native haptic feedback if available
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20, 10, 20],
        heavy: [30, 10, 30, 10, 30]
      };
      navigator.vibrate(patterns[type]);
    }
    
    setTimeout(() => setHapticFeedback(null), 300);
  }, []);

  // Clear haptic feedback
  useEffect(() => {
    if (hapticFeedback) {
      const timer = setTimeout(() => setHapticFeedback(null), 300);
      return () => clearTimeout(timer);
    }
  }, [hapticFeedback]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Gesture Tutorial */}
      <Card className="mobile-optimized pull-to-refresh">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mobile-stagger-1">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-sm">Touch Navigation</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 mobile-stagger-2">
                <ArrowLeft className="w-4 h-4 text-green-500" />
                <span>Swipe left: Next chapter</span>
              </div>
              <div className="flex items-center gap-2 mobile-stagger-3">
                <ArrowRight className="w-4 h-4 text-blue-500" />
                <span>Swipe right: Previous</span>
              </div>
              <div className="flex items-center gap-2 mobile-stagger-4">
                <ArrowUp className="w-4 h-4 text-purple-500" />
                <span>Swipe up: Refresh</span>
              </div>
              <div className="flex items-center gap-2 mobile-stagger-5">
                <Hand className="w-4 h-4 text-orange-500" />
                <span>Long press: Menu</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Touch Area */}
      <Card 
        ref={navigationRef}
        className={`mobile-enhanced-touch touch-ripple cursor-pointer transition-all duration-300 ${
          gestureRecognized ? 'gesture-recognized' : ''
        } ${swipeDirection} ${
          hapticFeedback ? `haptic-${hapticFeedback}` : ''
        }`}
      >
        <CardContent 
          ref={touchRef}
          className="p-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="text-center space-y-4">
            {/* Current Chapter Display */}
            <div className="space-y-2 mobile-stagger-1">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                Chapter {currentChapter}
              </div>
              <div className="text-sm text-muted-foreground">
                of {totalChapters} chapters
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentChapter / totalChapters) * 100}%` }}
                />
              </div>
            </div>

            {/* Gesture Indicator */}
            <div className={`text-lg mobile-stagger-2 ${
              touchState.isDragging ? 'touch-hover' : ''
            }`}>
              {touchState.isDragging ? (
                <div className="flex items-center justify-center gap-2">
                  <MousePointer className="w-5 h-5 text-blue-500 animate-pulse" />
                  <span className="text-sm">
                    {touchState.direction === 'left' && 'Swipe left to continue →'}
                    {touchState.direction === 'right' && '← Swipe right to go back'}
                    {touchState.direction === 'up' && '↑ Swipe up to refresh'}
                    {touchState.direction === 'down' && '↓ Pull down'}
                    {!touchState.direction && 'Gesture detected...'}
                  </span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  Touch and swipe to navigate
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mobile-stagger-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  simulateHaptic('light');
                  onChapterChange(Math.max(1, currentChapter - 1));
                }}
                disabled={currentChapter <= 1}
                className="mobile-enhanced-touch touch-ripple"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <Badge 
                variant="outline" 
                className="mobile-enhanced-touch touch-target"
              >
                {Math.round((currentChapter / totalChapters) * 100)}% complete
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  simulateHaptic('light');
                  onChapterChange(Math.min(totalChapters, currentChapter + 1));
                }}
                disabled={currentChapter >= totalChapters}
                className="mobile-enhanced-touch touch-ripple"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Indicator */}
      {isRefreshing && (
        <Card className="refresh-complete mobile-stagger-4">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-500 refresh-spinner" />
              <span className="text-sm font-medium">Refreshing content...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Haptic Feedback Indicator */}
      {hapticFeedback && (
        <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 mobile-stagger-5">
          <CardContent className="p-2 px-4 bg-gray-900/90 text-white rounded-full">
            <div className="flex items-center gap-2 text-xs">
              <Vibrate className="w-3 h-3" />
              <span className="capitalize">{hapticFeedback} haptic feedback</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gesture Recognition Feedback */}
      {gestureRecognized && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 border-4 border-green-500 rounded-full gesture-trail" />
          </div>
        </div>
      )}

      {/* Touch Tutorial Overlay */}
      <Card className="mobile-stagger-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <button
              onClick={() => simulateHaptic('light')}
              className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg touch-ripple mobile-enhanced-touch"
            >
              <div className="w-6 h-6 mx-auto mb-1 bg-blue-200 dark:bg-blue-700 rounded-full haptic-light" />
              <div>Light</div>
            </button>
            <button
              onClick={() => simulateHaptic('medium')}
              className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg touch-ripple mobile-enhanced-touch"
            >
              <div className="w-6 h-6 mx-auto mb-1 bg-green-200 dark:bg-green-700 rounded-full haptic-medium" />
              <div>Medium</div>
            </button>
            <button
              onClick={() => simulateHaptic('heavy')}
              className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg touch-ripple mobile-enhanced-touch"
            >
              <div className="w-6 h-6 mx-auto mb-1 bg-purple-200 dark:bg-purple-700 rounded-full haptic-heavy" />
              <div>Heavy</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 