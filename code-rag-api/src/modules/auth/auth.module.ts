import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { RoleInitService } from './services/role-init.service';
import { PermissionInitService } from './services/permission-init.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' }, // token 有效期 7 天
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, RoleInitService, PermissionInitService, PrismaService],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}

