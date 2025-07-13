import { useState, useEffect, useCallback, useRef } from 'react';
import { Palette, Highlighter, X, BookmarkPlus, Share2, Copy, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TextSelectionProps {
  onTextSelected?: (text: string, range: Range, type?: string) => void;
  onHighlightRemoved?: (highlightId: string) => void;
  highlightColors?: string[];
}

interface Highlight {
  id: string;
  text: string;
  range: Range;
  color: string;
  position: { x: number; y: number };
}

export default function EnhancedTextSelection({
  onTextSelected,
  onHighlightRemoved,
  highlightColors = [
    'bg-yellow-200 dark:bg-yellow-800/40',
    'bg-blue-200 dark:bg-blue-800/40',
    'bg-green-200 dark:bg-green-800/40',
    'bg-pink-200 dark:bg-pink-800/40',
    'bg-purple-200 dark:bg-purple-800/40',
    'bg-orange-200 dark:bg-orange-800/40',
  ]
}: TextSelectionProps) {
  const [selection, setSelection] = useState<{
    text: string;
    range: Range;
    rect: DOMRect;
  } | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeColor, setActiveColor] = useState(highlightColors[0]);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelection(null);
      setShowToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    
    console.log('🔍 Raw selection text:', `"${selection.toString()}"`);
    console.log('🔍 Trimmed text:', `"${text}"`);
    console.log('🔍 Text length:', text.length);
    console.log('🔍 Range details:', {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      collapsed: range.collapsed
    });
    
    if (text.length === 0) {
      setSelection(null);
      setShowToolbar(false);
      return;
    }

    // Restrict: Only allow highlighting if selection is inside a single <p data-verse> or <p data-paragraph>
    let container: Node | null = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = (container as HTMLElement).parentElement;
    }
    if (!container || !(container instanceof Element)) {
      setSelection(null);
      setShowToolbar(false);
      return;
    }
    // Check if selection is inside a single allowed <p>
    const allowedP = container.closest('p[data-verse], p[data-paragraph]');
    if (!allowedP) {
      setSelection(null);
      setShowToolbar(false);
      return;
    }
    // Ensure selection does not span multiple elements
    const { startContainer, endContainer } = range;
    const startP = (startContainer.nodeType === Node.TEXT_NODE ? (startContainer as HTMLElement).parentElement : startContainer) as Element;
    const endP = (endContainer.nodeType === Node.TEXT_NODE ? (endContainer as HTMLElement).parentElement : endContainer) as Element;
    if (!startP.closest('p[data-verse], p[data-paragraph]') || !endP.closest('p[data-verse], p[data-paragraph]')) {
      setSelection(null);
      setShowToolbar(false);
      return;
    }
    if (startP.closest('p[data-verse], p[data-paragraph]') !== endP.closest('p[data-verse], p[data-paragraph]')) {
      setSelection(null);
      setShowToolbar(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    
    // Calculate toolbar position
    const toolbarX = rect.left + (rect.width / 2);
    const toolbarY = rect.top - 60; // Position above selection
    
    setSelection({ text, range, rect });
    setToolbarPosition({ x: toolbarX, y: toolbarY });
    setShowToolbar(true);
  }, []);

  // Handle highlighting
  const handleHighlight = useCallback((color: string = activeColor) => {
    if (!selection) return;

    const highlightId = `highlight-${Date.now()}`;
    
    // Store the original selection data BEFORE modifying the DOM
    const originalText = selection.text;
    const originalRange = selection.range.cloneRange(); // Clone the range to preserve it
    
    const newHighlight: Highlight = {
      id: highlightId,
      text: originalText,
      range: originalRange,
      color,
      position: { x: selection.rect.left, y: selection.rect.top }
    };

    console.log('🎯 Enhanced selection - Original text:', originalText);
    console.log('🎯 Enhanced selection - Text length:', originalText.length);
    
    // Store the selection context to help with precise highlighting
    const selectionContext = {
      startOffset: originalRange.startOffset,
      endOffset: originalRange.endOffset,
      containerText: originalRange.startContainer.textContent || '',
      beforeText: originalRange.startContainer.textContent?.substring(0, originalRange.startOffset) || '',
      afterText: originalRange.endContainer.textContent?.substring(originalRange.endOffset) || ''
    };
    
    console.log('🎯 Selection context:', selectionContext);

    try {
      // Create highlight element
      const span = document.createElement('span');
      span.className = `highlight-text ${color}`;
      span.setAttribute('data-highlight-id', highlightId);
      span.setAttribute('data-selection-highlight', 'true');
      span.textContent = originalText;
      span.title = 'Highlighted text';
      
      // Replace the selected text with the highlighted span
      selection.range.deleteContents();
      selection.range.insertNode(span);
      
      // Add to highlights state
      setHighlights(prev => [...prev, newHighlight]);
      
      // Create a new range that preserves the selection context
      const contextRange = document.createRange();
      const parentElement = originalRange.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? originalRange.commonAncestorContainer.parentElement 
        : originalRange.commonAncestorContainer as Element;
      
      if (parentElement) {
        contextRange.selectNodeContents(parentElement);
        console.log('🎯 Context range created for:', parentElement.tagName);
        console.log('🎯 Full context text:', contextRange.toString().substring(0, 100) + '...');
      }
      
      // Create a custom event with selection context for more precise highlighting
      const customEvent = new CustomEvent('preciseTextSelection', {
        detail: {
          text: originalText,
          selectionContext: selectionContext,
          type: 'highlight'
        }
      });
      document.dispatchEvent(customEvent);
      
      // Call the callback to save the highlight and open modal WITH ORIGINAL DATA
      onTextSelected?.(originalText, originalRange, 'highlight');
      
      // Add a subtle animation
      setTimeout(() => {
        span.style.transition = 'all 0.3s ease';
        span.style.transform = 'scale(1.02)';
        setTimeout(() => {
          span.style.transform = 'scale(1)';
        }, 300);
      }, 10);
      
      // Note: Click handler is now handled globally in the DocumentReader component
      // The global handler will also call onHighlightRemoved if provided
      
    } catch (error) {
      console.warn('Failed to create highlight:', error);
    }

    // Clear selection and hide toolbar
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowToolbar(false);
  }, [selection, activeColor, onTextSelected]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!selection) return;
    
    try {
      await navigator.clipboard.writeText(selection.text);
      // Show success animation
      const toolbar = toolbarRef.current;
      if (toolbar) {
        toolbar.classList.add('animate-pulse');
        setTimeout(() => toolbar.classList.remove('animate-pulse'), 500);
      }
    } catch (error) {
      console.warn('Failed to copy text:', error);
    }
  }, [selection]);

  // Share text
  const handleShare = useCallback(async () => {
    if (!selection) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          text: selection.text,
          title: 'Shared Text'
        });
      } catch (error) {
        console.warn('Failed to share:', error);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  }, [selection, handleCopy]);

  // Event listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [handleSelection]);

  // Hide toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowToolbar(false);
      }
    };

    if (showToolbar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showToolbar]);

  if (!showToolbar || !selection) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 animate-in slide-in-from-bottom duration-300 gpu-accelerated"
      style={{
        left: toolbarPosition.x,
        top: toolbarPosition.y,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 theme-transition card-hover note-creation">
        {/* Enhanced Color Palette */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center study-stagger-1">
            Study Highlighter
          </div>
          
          <div className="flex items-center gap-2 pr-2 border-r border-gray-200 dark:border-gray-700 study-stagger-2">
            <Palette className="w-4 h-4 text-gray-500 dark:text-gray-400 study-timer" />
            {highlightColors.map((color, index) => (
              <button
                key={color}
                className={`w-7 h-7 rounded-full border-2 transition-all duration-300 hover:scale-125 hover:rotate-12 ${color} ${
                  activeColor === color 
                    ? 'border-gray-900 dark:border-white shadow-lg scale-110 note-highlight' 
                    : 'border-gray-300 dark:border-gray-600'
                } highlight-apply`}
                style={{ animationDelay: `${index * 75}ms` }}
                onClick={() => setActiveColor(color)}
                title={`Study highlight color ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex items-center gap-2 study-stagger-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 btn-scale hover:scale-110 transition-all duration-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 study-stagger-1"
            onClick={() => handleHighlight()}
            title="Create study highlight"
          >
            <Highlighter className="w-4 h-4 text-yellow-600 dark:text-yellow-400 note-highlight" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 btn-scale hover:scale-110 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 study-stagger-2"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 btn-scale hover:scale-110 transition-all duration-300 hover:bg-green-50 dark:hover:bg-green-900/20 study-stagger-3"
            onClick={handleShare}
            title="Share selection"
          >
            <Share2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 btn-scale hover:scale-110 transition-all duration-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 bookmark-save study-stagger-4"
            onClick={() => onTextSelected?.(selection.text, selection.range)}
            title="Add bookmark"
          >
            <BookmarkPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 btn-scale hover:scale-110 transition-all duration-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 note-creation study-stagger-5"
            onClick={() => onTextSelected?.(selection.text, selection.range, 'note')}
            title="Add study note"
          >
            <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </Button>
        </div>

        {/* Close button */}
        <div className="pl-2 border-l border-gray-200 dark:border-gray-700">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 btn-scale animate-in slide-in-from-right"
            onClick={() => setShowToolbar(false)}
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Selection info */}
      <div className="mt-2 bg-gray-900/90 dark:bg-gray-100/90 text-white dark:text-gray-900 text-xs px-2 py-1 rounded backdrop-blur-sm text-center animate-in fade-in delay-200">
        {selection.text.length} characters selected
      </div>
    </div>
  );
}
 