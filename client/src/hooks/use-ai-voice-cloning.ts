import { useState, useCallback } from 'react';

// Concept: AI Voice Cloning for Biblical Narrators
export interface VoiceCloneOption {
  id: string;
  name: string;
  description: string;
  voiceType: 'biblical' | 'historical' | 'custom';
  sample?: string; // Audio sample URL
  accent?: string;
  gender: 'male' | 'female';
  age: 'young' | 'middle' | 'elderly';
}

// Famous biblical/spiritual voice styles we could emulate
export const VOICE_CLONE_OPTIONS: VoiceCloneOption[] = [
  {
    id: 'shepherd-narrator',
    name: 'Shepherd Narrator',
    description: 'Warm, wise voice like a Biblical shepherd telling stories around a fire',
    voiceType: 'biblical',
    accent: 'Middle Eastern',
    gender: 'male',
    age: 'middle'
  },
  {
    id: 'prophetess',
    name: 'Prophetess Voice',
    description: 'Strong, authoritative female voice like Deborah or Esther',
    voiceType: 'biblical',
    accent: 'Ancient Hebrew',
    gender: 'female',
    age: 'middle'
  },
  {
    id: 'apostle-paul',
    name: 'Apostolic Teacher',
    description: 'Passionate, educated voice for reading epistles and teachings',
    voiceType: 'biblical',
    accent: 'Mediterranean',
    gender: 'male',
    age: 'middle'
  },
  {
    id: 'psalm-singer',
    name: 'Psalm Singer',
    description: 'Musical, poetic voice perfect for Psalms and worship passages',
    voiceType: 'biblical',
    accent: 'Hebrew',
    gender: 'male',
    age: 'young'
  },
  {
    id: 'wisdom-elder',
    name: 'Wisdom Elder',
    description: 'Ancient, sage-like voice for Proverbs and wisdom literature',
    voiceType: 'biblical',
    accent: 'Ancient',
    gender: 'male',
    age: 'elderly'
  },
  {
    id: 'gospel-storyteller',
    name: 'Gospel Storyteller',
    description: 'Engaging narrative voice for Gospel stories and parables',
    voiceType: 'biblical',
    accent: 'Aramaic-influenced',
    gender: 'male',
    age: 'middle'
  }
];

