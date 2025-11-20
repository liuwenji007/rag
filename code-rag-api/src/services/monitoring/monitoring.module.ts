import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { DatasourcesModule } from '../../modules/datasources/datasources.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [DatasourcesModule],
  providers: [MonitoringService, PrismaService],
  exports: [MonitoringService],
})
export class MonitoringModule {}

