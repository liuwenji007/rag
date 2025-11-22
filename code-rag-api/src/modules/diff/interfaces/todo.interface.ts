export interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'new_feature' | 'modified_feature';
  relatedDocs: Array<{
    title: string;
    url: string;
  }>;
  codeRefs: Array<{
    filePath: string;
    url: string;
    description: string;
  }>;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

export interface TodoList {
  requirement: string;
  todos: TodoItem[];
  generatedAt: Date;
}

