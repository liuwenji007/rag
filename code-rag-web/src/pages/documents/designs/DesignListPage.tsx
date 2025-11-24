import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDocuments,
  deleteDocument,
  getAllTags,
  type DocumentListItem,
  type DocumentQueryParams,
  type Tag,
} from '../../../services/documents';

export default function DesignListPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // 筛选条件
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<'createdAt' | 'updatedAt' | 'title'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // 加载文档列表
  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: DocumentQueryParams = {
        type: 'design',
        page,
        limit,
        search: search || undefined,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        sort,
        order,
      };

      const response = await getDocuments(params);
      setDocuments(response.documents);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '加载文档列表失败',
      );
    } finally {
      setLoading(false);
    }
  };

  // 加载标签列表
  const loadTags = async () => {
    try {
      const tagList = await getAllTags();
      setTags(tagList);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [page, search, selectedTags, sort, order]);

  useEffect(() => {
    loadTags();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个设计稿吗？删除后可以在历史记录中查看。')) {
      return;
    }

    try {
      await deleteDocument(id);
      await loadDocuments(); // 重新加载列表
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '删除设计稿失败',
      );
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getImageUrl = (imageUrl: string | null | undefined) => {
    if (!imageUrl) return null;
    // 如果是相对路径，需要添加 API 基础 URL
    if (imageUrl.startsWith('/')) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      return `${apiBaseUrl}${imageUrl}`;
    }
    return imageUrl;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>设计资源管理</h1>
        <button
          onClick={() => navigate('/documents/upload?type=design')}
          style={{
            padding: '10px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          上传设计稿
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="搜索设计稿名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'createdAt' | 'updatedAt' | 'title')}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="createdAt">按创建时间</option>
              <option value="updatedAt">按更新时间</option>
              <option value="title">按名称</option>
            </select>
          </div>
          <div>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>

        {/* 标签筛选 */}
        {tags.length > 0 && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>标签筛选：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (selectedTags.includes(tag.id)) {
                      setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                    } else {
                      setSelectedTags([...selectedTags, tag.id]);
                    }
                  }}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '16px',
                    backgroundColor: selectedTags.includes(tag.id) ? '#007bff' : 'white',
                    color: selectedTags.includes(tag.id) ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                    ...(tag.color && !selectedTags.includes(tag.id)
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

      {/* 错误提示 */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', marginBottom: '16px', color: '#c33' }}>
          {error}
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div style={{ padding: '24px', textAlign: 'center' }}>加载中...</div>
      )}

      {/* 文档列表 */}
      {!loading && documents.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
          暂无设计资源
        </div>
      )}

      {!loading && documents.length > 0 && (
        <>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            共 {total} 个设计资源，第 {page} / {totalPages} 页
          </div>

          {/* 网格布局 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {documents.map((doc) => {
              const imageUrl = getImageUrl(doc.imageUrl);
              return (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* 缩略图 */}
                  {imageUrl && (
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        marginBottom: '12px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        backgroundColor: '#f5f5f5',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/documents/designs/${doc.id}`)}
                    >
                      <img
                        src={imageUrl}
                        alt={doc.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* 标题 */}
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      color: '#007bff',
                    }}
                    onClick={() => navigate(`/documents/designs/${doc.id}`)}
                  >
                    {doc.title}
                  </h3>

                  {/* 元信息 */}
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', flex: 1 }}>
                    <div>大小: {formatFileSize(doc.fileSize)}</div>
                    <div>上传时间: {formatDate(doc.syncedAt)}</div>
                    {doc.prdTitle && (
                      <div style={{ color: '#007bff', marginTop: '4px' }}>
                        关联 PRD: {doc.prdTitle}
                      </div>
                    )}
                    {doc.imageWidth && doc.imageHeight && (
                      <div>
                        尺寸: {doc.imageWidth} × {doc.imageHeight}px
                      </div>
                    )}
                  </div>

                  {/* 标签 */}
                  {doc.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {doc.tags.map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: tag.color || '#e0e0e0',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: tag.color ? 'white' : '#333',
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/documents/designs/${doc.id}`)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      查看
                    </button>
                    <button
                      onClick={() => navigate(`/documents/designs/${doc.id}/edit`)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      style={{
                        padding: '6px 12px',
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
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: page === 1 ? '#f5f5f5' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                上一页
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: page === totalPages ? '#f5f5f5' : 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

