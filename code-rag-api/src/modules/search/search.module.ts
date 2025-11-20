import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { MilvusModule } from '../../services/vector/milvus.module';
import { EmbeddingModule } from '../../services/embedding/embedding.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [MilvusModule, EmbeddingModule],
  providers: [SearchService, PrismaService],
  exports: [SearchService],
})
export class SearchModule {}

