import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @ApiProperty({
    description: '用户密码（至少 6 个字符）',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: '密码至少需要 6 个字符' })
  password!: string;

  @ApiProperty({
    description: '用户姓名（可选）',
    example: '张三',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}

