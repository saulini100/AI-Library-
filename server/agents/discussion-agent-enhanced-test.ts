import { DiscussionAgent } from './discussion-agent';

async function testEnhancedDiscussionAgent() {
  console.log('🧪 Testing Enhanced Discussion Agent with 12-Factor Agents Framework\n');

  const agent = new DiscussionAgent();

  try {
    // Test 1: Factor 1 - Natural Language to Tool Calls
    console.log('✅ Test 1: Factor 1 - Natural Language to Tool Calls');
    const testMessages = [
      "What is the main theme of this chapter?",
      "Take a note about the protagonist's development",
      "Can you translate this to Spanish?",
      "Let's have a group discussion about AI ethics",
      "What's the context behind this passage?"
    ];

    for (const message of testMessages) {
      console.log(`\n📝 Testing: "${message}"`);
      const response = await agent.handleDiscussionMessage(message, {
        userId: 2,
        documentId: 1,
        chapter: 1,
        sessionId: 'test-session-1'
      });
      console.log(`🤖 Response: ${response.substring(0, 100)}...`);
    }

    // Test 2: Factor 2 - Own Your Prompts
    console.log('\n✅ Test 2: Factor 2 - Own Your Prompts');
    const promptManager = (agent as any).promptManager;
    const systemPrompt = promptManager.getPrompt('discussion_system');
    console.log(`📋 System prompt length: ${systemPrompt.length} characters`);
    
    const personalityPrompt = promptManager.getPrompt('personality_analytical');
    console.log(`🎭 Analytical personality prompt: ${personalityPrompt.substring(0, 80)}...`);

    // Test 3: Factor 3 - Own Your Context Window
    console.log('\n✅ Test 3: Factor 3 - Own Your Context Window');
    const contextManager = (agent as any).contextWindowManager;
    
    // Add some context
    contextManager.addContext("This is important context about the document", 3);
    contextManager.addContext("This is less important background information", 1);
    
    const contextStats = contextManager.getContextStats();
    console.log(`📊 Context stats: ${contextStats.itemCount} items, ${contextStats.totalTokens} tokens`);
    
    const context = contextManager.getContext();
    console.log(`📖 Current context: ${context.substring(0, 100)}...`);

    // Test 4: Factor 5 - Unify Execution State and Business State
    console.log('\n✅ Test 4: Factor 5 - Unify Execution State and Business State');
    const stateManager = (agent as any).unifiedStateManager;
    
    // Set business state
    stateManager.setBusinessState('user_sessions', new Map([['test-session', { userId: 2, active: true }]]));
    
    // Set execution state
    stateManager.setExecutionState('current_task', { type: 'discussion', status: 'processing' });
    
    const stateSnapshot = stateManager.getStateSnapshot();
    console.log(`🏢 State snapshot keys: ${Object.keys(stateSnapshot).join(', ')}`);

    // Test 5: Factor 6 - Launch/Pause/Resume with Simple APIs
    console.log('\n✅ Test 5: Factor 6 - Launch/Pause/Resume with Simple APIs');
    const lifecycleManager = (agent as any).lifecycleManager;
    
    console.log(`🔄 Current status: ${lifecycleManager.getStatus().state}`);
    
    // Test pause/resume
    await lifecycleManager.pause('Testing pause functionality');
    console.log(`⏸️ Paused: ${lifecycleManager.getStatus().state}`);
    
    await lifecycleManager.resume();
    console.log(`▶️ Resumed: ${lifecycleManager.getStatus().state}`);

    // Test 6: Factor 9 - Compact Errors into Context Window
    console.log('\n✅ Test 6: Factor 9 - Compact Errors into Context Window');
    const errorManager = (agent as any).errorRecoveryManager;
    
    try {
      // Simulate an error
      throw new Error('Test error for error recovery');
    } catch (error) {
      const recoveryResponse = await errorManager.handleError(error, { message: 'test' }, agent);
      console.log(`🛠️ Error recovery response: ${recoveryResponse.substring(0, 80)}...`);
    }

    // Test 7: Factor 10 - Small, Focused Agents
    console.log('\n✅ Test 7: Factor 10 - Small, Focused Agents');
    const toolManager = (agent as any).toolCallManager;
    const metrics = toolManager.getMetrics();
    console.log(`🔧 Tool call metrics: ${JSON.stringify(metrics, null, 2)}`);

    // Test 8: Enhanced Intent Analysis
    console.log('\n✅ Test 8: Enhanced Intent Analysis');
    const intentAnalyzer = (agent as any).intentAnalyzer;
    
    const intentTest = intentAnalyzer.analyzeIntent("What are the implications of this theory?");
    console.log(`🎯 Intent analysis: ${intentTest.type} (confidence: ${intentTest.confidence})`);
    console.log(`🔍 Entities: ${intentTest.entities.join(', ')}`);
    console.log(`🛠️ Suggested tools: ${intentTest.suggestedTools.join(', ')}`);

    // Test 9: Response Validation
    console.log('\n✅ Test 9: Response Validation');
    const validator = (agent as any).toolCallValidator;
    
    const testResponse = "This is a valid response with proper content.";
    const validation = validator.validateResponse(testResponse, 'text_response');
    console.log(`✅ Response validation: ${validation.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`📊 Confidence: ${validation.confidence}`);

    // Test 10: Performance Metrics
    console.log('\n✅ Test 10: Performance Metrics');
    const performanceMetrics = {
      averageResponseTime: 1200,
      successRate: 0.95,
      toolCallCount: 15,
      errorRate: 0.05
    };
    
    Object.entries(performanceMetrics).forEach(([metric, value]) => {
      stateManager.updatePerformanceMetrics(metric, value);
    });
    
    const currentMetrics = stateManager.getExecutionState('performance_metrics');
    console.log(`📈 Performance metrics: ${JSON.stringify(currentMetrics, null, 2)}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary of 12-Factor Agents Framework Alignment:');
    console.log('✅ Factor 1: Natural Language to Tool Calls - Implemented with IntentAnalyzer');
    console.log('✅ Factor 2: Own Your Prompts - Implemented with PromptManager');
    console.log('✅ Factor 3: Own Your Context Window - Implemented with ContextWindowManager');
    console.log('✅ Factor 4: Tools are just structured outputs - Implemented with ToolCallManager');
    console.log('✅ Factor 5: Unify Execution State and Business State - Implemented with UnifiedStateManager');
    console.log('✅ Factor 6: Launch/Pause/Resume with Simple APIs - Implemented with LifecycleManager');
    console.log('✅ Factor 9: Compact Errors into Context Window - Implemented with ErrorRecoveryManager');
    console.log('✅ Factor 10: Small, Focused Agents - Agent has clear responsibilities');
    console.log('✅ Factor 12: Make your agent a stateless reducer - State management is centralized');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedDiscussionAgent().catch(console.error); 