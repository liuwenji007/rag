import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { DiffService } from './diff.service';
import type { DiffAnalysisResult, DiffAnalysisTask } from './interfaces/diff-analysis.interface';

export interface DiffAnalysisJobData {
  taskId: string;
  requirement: string;
  options?: {
    role?: string;
    includeCodeMatches?: boolean;
    includePRDFragments?: boolean;
    includeSummary?: boolean;
    includeTodos?: boolean;
    codeMatchTopK?: number;
    prdTopK?: number;
  };
}

@Injectable()
export class DiffTaskService implements OnModuleInit {
  private readonly logger = new Logger(DiffTaskService.name);
  private diffAnalysisQueue: Queue<DiffAnalysisJobData>;
  private diffAnalysisWorker: Worker<DiffAnalysisJobData>;
  private queueEvents: QueueEvents;
  private redis: Redis;
  private tasks = new Map<string, DiffAnalysisTask>();

  constructor(private readonly diffService: DiffService) {
    // 初始化 Redis 连接
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    // 创建差异分析队列
    this.diffAnalysisQueue = new Queue<DiffAnalysisJobData>('diff-analysis-queue', {
      connection: this.redis,
    });

    // 创建队列事件监听器
    this.queueEvents = new QueueEvents('diff-analysis-queue', {
      connection: this.redis,
    });

    // 创建队列处理器
    this.diffAnalysisWorker = new Worker<DiffAnalysisJobData>(
      'diff-analysis-queue',
      async (job) => {
        const { taskId, requirement, options } = job.data;

        // 更新任务状态为处理中
        this.updateTaskStatus(taskId, 'processing');

        try {
          // 执行差异分析
          const result = await this.diffService.analyzeDiff(requirement, options);

          // 更新任务状态为已完成
          this.updateTaskStatus(taskId, 'completed', result);

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Diff analysis task ${taskId} failed: ${errorMessage}`);

          // 更新任务状态为失败
          this.updateTaskStatus(taskId, 'failed', undefined, errorMessage);

          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: 2, // 最多同时处理 2 个任务
      },
    );

    // 监听任务完成事件
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.logger.log(`Diff analysis task ${jobId} completed`);
    });

    // 监听任务失败事件
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Diff analysis task ${jobId} failed: ${failedReason}`);
    });
  }

  async onModuleInit() {
    // 模块初始化时已创建队列和处理器
  }

  /**
   * 创建异步差异分析任务
   */
  async createTask(
    requirement: string,
    options?: DiffAnalysisJobData['options'],
  ): Promise<string> {
    const taskId = `diff-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 创建任务记录
    const task: DiffAnalysisTask = {
      taskId,
      status: 'pending',
      createdAt: new Date(),
    };
    this.tasks.set(taskId, task);

    // 添加到队列
    await this.diffAnalysisQueue.add(
      'diff-analysis',
      {
        taskId,
        requirement,
        options,
      },
      {
        jobId: taskId,
        attempts: 1, // 只尝试一次
      },
    );

    return taskId;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): DiffAnalysisTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 更新任务状态
   */
  private updateTaskStatus(
    taskId: string,
    status: DiffAnalysisTask['status'],
    result?: DiffAnalysisResult,
    error?: string,
  ): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      if (result) {
        task.result = result;
      }
      if (error) {
        task.error = error;
      }
      if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date();
      }
      this.tasks.set(taskId, task);
    }
  }

  /**
   * 清理已完成的任务（可选，用于内存管理）
   */
  cleanupCompletedTasks(olderThanHours = 24): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt &&
        task.completedAt < cutoffTime
      ) {
        this.tasks.delete(taskId);
      }
    }
  }
}

