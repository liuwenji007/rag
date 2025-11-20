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
} from '@nestjs/common';
import { DatasourcesService } from './datasources.service';
import { SyncService } from '../sync/sync.service';
import { CreateDataSourceDto } from './dto/create-datasource.dto';
import { UpdateDataSourceDto } from './dto/update-datasource.dto';
import { TestConnectionDto } from './dto/test-connection.dto';

@Controller('data-sources')
export class DatasourcesController {
  constructor(
    private readonly datasourcesService: DatasourcesService,
    private readonly syncService: SyncService,
  ) {}

  @Post()
  create(@Body() createDto: CreateDataSourceDto) {
    return this.datasourcesService.create(createDto);
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
  update(@Param('id') id: string, @Body() updateDto: UpdateDataSourceDto) {
    return this.datasourcesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.datasourcesService.remove(id);
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
    // 获取数据源类型，调用对应的同步方法
    const dataSource = await this.datasourcesService.findOne(id);
    
    if (dataSource.type === 'FEISHU') {
      return this.syncService.syncFeishuDataSource(id);
    } else if (dataSource.type === 'GITLAB') {
      return this.syncService.syncGitLabDataSource(id);
    } else if (dataSource.type === 'DATABASE') {
      return this.syncService.syncDatabaseDataSource(id);
    } else {
      throw new BadRequestException(
        `Sync not supported for data source type: ${dataSource.type}`,
      );
    }
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
}
