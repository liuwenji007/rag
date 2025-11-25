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
import { reportsApi, type SearchStatistics } from '../../services/reports';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];

export default function SearchStatisticsPage() {
  const [data, setData] = useState<SearchStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadStatistics();
  }, [timeRange, startDate, endDate, role, userId]);

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

      const response = await reportsApi.getSearchStatistics(
        start,
        end,
        role || undefined,
        userId || undefined,
      );
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

      const blob = await reportsApi.exportSearchStatisticsCsv(
        start,
        end,
        role || undefined,
        userId || undefined,
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-statistics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    }
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
        <h1 style={{ margin: 0 }}>检索统计报表</h1>
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">全部角色</option>
            <option value="developer">开发者</option>
            <option value="product">产品</option>
            <option value="ui">UI</option>
            <option value="admin">管理员</option>
          </select>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="用户 ID"
            style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', width: '120px' }}
          />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>总检索次数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.searchCounts.total}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按时间趋势</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.searchCounts.byTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#2196f3" name="检索次数" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按角色分布</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.searchCounts.byRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>总体命中率</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{data.hitRate.overall.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>命中率趋势</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.hitRate.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rate" stroke="#4caf50" name="命中率 (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按角色命中率</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hitRate.byRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#4caf50" name="命中率 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 响应时长统计 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>响应时长统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>平均响应时间</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.responseTime.avg}ms</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>P95 响应时间</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.responseTime.p95}ms</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>P99 响应时间</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.responseTime.p99}ms</div>
          </div>
        </div>
      </div>

      {/* 热门查询 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>热门查询</h2>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.popularQueries.length > 0 ? (
              data.popularQueries.map((item, index) => (
                <div key={index} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{item.query}</div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginLeft: '16px' }}>{item.count} 次</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '14px', color: '#999' }}>暂无热门查询</div>
            )}
          </div>
        </div>
      </div>

      {/* 检索结果分布 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>检索结果分布</h2>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: '代码', value: data.resultDistribution.code },
                  { name: '文档', value: data.resultDistribution.document },
                  { name: '设计稿', value: data.resultDistribution.design },
                  { name: '其他', value: data.resultDistribution.other },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: '代码', value: data.resultDistribution.code },
                  { name: '文档', value: data.resultDistribution.document },
                  { name: '设计稿', value: data.resultDistribution.design },
                  { name: '其他', value: data.resultDistribution.other },
                ].map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

