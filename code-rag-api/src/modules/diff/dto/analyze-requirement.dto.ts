import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeRequirementDto {
  @ApiProperty({
    description: '需求描述文本',
    example: '需要实现用户登录功能，支持手机号和邮箱登录，并添加记住密码功能',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: '需求描述至少需要 10 个字符' })
  requirement!: string;
}

