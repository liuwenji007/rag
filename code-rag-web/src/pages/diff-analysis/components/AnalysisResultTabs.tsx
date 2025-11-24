import { useState } from 'react';
import type { DiffAnalysisResult } from '../../../services/diff-analysis';
import ChangesTab from './ChangesTab';
import CodeRecommendationsTab from './CodeRecommendationsTab';
import SummaryTab from './SummaryTab';
import TodosTab from './TodosTab';

interface AnalysisResultTabsProps {
  result: DiffAnalysisResult;
}

export default function AnalysisResultTabs({ result }: AnalysisResultTabsProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'code' | 'summary' | 'todos'>('changes');

  const tabs = [
    { id: 'changes' as const, label: '变更清单', count: result.changes.newFeatures.length + result.changes.modifiedFeatures.length },
    { id: 'code' as const, label: '代码推荐', count: result.codeRecommendations.length },
    { id: 'summary' as const, label: '差异总结', count: null },
    { id: 'todos' as const, label: '待办列表', count: result.todos.length },
  ];

  return (
    <div style={{ marginTop: '24px' }}>
      {/* 标签页导航 */}
      <div style={{ borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                color: activeTab === tab.id ? '#007bff' : '#666',
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{ marginLeft: '8px', color: '#999', fontSize: '12px' }}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 标签页内容 */}
      <div>
        {activeTab === 'changes' && <ChangesTab changes={result.changes} />}
        {activeTab === 'code' && <CodeRecommendationsTab codeRecommendations={result.codeRecommendations} />}
        {activeTab === 'summary' && <SummaryTab summary={result.summary} />}
        {activeTab === 'todos' && <TodosTab todos={result.todos} />}
      </div>
    </div>
  );
}

