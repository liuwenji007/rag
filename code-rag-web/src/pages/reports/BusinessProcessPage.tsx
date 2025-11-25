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
import { reportsApi, type BusinessProcessStatistics } from '../../services/reports';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];

export default function BusinessProcessPage() {
  const [data, setData] = useState<BusinessProcessStatistics | null>(null);
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

      const response = await reportsApi.getBusinessProcess(start, end);
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

      const blob = await reportsApi.exportBusinessProcessCsv(start, end);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-process-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      developer: '开发者',
      product: '产品',
      ui: 'UI',
      admin: '管理员',
      unknown: '未知',
    };
    return labels[role] || role;
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
        <h1 style={{ margin: 0 }}>业务流程完成时间统计</h1>
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

      {/* 需求到代码交付周期 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>需求到代码交付周期</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>平均周期</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{data.deliveryCycle.average.toFixed(2)} 小时</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>中位数周期</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{data.deliveryCycle.median.toFixed(2)} 小时</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>最短周期</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{data.deliveryCycle.min.toFixed(2)} 小时</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>最长周期</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>{data.deliveryCycle.max.toFixed(2)} 小时</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>周期分布</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.deliveryCycle.distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#2196f3" name="数量" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>周期趋势</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.deliveryCycle.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="averageCycle" stroke="#2196f3" name="平均周期（小时）" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 一次命中率 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>一次命中率</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按角色统计</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.firstHitRate.byRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" tickFormatter={getRoleLabel} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#4caf50" name="命中率 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>趋势</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.firstHitRate.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rate" stroke="#4caf50" name="命中率 (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', marginTop: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>总体一次命中率: {data.firstHitRate.overall.toFixed(2)}%</div>
          <div style={{ fontSize: '14px', color: '#666' }}>首次检索结果被采纳的比例</div>
        </div>
      </div>

      {/* 多轮问答解决率 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>多轮问答解决率（3 轮内）</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按轮次统计</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.resolutionRate.byRound.map(item => ({ name: item.round === 4 ? '4+轮' : `${item.round}轮`, value: item.count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.resolutionRate.byRound.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>按角色统计</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.resolutionRate.byRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" tickFormatter={getRoleLabel} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#ff9800" name="解决率 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', marginTop: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>总体解决率: {data.resolutionRate.overall.toFixed(2)}%</div>
          <div style={{ fontSize: '14px', color: '#666' }}>3 轮检索内解决问题的比例</div>
        </div>
      </div>

      {/* 流程时间缩短比例 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>流程时间缩短比例</h2>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>当前平均周期</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{data.timeReduction.currentAverage.toFixed(2)} 小时</div>
            </div>
            {data.timeReduction.baselineAverage !== undefined && (
              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>基准平均周期</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{data.timeReduction.baselineAverage.toFixed(2)} 小时</div>
              </div>
            )}
          </div>
          {data.timeReduction.reductionPercentage !== undefined && (
            <>
              <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>缩短比例</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>
                  {data.timeReduction.reductionPercentage > 0 ? '+' : ''}{data.timeReduction.reductionPercentage.toFixed(2)}%
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>目标达成度（目标：缩短 {data.timeReduction.target}%）</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: data.timeReduction.achievement >= 100 ? '#4caf50' : '#ff9800' }}>
                  {data.timeReduction.achievement.toFixed(2)}%
                </div>
              </div>
            </>
          )}
          {data.timeReduction.baselineAverage === undefined && (
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
              暂无历史数据，无法计算缩短比例
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

