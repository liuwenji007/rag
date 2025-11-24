import { useState, useEffect } from 'react';
import {
  getUIRequirements,
  createUIRequirement,
  extractUIRequirements,
  updateUIRequirement,
  deleteUIRequirement,
  exportUIRequirements,
  type UIRequirement,
  type CreateUIRequirementRequest,
} from '../../../../services/ui-requirements';

interface UIRequirementsTabProps {
  prdDocumentId: string;
}

export default function UIRequirementsTab({ prdDocumentId }: UIRequirementsTabProps) {
  const [requirements, setRequirements] = useState<UIRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRequirement, setNewRequirement] = useState<CreateUIRequirementRequest>({
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    loadRequirements();
  }, [prdDocumentId]);

  const loadRequirements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUIRequirements(prdDocumentId);
      setRequirements(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '加载 UI 需求失败',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    try {
      await extractUIRequirements(prdDocumentId);
      await loadRequirements(); // 重新加载列表
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '自动识别 UI 需求失败',
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleCreate = async () => {
    if (!newRequirement.description.trim()) {
      alert('请输入需求描述');
      return;
    }

    try {
      await createUIRequirement(prdDocumentId, newRequirement);
      setShowCreateForm(false);
      setNewRequirement({ description: '', priority: 'medium' });
      await loadRequirements();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '创建 UI 需求失败',
      );
    }
  };

  const handleUpdateStatus = async (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await updateUIRequirement(prdDocumentId, id, { status });
      await loadRequirements();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '更新状态失败',
      );
    }
  };

  const handleUpdatePriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    try {
      await updateUIRequirement(prdDocumentId, id, { priority });
      await loadRequirements();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '更新优先级失败',
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 UI 需求吗？')) {
      return;
    }

    try {
      await deleteUIRequirement(prdDocumentId, id);
      await loadRequirements();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '删除 UI 需求失败',
      );
    }
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    try {
      const data = await exportUIRequirements(prdDocumentId, format);
      
      if (format === 'json') {
        const jsonData = data as { prdId: string; prdTitle: string; requirements: any[] };
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ui-requirements-${prdDocumentId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const markdownData = data as { content: string; format: 'markdown' };
        const blob = new Blob([markdownData.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ui-requirements-${prdDocumentId}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '导出失败',
      );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#ffc107';
      case 'pending': return '#007bff';
      default: return '#666';
    }
  };


  const highPriority = requirements.filter((r) => r.priority === 'high');
  const mediumPriority = requirements.filter((r) => r.priority === 'medium');
  const lowPriority = requirements.filter((r) => r.priority === 'low');

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
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
          {showCreateForm ? '取消' : '手动创建'}
        </button>
        <button
          onClick={handleExtract}
          disabled={extracting}
          style={{
            padding: '8px 16px',
            backgroundColor: extracting ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: extracting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {extracting ? '识别中...' : '自动识别'}
        </button>
        <button
          onClick={() => handleExport('json')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
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
          onClick={() => handleExport('markdown')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
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

      {/* 错误提示 */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', marginBottom: '16px', color: '#c33' }}>
          {error}
        </div>
      )}

      {/* 创建表单 */}
      {showCreateForm && (
        <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>创建 UI 需求</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                需求描述 *
              </label>
              <textarea
                value={newRequirement.description}
                onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                placeholder="请输入 UI 需求描述"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                优先级
              </label>
              <select
                value={newRequirement.priority}
                onChange={(e) => setNewRequirement({ ...newRequirement, priority: e.target.value as 'high' | 'medium' | 'low' })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
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
              创建
            </button>
          </div>
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div style={{ padding: '24px', textAlign: 'center' }}>加载中...</div>
      )}

      {/* UI 需求列表 */}
      {!loading && requirements.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
          暂无 UI 需求，点击"自动识别"或"手动创建"开始
        </div>
      )}

      {!loading && requirements.length > 0 && (
        <div>
          {highPriority.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
                🔴 高优先级 ({highPriority.length})
              </h2>
              <RequirementList
                requirements={highPriority}
                onUpdateStatus={handleUpdateStatus}
                onUpdatePriority={handleUpdatePriority}
                onDelete={handleDelete}
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
              <RequirementList
                requirements={mediumPriority}
                onUpdateStatus={handleUpdateStatus}
                onUpdatePriority={handleUpdatePriority}
                onDelete={handleDelete}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            </section>
          )}

          {lowPriority.length > 0 && (
            <section>
              <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                🟢 低优先级 ({lowPriority.length})
              </h2>
              <RequirementList
                requirements={lowPriority}
                onUpdateStatus={handleUpdateStatus}
                onUpdatePriority={handleUpdatePriority}
                onDelete={handleDelete}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

interface RequirementListProps {
  requirements: UIRequirement[];
  onUpdateStatus: (id: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onUpdatePriority: (id: string, priority: 'high' | 'medium' | 'low') => void;
  onDelete: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

function RequirementList({
  requirements,
  onUpdateStatus,
  onUpdatePriority,
  onDelete,
  getPriorityColor,
  getStatusColor,
}: RequirementListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {requirements.map((req) => (
        <div
          key={req.id}
          style={{
            padding: '16px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '16px', flex: 1 }}>{req.description}</p>
            <button
              onClick={() => onDelete(req.id)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              删除
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '12px', marginRight: '4px' }}>状态:</label>
              <select
                value={req.status}
                onChange={(e) => onUpdateStatus(req.id, e.target.value as 'pending' | 'in_progress' | 'completed')}
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${getStatusColor(req.status)}`,
                  borderRadius: '4px',
                  backgroundColor: getStatusColor(req.status),
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', marginRight: '4px' }}>优先级:</label>
              <select
                value={req.priority}
                onChange={(e) => onUpdatePriority(req.id, e.target.value as 'high' | 'medium' | 'low')}
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${getPriorityColor(req.priority)}`,
                  borderRadius: '4px',
                  backgroundColor: getPriorityColor(req.priority),
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            {req.extractedAt && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                创建时间: {new Date(req.extractedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

