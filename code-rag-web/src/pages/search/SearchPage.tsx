import { useState } from 'react';
import {
  searchApi,
  type SearchResponse,
  type SearchResult,
  type ConfirmSuspectedResultRequest,
  type RefineSearchRequest,
} from '../../services/search';
import { feedbackApi, type UpdateSearchHistoryFeedbackRequest } from '../../services/feedback';
import { usePermissions } from '../../hooks/usePermissions';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import FeedbackButton from '../../components/search/FeedbackButton';

export default function SearchPage() {
  const { user } = usePermissions();
  const [query, setQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topK, setTopK] = useState(10);
  const [minScore, setMinScore] = useState(0.7);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('请输入检索关键词');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.search({
        query: query.trim(),
        topK,
        minScore,
        role: user?.roles?.[0] || undefined,
      });
      setSearchResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '检索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleOverallFeedback = async (
    adoptionStatus: 'adopted' | 'rejected',
    comment?: string,
  ) => {
    if (!searchResponse?.searchHistoryId) return;

    try {
      const request: UpdateSearchHistoryFeedbackRequest = {
        adoptionStatus,
        comment,
      };
      await feedbackApi.updateSearchHistoryFeedback(
        searchResponse.searchHistoryId,
        request,
      );
      alert('反馈已提交，感谢您的反馈！');
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交反馈失败');
    }
  };

  // 确认疑似结果
  const handleConfirmSuspected = async (
    searchHistoryId: string,
    resultIndex: number,
    confirmed: boolean,
  ) => {
    try {
      const request: ConfirmSuspectedResultRequest = {
        searchHistoryId,
        resultIndex,
        confirmed,
      };
      await searchApi.confirmSuspectedResult(request);
      alert(confirmed ? '已确认该结果有效' : '已标记该结果为无效');
    } catch (err) {
      alert(err instanceof Error ? err.message : '确认失败');
    }
  };

  // 补充信息重新检索
  const handleRefineSearch = async (originalQuery: string, additionalContext: string) => {
    if (!additionalContext.trim()) {
      setError('请输入补充信息');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: RefineSearchRequest = {
        originalQuery,
        additionalContext: additionalContext.trim(),
        topK,
        minScore,
      };
      const response = await searchApi.refineSearch(request, user?.roles?.[0]);
      setSearchResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新检索失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>知识库检索</h1>

      {/* 检索输入区域 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入检索关键词..."
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '4px',
              background: loading ? '#ccc' : '#2196f3',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '检索中...' : '检索'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#666' }}>
          <label>
            返回数量:
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10) || 10)}
              min={1}
              max={100}
              style={{
                marginLeft: '8px',
                width: '60px',
                padding: '4px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
          <label>
            最低置信度:
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value) || 0.7)}
              min={0}
              max={1}
              step={0.1}
              style={{
                marginLeft: '8px',
                width: '60px',
                padding: '4px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
        </div>
      </div>

      {/* 错误提示 */}
      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      {/* 加载中 */}
      {loading && <Loading />}

      {/* 检索结果 */}
      {!loading && searchResponse && (
        <div>
          {/* 检索结果统计 */}
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontWeight: 'bold' }}>找到 {searchResponse.total} 条结果</span>
              {searchResponse.suspected && (
                <span
                  style={{
                    marginLeft: '12px',
                    padding: '4px 8px',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  ⚠️ 疑似结果
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleOverallFeedback('adopted')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #4caf50',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#4caf50',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✅ 整体采纳
              </button>
              <button
                onClick={() => handleOverallFeedback('rejected')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #f44336',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#f44336',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ❌ 整体拒绝
              </button>
            </div>
          </div>

          {/* 建议 */}
          {searchResponse.suggestion && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              💡 建议: {searchResponse.suggestion}
            </div>
          )}

          {/* 结果列表 */}
          {searchResponse.results.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              未找到相关结果
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {searchResponse.results.map((result, index) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  index={index}
                  searchHistoryId={searchResponse.searchHistoryId}
                  originalQuery={searchResponse.query}
                  onRefine={(context) => {
                    handleRefineSearch(searchResponse.query, context);
                  }}
                  onConfirm={(confirmed) => {
                    if (searchResponse.searchHistoryId) {
                      handleConfirmSuspected(
                        searchResponse.searchHistoryId,
                        index,
                        confirmed,
                      );
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 空状态提示 */}
      {!loading && !searchResponse && (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
          }}
        >
          请输入关键词开始检索
        </div>
      )}
    </div>
  );
}

// 检索结果项组件
interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  searchHistoryId?: string;
  originalQuery?: string;
  onRefine?: (context: string) => void;
  onConfirm?: (confirmed: boolean) => void;
}

function SearchResultItem({
  result,
  index,
  searchHistoryId,
  onRefine,
  onConfirm,
}: SearchResultItemProps) {
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineContext, setRefineContext] = useState('');

  const getSourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      feishu: '📄 飞书文档',
      gitlab: '💻 GitLab 代码',
      database: '🗄️ 数据库',
    };
    return labels[type] || type;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.6) return '#ff9800';
    return '#f44336';
  };

  const isSuspected = result.isSuspected || false;

  const handleRefine = () => {
    if (refineContext.trim() && onRefine) {
      onRefine(refineContext.trim());
      setRefineContext('');
      setShowRefineInput(false);
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        border: isSuspected ? '2px solid #ff9800' : '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: isSuspected ? '#fffbf0' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              marginBottom: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            <a
              href={result.sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#2196f3',
                textDecoration: 'none',
              }}
            >
              {result.title}
            </a>
          </h3>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#666', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{getSourceTypeLabel(result.sourceType)}</span>
            <span>
              置信度:{' '}
              <span
                style={{
                  color: getConfidenceColor(result.confidence),
                  fontWeight: 'bold',
                }}
              >
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </span>
            {isSuspected && (
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                ⚠️ 疑似结果
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
          {searchHistoryId && (
            <FeedbackButton
              searchHistoryId={searchHistoryId}
              resultIndex={index}
              documentId={result.documentId}
            />
          )}
          {isSuspected && (
            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
              <button
                onClick={() => onConfirm?.(true)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  border: '1px solid #4caf50',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#4caf50',
                  cursor: 'pointer',
                }}
                title="确认有效"
              >
                ✅ 确认有效
              </button>
              <button
                onClick={() => onConfirm?.(false)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  border: '1px solid #f44336',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#f44336',
                  cursor: 'pointer',
                }}
                title="拒绝"
              >
                ❌ 拒绝
              </button>
              <button
                onClick={() => setShowRefineInput(!showRefineInput)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#2196f3',
                  cursor: 'pointer',
                }}
                title="补充信息"
              >
                💡 补充信息
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 补充信息输入框 */}
      {isSuspected && showRefineInput && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            补充信息以重新检索
          </div>
          <textarea
            value={refineContext}
            onChange={(e) => setRefineContext(e.target.value)}
            placeholder="请输入更多上下文信息，例如：需要支持手机号登录、需要包含错误处理等..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowRefineInput(false);
                setRefineContext('');
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              onClick={handleRefine}
              disabled={!refineContext.trim()}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                background: refineContext.trim() ? '#2196f3' : '#ccc',
                color: '#fff',
                cursor: refineContext.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              重新检索
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          padding: '12px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
        dangerouslySetInnerHTML={{
          __html: result.highlightedContent || result.content,
        }}
      />
    </div>
  );
}

