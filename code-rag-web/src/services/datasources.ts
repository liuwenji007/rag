import apiClient from './api';

export type DataSourceType = 'FEISHU' | 'GITLAB' | 'DATABASE';
export type DataSourceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface FeishuDataSourceConfig {
  appId: string;
  appSecret: string;
  spaceId: string;
}

export interface GitLabDataSourceConfig {
  url: string;
  accessToken: string;
  projectIds: string[];
}

export interface DatabaseDataSourceConfig {
  type: 'mysql' | 'postgresql' | 'mongodb';
  connectionString: string;
  tableNames?: string[];
}

export type DataSourceConfig =
  | FeishuDataSourceConfig
  | GitLabDataSourceConfig
  | DatabaseDataSourceConfig;

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;
  config: DataSourceConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string | null;
  description?: string | null;
}

export interface CreateDataSourceDto {
  name: string;
  type: DataSourceType;
  config: DataSourceConfig;
  enabled?: boolean;
  description?: string;
}

export interface UpdateDataSourceDto {
  name?: string;
  type?: DataSourceType;
  config?: DataSourceConfig;
  enabled?: boolean;
  description?: string;
}

export interface TestConnectionDto {
  type: DataSourceType;
  config: DataSourceConfig;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * 获取所有数据源
 */
export async function getDataSources(): Promise<DataSource[]> {
  return apiClient.get('/api/v1/data-sources');
}

/**
 * 根据 ID 获取数据源
 */
export async function getDataSource(id: string): Promise<DataSource> {
  return apiClient.get(`/api/v1/data-sources/${id}`);
}

/**
 * 创建数据源
 */
export async function createDataSource(
  data: CreateDataSourceDto,
): Promise<DataSource> {
  return apiClient.post('/api/v1/data-sources', data);
}

/**
 * 更新数据源
 */
export async function updateDataSource(
  id: string,
  data: UpdateDataSourceDto,
): Promise<DataSource> {
  return apiClient.patch(`/api/v1/data-sources/${id}`, data);
}

/**
 * 删除数据源
 */
export async function deleteDataSource(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/data-sources/${id}`);
}

/**
 * 启用数据源
 */
export async function enableDataSource(id: string): Promise<DataSource> {
  return apiClient.patch(`/api/v1/data-sources/${id}/enable`);
}

/**
 * 禁用数据源
 */
export async function disableDataSource(id: string): Promise<DataSource> {
  return apiClient.patch(`/api/v1/data-sources/${id}/disable`);
}

/**
 * 测试连接
 */
export async function testConnection(
  data: TestConnectionDto,
): Promise<TestConnectionResult> {
  return apiClient.post('/api/v1/data-sources/test', data);
}

/**
 * 通过 ID 测试连接
 */
export async function testConnectionById(
  id: string,
): Promise<TestConnectionResult> {
  return apiClient.post(`/api/v1/data-sources/${id}/test`);
}

