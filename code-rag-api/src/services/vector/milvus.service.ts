import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

export interface VectorDocument {
  id: string;
  documentId: string;
  datasourceId: string;
  chunkIndex: number;
  content: string;
  contentType: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

@Injectable()
export class MilvusService implements OnModuleInit {
  private readonly logger = new Logger(MilvusService.name);
  private client!: MilvusClient; // 在 onModuleInit 中初始化
  private readonly collectionName = 'documents';
  private readonly embeddingDimension = 1536; // OpenAI text-embedding-3-small 的维度

  async onModuleInit() {
    const milvusAddress = process.env.MILVUS_ADDRESS || 'localhost:19530';
    const milvusToken = process.env.MILVUS_TOKEN || '';

    this.client = new MilvusClient({
      address: milvusAddress,
      token: milvusToken || undefined,
    });

    // 确保集合存在
    await this.ensureCollection();
  }

  /**
   * 确保集合存在，如果不存在则创建
   */
  private async ensureCollection(): Promise<void> {
    try {
      const hasCollection = await this.client.hasCollection({
        collection_name: this.collectionName,
      });

      if (!hasCollection.value) {
        this.logger.log(`Creating collection: ${this.collectionName}`);
        await this.client.createCollection({
          collection_name: this.collectionName,
          description: 'Document and code chunks for semantic search',
          fields: [
            {
              name: 'id',
              data_type: DataType.VarChar,
              max_length: 255,
              is_primary_key: true,
            },
            {
              name: 'documentId',
              data_type: DataType.VarChar,
              max_length: 255,
            },
            {
              name: 'datasourceId',
              data_type: DataType.VarChar,
              max_length: 255,
            },
            {
              name: 'chunkIndex',
              data_type: DataType.Int64,
            },
            {
              name: 'content',
              data_type: DataType.VarChar,
              max_length: 65535, // 最大长度
            },
            {
              name: 'contentType',
              data_type: DataType.VarChar,
              max_length: 50,
            },
            {
              name: 'embedding',
              data_type: DataType.FloatVector,
              dim: this.embeddingDimension,
            },
            {
              name: 'metadata',
              data_type: DataType.JSON,
            },
          ],
        });

        // 创建索引
        await this.client.createIndex({
          collection_name: this.collectionName,
          field_name: 'embedding',
          index_type: 'HNSW',
          metric_type: 'L2',
          params: {
            M: 16,
            efConstruction: 200,
          },
        });

        // 加载集合
        await this.client.loadCollection({
          collection_name: this.collectionName,
        });

        this.logger.log(`Collection ${this.collectionName} created and loaded`);
      } else {
        this.logger.log(`Collection ${this.collectionName} already exists`);
        // 确保集合已加载
        const loaded = await this.client.getLoadState({
          collection_name: this.collectionName,
        });
        if (!loaded.state) {
          await this.client.loadCollection({
            collection_name: this.collectionName,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 插入向量文档
   */
  async insertDocuments(documents: VectorDocument[]): Promise<void> {
    try {
      const data = documents.map((doc) => ({
        id: doc.id,
        documentId: doc.documentId,
        datasourceId: doc.datasourceId,
        chunkIndex: doc.chunkIndex,
        content: doc.content,
        contentType: doc.contentType,
        embedding: doc.embedding,
        metadata: doc.metadata,
      }));

      await this.client.insert({
        collection_name: this.collectionName,
        data,
      });

      this.logger.log(`Inserted ${documents.length} documents into Milvus`);
    } catch (error) {
      this.logger.error(
        `Failed to insert documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 向量相似度搜索
   */
  async search(
    queryVector: number[],
    topK: number = 10,
    filter?: string,
  ): Promise<Array<{
    id: string;
    score: number;
    documentId: string;
    datasourceId: string;
    chunkIndex: number;
    content: string;
    contentType: string;
    metadata: Record<string, unknown>;
  }>> {
    try {
      const searchParams = {
        anns_field: 'embedding',
        topk: topK,
        metric_type: 'L2',
        params: {
          ef: 64,
        },
      };

      const searchOptions: {
        collection_name: string;
        data: number[][];
        search_params: typeof searchParams;
        output_fields: string[];
        expr?: string;
      } = {
        collection_name: this.collectionName,
        data: [queryVector],
        search_params: searchParams,
        output_fields: [
          'id',
          'documentId',
          'datasourceId',
          'chunkIndex',
          'content',
          'contentType',
          'metadata',
        ],
      };

      if (filter) {
        searchOptions.expr = filter;
      }

      const results = await this.client.search(searchOptions);

      if (results.results.length === 0) {
        return [];
      }

      // 转换结果格式
      const searchResults = results.results[0].map((result: {
        id: unknown;
        score: number;
        documentId: unknown;
        datasourceId: unknown;
        chunkIndex: unknown;
        content: unknown;
        contentType: unknown;
        metadata: unknown;
      }) => ({
        id: result.id as string,
        score: result.score,
        documentId: result.documentId as string,
        datasourceId: result.datasourceId as string,
        chunkIndex: result.chunkIndex as number,
        content: result.content as string,
        contentType: result.contentType as string,
        metadata: (result.metadata as Record<string, unknown>) || {},
      }));

      return searchResults;
    } catch (error) {
      this.logger.error(
        `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 删除文档（根据文档 ID）
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    try {
      await this.client.delete({
        collection_name: this.collectionName,
        filter: `documentId == "${documentId}"`,
      });
      this.logger.log(`Deleted documents with documentId: ${documentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 删除文档（根据数据源 ID）
   */
  async deleteByDatasourceId(datasourceId: string): Promise<void> {
    try {
      await this.client.delete({
        collection_name: this.collectionName,
        filter: `datasourceId == "${datasourceId}"`,
      });
      this.logger.log(`Deleted documents with datasourceId: ${datasourceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 获取集合统计信息
   */
  async getCollectionStats(): Promise<{
    totalDocuments: number;
  }> {
    try {
      const stats = await this.client.getCollectionStats({
        collection_name: this.collectionName,
      });
      return {
        totalDocuments: stats.data.row_count || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get collection stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        totalDocuments: 0,
      };
    }
  }
}

