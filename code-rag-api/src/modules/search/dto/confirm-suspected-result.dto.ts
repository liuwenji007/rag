import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class ConfirmSuspectedResultDto {
  @ApiProperty({
    description: '检索历史 ID',
    example: 'search-history-id-123',
  })
  @IsString()
  searchHistoryId!: string;

  @ApiProperty({
    description: '检索结果索引（从 0 开始）',
    example: 0,
  })
  @IsInt()
  resultIndex!: number;

  @ApiProperty({
    description: '是否确认有效（true: 确认有效, false: 拒绝）',
    example: true,
  })
  @IsBoolean()
  confirmed!: boolean;

  @ApiProperty({
    description: '确认意见（可选）',
    example: '这个结果确实有效，符合我的需求',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

