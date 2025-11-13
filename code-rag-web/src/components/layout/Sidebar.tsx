import { Link, useLocation } from 'react-router-dom';

interface MenuItem {
  path: string;
  label: string;
  icon?: string;
}

const menuItems: MenuItem[] = [
  { path: '/', label: '数据看板' },
  { path: '/datasources', label: '数据源管理' },
  { path: '/search', label: '检索' },
  { path: '/documents', label: '内容管理' },
];

function Sidebar() {
  const location = useLocation();

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
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path} style={{ marginBottom: '4px' }}>
                <Link
                  to={item.path}
                  style={{
                    display: 'block',
                    padding: '12px 20px',
                    color: isActive ? '#3498db' : '#333',
                    textDecoration: 'none',
                    backgroundColor: isActive ? '#e3f2fd' : 'transparent',
                    borderLeft: isActive ? '3px solid #3498db' : '3px solid transparent',
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

