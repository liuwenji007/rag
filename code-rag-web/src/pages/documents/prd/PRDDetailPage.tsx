import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import {
  getDocumentById,
  deleteDocument,
  getAllTags,
  addTagToDocument,
  removeTagFromDocument,
  type DocumentDetail,
  type Tag,
} from '../../../services/documents';

export default function PRDDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'versions' | 'tags'>('content');

  useEffect(() => {
    if (id) {
      loadDocument();
      loadTags();
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
        err instanceof Error ? err.message : '加载文档失败',
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

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('确定要删除这个文档吗？删除后可以在历史记录中查看。')) {
      return;
    }

    try {
      await deleteDocument(id);
      navigate('/documents/prd');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '删除文档失败',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const markdownComponents: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      return language ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          {...(props as Record<string, unknown>)}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#007bff', textDecoration: 'none' }}
          {...props}
        >
          {children}
        </a>
      );
    },
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
          onClick={() => navigate('/documents/prd')}
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
      <div style={{ padding: '24px', textAlign: 'center' }}>文档不存在</div>
    );
  }

  const documentTags = document.tags.map((t) => t.id);
  const availableTags = tags.filter((t) => !documentTags.includes(t.id));

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0 }}>{document.title}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate(`/documents/prd/${id}/edit`)}
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
              onClick={() => navigate('/documents/prd')}
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
        </div>

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
            onClick={() => setActiveTab('content')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'content' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'content' ? 'bold' : 'normal',
              color: activeTab === 'content' ? '#007bff' : '#666',
            }}
          >
            内容
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'versions' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'versions' ? 'bold' : 'normal',
              color: activeTab === 'versions' ? '#007bff' : '#666',
            }}
          >
            版本历史 ({document.versions.length})
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

      {/* 内容标签页 */}
      {activeTab === 'content' && (
        <div>
          {document.content ? (
            document.contentType === 'markdown' ? (
              <div
                style={{
                  padding: '24px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <ReactMarkdown components={markdownComponents}>
                  {document.content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre
                style={{
                  padding: '24px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                }}
              >
                {document.content}
              </pre>
            )
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              文档内容为空
            </div>
          )}
        </div>
      )}

      {/* 版本历史标签页 */}
      {activeTab === 'versions' && (
        <div>
          {document.versions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              暂无版本历史
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {document.versions.map((version) => (
                <div
                  key={version.version}
                  style={{
                    padding: '16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <strong>版本 {version.version}</strong>
                      <span style={{ marginLeft: '16px', fontSize: '12px', color: '#666' }}>
                        {formatDate(version.uploadedAt)}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      上传者: {version.uploadedBy}
                    </span>
                  </div>
                  {version.content && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        maxHeight: '200px',
                        overflow: 'auto',
                      }}
                    >
                      {version.content.substring(0, 500)}
                      {version.content.length > 500 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

