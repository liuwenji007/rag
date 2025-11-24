import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeDiffDto {
  @ApiProperty({
    description: '需求描述',
    example: '需要实现用户登录功能，支持手机号和邮箱登录，并添加记住密码功能',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: '需求描述至少需要 10 个字符' })
  requirement!: string;

  @ApiPropertyOptional({
    description: '用户角色（用于角色权重计算）',
    example: 'developer',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: '是否包含代码匹配结果',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCodeMatches?: boolean;

  @ApiPropertyOptional({
    description: '是否包含 PRD 片段',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includePRDFragments?: boolean;

  @ApiPropertyOptional({
    description: '是否包含差异总结',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean;

  @ApiPropertyOptional({
    description: '是否包含待办列表',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeTodos?: boolean;

  @ApiPropertyOptional({
    description: '代码匹配结果数量（每个变更点）',
    example: 5,
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  codeMatchTopK?: number;

  @ApiPropertyOptional({
    description: 'PRD 片段数量',
    example: 5,
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  prdTopK?: number;
}

