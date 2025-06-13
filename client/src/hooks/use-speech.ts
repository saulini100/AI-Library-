import { useState, useEffect, useRef } from "react";
import { BibleVerse } from "@shared/schema";

export function useSpeech(verses: BibleVerse[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(165); // Default duration in seconds
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const speak = () => {
    if (!window.speechSynthesis || verses.length === 0) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const text = verses.map(verse => verse.text).join(" ");
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      // Start timer to track progress
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => Math.min(prev + 1, duration));
      }, 1000);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Reset when verses change
  useEffect(() => {
    stop();
    // Estimate duration based on text length (roughly 150 words per minute)
    const totalWords = verses.reduce((acc, verse) => acc + verse.text.split(' ').length, 0);
    setDuration(Math.ceil(totalWords / 2.5)); // Rough estimate
  }, [verses]);

  return {
    isPlaying,
    currentTime,
    duration,
    togglePlayback,
    speak,
    stop,
  };
}
