import { useCallback, useEffect } from "react";

interface UseSelectionProps {
  onSelection: (text: string, paragraph: number | null) => void;
}

export function useSelection({ onSelection }: UseSelectionProps) {
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) return;

    const selectedText = selection.toString().trim();
    
    // Try to find the paragraph number from the selection's context
    let paragraph: number | null = null;
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    // Walk up the DOM to find the paragraph container
    let element = commonAncestor.nodeType === Node.TEXT_NODE 
      ? commonAncestor.parentElement 
      : commonAncestor as Element;
      
    while (element && !element.hasAttribute?.('data-paragraph')) {
      element = element.parentElement;
    }
    
    if (element && element.hasAttribute('data-paragraph')) {
      paragraph = parseInt(element.getAttribute('data-paragraph') || '0');
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
