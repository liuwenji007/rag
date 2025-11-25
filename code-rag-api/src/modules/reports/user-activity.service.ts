import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface UserActivityStatistics {
  // DAU/WAU/MAU
  activeUsers: {
    dau: number; // 日活
    wau: number; // 周活
    mau: number; // 月活
    dauTrend: Array<{ date: string; count: number }>; // DAU 趋势
  };

  // 用户留存率
  retention: {
    day1: number; // 次日留存率
    day7: number; // 7 日留存率
    day30: number; // 30 日留存率
    trend: Array<{ date: string; day1: number; day7: number; day30: number }>; // 留存率趋势
  };

  // 用户使用频率分布
  frequencyDistribution: {
    active: number; // 活跃用户（7 日内操作 >= 10 次）
    normal: number; // 普通用户（7 日内操作 3-9 次）
    low: number; // 低频用户（7 日内操作 1-2 次）
    inactive: number; // 不活跃用户（7 日内无操作）
  };

  // 按角色的用户活跃度
  byRole: Array<{
    role: string;
    dau: number;
    wau: number;
    mau: number;
    totalUsers: number;
  }>;
}

@Injectable()
export class UserActivityService {
  private readonly logger = new Logger(UserActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户活跃度统计
   */
  async getUserActivityStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserActivityStatistics> {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || now;

    // 并行获取所有统计数据
    const [activeUsers, retention, frequencyDistribution, byRole] =
      await Promise.all([
        this.getActiveUsers(start, end),
        this.getRetention(start, end),
        this.getFrequencyDistribution(),
        this.getByRole(start, end),
      ]);

    return {
      activeUsers,
      retention,
      frequencyDistribution,
      byRole,
    };
  }

  /**
   * 获取 DAU/WAU/MAU
   */
  private async getActiveUsers(startDate: Date, endDate: Date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // DAU: 今日有操作的用户（从 AuditLog 或 SearchHistory 中统计）
    const dauUsers = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: today },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // WAU: 7 日内有操作的用户
    const wauUsers = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: weekAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // MAU: 30 日内有操作的用户
    const mauUsers = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: monthAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // DAU 趋势（按天统计）
    const dauTrendRaw = await this.prisma.$queryRaw<
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

    const dauTrend = dauTrendRaw.map((item) => ({
      date: item.date,
      count: Number(item.count),
    }));

    return {
      dau: dauUsers.length,
      wau: wauUsers.length,
      mau: mauUsers.length,
      dauTrend,
    };
  }

  /**
   * 获取用户留存率
   * 优化：使用 SQL 批量计算，避免循环查询
   */
  private async getRetention(startDate: Date, endDate: Date) {
    // 获取所有用户的首次使用时间和后续使用情况
    // 使用 SQL 批量计算留存率
    const retentionRaw = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        firstUsage: Date;
        hasDay1: bigint;
        hasDay7: bigint;
        hasDay30: bigint;
      }>
    >`
      WITH first_usage AS (
        SELECT 
          user_id as "userId",
          MIN(created_at) as "firstUsage"
        FROM audit_logs
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY user_id
      ),
      user_activity AS (
        SELECT 
          fu."userId",
          fu."firstUsage",
          COUNT(CASE WHEN al.created_at >= fu."firstUsage" + INTERVAL '1 day' 
                     AND al.created_at < fu."firstUsage" + INTERVAL '2 days' 
                     THEN 1 END)::bigint as "hasDay1",
          COUNT(CASE WHEN al.created_at >= fu."firstUsage" + INTERVAL '1 day' 
                     AND al.created_at < fu."firstUsage" + INTERVAL '8 days' 
                     THEN 1 END)::bigint as "hasDay7",
          COUNT(CASE WHEN al.created_at >= fu."firstUsage" + INTERVAL '1 day' 
                     AND al.created_at < fu."firstUsage" + INTERVAL '31 days' 
                     THEN 1 END)::bigint as "hasDay30"
        FROM first_usage fu
        LEFT JOIN audit_logs al ON al.user_id = fu."userId"
        GROUP BY fu."userId", fu."firstUsage"
      )
      SELECT * FROM user_activity
    `;

    let totalUsers = 0;
    let day1Retained = 0;
    let day7Retained = 0;
    let day30Retained = 0;

    retentionRaw.forEach((item) => {
      totalUsers++;
      if (Number(item.hasDay1) > 0) day1Retained++;
      if (Number(item.hasDay7) > 0) day7Retained++;
      if (Number(item.hasDay30) > 0) day30Retained++;
    });

