import { useCallback } from "react";

interface UseSelectionProps {
  onSelection: (text: string, verse: number | null) => void;
}

export function useSelection({ onSelection }: UseSelectionProps) {
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) return;

    const selectedText = selection.toString().trim();
    
    // Try to find the verse number from the selection's context
    let verse: number | null = null;
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    // Walk up the DOM to find the verse container
    let element = commonAncestor.nodeType === Node.TEXT_NODE 
      ? commonAncestor.parentElement 
      : commonAncestor as Element;
      
    while (element && !element.hasAttribute?.('data-verse')) {
      element = element.parentElement;
    }
    
    if (element && element.hasAttribute('data-verse')) {
      verse = parseInt(element.getAttribute('data-verse') || '0');
    }

    // Clear the selection
    selection.removeAllRanges();
    
    // Only trigger if we have both text and verse
    if (selectedText && verse) {
      onSelection(selectedText, verse);
    }
  }, [onSelection]);

  return { handleTextSelection };
}
