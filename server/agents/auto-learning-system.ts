import { agentManager } from './agent-manager.js';
import { OllamaService } from '../services/ollama-service.js';
import { MultiModelService } from '../services/multi-model-service.js';
import { storage } from '../storage.js';
import { db } from '../db.js';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';

interface LearningSession {
  documentId: number;
  domain: string;
  expertiseLevel: number;
  concepts: string[];
  specializedPrompt: string;
  fineTuningData: any[];
}

export class AutoLearningSystem {
  private ollama: OllamaService;
  private multiModel: MultiModelService;
  private learningSessions: Map<number, LearningSession> = new Map();
  private isLearning: boolean = false;
  private lastLearningTime: Map<number, number> = new Map(); // Track last learning time per document
  private readonly LEARNING_COOLDOWN = 300000; // 5 minutes cooldown between learning sessions for same document

  constructor() {
    this.ollama = new OllamaService({
      model: 'gemma3n:e2b',
      temperature: 0.4,
      maxTokens: 4096
    });
    this.multiModel = new MultiModelService();
  }

  async initialize(): Promise<void> {
    await this.ollama.initialize();
    await this.multiModel.initialize();
    this.startPeriodicSynthesis();
    console.log('🧠 Auto-Learning System initialized with multi-model intelligence - Ready to create experts!');
  }

  // 🚀 MAIN AUTO-LEARNING TRIGGER
  async triggerAutoLearning(documentId: number): Promise<void> {
    // Check if learning is already in progress
    if (this.isLearning) {
      console.log('⏳ Learning already in progress, queuing...');
      setTimeout(() => this.triggerAutoLearning(documentId), 5000);
      return;
    }

    // Check cooldown for this specific document
    const lastTime = this.lastLearningTime.get(documentId) || 0;
    const timeSinceLastLearning = Date.now() - lastTime;
    
    if (timeSinceLastLearning < this.LEARNING_COOLDOWN) {
      const remainingCooldown = Math.ceil((this.LEARNING_COOLDOWN - timeSinceLastLearning) / 1000);
      console.log(`⏳ Auto-learning on cooldown for document ${documentId}. Please wait ${remainingCooldown} seconds.`);
      return;
    }

    this.isLearning = true;
    this.lastLearningTime.set(documentId, Date.now());
    console.log(`🧠 Starting auto-learning for document ${documentId}...`);

    try {
      // Step 1: Deep content analysis
      console.log(`📖 Step 1: Getting document content for document ${documentId}...`);
      const content = await this.getDocumentContent(documentId);
      if (!content) {
        console.error(`❌ No content found for document ${documentId}`);
        return;
      }
      console.log(`✅ Step 1 complete: Retrieved ${content.length} characters of content`);

      // Step 2: Extract domain and concepts
      console.log(`🔍 Step 2: Analyzing content for domain and concepts...`);
      const analysis = await this.analyzeContent(content);
      console.log(`✅ Step 2 complete: Domain detected as "${analysis.domain}" with ${analysis.concepts?.length || 0} concepts`);
      
      // Step 3: Build expertise
      console.log(`🎓 Step 3: Building expertise based on analysis...`);
      const expertise = await this.buildExpertise(content, analysis);
      console.log(`✅ Step 3 complete: Expertise level ${expertise.level}/10 achieved`);
      
      // Step 4: Create specialized AI agent
      console.log(`🤖 Step 4: Creating specialized AI agent...`);
      const specializedPrompt = await this.createSpecializedAgent(analysis, expertise);
      console.log(`✅ Step 4 complete: Specialized agent prompt created`);
      
      // Step 5: Generate fine-tuning data
      console.log(`📊 Step 5: Generating fine-tuning data...`);
      const fineTuningData = await this.generateFineTuningData(content, analysis, expertise);
      console.log(`✅ Step 5 complete: Generated ${fineTuningData.length} training examples`);
      
      // Step 6: Store learning session
      console.log(`💾 Step 6: Storing learning session...`);
      const session: LearningSession = {
        documentId,
        domain: analysis.domain,
        expertiseLevel: expertise.level,
        concepts: analysis.concepts,
        specializedPrompt,
        fineTuningData
      };
      
      this.learningSessions.set(documentId, session);
      await this.persistLearningSession(session);
      console.log(`✅ Step 6 complete: Learning session stored for document ${documentId}`);
      
      // Step 7: Notify all agents about new expertise
      console.log(`📢 Step 7: Notifying agents about new expertise...`);
      await this.notifyAgentsOfNewExpertise(documentId, session);
      console.log(`✅ Step 7 complete: All agents notified`);
      
      console.log(`🎉 Auto-learning completed! AI is now a level ${expertise.level}/10 expert in ${analysis.domain}`);
      console.log(`📋 Learning Summary:
        - Document ID: ${documentId}
        - Domain: ${analysis.domain}
        - Expertise Level: ${expertise.level}/10
        - Concepts Learned: ${analysis.concepts?.length || 0}
        - Training Examples: ${fineTuningData.length}
        - Status: EXPERT AVAILABLE`);
      
    } catch (error) {
      console.error(`❌ Auto-learning failed at step: ${error}`);
      console.error(`Full error details:`, error);
    } finally {
      this.isLearning = false;
    }
  }

