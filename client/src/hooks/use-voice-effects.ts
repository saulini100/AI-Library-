import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceEffect {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface VoiceSettings {
  pitch: number;
  speed: number;
  reverb: number;
  warmth: number;
  clarity: number;
  depth: number;
  resonance: number;
  breathiness: number;
}

export const VOICE_EFFECTS: VoiceEffect[] = [
  {
    id: 'natural',
    name: 'Natural',
    description: 'Clean, unprocessed voice',
    icon: '🎤'
  },
  {
    id: 'warm',
    name: 'Warm Pastor',
    description: 'Warm, comforting voice like a caring pastor',
    icon: '🤗'
  },
  {
    id: 'authoritative',
    name: 'Authoritative Scholar',
    description: 'Deep, scholarly voice with gravitas',
    icon: '📚'
  },
  {
    id: 'gentle',
    name: 'Gentle Storyteller',
    description: 'Soft, soothing voice perfect for reflection',
    icon: '🕊️'
  },
  {
    id: 'dramatic',
    name: 'Dramatic Narrator',
    description: 'Rich, theatrical voice for engaging stories',
    icon: '🎭'
  },
  {
    id: 'wise',
    name: 'Ancient Wisdom',
    description: 'Aged, wise voice with deep resonance',
    icon: '🧙‍♂️'
  }
];

export const VOICE_PRESETS: Record<string, VoiceSettings> = {
  natural: {
    pitch: 1.0,
    speed: 1.0,
    reverb: 0.0,
    warmth: 0.0,
    clarity: 0.0,
    depth: 0.0,
    resonance: 0.0,
    breathiness: 0.0
  },
  warm: {
    pitch: 0.9,
    speed: 0.85,
    reverb: 0.2,
    warmth: 0.6,
    clarity: 0.3,
    depth: 0.4,
    resonance: 0.3,
    breathiness: 0.2
  },
  authoritative: {
    pitch: 0.8,
    speed: 0.9,
    reverb: 0.3,
    warmth: 0.2,
    clarity: 0.7,
    depth: 0.8,
    resonance: 0.6,
    breathiness: 0.1
  },
  gentle: {
    pitch: 1.1,
    speed: 0.8,
    reverb: 0.1,
    warmth: 0.8,
    clarity: 0.4,
    depth: 0.2,
    resonance: 0.2,
    breathiness: 0.5
  },
  dramatic: {
    pitch: 0.95,
    speed: 0.9,
    reverb: 0.4,
    warmth: 0.3,
    clarity: 0.8,
    depth: 0.7,
    resonance: 0.8,
    breathiness: 0.3
  },
  wise: {
    pitch: 0.75,
    speed: 0.75,
    reverb: 0.5,
    warmth: 0.4,
    clarity: 0.6,
    depth: 0.9,
    resonance: 0.9,
    breathiness: 0.4
  }
};

export function useVoiceEffects() {
  const [selectedEffect, setSelectedEffect] = useState<string>('natural');
  const [customSettings, setCustomSettings] = useState<VoiceSettings>(VOICE_PRESETS.natural);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  // Initialize Web Audio API
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Create reverb impulse response
  const createReverbImpulse = useCallback((duration: number, decay: number) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return null;

    const length = audioContext.sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    return impulse;
  }, []);

  // Apply voice effects to audio element
  const applyEffects = useCallback((audioElement: HTMLAudioElement, settings: VoiceSettings) => {
    const audioContext = initializeAudioContext();
    if (!audioContext) return;

    try {
      setIsProcessing(true);

      // Create source node if not exists
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = audioContext.createMediaElementSource(audioElement);
      }

      // Create effect nodes
      const gainNode = audioContext.createGain();
      const filterNode = audioContext.createBiquadFilter();
      const convolverNode = audioContext.createConvolver();
      const compressorNode = audioContext.createDynamicsCompressor();

      // Configure gain (volume/warmth)
      gainNode.gain.value = 1 + (settings.warmth * 0.3);

      // Configure filter (clarity/brightness)
      filterNode.type = 'peaking';
      filterNode.frequency.value = 2000 + (settings.clarity * 2000);
      filterNode.Q.value = 1;
      filterNode.gain.value = settings.clarity * 6;

      // Configure reverb
      if (settings.reverb > 0) {
        const impulse = createReverbImpulse(2, 2);
        if (impulse) {
          convolverNode.buffer = impulse;
        }
      }

      // Configure compressor (depth/presence)
      compressorNode.threshold.value = -24 + (settings.depth * 12);
      compressorNode.knee.value = 30;
      compressorNode.ratio.value = 4 + (settings.resonance * 8);
      compressorNode.attack.value = 0.003;
      compressorNode.release.value = 0.25;

      // Connect audio graph
      let currentNode: AudioNode = sourceNodeRef.current;

      // Apply compression first
      currentNode.connect(compressorNode);
      currentNode = compressorNode;

      // Apply filtering
      currentNode.connect(filterNode);
      currentNode = filterNode;

      // Apply gain
      currentNode.connect(gainNode);
      currentNode = gainNode;

      // Apply reverb if enabled
      if (settings.reverb > 0) {
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        
        dryGain.gain.value = 1 - settings.reverb;
        wetGain.gain.value = settings.reverb;

        currentNode.connect(dryGain);
        currentNode.connect(convolverNode);
        convolverNode.connect(wetGain);

        const mixerGain = audioContext.createGain();
        dryGain.connect(mixerGain);
        wetGain.connect(mixerGain);
        
        currentNode = mixerGain as AudioNode;
      }

      // Connect to destination
      currentNode.connect(audioContext.destination);

      // Store references for cleanup
      gainNodeRef.current = gainNode;
      filterNodeRef.current = filterNode;
      convolverNodeRef.current = convolverNode;
      compressorNodeRef.current = compressorNode;

      console.log('🎭 Voice effects applied:', settings);
      setIsProcessing(false);

    } catch (error) {
      console.error('🎭 Error applying voice effects:', error);
      setIsProcessing(false);
    }
  }, [initializeAudioContext, createReverbImpulse]);

  // Enhanced speech synthesis with voice effects
  const speakWithEffects = useCallback((text: string, voice?: SpeechSynthesisVoice) => {
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (voice) {
        utterance.voice = voice;
      }

      // Apply basic speech synthesis settings
      const settings = selectedEffect === 'custom' ? customSettings : VOICE_PRESETS[selectedEffect];
      
      utterance.rate = settings.speed;
      utterance.pitch = settings.pitch;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        console.log('🎭 Enhanced speech started with effect:', selectedEffect);
      };

      utterance.onend = () => {
        console.log('🎭 Enhanced speech completed');
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('🎭 Enhanced speech error:', error);
        reject(error);
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [selectedEffect, customSettings]);

  // Change voice effect preset
  const changeEffect = useCallback((effectId: string) => {
    setSelectedEffect(effectId);
    if (effectId !== 'custom' && VOICE_PRESETS[effectId]) {
      setCustomSettings(VOICE_PRESETS[effectId]);
    }
    console.log('🎭 Voice effect changed to:', effectId);
  }, []);

  // Update custom settings
  const updateCustomSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setCustomSettings(prev => ({ ...prev, ...newSettings }));
    setSelectedEffect('custom');
  }, []);

  // Cleanup audio context
  const cleanup = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    selectedEffect,
    customSettings,
    isProcessing,
    effects: VOICE_EFFECTS,
    presets: VOICE_PRESETS,
    changeEffect,
    updateCustomSettings,
    applyEffects,
    speakWithEffects,
    cleanup
  };
} 