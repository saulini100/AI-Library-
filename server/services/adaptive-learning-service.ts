import { MultiModelService } from './multi-model-service.js';
import { LocalMemoryService, Memory, UserProfile } from './LocalMemoryService.js';
import { db } from '../db.js';
import * as schema from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface LearningPath {
  id: string;
  userId: number;
  domain: string;
  currentLevel: number;
  targetLevel: number;
  personalizedContent: string[];
  adaptivePrompts: string[];
  learningVelocity: number; // Progress rate
  strengthAreas: string[];
  improvementAreas: string[];
  nextRecommendations: string[];
}

export interface LearningSession {
  sessionId: string;
  userId: number;
  documentId: number;
  startTime: Date;
  endTime?: Date;
  interactionCount: number;
  questionsAsked: string[];
  conceptsExplored: string[];
  comprehensionScore: number;
  engagementLevel: number;
}

export interface PersonalizedExpertise {
  domain: string;
  level: number;
  confidence: number;
  personalizedKnowledge: string[];
  adaptiveTechniques: string[];
  preferredLearningStyle: 'visual' | 'analytical' | 'practical' | 'theoretical';
  optimizedPromptTemplates: Map<string, string>;
}

export class AdaptiveLearningService {
  private multiModel: MultiModelService;
  private memory: LocalMemoryService;
  private learningPaths: Map<string, LearningPath> = new Map();
  private activeSessions: Map<string, LearningSession> = new Map();
  private userExpertise: Map<number, Map<string, PersonalizedExpertise>> = new Map();

  constructor() {
    this.multiModel = new MultiModelService();
    this.memory = LocalMemoryService.getInstance();
  }

  async initialize(): Promise<void> {
    await this.multiModel.initialize();
    console.log('🎓 Adaptive Learning Service initialized - Ready for personalized growth!');
  }

  // 🚀 START PERSONALIZED LEARNING SESSION
  async startLearningSession(userId: number, documentId: number): Promise<string> {
    const sessionId = `session_${userId}_${documentId}_${Date.now()}`;
    
    const session: LearningSession = {
      sessionId,
      userId,
      documentId,
      startTime: new Date(),
      interactionCount: 0,
      questionsAsked: [],
      conceptsExplored: [],
      comprehensionScore: 0,
      engagementLevel: 0
    };

    this.activeSessions.set(sessionId, session);

    // Generate personalized content based on user's profile and current expertise
    await this.generatePersonalizedContent(userId, documentId, sessionId);

    console.log(`🎯 Started adaptive learning session ${sessionId} for user ${userId}`);
    return sessionId;
  }

  // 🧠 GENERATE PERSONALIZED CONTENT
  private async generatePersonalizedContent(userId: number, documentId: number, sessionId: string): Promise<void> {
    try {
      // Get user profile and learning history
      const userProfile = await this.memory.getUserProfile(userId);
      const userExpertise = this.getUserExpertise(userId);
      const document = await this.getDocumentContent(documentId);

      if (!document) return;

      // Analyze user's learning patterns
      const learningPattern = await this.analyzeLearningPattern(userProfile);
      
      // Get user's current expertise level in this domain
      const domainExpertise = await this.analyzeDomainExpertise(document.content, userId);
      
      // Generate adaptive prompts based on user's level and preferences
      const adaptivePrompts = await this.generateAdaptivePrompts(
        document.content, 
        domainExpertise.level,
        learningPattern.preferredStyle,
        userProfile.preferredTopics
      );

      // Create or update learning path
      const learningPath: LearningPath = {
        id: `path_${userId}_${documentId}`,
        userId,
        domain: domainExpertise.domain,
        currentLevel: domainExpertise.level,
        targetLevel: Math.min(10, domainExpertise.level + 2),
        personalizedContent: adaptivePrompts.content,
        adaptivePrompts: adaptivePrompts.prompts,
        learningVelocity: learningPattern.velocity,
        strengthAreas: learningPattern.strengths,
        improvementAreas: learningPattern.improvements,
        nextRecommendations: adaptivePrompts.recommendations
      };

      this.learningPaths.set(learningPath.id, learningPath);

      console.log(`📚 Generated personalized learning path for ${domainExpertise.domain} (Level ${domainExpertise.level} → ${learningPath.targetLevel})`);
      
    } catch (error) {
      console.error(`❌ Failed to generate personalized content: ${error}`);
    }
  }

