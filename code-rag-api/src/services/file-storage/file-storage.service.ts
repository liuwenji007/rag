import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'documents');

  async onModuleInit() {
    // 确保上传目录存在
    await this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory initialized: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
      throw error;
    }
  }

  /**
   * 生成文件存储路径
   * 格式: {year}/{month}/{documentId}/{filename}
   */
  generateFilePath(documentId: string, filename: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return path.join(year, month, documentId, filename);
  }

  /**
   * 获取完整文件路径
   */
  getFullPath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  /**
   * 保存文件
   */
  async saveFile(
    documentId: string,
    filename: string,
    fileStream: NodeJS.ReadableStream,
  ): Promise<string> {
    const relativePath = this.generateFilePath(documentId, filename);
    const fullPath = this.getFullPath(relativePath);

    // 确保目录存在
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    const writeStream = createWriteStream(fullPath);
    await pipelineAsync(fileStream, writeStream);

    this.logger.log(`File saved: ${relativePath}`);
    return relativePath;
  }

  /**
   * 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(relativePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${relativePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${relativePath}: ${error}`);
      // 文件不存在时忽略错误
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件大小
   */
  async getFileSize(relativePath: string): Promise<number> {
    const fullPath = this.getFullPath(relativePath);
    const stats = await fs.stat(fullPath);
    return stats.size;
  }
}

