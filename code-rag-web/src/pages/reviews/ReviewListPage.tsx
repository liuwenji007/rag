import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPendingReviews,
  approveReview,
  rejectReview,
  type Review,
} from '../../services/reviews';

export default function ReviewListPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadReviews();
  }, [page]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPendingReviews(page, limit);
      setReviews(response.reviews);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '加载待审核列表失败',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    if (!confirm('确定要通过这个文档的审核吗？')) {
      return;
    }

    setProcessingId(reviewId);
    try {
      await approveReview(reviewId);
      await loadReviews(); // 重新加载列表
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '审核通过失败',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      alert('请输入退回原因（至少 5 个字符）');
      return;
    }

    setProcessingId(reviewId);
    try {
      await rejectReview(reviewId, rejectReason.trim());
      setShowRejectModal(null);
      setRejectReason('');
      await loadReviews(); // 重新加载列表
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '审核退回失败',
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>内容审核</h1>

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

      {/* 待审核列表 */}
      {!loading && reviews.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
          暂无待审核文档
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            共 {total} 个待审核文档，第 {page} / {totalPages} 页
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  padding: '20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: '8px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        color: '#007bff',
                      }}
                      onClick={() => navigate(`/reviews/${review.id}`)}
                    >
                      {review.document.title}
                    </h3>
                    <div style={{ fontSize: '14px', color: '#666', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>类型: {review.document.documentType || '未分类'}</span>
                      <span>大小: {formatFileSize(review.document.fileSize)}</span>
                      <span>上传时间: {formatDate(review.document.syncedAt)}</span>
                      {review.document.uploadedBy && (
                        <span>上传者: {review.document.uploadedBy}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/reviews/${review.id}`)}
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
                      查看详情
                    </button>
                    <button
                      onClick={() => handleApprove(review.id)}
                      disabled={processingId === review.id}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: processingId === review.id ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: processingId === review.id ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {processingId === review.id ? '处理中...' : '通过'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(review.id)}
                      disabled={processingId === review.id}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: processingId === review.id ? '#ccc' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: processingId === review.id ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      退回
                    </button>
                  </div>
                </div>

                {/* 文档内容预览 */}
                {review.document.content && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      fontSize: '14px',
                      maxHeight: '200px',
                      overflow: 'auto',
                      marginTop: '12px',
                    }}
                  >
                    {review.document.content.substring(0, 500)}
                    {review.document.content.length > 500 && '...'}
                  </div>
                )}
              </div>
            ))}
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

      {/* 退回原因输入模态框 */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowRejectModal(null);
            setRejectReason('');
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>填写退回原因</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入退回原因（至少 5 个字符）"
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
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
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: processingId === showRejectModal ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processingId === showRejectModal ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {processingId === showRejectModal ? '处理中...' : '确认退回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

