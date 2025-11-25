import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MonitoringModule } from '../../services/monitoring/monitoring.module';
import { SearchModule } from '../search/search.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [MonitoringModule, SearchModule],
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
  exports: [DashboardService],
})
export class DashboardModule {}

