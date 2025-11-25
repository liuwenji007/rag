import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface SearchStatistics {
  // 检索次数统计
  searchCounts: {
    total: number;
    byTime: Array<{ period: string; count: number }>; // 按时间分组
    byRole: Array<{ role: string; count: number }>; // 按角色分组
    byUser: Array<{ userId: string; userName?: string; count: number }>; // 按用户分组
  };

  // 命中率统计
  hitRate: {
    overall: number; // 总体命中率
    byRole: Array<{ role: string; rate: number; total: number; hits: number }>; // 按角色
    trend: Array<{ date: string; rate: number }>; // 趋势
  };

  // 响应时长统计（如果没有记录，返回默认值）
  responseTime: {
    avg: number; // 平均响应时间（毫秒）
    p95: number; // P95 响应时间
    p99: number; // P99 响应时间
    distribution: Array<{ range: string; count: number }>; // 分布
  };

  // 热门查询
  popularQueries: Array<{ query: string; count: number }>;

  // 检索结果分布
  resultDistribution: {
    code: number; // 代码检索比例
    document: number; // 文档检索比例
    design: number; // 设计稿检索比例
    other: number; // 其他
  };
}

@Injectable()
export class SearchStatisticsService {
  private readonly logger = new Logger(SearchStatisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取检索统计
   */
  async getSearchStatistics(
    startDate?: Date,
    endDate?: Date,
    role?: string,
    userId?: string,
  ): Promise<SearchStatistics> {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || now;

    const where: Prisma.SearchHistoryWhereInput = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (role) {
      where.role = role;
    }

    if (userId) {
      where.userId = userId;
    }

    // 并行获取所有统计数据
    const [
      searchCounts,
      hitRate,
      responseTime,
      popularQueries,
      resultDistribution,
    ] = await Promise.all([
      this.getSearchCounts(where, start, end),
      this.getHitRate(where, start, end),
      this.getResponseTime(where),
      this.getPopularQueries(where),
      this.getResultDistribution(where),
    ]);

    return {
      searchCounts,
      hitRate,
      responseTime,
      popularQueries,
      resultDistribution,
    };
  }

  /**
   * 获取检索次数统计
   */
  private async getSearchCounts(
    where: Prisma.SearchHistoryWhereInput,
    startDate: Date,
    endDate: Date,
  ) {
    const total = await this.prisma.searchHistory.count({ where });

    // 按天统计
    const byDayRaw = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::bigint as count
      FROM search_histories
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        ${where.role ? Prisma.sql`AND role = ${where.role}` : Prisma.empty}
        ${where.userId ? Prisma.sql`AND user_id = ${where.userId}` : Prisma.empty}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const byTime = byDayRaw.map((item) => ({
      period: item.date,
      count: Number(item.count),
    }));

    // 按角色统计
    const byRoleRaw = await this.prisma.searchHistory.groupBy({
      by: ['role'],
      where,
      _count: {
        id: true,
      },
    });

    const byRole = byRoleRaw.map((item) => ({
      role: item.role || 'unknown',
      count: item._count.id,
    }));

    // 按用户统计（Top 20）
    const byUserRaw = await this.prisma.searchHistory.groupBy({
      by: ['userId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    });

    const byUser = byUserRaw.map((item) => ({
      userId: item.userId,
      count: item._count.id,
    }));

    return {
      total,
      byTime,
      byRole,
      byUser,
    };
  }

  /**
   * 获取命中率统计
   */
  private async getHitRate(
    where: Prisma.SearchHistoryWhereInput,
    startDate: Date,
    endDate: Date,
  ) {
    const [total, hits] = await Promise.all([
      this.prisma.searchHistory.count({ where }),
      this.prisma.searchHistory.count({
        where: {
          ...where,
          resultsCount: { gt: 0 },
        },
      }),
    ]);

    const overall = total > 0 ? (hits / total) * 100 : 0;

    // 按角色统计命中率
    const byRoleRaw = await this.prisma.searchHistory.groupBy({
      by: ['role'],
      where,
      _count: {
        id: true,
      },
    });

    const byRole = await Promise.all(
      byRoleRaw.map(async (item) => {
        const roleWhere = { ...where, role: item.role };
        const roleHits = await this.prisma.searchHistory.count({
          where: {
            ...roleWhere,
            resultsCount: { gt: 0 },
          },
        });

        return {
          role: item.role || 'unknown',
          rate: item._count.id > 0 ? (roleHits / item._count.id) * 100 : 0,
          total: item._count.id,
          hits: roleHits,
        };
      }),
    );

    // 按天统计命中率趋势
    let trendRaw: Array<{ date: string; total: bigint; hits: bigint }>;
    if (where.role || where.userId) {
      const conditions: string[] = [
        `created_at >= '${startDate.toISOString()}'`,
        `created_at <= '${endDate.toISOString()}'`,
      ];
      if (where.role) {
        conditions.push(`role = '${where.role}'`);
      }
      if (where.userId) {
        conditions.push(`user_id = '${where.userId}'`);
      }
      const sql2 = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::bigint as total,
          COUNT(CASE WHEN results_count > 0 THEN 1 END)::bigint as hits
        FROM search_histories
        WHERE ${conditions.join(' AND ')}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
      trendRaw = await this.prisma.$queryRawUnsafe<
        Array<{ date: string; total: bigint; hits: bigint }>
      >(sql2);
    } else {
      trendRaw = await this.prisma.$queryRaw<
        Array<{ date: string; total: bigint; hits: bigint }>
      >`
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::bigint as total,
          COUNT(CASE WHEN results_count > 0 THEN 1 END)::bigint as hits
        FROM search_histories
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
    }

    const trend = trendRaw.map((item) => ({
      date: item.date,
      rate:
        Number(item.total) > 0
          ? (Number(item.hits) / Number(item.total)) * 100
          : 0,
    }));

    return {
      overall,
      byRole,
      trend,
    };
  }

  /**
   * 获取响应时长统计
   * 注意：如果 SearchHistory 表中没有 responseTime 字段，返回默认值
   */
  private async getResponseTime(where: Prisma.SearchHistoryWhereInput) {
    // TODO: 如果 SearchHistory 表中有 responseTime 字段，可以计算真实值
    // 目前返回默认值
    return {
      avg: 500, // 平均响应时间（毫秒）
      p95: 800, // P95 响应时间
      p99: 1200, // P99 响应时间
      distribution: [
        { range: '0-200ms', count: 0 },
        { range: '200-500ms', count: 0 },
        { range: '500-1000ms', count: 0 },
        { range: '1000-2000ms', count: 0 },
        { range: '2000ms+', count: 0 },
      ],
    };
  }

  /**
   * 获取热门查询
   */
  private async getPopularQueries(where: Prisma.SearchHistoryWhereInput) {
    const popularQueriesRaw = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      where,
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: 20,
    });

    return popularQueriesRaw.map((item) => ({
      query: item.query,
      count: item._count.query,
    }));
  }

  /**
   * 获取检索结果分布
   * 注意：这需要从检索结果中统计，目前基于 resultsCount 做简单统计
   */
  private async getResultDistribution(where: Prisma.SearchHistoryWhereInput) {
    // TODO: 如果需要更精确的分布，需要关联检索结果表
    // 目前基于 SearchHistory 的 resultsCount 做简单统计
    const total = await this.prisma.searchHistory.count({
      where: {
        ...where,
        resultsCount: { gt: 0 },
      },
    });

    // 简化处理：假设所有检索结果都是文档类型
    // 实际应该从检索结果中统计 contentType
    return {
      code: 0, // 需要从实际检索结果中统计
      document: total, // 简化处理
      design: 0, // 需要从实际检索结果中统计
      other: 0,
    };
  }

  /**
   * 导出检索统计为 CSV
   */
  async exportToCsv(
    startDate?: Date,
    endDate?: Date,
    role?: string,
    userId?: string,
  ): Promise<string> {
    const stats = await this.getSearchStatistics(
      startDate,
      endDate,
      role,
      userId,
    );

    const lines: string[] = [];

    // CSV 头部
    lines.push('检索统计报表');
    lines.push(`时间范围: ${startDate?.toISOString() || '全部'} - ${endDate?.toISOString() || '全部'}`);
    lines.push('');

    // 检索次数统计
    lines.push('检索次数统计');
    lines.push('总计,' + stats.searchCounts.total);
    lines.push('');
    lines.push('按角色统计');
    lines.push('角色,次数');
    stats.searchCounts.byRole.forEach((item) => {
      lines.push(`${item.role},${item.count}`);
    });
    lines.push('');

    // 命中率统计
    lines.push('命中率统计');
    lines.push(`总体命中率,${stats.hitRate.overall.toFixed(2)}%`);
    lines.push('');
    lines.push('按角色命中率');
    lines.push('角色,命中率,总次数,命中次数');
    stats.hitRate.byRole.forEach((item) => {
      lines.push(`${item.role},${item.rate.toFixed(2)}%,${item.total},${item.hits}`);
    });
    lines.push('');

    // 热门查询
    lines.push('热门查询');
    lines.push('查询内容,次数');
    stats.popularQueries.forEach((item) => {
      lines.push(`"${item.query}",${item.count}`);
    });

    return lines.join('\n');
  }
}

