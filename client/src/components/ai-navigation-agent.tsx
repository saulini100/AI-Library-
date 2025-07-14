import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, 
  Search, 
  Globe, 
  Sparkles, 
  Plus,
  Send,
  Loader2,
  BookOpen,
  Lightbulb,
  Link,
  Clock,
  Brain,
  X,
  Minimize2,
  Maximize2,
  Target,
  ThumbsUp,
  ThumbsDown,
  StickyNote
} from 'lucide-react';
import { aiLearningService, LearningData, AgentCommunication, FeedbackData } from "@/services/ai-learning-service";
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

interface AIResponse {
  definition: string;
  context: string;
  examples: string[];
  relatedTerms: string[];
  sources: SearchResult[];
  metadata?: {
    gemma3nAnalysis?: boolean;
    complexity?: string;
    learningValue?: string;
    model?: string;
  };
}

interface AINavigationAgentProps {
  documentId?: number;
  chapter?: number;
  isOpen: boolean;
  onToggle: () => void;
  currentBook?: string;
  currentChapter?: number;
}

const POSITION_KEY = 'aiNavigationAgentPanelPosition';
const MINIMIZED_KEY = 'aiNavigationAgentPanelMinimized';

export default function AINavigationAgent({ 
  documentId,
  chapter,
  isOpen,
  onToggle,
  currentBook,
  currentChapter
}: AINavigationAgentProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [showLearningMode, setShowLearningMode] = useState(false);
  const [customDefinition, setCustomDefinition] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [learnedTerms, setLearnedTerms] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [sharedLearning, setSharedLearning] = useState<LearningData[]>([]);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MINIMIZED_KEY) === 'true';
    }
    return false;
  });
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'positive' | 'negative'>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<Message | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Drag state - initialize with proper default position
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        } catch {}
      }
    }
    const defaultX = window.innerWidth - 500 - 16;
    const defaultY = window.innerHeight - 700 - 16;
    return { x: Math.max(20, defaultX), y: Math.max(96, defaultY) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { currentLanguage, translate, isTranslating, getLanguageConfig } = useLanguage();
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; visible: boolean; loading: boolean }>>({});

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // DuckDuckGo-only web search function (free, unlimited, no API key)
  const performWebSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    const cleanTerm = searchQuery.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
    
    console.log(`🦆 Searching DuckDuckGo for: "${cleanTerm}"`);
    
    // Use DuckDuckGo Instant Answer API exclusively
    const duckDuckGoResults = await performDuckDuckGoSearch(cleanTerm);
    
    if (duckDuckGoResults.length > 0) {
      console.log(`✅ DuckDuckGo found ${duckDuckGoResults.length} results`);
      return duckDuckGoResults;
    }
    
    // Only fallback to basic results if DuckDuckGo completely fails
    console.log('⚠️ DuckDuckGo returned no results, using basic fallback');
    return await generateDefinitionFocusedResults(searchQuery);
  };

  // DuckDuckGo Instant Answer API integration (free, no API key required)
  const performDuckDuckGoSearch = async (term: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(term)}&format=json&no_html=1&skip_disambig=1`);
      
      if (!response.ok) {
        console.log('DuckDuckGo API request failed');
        return [];
      }
      
      const data = await response.json();
      const results: SearchResult[] = [];
      
      // Extract definition from Abstract (primary definition)
      if (data.Abstract && data.Abstract.length > 0) {
        results.push({
          title: `${term} - Definition`,
          snippet: data.Abstract,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(term)}`,
          source: data.AbstractSource || 'DuckDuckGo'
        });
      }
      
      // Extract definition from Answer (direct answers)
      if (data.Answer && data.Answer.length > 0) {
        results.push({
          title: `${term} - Direct Answer`,
          snippet: data.Answer,
          url: data.AnswerURL || `https://duckduckgo.com/?q=${encodeURIComponent(term)}`,
          source: 'DuckDuckGo Answer'
        });
      }
      
      // Extract from Definition (dictionary definitions)
      if (data.Definition && data.Definition.length > 0) {
        results.push({
          title: `${term} - Dictionary Definition`,
          snippet: data.Definition,
          url: data.DefinitionURL || `https://duckduckgo.com/?q=${encodeURIComponent(term)}`,
          source: data.DefinitionSource || 'Dictionary'
        });
      }
      
      // Extract from Related Topics
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, 3).forEach((topic: any, index: number) => {
          if (topic.Text && topic.Text.length > 0) {
            results.push({
              title: `${term} - Related Topic ${index + 1}`,
              snippet: topic.Text,
              url: topic.FirstURL || `https://duckduckgo.com/?q=${encodeURIComponent(term)}`,
              source: 'DuckDuckGo Related'
            });
          }
        });
      }
      
      // Extract from Infobox (structured data)
      if (data.Infobox && data.Infobox.content && data.Infobox.content.length > 0) {
        const infoContent = data.Infobox.content
          .filter((item: any) => item.data_type === 'string' && item.value)
          .slice(0, 2)
          .map((item: any) => `${item.label}: ${item.value}`)
          .join('. ');
          
        if (infoContent) {
          results.push({
            title: `${term} - Key Information`,
            snippet: infoContent,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(term)}`,
            source: 'DuckDuckGo Infobox'
          });
        }
      }
      
      console.log(`DuckDuckGo found ${results.length} results for "${term}"`);
      return results;
      
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
      return [];
    }
  };

  // DuckDuckGo-only search (this function kept for potential future use)
  const getUniversalSearchSources = (bookType: string): string[] => {
    // Since we're using DuckDuckGo exclusively, this returns DuckDuckGo only
    return ['duckduckgo.com'];
  };

  // Format search query specifically for definitions
  const formatSearchQueryForDefinitions = (query: string): string => {
    const cleanQuery = query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
    const definitionKeywords = ['definition', 'meaning', 'explanation', 'concept', 'terminology'];
    return `"${cleanQuery}" ${definitionKeywords.join(' OR ')}`;
  };

    // Generate DuckDuckGo-focused fallback results (when API fails)
  const generateDefinitionFocusedResults = async (searchQuery: string): Promise<SearchResult[]> => {
    const cleanTerm = searchQuery.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();

    return [
      {
        title: `${cleanTerm} - Search on DuckDuckGo`,
        snippet: `Search for "${cleanTerm}" definition and meaning on DuckDuckGo - privacy-focused search engine.`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(cleanTerm + ' definition meaning')}`,
        source: 'DuckDuckGo'
      },
      {
        title: `${cleanTerm} - Wikipedia Search`,
        snippet: `Find comprehensive information about "${cleanTerm}" on Wikipedia via DuckDuckGo.`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(cleanTerm + ' site:wikipedia.org')}`,
        source: 'Wikipedia (via DuckDuckGo)'
      },
      {
        title: `${cleanTerm} - Academic Search`,
        snippet: `Academic and educational resources for "${cleanTerm}" through DuckDuckGo search.`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(cleanTerm + ' academic definition explanation')}`,
        source: 'Academic Sources'
      }
    ];
  };

  // AI analysis function focused on contextual definitions with DuckDuckGo integration
  const analyzeSearchResults = async (searchQuery: string, results: SearchResult[]): Promise<AIResponse> => {
    const cleanTerm = searchQuery.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
    
    // Check if we have DuckDuckGo results - they're often high quality definitions
    const duckDuckGoResults = results.filter(result => result.source.toLowerCase().includes('duckduckgo'));
    const hasDDGDefinition = duckDuckGoResults.some(result => 
      result.title.toLowerCase().includes('definition') || 
      result.source.toLowerCase().includes('dictionary')
    );
    
    try {
      const isQuantumPhysics = currentBook?.toLowerCase().includes('quantum');
      const isPhysics = currentBook?.toLowerCase().includes('physics');
      const isMath = currentBook?.toLowerCase().includes('math');
      const isScience = currentBook?.toLowerCase().includes('science');
      
      let focusAreas: string[] = [];
      
      if (isQuantumPhysics) {
        focusAreas = ['quantum_mechanical_definition', 'mathematical_formulation', 'physical_interpretation'];
      } else if (isPhysics) {
        focusAreas = ['physics_definition', 'theoretical_foundation', 'mathematical_relationships'];
      } else if (isMath) {
        focusAreas = ['mathematical_definition', 'formal_notation', 'theoretical_properties'];
      } else if (isScience) {
        focusAreas = ['scientific_definition', 'empirical_evidence', 'theoretical_framework'];
      } else {
        focusAreas = ['academic_definition', 'theoretical_framework', 'practical_applications'];
      }

      // Use Gemma 3N for enhanced definition analysis
      const gemmaAnalysis = await performGemma3NAnalysis(cleanTerm, results, {
        book: currentBook,
        chapter: currentChapter,
        focusAreas: focusAreas,
        hasDuckDuckGoDefinition: hasDDGDefinition,
        duckDuckGoResults: duckDuckGoResults
      });

      if (gemmaAnalysis) {
        return gemmaAnalysis;
      }

      // Fallback to API analysis
      const response = await fetch('/api/ai-learning/ai-analyze-definition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          term: cleanTerm,
          searchResults: results,
          context: {
            book: currentBook,
            chapter: currentChapter,
            focusAreas: focusAreas,
            hasDuckDuckGoDefinition: hasDDGDefinition,
            duckDuckGoResults: duckDuckGoResults
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.analysis;
      } else {
        console.warn('AI analysis failed, using fallback');
        return generateEnhancedFallbackAnalysis(cleanTerm, results);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      return generateFallbackAnalysis(cleanTerm, results);
    }
  };

  // Gemma 3N analysis function
  const performGemma3NAnalysis = async (term: string, results: SearchResult[], context: any): Promise<AIResponse | null> => {
    try {
      // Prepare the search results for Gemma 3N analysis
      const searchData = results.map(result => ({
        title: result.title,
        content: result.snippet,
        source: result.source,
        url: result.url
      })).slice(0, 5); // Limit to top 5 results for efficiency

      const prompt = `Analyze the following search results for the term "${term}" and provide a comprehensive definition.

Context: ${context.book ? `Book: ${context.book}` : ''} ${context.chapter ? `Chapter: ${context.chapter}` : ''}
Focus Areas: ${context.focusAreas?.join(', ') || 'general'}

Search Results:
${searchData.map((result, index) => `${index + 1}. ${result.title} (${result.source})
   ${result.content}`).join('\n\n')}

Please provide a structured analysis in JSON format with the following fields:
{
  "definition": "Clear, comprehensive definition of the term",
  "context": "How this term relates to the current book/chapter context",
  "examples": ["Example 1", "Example 2"],
  "relatedTerms": ["term1", "term2", "term3"],
  "complexity": "basic|intermediate|advanced",
  "learningValue": "high|medium|low"
}

Focus on providing accurate, educational content that would be valuable for learning.`;

      const response = await fetch('/api/ollama/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3n:e2b',
          prompt: prompt,
          temperature: 0.3,
          maxTokens: 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysis = data.response;
        
        if (!analysis) {
          console.warn('No response received from Gemma 3N API');
          return null;
        }
        
        // Try to parse the JSON response
        try {
          // First, try to extract JSON from the response if it's wrapped in markdown
          let jsonText = analysis.trim();
          
          // Remove markdown code blocks if present
          jsonText = jsonText.replace(/```json\s*|\s*```/g, '');
          jsonText = jsonText.replace(/```\s*|\s*```/g, '');
          
          // Try to find JSON object in the response
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
          
          const parsedAnalysis = JSON.parse(jsonText);
          
          // Validate that we have the required fields
          if (!parsedAnalysis.definition) {
            console.warn('Gemma 3N response missing definition field');
            return null;
          }
          
          return {
            definition: parsedAnalysis.definition || `A comprehensive definition for "${term}" based on available sources.`,
            context: parsedAnalysis.context || (context.book ? `Context: ${context.book}${context.chapter ? ` Chapter ${context.chapter}` : ''}` : ''),
            examples: parsedAnalysis.examples || [`Example usage of ${term} in context`],
            relatedTerms: parsedAnalysis.relatedTerms || extractRelatedTerms(term),
            sources: results.map(result => ({
              title: result.title,
              snippet: result.snippet,
              url: result.url,
              source: result.source
            })),
            metadata: {
              gemma3nAnalysis: true,
              complexity: parsedAnalysis.complexity || 'intermediate',
              learningValue: parsedAnalysis.learningValue || 'medium',
              model: 'gemma3n:e2b'
            }
          };
        } catch (parseError) {
          console.warn('Failed to parse Gemma 3N response as JSON:', parseError);
          console.warn('Raw response:', analysis.substring(0, 200) + '...');
          return null;
        }
      } else {
        console.error('Gemma 3N API request failed:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Gemma 3N analysis failed:', error);
      
      // Log additional details for debugging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    }
    
    return null;
  };

  const generateEnhancedFallbackAnalysis = (term: string, results: SearchResult[]): AIResponse => {
    const definition = results.length > 0 
      ? results[0].snippet 
      : `A comprehensive definition for "${term}" based on available sources.`;

    const context = currentBook 
      ? `Context: ${currentBook}${currentChapter ? ` Chapter ${currentChapter}` : ''}`
      : '';

    const examples = results
      .filter(result => result.title && result.title.includes('example'))
      .map(result => result.snippet)
      .slice(0, 2);

    const relatedTerms = extractRelatedTerms(term);

    return {
      definition,
      context,
      examples: examples.length > 0 ? examples : [`Example usage of ${term} in context`],
      relatedTerms,
             sources: results.map(result => ({
         title: result.title,
         snippet: result.snippet,
         url: result.url,
         source: result.source
       }))
    };
  };

  const generateFallbackAnalysis = (term: string, results: SearchResult[]): AIResponse => {
    return generateEnhancedFallbackAnalysis(term, results);
  };

  const extractRelatedTerms = (query: string): string[] => {
    const terms = query.toLowerCase().split(/\s+/);
    const relatedTerms: string[] = [];
    
    terms.forEach(term => {
      if (term.length > 3 && !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(term)) {
        relatedTerms.push(term);
      }
    });
    
    return relatedTerms.slice(0, 5);
  };

  const learnFromResults = async (query: string, analysis: AIResponse, results: SearchResult[]) => {
    try {
      const term = query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
      
      // Primary learning data
      const learningData: LearningData = {
        id: `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentSource: 'navigation',
        type: 'definition',
        term: term,
        content: analysis.definition,
        context: {
          book: currentBook,
          chapter: currentChapter,
          timestamp: new Date().toISOString(),
          confidence: analysis.metadata?.gemma3nAnalysis ? 0.9 : 0.8
        },
        relatedTerms: analysis.relatedTerms,
        sources: results.map(r => r.url),
        metadata: {
          analysis,
          searchResults: results,
          gemma3nAnalysis: analysis.metadata?.gemma3nAnalysis || false,
          model: analysis.metadata?.model || 'fallback',
          complexity: analysis.metadata?.complexity || 'intermediate',
          learningValue: analysis.metadata?.learningValue || 'medium',
          documentId: documentId,
          examples: analysis.examples,
          context: analysis.context
        }
      };

      await aiLearningService.addLearning(learningData);
      setLearnedTerms((prev: string[]) => [...prev, query]);
      
      // Enhanced learning data for Gemma 3N analysis
      if (analysis.metadata?.gemma3nAnalysis) {
        const enhancedLearningData: LearningData = {
          id: `nav-gemma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          agentSource: 'navigation',
          type: 'analysis',
          term: term,
          content: `Enhanced definition with ${analysis.metadata.complexity} complexity and ${analysis.metadata.learningValue} learning value: ${analysis.definition}`,
          context: {
            book: currentBook,
            chapter: currentChapter,
            timestamp: new Date().toISOString(),
            confidence: 0.95
          },
          relatedTerms: analysis.relatedTerms,
          sources: results.map(r => r.url),
          complexity: analysis.metadata.complexity as 'basic' | 'intermediate' | 'advanced',
          metadata: {
            gemma3nEnhanced: true,
            model: 'gemma3n:e2b',
            complexity: analysis.metadata.complexity,
            learningValue: analysis.metadata.learningValue,
            examples: analysis.examples,
            context: analysis.context,
            documentId: documentId
          }
        };

        await aiLearningService.addLearning(enhancedLearningData);
      }

      // Trigger learning agent tasks for deep learning
      if (documentId) {
        try {
          // Send learning task to server for processing
          await fetch('/api/ai-learning/trigger-learning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: documentId,
              chapter: currentChapter,
              term: term,
              analysis: analysis,
              searchResults: results,
              learningType: 'navigation-definition',
              gemma3nAnalysis: analysis.metadata?.gemma3nAnalysis || false
            })
          });
        } catch (error) {
          console.warn('Failed to trigger learning agent task:', error);
        }
      }

      // Share insights with other agents
      aiLearningService.shareInsight('navigation', 
        `Learned definition for "${term}": ${analysis.definition}`, 
        {
          term: term,
          book: currentBook,
          chapter: currentChapter,
          sources: results.map(r => r.url),
          complexity: analysis.metadata?.complexity || 'intermediate'
        },
        analysis.relatedTerms
      );
      
      console.log('✅ Navigation agent learned from results', analysis.metadata?.gemma3nAnalysis ? '(Gemma 3N enhanced)' : '');
      console.log('🧠 Triggered learning agent for deep learning of:', term);
    } catch (error) {
      console.error('Failed to learn from results:', error);
    }
  };

  const generateContextualResponse = async (query: string, analysis: AIResponse, book?: string, chapter?: number): Promise<string> => {
    const contextInfo = book ? ` (from ${book}${chapter ? ` Chapter ${chapter}` : ''})` : '';
    
    return `**${query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim()}**${contextInfo}

${analysis.definition}

${analysis.context ? `**Context:** ${analysis.context}` : ''}

${analysis.examples.length > 0 ? `**Examples:**\n${analysis.examples.map(ex => `• ${ex}`).join('\n')}` : ''}

${analysis.relatedTerms.length > 0 ? `**Related Terms:** ${analysis.relatedTerms.join(', ')}` : ''}

${analysis.sources.length > 0 ? `**Sources:** ${analysis.sources.map(s => s.source).join(', ')}` : ''}`;
  };

  const updateSuggestions = async () => {
    try {
      const newSuggestions = await generateAISmartSuggestions(currentBook, currentChapter);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to update suggestions:', error);
      setSuggestions(generateFallbackSuggestions(currentBook || 'General', currentChapter));
    }
  };

  const generateAISmartSuggestions = async (bookTitle?: string, chapter?: number): Promise<string[]> => {
    if (!bookTitle) {
      return ['Define: artificial intelligence', 'Explain: machine learning', 'What is: neural network'];
    }

    try {
      const analysis = await analyzeBookContext(bookTitle);
      const suggestions: string[] = [];

      if (analysis.contextType === 'quantum') {
        suggestions.push(
          'Define: superposition',
          'Explain: quantum entanglement',
          'What is: wave function',
          'Define: quantum tunneling',
          'Explain: Heisenberg uncertainty'
        );
      } else if (analysis.contextType === 'physics') {
        suggestions.push(
          'Define: energy',
          'Explain: momentum',
          'What is: force',
          'Define: acceleration',
          'Explain: gravity'
        );
      } else if (analysis.contextType === 'math') {
        suggestions.push(
          'Define: derivative',
          'Explain: integral',
          'What is: limit',
          'Define: function',
          'Explain: equation'
        );
      } else {
        suggestions.push(
          'Define: concept',
          'Explain: theory',
          'What is: principle',
          'Define: method',
          'Explain: approach'
        );
      }

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      return generateFallbackSuggestions(bookTitle, chapter);
    }
  };

  const generateFallbackSuggestions = (bookTitle: string, chapter?: number): string[] => {
    const suggestions: string[] = [];
    
    if (bookTitle.toLowerCase().includes('quantum')) {
      suggestions.push('Define: quantum', 'Explain: superposition', 'What is: entanglement');
    } else if (bookTitle.toLowerCase().includes('physics')) {
      suggestions.push('Define: energy', 'Explain: momentum', 'What is: force');
    } else if (bookTitle.includes('math')) {
      suggestions.push('Define: derivative', 'Explain: integral', 'What is: function');
    } else {
      suggestions.push('Define: concept', 'Explain: theory', 'What is: principle');
    }
    
    return suggestions;
  };

  const analyzeBookContext = async (bookTitle: string): Promise<{contextType: string, bookType: string}> => {
    const title = bookTitle.toLowerCase();
    
    if (title.includes('quantum')) {
      return { contextType: 'quantum', bookType: 'physics' };
    } else if (title.includes('physics')) {
      return { contextType: 'physics', bookType: 'science' };
    } else if (title.includes('math')) {
      return { contextType: 'math', bookType: 'mathematics' };
    } else if (title.includes('science')) {
      return { contextType: 'science', bookType: 'academic' };
    } else {
      return { contextType: 'general', bookType: 'academic' };
    }
  };

  const performIntelligentWebScraping = async (query: string): Promise<any[]> => {
    try {
      const response = await fetch('/api/web-scraping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          sources: getUniversalSearchSources('general'),
          maxResults: 5
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
    } catch (error) {
      console.error('Web scraping failed:', error);
    }
    
    return [];
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Perform web search
      const searchResults = await performWebSearch(query);
      setSearchResults(searchResults);

      // Analyze results with AI
      const analysis = await analyzeSearchResults(query, searchResults);

      // Generate contextual response
      const response = await generateContextualResponse(query, analysis, currentBook, currentChapter);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Learn from results
      await learnFromResults(query, analysis, searchResults);

      // Update suggestions
      await updateSuggestions();

    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while searching. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
      setQuery('');
    }
  };

  const analyzeScrapedResults = async (query: string, scrapedResults: any[]): Promise<AIResponse> => {
    const cleanTerm = query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
    
    const definitions = scrapedResults
      .filter(result => result.content && result.content.length > 0)
      .map(result => result.content)
      .slice(0, 3);

    const definition = definitions.length > 0 
      ? definitions[0] 
      : `A comprehensive definition for "${cleanTerm}" based on available sources.`;

    const context = currentBook 
      ? `Context: ${currentBook}${currentChapter ? ` Chapter ${currentChapter}` : ''}`
      : '';

    const examples = scrapedResults
      .filter(result => result.title && result.title.includes('example'))
      .map(result => result.content)
      .slice(0, 2);

    const relatedTerms = extractRelatedTerms(cleanTerm);

    return {
      definition,
      context,
      examples: examples.length > 0 ? examples : [`Example usage of ${cleanTerm} in context`],
      relatedTerms,
      sources: scrapedResults.map(result => ({
        title: result.title || 'Web Source',
        snippet: result.content || '',
        url: result.url || '',
        source: result.source || 'Web'
      }))
    };
  };

  const generateEnhancedResponse = async (
    query: string, 
    analysis: AIResponse, 
    scrapedResults: any[], 
    book?: string, 
    chapter?: number
  ): Promise<string> => {
    const contextInfo = book ? ` (from ${book}${chapter ? ` Chapter ${chapter}` : ''})` : '';
    
    return `**${query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim()}**${contextInfo}

${analysis.definition}

${analysis.context ? `**Context:** ${analysis.context}` : ''}

${analysis.examples.length > 0 ? `**Examples:**\n${analysis.examples.map(ex => `• ${ex}`).join('\n')}` : ''}

${analysis.relatedTerms.length > 0 ? `**Related Terms:** ${analysis.relatedTerms.join(', ')}` : ''}

**Enhanced Sources:** ${scrapedResults.map(s => s.source).join(', ')}`;
  };

  const learnFromScrapedResults = async (query: string, scrapedResults: any[]): Promise<void> => {
    try {
      const analysis = await analyzeScrapedResults(query, scrapedResults);
      
      const learningData: LearningData = {
        id: `nav-scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentSource: 'navigation',
        type: 'definition',
        term: query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim(),
        content: analysis.definition,
        context: {
          book: currentBook,
          chapter: currentChapter,
          timestamp: new Date().toISOString(),
          confidence: 0.7
        },
        relatedTerms: analysis.relatedTerms,
        sources: scrapedResults.map(r => r.url),
        metadata: {
          analysis,
          scrapedResults
        }
      };

      await aiLearningService.addLearning(learningData);
      setLearnedTerms((prev: string[]) => [...prev, query]);
      
      console.log('✅ Navigation agent learned from scraped results');
    } catch (error) {
      console.error('Failed to learn from scraped results:', error);
    }
  };

  const enhanceQueryForDefinitions = (query: string): string => {
    const cleanQuery = query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
    
    if (!/^(define|explain|what is|meaning of)/i.test(query)) {
      return `define ${cleanQuery}`;
    }
    
    return query;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setTimeout(() => handleSearch(), 100);
  };

  const handleTeachDefinition = async () => {
    if (!customDefinition.trim()) return;

    try {
      const learningData: LearningData = {
        id: `nav-teach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentSource: 'navigation',
        type: 'definition',
        term: 'user-taught definition',
        content: customDefinition,
        context: {
          book: currentBook,
          chapter: currentChapter,
          timestamp: new Date().toISOString(),
          confidence: 0.9
        },
        relatedTerms: [],
        sources: [],
        metadata: {
          userTaught: true,
          originalQuery: customDefinition
        }
      };

      await aiLearningService.addLearning(learningData);
      setCustomDefinition('');
      setShowLearningMode(false);
      
      const message: Message = {
        id: `teach-${Date.now()}`,
        role: 'assistant',
        content: 'Thank you! I\'ve learned from your definition. This will help me provide better explanations in the future.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, message]);
      
    } catch (error) {
      console.error('Failed to teach definition:', error);
    }
  };

  const submitFeedback = async (message: Message, feedback: 'positive' | 'negative', reason?: string) => {
    try {
      const feedbackData: FeedbackData = {
        messageId: message.id,
        feedback: feedback,
        reason: reason,
        documentId: documentId,
        chapter: currentChapter,
        userId: 1, // Default user ID
        agentId: 'navigation',
        messageContent: message.content
      };

      await aiLearningService.sendFeedback(feedbackData);
      setFeedbackSent(prev => ({ ...prev, [message.id]: feedback }));
      
      console.log(`✅ Feedback submitted: ${feedback} for message ${message.id}`);
      
      // Close feedback dialog
      setFeedbackMessage(null);
      setFeedbackReason('');
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleFeedback = async (message: Message, feedback: 'positive' | 'negative') => {
    if (feedback === 'positive') {
      await submitFeedback(message, feedback);
    } else {
      // For negative feedback, show dialog for reason
      setFeedbackMessage(message);
    }
  };

  const handleNegativeFeedbackSubmit = () => {
    if (feedbackMessage) {
      submitFeedback(feedbackMessage, 'negative', feedbackReason);
    }
  };

  // Agent communication handler
  useEffect(() => {
    const handleAgentCommunication = (communication: AgentCommunication) => {
      if (communication.fromAgent !== 'navigation' && communication.type === 'share-learning') {
        setSharedLearning(prev => [...prev, communication.data]);
      }
    };

    aiLearningService.subscribeAgent('navigation', handleAgentCommunication);
    return () => aiLearningService.unsubscribeAgent('navigation');
  }, []);

  const loadKnowledgeStats = async () => {
    try {
      const response = await fetch('/api/ai-learning/knowledge-stats');
      if (response.ok) {
        const data = await response.json();
        setKnowledgeStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load knowledge stats:', error);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Constrain to viewport
    const maxX = window.innerWidth - 500;
    const maxY = window.innerHeight - 700;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    });
  }, [isDragging, dragOffset, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragOffset({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;

      const maxX = window.innerWidth - 500;
      const maxY = window.innerHeight - 700;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    const element = chatRef.current;
    if (element) {
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchmove', handleTouchMove);
      element.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 500;
      const maxY = window.innerHeight - 700;
      
      setPosition((prev: { x: number; y: number }) => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load initial data
  useEffect(() => {
    updateSuggestions();
    loadKnowledgeStats();
  }, [currentBook, currentChapter]);

  // Handler to translate a message
  const handleTranslateMessage = async (message: Message) => {
    console.log('🔄 Translation requested for message:', message.id);
    console.log('🌍 Current language:', currentLanguage);
    console.log('📝 Message content:', message.content);
    
    setTranslatedMessages(prev => ({
      ...prev,
      [message.id]: { text: '', visible: true, loading: true }
    }));
    try {
      // Determine target language - always translate to a different language
      let targetLanguage: string;
      if (currentLanguage === 'en') {
        targetLanguage = 'es'; // English to Spanish
      } else if (currentLanguage === 'es') {
        targetLanguage = 'en'; // Spanish to English
      } else if (currentLanguage === 'fr') {
        targetLanguage = 'en'; // French to English
      } else if (currentLanguage === 'de') {
        targetLanguage = 'en'; // German to English
      } else if (currentLanguage === 'ja') {
        targetLanguage = 'en'; // Japanese to English
      } else if (currentLanguage === 'ko') {
        targetLanguage = 'en'; // Korean to English
      } else {
        targetLanguage = 'en'; // Default to English
      }

      const translated = await translate({
        text: message.content,
        targetLanguage: targetLanguage as any,
        context: 'explanation'
      });
      console.log('✅ Translation completed:', translated);
      setTranslatedMessages(prev => ({
        ...prev,
        [message.id]: { text: translated, visible: true, loading: false }
      }));
    } catch (error) {
      console.error('❌ Translation failed:', error);
      setTranslatedMessages(prev => ({
        ...prev,
        [message.id]: { text: 'Translation failed', visible: true, loading: false }
      }));
    }
  };

  // Handler to toggle translation visibility
  const handleToggleTranslation = (messageId: string) => {
    console.log('🔄 Toggle translation for message:', messageId);
    setTranslatedMessages(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        visible: !prev[messageId]?.visible
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      ref={chatRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none'
      }}
    >
      <Card className={`w-[500px] transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[700px]'} shadow-2xl border-2 border-purple-200/30 ${
        isDragging ? 'select-none cursor-grabbing' : ''
      }`} style={{
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'box-shadow 0.2s ease-out' : 'all 0.3s ease-out',
        zIndex: isDragging ? 60 : 50
      }}>
        <CardHeader 
          className={`pb-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 select-none transition-all duration-200 ${
            isDragging ? 'cursor-grabbing bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800/30 dark:to-blue-800/30' : 'cursor-grab hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-800/30 dark:hover:to-blue-800/30'
          }`}
          onMouseDown={handleMouseDown}
          onDragStart={(e) => e.preventDefault()}
          style={{ 
            userSelect: 'none',
            touchAction: 'none'
          }}
          title="Drag to move"
        >
                      <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                AI Navigator
                <Badge className={`text-xs ${knowledgeStats ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {knowledgeStats ? 'Online' : 'Offline'}
                </Badge>
                {/* Drag indicator */}
                <div className="flex gap-0.5 ml-2 opacity-50">
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                </div>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => {
                    setIsMinimized(!isMinimized);
                    localStorage.setItem(MINIMIZED_KEY, (!isMinimized).toString());
                  }}
                  className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={onToggle}
                  className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[620px]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Target className="h-12 w-12 mx-auto mb-4 text-purple-500/50" />
                    <p className="text-sm">Welcome to your AI Navigator!</p>
                    <p className="text-xs mt-2">Search for definitions and explanations with DuckDuckGo integration.</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    // Try to extract sources from the message content (AIResponse format)
                    let sources: SearchResult[] = [];
                    if (message.role === 'assistant') {
                      // Try to parse sources from the message content (if present)
                      // We'll use a simple regex to extract URLs from the message content
                      // and match them to the current searchResults
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const urls = (message.content.match(urlRegex) || []) as string[];
                      sources = searchResults.filter(s => urls.includes(s.url));
                      // If no direct match, fallback to all searchResults
                      if (sources.length === 0 && searchResults.length > 0) {
                        sources = searchResults;
                      }
                    }
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group ${
                          message.role === 'user' 
                            ? 'message-slide-right animate-in' 
                            : 'message-slide-left animate-in'
                        } ${
                          index < 5 ? `message-stagger-${Math.min(index + 1, 5)}` : ''
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 transition-all duration-300 message-bubble-pop gpu-accelerated ${
                            message.role === 'user'
                              ? 'bg-purple-500 text-white hover:scale-[1.02] shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                              : 'bg-muted hover:bg-muted/80 hover:scale-[1.01] shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                          } ${
                            message.role === 'assistant' ? 'cursor-text' : ''
                          }`}
                          data-message-id={message.id}
                          data-message-role={message.role}
                          data-agent="Navigation Agent"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1 text-xs opacity-70 message-header animate-in fade-in delay-200">
                            <div className="flex items-center gap-2">
                              <div className="relative agent-avatar agent-active transition-all duration-300">
                                <Target className="h-3 w-3" />
                              </div>
                              <span className="font-medium">Navigation Agent</span>
                            </div>
                            {message.role === 'assistant' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-purple-500 hover:text-purple-700 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 btn-scale"
                                title="Save as note"
                              >
                                <StickyNote className="h-3 w-3 animate-in bounce-in delay-500" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm select-text agent-message-content whitespace-pre-wrap">{message.content}</p>
                          {/* Translation button and translated text */}
                          {message.role === 'assistant' && (
                            <div className="mt-2 flex flex-col gap-1">
                              {(!translatedMessages[message.id] || !translatedMessages[message.id].visible) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-fit px-2 py-0.5 text-xs"
                                  onClick={() => handleTranslateMessage(message)}
                                  disabled={isTranslating || translatedMessages[message.id]?.loading}
                                >
                                  {translatedMessages[message.id]?.loading ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1 inline-block" />
                                  ) : (
                                    <Globe className="w-3 h-3 mr-1 inline-block" />
                                  )}
                                  Translate to {currentLanguage === 'en' ? 'Spanish' : currentLanguage === 'es' ? 'English' : getLanguageConfig(currentLanguage)?.name || currentLanguage}
                                </Button>
                              )}
                              {translatedMessages[message.id] && (
                                <div className="rounded bg-purple-50 dark:bg-purple-900/20 p-2 mt-1 text-xs text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-700 flex flex-col gap-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {currentLanguage === 'en' ? 'Spanish' : currentLanguage === 'es' ? 'English' : getLanguageConfig(currentLanguage)?.name || currentLanguage} Translation
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="px-1 py-0 text-xs"
                                      onClick={() => handleToggleTranslation(message.id)}
                                    >
                                      {translatedMessages[message.id].visible ? 'Hide' : 'Show'} Translation
                                    </Button>
                                  </div>
                                  {translatedMessages[message.id].visible && (
                                    <span>{translatedMessages[message.id].text}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-xs opacity-70 mt-1 timestamp">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 p-0 hover:text-green-500 disabled:opacity-100 ${feedbackSent[message.id] === 'positive' ? 'text-green-500' : 'text-muted-foreground'}`}
                                  onClick={() => handleFeedback(message, 'positive')}
                                  disabled={!!feedbackSent[message.id]}
                                  title="Good explanation"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 p-0 hover:text-red-500 disabled:opacity-100 ${feedbackSent[message.id] === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`}
                                  onClick={() => handleFeedback(message, 'negative')}
                                  disabled={!!feedbackSent[message.id]}
                                  title="Needs improvement"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {/* Render sources if this is an assistant message and there are sources */}
                          {message.role === 'assistant' && sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {sources.map((source, idx) => (
                                <a
                                  key={source.url + idx}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-xs text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-700 hover:bg-purple-200 hover:underline transition-colors"
                                  title={source.title || source.source}
                                >
                                  <Globe className="w-3 h-3 mr-1" />
                                  {source.title ? source.title.slice(0, 40) : source.source}
                                </a>
                              ))}
                            </div>
                          )}
                          {/* Gemma 3N badge */}
                          {message.role === 'assistant' && message.content.includes('**') && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs px-1 py-0 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                                <Brain className="w-2 h-2 mr-1" />
                                Gemma 3N
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            <div className="p-4 space-y-3">
              {/* Search Input */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder={
                      currentBook?.toLowerCase().includes('quantum') 
                        ? "🦆 Search: quantum physics definitions..."
                        : currentBook?.toLowerCase().includes('physics')
                        ? "🦆 Search: physics definitions..."
                        : "🦆 Search: definitions and meanings..."
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pr-16 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    disabled={isSearching}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" title="DuckDuckGo API integrated" />
                    {query.trim() && /^(define|explain|what is|meaning of)/i.test(query.trim()) && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Definition search detected" />
                    )}
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={!query.trim() || isSearching}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-sm"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-1" />
                      {query.trim() && /^(define|explain|what is|meaning of)/i.test(query.trim()) ? 'Analyze' : 'Search'}
                    </>
                  )}
                </Button>
              </div>

              {/* Smart Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">AI suggestions:</p>
                    <Badge variant="outline" className="text-xs px-1 py-0 bg-gradient-to-r from-purple-50 to-blue-50">
                      <Sparkles className="w-2 h-2 mr-1" />
                      Smart
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.map((suggestion, index) => {
                      const isDefinitionSuggestion = /^(define|explain|what is|meaning of)/i.test(suggestion);
                      return (
                        <Button
                          key={index}
                          variant={isDefinitionSuggestion ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`text-xs h-6 px-2 transition-all duration-200 ${
                            isDefinitionSuggestion 
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm" 
                              : "border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                          }`}
                        >
                          {isDefinitionSuggestion && "🔍 "}
                          {suggestion}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Learning Mode Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLearningMode(!showLearningMode)}
                className="w-full h-8"
                title="Teach me a definition"
              >
                <Plus className="w-3 h-3 mr-1" />
                Teach AI Navigator
              </Button>

              {/* Learning Mode */}
              {showLearningMode && (
                <div className="space-y-2 p-3 border rounded-md bg-green-50 dark:bg-green-900/20">
                  <Input
                    placeholder="Share a definition or insight..."
                    value={customDefinition}
                    onChange={(e) => setCustomDefinition(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleTeachDefinition}
                      disabled={!customDefinition.trim()}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Teach
                    </Button>
                    <Button 
                      onClick={() => setShowLearningMode(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={!!feedbackMessage} onOpenChange={(isOpen) => !isOpen && setFeedbackMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide additional feedback</DialogTitle>
            <DialogDescription>
              Your feedback helps improve the navigation experience. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            placeholder="What could be improved about this response?"
            value={feedbackReason}
            onChange={(e) => setFeedbackReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackMessage(null);
                setFeedbackReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNegativeFeedbackSubmit}
              disabled={!feedbackReason.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 