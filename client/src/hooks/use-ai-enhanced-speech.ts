import { useState, useEffect, useCallback } from 'react';
import { useSpeech } from './use-speech';
import { io, Socket } from 'socket.io-client';

// Define missing types locally
interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
  gender?: 'male' | 'female';
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'natural-female', name: 'Natural Female', lang: 'en-US', localService: true, gender: 'female' },
  { id: 'natural-male', name: 'Natural Male', lang: 'en-US', localService: true, gender: 'male' },
  { id: 'system-default', name: 'System Default', lang: 'en-US', localService: true }
];

export interface AIInsight {
  type: 'emphasis' | 'explanation' | 'cross_reference' | 'reflection_pause' | 'historical_context' | 'application';
  content: string;
  position?: number;
  confidence?: number;
  paragraph?: number;
  title?: string;
  relatedConcepts?: string[];
  difficulty?: 'easy' | 'intermediate' | 'advanced';
  importance?: 'low' | 'medium' | 'high';
}

export interface SmartReadingSettings {
  selectedVoice: string;
  rate: number;
  pitch: number;
  volume: number;
  intellectualLevel: 'beginner' | 'intermediate' | 'advanced' | 'scholar';
  enableSmartEmphasis: boolean;
  enableContextualExplanations: boolean;
  enableCrossReferences: boolean;
  enableReflectionPauses: boolean;
  enableHistoricalContext: boolean;
  enablePracticalApplications: boolean;
  enableAutoNavigation: boolean;
  autoNavigationDelay: number; // seconds to wait before auto-navigating
  limitInsightsToOne: boolean; // New: Limit to one insight unless requested
  autoGenerateInsights: boolean; // New: Control automatic insight generation
  useEdgeTTS: boolean; // New: Use premium Microsoft Edge neural voices
  edgeVoice?: string; // Selected Edge voice
}

