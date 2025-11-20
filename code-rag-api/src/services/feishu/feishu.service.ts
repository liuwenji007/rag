import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import type { FeishuDataSourceConfig } from '../../modules/datasources/interfaces/datasource-config.interface';

export interface FeishuAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expire_at: number; // 计算得出的过期时间戳
}

export interface FeishuFile {
  token: string;
  name: string;
  type: string;
  parent_token: string;
  url: string;
  created_time: number;
  modified_time: number;
  created_by: {
    id: string;
    name: string;
  };
  modified_by: {
    id: string;
    name: string;
  };
}

export interface FeishuFileListResponse {
  files: FeishuFile[];
  page_token?: string;
  has_more: boolean;
}

export interface FeishuDocumentContent {
  content: string;
  title: string;
  token: string;
  url: string;
  modified_time: number;
  modified_by: {
    id: string;
    name: string;
  };
}

@Injectable()
export class FeishuService {
  private readonly baseURL = 'https://open.feishu.cn/open-apis';
  private accessTokenCache: Map<string, FeishuAccessToken> = new Map();

  /**
   * 获取访问令牌（带缓存）
   */
  async getAccessToken(
    config: FeishuDataSourceConfig,
  ): Promise<string> {
    const cacheKey = config.appId;
    const cached = this.accessTokenCache.get(cacheKey);

    // 检查缓存是否有效（提前 5 分钟刷新）
    if (cached && cached.expire_at > Date.now() + 5 * 60 * 1000) {
      return cached.access_token;
    }

    // 获取新的访问令牌
    const response = await axios.post<{
      code: number;
      msg: string;
      tenant_access_token?: string;
      expire?: number;
    }>(`${this.baseURL}/auth/v3/tenant_access_token/internal`, {
      app_id: config.appId,
      app_secret: config.appSecret,
    });

    if (response.data.code !== 0 || !response.data.tenant_access_token) {
      throw new Error(
        `Failed to get Feishu access token: ${response.data.msg || 'Unknown error'}`,
      );
    }

    const expiresIn = response.data.expire || 7200; // 默认 2 小时
    const token: FeishuAccessToken = {
      access_token: response.data.tenant_access_token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      expire_at: Date.now() + expiresIn * 1000,
    };

    this.accessTokenCache.set(cacheKey, token);
    return token.access_token;
  }

  /**
   * 创建带认证的 HTTP 客户端
   */
  private async createAuthenticatedClient(
    config: FeishuDataSourceConfig,
  ): Promise<AxiosInstance> {
    const accessToken = await this.getAccessToken(config);

    return axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * 获取文档列表
   */
  async getFileList(
    config: FeishuDataSourceConfig,
    pageToken?: string,
  ): Promise<FeishuFileListResponse> {
    const client = await this.createAuthenticatedClient(config);

    const params: Record<string, string> = {
      folder_token: config.spaceId,
      order_by: 'modified_time',
      direction: 'DESC',
      page_size: '50',
    };

    if (pageToken) {
      params.page_token = pageToken;
    }

    const response = await client.get<{
      code: number;
      msg: string;
      data?: {
        files: FeishuFile[];
        page_token?: string;
        has_more: boolean;
      };
    }>('/drive/v1/files', { params });

    if (response.data.code !== 0 || !response.data.data) {
      throw new Error(
        `Failed to get Feishu file list: ${response.data.msg || 'Unknown error'}`,
      );
    }

    return {
      files: response.data.data.files,
      page_token: response.data.data.page_token,
      has_more: response.data.data.has_more,
    };
  }

  /**
   * 获取所有文档（分页）
   */
  async getAllFiles(
    config: FeishuDataSourceConfig,
  ): Promise<FeishuFile[]> {
    const allFiles: FeishuFile[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getFileList(config, pageToken);
      allFiles.push(...response.files);
      hasMore = response.has_more;
      pageToken = response.page_token;
    }

    return allFiles;
  }

  /**
   * 下载文档内容
   */
  async downloadDocument(
    config: FeishuDataSourceConfig,
    fileToken: string,
  ): Promise<FeishuDocumentContent> {
    const client = await this.createAuthenticatedClient(config);

    // 获取文档元信息
    const metaResponse = await client.get<{
      code: number;
      msg: string;
      data?: {
        token: string;
        name: string;
        type: string;
        url: string;
        modified_time: number;
        modified_by: {
          id: string;
          name: string;
        };
      };
    }>(`/drive/v1/files/${fileToken}/meta`);

    if (metaResponse.data.code !== 0 || !metaResponse.data.data) {
      throw new Error(
        `Failed to get Feishu document meta: ${metaResponse.data.msg || 'Unknown error'}`,
      );
    }

    const meta = metaResponse.data.data;

    // 下载文档内容（Markdown 格式）
    const contentResponse = await client.get<{
      code: number;
      msg: string;
      data?: {
        content: string;
      };
    }>(`/drive/v1/files/${fileToken}/download`, {
      params: {
        format: 'markdown',
      },
    });

    if (contentResponse.data.code !== 0 || !contentResponse.data.data) {
      throw new Error(
        `Failed to download Feishu document: ${contentResponse.data.msg || 'Unknown error'}`,
      );
    }

    return {
      content: contentResponse.data.data.content || '',
      title: meta.name,
      token: meta.token,
      url: meta.url,
      modified_time: meta.modified_time,
      modified_by: meta.modified_by,
    };
  }

  /**
   * 测试连接
   */
  async testConnection(config: FeishuDataSourceConfig): Promise<{
    success: boolean;
    message: string;
    data?: {
      appName?: string;
      spaceName?: string;
    };
  }> {
    try {
      // 尝试获取访问令牌
      await this.getAccessToken(config);

      // 尝试获取文档列表（仅获取第一页）
      await this.getFileList(config);

      return {
        success: true,
        message: 'Feishu connection test passed',
        data: {},
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Feishu connection test failed',
      };
    }
  }
}

