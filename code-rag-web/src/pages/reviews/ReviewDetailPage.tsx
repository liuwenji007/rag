import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import {
  getReviewById,
  approveReview,
  rejectReview,
  type ReviewDetail,
} from '../../services/reviews';

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  useEffect(() => {
    if (id) {
      loadReview();
    }
  }, [id]);

  const loadReview = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewById(id);
      setReview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '加载审核详情失败',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    if (!confirm('确定要通过这个文档的审核吗？')) {
      return;
    }

    setProcessing(true);
    try {
      await approveReview(id, approveNotes || undefined);
      navigate('/reviews');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '审核通过失败',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      alert('请输入退回原因（至少 5 个字符）');
      return;
    }

    setProcessing(true);
    try {
      await rejectReview(id, rejectReason.trim());
      navigate('/reviews');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '审核退回失败',
      );
    } finally {
      setProcessing(false);
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
          onClick={() => navigate('/reviews')}
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

  if (!review) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>审核不存在</div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0 }}>审核文档：{review.document.title}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/reviews')}
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
          <span>文档类型: {review.document.documentType || '未分类'}</span>
          <span>文件大小: {formatFileSize(review.document.fileSize)}</span>
          <span>上传时间: {formatDate(review.document.syncedAt)}</span>
          {review.document.uploadedBy && <span>上传者: {review.document.uploadedBy}</span>}
        </div>

        {/* 标签 */}
        {review.document.tags.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {review.document.tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  padding: '4px 12px',
                  backgroundColor: tag.color || '#e0e0e0',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: tag.color ? 'white' : '#333',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 文档内容 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>文档内容</h2>
        {review.document.content ? (
          review.document.contentType === 'markdown' ? (
            <div
              style={{
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
              }}
            >
              <ReactMarkdown components={markdownComponents}>
                {review.document.content}
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
              {review.document.content}
            </pre>
          )
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
            文档内容为空
          </div>
        )}
      </div>

      {/* 审核操作 */}
      {review.status === 'pending' && (
        <div style={{ padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>审核操作</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                审核备注（可选）
              </label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="填写审核备注..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: processing ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                {processing ? '处理中...' : '审核通过'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: processing ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                审核退回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 已审核信息 */}
      {review.status !== 'pending' && (
        <div style={{ padding: '24px', backgroundColor: review.status === 'approved' ? '#d4edda' : '#f8d7da', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
            {review.status === 'approved' ? '✅ 已通过' : '❌ 已退回'}
          </h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {review.reviewedBy && <div>审核人: {review.reviewedBy}</div>}
            {review.reviewedAt && <div>审核时间: {formatDate(review.reviewedAt)}</div>}
            {review.reviewNotes && (
              <div style={{ marginTop: '8px' }}>
                <strong>{review.status === 'approved' ? '审核备注' : '退回原因'}:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  {review.reviewNotes}
                </div>
              </div>
            )}
          </div>
        </div>
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
            setShowRejectModal(false);
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
                  setShowRejectModal(false);
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
                onClick={handleReject}
                disabled={processing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: processing ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {processing ? '处理中...' : '确认退回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

