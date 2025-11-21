import { Module } from '@nestjs/common';
import { DiffController } from './diff.controller';
import { DiffService } from './diff.service';
import { LLMModule } from '../../services/llm/llm.module';
import { CacheModule } from '../../services/cache/cache.module';

@Module({
  imports: [LLMModule, CacheModule],
  controllers: [DiffController],
  providers: [DiffService],
  exports: [DiffService],
})
export class DiffModule {}

