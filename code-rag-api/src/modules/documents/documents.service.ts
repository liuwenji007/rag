import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FileStorageService } from '../../services/file-storage/file-storage.service';
import { DocumentParserService } from '../../services/document-parser/document-parser.service';
import { Readable } from 'stream';
import { DocumentType } from './dto/upload-document.dto';

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
}

