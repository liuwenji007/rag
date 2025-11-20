import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import type { GitLabDataSourceConfig } from '../../modules/datasources/interfaces/datasource-config.interface';

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  default_branch: string;
  web_url: string;
  last_activity_at: string;
}

export interface GitLabFile {
  id: string;
  name: string;
  type: 'tree' | 'blob';
  path: string;
  mode: string;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  created_at: string;
}

@Injectable()
export class GitLabService {
  /**
   * 创建带认证的 HTTP 客户端
   */
  private createAuthenticatedClient(
    config: GitLabDataSourceConfig,
  ): AxiosInstance {
    const url = config.url.replace(/\/$/, ''); // 移除末尾斜杠

    return axios.create({
      baseURL: `${url}/api/v4`,
      headers: {
        'PRIVATE-TOKEN': config.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * 获取项目列表
   */
  async getProjects(
    config: GitLabDataSourceConfig,
  ): Promise<GitLabProject[]> {
    const client = this.createAuthenticatedClient(config);
    const projects: GitLabProject[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await client.get<GitLabProject[]>('/projects', {
        params: {
          page,
          per_page: 100,
          simple: false,
          // 如果配置了项目 ID 列表，只获取这些项目
          ...(config.projectIds && config.projectIds.length > 0
            ? { ids: config.projectIds.join(',') }
            : {}),
        },
      });

      projects.push(...response.data);

      // 检查是否还有更多页面
      const totalPages = parseInt(
        response.headers['x-total-pages'] || '1',
        10,
      );
      hasMore = page < totalPages;
      page++;
    }

    return projects;
  }

  /**
   * 获取项目文件树（递归）
   */
  async getFileTree(
    config: GitLabDataSourceConfig,
    projectId: number,
    branch: string = 'main',
    path: string = '',
  ): Promise<GitLabFile[]> {
    const client = this.createAuthenticatedClient(config);
    const allFiles: GitLabFile[] = [];

    // 递归获取所有文件
    const fetchTree = async (currentPath: string): Promise<void> => {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await client.get<GitLabFile[]>(
          `/projects/${projectId}/repository/tree`,
          {
            params: {
              ref: branch,
              path: currentPath,
              recursive: true,
              per_page: 100,
              page,
            },
          },
        );

        // 只返回文件（blob），不包括目录（tree）
        const files = response.data.filter((item) => item.type === 'blob');
        allFiles.push(...files);

        // 检查是否还有更多页面
        const totalPages = parseInt(
          response.headers['x-total-pages'] || '1',
          10,
        );
        hasMore = page < totalPages;
        page++;
      }
    };

    await fetchTree(path);
    return allFiles;
  }

  /**
   * 下载文件内容
   */
  async getFileContent(
    config: GitLabDataSourceConfig,
    projectId: number,
    filePath: string,
    branch: string = 'main',
  ): Promise<{ content: string; size: number; commit_id: string }> {
    const client = this.createAuthenticatedClient(config);

    // URL 编码文件路径
    const encodedPath = encodeURIComponent(filePath);

    // 获取文件内容（raw 格式）
    const response = await client.get<string>(
      `/projects/${projectId}/repository/files/${encodedPath}/raw`,
      {
        params: {
          ref: branch,
        },
        responseType: 'text',
      },
    );

    // 获取文件信息（用于获取大小和提交 ID）
    const fileInfoResponse = await client.get<{
      file_name: string;
      file_path: string;
      size: number;
      encoding: string;
      content_sha256: string;
      ref: string;
      blob_id: string;
      commit_id: string;
      last_commit_id: string;
    }>(`/projects/${projectId}/repository/files/${encodedPath}`, {
      params: {
        ref: branch,
      },
    });

    return {
      content: response.data,
      size: fileInfoResponse.data.size,
      commit_id: fileInfoResponse.data.commit_id,
    };
  }

  /**
   * 获取文件的最新提交信息
   */
  async getFileLastCommit(
    config: GitLabDataSourceConfig,
    projectId: number,
    filePath: string,
    branch: string = 'main',
  ): Promise<GitLabCommit | null> {
    const client = this.createAuthenticatedClient(config);

    try {
      const response = await client.get<GitLabCommit[]>(
        `/projects/${projectId}/repository/commits`,
        {
          params: {
            ref_name: branch,
            path: filePath,
            per_page: 1,
          },
        },
      );

      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      // 如果获取提交信息失败，返回 null
      return null;
    }
  }

  /**
   * 获取项目的默认分支
   */
  async getDefaultBranch(
    config: GitLabDataSourceConfig,
    projectId: number,
  ): Promise<string> {
    const client = this.createAuthenticatedClient(config);

    const response = await client.get<GitLabProject>(`/projects/${projectId}`);

    return response.data.default_branch || 'main';
  }

  /**
   * 测试连接
   */
  async testConnection(config: GitLabDataSourceConfig): Promise<{
    success: boolean;
    message: string;
    data?: {
      username?: string;
      email?: string;
    };
  }> {
    try {
      const client = this.createAuthenticatedClient(config);

      // 测试获取当前用户信息
      const response = await client.get<{
        id: number;
        username: string;
        email: string;
        name: string;
      }>('/user');

      if (response.status === 200) {
        return {
          success: true,
          message: 'GitLab connection test passed',
          data: {
            username: response.data.username,
            email: response.data.email,
          },
        };
      }

      throw new Error('GitLab connection test failed');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Invalid access token',
          };
        }
        if (error.response?.status === 404) {
          return {
            success: false,
            message: 'GitLab URL not found',
          };
        }
        return {
          success: false,
          message: `GitLab connection failed: ${error.message}`,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'GitLab connection test failed',
      };
    }
  }
}

