import type { RequirementParsingResult } from './requirement-parsing.interface';
import type { CodeMatchResult } from './code-matching.interface';
import type { TodoItem } from './todo.interface';

export interface DiffAnalysisResult {
  requirement: string;
  role?: string;
  changes: RequirementParsingResult;
  codeRecommendations: CodeMatchResult[];
  summary: string;
  todos: TodoItem[];
  generatedAt: Date;
}

export interface DiffAnalysisTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: DiffAnalysisResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

