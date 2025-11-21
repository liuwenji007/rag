import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { DiffService } from './diff.service';
import { AnalyzeRequirementDto } from './dto/analyze-requirement.dto';

@ApiTags('diff')
@Controller('diff')
export class DiffController {
  constructor(private readonly diffService: DiffService) {}

  /**
   * 解析需求并识别变更点
   */
  @Post('parse-requirement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '解析需求并识别变更点',
    description: '使用 LLM 解析需求描述，识别新增功能点、修改功能点和影响范围。',
  })
  @ApiResponse({
    status: 200,
    description: '解析成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            newFeatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
              },
            },
            modifiedFeatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  affectedModules: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
              },
            },
            impactScope: {
              type: 'object',
              properties: {
                modules: { type: 'array', items: { type: 'string' } },
                dependencies: { type: 'array', items: { type: 'string' } },
                riskLevel: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async parseRequirement(@Body() dto: AnalyzeRequirementDto) {
    const result = await this.diffService.parseRequirement(dto.requirement);
    return result;
  }

  /**
   * 流式解析需求并识别变更点（用于长时间任务）
   */
  @Post('parse-requirement/stream')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({
    summary: '流式解析需求并识别变更点',
    description:
      '使用流式输出方式解析需求描述，适用于长时间任务。返回 Server-Sent Events (SSE) 格式的流式数据。',
  })
  @ApiResponse({
    status: 200,
    description: '流式解析成功',
    headers: {
      'Content-Type': {
        description: 'text/event-stream',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async streamParseRequirement(
    @Body() dto: AnalyzeRequirementDto,
    @Res() res: Response,
  ): Promise<void> {
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

    try {
      // 流式输出解析结果
      for await (const chunk of this.diffService.streamParseRequirement(
        dto.requirement,
      )) {
        // 发送 SSE 格式的数据
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // 发送结束标记
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      // 发送错误信息
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res.write(
        `data: ${JSON.stringify({ error: errorMessage })}\n\n`,
      );
      res.end();
    }
  }
}

