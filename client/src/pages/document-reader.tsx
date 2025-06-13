import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import TopBar from "@/components/top-bar";
import Sidebar from "@/components/sidebar";
import DocumentLibrary from "@/components/document-library";
import AnnotationModal from "@/components/annotation-modal";
import { Document, DocumentChapter } from "@shared/schema";
import { useSpeech } from "@/hooks/use-speech";
import { useSelection } from "@/hooks/use-selection";
import { apiRequest } from "@/lib/queryClient";

interface DocumentContentProps {
  document: Document;
  chapter: DocumentChapter;
  annotations: any[];
  onTextSelected: (text: string, paragraph: number | null) => void;
}

function DocumentContent({ document, chapter, annotations, onTextSelected }: DocumentContentProps) {
  const paragraphs = chapter.paragraphs || [];
  const { isPlaying, togglePlayback, currentTime, duration } = useSpeech(paragraphs);
  
  const { startSelection } = useSelection({
    onSelection: (text: string, paragraph: number | null) => {
      onTextSelected(text, paragraph);
    }
  });

  useEffect(() => {
    const cleanup = startSelection();
    return cleanup;
  }, [startSelection]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {document.title}
          </h1>
          <h2 className="text-xl text-muted-foreground">
            {chapter.title}
          </h2>
        </div>

        <div className="space-y-12 max-w-none">
          {paragraphs.map((paragraph, index) => {
            const hasAnnotation = annotations.some(
              (ann: any) => ann.paragraph === paragraph.number
            );

            // Split text into sentences for better readability
            const sentences = paragraph.text.split(/(?<=[.!?])\s+/).filter(s => s.trim());

            return (
              <div
                key={paragraph.number}
                className={`
                  p-8 rounded-2xl transition-all duration-300 cursor-pointer
                  hover:bg-accent/30 group relative border border-border/30
                  ${hasAnnotation ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : 'bg-card/50'}
                  shadow-lg hover:shadow-xl backdrop-blur-sm
                `}
                data-paragraph={paragraph.number}
              >
                <div className="prose prose-lg max-w-none">
                  <p className="text-xl leading-relaxed text-foreground select-text font-light tracking-wide m-0">
                    {sentences.map((sentence, idx) => (
                      <span key={idx} className="inline-block mr-2 mb-2">
                        {sentence.trim()}
                        {sentence.trim() && !sentence.trim().match(/[.!?]$/) && "."}
                      </span>
                    ))}
                  </p>
                </div>
                
                {hasAnnotation && (
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    {annotations
                      .filter((ann: any) => ann.paragraph === paragraph.number)
                      .map((ann: any) => (
                        <div key={ann.id} className="italic">
                          Note: {ann.note}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DocumentReader() {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);

  // Parse URL to get document and chapter
  const urlParts = location.split('/');
  const documentId = urlParts[2] ? parseInt(urlParts[2]) : null;
  const chapterFromUrl = urlParts[3] ? parseInt(urlParts[3]) : 1;

  // Fetch document data
  const { data: documentData } = useQuery({
    queryKey: [`/api/documents/${documentId}/${chapterFromUrl}`],
    queryFn: () => fetch(`/api/documents/${documentId}/${chapterFromUrl}`).then(res => res.json()),
    enabled: !!documentId
  });

  // Fetch annotations for current chapter
  const { data: annotations = [] } = useQuery({
    queryKey: [`/api/annotations/${documentId}/${chapterFromUrl}`],
    queryFn: () => fetch(`/api/annotations/${documentId}/${chapterFromUrl}`).then(res => res.json()),
    enabled: !!documentId
  });

  useEffect(() => {
    if (documentData) {
      setSelectedDocument(documentData.document);
      setCurrentChapter(chapterFromUrl);
    }
  }, [documentData, chapterFromUrl]);

  const handleDocumentSelect = (document: Document, chapter = 1) => {
    navigate(`/reader/${document.id}/${chapter}`);
  };

  const handleTextSelected = (text: string, paragraph: number | null) => {
    setSelectedText(text);
    setSelectedParagraph(paragraph);
    setAnnotationModalOpen(true);
  };

  const handleCloseAnnotationModal = () => {
    setAnnotationModalOpen(false);
    setSelectedText("");
    setSelectedParagraph(null);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  // If no document is selected, show the document library
  if (!documentId || !selectedDocument) {
    return <DocumentLibrary onSelectDocument={handleDocumentSelect} />;
  }

  // If document data is loading or not found
  if (!documentData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  const currentChapterData = documentData.chapter;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-background text-foreground">
        <TopBar
          book={selectedDocument.title}
          chapter={currentChapter}
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
          isPlaying={false}
          onTogglePlayback={() => {}}
          currentTime={0}
          duration={0}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onGoHome={handleGoHome}
        />
        
        <div className="flex">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentBook={selectedDocument.title}
            currentChapter={currentChapter}
            documentId={selectedDocument.id}
            totalChapters={selectedDocument.totalChapters}
            onChapterSelect={(chapter: number) => handleDocumentSelect(selectedDocument, chapter)}
          />
          
          <DocumentContent
            document={selectedDocument}
            chapter={currentChapterData}
            annotations={annotations}
            onTextSelected={handleTextSelected}
          />
        </div>

        <AnnotationModal
          isOpen={annotationModalOpen}
          onClose={handleCloseAnnotationModal}
          selectedText={selectedText}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          chapter={currentChapter}
          paragraph={selectedParagraph}
        />
      </div>
    </div>
  );
}