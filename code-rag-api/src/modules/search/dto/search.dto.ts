import { IsString, IsOptional, IsNumber, IsArray, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../types/role.types';

export class SearchDto {
  @ApiProperty({
    description: '检索查询文本',
    example: '如何实现用户登录功能',
  })
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    description: '返回结果数量（limit）',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  topK?: number;

  @ApiPropertyOptional({
    description: '置信度阈值（threshold）',
    example: 0.7,
    minimum: 0,
    maximum: 1,
    default: 0.7,
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

  @ApiPropertyOptional({
    description: '内容类型列表（筛选特定内容类型）',
    example: ['code', 'markdown'],
    type: [String],
    enum: ['code', 'markdown', 'database_schema', 'document'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentTypes?: string[];

  @ApiPropertyOptional({
    description: '用户角色（用于角色权重计算）',
    enum: UserRole,
    example: UserRole.DEVELOPER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

