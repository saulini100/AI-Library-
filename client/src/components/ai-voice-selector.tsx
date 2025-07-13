import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Play, 
  Pause, 
  Volume2, 
  Mic,
  Activity,
  User,
  Brain,
  Settings,
  Check,
  Loader2
} from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  type: 'ai' | 'natural' | 'premium';
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  description: string;
  quality: 'standard' | 'high' | 'ultra';
  isAvailable: boolean;
}

interface AIVoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceChange: (voiceId: string) => void;
  isPlaying?: boolean;
  onPlayPreview?: (voiceId: string) => void;
  className?: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'ai-sarah',
    name: 'AI Sarah',
    type: 'ai',
    gender: 'female',
    accent: 'American',
    description: 'Warm, professional narrator perfect for scripture reading',
    quality: 'high',
    isAvailable: true
  },
  {
    id: 'ai-marcus',
    name: 'AI Marcus',
    type: 'ai',
    gender: 'male',
    accent: 'British',
    description: 'Deep, authoritative voice ideal for dramatic passages',
    quality: 'ultra',
    isAvailable: true
  },
  {
    id: 'natural-emma',
    name: 'Natural Emma',
    type: 'natural',
    gender: 'female',
    accent: 'Australian',
    description: 'Gentle, caring tone for meditative reading',
    quality: 'standard',
    isAvailable: true
  },
  {
    id: 'premium-david',
    name: 'Premium David',
    type: 'premium',
    gender: 'male',
    accent: 'Canadian',
    description: 'Studio-quality voice with emotional depth',
    quality: 'ultra',
    isAvailable: false
  },
  {
    id: 'ai-sophia',
    name: 'AI Sophia',
    type: 'ai',
    gender: 'female',
    accent: 'Irish',
    description: 'Melodic voice with natural storytelling flow',
    quality: 'high',
    isAvailable: true
  }
];

export default function AIVoiceSelector({
  selectedVoiceId = 'ai-sarah',
  onVoiceChange,
  isPlaying = false,
  onPlayPreview,
  className = ''
}: AIVoiceSelectorProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [switchingVoice, setSwitchingVoice] = useState<string | null>(null);
  const [hoveredVoice, setHoveredVoice] = useState<string | null>(null);

  const selectedVoice = VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

  const handleVoiceChange = async (voiceId: string) => {
    if (voiceId === selectedVoiceId) return;
    
    setSwitchingVoice(voiceId);
    
    // Simulate voice switching with cross-fade animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onVoiceChange(voiceId);
    setSwitchingVoice(null);
  };

  const handlePreview = async (voiceId: string) => {
    if (!onPlayPreview) return;
    
    setPreviewingVoice(voiceId);
    onPlayPreview(voiceId);
    
    // Auto-stop preview after 3 seconds
    setTimeout(() => {
      setPreviewingVoice(null);
    }, 3000);
  };

  const getVoiceTypeIcon = (type: VoiceOption['type']) => {
    switch (type) {
      case 'ai': return <Brain className="w-4 h-4" />;
      case 'natural': return <User className="w-4 h-4" />;
      case 'premium': return <Mic className="w-4 h-4" />;
    }
  };

  const getQualityColor = (quality: VoiceOption['quality']) => {
    switch (quality) {
      case 'standard': return 'bg-gray-500';
      case 'high': return 'bg-blue-500';
      case 'ultra': return 'bg-purple-500';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Voice Display */}
      <div className="relative">
        <Card className={`transition-all duration-500 gpu-accelerated ${
          switchingVoice ? 'voice-crossfade' : ''
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full transition-all duration-300 ${
                  selectedVoice.type === 'ai' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' :
                  selectedVoice.type === 'natural' ? 'bg-green-100 dark:bg-green-900 text-green-600' :
                  'bg-purple-100 dark:bg-purple-900 text-purple-600'
                }`}>
                  {getVoiceTypeIcon(selectedVoice.type)}
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedVoice.name}</CardTitle>
                  <CardDescription>{selectedVoice.accent} • {selectedVoice.gender}</CardDescription>
                </div>
              </div>
              
              {/* Voice Indicator */}
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isPlaying 
                  ? 'voice-indicator bg-green-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}></div>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{selectedVoice.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedVoice.type}
                </Badge>
                <div className={`w-2 h-2 rounded-full ${getQualityColor(selectedVoice.quality)}`}></div>
                <span className="text-xs text-muted-foreground capitalize">{selectedVoice.quality}</span>
              </div>
              
              {onPlayPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(selectedVoice.id)}
                  disabled={previewingVoice === selectedVoice.id}
                  className="hover:scale-105 transition-all duration-300"
                >
                  {previewingVoice === selectedVoice.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Switching Overlay */}
        {switchingVoice && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin processing-spinner" />
              <span>Switching voices...</span>
            </div>
          </div>
        )}
      </div>

      {/* Voice Selection Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Available Voices</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VOICE_OPTIONS.map((voice) => (
            <Card
              key={voice.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-md control-hover ${
                voice.id === selectedVoiceId 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : hoveredVoice === voice.id
                  ? 'shadow-lg transform scale-105'
                  : ''
              } ${
                !voice.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onMouseEnter={() => setHoveredVoice(voice.id)}
              onMouseLeave={() => setHoveredVoice(null)}
              onClick={() => voice.isAvailable && handleVoiceChange(voice.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full transition-all duration-300 ${
                      voice.type === 'ai' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' :
                      voice.type === 'natural' ? 'bg-green-100 dark:bg-green-900 text-green-600' :
                      'bg-purple-100 dark:bg-purple-900 text-purple-600'
                    }`}>
                      {getVoiceTypeIcon(voice.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{voice.name}</h4>
                      <p className="text-xs text-muted-foreground">{voice.accent}</p>
                    </div>
                  </div>
                  
                  {voice.id === selectedVoiceId && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {voice.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        voice.type === 'premium' ? 'border-purple-300 text-purple-600' : ''
                      }`}
                    >
                      {voice.type}
                    </Badge>
                    <div className={`w-1.5 h-1.5 rounded-full ${getQualityColor(voice.quality)}`}></div>
                  </div>
                  
                  {voice.isAvailable && onPlayPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(voice.id);
                      }}
                      disabled={previewingVoice === voice.id}
                      className="h-6 w-6 p-0 hover:scale-110 transition-all duration-300"
                    >
                      {previewingVoice === voice.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                  
                  {!voice.isAvailable && (
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Voice Preview Status */}
      {previewingVoice && (
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg voice-preview">
          <Activity className="w-4 h-4 text-blue-500 processing-pulse" />
          <span className="text-sm text-blue-600 dark:text-blue-400">
            Previewing {VOICE_OPTIONS.find(v => v.id === previewingVoice)?.name}...
          </span>
        </div>
      )}
    </div>
  );
} 