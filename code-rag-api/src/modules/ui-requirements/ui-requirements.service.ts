import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUIRequirementDto, UIRequirementPriority } from './dto/create-ui-requirement.dto';
import { UpdateUIRequirementDto } from './dto/update-ui-requirement.dto';
import { LLMService } from '../../services/llm/llm.service';

export interface ExtractedUIRequirement {
  paragraphId?: string;
  description: string;
  priority: UIRequirementPriority;
  reasoning?: string;
}

@Injectable()
export class UIRequirementsService {
  private readonly logger = new Logger(UIRequirementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
  ) {}

  /**
   * 获取 PRD 文档的所有 UI 需求
   */
  async getUIRequirements(prdDocumentId: string) {
    // 检查 PRD 文档是否存在
    const prdDoc = await this.prisma.document.findFirst({
      where: {
        id: prdDocumentId,
        documentType: 'prd',
        deletedAt: null,
      },
    });

    if (!prdDoc) {
      throw new NotFoundException(`PRD document ${prdDocumentId} not found`);
    }

    const requirements = await this.prisma.uIRequirement.findMany({
      where: {
        prdId: prdDocumentId,
      },
      orderBy: [
        { priority: 'desc' }, // high > medium > low
        { extractedAt: 'asc' },
      ],
    });

    return requirements;
  }

  /**
   * 手动创建 UI 需求
   */
  async createUIRequirement(
    prdDocumentId: string,
    dto: CreateUIRequirementDto,
    userId?: string,
  ) {
    // 检查 PRD 文档是否存在
    const prdDoc = await this.prisma.document.findFirst({
      where: {
        id: prdDocumentId,
        documentType: 'prd',
        deletedAt: null,
      },
    });

    if (!prdDoc) {
      throw new NotFoundException(`PRD document ${prdDocumentId} not found`);
    }

    const requirement = await this.prisma.uIRequirement.create({
      data: {
        prdId: prdDocumentId,
        paragraphId: dto.paragraphId,
        description: dto.description,
        priority: dto.priority || UIRequirementPriority.MEDIUM,
        status: 'pending',
        extractedBy: userId,
      },
    });

    return requirement;
  }

  /**
   * 更新 UI 需求
   */
  async updateUIRequirement(
    requirementId: string,
    dto: UpdateUIRequirementDto,
    userId?: string,
  ) {
    const requirement = await this.prisma.uIRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new NotFoundException(`UI requirement ${requirementId} not found`);
    }

    const updated = await this.prisma.uIRequirement.update({
      where: { id: requirementId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    return updated;
  }

  /**
   * 删除 UI 需求
   */
  async deleteUIRequirement(requirementId: string) {
    const requirement = await this.prisma.uIRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new NotFoundException(`UI requirement ${requirementId} not found`);
    }

    await this.prisma.uIRequirement.delete({
      where: { id: requirementId },
    });

    return { success: true };
  }

  /**
   * 自动识别 PRD 中的 UI 需求
   */
  async extractUIRequirements(
    prdDocumentId: string,
    userId?: string,
  ): Promise<ExtractedUIRequirement[]> {
    // 检查 PRD 文档是否存在
    const prdDoc = await this.prisma.document.findFirst({
      where: {
        id: prdDocumentId,
        documentType: 'prd',
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!prdDoc) {
      throw new NotFoundException(`PRD document ${prdDocumentId} not found`);
    }

    const content = prdDoc.versions[0]?.content || prdDoc.content || '';
    if (!content) {
      this.logger.warn(`PRD document ${prdDocumentId} has no content to analyze`);
      return [];
    }

    // 使用 LLM 识别 UI 需求
    const systemPrompt = `你是一个专业的 UI 需求分析师。请分析 PRD 文档内容，识别所有需要 UI 设计的部分。
对于每个 UI 需求，请提供：
1. 需求描述（简洁明了）
2. 优先级（high/medium/low，基于功能重要性和依赖关系）
3. 优先级判断理由（可选）

请以 JSON 格式返回，包含一个 requirements 数组，每个元素包含 description、priority 和可选的 reasoning 字段。`;

    const userPrompt = `请分析以下 PRD 文档内容，识别所有需要 UI 设计的部分：

${content.substring(0, 8000)}`; // 限制长度避免超出 token 限制

    try {
      const response = await this.llmService.generateStructuredJSON<{
        requirements: ExtractedUIRequirement[];
      }>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 2000,
        },
      );

      const extractedRequirements = response.requirements || [];

      // 保存识别到的 UI 需求
      const savedRequirements = await Promise.all(
        extractedRequirements.map((req) =>
          this.prisma.uIRequirement.create({
            data: {
              prdId: prdDocumentId,
              description: req.description,
              priority: req.priority || UIRequirementPriority.MEDIUM,
              status: 'pending',
              extractedBy: userId,
            },
          }),
        ),
      );

      this.logger.log(
        `Extracted ${savedRequirements.length} UI requirements from PRD ${prdDocumentId}`,
      );

      return savedRequirements.map((req) => ({
        paragraphId: req.paragraphId || undefined,
        description: req.description,
        priority: req.priority as UIRequirementPriority,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to extract UI requirements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 导出 UI 需求列表
   */
  async exportUIRequirements(
    prdDocumentId: string,
    format: 'json' | 'markdown',
  ) {
    const prdDoc = await this.prisma.document.findFirst({
      where: {
        id: prdDocumentId,
        documentType: 'prd',
        deletedAt: null,
      },
    });

    if (!prdDoc) {
      throw new NotFoundException(`PRD document ${prdDocumentId} not found`);
    }

    const requirements = await this.getUIRequirements(prdDocumentId);

    if (format === 'json') {
      return {
        prdId: prdDoc.id,
        prdTitle: prdDoc.title,
        requirements: requirements.map((req) => ({
          id: req.id,
          description: req.description,
          priority: req.priority,
          status: req.status,
          paragraphId: req.paragraphId,
          extractedAt: req.extractedAt,
        })),
      };
    } else {
      // Markdown 格式
      const highPriority = requirements.filter((r) => r.priority === 'high');
      const mediumPriority = requirements.filter((r) => r.priority === 'medium');
      const lowPriority = requirements.filter((r) => r.priority === 'low');

      let markdown = `# UI 需求清单\n\n`;
      markdown += `**PRD**: ${prdDoc.title}\n`;
      markdown += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

      if (highPriority.length > 0) {
        markdown += `## 🔴 高优先级 (${highPriority.length})\n\n`;
        highPriority.forEach((req) => {
          const statusIcon = req.status === 'completed' ? '✅' : req.status === 'in_progress' ? '🔄' : '⏳';
          markdown += `- ${statusIcon} ${req.description}\n`;
        });
        markdown += '\n';
      }

      if (mediumPriority.length > 0) {
        markdown += `## 🟡 中优先级 (${mediumPriority.length})\n\n`;
        mediumPriority.forEach((req) => {
          const statusIcon = req.status === 'completed' ? '✅' : req.status === 'in_progress' ? '🔄' : '⏳';
          markdown += `- ${statusIcon} ${req.description}\n`;
        });
        markdown += '\n';
      }

      if (lowPriority.length > 0) {
        markdown += `## 🟢 低优先级 (${lowPriority.length})\n\n`;
        lowPriority.forEach((req) => {
          const statusIcon = req.status === 'completed' ? '✅' : req.status === 'in_progress' ? '🔄' : '⏳';
          markdown += `- ${statusIcon} ${req.description}\n`;
        });
        markdown += '\n';
      }

      return { content: markdown, format: 'markdown' };
    }
  }
}

