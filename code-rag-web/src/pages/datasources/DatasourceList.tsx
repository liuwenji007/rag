import { useState, useEffect } from 'react';
import {
  getDataSources,
  deleteDataSource,
  enableDataSource,
  disableDataSource,
  testConnectionById,
  type DataSource,
} from '../../services/datasources';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';

function DatasourceList() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDataSources();
      setDataSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据源失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个数据源吗？')) {
      return;
    }

    try {
      await deleteDataSource(id);
      await loadDataSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await disableDataSource(id);
      } else {
        await enableDataSource(id);
      }
      await loadDataSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const result = await testConnectionById(id);
      if (result.success) {
        alert('连接测试成功：' + result.message);
      } else {
        alert('连接测试失败：' + result.message);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '测试连接失败');
    } finally {
      setTestingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#4caf50';
      case 'ERROR':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'FEISHU':
        return '飞书';
      case 'GITLAB':
        return 'GitLab';
      case 'DATABASE':
        return '数据库';
      default:
        return type;
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadDataSources} />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1>数据源管理</h1>
        <button
          onClick={() => (window.location.href = '/datasources/new')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          添加数据源
        </button>
      </div>

      {dataSources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>暂无数据源，点击"添加数据源"开始配置</p>
        </div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>名称</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>类型</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>状态</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>启用</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>最后同步</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((ds) => (
              <tr
                key={ds.id}
                style={{
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <td style={{ padding: '12px' }}>{ds.name}</td>
                <td style={{ padding: '12px' }}>{getTypeLabel(ds.type)}</td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: getStatusColor(ds.status),
                      color: 'white',
                      fontSize: '12px',
                    }}
                  >
                    {ds.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ds.enabled}
                      onChange={() => handleToggleEnabled(ds.id, ds.enabled)}
                    />
                    <span style={{ marginLeft: '8px' }}>
                      {ds.enabled ? '已启用' : '已禁用'}
                    </span>
                  </label>
                </td>
                <td style={{ padding: '12px' }}>
                  {ds.lastSyncAt
                    ? new Date(ds.lastSyncAt).toLocaleString('zh-CN')
                    : '从未同步'}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleTestConnection(ds.id)}
                      disabled={testingId === ds.id}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: testingId === ds.id ? 'not-allowed' : 'pointer',
                        opacity: testingId === ds.id ? 0.6 : 1,
                      }}
                    >
                      {testingId === ds.id ? '测试中...' : '测试连接'}
                    </button>
                    <button
                      onClick={() =>
                        (window.location.href = `/datasources/${ds.id}/edit`)
                      }
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#9e9e9e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(ds.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DatasourceList;

