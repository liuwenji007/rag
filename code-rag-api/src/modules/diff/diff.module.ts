import { Module } from '@nestjs/common';
import { DiffController } from './diff.controller';
import { DiffService } from './diff.service';
import { DiffTaskService } from './diff-task.service';
import { LLMModule } from '../../services/llm/llm.module';
import { CacheModule } from '../../services/cache/cache.module';
import { SearchModule } from '../search/search.module';
import { SourceLinkModule } from '../../services/source-link/source-link.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [LLMModule, CacheModule, SearchModule, SourceLinkModule],
  controllers: [DiffController],
  providers: [DiffService, DiffTaskService, PrismaService],
  exports: [DiffService, DiffTaskService],
})
export class DiffModule {}

