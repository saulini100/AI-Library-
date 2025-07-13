import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Database, Cpu, HardDrive, Clock, TrendingUp, TrendingDown, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function PerformanceDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Fetch performance metrics
  const { data: performanceData, isLoading, refetch } = useQuery({
    queryKey: ['/api/performance'],
    queryFn: () => fetch('/api/performance').then(res => res.json()),
    refetchInterval: refreshInterval,
  });

  // Fetch live metrics
  const { data: liveData } = useQuery({
    queryKey: ['/api/performance/live'],
    queryFn: () => fetch('/api/performance/live').then(res => res.json()),
    refetchInterval: 2000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading performance metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = performanceData || {};
  const live = liveData || {};

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "text-green-600";
    if (value <= thresholds.warning) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (value <= thresholds.warning) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center gap-2 hover:bg-muted/60"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            </div>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            <p className="text-muted-foreground">Real-time system and AI performance monitoring</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => refetch()} variant="outline">
              Refresh
            </Button>
            <Button onClick={() => setRefreshInterval(prev => prev === 5000 ? 1000 : 5000)} variant="outline">
              {refreshInterval === 1000 ? 'Slow Refresh' : 'Fast Refresh'}
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* API Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{metrics.api?.averageResponseTime || 0}ms</div>
                {getStatusIcon(metrics.api?.averageResponseTime || 0, { good: 100, warning: 500 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.api?.totalRequests || 0} total requests
              </p>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{metrics.system?.memory?.used || 'N/A'}</div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                of {metrics.system?.memory?.total || 'N/A'} total
              </p>
            </CardContent>
          </Card>

          {/* Database Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{metrics.database?.averageQueryTime || 'N/A'}ms</div>
                {getStatusIcon(metrics.database?.averageQueryTime || 0, { good: 50, warning: 200 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.database?.totalQueries || 0} total queries
              </p>
            </CardContent>
          </Card>

          {/* System Uptime */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{metrics.system?.uptime || 'N/A'}</div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                Node.js {metrics.system?.nodeVersion || 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>AI Service Status</CardTitle>
              <CardDescription>Ollama and AI model performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ollama Connection</span>
                <span className={`text-sm ${metrics.ollama?.status === 'optimized' ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.ollama?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model</span>
                <span className="text-sm">{metrics.ollama?.model || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cache Hit Rate</span>
                <span className="text-sm">{metrics.api?.cacheHitRate || 0}%</span>
              </div>
              <Progress value={metrics.api?.cacheHitRate || 0} className="w-full" />
            </CardContent>
          </Card>

          {/* Recent Slow Queries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Slow Queries</CardTitle>
              <CardDescription>API endpoints taking longer than 500ms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.api?.slowQueries?.slice(0, 5).map((query: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{query.endpoint}</span>
                    <span className={getStatusColor(query.duration, { good: 500, warning: 1000 })}>
                      {query.duration.toFixed(0)}ms
                    </span>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground">No slow queries detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {metrics.recommendations && metrics.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>Suggestions to improve system performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Metrics */}
        {live && (
          <Card>
            <CardHeader>
              <CardTitle>Live Metrics</CardTitle>
              <CardDescription>Real-time system metrics (updates every 2 seconds)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Requests/min:</span> {live.api?.requestsPerMinute || 0}
                </div>
                <div>
                  <span className="font-medium">Current Response Time:</span> {live.api?.currentResponseTime?.toFixed(0) || 0}ms
                </div>
                <div>
                  <span className="font-medium">Memory Used:</span> {Math.round(live.memory?.heapUsed / 1024 / 1024) || 0}MB
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 