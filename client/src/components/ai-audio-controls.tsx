import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  Activity,
  Settings
} from 'lucide-react';

interface AudioWaveVisualizerProps {
  isPlaying: boolean;
  amplitude?: number;
  bars?: number;
}

function AudioWaveVisualizer({ isPlaying, amplitude = 0.5, bars = 20 }: AudioWaveVisualizerProps) {
  const barsArray = Array.from({ length: bars }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center gap-1 h-12 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden control-slide-in audio-stagger-1">
      {barsArray.map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-full transition-all duration-200 gpu-accelerated ${
            isPlaying 
              ? 'waveform-bar-active bg-gradient-to-t from-blue-500 via-purple-500 to-pink-500' 
              : 'waveform-bar bg-gradient-to-t from-blue-400 to-purple-400'
          }`}
          style={{
            height: isPlaying 
              ? `${15 + Math.random() * 35 * amplitude}px`
              : '6px',
            animationDelay: `${bar * 75}ms`,
            animationDuration: `${1000 + Math.random() * 600}ms`,
            filter: isPlaying ? `hue-rotate(${bar * 18}deg)` : 'none'
          }}
        />
      ))}
      
      {/* Audio Reactivity Overlay */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent audio-reactive"></div>
        </div>
      )}
    </div>
  );
}

interface AIAudioControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  currentTime: number;
  duration: number;
  onSkipPrevious?: () => void;
  onSkipNext?: () => void;
  className?: string;
  showWaveform?: boolean;
  showSettings?: boolean;
  onSettingsToggle?: () => void;
}

export default function AIAudioControls({
  isPlaying,
  onPlayPause,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  currentTime,
  duration,
  onSkipPrevious,
  onSkipNext,
  className = '',
  showWaveform = true,
  showSettings = false,
  onSettingsToggle
}: AIAudioControlsProps) {
  const [displayVolume, setDisplayVolume] = useState([volume]);
  
  useEffect(() => {
    setDisplayVolume([isMuted ? 0 : volume]);
  }, [volume, isMuted]);
  
  const handleVolumeChange = (newValue: number[]) => {
    setDisplayVolume(newValue);
    onVolumeChange(newValue[0]);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Waveform Visualization */}
      {showWaveform && (
        <div className="relative animate-in scale-in duration-300 audio-stagger-1">
          <AudioWaveVisualizer 
            isPlaying={isPlaying} 
            amplitude={volume / 100} 
          />
          
          {/* Frequency Display */}
          <div className="absolute top-2 right-2 text-xs text-white/80 font-mono">
            {isPlaying ? `${Math.round(volume)}%` : 'Ready'}
          </div>
        </div>
      )}
      
      {/* Enhanced Progress Bar */}
      <div className="space-y-2 animate-in fade-in delay-300 audio-stagger-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className={`transition-all duration-300 ${isPlaying ? 'time-counter text-blue-500' : ''}`}>
            {formatTime(currentTime)}
          </span>
          <span className="opacity-70">{formatTime(duration)}</span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-500 chapter-progress ${
                isPlaying 
                  ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 progress-glow' 
                  : 'bg-gradient-to-r from-blue-400 to-purple-400'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Progress pulse indicator */}
            {isPlaying && (
              <div 
                className="absolute top-0 w-2 h-3 bg-white/60 rounded-full processing-pulse"
                style={{ left: `${Math.max(0, progressPercentage - 1)}%` }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Main Controls */}
      <div className="flex items-center justify-between animate-in slide-in-from-bottom delay-400 audio-stagger-3">
        <div className="flex items-center gap-2">
          {onSkipPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkipPrevious}
              className="hover:scale-110 transition-all duration-300 btn-scale control-hover skip-animation"
            >
              <SkipBack className="h-4 w-4 icon-rotate" />
            </Button>
          )}
          
          <Button
            onClick={onPlayPause}
            className={`w-14 h-14 rounded-full shadow-lg transition-all duration-500 fab gpu-accelerated relative overflow-hidden ${
              isPlaying 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 play-pause-morph scale-110 shadow-orange-300/50' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 audio-button-pulse shadow-green-300/50'
            }`}
          >
            <div className={`transition-all duration-300 ${isPlaying ? 'scale-110 icon-rotate' : ''}`}>
              {isPlaying ? (
                <Pause className="h-7 w-7 text-white" />
              ) : (
                <Play className="h-7 w-7 text-white ml-0.5" />
              )}
            </div>
            
            {/* Audio state indicator ring */}
            <div className={`absolute inset-0 rounded-full border-2 transition-all duration-500 pointer-events-none ${
              isPlaying 
                ? 'border-orange-300/50 animate-ping' 
                : 'border-green-300/30'
            }`}></div>
          </Button>
          
          {onSkipNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkipNext}
              className="hover:scale-110 transition-all duration-300 btn-scale control-hover skip-animation"
            >
              <SkipForward className="h-4 w-4 icon-rotate" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3 audio-stagger-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMuteToggle}
            className={`hover:scale-110 transition-all duration-300 btn-scale control-hover ${
              isMuted ? 'mute-toggle text-red-500' : ''
            }`}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 icon-bounce-rotate" />
            ) : (
              <Volume2 className="h-4 w-4 volume-wave" />
            )}
          </Button>
          
          <div className="relative w-20">
            <Slider
              value={displayVolume}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="cursor-pointer"
            />
            
            {/* Volume indicator bars */}
            <div className="absolute -top-2 left-0 w-full h-1 flex gap-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-full transition-all duration-200 ${
                    volume > i * 10 
                      ? 'bg-gradient-to-r from-green-400 to-blue-500 frequency-bar' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
          
          {onSettingsToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsToggle}
              className={`hover:scale-110 transition-all duration-300 btn-scale control-hover ${
                showSettings ? 'text-blue-500 icon-pulse-glow' : ''
              }`}
            >
              <Settings className={`h-4 w-4 ${showSettings ? 'icon-bounce-rotate' : ''}`} />
            </Button>
          )}
        </div>
      </div>
      
      {/* Enhanced Audio Status Indicator */}
      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground animate-in fade-in delay-500 audio-stagger-5">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 transition-all duration-300 ${
            isPlaying ? 'text-green-500 processing-pulse' : 'text-gray-400'
          }`} />
          <span className={`transition-all duration-300 ${
            isPlaying ? 'text-green-500 font-medium' : ''
          }`}>
            {isPlaying ? 'Playing' : 'Ready'}
          </span>
        </div>
        
        {/* Real-time audio indicator */}
        {isPlaying && (
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            
            {/* Quality indicator */}
            <div className="w-2 h-2 rounded-full quality-indicator"></div>
            
            {/* Live audio meter */}
            <div className="text-xs font-mono text-green-400">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 