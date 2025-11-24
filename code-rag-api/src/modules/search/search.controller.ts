import { Controller, Post, Body, HttpCode, HttpStatus, Headers, Query, Res, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { SearchService } from './search.service';
import { SearchHistoryService } from './search-history.service';
import { SearchDto } from './dto/search.dto';
import { SearchHistoryQueryDto, UpdateAdoptionStatusDto } from './dto/search-history.dto';
import { UserRole } from './types/role.types';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
// 检索功能所有角色都可以访问
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  /**
   * 执行向量检索
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 检索 API 限流：60 请求/分钟
  @ApiOperation({
    summary: '执行向量检索',
    description: '根据查询文本执行语义检索，返回相关文档和代码片段。支持角色权重、置信度计算、来源追溯等功能。',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: '用户 ID（可选，用于记录检索历史）',
    required: false,
  })
  @ApiHeader({
    name: 'x-user-role',
    description: '用户角色（可选，用于角色权重计算）',
    required: false,
    enum: UserRole,
  })
  @ApiResponse({
    status: 200,
    description: '检索成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            query: { type: 'string', example: '如何实现用户登录功能' },
            role: { type: 'string', nullable: true, example: 'developer' },
            total: { type: 'number', example: 5 },
            suspected: { type: 'boolean', example: false },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  score: { type: 'number' },
                  content: { type: 'string' },
                  highlightedContent: { type: 'string' },
                  contentType: { type: 'string' },
                  confidence: { type: 'number' },
                  isSuspected: { type: 'boolean' },
                  sourceLink: { type: 'object' },
                  sourceMetadata: { type: 'object' },
                },
              },
            },
            suggestion: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求过于频繁，请稍后再试' })
  async search(
    @Body() searchDto: SearchDto,
    @Headers('x-user-role') userRoleHeader?: string,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    // 优先使用请求体中的 role，其次使用请求头中的 x-user-role
    const role = searchDto.role || (userRoleHeader as UserRole | undefined);

    const response = await this.searchService.search(
      searchDto.query,
      {
        topK: searchDto.topK,
        minScore: searchDto.minScore,
        datasourceIds: searchDto.datasourceIds,
        contentTypes: searchDto.contentTypes,
        role,
      },
      userIdHeader,
    );

    return response;
  }

  /**
   * 批量导出来源链接
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量导出来源链接',
    description: '导出检索结果的来源链接，支持 JSON 和 CSV 格式。',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv'],
    required: false,
    description: '导出格式',
  })
  async exportSources(
    @Body() searchDto: SearchDto,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Headers('x-user-role') userRoleHeader?: string,
    @Res() res?: Response,
  ) {
    // 优先使用请求体中的 role，其次使用请求头中的 x-user-role
    const role = searchDto.role || (userRoleHeader as UserRole | undefined);

    const response = await this.searchService.search(searchDto.query, {
      topK: searchDto.topK,
      minScore: searchDto.minScore,
      datasourceIds: searchDto.datasourceIds,
      contentTypes: searchDto.contentTypes,
      role,
    });

    if (format === 'csv') {
      // 导出为 CSV 格式
      const csv = this.convertToCSV(response.results);
      res?.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res?.setHeader(
        'Content-Disposition',
        `attachment; filename="search-results-${Date.now()}.csv"`,
      );
      return res?.send(csv);
    } else {
      // 导出为 JSON 格式（默认）
      return {
        query: response.query,
        role: response.role,
        total: response.total,
        suspected: response.suspected,
        exportedAt: new Date().toISOString(),
        sources: response.results.map((result) => ({
          title: result.document?.title || 'Unknown',
          sourceLink: result.sourceLink,
          sourceMetadata: result.sourceMetadata,
          contentType: result.contentType,
          confidence: result.confidence,
          isSuspected: result.isSuspected,
        })),
      };
    }
  }

  /**
   * 转换为 CSV 格式
   */
  private convertToCSV(results: Array<{
    document?: { title?: string | null };
    sourceLink?: { url: string; type: string; displayText: string } | null;
    sourceMetadata?: {
      author?: string;
      modifiedBy?: string;
      updatedAt?: Date;
      syncedAt?: Date;
      datasourceType: string;
    };
    contentType: string;
    confidence?: number;
    isSuspected?: boolean;
  }>): string {
    const headers = [
      'Title',
      'Source URL',
      'Source Type',
      'Content Type',
      'Author',
      'Updated At',
      'Confidence',
      'Is Suspected',
    ];

    const rows = results.map((result) => [
      result.document?.title || 'Unknown',
      result.sourceLink?.url || '',
      result.sourceLink?.type || '',
      result.contentType,
      result.sourceMetadata?.author || result.sourceMetadata?.modifiedBy || '',
      result.sourceMetadata?.updatedAt?.toISOString() ||
        result.sourceMetadata?.syncedAt?.toISOString() ||
        '',
      result.confidence?.toFixed(2) || '',
      result.isSuspected ? 'Yes' : 'No',
    ]);

    const csvRows = [headers.join(','), ...rows.map((row) => row.join(','))];
    return csvRows.join('\n');
  }

  /**
   * 获取检索历史
   */
  @Get('history')
  @Roles('admin', 'developer')
  @ApiOperation({
    summary: '获取检索历史',
    description: '获取用户的检索历史记录，支持分页和筛选。',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: '用户 ID',
    required: true,
  })
  async getSearchHistory(
    @Query() query: SearchHistoryQueryDto,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    if (!userIdHeader) {
      throw new Error('User ID is required');
    }

    return this.searchHistoryService.getUserSearchHistory(
      userIdHeader,
      query,
    );
  }

  /**
   * 获取检索历史详情
   */
  @Get('history/:id')
  @ApiOperation({
    summary: '获取检索历史详情',
    description: '根据 ID 获取检索历史的详细信息。',
  })
  @ApiParam({
    name: 'id',
    description: '检索历史 ID',
  })
  async getSearchHistoryById(
    @Param('id') id: string,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    return this.searchHistoryService.getSearchHistoryById(id, userIdHeader);
  }

  /**
   * 重新执行历史查询
   */
  @Post('history/:id/rerun')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重新执行历史查询',
    description: '根据历史记录重新执行检索查询。',
  })
  @ApiParam({
    name: 'id',
    description: '检索历史 ID',
  })
  async rerunSearch(
    @Param('id') id: string,
    @Headers('x-user-role') userRoleHeader?: string,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    // 获取历史记录
    const history = await this.searchHistoryService.getSearchHistoryById(
      id,
      userIdHeader,
    );

    // 重新执行检索
    const role = (history.role as UserRole | undefined) ||
      (userRoleHeader as UserRole | undefined);

    return this.searchService.search(
      history.query,
      {
        role,
      },
      userIdHeader,
    );
  }

  /**
   * 更新采纳状态
   */
  @Patch('history/:id/adoption-status')
  @ApiOperation({
    summary: '更新采纳状态',
    description: '更新检索结果的采纳状态（adopted 或 rejected）。',
  })
  @ApiParam({
    name: 'id',
    description: '检索历史 ID',
  })
  async updateAdoptionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdoptionStatusDto,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    return this.searchHistoryService.updateAdoptionStatus(
      id,
      dto.adoptionStatus,
      userIdHeader,
    );
  }

  /**
   * 获取团队检索统计
   */
  @Get('history/stats')
  @Roles('admin', 'developer')
  @ApiOperation({
    summary: '获取团队检索统计',
    description: '获取团队的检索统计信息，包括热门查询、采纳率、角色分布等。',
  })
  @ApiQuery({
    name: 'userIds',
    required: false,
    description: '用户 ID 列表（逗号分隔）',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '开始日期（ISO 8601 格式）',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '结束日期（ISO 8601 格式）',
  })
  async getTeamStats(
    @Query('userIds') userIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userIdArray = userIds ? userIds.split(',') : undefined;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.searchHistoryService.getTeamStats(userIdArray, start, end);
  }
}

