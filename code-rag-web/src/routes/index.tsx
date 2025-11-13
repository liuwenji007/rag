import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import Dashboard from '../pages/Dashboard';

function AppRoutes() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Outlet /></Layout>}>
            <Route index element={<Dashboard />} />
            {/* TODO: 添加更多路由 */}
            <Route path="datasources" element={<div>数据源管理</div>} />
            <Route path="search" element={<div>检索</div>} />
            <Route path="documents" element={<div>内容管理</div>} />
            <Route path="*" element={<div>404 - 页面不存在</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default AppRoutes;

