import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import BibleContent from "@/components/bible-content";
import TopBar from "@/components/top-bar";
import AnnotationModal from "@/components/annotation-modal";
import { useSpeech } from "@/hooks/use-speech";
import { useSelection } from "@/hooks/use-selection";

export default function BibleReader() {
  const { book = "Psalms", chapter = "23" } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true" || 
             window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const { data: chapterData, isLoading, error } = useQuery({
    queryKey: ["/api/bible", book, chapter],
    queryFn: async () => {
      const response = await fetch(`/api/bible/${book}/${chapter}`);
      if (!response.ok) {
        throw new Error("Failed to fetch chapter");
      }
      return response.json();
    },
  });

  const { data: annotations } = useQuery({
    queryKey: ["/api/annotations", book, chapter],
    queryFn: async () => {
      const response = await fetch(`/api/annotations/${book}/${chapter}`);
      if (!response.ok) {
        throw new Error("Failed to fetch annotations");
      }
      return response.json();
    },
  });

  const { isPlaying, togglePlayback, currentTime, duration } = useSpeech(chapterData?.verses || []);
  const { handleTextSelection } = useSelection({
    onSelection: (text, verse) => {
      setSelectedText(text);
      setSelectedVerse(verse);
      setAnnotationModalOpen(true);
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    return () => document.removeEventListener("mouseup", handleTextSelection);
  }, [handleTextSelection]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Failed to load chapter</p>
          <p className="text-gray-600 dark:text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentBook={book}
        currentChapter={parseInt(chapter)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          book={book}
          chapter={parseInt(chapter)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isPlaying={isPlaying}
          onTogglePlayback={togglePlayback}
          currentTime={currentTime}
          duration={duration}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
        
        <BibleContent
          chapterData={chapterData}
          annotations={annotations}
          onAddAnnotation={() => setAnnotationModalOpen(true)}
        />
      </div>

      <AnnotationModal
        isOpen={annotationModalOpen}
        onClose={() => setAnnotationModalOpen(false)}
        selectedText={selectedText}
        book={book}
        chapter={parseInt(chapter)}
        verse={selectedVerse}
      />
    </div>
  );
}
