import { useAgentSocket } from '@/contexts/AgentSocketContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Language-aware agent hook that automatically includes the current language
 * in all agent communications
 */
export function useLanguageAwareAgents() {
  const agentSocket = useAgentSocket();
  const { currentLanguage } = useLanguage();

  const sendMessage = async (message: string, context?: any): Promise<void> => {
    // Automatically include the current language in the context
    const languageAwareContext = {
      ...context,
      language: currentLanguage
    };

    console.log(`🌐 Sending message with language: ${currentLanguage}`);
    return agentSocket.sendMessage(message, languageAwareContext);
  };

  const requestAnalysis = async (documentId: number, chapter?: number, agentType?: string): Promise<void> => {
    return agentSocket.requestAnalysis(documentId, chapter, agentType);
  };

  // Helper function to send quiz requests with language context
  const sendQuizRequest = async (message: string, context?: any): Promise<void> => {
    if (!agentSocket.socket || !agentSocket.isConnected) {
      throw new Error('Not connected to agent system');
    }

    const languageAwareContext = {
      ...context,
      language: currentLanguage,
      sessionId: agentSocket.sessionId,
      userId: context?.userId || 2
    };

    console.log(`🎯 Sending quiz request in language: ${currentLanguage}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Quiz request timeout'));
      }, 60000); // 60 second timeout for quiz generation

      agentSocket.socket!.emit('quizMessage', { 
        message, 
        context: languageAwareContext 
      }, (response: any) => {
        clearTimeout(timeout);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  };

  // Helper function to send discussion messages with language context
  const sendDiscussionMessage = async (message: string, context?: any): Promise<void> => {
    if (!agentSocket.socket || !agentSocket.isConnected) {
      throw new Error('Not connected to agent system');
    }

    const payload = {
      message,
      sessionId: agentSocket.sessionId,
      userId: context?.userId || 2,
      documentId: context?.documentId,
      chapter: context?.chapter,
      mode: context?.mode,
      language: currentLanguage,
      conversationHistory: context?.conversationHistory || [] // Include conversation history
    };

    console.log(`💬 Sending discussion message with payload:`, {
      ...payload,
      conversationHistoryLength: payload.conversationHistory.length
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Discussion message timeout'));
      }, 180000); // 180 second timeout (3 minutes)

      agentSocket.socket!.emit('discussionMessage', payload, (response: any) => {
        clearTimeout(timeout);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  };

  return {
    // All original AgentSocket properties and methods
    ...agentSocket,
    
    // Language-aware overrides
    sendMessage,
    sendQuizRequest,
    sendDiscussionMessage,
    requestAnalysis,
    
    // Language context
    currentLanguage,
    
    // Helper properties
    isLanguageAware: true
  };
} 