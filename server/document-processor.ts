import { ProcessedDocument, DocumentChapter, DocumentParagraph } from '@shared/schema';
import { OllamaService } from './services/ollama-service';

export class DocumentProcessor {
  private ollamaService: OllamaService;

  constructor() {
    this.ollamaService = new OllamaService({
      model: 'gemma3n:e2b', // Better at document analysis, under 7GB
      temperature: 0.3 // Lower temperature for more consistent analysis
    });
  }
  
  // Process PDF files with automatic text extraction
  async processPDF(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      console.log(`📄 Processing PDF: ${filename}`);
      
      // Initialize Ollama service for AI chapter detection
      await this.ollamaService.initialize();
      
      // Extract text from PDF using dynamic import
      // @ts-ignore - pdf-extraction doesn't have types
      const pdfExtraction = await import('pdf-extraction');
      const extract = pdfExtraction.default || pdfExtraction.extract || pdfExtraction;
      const data = await extract(buffer);
      const extractedText = data.text;
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from this PDF');
      }
      
      console.log(`✅ PDF text extracted: ${extractedText.length} characters`);
      return await this.processText(extractedText, filename);
    } catch (error: any) {
      console.error(`❌ PDF processing failed:`, error);
      
      // Fallback: Create a helpful message
      const fallbackText = `PDF Processing Error for: ${filename}

This PDF could not be automatically processed. This might happen if:
- The PDF contains scanned images instead of text
- The PDF is password protected
- The PDF has complex formatting

Please try:
1. Opening the PDF and copying the text manually (Ctrl+A, Ctrl+C)
2. Pasting into a text file and uploading that instead
3. Or use an online PDF to text converter

Error details: ${error?.message || 'Unknown error'}`;
      
      console.log(`⚠️ PDF fallback message created for: ${filename}`);
      return await this.processText(fallbackText, filename);
    }
  }

  // Process TXT files
  async processTXT(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      // Initialize Ollama service for AI chapter detection
      await this.ollamaService.initialize();
      
      const text = buffer.toString('utf-8');
      return await this.processText(text, filename);
    } catch (error: any) {
      throw new Error(`Failed to process TXT: ${error?.message || 'Unknown error'}`);
    }
  }

  // Main text processing logic with intelligent chapter detection
  private async processText(text: string, filename: string): Promise<ProcessedDocument> {
    // Clean and normalize the text
    const cleanText = this.cleanText(text);
    
    // Extract title from filename or first meaningful line
    const title = this.extractTitle(cleanText, filename);
    
    // Use deterministic chapter detection (no AI dependency)
    console.log('📖 Using pattern-based chapter detection...');
    const chapters = await this.detectChaptersWithPatterns(cleanText);
    
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

  // Robust pattern-based chapter detection
  private async detectChaptersWithPatterns(text: string): Promise<DocumentChapter[]> {
    console.log('🔍 Analyzing text structure for chapter patterns...');
    
    // Try multiple detection strategies in order of preference
    const strategies = [
      () => this.detectExplicitChapters(text),
      () => this.detectNumberedSections(text),
      () => this.detectRomanNumeralSections(text),
      () => this.detectAcademicPatterns(text), // New academic-focused strategy
      () => this.detectHeadingPatterns(text),
      () => this.detectBulletPointSections(text), // New strategy
      () => this.detectPageBreaks(text),
      () => this.aiAssistedChapterDetection(text), // New AI strategy
      () => this.createSmartPagination(text)
    ];
    
    for (const strategy of strategies) {
      const chapters = await strategy();
      if (chapters.length > 1) {
        console.log(`✅ Found ${chapters.length} chapters using pattern detection`);
        return chapters;
      }
    }
    
    // Fallback to smart pagination
    console.log('📄 Using smart pagination as fallback');
    return await this.createSmartPagination(text);
  }

  // New: AI-assisted chapter boundary detection
  private async aiAssistedChapterDetection(text: string): Promise<DocumentChapter[]> {
    try {
      console.log('🤖 Using AI-assisted chapter detection...');
      
      // For very large texts, only analyze the first portion to find patterns
      const maxAnalysisSize = 10000; // Analyze first 10k chars for patterns
      const analysisText = text.length > maxAnalysisSize ? text.substring(0, maxAnalysisSize) : text;
      
      const chapterBoundaries = await this.analyzeChunkForBoundaries(analysisText, 0);
      
      if (chapterBoundaries.length > 0) {
        console.log(`🤖 AI detected ${chapterBoundaries.length} boundaries in first portion`);
        
        // If we found patterns in the first portion, try to apply them to the full text
        const appliedChapters = await this.applyPatternToFullText(text, chapterBoundaries);
        
        if (appliedChapters.length > 1) {
          console.log(`🤖 Successfully applied patterns to create ${appliedChapters.length} chapters`);
          return appliedChapters;
        } else {
          console.log(`🤖 Pattern application failed, forcing smart pagination with multiple chapters`);
          // Force smart pagination to create multiple chapters
          return await this.createSmartPagination(text);
        }
      }
      
      return [];
    } catch (error) {
      console.log('⚠️ AI chapter detection failed, falling back to pattern detection');
      return [];
    }
  }

  // Apply discovered patterns to the full text
  private async applyPatternToFullText(text: string, sampleBoundaries: DocumentChapter[]): Promise<DocumentChapter[]> {
    // Extract pattern from sample boundaries
    const patterns = sampleBoundaries.map(b => b.title).join(' | ');
    console.log(`🤖 Applying patterns: ${patterns}`);
    
    // Since AI found boundaries, let's use more aggressive pattern matching
    const lines = text.split('\n');
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    
    // Build patterns based on what AI actually found
    const foundTitles = sampleBoundaries.map(b => b.title.toLowerCase());
    const dynamicPatterns = [];
    
    // Add specific patterns based on AI findings
    for (const title of foundTitles) {
      if (title.includes('introduction')) {
        dynamicPatterns.push(/^(Introduction|INTRODUCTION)/i);
      }
      if (title.includes('tablet')) {
        dynamicPatterns.push(/^.*tablet.*$/i);
      }
      if (title.includes('creation')) {
        dynamicPatterns.push(/^.*creation.*$/i);
      }
      if (title.includes('account')) {
        dynamicPatterns.push(/^.*account.*$/i);
      }
      if (title.includes('history')) {
        dynamicPatterns.push(/^.*history.*$/i);
      }
    }
    
    // Enhanced academic/technical patterns
    const academicPatterns = [
      /^(Chapter|CHAPTER)\s+(\d+|[IVXLCDM]+)/i,
      /^(Part|PART)\s+(\d+|[IVXLCDM]+)/i,
      /^(Section|SECTION)\s+(\d+|[IVXLCDM]+)/i,
      /^([IVXLCDM]+)[\.\:\s]/i,  // Roman numerals
      /^(\d+)[\.\:\s]/,  // Numbers
      /^([A-Z][A-Z\s]{5,50})$/,  // ALL CAPS headings
      /^([A-Z][a-z\s]{10,80})$/,  // Title case headings
      ...dynamicPatterns
    ];
    
    let foundChapters = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isChapterStart = false;
      
      // Skip very short lines
      if (line.length < 3) continue;
      
      for (const pattern of academicPatterns) {
        if (pattern.test(line)) {
          isChapterStart = true;
          foundChapters++;
          console.log(`🤖 Found chapter boundary: "${line}"`);
          break;
        }
      }
      
      if (isChapterStart) {
        // Save previous chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const title = line.length > 60 ? line.substring(0, 57) + '...' : line;
        currentChapter = {
          title: title || `Chapter ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
        
        // Add the heading line
        this.addLineToChapter(currentChapter, line);
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        // Content before first chapter
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    console.log(`🤖 Pattern application created ${chapters.length} chapters from ${foundChapters} boundaries`);
    return chapters;
  }

  // Analyze a chunk of text for chapter boundaries using AI
  private async analyzeChunkForBoundaries(chunk: string, offsetPosition: number): Promise<DocumentChapter[]> {
    const prompt = `You are analyzing text to find chapter boundaries. Look at this text and find clear section breaks.

IMPORTANT: Reply with ONLY valid JSON, no other text.

Look for patterns like:
- "Chapter 1", "Chapter 2", "Part I", "Section 1"
- "1.", "2.", "3." at the start of lines
- "I.", "II.", "III." (Roman numerals)
- Clear topic changes or major headings

If you find chapter boundaries, return JSON like this:
[{"title": "Chapter 1: Introduction", "startPosition": 0}, {"title": "Chapter 2: Main Content", "startPosition": 1500}]

If no clear boundaries exist, return: []

Text to analyze:
${chunk.substring(0, 3000)}`;

    try {
      const messages = [
        { role: 'user' as const, content: prompt }
      ];
      const response = await this.ollamaService.chat(messages);
      
      // Clean the response - remove any non-JSON content
      const cleanResponse = response.trim();
      let jsonStart = cleanResponse.indexOf('[');
      let jsonEnd = cleanResponse.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = cleanResponse.substring(jsonStart, jsonEnd + 1);
        const boundaries = JSON.parse(jsonStr);
        
        if (Array.isArray(boundaries) && boundaries.length > 0) {
          console.log(`🤖 AI found ${boundaries.length} potential boundaries`);
          return boundaries.map((boundary: any, index: number) => ({
            title: boundary.title || `Section ${index + 1}`,
            number: index + 1,
            startPosition: (boundary.startPosition || 0) + offsetPosition,
            paragraphs: []
          }));
        }
      }
      
      // If we get here, no boundaries were found
      return [];
    } catch (error) {
      console.log(`🤖 AI boundary analysis failed: ${error}`);
      return [];
    }
  }

  // Create chapters from detected boundaries
  private async createChaptersFromBoundaries(text: string, boundaries: number[]): Promise<DocumentChapter[]> {
    const chapters: DocumentChapter[] = [];
    
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i];
      const end = i < boundaries.length - 1 ? boundaries[i + 1] : text.length;
      const chapterText = text.substring(start, end).trim();
      
      if (chapterText.length > 100) { // Only create substantial chapters
        const title = await this.generateChapterTitle(chapterText, i + 1);
        const paragraphs = this.splitIntoParagraphs(chapterText);
        
        chapters.push({
          title,
          number: i + 1,
          paragraphs
        });
      }
    }
    
    return chapters;
  }

  // New: Detect academic/technical document patterns
  private detectAcademicPatterns(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    
    // Academic patterns common in textbooks and research papers
    const academicPatterns = [
      /^(Abstract|ABSTRACT)$/i,
      /^(Introduction|INTRODUCTION)$/i,
      /^(Background|BACKGROUND)$/i,
      /^(Literature Review|LITERATURE REVIEW)$/i,
      /^(Methodology|METHODOLOGY|Methods|METHODS)$/i,
      /^(Results|RESULTS)$/i,
      /^(Discussion|DISCUSSION)$/i,
      /^(Conclusion|CONCLUSION|Conclusions|CONCLUSIONS)$/i,
      /^(References|REFERENCES|Bibliography|BIBLIOGRAPHY)$/i,
      /^(Appendix|APPENDIX)\s*[A-Z0-9]*$/i,
      /^(\d+)[\.\s]+(Introduction|Background|Methods|Results|Discussion|Conclusion)/i,
      /^([A-Z][A-Z\s]{8,40})$/,  // ALL CAPS headings (8-40 chars)
      /^(\d+)[\.\s]+([A-Z][^\.]{10,60})$/,  // "1. Title Case Heading"
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isAcademicSection = false;
      
      // Check for academic patterns
      for (const pattern of academicPatterns) {
        if (pattern.test(line)) {
          isAcademicSection = true;
          break;
        }
      }
      
      if (isAcademicSection) {
        // Save previous chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const title = line.length > 50 ? line.substring(0, 47) + '...' : line;
        currentChapter = {
          title: title || `Section ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
        
        // Add the heading as content if it's substantial
        if (line && line.length > 3) {
          this.addLineToChapter(currentChapter, line);
        }
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        // Content before first section
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  }

  // New: Detect bullet point or list-based sections
  private detectBulletPointSections(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    const bulletPatterns = [
      /^[\*\-\+]\s+(.+)/,           // * - + bullets
      /^(\d+[\.\)])\s+(.+)/,       // 1. 2. 3. or 1) 2) 3)
      /^([a-zA-Z][\.\)])\s+(.+)/,  // a. b. c. or a) b) c)
      /^•\s+(.+)/                   // Bullet points
    ];
    
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    let consecutiveBullets = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let isBulletPoint = false;
      let bulletContent = '';
      
      // Check if line matches any bullet pattern
      for (const pattern of bulletPatterns) {
        const match = line.match(pattern);
        if (match) {
          isBulletPoint = true;
          bulletContent = match[match.length - 1]; // Last capture group
          consecutiveBullets++;
          break;
        }
      }
      
      if (isBulletPoint && consecutiveBullets === 1) {
        // First bullet in a series - start new chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        
        const title = bulletContent.length > 50 ? 
          bulletContent.substring(0, 47) + '...' : bulletContent;
        
        currentChapter = {
          title: title || `Section ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
        
        this.addLineToChapter(currentChapter, bulletContent);
      } else if (isBulletPoint && currentChapter) {
        // Continuation of bullet series
        this.addLineToChapter(currentChapter, bulletContent);
      } else if (currentChapter && line.length > 0) {
        // Regular content in current chapter
        this.addLineToChapter(currentChapter, line);
        consecutiveBullets = 0;
      } else if (line.length === 0) {
        // Empty line - reset bullet counter
        consecutiveBullets = 0;
      } else if (!currentChapter && line.length > 0) {
        // Content before first section
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
        consecutiveBullets = 0;
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    // Only return if we found multiple sections
    return chapters.length > 1 ? chapters : [];
  }

  // Enhanced numbered sections detection with better patterns
  private detectNumberedSections(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    // Enhanced patterns for numbered sections
    const sectionPatterns = [
      /^(\d+)[\.\)\s]\s*(.+)/,                    // 1. Title or 1) Title
      /^(\d+)[\.\s]+([A-Z][^\.]{10,})/,          // 1. TITLE or 1 TITLE
      /^(Question|Problem|Exercise)\s*(\d+)/i,    // Question 1, Problem 1
      /^(\d+)[\-\s]+(.+)/                        // 1 - Title or 1 Title
    ];
    
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    let lastNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      let matchFound = false;
      
      for (const pattern of sectionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const number = parseInt(match[1]) || chapterNumber;
          
          // Only treat as new section if number is sequential or starts over
          if (number === 1 || number === lastNumber + 1) {
            // Save previous chapter
            if (currentChapter && currentChapter.paragraphs.length > 0) {
              chapters.push(currentChapter);
            }
            
            // Start new chapter
            const title = match[2] ? match[2].trim() : `Section ${number}`;
            const cleanTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
            
            currentChapter = {
              title: cleanTitle || `Section ${chapterNumber}`,
              number: chapterNumber++,
              paragraphs: []
            };
            
            // Add content if there's more than just the number
            if (title && title.length > 3) {
              this.addLineToChapter(currentChapter, title);
            }
            
            lastNumber = number;
            matchFound = true;
            break;
          }
        }
      }
      
      if (!matchFound && currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!matchFound && !currentChapter && line.length > 0) {
        // Content before first section
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  }

  // Detect explicit chapter headings (Chapter 1, Chapter 2, etc.)
  private detectExplicitChapters(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    const chapterPattern = /^(chapter|ch\.?|part|section|book)\s*(\d+|[ivxlcdm]+)[\s\.:]/i;
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(chapterPattern);
      
      if (match) {
        // Save previous chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const title = line.length > 50 ? line.substring(0, 47) + '...' : line;
        currentChapter = {
          title: title || `Chapter ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
      } else if (currentChapter && line.length > 0) {
        // Add content to current chapter
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        // Content before first chapter - create introduction
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  }

  // Detect Roman numeral sections (I., II., III., etc.)
  private detectRomanNumeralSections(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    const romanPattern = /^([IVXLCDM]+)[\.\)\s]/i;
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(romanPattern);
      
      if (match) {
        // Save previous chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const title = line.length > 50 ? line.substring(0, 47) + '...' : line;
        currentChapter = {
          title: title || `Part ${match[1]}`,
          number: chapterNumber++,
          paragraphs: []
        };
        
        // Add content after roman numeral
        const contentAfterRoman = line.substring(match[0].length).trim();
        if (contentAfterRoman.length > 0) {
          this.addLineToChapter(currentChapter, contentAfterRoman);
        }
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  }

  // Detect heading patterns (lines that look like headings)
  private detectHeadingPatterns(text: string): DocumentChapter[] {
    const lines = text.split('\n');
    const chapters: DocumentChapter[] = [];
    let currentChapter: DocumentChapter | null = null;
    let chapterNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.looksLikeHeading(line, i, lines)) {
        // Save previous chapter
        if (currentChapter && currentChapter.paragraphs.length > 0) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const title = line.length > 50 ? line.substring(0, 47) + '...' : line;
        currentChapter = {
          title: title || `Section ${chapterNumber}`,
          number: chapterNumber++,
          paragraphs: []
        };
      } else if (currentChapter && line.length > 0) {
        this.addLineToChapter(currentChapter, line);
      } else if (!currentChapter && line.length > 0) {
        currentChapter = {
          title: 'Introduction',
          number: chapterNumber++,
          paragraphs: []
        };
        this.addLineToChapter(currentChapter, line);
      }
    }
    
    // Add final chapter
    if (currentChapter && currentChapter.paragraphs.length > 0) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  }

  // Detect page breaks or form feeds
  private detectPageBreaks(text: string): DocumentChapter[] {
    const pages = text.split(/\f|\n\s*\n\s*\n/); // Form feed or multiple line breaks
    const chapters: DocumentChapter[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const pageText = pages[i].trim();
      if (pageText.length > 100) { // Only create chapter if substantial content
        const paragraphs = this.splitIntoParagraphs(pageText);
        const title = this.generatePageTitle(pageText, i + 1);
        
        chapters.push({
          title,
          number: i + 1,
          paragraphs
        });
      }
    }
    
    return chapters;
  }

  // Create smart pagination based on content length and natural breaks
  private async createSmartPagination(text: string): Promise<DocumentChapter[]> {
    console.log('📄 Creating smart pagination...');
    
    // Use word-based chunking for better readability
    const targetWordsPerChapter = 250;    // ~1-2 minutes reading time
    const minWordsPerChapter = 150;       // Minimum viable chapter
    const maxWordsPerChapter = 400;       // Maximum before splitting
    
    // Convert to approximate character counts (avg 6 chars per word including spaces)
    const targetChapterSize = targetWordsPerChapter * 6;
    const minChapterSize = minWordsPerChapter * 6;
    const maxChapterSize = maxWordsPerChapter * 6;
    
    console.log(`📖 Using word-based chunking: ${targetWordsPerChapter} words (~${targetChapterSize} chars) per chapter`);
    
    // Split into paragraphs and filter out very short ones
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    const chapters: DocumentChapter[] = [];
    
    let currentChapterText = '';
    let currentParagraphs: string[] = [];
    let chapterNumber = 1;
    
    console.log(`📊 Processing ${paragraphs.length} paragraphs for smart pagination`);
    
    // Count total words in document to determine if we need aggressive splitting
    const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
    console.log(`📊 Document contains ${totalWords} words total`);
    
    // If we only have 1 very long paragraph, split it more aggressively
    if (paragraphs.length === 1 && totalWords > 500) {
      const paragraphWords = paragraphs[0].split(/\s+/).filter(w => w.length > 0).length;
      console.log(`📄 Single large paragraph detected (${paragraphWords} words), using sentence-based splitting`);
      return await this.splitLargeParagraphIntoChapters(paragraphs[0], targetChapterSize, minChapterSize);
    }
    
    // If we have very few paragraphs but lots of words, force multiple chapters
    if (paragraphs.length <= 3 && totalWords > 1000) {
      console.log(`📄 Few paragraphs but large document (${totalWords} words), forcing multi-chapter split`);
      return await this.splitLargeParagraphIntoChapters(text, targetChapterSize, minChapterSize);
    }
    
    for (let i = 0; i < paragraphs.length; i++) {
      const trimmedParagraph = paragraphs[i].trim();
      
      // Calculate word counts instead of character counts
      const currentWordCount = currentChapterText.split(/\s+/).filter(w => w.length > 0).length;
      const paragraphWordCount = trimmedParagraph.split(/\s+/).filter(w => w.length > 0).length;
      const newWordCount = currentWordCount + paragraphWordCount;
      
      // Decide whether to break here based on word count
      const shouldBreak = currentChapterText.length > 0 && (
        newWordCount > maxWordsPerChapter || // Would exceed maximum words
        (newWordCount > targetWordsPerChapter && currentWordCount >= minWordsPerChapter) // Good break point
      );
      
      if (shouldBreak) {
        // Create chapter from current content
        const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
        const paragraphObjects = this.convertToParagraphObjects(currentParagraphs);
        
        chapters.push({
          title,
          number: chapterNumber,
          paragraphs: paragraphObjects
        });
        
        const chapterWordCount = currentChapterText.split(/\s+/).filter(w => w.length > 0).length;
        console.log(`📖 Created chapter ${chapterNumber}: ${chapterWordCount} words (${currentChapterText.length} chars), ${currentParagraphs.length} paragraphs`);
        
        // Start new chapter
        currentChapterText = trimmedParagraph;
        currentParagraphs = [trimmedParagraph];
        chapterNumber++;
      } else {
        // Add to current chapter
        if (currentChapterText.length > 0) {
          currentChapterText += '\n\n' + trimmedParagraph;
        } else {
          currentChapterText = trimmedParagraph;
        }
        currentParagraphs.push(trimmedParagraph);
      }
    }
    
    // Handle remaining content
    if (currentChapterText.trim() && currentParagraphs.length > 0) {
      const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
      const paragraphObjects = this.convertToParagraphObjects(currentParagraphs);
      
      chapters.push({
        title,
        number: chapterNumber,
        paragraphs: paragraphObjects
      });
      
      const finalChapterWordCount = currentChapterText.split(/\s+/).filter(w => w.length > 0).length;
      console.log(`📖 Created final chapter ${chapterNumber}: ${finalChapterWordCount} words (${currentChapterText.length} chars), ${currentParagraphs.length} paragraphs`);
    }
    
    console.log(`✅ Created ${chapters.length} chapters from ${text.length} characters`);
    return chapters;
  }

  // Split a very large single paragraph into multiple chapters
  private async splitLargeParagraphIntoChapters(text: string, targetSize: number, minSize: number): Promise<DocumentChapter[]> {
    const targetWords = 250;  // 250 words per chapter
    const minWords = 150;     // Minimum words per chapter
    
    console.log(`📄 Splitting large paragraph into chapters (target: ${targetWords} words)`);
    
    // Split by sentences first
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chapters: DocumentChapter[] = [];
    let currentChapterText = '';
    let currentSentences: string[] = [];
    let chapterNumber = 1;
    
    for (const sentence of sentences) {
      const currentWordCount = currentChapterText.split(/\s+/).filter(w => w.length > 0).length;
      const sentenceWordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
      const newWordCount = currentWordCount + sentenceWordCount;
      
      // Check if we should break here based on word count
      const shouldBreak = currentChapterText.length > 0 && (
        newWordCount > targetWords && currentWordCount >= minWords
      );
      
      if (shouldBreak) {
        // Create chapter from current content
        const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
        const paragraphs = this.splitIntoParagraphs(currentChapterText);
        
        chapters.push({
          title,
          number: chapterNumber,
          paragraphs
        });
        
        const chapterWords = currentChapterText.split(/\s+/).filter(w => w.length > 0).length;
        console.log(`📖 Created sentence-based chapter ${chapterNumber}: ${chapterWords} words (${currentChapterText.length} chars)`);
        
        // Start new chapter
        currentChapterText = sentence;
        currentSentences = [sentence];
        chapterNumber++;
      } else {
        // Add to current chapter
        if (currentChapterText.length > 0) {
          currentChapterText += ' ' + sentence;
        } else {
          currentChapterText = sentence;
        }
        currentSentences.push(sentence);
      }
    }
    
    // Handle remaining content
    if (currentChapterText.trim()) {
      const title = await this.generateChapterTitle(currentChapterText, chapterNumber);
      const paragraphs = this.splitIntoParagraphs(currentChapterText);
      
      chapters.push({
        title,
        number: chapterNumber,
        paragraphs
      });
      
      const finalWords = currentChapterText.split(/\s+/).filter(w => w.length > 0).length;
      console.log(`📖 Created final sentence-based chapter ${chapterNumber}: ${finalWords} words (${currentChapterText.length} chars)`);
    }
    
    console.log(`✅ Created ${chapters.length} chapters from sentence splitting`);
    return chapters;
  }

  // Helper: Check if a line looks like a heading
  private looksLikeHeading(line: string, index: number, allLines: string[]): boolean {
    if (line.length < 5 || line.length > 80) return false;
    
    // Skip if it looks like regular text (has common sentence endings)
    if (/[.!?]\s*$/.test(line)) return false;
    
    // Skip if it's all caps and very long (likely not a heading)
    if (line === line.toUpperCase() && line.length > 40) return false;
    
    // Check if next line is empty or much longer (heading pattern)
    const nextLine = allLines[index + 1];
    if (nextLine && (nextLine.trim() === '' || nextLine.length > line.length * 2)) {
      return true;
    }
    
    // Check for title case or all caps (shorter headings)
    const words = line.split(/\s+/);
    const titleCaseWords = words.filter(word => 
      word.length > 0 && word[0] === word[0].toUpperCase()
    );
    
    return titleCaseWords.length >= words.length * 0.7; // 70% title case
  }

  // Helper: Add line to chapter, managing paragraphs
  private addLineToChapter(chapter: DocumentChapter, line: string): void {
    if (chapter.paragraphs.length === 0) {
      chapter.paragraphs.push({
        number: 1,
        text: line
      });
    } else {
      const lastParagraph = chapter.paragraphs[chapter.paragraphs.length - 1];
      
      // If line is very short or looks like a continuation, append to last paragraph
      if (line.length < 50 || !line.match(/^[A-Z]/)) {
        lastParagraph.text += ' ' + line;
      } else {
        // Create new paragraph
        chapter.paragraphs.push({
          number: chapter.paragraphs.length + 1,
          text: line
        });
      }
    }
  }

  // Helper: Generate meaningful chapter titles with AI assistance
  private async generateChapterTitle(chapterText: string, chapterNumber: number): Promise<string> {
    // Try AI-generated title first for better content understanding
    try {
      const aiTitle = await this.generateAIChapterTitle(chapterText, chapterNumber);
      if (aiTitle && aiTitle.length > 5 && aiTitle.length < 80) {
        return aiTitle;
      }
    } catch (error) {
      console.log(`⚠️ AI title generation failed for chapter ${chapterNumber}, using fallback`);
    }
    
    // Fallback to pattern-based title generation
    return this.generateFallbackTitle(chapterText, chapterNumber);
  }

  // Generate AI-powered chapter title
  private async generateAIChapterTitle(chapterText: string, chapterNumber: number): Promise<string> {
    const preview = chapterText.substring(0, 1000); // First 1000 chars for context
    const prompt = `Create a concise, descriptive chapter title for this text content. 
The title should:
- Be 3-8 words long
- Capture the main topic or theme
- Be clear and informative
- NOT include "Chapter X:" prefix

Text content:
${preview}

Return only the title, nothing else.`;

    const messages = [
      { role: 'user' as const, content: prompt }
    ];
    
    const response = await this.ollamaService.chat(messages);
    return `Chapter ${chapterNumber}: ${response.trim()}`;
  }

  // Fallback title generation method
  private generateFallbackTitle(chapterText: string, chapterNumber: number): string {
    const firstSentence = chapterText.split(/[.!?]/)[0].trim();
    
    if (firstSentence.length > 10 && firstSentence.length < 60) {
      return `Chapter ${chapterNumber}: ${firstSentence}`;
    }
    
    // Use first few words
    const words = chapterText.trim().split(/\s+/).slice(0, 8);
    const preview = words.join(' ');
    return `Chapter ${chapterNumber}: ${preview.length > 50 ? preview.substring(0, 47) + '...' : preview}`;
  }

  // Convert string paragraphs to paragraph objects
  private convertToParagraphObjects(paragraphs: string[]): DocumentParagraph[] {
    return paragraphs.map((text, index) => ({
      number: index + 1,
      text: text.trim()
    }));
  }

  // Split text into paragraph objects
  private splitIntoParagraphs(text: string): DocumentParagraph[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return paragraphs.map((text, index) => ({
      number: index + 1,
      text: text.trim()
    }));
  }

  // Generate meaningful page titles
  private generatePageTitle(pageText: string, pageNumber: number): string {
    // Look for headings or important phrases in the first part of the page
    const firstLines = pageText.split('\n').slice(0, 3);
    
    for (const line of firstLines) {
      const trimmed = line.trim();
      
      // Skip very short lines, copyright notices, page numbers
      if (trimmed.length < 10 || 
          /copyright|©|all rights reserved|page \d+/i.test(trimmed) ||
          /^\d+$/.test(trimmed)) {
        continue;
      }
      
      // If we find a good heading-like line, use it
      if (trimmed.length < 80 && trimmed.length > 15) {
        // Clean up the title
        let title = trimmed.replace(/[^\w\s\-:]/g, '').trim();
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        return `Page ${pageNumber}: ${title}`;
      }
    }
    
    // Fallback: use first few words of content
    const words = pageText.trim().split(/\s+/).slice(0, 6);
    const preview = words.join(' ');
    return `Page ${pageNumber}: ${preview.length > 40 ? preview.substring(0, 37) + '...' : preview}`;
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