export function useAIEnhancedSpeech(
  content: any[], 
  documentId?: number, 
  currentChapter?: number,
  onNavigateNext?: () => void,
  canNavigateNext?: boolean
) {
  const basicSpeech = useSpeech(content);
  // Edge TTS integration - commented out for now to avoid import issues
  // Will be enabled once Edge TTS hook is properly set up
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnectedToAI, setIsConnectedToAI] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [savedInsights, setSavedInsights] = useState<AIInsight[]>(() => {
    // Load saved insights from localStorage
    const saved = localStorage.getItem('aiVoiceReaderInsights');
    return saved ? JSON.parse(saved) : [];
  });
  const [hasAnalyzedCurrentContent, setHasAnalyzedCurrentContent] = useState(false);
  
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  
  // Auto navigation state
  const [autoNavigationCountdown, setAutoNavigationCountdown] = useState<number | null>(null);
  const [countdownIntervalRef, setCountdownIntervalRef] = useState<NodeJS.Timeout | null>(null);
  
  const [smartSettings, setSmartSettings] = useState<SmartReadingSettings>(() => {
    // Try to load settings from localStorage
    const savedSettings = localStorage.getItem('aiVoiceReaderSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        console.log('📱 Loaded saved settings:', parsed);
        return {
          selectedVoice: 'natural-female',
          rate: 0.9, // Slightly slower for more natural reading
          pitch: 1.0,
          volume: 0.9, // Slightly softer for comfort
          intellectualLevel: 'intermediate',
          enableSmartEmphasis: true,
          enableContextualExplanations: true,
          enableCrossReferences: true,
          enableReflectionPauses: false,
          enableHistoricalContext: true,
          enablePracticalApplications: true,
          enableAutoNavigation: false,
          autoNavigationDelay: 3,
          limitInsightsToOne: true, // Default: only one insight
          autoGenerateInsights: true, // Default: auto-generate insights
          useEdgeTTS: false, // Default: use system voices
          edgeVoice: 'en-US-AriaNeural', // Default Edge voice
          ...parsed
        };
      } catch (e) {
        console.warn('Failed to parse saved settings, using defaults');
      }
    }
    
    console.log('📱 Using default settings with natural voice enabled');
    return {
      selectedVoice: 'natural-female',
      rate: 0.9, // Slightly slower for more natural reading
      pitch: 1.0,
      volume: 0.9, // Slightly softer for comfort
      intellectualLevel: 'intermediate',
      enableSmartEmphasis: true,
      enableContextualExplanations: true,
      enableCrossReferences: true,
      enableReflectionPauses: false,
      enableHistoricalContext: true,
      enablePracticalApplications: true,
      enableAutoNavigation: false,
      autoNavigationDelay: 3,
      limitInsightsToOne: true, // Default: only one insight
      autoGenerateInsights: true, // Default: auto-generate insights
      useEdgeTTS: false, // Default: use system voices
      edgeVoice: 'en-US-AriaNeural', // Default Edge voice
    };
  });

  // Enhanced speak function with auto-navigation
  const speakWithAI = useCallback(async () => {
    console.log('🎤 Starting AI speech with auto-navigation:', {
      enableAutoNavigation: smartSettings.enableAutoNavigation,
      autoNavigationDelay: smartSettings.autoNavigationDelay,
      contentLength: content?.length
    });
    
    if (!window.speechSynthesis || !content || content.length === 0) return;

    // Only stop current speech if we're not already speaking our own content
    // This prevents interfering with other components' speech synthesis
    if (!window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    } else {
      console.log('🎤 Speech synthesis already active, not canceling');
    }

    // Create full text for speech synthesis with natural pausing
    const fullText = content.map((paragraph: any) => {
      let text = paragraph.text || '';
      
      // Add natural pauses for better readability
      text = text
        .replace(/\./g, '. ') // Pause after periods
        .replace(/,/g, ', ') // Brief pause after commas  
        .replace(/;/g, '; ') // Pause after semicolons
        .replace(/:/g, ': ') // Pause after colons
        .replace(/\?/g, '? ') // Pause after questions
        .replace(/!/g, '! ') // Pause after exclamations
        .replace(/\s+/g, ' ') // Clean up multiple spaces
        .trim();
      
      return text;
    }).join(' ... '); // Add longer pause between paragraphs
    
    console.log('📝 Enhanced text length:', fullText.length, 'characters');
    
    const utterance = new SpeechSynthesisUtterance(fullText);
    
    // Configure voice settings
    utterance.rate = smartSettings.rate;
    utterance.pitch = smartSettings.pitch;
    utterance.volume = smartSettings.volume;
    
    // Set voice if available using enhanced voice selection
    let voices = window.speechSynthesis.getVoices();
    
    // If no voices loaded yet, wait for them
    if (voices.length === 0) {
      console.log('🎵 Waiting for voices to load...');
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        console.log('🎵 Voices loaded:', voices.length);
      };
      // Use a timeout fallback
      setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
      }, 100);
    }
    
    // Log available voices for debugging
    if (voices.length > 0) {
      console.log('🎵 Available system voices:', voices.map(v => `${v.name} (${v.lang}, local: ${v.localService})`));
    } else {
      console.warn('🎵 No voices available yet');
    }
    
    if (voices.length > 0) {
      // Find the best voice using our enhanced selection algorithm
      const voiceOption = VOICE_OPTIONS.find(v => v.id === smartSettings.selectedVoice);
      let selectedVoice = null;
      
      if (voiceOption) {
        console.log('🎵 Looking for voice:', voiceOption.id, '(', voiceOption.name, ')');
        
        // Try exact name match first (skip for generic natural voices)
        if (!voiceOption.id.startsWith('natural-')) {
          selectedVoice = voices.find(voice => 
            voice.name.toLowerCase().includes(voiceOption.id.toLowerCase())
          );
          if (selectedVoice) {
            console.log('🎵 Found exact match:', selectedVoice.name);
          }
        }

        // If no exact match, use smart matching based on gender and quality
        if (!selectedVoice) {
          const matchingVoices = voices.filter(voice => {
            const langMatch = voice.lang.startsWith(voiceOption.lang.split('-')[0]);
            return langMatch;
          });

          // Score and select best voice
          const scoredVoices = matchingVoices.map(voice => {
            let score = 0;
            const voiceName = voice.name.toLowerCase();
            
            // Gender matching
            if (voiceOption.gender === 'female') {
              if (['samantha', 'susan', 'victoria', 'zira', 'hazel', 'cortana', 'eva'].some(name => voiceName.includes(name))) score += 10;
              if (voiceName.includes('female')) score += 8;
            } else {
              if (['david', 'mark', 'daniel', 'alex', 'george', 'ryan', 'richard'].some(name => voiceName.includes(name))) score += 10;
              if (voiceName.includes('male')) score += 8;
            }
            
            // Quality indicators
            if (voice.localService) score += 5;
            if (voiceName.includes('enhanced') || voiceName.includes('premium')) score += 3;
            if (voiceName.includes('neural') || voiceName.includes('natural')) score += 4;
            
            return { voice, score };
          });

          scoredVoices.sort((a, b) => b.score - a.score);
          selectedVoice = scoredVoices[0]?.voice;
          if (selectedVoice) {
            console.log('🎵 Found gender-matched voice:', selectedVoice.name, 'score:', scoredVoices[0].score);
          }
        }
      } else {
        console.log('🎵 Voice option not found for:', smartSettings.selectedVoice);
        console.log('🎵 Available options:', VOICE_OPTIONS.map(v => v.id));
        
        // Reset to default if voice option doesn't exist
        console.log('🎵 Resetting to default voice...');
        const updatedSettings = { ...smartSettings, selectedVoice: 'natural-female' };
        setSmartSettings(updatedSettings);
        localStorage.setItem('ai-enhanced-speech-settings', JSON.stringify(updatedSettings));
      }
      
      // Fallback to first available voice
      if (!selectedVoice) {
        selectedVoice = voices[0];
        console.log('🎵 Using fallback voice:', selectedVoice?.name);
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('🎵 Final voice selection:', selectedVoice.name, 'for requested:', smartSettings.selectedVoice);
      } else {
        console.warn('🎵 No voice available, using system default');
      }
    }

    utterance.onstart = () => {
      console.log('🎤 Speech started');
    };

    utterance.onend = () => {
      console.log('🎤 Speech ended');
      
      // Auto navigation to next chapter if enabled
      if (smartSettings.enableAutoNavigation && canNavigateNext && onNavigateNext) {
        console.log('🔄 Starting auto-navigation countdown');
        const initialCountdown = smartSettings.autoNavigationDelay;
        setAutoNavigationCountdown(initialCountdown);
        
        // Clear any existing countdown interval
        if (countdownIntervalRef) {
          clearInterval(countdownIntervalRef);
        }
        
        // Use a ref to track countdown value
        const countdownRef = { current: initialCountdown };
        
        const newCountdownInterval = setInterval(() => {
          countdownRef.current--;
          console.log('🔄 Countdown:', countdownRef.current);
          setAutoNavigationCountdown(countdownRef.current);
          
          if (countdownRef.current <= 0) {
            clearInterval(newCountdownInterval);
            setCountdownIntervalRef(null);
            setAutoNavigationCountdown(null);
            console.log('🔄 Auto-navigating to next chapter');
            onNavigateNext();
          }
        }, 1000);
        
        setCountdownIntervalRef(newCountdownInterval);
      }
    };

    utterance.onerror = (error) => {
      console.error('🎤 Speech error:', error);
      console.error('🎤 Error details:', {
        error: error.error,
        type: error.type,
        voice: utterance.voice?.name,
        text: utterance.text.substring(0, 100)
      });
      
      // Try to recover with default voice
      if (utterance.voice) {
        console.log('🎤 Attempting recovery with default voice...');
        utterance.voice = null;
        window.speechSynthesis.cancel();
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 100);
      }
    };

    setSpeechUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  }, [content, smartSettings]);

  // Stop speech
  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeechUtterance(null);
    setAutoNavigationCountdown(null);
    
    // Clear countdown interval
    if (countdownIntervalRef) {
      clearInterval(countdownIntervalRef);
      setCountdownIntervalRef(null);
    }
  }, [countdownIntervalRef]);

  // Pause/Resume speech
  const togglePlayback = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
      }
    } else {
      speakWithAI();
    }
  }, [speakWithAI]);

  // Initialize AI socket connection for voice analysis
  useEffect(() => {
    // Only create socket if we don't already have one
    if (socket && socket.connected) {
      console.log('AI Voice socket already connected, skipping initialization');
      return;
    }

    let isComponentMounted = true;

    const initAIConnection = () => {
      const aiSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        forceNew: false, // Prevent multiple connections
      });

      aiSocket.on('connect', () => {
        if (!isComponentMounted) return;
        console.log('AI Voice Analysis connected');
        setIsConnectedToAI(true);
        setSocket(aiSocket);
      });

      aiSocket.on('disconnect', () => {
        if (!isComponentMounted) return;
        console.log('AI Voice Analysis disconnected');
        setIsConnectedToAI(false);
      });

      // Handle AI analysis responses for voice reading
      aiSocket.on('textAnalysis', (data: any) => {
        if (!isComponentMounted) return;
        console.log('Received text analysis for voice:', data);
        processTextAnalysisForVoice(data);
      });

      aiSocket.on('studyInsight', (data: any) => {
        if (!isComponentMounted) return;
        console.log('Received study insight for voice:', data);
        processStudyInsightForVoice(data);
      });

      aiSocket.on('crossReference', (data: any) => {
        if (!isComponentMounted) return;
        console.log('Received cross reference for voice:', data);
        processCrossReferenceForVoice(data);
      });

      aiSocket.on('insightsGenerated', (data: { insights: any[] }) => {
        if (!isComponentMounted) return;
        console.log('Received generated insights for voice:', data);
        processGeneratedInsights(data.insights);
      });

      aiSocket.on('learningAdaptation', (data: any) => {
        if (!isComponentMounted) return;
        console.log('Received learning adaptation:', data);
        applyLearningAdaptations(data);
      });

      return aiSocket;
    };

    const aiSocket = initAIConnection();
    
    return () => {
      isComponentMounted = false;
      if (aiSocket && aiSocket.connected) {
        console.log('Cleaning up AI Voice socket connection');
        aiSocket.disconnect();
      }
    };
  }, []); // Empty dependency array to prevent re-initialization

  // Save insights to localStorage
  const saveInsights = useCallback((insights: AIInsight[]) => {
    const updatedSaved = [...savedInsights, ...insights];
    localStorage.setItem('aiVoiceReaderInsights', JSON.stringify(updatedSaved));
    setSavedInsights(updatedSaved);
  }, [savedInsights]);

  // Process different types of AI responses into voice insights
  const processTextAnalysisForVoice = useCallback((analysis: any) => {
    if (!smartSettings.autoGenerateInsights) {
      console.log('Auto-generate insights disabled, skipping analysis');
      return;
    }

    const insights: AIInsight[] = [];

    // Process key themes for emphasis (prioritize by importance)
    if (analysis.keyThemes) {
      const sortedThemes = analysis.keyThemes.sort((a: any, b: any) => b.importance - a.importance);
      const themesToProcess = smartSettings.limitInsightsToOne ? sortedThemes.slice(0, 1) : sortedThemes;
      
      themesToProcess.forEach((theme: any) => {
        insights.push({
          type: 'emphasis',
          content: `Key Theme: ${theme.topic} - ${theme.importance > 0.8 ? 'High importance' : 'Notable concept'}. Pay special attention to this key concept.`,
          position: theme.paragraph,
          paragraph: theme.paragraph,
          confidence: theme.importance,
          title: theme.topic,
          importance: theme.emphasis === 'high' ? 'high' : theme.emphasis === 'medium' ? 'medium' : 'low'
        });
      });
    }

    // Process complex concepts for explanations (only if no theme insights or not limited)
    if (analysis.complexConcepts && (!smartSettings.limitInsightsToOne || insights.length === 0)) {
      const complexConcepts = analysis.complexConcepts.filter((concept: any) => concept.needsExplanation);
      const conceptsToProcess = smartSettings.limitInsightsToOne ? complexConcepts.slice(0, 1) : complexConcepts;
      
      conceptsToProcess.forEach((concept: any) => {
        insights.push({
          type: 'explanation',
          content: `Complex Concept: "${concept.term}" - This ${concept.difficulty} concept may benefit from deeper reflection during reading.`,
          position: concept.paragraph,
          paragraph: concept.paragraph,
          confidence: 0.8,
          title: `Understanding: ${concept.term}`,
          difficulty: concept.difficulty,
          relatedConcepts: [concept.term]
        });
      });
    }

    // Process reading tips for reflection pauses (only if no other insights or not limited)
    if (analysis.readingTips && analysis.readingTips.pausePoints && (!smartSettings.limitInsightsToOne || insights.length === 0)) {
      const pausePointsToProcess = smartSettings.limitInsightsToOne ? 
        analysis.readingTips.pausePoints.slice(0, 1) : 
        analysis.readingTips.pausePoints;
        
      pausePointsToProcess.forEach((pausePoint: number) => {
        insights.push({
          type: 'reflection_pause',
          content: `Pause here for reflection. This passage contains important concepts that benefit from contemplation.`,
          position: pausePoint,
          paragraph: pausePoint,
          confidence: 0.7,
          title: 'Reflection Moment'
        });
      });
    }

    // Limit total insights if setting enabled
    const finalInsights = smartSettings.limitInsightsToOne ? insights.slice(0, 1) : insights.slice(0, 6);
    
    setAiInsights(prev => [...finalInsights, ...prev].slice(0, smartSettings.limitInsightsToOne ? 1 : 6));
    
    // Save insights to localStorage
    if (finalInsights.length > 0) {
      saveInsights(finalInsights);
    }
  }, [smartSettings.autoGenerateInsights, smartSettings.limitInsightsToOne, saveInsights]);

  const processStudyInsightForVoice = useCallback((insight: any) => {
    const voiceInsight: AIInsight = {
      type: 'explanation',
      content: insight.explanation,
      position: insight.paragraph,
      paragraph: insight.paragraph,
      confidence: 0.9,
      title: 'Study Insight',
      importance: insight.importance,
      relatedConcepts: insight.concepts || []
    };

    setAiInsights(prev => [voiceInsight, ...prev].slice(0, 6));
  }, []);

  const processCrossReferenceForVoice = useCallback((crossRef: any) => {
    const voiceInsight: AIInsight = {
      type: 'cross_reference',
      content: `Cross Reference: ${crossRef.title} - ${crossRef.connection}. This connection enhances understanding of the current passage.`,
      position: crossRef.paragraph,
      paragraph: crossRef.paragraph,
      confidence: 0.85,
      title: `See also: ${crossRef.title}`,
      importance: crossRef.relevance
    };

    setAiInsights(prev => [voiceInsight, ...prev].slice(0, 6));
  }, []);

  const processGeneratedInsights = useCallback((insights: any[]) => {
    const voiceInsights: AIInsight[] = insights.map(insight => {
      let type: AIInsight['type'] = 'explanation';
      
      switch(insight.type) {
        case 'theme':
          type = 'emphasis';
          break;
        case 'application':
          type = 'application';
          break;
        case 'historical':
          type = 'historical_context';
          break;
        case 'connection':
          type = 'cross_reference';
          break;
        default:
          type = 'explanation';
      }

      return {
        type,
        content: insight.content,
        title: insight.title,
        confidence: insight.relevanceScore || 0.8,
        relatedConcepts: insight.tags || [],
        importance: insight.relevanceScore > 0.8 ? 'high' : insight.relevanceScore > 0.6 ? 'medium' : 'low'
      };
    });

    setAiInsights(prev => [...voiceInsights, ...prev].slice(0, 6));
  }, []);

  const applyLearningAdaptations = useCallback((adaptations: any) => {
    if (adaptations.recommendedFeatures) {
      setSmartSettings(prev => ({
        ...prev,
        enableReflectionPauses: adaptations.recommendedFeatures.enableReflectionPauses ?? prev.enableReflectionPauses,
        enableContextualExplanations: adaptations.recommendedFeatures.enableDetailedExplanations ?? prev.enableContextualExplanations,
        selectedVoice: adaptations.recommendedFeatures.suggestedVoice ?? prev.selectedVoice,
        rate: adaptations.preferredSpeed ?? prev.rate
      }));
    }
  }, []);

  // Request AI analysis for voice reading
  const requestVoiceAnalysis = useCallback(async (force = false) => {
    if (!socket || !isConnectedToAI || !content || !documentId || isAnalyzing) {
      console.warn('Cannot request voice analysis: missing requirements or already analyzing');
      return;
    }

    // Skip if already analyzed current content (unless forced)
    if (!force && hasAnalyzedCurrentContent) {
      console.log('Content already analyzed, skipping duplicate analysis');
      return;
    }

    setIsAnalyzing(true);
    setHasAnalyzedCurrentContent(true);
    
    try {
      // Extract text content for analysis
      const textContent = content.map(item => {
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.content) return item.content;
        return '';
      }).join(' ');

      const analysisRequest = {
        documentId,
        content: textContent,
        currentChapter,
        userLevel: smartSettings.intellectualLevel,
        preferences: {
          enableCrossRefs: smartSettings.enableCrossReferences,
          enableExplanations: smartSettings.enableContextualExplanations,
          enableHistoricalContext: smartSettings.enableHistoricalContext,
          enableApplications: smartSettings.enablePracticalApplications
        }
      };

      console.log('🔍 Voice analysis request:', { documentId, currentChapter, userLevel: smartSettings.intellectualLevel });

      // Request only content-based analysis (single request)
      socket.emit('analyzeForVoiceReading', analysisRequest);

    } catch (error) {
      console.error('Voice analysis request failed:', error);
      setHasAnalyzedCurrentContent(false); // Reset on error
    } finally {
      setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [socket, isConnectedToAI, content, documentId, isAnalyzing, hasAnalyzedCurrentContent, currentChapter]); // Removed smartSettings dependencies

  // Function to generate insights after reading completion
  const generatePostReadingInsights = useCallback(async () => {
    if (!socket || !isConnectedToAI || !content || !documentId) {
      console.warn('Cannot generate post-reading insights: missing requirements');
      return;
    }

    try {
      // Extract text content for analysis
      const textContent = content.map(item => {
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.content) return item.content;
        return '';
      }).join(' ');

      const insightRequest = {
        documentId,
        content: textContent,
        currentChapter,
        userLevel: smartSettings.intellectualLevel,
        preferences: {
          enableCrossRefs: smartSettings.enableCrossReferences,
          enableExplanations: smartSettings.enableContextualExplanations,
          enableHistoricalContext: smartSettings.enableHistoricalContext,
          enableApplications: smartSettings.enablePracticalApplications
        },
        postReading: true
      };

      console.log('🎯 Generating post-reading insights for completed chapter');

      // Request insights after reading completion
      socket.emit('analyzeForVoiceReading', insightRequest);
      
    } catch (error) {
      console.error('Post-reading insight generation failed:', error);
    }
  }, [socket, isConnectedToAI, content, documentId, currentChapter]); // Removed smartSettings dependency

  // Auto-request analysis when content changes (with debouncing to prevent loops)
  useEffect(() => {
    if (!content || content.length === 0 || !documentId || !isConnectedToAI) {
      setHasAnalyzedCurrentContent(false);
      return;
    }

    // Reset analysis flag when content changes
    setHasAnalyzedCurrentContent(false);
    setAiInsights([]); // Clear old insights

    // Add debouncing to prevent rapid analysis requests
    const debounceTimer = setTimeout(() => {
      console.log('Auto-requesting voice analysis for content change');
      requestVoiceAnalysis(false); // Don't force, will check hasAnalyzed flag
    }, 3000); // 3 second debounce to reduce AI calls

    return () => clearTimeout(debounceTimer);
  }, [content, documentId, isConnectedToAI]); // Removed requestVoiceAnalysis from deps to prevent loop

  const updateSmartSettings = useCallback((updates: Partial<SmartReadingSettings>) => {
    setSmartSettings(prev => {
      const newSettings = { ...prev, ...updates };
      // Save to localStorage with timestamp
      const settingsWithTimestamp = {
        ...newSettings,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('aiVoiceReaderSettings', JSON.stringify(settingsWithTimestamp));
      console.log('💾 Settings saved:', newSettings);
      return newSettings;
    });
  }, []);

  // Function to request more insights manually
  const requestMoreInsights = useCallback(async () => {
    if (!socket || !isConnectedToAI || !content || !documentId) {
      console.warn('Cannot request more insights: missing requirements');
      return;
    }

    console.log('🎯 Manually requesting additional insights');
    
    // Temporarily disable limit for this request
    const originalLimit = smartSettings.limitInsightsToOne;
    setSmartSettings(prev => ({ ...prev, limitInsightsToOne: false }));
    
    try {
      await requestVoiceAnalysis(true); // Force new analysis
    } catch (error) {
      console.error('Failed to request more insights:', error);
    } finally {
      // Restore original limit setting
      setTimeout(() => {
        setSmartSettings(prev => ({ ...prev, limitInsightsToOne: originalLimit }));
      }, 2000);
    }
  }, [socket, isConnectedToAI, content, documentId, smartSettings.limitInsightsToOne, requestVoiceAnalysis]);

  // Function to clear saved insights
  const clearSavedInsights = useCallback(() => {
    localStorage.removeItem('aiVoiceReaderInsights');
    setSavedInsights([]);
    console.log('🗑️ Cleared saved insights');
  }, []);

  return {
    ...basicSpeech,
    isConnectedToAI,
    isAnalyzing,
    aiInsights,
    savedInsights, // New: Access to saved insights
    smartSettings,
    updateSmartSettings,
    speakWithAI,
    requestVoiceAnalysis,
    generatePostReadingInsights,
    requestMoreInsights, // New: Request additional insights manually
    clearSavedInsights, // New: Clear saved insights
    stopSpeech,
    togglePlayback,
    // Auto navigation functionality
    autoNavigationCountdown,
  };
} 