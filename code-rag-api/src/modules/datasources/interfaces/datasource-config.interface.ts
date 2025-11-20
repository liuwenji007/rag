// 飞书数据源配置
export interface FeishuDataSourceConfig {
  appId: string;
  appSecret: string; // 加密存储
  spaceId: string;
}

// GitLab 数据源配置
export interface GitLabDataSourceConfig {
  url: string;
  accessToken: string; // 加密存储
  projectIds: string[]; // 项目 ID 列表
}

// 数据库数据源配置
export interface DatabaseDataSourceConfig {
  type: 'mysql' | 'postgresql' | 'mongodb';
  connectionString: string; // 加密存储
  tableNames?: string[]; // 可选：指定要同步的表名列表
}

// 数据源类型
export type DataSourceType = 'FEISHU' | 'GITLAB' | 'DATABASE';

// 数据源状态
export type DataSourceStatus = 'active' | 'inactive' | 'error';

// 数据源配置联合类型
export type DataSourceConfig =
  | FeishuDataSourceConfig
  | GitLabDataSourceConfig
  | DatabaseDataSourceConfig;
