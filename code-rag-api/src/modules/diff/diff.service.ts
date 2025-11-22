import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../services/llm/llm.service';
import { CacheService } from '../../services/cache/cache.service';
import { SearchService } from '../search/search.service';
import { SourceLinkService } from '../../services/source-link/source-link.service';
import { PrismaService } from '../../database/prisma.service';
import type {
  RequirementParsingResult,
  NewFeature,
  ModifiedFeature,
  ImpactScope,
} from './interfaces/requirement-parsing.interface';
import type {
  CodeMatchResult,
  CodeMatch,
  CodeContext,
} from './interfaces/code-matching.interface';
import type { TodoList, TodoItem } from './interfaces/todo.interface';

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
    private readonly searchService: SearchService,
    private readonly sourceLinkService: SourceLinkService,
    private readonly prisma: PrismaService,
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

  /**
   * 匹配历史代码（为单个变更点）
   */
  async matchCodeForChangePoint(
    changePoint: string,
    options?: {
      topK?: number;
      minScore?: number;
      datasourceIds?: string[];
    },
  ): Promise<CodeMatchResult> {
    try {
      // 使用 SearchService 进行向量检索，只检索代码类型
      const searchResponse = await this.searchService.search(
        changePoint,
        {
          topK: options?.topK ?? 10,
          minScore: options?.minScore ?? 0.6,
          datasourceIds: options?.datasourceIds,
          contentTypes: ['code'], // 只检索代码类型
          role: undefined, // 代码匹配不需要角色权重
        },
      );

      // 转换为 CodeMatch 格式
      const matches: CodeMatch[] = await Promise.all(
        searchResponse.results.map(async (result) => {
          // 提取代码上下文
          const context = await this.extractCodeContext(result);

          // 计算匹配度（基于相似度分数）
          const similarity = this.calculateSimilarity(result);

          // 生成来源链接
          const sourceLink = result.sourceLink || null;

          return {
            id: result.id,
            code: result.content,
            context,
            similarity,
            sourceLink,
            metadata: {
              language: this.extractLanguage(result.metadata),
              datasourceId: result.datasourceId,
              documentId: result.documentId,
              chunkIndex: result.chunkIndex,
            },
          };
        }),
      );

      return {
        changePoint,
        matches,
      };
    } catch (error) {
      this.logger.error(
        `Failed to match code for change point: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 为多个变更点匹配历史代码
   */
  async matchCodeForChangePoints(
    changePoints: string[],
    options?: {
      topK?: number;
      minScore?: number;
      datasourceIds?: string[];
    },
  ): Promise<CodeMatchResult[]> {
    // 并行匹配所有变更点
    const results = await Promise.all(
      changePoints.map((changePoint) =>
        this.matchCodeForChangePoint(changePoint, options),
      ),
    );

    return results;
  }

  /**
   * 提取代码上下文
   */
  private async extractCodeContext(result: {
    documentId: string;
    chunkIndex: number;
    metadata: Record<string, unknown>;
  }): Promise<CodeContext> {
    const context: CodeContext = {
      filePath: String(result.metadata.filePath || result.metadata.path || ''),
    };

    // 从元数据中提取函数名、类名、模块名
    if (result.metadata.functionName) {
      context.functionName = String(result.metadata.functionName);
    }
    if (result.metadata.className) {
      context.className = String(result.metadata.className);
    }
    if (result.metadata.moduleName) {
      context.moduleName = String(result.metadata.moduleName);
    }

    // 尝试从 Document 中获取更多上下文信息
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: result.documentId },
        select: {
          metadata: true,
          content: true,
        },
      });

      if (document?.metadata && typeof document.metadata === 'object') {
        const metadata = document.metadata as Record<string, unknown>;
        if (metadata.filePath && !context.filePath) {
          context.filePath = String(metadata.filePath);
        }
        if (metadata.functionName && !context.functionName) {
          context.functionName = String(metadata.functionName);
        }
        if (metadata.className && !context.className) {
          context.className = String(metadata.className);
        }
        if (metadata.moduleName && !context.moduleName) {
          context.moduleName = String(metadata.moduleName);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to extract additional context from document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return context;
  }

  /**
   * 计算匹配度
   */
  private calculateSimilarity(result: {
    score?: number;
    originalScore?: number;
    contentType?: string;
  }): number {
    // 基础匹配度：使用原始相似度分数（如果可用），否则使用加权后的分数
    const baseSimilarity = result.originalScore ?? result.score ?? 0;

    // 代码类型权重（函数 > 类 > 模块 > 其他）
    let typeWeight = 1.0;
    if (result.contentType) {
      const contentType = String(result.contentType).toLowerCase();
      if (contentType.includes('function') || contentType.includes('method')) {
        typeWeight = 1.2;
      } else if (contentType.includes('class')) {
        typeWeight = 1.1;
      } else if (contentType.includes('module')) {
        typeWeight = 1.05;
      }
    }

    // 最终匹配度 = 基础匹配度 * 类型权重（限制在 0-1 之间）
    return Math.min(baseSimilarity * typeWeight, 1.0);
  }

  /**
   * 提取编程语言
   */
  private extractLanguage(metadata: Record<string, unknown>): string {
    if (metadata.language) {
      return String(metadata.language);
    }
    if (metadata.filePath) {
      const filePath = String(metadata.filePath);
      const ext = filePath.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        java: 'java',
        go: 'go',
        rs: 'rust',
        cpp: 'cpp',
        c: 'c',
        php: 'php',
        rb: 'ruby',
        swift: 'swift',
        kt: 'kotlin',
      };
      return languageMap[ext || ''] || 'unknown';
    }
    return 'unknown';
  }

  /**
   * 生成差异总结
   */
  async generateDiffSummary(
    requirement: string,
    options?: {
      includeCodeMatches?: boolean;
      includePRDFragments?: boolean;
      codeMatchTopK?: number;
      prdTopK?: number;
    },
  ): Promise<string> {
    try {
      // 1. 解析需求
      const requirementParsing = await this.parseRequirement(requirement);

      // 2. 匹配历史代码（如果需要）
      let codeMatches: CodeMatchResult[] = [];
      if (options?.includeCodeMatches !== false) {
        const allChangePoints = [
          ...requirementParsing.newFeatures.map((f) => f.description),
          ...requirementParsing.modifiedFeatures.map((f) => f.description),
        ];
        if (allChangePoints.length > 0) {
          codeMatches = await this.matchCodeForChangePoints(
            allChangePoints,
            {
              topK: options?.codeMatchTopK ?? 5,
              minScore: 0.6,
            },
          );
        }
      }

      // 3. 检索 PRD 片段（如果需要）
      let prdFragments: Array<{ content: string; source: string }> = [];
      if (options?.includePRDFragments !== false) {
        const prdSearch = await this.searchService.search(requirement, {
          topK: options?.prdTopK ?? 5,
          minScore: 0.6,
          contentTypes: ['markdown', 'document'], // 只检索文档类型
        });
        prdFragments = prdSearch.results.map((result) => ({
          content: result.content,
          source: result.sourceLink?.url || result.document?.title || 'Unknown',
        }));
      }

      // 4. 使用 LLM 生成差异总结
      const summary = await this.generateSummaryWithLLM(
        requirement,
        requirementParsing,
        codeMatches,
        prdFragments,
      );

      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to generate diff summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 使用 LLM 生成差异总结
   */
  private async generateSummaryWithLLM(
    requirement: string,
    requirementParsing: RequirementParsingResult,
    codeMatches: CodeMatchResult[],
    prdFragments: Array<{ content: string; source: string }>,
  ): Promise<string> {
    const systemPrompt = `你是一个技术文档专家，擅长生成清晰、结构化的需求差异分析总结。

你的任务是根据需求解析结果、代码匹配结果和 PRD 片段，生成一份 Markdown 格式的差异分析总结。

总结应该包含以下部分：
1. 新增功能点摘要（包含功能描述、优先级、推荐实现方式、参考代码）
2. 修改功能点摘要（包含修改描述、影响模块、优先级、修改建议、参考代码）
3. 影响范围分析（列出受影响的模块、依赖关系、风险等级）
4. 需求背景（PRD 片段）
5. 参考实现代码（历史代码对比）

请确保总结清晰可读，包含具体的变更项和对应的来源链接。`;

    const userPrompt = this.buildSummaryPrompt(
      requirement,
      requirementParsing,
      codeMatches,
      prdFragments,
    );

    const summary = await this.llmService.generateText(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.3,
        maxTokens: 4000,
      },
    );

    return summary;
  }

  /**
   * 构建总结提示词
   */
  private buildSummaryPrompt(
    requirement: string,
    requirementParsing: RequirementParsingResult,
    codeMatches: CodeMatchResult[],
    prdFragments: Array<{ content: string; source: string }>,
  ): string {
    let prompt = `请根据以下信息生成一份 Markdown 格式的需求差异分析总结。

## 原始需求描述
${requirement}

## 需求解析结果

### 新增功能点
${requirementParsing.newFeatures
  .map(
    (f, idx) => `${idx + 1}. **${f.name}**
   - 描述: ${f.description}
   - 优先级: ${f.priority}`,
  )
  .join('\n\n')}

### 修改功能点
${requirementParsing.modifiedFeatures
  .map(
    (f, idx) => `${idx + 1}. **${f.name}**
   - 描述: ${f.description}
   - 影响模块: ${f.affectedModules.join(', ')}
   - 优先级: ${f.priority}`,
  )
  .join('\n\n')}

### 影响范围
- 受影响的模块: ${requirementParsing.impactScope.modules.join(', ')}
- 依赖关系: ${requirementParsing.impactScope.dependencies.join(', ')}
- 风险等级: ${requirementParsing.impactScope.riskLevel}
`;

    // 添加代码匹配结果
    if (codeMatches.length > 0) {
      prompt += `\n## 匹配的历史代码\n\n`;
      codeMatches.forEach((match, idx) => {
        prompt += `### 变更点 ${idx + 1}: ${match.changePoint}\n\n`;
        match.matches.slice(0, 3).forEach((codeMatch, codeIdx) => {
          prompt += `**参考代码 ${codeIdx + 1}** (匹配度: ${(codeMatch.similarity * 100).toFixed(1)}%)\n`;
          prompt += `- 文件路径: ${codeMatch.context.filePath}\n`;
          if (codeMatch.context.functionName) {
            prompt += `- 函数名: ${codeMatch.context.functionName}\n`;
          }
          if (codeMatch.sourceLink) {
            prompt += `- 来源: ${codeMatch.sourceLink.url}\n`;
          }
          prompt += `\n\`\`\`${codeMatch.metadata.language}\n${codeMatch.code.substring(0, 200)}${codeMatch.code.length > 200 ? '...' : ''}\n\`\`\`\n\n`;
        });
      });
    }

    // 添加 PRD 片段
    if (prdFragments.length > 0) {
      prompt += `\n## 相关 PRD 片段\n\n`;
      prdFragments.forEach((fragment, idx) => {
        prompt += `### PRD 片段 ${idx + 1} (来源: ${fragment.source})\n\n`;
        prompt += `${fragment.content.substring(0, 500)}${fragment.content.length > 500 ? '...' : ''}\n\n`;
      });
    }

    prompt += `\n请根据以上信息生成一份完整的 Markdown 格式差异分析总结，确保包含所有必需的部分和来源链接。`;

    return prompt;
  }

  /**
   * 生成待办列表
   */
  async generateTodos(
    requirement: string,
    options?: {
      includeCodeMatches?: boolean;
      codeMatchTopK?: number;
    },
  ): Promise<TodoList> {
    try {
      // 1. 解析需求
      const requirementParsing = await this.parseRequirement(requirement);

      // 2. 匹配历史代码（如果需要）
      let codeMatches: CodeMatchResult[] = [];
      if (options?.includeCodeMatches !== false) {
        const allChangePoints = [
          ...requirementParsing.newFeatures.map((f) => f.description),
          ...requirementParsing.modifiedFeatures.map((f) => f.description),
        ];
        if (allChangePoints.length > 0) {
          codeMatches = await this.matchCodeForChangePoints(
            allChangePoints,
            {
              topK: options?.codeMatchTopK ?? 5,
              minScore: 0.6,
            },
          );
        }
      }

      // 3. 生成待办项
      const todos: TodoItem[] = [];

      // 为新增功能点创建待办项
      requirementParsing.newFeatures.forEach((feature, idx) => {
        const codeMatch = codeMatches.find((match) =>
          match.changePoint.includes(feature.description) ||
          feature.description.includes(match.changePoint),
        );

        todos.push({
          id: `new-${idx + 1}`,
          title: `新增功能: ${feature.name}`,
          description: feature.description,
          priority: feature.priority,
          type: 'new_feature',
          relatedDocs: [], // 可以从 PRD 检索结果中获取
          codeRefs: codeMatch
            ? codeMatch.matches.slice(0, 3).map((match) => ({
                filePath: match.context.filePath,
                url: match.sourceLink?.url || '',
                description: `匹配度: ${(match.similarity * 100).toFixed(1)}%`,
              }))
            : [],
          status: 'pending',
          createdAt: new Date(),
        });
      });

      // 为修改功能点创建待办项
      requirementParsing.modifiedFeatures.forEach((feature, idx) => {
        const codeMatch = codeMatches.find((match) =>
          match.changePoint.includes(feature.description) ||
          feature.description.includes(match.changePoint),
        );

        todos.push({
          id: `modified-${idx + 1}`,
          title: `修改功能: ${feature.name}`,
          description: `${feature.description}\n影响模块: ${feature.affectedModules.join(', ')}`,
          priority: feature.priority,
          type: 'modified_feature',
          relatedDocs: [],
          codeRefs: codeMatch
            ? codeMatch.matches.slice(0, 3).map((match) => ({
                filePath: match.context.filePath,
                url: match.sourceLink?.url || '',
                description: `匹配度: ${(match.similarity * 100).toFixed(1)}%`,
              }))
            : [],
          status: 'pending',
          createdAt: new Date(),
        });
      });

      return {
        requirement,
        todos,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate todos: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 导出待办列表为 JSON 格式
   */
  exportTodosAsJSON(todoList: TodoList): string {
    return JSON.stringify(todoList, null, 2);
  }

  /**
   * 导出待办列表为 Markdown 格式
   */
  exportTodosAsMarkdown(todoList: TodoList): string {
    let markdown = `# 待办事项列表\n\n`;
    markdown += `**需求**: ${todoList.requirement}\n\n`;
    markdown += `**生成时间**: ${todoList.generatedAt.toISOString()}\n\n`;
    markdown += `---\n\n`;

    // 按优先级分组
    const highPriority = todoList.todos.filter((t) => t.priority === 'high');
    const mediumPriority = todoList.todos.filter(
      (t) => t.priority === 'medium',
    );
    const lowPriority = todoList.todos.filter((t) => t.priority === 'low');

    if (highPriority.length > 0) {
      markdown += `## 🔴 高优先级\n\n`;
      highPriority.forEach((todo, idx) => {
        markdown += this.formatTodoAsMarkdown(todo, idx + 1);
      });
    }

    if (mediumPriority.length > 0) {
      markdown += `## 🟡 中优先级\n\n`;
      mediumPriority.forEach((todo, idx) => {
        markdown += this.formatTodoAsMarkdown(
          todo,
          highPriority.length + idx + 1,
        );
      });
    }

    if (lowPriority.length > 0) {
      markdown += `## 🟢 低优先级\n\n`;
      lowPriority.forEach((todo, idx) => {
        markdown += this.formatTodoAsMarkdown(
          todo,
          highPriority.length + mediumPriority.length + idx + 1,
        );
      });
    }

    return markdown;
  }

  /**
   * 格式化单个待办项为 Markdown
   */
  private formatTodoAsMarkdown(todo: TodoItem, index: number): string {
    let markdown = `### ${index}. ${todo.title}\n\n`;
    markdown += `- **类型**: ${todo.type === 'new_feature' ? '新增功能' : '修改功能'}\n`;
    markdown += `- **优先级**: ${todo.priority}\n`;
    markdown += `- **状态**: ${todo.status}\n`;
    markdown += `- **描述**: ${todo.description}\n\n`;

    if (todo.codeRefs.length > 0) {
      markdown += `**参考代码**:\n`;
      todo.codeRefs.forEach((ref) => {
        markdown += `- [${ref.filePath}](${ref.url}) - ${ref.description}\n`;
      });
      markdown += `\n`;
    }

    if (todo.relatedDocs.length > 0) {
      markdown += `**相关文档**:\n`;
      todo.relatedDocs.forEach((doc) => {
        markdown += `- [${doc.title}](${doc.url})\n`;
      });
      markdown += `\n`;
    }

    markdown += `---\n\n`;
    return markdown;
  }
}

