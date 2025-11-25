import { useState } from 'react';
import ErrorMessage from '../../components/common/ErrorMessage';

const ReportFormat = {
  CSV: 'csv',
  PDF: 'pdf',
  EXCEL: 'excel',
} as const;

const ReportType = {
  SEARCH_STATISTICS: 'search-statistics',
  USER_ACTIVITY: 'user-activity',
  DATASOURCE_USAGE: 'datasource-usage',
  BUSINESS_PROCESS: 'business-process',
  ALL: 'all',
} as const;

type ReportFormatType = typeof ReportFormat[keyof typeof ReportFormat];
type ReportTypeType = typeof ReportType[keyof typeof ReportType];

export default function ReportExportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<ReportTypeType[]>([ReportType.ALL]);
  const [format, setFormat] = useState<ReportFormatType>(ReportFormat.PDF);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  const handleTypeChange = (type: ReportTypeType) => {
    if (type === ReportType.ALL) {
      setSelectedTypes([ReportType.ALL]);
    } else {
      setSelectedTypes((prev) => {
        const filtered = prev.filter((t) => t !== ReportType.ALL);
        if (filtered.includes(type)) {
          return filtered.filter((t) => t !== type);
        } else {
          return [...filtered, type];
        }
      });
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          types: selectedTypes.length === 0 ? [ReportType.ALL] : selectedTypes,
          format,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          includeCharts,
          includeSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      let extension = '';
      switch (format) {
        case ReportFormat.CSV:
          extension = '.csv';
          break;
        case ReportFormat.PDF:
          extension = '.pdf';
          break;
        case ReportFormat.EXCEL:
          extension = '.xlsx';
          break;
      }
      a.download = `report_${timestamp}${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>报表导出</h1>

      {error && <ErrorMessage message={error} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 报表类型选择 */}
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>选择报表类型</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.values(ReportType).map((type) => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => handleTypeChange(type)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>
                  {type === ReportType.ALL && '全部报表'}
                  {type === ReportType.SEARCH_STATISTICS && '检索统计报表'}
                  {type === ReportType.USER_ACTIVITY && '用户活跃度报表'}
                  {type === ReportType.DATASOURCE_USAGE && '数据源使用情况报表'}
                  {type === ReportType.BUSINESS_PROCESS && '业务流程统计报表'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 导出格式选择 */}
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>选择导出格式</h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            {Object.values(ReportFormat).map((fmt) => (
              <label key={fmt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  onChange={() => setFormat(fmt)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>
                  {fmt === ReportFormat.CSV && 'CSV（数据分析）'}
                  {fmt === ReportFormat.PDF && 'PDF（汇报展示）'}
                  {fmt === ReportFormat.EXCEL && 'Excel（进一步处理）'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 时间范围 */}
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>时间范围（可选）</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '200px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '200px' }}
              />
            </div>
          </div>
        </div>

        {/* 选项 */}
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>导出选项</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>包含图表（PDF/Excel）</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>包含摘要说明</span>
            </label>
          </div>
        </div>

        {/* 导出按钮 */}
        <div>
          <button
            onClick={handleExport}
            disabled={loading || selectedTypes.length === 0}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              background: loading || selectedTypes.length === 0 ? '#ccc' : '#2196f3',
              color: '#fff',
              cursor: loading || selectedTypes.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {loading ? '导出中...' : '导出报表'}
          </button>
        </div>
      </div>
    </div>
  );
}

