import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, IsOptional, IsUUID, IsBoolean, Min } from 'class-validator';

export class SubmitResultFeedbackDto {
  @ApiProperty({
    description: '检索历史 ID',
    example: 'search_123',
  })
  @IsString()
  searchHistoryId!: string;

  @ApiProperty({
    description: '检索结果索引（从 0 开始）',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  resultIndex!: number;

  @ApiProperty({
    description: '文档 ID（可选）',
    example: 'doc_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({
    description: '采纳状态',
    enum: ['adopted', 'rejected'],
    example: 'adopted',
  })
  @IsEnum(['adopted', 'rejected'])
  adoptionStatus!: 'adopted' | 'rejected';

  @ApiProperty({
    description: '反馈意见（可选）',
    example: '这个结果很有用',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isSuspected?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

export class UpdateSearchHistoryFeedbackDto {
  @ApiProperty({
    description: '整体反馈意见（可选）',
    example: '检索结果整体质量不错',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: '整体采纳状态（可选）',
    enum: ['adopted', 'rejected'],
    example: 'adopted',
    required: false,
  })
  @IsOptional()
  @IsEnum(['adopted', 'rejected'])
  adoptionStatus?: 'adopted' | 'rejected';
}

