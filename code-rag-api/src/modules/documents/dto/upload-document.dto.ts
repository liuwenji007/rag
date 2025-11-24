import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum DocumentType {
  PRD = 'prd',
  DESIGN = 'design',
  KNOWLEDGE = 'knowledge',
}

export class UploadDocumentDto {
  @ApiProperty({
    description: '文档类型',
    enum: DocumentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({
    description: '文档标题（可选，默认使用文件名）',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;
}

