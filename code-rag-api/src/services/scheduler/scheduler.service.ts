import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { SyncService } from '../../modules/sync/sync.service';
import { PrismaService } from '../../database/prisma.service';

export interface SyncJobData {
  datasourceId: string;
  triggerType: 'manual' | 'scheduled';
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly cronJobs = new Map<string, cron.ScheduledTask>();
  private syncQueue: Queue<SyncJobData>;
  private syncWorker: Worker<SyncJobData>;
  private queueEvents: QueueEvents;
  private redis: Redis;

  constructor(
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService,
  ) {
    // 初始化 Redis 连接
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    // 创建同步队列
    this.syncQueue = new Queue<SyncJobData>('sync-queue', {
      connection: this.redis,
    });

    // 创建队列事件监听器
    this.queueEvents = new QueueEvents('sync-queue', {
      connection: this.redis,
    });

    // 创建队列处理器
    this.syncWorker = new Worker<SyncJobData>(
      'sync-queue',
      async (job) => {
        const { datasourceId, triggerType } = job.data;
        this.logger.log(
          `Processing sync job for datasource ${datasourceId} (trigger: ${triggerType})`,
        );

        try {
          // 根据数据源类型调用对应的同步方法
          const dataSource = await this.prisma.dataSource.findUnique({
            where: { id: datasourceId },
          });

          if (!dataSource) {
            throw new Error(`DataSource with ID ${datasourceId} not found`);
          }

          let result;
          if (dataSource.type === 'FEISHU') {
            result = await this.syncService.syncFeishuDataSource(
              datasourceId,
              triggerType,
            );
          } else if (dataSource.type === 'GITLAB') {
            result = await this.syncService.syncGitLabDataSource(
              datasourceId,
              triggerType,
            );
          } else if (dataSource.type === 'DATABASE') {
            result = await this.syncService.syncDatabaseDataSource(
              datasourceId,
              triggerType,
            );
          } else {
            throw new Error(`Unsupported data source type: ${dataSource.type}`);
          }

          this.logger.log(
            `Sync job completed for datasource ${datasourceId}: ${result.message}`,
          );
          return result;
        } catch (error) {
          this.logger.error(
            `Sync job failed for datasource ${datasourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: 3, // 最多同时处理 3 个同步任务
      },
    );

    // 监听队列事件
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.logger.log(`Job ${jobId} completed: ${JSON.stringify(returnvalue)}`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Job ${jobId} failed: ${failedReason}`);
    });
  }

  async onModuleInit() {
    this.logger.log('SchedulerService initialized');
    // 启动时加载所有启用的数据源的定时任务
    await this.loadAllScheduledTasks();
  }

  async onModuleDestroy() {
    // 停止所有定时任务
    for (const [datasourceId, task] of this.cronJobs.entries()) {
      task.stop();
      this.logger.log(`Stopped scheduled task for datasource ${datasourceId}`);
    }
    this.cronJobs.clear();

    // 关闭队列和 Worker
    await this.syncWorker.close();
    await this.queueEvents.close();
    await this.syncQueue.close();
    await this.redis.quit();

    this.logger.log('SchedulerService destroyed');
  }

  /**
   * 验证 cron 表达式
   */
  validateCronExpression(cronExpression: string): boolean {
    return cron.validate(cronExpression);
  }

  /**
   * 注册定时任务
   */
  registerScheduledTask(datasourceId: string, cronExpression: string): void {
    // 如果已存在，先停止
    if (this.cronJobs.has(datasourceId)) {
      this.stopScheduledTask(datasourceId);
    }

    // 验证 cron 表达式
    if (!this.validateCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // 创建定时任务
    const task = cron.schedule(cronExpression, async () => {
      this.logger.log(
        `Scheduled sync triggered for datasource ${datasourceId}`,
      );
      await this.triggerSync(datasourceId, 'scheduled');
    });

    this.cronJobs.set(datasourceId, task);
    this.logger.log(
      `Registered scheduled task for datasource ${datasourceId} with cron: ${cronExpression}`,
    );
  }

  /**
   * 停止定时任务
   */
  stopScheduledTask(datasourceId: string): void {
    const task = this.cronJobs.get(datasourceId);
    if (task) {
      task.stop();
      this.cronJobs.delete(datasourceId);
      this.logger.log(`Stopped scheduled task for datasource ${datasourceId}`);
    }
  }

  /**
   * 更新定时任务
   */
  updateScheduledTask(
    datasourceId: string,
    cronExpression: string | null,
  ): void {
    if (cronExpression) {
      this.registerScheduledTask(datasourceId, cronExpression);
    } else {
      this.stopScheduledTask(datasourceId);
    }
  }

  /**
   * 触发同步任务（添加到队列）
   */
  async triggerSync(
    datasourceId: string,
    triggerType: 'manual' | 'scheduled' = 'manual',
  ): Promise<void> {
    await this.syncQueue.add(
      'sync-datasource',
      {
        datasourceId,
        triggerType,
      },
      {
        attempts: 3, // 最多重试 3 次
        backoff: {
          type: 'exponential',
          delay: 5000, // 初始延迟 5 秒
        },
      },
    );
    this.logger.log(
      `Added sync job to queue for datasource ${datasourceId} (trigger: ${triggerType})`,
    );
  }

  /**
   * 加载所有启用的数据源的定时任务
   */
  private async loadAllScheduledTasks(): Promise<void> {
    const dataSources = await this.prisma.dataSource.findMany({
      where: {
        enabled: true,
        syncSchedule: {
          not: null,
        },
      },
    });

    for (const dataSource of dataSources) {
      if (dataSource.syncSchedule) {
        try {
          this.registerScheduledTask(dataSource.id, dataSource.syncSchedule);
        } catch (error) {
          this.logger.error(
            `Failed to register scheduled task for datasource ${dataSource.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    this.logger.log(`Loaded ${this.cronJobs.size} scheduled tasks`);
  }
}

