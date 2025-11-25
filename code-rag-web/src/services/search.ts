import apiClient from './api';

export interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  sourceType: 'feishu' | 'gitlab' | 'database';
  sourceLink: string;
  confidence: number;
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
};

