import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { AgentManager } from './agent-manager';

export interface AgentConfig {
  name: string;
  description: string;
  interval?: number; // ms
  maxRetries?: number;
  timeout?: number; // ms
  specialties?: string[]; // Agent specialties for dashboard
}

export interface AgentTask {
  id: string;
  type: string;
  data: any;
  priority: number;
  createdAt: Date;
  retries: number;
}

export abstract class BaseAgent extends EventEmitter {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  protected config: AgentConfig;
  protected isRunning: boolean = false;
  protected intervalId?: NodeJS.Timeout;
  protected taskQueue: AgentTask[] = [];
  protected isProcessingTasks: boolean = false;
  protected agentManager?: AgentManager;
  
  // Enhanced metrics tracking
  protected tasksCompleted: number = 0;
  protected responseTimes: number[] = [];
  protected lastActivity: Date = new Date();
  protected startTime: Date = new Date();
  
  constructor(config: AgentConfig) {
    super();
    this.id = uuidv4();
    this.name = config.name;
    this.description = config.description;
    this.config = {
      interval: 5000, // Default 5 seconds
      maxRetries: 3,
      timeout: 60000, // Default 60 seconds
      specialties: ['General AI'], // Default specialties
      ...config
    };
    
    this.log(`Agent ${this.name} initialized`);
  }

  // Abstract methods that must be implemented by child agents
  abstract initialize(): Promise<void>;
  abstract processTask(task: AgentTask): Promise<any>;
  abstract cleanup(): Promise<void>;

  public setAgentManager(manager: AgentManager) {
    this.agentManager = manager;
  }

  // Agent lifecycle methods
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Agent is already running');
      return;
    }

    try {
      await this.initialize();
      this.isRunning = true;
      this.startTime = new Date();
      this.lastActivity = new Date();
      
      // Start periodic task processing
      this.intervalId = setInterval(() => {
        this.processTasks();
      }, this.config.interval);
      
      this.log(`Agent ${this.name} started successfully`);
      this.emit('started');
    } catch (error) {
      this.error(`Failed to start agent: ${error}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('Agent is not running');
      return;
    }

    try {
      this.isRunning = false;
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
      
      // Wait for current tasks to complete
      await this.waitForTasksToComplete();
      
      await this.cleanup();
      
      this.log(`Agent ${this.name} stopped successfully`);
      this.emit('stopped');
    } catch (error) {
      this.error(`Failed to stop agent: ${error}`);
      throw error;
    }
  }

  // Task management
  addTask(type: string, data: any, priority: number = 1): string {
    const task: AgentTask = {
      id: uuidv4(),
      type,
      data,
      priority,
      createdAt: new Date(),
      retries: 0
    };
    
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    this.log(`Task ${task.id} added to queue (type: ${type}, priority: ${priority})`);
    return task.id;
  }

  private async processTasks(): Promise<void> {
    if (this.isProcessingTasks || this.taskQueue.length === 0) {
      return;
    }
    
    this.isProcessingTasks = true;
    
    try {
      while (this.taskQueue.length > 0 && this.isRunning) {
        const task = this.taskQueue.shift()!;
        await this.executeTask(task);
      }
    } catch (error) {
      this.error(`Error processing tasks: ${error}`);
    } finally {
      this.isProcessingTasks = false;
    }
  }

  private async executeTask(task: AgentTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.log(`Processing task ${task.id} (type: ${task.type})`);
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), this.config.timeout)
      );
      
      const result = await Promise.race([
        this.processTask(task),
        timeoutPromise
      ]);
      
      // Track successful task completion
      const responseTime = Date.now() - startTime;
      this.tasksCompleted++;
      this.responseTimes.push(responseTime);
      this.lastActivity = new Date();
      
      // Keep only last 100 response times for average calculation
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-100);
      }
      
      this.log(`Task ${task.id} completed successfully in ${responseTime}ms`);
      this.emit('taskCompleted', { task, result });
      
    } catch (error) {
      task.retries++;
      this.error(`Task ${task.id} failed (attempt ${task.retries}): ${error}`);
      
      if (task.retries < this.config.maxRetries!) {
        // Re-add task to queue for retry
        this.taskQueue.unshift(task);
        this.log(`Task ${task.id} re-queued for retry`);
      } else {
        this.error(`Task ${task.id} failed permanently after ${task.retries} attempts`);
        this.emit('taskFailed', task, error);
      }
    }
  }

  private async waitForTasksToComplete(): Promise<void> {
    while (this.isProcessingTasks) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Status and health checks
  getStatus() {
    const averageResponseTime = this.responseTimes.length > 0 
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;
    
    const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();
    let lastActivityText = 'Never';
    
    if (timeSinceLastActivity < 60000) {
      lastActivityText = `${Math.floor(timeSinceLastActivity / 1000)}s ago`;
    } else if (timeSinceLastActivity < 3600000) {
      lastActivityText = `${Math.floor(timeSinceLastActivity / 60000)}m ago`;
    } else {
      lastActivityText = `${Math.floor(timeSinceLastActivity / 3600000)}h ago`;
    }
    
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isRunning: this.isRunning,
      queueSize: this.taskQueue.length,
      isProcessingTasks: this.isProcessingTasks,
      uptime: this.isRunning ? Date.now() - this.startTime.getTime() : 0,
      tasksCompleted: this.tasksCompleted,
      averageResponseTime: averageResponseTime,
      specialties: this.config.specialties || ['General AI'],
      lastActivity: lastActivityText
    };
  }

  // Logging methods
  protected log(message: string): void {
    console.log(`[${new Date().toISOString()}] [${this.name}] ${message}`);
    this.emit('log', { level: 'info', message, timestamp: new Date() });
  }

  protected error(message: string): void {
    console.error(`[${new Date().toISOString()}] [${this.name}] ERROR: ${message}`);
    this.emit('log', { level: 'error', message, timestamp: new Date() });
  }

  protected warn(message: string): void {
    console.warn(`[${new Date().toISOString()}] [${this.name}] WARN: ${message}`);
    this.emit('log', { level: 'warn', message, timestamp: new Date() });
  }
} 