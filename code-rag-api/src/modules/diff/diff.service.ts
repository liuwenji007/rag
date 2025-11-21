import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../services/llm/llm.service';
import { CacheService } from '../../services/cache/cache.service';
import type {
  RequirementParsingResult,
  NewFeature,
  ModifiedFeature,
  ImpactScope,
} from './interfaces/requirement-parsing.interface';

@Injectable()
export class DiffService {
  private readonly logger = new Logger(DiffService.name);

  // 需求解析提示词模板
  private readonly REQUIREMENT_PARSING_SYSTEM_PROMPT = `你是一个需求分析专家，擅长分析软件需求并识别功能变更点。

你的任务是分析用户提供的需求描述，识别出：
1. 新增功能点（new_features）：需求中明确提到需要新增的功能
2. 修改功能点（modified_features）：需求中明确提到需要修改或优化的现有功能
3. 影响范围（impact_scope）：可能受影响的模块、依赖关系和风险等级

请仔细分析需求描述，理解业务上下文和技术实现细节。`;

  private readonly REQUIREMENT_PARSING_USER_PROMPT_TEMPLATE = `请分析以下需求描述，并以 JSON 格式返回分析结果。

需求描述：
{requirement}

请以 JSON 格式返回，格式如下：
{
  "new_features": [
    {
      "name": "功能名称",
      "description": "功能描述",
      "priority": "high|medium|low"
    }
  ],
  "modified_features": [
    {
      "name": "功能名称",
      "description": "修改描述",
      "affected_modules": ["模块1", "模块2"],
      "priority": "high|medium|low"
    }
  ],
  "impact_scope": {
    "modules": ["模块列表"],
    "dependencies": ["依赖列表"],
    "risk_level": "high|medium|low"
  }
}

注意：
- 如果某个类别没有内容，请返回空数组或空对象
- priority 和 risk_level 必须是 "high"、"medium" 或 "low" 之一
- 请确保返回的是有效的 JSON 格式`;

  // 缓存 TTL：24 小时（秒）
  private readonly CACHE_TTL = 24 * 60 * 60;
  private readonly CACHE_PREFIX = 'requirement-parsing';

  constructor(
    private readonly llmService: LLMService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 解析需求并识别变更点（带缓存）
   */
  async parseRequirement(
    requirement: string,
  ): Promise<RequirementParsingResult> {
    try {
      // 规范化需求文本（去除首尾空格，统一换行符）
      const normalizedRequirement = requirement.trim().replace(/\r\n/g, '\n');

      // 尝试从缓存获取
      const cachedResult = await this.cacheService.get<RequirementParsingResult>(
        this.CACHE_PREFIX,
        normalizedRequirement,
      );

      if (cachedResult) {
        this.logger.log('Cache hit for requirement parsing');
        return cachedResult;
      }

      this.logger.log('Cache miss, calling LLM for requirement parsing');

      // 缓存未命中，调用 LLM
      const userPrompt = this.REQUIREMENT_PARSING_USER_PROMPT_TEMPLATE.replace(
        '{requirement}',
        normalizedRequirement,
      );

      const result = await this.llmService.generateStructuredJSON<{
        new_features: Array<{
          name: string;
          description: string;
          priority: string;
        }>;
        modified_features: Array<{
          name: string;
          description: string;
          affected_modules: string[];
          priority: string;
        }>;
        impact_scope: {
          modules: string[];
          dependencies: string[];
          risk_level: string;
        };
      }>(this.REQUIREMENT_PARSING_SYSTEM_PROMPT, userPrompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      // 验证和规范化结果
      const normalizedResult = this.normalizeParsingResult(result);

      // 缓存结果
      await this.cacheService.set(
        this.CACHE_PREFIX,
        normalizedRequirement,
        normalizedResult,
        this.CACHE_TTL,
      );

      return normalizedResult;
    } catch (error) {
      this.logger.error(
        `Failed to parse requirement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 流式解析需求并识别变更点（用于长时间任务）
   */
  async *streamParseRequirement(
    requirement: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      // 规范化需求文本
      const normalizedRequirement = requirement.trim().replace(/\r\n/g, '\n');

      // 流式生成解析结果
      const userPrompt = this.REQUIREMENT_PARSING_USER_PROMPT_TEMPLATE.replace(
        '{requirement}',
        normalizedRequirement,
      );

      // 流式输出 LLM 响应
      for await (const chunk of this.llmService.streamText(
        this.REQUIREMENT_PARSING_SYSTEM_PROMPT,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 2000,
        },
      )) {
        yield chunk;
      }
    } catch (error) {
      this.logger.error(
        `Failed to stream parse requirement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 规范化解析结果
   */
  private normalizeParsingResult(result: {
    new_features?: unknown;
    modified_features?: unknown;
    impact_scope?: unknown;
  }): RequirementParsingResult {
    const normalizePriority = (
      priority: string,
    ): 'high' | 'medium' | 'low' => {
      const lower = priority.toLowerCase();
      if (lower === 'high' || lower === '高') return 'high';
      if (lower === 'medium' || lower === '中') return 'medium';
      return 'low';
    };

    const newFeatures: NewFeature[] = Array.isArray(result.new_features)
      ? result.new_features
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            name: String(item.name || ''),
            description: String(item.description || ''),
            priority: normalizePriority(String(item.priority || 'medium')),
          }))
      : [];

    const modifiedFeatures: ModifiedFeature[] = Array.isArray(
      result.modified_features,
    )
      ? result.modified_features
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            name: String(item.name || ''),
            description: String(item.description || ''),
            affectedModules: Array.isArray(item.affected_modules)
              ? item.affected_modules.map((m: unknown) => String(m))
              : [],
            priority: normalizePriority(String(item.priority || 'medium')),
          }))
      : [];

    const impactScope: ImpactScope = result.impact_scope &&
      typeof result.impact_scope === 'object'
      ? {
          modules: Array.isArray((result.impact_scope as { modules?: unknown }).modules)
            ? ((result.impact_scope as { modules: unknown[] }).modules.map((m: unknown) => String(m)))
            : [],
          dependencies: Array.isArray(
            (result.impact_scope as { dependencies?: unknown }).dependencies,
          )
            ? ((result.impact_scope as { dependencies: unknown[] }).dependencies.map((d: unknown) => String(d)))
            : [],
          riskLevel: normalizePriority(
            String(
              (result.impact_scope as { risk_level?: string }).risk_level ||
                'medium',
            ),
          ),
        }
      : {
          modules: [],
          dependencies: [],
          riskLevel: 'medium',
        };

    return {
      newFeatures,
      modifiedFeatures,
      impactScope,
    };
  }
}

