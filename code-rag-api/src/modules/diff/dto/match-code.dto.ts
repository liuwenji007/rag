import { IsString, IsOptional, IsNumber, IsArray, Min, Max, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchCodeDto {
  @ApiProperty({
    description: '变更点描述（单个变更点）',
    example: '实现用户登录功能',
    minLength: 5,
  })
  @IsString()
  @MinLength(5, { message: '变更点描述至少需要 5 个字符' })
  changePoint!: string;

  @ApiPropertyOptional({
    description: '返回结果数量',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;

  @ApiPropertyOptional({
    description: '最小相似度阈值',
    example: 0.6,
    minimum: 0,
    maximum: 1,
    default: 0.6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({
    description: '数据源 ID 列表（筛选特定数据源）',
    example: ['datasource-id-1', 'datasource-id-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  datasourceIds?: string[];
}

export class MatchCodeBatchDto {
  @ApiProperty({
    description: '变更点描述列表（多个变更点）',
    example: ['实现用户登录功能', '添加密码加密'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @IsString({ each: true })
  @MinLength(5, { each: true, message: '每个变更点描述至少需要 5 个字符' })
  changePoints!: string[];

  @ApiPropertyOptional({
    description: '返回结果数量（每个变更点）',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;

  @ApiPropertyOptional({
    description: '最小相似度阈值',
    example: 0.6,
    minimum: 0,
    maximum: 1,
    default: 0.6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({
    description: '数据源 ID 列表（筛选特定数据源）',
    example: ['datasource-id-1', 'datasource-id-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  datasourceIds?: string[];
}

