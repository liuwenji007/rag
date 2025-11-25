import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../database/prisma.service';
import { FileStorageModule } from '../../services/file-storage/file-storage.module';
import { DocumentParserModule } from '../../services/document-parser/document-parser.module';
import { DocumentIndexingModule } from '../../services/document-indexing/document-indexing.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [
    FileStorageModule,
    DocumentParserModule,
    DocumentIndexingModule,
    AuditLogModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

