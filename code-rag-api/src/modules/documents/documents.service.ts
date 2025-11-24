import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FileStorageService } from '../../services/file-storage/file-storage.service';
import { DocumentParserService } from '../../services/document-parser/document-parser.service';
import { DocumentIndexingTaskService } from '../../services/document-indexing/document-indexing-task.service';
import { DocumentIndexingService } from '../../services/document-indexing/document-indexing.service';
import { Readable } from 'stream';
import { DocumentType } from './dto/upload-document.dto';
import { DocumentQueryDto, SortField, SortOrder } from './dto/document-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES = [
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
    private readonly documentParser: DocumentParserService,
    private readonly documentIndexingTaskService: DocumentIndexingTaskService,
    private readonly documentIndexingService: DocumentIndexingService,
  ) {}

  /**
   * 上传文档
   */
  async uploadDocument(
    file: Express.Multer.File,
    documentType?: DocumentType,
    title?: string,
    uploadedBy?: string,
  ) {
    // 验证文件
    this.validateFile(file);

    // 生成文档 ID
    const documentId = this.generateDocumentId();

    // 保存文件
    const fileStream = Readable.from(file.buffer);
    const filePath = await this.fileStorage.saveFile(
      documentId,
      file.originalname,
      fileStream,
    );

    // 解析文档内容
    let parsedContent: Awaited<ReturnType<typeof this.documentParser.parseDocumentFromStream>> | null = null;
    try {
      const contentStream = Readable.from(file.buffer);
      parsedContent = await this.documentParser.parseDocumentFromStream(
        contentStream,
        file.mimetype,
        file.originalname,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to parse document content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 解析失败不影响文档上传，继续创建文档记录
    }

    // 提取标题
    const documentTitle =
      title ||
      parsedContent?.metadata.title ||
      file.originalname.replace(/\.[^/.]+$/, '');

    // 创建文档记录
    const document = await this.prisma.document.create({
      data: {
        title: documentTitle,
        contentType: this.mapMimeTypeToContentType(file.mimetype),
        content: parsedContent?.content || null,
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          ...parsedContent?.metadata,
        },
        documentType: documentType || null,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: uploadedBy || null,
        reviewStatus: 'pending',
        // datasourceId 为 null，表示手动上传的文档
        datasourceId: null,
        externalId: documentId, // 使用 documentId 作为 externalId
      },
    });

    // 创建第一个版本
    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        content: parsedContent?.content || null,
        metadata: (parsedContent?.metadata || {}) as Prisma.InputJsonValue,
        uploadedBy: uploadedBy || 'system',
      },
    });

    // 创建审核记录（文档上传后进入待审核状态）
    try {
      await this.prisma.contentReview.create({
        data: {
          documentId: document.id,
          status: 'pending',
        },
      });
      this.logger.log(
        `Content review record created for document ${document.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create review record for document ${document.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 审核记录创建失败不影响文档上传
    }

    // 注意：文档索引将在审核通过后触发，而不是上传时

    this.logger.log(`Document uploaded: ${document.id}`);

    return {
      id: document.id,
      title: document.title,
      documentType: document.documentType ?? null,
      filePath: document.filePath ?? null,
      fileSize: document.fileSize ?? null,
      mimeType: document.mimeType ?? null,
      uploadedAt: document.syncedAt,
    };
  }

  /**
   * 验证文件
   */
  private validateFile(file: Express.Multer.File) {
    // 验证文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // 验证文件类型
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * 生成文档 ID
   */
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 映射 MIME 类型到内容类型
   */
  private mapMimeTypeToContentType(mimeType: string): string {
    const mapping: Record<string, string> = {
      'text/markdown': 'markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'word',
      'application/pdf': 'pdf',
      'image/png': 'image',
      'image/jpeg': 'image',
      'image/jpg': 'image',
      'image/svg+xml': 'image',
    };
    return mapping[mimeType] || 'unknown';
  }

  /**
   * 查询文档列表
   */
  async getDocuments(
    query: DocumentQueryDto,
    userId?: string,
  ): Promise<{
    documents: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      type,
      page = 1,
      limit = 20,
      search,
      tags,
      startDate,
      endDate,
      sort = SortField.CREATED_AT,
      order = SortOrder.DESC,
    } = query;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.DocumentWhereInput = {
      deletedAt: null, // 只查询未删除的文档
    };

    // 文档类型筛选
    if (type) {
      where.documentType = type;
    }

    // 标题搜索
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // 时间范围筛选
    if (startDate || endDate) {
      where.syncedAt = {};
      if (startDate) {
        where.syncedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.syncedAt.lte = new Date(endDate);
      }
    }

    // 标签筛选
    if (tags) {
      const tagNames = tags.split(',').map((t) => t.trim());
      where.tagRelations = {
        some: {
          tag: {
            name: {
              in: tagNames,
            },
          },
        },
      };
    }

    // 权限控制：产品角色只能查看自己上传的文档
    if (userId) {
      where.uploadedBy = userId;
    }

    // 排序
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {};
    if (sort === SortField.CREATED_AT) {
      orderBy.syncedAt = order;
    } else if (sort === SortField.UPDATED_AT) {
      orderBy.updatedAt = order;
    } else if (sort === SortField.TITLE) {
      orderBy.title = order;
    }

    // 查询文档
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tagRelations: {
            include: {
              tag: true,
            },
          },
          versions: {
            orderBy: {
              version: 'desc',
            },
            take: 1, // 只获取最新版本
          },
          designDocument: {
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        contentType: doc.contentType,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        syncedAt: doc.syncedAt,
        updatedAt: doc.updatedAt,
        filePath: doc.filePath,
        imageUrl: doc.documentType === 'design' ? this.getImageUrl(doc.filePath) : null,
        tags: doc.tagRelations.map((tr) => ({
          id: tr.tag.id,
          name: tr.tag.name,
          color: tr.tag.color,
        })),
        latestVersion: doc.versions[0]
          ? {
              version: doc.versions[0].version,
              uploadedAt: doc.versions[0].uploadedAt,
            }
          : null,
        // 设计资源特有信息
        ...(doc.documentType === 'design' && doc.designDocument
          ? {
              prdId: doc.designDocument.prdId,
              prdTitle: doc.designDocument.document?.title,
              imageWidth: doc.designDocument.width,
              imageHeight: doc.designDocument.height,
            }
          : {}),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取文档详情
   */
  async getDocumentById(documentId: string, userId?: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
      include: {
        tagRelations: {
          include: {
            tag: true,
          },
        },
        versions: {
          orderBy: {
            version: 'desc',
          },
        },
        designDocument: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    return {
      id: document.id,
      title: document.title,
      content: document.content,
      documentType: document.documentType,
      contentType: document.contentType,
      filePath: document.filePath,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedBy: document.uploadedBy,
      syncedAt: document.syncedAt,
      updatedAt: document.updatedAt,
      metadata: document.metadata,
      tags: document.tagRelations.map((tr) => ({
        id: tr.tag.id,
        name: tr.tag.name,
        color: tr.tag.color,
        description: tr.tag.description,
      })),
      versions: document.versions.map((v) => ({
        version: v.version,
        content: v.content,
        metadata: v.metadata,
        uploadedBy: v.uploadedBy,
        uploadedAt: v.uploadedAt,
      })),
      // 设计资源特有信息
      ...(document.documentType === 'design'
        ? {
            imageUrl: this.getImageUrl(document.filePath),
            thumbnailUrl: document.designDocument?.thumbnailUrl
              ? this.getImageUrl(document.designDocument.thumbnailUrl)
              : null,
            imageWidth: document.designDocument?.width || null,
            imageHeight: document.designDocument?.height || null,
            prdId: document.designDocument?.prdId || null,
            prdTitle: document.designDocument?.document?.title || null,
          }
        : {}),
    };
  }

  /**
   * 更新文档
   */
  async updateDocument(
    documentId: string,
    dto: UpdateDocumentDto,
    userId?: string,
  ) {
    // 检查文档是否存在
    const existingDocument = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
    });

    if (!existingDocument) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // 获取当前最大版本号
    const latestVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // 更新文档
    const updateData: Prisma.DocumentUpdateInput = {};
    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }
    if (dto.content !== undefined) {
      updateData.content = dto.content;
    }
    if (dto.documentType !== undefined) {
      updateData.documentType = dto.documentType;
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });

    // 创建新版本
    if (dto.content !== undefined || dto.title !== undefined) {
      await this.prisma.documentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          content: dto.content ?? existingDocument.content,
          metadata: existingDocument.metadata as Prisma.InputJsonValue,
          uploadedBy: userId || existingDocument.uploadedBy || 'system',
        },
      });
    }

    // 更新标签
    if (dto.tagIds !== undefined) {
      // 删除现有标签关系
      await this.prisma.documentTagRelation.deleteMany({
        where: { documentId },
      });

      // 创建新的标签关系
      if (dto.tagIds.length > 0) {
        await this.prisma.documentTagRelation.createMany({
          data: dto.tagIds.map((tagId) => ({
            documentId,
            tagId,
          })),
        });
      }
    }

    // 更新 PRD 关联（如果文档是设计稿）
    if (dto.prdId !== undefined && existingDocument.documentType === 'design') {
      if (dto.prdId) {
        // 关联 PRD
        await this.linkPRDToDesign(documentId, dto.prdId, userId);
      } else {
        // 取消关联
        await this.unlinkPRDFromDesign(documentId, userId);
      }
    }

    // 如果内容更新，重新索引
    if (dto.content !== undefined) {
      try {
        await this.documentIndexingTaskService.createDocumentIndexingTask(
          documentId,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to re-index document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      id: updatedDocument.id,
      title: updatedDocument.title,
      documentType: updatedDocument.documentType,
      updatedAt: updatedDocument.updatedAt,
    };
  }

  /**
   * 删除文档（软删除）
   */
  async deleteDocument(documentId: string, userId?: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // 软删除
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
      },
    });

    // 删除向量数据库中的索引
    try {
      await this.documentIndexingService.deleteDocumentIndex(documentId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete index for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return { success: true };
  }

  /**
   * 获取所有标签
   */
  async getAllTags() {
    const tags = await this.prisma.documentTag.findMany({
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color,
      createdAt: tag.createdAt,
    }));
  }

  /**
   * 为文档添加标签
   */
  async addTagToDocument(
    documentId: string,
    tagId: string,
    userId?: string,
  ) {
    // 检查文档是否存在
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // 检查标签是否存在
    const tag = await this.prisma.documentTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    // 检查关系是否已存在
    const existingRelation = await this.prisma.documentTagRelation.findUnique({
      where: {
        documentId_tagId: {
          documentId,
          tagId,
        },
      },
    });

    if (existingRelation) {
      return { success: true, message: 'Tag already added' };
    }

    // 创建标签关系
    await this.prisma.documentTagRelation.create({
      data: {
        documentId,
        tagId,
      },
    });

    return { success: true };
  }

  /**
   * 从文档删除标签
   */
  async removeTagFromDocument(
    documentId: string,
    tagId: string,
    userId?: string,
  ) {
    // 检查文档是否存在
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // 删除标签关系
    await this.prisma.documentTagRelation.deleteMany({
      where: {
        documentId,
        tagId,
      },
    });

    return { success: true };
  }

  /**
   * 关联 PRD 到设计稿
   */
  async linkPRDToDesign(
    designDocumentId: string,
    prdId: string,
    userId?: string,
  ) {
    // 检查设计稿是否存在
    const designDoc = await this.prisma.document.findFirst({
      where: {
        id: designDocumentId,
        documentType: 'design',
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
    });

    if (!designDoc) {
      throw new NotFoundException(
        `Design document ${designDocumentId} not found`,
      );
    }

    // 检查 PRD 是否存在
    const prdDoc = await this.prisma.document.findFirst({
      where: {
        id: prdId,
        documentType: 'prd',
        deletedAt: null,
      },
    });

    if (!prdDoc) {
      throw new NotFoundException(`PRD document ${prdId} not found`);
    }

    // 创建或更新 DesignDocument 记录
    // 如果 DesignDocument 不存在，需要创建；如果存在，只更新 prdId
    const existingDesignDoc = await this.prisma.designDocument.findUnique({
      where: { documentId: designDocumentId },
    });

    let designDocument;
    if (existingDesignDoc) {
      // 更新现有记录
      designDocument = await this.prisma.designDocument.update({
        where: { documentId: designDocumentId },
        data: { prdId },
      });
    } else {
      // 创建新记录
      designDocument = await this.prisma.designDocument.create({
        data: {
          documentId: designDocumentId,
          prdId,
          imageUrl: designDoc.filePath || '',
        },
      });
    }

    return { success: true, designDocument };
  }

  /**
   * 取消设计稿与 PRD 的关联
   */
  async unlinkPRDFromDesign(
    designDocumentId: string,
    userId?: string,
  ) {
    // 检查设计稿是否存在
    const designDoc = await this.prisma.document.findFirst({
      where: {
        id: designDocumentId,
        documentType: 'design',
        deletedAt: null,
        ...(userId ? { uploadedBy: userId } : {}),
      },
    });

    if (!designDoc) {
      throw new NotFoundException(
        `Design document ${designDocumentId} not found`,
      );
    }

    // 删除关联关系
    await this.prisma.designDocument.deleteMany({
      where: { documentId: designDocumentId },
    });

    return { success: true };
  }

  /**
   * 获取设计稿的图片 URL
   */
  getImageUrl(filePath: string | null): string | null {
    if (!filePath) return null;
    // 这里应该返回完整的图片访问 URL
    // 暂时返回相对路径，后续可以根据配置生成完整 URL
    const baseUrl = process.env.FILE_SERVE_BASE_URL || '';
    return baseUrl ? `${baseUrl}/${filePath}` : `/uploads/${filePath}`;
  }
}

