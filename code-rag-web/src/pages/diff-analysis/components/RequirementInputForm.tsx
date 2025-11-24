import { useState } from 'react';
import type { AnalyzeDiffRequest } from '../../../services/diff-analysis';

interface RequirementInputFormProps {
  requirement: string;
  onRequirementChange: (value: string) => void;
  isAsync: boolean;
  onAsyncChange: (value: boolean) => void;
  onAnalyze: (request: AnalyzeDiffRequest) => void;
  loading: boolean;
}

export default function RequirementInputForm({
  requirement,
  onRequirementChange,
  isAsync,
  onAsyncChange,
  onAnalyze,
  loading,
}: RequirementInputFormProps) {
  const [role, setRole] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requirement.trim().length < 10) {
      alert('需求描述至少需要 10 个字符');
      return;
    }

    onAnalyze({
      requirement: requirement.trim(),
      role: role || undefined,
      includeCodeMatches: true,
      includePRDFragments: true,
      includeSummary: true,
      includeTodos: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="requirement" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          需求描述 *
        </label>
        <textarea
          id="requirement"
          value={requirement}
          onChange={(e) => onRequirementChange(e.target.value)}
          placeholder="请输入需求描述，例如：需要实现用户登录功能，支持手机号和邮箱登录..."
          required
          minLength={10}
          rows={4}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="role" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          用户角色（可选）
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            width: '200px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <option value="">默认</option>
          <option value="developer">开发</option>
          <option value="product">产品</option>
          <option value="ui">UI</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isAsync}
            onChange={(e) => onAsyncChange(e.target.checked)}
          />
          <span>异步模式（适用于复杂需求）</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || requirement.trim().length < 10}
        style={{
          padding: '10px 24px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        {loading ? '分析中...' : '开始分析'}
      </button>
    </form>
  );
}

