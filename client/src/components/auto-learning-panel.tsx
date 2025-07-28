import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, BookOpen, TrendingUp, MessageCircle, Download, X, Minimize2, Maximize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ExpertiseSummary {
  expertise: boolean;
  domain?: string;
  expertiseLevel?: number;
  totalConcepts?: number;
  concepts?: string[];
  fineTuningExamples?: number;
  message?: string;
  examples?: string[];
}

interface AutoLearningPanelProps {
  documentId: number;
  documentTitle: string;
  isOpen: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'autoLearningPanelPosition';
const MINIMIZED_KEY = 'autoLearningPanelMinimized';

export default function AutoLearningPanel({ documentId, documentTitle, isOpen, onToggle }: AutoLearningPanelProps) {
  const [expertise, setExpertise] = useState<ExpertiseSummary | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });

  // Drag state - initialize with proper default position
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
    const defaultX = window.innerWidth - 450 - 16;
    const defaultY = window.innerHeight - 500 - 16;
    return { x: Math.max(20, defaultX), y: Math.max(96, defaultY) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchExpertise();
    }
  }, [documentId, isOpen]);

  // Update position when state changes
  useEffect(() => {
    if (isOpen) {
      // Recalculate position when state changes
      const defaultX = window.innerWidth - 450 - 16; // width + padding
      const defaultY = window.innerHeight - (isMinimized ? 64 : showChat ? 700 : 500) - 16; // height + padding
      setPosition({
        x: Math.max(20, defaultX),
        y: Math.max(96, defaultY) // 96px to stay below top bar
      });
    }
  }, [isMinimized, showChat]);

  // Keep position ref updated
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  // Save position when component closes/unmounts
  useEffect(() => {
    return () => {
      localStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
    };
  }, []);

  // Save minimized state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, isMinimized ? 'true' : 'false');
  }, [isMinimized]);

  useEffect(() => {
    if (expertise) {
      console.log('AI Expertise object:', expertise);
    }
  }, [expertise]);

  const fetchExpertise = async () => {
    try {
      const response = await fetch(`/api/expertise/${documentId}`);
      const data = await response.json();
      if (data.success) {
        setExpertise(data.expertise);
      }
    } catch (error) {
      console.error('Failed to fetch expertise:', error);
    }
  };

  const triggerAutoLearning = async () => {
    setIsLearning(true);
    try {
      const response = await fetch(`/api/auto-learn/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        // Poll for expertise updates with exponential backoff
        let pollAttempts = 0;
        const maxAttempts = 15; // Reduce total attempts
        
        const pollWithBackoff = async () => {
          if (pollAttempts >= maxAttempts) {
            setIsLearning(false);
            return;
          }
          
          pollAttempts++;
          await fetchExpertise();
          const updatedResponse = await fetch(`/api/expertise/${documentId}`);
          const updatedData = await updatedResponse.json();
          
          if (updatedData.success && updatedData.expertise.expertise) {
            setIsLearning(false);
            return;
          }
          
          // Exponential backoff: 3s, 5s, 8s, 12s, 20s...
          const delay = Math.min(30000, 3000 + (pollAttempts * 2000));
          setTimeout(pollWithBackoff, delay);
        };
        
        // Start polling with initial delay
        setTimeout(pollWithBackoff, 5000);
      }
    } catch (error) {
      console.error('Auto-learning failed:', error);
      setIsLearning(false);
    }
  };

  const askExpert = async () => {
    if (!chatQuestion.trim()) return;
    
    setIsChatting(true);
    try {
      const response = await fetch(`/api/expert-chat/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: chatQuestion }),
      });
      
      const data = await response.json();
      if (data.success) {
        setChatResponse(data.response);
      }
    } catch (error) {
      console.error('Expert chat failed:', error);
      setChatResponse('Sorry, I encountered an error while processing your question.');
    } finally {
      setIsChatting(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    
    // Prevent text selection during drag
    e.preventDefault();
    e.stopPropagation();
    
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
    if (panelRef.current) {
      panelRef.current.style.cursor = 'grabbing';
      panelRef.current.style.transform = 'scale(1.02)';
      panelRef.current.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Prevent text selection during drag
    e.preventDefault();
    e.stopPropagation();
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      const width = isMinimized ? 300 : 400;
      const height = isMinimized ? 60 : showChat ? 700 : 500;
      
      // Calculate new position with smooth boundaries
      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, e.clientX - dragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, e.clientY - dragOffset.y));
      
      setPosition({ x: newX, y: newY });
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset visual feedback
    if (panelRef.current) {
      panelRef.current.style.cursor = '';
      panelRef.current.style.transform = '';
      panelRef.current.style.boxShadow = '';
    }
    
    // Clear any text selection that might have been accidentally created during drag
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // Save position using the latest state value
    setPosition((currentPos: { x: number; y: number }) => {
      localStorage.setItem(POSITION_KEY, JSON.stringify(currentPos));
      return currentPos;
    });
  };

  useEffect(() => {
    if (isDragging) {
      // Use passive listeners for better performance
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
      
      // Also add touchmove and touchend for mobile support
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const mouseEvent = {
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            clientX: touch.clientX,
            clientY: touch.clientY
          } as MouseEvent;
          handleMouseMove(mouseEvent);
        }
      };
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp, { passive: true });
      
      // Prevent body scroll during drag
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [isDragging, dragOffset]);

  const getExpertiseColor = (level: number) => {
    if (level >= 8) return 'bg-green-500';
    if (level >= 6) return 'bg-blue-500';
    if (level >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getExpertiseLabel = (level: number) => {
    if (level >= 9) return 'Master Expert';
    if (level >= 7) return 'Expert';
    if (level >= 5) return 'Advanced';
    if (level >= 3) return 'Intermediate';
    return 'Beginner';
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-40 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ${
        isDragging ? 'select-none cursor-grabbing' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '300px' : '400px',
        height: isMinimized ? '60px' : showChat ? '700px' : '500px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overscrollBehavior: 'contain',
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'box-shadow 0.2s ease-out, transform 0.2s ease-out' : 'all 0.3s ease-out',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        zIndex: isDragging ? 80 : 60
      }}
      onWheel={(e) => e.stopPropagation()}
      onScroll={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white select-none transition-all duration-200 ${
          isDragging ? 'cursor-grabbing bg-gradient-to-r from-purple-600 to-blue-700' : 'cursor-grab hover:from-purple-550 hover:to-blue-650'
        }`}
        onMouseDown={handleMouseDown}
        onDragStart={(e) => e.preventDefault()}
        style={{ 
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div className="select-none" style={{ userSelect: 'none' }}>
            <h3 className="font-semibold select-none" style={{ userSelect: 'none' }}>AI Auto-Learning</h3>
            <p className="text-xs opacity-90 select-none" style={{ userSelect: 'none' }}>
              {documentTitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isLearning && (
            <div className="flex items-center space-x-1 text-xs bg-white/20 px-2 py-1 rounded">
              <Brain className="w-3 h-3 animate-pulse" />
              <span>Learning...</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0 hover:bg-white/20 text-white"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 hover:bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar" style={{ height: 'calc(100% - 80px)' }}>
          {/* Main Auto-Learning Card */}
          <div className="border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
            {!expertise?.expertise ? (
              <div className="text-center py-4">
                <Brain className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Ready to Learn</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  The AI hasn't specialized in this document yet. Click below to start the auto-learning process.
                </p>
                <Button
                  onClick={triggerAutoLearning}
                  disabled={isLearning}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  {isLearning ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Learning...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Start Auto-Learning
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Expertise Level Display */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">AI Expertise Level</h4>
                    <Badge className={`${getExpertiseColor(expertise.expertiseLevel || 0)} text-white text-xs`}>
                      {getExpertiseLabel(expertise.expertiseLevel || 0)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Domain: {expertise.domain}</span>
                      <span>{expertise.expertiseLevel}/10</span>
                    </div>
                    <Progress 
                      value={(expertise.expertiseLevel || 0) * 10} 
                      className="h-2"
                    />
                    <div className="text-xs text-gray-600 dark:text-gray-400">Mastery: {(expertise.expertiseLevel || 0) * 10}%</div>
                  </div>
                </div>

                {/* Knowledge Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
                    <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{expertise.totalConcepts}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Concepts</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
                    <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{expertise.fineTuningExamples}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Examples</div>
                  </div>
                </div>

                {/* Key Concepts */}
                {expertise.concepts && expertise.concepts.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100 text-sm">Key Concepts</h4>
                    <div className="flex flex-wrap gap-1">
                      {expertise.concepts.slice(0, 6).map((concept, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-secondary dark:bg-secondary/80 text-secondary-foreground dark:text-secondary-foreground">
                          {concept}
                        </Badge>
                      ))}
                      {expertise.concepts.length > 6 && (
                        <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                          +{expertise.concepts.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Concepts Learned */}
                {expertise.concepts && expertise.concepts.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mt-2">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100 text-sm">Concepts Learned</h4>
                    <div className="flex flex-wrap gap-1">
                      {expertise.concepts.map((concept, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-secondary dark:bg-secondary/80 text-secondary-foreground dark:text-secondary-foreground">{concept}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Example Questions */}
                {expertise.examples && expertise.examples.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mt-2">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100 text-sm">Example Questions</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                      {expertise.examples.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expert Chat Toggle */}
                <Button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {showChat ? 'Hide Expert Chat' : 'Chat with AI Expert'}
                </Button>
              </div>
            )}
          </div>

          {/* Expert Chat Panel */}
          {showChat && expertise?.expertise && (
            <div className="border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 rounded-lg p-4">
              <h4 className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                Expert Chat - {expertise.domain}
              </h4>
              <div className="space-y-3">
                <Input
                  placeholder="Ask an expert question..."
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && askExpert()}
                />
                <Button
                  onClick={askExpert}
                  disabled={isChatting || !chatQuestion.trim()}
                  className="w-full"
                >
                  {isChatting ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      AI Expert is thinking...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Ask Expert
                    </>
                  )}
                </Button>

                {chatResponse && (
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <h5 className="font-semibold mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm">
                      <Brain className="h-4 w-4 text-purple-600" />
                      Expert Response:
                    </h5>
                    <Textarea
                      value={chatResponse}
                      readOnly
                      className="min-h-[100px] bg-white dark:bg-slate-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Learning Status */}
          {isLearning && (
            <div className="border-2 border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <div className="text-center">
                <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-3 animate-pulse" />
                <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">AI is Learning...</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs">
                  The AI is analyzing your document and building expertise.
                </p>
                <Progress value={33} className="h-2" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 