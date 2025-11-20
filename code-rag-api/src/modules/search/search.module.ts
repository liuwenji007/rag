import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchHistoryService } from './search-history.service';
import { MilvusModule } from '../../services/vector/milvus.module';
import { EmbeddingModule } from '../../services/embedding/embedding.module';
import { SourceLinkModule } from '../../services/source-link/source-link.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [MilvusModule, EmbeddingModule, SourceLinkModule],
  providers: [SearchService, SearchHistoryService, PrismaService],
  exports: [SearchService, SearchHistoryService],
})
export class SearchModule {}
