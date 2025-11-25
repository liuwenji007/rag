import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface MenuItem {
  path: string;
  label: string;
  icon?: string;
  permission?: keyof ReturnType<typeof usePermissions>['permissions'];
}

const allMenuItems: MenuItem[] = [
  { path: '/', label: '数据看板' },
  { path: '/datasources', label: '数据源管理', permission: 'canManageDatasources' },
  { path: '/diff-analysis', label: '差异分析', permission: 'canDiffAnalysis' },
  { path: '/documents/upload', label: '文档上传', permission: 'canUploadDocuments' },
  { path: '/documents/prd', label: 'PRD 管理', permission: 'canManagePRD' },
  { path: '/documents/designs', label: '设计资源', permission: 'canManageDesigns' },
  { path: '/reviews', label: '内容审核', permission: 'canReviewContent' },
  { path: '/permissions', label: '权限管理', permission: 'canManagePermissions' },
  { path: '/search', label: '检索', permission: 'canSearch' },
  { path: '/audit-logs', label: '审计日志', permission: 'canManagePermissions' },
  { path: '/reports/search', label: '检索统计', permission: 'canManagePermissions' },
  { path: '/reports/user-activity', label: '用户活跃度', permission: 'canManagePermissions' },
  { path: '/documents', label: '内容管理' },
];

function Sidebar() {
  const location = useLocation();
  const { permissions } = usePermissions();

  // 根据权限过滤菜单项
  const menuItems = allMenuItems.filter((item) => {
    if (!item.permission) {
      return true; // 没有权限要求的菜单项始终显示
    }
    return permissions[item.permission];
  });

  return (
    <aside
      style={{
        width: '200px',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #e0e0e0',
        padding: '20px 0',
      }}
    >
      <nav>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && item.path !== '/';
            const isDashboardActive = location.pathname === '/' && item.path === '/';
            return (
              <li key={item.path} style={{ marginBottom: '4px' }}>
                <Link
                  to={item.path}
                  style={{
                    display: 'block',
                    padding: '12px 20px',
                    color: (isActive || isDashboardActive) ? '#3498db' : '#333',
                    textDecoration: 'none',
                    backgroundColor: (isActive || isDashboardActive) ? '#e3f2fd' : 'transparent',
                    borderLeft: (isActive || isDashboardActive) ? '3px solid #3498db' : '3px solid transparent',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;

