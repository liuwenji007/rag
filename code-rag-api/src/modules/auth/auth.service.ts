import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name || null,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 记录登录日志
    await this.recordLoginLog(
      user.id,
      'password',
      true,
      ipAddress,
      userAgent,
    );

    // 生成 JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
      },
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      await this.recordLoginLog(
        dto.email, // 使用邮箱作为临时 ID
        'password',
        false,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    if (!user.password) {
      await this.recordLoginLog(
        user.id,
        'password',
        false,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('该账号未设置密码，请使用 SSO 登录');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.recordLoginLog(
        user.id,
        'password',
        false,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 记录登录日志
    await this.recordLoginLog(
      user.id,
      'password',
      true,
      ipAddress,
      userAgent,
    );

    // 生成 JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
      },
    };
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }

  /**
   * 生成 JWT token
   */
  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  /**
   * 记录登录日志
   */
  private async recordLoginLog(
    userIdOrEmail: string,
    loginType: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // 如果是邮箱，尝试查找用户 ID
      let userId: string | null = null;
      if (success || loginType !== 'password') {
        // 成功登录或非密码登录，userIdOrEmail 应该是用户 ID
        userId = userIdOrEmail;
      } else {
        // 失败登录，可能是邮箱
        const user = await this.prisma.user.findUnique({
          where: { email: userIdOrEmail },
          select: { id: true },
        });
        userId = user?.id || null;
      }

      if (userId) {
        await this.prisma.loginLog.create({
          data: {
            userId,
            loginType,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            success,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to record login log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 登录日志记录失败不影响登录流程
    }
  }
}

