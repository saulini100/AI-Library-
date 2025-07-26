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
  MessageCircle, 
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

interface DiscussionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface AIDiscussionAgentProps {
  documentId?: number;
  chapter?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'aiDiscussionAgentPanelPosition';
const MINIMIZED_KEY = 'aiDiscussionAgentPanelMinimized';

export default function AIDiscussionAgent({
  documentId,
  chapter,
  isOpen,
  onToggle
}: AIDiscussionAgentProps) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
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
  const [feedbackMessage, setFeedbackMessage] = useState<DiscussionMessage | null>(null);
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
            // Validate saved position doesn't overflow
            const maxX = window.innerWidth - 384 - 20;
            const maxY = window.innerHeight - 600 - 20;
            return {
              x: Math.max(20, Math.min(parsed.x, maxX)),
              y: Math.max(20, Math.min(parsed.y, maxY))
            };
          }
        } catch {}
      }
    }
    // Default position - center right of screen
    const defaultX = Math.max(20, window.innerWidth - 384 - 20);
    const defaultY = Math.max(20, window.innerHeight - 600 - 20);
    return { x: defaultX, y: defaultY };
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
        console.log('💾 Loaded saved Discussion Agent conversation');
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
        let systemContent = `Discussion context updated to Chapter ${chapter}.`;
        
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

        const newMessage: DiscussionMessage = {
          id: `msg-system-${Date.now()}`,
          role: 'system',
          content: systemContent,
          timestamp: new Date(),
          agent: 'Discussion Agent'
        };

        setMessages(prev => [...prev, newMessage]);
      };

      addSystemMessage();

      // Also translate the toast message
      let toastDescription = `The Discussion Agent is now aware you are on chapter ${chapter}.`;
      if (userLanguage !== 'en') {
        translate({
          text: toastDescription,
          targetLanguage: userLanguage,
          context: 'ui'
        }).then(translatedDescription => {
          toast({
            title: 'Discussion Context Updated',
            description: translatedDescription,
            duration: 3000,
          });
        }).catch(() => {
          // Fallback to English if translation fails
          toast({
            title: 'Discussion Context Updated',
            description: toastDescription,
            duration: 3000,
          });
        });
      } else {
        toast({
          title: 'Discussion Context Updated',
          description: toastDescription,
          duration: 3000,
        });
      }

      prevChapterRef.current = chapter;
    }
  }, [chapter, userLanguage, translate, toast]);

  // Initialize discussion when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeDiscussion();
    }
  }, [isOpen]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleDiscussionResponse = async (data: { message: string; sessionId: string; error?: boolean; language?: string }) => {
      console.log('💬 [FRONTEND] Received discussionResponse:', data);
      
      if (data.error) {
        setIsLoading(false);
        setIsAITyping(false);
        
        let errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
        
        // Translate error message if user language is not English
        if (userLanguage !== 'en') {
          try {
            errorMessage = await translate({
              text: errorMessage,
              targetLanguage: userLanguage,
              context: 'ui'
            });
          } catch (error) {
            console.error('Failed to translate error message:', error);
          }
        }

        const errorMsg: DiscussionMessage = {
          id: `msg-error-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
          agent: 'Discussion Agent'
        };

        setMessages(prev => [...prev, errorMsg]);
        return;
      }
      
      setIsLoading(false);
      setIsAITyping(false);
      
      const newMessage: DiscussionMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        agent: 'Discussion Agent'
      };

      setMessages(prev => [...prev, newMessage]);
      setTimeout(scrollToBottom, 100);
    };

    socket.on('discussionResponse', handleDiscussionResponse);

    return () => {
      socket.off('discussionResponse', handleDiscussionResponse);
    };
  }, [socket, userLanguage, translate, scrollToBottom]);

  const getConversationKey = () => {
    return `discussion_${sessionId}_${documentId || 'no-doc'}_${chapter || 'no-chapter'}`;
  };

  const saveConversation = () => {
    if (messages.length === 0) return;
    
    try {
      setIsSaving(true);
      const key = getConversationKey();
      const conversationData = {
        messages,
        timestamp: new Date().toISOString(),
        documentId,
        chapter
      };
      localStorage.setItem(key, JSON.stringify(conversationData));
      console.log('💾 Saved discussion conversation');
      
      // Show saving indicator briefly
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Failed to save discussion conversation:', error);
      setIsSaving(false);
    }
  };

  const loadSavedConversation = (): boolean => {
    try {
      const key = getConversationKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const conversationData = JSON.parse(saved);
        setMessages(conversationData.messages || []);
        console.log('💾 Loaded discussion conversation with', conversationData.messages?.length || 0, 'messages');
        return true;
      }
    } catch (error) {
      console.error('Failed to load discussion conversation:', error);
    }
    return false;
  };

  const clearConversation = () => {
    setMessages([]);
    try {
      const key = getConversationKey();
      localStorage.removeItem(key);
      console.log('🗑️ Cleared discussion conversation');
      toast({
        title: "Chat Cleared",
        description: "Discussion conversation has been cleared.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to clear discussion conversation:', error);
    }
  };

  const exportConversation = () => {
    if (messages.length === 0) return;
    
    try {
      const conversationData = {
        title: 'Discussion Conversation',
        timestamp: new Date().toISOString(),
        documentId,
        chapter,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          agent: msg.agent
        }))
      };
      
      const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discussion-conversation-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Conversation Exported",
        description: "Discussion conversation has been exported successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to export discussion conversation:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export discussion conversation.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const initializeDiscussion = () => {
    const welcomeMessage: DiscussionMessage = {
      id: `msg-welcome-${Date.now()}`,
      role: 'assistant',
      content: 'Hello! I\'m your discussion partner. I\'m here to chat, help with discussions, and assist with note-taking. What would you like to talk about?',
      timestamp: new Date(),
      agent: 'Discussion Agent'
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg: DiscussionMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      agent: 'User'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setIsAITyping(true);
    setAiTypingProgress(0);

    // Simulate typing progress
    const typingInterval = setInterval(() => {
      setAiTypingProgress(prev => {
        if (prev >= 90) {
          clearInterval(typingInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      if (socket && isConnected) {
        socket.emit('discussionMessage', {
          message: userMsg.content,
          sessionId,
          userId: 2,
          documentId,
          chapter,
          language: userLanguage,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
            agent: m.agent
          }))
        });
      } else {
        throw new Error('Not connected to AI system');
      }
    } catch (error) {
      console.error('Failed to send discussion message:', error);
      setIsLoading(false);
      setIsAITyping(false);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (userLanguage !== 'en') {
        try {
          errorMessage = await translate({
            text: errorMessage,
            targetLanguage: userLanguage,
            context: 'ui'
          });
        } catch (translateError) {
          console.error('Failed to translate error message:', translateError);
        }
      }

      const errorMsg: DiscussionMessage = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        agent: 'Discussion Agent'
      };

      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleSaveMessageAsNote = (message: DiscussionMessage) => {
    setSelectedText(message.content);
    setAnnotationModalOpen(true);
  };

  const handleCloseAnnotationModal = () => {
    setAnnotationModalOpen(false);
    setSelectedText('');
  };

  const submitFeedback = async (message: DiscussionMessage, feedback: 'positive' | 'negative', reason?: string) => {
    try {
      const feedbackData: FeedbackData = {
        messageId: message.id,
        feedback,
        reason: reason || '',
        documentId: documentId || undefined,
        chapter: chapter || undefined,
        userId: 2,
        agentId: 'discussion',
        messageContent: message.content.substring(0, 500)
      };

      await aiLearningService.sendFeedback(feedbackData);
      
      setFeedbackSent(prev => ({ ...prev, [message.id]: feedback }));
      setFeedbackMessage(null);
      setFeedbackReason('');

      const feedbackText = feedback === 'positive' ? 'Thank you for your feedback!' : 'Thank you for your feedback. I\'ll work on improving.';
      
      toast({
        title: "Feedback Submitted",
        description: feedbackText,
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: "Feedback Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleFeedback = async (message: DiscussionMessage, feedback: 'positive' | 'negative') => {
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
    // Allow dragging from header or any part of the component
    const target = e.target as HTMLElement;
    const isHeader = target.closest('[data-drag-handle]') !== null;
    const isButton = target.closest('button') !== null;
    
    // Don't start dragging if clicking on buttons or interactive elements
    if (isButton) return;
    
    setIsDragging(true);
    const rect = chatRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Get actual component dimensions
      const componentWidth = isMinimized ? 320 : 384; // w-80 = 320px, w-96 = 384px
      const componentHeight = isMinimized ? 48 : 600; // h-12 = 48px, h-[600px] = 600px
      
      // Constrain to viewport with proper margins
      const maxX = window.innerWidth - componentWidth - 20;
      const maxY = window.innerHeight - componentHeight - 20;
      
      setPosition({
        x: Math.max(20, Math.min(newX, maxX)),
        y: Math.max(20, Math.min(newY, maxY))
      });
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    }
  };

  // Touch handlers for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isButton = target.closest('button') !== null;
      
      // Don't start dragging if touching buttons or interactive elements
      if (isButton) return;
      
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = chatRef.current?.getBoundingClientRect();
      if (rect) {
        setDragStart({ x: touch.clientX, y: touch.clientY });
        setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      
      // Get actual component dimensions
      const componentWidth = isMinimized ? 320 : 384;
      const componentHeight = isMinimized ? 48 : 600;
      
      // Constrain to viewport with proper margins
      const maxX = window.innerWidth - componentWidth - 20;
      const maxY = window.innerHeight - componentHeight - 20;
      
      setPosition({
        x: Math.max(20, Math.min(newX, maxX)),
        y: Math.max(20, Math.min(newY, maxY))
      });
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, position, isMinimized]);

  // Global mouse event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Save minimized state
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, isMinimized.toString());
  }, [isMinimized]);

  // Handle window resize to keep component within bounds
  useEffect(() => {
    const handleResize = () => {
      const componentWidth = isMinimized ? 320 : 384;
      const componentHeight = isMinimized ? 48 : 600;
      const maxX = window.innerWidth - componentWidth - 20;
      const maxY = window.innerHeight - componentHeight - 20;
      
      setPosition(prev => ({
        x: Math.max(20, Math.min(prev.x, maxX)),
        y: Math.max(20, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);

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
      <Card className={`w-96 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'} shadow-2xl border-2 border-blue-200/30 ${
        isDragging ? 'select-none cursor-grabbing' : ''
      }`} style={{
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'box-shadow 0.2s ease-out' : 'all 0.3s ease-out',
        zIndex: isDragging ? 60 : 50
      }}>
        <CardHeader 
          className={`pb-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 select-none transition-all duration-200 ${
            isDragging ? 'cursor-grabbing bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800/30 dark:to-purple-800/30' : 'cursor-grab hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-800/30 dark:hover:to-purple-800/30'
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
              <MessageCircle className="h-5 w-5 text-blue-600" />
              AI Discussion
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
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-blue-500/50" />
                    <p className="text-sm">Welcome to your AI Discussion Partner!</p>
                    <p className="text-xs mt-2">Let's have a meaningful conversation about your reading.</p>
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
                        className={`max-w-[85%] rounded-lg p-3 transition-all duration-300 message-bubble-pop gpu-accelerated overflow-hidden ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white hover:scale-[1.02] shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                            : message.role === 'system'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 hover:scale-[1.01] insight-sparkle'
                            : 'bg-muted hover:bg-muted/80 hover:scale-[1.01] shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        } ${
                          message.role === 'assistant' || message.role === 'system' ? 'cursor-text' : ''
                        }`}
                        data-message-id={message.id}
                        data-message-role={message.role}
                        data-agent={message.agent || 'Discussion Agent'}
                      >
                        {message.agent && (
                          <div className="flex items-center justify-between gap-1 mb-1 text-xs opacity-70 message-header animate-in fade-in delay-200">
                            <div className="flex items-center gap-2">
                              <div className={`relative agent-avatar ${
                                message.role === 'system' ? 'agent-thinking' : 'agent-active'
                              } transition-all duration-300`}>
                                <MessageCircle className="h-3 w-3" />
                              </div>
                              <span className="font-medium">{message.agent}</span>
                            </div>
                            {(message.role === 'assistant' || message.role === 'system') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 btn-scale"
                                onClick={() => handleSaveMessageAsNote(message)}
                                title="Save as note"
                              >
                                <StickyNote className="h-3 w-3 animate-in bounce-in delay-500" />
                              </Button>
                            )}
                          </div>
                        )}
                        <p className="text-sm select-text agent-message-content break-words overflow-wrap-anywhere whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs opacity-70 mt-1 timestamp">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          {(message.role === 'assistant' || message.role === 'system') && (
                            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 p-0 hover:text-green-500 disabled:opacity-100 ${feedbackSent[message.id] === 'positive' ? 'text-green-500' : 'text-muted-foreground'}`}
                                onClick={() => handleFeedback(message, 'positive')}
                                disabled={!!feedbackSent[message.id]}
                                title="Good response"
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
                    customMessage="Thinking about your message..."
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
                    className="flex-1 px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  >
                    Export
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  placeholder={sessionId ? "Start a discussion..." : "Connecting..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!isConnected || !sessionId}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!isConnected || !sessionId || !inputMessage.trim()}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
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
        documentId={documentId || 0}
        documentTitle="Discussion Note"
        chapter={chapter || 0}
        paragraph={null}
      />

      <Dialog open={!!feedbackMessage} onOpenChange={(isOpen) => !isOpen && setFeedbackMessage(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Provide additional feedback</DialogTitle>
                <DialogDescription>
                    Your feedback helps improve the discussion experience. Please provide a reason.
                </DialogDescription>
            </DialogHeader>
            <Textarea 
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
                placeholder="Describe what could be improved..."
                className="mt-2"
            />
            <DialogFooter>
                <Button variant="outline" onClick={() => setFeedbackMessage(null)}>
                    Cancel
                </Button>
                <Button onClick={handleNegativeFeedbackSubmit}>
                    Submit Feedback
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}