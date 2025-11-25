import apiClient from './api';

export interface SearchStatistics {
  searchCounts: {
    total: number;
    byTime: Array<{ period: string; count: number }>;
    byRole: Array<{ role: string; count: number }>;
    byUser: Array<{ userId: string; userName?: string; count: number }>;
  };
  hitRate: {
    overall: number;
    byRole: Array<{ role: string; rate: number; total: number; hits: number }>;
    trend: Array<{ date: string; rate: number }>;
  };
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
    distribution: Array<{ range: string; count: number }>;
  };
  popularQueries: Array<{ query: string; count: number }>;
  resultDistribution: {
    code: number;
    document: number;
    design: number;
    other: number;
  };
}

export interface UserActivityStatistics {
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
    dauTrend: Array<{ date: string; count: number }>;
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
    trend: Array<{ date: string; day1: number; day7: number; day30: number }>;
  };
  frequencyDistribution: {
    active: number;
    normal: number;
    low: number;
    inactive: number;
  };
  byRole: Array<{
    role: string;
    dau: number;
    wau: number;
    mau: number;
    totalUsers: number;
  }>;
}

export const reportsApi = {
  /**
   * 获取检索统计
   */
  async getSearchStatistics(
    startDate?: string,
    endDate?: string,
    role?: string,
    userId?: string,
  ): Promise<SearchStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (role) params.append('role', role);
    if (userId) params.append('userId', userId);

    return apiClient.get(
      `/api/v1/reports/search${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  /**
   * 导出检索统计为 CSV
   */
  async exportSearchStatisticsCsv(
    startDate?: string,
    endDate?: string,
    role?: string,
    userId?: string,
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (role) params.append('role', role);
    if (userId) params.append('userId', userId);

    const response = await fetch(
      `${apiClient.defaults.baseURL}/api/v1/reports/search/export/csv${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      },
    );

    return response.blob();
  },

  /**
   * 获取用户活跃度统计
   */
  async getUserActivity(
    startDate?: string,
    endDate?: string,
  ): Promise<UserActivityStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get(
      `/api/v1/reports/user-activity${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  /**
   * 导出用户活跃度统计为 CSV
   */
  async exportUserActivityCsv(
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${apiClient.defaults.baseURL}/api/v1/reports/user-activity/export/csv${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      },
    );

    return response.blob();
  },
};

