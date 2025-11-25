import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchHistoryService } from './search-history.service';
import { FeedbackService } from './feedback.service';
import { MilvusModule } from '../../services/vector/milvus.module';
import { EmbeddingModule } from '../../services/embedding/embedding.module';
import { SourceLinkModule } from '../../services/source-link/source-link.module';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [MilvusModule, EmbeddingModule, SourceLinkModule, AuditLogModule],
  controllers: [SearchController],
  providers: [SearchService, SearchHistoryService, FeedbackService, PrismaService],
  exports: [SearchService, SearchHistoryService, FeedbackService],
})
export class SearchModule {}
