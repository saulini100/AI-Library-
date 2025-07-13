import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  Quote,
  StickyNote,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  CheckCircle,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { useLanguageAwareAgents } from '@/hooks/use-language-aware-agents';
import { useToast } from '@/hooks/use-toast';
import AITypingIndicator from '@/components/ai-typing-indicator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  source: {
    documentId: number;
    chapter?: number;
    verse?: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  tags: string[];
  createdAt: Date;
  documentId: number;
  chapter?: number;
}

interface QuizMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  quiz?: Quiz;
}

interface AIQuizAgentProps {
  documentId?: number;
  chapter?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const POSITION_KEY = 'aiQuizAgentPanelPosition';
const MINIMIZED_KEY = 'aiQuizAgentPanelMinimized';

// Placeholder for QuizTakingInterface
const QuizTakingInterface: React.FC<{ quiz: Quiz }> = ({ quiz }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleAnswerSelect = (answer: string) => {
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const getScore = () => {
    return quiz.questions.reduce((score, question, index) => {
      return userAnswers[index] === question.correctAnswer ? score + 1 : score;
    }, 0);
  };

  if (showResults) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Quiz Results</h2>
        <p className="text-lg mb-4">You scored {getScore()} out of {quiz.questions.length}</p>
        <Button onClick={() => { setShowResults(false); setCurrentQuestionIndex(0); setUserAnswers({}); }}>
          Retake Quiz
        </Button>
        <div className="mt-6 space-y-4">
          {quiz.questions.map((q, i) => (
            <div key={q.id} className={`p-3 rounded-lg ${userAnswers[i] === q.correctAnswer ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
              <p className="font-semibold">{i + 1}. {q.question}</p>
              <p>Your answer: {userAnswers[i] || 'Not answered'}</p>
              <p>Correct answer: {q.correctAnswer}</p>
              <p className="text-sm mt-2"><em>{q.explanation}</em></p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div>Loading question...</div>;
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="mb-4">
        <p className="text-sm text-zinc-500">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
        <h2 className="text-lg font-semibold mt-1">{currentQuestion.question}</h2>
      </div>

      <div className="flex-1 space-y-3">
        {currentQuestion.options?.map((option, index) => (
          <div 
            key={index}
            onClick={() => handleAnswerSelect(option)}
            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors border-2 ${
              userAnswers[currentQuestionIndex] === option 
                ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500' 
                : 'bg-zinc-100 dark:bg-zinc-800 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
              userAnswers[currentQuestionIndex] === option ? 'bg-blue-500 border-blue-500' : 'border-zinc-400'
            }`}></div>
            <span>{option}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4">
        <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        <Button onClick={handleNext}>
          {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

// Placeholder for QuizHistoryView
const QuizHistoryView: React.FC<{ history: Quiz[], onTakeAgain: (quiz: Quiz) => void }> = ({ history, onTakeAgain }) => {
  return (
    <div className="space-y-4 h-full">
      <h3 className="text-lg font-semibold">Quiz History</h3>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <Clock size={48} />
          <p className="mt-4 text-center">No quiz history yet.</p>
          <p className="text-sm text-center mt-2">Complete some quizzes to see them here!</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {history.map(quiz => (
              <Card key={quiz.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{quiz.title}</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{quiz.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {quiz.questions.length} questions
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {quiz.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {quiz.estimatedTime} min
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onTakeAgain(quiz)}>
                    Take Again
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default function AIQuizAgent({ documentId, chapter, isOpen, onToggle }: AIQuizAgentProps) {
  const [messages, setMessages] = useState<QuizMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz' | 'history'>('chat');
  const [isAITyping, setIsAITyping] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizHistory, setQuizHistory] = useState<Quiz[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Drag state
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
      const defaultWidth = Math.min(window.innerWidth * 0.8, 1200);
      const defaultHeight = window.innerHeight * 0.8;
      const defaultX = (window.innerWidth - defaultWidth) / 2;
      const defaultY = (window.innerHeight - defaultHeight) / 2;
      return { x: defaultX, y: defaultY };
    }
    return { x: 100, y: 100 }; // Fallback for SSR
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const quizRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevChapterRef = useRef<number>();
  const { toast } = useToast();
  
  const {
    socket,
    isConnected,
    agentStatuses,
    systemStatus,
    sessionId,
    sendQuizRequest
  } = useLanguageAwareAgents();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for quiz generation responses
  useEffect(() => {
    if (!socket) return;

    const handleQuizGenerated = (data: any) => {
      setIsAITyping(false);
      setMessages(prev => {
        // Remove any previous 'Processing your request...' and error messages
        const filtered = prev.filter(m =>
          !(m.role === 'assistant' && (m.content === 'Processing your request...' || m.content.startsWith('Sorry, I encountered an error') || m.content.startsWith('I apologize, but the quiz generation is taking longer')))
        );

        if (data.success && data.quiz) {
          setCurrentQuiz(data.quiz);
          setActiveTab('quiz');
          const successMessage: QuizMessage = {
            id: `msg-success-${Date.now()}`,
            role: 'assistant',
            content: `✅ Quiz generated successfully!\n\n**${data.quiz.title}**\n${data.quiz.description}\n\n📊 **Quiz Details:**\n• ${data.quiz.questions.length} questions\n• ${data.quiz.difficulty} difficulty\n• Estimated time: ${data.quiz.estimatedTime} minutes\n• Tags: ${data.quiz.tags.join(', ')}\n\nClick on the "Quiz" tab to take the quiz!`,
            timestamp: new Date(),
            quiz: data.quiz
          };
          return [...filtered, successMessage];
        } else {
          // Remove any previous error messages before adding a new one
          const filteredNoError = filtered.filter(m => !(m.role === 'assistant' && m.content.startsWith('Sorry, I encountered an error')));
          const errorMessage: QuizMessage = {
            id: `msg-error-${Date.now()}`,
            role: 'assistant',
            content: data.message || 'Sorry, I encountered an error generating your quiz. Please try again with a different request.',
            timestamp: new Date(),
          };
          return [...filteredNoError, errorMessage];
        }
      });
    };

    socket.on('quizGenerated', handleQuizGenerated);

    return () => {
      socket.off('quizGenerated', handleQuizGenerated);
    };
  }, [socket]);

  // Add welcome message on mount and when panel opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: QuizMessage = {
        id: `msg-welcome-${Date.now()}`,
        role: 'assistant',
        content: `🎯 Welcome to the Quiz Agent! I can help you create personalized quizzes about the content you're reading.

**What I can do:**
• Generate quizzes from any chapter or document
• Create different question types (multiple choice, true/false, etc.)
• Adapt difficulty to your level
• Provide detailed explanations for answers
• Focus on the specific book's unique content and themes

**Try asking:**
• "Create a 10-question quiz about this chapter"
• "Make an easy quiz with multiple choice questions"
• "Generate a hard quiz with short answer questions"
• "Quiz me on the main characters and themes"

What kind of quiz would you like to create about this content?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]); // Trigger when panel opens or messages change

  // Handle chapter changes
  useEffect(() => {
    if (prevChapterRef.current !== chapter && chapter !== undefined) {
      const newMessage: QuizMessage = {
        id: `msg-system-${Date.now()}`,
        role: 'system',
        content: `Context updated to Chapter ${chapter}. I can now create quizzes about this specific chapter.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newMessage]);

      toast({
        title: 'Context Updated',
        description: `The Quiz Agent is now aware you are on chapter ${chapter}.`,
        duration: 3000,
      });

      prevChapterRef.current = chapter;
    }
  }, [chapter, toast]);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, quiz?: Quiz) => {
    const newMessage: QuizMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      quiz
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    addMessage('assistant', 'Processing your request...');
    setIsAITyping(true);

    try {
      // Use language-aware quiz request method
      await sendQuizRequest(userMessage, {
        documentId,
        chapter,
        userId: 2
      });

      // Set up timeout for response
      setTimeout(() => {
        if (isAITyping) {
          setIsAITyping(false);
          addMessage('assistant', 'I apologize, but the quiz generation is taking longer than expected. Please try again.');
        }
      }, 60000);

    } catch (error) {
      setIsAITyping(false);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      console.error('Quiz message error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (quizRef.current) {
      const rect = quizRef.current.getBoundingClientRect();
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !quizRef.current) return;
    
    const move = () => {
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      setPosition({ x, y });
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(move);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !quizRef.current) return;
    
    const move = () => {
      const touch = e.touches[0];
      const x = touch.clientX - dragOffset.x;
      const y = touch.clientY - dragOffset.y;
      setPosition({ x, y });
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(move);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      document.body.style.userSelect = 'auto';
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging]);

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    localStorage.setItem(MINIMIZED_KEY, String(!isMinimized));
  };

  const renderMessageContent = (content: string) => {
    // Split by newlines to handle them properly
    const parts = content.split(/(\n|\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
    
    return parts.map((part, index) => {
      if (part === '\n') {
        return <br key={index} />;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-zinc-200 dark:bg-zinc-700 rounded-sm px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      return <span key={index} className="break-words">{part}</span>;
    });
  };

  const agentStatus = agentStatuses.find(agent => agent.name === 'QuizAgent');

  if (!isOpen) return null;

  return (
    <div
      ref={quizRef}
      className={`fixed ${isMinimized ? 'bottom-4 right-4' : ''} z-50 flex items-center justify-center`}
      style={{
        left: isMinimized ? 'auto' : `${position.x}px`,
        top: isMinimized ? 'auto' : `${position.y}px`,
        touchAction: 'none'
      }}
    >
      <Card 
        className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out ${
          isMinimized 
          ? 'w-80 h-12' 
          : 'w-[80vw] max-w-[1200px] h-[80vh] flex flex-col'
        }`}
      >
        <CardHeader 
          className={`flex flex-row items-center justify-between p-2 pl-4 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-t-xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-zinc-600 dark:text-zinc-300"/>
            <CardTitle className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              AI Quiz Agent
            </CardTitle>
            {agentStatus && (
              <Badge variant={agentStatus.isRunning ? 'default' : 'secondary'}>
                {agentStatus.isRunning ? 'Active' : 'Idle'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={toggleMinimized}>
              <Minimize2 size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onToggle}>
              <X size={16} />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'quiz' | 'history')} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 rounded-none bg-zinc-100/80 dark:bg-zinc-800/80 flex-shrink-0">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="quiz" disabled={!currentQuiz}>Quiz</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Messages Area - Fixed height container */}
                <div className="flex-1 overflow-hidden" style={{ minHeight: '300px' }}>
                  <ScrollArea className="h-full w-full">
                    <div className="space-y-4 p-4 pb-2 min-h-full">
                      {messages.map((msg, index) => (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'assistant' && <Bot size={24} className="text-zinc-500 flex-shrink-0" />}
                          {msg.role === 'system' && <HelpCircle size={24} className="text-blue-500 flex-shrink-0" />}
                          
                          <div className={`
                            p-3 rounded-lg max-w-lg break-words overflow-hidden
                            ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}
                            ${msg.role === 'system' ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 w-full max-w-none' : ''}
                          `}>
                            <div className="text-sm overflow-hidden">{renderMessageContent(msg.content)}</div>
                            <p className="text-xs text-right mt-2 opacity-60">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {msg.role === 'user' && <div className="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 flex-shrink-0">U</div>}
                        </div>
                      ))}
                      {isAITyping && <AITypingIndicator isTyping={isAITyping} />}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Input Area - Fixed at bottom */}
                <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                  <div className="relative">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask a question or request a quiz..."
                      className="w-full pr-20 resize-none"
                      rows={2}
                    />
                    <Button 
                      className="absolute right-2 top-1/2 -translate-y-1/2" 
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || !isConnected || isAITyping}
                    >
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="quiz" className="flex-1 overflow-hidden p-4">
                {currentQuiz ? (
                  <div className="h-full overflow-auto">
                    <QuizTakingInterface quiz={currentQuiz} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <Zap size={48} />
                    <p className="mt-4">No quiz active.</p>
                    <p className="text-sm text-center mt-2">Generate a quiz from the chat tab to start.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-hidden p-4">
                <div className="h-full overflow-auto">
                  <QuizHistoryView history={quizHistory} onTakeAgain={(quiz) => {
                    setCurrentQuiz(quiz);
                    setActiveTab('quiz');
                  }}/>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
