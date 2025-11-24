import type { RequirementParsingResult } from '../../../services/diff-analysis';

interface ChangesTabProps {
  changes: RequirementParsingResult;
}

export default function ChangesTab({ changes }: ChangesTabProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#666';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  return (
    <div>
      {/* 新增功能点 */}
      {changes.newFeatures.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
            新增功能点 ({changes.newFeatures.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {changes.newFeatures.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {feature.name}
                  </h3>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      backgroundColor: getPriorityColor(feature.priority),
                      color: 'white',
                      fontSize: '12px',
                    }}
                  >
                    {getPriorityText(feature.priority)}优先级
                  </span>
                </div>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 修改功能点 */}
      {changes.modifiedFeatures.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
            修改功能点 ({changes.modifiedFeatures.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {changes.modifiedFeatures.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {feature.name}
                  </h3>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      backgroundColor: getPriorityColor(feature.priority),
                      color: 'white',
                      fontSize: '12px',
                    }}
                  >
                    {getPriorityText(feature.priority)}优先级
                  </span>
                </div>
                <p style={{ margin: 0, color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                  {feature.description}
                </p>
                {feature.affectedModules.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#999' }}>影响模块: </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {feature.affectedModules.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 影响范围 */}
      <section>
        <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
          影响范围分析
        </h2>
        <div
          style={{
            padding: '16px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
          }}
        >
          {changes.impactScope.modules.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px' }}>受影响的模块:</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {changes.impactScope.modules.map((module, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {module}
                  </span>
                ))}
              </div>
            </div>
          )}

          {changes.impactScope.dependencies.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px' }}>依赖关系:</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {changes.impactScope.dependencies.map((dep, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#fff3e0',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <strong style={{ fontSize: '14px' }}>风险等级: </strong>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: getPriorityColor(changes.impactScope.riskLevel),
                color: 'white',
                fontSize: '12px',
              }}
            >
              {getPriorityText(changes.impactScope.riskLevel)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

