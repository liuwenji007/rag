import { Injectable, Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private embeddings: OpenAIEmbeddings;

  constructor() {
    // 使用 OpenAI 嵌入模型（如果配置了 API Key）
    // 如果没有配置，可以使用其他模型
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;

    if (apiKey) {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: 'text-embedding-3-small', // 1536 维度
        ...(baseURL ? { configuration: { baseURL } } : {}),
      });
      this.logger.log('Using OpenAI embeddings model');
    } else {
      // 如果没有配置 OpenAI API Key，使用默认配置（需要后续实现其他模型支持）
      this.logger.warn(
        'OPENAI_API_KEY not configured, embeddings may not work. Please configure OPENAI_API_KEY or implement alternative embedding model.',
      );
      // 创建一个占位符，实际使用时需要配置
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: 'placeholder',
        modelName: 'text-embedding-3-small',
      });
    }
  }

  /**
   * 将文本转换为向量嵌入
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const result = await this.embeddings.embedQuery(text);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to embed text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 批量将文本转换为向量嵌入
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const results = await this.embeddings.embedDocuments(texts);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to embed documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 获取嵌入维度
   */
  getEmbeddingDimension(): number {
    return 1536; // text-embedding-3-small 的维度
  }
}

