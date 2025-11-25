import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardApi, type DashboardOverview } from '../services/dashboard';
import ErrorMessage from '../components/common/ErrorMessage';
import Loading from '../components/common/Loading';

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, startDate, endDate]);

  const loadDashboardData = async () => {
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

      const response = await dashboardApi.getOverview(start, end);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载看板数据失败');
    } finally {
      setLoading(false);
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
        <h1 style={{ margin: 0 }}>数据看板</h1>
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
            onClick={loadDashboardData}
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
        </div>
      </div>

      {/* 数据源状态概览 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>数据源状态</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>总数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.datasources.total}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #4caf50', borderRadius: '8px', backgroundColor: '#f1f8f4' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>健康</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{data.datasources.healthy}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #ff9800', borderRadius: '8px', backgroundColor: '#fffbf0' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>警告</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{data.datasources.warning}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #f44336', borderRadius: '8px', backgroundColor: '#ffebee' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>错误</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>{data.datasources.error}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>文档总数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.datasources.totalDocuments}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>代码文件数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.datasources.totalCodeFiles}</div>
          </div>
        </div>
      </div>

      {/* 检索统计 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>检索统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>检索次数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.search.totalSearches}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>命中率</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.search.hitRate.toFixed(1)}%</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>平均响应时间</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.search.avgResponseTime}ms</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>P95 响应时间</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.search.p95ResponseTime}ms</div>
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.search.searchesByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#2196f3" name="检索次数" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 用户活跃度 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>用户活跃度</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>日活 (DAU)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.userActivity.dau}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>周活 (WAU)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.userActivity.wau}</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>月活 (MAU)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.userActivity.mau}</div>
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.userActivity.activeUsersByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#4caf50" name="活跃用户数" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 采纳率统计 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>采纳率统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>总体采纳率</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>{data.adoption.overallRate.toFixed(1)}%</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.adoption.byRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#2196f3" name="采纳率 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px', marginTop: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.adoption.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#4caf50" name="采纳率 (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 用户反馈概览 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>用户反馈概览</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>反馈比例</div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>正向反馈</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{data.feedback.positiveRate.toFixed(1)}%</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>负向反馈</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>{data.feedback.negativeRate.toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
              总反馈数: {data.feedback.totalFeedbacks}
            </div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>热门反馈意见</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.feedback.topComments.length > 0 ? (
                data.feedback.topComments.map((item, index) => (
                  <div key={index} style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{item.comment}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>出现 {item.count} 次</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '14px', color: '#999' }}>暂无反馈意见</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
