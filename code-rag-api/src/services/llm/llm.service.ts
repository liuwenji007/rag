import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Readable } from 'stream';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private chatModel: BaseChatModel;
  // 重试配置
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000; // 初始延迟 1 秒

  constructor() {
    // 优先使用 OpenAI，如果没有配置则使用 Anthropic
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const openAIBaseURL = process.env.OPENAI_BASE_URL;

    if (openAIApiKey) {
      this.chatModel = new ChatOpenAI({
        openAIApiKey,
        modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3, // 降低温度以获得更稳定的输出
        ...(openAIBaseURL ? { configuration: { baseURL: openAIBaseURL } } : {}),
      });
      this.logger.log('Using OpenAI chat model');
    } else if (anthropicApiKey) {
      this.chatModel = new ChatAnthropic({
        anthropicApiKey,
        modelName: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        temperature: 0.3,
      });
      this.logger.log('Using Anthropic chat model');
    } else {
      this.logger.warn(
        'No LLM API key configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
      );
      // 创建一个占位符，实际使用时需要配置
      this.chatModel = new ChatOpenAI({
        openAIApiKey: 'placeholder',
        modelName: 'gpt-4o-mini',
        temperature: 0.3,
      });
    }
  }

  /**
   * 延迟函数（用于重试）
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'network',
      'econnreset',
      'etimedout',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
    ];

    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * 调用 LLM 生成文本（带重试机制）
   */
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      retries?: number; // 自定义重试次数
    },
  ): Promise<string> {
    const maxRetries = options?.retries ?? this.MAX_RETRIES;
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    // 如果提供了选项，需要重新创建模型实例（LangChain 不支持运行时修改参数）
    let model = this.chatModel;
    if (options?.temperature !== undefined || options?.maxTokens !== undefined) {
      const openAIApiKey = process.env.OPENAI_API_KEY;
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      const openAIBaseURL = process.env.OPENAI_BASE_URL;

      if (openAIApiKey) {
        model = new ChatOpenAI({
          openAIApiKey,
          modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: options?.temperature ?? 0.3,
          ...(openAIBaseURL ? { configuration: { baseURL: openAIBaseURL } } : {}),
          ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
        });
      } else if (anthropicApiKey) {
        model = new ChatAnthropic({
          anthropicApiKey,
          modelName: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          temperature: options?.temperature ?? 0.3,
          ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
        });
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await model.invoke(messages);
        if (attempt > 0) {
          this.logger.log(`LLM generation succeeded after ${attempt} retries`);
        }
        return response.content as string;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries && this.isRetryableError(lastError)) {
          const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt); // 指数退避
          this.logger.warn(
            `LLM generation failed (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}. Retrying in ${delayMs}ms...`,
          );
          await this.delay(delayMs);
        } else {
          // 不可重试的错误或已达到最大重试次数
          if (attempt >= maxRetries) {
            this.logger.error(
              `LLM generation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
            );
          } else {
            this.logger.error(
              `LLM generation failed with non-retryable error: ${lastError.message}`,
            );
          }
          throw lastError;
        }
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError || new Error('LLM generation failed');
  }

  /**
   * 调用 LLM 生成结构化 JSON（带重试机制）
   */
  async generateStructuredJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      retries?: number;
    },
  ): Promise<T> {
    try {
      // 在系统提示词中明确要求 JSON 格式输出
      const enhancedSystemPrompt = `${systemPrompt}\n\n请确保返回的是有效的 JSON 格式，不要包含任何额外的文本或 Markdown 代码块标记。`;

      const response = await this.generateText(
        enhancedSystemPrompt,
        userPrompt,
        options,
      );

      // 尝试解析 JSON（去除可能的 Markdown 代码块标记）
      let jsonString = response.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.error(
        `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error(
        `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 流式生成文本（用于长时间任务）
   */
  async *streamText(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): AsyncGenerator<string, void, unknown> {
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    // 创建支持流式输出的模型实例
    let model: BaseChatModel;
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const openAIBaseURL = process.env.OPENAI_BASE_URL;

    if (openAIApiKey) {
      model = new ChatOpenAI({
        openAIApiKey,
        modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: options?.temperature ?? 0.3,
        streaming: true, // 启用流式输出
        ...(openAIBaseURL ? { configuration: { baseURL: openAIBaseURL } } : {}),
        ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
      });
    } else if (anthropicApiKey) {
      model = new ChatAnthropic({
        anthropicApiKey,
        modelName: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        temperature: options?.temperature ?? 0.3,
        streaming: true, // 启用流式输出
        ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
      });
    } else {
      throw new Error('No LLM API key configured for streaming');
    }

    try {
      const stream = await model.stream(messages);

      for await (const chunk of stream) {
        const content = chunk.content;
        if (typeof content === 'string' && content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error(
        `LLM streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}

