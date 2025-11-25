import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DatasourcesService } from './datasources.service';
import { SyncService } from '../sync/sync.service';
import { SchedulerService } from '../../services/scheduler/scheduler.service';
import { MonitoringService } from '../../services/monitoring/monitoring.service';
import { AuditLogService, ActionType, ResourceType } from '../audit-logs/audit-log.service';
import { CreateDataSourceDto } from './dto/create-datasource.dto';
import { UpdateDataSourceDto } from './dto/update-datasource.dto';
import { TestConnectionDto } from './dto/test-connection.dto';

@Controller('data-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DatasourcesController {
  constructor(
    private readonly datasourcesService: DatasourcesService,
    private readonly syncService: SyncService,
    private readonly schedulerService: SchedulerService,
    private readonly monitoringService: MonitoringService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateDataSourceDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.datasourcesService.create(createDto);

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.DATASOURCE_CREATE,
        resourceType: ResourceType.DATASOURCE,
        resourceId: result.id,
        details: {
          name: result.name,
          type: result.type,
          enabled: result.enabled,
        },
        ipAddress: req?.ip || req?.socket?.remoteAddress || undefined,
        userAgent: req?.headers['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Get()
  findAll() {
    return this.datasourcesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.datasourcesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDataSourceDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.datasourcesService.update(id, updateDto);

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.DATASOURCE_UPDATE,
        resourceType: ResourceType.DATASOURCE,
        resourceId: id,
        details: {
          changes: updateDto,
        },
        ipAddress: req?.ip || req?.socket?.remoteAddress || undefined,
        userAgent: req?.headers['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const datasource = await this.datasourcesService.findOne(id);
    const result = await this.datasourcesService.remove(id);

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.DATASOURCE_DELETE,
        resourceType: ResourceType.DATASOURCE,
        resourceId: id,
        details: {
          name: datasource?.name,
          type: datasource?.type,
        },
        ipAddress: req?.ip || req?.socket?.remoteAddress || undefined,
        userAgent: req?.headers['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  testConnection(@Body() testDto: TestConnectionDto) {
    return this.datasourcesService.testConnection(testDto);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  testConnectionById(@Param('id') id: string) {
    return this.datasourcesService.testConnection({
      type: 'FEISHU', // 占位符，实际会从数据库读取
      config: {},
      datasourceId: id,
    } as TestConnectionDto & { datasourceId: string });
  }

  @Patch(':id/enable')
  enable(@Param('id') id: string) {
    return this.datasourcesService.enable(id);
  }

  @Patch(':id/disable')
  disable(@Param('id') id: string) {
    return this.datasourcesService.disable(id);
  }

  /**
   * 手动触发同步
   */
  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  async triggerSync(@Param('id') id: string) {
    // 使用调度服务触发同步（添加到队列）
    await this.schedulerService.triggerSync(id, 'manual');
    return {
      success: true,
      message: 'Sync job added to queue',
    };
  }

  /**
   * 获取同步历史
   */
  @Get(':id/sync-history')
  getSyncHistory(@Param('id') id: string) {
    return this.syncService.getSyncHistory(id);
  }

  /**
   * 获取同步状态
   */
  @Get(':id/sync-status')
  getSyncStatus(@Param('id') id: string) {
    return this.syncService.getSyncStatus(id);
  }

  /**
   * 获取数据源状态
   */
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.monitoringService.getDataSourceStatus(id);
  }

  /**
   * 获取数据源统计信息
   */
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.monitoringService.getDataSourceStats(id);
  }

  /**
   * 获取数据源健康度
   */
  @Get(':id/health')
  getHealth(@Param('id') id: string) {
    return this.monitoringService.getDataSourceHealth(id);
  }
}
