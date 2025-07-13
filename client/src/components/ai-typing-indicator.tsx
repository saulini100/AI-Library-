import { useState, useEffect } from 'react';
import { Bot, Brain, MessageSquare, Users, Zap } from 'lucide-react';

interface TypingIndicatorProps {
  isTyping: boolean;
  agentType?: 'chat' | 'learning' | 'discussion' | 'summary' | 'navigation';
  estimatedTime?: number; // in seconds
  currentProgress?: number; // 0-100
  customMessage?: string;
}

const agentConfig = {
  chat: {
    icon: MessageSquare,
    name: 'AI Assistant',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  learning: {
    icon: Brain,
    name: 'Learning Agent',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  discussion: {
    icon: Users,
    name: 'Discussion Agent',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  summary: {
    icon: Zap,
    name: 'Summary Agent',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  navigation: {
    icon: Bot,
    name: 'Navigation Agent',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800'
  }
};

export default function AITypingIndicator({
  isTyping,
  agentType = 'chat',
  estimatedTime = 3,
  currentProgress = 0,
  customMessage
}: TypingIndicatorProps) {
  const [dots, setDots] = useState('');
  const [message, setMessage] = useState('');
  const [showProgress, setShowProgress] = useState(false);

  const config = agentConfig[agentType];
  const IconComponent = config.icon;

  // Animated typing messages
  const typingMessages = [
    'Thinking...',
    'Processing your request...',
    'Analyzing content...',
    'Generating response...',
    'Almost ready...',
    'Finalizing thoughts...'
  ];

  // Animate dots
  useEffect(() => {
    if (!isTyping) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTyping]);

  // Cycle through messages
  useEffect(() => {
    if (!isTyping) {
      setMessage('');
      setShowProgress(false);
      return;
    }

    setShowProgress(estimatedTime > 5); // Show progress for longer operations

    let messageIndex = 0;
    setMessage(customMessage || typingMessages[0]);

    if (!customMessage) {
      const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % typingMessages.length;
        setMessage(typingMessages[messageIndex]);
      }, 2000);

      return () => clearInterval(messageInterval);
    }
  }, [isTyping, customMessage, estimatedTime]);

  if (!isTyping) return null;

  return (
    <div className="flex items-start gap-3 p-4 animate-in slide-in-from-left duration-500">
      {/* Agent Avatar */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
        ${config.bgColor} ${config.borderColor} border-2 shadow-sm
        animate-in bounce-in duration-300
      `}>
        <IconComponent className={`w-5 h-5 ${config.color} animate-pulse`} />
      </div>

      {/* Typing Content */}
      <div className="flex-1 min-w-0">
        {/* Agent Name */}
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 animate-in fade-in delay-200">
          {config.name}
        </div>

        {/* Typing Bubble */}
        <div className={`
          inline-block max-w-sm p-3 rounded-2xl rounded-tl-sm
          ${config.bgColor} ${config.borderColor} border
          shadow-sm animate-in scale-in duration-300 delay-300
        `}>
          {/* Typing Animation */}
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                   style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                   style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                   style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
            </div>
            
            <div className={`text-sm ${config.color} font-medium animate-in fade-in delay-500`}>
              {message}{dots}
            </div>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="mt-3 animate-in slide-in-from-bottom delay-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-xs text-gray-500 dark:text-gray-500">{Math.round(currentProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
                    agentType === 'chat' ? 'from-blue-500 to-blue-600' :
                    agentType === 'learning' ? 'from-purple-500 to-purple-600' :
                    agentType === 'discussion' ? 'from-orange-500 to-orange-600' :
                    agentType === 'summary' ? 'from-yellow-500 to-yellow-600' :
                    'from-green-500 to-green-600'
                  }`}
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
              
              {estimatedTime > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 animate-in fade-in delay-1000">
                  Estimated: {estimatedTime}s remaining
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thinking Process Visualization */}
        <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-left delay-1000">
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-all duration-300 ${config.color.replace('text-', 'bg-')}`}
                style={{
                  animationDelay: `${i * 100}ms`,
                  animation: 'pulse 2s infinite ease-in-out'
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">
            AI is analyzing...
          </span>
        </div>
      </div>
    </div>
  );
} 