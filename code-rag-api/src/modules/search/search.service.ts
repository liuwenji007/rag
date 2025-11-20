import { Injectable, Logger } from '@nestjs/common';
import { MilvusService } from '../../services/vector/milvus.service';
import { EmbeddingService } from '../../services/embedding/embedding.service';
import { PrismaService } from '../../database/prisma.service';
import { SourceLinkService, type SourceLink, type SourceMetadata } from '../../services/source-link/source-link.service';
import { UserRole, getRoleWeight } from './types/role.types';

export interface SearchResult {
  id: string;
  score: number; // 加权后的分数
  documentId: string;
  datasourceId: string;
  chunkIndex: number;
  content: string;
  highlightedContent?: string; // 高亮后的内容
  contentType: string;
  metadata: Record<string, unknown>;
  originalScore?: number; // 原始相似度分数（应用权重前）
  roleWeight?: number; // 应用的角色权重
  confidence?: number; // 置信度 (0-1)
  isSuspected?: boolean; // 是否为疑似结果
  sourceLink?: SourceLink | null; // 来源链接
  sourceMetadata?: SourceMetadata; // 来源元信息
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
    config?: unknown;
  };
}

export interface SearchResponse {
  query: string;
  role: string | null;
  total: number;
  suspected: boolean;
  results: SearchResult[];
  suggestion?: string;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  datasourceIds?: string[];
  contentTypes?: string[];
  role?: UserRole;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly confidenceThreshold: number;

  constructor(
    private readonly milvusService: MilvusService,
    private readonly embeddingService: EmbeddingService,
    private readonly prisma: PrismaService,
    private readonly sourceLinkService: SourceLinkService,
  ) {
    // 从环境变量读取置信度阈值，默认 0.7
    this.confidenceThreshold =
      parseFloat(process.env.SEARCH_CONFIDENCE_THRESHOLD || '0.7') || 0.7;
  }

