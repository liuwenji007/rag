import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { DocumentIndexingService } from './document-indexing.service';

export interface DocumentIndexingJobData {
  documentId: string;
}

@Injectable()
export class DocumentIndexingTaskService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DocumentIndexingTaskService.name);
  private documentIndexingQueue: Queue<DocumentIndexingJobData>;
  private documentIndexingWorker: Worker<DocumentIndexingJobData>;
  private queueEvents: QueueEvents;
  private redis: Redis;

  constructor(
    private readonly documentIndexingService: DocumentIndexingService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.documentIndexingQueue = new Queue<DocumentIndexingJobData>(
      'document-indexing-queue',
      {
        connection: this.redis,
      },
    );

    this.queueEvents = new QueueEvents('document-indexing-queue', {
      connection: this.redis,
    });

    this.documentIndexingWorker = new Worker<DocumentIndexingJobData>(
      'document-indexing-queue',
      async (job) => this.processDocumentIndexingJob(job),
      {
        connection: this.redis,
        concurrency: 3, // 最多同时处理 3 个文档索引任务
      },
    );

    this.queueEvents.on('completed', ({ jobId }) => {
      this.logger.log(`Document indexing job ${jobId} completed.`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(
        `Document indexing job ${jobId} failed: ${failedReason}`,
      );
    });
  }

  async onModuleInit() {
    this.logger.log('Document indexing task service initialized');
  }

  async onModuleDestroy() {
    await this.documentIndexingQueue.close();
    await this.documentIndexingWorker.close();
    await this.queueEvents.close();
    await this.redis.quit();
    this.logger.log('Disconnected from Redis and BullMQ');
  }

  /**
   * 创建文档索引任务并加入队列
   */
  async createDocumentIndexingTask(documentId: string): Promise<void> {
    await this.documentIndexingQueue.add(
      'index-document',
      { documentId },
      { jobId: documentId }, // 使用 documentId 作为 job ID，避免重复任务
    );

    this.logger.log(
      `Document indexing task created for document ${documentId}`,
    );
  }

  /**
   * 处理文档索引任务
   */
  private async processDocumentIndexingJob(
    job: { data: DocumentIndexingJobData },
  ) {
    const { documentId } = job.data;
    this.logger.log(`Starting document indexing for document ${documentId}`);

    try {
      await this.documentIndexingService.indexDocument(documentId);
      this.logger.log(
        `Document indexing completed for document ${documentId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Document indexing failed for document ${documentId}: ${errorMessage}`,
      );
      throw error; // 重新抛出错误，让 BullMQ 标记任务为失败
    }
  }
}

