import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { SearchStatisticsService } from './search-statistics.service';
import { UserActivityService } from './user-activity.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [SearchStatisticsService, UserActivityService, PrismaService],
  exports: [SearchStatisticsService, UserActivityService],
})
export class ReportsModule {}

