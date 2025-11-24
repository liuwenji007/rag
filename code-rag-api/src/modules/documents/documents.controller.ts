import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
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

    return result;
  }
}

