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
      // @ts-expect-error - Axios 类型定义可能不包含 onUploadProgress，但实际支持
      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    },
  );

  return response as unknown as UploadDocumentResponse;
}

