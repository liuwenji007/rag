import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { Readable } from 'stream';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    [key: string]: unknown;
  };
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  /**
   * 解析文档内容
   */
  async parseDocument(
    filePath: string,
    mimeType: string,
  ): Promise<ParsedDocument> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      if (mimeType === 'text/markdown' || ext === '.md') {
        return await this.parseMarkdown(filePath);
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === '.docx'
      ) {
        return await this.parseWord(filePath);
      } else if (mimeType === 'application/pdf' || ext === '.pdf') {
        return await this.parsePDF(filePath);
      } else if (mimeType.startsWith('image/')) {
        return await this.parseImage(filePath, mimeType);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse document ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 解析 Markdown 文件
   */
  private async parseMarkdown(filePath: string): Promise<ParsedDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const title = lines.find((line) => line.startsWith('# '))?.replace(/^# /, '') || path.basename(filePath, '.md');

    return {
      content,
      metadata: {
        title,
        wordCount: content.split(/\s+/).length,
      },
    };
  }

  /**
   * 解析 Word 文档
   */
  private async parseWord(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });

    // 提取标题（从 HTML 中）
    const titleMatch = htmlResult.value.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : path.basename(filePath, '.docx');

    return {
      content: result.value,
      metadata: {
        title,
        wordCount: result.value.split(/\s+/).length,
      },
    };
  }

  /**
   * 解析 PDF 文件
   */
  private async parsePDF(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);

    return {
      content: data.text,
      metadata: {
        title: data.info?.Title || path.basename(filePath, '.pdf'),
        author: data.info?.Author,
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      },
    };
  }

  /**
   * 解析图片文件（提取元信息）
   */
  private async parseImage(
    filePath: string,
    mimeType: string,
  ): Promise<ParsedDocument> {
    // 对于图片，我们只提取元信息，不提取文本内容
    // 图片的文本内容提取需要 OCR，这里暂时不实现
    const stats = await fs.stat(filePath);
    const filename = path.basename(filePath);

    return {
      content: '', // 图片没有文本内容
      metadata: {
        title: filename,
        mimeType,
        fileSize: stats.size,
      },
    };
  }

  /**
   * 从文件流解析文档
   */
  async parseDocumentFromStream(
    stream: Readable,
    mimeType: string,
    filename: string,
  ): Promise<ParsedDocument> {
    // 将流转换为 buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 保存到临时文件
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, filename);
    await fs.writeFile(tempPath, buffer);

    try {
      const result = await this.parseDocument(tempPath, mimeType);
      return result;
    } finally {
      // 清理临时文件
      try {
        await fs.unlink(tempPath);
      } catch (error) {
        this.logger.warn(`Failed to delete temp file ${tempPath}: ${error}`);
      }
    }
  }
}

