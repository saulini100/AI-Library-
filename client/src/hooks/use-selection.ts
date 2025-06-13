import { useCallback, useEffect } from "react";

interface UseSelectionProps {
  onSelection: (text: string, paragraph: number | null) => void;
}

export function useSelection({ onSelection }: UseSelectionProps) {
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) return;

    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    // Walk up the DOM to find the paragraph container
    let element = commonAncestor.nodeType === Node.TEXT_NODE 
      ? commonAncestor.parentElement 
      : commonAncestor as Element;
    
    // Check if selection is within document content area only
    let isInDocumentContent = false;
    let paragraph: number | null = null;
    
    while (element) {
      // Check if we're inside a paragraph with data-paragraph attribute
      if (element.hasAttribute?.('data-paragraph')) {
        paragraph = parseInt(element.getAttribute('data-paragraph') || '0');
        isInDocumentContent = true;
        break;
      }
      
      // Check if we're in excluded areas (titles, sidebars, headers, etc.)
      if (element.classList?.contains('chapter-title') || 
          element.classList?.contains('sidebar') ||
          element.classList?.contains('topbar') ||
          element.tagName === 'H1' || 
          element.tagName === 'H2' || 
          element.tagName === 'H3' ||
          element.closest('.sidebar') ||
          element.closest('.topbar') ||
          element.closest('header')) {
        // Selection is in excluded area, don't allow annotation
        selection.removeAllRanges();
        return;
      }
      
      element = element.parentElement;
    }

    // Only proceed if selection is within document content paragraphs
    if (!isInDocumentContent || paragraph === null) {
      selection.removeAllRanges();
      return;
    }

    // Clear the selection
    selection.removeAllRanges();
    
    // Trigger callback with selected text
    if (selectedText) {
      onSelection(selectedText, paragraph);
    }
  }, [onSelection]);

  const startSelection = useCallback(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [handleTextSelection]);

  return { handleTextSelection, startSelection };
}
