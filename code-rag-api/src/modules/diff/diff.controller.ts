import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Header,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import { DiffService } from './diff.service';
import { DiffTaskService } from './diff-task.service';
import { AnalyzeRequirementDto } from './dto/analyze-requirement.dto';
import { MatchCodeDto, MatchCodeBatchDto } from './dto/match-code.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { GenerateTodosDto, ExportFormat } from './dto/generate-todos.dto';
import { AnalyzeDiffDto } from './dto/analyze-diff.dto';

@ApiTags('diff')
@Controller('diff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'developer')
export class DiffController {
  constructor(
    private readonly diffService: DiffService,
    private readonly diffTaskService: DiffTaskService,
  ) {}

  /**
   * 解析需求并识别变更点
   */
  @Post('parse-requirement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '解析需求并识别变更点',
    description:
      '使用 LLM 解析需求描述，识别新增功能点、修改功能点和影响范围。',
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
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * 匹配历史代码（单个变更点）
   */
  @Post('match-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '匹配历史代码',
    description:
      '为单个变更点匹配相似的历史代码，返回代码片段、上下文、匹配度和来源链接。',
  })
  @ApiResponse({
    status: 200,
    description: '匹配成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            changePoint: { type: 'string' },
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  context: {
                    type: 'object',
                    properties: {
                      filePath: { type: 'string' },
                      functionName: { type: 'string', nullable: true },
                      className: { type: 'string', nullable: true },
                      moduleName: { type: 'string', nullable: true },
                    },
                  },
                  similarity: { type: 'number' },
                  sourceLink: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      url: { type: 'string' },
                      type: { type: 'string' },
                      displayText: { type: 'string' },
                    },
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      language: { type: 'string' },
                      datasourceId: { type: 'string' },
                      documentId: { type: 'string' },
                       chunkIndex: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async matchCode(@Body() dto: MatchCodeDto) {
    const result = await this.diffService.matchCodeForChangePoint(
      dto.changePoint,
      {
        topK: dto.topK,
        minScore: dto.minScore,
        datasourceIds: dto.datasourceIds,
      },
    );
    return result;
  }

  /**
   * 批量匹配历史代码（多个变更点）
   */
  @Post('match-code/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量匹配历史代码',
    description: '为多个变更点匹配相似的历史代码，返回每个变更点的匹配结果。',
  })
  @ApiResponse({
    status: 200,
    description: '批量匹配成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              changePoint: { type: 'string' },
              matches: { type: 'array' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async matchCodeBatch(@Body() dto: MatchCodeBatchDto) {
    const results = await this.diffService.matchCodeForChangePoints(
      dto.changePoints,
      {
        topK: dto.topK,
        minScore: dto.minScore,
        datasourceIds: dto.datasourceIds,
      },
    );
    return results;
  }

  /**
   * 生成差异总结
   */
  @Post('generate-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '生成差异总结',
    description:
      '基于需求描述自动生成差异分析总结，包含新增功能点、修改功能点、影响范围、PRD 片段和参考代码。返回 Markdown 格式的总结。',
  })
  @ApiResponse({
    status: 200,
    description: '总结生成成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Markdown 格式的差异分析总结',
              example: '# 需求差异分析总结\n\n## 一、新增功能点\n...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async generateSummary(@Body() dto: GenerateSummaryDto) {
    const summary = await this.diffService.generateDiffSummary(
      dto.requirement,
      {
        includeCodeMatches: dto.includeCodeMatches,
        includePRDFragments: dto.includePRDFragments,
        codeMatchTopK: dto.codeMatchTopK,
        prdTopK: dto.prdTopK,
      },
    );
    return { summary };
  }

  /**
   * 生成待办列表
   */
  @Post('generate-todos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '生成待办列表',
    description:
      '基于需求描述自动生成待办事项列表，包含新增功能点和修改功能点的待办项。支持导出为 JSON 或 Markdown 格式。',
  })
  @ApiResponse({
    status: 200,
    description: '待办列表生成成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            todos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  type: {
                    type: 'string',
                    enum: ['new_feature', 'modified_feature'],
                  },
                  relatedDocs: { type: 'array' },
                  codeRefs: { type: 'array' },
                  status: {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'completed'],
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            exported: {
              type: 'object',
              properties: {
                format: { type: 'string' },
                content: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async generateTodos(@Body() dto: GenerateTodosDto) {
    const todoList = await this.diffService.generateTodos(dto.requirement, {
      includeCodeMatches: dto.includeCodeMatches,
      codeMatchTopK: dto.codeMatchTopK,
    });

    // 根据导出格式导出
    const format = dto.exportFormat || ExportFormat.JSON;
    let exportedContent: string;
    if (format === ExportFormat.MARKDOWN) {
      exportedContent = this.diffService.exportTodosAsMarkdown(todoList);
    } else {
      exportedContent = this.diffService.exportTodosAsJSON(todoList);
    }

    return {
      todos: todoList.todos,
      exported: {
        format,
        content: exportedContent,
      },
    };
  }

  /**
   * 执行完整的差异分析（同步模式）
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '执行完整的差异分析（同步模式）',
    description:
      '执行完整的差异分析流程，包括需求解析、代码匹配、差异总结和待办列表生成。同步返回所有结果。',
  })
  @ApiResponse({
    status: 200,
    description: '差异分析成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            requirement: { type: 'string' },
            role: { type: 'string', nullable: true },
            changes: { type: 'object' },
            codeRecommendations: { type: 'array' },
            summary: { type: 'string' },
            todos: { type: 'array' },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async analyzeDiff(@Body() dto: AnalyzeDiffDto) {
    const result = await this.diffService.analyzeDiff(dto.requirement, {
      role: dto.role,
      includeCodeMatches: dto.includeCodeMatches,
      includePRDFragments: dto.includePRDFragments,
      includeSummary: dto.includeSummary,
      includeTodos: dto.includeTodos,
      codeMatchTopK: dto.codeMatchTopK,
      prdTopK: dto.prdTopK,
    });
    return result;
  }

  /**
   * 创建异步差异分析任务
   */
  @Post('analyze/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '创建异步差异分析任务',
    description:
      '创建异步差异分析任务，立即返回任务 ID。通过 GET /api/v1/diff/tasks/:taskId 查询任务状态和结果。',
  })
  @ApiResponse({
    status: 202,
    description: '任务创建成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 202 },
        message: { type: 'string', example: 'Task created' },
        data: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            status: { type: 'string', enum: ['pending'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createDiffAnalysisTask(@Body() dto: AnalyzeDiffDto) {
    const taskId = await this.diffTaskService.createTask(dto.requirement, {
      role: dto.role,
      includeCodeMatches: dto.includeCodeMatches,
      includePRDFragments: dto.includePRDFragments,
      includeSummary: dto.includeSummary,
      includeTodos: dto.includeTodos,
      codeMatchTopK: dto.codeMatchTopK,
      prdTopK: dto.prdTopK,
    });

    const task = this.diffTaskService.getTaskStatus(taskId);
    return {
      taskId,
      status: task?.status || 'pending',
      createdAt: task?.createdAt || new Date(),
    };
  }

  /**
   * 查询差异分析任务状态
   */
  @Get('tasks/:taskId')
  @ApiOperation({
    summary: '查询差异分析任务状态',
    description: '根据任务 ID 查询差异分析任务的状态和结果。',
  })
  @ApiParam({
    name: 'taskId',
    description: '任务 ID',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
            },
            result: { type: 'object', nullable: true },
            error: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async getTaskStatus(@Param('taskId') taskId: string) {
    const task = this.diffTaskService.getTaskStatus(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return task;
  }
}
