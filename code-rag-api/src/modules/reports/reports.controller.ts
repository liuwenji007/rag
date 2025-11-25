import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { SearchStatisticsService } from './search-statistics.service';
import { UserActivityService } from './user-activity.service';
import { DatasourceUsageService } from './datasource-usage.service';
import { BusinessProcessService } from './business-process.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('报表')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly searchStatisticsService: SearchStatisticsService,
    private readonly userActivityService: UserActivityService,
    private readonly datasourceUsageService: DatasourceUsageService,
    private readonly businessProcessService: BusinessProcessService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: '获取检索统计报表' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: '角色筛选',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: '用户 ID 筛选',
  })
  async getSearchStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
  ) {
    return this.searchStatisticsService.getSearchStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      role,
      userId,
    );
  }

  @Get('search/export/csv')
  @ApiOperation({ summary: '导出检索统计报表（CSV）' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: '角色筛选',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: '用户 ID 筛选',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="search-statistics.csv"')
  async exportSearchStatisticsCsv(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
  ) {
    const csv = await this.searchStatisticsService.exportToCsv(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      role,
      userId,
    );

    res.send(csv);
  }

  @Get('user-activity')
  @ApiOperation({ summary: '获取用户活跃度报表' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  async getUserActivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.userActivityService.getUserActivityStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('user-activity/export/csv')
  @ApiOperation({ summary: '导出用户活跃度报表（CSV）' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="user-activity.csv"')
  async exportUserActivityCsv(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.userActivityService.exportToCsv(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    res.send(csv);
  }

  @Get('datasource-usage')
  @ApiOperation({ summary: '获取数据源使用情况报表' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  async getDatasourceUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.datasourceUsageService.getDatasourceUsageStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('datasource-usage/export/csv')
  @ApiOperation({ summary: '导出数据源使用情况报表（CSV）' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="datasource-usage.csv"')
  async exportDatasourceUsageCsv(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.datasourceUsageService.exportToCsv(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    res.send(csv);
  }

  @Get('business-process')
  @ApiOperation({ summary: '获取业务流程完成时间统计' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  async getBusinessProcess(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.businessProcessService.getBusinessProcessStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('business-process/export/csv')
  @ApiOperation({ summary: '导出业务流程完成时间统计（CSV）' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期（ISO 8601 格式）',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="business-process.csv"')
  async exportBusinessProcessCsv(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.businessProcessService.exportToCsv(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    res.send(csv);
  }
}

