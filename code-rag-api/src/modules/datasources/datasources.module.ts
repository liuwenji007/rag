import { Module } from '@nestjs/common';
import { DatasourcesService } from './datasources.service';
import { DatasourcesController } from './datasources.controller';
import { EncryptionModule } from '../../services/encryption/encryption.module';
import { FeishuModule } from '../../services/feishu/feishu.module';
import { GitLabModule } from '../../services/gitlab/gitlab.module';
import { DatabaseModule } from '../../services/database/database.module';
import { SchedulerModule } from '../../services/scheduler/scheduler.module';
import { MonitoringModule as MonitoringServiceModule } from '../../services/monitoring/monitoring.module';
import { SyncModule } from '../sync/sync.module';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [EncryptionModule, FeishuModule, GitLabModule, DatabaseModule, SchedulerModule, MonitoringServiceModule, SyncModule, AuditLogModule],
  controllers: [DatasourcesController],
  providers: [DatasourcesService, PrismaService],
  exports: [DatasourcesService],
})
export class DatasourcesModule {}
