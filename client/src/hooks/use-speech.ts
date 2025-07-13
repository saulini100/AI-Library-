import { useState, useEffect, useRef, useCallback } from "react";
import { DocumentParagraph } from "@shared/schema";

export function useSpeech(verses: DocumentParagraph[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(165); // Default duration in seconds
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);
  const versesRef = useRef<DocumentParagraph[]>([]);

  const speak = () => {
    console.log('🔊 useSpeech.speak() called');
    console.log('📖 Verses:', verses);
    console.log('📖 Verses length:', verses.length);
    console.log('🌐 window.speechSynthesis available:', !!window.speechSynthesis);
    
    if (!window.speechSynthesis || verses.length === 0) {
      console.log('❌ Cannot speak: no speechSynthesis or no verses');
      return;
    }

    // Prevent multiple simultaneous speech requests
    if (isSpeakingRef.current) {
      console.log('⚠️ Already speaking, stopping current speech first');
      stop();
      // Wait a bit for the stop to take effect
      setTimeout(() => {
        isSpeakingRef.current = false;
        speak();
      }, 100);
      return;
    }

    // Stop any current speech and clear the queue
    window.speechSynthesis.cancel();
    
    // Wait a moment for the cancel to take effect
    setTimeout(() => {
      let text = verses.map(verse => verse.text).join(" ");
      console.log('📝 Combined text length:', text.length);
      console.log('📝 First 100 chars:', text.substring(0, 100));
      console.log('📝 Last 100 chars:', text.substring(text.length - 100));
      
      // Check for potential issues
      if (text.length > 5000) {
        console.log('⚠️ Warning: Text is very long, some browsers may have issues');
      }
      
      if (text.includes('\n') || text.includes('\r')) {
        console.log('⚠️ Warning: Text contains line breaks, cleaning...');
        text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        console.log('📝 Cleaned text length:', text.length);
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('✅ Speech started');
        isSpeakingRef.current = true;
        setIsPlaying(true);
        // Start timer to track progress
        timerRef.current = setInterval(() => {
          setCurrentTime(prev => Math.min(prev + 1, duration));
        }, 1000);
      };

      utterance.onend = () => {
        console.log('✅ Speech ended');
        isSpeakingRef.current = false;
        setIsPlaying(false);
        setCurrentTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech error:', event);
        console.error('❌ Error details:', {
          error: event.error,
          elapsedTime: event.elapsedTime,
          charIndex: event.charIndex,
          name: event.name
        });
        isSpeakingRef.current = false;
        setIsPlaying(false);
        setCurrentTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      utteranceRef.current = utterance;
      console.log('🎤 Starting speech synthesis...');
      window.speechSynthesis.speak(utterance);
    }, 200);
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stop();
    } else {
      speak();
    }
  };

  // Clean up on unmount - only cancel if we're actually speaking
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Only cancel speech if we're actually speaking and it's our speech
      if (window.speechSynthesis && isSpeakingRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Only reset when verses actually change (not just re-render)
  useEffect(() => {
    // Check if verses have actually changed
    const versesChanged = JSON.stringify(verses) !== JSON.stringify(versesRef.current);
    
    if (versesChanged) {
      console.log('📖 Verses changed, updating duration estimate');
      versesRef.current = verses;
      
      // Only stop if we're currently speaking
      if (isPlaying) {
        stop();
      }
      
      // Estimate duration based on text length (roughly 150 words per minute)
      const totalWords = verses.reduce((acc, verse) => acc + verse.text.split(' ').length, 0);
      setDuration(Math.ceil(totalWords / 2.5)); // Rough estimate
    }
  }, [verses, isPlaying]);

  return {
    isPlaying,
    currentTime,
    duration,
    togglePlayback,
    speak,
    stop,
  };
}
