import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SyncModule } from '../../modules/sync/sync.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [SyncModule],
  providers: [SchedulerService, PrismaService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

