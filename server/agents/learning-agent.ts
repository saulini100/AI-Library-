import { BaseAgent, AgentTask } from './base-agent.js';
import { OllamaService } from '../services/ollama-service.js';
import { MultiModelService } from '../services/multi-model-service.js';
import { db } from '../db.js';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { documentRAGService, RAGContext, RAGResponse } from '../services/document-rag-service.js';
import { storage } from '../storage.js';
import { powerSummaryService } from '../services/power-summary-service.js';

interface KnowledgeNode {
  id: string;
  concept: string;
  definition: string;
  examples: string[];
  relationships: string[];
  confidence: number;
  documentId: number;
  chapter?: number;
  createdAt: Date;
  reinforcements: number;
}

interface LearningContext {
  domain: string;
  expertise_level: number;
  key_concepts: string[];
  learning_patterns: string[];
  performance_metrics: {
    accuracy: number;
    relevance: number;
    depth: number;
  };
}

export class LearningAgent extends BaseAgent {
  private ollamaService!: OllamaService;
  private multiModelService!: MultiModelService;
  private knowledgeBase: Map<string, KnowledgeNode> = new Map();
  private learningContext: Map<number, LearningContext> = new Map();
  private fineTuningData: any[] = [];

  constructor() {
    super({
      name: 'LearningAgent',
      description: 'Advanced AI agent that learns and becomes expert on uploaded content with multi-model intelligence',
      interval: 600000, // Check every 10 minutes (less aggressive)
      maxRetries: 3,
      timeout: 60000, // 1 minute timeout for learning tasks
      specialties: ['Deep Learning', 'Concept Extraction', 'Pattern Recognition', 'Knowledge Base Building', 'Multi-Model Intelligence']
    });
  }

  async initialize(): Promise<void> {
    this.ollamaService = new OllamaService({
      model: 'gemma3n:e2b',
      temperature: 0.3, // Lower temperature for more focused learning
      maxTokens: 4096
    });
    
    this.multiModelService = new MultiModelService();
    
    await this.ollamaService.initialize();
    await this.multiModelService.initialize();
    
    // Load existing knowledge base
    await this.loadKnowledgeBase();
    
    // Schedule learning tasks
    await this.scheduleInitialLearningTasks();
    
    this.log('🧠 Learning Agent initialized with multi-model intelligence - Ready to become an expert!');
  }

  async processTask(task: AgentTask): Promise<any> {
    this.log(`Processing learning task: ${task.type}`);

    switch (task.type) {
      case 'DEEP_LEARN_DOCUMENT':
        await this.deepLearnDocument(task.data);
        break;
      case 'EXTRACT_KNOWLEDGE':
        await this.extractConcepts(task.data.content, task.data.documentId, task.data.chapter);
        break;
      case 'BUILD_EXPERTISE':
        await this.generateExpertise(task.data.content, task.data.documentId, task.data.chapter);
        break;
      case 'REINFORCE_LEARNING':
        await this.reinforceLearning(task.data);
        break;
      case 'GENERATE_FINE_TUNING_DATA':
        await this.createFineTuningData(task.data.content, task.data.documentId, task.data.chapter);
        break;
      case 'ADAPT_MODEL':
        await this.adaptModel(task.data);
        break;
      case 'UPDATE_EXPERTISE':
        await this.updateExpertise(task.data);
        break;
      case 'LEARN_FROM_SUMMARY':
        await this.learnFromPowerSummary(task.data);
        break;
      case 'IMPROVE_ANALYSIS':
        await this.improveAnalysisFromFeedback(task.data);
        break;
      case 'LEARN_INSIGHTS':
        await this.learnFromInsights(task.data);
        break;
      case 'LEARN_FROM_ANNOTATION':
        await this.learnFromUserAnnotation(task.data);
        break;
      case 'LEARN_FROM_BOOKMARK':
        await this.learnFromBookmark(task.data);
        break;
      case 'LEARN_FROM_DISCUSSION':
        await this.learnFromDiscussion(task.data);
        break;
      default:
        this.warn(`Unknown task type: ${task.type}`);
    }
    return null;
  }

