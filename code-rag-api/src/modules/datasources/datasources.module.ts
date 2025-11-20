import { Module } from '@nestjs/common';
import { DatasourcesService } from './datasources.service';
import { DatasourcesController } from './datasources.controller';
import { EncryptionModule } from '../../services/encryption/encryption.module';
import { FeishuModule } from '../../services/feishu/feishu.module';
import { GitLabModule } from '../../services/gitlab/gitlab.module';
import { DatabaseModule } from '../../services/database/database.module';
import { SyncModule } from '../sync/sync.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [EncryptionModule, FeishuModule, GitLabModule, DatabaseModule, SyncModule],
  controllers: [DatasourcesController],
  providers: [DatasourcesService, PrismaService],
  exports: [DatasourcesService],
})
export class DatasourcesModule {}
