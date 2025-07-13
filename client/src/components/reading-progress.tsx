import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Target, Trophy } from 'lucide-react';

interface ReadingProgressProps {
  currentChapter: number;
  totalChapters: number;
  paragraphsRead?: number;
  totalParagraphs?: number;
  timeSpent?: number; // in minutes
  wordsRead?: number;
}

export default function ReadingProgress({
  currentChapter,
  totalChapters,
  paragraphsRead = 0,
  totalParagraphs = 100,
  timeSpent = 0,
  wordsRead = 0
}: ReadingProgressProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate reading progress
  const chapterProgress = (currentChapter / totalChapters) * 100;
  const pageProgress = (paragraphsRead / totalParagraphs) * 100;
  const readingSpeed = timeSpent > 0 ? Math.round(wordsRead / timeSpent) : 0;

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      const progress = Math.min((scrollTop / documentHeight) * 100, 100);
      
      setScrollProgress(progress);
      setIsVisible(scrollTop > 100); // Show after scrolling 100px
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Scroll Progress Bar - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Reading Progress Panel */}
      <div className={`fixed top-20 right-6 z-40 transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-72 theme-transition card-hover">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 animate-in slide-in-from-top duration-300">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Reading Progress
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              {Math.round(scrollProgress)}%
            </div>
          </div>

          {/* Chapter Progress */}
          <div className="space-y-4">
            <div className="animate-in slide-in-from-left stagger-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Chapter Progress</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentChapter} / {totalChapters}
                </span>
              </div>
              <Progress 
                value={chapterProgress} 
                className="h-2 bg-gray-200 dark:bg-gray-700"
              />
              <div className="mt-1 text-xs text-center text-gray-600 dark:text-gray-400">
                {Math.round(chapterProgress)}% Complete
              </div>
            </div>

            {/* Current Page Progress */}
            <div className="animate-in slide-in-from-left stagger-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Page Progress</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {paragraphsRead} / {totalParagraphs} paragraphs
                </span>
              </div>
              <Progress 
                value={pageProgress} 
                className="h-2 bg-gray-200 dark:bg-gray-700"
              />
            </div>

            {/* Reading Stats */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom stagger-3">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg card-hover">
                <div className="flex items-center justify-center mb-1">
                  <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 animate-in scale-in delay-200">
                  {timeSpent}m
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Time</div>
              </div>
              
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg card-hover">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400 animate-in scale-in delay-300">
                  {readingSpeed}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">WPM</div>
              </div>
            </div>

            {/* Achievement Badge */}
            {scrollProgress > 90 && (
              <div className="animate-in bounce-in duration-500 delay-500">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium px-3 py-2 rounded-full text-center shadow-lg">
                  🎉 Almost Done! Keep Going!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 