import { ApiProperty } from '@nestjs/swagger';

/**
 * SSO 相关 DTO（预留接口）
 * 后续实现 SAML/OAuth2 认证时使用
 */

export class SSOInitiateDto {
  @ApiProperty({
    description: 'SSO 提供者类型',
    enum: ['saml', 'oauth2'],
    example: 'saml',
  })
  provider!: 'saml' | 'oauth2';
}

export class SSOCallbackDto {
  @ApiProperty({
    description: 'SSO 回调参数（由 SSO 提供者返回）',
    type: 'object',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params!: Record<string, any>;
}

