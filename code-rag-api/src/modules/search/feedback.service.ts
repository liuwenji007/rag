import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmitResultFeedbackDto, UpdateSearchHistoryFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 提交单条检索结果反馈
   */
  async submitResultFeedback(dto: SubmitResultFeedbackDto, userId: string) {
    // 验证检索历史是否存在
    const searchHistory = await this.prisma.searchHistory.findUnique({
      where: { id: dto.searchHistoryId },
    });

    if (!searchHistory) {
      throw new NotFoundException(`Search history ${dto.searchHistoryId} not found`);
    }

    // 验证结果索引是否有效
    if (dto.resultIndex >= searchHistory.resultsCount) {
      throw new BadRequestException(
        `Result index ${dto.resultIndex} is out of range. Total results: ${searchHistory.resultsCount}`,
      );
    }

    // 创建或更新反馈
    const feedback = await this.prisma.searchResultFeedback.upsert({
      where: {
        searchHistoryId_resultIndex_userId: {
          searchHistoryId: dto.searchHistoryId,
          resultIndex: dto.resultIndex,
          userId,
        },
      },
      update: {
        documentId: dto.documentId,
        adoptionStatus: dto.adoptionStatus,
        comment: dto.comment,
      },
      create: {
        searchHistoryId: dto.searchHistoryId,
        resultIndex: dto.resultIndex,
        documentId: dto.documentId,
        adoptionStatus: dto.adoptionStatus,
        comment: dto.comment,
        userId,
      },
    });

    this.logger.log(
      `Feedback submitted: searchHistoryId=${dto.searchHistoryId}, resultIndex=${dto.resultIndex}, status=${dto.adoptionStatus}`,
    );

    return {
      id: feedback.id,
      searchHistoryId: feedback.searchHistoryId,
      resultIndex: feedback.resultIndex,
      documentId: feedback.documentId,
      adoptionStatus: feedback.adoptionStatus,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
    };
  }

  /**
   * 更新检索历史整体反馈
   */
  async updateSearchHistoryFeedback(
    searchHistoryId: string,
    dto: UpdateSearchHistoryFeedbackDto,
    userId?: string,
  ) {
    const where: { id: string; userId?: string } = { id: searchHistoryId };
    if (userId) {
      where.userId = userId;
    }

    const searchHistory = await this.prisma.searchHistory.findFirst({
      where,
    });

    if (!searchHistory) {
      throw new NotFoundException(`Search history ${searchHistoryId} not found`);
    }

    const updateData: any = {};
    if (dto.comment !== undefined) {
      updateData.comment = dto.comment;
    }
    if (dto.adoptionStatus !== undefined) {
      updateData.adoptionStatus = dto.adoptionStatus;
    }

    const updated = await this.prisma.searchHistory.update({
      where: { id: searchHistoryId },
      data: updateData,
    });

    return {
      id: updated.id,
      adoptionStatus: updated.adoptionStatus,
      comment: updated.comment,
      updatedAt: updated.createdAt,
    };
  }

  /**
   * 获取反馈列表（管理员）
   */
  async getFeedbackList(
    page = 1,
    limit = 20,
    searchHistoryId?: string,
    userId?: string,
    adoptionStatus?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (searchHistoryId) {
      where.searchHistoryId = searchHistoryId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (adoptionStatus) {
      where.adoptionStatus = adoptionStatus;
    }

    const [feedbacks, total] = await Promise.all([
      this.prisma.searchResultFeedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          searchHistory: {
            select: {
              id: true,
              query: true,
              userId: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.searchResultFeedback.count({ where }),
    ]);

    return {
      feedbacks: feedbacks.map((fb) => ({
        id: fb.id,
        searchHistoryId: fb.searchHistoryId,
        resultIndex: fb.resultIndex,
        documentId: fb.documentId,
        adoptionStatus: fb.adoptionStatus,
        comment: fb.comment,
        userId: fb.userId,
        createdAt: fb.createdAt,
        searchHistory: {
          id: fb.searchHistory.id,
          query: fb.searchHistory.query,
          userId: fb.searchHistory.userId,
          role: fb.searchHistory.role,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取采纳率统计
   */
  async getAdoptionStats(
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    role?: string,
  ) {
    const where: any = {};

    // 时间范围
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // 用户筛选
    if (userId) {
      where.userId = userId;
    }

    // 角色筛选
    if (role) {
      where.role = role;
    }

    // 获取检索历史统计
    const [totalSearches, adoptedSearches, rejectedSearches] = await Promise.all([
      this.prisma.searchHistory.count({ where }),
      this.prisma.searchHistory.count({
        where: {
          ...where,
          adoptionStatus: 'adopted',
        },
      }),
      this.prisma.searchHistory.count({
        where: {
          ...where,
          adoptionStatus: 'rejected',
        },
      }),
    ]);

    // 获取单条结果反馈统计
    const searchHistoryIds = await this.prisma.searchHistory.findMany({
      where,
      select: { id: true },
    });

    const historyIds = searchHistoryIds.map((sh) => sh.id);

    const [totalFeedbacks, adoptedFeedbacks, rejectedFeedbacks] = await Promise.all([
      this.prisma.searchResultFeedback.count({
        where: {
          searchHistoryId: { in: historyIds },
        },
      }),
      this.prisma.searchResultFeedback.count({
        where: {
          searchHistoryId: { in: historyIds },
          adoptionStatus: 'adopted',
        },
      }),
      this.prisma.searchResultFeedback.count({
        where: {
          searchHistoryId: { in: historyIds },
          adoptionStatus: 'rejected',
        },
      }),
    ]);

    // 计算采纳率
    const overallAdoptionRate =
      totalSearches > 0 ? (adoptedSearches / totalSearches) * 100 : 0;
    const resultAdoptionRate =
      totalFeedbacks > 0 ? (adoptedFeedbacks / totalFeedbacks) * 100 : 0;

    // 按角色统计
    const roleStats = await this.prisma.searchHistory.groupBy({
      by: ['role'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        resultsCount: true,
      },
    });

    const roleAdoptionStats = await Promise.all(
      roleStats.map(async (stat) => {
        const roleWhere = { ...where, role: stat.role };
        const [adopted, rejected] = await Promise.all([
          this.prisma.searchHistory.count({
            where: { ...roleWhere, adoptionStatus: 'adopted' },
          }),
          this.prisma.searchHistory.count({
            where: { ...roleWhere, adoptionStatus: 'rejected' },
          }),
        ]);

        return {
          role: stat.role,
          totalSearches: stat._count.id,
          totalResults: stat._sum.resultsCount || 0,
          adopted,
          rejected,
          adoptionRate: stat._count.id > 0 ? (adopted / stat._count.id) * 100 : 0,
        };
      }),
    );

    return {
      overall: {
        totalSearches,
        adoptedSearches,
        rejectedSearches,
        adoptionRate: overallAdoptionRate,
      },
      results: {
        totalFeedbacks,
        adoptedFeedbacks,
        rejectedFeedbacks,
        adoptionRate: resultAdoptionRate,
      },
      byRole: roleAdoptionStats,
      timeRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }
}

