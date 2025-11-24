import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { DocumentType } from './upload-document.dto';

export class UpdateDocumentDto {
  @ApiProperty({
    description: '文档标题',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: '文档内容',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: '文档类型',
    enum: DocumentType,
    required: false,
  })
  @IsOptional()
  documentType?: DocumentType;

  @ApiProperty({
    description: '标签 ID 列表',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiProperty({
    description: '关联的 PRD 文档 ID（仅用于设计稿）',
    required: false,
  })
  @IsOptional()
  @IsString()
  prdId?: string;
}

