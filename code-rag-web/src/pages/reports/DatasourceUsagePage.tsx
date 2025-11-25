import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { reportsApi, type DatasourceUsageStatistics } from '../../services/reports';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];

export default function DatasourceUsagePage() {
  const [data, setData] = useState<DatasourceUsageStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadStatistics();
  }, [timeRange, startDate, endDate]);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      let start: string | undefined;
      let end: string | undefined;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (timeRange) {
        case 'today':
          start = today.toISOString();
          end = now.toISOString();
          break;
        case 'week':
          start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          end = now.toISOString();
          break;
        case 'month':
          start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          end = now.toISOString();
          break;
        case 'custom':
          start = startDate || undefined;
          end = endDate || undefined;
          break;
      }

      const response = await reportsApi.getDatasourceUsage(start, end);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      let start: string | undefined;
      let end: string | undefined;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (timeRange) {
        case 'today':
          start = today.toISOString();
          end = now.toISOString();
          break;
        case 'week':
          start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          end = now.toISOString();
          break;
        case 'month':
          start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          end = now.toISOString();
          break;
        case 'custom':
          start = startDate || undefined;
          end = endDate || undefined;
          break;
      }

      const blob = await reportsApi.exportDatasourceUsageCsv(start, end);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datasource-usage-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FEISHU: '飞书',
      GITLAB: 'GitLab',
      DATABASE: '数据库',
    };
    return labels[type] || type;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!data) {
    return <div>暂无数据</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>数据源使用情况报表</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setTimeRange('today')}
            style={{
              padding: '6px 12px',
              border: timeRange === 'today' ? '2px solid #2196f3' : '1px solid #ddd',
              borderRadius: '4px',
              background: timeRange === 'today' ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
            }}
          >
            今天
          </button>
          <button
            onClick={() => setTimeRange('week')}
            style={{
              padding: '6px 12px',
              border: timeRange === 'week' ? '2px solid #2196f3' : '1px solid #ddd',
              borderRadius: '4px',
              background: timeRange === 'week' ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
            }}
          >
            本周
          </button>
          <button
            onClick={() => setTimeRange('month')}
            style={{
              padding: '6px 12px',
              border: timeRange === 'month' ? '2px solid #2196f3' : '1px solid #ddd',
              borderRadius: '4px',
              background: timeRange === 'month' ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
            }}
          >
            本月
          </button>
          <button
            onClick={() => setTimeRange('custom')}
            style={{
              padding: '6px 12px',
              border: timeRange === 'custom' ? '2px solid #2196f3' : '1px solid #ddd',
              borderRadius: '4px',
              background: timeRange === 'custom' ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
            }}
          >
            自定义
          </button>
          {timeRange === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <span>至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </>
          )}
          <button
            onClick={loadStatistics}
            style={{
              padding: '6px 12px',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              background: '#2196f3',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            刷新
          </button>
          <button
            onClick={handleExportCsv}
            style={{
              padding: '6px 12px',
              border: '1px solid #4caf50',
              borderRadius: '4px',
              background: '#4caf50',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            导出 CSV
          </button>
        </div>
      </div>

      {/* 检索次数统计 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>检索次数统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按类型分布</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.searchCounts.byType.map(item => ({ name: getTypeLabel(item.type), value: item.count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.searchCounts.byType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按数据源统计</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.searchCounts.byDatasource.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="datasourceName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#2196f3" name="检索次数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 命中率统计 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>命中率统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按类型命中率</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hitRate.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tickFormatter={getTypeLabel} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#4caf50" name="命中率 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>详细数据</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.hitRate.byType.map((item, index) => (
                <div key={index} style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{getTypeLabel(item.type)}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>命中率: {item.rate.toFixed(2)}%</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>总反馈: {item.total} | 命中: {item.hits}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 数据量统计 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>数据量统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>数据量趋势</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dataVolume.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalDocuments" stroke="#2196f3" name="文档总数" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按类型统计</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.dataVolume.byType.map((item, index) => (
                <div key={index} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{getTypeLabel(item.type)}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>文档数: {item.documentCount}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>代码文件数: {item.codeFileCount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 同步情况 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>同步情况</h2>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {data.syncStatus.byDatasource.map((item, index) => (
              <div key={index} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{item.datasourceName}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>类型: {getTypeLabel(item.type)}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>同步次数: {item.syncCount}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>成功率: {item.successRate.toFixed(2)}%</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>平均耗时: {item.avgDuration.toFixed(0)}ms</div>
                <div style={{ fontSize: '12px', color: '#666' }}>最后同步: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 健康度 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>数据源健康度</h2>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {data.health.byDatasource.map((item, index) => (
              <div key={index} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', border: `2px solid ${getHealthColor(item.healthScore)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.datasourceName}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: getHealthColor(item.healthScore) }}>{item.healthScore}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>类型: {getTypeLabel(item.type)}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>状态: {item.status}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>错误率: {item.errorRate.toFixed(2)}%</div>
                <div style={{ fontSize: '12px', color: '#666' }}>最后同步: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

