import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  GraduationCap, 
  Send, 
  X,
  Minimize2,
  Maximize2,
  StickyNote,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Lightbulb,
  Activity
} from 'lucide-react';
import { useLanguageAwareAgents } from '@/hooks/use-language-aware-agents';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { aiLearningService, FeedbackData } from '@/services/ai-learning-service';
import AnnotationModal from '@/components/annotation-modal';
import AITypingIndicator from '@/components/ai-typing-indicator';

interface TeacherMessage {
  id: string;
  role: 'user' | 'teacher' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface AITeacherAgentProps {
  documentId?: number;
  chapter?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'aiTeacherAgentPanelPosition';
const MINIMIZED_KEY = 'aiTeacherAgentPanelMinimized';

export default function AITeacherAgent({
  documentId,
  chapter,
  isOpen,
  onToggle
}: AITeacherAgentProps) {
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });
  const [selectedText, setSelectedText] = useState('');
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [aiTypingProgress, setAiTypingProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'positive' | 'negative'>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<TeacherMessage | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    const defaultX = window.innerWidth - 400 - 16;
    const defaultY = window.innerHeight - 600 - 16;
    return { x: Math.max(20, defaultX), y: Math.max(96, defaultY) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevChapterRef = useRef<number>();
  const { toast } = useToast();

  const {
    socket,
    isConnected,
    sessionId,
    currentLanguage
  } = useLanguageAwareAgents();

  const { translate, currentLanguage: userLanguage } = useLanguage();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-save conversations
  useEffect(() => {
    if (messages.length > 1 && sessionId) { // Don't save just the welcome message
      saveConversation();
    }
  }, [messages, sessionId]);

  // Load saved conversation on mount
  useEffect(() => {
    if (sessionId && documentId) {
      const loaded = loadSavedConversation();
      if (loaded) {
        console.log('💾 Loaded saved Teacher Agent conversation');
      }
    }
  }, [sessionId, documentId]);

  // Effect to notify user and update chat when chapter changes
  useEffect(() => {
    // On initial mount, just store the chapter number
    if (prevChapterRef.current === undefined) {
      prevChapterRef.current = chapter;
      return;
    }

    // If chapter has changed from the previous render
    if (prevChapterRef.current !== chapter && chapter !== undefined) {
      const addSystemMessage = async () => {
        let systemContent = `Teaching context updated to Chapter ${chapter}.`;
        
        // Translate system message if user language is not English
        if (userLanguage !== 'en') {
          try {
            systemContent = await translate({
              text: systemContent,
              targetLanguage: userLanguage,
              context: 'ui'
            });
          } catch (error) {
            console.error('Failed to translate system message:', error);
          }
        }

        const newMessage: TeacherMessage = {
          id: `msg-system-${Date.now()}`,
          role: 'system',
          content: systemContent,
          timestamp: new Date(),
          agent: 'Teacher Agent'
        };

        setMessages(prev => [...prev, newMessage]);
      };

      addSystemMessage();

      // Also translate the toast message
      let toastDescription = `The Teacher Agent is now aware you are on chapter ${chapter}.`;
      if (userLanguage !== 'en') {
        translate({
          text: toastDescription,
          targetLanguage: userLanguage,
          context: 'ui'
        }).then(translatedDescription => {
          toast({
            title: 'Teaching Context Updated',
            description: translatedDescription,
            duration: 3000,
          });
        }).catch(() => {
          // Fallback to English if translation fails
          toast({
            title: 'Teaching Context Updated',
            description: toastDescription,
            duration: 3000,
          });
        });
      } else {
        toast({
          title: 'Teaching Context Updated',
          description: toastDescription,
          duration: 3000,
        });
      }

      // Update the ref to the current chapter for the next render
      prevChapterRef.current = chapter;
    }
  }, [chapter, toast, userLanguage, translate]);

  // Conversation persistence functions
  const getConversationKey = () => {
    return `teacher_agent_${documentId || 'general'}_${sessionId}`;
  };

  const saveConversation = () => {
    try {
      setIsSaving(true);
      const conversationData = {
        messages,
        documentId,
        chapter,
        lastUpdated: new Date().toISOString(),
        sessionId
      };
      localStorage.setItem(getConversationKey(), JSON.stringify(conversationData));
      
      // Show saving indicator briefly
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Failed to save Teacher Agent conversation:', error);
      setIsSaving(false);
    }
  };

  const loadSavedConversation = (): boolean => {
    try {
      const saved = localStorage.getItem(getConversationKey());
      if (saved) {
        const conversationData = JSON.parse(saved);
        // Only load if it's recent (within 24 hours) and same session
        const lastUpdated = new Date(conversationData.lastUpdated);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24 && conversationData.sessionId === sessionId) {
          setMessages(conversationData.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          return true; // Successfully loaded saved conversation
        }
      }
      return false; // No saved conversation or too old
    } catch (error) {
      console.error('Failed to load saved Teacher Agent conversation:', error);
      return false; // Failed to load
    }
  };

  const clearConversation = () => {
    if (confirm('Are you sure you want to clear this teaching conversation? This action cannot be undone.')) {
      setMessages([]);
      localStorage.removeItem(getConversationKey());
      toast({
        title: "Teaching Conversation Cleared",
        description: "Chat history has been cleared.",
        duration: 2000,
      });
    }
  };

  const exportConversation = () => {
    const conversationData = {
      title: `Teacher Agent: ${documentId ? `Document ${documentId}` : 'General'} ${chapter ? `- Chapter ${chapter}` : ''}`,
      timestamp: new Date().toISOString(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        agent: msg.agent
      })),
      metadata: {
        documentId,
        chapter,
        sessionId,
        language: currentLanguage
      }
    };

    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-agent-conversation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Conversation Exported",
      description: "Teaching conversation has been exported successfully.",
      duration: 2000,
    });
  };

  useEffect(() => {
    if (!socket) return;
    
    const handleTeacherResponse = async (data: { message: string; sessionId: string; error?: boolean; language?: string }) => {
      setIsLoading(false);
      setIsAITyping(false);
      if (data.error) return;
      
      console.log(`🎓 Teacher Agent: Received response in language: ${data.language || 'unknown'}`);
      console.log(`🎓 Teacher Agent: User language: ${userLanguage}`);
      
      // Auto-translate teacher response if user language is not English
      let translatedContent = data.message;
      if (userLanguage !== 'en') {
        try {
          console.log(`🌐 Teacher Agent: Translating response from ${data.language || 'unknown'} to ${userLanguage}`);
          translatedContent = await translate({
            text: data.message,
            targetLanguage: userLanguage,
            context: 'explanation'
          });
          console.log(`✅ Teacher Agent: Translation completed`);
        } catch (error) {
          console.error('Failed to translate teacher response:', error);
          // Keep original content if translation fails
          translatedContent = data.message;
        }
      }
      
      setMessages(prev => [
        ...prev,
        {
          id: `teacher-${Date.now()}`,
          role: 'teacher',
          content: translatedContent,
          timestamp: new Date(),
          agent: 'Teacher Agent'
        }
      ]);
      setTimeout(scrollToBottom, 100);
    };

    socket.on('teacherResponse', handleTeacherResponse);
    return () => {
      socket.off('teacherResponse', handleTeacherResponse);
    };
  }, [socket, scrollToBottom, userLanguage, translate]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !socket || !sessionId) return;
    
    const userMsg: TeacherMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setIsAITyping(true);
    setAiTypingProgress(0);
    
    // Simulate typing progress
    const progressInterval = setInterval(() => {
      setAiTypingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    console.log(`🎓 Teacher Agent: Sending message in language: ${userLanguage}`);
    
    socket.emit('teacherMessage', {
      message: userMsg.content,
      sessionId,
      userId: 2,
      documentId,
      chapter,
      language: userLanguage,
      conversationHistory: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      }))
    });
  };

  const handleSaveMessageAsNote = (message: TeacherMessage) => {
    setSelectedText(message.content);
    setAnnotationModalOpen(true);
  };

  const handleCloseAnnotationModal = () => {
    setAnnotationModalOpen(false);
    setSelectedText('');
  };

  const submitFeedback = async (message: TeacherMessage, feedback: 'positive' | 'negative', reason?: string) => {
    if (feedbackSent[message.id]) return;

    const feedbackData: FeedbackData = {
      messageId: message.id,
      feedback,
      reason,
      documentId: documentId,
      chapter: chapter,
      userId: 2, // Example user ID
      agentId: message.agent || 'Teacher Agent',
      messageContent: message.content,
    };

    try {
      await aiLearningService.sendFeedback(feedbackData);
      setFeedbackSent(prev => ({ ...prev, [message.id]: feedback }));
      setFeedbackMessage(null);
      setFeedbackReason('');
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps improve the teaching experience.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: "Feedback Error",
        description: "Failed to submit feedback. Please try again.",
        duration: 2000,
      });
    }
  };

  const handleFeedback = async (message: TeacherMessage, feedback: 'positive' | 'negative') => {
    if (feedback === 'negative') {
      setFeedbackMessage(message);
    } else {
      await submitFeedback(message, feedback);
    }
  };

  const handleNegativeFeedbackSubmit = () => {
    if (feedbackMessage) {
      submitFeedback(feedbackMessage, 'negative', feedbackReason);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging when clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
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
    if (chatRef.current) {
      chatRef.current.style.cursor = 'grabbing';
      chatRef.current.style.transform = 'scale(1.02)';
      chatRef.current.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
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
      const width = 400; // Chat width is 384px (w-96) + padding
      const height = isMinimized ? 64 : 600;
      
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
    if (chatRef.current) {
      chatRef.current.style.cursor = '';
      chatRef.current.style.transform = '';
      chatRef.current.style.boxShadow = '';
    }
    
    // Clear any text selection that might have been accidentally created during drag
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  };



  // Add/remove mouse event listeners
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
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
        
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [isDragging, dragOffset]);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  // Save minimized state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, isMinimized ? 'true' : 'false');
  }, [isMinimized]);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={chatRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none'
      }}
    >
      <Card className={`w-96 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'} shadow-2xl border-2 border-orange-200/30 ${
        isDragging ? 'select-none cursor-grabbing' : ''
      }`} style={{
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'box-shadow 0.2s ease-out' : 'all 0.3s ease-out',
        zIndex: isDragging ? 60 : 50
      }}>
        <CardHeader 
          className={`pb-2 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 select-none transition-all duration-200 ${
            isDragging ? 'cursor-grabbing bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-800/30 dark:to-yellow-800/30' : 'cursor-grab hover:from-orange-100 hover:to-yellow-100 dark:hover:from-orange-800/30 dark:hover:to-yellow-800/30'
          }`}
          onMouseDown={handleMouseDown}
          onDragStart={(e) => e.preventDefault()}
          style={{ 
            userSelect: 'none',
            touchAction: 'none'
          }}
          title="Drag to move"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-orange-600" />
              AI Teacher
              <Badge className={`text-xs ${isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
              {/* Drag indicator */}
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
              {/* Save indicator */}
              {isSaving && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mr-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Saving...
                </div>
              )}
              
              <Button
                onClick={() => {
                  setIsMinimized(!isMinimized);
                  localStorage.setItem(MINIMIZED_KEY, (!isMinimized).toString());
                }}
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
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[520px]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 text-orange-500/50" />
                    <p className="text-sm">Welcome to your AI Teacher!</p>
                    <p className="text-xs mt-2">Ask me anything for step-by-step explanations and guidance.</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group ${
                        message.role === 'user' 
                          ? 'message-slide-right animate-in' 
                          : 'message-slide-left animate-in'
                      } ${
                        index < 5 ? `message-stagger-${Math.min(index + 1, 5)}` : ''
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 transition-all duration-300 message-bubble-pop gpu-accelerated ${
                          message.role === 'user'
                            ? 'bg-orange-500 text-white hover:scale-[1.02] shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                            : message.role === 'system'
                            ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-800 hover:scale-[1.01] insight-sparkle'
                            : 'bg-muted hover:bg-muted/80 hover:scale-[1.01] shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        } ${
                          message.role === 'teacher' || message.role === 'system' ? 'cursor-text' : ''
                        }`}
                        data-message-id={message.id}
                        data-message-role={message.role}
                        data-agent={message.agent || 'Teacher Agent'}
                      >
                        {message.agent && (
                          <div className="flex items-center justify-between gap-1 mb-1 text-xs opacity-70 message-header animate-in fade-in delay-200">
                            <div className="flex items-center gap-2">
                              <div className={`relative agent-avatar ${
                                message.role === 'system' ? 'agent-thinking' : 'agent-active'
                              } transition-all duration-300`}>
                                <GraduationCap className="h-3 w-3" />
                              </div>
                              <span className="font-medium">{message.agent}</span>
                            </div>
                            {(message.role === 'teacher' || message.role === 'system') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-orange-500 hover:text-orange-700 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 btn-scale"
                                onClick={() => handleSaveMessageAsNote(message)}
                                title="Save as note"
                              >
                                <StickyNote className="h-3 w-3 animate-in bounce-in delay-500" />
                              </Button>
                            )}
                          </div>
                        )}
                        <p className="text-sm select-text agent-message-content">{message.content}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs opacity-70 mt-1 timestamp">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          {(message.role === 'teacher' || message.role === 'system') && (
                            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 p-0 hover:text-green-500 disabled:opacity-100 ${feedbackSent[message.id] === 'positive' ? 'text-green-500' : 'text-muted-foreground'}`}
                                onClick={() => handleFeedback(message, 'positive')}
                                disabled={!!feedbackSent[message.id]}
                                title="Good explanation"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 p-0 hover:text-red-500 disabled:opacity-100 ${feedbackSent[message.id] === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`}
                                onClick={() => handleFeedback(message, 'negative')}
                                disabled={!!feedbackSent[message.id]}
                                title="Needs improvement"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* AI Typing Indicator */}
                {isAITyping && (
                  <AITypingIndicator
                    isTyping={isAITyping}
                    agentType="discussion"
                    currentProgress={aiTypingProgress}
                    estimatedTime={3}
                    customMessage="Preparing your explanation..."
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            <div className="p-4 space-y-2">
              {/* Conversation management buttons */}
              {messages.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={clearConversation}
                    variant="outline"
                    size="sm"
                    className="flex-1 px-3 py-2 text-sm border border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    Clear Chat
                  </Button>
                  <Button
                    onClick={exportConversation}
                    variant="outline"
                    size="sm"
                    className="flex-1 px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                  >
                    Export
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  placeholder={sessionId ? "Ask for step-by-step explanation..." : "Connecting..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!isConnected || !sessionId}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!isConnected || !sessionId || !inputMessage.trim()}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <AnnotationModal
        isOpen={annotationModalOpen}
        onClose={handleCloseAnnotationModal}
        selectedText={selectedText}
        documentId={-3}
        chapter={chapter || 1}
        documentTitle="Teacher Agent"
        paragraph={0}
      />

      <Dialog open={!!feedbackMessage} onOpenChange={(isOpen) => !isOpen && setFeedbackMessage(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Provide additional feedback</DialogTitle>
                <DialogDescription>
                    Your feedback helps improve the teaching experience. Please provide a reason.
                </DialogDescription>
            </DialogHeader>
            <Textarea 
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
                placeholder="e.g., This explanation was not clear enough for my level."
                className="my-4"
            />
            <DialogFooter>
                <Button variant="outline" onClick={() => { setFeedbackMessage(null); setFeedbackReason(''); }}>Cancel</Button>
                <Button onClick={handleNegativeFeedbackSubmit}>Submit Feedback</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 