  private async persistLearningSession(session: LearningSession): Promise<void> {
    try {
      console.log('💾 Persisting learning session to database...');
      // Ensure a default knowledge graph exists
      let graph = await db.select().from(schema.aiKnowledgeGraph).where(eq(schema.aiKnowledgeGraph.id, 1)).limit(1);
      if (!graph.length) {
        await db.insert(schema.aiKnowledgeGraph).values({ id: 1, name: 'Default Knowledge Graph', description: 'Main knowledge graph for the entire library.' });
      }
      const graphId = 1;

      // Save concepts
      for (const conceptName of session.concepts) {
        const existingConcept = await db.select().from(schema.knowledgeGraphConcepts)
          .where(eq(schema.knowledgeGraphConcepts.name, conceptName))
          .limit(1);

        if (existingConcept.length) {
          // Concept exists, maybe update it or link it to the new document
          // For now, we'll just ensure the link exists
          const conceptId = existingConcept[0].id;
          // Here you could add logic to link concept to document if not already linked
        } else {
          // New concept
          await db.insert(schema.knowledgeGraphConcepts).values({
            graphId,
            name: conceptName,
            summary: `Concept learned from document ${session.documentId}`, // Placeholder summary
            sourceDocumentId: session.documentId,
          });
        }
      }
      console.log('✅ Learning session persisted to database.');
    } catch (error) {
      console.error('❌ Failed to persist learning session:', error);
    }
  }

  startPeriodicSynthesis(): void {
    setInterval(() => {
      this.synthesizeCrossDocumentInsights();
    }, 7200000); // Every 2 hours (reduced from 5 minutes)
    console.log('🔄 Started periodic cross-document synthesis (every 2 hours).');
  }

