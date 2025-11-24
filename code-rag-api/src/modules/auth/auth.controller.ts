import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '用户注册',
    description: '注册新用户账号，使用邮箱和密码。',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 201 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: '张三' },
                roles: { type: 'array', items: { type: 'string' }, example: [] },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: '邮箱已被注册' })
  async register(
    @Body() dto: RegisterDto,
    @Request() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const ipAddress = req.ip || (req.headers?.['x-forwarded-for'] as string | undefined) || undefined;
    const userAgent = (req.headers?.['user-agent'] as string | undefined) || undefined;
    return this.authService.register(dto, ipAddress, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户登录',
    description: '使用邮箱和密码登录，返回 JWT token。',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: '张三' },
                roles: { type: 'array', items: { type: 'string' }, example: [] },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  async login(
    @Body() dto: LoginDto,
    @Request() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const ipAddress = req.ip || (req.headers?.['x-forwarded-for'] as string | undefined) || undefined;
    const userAgent = (req.headers?.['user-agent'] as string | undefined) || undefined;
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '获取当前登录用户的详细信息，需要 JWT token。',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取用户信息',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getCurrentUser(@Request() req: { user: { id: string } }) {
    return this.authService.getCurrentUser(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户登出',
    description: '登出当前用户（客户端需要删除 token）。',
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
  })
  async logout() {
    // JWT 是无状态的，登出主要是客户端删除 token
    // 如果需要服务端登出，可以实现 token 黑名单机制
    return { success: true, message: '登出成功' };
  }
}

