// 🧪 Test file for enhanced Discussion Agent
import { DiscussionAgent } from './discussion-agent';

async function testEnhancedDiscussionAgent() {
  console.log('🧪 Testing Enhanced Discussion Agent...\n');

  // Create agent instance
  const agent = new DiscussionAgent();
  
  try {
    // Initialize the agent
    await agent.initialize();
    console.log('✅ Agent initialized successfully');

    // Test different types of messages
    const testMessages = [
      "What is the main theme of this chapter?",
      "Take a note about the protagonist's development",
      "Start a group discussion about artificial intelligence",
      "Translate this to Spanish: Hello, how are you?",
      "Can you explain the context of this passage?"
    ];

    for (const message of testMessages) {
      console.log(`\n🔍 Testing message: "${message}"`);
      
      const response = await agent.handleDiscussionMessage(message, {
        userId: 2,
        documentId: 1,
        chapter: 1,
        sessionId: 'test-session',
        language: 'en'
      });
      
      console.log(`📝 Response: ${response.substring(0, 100)}...`);
    }

    // Test metrics
    const metrics = (agent as any).toolCallManager?.getMetrics();
    if (metrics) {
      console.log('\n📊 Tool Call Metrics:');
      console.log(JSON.stringify(metrics, null, 2));
    }

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedDiscussionAgent().catch(console.error); 