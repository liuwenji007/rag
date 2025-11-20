import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionModule } from '../../services/encryption/encryption.module';
import { FeishuModule } from '../../services/feishu/feishu.module';
import { GitLabModule } from '../../services/gitlab/gitlab.module';
import { DatabaseModule } from '../../services/database/database.module';
import { MilvusModule } from '../../services/vector/milvus.module';
import { EmbeddingModule } from '../../services/embedding/embedding.module';

@Module({
  imports: [EncryptionModule, FeishuModule, GitLabModule, DatabaseModule, MilvusModule, EmbeddingModule],
  providers: [SyncService, PrismaService],
  exports: [SyncService],
})
export class SyncModule {}

