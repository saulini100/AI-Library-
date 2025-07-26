import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { aiLearningService, LearningData, AgentCommunication, FeedbackData } from "@/services/ai-learning-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Bot, 
  Send, 
  Brain, 
  Lightbulb, 
  BookOpen, 
  Activity,
  X,
  Minimize2,
  Maximize2,
  Quote,
  StickyNote,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useLanguageAwareAgents } from '@/hooks/use-language-aware-agents';
import { useToast } from '@/hooks/use-toast';
import AnnotationModal from '@/components/annotation-modal';
import AITypingIndicator from '@/components/ai-typing-indicator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
}

interface AgentStatus {
  name: string;
  isRunning: boolean;
  queueSize: number;
  description: string;
}

interface AIAgentChatProps {
  documentId?: number;
  chapter?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'aiAgentChatPanelPosition';
const MINIMIZED_KEY = 'aiAgentChatPanelMinimized';

export default function AIAgentChat({ documentId, chapter, isOpen, onToggle }: AIAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
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
  const [aiTypingAgent, setAiTypingAgent] = useState<'chat' | 'learning' | 'discussion' | 'summary' | 'navigation'>('chat');
  const [isSaving, setIsSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
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
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'positive' | 'negative'>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<ChatMessage | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  
  const {
    socket,
    isConnected,
    agentStatuses,
    systemStatus,
    sessionId,
    serverRestartDetected,
    sendMessage,
    requestAnalysis,
    insights
  } = useLanguageAwareAgents();

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
        console.log('💾 Loaded saved AI chat conversation');
      }
    }
  }, [sessionId, documentId]);

  // Handle global server restart detection
  useEffect(() => {
    if (serverRestartDetected) {
      console.log('🔄 Server restart detected in AI chat, clearing conversation');
      setMessages([]);
      localStorage.removeItem(getConversationKey());
    }
  }, [serverRestartDetected]);

  // Effect to notify user and update chat when chapter changes
  useEffect(() => {
    // On initial mount, just store the chapter number
    if (prevChapterRef.current === undefined) {
      prevChapterRef.current = chapter;
      return;
    }

    // If chapter has changed from the previous render
    if (prevChapterRef.current !== chapter && chapter !== undefined) {
      const newMessage: ChatMessage = {
        id: `msg-system-${Date.now()}`,
        role: 'system',
        content: `Context updated to Chapter ${chapter}.`,
        timestamp: new Date(),
        agent: 'System'
      };

      setMessages(prev => [...prev, newMessage]);

      toast({
        title: 'Context Updated',
        description: `The AI is now aware you are on chapter ${chapter}.`,
        duration: 3000,
      });

      // Update the ref to the current chapter for the next render
      prevChapterRef.current = chapter;
    }
  }, [chapter, toast]);

  // Conversation persistence functions
  const getConversationKey = () => {
    return `ai_chat_${documentId || 'general'}_${sessionId}`;
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
      console.error('Failed to save AI chat conversation:', error);
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
      console.error('Failed to load saved AI chat conversation:', error);
      return false; // Failed to load
    }
  };

  const clearConversation = () => {
    if (confirm('Are you sure you want to clear this conversation? This action cannot be undone.')) {
      setMessages([]);
      localStorage.removeItem(getConversationKey());
      toast({
        title: "Conversation Cleared",
        description: "Chat history has been cleared.",
        duration: 2000,
      });
    }
  };

  const exportConversation = () => {
    const conversationData = {
      title: `AI Chat: ${documentId ? `Document ${documentId}` : 'General'} ${chapter ? `- Chapter ${chapter}` : ''}`,
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
        sessionId
      }
    };

    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${documentId || 'general'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Conversation Exported",
      description: "Chat history has been exported as JSON file.",
      duration: 2000,
    });
  };

  useEffect(() => {
    if (socket) {
      socket.on('chatResponse', (data: { message: string; isExpertResponse?: boolean; expertise?: any }) => {
        const agent = data.isExpertResponse ? `${data.expertise?.domain} Expert (Level ${data.expertise?.expertiseLevel}/10)` : 'StudyAssistant';
        addMessage('assistant', data.message, agent);
      });

      socket.on('analysisCompleted', (data: any) => {
        addMessage('system', `Analysis completed for ${data.documentId}, Chapter ${data.chapter}`, 'TextAnalysis');
      });

      socket.on('insightsGenerated', (data: any) => {
        addMessage('system', `New insights generated: ${data.insights.length} insights available`, 'InsightGeneration');
      });
    }

    // Subscribe to agent communications
    const handleAgentCommunication = (communication: AgentCommunication) => {
      if (communication.type === 'share-learning') {
        // Use shared learning to enhance responses
        const relevantLearning = aiLearningService.getLearning(communication.data.term);
        if (relevantLearning.length > 0) {
          addMessage('system', `💡 Other AI agents learned about "${communication.data.term}": ${communication.data.content}`, communication.fromAgent);
        }
      } else if (communication.type === 'request-info') {
        // Check if we have relevant conversation history
        const relevantMessages = messages.filter(m => 
          m.content.toLowerCase().includes(communication.data.query.toLowerCase())
        );
        
        if (relevantMessages.length > 0) {
          aiLearningService.shareInsight(
            'chat',
            `Found ${relevantMessages.length} relevant conversation insights about "${communication.data.query}"`,
            { term: communication.data.query, conversationContext: true },
            extractKeyTerms(relevantMessages.map(m => m.content).join(' '))
          );
        }
      }
    };

    aiLearningService.subscribeAgent('chat', handleAgentCommunication);

    return () => {
      if (socket) {
        socket.off('chatResponse');
        socket.off('analysisCompleted');
        socket.off('insightsGenerated');
      }
      aiLearningService.unsubscribeAgent('chat');
    };
  }, [socket, messages]);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, agent?: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
      agent
    };
    setMessages(prev => [...prev, newMessage]);

    // Learn from conversations
    if (role === 'assistant' && content.length > 50) {
      const learningData: LearningData = {
        id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentSource: 'chat',
        type: 'conversation',
        term: 'conversation insight',
        content: content,
        context: {
          book: documentId ? 'current document' : undefined,
          chapter: chapter,
          timestamp: new Date().toISOString(),
          confidence: 0.7
        },
        relatedTerms: extractKeyTerms(content),
        sources: [],
        metadata: { agent, conversationContext: true }
      };
      
      aiLearningService.addLearning(learningData);
    }
  };

  // Extract key terms from conversation content
  const extractKeyTerms = (content: string): string[] => {
    // Use a more general approach to extract key terms
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    // Find words that appear multiple times or are longer than 4 characters
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 4 && !commonWords.has(cleanWord)) {
        wordCounts.set(cleanWord, (wordCounts.get(cleanWord) || 0) + 1);
      }
    });
    
    // Sort by frequency and return top terms
    const foundTerms = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    return foundTerms;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected || !sessionId) return;

    addMessage('user', inputMessage);
    
    // Start AI typing animation
    setIsAITyping(true);
    setAiTypingProgress(0);
    setAiTypingAgent('chat');
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setAiTypingProgress(prev => {
        if (prev >= 90) return prev; // Don't go to 100% until we get response
        return prev + Math.random() * 20;
      });
    }, 500);
    
    const context = {
      userId: 1,
      documentId,
      chapter
    };

    try {
      await sendMessage(inputMessage, context);
      setInputMessage('');
    } catch (error) {
      addMessage('system', 'Failed to send message. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setAiTypingProgress(100);
      setTimeout(() => {
        setIsAITyping(false);
        setAiTypingProgress(0);
      }, 800);
    }
  };

  const handleRequestAnalysis = async () => {
    if (!documentId || !isConnected) return;

    try {
      await requestAnalysis(documentId, chapter);
      addMessage('system', 'Analysis requested. You will be notified when complete.');
    } catch (error) {
      addMessage('system', 'Failed to request analysis.');
    }
  };

  // Add function to handle saving AI message as note
  const handleSaveMessageAsNote = (message: ChatMessage) => {
    setSelectedText(message.content);
    setAnnotationModalOpen(true);
  };

  const handleCloseAnnotationModal = () => {
    setAnnotationModalOpen(false);
    setSelectedText('');
  };

  // Text selection handling for AI messages
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) return;

    // Check if selection is within an AI message
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const messageElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement?.closest('[data-message-role="assistant"], [data-message-role="system"]')
      : (container as Element).closest('[data-message-role="assistant"], [data-message-role="system"]');

    if (messageElement) {
      // Auto-open modal with selected text
      setSelectedText(selectedText);
      setAnnotationModalOpen(true);
      // Clear the selection after opening modal
      setTimeout(() => {
        window.getSelection()?.removeAllRanges();
      }, 100);
    }
  };

  // Add event listener for mouse up (when selection is complete)
  useEffect(() => {
    const handleMouseUp = () => {
      // Don't handle text selection if currently dragging
      if (isDragging) return;
      
      // Small delay to ensure selection is complete
      setTimeout(handleTextSelection, 50);
    };

    if (isOpen) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isOpen, isDragging]);

  const getAgentIcon = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'textanalysisagent':
        return <Brain className="h-4 w-4" />;
      case 'insightgenerationagent':
        return <Lightbulb className="h-4 w-4" />;
      case 'studyassistantagent':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getStatusColor = (isRunning: boolean) => {
    return isRunning ? 'bg-green-500' : 'bg-red-500';
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

  const handleDoubleClick = () => {
    // Reset position to bottom-right corner
    const defaultX = window.innerWidth - 400 - 16; // width + padding
    const defaultY = window.innerHeight - (isMinimized ? 64 : 600) - 16; // height + padding
    setPosition({ 
      x: Math.max(20, defaultX), 
      y: Math.max(96, defaultY) // 96px to stay below top bar
    });
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

  const submitFeedback = async (message: ChatMessage, feedback: 'positive' | 'negative', reason?: string) => {
    if (feedbackSent[message.id]) return;

    const feedbackData: FeedbackData = {
      messageId: message.id,
      feedback,
      reason,
      documentId: documentId,
      chapter: chapter,
      userId: 1, // Example user ID
      agentId: message.agent,
      messageContent: message.content,
    };

    try {
      await aiLearningService.sendFeedback(feedbackData);
      setFeedbackSent(prev => ({ ...prev, [message.id]: feedback }));
      toast({
        title: 'Feedback Submitted',
        description: "Thank you for helping us improve!",
      });
    } catch (error) {
      toast({
        title: 'Feedback Error',
        description: 'Could not submit your feedback at this time.',
        variant: 'destructive',
      });
    } finally {
        setFeedbackMessage(null);
        setFeedbackReason('');
    }
  }

  const handleFeedback = async (message: ChatMessage, feedback: 'positive' | 'negative') => {
    if (feedback === 'negative') {
        setFeedbackMessage(message);
        return; 
    }
    submitFeedback(message, feedback);
  };

  const handleNegativeFeedbackSubmit = () => {
    if (feedbackMessage) {
        submitFeedback(feedbackMessage, 'negative', feedbackReason);
    }
  }

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
      <Card className={`w-96 transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'} shadow-2xl border-2 border-primary/20 ${
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
              <Bot className="h-5 w-5 text-primary" />
              AI Reading Companion
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
              
              {/* Server restart indicator */}
              {serverRestartDetected && (
                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mr-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Reset
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
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[520px]">
            <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                        <p className="text-sm">Welcome! Ask me anything about your reading.</p>
                        <p className="text-xs mt-2">I can provide insights, explanations, and study guidance.</p>
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
                                ? 'bg-primary text-primary-foreground hover:scale-[1.02] shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                : message.role === 'system'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 hover:scale-[1.01] insight-sparkle'
                                : 'bg-muted hover:bg-muted/80 hover:scale-[1.01] shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                            } ${
                              message.role === 'assistant' || message.role === 'system' ? 'cursor-text' : ''
                            }`}
                            data-message-id={message.id}
                            data-message-role={message.role}
                            data-agent={message.agent || 'AI Assistant'}
                          >
                            {message.agent && (
                              <div className="flex items-center justify-between gap-1 mb-1 text-xs opacity-70 message-header animate-in fade-in delay-200">
                                <div className="flex items-center gap-2">
                                  <div className={`relative agent-avatar ${
                                    message.role === 'system' ? 'agent-thinking' : 'agent-active'
                                  } transition-all duration-300`}>
                                    {getAgentIcon(message.agent)}
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
                                    title="Bad response"
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
                        agentType={aiTypingAgent}
                        currentProgress={aiTypingProgress}
                        estimatedTime={3}
                        customMessage="Analyzing your question..."
                      />
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />

                <div className="p-4 space-y-2">
                  {documentId && (
                    <Button
                      onClick={handleRequestAnalysis}
                      disabled={!isConnected}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Current Chapter
                    </Button>
                  )}
                  
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
                      placeholder={sessionId ? "Ask about your reading..." : "Connecting..."}
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
        documentId={-2}
        chapter={chapter || 1}
        documentTitle="AI Chat"
        paragraph={0}
      />

      <Dialog open={!!feedbackMessage} onOpenChange={(isOpen) => !isOpen && setFeedbackMessage(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Provide additional feedback</DialogTitle>
                <DialogDescription>
                    Your feedback is valuable. Please provide a reason to help us improve the AI.
                </DialogDescription>
            </DialogHeader>
            <Textarea 
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
                placeholder="e.g., This response was not relevant to my question."
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