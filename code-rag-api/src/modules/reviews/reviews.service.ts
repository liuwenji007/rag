import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApproveReviewDto } from './dto/approve-review.dto';
import { RejectReviewDto } from './dto/reject-review.dto';
import { DocumentIndexingTaskService } from '../../services/document-indexing/document-indexing-task.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentIndexingTaskService: DocumentIndexingTaskService,
  ) {}

  /**
   * 获取待审核文档列表
   */
  async getPendingReviews(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.contentReview.findMany({
        where: {
          status: 'pending',
        },
        include: {
          document: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
              },
            },
          },
        },
        // 待审核的文档按创建时间排序（通过 document.syncedAt）
        // 由于 ContentReview 没有 submittedAt，我们按 id 排序（先创建的在前）
        orderBy: {
          id: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.contentReview.count({
        where: {
          status: 'pending',
        },
      }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        documentId: review.documentId,
        document: {
          id: review.document.id,
          title: review.document.title,
          documentType: review.document.documentType,
          contentType: review.document.contentType,
          fileSize: review.document.fileSize,
          mimeType: review.document.mimeType,
          uploadedBy: review.document.uploadedBy,
          syncedAt: review.document.syncedAt,
          content: review.document.versions[0]?.content || null,
        },
        status: review.status,
        submittedAt: review.reviewedAt || new Date(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取审核详情
   */
  async getReviewById(reviewId: string) {
    const review = await this.prisma.contentReview.findUnique({
      where: { id: reviewId },
      include: {
        document: {
          include: {
            versions: {
              orderBy: { version: 'desc' },
            },
            tagRelations: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    return {
      id: review.id,
      documentId: review.documentId,
        status: review.status,
        reviewedBy: review.reviewedBy,
        reviewedAt: review.reviewedAt,
        reviewNotes: review.rejectReason, // 使用 rejectReason 字段存储审核备注
        submittedAt: review.reviewedAt || new Date(), // ContentReview 没有 submittedAt，使用 reviewedAt
      document: {
        id: review.document.id,
        title: review.document.title,
        documentType: review.document.documentType,
        contentType: review.document.contentType,
        filePath: review.document.filePath,
        fileSize: review.document.fileSize,
        mimeType: review.document.mimeType,
        uploadedBy: review.document.uploadedBy,
        syncedAt: review.document.syncedAt,
        content: review.document.versions[0]?.content || (review.document.content as string | null) || null,
        tags: review.document.tagRelations.map((tr) => ({
          id: tr.tag.id,
          name: tr.tag.name,
          color: tr.tag.color,
        })),
      },
    };
  }

  /**
   * 审核通过
   */
  async approveReview(reviewId: string, dto: ApproveReviewDto, reviewerId: string) {
    const review = await this.prisma.contentReview.findUnique({
      where: { id: reviewId },
      include: {
        document: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    if (review.status !== 'pending') {
      throw new BadRequestException(`Review ${reviewId} is not pending`);
    }

    // 更新审核记录
    await this.prisma.contentReview.update({
      where: { id: reviewId },
      data: {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectReason: dto.notes || null, // 使用 rejectReason 字段存储审核备注
      },
    });

    // 触发文档索引（如果文档还未索引）
    try {
      const latestVersion = await this.prisma.documentVersion.findFirst({
        where: { documentId: review.documentId },
        orderBy: { version: 'desc' },
      });

      await this.documentIndexingTaskService.createDocumentIndexingTask(
        review.documentId,
      );

      this.logger.log(`Document ${review.documentId} approved and indexed`);
    } catch (error) {
      this.logger.error(
        `Failed to index document ${review.documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 不抛出错误，审核仍然通过
    }

    return { success: true, message: 'Review approved successfully' };
  }

  /**
   * 审核退回
   */
  async rejectReview(reviewId: string, dto: RejectReviewDto, reviewerId: string) {
    const review = await this.prisma.contentReview.findUnique({
      where: { id: reviewId },
      include: {
        document: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    if (review.status !== 'pending') {
      throw new BadRequestException(`Review ${reviewId} is not pending`);
    }

    // 更新审核记录
    await this.prisma.contentReview.update({
      where: { id: reviewId },
      data: {
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectReason: dto.reason,
      },
    });

    // 通知上传用户（暂时使用日志）
    const uploadedBy = review.document.uploadedBy;
    if (uploadedBy) {
      this.logger.log(
        `Document ${review.documentId} rejected. Notification sent to user ${uploadedBy}. Reason: ${dto.reason}`,
      );
      // TODO: 实现站内消息或邮件通知
    }

    return { success: true, message: 'Review rejected successfully' };
  }

  /**
   * 获取审核历史
   */
  async getReviewHistory(page: number = 1, limit: number = 20, status?: 'APPROVED' | 'REJECTED') {
    const skip = (page - 1) * limit;

    const where: { status?: 'approved' | 'rejected' } = {};
    if (status) {
      where.status = status.toLowerCase() as 'approved' | 'rejected';
    }

    const [reviews, total] = await Promise.all([
      this.prisma.contentReview.findMany({
        where: {
          ...where,
          status: status ? (status.toLowerCase() as 'approved' | 'rejected') : { in: ['approved', 'rejected'] },
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              documentType: true,
              uploadedBy: true,
            },
          },
        },
        orderBy: {
          reviewedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.contentReview.count({
        where: {
          ...where,
          status: status ? (status.toLowerCase() as 'approved' | 'rejected') : { in: ['approved', 'rejected'] },
        },
      }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        documentId: review.documentId,
        document: {
          id: review.document.id,
          title: review.document.title,
          documentType: review.document.documentType,
          uploadedBy: review.document.uploadedBy,
        },
        status: review.status,
        reviewerId: review.reviewedBy,
        reviewedAt: review.reviewedAt,
        reviewNotes: review.rejectReason,
        submittedAt: review.reviewedAt || new Date(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

