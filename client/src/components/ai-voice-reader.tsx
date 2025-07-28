import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { useAIVoiceGeneration, AIVoice } from '../hooks/use-ai-voice-generation';
import { useFreeAIVoices } from '../hooks/use-free-ai-voices';
import { useSpeech } from '../hooks/use-speech';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  Settings,
  Mic,
  Activity,
  User,
  Brain,
  X,
  Minimize2,
  Maximize2,
  GripVertical
} from 'lucide-react';

interface AudioWaveProps {
  isPlaying: boolean;
  amplitude?: number;
}

function AudioWave({ isPlaying, amplitude = 0.5 }: AudioWaveProps) {
  const barsCount = 12;
  const bars = Array.from({ length: barsCount }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center gap-1 h-8 px-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-md overflow-hidden relative">
      {bars.map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-full transition-all duration-200 ${
            isPlaying 
              ? 'bg-gradient-to-t from-green-500 via-blue-500 to-purple-500' 
              : 'bg-gradient-to-t from-green-400 to-blue-400'
          }`}
          style={{
            height: isPlaying 
              ? `${8 + Math.random() * 16 * amplitude}px`
              : '4px',
            animationDelay: `${bar * 60}ms`,
            animationDuration: `${800 + Math.random() * 400}ms`,
          }}
        />
      ))}
    </div>
  );
}

interface AIVoiceReaderProps {
  content?: any[];
  documentId?: number;
  currentChapter?: number;
  onNavigateNext?: () => void;
  canNavigateNext?: boolean;
  className?: string;
  isOpen: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'aiVoiceReaderPosition';
const MINIMIZED_KEY = 'aiVoiceReaderMinimized';

export function AIVoiceReader({ 
  content, 
  documentId, 
  currentChapter, 
  onNavigateNext, 
  canNavigateNext, 
  className,
  isOpen,
  onToggle
}: AIVoiceReaderProps) {
  const {
    selectedVoice,
    isGenerating,
    currentAudio,
    settings,
    apiKey,
    availableVoices,
    setSelectedVoice,
    setApiKey,
    updateSettings,
    speakWithAI,
    stopSpeech,
    isPlaying,
    canGenerate
  } = useAIVoiceGeneration();

  const {
    selectedVoice: freeSelectedVoice,
    isGenerating: freeIsGenerating,
    customVoices: freeCustomVoices,
    isUploadingVoice,
    uploadProgress,
    uploadCustomVoice,
    cloneVoiceFromSample,
    speakWithFreeAI,
    availableVoices: freeAvailableVoices
  } = useFreeAIVoices();

  // Convert content to DocumentParagraph format for useSpeech
  const speechContent = content ? content.map((item: any, index: number) => ({
    number: index + 1,
    text: item.text || '',
  })) : [];

  const {
    isPlaying: browserIsPlaying,
    currentTime,
    duration,
    togglePlayback: toggleBrowserPlayback,
    speak: browserSpeak,
    stop: browserStop,
  } = useSpeech(speechContent);

  const [useFreeMode, setUseFreeMode] = useState(true);
  const [useBrowserVoice, setUseBrowserVoice] = useState(true); // Default to browser voice for immediate functionality
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<'voices' | 'clone' | 'settings'>('voices');
  const [isPlayingChapter, setIsPlayingChapter] = useState(false);
  
  // Drag state - exact same as AI agent chat
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        } catch {}
      }
    }
    const defaultX = window.innerWidth - 400 - 16;
    const defaultY = window.innerHeight - 600 - 16;
    return { x: Math.max(20, defaultX), y: Math.max(96, defaultY) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const voiceReaderRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  const animationFrameRef = useRef<number | null>(null);
  
  // Voice cloning states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customVoiceName, setCustomVoiceName] = useState("");
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('ai-voice-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [setApiKey]);

  // Check speech synthesis status on mount
  useEffect(() => {
    console.log('🔍 Checking speech synthesis status...');
    console.log('🌐 Speech synthesis available:', !!window.speechSynthesis);
    console.log('🔊 Speech synthesis speaking:', window.speechSynthesis?.speaking);
    console.log('⏸️ Speech synthesis paused:', window.speechSynthesis?.paused);
    
    // Check available voices
    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      console.log('🗣️ Available voices:', voices.length);
      console.log('🗣️ Voice names:', voices.map(v => v.name));
      
      // If no voices loaded, wait for them to load
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const loadedVoices = window.speechSynthesis.getVoices();
          console.log('🗣️ Voices loaded:', loadedVoices.length);
          console.log('🗣️ Voice names:', loadedVoices.map(v => v.name));
        };
      }
    }
  }, []);

  // Keep position ref updated
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  // Save position when component closes/unmounts
  useEffect(() => {
    return () => {
      localStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
    };
  }, []);

  // Save minimized state
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, isMinimized.toString());
  }, [isMinimized]);

  const handlePlayChapter = async () => {
    console.log('🎵 handlePlayChapter called');
    console.log('📖 Content:', content);
    console.log('📖 Content length:', content?.length);
    console.log('🔊 useBrowserVoice:', useBrowserVoice);
    console.log('🆓 useFreeMode:', useFreeMode);
    
    if (!content || content.length === 0) {
      console.log('❌ No content to play');
      return;
    }
    
    // Prevent multiple simultaneous calls
    if (isPlayingChapter) {
      console.log('⚠️ Already playing chapter, ignoring request');
      return;
    }
    
    setIsPlayingChapter(true);
    
    try {
      if (useBrowserVoice) {
        // Use browser speech synthesis (most reliable)
        console.log('🔊 Using browser speech synthesis');
        browserSpeak();
      } else {
        const fullText = content.map((paragraph: any) => paragraph.text || '').join(' ');
        console.log('📝 Full text length:', fullText.length);
        console.log('📝 First 100 chars:', fullText.substring(0, 100));
        
        if (useFreeMode) {
          console.log('🆓 Using free AI voice');
          await speakWithFreeAI(fullText);
        } else {
          console.log('🤖 Using paid AI voice');
          await speakWithAI(fullText);
        }
      }
    } catch (error) {
      console.error('❌ Failed to play chapter:', error);
      // Fallback to browser speech if AI fails
      console.log('🔄 Falling back to browser speech...');
      browserSpeak();
    } finally {
      setIsPlayingChapter(false);
    }
  };

  const handlePlayChapterInChunks = async () => {
    console.log('📖 Playing chapter in chunks...');
    
    if (!content || content.length === 0) {
      console.log('❌ No content to play');
      return;
    }
    
    if (isPlayingChapter) {
      console.log('⚠️ Already playing chapter, ignoring request');
      return;
    }
    
    setIsPlayingChapter(true);
    
    try {
      if (useBrowserVoice) {
        // Cancel any existing speech synthesis first
        window.speechSynthesis.cancel();
        
        // Wait a moment for the cancel to take effect
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Process each paragraph separately to avoid browser limits
        for (let i = 0; i < content.length; i++) {
          const paragraph = content[i];
          console.log(`📖 Playing paragraph ${i + 1}/${content.length}`);
          
          await new Promise<void>((resolve, reject) => {
            // Cancel any existing speech before starting new one
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(paragraph.text || "");
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onstart = () => {
              console.log(`✅ Paragraph ${i + 1} speech started`);
            };
            
            utterance.onend = () => {
              console.log(`✅ Paragraph ${i + 1} speech ended`);
              resolve();
            };
            
            utterance.onerror = (event) => {
              console.error(`❌ Paragraph ${i + 1} speech error:`, event);
              reject(event);
            };
            
            // Small delay before starting speech
            setTimeout(() => {
              window.speechSynthesis.speak(utterance);
            }, 50);
          });
          
          // Small delay between paragraphs
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('✅ All paragraphs completed');
        // Auto-navigate to next chapter if enabled
        if (canNavigateNext && onNavigateNext) {
          onNavigateNext();
        }
      } else {
        // Use the original AI voice logic for non-browser modes
        const fullText = content.map((paragraph: any) => paragraph.text || '').join(' ');
        console.log('📝 Full text length:', fullText.length);
        console.log('📝 First 100 chars:', fullText.substring(0, 100));
        
        if (useFreeMode) {
          console.log('🆓 Using free AI voice');
          await speakWithFreeAI(fullText);
        } else {
          console.log('🤖 Using paid AI voice');
          await speakWithAI(fullText);
        }
      }
    } catch (error) {
      console.error('❌ Failed to play chapter:', error);
    } finally {
      setIsPlayingChapter(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCloneError(null);
    
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setCloneError('Please upload a valid audio file (.mp3, .wav, etc.)');
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        setCloneError('File too large. Please upload a file smaller than 50MB.');
        return;
      }
      
      setUploadedFile(file);
      if (!customVoiceName) {
        setCustomVoiceName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFreeVoiceCloning = async () => {
    if (!uploadedFile || !customVoiceName.trim()) return;
    
    try {
      const result = await uploadCustomVoice(uploadedFile, customVoiceName, '', 'neutral');
      setCloneError('Voice cloned successfully! 🎉');
      setUploadedFile(null);
      setCustomVoiceName("");
    } catch (error) {
      setCloneError('Failed to clone voice. Please try again.');
    }
  };

  // Drag handlers - optimized for smooth 60fps like AI agent chat
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging when clicking on any interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || 
        target.closest('input') || 
        target.closest('select') || 
        target.closest('[role="button"]') ||
        target.closest('[data-radix-collection-item]')) {
      return;
    }
    
    // Only prevent default if we're actually going to drag
    // Don't stop propagation to avoid interfering with speech synthesis
    e.preventDefault();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    
    // Add visual feedback
    if (voiceReaderRef.current) {
      voiceReaderRef.current.style.cursor = 'grabbing';
      voiceReaderRef.current.style.transform = 'scale(1.02)';
      voiceReaderRef.current.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Only prevent default for mouse move to avoid text selection
    // Don't stop propagation to avoid interfering with speech synthesis
    e.preventDefault();
    
    // Cancel any pending animation frame to prevent multiple updates per frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Use requestAnimationFrame for smooth 60fps updates (throttled to one update per frame)
    animationFrameRef.current = requestAnimationFrame(() => {
      const width = 400; // Voice reader width is 384px (w-96) + padding
      const height = isMinimized ? 64 : 600;
      
      // Calculate new position with smooth boundaries and proper padding
      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, e.clientX - dragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, e.clientY - dragOffset.y));
      
      // Only update if position actually changed to avoid unnecessary re-renders
      setPosition((prev: { x: number; y: number }) => {
        if (prev.x !== newX || prev.y !== newY) {
          return { x: newX, y: newY };
        }
        return prev;
      });
    });
  }, [isDragging, dragOffset, isMinimized]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset visual feedback
    if (voiceReaderRef.current) {
      voiceReaderRef.current.style.cursor = '';
      voiceReaderRef.current.style.transform = '';
      voiceReaderRef.current.style.boxShadow = '';
    }
    
    // Save position immediately using latest state
    setPosition((currentPos: { x: number; y: number }) => {
      localStorage.setItem(POSITION_KEY, JSON.stringify(currentPos));
      return currentPos;
    });
  }, [position]);

  const handleDoubleClick = () => {
    // Reset position to bottom-right corner
    const defaultX = window.innerWidth - 400 - 16; // width + padding
    const defaultY = window.innerHeight - (isMinimized ? 64 : 600) - 16; // height + padding
    setPosition({ 
      x: Math.max(20, defaultX), 
      y: Math.max(96, defaultY) // 96px to stay below top bar
    });
  };

  // Add/remove mouse event listeners - optimized for smooth performance
  useEffect(() => {
    if (isDragging) {
      // Use passive: false only for events that need preventDefault
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
      
      // Optimized touch handling for mobile devices
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          // Only prevent default for touch move to avoid scrolling
          // Don't stop propagation to avoid interfering with speech synthesis
          e.preventDefault();
          
          // Create a mouse event from touch for unified handling
          const mouseEvent = {
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            clientX: touch.clientX,
            clientY: touch.clientY
          } as MouseEvent;
          
          handleMouseMove(mouseEvent);
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        // Don't prevent default or stop propagation to avoid interfering with speech synthesis
        handleMouseUp();
      };
      
      // Add touch events with optimized settings
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [isDragging, dragOffset, handleMouseMove, handleMouseUp]);

  const currentVoices = useFreeMode ? freeAvailableVoices : availableVoices;
  const currentSelectedVoice = useFreeMode ? freeSelectedVoice : selectedVoice;
  const currentIsGenerating = useBrowserVoice ? false : (useFreeMode ? freeIsGenerating : isGenerating);
  const currentIsPlaying = useBrowserVoice ? (browserIsPlaying || isPlayingChapter) : isPlaying;
  
  // Speech status for UI feedback only
  const isSpeechActive = isPlayingChapter || currentIsPlaying;
  
  // Stop function that works with all modes
  const handleStopSpeech = () => {
    console.log('⏹️ handleStopSpeech called');
    console.log('🔊 useBrowserVoice:', useBrowserVoice);
    console.log('🔊 currentIsPlaying:', currentIsPlaying);
    console.log('🔊 isPlayingChapter:', isPlayingChapter);
    
    if (useBrowserVoice) {
      // Use the browser stop function from useSpeech hook
      console.log('🔊 Stopping browser speech synthesis');
      browserStop();
      setIsPlayingChapter(false);
    } else {
      // Use the appropriate stop function for AI voices
      console.log('🤖 Stopping AI voice');
      stopSpeech();
    }
  };

  if (!isOpen) return null;
  
  return (
    <div
      ref={voiceReaderRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
        willChange: isDragging ? 'transform, box-shadow' : 'auto',
        pointerEvents: 'all'
      }}
    >
      <Card className={`w-96 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'} shadow-2xl border-2 border-primary/20 ${
        isDragging ? 'select-none cursor-grabbing' : ''
      }`} style={{
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'none' : 'all 0.3s ease-out',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        zIndex: isDragging ? 60 : 50,
        boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <CardHeader 
          className={`pb-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 select-none transition-all duration-200`}
          style={{ 
            userSelect: 'none',
            touchAction: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
        >
          {/* Draggable Handle - Only this area is draggable */}
          <div 
            className={`absolute top-0 left-0 right-0 h-8 transition-colors ${
              isDragging 
                ? 'cursor-grabbing hover:bg-gray-100/50 dark:hover:bg-gray-800/50' 
                : 'cursor-grab hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            }`}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            title="Drag to move • Double-click to reset position"
          >
            {isSpeechActive && (
              <div className="absolute top-1 left-1 text-xs text-green-600 dark:text-green-400">
                🔊 Playing
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              AI Voice Reader
              <Badge className={`text-xs ${
                useBrowserVoice ? 'bg-green-500 text-white' : 
                useFreeMode ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                {useBrowserVoice ? 'Browser' : useFreeMode ? 'Free AI' : 'Premium'}
              </Badge>
              {/* Drag indicator - exact same as AI chat */}
              <div className="flex gap-0.5 ml-2 opacity-50">
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
              </div>
        </CardTitle>
            <div className="flex items-center gap-1">
              {/* Status indicators */}
              {currentIsGenerating && (
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mr-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Generating...
                </div>
              )}
              
              {(currentIsPlaying || false) && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mr-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Playing
                </div>
              )}
              
              <Button
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                onClick={onToggle}
                className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <div className="flex space-x-2 mt-2 relative z-10">
              <Button
                onClick={() => setActiveTab('voices')}
                className={`flex-1 px-3 py-1 text-sm ${activeTab === 'voices' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                Voices
              </Button>
              <Button
                onClick={() => setActiveTab('clone')}
                className={`flex-1 px-3 py-1 text-sm ${activeTab === 'clone' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                Clone
              </Button>
              <Button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-3 py-1 text-sm ${activeTab === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                Settings
              </Button>
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[520px]">
            {activeTab === 'voices' && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Audio Waveform */}
                  <AudioWave isPlaying={currentIsPlaying || false} />
                  
                  {/* Main Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={currentIsPlaying ? handleStopSpeech : handlePlayChapterInChunks}
                      disabled={currentIsGenerating}
                      className="flex-1"
                    >
                      {currentIsPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {currentIsPlaying ? 'Stop' : isPlayingChapter ? 'Reading...' : 'Play Chapter'}
                    </Button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                    <span className="text-sm font-medium">Voice Engine:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={useBrowserVoice ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setUseBrowserVoice(true);
                          setUseFreeMode(false);
                        }}
                        className="flex-1"
                      >
                        🔊 Browser
                      </Button>
                      <Button
                        variant={!useBrowserVoice && useFreeMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setUseBrowserVoice(false);
                          setUseFreeMode(true);
                        }}
                        className="flex-1"
                      >
                        🆓 Free AI
                      </Button>
                      <Button
                        variant={!useBrowserVoice && !useFreeMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setUseBrowserVoice(false);
                          setUseFreeMode(false);
                        }}
                        className="flex-1"
                      >
                        💳 Premium
                      </Button>
                </div>
                    {useBrowserVoice && (
                      <div className="text-xs text-green-600 dark:text-green-400 text-center">
                        ✅ Ready to use - no setup required!
              </div>
                    )}
                  </div>

                  {/* Voice Selection */}
                  {!useBrowserVoice && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Voice:</label>
            <Select 
              value={currentSelectedVoice} 
              onValueChange={useFreeMode ? (value) => setSelectedVoice(value) : setSelectedVoice}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      <span>
                                  {voice.gender === 'male' ? '👨' : voice.gender === 'female' ? '👩' : '🤖'}
                      </span>
                      <span>{voice.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
                    </div>
                  )}
                  
                  {useBrowserVoice && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                        🔊 Browser Voice Selected
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Using your system's built-in text-to-speech engine. This works offline and doesn't require any API keys or setup.
                      </div>
                      {currentIsPlaying && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                            <span>Progress</span>
                            <span>{Math.floor((currentTime / duration) * 100)}%</span>
                          </div>
                          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                            <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}</span>
                            <span>{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* API Key for Premium Mode */}
                  {!useFreeMode && !apiKey && (
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="ElevenLabs API key..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="text-sm"
                      />
                      <div className="text-xs text-gray-600">
                        Get your key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-600">ElevenLabs</a>
                      </div>
                    </div>
                  )}

                  {/* Auto-navigate option */}
                  {canNavigateNext && (
                    <div className="text-xs text-gray-600 text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      Will auto-navigate to next chapter when finished
                    </div>
                  )}
               </div>
              </ScrollArea>
            )}

            {activeTab === 'clone' && (
              <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                  <div className="text-center text-muted-foreground py-4">
                    <Mic className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                    <p className="text-sm">Upload your voice sample to create a custom AI voice.</p>
                    <p className="text-xs mt-2">Works completely free with browser-based AI.</p>
                  </div>

                  {/* Voice Cloning */}
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                        accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="voice-upload"
                    />
                    <label 
                      htmlFor="voice-upload" 
                        className="cursor-pointer flex flex-col items-center gap-2 text-sm"
                    >
                        <Mic className="w-8 h-8 text-gray-400" />
                      {uploadedFile ? (
                          <div className="text-center">
                            <span className="text-green-600 font-medium">✅ {uploadedFile.name}</span>
                            <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                        </div>
                      ) : (
                          <div className="text-center">
                            <span className="font-medium">Upload voice sample</span>
                            <p className="text-xs text-gray-500 mt-1">MP3, WAV - 30+ seconds recommended</p>
                        </div>
                      )}
                    </label>
                </div>

                    {uploadedFile && (
                      <div className="space-y-3">
                    <Input
                      value={customVoiceName}
                      onChange={(e) => setCustomVoiceName(e.target.value)}
                          placeholder="Voice name..."
                          className="text-sm"
                        />
                <Button
                  onClick={handleFreeVoiceCloning}
                  disabled={!uploadedFile || !customVoiceName.trim() || isUploadingVoice}
                          className="w-full"
                        >
                          {isUploadingVoice ? 'Cloning Voice...' : 'Create Voice Clone'}
                        </Button>
                      </div>
                    )}

                    {/* Error Display */}
                    {cloneError && (
                      <div className={`p-3 rounded-lg text-sm ${
                        cloneError.includes('success') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {cloneError}
                      </div>
                    )}
                    </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'settings' && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground py-4">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                    <p className="text-sm">Advanced voice settings and controls.</p>
                    <p className="text-xs mt-2">Fine-tune your AI voice experience.</p>
            </div>
            
                  {/* Voice Settings */}
                  <div className="space-y-4">
              <div className="space-y-2">
                      <label className="text-sm font-medium">Voice Stability</label>
                <Slider
                  value={[settings.stability]}
                  onValueChange={([value]) => updateSettings({ stability: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-center text-gray-500">
                  {settings.stability.toFixed(1)} (consistency)
                </div>
              </div>

              <div className="space-y-2">
                      <label className="text-sm font-medium">Voice Similarity</label>
                <Slider
                  value={[settings.similarity]}
                  onValueChange={([value]) => updateSettings({ similarity: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-center text-gray-500">
                  {settings.similarity.toFixed(1)} (voice match)
                </div>
              </div>

              <div className="space-y-2">
                      <label className="text-sm font-medium">Speech Speed</label>
                <Slider
                  value={[settings.speed || 1.0]}
                  onValueChange={([value]) => updateSettings({ speed: value })}
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-center text-gray-500">
                        {(settings.speed || 1.0).toFixed(1)}x speed
                </div>
              </div>
            </div>
        </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
    </Card>
    </div>
  );
}

export default AIVoiceReader; 