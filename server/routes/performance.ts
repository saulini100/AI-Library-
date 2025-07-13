import express from 'express';
import { OllamaService } from '../services/ollama-service.js';
import { LocalMemoryService } from '../services/LocalMemoryService.js';

const router = express.Router();

// Global performance tracking
let performanceTracker = {
  requestCount: 0,
  totalResponseTime: 0,
  slowQueries: [] as Array<{ endpoint: string; duration: number; timestamp: Date }>,
  cacheStats: {
    hits: 0,
    misses: 0,
    totalRequests: 0
  }
};

// Middleware to track API performance
export const performanceMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - startTime;
    performanceTracker.requestCount++;
    performanceTracker.totalResponseTime += duration;
    
    // Track slow queries (>500ms)
    if (duration > 500) {
      performanceTracker.slowQueries.push({
        endpoint: `${req.method} ${req.path}`,
        duration,
        timestamp: new Date()
      });
      
      // Keep only last 50 slow queries
      if (performanceTracker.slowQueries.length > 50) {
        performanceTracker.slowQueries = performanceTracker.slowQueries.slice(-50);
      }
    }
    
    // Log performance for monitoring
    if (duration > 1000) {
      console.warn(`🐌 Slow API request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.log(`⚡ API request: ${req.method} ${req.path} completed in ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};

// GET /api/performance - Get comprehensive performance metrics
router.get('/', async (req, res) => {
  try {
    const startTime = performance.now();
    
    // Get Ollama service performance
    const ollamaService = req.app.locals.ollamaService as OllamaService;
    const ollamaStats = ollamaService?.getPerformanceStats() || null;
    
    // Get database performance
    const memoryService = req.app.locals.memoryService as LocalMemoryService;
    const dbStats = memoryService?.getPerformanceSummary() || null;
    const dbMetrics = memoryService?.getPerformanceMetrics()?.slice(-100) || [];
    
    // Calculate API performance metrics
    const avgResponseTime = performanceTracker.requestCount > 0 
      ? performanceTracker.totalResponseTime / performanceTracker.requestCount 
      : 0;
    
    const cacheHitRate = performanceTracker.cacheStats.totalRequests > 0
      ? (performanceTracker.cacheStats.hits / performanceTracker.cacheStats.totalRequests) * 100
      : 0;
    
    // System performance metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    const performanceReport = {
      timestamp: new Date().toISOString(),
      generationTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      
      // API Performance
      api: {
        totalRequests: performanceTracker.requestCount,
        averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        slowQueries: performanceTracker.slowQueries.slice(-10), // Last 10 slow queries
        cacheHitRate: parseFloat(cacheHitRate.toFixed(2))
      },
      
      // Ollama AI Service Performance
      ollama: ollamaStats ? {
        isConnected: ollamaStats.isConnected,
        model: ollamaStats.model,
        connectionPool: ollamaStats.connectionPool,
        cache: ollamaStats.cache,
        status: 'optimized'
      } : { status: 'unavailable' },
      
      // Database Performance
      database: dbStats ? {
        totalQueries: dbStats.totalQueries,
        averageQueryTime: parseFloat(dbStats.averageQueryTime.toFixed(2)),
        slowestQuery: dbStats.slowestQuery ? {
          operation: dbStats.slowestQuery.operation,
          duration: parseFloat(dbStats.slowestQuery.duration.toFixed(2)),
          timestamp: dbStats.slowestQuery.timestamp
        } : null,
        fastestQuery: dbStats.fastestQuery ? {
          operation: dbStats.fastestQuery.operation,
          duration: parseFloat(dbStats.fastestQuery.duration.toFixed(2)),
          timestamp: dbStats.fastestQuery.timestamp
        } : null,
        operationBreakdown: Object.entries(dbStats.operationBreakdown).map(([operation, stats]) => ({
          operation,
          count: stats.count,
          avgTime: parseFloat(stats.avgTime.toFixed(2))
        })),
        recentQueries: dbMetrics.slice(-10).map(metric => ({
          operation: metric.operation,
          duration: parseFloat(metric.duration.toFixed(2)),
          rowsAffected: metric.rowsAffected,
          timestamp: metric.timestamp
        }))
      } : { status: 'unavailable' },
      
      // System Performance
      system: {
        uptime: `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m`,
        memory: {
          used: `${Math.round(systemMetrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(systemMetrics.memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(systemMetrics.memoryUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(systemMetrics.memoryUsage.rss / 1024 / 1024)}MB`
        },
        cpu: {
          user: systemMetrics.cpuUsage.user,
          system: systemMetrics.cpuUsage.system
        },
        nodeVersion: systemMetrics.nodeVersion,
        platform: systemMetrics.platform
      },
      
      // Performance Recommendations
      recommendations: generatePerformanceRecommendations({
        avgResponseTime,
        slowQueriesCount: performanceTracker.slowQueries.length,
        cacheHitRate,
        memoryUsage: systemMetrics.memoryUsage,
        dbStats
      })
    };
    
    res.json(performanceReport);
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ 
      error: 'Failed to generate performance report',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/performance/live - Get real-time performance metrics
router.get('/live', (req, res) => {
  try {
    const liveMetrics = {
      timestamp: new Date().toISOString(),
      api: {
        requestsPerMinute: calculateRequestsPerMinute(),
        currentResponseTime: performanceTracker.requestCount > 0 
          ? performanceTracker.totalResponseTime / performanceTracker.requestCount 
          : 0,
        activeConnections: getActiveConnections()
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    res.json(liveMetrics);
  } catch (error) {
    console.error('Error getting live metrics:', error);
    res.status(500).json({ error: 'Failed to get live metrics' });
  }
});

// POST /api/performance/optimize - Trigger optimization tasks
router.post('/optimize', async (req, res) => {
  try {
    const optimizations = [];
    
    // Optimize database
    const memoryService = req.app.locals.memoryService as LocalMemoryService;
    if (memoryService) {
      await memoryService.optimizeDatabase();
      optimizations.push('Database optimized (ANALYZE, VACUUM, PRAGMA optimize)');
    }
    
    // Clear old performance metrics
    performanceTracker.slowQueries = [];
    performanceTracker.cacheStats = { hits: 0, misses: 0, totalRequests: 0 };
    optimizations.push('Performance metrics cleared');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      optimizations.push('Garbage collection triggered');
    }
    
    res.json({
      success: true,
      optimizations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running optimizations:', error);
    res.status(500).json({ error: 'Optimization failed' });
  }
});

// Helper functions
function calculateRequestsPerMinute(): number {
  // This is a simplified calculation - in production you'd want a sliding window
  return performanceTracker.requestCount / (process.uptime() / 60);
}

function getActiveConnections(): number {
  // This would need to be implemented based on your connection tracking
  return 0;
}

function generatePerformanceRecommendations(metrics: {
  avgResponseTime: number;
  slowQueriesCount: number;
  cacheHitRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  dbStats: any;
}): string[] {
  const recommendations: string[] = [];
  
  // Response time recommendations
  if (metrics.avgResponseTime > 1000) {
    recommendations.push('🐌 Average response time is high (>1s). Consider optimizing database queries or adding more caching.');
  } else if (metrics.avgResponseTime > 500) {
    recommendations.push('⚠️ Response time could be improved. Monitor slow queries and consider connection pooling.');
  } else if (metrics.avgResponseTime < 100) {
    recommendations.push('🚀 Excellent response times! Your optimizations are working well.');
  }
  
  // Cache recommendations
  if (metrics.cacheHitRate < 30) {
    recommendations.push('📈 Low cache hit rate. Consider increasing cache size or improving cache strategies.');
  } else if (metrics.cacheHitRate > 70) {
    recommendations.push('💾 Great cache performance! High hit rate is improving response times.');
  }
  
  // Memory recommendations
  const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsageMB > 500) {
    recommendations.push('🧠 High memory usage detected. Consider implementing memory cleanup or increasing server resources.');
  } else if (memoryUsageMB < 100) {
    recommendations.push('✅ Memory usage is optimal.');
  }
  
  // Database recommendations
  if (metrics.dbStats && metrics.dbStats.averageQueryTime > 50) {
    recommendations.push('🗄️ Database queries are slow. Consider adding indexes or optimizing query patterns.');
  }
  
  // Slow queries recommendations
  if (metrics.slowQueriesCount > 10) {
    recommendations.push('🔍 Multiple slow queries detected. Review and optimize the slowest endpoints.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('🎯 System performance looks good! All metrics are within optimal ranges.');
  }
  
  return recommendations;
}

export default router; 