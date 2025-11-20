import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionModule } from '../../services/encryption/encryption.module';
import { FeishuModule } from '../../services/feishu/feishu.module';
import { GitLabModule } from '../../services/gitlab/gitlab.module';
import { DatabaseModule } from '../../services/database/database.module';

@Module({
  imports: [EncryptionModule, FeishuModule, GitLabModule, DatabaseModule],
  providers: [SyncService, PrismaService],
  exports: [SyncService],
})
export class SyncModule {}

