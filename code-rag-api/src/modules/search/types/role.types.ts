/**
 * 用户角色类型
 */
export enum UserRole {
  DEVELOPER = 'developer',
  PRODUCT = 'product',
  UI = 'ui',
}

/**
 * 内容类型
 */
export type ContentType = 'code' | 'markdown' | 'database_schema' | 'document';

/**
 * 角色权重配置
 * 键：内容类型，值：权重系数
 */
type RoleWeightConfig = Record<ContentType, number>;

/**
 * 角色权重策略映射
 */
export const ROLE_WEIGHT_STRATEGIES: Record<UserRole, RoleWeightConfig> = {
  [UserRole.DEVELOPER]: {
    code: 1.5,
    markdown: 1.2, // 技术文档
    database_schema: 1.3,
    document: 0.8, // 其他文档
  },
  [UserRole.PRODUCT]: {
    document: 1.5, // PRD/需求文档
    markdown: 1.3, // 业务文档
    code: 0.7,
    database_schema: 0.9,
  },
  [UserRole.UI]: {
    document: 1.5, // 设计稿/交互说明
    markdown: 1.3, // UI 文档
    code: 1.1, // UI 组件代码
    database_schema: 0.5,
  },
};

/**
 * 获取角色权重
 */
export function getRoleWeight(
  role: UserRole | undefined,
  contentType: string,
): number {
  if (!role) {
    return 1.0; // 默认权重
  }

  const strategy = ROLE_WEIGHT_STRATEGIES[role];
  if (!strategy) {
    return 1.0;
  }

  // 将 contentType 映射到标准类型
  const normalizedType = normalizeContentType(contentType);
  return strategy[normalizedType] || 1.0;
}

/**
 * 标准化内容类型
 */
function normalizeContentType(contentType: string): ContentType {
  const lower = contentType.toLowerCase();
  
  if (lower === 'code') {
    return 'code';
  }
  if (lower === 'markdown' || lower.startsWith('markdown')) {
    return 'markdown';
  }
  if (lower === 'database_schema' || lower.includes('schema')) {
    return 'database_schema';
  }
  
  return 'document'; // 默认类型
}

