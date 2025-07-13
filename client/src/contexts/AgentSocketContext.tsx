import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface AgentStatus {
  name: string;
  isRunning: boolean;
  queueSize: number;
  description: string;
}

interface SystemStatus {
  isRunning: boolean;
  startTime: Date | null;
  uptime: number;
  totalAgents: number;
  activeAgents: number;
  agents: AgentStatus[];
  memoryUsage: number;
  cpuUsage: number;
}

interface Insight {
  id: string;
  documentId: number;
  chapter: number;
  type: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  confidence: number;
  timestamp: string;
}

interface AgentSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  agentStatuses: AgentStatus[];
  systemStatus: SystemStatus | null;
  insights: Insight[];
  sessionId: string | null;
  serverRestartDetected: boolean;
  sendMessage: (message: string, context?: any) => Promise<void>;
  requestAnalysis: (documentId: number, chapter?: number, agentType?: string) => Promise<void>;
  refreshStatus: () => void;
  getConnectionStatus: () => {
    isConnected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    canReconnect: boolean;
  };
  reconnect: () => void;
}

export const AgentSocketContext = createContext<AgentSocketContextType | null>(null);

export function AgentSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [serverRestartDetected, setServerRestartDetected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const { toast } = useToast();
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once globally
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Initialize socket connection
    const initSocket = () => {
      // Prevent multiple socket connections
      if (socket && socket.connected) {
        console.log('Socket already connected, skipping initialization');
        return socket;
      }

      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        forceNew: false, // Prevent duplicate connections
      });

      newSocket.on('connect', () => {
        console.log('Connected to AI Agent system');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Request initial status
        newSocket.emit('requestAgentStatus');
        
        // Only create session if we don't already have one
        if (!sessionId) {
          // Create session for chat with timeout
          const sessionTimeout = setTimeout(() => {
            console.warn('Session creation timeout - proceeding without session');
          }, 5000);

          newSocket.emit('createSession', { userId: 2 }, (response: any) => {
            clearTimeout(sessionTimeout);
            if (response?.sessionId && !sessionId) { // Double check we don't already have one
              setSessionId(response.sessionId);
              console.log('Chat session created:', response.sessionId);
            } else if (response?.error) {
              console.error('Session creation failed:', response.error);
            } else {
              console.warn('Session creation - unexpected response:', response);
            }
          });
        } else {
          console.log('Session already exists:', sessionId);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from AI Agent system');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setIsConnected(false);
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      });

      // Handle agent status updates
      newSocket.on('agentStatus', (data: SystemStatus) => {
        setSystemStatus(data);
        setAgentStatuses(data.agents || []);
      });

      newSocket.on('systemStatus', (data: SystemStatus) => {
        setSystemStatus(data);
        setAgentStatuses(data.agents || []);
      });

      // Handle insights
      newSocket.on('insightsGenerated', (data: { insights: Insight[] }) => {
        setInsights(prev => [...data.insights, ...prev].slice(0, 20)); // Keep latest 20
      });

      // Handle analysis completion
      newSocket.on('analysisCompleted', (data: any) => {
        console.log('Analysis completed:', data);
      });

      // Handle task updates
      newSocket.on('taskCompleted', (data: any) => {
        console.log('Task completed:', data);
      });

      newSocket.on('taskFailed', (data: any) => {
        console.error('Task failed:', data);
      });

      // Handle agent logs
      newSocket.on('agentLog', (data: any) => {
        console.log(`[${data.agent}] ${data.message}`);
      });

      return newSocket;
    };

    // Only initialize if we don't have a socket or if it's disconnected
    if (!socket || !socket.connected) {
      const newSocket = initSocket();
      if (newSocket && newSocket !== socket) { // Only set if it's a new socket
        setSocket(newSocket);
      }
    }

    // Cleanup on unmount (but this should rarely happen since it's a global provider)
    return () => {
      if (socket && socket.connected) {
        console.log('Cleaning up global agent socket connection');
        socket.disconnect();
      }
    };
  }, []); // Empty dependency array to prevent re-initialization

  // Server restart detection
  useEffect(() => {
    if (sessionId) {
      const lastSessionId = localStorage.getItem('lastGlobalSessionId');
      if (lastSessionId && lastSessionId !== sessionId) {
        // Server restarted - notify all components
        console.log('🔄 Global server restart detected');
        setServerRestartDetected(true);
        
        // Clear only conversation data (not AI learning data)
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('ai_chat_') || key.includes('discussion_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        toast({
          title: "Server Restarted",
          description: "AI conversations have been reset due to server restart. Learning data is preserved.",
          duration: 5000,
        });
        
        // Reset the flag after a delay
        setTimeout(() => setServerRestartDetected(false), 5000);
      }
      localStorage.setItem('lastGlobalSessionId', sessionId);
    }
  }, [sessionId, toast]);

  // Send chat message to agents
  const sendMessage = async (message: string, context?: any): Promise<void> => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to agent system');
    }

    if (!sessionId) {
      throw new Error('Chat session not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 180000); // 180 second timeout (3 minutes)

      const messageContext = {
        ...context,
        sessionId: sessionId,
        userId: context?.userId || 2
      };

      socket.emit('chatMessage', { message, context: messageContext }, (response: any) => {
        clearTimeout(timeout);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  };

  // Request analysis for a document/chapter
  const requestAnalysis = async (documentId: number, chapter?: number, agentType?: string): Promise<void> => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to agent system');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Analysis request timeout'));
      }, 5000);

      socket.emit('requestAnalysis', { 
        documentId, 
        chapter, 
        agentType: agentType || 'text-analysis' 
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

  // Request agent status update
  const refreshStatus = (): void => {
    if (socket && isConnected) {
      socket.emit('requestAgentStatus');
    }
  };

  // Get connection status
  const getConnectionStatus = () => ({
    isConnected,
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts,
    canReconnect: reconnectAttempts.current < maxReconnectAttempts
  });

  // Manual reconnection
  const reconnect = (): void => {
    if (socket && reconnectAttempts.current < maxReconnectAttempts) {
      socket.connect();
    }
  };

  const value: AgentSocketContextType = {
    socket,
    isConnected,
    agentStatuses,
    systemStatus,
    insights,
    sessionId,
    serverRestartDetected,
    sendMessage,
    requestAnalysis,
    refreshStatus,
    getConnectionStatus,
    reconnect
  };

  return (
    <AgentSocketContext.Provider value={value}>
      {children}
    </AgentSocketContext.Provider>
  );
}

export function useAgentSocket(): AgentSocketContextType {
  const context = useContext(AgentSocketContext);
  if (!context) {
    throw new Error('useAgentSocket must be used within an AgentSocketProvider');
  }
  return context;
} 