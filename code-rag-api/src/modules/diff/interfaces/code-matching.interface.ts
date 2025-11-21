export interface CodeContext {
  filePath: string;
  functionName?: string;
  className?: string;
  moduleName?: string;
  beforeCode?: string; // 前文代码
  afterCode?: string; // 后文代码
}

export interface CodeMatch {
  id: string;
  code: string; // 代码片段
  context: CodeContext;
  similarity: number; // 匹配度 (0-1)
  sourceLink: {
    url: string;
    type: string;
    displayText: string;
  } | null;
  metadata: {
    language: string;
    datasourceId: string;
    documentId: string;
    chunkIndex: number;
  };
}

export interface CodeMatchResult {
  changePoint: string; // 变更点描述
  matches: CodeMatch[];
}

