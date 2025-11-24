import { useState } from 'react';
import { analyzeDiff, createDiffAnalysisTask, getDiffAnalysisTaskStatus } from '../../services/diff-analysis';
import type { DiffAnalysisResult, AnalyzeDiffRequest } from '../../services/diff-analysis';
import RequirementInputForm from './components/RequirementInputForm';
import AnalysisResultTabs from './components/AnalysisResultTabs';

export default function DiffAnalysisPage() {
  const [requirement, setRequirement] = useState('');
  const [isAsync, setIsAsync] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiffAnalysisResult | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const handleAnalyze = async (request: AnalyzeDiffRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setTaskId(null);

    try {
      if (isAsync) {
        // 异步模式
        const task = await createDiffAnalysisTask(request);
        setTaskId(task.taskId);
        setPolling(true);
        pollTaskStatus(task.taskId);
      } else {
        // 同步模式
        const analysisResult = await analyzeDiff(request);
        setResult(analysisResult);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '差异分析失败，请重试',
      );
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (id: string) => {
    const maxAttempts = 60; // 最多轮询 60 次（约 5 分钟）
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('任务处理超时，请稍后查询任务状态');
        setPolling(false);
        return;
      }

      try {
        const task = await getDiffAnalysisTaskStatus(id);
        attempts++;

        if (task.status === 'completed' && task.result) {
          setResult(task.result);
          setPolling(false);
        } else if (task.status === 'failed') {
          setError(task.error || '任务处理失败');
          setPolling(false);
        } else if (task.status === 'processing' || task.status === 'pending') {
          // 继续轮询
          setTimeout(poll, 5000); // 每 5 秒轮询一次
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '查询任务状态失败',
        );
        setPolling(false);
      }
    };

    poll();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>差异分析</h1>

      <RequirementInputForm
        requirement={requirement}
        onRequirementChange={setRequirement}
        isAsync={isAsync}
        onAsyncChange={setIsAsync}
        onAnalyze={handleAnalyze}
        loading={loading || polling}
      />

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', marginBottom: '16px', color: '#c33' }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: '12px', padding: '4px 8px', border: 'none', backgroundColor: '#fcc', cursor: 'pointer' }}
          >
            关闭
          </button>
        </div>
      )}

      {(loading || polling) && (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div>{polling ? '任务处理中，请稍候...' : '分析中...'}</div>
        </div>
      )}

      {result && (
        <AnalysisResultTabs result={result} />
      )}

      {taskId && polling && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
          <p>任务 ID: {taskId}</p>
          <p>状态: 处理中...</p>
        </div>
      )}
    </div>
  );
}

