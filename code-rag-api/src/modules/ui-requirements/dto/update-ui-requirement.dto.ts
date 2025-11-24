import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UIRequirementPriority, UIRequirementStatus } from './create-ui-requirement.dto';

export class UpdateUIRequirementDto {
  @ApiProperty({
    description: 'UI 需求描述',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '优先级',
    enum: UIRequirementPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(UIRequirementPriority)
  priority?: UIRequirementPriority;

  @ApiProperty({
    description: '状态',
    enum: UIRequirementStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UIRequirementStatus)
  status?: UIRequirementStatus;
}