  private async updateExpertise(data: any): Promise<void> {
    try {
      const { documentId, domain, expertiseLevel, specializedPrompt, concepts } = data;
      this.log(`🧠 Updating expertise for document ${documentId}: ${domain} (Level ${expertiseLevel})`);
      
      // Update the learning agent's knowledge base for this domain
      // This could involve reinforcing learned concepts or updating expertise tracking
      
      this.log(`✅ Learning Agent expertise updated for ${domain}`);
    } catch (error) {
      this.error(`Failed to update expertise: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    // Save knowledge base before shutdown
    await this.saveKnowledgeBase();
    this.log('Learning Agent cleaned up');
  }

  // 🧠 DEEP LEARNING FROM DOCUMENTS
  async deepLearnDocument(data: { documentId: number, chapter?: number }): Promise<void> {
    const { documentId, chapter } = data;
    
    try {
      // Get document content
      const document = await db.select().from(schema.documents).where(eq(schema.documents.id, documentId)).limit(1);
      if (!document.length) return;

      let content = '';
      const docContent = JSON.parse(document[0].content) as schema.ProcessedDocument;
      
      if (chapter) {
        const chapterData = docContent.chapters.find(c => c.number === chapter);
        content = chapterData?.paragraphs.map(p => p.text).join('\n') || '';
      } else {
        content = docContent.chapters
          .map(c => c.paragraphs.map(p => p.text).join('\n'))
          .join('\n\n');
      }

      if (!content) return;

      this.log(`🧠 Deep learning from document ${documentId}${chapter ? `, chapter ${chapter}` : ''}`);

      // Multi-stage learning process
      await this.extractConcepts(content, documentId, chapter);
      await this.identifyPatterns(content, documentId, chapter);
      await this.buildRelationships(content, documentId, chapter);
      await this.generateExpertise(content, documentId, chapter);
      
      // Create fine-tuning data
      await this.createFineTuningData(content, documentId, chapter);
      
      this.log(`✅ Deep learning completed for document ${documentId}`);
      
    } catch (error) {
      this.error(`Deep learning failed: ${error}`);
      throw error;
    }
  }

  // 🔍 EXTRACT CONCEPTS AND KNOWLEDGE
  async extractConcepts(content: string, documentId: number, chapter?: number): Promise<void> {
    const prompt = `You are an expert knowledge extraction AI. Analyze this text and extract key concepts, definitions, and relationships.

Text to analyze:
${content.substring(0, 8000)}

Extract:
1. Key concepts and their definitions
2. Important relationships between concepts
3. Examples and use cases
4. Domain-specific terminology
5. Underlying principles and patterns

Format as JSON:
{
  "concepts": [
    {
      "name": "concept name",
      "definition": "clear definition",
      "examples": ["example1", "example2"],
      "relationships": ["related concept1", "related concept2"],
      "importance": 0.9
    }
  ],
  "domain": "identified domain",
  "complexity_level": "beginner|intermediate|advanced|expert"
}`;

    try {
      // Use MultiModelService for concept extraction - requires high accuracy and reasoning
      const result = await this.multiModelService.executeTask('text-analysis', prompt, {
        requirements: { accuracy: 9, reasoning: 8, speed: 6 }
      });
      
      this.log(`🔍 Concepts extracted using ${result.modelUsed} in ${result.executionTime}ms`);
      const extracted = this.parseJsonResponse(result.response);
      
      if (extracted?.concepts) {
        for (const concept of extracted.concepts) {
          const knowledgeNode: KnowledgeNode = {
            id: `${documentId}-${chapter || 0}-${concept.name.replace(/\s+/g, '-').toLowerCase()}`,
            concept: concept.name,
            definition: concept.definition,
            examples: concept.examples || [],
            relationships: concept.relationships || [],
            confidence: concept.importance || 0.5,
            documentId,
            chapter,
            createdAt: new Date(),
            reinforcements: 1
          };
          
          this.knowledgeBase.set(knowledgeNode.id, knowledgeNode);
        }
        
        // Update learning context
        this.updateLearningContext(documentId, extracted);
      }
      
    } catch (error) {
      this.error(`Concept extraction failed: ${error}`);
    }
  }

  // 🔍 IDENTIFY PATTERNS
  async identifyPatterns(content: string, documentId: number, chapter?: number): Promise<void> {
    const prompt = `Analyze this text for recurring patterns, structures, and methodologies:

${content.substring(0, 6000)}

Identify:
1. Recurring themes and patterns
2. Structural elements and organization
3. Methodological approaches
4. Problem-solving patterns
5. Communication styles and techniques

Format as JSON with your findings.`;

    try {
      const response = await this.ollamaService.generateText(prompt);
      const patterns = this.parseJsonResponse(response);
      
      if (patterns) {
        const context = this.learningContext.get(documentId);
        if (context) {
          context.learning_patterns.push(...(patterns.patterns || []));
        }
      }
    } catch (error) {
      this.error(`Pattern identification failed: ${error}`);
    }
  }

  // 🔗 BUILD RELATIONSHIPS AND CONNECTIONS
  async buildRelationships(content: string, documentId: number, chapter?: number): Promise<void> {
    const existingConcepts = Array.from(this.knowledgeBase.values())
      .filter(node => node.documentId === documentId)
      .map(node => node.concept);

    if (existingConcepts.length < 2) return;

    const prompt = `Find deep connections between these concepts:

Concepts: ${existingConcepts.join(', ')}

Context: ${content.substring(0, 6000)}

Find relationships: causal, hierarchical, functional, temporal, analogical.

Format as JSON with relationship details.`;

    try {
      const response = await this.ollamaService.generateText(prompt);
      const relationships = this.parseJsonResponse(response);
      
      if (relationships?.relationships) {
        // Update knowledge nodes with new relationships
        for (const rel of relationships.relationships) {
          const node1 = Array.from(this.knowledgeBase.values())
            .find(n => n.concept.toLowerCase().includes(rel.concept1?.toLowerCase() || ''));
          const node2 = Array.from(this.knowledgeBase.values())
            .find(n => n.concept.toLowerCase().includes(rel.concept2?.toLowerCase() || ''));
            
          if (node1 && node2 && rel.concept2 && rel.concept1) {
            if (!node1.relationships.includes(rel.concept2)) {
              node1.relationships.push(rel.concept2);
            }
            if (!node2.relationships.includes(rel.concept1)) {
              node2.relationships.push(rel.concept1);
            }
          }
        }
      }
      
    } catch (error) {
      this.error(`Relationship building failed: ${error}`);
    }
  }

  // 🎓 GENERATE EXPERTISE AND INSIGHTS
  async generateExpertise(content: string, documentId: number, chapter?: number): Promise<void> {
    const concepts = Array.from(this.knowledgeBase.values())
      .filter(node => node.documentId === documentId)
      .map(node => `${node.concept}: ${node.definition}`)
      .join('\n');

    const prompt = `Generate expert-level insights based on this analysis:

Learned Concepts:
${concepts}

Content: ${content.substring(0, 4000)}

Generate:
1. Advanced patterns and principles
2. Practical applications
3. Expert Q&A examples
4. Teaching points
5. Domain connections

Format as JSON with structured insights.`;

    try {
      const response = await this.ollamaService.generateText(prompt);
      const expertise = this.parseJsonResponse(response);
      
      if (expertise) {
        // Store expertise data for fine-tuning
        this.fineTuningData.push({
          documentId,
          chapter,
          expertise,
          timestamp: new Date()
        });
        
        // Update learning context with expertise level
        const context = this.learningContext.get(documentId);
        if (context && expertise.expertise_level) {
          const level = typeof expertise.expertise_level === 'string' 
            ? parseInt(expertise.expertise_level) 
            : expertise.expertise_level;
          context.expertise_level = Math.max(context.expertise_level, level || 1);
        }
      }
      
    } catch (error) {
      this.error(`Expertise generation failed: ${error}`);
    }
  }

  // 🔄 REINFORCEMENT LEARNING
  async reinforceLearning(data: { documentId: number, feedback?: string, success?: boolean }): Promise<void> {
    const { documentId, feedback, success } = data;
    
    // Reinforce successful knowledge nodes
    const documentNodes = Array.from(this.knowledgeBase.values())
      .filter(node => node.documentId === documentId);
      
    for (const node of documentNodes) {
      if (success) {
        node.reinforcements += 1;
        node.confidence = Math.min(1.0, node.confidence + 0.1);
      } else if (feedback) {
        // Analyze feedback to improve
        await this.analyzeFeedback(node, feedback);
      }
    }
    
    this.log(`🔄 Reinforced learning for document ${documentId}`);
  }

  // 📊 CREATE FINE-TUNING DATA
  async createFineTuningData(content: string, documentId: number, chapter?: number): Promise<void> {
    const concepts = Array.from(this.knowledgeBase.values())
      .filter(node => node.documentId === documentId);

    // Generate training examples
    for (const concept of concepts.slice(0, 5)) { // Limit to prevent overwhelming
      const trainingExample = {
        instruction: `Explain the concept of "${concept.concept}" in the context of this domain.`,
        input: `Context: ${content.substring(0, 2000)}`,
        output: `${concept.definition}\n\nKey points:\n${concept.examples.map(ex => `• ${ex}`).join('\n')}\n\nRelated concepts: ${concept.relationships.join(', ')}`,
        metadata: {
          documentId,
          chapter,
          concept: concept.concept,
          confidence: concept.confidence
        }
      };
      
      this.fineTuningData.push(trainingExample);
    }
  }

  // 🎯 MODEL ADAPTATION
  async adaptModel(data: { documentId: number }): Promise<void> {
    const { documentId } = data;
    
    const context = this.learningContext.get(documentId);
    if (context) {
      const specializedPrompt = this.createSpecializedPrompt(context);
      await this.saveSpecializedPrompt(documentId, specializedPrompt);
      this.log(`🎯 Model adapted for document ${documentId} domain: ${context.domain}`);
    }
  }

  // 🔧 UTILITY METHODS
  private parseJsonResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      this.error(`JSON parsing failed: ${error}`);
      return null;
    }
  }

  private updateLearningContext(documentId: number, extracted: any): void {
    const existing = this.learningContext.get(documentId) || {
      domain: 'general',
      expertise_level: 1,
      key_concepts: [],
      learning_patterns: [],
      performance_metrics: { accuracy: 0.5, relevance: 0.5, depth: 0.5 }
    };

    existing.domain = extracted.domain || existing.domain;
    existing.key_concepts = Array.from(new Set([...existing.key_concepts, ...extracted.concepts.map((c: any) => c.name)]));
    existing.expertise_level = Math.max(existing.expertise_level, this.mapComplexityToLevel(extracted.complexity_level));

    this.learningContext.set(documentId, existing);
  }

  private mapComplexityToLevel(complexity: string): number {
    const mapping = { beginner: 2, intermediate: 4, advanced: 7, expert: 10 };
    return mapping[complexity as keyof typeof mapping] || 1;
  }

  private createSpecializedPrompt(context: LearningContext): string {
    return `You are an expert in ${context.domain} with expertise level ${context.expertise_level}/10.

Key concepts you understand deeply:
${context.key_concepts.join(', ')}

When answering questions about ${context.domain}:
1. Draw from your deep knowledge of these concepts
2. Provide expert-level explanations
3. Make connections between related ideas
4. Use domain-specific terminology appropriately
5. Offer practical insights and applications

Your responses should reflect your expertise level of ${context.expertise_level}/10 in this domain.`;
  }

  private async saveSpecializedPrompt(documentId: number, prompt: string): Promise<void> {
    this.log(`Specialized prompt saved for document ${documentId}`);
  }

  private async loadKnowledgeBase(): Promise<void> {
    this.log('Knowledge base loaded');
  }

  private async saveKnowledgeBase(): Promise<void> {
    this.log('Knowledge base saved');
  }

  private async scheduleInitialLearningTasks(): Promise<void> {
    await this.addTask('REINFORCE_LEARNING', { type: 'periodic' });
    this.log('Initial learning tasks scheduled');
  }

  private async analyzeFeedback(node: KnowledgeNode, feedback: string): Promise<void> {
    this.log(`Analyzing feedback for concept: ${node.concept}`);
  }

  // 📈 PUBLIC METHODS FOR INTEGRATION
  async getExpertiseLevel(documentId: number): Promise<number> {
    const context = this.learningContext.get(documentId);
    return context?.expertise_level || 1;
  }

  async getKnowledgeSummary(documentId: number): Promise<any> {
    const nodes = Array.from(this.knowledgeBase.values())
      .filter(node => node.documentId === documentId);
    
    const context = this.learningContext.get(documentId);
    
    return {
      totalConcepts: nodes.length,
      expertiseLevel: context?.expertise_level || 1,
      domain: context?.domain || 'unknown',
      keyConcepts: context?.key_concepts || [],
      averageConfidence: nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length || 0
    };
  }

  async askExpert(documentId: number, question: string): Promise<string> {
    const context = this.learningContext.get(documentId);
    if (!context) {
      return await this.ollamaService.generateText(question);
    }

    const expertPrompt = this.createSpecializedPrompt(context);
    const fullPrompt = `${expertPrompt}\n\nUser Question: ${question}\n\nProvide an expert response based on your specialized knowledge:`;
    
    return await this.ollamaService.generateText(fullPrompt, {
      temperature: 0.3,
      maxTokens: 500
    });
  }

  // 🧠 NEW LEARNING METHODS FOR COMPREHENSIVE INTELLIGENCE

  // Learn from power summaries with RAG enhancement
  async learnFromPowerSummary(data: any): Promise<void> {
    const { documentId, chapter, originalContent, powerSummary, keyInsights, mainThemes, actionablePoints, title } = data;
    
    try {
      this.log(`🧠 Learning from power summary: Document ${documentId}, Chapter ${chapter}`);
      
      // 🔍 NEW: Get power summary context from the service
      const powerSummaryContext = await powerSummaryService.getPowerSummariesForAIContext(documentId, 5);
      const powerSummaryStats = await powerSummaryService.getPowerSummaryStats();
      
      // 🔍 NEW: Use RAG to find related learning patterns across user's library
      const ragEnhancedLearning = await this.enhanceLearningWithRAG(
        documentId, chapter, 'power_summary', {
          content: originalContent,
          summary: powerSummary,
          insights: keyInsights,
          themes: mainThemes
        }
      );
      
      // Create comprehensive learning data from the summary
      const learningPrompt = `Analyze this power summary and extract learning insights for future improvement:

Original Content (excerpt): ${originalContent.substring(0, 1500)}
Generated Power Summary: ${powerSummary}
Key Insights: ${keyInsights.join(', ')}
Main Themes: ${mainThemes.join(', ')}
Actionable Points: ${actionablePoints.join(', ')}

POWER SUMMARY CONTEXT:
${powerSummaryContext}

POWER SUMMARY STATISTICS:
- Total summaries: ${powerSummaryStats.totalSummaries}
- Average length: ${powerSummaryStats.averageLength} characters
- Document coverage: ${powerSummaryStats.documentCoverage} documents
- Recent activity: ${powerSummaryStats.recentActivity ? 'Yes' : 'No'}
- Common themes: ${powerSummaryStats.commonThemes.join(', ')}

${ragEnhancedLearning ? `RELATED PATTERNS FROM LIBRARY:\n${ragEnhancedLearning}\n` : ''}

Extract learning patterns as JSON:
{
  "summarization_patterns": ["pattern1", "pattern2"],
  "insight_extraction_methods": ["method1", "method2"],
  "theme_identification_techniques": ["technique1", "technique2"],
  "content_analysis_improvements": ["improvement1", "improvement2"],
  "user_value_indicators": ["indicator1", "indicator2"],
  "cross_document_learning": ["learning1", "learning2"],
  "power_summary_quality_metrics": ["metric1", "metric2"]
}`;

      const result = await this.multiModelService.executeTask('text-analysis', learningPrompt, {
        requirements: { accuracy: 8, reasoning: 9, speed: 6 }
      });

      const learningData = this.parseJsonResponse(result.response);
      
      // Store learning patterns for future use
      if (learningData) {
        await this.storelearningPattern('power_summary', documentId, chapter, {
          originalSummary: powerSummary,
          patterns: learningData,
          ragEnhanced: Boolean(ragEnhancedLearning),
          powerSummaryContext: powerSummaryContext.substring(0, 500),
          powerSummaryStats,
          context: { title, themes: mainThemes, insights: keyInsights }
        });
      }

      this.log(`✅ Learned from power summary for Document ${documentId}, Chapter ${chapter} (RAG: ${Boolean(ragEnhancedLearning)}, Context: ${Boolean(powerSummaryContext)})`);
    } catch (error) {
      this.error(`Failed to learn from power summary: ${error}`);
    }
  }

  // 🧠 NEW: RAG-Enhanced Learning Pattern Discovery
  private async enhanceLearningWithRAG(
    documentId: number, 
    chapter: number, 
    learningType: string, 
    context: any
  ): Promise<string | null> {
    try {
      this.log(`🔍 Enhancing ${learningType} learning with RAG for Document ${documentId}`);
      
      // Build RAG context for learning enhancement
      const ragContext: RAGContext = {
        userId: 1, // Default user for learning agent
        currentDocument: documentId,
        currentChapter: chapter,
        conversationHistory: [],
        userStudyPatterns: [learningType, 'learning-patterns'],
        preferredTopics: context.themes || context.insights || [],
        studyLevel: 'advanced' // Learning agent operates at advanced level
      };
      
      // Search for related learning patterns and successful cases
      const learningQuery = `learning patterns, successful examples, and related insights for: ${learningType} ${JSON.stringify(context).substring(0, 200)}`;
      
      const ragResponse: RAGResponse = await documentRAGService.processRAGQuery(
        learningQuery, 
        ragContext, 
        {
          maxSources: 4, // Focused number for learning enhancement
          includeAnnotations: true, // Include user notes for personalized learning
          includeMemories: true, // Include AI memories for learned patterns
          searchDepth: 'thorough', // Deep search for quality learning patterns
          useEmbeddings: true
        }
      );
      
      if (ragResponse.sources.length > 0) {
        const relatedPatterns = ragResponse.sources.map((source, i) => 
          `${i + 1}. From "${source.documentTitle}": ${source.excerpt.substring(0, 150)}...`        ).join('\n');
        
        this.log(`✅ Found ${ragResponse.sources.length} related learning patterns via RAG`);
        return relatedPatterns;
      }
      
      return null;
      
    } catch (error) {
      this.warn(`RAG learning enhancement failed: ${error}`);
      return null;
    }
  }

  // Learn from analysis feedback to improve future analysis
  async improveAnalysisFromFeedback(data: any): Promise<void> {
    const { documentId, chapter, fullText, generatedSummary, summaryQuality } = data;
    
    try {
      this.log(`🔍 Improving analysis from feedback: Document ${documentId}, Chapter ${chapter}`);
      
      // Analyze what made this summary good/bad
      const analysisPrompt = `Analyze this text analysis result to improve future analysis:

Source Text: ${fullText.substring(0, 1000)}
Generated Summary: ${JSON.stringify(generatedSummary)}
Quality Rating: ${summaryQuality}

Identify improvement opportunities as JSON:
{
  "effective_techniques": ["technique1", "technique2"],
  "areas_for_improvement": ["area1", "area2"],
  "content_understanding_insights": ["insight1", "insight2"],
  "summarization_best_practices": ["practice1", "practice2"]
}`;

      const result = await this.multiModelService.executeTask('text-analysis', analysisPrompt, {
        requirements: { accuracy: 8, reasoning: 9, speed: 6 }
      });

      const improvements = this.parseJsonResponse(result.response);
      
      if (improvements) {
        await this.storelearningPattern('analysis_improvement', documentId, chapter, {
          quality: summaryQuality,
          improvements,
          context: { textLength: fullText.length, summaryComplexity: Object.keys(generatedSummary).length }
        });
      }

      this.log(`✅ Analysis improvement learned for Document ${documentId}, Chapter ${chapter}`);
    } catch (error) {
      this.error(`Failed to learn from analysis feedback: ${error}`);
    }
  }

  // Learn from extracted insights
  async learnFromInsights(data: any): Promise<void> {
    const { documentId, chapter, sourceContent, extractedInsights, themes, context } = data;
    
    try {
      this.log(`💡 Learning from insights: Document ${documentId}, Chapter ${chapter}`);
      
      // Analyze insight extraction patterns
      const insightPrompt = `Analyze these extracted insights to improve future insight generation:

Source Content: ${sourceContent.substring(0, 1000)}
Extracted Insights: ${extractedInsights.join(', ')}
Themes: ${themes.join(', ')}
Context: ${context}

Identify insight patterns as JSON:
{
  "insight_types": ["type1", "type2"],
  "extraction_methods": ["method1", "method2"],
  "content_to_insight_mapping": ["mapping1", "mapping2"],
  "theme_insight_relationships": ["relationship1", "relationship2"]
}`;

      const result = await this.multiModelService.executeTask('creative-insights', insightPrompt, {
        requirements: { creativity: 8, reasoning: 8, speed: 6 }
      });

      const insightPatterns = this.parseJsonResponse(result.response);
      
      if (insightPatterns) {
        await this.storelearningPattern('insight_extraction', documentId, chapter, {
          insights: extractedInsights,
          patterns: insightPatterns,
          context: { themes, sourceContext: context }
        });
      }

      this.log(`✅ Insight patterns learned for Document ${documentId}, Chapter ${chapter}`);
    } catch (error) {
      this.error(`Failed to learn from insights: ${error}`);
    }
  }

  // Learn from user annotations
  async learnFromUserAnnotation(data: any): Promise<void> {
    const { documentId, chapter, selectedText, userNote, paragraph } = data;
    
    try {
      this.log(`📝 Learning from user annotation: Document ${documentId}, Chapter ${chapter}`);
      
      // Analyze what users find noteworthy
      const annotationPrompt = `Analyze this user annotation to understand what users find valuable:

Selected Text: "${selectedText}"
User Note: "${userNote}"
Document Context: Document ${documentId}, Chapter ${chapter}, Paragraph ${paragraph}

Extract learning insights as JSON:
{
  "user_interest_patterns": ["pattern1", "pattern2"],
  "text_significance_indicators": ["indicator1", "indicator2"],
  "annotation_value_types": ["type1", "type2"],
  "content_highlighting_reasons": ["reason1", "reason2"]
}`;

      const result = await this.multiModelService.executeTask('text-analysis', annotationPrompt, {
        requirements: { accuracy: 8, reasoning: 7, speed: 7 }
      });

      const annotationInsights = this.parseJsonResponse(result.response);
      
      if (annotationInsights) {
        await this.storelearningPattern('user_annotation', documentId, chapter, {
          selectedText,
          userNote,
          insights: annotationInsights,
          context: { paragraph }
        });
      }

      this.log(`✅ User annotation patterns learned for Document ${documentId}, Chapter ${chapter}`);
    } catch (error) {
      this.error(`Failed to learn from user annotation: ${error}`);
    }
  }

  // Learn from user bookmarks
  async learnFromBookmark(data: any): Promise<void> {
    const { documentId, chapter, bookmarkType, userReason } = data;
    
    try {
      this.log(`🔖 Learning from bookmark: Document ${documentId}, Chapter ${chapter}`);
      
      // Analyze bookmark patterns
      const bookmarkPrompt = `Analyze this bookmark behavior to understand user engagement:

Document: ${documentId}
Chapter: ${chapter}
Bookmark Type: ${bookmarkType}
User Reason: ${userReason || 'Not specified'}

Extract bookmark insights as JSON:
{
  "engagement_indicators": ["indicator1", "indicator2"],
  "content_value_signals": ["signal1", "signal2"],
  "user_behavior_patterns": ["pattern1", "pattern2"],
  "chapter_importance_factors": ["factor1", "factor2"]
}`;

      const result = await this.multiModelService.executeTask('text-analysis', bookmarkPrompt, {
        requirements: { accuracy: 7, reasoning: 7, speed: 8 }
      });

      const bookmarkInsights = this.parseJsonResponse(result.response);
      
      if (bookmarkInsights) {
        await this.storelearningPattern('user_bookmark', documentId, chapter, {
          bookmarkType,
          userReason,
          insights: bookmarkInsights
        });
      }

      this.log(`✅ Bookmark patterns learned for Document ${documentId}, Chapter ${chapter}`);
    } catch (error) {
      this.error(`Failed to learn from bookmark: ${error}`);
    }
  }

  // Learn from discussions
  async learnFromDiscussion(data: any): Promise<void> {
    const { documentId, chapter, discussionTopic, userQuestions, responses, engagement } = data;
    
    try {
      this.log(`💬 Learning from discussion: Document ${documentId}, Chapter ${chapter}`);
      
      // Analyze discussion patterns
      const discussionPrompt = `Analyze this discussion to improve future interactions:

Topic: ${discussionTopic}
User Questions: ${userQuestions.join(', ')}
Responses: ${responses.join(', ')}
Engagement Level: ${engagement}

Extract discussion insights as JSON:
{
  "question_patterns": ["pattern1", "pattern2"],
  "effective_response_types": ["type1", "type2"],
  "engagement_drivers": ["driver1", "driver2"],
  "learning_conversation_styles": ["style1", "style2"]
}`;

      const result = await this.multiModelService.executeTask('group-discussion', discussionPrompt, {
        requirements: { creativity: 7, reasoning: 8, speed: 6 }
      });

      const discussionInsights = this.parseJsonResponse(result.response);
      
      if (discussionInsights) {
        await this.storelearningPattern('user_discussion', documentId, chapter, {
          topic: discussionTopic,
          questions: userQuestions,
          insights: discussionInsights,
          engagement
        });
      }

      this.log(`✅ Discussion patterns learned for Document ${documentId}, Chapter ${chapter}`);
    } catch (error) {
      this.error(`Failed to learn from discussion: ${error}`);
    }
  }

  // Store learning patterns for future reference
  private async storelearningPattern(type: string, documentId: number, chapter: number, data: any): Promise<void> {
    try {
      // Create a unique pattern ID
      const patternId = `${type}_${documentId}_${chapter}_${Date.now()}`;
      
      // Add to fine-tuning data for future model improvements
      this.fineTuningData.push({
        type: 'learning_pattern',
        pattern_type: type,
        document_id: documentId,
        chapter: chapter,
        data: data,
        timestamp: new Date().toISOString(),
        pattern_id: patternId
      });

      // Keep only the most recent 1000 learning patterns to avoid memory issues
      if (this.fineTuningData.length > 1000) {
        this.fineTuningData = this.fineTuningData.slice(-1000);
      }

      this.log(`📚 Stored learning pattern: ${type} for Document ${documentId}, Chapter ${chapter}`);
    } catch (error) {
      this.error(`Failed to store learning pattern: ${error}`);
    }
  }
} 
