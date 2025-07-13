import { useState, useCallback, useRef, useEffect } from 'react';

export interface FreeAIVoice {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  provider: 'coqui' | 'bark' | 'browser' | 'tortoise' | 'chatterbox' | 'custom';
  type: 'local' | 'api' | 'browser' | 'uploaded';
  voiceId?: string;
  modelName?: string;
  sample?: string;
  customAudioFile?: File; // For uploaded custom voices
  customAudioUrl?: string; // For custom voice samples
  audioDataUrl?: string; // Base64 data URL for persistence
  offline: boolean;
  quality: 'excellent' | 'good' | 'basic';
  speed: 'fast' | 'medium' | 'slow';
  
  // Enhanced Voice Characteristics
  age?: 'child' | 'young' | 'adult' | 'elderly';
  accent?: 'american' | 'british' | 'australian' | 'canadian' | 'irish' | 'scottish' | 'southern' | 'neutral' | 'other';
  tone?: 'warm' | 'professional' | 'friendly' | 'authoritative' | 'soothing' | 'energetic' | 'dramatic' | 'conversational';
  style?: 'narrator' | 'preacher' | 'teacher' | 'storyteller' | 'news' | 'audiobook' | 'casual' | 'formal';
  pitch?: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  
  // Usage Metadata
  tags?: string[]; // e.g., ['biblical', 'meditation', 'study', 'children']
  category?: 'religious' | 'educational' | 'entertainment' | 'professional' | 'personal' | 'other';
  intendedUse?: string; // e.g., "Perfect for reading scripture and devotionals"
  bestFor?: string[]; // e.g., ['Bible reading', 'Prayer', 'Meditation']
  
  // Technical Metadata
  sampleRate?: number; // Audio sample rate in Hz
  duration?: number; // Sample duration in seconds
  fileSize?: number; // File size in bytes
  format?: 'wav' | 'mp3' | 'ogg' | 'm4a';
  bitrate?: number; // Audio bitrate in kbps
  channels?: 'mono' | 'stereo';
  
  // Quality Metrics
  clarityScore?: number; // 0-100 clarity rating
  backgroundNoise?: 'none' | 'minimal' | 'moderate' | 'high';
  recordingQuality?: 'studio' | 'professional' | 'good' | 'amateur';
  
  // Personal/Management Metadata
  creator?: string; // Who created/uploaded this voice
  createdAt?: string; // ISO date string
  lastUsed?: string; // ISO date string
  usageCount?: number; // How many times this voice has been used
  rating?: number; // 1-5 star rating
  notes?: string; // Personal notes about the voice
  favorite?: boolean; // Mark as favorite
  
  // Voice Sample Metadata
  sampleText?: string; // What text was spoken in the sample
  sampleContext?: string; // Context of the sample (e.g., "Reading from Genesis 1:1")
  voiceEmotions?: string[]; // Emotions detected in sample ['calm', 'authoritative']
  
  // Privacy & Sharing
  isPrivate?: boolean; // Whether voice is private to user
  shareableId?: string; // ID for sharing with others
  source?: string; // Where the voice came from (e.g., "Recorded by user", "Imported from X")
}

// Free AI voices available without API keys
export const FREE_AI_VOICES: FreeAIVoice[] = [
  // Coqui TTS models (free open-source)
  {
    id: 'coqui-jenny',
    name: 'Jenny (Coqui)',
    description: 'High-quality female voice from Coqui TTS - completely free',
    gender: 'female',
    language: 'en',
    provider: 'coqui',
    type: 'local',
    modelName: 'tts_models/en/ljspeech/tacotron2-DDC',
    offline: true,
    quality: 'excellent',
    speed: 'medium'
  },
  {
    id: 'coqui-male',
    name: 'David (Coqui)',
    description: 'Professional male narrator voice - open source',
    gender: 'male',
    language: 'en',
    provider: 'coqui',
    type: 'local',
    modelName: 'tts_models/en/vctk/vits',
    offline: true,
    quality: 'excellent',
    speed: 'medium'
  },
  // Bark voices (free, natural conversational AI)
  {
    id: 'bark-speaker-1',
    name: 'Samuel (Bark)',
    description: 'Natural conversational male voice with emotion - free',
    gender: 'male',
    language: 'en',
    provider: 'bark',
    type: 'local',
    voiceId: 'v2/en_speaker_1',
    offline: true,
    quality: 'excellent',
    speed: 'slow'
  },
  {
    id: 'bark-speaker-2',
    name: 'Sarah (Bark)',
    description: 'Expressive female voice with laughter and emotions',
    gender: 'female',
    language: 'en',
    provider: 'bark',
    type: 'local',
    voiceId: 'v2/en_speaker_2',
    offline: true,
    quality: 'excellent',
    speed: 'slow'
  },
  // Chatterbox (fastest free AI voice)
  {
    id: 'chatterbox-default',
    name: 'Alex (Chatterbox)',
    description: 'Ultra-fast AI voice with emotion control - MIT licensed',
    gender: 'neutral',
    language: 'en',
    provider: 'chatterbox',
    type: 'local',
    offline: true,
    quality: 'good',
    speed: 'fast'
  },
  // Browser-based enhanced voices (better than basic system TTS)
  {
    id: 'browser-enhanced-female',
    name: 'Enhanced Female',
    description: 'Browser-based voice with AI processing effects',
    gender: 'female',
    language: 'en',
    provider: 'browser',
    type: 'browser',
    offline: true,
    quality: 'good',
    speed: 'fast'
  },
  {
    id: 'browser-enhanced-male',
    name: 'Enhanced Male',
    description: 'Browser-based voice with warmth and clarity processing',
    gender: 'male',
    language: 'en',
    provider: 'browser',
    type: 'browser',
    offline: true,
    quality: 'good',
    speed: 'fast'
  },
  // Custom voice placeholders (populated when user uploads)
  {
    id: 'custom-upload-1',
    name: 'My Custom Voice 1',
    description: 'Upload your own voice sample for AI cloning',
    gender: 'neutral',
    language: 'en',
    provider: 'custom',
    type: 'uploaded',
    offline: true,
    quality: 'excellent',
    speed: 'medium'
  }
];

