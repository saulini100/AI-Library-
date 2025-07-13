import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Activity, Zap, Brain, Settings, RefreshCw, CheckCircle, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentStatus {
  name: string;
  status: 'active' | 'inactive' | 'busy';
  tasksCompleted: number;
  averageResponseTime: number;
  specialties: string[];
  lastActivity: string;
  uptime: number;
  description: string;
}

interface Interaction {
  id: string;
  agentName: string;
  type: string;
  message: string;
  response: string;
  timestamp: string;
  responseTime: number;
  success: boolean;
}

export default function AgentDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Fetch agent data
  const { data: agentData, isLoading: agentsLoading, error: agentsError, refetch } = useQuery({
    queryKey: ['/api/intelligence/agents/status'],
    queryFn: () => fetch('/api/intelligence/agents/status').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/intelligence/models/available'],
    queryFn: () => fetch('/api/intelligence/models/available').then(res => res.json()),
  });

  const { data: interactionsData, isLoading: interactionsLoading } = useQuery({
    queryKey: ['/api/intelligence/agents/interactions'],
    queryFn: () => fetch('/api/intelligence/agents/interactions').then(res => res.json()),
    refetchInterval: 60000, // Refresh every minute
  });

  const agents = agentData?.agents || [];
  const models = modelsData?.data?.availableModels || [];
  const interactions = interactionsData?.interactions || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'busy': return 'Busy';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (agentsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading agent dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your AI agents</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {agentsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load agent data. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agents.filter((a: AgentStatus) => a.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {agents.length} total agents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agents.reduce((sum: number, agent: AgentStatus) => sum + agent.tasksCompleted, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                across all agents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agents.length > 0 
                  ? Math.round(agents.reduce((sum: number, agent: AgentStatus) => sum + agent.averageResponseTime, 0) / agents.length)
                  : 0}ms
              </div>
              <p className="text-xs text-muted-foreground">
                system average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Models</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.length}</div>
              <p className="text-xs text-muted-foreground">
                AI models ready
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-6">
            {/* Agent Grid */}
            {agents.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {agents.map((agent: AgentStatus, index: number) => (
                  <Card key={index} className={`cursor-pointer transition-all hover:shadow-lg ${selectedAgent === agent.name ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                          <Badge variant={agent.status === 'active' ? 'default' : agent.status === 'busy' ? 'secondary' : 'outline'}>
                            {getStatusText(agent.status)}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        {agent.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Tasks:</span> {agent.tasksCompleted}
                        </div>
                        <div>
                          <span className="font-medium">Avg Time:</span> {agent.averageResponseTime}ms
                        </div>
                        <div>
                          <span className="font-medium">Uptime:</span> {formatUptime(agent.uptime)}
                        </div>
                        <div>
                          <span className="font-medium">Last Activity:</span> {agent.lastActivity}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Specialties:</span>
                        <div className="flex flex-wrap gap-1">
                          {agent.specialties.map((specialty, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Agents Available</h3>
                  <p className="text-muted-foreground mb-4">
                    No AI agents are currently running or configured.
                  </p>
                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Agents
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            {modelsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 border-b-2 border-primary mr-2"></div>
                <span>Loading models...</span>
              </div>
            ) : models.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((model: any, index: number) => (
                  <Card key={index} className="cursor-pointer transition-all hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant={model.status === 'available' ? 'default' : 'secondary'}>
                          {model.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Parameters:</span>
                        <span>{model.parameters || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Models Available</h3>
                  <p className="text-muted-foreground mb-4">
                    No AI models are currently available or configured.
                  </p>
                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Models
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="space-y-6">
            {interactionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 border-b-2 border-primary mr-2"></div>
                <span>Loading interactions...</span>
              </div>
            ) : interactions.length > 0 ? (
              <div className="space-y-4">
                {interactions.map((interaction: Interaction) => (
                  <Card key={interaction.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{interaction.agentName}</Badge>
                          <Badge variant="secondary">{interaction.type}</Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatTimestamp(interaction.timestamp)}</span>
                          {interaction.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">Request:</span>
                        <p className="text-sm text-muted-foreground mt-1">{interaction.message}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Response:</span>
                        <p className="text-sm text-muted-foreground mt-1">{interaction.response}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Response Time: {interaction.responseTime}ms</span>
                        <span>Status: {interaction.success ? 'Success' : 'Failed'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Interactions Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    No agent interactions have been recorded yet. Start using your AI agents to see their activity here.
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 