import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import Dashboard from '../pages/Dashboard';
import DatasourceList from '../pages/datasources/DatasourceList';
import DatasourceForm from '../pages/datasources/DatasourceForm';

function AppRoutes() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Outlet /></Layout>}>
            <Route index element={<Dashboard />} />
            <Route path="datasources" element={<DatasourceList />} />
            <Route path="datasources/new" element={<DatasourceForm />} />
            <Route path="datasources/:id/edit" element={<DatasourceForm />} />
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

