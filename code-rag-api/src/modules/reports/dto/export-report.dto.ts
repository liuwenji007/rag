import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ReportFormat, ReportType } from '../report-export.service';

export class ExportReportDto {
  @ApiProperty({
    description: '报表类型',
    enum: ReportType,
    isArray: true,
    example: [ReportType.ALL],
  })
  @IsArray()
  @IsEnum(ReportType, { each: true })
  types!: ReportType[];

  @ApiProperty({
    description: '导出格式',
    enum: ReportFormat,
    example: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @ApiProperty({
    description: '开始日期（ISO 8601 格式）',
    required: false,
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期（ISO 8601 格式）',
    required: false,
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: '是否包含图表（PDF/Excel）',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiProperty({
    description: '是否包含摘要说明',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean;
}

