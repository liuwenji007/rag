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

export interface DatasourceUsageStatistics {
  searchCounts: {
    byType: Array<{ type: string; count: number; percentage: number }>;
    byDatasource: Array<{ datasourceId: string; datasourceName: string; type: string; count: number }>;
    trend: Array<{ date: string; feishu: number; gitlab: number; database: number }>;
  };
  hitRate: {
    byType: Array<{ type: string; rate: number; total: number; hits: number }>;
    byDatasource: Array<{ datasourceId: string; datasourceName: string; type: string; rate: number }>;
  };
  dataVolume: {
    byType: Array<{ type: string; documentCount: number; codeFileCount: number }>;
    byDatasource: Array<{ datasourceId: string; datasourceName: string; type: string; documentCount: number; codeFileCount: number }>;
    trend: Array<{ date: string; totalDocuments: number }>;
  };
  syncStatus: {
    byDatasource: Array<{
      datasourceId: string;
      datasourceName: string;
      type: string;
      syncCount: number;
      successCount: number;
      failedCount: number;
      successRate: number;
      avgDuration: number;
      lastSyncAt: string | null;
    }>;
  };
  health: {
    byDatasource: Array<{
      datasourceId: string;
      datasourceName: string;
      type: string;
      status: string;
      healthScore: number;
      connectionStatus: string;
      errorRate: number;
      lastSyncAt: string | null;
    }>;
  };
}

export interface BusinessProcessStatistics {
  deliveryCycle: {
    average: number;
    median: number;
    min: number;
    max: number;
    distribution: Array<{ range: string; count: number }>;
    trend: Array<{ date: string; averageCycle: number }>;
  };
  firstHitRate: {
    overall: number;
    byRole: Array<{ role: string; rate: number; total: number; hits: number }>;
    trend: Array<{ date: string; rate: number }>;
  };
  resolutionRate: {
    overall: number;
    byRound: Array<{ round: number; count: number; percentage: number }>;
    byRole: Array<{ role: string; rate: number; total: number; resolved: number }>;
  };
  timeReduction: {
    currentAverage: number;
    baselineAverage?: number;
    reductionPercentage?: number;
    target: number;
    achievement: number;
  };
  timeRange: {
    startDate: string;
    endDate: string;
  };
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

  /**
   * 获取数据源使用情况统计
   */
  async getDatasourceUsage(
    startDate?: string,
    endDate?: string,
  ): Promise<DatasourceUsageStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get(
      `/api/v1/reports/datasource-usage${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  /**
   * 导出数据源使用情况统计为 CSV
   */
  async exportDatasourceUsageCsv(
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${apiClient.defaults.baseURL}/api/v1/reports/datasource-usage/export/csv${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      },
    );

    return response.blob();
  },

  /**
   * 获取业务流程完成时间统计
   */
  async getBusinessProcess(
    startDate?: string,
    endDate?: string,
  ): Promise<BusinessProcessStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get(
      `/api/v1/reports/business-process${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  /**
   * 导出业务流程完成时间统计为 CSV
   */
  async exportBusinessProcessCsv(
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${apiClient.defaults.baseURL}/api/v1/reports/business-process/export/csv${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      },
    );

    return response.blob();
  },
};

