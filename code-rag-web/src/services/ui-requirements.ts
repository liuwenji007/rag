import apiClient from './api';

export interface UIRequirement {
  id: string;
  prdId: string;
  paragraphId: string | null;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  extractedBy: string | null;
  extractedAt: string;
}

export interface CreateUIRequirementRequest {
  paragraphId?: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface UpdateUIRequirementRequest {
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ExportUIRequirementsResponse {
  prdId: string;
  prdTitle: string;
  requirements: Array<{
    id: string;
    description: string;
    priority: string;
    status: string;
    paragraphId: string | null;
    extractedAt: string;
  }>;
}

/**
 * 获取 PRD 文档的 UI 需求列表
 */
export async function getUIRequirements(
  prdDocumentId: string,
): Promise<UIRequirement[]> {
  const response = await apiClient.get<UIRequirement[]>(
    `/api/v1/documents/${prdDocumentId}/ui-requirements`,
  );
  return response as unknown as UIRequirement[];
}

/**
 * 手动创建 UI 需求
 */
export async function createUIRequirement(
  prdDocumentId: string,
  request: CreateUIRequirementRequest,
): Promise<UIRequirement> {
  const response = await apiClient.post<UIRequirement>(
    `/api/v1/documents/${prdDocumentId}/ui-requirements`,
    request,
  );
  return response as unknown as UIRequirement;
}

/**
 * 自动识别 UI 需求
 */
export async function extractUIRequirements(
  prdDocumentId: string,
): Promise<UIRequirement[]> {
  const response = await apiClient.post<UIRequirement[]>(
    `/api/v1/documents/${prdDocumentId}/ui-requirements/extract`,
  );
  return response as unknown as UIRequirement[];
}

/**
 * 更新 UI 需求
 */
export async function updateUIRequirement(
  prdDocumentId: string,
  requirementId: string,
  request: UpdateUIRequirementRequest,
): Promise<UIRequirement> {
  const response = await apiClient.put<UIRequirement>(
    `/api/v1/documents/${prdDocumentId}/ui-requirements/${requirementId}`,
    request,
  );
  return response as unknown as UIRequirement;
}

/**
 * 删除 UI 需求
 */
export async function deleteUIRequirement(
  prdDocumentId: string,
  requirementId: string,
): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(
    `/api/v1/documents/${prdDocumentId}/ui-requirements/${requirementId}`,
  );
  return response as unknown as { success: boolean };
}

/**
 * 导出 UI 需求列表
 */
export async function exportUIRequirements(
  prdDocumentId: string,
  format: 'json' | 'markdown' = 'json',
): Promise<ExportUIRequirementsResponse | { content: string; format: 'markdown' }> {
  const response = await apiClient.get(
    `/api/v1/documents/${prdDocumentId}/ui-requirements/export?format=${format}`,
  );
  return response as unknown as ExportUIRequirementsResponse | { content: string; format: 'markdown' };
}

