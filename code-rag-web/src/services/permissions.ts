import apiClient from './api';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface PermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Array<{
    roleId: string;
    roleName: string;
    roleDescription?: string;
    permissions: Array<{
      permissionId: string;
      permissionCode: string;
      permissionName: string;
      permissionCategory?: string;
      granted: boolean;
    }>;
  }>;
}

export interface UserWithRoles {
  id: string;
  email: string;
  name?: string;
  roles: Role[];
  createdAt: string;
}

export interface PermissionChangeLog {
  id: string;
  changedBy: {
    id: string;
    email: string;
    name?: string;
  };
  changeType: string;
  targetType: string;
  targetId: string;
  permissionId?: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
  createdAt: string;
}

export const permissionsApi = {
  /**
   * 获取权限矩阵
   */
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    return apiClient.get('/api/v1/permissions/matrix');
  },

  /**
   * 更新角色权限
   */
  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<{ success: boolean }> {
    return apiClient.put(`/api/v1/permissions/roles/${roleId}`, { permissionIds });
  },

  /**
   * 获取用户列表（带角色）
   */
  async getUsersWithRoles(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    users: UserWithRoles[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return apiClient.get('/api/v1/permissions/users', { params });
  },

  /**
   * 更新用户角色
   */
  async updateUserRoles(userId: string, roleIds: string[]): Promise<{ success: boolean }> {
    return apiClient.put(`/api/v1/permissions/users/${userId}/roles`, { roleIds });
  },

  /**
   * 批量操作
   */
  async batchOperation(
    operation: 'assign_roles' | 'update_permissions',
    targetIds: string[],
    data: { roleIds?: string[]; permissionIds?: string[] },
  ): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
    return apiClient.post('/api/v1/permissions/batch', {
      operation,
      targetIds,
      data,
    });
  },

  /**
   * 获取权限变更日志
   */
  async getPermissionChangeLog(params?: {
    page?: number;
    limit?: number;
    targetType?: string;
    targetId?: string;
  }): Promise<{
    logs: PermissionChangeLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return apiClient.get('/api/v1/permissions/changelog', { params });
  },
};

