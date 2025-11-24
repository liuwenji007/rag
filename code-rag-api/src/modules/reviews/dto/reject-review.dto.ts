import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectReviewDto {
  @ApiProperty({
    description: '退回原因（必填）',
    required: true,
  })
  @IsString()
  @MinLength(5, { message: '退回原因至少需要 5 个字符' })
  reason!: string;
}

