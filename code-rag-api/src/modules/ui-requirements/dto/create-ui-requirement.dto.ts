import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum UIRequirementPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum UIRequirementStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export class CreateUIRequirementDto {
  @ApiProperty({
    description: 'PRD 段落标识（可选，用于定位到具体段落）',
    required: false,
  })
  @IsOptional()
  @IsString()
  paragraphId?: string;

  @ApiProperty({
    description: 'UI 需求描述',
    required: true,
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: '优先级',
    enum: UIRequirementPriority,
    required: false,
    default: UIRequirementPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(UIRequirementPriority)
  priority?: UIRequirementPriority;
}

