import apiClient from './api';

export interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  sourceType: 'feishu' | 'gitlab' | 'database';
  sourceLink: string;
  confidence: number;
  isSuspected?: boolean;
  highlightedContent?: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  role: string | null;
  total: number;
  suspected: boolean;
  results: SearchResult[];
  suggestion?: string;
  searchHistoryId?: string;
}

export interface SearchRequest {
  query: string;
  topK?: number;
  minScore?: number;
  datasourceIds?: string[];
  contentTypes?: string[];
  role?: string;
}

export interface ConfirmSuspectedResultRequest {
  searchHistoryId: string;
  resultIndex: number;
  confirmed: boolean;
  comment?: string;
}

export interface RefineSearchRequest {
  originalQuery: string;
  additionalContext: string;
  topK?: number;
  minScore?: number;
}

export interface RefineSearchResponse extends SearchResponse {
  originalQuery: string;
  additionalContext: string;
  refinedQuery: string;
}

export const searchApi = {
  /**
   * 执行检索
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    return apiClient.post('/api/v1/search', request, {
      headers: {
        'x-user-role': request.role || '',
      },
    });
  },

  /**
   * 确认疑似结果
   */
  async confirmSuspectedResult(request: ConfirmSuspectedResultRequest) {
    return apiClient.post('/api/v1/search/suspected/confirm', request);
  },

  /**
   * 补充信息重新检索
   */
  async refineSearch(request: RefineSearchRequest, userRole?: string): Promise<RefineSearchResponse> {
    return apiClient.post('/api/v1/search/refine', request, {
      headers: {
        'x-user-role': userRole || '',
      },
    });
  },
};

