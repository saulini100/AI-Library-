import { OllamaService } from './ollama-service';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko';
export type TranslationContext = 'biblical' | 'ui' | 'quiz' | 'explanation' | 'general';

interface TranslationRequest {
  text: string;
  targetLanguage: SupportedLanguage;
  sourceLanguage?: SupportedLanguage;
  context?: TranslationContext;
}

interface BatchTranslationRequest {
  requests: TranslationRequest[];
}

interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedSourceLanguage?: SupportedLanguage;
}

interface BatchTranslationResult {
  translations: string[];
  results: TranslationResult[];
}

export class GemmaTranslationService {
  private ollamaService: OllamaService;
  private translationCache: Map<string, TranslationResult> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  // Language configurations with Gemma 3n optimizations
  private languageConfig = {
    en: { name: 'English', nativeName: 'English', primaryRegions: ['US', 'UK', 'AU'] },
    es: { name: 'Spanish', nativeName: 'Español', primaryRegions: ['ES', 'MX', 'AR'] },
    fr: { name: 'French', nativeName: 'Français', primaryRegions: ['FR', 'CA'] },
    de: { name: 'German', nativeName: 'Deutsch', primaryRegions: ['DE', 'AT'] },
    ja: { name: 'Japanese', nativeName: '日本語', primaryRegions: ['JP'] },
    ko: { name: 'Korean', nativeName: '한국어', primaryRegions: ['KR'] }
  };

