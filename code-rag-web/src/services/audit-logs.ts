import apiClient from './api';

export interface AuditLogItem {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  actionType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogStats {
  total: number;
  byActionType: Array<{
    actionType: string;
    count: number;
  }>;
  byResourceType: Array<{
    resourceType: string;
    count: number;
  }>;
  byUser: Array<{
    userId: string;
    count: number;
    lastActionAt: string | null;
  }>;
  timeRange: {
    startDate?: string;
    endDate?: string;
  };
}

export interface QueryAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
}

export const auditLogsApi = {
  /**
   * 查询审计日志
   */
  async getAuditLogs(params?: QueryAuditLogsParams): Promise<AuditLogListResponse> {
    return apiClient.get('/api/v1/audit-logs', { params });
  },

  /**
   * 获取审计日志统计
   */
  async getAuditLogStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogStats> {
    return apiClient.get('/api/v1/audit-logs/stats', { params });
  },

  /**
   * 导出审计日志（CSV）
   */
  async exportCsv(params?: QueryAuditLogsParams): Promise<Blob> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const token = localStorage.getItem('token');
    const response = await fetch(`${baseUrl}/api/v1/audit-logs/export/csv?${queryParams.toString()}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    if (!response.ok) {
      throw new Error('导出失败');
    }
    return response.blob();
  },

  /**
   * 导出审计日志（PDF/JSON）
   */
  async exportPdf(params?: QueryAuditLogsParams): Promise<Blob> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const token = localStorage.getItem('token');
    const response = await fetch(`${baseUrl}/api/v1/audit-logs/export/pdf?${queryParams.toString()}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    if (!response.ok) {
      throw new Error('导出失败');
    }
    return response.blob();
  },
};

