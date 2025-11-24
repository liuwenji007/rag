import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { CodeMatchResult } from '../../../services/diff-analysis';

interface CodeRecommendationsTabProps {
  codeRecommendations: CodeMatchResult[];
}

export default function CodeRecommendationsTab({
  codeRecommendations,
}: CodeRecommendationsTabProps) {
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  const toggleCode = (id: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCodes(newExpanded);
  };

  if (codeRecommendations.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
        暂无代码推荐
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {codeRecommendations.map((recommendation, idx) => (
        <div key={idx} style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
            {recommendation.changePoint}
          </h3>

          {recommendation.matches.length === 0 ? (
            <div style={{ padding: '16px', color: '#999', fontStyle: 'italic' }}>
              未找到匹配的代码
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recommendation.matches.map((match) => {
                const isExpanded = expandedCodes.has(match.id);
                return (
                  <div
                    key={match.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 代码匹配头部 */}
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleCode(match.id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            {match.context.filePath}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          >
                            匹配度: {(match.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        {match.context.functionName && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            函数: {match.context.functionName}
                          </div>
                        )}
                        {match.context.className && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            类: {match.context.className}
                          </div>
                        )}
                      </div>
                      <button
                        style={{
                          padding: '4px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        {isExpanded ? '收起' : '展开'}
                      </button>
                    </div>

                    {/* 代码内容 */}
                    {isExpanded && (
                      <div>
                        <SyntaxHighlighter
                          language={match.metadata.language || 'typescript'}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                          }}
                        >
                          {match.code}
                        </SyntaxHighlighter>
                        {match.sourceLink && (
                          <div style={{ padding: '12px 16px', backgroundColor: '#f9f9f9', borderTop: '1px solid #e0e0e0' }}>
                            <a
                              href={match.sourceLink.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#007bff',
                                textDecoration: 'none',
                                fontSize: '14px',
                              }}
                            >
                              {match.sourceLink.displayText} →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

