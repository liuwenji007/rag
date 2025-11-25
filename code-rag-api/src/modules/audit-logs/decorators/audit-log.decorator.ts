import { SetMetadata } from '@nestjs/common';
import { ActionType, ResourceType } from '../audit-log.service';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  actionType: ActionType;
  resourceType?: ResourceType;
  resourceIdParam?: string; // 从请求参数中获取资源 ID 的参数名
  detailsExtractor?: (request: any) => Record<string, any>; // 从请求中提取详情
}

export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);

