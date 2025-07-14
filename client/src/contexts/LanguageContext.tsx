import React, { createContext, useContext, useEffect, useState } from 'react';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko';

interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean;
  flag: string;
  gemmaSupported: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, flag: '🇺🇸', gemmaSupported: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, flag: '🇪🇸', gemmaSupported: true },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, flag: '🇫🇷', gemmaSupported: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, flag: '🇩🇪', gemmaSupported: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false, flag: '🇯🇵', gemmaSupported: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false, flag: '🇰🇷', gemmaSupported: true },
];

interface TranslationRequest {
  text: string;
  targetLanguage: SupportedLanguage;
  context?: 'biblical' | 'ui' | 'quiz' | 'explanation';
  sourceLanguage?: SupportedLanguage;
}

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  translate: (request: TranslationRequest) => Promise<string>;
  translateBatch: (requests: TranslationRequest[]) => Promise<string[]>;
  isTranslating: boolean;
  supportedLanguages: LanguageConfig[];
  getLanguageConfig: (code: SupportedLanguage) => LanguageConfig | undefined;
  // Auto-detection features
  detectLanguage: (text: string) => Promise<SupportedLanguage>;
  // Content-specific translation
  translateDocumentContent: (content: string, targetLang: SupportedLanguage) => Promise<string>;
  translateQuizContent: (quiz: any, targetLang: SupportedLanguage) => Promise<any>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(() => {
    // Auto-detect from browser or localStorage
    const saved = localStorage.getItem('bible-companion-language') as SupportedLanguage;
    if (saved && SUPPORTED_LANGUAGES.find(l => l.code === saved)) {
      return saved;
    }
    
    // Browser language detection
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    return SUPPORTED_LANGUAGES.find(l => l.code === browserLang)?.code || 'en';
  });

  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = (language: SupportedLanguage) => {
    setCurrentLanguage(language);
    localStorage.setItem('bible-companion-language', language);
    
    // Update document language attribute
    document.documentElement.lang = language;
    
    // Update text direction for RTL languages
    const config = SUPPORTED_LANGUAGES.find(l => l.code === language);
    if (config?.rtl) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  const translate = async (request: TranslationRequest): Promise<string> => {
    console.log('🌐 Translation request:', request);
    console.log('🌍 Current language:', currentLanguage);
    
    // Remove the early return to allow translation even when target language is the same
    // This allows for better debugging and potential future features

    setIsTranslating(true);
    try {
      console.log('📡 Sending translation request to API...');
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: request.text,
          targetLanguage: request.targetLanguage,
          sourceLanguage: request.sourceLanguage || currentLanguage,
          context: request.context || 'general'
        })
      });

      console.log('📡 API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Translation API error:', errorText);
        throw new Error(`Translation failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Translation API response:', data);
      return data.translatedText;
    } catch (error) {
      console.error('❌ Translation error:', error);
      return request.text; // Fallback to original text
    } finally {
      setIsTranslating(false);
    }
  };

  const translateBatch = async (requests: TranslationRequest[]): Promise<string[]> => {
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      });

      if (!response.ok) throw new Error('Batch translation failed');
      
      const data = await response.json();
      return data.translations;
    } catch (error) {
      console.error('Batch translation error:', error);
      return requests.map(req => req.text); // Fallback to original texts
    } finally {
      setIsTranslating(false);
    }
  };

  const detectLanguage = async (text: string): Promise<SupportedLanguage> => {
    try {
      const response = await fetch('/api/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('Language detection failed');
      
      const data = await response.json();
      return data.language || 'en';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Fallback to English
    }
  };

  const translateDocumentContent = async (content: string, targetLang: SupportedLanguage): Promise<string> => {
    return translate({
      text: content,
      targetLanguage: targetLang,
      context: 'biblical'
    });
  };

  const translateQuizContent = async (quiz: any, targetLang: SupportedLanguage): Promise<any> => {
    const translatedQuestions = await Promise.all(
      quiz.questions.map(async (question: any) => ({
        ...question,
        question: await translate({
          text: question.question,
          targetLanguage: targetLang,
          context: 'quiz'
        }),
        options: await translateBatch(
          question.options?.map((option: string) => ({
            text: option,
            targetLanguage: targetLang,
            context: 'quiz'
          })) || []
        ),
        explanation: await translate({
          text: question.explanation,
          targetLanguage: targetLang,
          context: 'explanation'
        })
      }))
    );

    return {
      ...quiz,
      title: await translate({
        text: quiz.title,
        targetLanguage: targetLang,
        context: 'quiz'
      }),
      description: await translate({
        text: quiz.description,
        targetLanguage: targetLang,
        context: 'quiz'
      }),
      questions: translatedQuestions
    };
  };

  const getLanguageConfig = (code: SupportedLanguage): LanguageConfig | undefined => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code);
  };

  useEffect(() => {
    // Set initial document language
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    translate,
    translateBatch,
    isTranslating,
    supportedLanguages: SUPPORTED_LANGUAGES,
    getLanguageConfig,
    detectLanguage,
    translateDocumentContent,
    translateQuizContent
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageProvider; 