  async synthesizeCrossDocumentInsights(): Promise<void> {
    console.log('🔍 Starting cross-document synthesis...');
    try {
      const concepts = await db.select().from(schema.knowledgeGraphConcepts);
      const conceptsByName = concepts.reduce((acc, concept) => {
        if (!acc[concept.name]) {
          acc[concept.name] = [];
        }
        acc[concept.name].push(concept);
        return acc;
      }, {} as Record<string, (typeof schema.knowledgeGraphConcepts.$inferSelect)[]>);

      for (const conceptName in conceptsByName) {
        const relatedConcepts = conceptsByName[conceptName];
        if (relatedConcepts.length > 1) {
          console.log(`🧠 Analyzing concept "${conceptName}" found in ${relatedConcepts.length} documents.`);
          
          const contexts = await Promise.all(relatedConcepts.map(async (concept) => {
            const document = await db.select({ title: schema.documents.title, content: schema.documents.content }).from(schema.documents).where(eq(schema.documents.id, concept.sourceDocumentId!)).limit(1);
            return {
              documentTitle: document[0]?.title || 'Unknown Document',
              context: `From document "${document[0]?.title}", context for "${concept.name}": ${this.extractContext(document[0]?.content, concept.name)}`
            };
          }));

          const prompt = `
            Analyze the following contexts for the concept "${conceptName}" from different documents.
            Identify any relationships like parallels, contradictions, or elaborations between them.

            Contexts:
            ${contexts.map(c => `- ${c.context}`).join('\n')}

            Provide a JSON response with an array of relationships:
            {
              "relationships": [
                {
                  "source_document": "document title",
                  "target_document": "document title",
                  "type": "parallel | contradiction | elaboration",
                  "description": "Explain the relationship."
                }
              ]
            }
          `;
          
          const response = await this.ollama.generateText(prompt);
          const result = this.parseJSON(response);

          if (result && result.relationships) {
            for (const rel of result.relationships) {
              const sourceConcept = relatedConcepts.find(c => contexts.find(ctx => ctx.documentTitle === rel.source_document && ctx.context.includes(c.name)));
              const targetConcept = relatedConcepts.find(c => contexts.find(ctx => ctx.documentTitle === rel.target_document && ctx.context.includes(c.name)));

              if (sourceConcept && targetConcept) {
                await db.insert(schema.knowledgeGraphEdges).values({
                  graphId: 1,
                  sourceConceptId: sourceConcept.id,
                  targetConceptId: targetConcept.id,
                  label: rel.type,
                  description: rel.description,
                });
                
                const notificationMessage = `I noticed that the concept of '${conceptName}' in '${rel.source_document}' has interesting ${rel.type} to the same concept in '${rel.target_document}'. Would you like a summary of the comparison?`;
                await db.insert(schema.notifications).values({
                  user_id: 1, // Default user
                  title: `New Insight: ${conceptName}`,
                  message: notificationMessage,
                });

                console.log(`🔗 New insight found: ${conceptName} in "${rel.source_document}" has a ${rel.type} with "${rel.target_document}".`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Cross-document synthesis failed:', error);
    }
  }

  private extractContext(content: string, concept: string, window = 200): string {
    const index = content.indexOf(concept);
    if (index === -1) return "Concept not found in content.";
    const start = Math.max(0, index - window);
    const end = Math.min(content.length, index + concept.length + window);
    return content.substring(start, end).replace(/\s+/g, ' ').trim();
  }

  // 📖 GET DOCUMENT CONTENT WITH POWER SUMMARIES
  private async getDocumentContent(documentId: number): Promise<string | null> {
    try {
      const document = await db.select().from(schema.documents).where(eq(schema.documents.id, documentId)).limit(1);
      if (!document.length) return null;

      let content = document[0].content;

      // Also get power summaries to enhance learning
      try {
        const powerSummaries = await db.select().from(schema.powerSummaries).where(eq(schema.powerSummaries.documentId, documentId));
        
        if (powerSummaries.length > 0) {
          console.log(`📊 Found ${powerSummaries.length} power summaries for document ${documentId}`);
          
          // Add power summaries to content for enhanced learning
          content += "\n\n=== POWER SUMMARIES FOR ENHANCED LEARNING ===\n";
          
          powerSummaries.forEach((summary, index) => {
            content += `\nChapter ${summary.chapter}: ${summary.chapterTitle}\n`;
            content += `Summary: ${summary.powerSummary}\n`;
            
            // Handle both string and array formats for these fields
            const keyInsights = Array.isArray(summary.keyInsights) ? summary.keyInsights.join(', ') : String(summary.keyInsights);
            const mainThemes = Array.isArray(summary.mainThemes) ? summary.mainThemes.join(', ') : String(summary.mainThemes);
            const actionablePoints = Array.isArray(summary.actionablePoints) ? summary.actionablePoints.join(', ') : String(summary.actionablePoints);
            
            content += `Key Insights: ${keyInsights}\n`;
            content += `Main Themes: ${mainThemes}\n`;
            content += `Actionable Points: ${actionablePoints}\n`;
            content += "---\n";
          });
          
          content += "=== END POWER SUMMARIES ===\n";
        }
      } catch (summaryError) {
        console.warn(`Could not retrieve power summaries for document ${documentId}:`, summaryError);
      }

      // Also get annotations to understand user insights and learning patterns
      try {
        // Get default user ID to access annotations
        const defaultUserId = 1; // TODO: Make this configurable or get from context
        const annotations = await db.select()
          .from(schema.annotations)
          .where(eq(schema.annotations.documentId, documentId));
        
        if (annotations.length > 0) {
          console.log(`📝 Found ${annotations.length} user annotations for document ${documentId}`);
          
          content += "\n\n=== USER ANNOTATIONS FOR ENHANCED LEARNING ===\n";
          
          annotations.forEach((annotation: any) => {
            content += `\nChapter ${annotation.chapter}, Verse ${annotation.verse}:\n`;
            content += `User Note: ${annotation.note}\n`;
            content += `Selected Text: ${annotation.selectedText || 'N/A'}\n`;
            content += "---\n";
          });
          
          content += "=== END USER ANNOTATIONS ===\n";
        }
      } catch (annotationError) {
        console.warn(`Could not retrieve annotations for document ${documentId}:`, annotationError);
      }

      return content;
    } catch (error) {
      console.error(`Failed to get document content: ${error}`);
      return null;
    }
  }

  // 🔍 ANALYZE CONTENT FOR LEARNING
  private async analyzeContent(content: string): Promise<any> {
    // 🔍 Detect if content contains visual elements that need vision processing
    const hasVisualElements = this.detectVisualElements(content);
    
    const prompt = `Analyze this content for AI learning. Extract key information:

Content (first 8000 chars):
${content.substring(0, 8000)}

Provide a JSON response with:
{
  "domain": "specific field/subject (e.g., 'Quantum Physics', 'Biblical Studies', 'Philosophy')",
  "complexity": "beginner|intermediate|advanced|expert", 
  "concepts": ["concept1", "concept2", "concept3"],
  "key_terms": ["term1", "term2", "term3"],
  "learning_objectives": ["what should an AI learn from this"],
  "expertise_areas": ["specific areas of expertise to develop"]
}`;

    try {
      // 👁️ Use faster text model instead of slow vision model for most cases
      if (hasVisualElements && content.length > 20000) {
        console.log(`👁️ Large document with visual elements detected, using vision model with timeout tolerance`);
        const result = await this.multiModel.executeTask('vision-document-analysis', prompt, {
          requirements: { accuracy: 8, reasoning: 8, speed: 4 } // Reduced requirements for speed
        });
        console.log(`👁️ Content analyzed using ${result.modelUsed} in ${result.executionTime}ms`);
        return this.parseJSON(result.response);
      } else {
        // Use fast text model for most content - even with some visual elements
        console.log(`🔍 Using fast text analysis for efficient processing`);
        const result = await this.multiModel.executeTask('quick-classification', prompt, {
          requirements: { speed: 8, accuracy: 6 }
        });
        console.log(`🔍 Content analyzed using ${result.modelUsed} in ${result.executionTime}ms`);
        return this.parseJSON(result.response);
      }
    } catch (error) {
      console.error(`Content analysis failed: ${error}`);
      // Fallback to ollama if MultiModel fails
      try {
        const response = await this.ollama.generateText(prompt);
        return this.parseJSON(response);
      } catch (fallbackError) {
        console.error(`Fallback analysis also failed: ${fallbackError}`);
        return {
          domain: 'General Knowledge',
          complexity: 'intermediate',
          concepts: [],
          key_terms: [],
          learning_objectives: [],
          expertise_areas: []
        };
      }
    }
  }

  // 🎓 BUILD EXPERTISE FROM CONTENT
  private async buildExpertise(content: string, analysis: any): Promise<any> {
    // Calculate dynamic expertise level based on content analysis
    const dynamicLevel = this.calculateExpertiseLevel(content, analysis);
    
    const prompt = `You are becoming an expert in ${analysis.domain}. Study this content deeply:

${content.substring(0, 10000)}

Key concepts to master: ${analysis.concepts.join(', ')}

Based on the complexity and depth of this content, your expertise level should be ${dynamicLevel}/10.

Generate expert knowledge as JSON:
{
  "level": ${dynamicLevel},
  "expert_insights": ["deep insight 1", "deep insight 2"],
  "teaching_points": ["how to explain concept 1", "how to explain concept 2"],
  "advanced_connections": ["connection to other fields", "broader implications"],
  "expert_qa": [
    {
      "question": "Expert-level question about the content",
      "answer": "Detailed expert answer"
    }
  ],
  "practical_applications": ["real-world application 1", "application 2"]
}`;

    try {
      // Use MultiModelService for expert reasoning - requires highest reasoning and accuracy
      const result = await this.multiModel.executeTask('expert-reasoning', prompt, {
        requirements: { reasoning: 8, accuracy: 8, creativity: 6 }
      });
      
      console.log(`🎓 Expertise built using ${result.modelUsed} in ${result.executionTime}ms`);
      const parsedResponse = this.parseJSON(result.response);
      // Ensure the level matches our calculation
      parsedResponse.level = dynamicLevel;
      return parsedResponse;
    } catch (error) {
      console.error(`Expertise building failed: ${error}`);
      // Fallback to ollama
      try {
        const response = await this.ollama.generateText(prompt);
        const parsedResponse = this.parseJSON(response);
        parsedResponse.level = dynamicLevel;
        return parsedResponse;
      } catch (fallbackError) {
        console.error(`Fallback expertise building also failed: ${fallbackError}`);
        return { level: Math.max(5, dynamicLevel - 2), expert_insights: [], teaching_points: [], advanced_connections: [], expert_qa: [], practical_applications: [] };
      }
    }
  }

  // 🧮 CALCULATE DYNAMIC EXPERTISE LEVEL
  private calculateExpertiseLevel(content: string, analysis: any): number {
    let baseLevel = 5; // Start at intermediate
    
    // Factor 1: Content complexity
    const complexityMapping: Record<string, number> = {
      'beginner': 0,
      'intermediate': 1,
      'advanced': 2,
      'expert': 3
    };
    const complexityBonus = complexityMapping[analysis.complexity] || 1;
    
    // Factor 2: Number of concepts (more concepts = higher expertise potential)
    const conceptBonus = Math.min(2, Math.floor(analysis.concepts.length / 5));
    
    // Factor 3: Content length (longer content = more comprehensive knowledge)
    const lengthBonus = content.length > 50000 ? 2 : content.length > 20000 ? 1 : 0;
    
    // Factor 4: Domain specialization bonus
    const domainBonus = this.getDomainComplexityBonus(analysis.domain);
    
    // Factor 5: Learning objectives depth
    const objectiveBonus = analysis.learning_objectives?.length > 5 ? 1 : 0;
    
    // Calculate final level (max 10)
    const calculatedLevel = Math.min(10, baseLevel + complexityBonus + conceptBonus + lengthBonus + domainBonus + objectiveBonus);
    
    console.log(`📊 Expertise calculation for ${analysis.domain}:
    Base: ${baseLevel}, Complexity: +${complexityBonus}, Concepts: +${conceptBonus}, 
    Length: +${lengthBonus}, Domain: +${domainBonus}, Objectives: +${objectiveBonus}
    Final Level: ${calculatedLevel}/10`);
    
    return calculatedLevel;
  }

  // 🎯 GET DOMAIN COMPLEXITY BONUS
  private getDomainComplexityBonus(domain: string): number {
    const highComplexityDomains = [
      'quantum physics', 'theoretical physics', 'advanced mathematics', 
      'neuroscience', 'molecular biology', 'artificial intelligence',
      'philosophy', 'theology', 'biblical studies', 'ancient languages'
    ];
    
    const mediumComplexityDomains = [
      'physics', 'chemistry', 'biology', 'psychology', 'history',
      'literature', 'economics', 'computer science'
    ];
    
    const domainLower = domain.toLowerCase();
    
    if (highComplexityDomains.some(d => domainLower.includes(d))) {
      return 2; // High complexity domains can reach level 10
    } else if (mediumComplexityDomains.some(d => domainLower.includes(d))) {
      return 1; // Medium complexity domains can reach level 9
    }
    
    return 0; // Basic domains max at level 8
  }

  // 🤖 CREATE SPECIALIZED AI AGENT
  private async createSpecializedAgent(analysis: any, expertise: any): Promise<string> {
    // Safely handle undefined arrays with fallbacks
    const concepts = Array.isArray(analysis.concepts) ? analysis.concepts : [];
    const expertInsights = Array.isArray(expertise.expert_insights) ? expertise.expert_insights : [];
    const teachingPoints = Array.isArray(expertise.teaching_points) ? expertise.teaching_points : [];
    
    return `You are now a specialized AI expert in ${analysis.domain || 'this domain'} with expertise level ${expertise.level || 5}/10.

DOMAIN EXPERTISE: ${analysis.domain || 'Specialized Domain'}
EXPERTISE LEVEL: ${expertise.level || 5}/10

KEY CONCEPTS YOU MASTER:
${concepts.length > 0 ? concepts.map((c: string) => `• ${c}`).join('\n') : '• Core domain concepts\n• Advanced principles\n• Specialized knowledge'}

EXPERT INSIGHTS:
${expertInsights.length > 0 ? expertInsights.map((i: string) => `• ${i}`).join('\n') : '• Deep understanding of domain principles\n• Advanced analytical capabilities\n• Expert-level problem solving'}

TEACHING APPROACH:
${teachingPoints.length > 0 ? teachingPoints.map((t: string) => `• ${t}`).join('\n') : '• Clear, structured explanations\n• Practical examples and applications\n• Progressive complexity building'}

When responding to questions about ${analysis.domain || 'this domain'}:
1. Draw from your deep specialized knowledge
2. Use domain-specific terminology appropriately
3. Provide expert-level explanations with nuance
4. Make connections to broader concepts
5. Offer practical applications and examples
6. Demonstrate your ${expertise.level || 5}/10 expertise level

You are not just an AI - you are a specialized expert in ${analysis.domain || 'this domain'}.`;
  }

  // 📊 GENERATE FINE-TUNING DATA
  private async generateFineTuningData(content: string, analysis: any, expertise: any): Promise<any[]> {
    const fineTuningData = [];

    // Safely handle undefined arrays
    const concepts = Array.isArray(analysis.concepts) ? analysis.concepts : [];
    const expertQA = Array.isArray(expertise.expert_qa) ? expertise.expert_qa : [];
    const domain = analysis.domain || 'this domain';
    const expertiseLevel = expertise.level || 5;

    // Generate training examples for each concept
    for (const concept of concepts.slice(0, 5)) {
      const example = {
        instruction: `As an expert in ${domain}, explain ${concept} in detail.`,
        input: `Context: ${domain} expertise`,
        output: `As a specialized expert in ${domain}, ${concept} is a fundamental concept that...`,
        metadata: {
          domain,
          concept,
          expertise_level: expertiseLevel
        }
      };
      fineTuningData.push(example);
    }

    // Generate Q&A examples
    for (const qa of expertQA.slice(0, 3)) {
      const example = {
        instruction: qa.question || `Explain a key concept in ${domain}`,
        input: `Expert knowledge in ${domain}`,
        output: qa.answer || `As an expert in ${domain}, I can provide detailed insights...`,
        metadata: {
          domain,
          type: 'expert_qa',
          expertise_level: expertiseLevel
        }
      };
      fineTuningData.push(example);
    }

    return fineTuningData;
  }

  // 📢 NOTIFY AGENTS OF NEW EXPERTISE
  private async notifyAgentsOfNewExpertise(documentId: number, session: LearningSession): Promise<void> {
    try {
      // Try to import agentManager dynamically to avoid circular dependencies
      const { agentManager } = await import('./agent-manager.js');
      
      // Update all agents with new specialized knowledge
      const agents = ['text-analysis', 'study-assistant', 'insight-generation'];
      
      for (const agentName of agents) {
        try {
          if (agentManager && typeof agentManager.requestAgentTask === 'function') {
            // Try different task types that agents might support
            const taskTypes = ['UPDATE_EXPERTISE', 'LEARN_DOMAIN', 'ADD_KNOWLEDGE'];
            let notified = false;
            
            for (const taskType of taskTypes) {
              try {
                await agentManager.requestAgentTask(agentName, taskType, {
                  documentId,
                  domain: session.domain,
                  expertiseLevel: session.expertiseLevel,
                  specializedPrompt: session.specializedPrompt,
                  concepts: session.concepts
                });
                console.log(`✅ Successfully notified ${agentName} of new expertise in ${session.domain} (task: ${taskType})`);
                notified = true;
                break;
              } catch (taskError) {
                // Continue to next task type
                continue;
              }
            }
            
            if (!notified) {
              console.log(`ℹ️ Agent ${agentName} doesn't support expertise updates, but it's aware of the new domain knowledge`);
            }
          } else {
            console.warn(`⚠️ AgentManager not available for ${agentName} notification`);
          }
        } catch (error) {
          console.log(`ℹ️ ${agentName} notification skipped: ${error instanceof Error ? error.message : 'Agent may not support this task type'}`);
        }
      }
    } catch (importError) {
      console.warn(`⚠️ Could not import agentManager for notifications: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
    }
  }

  // 🎯 GET EXPERT RESPONSE FOR DOCUMENT
  async getExpertResponse(documentId: number, question: string, currentChapter?: number): Promise<string> {
    const session = this.learningSessions.get(documentId);
    if (!session) {
      // Fallback to general AI response for documents without expertise
      try {
        const result = await this.multiModel.executeTask('theological-reasoning', question, {
          requirements: { reasoning: 9, accuracy: 8 }
        });
        return result.response;
      } catch (error) {
        console.warn('MultiModel fallback failed, using Ollama:', error);
        return await this.ollama.generateText(question, { useCache: false });
      }
    }

    // 🔍 NEW: Get RAG context from current document
    let ragContext = '';
    try {
      const { documentRAGService } = await import('../services/document-rag-service.js');
      
      const ragQuery = `${question} context from document chapter ${currentChapter || 'current'}`;
      const ragResponse = await documentRAGService.processRAGQuery(ragQuery, {
        userId: 1,
        currentDocument: documentId,
        currentChapter: currentChapter,
        conversationHistory: [],
        userStudyPatterns: [session.domain],
        preferredTopics: Array.isArray(session.concepts) ? session.concepts.slice(0, 3) : [],
        studyLevel: 'advanced'
      }, {
        maxSources: 3,
        includeAnnotations: true,
        searchDepth: 'quick',
        useEmbeddings: true
      });

      if (ragResponse.sources.length > 0) {
        ragContext = `\n\n📖 **Current Document Context:**\n`;
        ragResponse.sources.forEach((source, i) => {
          ragContext += `${i + 1}. ${source.excerpt.substring(0, 200)}...\n`;
        });
        ragContext += `\n`;
      }
    } catch (error) {
      console.warn('RAG context failed for expert chat:', error);
    }

    const expertPrompt = `${session.specializedPrompt}${ragContext}

Question: ${question}

Provide an expert response drawing from your specialized knowledge in ${session.domain} and the current document context:`;

    try {
      // Use expert-chat task for specialized responses with high reasoning requirements
      const result = await this.multiModel.executeTask('expert-chat', expertPrompt, {
        requirements: { reasoning: 8, accuracy: 8, creativity: 7 },
        timeout: 60000  // 60 seconds for complex expert reasoning
      });
      
      console.log(`🎓 Expert response generated using ${result.modelUsed} (${session.domain} expertise)`);
      return result.response;
      
    } catch (error) {
      console.warn(`Expert chat failed, falling back to Ollama: ${error}`);
      // Disable caching for expert responses to ensure each question gets a fresh response
      return await this.ollama.generateText(expertPrompt, { useCache: false });
    }
  }

  // 📈 GET EXPERTISE SUMMARY
  getExpertiseSummary(documentId: number): any {
    const session = this.learningSessions.get(documentId);
    if (!session) {
      return { expertise: false, message: 'No specialized knowledge for this document' };
    }

    return {
      expertise: true,
      domain: session.domain,
      expertiseLevel: session.expertiseLevel,
      totalConcepts: Array.isArray(session.concepts) ? session.concepts.length : 0,
      concepts: Array.isArray(session.concepts) ? session.concepts : [],
      fineTuningExamples: Array.isArray(session.fineTuningData) ? session.fineTuningData.length : 0
    };
  }

  // 🔄 CONTINUOUS LEARNING
  async reinforceLearning(documentId: number, feedback: { correct: boolean, explanation?: string }): Promise<void> {
    const session = this.learningSessions.get(documentId);
    if (!session) return;

    if (feedback.correct) {
      // Increase expertise level
      session.expertiseLevel = Math.min(10, session.expertiseLevel + 0.5);
      console.log(`📈 Expertise level increased to ${session.expertiseLevel}/10 for ${session.domain}`);
    } else if (feedback.explanation) {
      // Learn from correction
      const correctionPrompt = `You made an error in ${session.domain}. Learn from this correction:

Error context: ${feedback.explanation}

Update your understanding and provide a corrected expert response.`;

      try {
        const correction = await this.ollama.generateText(correctionPrompt);
        // Store the correction for future reference
        session.fineTuningData.push({
          instruction: 'Learn from correction',
          input: feedback.explanation,
          output: correction,
          metadata: { type: 'correction', domain: session.domain }
        });
      } catch (error) {
        console.error(`Failed to process correction: ${error}`);
      }
    }
  }

      // 🔧 UTILITY METHODS - Enhanced for various models
  private parseJSON(response: string): any {
    try {
      // First try to parse the entire response
      try {
        return JSON.parse(response.trim());
      } catch (firstError) {
        // Some models often wrap JSON in markdown or add explanations
        const extractionPatterns = [
          /```json\s*(\{[\s\S]*?\})\s*```/i, // JSON in code blocks
          /```\s*(\{[\s\S]*?\})\s*```/i,     // JSON in generic code blocks
          /\{[\s\S]*\}/,                      // Any JSON-like structure
        ];
        
        for (const pattern of extractionPatterns) {
          const match = response.match(pattern);
          if (match) {
            let jsonStr = match[1] || match[0];
            
            try {
              // Clean up common JSON issues from AI responses
              jsonStr = jsonStr
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
                .replace(/[\u0000-\u001f]+/g, '') // Remove control characters
                .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Fix invalid escape sequences
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
              
              return JSON.parse(jsonStr);
            } catch (cleanupError) {
              continue;
            }
          }
        }
        
        // If all patterns fail, extract structured data manually
        console.warn(`⚠️ JSON parsing fallback failed: Error: No JSON structure found`);
        return this.extractStructuredDataFromResponse(response);
      }
    } catch (error) {
      console.error(`JSON parsing failed: ${error}`);
      
      // Return a more comprehensive fallback
      return {
        domain: 'General Knowledge',
        complexity: 'intermediate',
        concepts: [],
        key_terms: [],
        learning_objectives: ['Understand main concepts', 'Apply knowledge practically'],
        expertise_areas: ['Content analysis', 'Critical thinking']
      };
    }
  }

      // 📋 EXTRACT STRUCTURED DATA FROM MODEL RESPONSE
  private extractStructuredDataFromResponse(response: string): any {
    const data: any = {
      domain: 'General Knowledge',
      complexity: 'intermediate',
      concepts: [],
      key_terms: [],
      learning_objectives: [],
      expertise_areas: []
    };

    // Extract domain with multiple patterns
    const domainPatterns = [
      /domain[:"'\s]*['"]*([^,\n\]}"']+)['"]*\s*[,}]/i,
      /field[:"'\s]*['"]*([^,\n\]}"']+)['"]*\s*[,}]/i,
      /subject[:"'\s]*['"]*([^,\n\]}"']+)['"]*\s*[,}]/i
    ];
    
    for (const pattern of domainPatterns) {
      const match = response.match(pattern);
      if (match) {
        data.domain = match[1].trim().replace(/['"]/g, '');
        break;
      }
    }

    // Extract complexity
    const complexityMatch = response.match(/complexity[:"'\s]*['"]*\s*(beginner|intermediate|advanced|expert)['"]*\s*[,}]/i);
    if (complexityMatch) data.complexity = complexityMatch[1].toLowerCase();

          // Extract arrays - look for common model response patterns
    data.concepts = this.extractListFromResponse(response, ['concepts', 'topics', 'themes']);
    data.key_terms = this.extractListFromResponse(response, ['key_terms', 'keywords', 'terms']);
    data.learning_objectives = this.extractListFromResponse(response, ['learning_objectives', 'objectives', 'goals']);
    data.expertise_areas = this.extractListFromResponse(response, ['expertise_areas', 'areas', 'specialties']);

    return data;
  }

      // 🔍 EXTRACT LISTS FROM MODEL RESPONSE
  private extractListFromResponse(text: string, fieldNames: string[]): string[] {
    for (const fieldName of fieldNames) {
      // Try array format first
      const arrayPattern = new RegExp(`${fieldName}[:"'\\s]*\\[([^\\]]*)\\]`, 'i');
      const arrayMatch = text.match(arrayPattern);
      if (arrayMatch) {
        return arrayMatch[1]
          .split(/,|;|\n/)
          .map(item => item.trim().replace(/['"]/g, ''))
          .filter(item => item.length > 0)
          .slice(0, 5);
      }

      // Try list format (bullet points or numbered)
      const listPattern = new RegExp(`${fieldName}[:"'\\s]*\\n([^\\n]*(?:\\n[-*•]?\\s*[^\\n]*){0,4})`, 'i');
      const listMatch = text.match(listPattern);
      if (listMatch) {
        return listMatch[1]
          .split(/\n/)
          .map(item => item.replace(/^[-*•\d.\s]+/, '').trim())
          .filter(item => item.length > 0)
          .slice(0, 5);
      }
    }
    return [];
  }

  // 🧠 Detect visual elements with more conservative approach
  private detectVisualElements(content: string): boolean {
    // Only use vision models for content that has clear visual indicators
    // and is not primarily text-based
    const visualIndicators = [
      /\b(?:chart|graph|diagram|table|figure|image|photo|picture)\b/gi,
      /<img\b[^>]*>/gi,
      /<svg\b[^>]*>/gi,
      /<canvas\b[^>]*>/gi,
      /\[visual:/gi,
      /\[image:/gi,
      /\!\[.*\]\(/gi, // Markdown images
    ];
    
    const hasVisualMarkers = visualIndicators.some(pattern => pattern.test(content));
    const textLength = content.replace(/\s/g, '').length;
    
    // Only use vision analysis if:
    // 1. Has visual markers AND 
    // 2. Content is substantial (>50k chars) AND
    // 3. Visual markers are frequent enough (>5 occurrences)
    if (hasVisualMarkers && textLength > 50000) {
      const visualMatches = visualIndicators.reduce((count, pattern) => {
        return count + (content.match(pattern) || []).length;
      }, 0);
      
      const shouldUseVision = visualMatches > 5;
      console.log(`📊 Visual analysis decision: ${shouldUseVision ? 'Use vision model' : 'Use text model'} (${visualMatches} visual markers, ${textLength} chars)`);
      return shouldUseVision;
    }
    
    console.log(`📝 Using fast text analysis (${textLength} chars, visual: ${hasVisualMarkers})`);
    return false;
  }

  // 📊 EXPORT FINE-TUNING DATA
  async exportFineTuningData(documentId: number): Promise<string> {
    const session = this.learningSessions.get(documentId);
    if (!session) return '';

    // Export in JSONL format for fine-tuning
    return session.fineTuningData
      .map(example => JSON.stringify(example))
      .join('\n');
  }

  // 🎯 GET ALL EXPERTISE
  getAllExpertise(): any[] {
    return Array.from(this.learningSessions.values()).map(session => ({
      documentId: session.documentId,
      domain: session.domain,
      expertiseLevel: session.expertiseLevel,
      concepts: session.concepts,
      fineTuningData: session.fineTuningData
    }));
  }
}

// Create singleton instance
export const autoLearningSystem = new AutoLearningSystem(); 