  constructor(ollamaService: OllamaService) {
    this.ollamaService = ollamaService;
  }

  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    console.log('🔄 Translation service called with:', request);
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      console.log('⚡ Cache hit for translation');
      return cached;
    }

    try {
      const prompt = this.buildTranslationPrompt(request);
      console.log('📝 Translation prompt:', prompt.substring(0, 200) + '...');
      
      const response = await this.ollamaService.generateText(prompt, {
        temperature: 0.3, // Lower temperature for more consistent translations
        maxTokens: Math.max(500, request.text.length * 2), // Dynamic token limit
        useCache: true
      });

      console.log('🤖 Ollama response:', response.substring(0, 200) + '...');
      const result = this.parseTranslationResponse(response, request);
      console.log('✅ Parsed translation result:', result);
      
      // Cache successful translations
      this.translationCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('❌ Translation failed:', error);
      return {
        translatedText: request.text, // Fallback to original
        confidence: 0,
        detectedSourceLanguage: request.sourceLanguage
      };
    }
  }

  async translateBatch(batchRequest: BatchTranslationRequest): Promise<BatchTranslationResult> {
    try {
      // Process in parallel for efficiency
      const results = await Promise.all(
        batchRequest.requests.map(req => this.translateText(req))
      );

      return {
        translations: results.map(r => r.translatedText),
        results
      };
    } catch (error) {
      console.error('Batch translation failed:', error);
      return {
        translations: batchRequest.requests.map(req => req.text),
        results: batchRequest.requests.map(req => ({
          translatedText: req.text,
          confidence: 0,
          detectedSourceLanguage: req.sourceLanguage
        }))
      };
    }
  }

  async detectLanguage(text: string): Promise<SupportedLanguage> {
    try {
      const prompt = `
You are a language detection expert. Analyze the following text and identify its language.

TEXT TO ANALYZE:
"${text.substring(0, 500)}" // Limit for efficiency

INSTRUCTIONS:
- Respond with ONLY the language code
- Supported codes: en, es, fr, de, ja, ko
- If uncertain, respond with "en"
- Consider context clues like religious or biblical terminology

Language code:`;

      const response = await this.ollamaService.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 10,
        useCache: true
      });

      const detectedLang = response.trim().toLowerCase();
      return this.isValidLanguage(detectedLang) ? detectedLang as SupportedLanguage : 'en';
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default fallback
    }
  }

  private buildTranslationPrompt(request: TranslationRequest): string {
    const { text, targetLanguage, sourceLanguage, context } = request;
    const targetLangName = this.languageConfig[targetLanguage].nativeName;
    const sourceLangName = sourceLanguage ? this.languageConfig[sourceLanguage].nativeName : 'detected language';

    // Simplified context instructions
    const contextHint = this.getSimpleContextHint(context || 'general');

    return `Translate this text to ${targetLangName} (from ${sourceLangName}):

"${text}"

${contextHint}

Respond with only the translation, no explanations.`;
  }

  private getSimpleContextHint(context: TranslationContext): string {
    const hints = {
      biblical: 'Use natural, respectful language.',
      ui: 'Keep it simple and clear.',
      quiz: 'Make it clear and easy to understand.',
      explanation: 'Keep it natural and educational.',
      general: 'Translate naturally.'
    };

    return hints[context] || hints.general;
  }

  private parseTranslationResponse(response: string, request: TranslationRequest): TranslationResult {
    // Clean up the response
    let translatedText = response.trim();
    
    // Remove common AI response patterns
    translatedText = translatedText
      .replace(/^"(.*)"$/, '$1') // Remove surrounding quotes
      .replace(/^Translation:\s*/i, '') // Remove "Translation:" prefix
      .replace(/^.*?:\s*/, '') // Remove any prefix with colon
      .trim();

    // Basic quality assessment
    const confidence = this.assessTranslationQuality(request.text, translatedText, request.targetLanguage);

    return {
      translatedText,
      confidence,
      detectedSourceLanguage: request.sourceLanguage
    };
  }

  private assessTranslationQuality(original: string, translated: string, targetLang: SupportedLanguage): number {
    // Simple heuristics for translation quality
    let confidence = 0.8; // Base confidence

    // Length ratio check (translations shouldn't be too different in length)
    const lengthRatio = translated.length / original.length;
    if (lengthRatio < 0.3 || lengthRatio > 3) {
      confidence -= 0.3;
    }

    // Check if translation actually changed (unless same language)
    if (original === translated && targetLang !== 'en') {
      confidence -= 0.4;
    }

    // Check for obvious failures
    if (translated.length < 3 || translated.includes('I cannot') || translated.includes('I don\'t')) {
      confidence = 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateCacheKey(request: TranslationRequest): string {
    return `${request.sourceLanguage || 'auto'}-${request.targetLanguage}-${request.context || 'general'}-${Buffer.from(request.text).toString('base64').substring(0, 50)}`;
  }

  private isValidLanguage(lang: string): boolean {
    return Object.keys(this.languageConfig).includes(lang);
  }

  // Public utility methods
  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(this.languageConfig) as SupportedLanguage[];
  }

  getLanguageInfo(code: SupportedLanguage) {
    return this.languageConfig[code];
  }

  // Cache management
  clearCache(): void {
    this.translationCache.clear();
  }

  getCacheSize(): number {
    return this.translationCache.size;
  }

  // Specialized methods for common use cases
  async translateDocumentContent(content: string, targetLang: SupportedLanguage, sourceLang?: SupportedLanguage): Promise<string> {
    const result = await this.translateText({
      text: content,
      targetLanguage: targetLang,
      sourceLanguage: sourceLang,
      context: 'biblical'
    });
    return result.translatedText;
  }

  async translateQuizContent(quiz: any, targetLang: SupportedLanguage): Promise<any> {
    try {
      // Prepare batch translation requests
      const requests: TranslationRequest[] = [
        { text: quiz.title, targetLanguage: targetLang, context: 'quiz' },
        { text: quiz.description, targetLanguage: targetLang, context: 'quiz' },
        ...quiz.questions.flatMap((q: any) => [
          { text: q.question, targetLanguage: targetLang, context: 'quiz' },
          { text: q.explanation, targetLanguage: targetLang, context: 'explanation' },
          ...(q.options || []).map((opt: string) => ({
            text: opt,
            targetLanguage: targetLang,
            context: 'quiz' as TranslationContext
          }))
        ])
      ];

      const batchResult = await this.translateBatch({ requests });
      
      // Reconstruct the quiz with translations
      let translationIndex = 0;
      
      const translatedQuiz = {
        ...quiz,
        title: batchResult.translations[translationIndex++],
        description: batchResult.translations[translationIndex++],
        questions: quiz.questions.map((q: any) => ({
          ...q,
          question: batchResult.translations[translationIndex++],
          explanation: batchResult.translations[translationIndex++],
          options: q.options?.map(() => batchResult.translations[translationIndex++]) || []
        }))
      };

      return translatedQuiz;
    } catch (error) {
      console.error('Quiz translation failed:', error);
      return quiz; // Return original on failure
    }
  }
} 