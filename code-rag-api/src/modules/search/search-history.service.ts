import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from './types/role.types';
import type { SearchHistoryQueryDto } from './dto/search-history.dto';

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  role: string | null;
  resultsCount: number;
  adoptionStatus: string | null;
  createdAt: Date;
}

export interface SearchHistoryStats {
  totalSearches: number;
  adoptedSearches: number;
  rejectedSearches: number;
  adoptionRate: number;
  popularQueries: Array<{
    query: string;
    count: number;
  }>;
  roleDistribution: Array<{
    role: string;
    count: number;
  }>;
}

@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的检索历史
   */
  async getUserSearchHistory(
    userId: string,
    query: SearchHistoryQueryDto,
  ): Promise<{
    items: SearchHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // 构建筛选条件
    const where: {
      userId: string;
      role?: string;
      query?: { contains: string; mode?: 'insensitive' };
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      userId,
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.keyword) {
      where.query = {
        contains: query.keyword,
        mode: 'insensitive',
      };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // 查询总数
    const total = await this.prisma.searchHistory.count({ where });

    // 查询数据
    const items = await this.prisma.searchHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        query: item.query,
        role: item.role,
        resultsCount: item.resultsCount,
        adoptionStatus: item.adoptionStatus,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取检索历史详情
   */
  async getSearchHistoryById(
    id: string,
    userId?: string,
  ): Promise<SearchHistoryItem> {
    const where: { id: string; userId?: string } = { id };
    if (userId) {
      where.userId = userId;
    }

    const history = await this.prisma.searchHistory.findUnique({
      where,
    });

    if (!history) {
      throw new NotFoundException(`Search history with ID ${id} not found`);
    }

    return {
      id: history.id,
      userId: history.userId,
      query: history.query,
      role: history.role,
      resultsCount: history.resultsCount,
      adoptionStatus: history.adoptionStatus,
      createdAt: history.createdAt,
    };
  }

  /**
   * 更新采纳状态
   */
  async updateAdoptionStatus(
    id: string,
    adoptionStatus: 'adopted' | 'rejected',
    userId?: string,
  ): Promise<SearchHistoryItem> {
    const where: { id: string; userId?: string } = { id };
    if (userId) {
      where.userId = userId;
    }

    const history = await this.prisma.searchHistory.update({
      where,
      data: { adoptionStatus },
    });

    return {
      id: history.id,
      userId: history.userId,
      query: history.query,
      role: history.role,
      resultsCount: history.resultsCount,
      adoptionStatus: history.adoptionStatus,
      createdAt: history.createdAt,
    };
  }

  /**
   * 获取团队检索统计
   */
  async getTeamStats(
    userIds?: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<SearchHistoryStats> {
    const where: {
      userId?: { in: string[] };
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (userIds && userIds.length > 0) {
      where.userId = { in: userIds };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // 获取总数
    const totalSearches = await this.prisma.searchHistory.count({ where });

    // 获取采纳统计
    const adoptedSearches = await this.prisma.searchHistory.count({
      where: { ...where, adoptionStatus: 'adopted' },
    });

    const rejectedSearches = await this.prisma.searchHistory.count({
      where: { ...where, adoptionStatus: 'rejected' },
    });

    const adoptionRate =
      totalSearches > 0
        ? (adoptedSearches / (adoptedSearches + rejectedSearches)) * 100
        : 0;

    // 获取热门查询（按查询次数排序）
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
      take: 10,
    });

    const popularQueries = popularQueriesRaw.map((item) => ({
      query: item.query,
      count: item._count.query,
    }));

    // 获取角色分布
    const roleDistributionRaw = await this.prisma.searchHistory.groupBy({
      by: ['role'],
      where,
      _count: {
        role: true,
      },
    });

    const roleDistribution = roleDistributionRaw.map((item) => ({
      role: item.role || 'unknown',
      count: item._count.role,
    }));

    return {
      totalSearches,
      adoptedSearches,
      rejectedSearches,
      adoptionRate: Math.round(adoptionRate * 100) / 100,
      popularQueries,
      roleDistribution,
    };
  }
}

