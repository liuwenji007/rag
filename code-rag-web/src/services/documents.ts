import apiClient from './api';

export interface UploadDocumentResponse {
  id: string;
  title: string;
  documentType: 'prd' | 'design' | 'knowledge' | null;
  filePath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
}

export interface UploadDocumentRequest {
  file: File;
  documentType?: 'prd' | 'design' | 'knowledge';
  title?: string;
}

/**
 * 上传文档
 */
export async function uploadDocument(
  request: UploadDocumentRequest,
  onProgress?: (progress: number) => void,
): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append('file', request.file);
  if (request.documentType) {
    formData.append('documentType', request.documentType);
  }
  if (request.title) {
    formData.append('title', request.title);
  }

  // Axios 会自动设置 Content-Type 为 multipart/form-data，不需要手动设置
  const response = await apiClient.post<UploadDocumentResponse>(
    '/api/v1/documents/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    } as any, // Axios 类型定义可能不包含 onUploadProgress，但实际支持
  );

  return response as unknown as UploadDocumentResponse;
}

export interface DocumentListItem {
  id: string;
  title: string;
  documentType: 'prd' | 'design' | 'knowledge' | null;
  contentType: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  syncedAt: string;
  updatedAt: string;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  latestVersion: {
    version: number;
    uploadedAt: string;
  } | null;
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentDetail {
  id: string;
  title: string;
  content: string | null;
  documentType: 'prd' | 'design' | 'knowledge' | null;
  contentType: string;
  filePath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  syncedAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
    description: string | null;
  }>;
  versions: Array<{
    version: number;
    content: string | null;
    metadata: Record<string, unknown>;
    uploadedBy: string;
    uploadedAt: string;
  }>;
}

export interface DocumentQueryParams {
  type?: 'prd' | 'design' | 'knowledge';
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  sort?: 'createdAt' | 'updatedAt' | 'title';
  order?: 'asc' | 'desc';
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  documentType?: 'prd' | 'design' | 'knowledge';
  tagIds?: string[];
}

export interface Tag {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
}

/**
 * 查询文档列表
 */
export async function getDocuments(
  params: DocumentQueryParams,
): Promise<DocumentListResponse> {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.append('type', params.type);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.tags) queryParams.append('tags', params.tags);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.order) queryParams.append('order', params.order);

  const response = await apiClient.get<DocumentListResponse>(
    `/api/v1/documents?${queryParams.toString()}`,
  );
  return response as unknown as DocumentListResponse;
}

/**
 * 获取文档详情
 */
export async function getDocumentById(id: string): Promise<DocumentDetail> {
  const response = await apiClient.get<DocumentDetail>(
    `/api/v1/documents/${id}`,
  );
  return response as unknown as DocumentDetail;
}

/**
 * 更新文档
 */
export async function updateDocument(
  id: string,
  request: UpdateDocumentRequest,
): Promise<{ id: string; title: string; documentType: string | null; updatedAt: string }> {
  const response = await apiClient.put(
    `/api/v1/documents/${id}`,
    request,
  );
  return response as unknown as { id: string; title: string; documentType: string | null; updatedAt: string };
}

/**
 * 删除文档
 */
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete(`/api/v1/documents/${id}`);
  return response as unknown as { success: boolean };
}

/**
 * 获取所有标签
 */
export async function getAllTags(): Promise<Tag[]> {
  const response = await apiClient.get<Tag[]>('/api/v1/documents/tags/all');
  return response as unknown as Tag[];
}

/**
 * 为文档添加标签
 */
export async function addTagToDocument(
  documentId: string,
  tagId: string,
): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/api/v1/documents/${documentId}/tags`, {
    tagId,
  });
  return response as unknown as { success: boolean };
}

/**
 * 从文档删除标签
 */
export async function removeTagFromDocument(
  documentId: string,
  tagId: string,
): Promise<{ success: boolean }> {
  const response = await apiClient.delete(
    `/api/v1/documents/${documentId}/tags/${tagId}`,
  );
  return response as unknown as { success: boolean };
}