  /**
   * 执行向量检索
   */
  async search(
    query: string,
    options: SearchOptions = {},
    userId?: string,
  ): Promise<SearchResponse> {
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
      const enrichedResults = await this.enrichResults(filteredResults, query);

      // 应用角色权重并重新排序
      const weightedResults = this.applyRoleWeights(
        enrichedResults,
        options.role,
      );

      // 计算置信度并标记疑似结果
      const resultsWithConfidence = this.calculateConfidence(weightedResults);

      // 处理疑似结果（限制数量）
      const processedResults = this.processSuspectedResults(
        resultsWithConfidence,
      );

      // 检查是否有疑似结果
      const hasSuspected = processedResults.some((r) => r.isSuspected);

      const response = {
        query,
        role: options.role || null,
        total: processedResults.length,
        suspected: hasSuspected,
        results: processedResults,
        suggestion: hasSuspected
          ? '检索结果置信度较低，建议确认或补充更多信息以获得更准确的结果。'
          : undefined,
      };

      // 记录检索历史
      if (userId) {
        await this.recordSearchHistory(
          userId,
          query,
          options.role,
          processedResults.length,
        ).catch((error) => {
          // 记录历史失败不影响检索结果
          this.logger.warn(
            `Failed to record search history: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        });
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 记录检索历史
   */
  private async recordSearchHistory(
    userId: string,
    query: string,
    role: UserRole | undefined,
    resultsCount: number,
  ): Promise<void> {
    await this.prisma.searchHistory.create({
      data: {
        userId,
        query,
        role: role || null,
        resultsCount,
        adoptionStatus: null,
      },
    });
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
    query?: string,
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
          metadata: true,
        },
      }),
      this.prisma.dataSource.findMany({
        where: { id: { in: datasourceIds } },
        select: {
          id: true,
          name: true,
          type: true,
          config: true,
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

      const document = documentMap.get(result.documentId);
      const datasource = datasourceMap.get(result.datasourceId);

      // 生成来源链接
      const sourceLink = datasource && document
        ? this.sourceLinkService.generateSourceLink(
            datasource.type,
            {
              ...result.metadata,
              ...(document.metadata as Record<string, unknown>),
            },
            datasource.config as Record<string, unknown> | undefined,
          )
        : null;

      // 提取来源元信息
      const sourceMetadata = document && datasource
        ? this.sourceLinkService.extractSourceMetadata(
            document,
            datasource.type,
          )
        : undefined;

      // 高亮文本
      const highlightedContent = query
        ? this.highlightText(result.content, query)
        : undefined;

      return {
        ...result,
        score: similarity, // 使用相似度分数（0-1，1 表示最相似）
        highlightedContent,
        sourceLink,
        sourceMetadata,
        document: document
          ? {
              id: document.id,
              title: document.title,
              externalId: document.externalId,
              syncedAt: document.syncedAt,
            }
          : undefined,
        datasource: datasource
          ? {
              id: datasource.id,
              name: datasource.name,
              type: datasource.type,
              config: datasource.config,
            }
          : undefined,
      };
    });
  }

  /**
   * 高亮文本中的关键词
   */
  private highlightText(content: string, query: string): string {
    // 简单的高亮实现：提取查询中的关键词并标记
    // 这里使用简单的正则匹配，实际可以使用更复杂的分词和匹配算法

    // 提取查询中的关键词（去除常见停用词）
    const stopWords = new Set([
      '的',
      '了',
      '在',
      '是',
      '我',
      '有',
      '和',
      '就',
      '不',
      '人',
      '都',
      '一',
      '一个',
      '上',
      '也',
      '很',
      '到',
      '说',
      '要',
      '去',
      '你',
      '会',
      '着',
      '没有',
      '看',
      '好',
      '自己',
      '这',
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);

    // 提取关键词（长度 >= 2 的词语）
    const keywords = query
      .split(/\s+/)
      .filter((word) => word.length >= 2 && !stopWords.has(word.toLowerCase()));

    if (keywords.length === 0) {
      return content;
    }

    // 构建正则表达式（不区分大小写）
    const pattern = new RegExp(
      `(${keywords.map((k) => this.escapeRegex(k)).join('|')})`,
      'gi',
    );

    // 替换匹配的文本为高亮标记
    return content.replace(pattern, '<mark>$1</mark>');
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 应用角色权重并重新排序
   */
  private applyRoleWeights(
    results: SearchResult[],
    role?: UserRole,
  ): SearchResult[] {
    if (!role) {
      // 没有指定角色，返回原始结果
      return results;
    }

    // 计算加权分数并重新排序
    const weightedResults = results.map((result) => {
      const weight = getRoleWeight(role, result.contentType);
      const weightedScore = result.score * weight;

      return {
        ...result,
        score: weightedScore,
        originalScore: result.score, // 保留原始分数
        roleWeight: weight, // 记录应用的权重
      };
    });

    // 按加权分数降序排序
    weightedResults.sort((a, b) => b.score - a.score);

    return weightedResults;
  }

  /**
   * 计算检索结果的置信度
   */
  private calculateConfidence(
    results: SearchResult[],
  ): SearchResult[] {
    if (results.length === 0) {
      return results;
    }

    // 获取最高相似度分数（top 1 结果的分数）
    const topScore = results[0]?.score || 0;

    // 1. 相似度分数因子 (weight: 0.6)
    const similarityFactor = Math.min(topScore, 1.0); // 确保在 0-1 范围

    // 2. 结果数量因子 (weight: 0.2)
    let resultCountFactor: number;
    if (results.length >= 3) {
      resultCountFactor = 1.0;
    } else if (results.length === 2) {
      resultCountFactor = 0.8;
    } else if (results.length === 1) {
      resultCountFactor = 0.6;
    } else {
      resultCountFactor = 0.0;
    }

    // 3. 内容质量因子 (weight: 0.2)
    // 计算所有结果的平均内容质量
    const contentQualityScores = results.map((result) => {
      const contentLength = result.content?.length || 0;
      // 内容长度因子：如果 >= 100 字符，得分为 1.0，否则按比例计算
      const lengthFactor = Math.min(contentLength / 100, 1.0);

      // 简单的内容完整性检查：检查是否有明显截断（以常见截断标记结尾）
      const hasTruncation =
        result.content.endsWith('...') ||
        result.content.endsWith('…') ||
        result.content.length < 50;

      const completenessFactor = hasTruncation ? 0.7 : 1.0;

      return (lengthFactor + completenessFactor) / 2;
    });

    const avgContentQuality =
      contentQualityScores.reduce((sum, score) => sum + score, 0) /
      contentQualityScores.length;

    // 计算总体置信度
    const overallConfidence =
      similarityFactor * 0.6 +
      resultCountFactor * 0.2 +
      avgContentQuality * 0.2;

    // 为每个结果计算置信度（基于总体置信度和该结果的相对分数）
    return results.map((result, index) => {
      // 相对分数：该结果相对于最高分数的比例
      const relativeScore = results.length > 0 ? result.score / topScore : 0;

      // 单个结果的置信度：总体置信度 × 相对分数
      // 但至少保证 top 1 结果的置信度接近总体置信度
      const confidence =
        index === 0
          ? overallConfidence
          : overallConfidence * relativeScore * 0.9; // 非 top 1 结果稍微降低

      // 标记疑似结果
      const isSuspected = confidence < this.confidenceThreshold;

      return {
        ...result,
        confidence: Math.max(0, Math.min(1, confidence)), // 确保在 0-1 范围
        isSuspected,
      };
    });
  }

  /**
   * 处理疑似结果（限制数量）
   */
  private processSuspectedResults(
    results: SearchResult[],
  ): SearchResult[] {
    const normalResults = results.filter((r) => !r.isSuspected);
    const suspectedResults = results.filter((r) => r.isSuspected);

    // 限制疑似结果最多返回 3 条
    const limitedSuspectedResults = suspectedResults.slice(0, 3);

    // 合并结果：正常结果在前，疑似结果在后
    return [...normalResults, ...limitedSuspectedResults];
  }
}

