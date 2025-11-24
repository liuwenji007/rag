import { Injectable, Logger } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface DocumentChunk {
  content: string;
  metadata: {
    documentId: string;
    chunkIndex: number;
    documentType?: string;
    title?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class DocumentChunkingService {
  private readonly logger = new Logger(DocumentChunkingService.name);
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;

  /**
   * 将文档内容分块
   */
  async chunkDocument(
    content: string,
    documentId: string,
    metadata?: {
      documentType?: string;
      title?: string;
      [key: string]: unknown;
    },
  ): Promise<DocumentChunk[]> {
    if (!content || content.trim().length === 0) {
      this.logger.warn(`Document ${documentId} has no content to chunk`);
      return [];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.CHUNK_SIZE,
      chunkOverlap: this.CHUNK_OVERLAP,
    });

    const chunks = await splitter.splitText(content);

    this.logger.log(
      `Document ${documentId} split into ${chunks.length} chunks`,
    );

    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        documentId,
        chunkIndex: index,
        ...metadata,
      },
    }));
  }
}

