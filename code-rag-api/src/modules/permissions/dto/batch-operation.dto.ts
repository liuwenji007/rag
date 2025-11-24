import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsObject, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum BatchOperationType {
  ASSIGN_ROLES = 'assign_roles',
  UPDATE_PERMISSIONS = 'update_permissions',
}

export class BatchOperationData {
  @ApiProperty({
    description: '角色 ID 列表（用于 assign_roles 操作）',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsString({ each: true })
  roleIds?: string[];

  @ApiProperty({
    description: '权限 ID 列表（用于 update_permissions 操作）',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsString({ each: true })
  permissionIds?: string[];
}

export class BatchOperationDto {
  @ApiProperty({
    description: '操作类型',
    enum: BatchOperationType,
    example: BatchOperationType.ASSIGN_ROLES,
  })
  @IsEnum(BatchOperationType)
  operation!: BatchOperationType;

  @ApiProperty({
    description: '目标 ID 列表（用户 ID 或角色 ID）',
    type: [String],
    example: ['user_123', 'user_456'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  targetIds!: string[];

  @ApiProperty({
    description: '操作数据',
    type: BatchOperationData,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BatchOperationData)
  data!: BatchOperationData;
}

