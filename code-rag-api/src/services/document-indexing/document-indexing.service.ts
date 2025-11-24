import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { DocumentParserService } from '../document-parser/document-parser.service';
import { DocumentChunkingService } from './document-chunking.service';
import { MilvusService, type VectorDocument } from '../vector/milvus.service';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class DocumentIndexingService {
  private readonly logger = new Logger(DocumentIndexingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
    private readonly documentParser: DocumentParserService,
    private readonly chunkingService: DocumentChunkingService,
    private readonly milvusService: MilvusService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * 索引文档（解析、分块、向量化、存储）
   */
  async indexDocument(documentId: string): Promise<void> {
    this.logger.log(`Starting indexing for document ${documentId}`);

    try {
      // 1. 获取文档记录
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      if (!document.filePath) {
        this.logger.warn(`Document ${documentId} has no file path, skipping indexing`);
        return;
      }

      // 2. 解析文档内容（如果还未解析）
      let content = document.content;
      let parsedMetadata = document.metadata as Record<string, unknown>;

      if (!content || content.trim().length === 0) {
        this.logger.log(`Parsing document ${documentId} content`);
        const fullPath = this.fileStorage.getFullPath(document.filePath);
        const parsed = await this.documentParser.parseDocument(
          fullPath,
          document.mimeType || '',
        );
        content = parsed.content;
        parsedMetadata = { ...parsedMetadata, ...parsed.metadata };

        // 更新文档内容
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            content,
            metadata: parsedMetadata as Prisma.InputJsonValue,
          },
        });
      }

      // 3. 文档分块
      const chunks = await this.chunkingService.chunkDocument(
        content,
        documentId,
        {
          documentType: document.documentType || undefined,
          title: document.title,
          contentType: document.contentType,
        },
      );

      if (chunks.length === 0) {
        this.logger.warn(`Document ${documentId} has no chunks to index`);
        return;
      }

      // 4. 向量化并存储到 Milvus（仅对非图片文档）
      if (document.contentType !== 'image') {
        await this.storeChunksToVectorDB(chunks, documentId);
      } else {
        this.logger.log(
          `Document ${documentId} is an image, skipping vector indexing`,
        );
      }

      // 5. 更新文档状态（标记为已索引）
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...parsedMetadata,
            indexed: true,
            indexedAt: new Date().toISOString(),
            chunksCount: chunks.length,
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Document ${documentId} indexed successfully with ${chunks.length} chunks`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to index document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 将文档块存储到向量数据库
   */
  private async storeChunksToVectorDB(
    chunks: Array<{ content: string; metadata: Record<string, unknown> }>,
    documentId: string,
  ): Promise<void> {
    // 1. 删除旧的文档块（如果存在）
    await this.milvusService.deleteByDocumentId(documentId);

    // 2. 批量向量化
    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await this.embeddingService.embedDocuments(texts);

    // 3. 获取文档信息
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // 4. 构建向量文档（需要符合 MilvusService 的 VectorDocument 接口）
    const vectorDocuments: VectorDocument[] = chunks.map((chunk, index) => ({
      id: `${documentId}_chunk_${index}`,
      documentId,
      datasourceId: document.datasourceId || '', // 手动上传的文档可能没有 datasourceId
      chunkIndex: index,
      content: chunk.content,
      contentType: document.contentType,
      embedding: embeddings[index],
      metadata: {
        ...chunk.metadata,
        totalChunks: chunks.length,
      },
    }));

    // 5. 插入到 Milvus
    await this.milvusService.insertDocuments(vectorDocuments);

    this.logger.log(
      `Stored ${vectorDocuments.length} chunks to vector database for document ${documentId}`,
    );
  }

  /**
   * 删除文档索引
   */
  async deleteDocumentIndex(documentId: string): Promise<void> {
    try {
      await this.milvusService.deleteByDocumentId(documentId);
      this.logger.log(`Deleted index for document ${documentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete index for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}

