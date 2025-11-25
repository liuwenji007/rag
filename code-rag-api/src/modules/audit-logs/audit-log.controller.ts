import { Controller, Get, Query, UseGuards, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('审计日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: '查询审计日志' })
  async getAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditLogService.getAuditLogs(
      query.page || 1,
      query.limit || 20,
      {
        userId: query.userId,
        actionType: query.actionType,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
    );
  }

  @Get('stats')
  @ApiOperation({ summary: '获取审计日志统计' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAuditLogStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogService.getAuditLogStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('export/csv')
  @ApiOperation({ summary: '导出审计日志（CSV 格式）' })
  async exportCsv(
    @Query() query: QueryAuditLogsDto,
    @Res() res: Response,
  ) {
    const logs = await this.auditLogService.getAuditLogs(
      1,
      10000, // 导出最多 10000 条
      {
        userId: query.userId,
        actionType: query.actionType,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
    );

    // 生成 CSV
    const headers = ['时间', '用户', '操作类型', '资源类型', '资源ID', 'IP地址', '详情'];
    const rows = logs.logs.map((log) => [
      new Date(log.createdAt).toLocaleString('zh-CN'),
      log.user.email || log.user.name || log.userId,
      log.actionType,
      log.resourceType || '-',
      log.resourceId || '-',
      log.ipAddress || '-',
      JSON.stringify(log.details || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send('\ufeff' + csvContent); // 添加 BOM 以支持 Excel 正确显示中文
  }

  @Get('export/pdf')
  @ApiOperation({ summary: '导出审计日志（PDF 格式）' })
  async exportPdf(
    @Query() query: QueryAuditLogsDto,
    @Res() res: Response,
  ) {
    // PDF 导出需要额外的库（如 pdfkit），这里先返回 JSON
    // 实际实现时可以使用 pdfkit 或类似库生成 PDF
    const logs = await this.auditLogService.getAuditLogs(
      1,
      10000,
      {
        userId: query.userId,
        actionType: query.actionType,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
    );

    // 暂时返回 JSON，后续可以集成 PDF 生成库
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
    res.json(logs);
  }
}