    const day1 = totalUsers > 0 ? (day1Retained / totalUsers) * 100 : 0;
    const day7 = totalUsers > 0 ? (day7Retained / totalUsers) * 100 : 0;
    const day30 = totalUsers > 0 ? (day30Retained / totalUsers) * 100 : 0;

    // 留存率趋势（简化处理，按周统计）
    const trend: Array<{ date: string; day1: number; day7: number; day30: number }> = [];
    // TODO: 实现更详细的趋势统计

    return {
      day1,
      day7,
      day30,
      trend,
    };
  }

  /**
   * 获取用户使用频率分布
   */
  private async getFrequencyDistribution() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 统计每个用户 7 日内的操作次数
    const userActivityCounts = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: weekAgo },
      },
      _count: {
        id: true,
      },
    });

    let active = 0; // >= 10 次
    let normal = 0; // 3-9 次
    let low = 0; // 1-2 次
    let inactive = 0; // 0 次

    // 获取所有用户
    const allUsers = await this.prisma.user.findMany({
      select: { id: true },
    });

    const userCountMap = new Map<string, number>();
    userActivityCounts.forEach((item) => {
      userCountMap.set(item.userId, item._count.id);
    });

    allUsers.forEach((user) => {
      const count = userCountMap.get(user.id) || 0;
      if (count >= 10) {
        active++;
      } else if (count >= 3) {
        normal++;
      } else if (count >= 1) {
        low++;
      } else {
        inactive++;
      }
    });

    return {
      active,
      normal,
      low,
      inactive,
    };
  }

  /**
   * 获取按角色的用户活跃度
   */
  private async getByRole(startDate: Date, endDate: Date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 获取所有角色
    const roles = await this.prisma.role.findMany({
      include: {
        users: {
          include: {
            user: true,
          },
        },
      },
    });

    const result = await Promise.all(
      roles.map(async (role) => {
        const userIds = role.users.map((ur) => ur.userId);

        // 统计每个角色的 DAU/WAU/MAU
        const [dauUsers, wauUsers, mauUsers] = await Promise.all([
          this.prisma.auditLog.findMany({
            where: {
              userId: { in: userIds },
              createdAt: { gte: today },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
          this.prisma.auditLog.findMany({
            where: {
              userId: { in: userIds },
              createdAt: { gte: weekAgo },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
          this.prisma.auditLog.findMany({
            where: {
              userId: { in: userIds },
              createdAt: { gte: monthAgo },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
        ]);

        return {
          role: role.name,
          dau: dauUsers.length,
          wau: wauUsers.length,
          mau: mauUsers.length,
          totalUsers: userIds.length,
        };
      }),
    );

    return result;
  }

  /**
   * 导出用户活跃度统计为 CSV
   */
  async exportToCsv(
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    const stats = await this.getUserActivityStatistics(startDate, endDate);

    const lines: string[] = [];

    // CSV 头部
    lines.push('用户活跃度报表');
    lines.push(`时间范围: ${startDate?.toISOString() || '全部'} - ${endDate?.toISOString() || '全部'}`);
    lines.push('');

    // DAU/WAU/MAU
    lines.push('活跃用户统计');
    lines.push(`日活 (DAU),${stats.activeUsers.dau}`);
    lines.push(`周活 (WAU),${stats.activeUsers.wau}`);
    lines.push(`月活 (MAU),${stats.activeUsers.mau}`);
    lines.push('');

    // 留存率
    lines.push('用户留存率');
    lines.push(`次日留存,${stats.retention.day1.toFixed(2)}%`);
    lines.push(`7 日留存,${stats.retention.day7.toFixed(2)}%`);
    lines.push(`30 日留存,${stats.retention.day30.toFixed(2)}%`);
    lines.push('');

    // 使用频率分布
    lines.push('使用频率分布');
    lines.push('类型,用户数');
    lines.push(`活跃用户,${stats.frequencyDistribution.active}`);
    lines.push(`普通用户,${stats.frequencyDistribution.normal}`);
    lines.push(`低频用户,${stats.frequencyDistribution.low}`);
    lines.push(`不活跃用户,${stats.frequencyDistribution.inactive}`);
    lines.push('');

    // 按角色统计
    lines.push('按角色活跃度');
    lines.push('角色,DAU,WAU,MAU,总用户数');
    stats.byRole.forEach((item) => {
      lines.push(`${item.role},${item.dau},${item.wau},${item.mau},${item.totalUsers}`);
    });

    return lines.join('\n');
  }
}

