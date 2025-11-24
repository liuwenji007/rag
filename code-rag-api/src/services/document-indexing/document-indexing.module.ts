import { Module } from '@nestjs/common';
import { DocumentIndexingService } from './document-indexing.service';
import { DocumentChunkingService } from './document-chunking.service';
import { DocumentIndexingTaskService } from './document-indexing-task.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { DocumentParserModule } from '../document-parser/document-parser.module';
import { MilvusModule } from '../vector/milvus.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [
    FileStorageModule,
    DocumentParserModule,
    MilvusModule,
    EmbeddingModule,
  ],
  providers: [
    DocumentIndexingService,
    DocumentChunkingService,
    DocumentIndexingTaskService,
    PrismaService,
  ],
  exports: [
    DocumentIndexingService,
    DocumentChunkingService,
    DocumentIndexingTaskService,
  ],
})
export class DocumentIndexingModule {}