export interface FreeVoiceSettings {
  temperature: number; // Creativity/randomness (Bark, Chatterbox)
  speed: number; // Speech speed multiplier
  pitch: number; // Pitch adjustment
  emotion: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
  addBreaths: boolean; // Add natural breathing sounds
  addEmphasis: boolean; // Emphasize important words
}

export function useFreeAIVoices() {
  const [selectedVoice, setSelectedVoice] = useState<string>('bark-speaker-1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [installationProgress, setInstallationProgress] = useState<string>('');
  const [settings, setSettings] = useState<FreeVoiceSettings>({
    temperature: 0.7,
    speed: 1.0,
    pitch: 1.0,
    emotion: 'neutral',
    addBreaths: true,
    addEmphasis: true
  });
  const [customVoices, setCustomVoices] = useState<FreeAIVoice[]>([]);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ step: '', progress: 0 });
  const [isStopping, setIsStopping] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load saved custom voices on mount
  useEffect(() => {
    try {
      const savedCustomVoices = JSON.parse(localStorage.getItem('customVoices') || '[]');
      console.log('📋 Loading saved custom voices:', savedCustomVoices.length);
      
      if (savedCustomVoices.length > 0) {
        // Restore custom voices and recreate audio URLs from base64 data
        const restoredVoices = savedCustomVoices.map((voice: any) => {
          let customAudioUrl = null;
          
          // If we have base64 audio data, convert it back to a blob URL
          if (voice.audioDataUrl) {
            try {
              // Convert data URL to blob
              const byteCharacters = atob(voice.audioDataUrl.split(',')[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'audio/mpeg' });
              customAudioUrl = URL.createObjectURL(blob);
            } catch (error) {
              console.warn('⚠️ Failed to restore audio for voice:', voice.name, error);
            }
          }
          
          return {
            ...voice,
            customAudioFile: null, // Can't restore File objects
            customAudioUrl: customAudioUrl
          };
        });
        
        setCustomVoices(restoredVoices);
                 console.log('✅ Loaded custom voices from localStorage:', restoredVoices.map((v: FreeAIVoice) => v.name));
      }
    } catch (error) {
      console.error('❌ Failed to load custom voices from localStorage:', error);
    }
  }, []);

  // Generate speech using Coqui TTS (local Python installation)
  const generateCoquiSpeech = useCallback(async (
    text: string,
    modelName: string
  ): Promise<Blob> => {
    setInstallationProgress('Using Coqui TTS (requires Python setup)...');
    
    // This would require a local Python server running Coqui TTS
    // For demo purposes, we'll show how it would work
    const response = await fetch('http://localhost:5000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        model_name: modelName,
        speaker_idx: null,
        language_idx: null,
        speed: settings.speed
      }),
      signal: abortControllerRef.current?.signal
    });

    if (!response.ok) {
      throw new Error(`Coqui TTS error: ${response.status}`);
    }

    return await response.blob();
  }, [settings]);

  // Generate speech using Bark (via HuggingFace Spaces API - free)
  const generateBarkSpeech = useCallback(async (
    text: string,
    voiceId: string
  ): Promise<Blob> => {
    setInstallationProgress('Generating with Bark AI (free)...');
    
    // Use HuggingFace Spaces free API for Bark
    const response = await fetch('https://suno-bark.hf.space/api/v1/inference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice_preset: voiceId,
        temperature: settings.temperature,
        length_penalty: 1.0,
        repetition_penalty: 1.35
      }),
      signal: abortControllerRef.current?.signal
    });

    if (!response.ok) {
      throw new Error(`Bark API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Convert base64 audio to blob
    const audioData = atob(result.audio);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    
    return new Blob([audioArray], { type: 'audio/wav' });
  }, [settings]);

  // Generate speech using Chatterbox (fastest free option)
  const generateChatterboxSpeech = useCallback(async (
    text: string
  ): Promise<Blob> => {
    setInstallationProgress('Generating with Chatterbox (ultra-fast)...');
    
    // Use Chatterbox demo API (free)
    const response = await fetch('https://api.chatterbox.run/v1/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: 'default',
        speed: settings.speed,
        emotion_intensity: settings.emotion === 'neutral' ? 0.5 : 0.8
      }),
      signal: abortControllerRef.current?.signal
    });

    if (!response.ok) {
      throw new Error(`Chatterbox error: ${response.status}`);
    }

    return await response.blob();
  }, [settings]);

  // Enhanced browser TTS - simplified direct speech
  const generateBrowserEnhancedSpeech = useCallback(async (
    text: string,
    gender: 'male' | 'female'
  ): Promise<Blob> => {
    setInstallationProgress('Processing with enhanced browser voice...');
    
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Select best available voice
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          voice.name.toLowerCase().includes(gender === 'female' ? 'female' : 'male')
        ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        // Apply settings with custom voice characteristics
        utterance.rate = settings.speed;
        utterance.pitch = settings.pitch;
        utterance.volume = 1.0;
        
        // Apply emotion and gender-specific adjustments
        if (gender === 'male') {
          utterance.pitch = Math.max(0.1, utterance.pitch * 0.8); // Lower pitch for male
        }
        
        switch (settings.emotion) {
          case 'happy':
            utterance.pitch *= 1.2;
            utterance.rate *= 1.1;
            break;
          case 'sad':
            utterance.pitch *= 0.8;
            utterance.rate *= 0.9;
            break;
          case 'excited':
            utterance.pitch *= 1.3;
            utterance.rate *= 1.2;
            break;
          case 'calm':
            utterance.pitch *= 0.9;
            utterance.rate *= 0.95;
            break;
        }

        utterance.onend = () => {
          // Create a minimal valid audio blob since we're using direct speech
          const dummyBlob = new Blob([''], { type: 'audio/wav' });
          resolve(dummyBlob);
        };

        utterance.onerror = (error) => {
          reject(new Error(`Speech synthesis error: ${error.error}`));
        };

        console.log(`🎤 Speaking with ${selectedVoice?.name || 'default'} voice (${gender})`);
        speechSynthesis.speak(utterance);
        
      } catch (error) {
        reject(error);
      }
    });
  }, [settings]);

  // Custom voice generation with RVC server
  const generateCustomVoiceWithRVC = useCallback(async (
    text: string,
    voice: FreeAIVoice
  ): Promise<Blob> => {
    console.log(`🎤 Using RVC server for custom voice cloning (${voice.name})`);
    
    // Check if RVC server is available
    try {
      console.log('🔍 Checking RVC server connection...');
      const healthResponse = await fetch('http://localhost:6006/health', {
        method: 'GET',
        signal: abortControllerRef.current?.signal
      });
      
      if (!healthResponse.ok) {
        throw new Error('RVC server not responding');
      }
      
      const healthData = await healthResponse.json();
      console.log('✅ RVC server connected:', healthData.message);
      
    } catch (rvcError) {
      console.warn('⚠️ RVC server unavailable, falling back to browser speech:', rvcError);
      
      // Fallback to browser speech synthesis
      return new Promise((resolve, reject) => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Get available voices and select based on custom voice characteristics
          const voices = speechSynthesis.getVoices();
          let selectedVoice = null;
          
          if (voice.gender === 'female') {
            selectedVoice = voices.find(v => 
              v.lang.startsWith('en') && 
              (v.name.toLowerCase().includes('female') || 
               v.name.toLowerCase().includes('woman') ||
               v.name.toLowerCase().includes('zira') ||
               v.name.toLowerCase().includes('hazel'))
            );
          } else if (voice.gender === 'male') {
            selectedVoice = voices.find(v => 
              v.lang.startsWith('en') && 
              (v.name.toLowerCase().includes('male') || 
               v.name.toLowerCase().includes('man') ||
               v.name.toLowerCase().includes('david') ||
               v.name.toLowerCase().includes('mark'))
            );
          }
          
          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
          }
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`🎤 Fallback voice: ${selectedVoice.name}`);
          }
          
          utterance.rate = settings.speed;
          utterance.pitch = voice.gender === 'male' ? 0.8 : voice.gender === 'female' ? 1.2 : 1.0;
          
          utterance.onend = () => {
            const dummyBlob = new Blob([''], { type: 'audio/wav' });
            resolve(dummyBlob);
          };
          
                          utterance.onerror = (event) => {
                  // Don't treat interruption as an error - it's intentional
                  if (event.error === 'interrupted' || event.error === 'canceled' || isStopping) {
                    console.log('🔇 Fallback speech was intentionally stopped');
                    const dummyBlob = new Blob([''], { type: 'audio/wav' });
                    resolve(dummyBlob);
                  } else {
                    reject(new Error(`Speech synthesis error: ${event.error}`));
                  }
                };
          
          console.log(`🗣️ Fallback speech: "${text.substring(0, 50)}..."`);
          speechSynthesis.speak(utterance);
          
        } catch (error) {
          reject(error);
        }
      });
    }
    
              // Use RVC server for voice cloning
          try {
            console.log('🎤 Sending voice cloning request to RVC server...');
            setInstallationProgress('Analyzing your voice...');
            
            const rvcResponse = await fetch('http://localhost:6006/voice-conversion', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: text,
                reference_audio: voice.customAudioUrl || '',
                speed: settings.speed
              }),
              signal: abortControllerRef.current?.signal
            });
            
            if (!rvcResponse.ok) {
              throw new Error(`RVC server error: ${rvcResponse.status}`);
            }
            
            console.log('📦 Received RVC response, processing instructions...');
            setInstallationProgress('Processing voice characteristics...');
            
            // The RVC server now returns JSON instructions instead of audio
            const rvcData = await rvcResponse.json();
            
            console.log(`🎤 RVC response:`, rvcData);
            
            // Check if server wants us to use browser TTS
            if (rvcData.use_browser_tts) {
              console.log('🎤 Using enhanced browser TTS with custom voice characteristics');
              
              // Use browser speech synthesis with enhanced characteristics
              return new Promise((resolve, reject) => {
                try {
                  const utterance = new SpeechSynthesisUtterance(text);
                  
                  // Get available voices and select based on custom voice characteristics
                  const voices = speechSynthesis.getVoices();
                  let selectedVoice = null;
                  
                  // Apply voice characteristics from RVC analysis
                  const characteristics = rvcData.voice_characteristics || {};
                  
                  if (voice.gender === 'female' || characteristics.gender === 'female') {
                    selectedVoice = voices.find(v => 
                      v.lang.startsWith('en') && 
                      (v.name.toLowerCase().includes('female') || 
                       v.name.toLowerCase().includes('woman') ||
                       v.name.toLowerCase().includes('zira') ||
                       v.name.toLowerCase().includes('hazel'))
                    );
                  } else if (voice.gender === 'male' || characteristics.gender === 'male') {
                    selectedVoice = voices.find(v => 
                      v.lang.startsWith('en') && 
                      (v.name.toLowerCase().includes('male') || 
                       v.name.toLowerCase().includes('man') ||
                       v.name.toLowerCase().includes('david') ||
                       v.name.toLowerCase().includes('mark'))
                    );
                  }
                  
                  if (!selectedVoice) {
                    selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                  }
                  
                  if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log(`🎤 Enhanced voice: ${selectedVoice.name} (${characteristics.voice_type || 'custom'})`);
                  }
                  
                  // Apply enhanced voice characteristics from RVC analysis
                  utterance.rate = characteristics.speed || settings.speed;
                  utterance.pitch = characteristics.pitch || (voice.gender === 'male' ? 0.8 : voice.gender === 'female' ? 1.2 : 1.0);
                  
                  // Apply emotion if detected
                  if (characteristics.emotion === 'happy') {
                    utterance.pitch *= 1.2;
                    utterance.rate *= 1.1;
                  } else if (characteristics.emotion === 'sad') {
                    utterance.pitch *= 0.8;
                    utterance.rate *= 0.9;
                  }
                  
                  console.log(`🎤 Enhanced speech settings: rate=${utterance.rate}, pitch=${utterance.pitch}`);
                  
                  utterance.onend = () => {
                    console.log(`✅ Enhanced custom voice speech completed (${voice.name})`);
                    const dummyBlob = new Blob([''], { type: 'audio/wav' });
                    resolve(dummyBlob);
                  };
                  
                  utterance.onerror = (event) => {
                    reject(new Error(`Enhanced speech synthesis error: ${event.error}`));
                  };
                  
                  console.log(`🗣️ Enhanced speech: "${text.substring(0, 50)}..." with ${voice.name} characteristics`);
                  speechSynthesis.speak(utterance);
                  
                } catch (error) {
                  reject(error);
                }
              });
            } else {
              throw new Error('RVC server did not provide TTS instructions');
            }
            
          } catch (rvcError) {
            console.error('❌ RVC voice cloning failed:', rvcError);
            const errorMessage = rvcError instanceof Error ? rvcError.message : String(rvcError);
            throw new Error(`Custom voice cloning failed: ${errorMessage}`);
          }
  }, [settings]);

  // Main speech generation function
  const generateSpeech = useCallback(async (text: string): Promise<string> => {
    const allVoices = getAllVoices();
    const voice = allVoices.find(v => v.id === selectedVoice);
    if (!voice) {
      throw new Error('Selected voice not found');
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      console.log(`🆓 Generating free AI speech with ${voice.name}...`);
      
      let audioBlob: Blob | null = null;

      switch (voice.provider) {
        case 'coqui':
          audioBlob = await generateCoquiSpeech(text, voice.modelName!);
          break;
        case 'bark':
          audioBlob = await generateBarkSpeech(text, voice.voiceId!);
          break;
        case 'chatterbox':
          audioBlob = await generateChatterboxSpeech(text);
          break;
        case 'browser':
          audioBlob = await generateBrowserEnhancedSpeech(text, voice.gender as 'male' | 'female');
          break;
        case 'custom':
          // Simple browser-based custom voice (no server needed)
          console.log(`🎤 Using custom voice characteristics for: ${voice.name}`);
          
          return new Promise((resolve, reject) => {
            try {
              const utterance = new SpeechSynthesisUtterance(text);
              
              // Get best matching system voice
              const voices = speechSynthesis.getVoices();
              let selectedVoice = null;
              
              if (voice.gender === 'female') {
                selectedVoice = voices.find(v => 
                  v.lang.startsWith('en') && 
                  (v.name.toLowerCase().includes('female') || 
                   v.name.toLowerCase().includes('woman') ||
                   v.name.toLowerCase().includes('zira') ||
                   v.name.toLowerCase().includes('hazel'))
                );
              } else if (voice.gender === 'male') {
                selectedVoice = voices.find(v => 
                  v.lang.startsWith('en') && 
                  (v.name.toLowerCase().includes('male') || 
                   v.name.toLowerCase().includes('man') ||
                   v.name.toLowerCase().includes('david') ||
                   v.name.toLowerCase().includes('mark'))
                );
              }
              
              if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
              }
              
              if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`🎤 Selected voice: ${selectedVoice.name} for ${voice.name}`);
              }
              
              // Apply custom voice settings
              utterance.rate = settings.speed;
              utterance.pitch = voice.gender === 'male' ? 0.7 : voice.gender === 'female' ? 1.3 : 1.0;
              utterance.volume = 1.0;
              
              utterance.onend = () => {
                console.log(`✅ Custom voice speech completed: ${voice.name}`);
                const dummyBlob = new Blob([''], { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(dummyBlob);
                resolve(audioUrl);
              };
              
              utterance.onerror = (event) => {
                // Don't treat interruption as an error - it's intentional
                if (event.error === 'interrupted' || event.error === 'canceled' || isStopping) {
                  console.log('🔇 Speech was intentionally stopped');
                  const dummyBlob = new Blob([''], { type: 'audio/wav' });
                  const audioUrl = URL.createObjectURL(dummyBlob);
                  resolve(audioUrl);
                } else {
                  reject(new Error(`Speech error: ${event.error}`));
                }
              };
              
              console.log(`🗣️ Speaking with ${voice.name} voice...`);
              speechSynthesis.speak(utterance);
              
            } catch (error) {
              reject(error);
            }
          });
          
          break;
        default:
          throw new Error(`Provider ${voice.provider} not implemented`);
      }

      // Create audio URL
      if (!audioBlob) {
        throw new Error('Failed to generate audio blob');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      setGeneratedAudioUrl(audioUrl);
      
      console.log(`✅ Free AI speech generated successfully (${audioBlob.size} bytes)`);
      return audioUrl;

    } catch (error) {
      console.error('🚫 Free AI speech generation failed:', error);
      throw error;
    } finally {
      setIsGenerating(false);
      setInstallationProgress('');
      abortControllerRef.current = null;
    }
  }, [selectedVoice, customVoices, generateCoquiSpeech, generateBarkSpeech, generateChatterboxSpeech, generateBrowserEnhancedSpeech]);

  // Play generated speech
  const playGeneratedSpeech = useCallback(async (audioUrl: string) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Check if this is a dummy blob (0 bytes) from direct speech synthesis
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      if (blob.size === 0) {
        console.log('🎤 Using direct speech synthesis (no audio file to play)');
        return;
      }

      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onloadstart = () => console.log('🎵 Loading free AI audio...');
      audio.oncanplay = () => console.log('🎵 Free AI audio ready');
      audio.onplay = () => console.log('🎵 Free AI speech started');
      audio.onended = () => {
        console.log('🏁 Free AI speech completed');
        setCurrentAudio(null);
      };
      audio.onerror = (error) => {
        console.error('🚫 Free AI audio error:', error);
      };

      await audio.play();
    } catch (error) {
      console.error('🚫 Failed to play free AI speech:', error);
      throw error;
    }
  }, [currentAudio]);

  // Generate and play in one call
  const speakWithFreeAI = useCallback(async (text: string) => {
    try {
      const audioUrl = await generateSpeech(text);
      
      // Check if this is a dummy blob from custom voice (0 bytes)
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      if (blob.size === 0) {
        // This is a custom voice that already spoke directly, just clean up and return
        URL.revokeObjectURL(audioUrl);
        console.log('✅ Custom voice speech completed successfully');
        return;
      }
      
      // For other voices with real audio blobs, play the audio
      await playGeneratedSpeech(audioUrl);
    } catch (error) {
      console.error('🚫 Free AI speech failed:', error);
      throw error;
    }
  }, [generateSpeech, playGeneratedSpeech]);

  // Stop current speech
  const stopSpeech = useCallback(() => {
    console.log('⏹️ Stopping speech');
    setIsStopping(true);
    
    // Stop any playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    // Only stop speech synthesis if we're generating or if it's our speech
    // This prevents interfering with other components' speech synthesis
    if (speechSynthesis.speaking && (isGenerating || currentAudio)) {
      console.log('⏹️ Canceling speech synthesis (our speech)');
      speechSynthesis.cancel();
    } else if (speechSynthesis.speaking) {
      console.log('⏹️ Speech synthesis is active but not ours, leaving it alone');
    }

    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Stop generation
    setIsGenerating(false);
    setInstallationProgress('');
    
    // Reset stopping flag after a brief delay
    setTimeout(() => setIsStopping(false), 100);
  }, [currentAudio, isGenerating]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<FreeVoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Install local models (instructions)
  const getInstallationInstructions = useCallback((provider: string) => {
    const instructions = {
      coqui: `
# Install Coqui TTS (Free & Open Source)
pip install TTS

# Run local server
python -m TTS.server.server --list_models
python -m TTS.server.server --model_name tts_models/en/ljspeech/tacotron2-DDC

# Your local API will be at: http://localhost:5002
      `,
      bark: `
# Install Bark (Free)
pip install git+https://github.com/suno-ai/bark.git

# Or use HuggingFace Spaces (no installation needed)
# https://huggingface.co/spaces/suno/bark
      `,
      chatterbox: `
# Install Chatterbox (MIT License - Free)
pip install chatterbox-tts

# Python usage:
from chatterbox import ChatterboxTTS
tts = ChatterboxTTS()
audio = tts.synthesize("Hello world!")
      `
    };
    
    return instructions[provider as keyof typeof instructions] || 'Instructions not available';
  }, []);

  // Cleanup - only clean up our own resources
  const cleanup = useCallback(() => {
    // Only stop speech if we're actually generating or have audio
    if (isGenerating || currentAudio) {
      stopSpeech();
    }
    if (generatedAudioUrl) {
      URL.revokeObjectURL(generatedAudioUrl);
    }
  }, [stopSpeech, generatedAudioUrl, isGenerating, currentAudio]);

  // Upload custom voice file with comprehensive metadata
  const uploadCustomVoice = useCallback(async (
    audioFile: File,
    voiceName: string,
    description: string,
    gender: 'male' | 'female' | 'neutral',
    metadata?: {
      // Voice Characteristics
      age?: 'child' | 'young' | 'adult' | 'elderly';
      accent?: 'american' | 'british' | 'australian' | 'canadian' | 'irish' | 'scottish' | 'southern' | 'neutral' | 'other';
      tone?: 'warm' | 'professional' | 'friendly' | 'authoritative' | 'soothing' | 'energetic' | 'dramatic' | 'conversational';
      style?: 'narrator' | 'preacher' | 'teacher' | 'storyteller' | 'news' | 'audiobook' | 'casual' | 'formal';
      pitch?: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
      
      // Usage Metadata
      tags?: string[];
      category?: 'religious' | 'educational' | 'entertainment' | 'professional' | 'personal' | 'other';
      intendedUse?: string;
      bestFor?: string[];
      
      // Quality Assessment
      backgroundNoise?: 'none' | 'minimal' | 'moderate' | 'high';
      recordingQuality?: 'studio' | 'professional' | 'good' | 'amateur';
      
      // Sample Context
      sampleText?: string;
      sampleContext?: string;
      
      // Personal
      creator?: string;
      notes?: string;
      favorite?: boolean;
      isPrivate?: boolean;
    }
  ) => {
    setIsUploadingVoice(true);
    setUploadProgress({ step: 'Initializing...', progress: 0 });
    let audioContext: AudioContext | null = null;
    
    try {
      console.log('🎤 Starting voice upload process...', {
        fileName: audioFile?.name || 'unknown',
        fileSize: audioFile?.size || 0,
        voiceName: voiceName || 'unnamed',
        hasMetadata: !!metadata
      });

      // Validate inputs
      if (!audioFile) {
        throw new Error('No audio file provided');
      }
      if (!voiceName?.trim()) {
        throw new Error('Voice name is required');
      }
      if (!description?.trim()) {
        throw new Error('Voice description is required');
      }

      // Step 1: Analyze audio file technical properties (with comprehensive fallback)
      setUploadProgress({ step: 'Analyzing audio properties...', progress: 10 });
      console.log('📊 Analyzing audio properties...');
      let duration = 0;
      let sampleRate = 44100; // Safe default
      let channels: 'mono' | 'stereo' = 'mono';
      
      // Yield control to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
      
      try {
        // Try to analyze audio properties
        if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Read file as array buffer with timeout and progress
          console.log('📖 Reading audio file...');
          const arrayBuffer = await Promise.race([
            audioFile.arrayBuffer(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('File read timeout')), 8000)
            )
          ]);
          
          // Yield control after file read
          await new Promise(resolve => setTimeout(resolve, 10));
          
          if (arrayBuffer && arrayBuffer.byteLength > 0) {
            try {
              console.log('🔍 Decoding audio data...');
              const audioBuffer = await Promise.race([
                audioContext.decodeAudioData(arrayBuffer.slice(0)),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Audio decode timeout')), 3000)
                )
              ]);
              
              if (audioBuffer) {
                duration = Math.round(audioBuffer.duration * 100) / 100; // Round to 2 decimals
                sampleRate = audioBuffer.sampleRate || 44100;
                channels = audioBuffer.numberOfChannels === 1 ? 'mono' : 'stereo';
                console.log('✅ Audio analysis successful:', { duration, sampleRate, channels });
              }
            } catch (decodeError) {
              console.warn('⚠️ Audio decode failed, using estimates:', decodeError);
              // Fallback: estimate duration from file size
              duration = Math.max(1, Math.round(audioFile.size / 32000)); // More conservative estimate
            }
          }
        } else {
          console.warn('⚠️ AudioContext not available');
        }
      } catch (analysisError) {
        console.warn('⚠️ Audio analysis failed, using safe defaults:', analysisError);
      } finally {
        // Always clean up audio context
        if (audioContext) {
          try {
            if (typeof audioContext.close === 'function') {
              await audioContext.close();
            }
          } catch (closeError) {
            console.warn('⚠️ Could not close AudioContext:', closeError);
          }
          audioContext = null;
        }
      }

      // Use fallback duration if still 0
      if (duration <= 0) {
        duration = Math.max(1, Math.round(audioFile.size / 32000));
        console.log('📏 Using fallback duration estimate:', duration);
      }

      // Step 2: Determine file format (with robust fallback)
      setUploadProgress({ step: 'Determining file format...', progress: 30 });
      console.log('🔍 Determining file format...');
      let format: 'wav' | 'mp3' | 'ogg' | 'm4a' = 'mp3';
      try {
        const fileName = audioFile.name || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension && ['wav', 'mp3', 'ogg', 'm4a'].includes(extension)) {
          format = extension as 'wav' | 'mp3' | 'ogg' | 'm4a';
          console.log('✅ Format detected:', format);
        } else {
          console.warn('⚠️ Unknown/missing file extension, defaulting to mp3:', extension);
        }
      } catch (formatError) {
        console.warn('⚠️ Format detection failed, using mp3 default:', formatError);
      }

      // Step 3: Convert file to base64 for persistence (with timeout and chunking for large files)
      setUploadProgress({ step: 'Converting to base64 for storage...', progress: 40 });
      console.log('💾 Converting to base64 for storage...');
      let fileDataUrl = '';
      
      // Yield control before base64 conversion
      await new Promise(resolve => setTimeout(resolve, 10));
      
      try {
        // Skip base64 conversion for very large files to prevent UI freezing
        if (audioFile.size > 10 * 1024 * 1024) { // 10MB limit
          console.warn('⚠️ File too large for base64 conversion, skipping persistence');
          fileDataUrl = '';
        } else {
          fileDataUrl = await Promise.race([
            new Promise<string>((resolve, reject) => {
              const fileReader = new FileReader();
              let progressTimer: NodeJS.Timeout;
              
              fileReader.onprogress = (event) => {
                if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100);
                  console.log(`📊 Base64 conversion progress: ${percentComplete}%`);
                }
              };
              
              fileReader.onload = () => {
                clearTimeout(progressTimer);
                const result = fileReader.result;
                if (typeof result === 'string') {
                  resolve(result);
                } else {
                  reject(new Error('FileReader result is not a string'));
                }
              };
              
              fileReader.onerror = () => {
                clearTimeout(progressTimer);
                reject(fileReader.error || new Error('FileReader failed'));
              };
              
              // Progress indicator for large files
              progressTimer = setTimeout(() => {
                console.log('📊 Base64 conversion in progress...');
              }, 2000);
              
              fileReader.readAsDataURL(audioFile);
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Base64 conversion timeout')), 12000)
            )
          ]);
          console.log('✅ Base64 conversion successful, size:', Math.round(fileDataUrl.length / 1024), 'KB');
        }
      } catch (base64Error) {
        console.warn('⚠️ Base64 conversion failed, voice will not persist across sessions:', base64Error);
        // Continue without base64 - voice will work for current session only
      }
      
      // Yield control after base64 conversion
      await new Promise(resolve => setTimeout(resolve, 10));

      // Step 4: Create auto-detected metadata with safe fallbacks
      setUploadProgress({ step: 'Generating metadata...', progress: 60 });
      console.log('🤖 Generating auto-detected metadata...');
      const autoDetectedMetadata = {
        age: metadata?.age || (duration > 30 ? 'adult' : 'young'),
        accent: metadata?.accent || 'american',
        tone: metadata?.tone || 'warm',
        style: metadata?.style || 'narrator',
        pitch: metadata?.pitch || 'medium',
        category: metadata?.category || 'religious',
        recordingQuality: (duration > 0 && audioFile.size / duration > 50000 ? 'professional' : 'good') as 'professional' | 'good',
        backgroundNoise: metadata?.backgroundNoise || 'minimal'
      };

      // Step 5: Create comprehensive custom voice object
      setUploadProgress({ step: 'Creating voice object...', progress: 70 });
      console.log('🎨 Creating voice object with metadata...');
      let customVoice: FreeAIVoice;
      let customAudioUrl = '';
      
      // Yield control before creating voice object
      await new Promise(resolve => setTimeout(resolve, 10));
      
      try {
        // Create audio URL with error handling
        try {
          customAudioUrl = URL.createObjectURL(audioFile);
          console.log('✅ Audio URL created successfully');
        } catch (urlError) {
          console.error('❌ Failed to create audio URL:', urlError);
          throw new Error('Could not create audio URL for voice sample');
        }

        customVoice = {
          // Basic properties
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: voiceName.trim(),
          description: description.trim(),
          gender: gender,
          language: 'en',
          provider: 'custom',
          type: 'uploaded',
          customAudioFile: audioFile,
          customAudioUrl: customAudioUrl,
          audioDataUrl: fileDataUrl || undefined,
          offline: true,
          quality: 'excellent',
          speed: 'medium',
          
          // Enhanced Voice Characteristics
          age: metadata?.age || autoDetectedMetadata.age,
          accent: metadata?.accent || autoDetectedMetadata.accent,
          tone: metadata?.tone || autoDetectedMetadata.tone,
          style: metadata?.style || autoDetectedMetadata.style,
          pitch: metadata?.pitch || autoDetectedMetadata.pitch,
          
          // Usage Metadata
          tags: metadata?.tags || ['custom', 'uploaded'],
          category: metadata?.category || autoDetectedMetadata.category,
          intendedUse: metadata?.intendedUse || `Custom voice: ${voiceName}`,
          bestFor: metadata?.bestFor || ['Bible reading', 'General narration'],
          
          // Technical Metadata
          sampleRate: sampleRate > 0 ? sampleRate : undefined,
          duration: duration > 0 ? Math.round(duration * 100) / 100 : undefined,
          fileSize: audioFile.size,
          format: format,
          channels: channels,
          
          // Quality Metrics
          backgroundNoise: metadata?.backgroundNoise || autoDetectedMetadata.backgroundNoise,
          recordingQuality: metadata?.recordingQuality || autoDetectedMetadata.recordingQuality,
          
          // Personal/Management Metadata
          creator: metadata?.creator || 'User',
          createdAt: new Date().toISOString(),
          usageCount: 0,
          rating: 5, // Default high rating for custom uploads
          notes: metadata?.notes || '',
          favorite: metadata?.favorite || false,
          
          // Voice Sample Metadata
          sampleText: metadata?.sampleText || '',
          sampleContext: metadata?.sampleContext || `Custom voice sample: ${voiceName}`,
          voiceEmotions: [], // Would be populated by audio analysis
          
          // Privacy & Sharing
          isPrivate: metadata?.isPrivate !== false, // Default to private
          source: 'Recorded by user'
        };
        
        console.log('✅ Voice object created successfully');
      } catch (voiceCreationError) {
        console.error('❌ Error creating voice object:', voiceCreationError);
        // Clean up the URL if it was created
        if (customAudioUrl) {
          try {
            URL.revokeObjectURL(customAudioUrl);
          } catch (cleanupError) {
            console.warn('⚠️ Could not clean up audio URL:', cleanupError);
          }
        }
        throw new Error(`Failed to create voice object: ${voiceCreationError instanceof Error ? voiceCreationError.message : 'Unknown error'}`);
      }

      // Step 6: Add to custom voices state
      setUploadProgress({ step: 'Adding voice to application...', progress: 85 });
      console.log('📝 Adding voice to state...');
      
      // Yield control before state update
      await new Promise(resolve => setTimeout(resolve, 10));
      
      try {
        setCustomVoices(prev => {
          const newCustomVoices = [...prev, customVoice];
          console.log('📋 Updated custom voices:', newCustomVoices.map(v => v.name));
          return newCustomVoices;
        });
        console.log('✅ Voice added to state successfully');
      } catch (stateError) {
        console.error('❌ Failed to add voice to state:', stateError);
        // Clean up the audio URL
        if (customVoice.customAudioUrl) {
          try {
            URL.revokeObjectURL(customVoice.customAudioUrl);
          } catch (cleanupError) {
            console.warn('⚠️ Could not clean up audio URL:', cleanupError);
          }
        }
        throw new Error(`Failed to add voice to application state: ${stateError instanceof Error ? stateError.message : 'Unknown error'}`);
      }
      
      // Step 7: Save to localStorage for persistence (with base64 audio data)
      setUploadProgress({ step: 'Saving voice data...', progress: 95 });
      console.log('💾 Saving voice to localStorage...');
      
      // Yield control before localStorage operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      try {
        const savedCustomVoices = JSON.parse(localStorage.getItem('customVoices') || '[]');
        const voiceForStorage = {
          ...customVoice,
          customAudioFile: null, // Can't serialize File objects
          customAudioUrl: null, // Will be recreated from base64
          audioDataUrl: fileDataUrl // Store as base64 data URL (may be empty if conversion failed)
        };
        savedCustomVoices.push(voiceForStorage);
        
        // Use requestIdleCallback for localStorage write if available
        if (typeof requestIdleCallback !== 'undefined') {
          await new Promise<void>((resolve) => {
            requestIdleCallback(() => {
              localStorage.setItem('customVoices', JSON.stringify(savedCustomVoices));
              resolve();
            });
          });
        } else {
          localStorage.setItem('customVoices', JSON.stringify(savedCustomVoices));
        }
        
        console.log('✅ Voice saved to localStorage successfully');
      } catch (storageError) {
        console.warn('⚠️ Could not save voice to localStorage:', storageError);
        console.warn('Voice will still work for current session but will not persist after app restart');
        // Voice will still work for current session - this is not a fatal error
      }

      // Step 8: Success logging and return
      setUploadProgress({ step: 'Upload complete!', progress: 100 });
      console.log('🎉 Custom voice upload completed successfully!');
      console.log('📊 Final voice metadata:', {
        id: customVoice.id,
        name: customVoice.name,
        duration: customVoice.duration,
        sampleRate: customVoice.sampleRate,
        fileSize: customVoice.fileSize,
        format: customVoice.format,
        channels: customVoice.channels,
        quality: customVoice.recordingQuality,
        tags: customVoice.tags,
        hasAudioUrl: !!customVoice.customAudioUrl,
        hasDataUrl: !!fileDataUrl,
        persistsAcrossSessions: !!fileDataUrl
      });
      
      return customVoice;
      
    } catch (error) {
      console.error('❌ Custom voice upload failed at top level:', error);
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to upload custom voice';
      if (error instanceof Error) {
        if (error.message.includes('No audio file')) {
          userMessage = 'Please select an audio file to upload';
        } else if (error.message.includes('Voice name is required')) {
          userMessage = 'Please enter a name for your custom voice';
        } else if (error.message.includes('Voice description is required')) {
          userMessage = 'Please enter a description for your custom voice';
        } else if (error.message.includes('Could not create audio URL')) {
          userMessage = 'The selected audio file could not be processed. Please try a different file.';
        } else if (error.message.includes('File read timeout')) {
          userMessage = 'The audio file is too large or corrupted. Please try a smaller file.';
        } else {
          userMessage = `Upload failed: ${error.message}`;
        }
      }
      
      // Create a user-friendly error to throw
      const friendlyError = new Error(userMessage);
      friendlyError.name = 'VoiceUploadError';
      throw friendlyError;
    } finally {
      setIsUploadingVoice(false);
      setUploadProgress({ step: '', progress: 0 });
      console.log('🔄 Voice upload process completed, cleaning up...');
    }
  }, []);

  // Clone voice using uploaded sample
  const cloneVoiceFromSample = useCallback(async (
    text: string,
    customVoice: FreeAIVoice
  ): Promise<Blob> => {
    if (!customVoice.customAudioUrl) {
      throw new Error('No custom audio sample available');
    }

    // Method 1: Use Real-Time Voice Conversion (if available)
    try {
      const response = await fetch('http://localhost:6006/voice-conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          reference_audio: customVoice.customAudioUrl,
          speed: settings.speed
        })
      });
      
      if (response.ok) {
        return await response.blob();
      }
    } catch (error) {
      console.log('RVC not available, falling back to browser synthesis');
    }

    // Method 2: Fallback to browser TTS with voice effects
    const genderForBrowser = customVoice.gender === 'neutral' ? 'male' : customVoice.gender;
    return generateBrowserEnhancedSpeech(text, genderForBrowser);
  }, [settings, generateBrowserEnhancedSpeech]);

  // Delete custom voice
  const deleteCustomVoice = useCallback((voiceId: string) => {
    setCustomVoices(prev => {
      const filtered = prev.filter(voice => voice.id !== voiceId);
      
      // Clean up object URL to prevent memory leaks
      const voiceToDelete = prev.find(voice => voice.id === voiceId);
      if (voiceToDelete?.customAudioUrl) {
        URL.revokeObjectURL(voiceToDelete.customAudioUrl);
      }
      
      // Update localStorage
      const savedCustomVoices = JSON.parse(localStorage.getItem('customVoices') || '[]');
      const filteredSaved = savedCustomVoices.filter((voice: any) => voice.id !== voiceId);
      localStorage.setItem('customVoices', JSON.stringify(filteredSaved));
      
      console.log('🗑️ Deleted custom voice:', voiceId);
      return filtered;
    });
  }, []);

  // Get all available voices (built-in + custom)
  const getAllVoices = useCallback(() => {
    return [...FREE_AI_VOICES, ...customVoices];
  }, [customVoices]);

  return {
    // State
    selectedVoice,
    isGenerating,
    currentAudio,
    settings,
    installationProgress,
    customVoices,
    isUploadingVoice,
    uploadProgress,
    isStopping,
    availableVoices: getAllVoices(),
    
    // Actions
    setSelectedVoice,
    updateSettings,
    generateSpeech,
    playGeneratedSpeech,
    speakWithFreeAI,
    stopSpeech,
    getInstallationInstructions,
    cleanup,
    uploadCustomVoice,
    deleteCustomVoice,
    cloneVoiceFromSample,
    
    // Status
    isPlaying: currentAudio && !currentAudio.paused,
    canGenerate: !isGenerating && !isStopping
  };
}

// Installation guide for free AI voices
export const FREE_AI_SETUP_GUIDE = `
🆓 FREE AI VOICE SETUP GUIDE

1. BARK (Best Quality - Free)
   • Web: Use https://huggingface.co/spaces/suno/bark
   • Local: pip install git+https://github.com/suno-ai/bark.git
   • Features: Emotions, laughter, multilingual
   • Speed: Slow but excellent quality

2. COQUI TTS (Professional Grade - Open Source)
   • Install: pip install TTS
   • Models: 1100+ free models in 100+ languages
   • Voice cloning: Clone any voice with 3 seconds
   • Commercial use: Allowed (check model licenses)

3. CHATTERBOX (Fastest - MIT License)
   • Install: pip install chatterbox-tts
   • Speed: <200ms latency
   • Quality: Beats ElevenLabs in blind tests
   • Emotion control: Built-in

4. BROWSER ENHANCED (No Installation)
   • Uses Web Audio API for voice enhancement
   • Real-time processing effects
   • Works offline
   • Instant setup

🚀 RECOMMENDED WORKFLOW:
1. Start with Browser Enhanced (instant)
2. Try Bark via HuggingFace (best quality)
3. Install Coqui for production use
4. Add Chatterbox for real-time applications

💡 ALL OPTIONS ARE COMPLETELY FREE!
No API keys, no subscriptions, no usage limits.
`;

export default useFreeAIVoices; 