  // 📊 ANALYZE LEARNING PATTERN
  private async analyzeLearningPattern(userProfile: UserProfile): Promise<{
    preferredStyle: 'visual' | 'analytical' | 'practical' | 'theoretical';
    velocity: number;
    strengths: string[];
    improvements: string[];
  }> {
    
    // Analyze user's annotation patterns to determine learning style
    let preferredStyle: 'visual' | 'analytical' | 'practical' | 'theoretical' = 'analytical';
    
    if (userProfile.annotationFrequency > 10) {
      preferredStyle = userProfile.preferredTopics.some(topic => 
        ['history', 'culture', 'context'].includes(topic.toLowerCase())
      ) ? 'practical' : 'analytical';
    }

    // Calculate learning velocity based on session patterns
    const velocity = Math.min(10, Math.max(1, userProfile.averageSessionLength / 10));

    // Determine strengths and improvement areas based on common themes
    const strengths = userProfile.commonThemes.slice(0, 3);
    const improvements = userProfile.favoriteBooks.length > 5 ? 
      ['depth-analysis', 'cross-references'] : ['consistency', 'engagement'];

    return {
      preferredStyle,
      velocity,
      strengths,
      improvements
    };
  }

  // 🎯 ANALYZE DOMAIN EXPERTISE  
  private async analyzeDomainExpertise(content: string, userId: number): Promise<{
    domain: string;
    level: number;
    confidence: number;
  }> {
    
    const result = await this.multiModel.executeTask('text-analysis', 
      `Analyze this content to determine the primary domain and required expertise level:

${content.substring(0, 5000)}

Provide JSON response:
{
  "domain": "specific domain (e.g., 'Old Testament Studies', 'New Testament Theology')",
  "complexity": "beginner|intermediate|advanced|expert",
  "required_background": ["concept1", "concept2"],
  "difficulty_score": 1-10
}`, 
      { requirements: { accuracy: 9, reasoning: 8 } }
    );

    try {
      const analysis = JSON.parse(result.response);
      
      // Get user's historical performance in this domain
      const userMemories = await this.memory.retrieveMemories(userId, analysis.domain, 20);
      const historicalPerformance = this.calculateHistoricalPerformance(userMemories);
      
      const complexityMapping: Record<string, number> = {
        'beginner': 3,
        'intermediate': 5,
        'advanced': 7,
        'expert': 9
      };

      const baseLevel = complexityMapping[analysis.complexity] || 5;
      const adjustedLevel = Math.max(1, Math.min(10, baseLevel + historicalPerformance.adjustment));
      
      return {
        domain: analysis.domain,
        level: adjustedLevel,
        confidence: historicalPerformance.confidence
      };
      
    } catch (error) {
      console.error(`❌ Failed to analyze domain expertise: ${error}`);
      return { domain: 'General Studies', level: 5, confidence: 0.5 };
    }
  }

  // 📈 CALCULATE HISTORICAL PERFORMANCE
  private calculateHistoricalPerformance(memories: Memory[]): { adjustment: number; confidence: number } {
    if (memories.length === 0) {
      return { adjustment: 0, confidence: 0.5 };
    }

    // Analyze user's past interactions to determine performance level
    let totalEngagement = 0;
    let comprehensionIndicators = 0;

    memories.forEach(memory => {
      // Higher word count in memories indicates deeper engagement
      if (memory.content.length > 200) totalEngagement++;
      
      // Check for comprehension indicators in memory content
      const comprehensionKeywords = ['understand', 'analysis', 'connection', 'insight', 'meaning'];
      if (comprehensionKeywords.some(keyword => memory.content.toLowerCase().includes(keyword))) {
        comprehensionIndicators++;
      }
    });

    const engagementRatio = totalEngagement / memories.length;
    const comprehensionRatio = comprehensionIndicators / memories.length;
    
    // Calculate level adjustment (-2 to +2)
    const adjustment = Math.round((engagementRatio + comprehensionRatio - 1) * 2);
    const confidence = Math.min(1, (memories.length / 20) * (engagementRatio + comprehensionRatio) / 2);
    
    return { adjustment, confidence };
  }

