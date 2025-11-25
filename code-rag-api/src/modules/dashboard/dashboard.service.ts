import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MonitoringService } from '../../services/monitoring/monitoring.service';
import { SearchHistoryService } from '../search/search-history.service';
import { FeedbackService } from '../search/feedback.service';
import { Prisma } from '@prisma/client';

export interface DashboardOverview {
  // 数据源状态概览
  datasources: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    totalDocuments: number;
    totalCodeFiles: number;
    lastSyncTime: Date | null;
  };

  // 检索统计
  search: {
    totalSearches: number;
    hitRate: number; // 命中率（有结果返回的比例）
    avgResponseTime: number; // 平均响应时间（毫秒）
    p95ResponseTime: number; // P95 响应时间
    searchesByDay: Array<{ date: string; count: number }>; // 按天统计
  };

  // 用户活跃度
  userActivity: {
    dau: number; // 日活
    wau: number; // 周活
    mau: number; // 月活
    activeUsersByDay: Array<{ date: string; count: number }>; // 按天统计活跃用户
  };

  // 采纳率统计
  adoption: {
    overallRate: number; // 总体采纳率
    trend: Array<{ date: string; rate: number }>; // 趋势数据
    byRole: Array<{ role: string; rate: number; count: number }>; // 按角色统计
  };

  // 用户反馈概览
  feedback: {
    positiveRate: number; // 正向反馈比例
    negativeRate: number; // 负向反馈比例
    totalFeedbacks: number;
    topComments: Array<{ comment: string; count: number }>; // 热门反馈意见
  };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly monitoringService: MonitoringService,
    private readonly searchHistoryService: SearchHistoryService,
    private readonly feedbackService: FeedbackService,
  ) {}

  /**
   * 获取看板概览数据
   */
  async getDashboardOverview(
    startDate?: Date,
    endDate?: Date,
  ): Promise<DashboardOverview> {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 默认最近30天
    const end = endDate || now;

    // 并行获取所有数据
    const [
      datasourcesData,
      searchData,
      userActivityData,
      adoptionData,
      feedbackData,
    ] = await Promise.all([
      this.getDatasourcesOverview(),
      this.getSearchStats(start, end),
      this.getUserActivityStats(start, end),
      this.getAdoptionStats(start, end),
      this.getFeedbackOverview(start, end),
    ]);

    return {
      datasources: datasourcesData,
      search: searchData,
      userActivity: userActivityData,
      adoption: adoptionData,
      feedback: feedbackData,
    };
  }

  /**
   * 获取数据源状态概览
   */
  private async getDatasourcesOverview() {
    const dataSources = await this.prisma.dataSource.findMany({
      include: {
        documents: true,
        syncHistories: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    let totalDocuments = 0;
    let totalCodeFiles = 0;
    let lastSyncTime: Date | null = null;
    let healthy = 0;
    let warning = 0;
    let error = 0;

    for (const ds of dataSources) {
      totalDocuments += ds.documents.length;
      // 统计代码文件（contentType 为 code 的文档）
      totalCodeFiles += ds.documents.filter(
        (doc) => doc.contentType === 'code',
      ).length;

      if (ds.syncHistories.length > 0) {
        const lastSync = ds.syncHistories[0];
        if (!lastSyncTime || lastSync.createdAt > lastSyncTime) {
          lastSyncTime = lastSync.createdAt;
        }
      }

      // 根据状态统计
      if (ds.status === 'ACTIVE') {
        healthy++;
      } else if (ds.status === 'INACTIVE') {
        warning++;
      } else {
        error++;
      }
    }

    return {
      total: dataSources.length,
      healthy,
      warning,
      error,
      totalDocuments,
      totalCodeFiles,
      lastSyncTime,
    };
  }

  /**
   * 获取检索统计
   */
  private async getSearchStats(startDate: Date, endDate: Date) {
    const where: Prisma.SearchHistoryWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [totalSearches, searchesWithResults] = await Promise.all([
      this.prisma.searchHistory.count({ where }),
      this.prisma.searchHistory.count({
        where: {
          ...where,
          resultsCount: { gt: 0 },
        },
      }),
    ]);

    const hitRate =
      totalSearches > 0 ? (searchesWithResults / totalSearches) * 100 : 0;

    // 按天统计检索次数
    const searchesByDayRaw = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::bigint as count
      FROM search_histories
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const searchesByDay = searchesByDayRaw.map((item) => ({
      date: item.date,
      count: Number(item.count),
    }));

    // 响应时间统计（如果有记录的话，这里先返回默认值）
    // TODO: 如果 SearchHistory 表中有响应时间字段，可以计算真实值
    const avgResponseTime = 500; // 默认值，单位：毫秒
    const p95ResponseTime = 800; // 默认值

    return {
      totalSearches,
      hitRate,
      avgResponseTime,
      p95ResponseTime,
      searchesByDay,
    };
  }

  /**
   * 获取用户活跃度统计
   */
  private async getUserActivityStats(startDate: Date, endDate: Date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // DAU: 今日有操作的用户
    const dauUsers = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: today },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // WAU: 7日内有操作的用户
    const wauUsers = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: weekAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // MAU: 30日内有操作的用户
    const mauUsers = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: monthAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // 按天统计活跃用户数
    const activeUsersByDayRaw = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id)::bigint as count
      FROM audit_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const activeUsersByDay = activeUsersByDayRaw.map((item) => ({
      date: item.date,
      count: Number(item.count),
    }));

    return {
      dau: dauUsers.length,
      wau: wauUsers.length,
      mau: mauUsers.length,
      activeUsersByDay,
    };
  }

  /**
   * 获取采纳率统计
   */
  private async getAdoptionStats(startDate: Date, endDate: Date) {
    const adoptionStats = await this.feedbackService.getAdoptionStats(
      startDate,
      endDate,
    );

    // 按天统计采纳率趋势
    const trendRaw = await this.prisma.$queryRaw<
      Array<{ date: string; adopted: bigint; total: bigint }>
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN adoption_status = 'adopted' THEN 1 END)::bigint as adopted,
        COUNT(*)::bigint as total
      FROM search_histories
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        AND adoption_status IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const trend = trendRaw.map((item) => ({
      date: item.date,
      rate:
        Number(item.total) > 0
          ? (Number(item.adopted) / Number(item.total)) * 100
          : 0,
    }));

    return {
      overallRate: adoptionStats.overall.adoptionRate,
      trend,
      byRole: adoptionStats.byRole.map((item) => ({
        role: item.role || 'unknown',
        rate: item.adoptionRate,
        count: item.totalSearches,
      })),
    };
  }

  /**
   * 获取用户反馈概览
   */
  private async getFeedbackOverview(startDate: Date, endDate: Date) {
    const where: Prisma.SearchResultFeedbackWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [totalFeedbacks, adoptedFeedbacks, rejectedFeedbacks] =
      await Promise.all([
        this.prisma.searchResultFeedback.count({ where }),
        this.prisma.searchResultFeedback.count({
          where: { ...where, adoptionStatus: 'adopted' },
        }),
        this.prisma.searchResultFeedback.count({
          where: { ...where, adoptionStatus: 'rejected' },
        }),
      ]);

    const positiveRate =
      totalFeedbacks > 0 ? (adoptedFeedbacks / totalFeedbacks) * 100 : 0;
    const negativeRate =
      totalFeedbacks > 0 ? (rejectedFeedbacks / totalFeedbacks) * 100 : 0;

    // 获取热门反馈意见（有评论的反馈，按出现次数排序）
    const topCommentsRaw = await this.prisma.searchResultFeedback.findMany({
      where: {
        ...where,
        comment: { not: null },
      },
      select: { comment: true },
      take: 10,
    });

    // 统计评论出现次数（简化处理，实际可以更复杂）
    const commentCounts = new Map<string, number>();
    topCommentsRaw.forEach((item) => {
      if (item.comment) {
        const key = item.comment.substring(0, 50); // 取前50个字符作为key
        commentCounts.set(key, (commentCounts.get(key) || 0) + 1);
      }
    });

    const topComments = Array.from(commentCounts.entries())
      .map(([comment, count]) => ({ comment, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      positiveRate,
      negativeRate,
      totalFeedbacks,
      topComments,
    };
  }
}

