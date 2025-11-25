import apiClient from './api';

export interface DashboardOverview {
  datasources: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    totalDocuments: number;
    totalCodeFiles: number;
    lastSyncTime: string | null;
  };
  search: {
    totalSearches: number;
    hitRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    searchesByDay: Array<{ date: string; count: number }>;
  };
  userActivity: {
    dau: number;
    wau: number;
    mau: number;
    activeUsersByDay: Array<{ date: string; count: number }>;
  };
  adoption: {
    overallRate: number;
    trend: Array<{ date: string; rate: number }>;
    byRole: Array<{ role: string; rate: number; count: number }>;
  };
  feedback: {
    positiveRate: number;
    negativeRate: number;
    totalFeedbacks: number;
    topComments: Array<{ comment: string; count: number }>;
  };
}

export const dashboardApi = {
  /**
   * 获取看板概览数据
   */
  async getOverview(
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardOverview> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get(
      `/api/v1/dashboard/overview${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },
};

