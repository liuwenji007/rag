import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from './upload-document.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
}

export class DocumentQueryDto {
  @ApiProperty({
    description: '文档类型',
    enum: DocumentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiProperty({
    description: '页码',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    description: '搜索关键词（标题）',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '标签列表（逗号分隔）',
    required: false,
    example: 'tag1,tag2',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({
    description: '开始日期（ISO 8601）',
    required: false,
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期（ISO 8601）',
    required: false,
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: '排序字段',
    enum: SortField,
    required: false,
    default: SortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortField)
  sort?: SortField = SortField.CREATED_AT;

  @ApiProperty({
    description: '排序顺序',
    enum: SortOrder,
    required: false,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}

