import { useState } from 'react';
import { feedbackApi, type SubmitResultFeedbackRequest } from '../../services/feedback';

interface FeedbackButtonProps {
  searchHistoryId: string;
  resultIndex: number;
  documentId?: string;
  onFeedbackSubmitted?: () => void;
}

export default function FeedbackButton({
  searchHistoryId,
  resultIndex,
  documentId,
  onFeedbackSubmitted,
}: FeedbackButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [adoptionStatus, setAdoptionStatus] = useState<'adopted' | 'rejected' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!adoptionStatus) {
      setError('请选择采纳或拒绝');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const request: SubmitResultFeedbackRequest = {
        searchHistoryId,
        resultIndex,
        documentId,
        adoptionStatus,
        comment: comment.trim() || undefined,
      };

      await feedbackApi.submitResultFeedback(request);
      setShowModal(false);
      setAdoptionStatus(null);
      setComment('');
      onFeedbackSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交反馈失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          background: '#fff',
          cursor: 'pointer',
        }}
        title="反馈"
      >
        💬 反馈
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>反馈检索结果</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                这个结果对您有帮助吗？
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setAdoptionStatus('adopted')}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #4caf50',
                    borderRadius: '4px',
                    background: adoptionStatus === 'adopted' ? '#4caf50' : '#fff',
                    color: adoptionStatus === 'adopted' ? '#fff' : '#4caf50',
                    cursor: 'pointer',
                  }}
                >
                  ✅ 采纳
                </button>
                <button
                  onClick={() => setAdoptionStatus('rejected')}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #f44336',
                    borderRadius: '4px',
                    background: adoptionStatus === 'rejected' ? '#f44336' : '#fff',
                    color: adoptionStatus === 'rejected' ? '#fff' : '#f44336',
                    cursor: 'pointer',
                  }}
                >
                  ❌ 拒绝
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                反馈意见（可选）
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="请输入您的反馈意见..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '8px',
                  marginBottom: '16px',
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !adoptionStatus}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: submitting ? '#ccc' : '#2196f3',
                  color: '#fff',
                  cursor: submitting || !adoptionStatus ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

