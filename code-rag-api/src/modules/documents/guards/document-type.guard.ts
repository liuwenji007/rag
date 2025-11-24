import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DOCUMENT_TYPE_KEY } from '../decorators/document-type.decorator';

@Injectable()
export class DocumentTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredDocumentTypes = this.reflector.getAllAndOverride<string[]>(
      DOCUMENT_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredDocumentTypes) {
      // 如果没有指定文档类型要求，允许访问
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const documentType = request.query?.type || request.body?.documentType;

    if (!user) {
      throw new ForbiddenException('用户未登录');
    }

    const userRoles = user.roles || [];

    // 管理员拥有所有权限
    if (userRoles.includes('admin')) {
      return true;
    }

    // 检查文档类型权限
    if (documentType === 'prd' || documentType === 'PRD') {
      // PRD 文档：仅产品和管理员可以访问
      if (!userRoles.includes('product')) {
        throw new ForbiddenException('产品角色才能访问 PRD 文档');
      }
    } else if (documentType === 'design' || documentType === 'DESIGN') {
      // 设计稿：仅 UI 和管理员可以访问
      if (!userRoles.includes('ui')) {
        throw new ForbiddenException('UI 角色才能访问设计稿');
      }
    }

    return true;
  }
}

