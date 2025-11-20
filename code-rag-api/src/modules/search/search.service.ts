import { Injectable, Logger } from '@nestjs/common';
import { MilvusService } from '../../services/vector/milvus.service';
import { EmbeddingService } from '../../services/embedding/embedding.service';
import { PrismaService } from '../../database/prisma.service';

export interface SearchResult {
  id: string;
  score: number;
  documentId: string;
  datasourceId: string;
  chunkIndex: number;
  content: string;
  contentType: string;
  metadata: Record<string, unknown>;
  document?: {
    id: string;
    title: string;
    externalId: string;
    syncedAt: Date;
  };
  datasource?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  datasourceIds?: string[];
  contentTypes?: string[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly milvusService: MilvusService,
    private readonly embeddingService: EmbeddingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 执行向量检索
   */
  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      const topK = options.topK || 10;
      const minScore = options.minScore;

      // 将查询转换为向量
      const queryVector = await this.embeddingService.embedText(query);

      // 构建过滤表达式
      const filterExpr = this.buildFilterExpression(options);

      // 在 Milvus 中搜索
      const results = await this.milvusService.search(
        queryVector,
        topK,
        filterExpr,
      );

      // 过滤最小相似度分数（L2 距离越小越好，所以需要转换）
      let filteredResults = results;
      if (minScore !== undefined) {
        // 将 L2 距离转换为相似度分数（0-1 范围，1 表示最相似）
        // 这里使用简单的转换：similarity = 1 / (1 + distance)
        filteredResults = results.filter((result) => {
          const similarity = 1 / (1 + result.score);
          return similarity >= minScore;
        });
      }

      // 关联文档和数据源信息
      const enrichedResults = await this.enrichResults(filteredResults);

      return enrichedResults;
    } catch (error) {
      this.logger.error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 构建过滤表达式
   */
  private buildFilterExpression(options: SearchOptions): string | undefined {
    const conditions: string[] = [];

    if (options.datasourceIds && options.datasourceIds.length > 0) {
      const ids = options.datasourceIds.map((id) => `"${id}"`).join(', ');
      conditions.push(`datasourceId in [${ids}]`);
    }

    if (options.contentTypes && options.contentTypes.length > 0) {
      const types = options.contentTypes.map((type) => `"${type}"`).join(', ');
      conditions.push(`contentType in [${types}]`);
    }

    return conditions.length > 0 ? conditions.join(' && ') : undefined;
  }

  /**
   * 丰富搜索结果，关联文档和数据源信息
   */
  private async enrichResults(
    results: Array<{
      id: string;
      score: number;
      documentId: string;
      datasourceId: string;
      chunkIndex: number;
      content: string;
      contentType: string;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<SearchResult[]> {
    // 获取所有唯一的文档 ID 和数据源 ID
    const documentIds = [...new Set(results.map((r) => r.documentId))];
    const datasourceIds = [...new Set(results.map((r) => r.datasourceId))];

    // 批量查询文档和数据源
    const [documents, datasources] = await Promise.all([
      this.prisma.document.findMany({
        where: { id: { in: documentIds } },
        select: {
          id: true,
          title: true,
          externalId: true,
          syncedAt: true,
        },
      }),
      this.prisma.dataSource.findMany({
        where: { id: { in: datasourceIds } },
        select: {
          id: true,
          name: true,
          type: true,
        },
      }),
    ]);

    // 创建映射
    const documentMap = new Map(documents.map((d) => [d.id, d]));
    const datasourceMap = new Map(datasources.map((ds) => [ds.id, ds]));

    // 丰富结果
    return results.map((result) => {
      // 将 L2 距离转换为相似度分数（0-1 范围）
      const similarity = 1 / (1 + result.score);

      return {
        ...result,
        score: similarity, // 使用相似度分数（0-1，1 表示最相似）
        document: documentMap.get(result.documentId),
        datasource: datasourceMap.get(result.datasourceId),
      };
    });
  }
}

