import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: '权限 ID 列表',
    type: [String],
    example: ['perm_123', 'perm_456'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}

