import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { UIRequirementsService } from './ui-requirements.service';
import { CreateUIRequirementDto } from './dto/create-ui-requirement.dto';
import { UpdateUIRequirementDto } from './dto/update-ui-requirement.dto';

@ApiTags('ui-requirements')
@Controller('documents/:id/ui-requirements')
export class UIRequirementsController {
  constructor(
    private readonly uiRequirementsService: UIRequirementsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '获取 PRD 文档的 UI 需求列表',
    description: '获取指定 PRD 文档的所有 UI 需求，按优先级排序。',
  })
  @ApiParam({ name: 'id', description: 'PRD 文档 ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取 UI 需求列表',
  })
  @ApiResponse({ status: 404, description: 'PRD 文档不存在' })
  async getUIRequirements(@Param('id') prdDocumentId: string) {
    return this.uiRequirementsService.getUIRequirements(prdDocumentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '手动创建 UI 需求',
    description: '为 PRD 文档手动创建一个 UI 需求。',
  })
  @ApiParam({ name: 'id', description: 'PRD 文档 ID' })
  @ApiBody({ type: CreateUIRequirementDto })
  @ApiHeader({ name: 'x-user-id', description: '用户 ID', required: false })
  @ApiResponse({
    status: 201,
    description: 'UI 需求创建成功',
  })
  @ApiResponse({ status: 404, description: 'PRD 文档不存在' })
  async createUIRequirement(
    @Param('id') prdDocumentId: string,
    @Body() dto: CreateUIRequirementDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.uiRequirementsService.createUIRequirement(
      prdDocumentId,
      dto,
      userId,
    );
  }

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '自动识别 UI 需求',
    description: '使用 LLM 自动识别 PRD 文档中的 UI 需求。',
  })
  @ApiParam({ name: 'id', description: 'PRD 文档 ID' })
  @ApiHeader({ name: 'x-user-id', description: '用户 ID', required: false })
  @ApiResponse({
    status: 200,
    description: 'UI 需求识别成功',
  })
  @ApiResponse({ status: 404, description: 'PRD 文档不存在' })
  async extractUIRequirements(
    @Param('id') prdDocumentId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.uiRequirementsService.extractUIRequirements(
      prdDocumentId,
      userId,
    );
  }

  @Get('export')
  @ApiOperation({
    summary: '导出 UI 需求列表',
    description: '导出 PRD 文档的 UI 需求列表，支持 JSON 和 Markdown 格式。',
  })
  @ApiParam({ name: 'id', description: 'PRD 文档 ID' })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'markdown'],
    required: false,
    description: '导出格式',
  })
  @ApiResponse({
    status: 200,
    description: '导出成功',
  })
  @ApiResponse({ status: 404, description: 'PRD 文档不存在' })
  async exportUIRequirements(
    @Param('id') prdDocumentId: string,
    @Query('format') format: 'json' | 'markdown' = 'json',
  ) {
    return this.uiRequirementsService.exportUIRequirements(
      prdDocumentId,
      format,
    );
  }

  @Put(':requirementId')
  @ApiOperation({
    summary: '更新 UI 需求',
    description: '更新 UI 需求的描述、优先级或状态。',
  })
  @ApiParam({ name: 'id', description: 'PRD 文档 ID' })
  @ApiParam({ name: 'requirementId', description: 'UI 需求 ID' })
  @ApiBody({ type: UpdateUIRequirementDto })
  @ApiHeader({ name: 'x-user-id', description: '用户 ID', required: false })
  @ApiResponse({
    status: 200,
    description: 'UI 需求更新成功',
  })
  @ApiResponse({ status: 404, description: 'UI 需求不存在' })
  async updateUIRequirement(
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateUIRequirementDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.uiRequirementsService.updateUIRequirement(
      requirementId,
      dto,
      userId,
    );
  }

  @Delete(':requirementId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除 UI 需求',
    description: '删除指定的 UI 需求。',
  })
  @ApiParam({ name: 'id', description: 'PRD 文档 ID' })
  @ApiParam({ name: 'requirementId', description: 'UI 需求 ID' })
  @ApiResponse({
    status: 200,
    description: 'UI 需求删除成功',
  })
  @ApiResponse({ status: 404, description: 'UI 需求不存在' })
  async deleteUIRequirement(@Param('requirementId') requirementId: string) {
    return this.uiRequirementsService.deleteUIRequirement(requirementId);
  }
}

