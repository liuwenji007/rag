import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDocumentById,
  deleteDocument,
  getAllTags,
  addTagToDocument,
  removeTagFromDocument,
  linkPRDToDesign,
  unlinkPRDFromDesign,
  getDocuments,
  type DocumentDetail,
  type Tag,
  type DocumentListItem,
} from '../../../services/documents';

export default function DesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [prdDocuments, setPrdDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'info' | 'tags'>('preview');

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

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('确定要删除这个设计稿吗？删除后可以在历史记录中查看。')) {
      return;
    }

    try {
      await deleteDocument(id);
      navigate('/documents/designs');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '删除设计稿失败',
      );
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!id) return;
    try {
      await addTagToDocument(id, tagId);
      await loadDocument();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '添加标签失败',
      );
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!id) return;
    try {
      await removeTagFromDocument(id, tagId);
      await loadDocument();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '删除标签失败',
      );
    }
  };

  const handleLinkPRD = async (prdId: string) => {
    if (!id) return;
    try {
      await linkPRDToDesign(id, prdId);
      await loadDocument();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '关联 PRD 失败',
      );
    }
  };

  const handleUnlinkPRD = async () => {
    if (!id) return;
    try {
      await unlinkPRDFromDesign(id);
      await loadDocument();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '取消关联失败',
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getImageUrl = (imageUrl: string | null | undefined) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('/')) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      return `${apiBaseUrl}${imageUrl}`;
    }
    return imageUrl;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>加载中...</div>
    );
  }

  if (error) {
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

  const documentTags = document.tags.map((t) => t.id);
  const availableTags = tags.filter((t) => !documentTags.includes(t.id));
  const imageUrl = getImageUrl(document.imageUrl);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0 }}>{document.title}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate(`/documents/designs/${id}/edit`)}
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
              编辑
            </button>
            <button
              onClick={handleDelete}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              删除
            </button>
            <button
              onClick={() => navigate('/documents/designs')}
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
              返回列表
            </button>
          </div>
        </div>

        {/* 元信息 */}
        <div style={{ fontSize: '14px', color: '#666', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span>上传时间: {formatDate(document.syncedAt)}</span>
          <span>更新时间: {formatDate(document.updatedAt)}</span>
          {document.uploadedBy && <span>上传者: {document.uploadedBy}</span>}
          {document.imageWidth && document.imageHeight && (
            <span>尺寸: {document.imageWidth} × {document.imageHeight}px</span>
          )}
        </div>

        {/* 关联 PRD */}
        {document.prdId && document.prdTitle && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>关联 PRD:</strong>{' '}
                <a
                  href={`/documents/prd/${document.prdId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/documents/prd/${document.prdId}`);
                  }}
                  style={{ color: '#007bff', textDecoration: 'none' }}
                >
                  {document.prdTitle}
                </a>
              </div>
              <button
                onClick={handleUnlinkPRD}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消关联
              </button>
            </div>
          </div>
        )}

        {/* 标签 */}
        {document.tags.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {document.tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  padding: '4px 12px',
                  backgroundColor: tag.color || '#e0e0e0',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: tag.color ? 'white' : '#333',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  style={{
                    padding: '0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 添加标签 */}
        {availableTags.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddTag(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="">添加标签...</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div style={{ borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'preview' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'preview' ? 'bold' : 'normal',
              color: activeTab === 'preview' ? '#007bff' : '#666',
            }}
          >
            图片预览
          </button>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'info' ? 'bold' : 'normal',
              color: activeTab === 'info' ? '#007bff' : '#666',
            }}
          >
            详细信息
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'tags' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'tags' ? 'bold' : 'normal',
              color: activeTab === 'tags' ? '#007bff' : '#666',
            }}
          >
            标签管理
          </button>
        </div>
      </div>

      {/* 图片预览标签页 */}
      {activeTab === 'preview' && (
        <div>
          {imageUrl ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={imageUrl}
                alt={document.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '600px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent && !parent.querySelector('.error-message')) {
                    const errorDiv = window.document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = '图片加载失败';
                    errorDiv.style.padding = '24px';
                    errorDiv.style.color = '#999';
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              图片不可用
            </div>
          )}
        </div>
      )}

      {/* 详细信息标签页 */}
      {activeTab === 'info' && (
        <div>
          <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '16px' }}>关联 PRD</h3>
            {document.prdId ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>当前关联:</strong>{' '}
                      <a
                        href={`/documents/prd/${document.prdId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/documents/prd/${document.prdId}`);
                        }}
                        style={{ color: '#007bff', textDecoration: 'none' }}
                      >
                        {document.prdTitle}
                      </a>
                    </div>
                    <button
                      onClick={handleUnlinkPRD}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      取消关联
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '16px', color: '#999' }}>未关联 PRD</div>
            )}

            {prdDocuments.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  选择 PRD 进行关联:
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLinkPRD(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">选择 PRD...</option>
                  {prdDocuments
                    .filter((prd) => prd.id !== document.prdId)
                    .map((prd) => (
                      <option key={prd.id} value={prd.id}>
                        {prd.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>文件信息</h3>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <div>文件大小: {document.fileSize ? `${(document.fileSize / 1024).toFixed(2)} KB` : '-'}</div>
                <div>MIME 类型: {document.mimeType || '-'}</div>
                <div>内容类型: {document.contentType}</div>
                {document.imageWidth && document.imageHeight && (
                  <div>
                    图片尺寸: {document.imageWidth} × {document.imageHeight}px
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标签管理标签页 */}
      {activeTab === 'tags' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '12px' }}>当前标签</h3>
            {document.tags.length === 0 ? (
              <div style={{ color: '#999' }}>暂无标签</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {document.tags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: tag.color || '#e0e0e0',
                      borderRadius: '16px',
                      fontSize: '14px',
                      color: tag.color ? 'white' : '#333',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {tag.name}
                    {tag.description && (
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>
                        ({tag.description})
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      style={{
                        padding: '0 4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '16px',
                        lineHeight: '1',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {availableTags.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '12px' }}>可用标签</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '16px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      ...(tag.color ? { borderColor: tag.color, color: tag.color } : {}),
                    }}
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

