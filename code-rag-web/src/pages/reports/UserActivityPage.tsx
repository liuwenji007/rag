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
import { reportsApi, type UserActivityStatistics } from '../../services/reports';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];

export default function UserActivityPage() {
  const [data, setData] = useState<UserActivityStatistics | null>(null);
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

      const response = await reportsApi.getUserActivity(start, end);
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

      const blob = await reportsApi.exportUserActivityCsv(start, end);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-activity-${new Date().toISOString().split('T')[0]}.csv`;
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
        <h1 style={{ margin: 0 }}>用户活跃度报表</h1>
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

      {/* DAU/WAU/MAU */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>活跃用户统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>日活 (DAU)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{data.activeUsers.dau}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>周活 (WAU)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{data.activeUsers.wau}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>月活 (MAU)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{data.activeUsers.mau}</div>
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>DAU 趋势</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.activeUsers.dauTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#2196f3" name="日活用户数" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 用户留存率 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>用户留存率</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>次日留存</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{data.retention.day1.toFixed(1)}%</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>7 日留存</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{data.retention.day7.toFixed(1)}%</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>30 日留存</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{data.retention.day30.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* 使用频率分布 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>使用频率分布</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>用户分布</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: '活跃用户', value: data.frequencyDistribution.active },
                    { name: '普通用户', value: data.frequencyDistribution.normal },
                    { name: '低频用户', value: data.frequencyDistribution.low },
                    { name: '不活跃用户', value: data.frequencyDistribution.inactive },
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
                    { name: '活跃用户', value: data.frequencyDistribution.active },
                    { name: '普通用户', value: data.frequencyDistribution.normal },
                    { name: '低频用户', value: data.frequencyDistribution.low },
                    { name: '不活跃用户', value: data.frequencyDistribution.inactive },
                  ].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>详细数据</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <span>活跃用户（7 日内操作 &gt;= 10 次）</span>
                <span style={{ fontWeight: 'bold' }}>{data.frequencyDistribution.active}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <span>普通用户（7 日内操作 3-9 次）</span>
                <span style={{ fontWeight: 'bold' }}>{data.frequencyDistribution.normal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <span>低频用户（7 日内操作 1-2 次）</span>
                <span style={{ fontWeight: 'bold' }}>{data.frequencyDistribution.low}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <span>不活跃用户（7 日内无操作）</span>
                <span style={{ fontWeight: 'bold' }}>{data.frequencyDistribution.inactive}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 按角色活跃度 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>按角色活跃度</h2>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="dau" fill="#2196f3" name="DAU" />
              <Bar dataKey="wau" fill="#4caf50" name="WAU" />
              <Bar dataKey="mau" fill="#ff9800" name="MAU" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>详细数据</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {data.byRole.map((item, index) => (
              <div key={index} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{item.role}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>DAU: {item.dau}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>WAU: {item.wau}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>MAU: {item.mau}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>总用户数: {item.totalUsers}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

