import apiClient from './api';

export interface Review {
  id: string;
  documentId: string;
  document: {
    id: string;
    title: string;
    documentType: string | null;
    contentType: string;
    fileSize: number | null;
    mimeType: string | null;
    uploadedBy: string | null;
    syncedAt: string;
    content: string | null;
  };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface ReviewDetail {
  id: string;
  documentId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  submittedAt: string;
  document: {
    id: string;
    title: string;
    documentType: string | null;
    contentType: string;
    filePath: string | null;
    fileSize: number | null;
    mimeType: string | null;
    uploadedBy: string | null;
    syncedAt: string;
    content: string | null;
    tags: Array<{
      id: string;
      name: string;
      color: string | null;
    }>;
  };
}

export interface ReviewHistoryItem {
  id: string;
  documentId: string;
  document: {
    id: string;
    title: string;
    documentType: string | null;
    uploadedBy: string | null;
  };
  status: 'approved' | 'rejected';
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  submittedAt: string;
}

export interface PendingReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewHistoryResponse {
  reviews: ReviewHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 获取待审核文档列表
 */
export async function getPendingReviews(
  page: number = 1,
  limit: number = 20,
): Promise<PendingReviewsResponse> {
  const response = await apiClient.get<PendingReviewsResponse>(
    `/api/v1/reviews/pending?page=${page}&limit=${limit}`,
  );
  return response as unknown as PendingReviewsResponse;
}

/**
 * 获取审核详情
 */
export async function getReviewById(reviewId: string): Promise<ReviewDetail> {
  const response = await apiClient.get<ReviewDetail>(
    `/api/v1/reviews/${reviewId}`,
  );
  return response as unknown as ReviewDetail;
}

/**
 * 审核通过
 */
export async function approveReview(
  reviewId: string,
  notes?: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/reviews/${reviewId}/approve`,
    { notes },
  );
  return response as unknown as { success: boolean; message: string };
}

/**
 * 审核退回
 */
export async function rejectReview(
  reviewId: string,
  reason: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/reviews/${reviewId}/reject`,
    { reason },
  );
  return response as unknown as { success: boolean; message: string };
}

/**
 * 获取审核历史
 */
export async function getReviewHistory(
  page: number = 1,
  limit: number = 20,
  status?: 'approved' | 'rejected',
): Promise<ReviewHistoryResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (status) {
    params.append('status', status);
  }

  const response = await apiClient.get<ReviewHistoryResponse>(
    `/api/v1/reviews/history?${params.toString()}`,
  );
  return response as unknown as ReviewHistoryResponse;
}

