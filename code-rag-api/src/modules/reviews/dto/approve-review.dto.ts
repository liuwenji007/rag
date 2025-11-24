import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveReviewDto {
  @ApiProperty({
    description: '审核备注（可选）',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

