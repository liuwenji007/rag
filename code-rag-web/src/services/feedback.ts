import apiClient from './api';

export interface SubmitResultFeedbackRequest {
  searchHistoryId: string;
  resultIndex: number;
  documentId?: string;
  adoptionStatus: 'adopted' | 'rejected';
  comment?: string;
}

export interface UpdateSearchHistoryFeedbackRequest {
  comment?: string;
  adoptionStatus?: 'adopted' | 'rejected';
}

export interface FeedbackListItem {
  id: string;
  searchHistoryId: string;
  resultIndex: number;
  documentId?: string;
  adoptionStatus: string;
  comment?: string;
  userId: string;
  createdAt: string;
  searchHistory: {
    id: string;
    query: string;
    userId: string;
    role?: string;
  };
}

export interface AdoptionStats {
  overall: {
    totalSearches: number;
    adoptedSearches: number;
    rejectedSearches: number;
    adoptionRate: number;
  };
  results: {
    totalFeedbacks: number;
    adoptedFeedbacks: number;
    rejectedFeedbacks: number;
    adoptionRate: number;
  };
  byRole: Array<{
    role: string | null;
    totalSearches: number;
    totalResults: number;
    adopted: number;
    rejected: number;
    adoptionRate: number;
  }>;
  timeRange: {
    startDate?: string;
    endDate?: string;
  };
}

export const feedbackApi = {
  /**
   * 提交单条检索结果反馈
   */
  async submitResultFeedback(request: SubmitResultFeedbackRequest) {
    return apiClient.post('/api/v1/search/feedback', request);
  },

  /**
   * 更新检索历史整体反馈
   */
  async updateSearchHistoryFeedback(
    searchHistoryId: string,
    request: UpdateSearchHistoryFeedbackRequest,
  ) {
    return apiClient.patch(`/api/v1/search/history/${searchHistoryId}/feedback`, request);
  },

  /**
   * 获取反馈列表（管理员）
   */
  async getFeedbackList(params?: {
    page?: number;
    limit?: number;
    searchHistoryId?: string;
    userId?: string;
    adoptionStatus?: string;
  }) {
    return apiClient.get('/api/v1/search/feedback', { params });
  },

  /**
   * 获取采纳率统计（管理员）
   */
  async getAdoptionStats(params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    role?: string;
  }): Promise<AdoptionStats> {
    return apiClient.get('/api/v1/search/feedback/stats', { params });
  },
};

