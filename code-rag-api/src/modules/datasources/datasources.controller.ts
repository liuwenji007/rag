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
} from '@nestjs/common';
import { DatasourcesService } from './datasources.service';
import { CreateDataSourceDto } from './dto/create-datasource.dto';
import { UpdateDataSourceDto } from './dto/update-datasource.dto';
import { TestConnectionDto } from './dto/test-connection.dto';

@Controller('data-sources')
export class DatasourcesController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

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
}
