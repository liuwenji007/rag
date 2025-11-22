import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, Min, Max, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
}

export class GenerateTodosDto {
  @ApiProperty({
    description: '需求描述',
    example: '需要实现用户登录功能，支持手机号和邮箱登录，并添加记住密码功能',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: '需求描述至少需要 10 个字符' })
  requirement!: string;

  @ApiPropertyOptional({
    description: '是否包含代码匹配结果',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCodeMatches?: boolean;

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
    description: '导出格式',
    enum: ExportFormat,
    example: ExportFormat.JSON,
    default: ExportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;
}

