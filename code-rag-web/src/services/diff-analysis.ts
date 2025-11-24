import apiClient from './api';

export interface NewFeature {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ModifiedFeature {
  name: string;
  description: string;
  affectedModules: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ImpactScope {
  modules: string[];
  dependencies: string[];
  riskLevel: 'high' | 'medium' | 'low';
}

export interface RequirementParsingResult {
  newFeatures: NewFeature[];
  modifiedFeatures: ModifiedFeature[];
  impactScope: ImpactScope;
}

export interface CodeMatch {
  id: string;
  code: string;
  context: {
    filePath: string;
    functionName?: string;
    className?: string;
    moduleName?: string;
  };
  similarity: number;
  sourceLink: {
    url: string;
    type: string;
    displayText: string;
  } | null;
  metadata: {
    language: string;
    datasourceId: string;
    documentId: string;
    chunkIndex: number;
  };
}

export interface CodeMatchResult {
  changePoint: string;
  matches: CodeMatch[];
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'new_feature' | 'modified_feature';
  relatedDocs: Array<{
    title: string;
    url: string;
  }>;
  codeRefs: Array<{
    filePath: string;
    url: string;
    description: string;
  }>;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface DiffAnalysisResult {
  requirement: string;
  role?: string;
  changes: RequirementParsingResult;
  codeRecommendations: CodeMatchResult[];
  summary: string;
  todos: TodoItem[];
  generatedAt: string;
}

export interface DiffAnalysisTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: DiffAnalysisResult;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AnalyzeDiffRequest {
  requirement: string;
  role?: string;
  includeCodeMatches?: boolean;
  includePRDFragments?: boolean;
  includeSummary?: boolean;
  includeTodos?: boolean;
  codeMatchTopK?: number;
  prdTopK?: number;
}

/**
 * 执行差异分析（同步模式）
 */
export async function analyzeDiff(
  request: AnalyzeDiffRequest,
): Promise<DiffAnalysisResult> {
  const response = await apiClient.post(
    '/api/v1/diff/analyze',
    request,
  );
  // 响应拦截器已经处理了统一格式，直接返回 data
  return response as unknown as DiffAnalysisResult;
}

/**
 * 创建异步差异分析任务
 */
export async function createDiffAnalysisTask(
  request: AnalyzeDiffRequest,
): Promise<{ taskId: string; status: string; createdAt: string }> {
  const response = await apiClient.post(
    '/api/v1/diff/analyze/async',
    request,
  );
  // 响应拦截器已经处理了统一格式，直接返回 data
  return response as unknown as { taskId: string; status: string; createdAt: string };
}

/**
 * 查询差异分析任务状态
 */
export async function getDiffAnalysisTaskStatus(
  taskId: string,
): Promise<DiffAnalysisTask> {
  const response = await apiClient.get(
    `/api/v1/diff/tasks/${taskId}`,
  );
  // 响应拦截器已经处理了统一格式，直接返回 data
  return response as unknown as DiffAnalysisTask;
}

