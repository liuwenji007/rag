import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: '角色 ID 列表',
    type: [String],
    example: ['role_123', 'role_456'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}

