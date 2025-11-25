import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { SearchStatisticsService } from './search-statistics.service';
import { UserActivityService } from './user-activity.service';
import { DatasourceUsageService } from './datasource-usage.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [
    SearchStatisticsService,
    UserActivityService,
    DatasourceUsageService,
    PrismaService,
  ],
  exports: [SearchStatisticsService, UserActivityService, DatasourceUsageService],
})
export class ReportsModule {}

