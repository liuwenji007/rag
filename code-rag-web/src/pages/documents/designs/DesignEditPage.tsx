import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDocumentById,
  updateDocument,
  getAllTags,
  getDocuments,
  type DocumentDetail,
  type Tag,
  type UpdateDocumentRequest,
  type DocumentListItem,
} from '../../../services/documents';

export default function DesignEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [prdDocuments, setPrdDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPrdId, setSelectedPrdId] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadDocument();
      loadTags();
      loadPRDDocuments();
    }
  }, [id]);

  const loadDocument = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const doc = await getDocumentById(id);
      setDocument(doc);
      setTitle(doc.title);
      setSelectedTagIds(doc.tags.map((t) => t.id));
      setSelectedPrdId(doc.prdId || '');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '加载设计稿失败',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tagList = await getAllTags();
      setTags(tagList);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadPRDDocuments = async () => {
    try {
      const response = await getDocuments({ type: 'prd', limit: 100 });
      setPrdDocuments(response.documents);
    } catch (err) {
      console.error('Failed to load PRD documents:', err);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    if (!title.trim()) {
      alert('请输入设计稿名称');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const request: UpdateDocumentRequest = {
        title: title.trim(),
        tagIds: selectedTagIds,
        prdId: selectedPrdId || undefined,
      };

      await updateDocument(id, request);
      navigate(`/documents/designs/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '保存设计稿失败',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>加载中...</div>
    );
  }

  if (error && !document) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/documents/designs')}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          返回列表
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>设计稿不存在</div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>编辑设计稿</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/documents/designs/${id}`)}
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
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              backgroundColor: saving ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', marginBottom: '16px', color: '#c33' }}>
          {error}
        </div>
      )}

      {/* 表单 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 标题 */}
        <div>
          <label htmlFor="title" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            设计稿名称 *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入设计稿名称"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        {/* PRD 关联 */}
        <div>
          <label htmlFor="prdId" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            关联 PRD（可选）
          </label>
          <select
            id="prdId"
            value={selectedPrdId}
            onChange={(e) => setSelectedPrdId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">不关联 PRD</option>
            {prdDocuments.map((prd) => (
              <option key={prd.id} value={prd.id}>
                {prd.title}
              </option>
            ))}
          </select>
        </div>

        {/* 标签选择 */}
        {tags.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              设计稿标签
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '16px',
                    backgroundColor: selectedTagIds.includes(tag.id) ? '#007bff' : 'white',
                    color: selectedTagIds.includes(tag.id) ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    ...(tag.color && !selectedTagIds.includes(tag.id)
                      ? { borderColor: tag.color, color: tag.color }
                      : {}),
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

