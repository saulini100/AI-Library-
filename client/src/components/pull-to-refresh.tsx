import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, ArrowDown, CheckCircle } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className = ''
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(distance);
      
      // Visual feedback during pull
      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(${distance}px)`;
      }
    }
  }, [isPulling, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
        setRefreshComplete(true);
        
        // Show success state briefly
        setTimeout(() => {
          setRefreshComplete(false);
        }, 1000);
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Reset state
    setPullDistance(0);
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getRefreshIcon = () => {
    if (refreshComplete) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (isRefreshing) {
      return <RefreshCw className="w-5 h-5 text-blue-500 refresh-spinner" />;
    }
    if (pullDistance >= threshold) {
      return <RefreshCw className="w-5 h-5 text-blue-500" />;
    }
    return <ArrowDown className="w-5 h-5 text-gray-400" />;
  };

  const getRefreshText = () => {
    if (refreshComplete) return 'Refresh complete!';
    if (isRefreshing) return 'Refreshing...';
    if (pullDistance >= threshold) return 'Release to refresh';
    return 'Pull down to refresh';
  };

  const refreshOpacity = Math.min(pullDistance / threshold, 1);
  const refreshScale = 0.8 + (refreshOpacity * 0.2);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden mobile-optimized ${className}`}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-300 ${
          pullDistance > 0 ? 'pull-to-refresh' : ''
        } ${refreshComplete ? 'refresh-complete' : ''}`}
        style={{
          height: `${Math.max(0, pullDistance)}px`,
          opacity: refreshOpacity,
          transform: `scale(${refreshScale})`
        }}
      >
        <div className="flex flex-col items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <div className={`transition-transform duration-300 ${
            pullDistance >= threshold ? 'rotate-180' : ''
          }`}>
            {getRefreshIcon()}
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {getRefreshText()}
          </span>
          
          {/* Progress indicator */}
          <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min((pullDistance / threshold) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        className={`transition-transform duration-300 ${
          isRefreshing ? 'scroll-momentum' : ''
        }`}
      >
        {children}
      </div>

      {/* Loading overlay */}
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          <div className="h-full bg-white/20 animate-pulse" />
        </div>
      )}
    </div>
  );
} 