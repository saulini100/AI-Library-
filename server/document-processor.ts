import pdfParse from 'pdf-parse';
import { ProcessedDocument, DocumentChapter, DocumentParagraph } from '@shared/schema';

export class DocumentProcessor {
  
  // Process PDF files
  async processPDF(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text;
      
      return this.processText(text, filename);
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  // Process TXT files
  async processTXT(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8');
      return this.processText(text, filename);
    } catch (error) {
      throw new Error(`Failed to process TXT: ${error.message}`);
    }
  }

  // Main text processing logic with intelligent chapter detection
  private processText(text: string, filename: string): ProcessedDocument {
    // Clean and normalize the text
    const cleanText = this.cleanText(text);
    
    // Extract title from filename or first meaningful line
    const title = this.extractTitle(cleanText, filename);
    
    // Detect and split chapters
    const chapters = this.detectChapters(cleanText);
    
    return {
      title,
      chapters,
      totalChapters: chapters.length
    };
  }

  // Clean and normalize text
  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers and headers/footers patterns
      .replace(/^\d+\s*$/gm, '')
      .replace(/^Page \d+.*$/gim, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove extra blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Extract title from content or filename
  private extractTitle(text: string, filename: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Look for title patterns in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip if line is too short or looks like metadata
      if (line.length < 3 || line.length > 100) continue;
      
      // Skip if it looks like a chapter heading
      if (/^(chapter|part|section)\s+\d+/i.test(line)) continue;
      
      // If line seems like a title, use it
      if (line.length > 10 && line.length < 80) {
        return line;
      }
    }
    
    // Fallback to filename without extension
    return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  // Intelligent chapter detection
  private detectChapters(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let currentParagraph = '';
    let paragraphNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        if (currentParagraph.trim()) {
          this.addParagraphToChapter(currentChapter, currentParagraph.trim(), paragraphNumber++);
          currentParagraph = '';
        }
        continue;
      }

      // Check if this line is a chapter heading
      const chapterMatch = this.isChapterHeading(line, i, lines);
      
      if (chapterMatch) {
        // Save previous chapter
        if (currentChapter) {
          if (currentParagraph.trim()) {
            this.addParagraphToChapter(currentChapter, currentParagraph.trim(), paragraphNumber++);
          }
          chapters.push(currentChapter);
        }

        // Start new chapter
        currentChapter = {
          title: chapterMatch,
          number: chapters.length + 1,
          paragraphs: []
        };
        currentParagraph = '';
        paragraphNumber = 1;
      } else {
        // Add to current paragraph
        if (currentParagraph) {
          currentParagraph += ' ' + line;
        } else {
          currentParagraph = line;
        }

        // Check if we should break paragraph (sentence ending, etc.)
        if (this.shouldBreakParagraph(line, currentParagraph)) {
          if (currentChapter) {
            this.addParagraphToChapter(currentChapter, currentParagraph.trim(), paragraphNumber++);
          } else {
            // Create default first chapter if none exists
            currentChapter = {
              title: 'Chapter 1',
              number: 1,
              paragraphs: []
            };
            this.addParagraphToChapter(currentChapter, currentParagraph.trim(), paragraphNumber++);
          }
          currentParagraph = '';
        }
      }
    }

    // Handle remaining content
    if (currentParagraph.trim() && currentChapter) {
      this.addParagraphToChapter(currentChapter, currentParagraph.trim(), paragraphNumber);
    }

    if (currentChapter) {
      chapters.push(currentChapter);
    }

    // If no chapters were detected, create a single chapter
    if (chapters.length === 0) {
      chapters.push({
        title: 'Full Document',
        number: 1,
        paragraphs: this.splitIntoParagraphs(text)
      });
    }

    return chapters;
  }

  // Check if a line is likely a chapter heading
  private isChapterHeading(line: string, index: number, allLines: string[]): string | null {
    // Common chapter patterns
    const chapterPatterns = [
      /^(chapter|ch\.?)\s+(\d+|[ivxlcdm]+)(?:\s*[:\-\.]\s*(.*))?$/i,
      /^(part|section)\s+(\d+|[ivxlcdm]+)(?:\s*[:\-\.]\s*(.*))?$/i,
      /^(\d+|[ivxlcdm]+)\.\s+(.+)$/i,
      /^([A-Z][A-Z\s]{2,})$/,  // All caps headings
    ];

    for (const pattern of chapterPatterns) {
      const match = line.match(pattern);
      if (match) {
        return line;
      }
    }

    // Check for potential headings based on context
    if (
      line.length < 100 && 
      line.length > 3 &&
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      index > 0 &&
      allLines[index - 1].trim() === '' &&
      index < allLines.length - 1 &&
      allLines[index + 1].trim() === ''
    ) {
      return line;
    }

    return null;
  }

  // Determine if we should break the current paragraph
  private shouldBreakParagraph(line: string, currentParagraph: string): boolean {
    // Break on sentence endings
    if (/[.!?]$/.test(line.trim())) {
      return true;
    }

    // Break if paragraph is getting too long
    if (currentParagraph.length > 500) {
      return true;
    }

    // Break on dialogue or special formatting
    if (line.trim().startsWith('"') || line.trim().startsWith("'")) {
      return currentParagraph.length > 50;
    }

    return false;
  }

  // Add paragraph to chapter
  private addParagraphToChapter(chapter: DocumentChapter | null, text: string, number: number): void {
    if (!chapter || !text.trim()) return;

    // Skip very short paragraphs (likely formatting artifacts)
    if (text.length < 10) return;

    chapter.paragraphs.push({
      number,
      text: text.trim()
    });
  }

  // Split text into paragraphs when no chapters are detected
  private splitIntoParagraphs(text: string): DocumentParagraph[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const paragraphs: DocumentParagraph[] = [];
    
    let currentParagraph = '';
    let paragraphNumber = 1;

    for (const sentence of sentences) {
      if (currentParagraph.length + sentence.length > 400) {
        if (currentParagraph.trim()) {
          paragraphs.push({
            number: paragraphNumber++,
            text: currentParagraph.trim() + '.'
          });
        }
        currentParagraph = sentence.trim();
      } else {
        currentParagraph += (currentParagraph ? '. ' : '') + sentence.trim();
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push({
        number: paragraphNumber,
        text: currentParagraph.trim() + '.'
      });
    }

    return paragraphs;
  }

  // Search within processed document content
  searchDocument(document: ProcessedDocument, query: string): Array<{
    chapter: number;
    paragraph: number;
    text: string;
    context: string;
  }> {
    const results: Array<{
      chapter: number;
      paragraph: number;
      text: string;
      context: string;
    }> = [];

    const searchTerm = query.toLowerCase();

    for (const chapter of document.chapters) {
      for (const paragraph of chapter.paragraphs) {
        if (paragraph.text.toLowerCase().includes(searchTerm)) {
          // Get context (surrounding text)
          const contextStart = Math.max(0, paragraph.text.toLowerCase().indexOf(searchTerm) - 50);
          const contextEnd = Math.min(paragraph.text.length, paragraph.text.toLowerCase().indexOf(searchTerm) + searchTerm.length + 50);
          
          results.push({
            chapter: chapter.number,
            paragraph: paragraph.number,
            text: paragraph.text,
            context: '...' + paragraph.text.substring(contextStart, contextEnd) + '...'
          });
        }
      }
    }

    return results;
  }
}

export const documentProcessor = new DocumentProcessor();