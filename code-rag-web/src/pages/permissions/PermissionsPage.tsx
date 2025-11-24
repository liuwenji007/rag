import { useState, useEffect } from 'react';
import { permissionsApi, type PermissionMatrix, type UserWithRoles, type PermissionChangeLog } from '../../services/permissions';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';

function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'changelog'>('matrix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ padding: '20px' }}>
      <h1>权限配置</h1>

      {/* 标签页 */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'matrix' ? '#3498db' : 'transparent',
            color: activeTab === 'matrix' ? '#fff' : '#333',
            cursor: 'pointer',
            borderBottom: activeTab === 'matrix' ? '2px solid #3498db' : '2px solid transparent',
          }}
        >
          权限矩阵
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'users' ? '#3498db' : 'transparent',
            color: activeTab === 'users' ? '#fff' : '#333',
            cursor: 'pointer',
            borderBottom: activeTab === 'users' ? '2px solid #3498db' : '2px solid transparent',
          }}
        >
          用户角色
        </button>
        <button
          onClick={() => setActiveTab('changelog')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'changelog' ? '#3498db' : 'transparent',
            color: activeTab === 'changelog' ? '#fff' : '#333',
            cursor: 'pointer',
            borderBottom: activeTab === 'changelog' ? '2px solid #3498db' : '2px solid transparent',
          }}
        >
          变更日志
        </button>
      </div>

      {/* 内容区域 */}
      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}
      {loading && <Loading />}

      {activeTab === 'matrix' && <PermissionMatrixTab />}
      {activeTab === 'users' && <UserRolesTab />}
      {activeTab === 'changelog' && <ChangeLogTab />}
    </div>
  );
}

// 权限矩阵标签页
function PermissionMatrixTab() {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await permissionsApi.getPermissionMatrix();
      setMatrix(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载权限矩阵失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (roleId: string, permissionId: string, granted: boolean) => {
    if (!matrix) return;

    const role = matrix.matrix.find((m) => m.roleId === roleId);
    if (!role) return;

    const currentPermissionIds = role.permissions
      .filter((p) => p.granted)
      .map((p) => p.permissionId);

    const newPermissionIds = granted
      ? [...currentPermissionIds, permissionId]
      : currentPermissionIds.filter((id) => id !== permissionId);

    try {
      setSaving((prev) => ({ ...prev, [roleId]: true }));
      await permissionsApi.updateRolePermissions(roleId, newPermissionIds);
      await loadMatrix(); // 重新加载
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新权限失败');
    } finally {
      setSaving((prev) => ({ ...prev, [roleId]: false }));
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={loadMatrix} />;
  if (!matrix) return null;

  // 按分类分组权限
  const permissionsByCategory = matrix.permissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, typeof matrix.permissions>);

  return (
    <div>
      <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e0e0e0',
          }}
        >
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                角色
              </th>
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <th
                  key={category}
                  colSpan={perms.length}
                  style={{ padding: '12px', textAlign: 'center', border: '1px solid #e0e0e0' }}
                >
                  {category}
                </th>
              ))}
            </tr>
            <tr style={{ background: '#f9f9f9' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}></th>
              {matrix.permissions.map((perm) => (
                <th
                  key={perm.id}
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    border: '1px solid #e0e0e0',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                  title={perm.description}
                >
                  {perm.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.matrix.map((row) => (
              <tr key={row.roleId}>
                <td
                  style={{
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    fontWeight: 'bold',
                  }}
                >
                  {row.roleName}
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {row.roleDescription}
                  </div>
                </td>
                {row.permissions.map((perm) => (
                  <td
                    key={perm.permissionId}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={perm.granted}
                      onChange={(e) =>
                        handleTogglePermission(row.roleId, perm.permissionId, e.target.checked)
                      }
                      disabled={saving[row.roleId]}
                      style={{ cursor: saving[row.roleId] ? 'wait' : 'pointer' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 用户角色标签页
function UserRolesTab() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [page, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await permissionsApi.getUsersWithRoles({
        page,
        limit: 20,
        search: search || undefined,
      });
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const matrix = await permissionsApi.getPermissionMatrix();
      setAllRoles(matrix.roles);
    } catch (err) {
      console.error('加载角色列表失败:', err);
    }
  };

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUserId(user.id);
    setEditingRoles(user.roles.map((r) => r.id));
  };

  const handleSaveUserRoles = async (userId: string) => {
    try {
      await permissionsApi.updateUserRoles(userId, editingRoles);
      setEditingUserId(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新用户角色失败');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={loadUsers} />;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="搜索用户（邮箱或姓名）"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px',
          }}
        />
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #e0e0e0',
        }}
      >
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              邮箱
            </th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              姓名
            </th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              角色
            </th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>{user.email}</td>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>{user.name || '-'}</td>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                {editingUserId === user.id ? (
                  <div>
                    {allRoles.map((role) => (
                      <label key={role.id} style={{ display: 'block', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={editingRoles.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRoles([...editingRoles, role.id]);
                            } else {
                              setEditingRoles(editingRoles.filter((id) => id !== role.id));
                            }
                          }}
                        />
                        <span style={{ marginLeft: '8px' }}>{role.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    {user.roles.map((role) => (
                      <span
                        key={role.id}
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          margin: '2px',
                          background: '#e3f2fd',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                {editingUserId === user.id ? (
                  <div>
                    <button
                      onClick={() => handleSaveUserRoles(user.id)}
                      style={{
                        padding: '6px 12px',
                        marginRight: '8px',
                        background: '#4caf50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingUserId(null)}
                      style={{
                        padding: '6px 12px',
                        background: '#f44336',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditUser(user)}
                    style={{
                      padding: '6px 12px',
                      background: '#2196f3',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    编辑
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 分页 */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            padding: '8px 16px',
            margin: '0 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          上一页
        </button>
        <span style={{ margin: '0 16px' }}>
          第 {page} 页 / 共 {totalPages} 页
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{
            padding: '8px 16px',
            margin: '0 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

// 变更日志标签页
function ChangeLogTab() {
  const [logs, setLogs] = useState<PermissionChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await permissionsApi.getPermissionChangeLog({
        page,
        limit: 20,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载变更日志失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={loadLogs} />;

  return (
    <div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #e0e0e0',
        }}
      >
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              时间
            </th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              操作人
            </th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              变更类型
            </th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
              描述
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                {new Date(log.createdAt).toLocaleString('zh-CN')}
              </td>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                {log.changedBy.name || log.changedBy.email}
              </td>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                {log.changeType}
              </td>
              <td style={{ padding: '12px', border: '1px solid #e0e0e0' }}>
                {log.description || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 分页 */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            padding: '8px 16px',
            margin: '0 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          上一页
        </button>
        <span style={{ margin: '0 16px' }}>
          第 {page} 页 / 共 {totalPages} 页
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{
            padding: '8px 16px',
            margin: '0 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export default PermissionsPage;

