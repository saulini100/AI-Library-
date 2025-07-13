import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { aiLearningService, LearningData, AgentCommunication } from "@/services/ai-learning-service";
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
  Brain
} from 'lucide-react';

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
}

interface AINavigationAgentProps {
  currentBook?: string;
  currentChapter?: number;
}

export default function AINavigationAgent({ currentBook, currentChapter }: AINavigationAgentProps = {}) {
  const [isActive, setIsActive] = useState(false);
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

      const response = await fetch('/api/ai-analyze-definition', {
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.analysis;
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    }

    return generateEnhancedFallbackAnalysis(cleanTerm, results);
  };

  // Generate enhanced fallback analysis with DuckDuckGo integration
  const generateEnhancedFallbackAnalysis = (term: string, results: SearchResult[]): AIResponse => {
    const isQuantumPhysics = currentBook?.toLowerCase().includes('quantum');
    const isPhysics = currentBook?.toLowerCase().includes('physics');
    
    // Try to extract definition from DuckDuckGo results first
    const duckDuckGoResults = results.filter(result => result.source.toLowerCase().includes('duckduckgo'));
    let definition = '';
    let context = '';
    let examples: string[] = [];
    
    // Use DuckDuckGo definition if available
    if (duckDuckGoResults.length > 0) {
      const primaryResult = duckDuckGoResults.find(r => r.title.toLowerCase().includes('definition')) || duckDuckGoResults[0];
      definition = primaryResult.snippet || `"${term}" - definition from ${primaryResult.source}`;
      
      // Extract context from related results
      if (duckDuckGoResults.length > 1) {
        context = `Additional context: ${duckDuckGoResults[1].snippet?.substring(0, 150)}...`;
      }
      
      // Generate examples based on available results
      examples = duckDuckGoResults.slice(0, 3).map((result, index) => {
        if (result.title.includes('Related Topic')) {
          return `Related concept: ${result.snippet?.substring(0, 50)}...`;
        }
        return `Source ${index + 1}: ${result.source}`;
      });
    } else {
      // Fallback to original logic
      if (isQuantumPhysics) {
        definition = `"${term}" is a quantum mechanical concept essential for understanding quantum phenomena.`;
        context = `In quantum physics, this concept helps explain the fundamental behavior of matter and energy at the quantum scale.`;
        examples = ['Mathematical formulation', 'Physical interpretation', 'Experimental observations'];
      } else if (isPhysics) {
        definition = `"${term}" represents a fundamental physical principle that governs natural phenomena.`;
        context = `This concept is developed through theoretical analysis and experimental evidence.`;
        examples = ['Theoretical foundations', 'Mathematical relationships', 'Real-world applications'];
      } else {
        definition = `"${term}" is a significant concept that requires careful analysis within its proper context.`;
        context = `This term contributes to understanding and should be studied within its appropriate framework.`;
        examples = ['Contextual usage', 'Theoretical significance', 'Practical applications'];
      }
    }

    return {
      definition,
      context,
      examples,
      relatedTerms: extractRelatedTerms(term),
      sources: results
    };
  };

  // Generate fallback analysis (kept for backward compatibility)
  const generateFallbackAnalysis = (term: string, results: SearchResult[]): AIResponse => {
    return generateEnhancedFallbackAnalysis(term, results);
  };

  // Extract related terms
  const extractRelatedTerms = (query: string): string[] => {
    const terms: Record<string, string[]> = {
      'quantum': ['superposition', 'entanglement', 'uncertainty', 'wave function'],
      'energy': ['momentum', 'force', 'power', 'work'],
      'definition': ['meaning', 'concept', 'explanation', 'interpretation']
    };

    const queryLower = query.toLowerCase();
    for (const [key, relatedTerms] of Object.entries(terms)) {
      if (queryLower.includes(key)) {
        return relatedTerms;
      }
    }
    
    return ['related concept', 'similar term', 'connected idea'];
  };

  // Learn from results
  const learnFromResults = async (query: string, analysis: AIResponse, results: SearchResult[]) => {
    const cleanTerm = query.replace(/^(define|explain|what is|meaning of):?\s*/i, '').trim();
    
    try {
      const definitionLearning: LearningData = {
        id: `def-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentSource: 'navigation',
        type: 'definition',
        term: cleanTerm,
        content: analysis.definition,
        context: {
          book: currentBook,
          chapter: currentChapter,
          timestamp: new Date().toISOString(),
          confidence: 0.95
        },
        relatedTerms: analysis.relatedTerms,
        sources: results.map(r => r.url),
        metadata: { 
          fullAnalysis: analysis,
          searchResults: results,
          searchQuery: query
        }
      };

      await aiLearningService.addLearning(definitionLearning);

      setLearnedTerms(prev => {
        const newTerms = [cleanTerm, ...analysis.relatedTerms.slice(0, 3)];
        const uniqueTerms = [...prev];
        newTerms.forEach(term => {
          if (!uniqueTerms.includes(term)) {
            uniqueTerms.push(term);
          }
        });
        return uniqueTerms.slice(-20);
      });

      aiLearningService.shareInsight(
        'navigation',
        `Learned definition of "${cleanTerm}": ${analysis.definition.substring(0, 150)}...`,
        { 
          term: cleanTerm, 
          book: currentBook, 
          chapter: currentChapter
        },
        analysis.relatedTerms
      );
      
    } catch (error) {
      console.error('Learning failed:', error);
    }
  };

  // Generate contextual response
  const generateContextualResponse = async (query: string, analysis: AIResponse, book?: string, chapter?: number): Promise<string> => {
    const bookContext = book ? `\n\n**Context in ${book}${chapter ? ` Chapter ${chapter}` : ''}:**\n${analysis.context}` : '';
    
    return `**${analysis.definition}**${bookContext}\n\n**Key Examples:**\n${analysis.examples.map(ex => `• ${ex}`).join('\n')}\n\n**Related Terms:** ${analysis.relatedTerms.join(', ')}\n\n**Sources:** ${analysis.sources.map(s => s.source).join(', ')}`;
  };

  // Update suggestions
  const updateSuggestions = async () => {
    try {
      const expertSuggestions = await generateAISmartSuggestions(currentBook, currentChapter);
      const sharedSuggestions = aiLearningService.getSmartSuggestions(currentBook, currentChapter, 'navigation');
      const learnedSuggestions = learnedTerms.slice(-2).map(term => `What is ${term}`);
      
      const combinedSuggestions = [
        ...expertSuggestions.slice(0, 4),
        ...sharedSuggestions.slice(0, 1),
        ...learnedSuggestions.slice(0, 1)
      ];
      
      const uniqueSuggestions = Array.from(new Set(combinedSuggestions))
        .filter(suggestion => suggestion && suggestion.trim().length > 0)
        .slice(0, 6);
      
      setSuggestions(uniqueSuggestions);
    } catch (error) {
      console.error('Error updating suggestions:', error);
      setSuggestions([]);
    }
  };

  // Generate AI-powered suggestions
  const generateAISmartSuggestions = async (bookTitle?: string, chapter?: number): Promise<string[]> => {
    if (!bookTitle) return [];

    try {
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: bookTitle,
          chapter: chapter,
          requestType: 'definition_suggestions',
          sharedLearning: sharedLearning,
          previousLearning: learnedTerms
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
    } catch (error) {
      console.error('AI suggestions failed:', error);
    }

    return generateFallbackSuggestions(bookTitle, chapter);
  };

  // Generate fallback suggestions
  const generateFallbackSuggestions = (bookTitle: string, chapter?: number): string[] => {
    const bookLower = bookTitle.toLowerCase();
    
    if (bookLower.includes('quantum')) {
      return [
        "What is quantum superposition",
        "What is wave function collapse",
        "What is quantum entanglement",
        "What is the uncertainty principle"
      ];
    } else if (bookLower.includes('physics')) {
      return [
        "What is energy conservation",
        "What is Newton's laws",
        "What is electromagnetic field",
        "What is thermodynamics"
      ];
    } else {
      return [
        `What is the core concepts in ${bookTitle}`,
        "What is the key principles",
        "What is the main methodology",
        "What is the fundamental terms"
      ];
    }
  };

  // Analyze book context
  const analyzeBookContext = async (bookTitle: string): Promise<{contextType: string, bookType: string}> => {
    const bookLower = bookTitle.toLowerCase();
    
    if (bookLower.includes('quantum')) {
      return { contextType: 'quantum_physics_study', bookType: 'quantum_physics' };
    } else if (bookLower.includes('physics')) {
      return { contextType: 'physics_study', bookType: 'physics' };
    } else if (bookLower.includes('math')) {
      return { contextType: 'mathematics_study', bookType: 'mathematics' };
    } else if (bookLower.includes('science')) {
      return { contextType: 'science_study', bookType: 'science' };
    } else {
      return { contextType: 'universal_study', bookType: 'academic' };
    }
  };

  // 🚀 ENHANCED WEB SCRAPING & LEARNING SEARCH
  const performIntelligentWebScraping = async (query: string): Promise<any[]> => {
    try {
      console.log(`🕷️ Starting intelligent web scraping for: "${query}"`);
      
      const response = await fetch('/api/web/search-and-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          maxResults: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Scraped ${data.totalPages} pages, learned ${data.learnedDefinitions} definitions`);
        return data.results || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ Intelligent web scraping failed:', error);
      return [];
    }
  };

  // Main search handler with enhanced AI scraping
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    
    // Enhance query for definition focus
    const enhancedQuery = enhanceQueryForDefinitions(query);
    const isDefinitionSearch = enhancedQuery !== query;
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: isDefinitionSearch ? `${query} (⚡ Fast AI scraping with llama3.2:3b)` : query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // 🚀 NEW: Intelligent web scraping with AI learning
      const scrapedResults = await performIntelligentWebScraping(enhancedQuery);
      
      // Convert scraped results to search results format
      const webSearchResults = scrapedResults.map(scraped => ({
        title: scraped.title,
        snippet: scraped.aiAnalysis.summary,
        url: scraped.url,
        source: `AI Scraped (${scraped.metadata.contentType})`
      }));

      setSearchResults(webSearchResults);

      // Step 2: Enhanced AI analysis with scraped data
      const aiAnalysis = await analyzeScrapedResults(enhancedQuery, scrapedResults);

      // Step 3: Learn from scraped results (already done by server)
      await learnFromScrapedResults(enhancedQuery, scrapedResults);

      // Step 4: Generate enhanced response with scraped insights
      const contextualResponse = await generateEnhancedResponse(enhancedQuery, aiAnalysis, scrapedResults, currentBook, currentChapter);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: contextualResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update suggestions based on learned definitions
      updateSuggestions();
      
    } catch (error) {
      console.error('Enhanced search error:', error);
      
      // Fallback to traditional search
      try {
        const webSearchResults = await performWebSearch(enhancedQuery);
        setSearchResults(webSearchResults);
        const aiAnalysis = await analyzeSearchResults(enhancedQuery, webSearchResults);
        await learnFromResults(enhancedQuery, aiAnalysis, webSearchResults);
        const contextualResponse = await generateContextualResponse(enhancedQuery, aiAnalysis, currentBook, currentChapter);
        
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: contextualResponse + "\n\n*Note: Used fallback search method*",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (fallbackError) {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: "I encountered an error while searching. Please try again with a different query.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setQuery("");
      setIsSearching(false);
    }
  };

  // 🧠 ANALYZE SCRAPED RESULTS WITH AI
  const analyzeScrapedResults = async (query: string, scrapedResults: any[]): Promise<AIResponse> => {
    if (scrapedResults.length === 0) {
      return generateFallbackAnalysis(query, []);
    }

    // Extract comprehensive data from scraped results
    const allDefinitions = scrapedResults.flatMap(result => result.extractedData.definitions);
    const allKeyPoints = scrapedResults.flatMap(result => result.extractedData.keyPoints);
    const allExamples = scrapedResults.flatMap(result => result.extractedData.examples);
    const allRelatedTerms = scrapedResults.flatMap(result => result.extractedData.relatedTerms);

    // Create comprehensive analysis
    const primaryDefinition = allDefinitions.find(def => 
      def.term.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(def.term.toLowerCase())
    );

    return {
      definition: primaryDefinition?.definition || 
                 allDefinitions[0]?.definition || 
                 `Based on web analysis: ${scrapedResults[0]?.aiAnalysis.summary}`,
      context: `Domain: ${scrapedResults[0]?.aiAnalysis.domain}, Complexity: ${scrapedResults[0]?.aiAnalysis.complexity}`,
      examples: allExamples.slice(0, 5),
      relatedTerms: Array.from(new Set(allRelatedTerms)).slice(0, 8),
      sources: scrapedResults.map(result => ({
        title: result.title,
        snippet: result.aiAnalysis.summary,
        url: result.url,
        source: `AI Scraped (Learning Value: ${Math.round(result.aiAnalysis.learningValue * 100)}%)`
      }))
    };
  };

  // 🎯 ENHANCED RESPONSE GENERATION
  const generateEnhancedResponse = async (
    query: string, 
    analysis: AIResponse, 
    scrapedResults: any[], 
    book?: string, 
    chapter?: number
  ): Promise<string> => {
    const totalDefinitions = scrapedResults.reduce((total, result) => 
      total + result.extractedData.definitions.length, 0
    );
    
    const avgLearningValue = scrapedResults.reduce((total, result) => 
      total + result.aiAnalysis.learningValue, 0
    ) / scrapedResults.length;

    const bookContext = book ? `\n\n**Context in ${book}${chapter ? ` Chapter ${chapter}` : ''}:**\n${analysis.context}` : '';
    
    const enhancedInfo = `\n\n**🧠 AI Learning Stats:**\n• Scraped ${scrapedResults.length} pages\n• Learned ${totalDefinitions} definitions\n• Average learning value: ${Math.round(avgLearningValue * 100)}%\n• Content complexity: ${scrapedResults[0]?.aiAnalysis.complexity || 'intermediate'}`;
    
    return `**${analysis.definition}**${bookContext}\n\n**Key Examples:**\n${analysis.examples.map(ex => `• ${ex}`).join('\n')}\n\n**Related Terms:** ${analysis.relatedTerms.join(', ')}\n\n**Sources:** ${analysis.sources.map(s => s.source).join(', ')}${enhancedInfo}`;
  };

  // 📚 LEARN FROM SCRAPED RESULTS
  const learnFromScrapedResults = async (query: string, scrapedResults: any[]): Promise<void> => {
    try {
      // Extract all learned terms from scraped results
      const newTerms = scrapedResults.flatMap(result => 
        result.extractedData.definitions.map((def: any) => def.term)
      );

      // Update learned terms
      setLearnedTerms(prev => {
        const uniqueTerms = [...prev];
        newTerms.forEach((term: string) => {
          if (!uniqueTerms.includes(term)) {
            uniqueTerms.push(term);
          }
        });
        return uniqueTerms.slice(-20); // Keep last 20
      });

      // Share insights with other agents
      for (const result of scrapedResults) {
        for (const definition of result.extractedData.definitions) {
          aiLearningService.shareInsight(
            'navigation',
            `AI scraped definition of "${definition.term}": ${definition.definition.substring(0, 150)}...`,
            { 
              term: definition.term, 
              book: currentBook, 
              chapter: currentChapter,
              source: result.url,
              learningValue: result.aiAnalysis.learningValue
            },
            result.extractedData.relatedTerms
          );
        }
      }
      
      console.log(`🧠 Learned from ${scrapedResults.length} scraped pages`);
    } catch (error) {
      console.error('Learning from scraped results failed:', error);
    }
  };

  // Enhance query to focus on definitions
  const enhanceQueryForDefinitions = (query: string): string => {
    const trimmedQuery = query.trim();
    
    // If already a definition query, return as is
    if (/^(define|explain|what is|meaning of|definition of)/i.test(trimmedQuery)) {
      return trimmedQuery;
    }
    
    // If it's a single word or short phrase, make it a definition query
    if (trimmedQuery.split(' ').length <= 3 && !/^(what|who|where|when|why|how)/i.test(trimmedQuery)) {
      return `define ${trimmedQuery}`;
    }
    
    // If it's a question about meaning, enhance it
    if (/^(what|who|where|when|why|how)/i.test(trimmedQuery)) {
      return `${trimmedQuery} definition meaning`;
    }
    
    // For longer queries, add definition context
    return `${trimmedQuery} definition meaning context`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleTeachDefinition = async () => {
    if (!customDefinition.trim()) return;
    
    try {
      await fetch('/api/teach-definition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          definition: customDefinition,
          context: { book: currentBook, chapter: currentChapter }
        }),
      });
      
      setCustomDefinition("");
      setShowLearningMode(false);
      loadKnowledgeStats();
    } catch (error) {
      console.error('Failed to teach definition:', error);
    }
  };

  useEffect(() => {
    loadKnowledgeStats();
    updateSuggestions();
    
    const handleAgentCommunication = (communication: AgentCommunication) => {
      if (communication.type === 'share-learning') {
        const contextualLearning = aiLearningService.getContextualLearning(currentBook || '', currentChapter);
        setSharedLearning(contextualLearning.slice(0, 5));
        updateSuggestions();
      }
    };

    aiLearningService.subscribeAgent('navigation', handleAgentCommunication);
    setAgentStats(aiLearningService.getAgentStats());

    return () => {
      aiLearningService.unsubscribeAgent('navigation');
    };
  }, []);

  useEffect(() => {
    updateSuggestions();
    
    if (currentBook) {
      const contextualLearning = aiLearningService.getContextualLearning(currentBook, currentChapter);
      setSharedLearning(contextualLearning.slice(0, 5));
    }
  }, [currentBook, currentChapter, learnedTerms]);

  const loadKnowledgeStats = async () => {
    try {
      const response = await fetch('/api/knowledge-stats');
      if (response.ok) {
        const data = await response.json();
        setKnowledgeStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load knowledge stats:', error);
    }
  };

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* AI Agent Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              AI Navigator
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Smart
              </Badge>
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {currentBook ? (
                <span>
                  🎯 Expert contextual analysis for <strong>{currentBook}</strong>
                  {currentChapter && <span> Ch.{currentChapter}</span>}
                  {currentBook.toLowerCase().includes('quantum') && <span className="text-blue-600"> • Quantum Physics</span>}
                  {currentBook.toLowerCase().includes('physics') && !currentBook.toLowerCase().includes('quantum') && <span className="text-green-600"> • Physics</span>}
                  {currentBook.toLowerCase().includes('math') && <span className="text-orange-600"> • Mathematics</span>}
                  <span className="text-orange-600"> • DuckDuckGo API</span>
                </span>
              ) : (
                <span>
                  AI-powered contextual search & learning 
                  <span className="text-orange-600"> • DuckDuckGo API integrated</span>
                </span>
              )}
              {knowledgeStats && (
                <span className="ml-1 text-purple-600 dark:text-purple-400">
                  • {knowledgeStats.totalTerms} learned
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLearningMode(!showLearningMode)}
            className="h-8"
            title="Teach me a definition"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={isActive ? "default" : "outline"}
            onClick={() => setIsActive(!isActive)}
            className="h-8"
          >
            <Sparkles className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Learning Mode */}
      {showLearningMode && (
        <Card className="border-green-200 dark:border-green-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-600" />
              Teach AI Navigator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      )}

      {/* Main Search Interface */}
      {isActive && (
        <Card className="border-purple-200 dark:border-purple-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-600" />
              DuckDuckGo Definition Search
              <Badge variant="outline" className="text-xs px-1 py-0 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                🦆 Free & Unlimited
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  placeholder={
                    currentBook?.toLowerCase().includes('quantum') 
                      ? "🦆 DuckDuckGo search: quantum physics definitions... (e.g., 'superposition', 'entanglement')"
                      : currentBook?.toLowerCase().includes('physics')
                      ? "🦆 DuckDuckGo search: physics definitions... (e.g., 'energy', 'momentum')"
                      : "🦆 DuckDuckGo search: definitions and meanings..."
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pr-16 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isSearching}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" title="DuckDuckGo API integrated - Free unlimited search!" />
                  {query.trim() && /^(define|explain|what is|meaning of)/i.test(query.trim()) && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Definition search detected - optimized for web scraping" />
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
                    Learn
                  </>
                )}
              </Button>
            </div>

            {/* Smart Suggestions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">AI-powered suggestions:</p>
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

            {/* Messages */}
            {messages.length > 0 && (
              <ScrollArea className="h-64 w-full border rounded-md p-3">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Web Sources ({searchResults.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{result.source}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{result.title}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(result.url, '_blank')}
                          className="h-6 w-6 p-0"
                        >
                          <Link className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shared Learning */}
            {sharedLearning.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Shared AI Knowledge ({sharedLearning.length})
                </h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {sharedLearning.map((learning, index) => (
                    <div key={index} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-700 dark:text-blue-300">{learning.term}</span>
                        <Badge variant="outline" className="text-xs">
                          {learning.agentSource}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 truncate">{learning.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Progress */}
            {learnedTerms.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  My Learning ({learnedTerms.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {learnedTerms.slice(-10).map((term, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                  {learnedTerms.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{learnedTerms.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 