import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../services/encryption/encryption.service';
import { FeishuService } from '../../services/feishu/feishu.service';
import { GitLabService } from '../../services/gitlab/gitlab.service';
import { DatabaseService } from '../../services/database/database.service';
import type {
  FeishuDataSourceConfig,
  GitLabDataSourceConfig,
  DatabaseDataSourceConfig,
} from '../datasources/interfaces/datasource-config.interface';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly feishuService: FeishuService,
    private readonly gitLabService: GitLabService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 同步飞书数据源
   */
  async syncFeishuDataSource(datasourceId: string): Promise<{
    success: boolean;
    message: string;
    itemsSynced: number;
    itemsFailed: number;
    syncHistoryId: string;
  }> {
    // 获取数据源配置
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${datasourceId} not found`);
    }

    if (dataSource.type !== 'FEISHU') {
      throw new BadRequestException(
        `DataSource ${datasourceId} is not a Feishu data source`,
      );
    }

    if (!dataSource.enabled) {
      throw new BadRequestException(
        `DataSource ${datasourceId} is not enabled`,
      );
    }

    // 解密配置
    const config = this.decryptFeishuConfig(dataSource);
    const lastSyncAt = dataSource.lastSyncAt;

    // 创建同步历史记录
    const syncHistory = await this.prisma.syncHistory.create({
      data: {
        datasourceId: dataSource.id,
        status: 'running',
        startTime: new Date(),
        itemsSynced: 0,
        itemsFailed: 0,
      },
    });

    try {
      // 获取所有文档
      const files = await this.feishuService.getAllFiles(config);

      let itemsSynced = 0;
      let itemsFailed = 0;
      const errors: string[] = [];

      // 处理每个文档
      for (const file of files) {
        try {
          // 增量同步：仅同步更新的文档
          if (
            lastSyncAt &&
            file.modified_time * 1000 <= lastSyncAt.getTime()
          ) {
            continue;
          }

          // 仅处理文档类型（doc、docx、sheet 等）
          if (!['doc', 'docx', 'sheet'].includes(file.type)) {
            continue;
          }

          // 下载文档内容
          const documentContent = await this.feishuService.downloadDocument(
            config,
            file.token,
          );

          // 分块文档内容
          const chunks = await this.splitDocument(documentContent.content);

          // 存储文档元信息
          const document = await this.prisma.document.upsert({
            where: {
              datasourceId_externalId: {
                datasourceId: dataSource.id,
                externalId: file.token,
              },
            },
            create: {
              datasourceId: dataSource.id,
              externalId: file.token,
              title: documentContent.title,
              content: documentContent.content,
              contentType: 'markdown',
              metadata: {
                url: documentContent.url,
                modifiedTime: documentContent.modified_time,
                modifiedBy: documentContent.modified_by,
                fileType: file.type,
              },
            },
            update: {
              title: documentContent.title,
              content: documentContent.content,
              metadata: {
                url: documentContent.url,
                modifiedTime: documentContent.modified_time,
                modifiedBy: documentContent.modified_by,
                fileType: file.type,
              },
              syncedAt: new Date(),
            },
          });

          // TODO: 存储文档块到向量数据库（Story 3.1）
          // 这里先记录块的数量到 metadata
          await this.prisma.document.update({
            where: { id: document.id },
            data: {
              metadata: {
                ...(document.metadata as Record<string, unknown>),
                chunksCount: chunks.length,
              },
            },
          });

          itemsSynced++;
        } catch (error) {
          itemsFailed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`File ${file.token}: ${errorMessage}`);
        }
      }

      // 更新同步历史
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'success',
          endTime: new Date(),
          itemsSynced,
          itemsFailed,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          metadata: {
            totalFiles: files.length,
            errors: errors.slice(0, 10), // 仅保存前 10 个错误
          },
        },
      });

      // 更新数据源最后同步时间
      await this.prisma.dataSource.update({
        where: { id: datasourceId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        message: `Synced ${itemsSynced} documents, ${itemsFailed} failed`,
        itemsSynced,
        itemsFailed,
        syncHistoryId: syncHistory.id,
      };
    } catch (error) {
      // 更新同步历史为失败
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * 解密飞书配置
   */
  private decryptFeishuConfig(dataSource: {
    type: string;
    config: unknown;
    encryptedConfig: string | null;
  }): FeishuDataSourceConfig {
    const publicConfig = dataSource.config as Record<string, unknown>;
    let appSecret: string;

    if (dataSource.encryptedConfig) {
      appSecret = this.encryption.decrypt(dataSource.encryptedConfig);
    } else {
      throw new Error('Feishu appSecret is not configured');
    }

    return {
      appId: publicConfig.appId as string,
      appSecret,
      spaceId: publicConfig.spaceId as string,
    };
  }

  /**
   * 分块文档内容
   */
  private async splitDocument(content: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });

    const chunks = await splitter.splitText(content);
    return chunks;
  }

  /**
   * 获取同步历史
   */
  async getSyncHistory(
    datasourceId: string,
    limit = 10,
  ): Promise<unknown[]> {
    const histories = await this.prisma.syncHistory.findMany({
      where: { datasourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return histories;
  }

  /**
   * 同步 GitLab 数据源
   */
  async syncGitLabDataSource(datasourceId: string): Promise<{
    success: boolean;
    message: string;
    itemsSynced: number;
    itemsFailed: number;
    syncHistoryId: string;
  }> {
    // 获取数据源配置
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${datasourceId} not found`);
    }

    if (dataSource.type !== 'GITLAB') {
      throw new BadRequestException(
        `DataSource ${datasourceId} is not a GitLab data source`,
      );
    }

    if (!dataSource.enabled) {
      throw new BadRequestException(
        `DataSource ${datasourceId} is not enabled`,
      );
    }

    // 解密配置
    const config = this.decryptGitLabConfig(dataSource);
    const lastSyncAt = dataSource.lastSyncAt;

    // 创建同步历史记录
    const syncHistory = await this.prisma.syncHistory.create({
      data: {
        datasourceId: dataSource.id,
        status: 'running',
        startTime: new Date(),
        itemsSynced: 0,
        itemsFailed: 0,
      },
    });

    try {
      // 获取项目列表
      const projects = await this.gitLabService.getProjects(config);

      let itemsSynced = 0;
      let itemsFailed = 0;
      const errors: string[] = [];

      // 处理每个项目
      for (const project of projects) {
        try {
          const defaultBranch =
            project.default_branch ||
            (await this.gitLabService.getDefaultBranch(config, project.id));

          // 获取项目文件树
          const files = await this.gitLabService.getFileTree(
            config,
            project.id,
            defaultBranch,
          );

          // 过滤代码文件
          const codeFiles = this.filterCodeFiles(files);

          // 处理每个代码文件
          for (const file of codeFiles) {
            try {
              // 获取文件最新提交信息
              const lastCommit = await this.gitLabService.getFileLastCommit(
                config,
                project.id,
                file.path,
                defaultBranch,
              );

              // 增量同步：仅同步更新的文件
              if (
                lastSyncAt &&
                lastCommit &&
                new Date(lastCommit.committed_date) <= lastSyncAt
              ) {
                continue;
              }

              // 下载文件内容
              const fileContent = await this.gitLabService.getFileContent(
                config,
                project.id,
                file.path,
                defaultBranch,
              );

              // 分块代码内容
              const chunks = await this.splitCode(fileContent.content);

              // 构建代码链接
              const codeUrl = this.buildCodeUrl(
                config.url,
                project.path_with_namespace,
                defaultBranch,
                file.path,
              );

              // 存储文档元信息
              const externalId = `${project.id}:${file.path}`;
              const document = await this.prisma.document.upsert({
                where: {
                  datasourceId_externalId: {
                    datasourceId: dataSource.id,
                    externalId,
                  },
                },
                create: {
                  datasourceId: dataSource.id,
                  externalId,
                  title: file.name,
                  content: fileContent.content,
                  contentType: 'code',
                  metadata: {
                    projectId: project.id,
                    projectName: project.name,
                    projectPath: project.path_with_namespace,
                    filePath: file.path,
                    branch: defaultBranch,
                    commitId: lastCommit?.id || fileContent.commit_id,
                    commitDate: lastCommit?.committed_date || null,
                    codeUrl,
                    fileSize: fileContent.size,
                  },
                },
                update: {
                  title: file.name,
                  content: fileContent.content,
                  metadata: {
                    projectId: project.id,
                    projectName: project.name,
                    projectPath: project.path_with_namespace,
                    filePath: file.path,
                    branch: defaultBranch,
                    commitId: lastCommit?.id || fileContent.commit_id,
                    commitDate: lastCommit?.committed_date || null,
                    codeUrl,
                    fileSize: fileContent.size,
                  },
                  syncedAt: new Date(),
                },
              });

              // TODO: 存储代码块到向量数据库（Story 3.1）
              await this.prisma.document.update({
                where: { id: document.id },
                data: {
                  metadata: {
                    ...(document.metadata as Record<string, unknown>),
                    chunksCount: chunks.length,
                  },
                },
              });

              itemsSynced++;
            } catch (error) {
              itemsFailed++;
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              errors.push(`File ${file.path}: ${errorMessage}`);
            }
          }
        } catch (error) {
          itemsFailed++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Project ${project.name}: ${errorMessage}`);
        }
      }

      // 更新同步历史
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'success',
          endTime: new Date(),
          itemsSynced,
          itemsFailed,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          metadata: {
            totalProjects: projects.length,
            errors: errors.slice(0, 10), // 仅保存前 10 个错误
          },
        },
      });

      // 更新数据源最后同步时间
      await this.prisma.dataSource.update({
        where: { id: datasourceId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        message: `Synced ${itemsSynced} files, ${itemsFailed} failed`,
        itemsSynced,
        itemsFailed,
        syncHistoryId: syncHistory.id,
      };
    } catch (error) {
      // 更新同步历史为失败
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * 解密 GitLab 配置
   */
  private decryptGitLabConfig(dataSource: {
    type: string;
    config: unknown;
    encryptedConfig: string | null;
  }): GitLabDataSourceConfig {
    const publicConfig = dataSource.config as Record<string, unknown>;
    let accessToken: string;

    if (dataSource.encryptedConfig) {
      accessToken = this.encryption.decrypt(dataSource.encryptedConfig);
    } else {
      throw new Error('GitLab accessToken is not configured');
    }

    return {
      url: publicConfig.url as string,
      accessToken,
      projectIds: (publicConfig.projectIds as string[]) || [],
    };
  }

  /**
   * 过滤代码文件
   */
  private filterCodeFiles(files: Array<{ path: string; type: string }>): Array<{
    path: string;
    name: string;
  }> {
    // 支持的代码文件扩展名
    const codeExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.java',
      '.go',
      '.rs',
      '.cpp',
      '.c',
      '.h',
      '.vue',
      '.svelte',
      '.php',
      '.rb',
      '.swift',
      '.kt',
      '.scala',
      '.dart',
    ];

    // 排除的目录和文件模式
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /\.next\//,
      /coverage\//,
      /\.min\.js$/,
      /\.bundle\.js$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
    ];

    return files
      .filter((file) => {
        // 只处理文件（blob）
        if (file.type !== 'blob') {
          return false;
        }

        // 检查扩展名
        const hasCodeExtension = codeExtensions.some((ext) =>
          file.path.endsWith(ext),
        );
        if (!hasCodeExtension) {
          return false;
        }

        // 检查排除模式
        const isExcluded = excludePatterns.some((pattern) =>
          pattern.test(file.path),
        );
        if (isExcluded) {
          return false;
        }

        return true;
      })
      .map((file) => ({
        path: file.path,
        name: file.path.split('/').pop() || file.path,
      }));
  }

  /**
   * 分块代码内容
   */
  private async splitCode(content: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });

    const chunks = await splitter.splitText(content);
    return chunks;
  }

  /**
   * 构建代码链接
   */
  private buildCodeUrl(
    gitlabUrl: string,
    projectPath: string,
    branch: string,
    filePath: string,
  ): string {
    const baseUrl = gitlabUrl.replace(/\/$/, '');
    return `${baseUrl}/${projectPath}/-/blob/${branch}/${filePath}`;
  }

  /**
   * 同步数据库数据源
   */
  async syncDatabaseDataSource(datasourceId: string): Promise<{
    success: boolean;
    message: string;
    itemsSynced: number;
    itemsFailed: number;
    syncHistoryId: string;
  }> {
    // 获取数据源配置
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${datasourceId} not found`);
    }

    if (dataSource.type !== 'DATABASE') {
      throw new BadRequestException(
        `DataSource ${datasourceId} is not a Database data source`,
      );
    }

    if (!dataSource.enabled) {
      throw new BadRequestException(
        `DataSource ${datasourceId} is not enabled`,
      );
    }

    // 解密配置
    const config = this.decryptDatabaseConfig(dataSource);

    // 创建同步历史记录
    const syncHistory = await this.prisma.syncHistory.create({
      data: {
        datasourceId: dataSource.id,
        status: 'running',
        startTime: new Date(),
        itemsSynced: 0,
        itemsFailed: 0,
      },
    });

    try {
      // 获取表列表
      let tableNames = await this.databaseService.getTables(config);

      // 如果配置了表名列表，仅同步指定的表
      if (config.tableNames && config.tableNames.length > 0) {
        tableNames = tableNames.filter((name) =>
          config.tableNames?.includes(name),
        );
      }

      let itemsSynced = 0;
      let itemsFailed = 0;
      const errors: string[] = [];

      // 处理每个表
      for (const tableName of tableNames) {
        try {
          // 获取表结构
          const tableStructure = await this.databaseService.getTableStructure(
            config,
            tableName,
          );

          // 生成 CREATE TABLE 语句
          const createTableStatement =
            await this.databaseService.generateCreateTableStatement(
              config,
              tableName,
            );

          // 分块表结构
          const structureChunks = await this.splitDocument(createTableStatement);

          // 存储表结构文档
          const structureExternalId = `structure:${tableName}`;
          const structureDoc = await this.prisma.document.upsert({
            where: {
              datasourceId_externalId: {
                datasourceId: dataSource.id,
                externalId: structureExternalId,
              },
            },
            create: {
              datasourceId: dataSource.id,
              externalId: structureExternalId,
              title: `Table Structure: ${tableName}`,
              content: createTableStatement,
              contentType: 'database_schema',
              metadata: {
                tableName,
                type: 'structure',
                columns: tableStructure.columns.map((col) => ({
                  name: col.name,
                  type: col.type,
                  nullable: col.nullable,
                  comment: col.comment,
                })),
                indexes: tableStructure.indexes?.map((idx) => ({
                  name: idx.name,
                  columns: idx.columns,
                  unique: idx.unique,
                })),
                comment: tableStructure.comment,
              },
            },
            update: {
              title: `Table Structure: ${tableName}`,
              content: createTableStatement,
              metadata: {
                tableName,
                type: 'structure',
                columns: tableStructure.columns.map((col) => ({
                  name: col.name,
                  type: col.type,
                  nullable: col.nullable,
                  comment: col.comment,
                })),
                indexes: tableStructure.indexes?.map((idx) => ({
                  name: idx.name,
                  columns: idx.columns,
                  unique: idx.unique,
                })),
                comment: tableStructure.comment,
              },
              syncedAt: new Date(),
            },
          });

          // TODO: 存储表结构块到向量数据库（Story 3.1）
          await this.prisma.document.update({
            where: { id: structureDoc.id },
            data: {
              metadata: {
                ...(structureDoc.metadata as Record<string, unknown>),
                chunksCount: structureChunks.length,
              },
            },
          });

          itemsSynced++;

          // 获取数据样本（可选）
          try {
            const tableSample = await this.databaseService.getTableSample(
              config,
              tableName,
              10, // 默认 10 条样本
            );

            if (tableSample.sampleData.length > 0) {
              // 格式化样本数据为文本
              const sampleText = this.formatSampleData(
                tableName,
                tableSample.sampleData,
                tableSample.rowCount,
              );

              // 分块样本数据
              const sampleChunks = await this.splitDocument(sampleText);

              // 存储样本数据文档
              const sampleExternalId = `sample:${tableName}`;
              const sampleDoc = await this.prisma.document.upsert({
                where: {
                  datasourceId_externalId: {
                    datasourceId: dataSource.id,
                    externalId: sampleExternalId,
                  },
                },
                create: {
                  datasourceId: dataSource.id,
                  externalId: sampleExternalId,
                  title: `Table Sample: ${tableName}`,
                  content: sampleText,
                  contentType: 'database_sample',
                  metadata: {
                    tableName,
                    type: 'sample',
                    rowCount: tableSample.rowCount,
                    sampleCount: tableSample.sampleData.length,
                  },
                },
                update: {
                  title: `Table Sample: ${tableName}`,
                  content: sampleText,
                  metadata: {
                    tableName,
                    type: 'sample',
                    rowCount: tableSample.rowCount,
                    sampleCount: tableSample.sampleData.length,
                  },
                  syncedAt: new Date(),
                },
              });

              // TODO: 存储样本数据块到向量数据库（Story 3.1）
              await this.prisma.document.update({
                where: { id: sampleDoc.id },
                data: {
                  metadata: {
                    ...(sampleDoc.metadata as Record<string, unknown>),
                    chunksCount: sampleChunks.length,
                  },
                },
              });

              itemsSynced++;
            }
          } catch (sampleError) {
            // 样本数据获取失败不影响表结构同步
            const errorMessage =
              sampleError instanceof Error
                ? sampleError.message
                : 'Unknown error';
            errors.push(`Table ${tableName} sample: ${errorMessage}`);
          }
        } catch (error) {
          itemsFailed++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Table ${tableName}: ${errorMessage}`);
        }
      }

      // 更新同步历史
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'success',
          endTime: new Date(),
          itemsSynced,
          itemsFailed,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          metadata: {
            totalTables: tableNames.length,
            errors: errors.slice(0, 10), // 仅保存前 10 个错误
          },
        },
      });

      // 更新数据源最后同步时间
      await this.prisma.dataSource.update({
        where: { id: datasourceId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        message: `Synced ${itemsSynced} items, ${itemsFailed} failed`,
        itemsSynced,
        itemsFailed,
        syncHistoryId: syncHistory.id,
      };
    } catch (error) {
      // 更新同步历史为失败
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * 解密数据库配置
   */
  private decryptDatabaseConfig(dataSource: {
    type: string;
    config: unknown;
    encryptedConfig: string | null;
  }): DatabaseDataSourceConfig {
    const publicConfig = dataSource.config as Record<string, unknown>;
    let connectionString: string;

    if (dataSource.encryptedConfig) {
      connectionString = this.encryption.decrypt(dataSource.encryptedConfig);
    } else {
      throw new Error('Database connectionString is not configured');
    }

    return {
      type: publicConfig.type as 'mysql' | 'postgresql' | 'mongodb',
      connectionString,
      tableNames: (publicConfig.tableNames as string[]) || undefined,
    };
  }

  /**
   * 格式化样本数据为文本
   */
  private formatSampleData(
    tableName: string,
    sampleData: unknown[],
    rowCount: number,
  ): string {
    const lines: string[] = [];
    lines.push(`Table: ${tableName}`);
    lines.push(`Total Rows: ${rowCount}`);
    lines.push(`Sample Data (${sampleData.length} rows):`);
    lines.push('');

    for (let i = 0; i < sampleData.length; i++) {
      const row = sampleData[i];
      lines.push(`Row ${i + 1}:`);
      if (typeof row === 'object' && row !== null) {
        for (const [key, value] of Object.entries(row)) {
          const valueStr =
            value === null
              ? 'NULL'
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
          lines.push(`  ${key}: ${valueStr}`);
        }
      } else {
        lines.push(`  ${String(row)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(datasourceId: string): Promise<{
    lastSyncAt: Date | null;
    lastSyncStatus: string | null;
    isRunning: boolean;
  }> {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${datasourceId} not found`);
    }

    // 检查是否有正在运行的同步任务
    const runningSync = await this.prisma.syncHistory.findFirst({
      where: {
        datasourceId,
        status: 'running',
      },
      orderBy: { createdAt: 'desc' },
    });

    // 获取最后一次同步记录
    const lastSync = await this.prisma.syncHistory.findFirst({
      where: { datasourceId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      lastSyncAt: dataSource.lastSyncAt,
      lastSyncStatus: lastSync?.status || null,
      isRunning: !!runningSync,
    };
  }
}

