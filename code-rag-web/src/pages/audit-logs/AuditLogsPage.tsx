import { useState, useEffect } from 'react';
import {
  auditLogsApi,
  type AuditLogItem,
  type AuditLogStats,
  type QueryAuditLogsParams,
} from '../../services/audit-logs';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';

// 操作类型映射
const ACTION_TYPE_LABELS: Record<string, string> = {
  search: '检索',
  document_upload: '文档上传',
  document_delete: '文档删除',
  document_update: '文档更新',
  permission_change: '权限变更',
  role_assignment: '角色分配',
  datasource_create: '数据源创建',
  datasource_update: '数据源更新',
  datasource_delete: '数据源删除',
  datasource_sync: '数据源同步',
  user_login: '用户登录',
  user_logout: '用户登出',
};

// 资源类型映射
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  document: '文档',
  datasource: '数据源',
  permission: '权限',
  role: '角色',
  user: '用户',
  search: '检索',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // 筛选条件
  const [filters, setFilters] = useState<QueryAuditLogsParams>({
    userId: undefined,
    actionType: undefined,
    resourceType: undefined,
    resourceId: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  // 加载审计日志
  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: QueryAuditLogsParams = {
        page,
        limit,
        ...filters,
      };
      const response = await auditLogsApi.getAuditLogs(params);
      setLogs(response.logs);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const statsData = await auditLogsApi.getAuditLogStats({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [page, filters]);

  useEffect(() => {
    loadStats();
  }, [filters.startDate, filters.endDate]);

  // 导出 CSV
  const handleExportCsv = async () => {
    try {
      const blob = await auditLogsApi.exportCsv({
        ...filters,
        page: 1,
        limit: 10000, // 导出所有数据
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    }
  };

  // 导出 PDF/JSON
  const handleExportPdf = async () => {
    try {
      const blob = await auditLogsApi.exportPdf({
        ...filters,
        page: 1,
        limit: 10000,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    }
  };

  // 重置筛选条件
  const handleResetFilters = () => {
    setFilters({
      userId: undefined,
      actionType: undefined,
      resourceType: undefined,
      resourceId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    setPage(1);
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 格式化详情
  const formatDetails = (details: Record<string, any> | null | undefined) => {
    if (!details) return '-';
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>审计日志</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCsv}
            style={{
              padding: '8px 16px',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              background: '#fff',
              color: '#2196f3',
              cursor: 'pointer',
            }}
          >
            📥 导出 CSV
          </button>
          <button
            onClick={handleExportPdf}
            style={{
              padding: '8px 16px',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              background: '#fff',
              color: '#2196f3',
              cursor: 'pointer',
            }}
          >
            📥 导出 JSON
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>总日志数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>操作类型数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.byActionType.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>资源类型数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.byResourceType.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>用户数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.byUser.length}</div>
          </div>
        </div>
      )}

      {/* 筛选条件 */}
      <div
        style={{
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              用户 ID
            </label>
            <input
              type="text"
              value={filters.userId || ''}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
              placeholder="输入用户 ID"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              操作类型
            </label>
            <select
              value={filters.actionType || ''}
              onChange={(e) => setFilters({ ...filters, actionType: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">全部</option>
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              资源类型
            </label>
            <select
              value={filters.resourceType || ''}
              onChange={(e) => setFilters({ ...filters, resourceType: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">全部</option>
              {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              资源 ID
            </label>
            <input
              type="text"
              value={filters.resourceId || ''}
              onChange={(e) => setFilters({ ...filters, resourceId: e.target.value || undefined })}
              placeholder="输入资源 ID"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              开始日期
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              结束日期
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={handleResetFilters}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            重置
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && <ErrorMessage message={error} onRetry={loadAuditLogs} />}

      {/* 加载中 */}
      {loading && <Loading />}

      {/* 日志列表 */}
      {!loading && (
        <>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            共 {total} 条日志，第 {page} / {totalPages} 页
          </div>

          {logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>暂无审计日志</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#fff',
                }}
              >
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>时间</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>用户</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>操作类型</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>资源类型</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>资源 ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>IP 地址</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0', fontSize: '12px' }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                        <div>{log.user.email}</div>
                        {log.user.name && <div style={{ fontSize: '12px', color: '#666' }}>{log.user.name}</div>}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                        {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                        {log.resourceType ? RESOURCE_TYPE_LABELS[log.resourceType] || log.resourceType : '-'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0', fontSize: '12px', fontFamily: 'monospace' }}>
                        {log.resourceId || '-'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0', fontSize: '12px' }}>
                        {log.ipAddress || '-'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #e0e0e0', fontSize: '12px', maxWidth: '300px' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#2196f3' }}>查看详情</summary>
                          <pre
                            style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: '#f5f5f5',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '200px',
                              fontSize: '11px',
                            }}
                          >
                            {formatDetails(log.details)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: page === 1 ? '#f5f5f5' : '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                上一页
              </button>
              <span style={{ padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: page === totalPages ? '#f5f5f5' : '#fff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

