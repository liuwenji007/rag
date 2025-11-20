import { Injectable, Logger } from '@nestjs/common';

export interface SourceLink {
  url: string;
  type: 'feishu' | 'gitlab' | 'database';
  displayText: string;
}

export interface SourceMetadata {
  author?: string;
  modifiedBy?: string;
  updatedAt?: Date;
  syncedAt?: Date;
  version?: string;
  commitId?: string;
  datasourceType: string;
  title?: string;
}

@Injectable()
export class SourceLinkService {
  private readonly logger = new Logger(SourceLinkService.name);

  /**
   * 生成来源链接
   */
  generateSourceLink(
    datasourceType: string,
    documentMetadata: Record<string, unknown>,
    datasourceConfig?: Record<string, unknown>,
  ): SourceLink | null {
    try {
      switch (datasourceType.toUpperCase()) {
        case 'FEISHU':
          return this.generateFeishuLink(documentMetadata);
        case 'GITLAB':
          return this.generateGitLabLink(documentMetadata);
        case 'DATABASE':
          return this.generateDatabaseLink(
            documentMetadata,
            datasourceConfig,
          );
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate source link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * 生成飞书文档链接
   */
  private generateFeishuLink(
    metadata: Record<string, unknown>,
  ): SourceLink | null {
    const url = metadata.url as string | undefined;
    if (!url) {
      return null;
    }

    return {
      url,
      type: 'feishu',
      displayText: '查看飞书文档',
    };
  }

  /**
   * 生成 GitLab 代码链接
   */
  private generateGitLabLink(
    metadata: Record<string, unknown>,
  ): SourceLink | null {
    const projectPath = metadata.projectPath as string | undefined;
    const filePath = metadata.filePath as string | undefined;
    const branch = (metadata.branch as string | undefined) || 'main';
    const gitlabUrl = metadata.gitlabUrl as string | undefined;

    if (!projectPath || !filePath) {
      return null;
    }

    // 构建 GitLab 文件链接
    // 格式: https://{gitlabUrl}/{projectPath}/-/blob/{branch}/{filePath}
    let baseUrl = gitlabUrl || 'https://gitlab.com';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // 计算行号范围（如果有 chunkIndex）
    const chunkIndex = metadata.chunkIndex as number | undefined;
    let lineRange = '';
    if (chunkIndex !== undefined) {
      // 简单估算：假设每个 chunk 大约 50 行
      const startLine = chunkIndex * 50 + 1;
      const endLine = startLine + 49;
      lineRange = `#L${startLine}-${endLine}`;
    }

    const url = `${baseUrl}/${projectPath}/-/blob/${branch}/${filePath}${lineRange}`;

    return {
      url,
      type: 'gitlab',
      displayText: `查看代码: ${filePath}`,
    };
  }

  /**
   * 生成数据库来源信息
   */
  private generateDatabaseLink(
    metadata: Record<string, unknown>,
    datasourceConfig?: Record<string, unknown>,
  ): SourceLink | null {
    const databaseType = metadata.databaseType as string | undefined;
    const database = metadata.database as string | undefined;
    const table = metadata.table as string | undefined;

    if (!databaseType || !database || !table) {
      return null;
    }

    // 从数据源配置获取连接信息
    const host = datasourceConfig?.host as string | undefined;
    const port = datasourceConfig?.port as number | undefined;

    // 构建数据库连接信息字符串
    let connectionInfo = `${databaseType}://`;
    if (host) {
      connectionInfo += host;
      if (port) {
        connectionInfo += `:${port}`;
      }
    }
    connectionInfo += `/${database}/${table}`;

    return {
      url: connectionInfo, // 数据库链接不是真正的 URL，而是连接信息
      type: 'database',
      displayText: `${databaseType} 数据库: ${database}.${table}`,
    };
  }

  /**
   * 提取来源元信息
   */
  extractSourceMetadata(
    document: {
      title?: string | null;
      syncedAt?: Date | null;
      metadata?: unknown;
    },
    datasourceType: string,
  ): SourceMetadata {
    const metadata = (document.metadata as Record<string, unknown>) || {};

    return {
      author: metadata.author as string | undefined,
      modifiedBy: metadata.modifiedBy as string | undefined,
      updatedAt: metadata.modifiedTime
        ? new Date(metadata.modifiedTime as string)
        : undefined,
      syncedAt: document.syncedAt || undefined,
      version: metadata.version as string | undefined,
      commitId: metadata.commitId as string | undefined,
      datasourceType,
      title: document.title || undefined,
    };
  }
}