  // 🎨 GENERATE ADAPTIVE PROMPTS
  private async generateAdaptivePrompts(
    content: string, 
    userLevel: number, 
    learningStyle: string,
    preferredTopics: string[]
  ): Promise<{
    content: string[];
    prompts: string[];
    recommendations: string[];
  }> {
    
    const stylePrompts = {
      'visual': 'Focus on imagery, symbolism, and visual metaphors',
      'analytical': 'Provide logical structure, arguments, and systematic analysis',
      'practical': 'Emphasize real-world applications and actionable insights',
      'theoretical': 'Explore deeper theological and philosophical concepts'
    };

    const levelAdaptation = {
      1: 'Use simple language and basic concepts',
      2: 'Introduce fundamental principles clearly',
      3: 'Build on basic knowledge with examples',
      4: 'Connect related concepts and themes',
      5: 'Analyze relationships and implications',
      6: 'Explore nuanced interpretations',
      7: 'Discuss complex theological questions',
      8: 'Examine scholarly debates and perspectives',
      9: 'Integrate advanced hermeneutical approaches',
      10: 'Engage with cutting-edge research and synthesis'
    };

    const adaptivePrompt = `Generate personalized learning content for a level ${userLevel} learner with ${learningStyle} learning style.

Content to adapt: ${content.substring(0, 3000)}

Learning preferences: ${preferredTopics.join(', ')}
Style instruction: ${stylePrompts[learningStyle as keyof typeof stylePrompts]}
Level instruction: ${levelAdaptation[userLevel as keyof typeof levelAdaptation]}

Generate JSON response:
{
  "adapted_content": ["key point 1 adapted for this learner", "key point 2", "key point 3"],
  "personalized_prompts": ["thought-provoking question 1", "reflection prompt 2"],
  "next_steps": ["recommendation 1", "recommendation 2"]
}`;

    try {
      const result = await this.multiModel.executeTask('creative-insights', adaptivePrompt, {
        requirements: { creativity: 8, reasoning: 7 }
      });

      const adaptation = JSON.parse(result.response);
      
      return {
        content: adaptation.adapted_content || [],
        prompts: adaptation.personalized_prompts || [],
        recommendations: adaptation.next_steps || []
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate adaptive prompts: ${error}`);
      return { content: [], prompts: [], recommendations: [] };
    }
  }

  // 📚 GET PERSONALIZED EXPERTISE FOR USER
  private getUserExpertise(userId: number): Map<string, PersonalizedExpertise> {
    if (!this.userExpertise.has(userId)) {
      this.userExpertise.set(userId, new Map());
    }
    return this.userExpertise.get(userId)!;
  }

  // 🎯 UPDATE LEARNING PROGRESS
  async updateLearningProgress(sessionId: string, interaction: {
    questionAsked?: string;
    conceptExplored?: string;
    comprehensionScore?: number;
    engagementLevel?: number;
  }): Promise<void> {
    
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Update session data
    session.interactionCount++;
    if (interaction.questionAsked) {
      session.questionsAsked.push(interaction.questionAsked);
    }
    if (interaction.conceptExplored) {
      session.conceptsExplored.push(interaction.conceptExplored);
    }
    if (interaction.comprehensionScore !== undefined) {
      session.comprehensionScore = (session.comprehensionScore + interaction.comprehensionScore) / 2;
    }
    if (interaction.engagementLevel !== undefined) {
      session.engagementLevel = Math.max(session.engagementLevel, interaction.engagementLevel);
    }

    // Store interaction in memory for future personalization
    await this.memory.storeMemory(
      session.userId,
      JSON.stringify(interaction),
      'learning_interaction',
      { sessionId, documentId: session.documentId }
    );

    console.log(`📊 Updated learning progress for session ${sessionId}`);
  }

  // 🏁 END LEARNING SESSION AND CALCULATE GROWTH
  async endLearningSession(sessionId: string): Promise<{
    growthAchieved: number;
    newSkillsAcquired: string[];
    nextRecommendations: string[];
    personalizedFeedback: string;
  }> {
    
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = new Date();
    
    // Calculate learning growth based on session metrics
    const sessionDuration = session.endTime.getTime() - session.startTime.getTime();
    const baseGrowth = Math.min(2, session.interactionCount * 0.1);
    const engagementBonus = session.engagementLevel * 0.2;
    const comprehensionBonus = session.comprehensionScore * 0.3;
    
    const totalGrowth = baseGrowth + engagementBonus + comprehensionBonus;
    
    // Identify new skills based on concepts explored
    const newSkills = session.conceptsExplored.filter((concept, index, self) => 
      self.indexOf(concept) === index
    );

    // Generate personalized feedback
    const feedback = await this.generatePersonalizedFeedback(session, totalGrowth);
    
    // Get learning path recommendations
    const pathId = `path_${session.userId}_${session.documentId}`;
    const learningPath = this.learningPaths.get(pathId);
    const recommendations = learningPath?.nextRecommendations || [];

    // Update user expertise
    await this.updateUserExpertise(session.userId, session.documentId, totalGrowth, newSkills);
    
    // Clean up active session
    this.activeSessions.delete(sessionId);
    
    console.log(`🎓 Session ${sessionId} completed. Growth: ${totalGrowth.toFixed(2)}, Skills: ${newSkills.length}`);
    
    return {
      growthAchieved: Math.round(totalGrowth * 100) / 100,
      newSkillsAcquired: newSkills,
      nextRecommendations: recommendations,
      personalizedFeedback: feedback
    };
  }

  // 💬 GENERATE PERSONALIZED FEEDBACK
  private async generatePersonalizedFeedback(session: LearningSession, growth: number): Promise<string> {
    const feedbackPrompt = `Generate encouraging, personalized feedback for a learning session:

Session Summary:
- Duration: ${session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000) : 0} minutes
- Interactions: ${session.interactionCount}
- Questions asked: ${session.questionsAsked.length}
- Concepts explored: ${session.conceptsExplored.length}
- Growth achieved: ${growth.toFixed(2)} points

Generate warm, encouraging feedback that:
1. Acknowledges specific achievements
2. Highlights areas of strength
3. Provides motivation for continued learning
4. Suggests specific next steps

Keep it personal and uplifting (2-3 sentences).`;

    try {
      const result = await this.multiModel.executeTask('creative-insights', feedbackPrompt, {
        requirements: { creativity: 8, reasoning: 6 }
      });
      
      return result.response.trim();
    } catch (error) {
      return `Great work in this session! You engaged thoughtfully with the material and made meaningful progress. Keep up the excellent learning momentum!`;
    }
  }

  // 📈 UPDATE USER EXPERTISE
  private async updateUserExpertise(userId: number, documentId: number, growth: number, newSkills: string[]): Promise<void> {
    // This would typically update the database
    // For now, we'll store it in memory and LocalMemoryService
    
    await this.memory.storeMemory(
      userId,
      JSON.stringify({
        growth,
        newSkills,
        documentId,
        timestamp: new Date().toISOString()
      }),
      'expertise_update',
      { growth, newSkills: newSkills.length }
    );
  }

  // 🎯 GET PERSONALIZED RECOMMENDATIONS
  async getPersonalizedRecommendations(userId: number, limit: number = 5): Promise<{
    recommendedDocuments: any[];
    suggestedTopics: string[];
    personalizedQuestions: string[];
  }> {
    
    const userProfile = await this.memory.getUserProfile(userId);
    const recentMemories = await this.memory.retrieveMemories(userId, undefined, 50);
    
    // Analyze user interests and generate recommendations
    const recommendationsPrompt = `Based on this user's learning profile, generate personalized recommendations:

Profile Summary:
- Favorite books: ${userProfile.favoriteBooks.join(', ')}
- Common themes: ${userProfile.commonThemes.join(', ')}
- Preferred topics: ${userProfile.preferredTopics.join(', ')}
- Recent activity: ${recentMemories.slice(0, 3).map(m => m.category).join(', ')}

Generate JSON response:
{
  "suggested_topics": ["topic1", "topic2", "topic3"],
  "personalized_questions": ["question1", "question2", "question3"],
  "learning_focus": ["area1", "area2"]
}`;

    try {
      const result = await this.multiModel.executeTask('theological-reasoning', recommendationsPrompt, {
        requirements: { reasoning: 8, creativity: 7 }
      });
      
      const recommendations = JSON.parse(result.response);
      
      return {
        recommendedDocuments: [], // Would be populated from database
        suggestedTopics: recommendations.suggested_topics || [],
        personalizedQuestions: recommendations.personalized_questions || []
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate recommendations: ${error}`);
      return {
        recommendedDocuments: [],
        suggestedTopics: userProfile.preferredTopics.slice(0, 3),
        personalizedQuestions: []
      };
    }
  }

  // 📊 GET USER LEARNING ANALYTICS
  async getUserLearningAnalytics(userId: number): Promise<{
    totalSessions: number;
    totalGrowth: number;
    averageSessionLength: number;
    skillsAcquired: string[];
    learningVelocity: number;
    strongestAreas: string[];
    improvementAreas: string[];
  }> {
    
    const memories = await this.memory.retrieveMemories(userId, 'learning_interaction', 100);
    const expertiseUpdates = await this.memory.retrieveMemories(userId, 'expertise_update', 50);
    
    const totalGrowth = expertiseUpdates.reduce((sum, memory) => {
      try {
        const data = JSON.parse(memory.content);
        return sum + (data.growth || 0);
      } catch {
        return sum;
      }
    }, 0);

    const skillsAcquired = expertiseUpdates.flatMap(memory => {
      try {
        const data = JSON.parse(memory.content);
        return data.newSkills || [];
      } catch {
        return [];
      }
    });

    const userProfile = await this.memory.getUserProfile(userId);
    
    return {
      totalSessions: memories.length,
      totalGrowth: Math.round(totalGrowth * 100) / 100,
      averageSessionLength: userProfile.averageSessionLength,
      skillsAcquired: Array.from(new Set(skillsAcquired)),
      learningVelocity: Math.min(10, totalGrowth / Math.max(1, memories.length)),
      strongestAreas: userProfile.commonThemes.slice(0, 3),
      improvementAreas: userProfile.preferredTopics.filter(topic => 
        !userProfile.commonThemes.includes(topic)
      ).slice(0, 3)
    };
  }

  // 🔧 HELPER METHODS
  private async getDocumentContent(documentId: number): Promise<{ content: string } | null> {
    try {
      const document = await db.select().from(schema.documents).where(eq(schema.documents.id, documentId)).limit(1);
      return document.length > 0 ? { content: document[0].content } : null;
    } catch (error) {
      console.error(`Failed to get document content: ${error}`);
      return null;
    }
  }

  // 📊 GET SYSTEM ANALYTICS
  getSystemAnalytics(): {
    activeSessions: number;
    totalLearningPaths: number;
    averageGrowthRate: number;
  } {
    const activeSessions = this.activeSessions.size;
    const totalLearningPaths = this.learningPaths.size;
    
    // Calculate average growth rate across all users
    let totalGrowth = 0;
    let pathCount = 0;
    
    this.learningPaths.forEach(path => {
      totalGrowth += (path.targetLevel - path.currentLevel) * path.learningVelocity;
      pathCount++;
    });
    
    const averageGrowthRate = pathCount > 0 ? totalGrowth / pathCount : 0;
    
    return {
      activeSessions,
      totalLearningPaths,
      averageGrowthRate: Math.round(averageGrowthRate * 100) / 100
    };
  }
} 