export function useAIVoiceCloning() {
  const [isCloning, setIsCloning] = useState(false);
  const [selectedClone, setSelectedClone] = useState<string>('shepherd-narrator');
  const [customVoiceSample, setCustomVoiceSample] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [clonedVoices, setClonedVoices] = useState<any[]>([]);

  // Validate audio file for voice cloning
  const validateAudioFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) {
      return { valid: false, error: 'Please upload a valid audio file (.mp3, .wav, etc.)' };
    }

    // Check file size (max 25MB for ElevenLabs)
    if (file.size > 25 * 1024 * 1024) {
      return { valid: false, error: 'File too large. ElevenLabs supports files up to 25MB.' };
    }

    // Check minimum file size (at least 1KB)
    if (file.size < 1024) {
      return { valid: false, error: 'File too small. Please upload a valid audio file.' };
    }

    return { valid: true };
  }, []);

  // Create cloned voice using ElevenLabs API
  const createClonedVoice = useCallback(async (
    audioFile: File, 
    voiceName: string, 
    description: string,
    apiKey: string
  ) => {
    setIsCloning(true);
    setUploadError(null);

    try {
      // Validate file first
      const validation = validateAudioFile(audioFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log(`🎭 Creating cloned voice: ${voiceName} (${audioFile.name}, ${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);

      // Step 1: Create the voice with ElevenLabs
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('description', description);
      formData.append('files', audioFile);
      
      const createResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => null);
        throw new Error(
          errorData?.detail?.message || 
          `Voice cloning failed: ${createResponse.status} ${createResponse.statusText}`
        );
      }

      const voiceData = await createResponse.json();
      
      // Create voice object for our app
      const clonedVoice = {
        id: voiceData.voice_id,
        name: voiceName,
        description: description,
        gender: 'custom' as const,
        accent: 'Custom',
        age: 'middle' as const,
        style: 'narration' as const,
        provider: 'elevenlabs' as const,
        voiceId: voiceData.voice_id,
        isCloned: true,
        audioFile: audioFile,
        premium: true
      };

      // Add to cloned voices
      setClonedVoices(prev => [...prev, clonedVoice]);
      
      // Save to localStorage (without File object)
      const savedClonedVoices = JSON.parse(localStorage.getItem('clonedVoices') || '[]');
      savedClonedVoices.push({
        ...clonedVoice,
        audioFile: null // Can't serialize File objects
      });
      localStorage.setItem('clonedVoices', JSON.stringify(savedClonedVoices));

      console.log('✅ Voice cloned successfully:', voiceName, voiceData.voice_id);
      return clonedVoice;
      
    } catch (error) {
      console.error('❌ Voice cloning failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadError(errorMessage);
      throw error;
    } finally {
      setIsCloning(false);
    }
  }, [validateAudioFile]);

  // Simulate AI voice cloning (fallback when no API key)
  const cloneVoice = useCallback(async (voiceId: string, text: string) => {
    setIsCloning(true);
    
    try {
      console.log(`🎭 Using cloned voice: ${voiceId} for text: "${text.substring(0, 50)}..."`);
      
      // Find the cloned voice
      const voice = clonedVoices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error('Cloned voice not found');
      }

      // This would generate speech using the cloned voice
      // For now, return a mock URL (in real implementation, this would call ElevenLabs TTS API)
      const mockAudioUrl = 'data:audio/wav;base64,mock-cloned-audio';
      return mockAudioUrl;
      
    } catch (error) {
      console.error('Voice cloning failed:', error);
      throw error;
    } finally {
      setIsCloning(false);
    }
  }, [clonedVoices]);

  // Upload custom voice sample for cloning
  const uploadVoiceSample = useCallback((file: File) => {
    setUploadError(null);
    
    // Validate the file
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return false;
    }

    setCustomVoiceSample(file);
    console.log('📁 Voice sample uploaded:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Check duration if possible
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      console.log(`🎵 Audio duration: ${audio.duration.toFixed(1)} seconds`);
      if (audio.duration < 10) {
        setUploadError('Warning: Audio is shorter than 10 seconds. For best voice cloning results, use 30+ seconds of clear speech.');
      } else if (audio.duration > 300) { // 5 minutes
        setUploadError('Warning: Audio is longer than 5 minutes. Consider using a shorter sample (1-3 minutes) for faster processing.');
      }
      URL.revokeObjectURL(audio.src);
    };
    
    return true;
  }, [validateAudioFile]);

  // Get troubleshooting info for failed uploads
  const getTroubleshootingInfo = useCallback(() => {
    return {
      supportedFormats: ['MP3', 'WAV', 'M4A', 'FLAC'],
      maxFileSize: '25MB',
      recommendedDuration: '30 seconds to 3 minutes',
      qualityTips: [
        'Use clear, noise-free audio',
        'Single speaker only (no background voices)',
        'Consistent volume throughout',
        'Avoid music or background noise',
        'Sample rate: 22kHz or higher recommended'
      ],
      commonIssues: [
        'File too large: Compress audio or use shorter sample',
        'Poor quality: Use noise reduction tools before upload',
        'Multiple speakers: Extract single speaker segments',
        'Background noise: Use audio editing software to clean'
      ]
    };
  }, []);

  return {
    isCloning,
    selectedClone,
    customVoiceSample,
    clonedVoices,
    uploadError,
    availableClones: VOICE_CLONE_OPTIONS,
    cloneVoice,
    createClonedVoice,
    uploadVoiceSample,
    setSelectedClone,
    validateAudioFile,
    getTroubleshootingInfo
  };
}

// Usage example for Bible app:
export const IMPLEMENTATION_EXAMPLE = `
// In your Bible reader component:
const { cloneVoice, selectedClone } = useAIVoiceCloning();

const readWithClonedVoice = async (text: string) => {
  const audioUrl = await cloneVoice(selectedClone, text);
  const audio = new Audio(audioUrl);
  audio.play();
};

// Features this enables:
// ✅ Different voices for different Bible books
// ✅ Character voices for dialogue in stories  
// ✅ Custom voice uploads (your pastor's voice)
// ✅ Historical accuracy with ancient accents
// ✅ Emotional context matching (gentle for Psalms, authoritative for Law)
`; 