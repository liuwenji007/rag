import { useState } from 'react';
import type { TodoItem } from '../../../services/diff-analysis';

interface TodosTabProps {
  todos: TodoItem[];
}

export default function TodosTab({ todos }: TodosTabProps) {
  const [todoStatuses, setTodoStatuses] = useState<Record<string, TodoItem['status']>>(
    todos.reduce((acc, todo) => {
      acc[todo.id] = todo.status;
      return acc;
    }, {} as Record<string, TodoItem['status']>),
  );

  const updateTodoStatus = (id: string, status: TodoItem['status']) => {
    setTodoStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const exportTodos = (format: 'json' | 'markdown') => {
    const todosWithStatus = todos.map((todo) => ({
      ...todo,
      status: todoStatuses[todo.id] || todo.status,
    }));

    if (format === 'json') {
      const json = JSON.stringify(todosWithStatus, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let markdown = '# 待办事项列表\n\n';
      todosWithStatus.forEach((todo, idx) => {
        markdown += `## ${idx + 1}. ${todo.title}\n\n`;
        markdown += `- **类型**: ${todo.type === 'new_feature' ? '新增功能' : '修改功能'}\n`;
        markdown += `- **优先级**: ${todo.priority}\n`;
        markdown += `- **状态**: ${todo.status === 'pending' ? '待处理' : todo.status === 'in_progress' ? '进行中' : '已完成'}\n`;
        markdown += `- **描述**: ${todo.description}\n\n`;
        if (todo.codeRefs.length > 0) {
          markdown += `**参考代码**:\n`;
          todo.codeRefs.forEach((ref) => {
            markdown += `- [${ref.filePath}](${ref.url}) - ${ref.description}\n`;
          });
          markdown += `\n`;
        }
        markdown += `---\n\n`;
      });

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'in_progress':
        return '#007bff';
      case 'pending':
        return '#6c757d';
      default:
        return '#666';
    }
  };


  if (todos.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
        暂无待办事项
      </div>
    );
  }

  // 按优先级分组
  const highPriority = todos.filter((t) => t.priority === 'high');
  const mediumPriority = todos.filter((t) => t.priority === 'medium');
  const lowPriority = todos.filter((t) => t.priority === 'low');

  return (
    <div>
      {/* 导出按钮 */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => exportTodos('json')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          导出 JSON
        </button>
        <button
          onClick={() => exportTodos('markdown')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          导出 Markdown
        </button>
      </div>

      {/* 待办列表 */}
      {highPriority.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
            🔴 高优先级 ({highPriority.length})
          </h2>
          <TodoListSection
            todos={highPriority}
            todoStatuses={todoStatuses}
            onStatusChange={updateTodoStatus}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        </section>
      )}

      {mediumPriority.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
            🟡 中优先级 ({mediumPriority.length})
          </h2>
          <TodoListSection
            todos={mediumPriority}
            todoStatuses={todoStatuses}
            onStatusChange={updateTodoStatus}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        </section>
      )}

      {lowPriority.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
            🟢 低优先级 ({lowPriority.length})
          </h2>
          <TodoListSection
            todos={lowPriority}
            todoStatuses={todoStatuses}
            onStatusChange={updateTodoStatus}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        </section>
      )}
    </div>
  );
}

interface TodoListSectionProps {
  todos: TodoItem[];
  todoStatuses: Record<string, TodoItem['status']>;
  onStatusChange: (id: string, status: TodoItem['status']) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

function TodoListSection({
  todos,
  todoStatuses,
  onStatusChange,
  getPriorityColor,
  getStatusColor,
}: TodoListSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {todos.map((todo) => {
        const currentStatus = todoStatuses[todo.id] || todo.status;
        return (
          <div
            key={todo.id}
            style={{
              padding: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                {todo.title}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: getPriorityColor(todo.priority),
                    color: 'white',
                    fontSize: '12px',
                  }}
                >
                  {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}优先级
                </span>
                <select
                  value={currentStatus}
                  onChange={(e) => onStatusChange(todo.id, e.target.value as TodoItem['status'])}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: getStatusColor(currentStatus),
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value="pending">待处理</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
            </div>

            <p style={{ margin: 0, color: '#666', fontSize: '14px', marginBottom: '12px' }}>
              {todo.description}
            </p>

            {todo.codeRefs.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                <strong style={{ fontSize: '12px', color: '#999' }}>参考代码:</strong>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {todo.codeRefs.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#007bff',
                        textDecoration: 'none',
                        fontSize: '12px',
                      }}
                    >
                      {ref.filePath} - {ref.description}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {todo.relatedDocs.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                <strong style={{ fontSize: '12px', color: '#999' }}>相关文档:</strong>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {todo.relatedDocs.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#007bff',
                        textDecoration: 'none',
                        fontSize: '12px',
                      }}
                    >
                      {doc.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

