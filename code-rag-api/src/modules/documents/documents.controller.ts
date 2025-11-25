import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { AuditLogService, ActionType, ResourceType } from '../audit-logs/audit-log.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @Roles('admin', 'product', 'ui')
  @ApiOperation({
    summary: '上传文档',
    description: '支持上传 Markdown、Word、PDF、图片等格式的文档。文件大小限制为 50MB。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
        documentType: {
          type: 'string',
          enum: ['prd', 'design', 'knowledge'],
          description: '文档类型（可选）',
        },
        title: {
          type: 'string',
          description: '文档标题（可选，默认使用文件名）',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '文档上传成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'doc_1234567890_abc123' },
            title: { type: 'string', example: '产品需求文档' },
            documentType: { type: 'string', enum: ['prd', 'design', 'knowledge'], nullable: true },
            filePath: { type: 'string', example: '2025/11/doc_1234567890_abc123/example.docx' },
            fileSize: { type: 'number', example: 1024000 },
            mimeType: { type: 'string', example: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            uploadedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '文件验证失败' })
  @ApiResponse({ status: 413, description: '文件大小超过限制' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new Error('File is required');
    }

    const result = await this.documentsService.uploadDocument(
      file,
      dto.documentType,
      dto.title,
      userId,
    );

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.DOCUMENT_UPLOAD,
        resourceType: ResourceType.DOCUMENT,
        resourceId: result.id,
        details: {
          title: result.title,
          documentType: dto.documentType || null,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileName: file.originalname,
        },
        ipAddress: req?.ip || (req as any)?.socket?.remoteAddress || undefined,
        userAgent: (req?.headers as any)?.['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询文档列表',
    description: '支持按类型、标题、标签、时间范围等条件筛选，支持分页和排序。',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            documents: { type: 'array', items: { type: 'object' } },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async getDocuments(
    @Query() query: DocumentQueryDto,
    @Request() req: { user?: { id?: string; roles?: string[] } },
  ) {
    const userId = req.user?.id;
    const userRoles = req.user?.roles;
    return this.documentsService.getDocuments(query, userId, userRoles);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取文档详情',
    description: '获取文档的完整信息，包括内容、元信息、版本历史等。',
  })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async getDocumentById(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.documentsService.getDocumentById(id, userId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新文档',
    description: '更新文档标题、内容、类型或标签。内容更新时会创建新版本并重新索引。',
  })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    const result = await this.documentsService.updateDocument(id, dto, userId);

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.DOCUMENT_UPDATE,
        resourceType: ResourceType.DOCUMENT,
        resourceId: id,
        details: {
          changes: dto,
        },
        ipAddress: req?.ip || (req as any)?.socket?.remoteAddress || undefined,
        userAgent: (req?.headers as any)?.['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除文档',
    description: '软删除文档，保留历史记录。同时删除向量数据库中的索引。',
  })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async deleteDocument(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Request() req?: any,
  ) {
    const document = await this.documentsService.getDocumentById(id);
    const result = await this.documentsService.deleteDocument(id, userId);

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.DOCUMENT_DELETE,
        resourceType: ResourceType.DOCUMENT,
        resourceId: id,
        details: {
          title: document?.title,
          documentType: document?.documentType,
        },
        ipAddress: req?.ip || (req as any)?.socket?.remoteAddress || undefined,
        userAgent: (req?.headers as any)?.['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Get('tags/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取所有标签',
    description: '获取系统中所有可用的文档标签。',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  async getAllTags() {
    return this.documentsService.getAllTags();
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '为文档添加标签',
    description: '为指定文档添加一个标签。',
  })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tagId: { type: 'string', description: '标签 ID' },
      },
      required: ['tagId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '添加成功',
  })
  @ApiResponse({ status: 404, description: '文档或标签不存在' })
  async addTagToDocument(
    @Param('id') id: string,
    @Body('tagId') tagId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.documentsService.addTagToDocument(id, tagId, userId);
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '从文档删除标签',
    description: '从指定文档删除一个标签。',
  })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiParam({ name: 'tagId', description: '标签 ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async removeTagFromDocument(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.documentsService.removeTagFromDocument(id, tagId, userId);
  }

  @Post(':id/link-prd')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '关联 PRD 到设计稿',
    description: '将指定的 PRD 文档关联到设计稿。',
  })
  @ApiParam({ name: 'id', description: '设计稿文档 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prdId: { type: 'string', description: 'PRD 文档 ID' },
      },
      required: ['prdId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '关联成功',
  })
  @ApiResponse({ status: 404, description: '设计稿或 PRD 不存在' })
  async linkPRDToDesign(
    @Param('id') id: string,
    @Body('prdId') prdId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.documentsService.linkPRDToDesign(id, prdId, userId);
  }

  @Delete(':id/unlink-prd')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消设计稿与 PRD 的关联',
    description: '取消设计稿与 PRD 文档的关联关系。',
  })
  @ApiParam({ name: 'id', description: '设计稿文档 ID' })
  @ApiResponse({
    status: 200,
    description: '取消关联成功',
  })
  @ApiResponse({ status: 404, description: '设计稿不存在' })
  async unlinkPRDFromDesign(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.documentsService.unlinkPRDFromDesign(id, userId);
  }
}

