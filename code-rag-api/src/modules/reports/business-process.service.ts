import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface BusinessProcessStatistics {
  // 需求到代码交付周期
  deliveryCycle: {
    average: number; // 平均周期（小时）
    median: number; // 中位数周期（小时）
    min: number; // 最短周期（小时）
    max: number; // 最长周期（小时）
    distribution: Array<{ range: string; count: number }>; // 周期分布
    trend: Array<{ date: string; averageCycle: number }>; // 趋势
  };

  // 一次命中率
  firstHitRate: {
    overall: number; // 总体一次命中率
    byRole: Array<{ role: string; rate: number; total: number; hits: number }>; // 按角色
    trend: Array<{ date: string; rate: number }>; // 趋势
  };

  // 多轮问答解决率
  resolutionRate: {
    overall: number; // 总体解决率（3 轮内）
    byRound: Array<{ round: number; count: number; percentage: number }>; // 按轮次
    byRole: Array<{ role: string; rate: number; total: number; resolved: number }>; // 按角色
  };

  // 流程时间缩短比例
  timeReduction: {
    currentAverage: number; // 当前平均周期（小时）
    baselineAverage?: number; // 基准平均周期（小时，如果有历史数据）
    reductionPercentage?: number; // 缩短比例（%）
    target: number; // 目标缩短比例（40%）
    achievement: number; // 达成度（%）
  };

  // 时间范围
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

@Injectable()
export class BusinessProcessService {
  private readonly logger = new Logger(BusinessProcessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取业务流程统计
   */
  async getBusinessProcessStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<BusinessProcessStatistics> {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || now;

    const [
      deliveryCycle,
      firstHitRate,
      resolutionRate,
      timeReduction,
    ] = await Promise.all([
      this.getDeliveryCycle(start, end),
      this.getFirstHitRate(start, end),
      this.getResolutionRate(start, end),
      this.getTimeReduction(start, end),
    ]);

    return {
      deliveryCycle,
      firstHitRate,
      resolutionRate,
      timeReduction,
      timeRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  /**
   * 获取需求到代码交付周期
   */
  private async getDeliveryCycle(startDate: Date, endDate: Date) {
    // 获取所有有反馈的检索历史
    const searchHistories = await this.prisma.searchHistory.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        resultFeedbacks: {
          where: {
            adoptionStatus: 'adopted',
            confirmed: true, // 已确认采纳
          },
          orderBy: {
            createdAt: 'asc', // 按时间排序，取最早的采纳时间
          },
          take: 1, // 只取第一个采纳的反馈
        },
      },
    });

    // 计算周期（小时）
    const cycles: number[] = [];
    searchHistories.forEach((sh) => {
      if (sh.resultFeedbacks.length > 0) {
        const feedback = sh.resultFeedbacks[0];
        const cycleHours =
          (feedback.createdAt.getTime() - sh.createdAt.getTime()) /
          (1000 * 60 * 60);
        if (cycleHours >= 0) {
          // 只统计有效周期（交付时间 >= 提出时间）
          cycles.push(cycleHours);
        }
      }
    });

    if (cycles.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        distribution: [],
        trend: [],
      };
    }

    // 计算统计值
    const sorted = cycles.sort((a, b) => a - b);
    const average = cycles.reduce((a, b) => a + b, 0) / cycles.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // 周期分布（0-1h, 1-4h, 4-8h, 8-24h, 24h+）
    const distribution = [
      { range: '0-1小时', count: 0 },
      { range: '1-4小时', count: 0 },
      { range: '4-8小时', count: 0 },
      { range: '8-24小时', count: 0 },
      { range: '24小时以上', count: 0 },
    ];
    cycles.forEach((cycle) => {
      if (cycle < 1) {
        distribution[0].count++;
      } else if (cycle < 4) {
        distribution[1].count++;
      } else if (cycle < 8) {
        distribution[2].count++;
      } else if (cycle < 24) {
        distribution[3].count++;
      } else {
        distribution[4].count++;
      }
    });

    // 趋势（按天统计平均周期）
    const trendRaw = await this.prisma.$queryRaw<
      Array<{ date: string; avgCycle: number }>
    >`
      SELECT 
        DATE(sh.created_at) as date,
        AVG(EXTRACT(EPOCH FROM (sf.created_at - sh.created_at)) / 3600.0) as avg_cycle
      FROM search_histories sh
      INNER JOIN search_result_feedbacks sf ON sf.search_history_id = sh.id
      WHERE sh.created_at >= ${startDate} 
        AND sh.created_at <= ${endDate}
        AND sf.adoption_status = 'adopted'
        AND sf.confirmed = true
      GROUP BY DATE(sh.created_at)
      ORDER BY date ASC
    `;

    const trend = trendRaw.map((item) => ({
      date: item.date,
      averageCycle: Number(item.avgCycle) || 0,
    }));

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      distribution,
      trend,
    };
  }

  /**
   * 获取一次命中率
   */
  private async getFirstHitRate(startDate: Date, endDate: Date) {
    // 获取每个用户每个查询的首次检索
    const firstSearches = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; query: string; role: string | null; createdAt: Date }>
    >`
      SELECT DISTINCT ON (user_id, query) 
        id, user_id, query, role, created_at
      FROM search_histories
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      ORDER BY user_id, query, created_at ASC
    `;

    if (firstSearches.length === 0) {
      return {
        overall: 0,
        byRole: [],
        trend: [],
      };
    }

    const firstSearchIds = firstSearches.map((s) => s.id);

    // 检查首次检索是否有采纳的反馈
    const adoptedFirstSearches = await this.prisma.searchResultFeedback.findMany({
      where: {
        searchHistoryId: { in: firstSearchIds },
        adoptionStatus: 'adopted',
      },
      select: {
        searchHistoryId: true,
      },
      distinct: ['searchHistoryId'],
    });

    const adoptedIds = new Set(
      adoptedFirstSearches.map((f) => f.searchHistoryId),
    );
    const hits = firstSearches.filter((s) => adoptedIds.has(s.id)).length;
    const overall = (hits / firstSearches.length) * 100;

    // 按角色统计
    const roleStats = new Map<
      string,
      { total: number; hits: number }
    >();
    firstSearches.forEach((s) => {
      const role = s.role || 'unknown';
      const stats = roleStats.get(role) || { total: 0, hits: 0 };
      stats.total++;
      if (adoptedIds.has(s.id)) {
        stats.hits++;
      }
      roleStats.set(role, stats);
    });

    const byRole = Array.from(roleStats.entries()).map(([role, stats]) => ({
      role,
      rate: (stats.hits / stats.total) * 100,
      total: stats.total,
      hits: stats.hits,
    }));

    // 趋势（按天统计）
    const trendRaw = await this.prisma.$queryRaw<
      Array<{ date: string; rate: number }>
    >`
      WITH first_searches AS (
        SELECT DISTINCT ON (user_id, query) 
          id, user_id, query, created_at
        FROM search_histories
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        ORDER BY user_id, query, created_at ASC
      ),
      adopted_first AS (
        SELECT DISTINCT sf.search_history_id
        FROM search_result_feedbacks sf
        INNER JOIN first_searches fs ON fs.id = sf.search_history_id
        WHERE sf.adoption_status = 'adopted'
      )
      SELECT 
        DATE(fs.created_at) as date,
        COUNT(DISTINCT CASE WHEN af.search_history_id IS NOT NULL THEN fs.id END) * 100.0 / COUNT(DISTINCT fs.id) as rate
      FROM first_searches fs
      LEFT JOIN adopted_first af ON af.search_history_id = fs.id
      GROUP BY DATE(fs.created_at)
      ORDER BY date ASC
    `;

    const trend = trendRaw.map((item) => ({
      date: item.date,
      rate: Number(item.rate) || 0,
    }));

    return {
      overall: Math.round(overall * 100) / 100,
      byRole,
      trend,
    };
  }

  /**
   * 获取多轮问答解决率
   */
  private async getResolutionRate(startDate: Date, endDate: Date) {
    // 统计每个用户每个查询的检索次数
    const searchCounts = await this.prisma.$queryRaw<
      Array<{ userId: string; query: string; count: bigint }>
    >`
      SELECT user_id, query, COUNT(*)::bigint as count
      FROM search_histories
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY user_id, query
    `;

    // 获取每个查询的首次采纳时间（如果有）
    const resolvedQueriesSql = `
      WITH search_rounds AS (
        SELECT 
          sh.id,
          sh.user_id,
          sh.query,
          sh.created_at,
          ROW_NUMBER() OVER (PARTITION BY sh.user_id, sh.query ORDER BY sh.created_at ASC) as round
        FROM search_histories sh
        WHERE sh.created_at >= '${startDate.toISOString()}' AND sh.created_at <= '${endDate.toISOString()}'
      ),
      adopted_searches AS (
        SELECT DISTINCT
          sr.user_id,
          sr.query,
          MIN(sr.round) as round
        FROM search_rounds sr
        INNER JOIN search_result_feedbacks sf ON sf.search_history_id = sr.id
        WHERE sf.adoption_status = 'adopted' AND sf.confirmed = true
        GROUP BY sr.user_id, sr.query
      )
      SELECT * FROM adopted_searches
    `;
    const resolvedQueries = await this.prisma.$queryRawUnsafe<
      Array<{ userId: string; query: string; round: number }>
    >(resolvedQueriesSql);

    const resolvedMap = new Map<string, number>();
    resolvedQueries.forEach((rq) => {
      const key = `${rq.userId}:${rq.query}`;
      resolvedMap.set(key, rq.round);
    });

    // 统计按轮次
    const byRound = [
      { round: 1, count: 0, percentage: 0 },
      { round: 2, count: 0, percentage: 0 },
      { round: 3, count: 0, percentage: 0 },
      { round: 4, count: 0, percentage: 0 }, // 4+ 轮
    ];

    let resolvedIn3Rounds = 0;
    let total = 0;

    searchCounts.forEach((sc) => {
      const key = `${sc.userId}:${sc.query}`;
      const resolvedRound = resolvedMap.get(key);
      total++;

      if (resolvedRound) {
        if (resolvedRound === 1) {
          byRound[0].count++;
          resolvedIn3Rounds++;
        } else if (resolvedRound === 2) {
          byRound[1].count++;
          resolvedIn3Rounds++;
        } else if (resolvedRound === 3) {
          byRound[2].count++;
          resolvedIn3Rounds++;
        } else {
          byRound[3].count++;
        }
      }
    });

    byRound.forEach((br) => {
      br.percentage = total > 0 ? (br.count / total) * 100 : 0;
    });

    const overall = total > 0 ? (resolvedIn3Rounds / total) * 100 : 0;

    // 按角色统计（简化处理，使用第一个检索的角色）
    const byRoleRawSql = `
      WITH first_searches AS (
        SELECT DISTINCT ON (user_id, query) 
          user_id, query, role
        FROM search_histories
        WHERE created_at >= '${startDate.toISOString()}' AND created_at <= '${endDate.toISOString()}'
        ORDER BY user_id, query, created_at ASC
      ),
      resolved_queries AS (
        SELECT DISTINCT
          sh.user_id,
          sh.query
        FROM search_histories sh
        INNER JOIN search_result_feedbacks sf ON sf.search_history_id = sh.id
        WHERE sh.created_at >= '${startDate.toISOString()}' AND sh.created_at <= '${endDate.toISOString()}'
          AND sf.adoption_status = 'adopted' AND sf.confirmed = true
      )
      SELECT 
        fs.role,
        COUNT(DISTINCT fs.user_id || ':' || fs.query)::bigint as total,
        COUNT(DISTINCT CASE WHEN rq.user_id IS NOT NULL THEN fs.user_id || ':' || fs.query END)::bigint as resolved
      FROM first_searches fs
      LEFT JOIN resolved_queries rq ON rq.user_id = fs.user_id AND rq.query = fs.query
      GROUP BY fs.role
    `;
    const byRoleRaw = await this.prisma.$queryRawUnsafe<
      Array<{ role: string | null; total: bigint; resolved: bigint }>
    >(byRoleRawSql);

    const byRole = byRoleRaw.map((item) => ({
      role: item.role || 'unknown',
      rate: Number(item.total) > 0 ? (Number(item.resolved) / Number(item.total)) * 100 : 0,
      total: Number(item.total),
      resolved: Number(item.resolved),
    }));

    return {
      overall: Math.round(overall * 100) / 100,
      byRound,
      byRole,
    };
  }

  /**
   * 获取流程时间缩短比例
   */
  private async getTimeReduction(startDate: Date, endDate: Date) {
    const deliveryCycle = await this.getDeliveryCycle(startDate, endDate);
    const currentAverage = deliveryCycle.average;

    // 基准数据：使用更早的时间段作为基准（如果有足够的历史数据）
    const baselineStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const baselineEnd = startDate;
    const baselineCycle = await this.getDeliveryCycle(baselineStart, baselineEnd);

    let reductionPercentage: number | undefined;
    let achievement: number;

    if (baselineCycle.average > 0 && currentAverage > 0) {
      reductionPercentage =
        ((baselineCycle.average - currentAverage) / baselineCycle.average) * 100;
      achievement = (reductionPercentage / 40) * 100; // 目标缩短 40%
    } else {
      achievement = 0; // 没有基准数据，无法计算
    }

    return {
      currentAverage,
      baselineAverage: baselineCycle.average > 0 ? baselineCycle.average : undefined,
      reductionPercentage: reductionPercentage !== undefined ? Math.round(reductionPercentage * 100) / 100 : undefined,
      target: 40,
      achievement: Math.round(achievement * 100) / 100,
    };
  }

  /**
   * 导出业务流程统计为 CSV
   */
  async exportToCsv(
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    const stats = await this.getBusinessProcessStatistics(startDate, endDate);

    const lines: string[] = [];

    // CSV 头部
    lines.push('业务流程完成时间统计报表');
    lines.push(`时间范围: ${startDate?.toISOString() || '全部'} - ${endDate?.toISOString() || '全部'}`);
    lines.push('');

    // 需求到代码交付周期
    lines.push('需求到代码交付周期');
    lines.push(`平均周期: ${stats.deliveryCycle.average} 小时`);
    lines.push(`中位数周期: ${stats.deliveryCycle.median} 小时`);
    lines.push(`最短周期: ${stats.deliveryCycle.min} 小时`);
    lines.push(`最长周期: ${stats.deliveryCycle.max} 小时`);
    lines.push('');
    lines.push('周期分布');
    lines.push('范围,数量');
    stats.deliveryCycle.distribution.forEach((item) => {
      lines.push(`${item.range},${item.count}`);
    });
    lines.push('');

    // 一次命中率
    lines.push('一次命中率');
    lines.push(`总体命中率: ${stats.firstHitRate.overall.toFixed(2)}%`);
    lines.push('');
    lines.push('按角色统计');
    lines.push('角色,命中率,总检索数,命中数');
    stats.firstHitRate.byRole.forEach((item) => {
      lines.push(`${item.role},${item.rate.toFixed(2)}%,${item.total},${item.hits}`);
    });
    lines.push('');

    // 多轮问答解决率
    lines.push('多轮问答解决率（3 轮内）');
    lines.push(`总体解决率: ${stats.resolutionRate.overall.toFixed(2)}%`);
    lines.push('');
    lines.push('按轮次统计');
    lines.push('轮次,数量,占比');
    stats.resolutionRate.byRound.forEach((item) => {
      lines.push(`${item.round === 4 ? '4+' : item.round}轮,${item.count},${item.percentage.toFixed(2)}%`);
    });
    lines.push('');

    // 流程时间缩短比例
    lines.push('流程时间缩短比例');
    lines.push(`当前平均周期: ${stats.timeReduction.currentAverage} 小时`);
    if (stats.timeReduction.baselineAverage !== undefined) {
      lines.push(`基准平均周期: ${stats.timeReduction.baselineAverage} 小时`);
      lines.push(`缩短比例: ${stats.timeReduction.reductionPercentage?.toFixed(2)}%`);
      lines.push(`目标缩短比例: ${stats.timeReduction.target}%`);
      lines.push(`达成度: ${stats.timeReduction.achievement.toFixed(2)}%`);
    } else {
      lines.push('基准数据: 无历史数据');
    }

    return lines.join('\n');
  }
}

