import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { SearchStatisticsService } from './search-statistics.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [SearchStatisticsService, PrismaService],
  exports: [SearchStatisticsService],
})
export class ReportsModule {}

