import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class RefineSearchDto {
  @ApiProperty({
    description: '原始检索查询',
    example: '如何实现用户登录功能',
  })
  @IsString()
  originalQuery!: string;

  @ApiProperty({
    description: '补充信息',
    example: '需要支持手机号登录和邮箱登录',
  })
  @IsString()
  additionalContext!: string;

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
}

