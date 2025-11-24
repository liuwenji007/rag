import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import Dashboard from '../pages/Dashboard';
import DatasourceList from '../pages/datasources/DatasourceList';
import DatasourceForm from '../pages/datasources/DatasourceForm';
import DiffAnalysisPage from '../pages/diff-analysis/DiffAnalysisPage';
import DocumentUploadPage from '../pages/documents/DocumentUploadPage';
import PRDListPage from '../pages/documents/prd/PRDListPage';
import PRDDetailPage from '../pages/documents/prd/PRDDetailPage';
import PRDEditPage from '../pages/documents/prd/PRDEditPage';
import DesignListPage from '../pages/documents/designs/DesignListPage';
import DesignDetailPage from '../pages/documents/designs/DesignDetailPage';
import DesignEditPage from '../pages/documents/designs/DesignEditPage';

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
            <Route path="diff-analysis" element={<DiffAnalysisPage />} />
            <Route path="documents/upload" element={<DocumentUploadPage />} />
            <Route path="documents/prd" element={<PRDListPage />} />
            <Route path="documents/prd/:id" element={<PRDDetailPage />} />
            <Route path="documents/prd/:id/edit" element={<PRDEditPage />} />
            <Route path="documents/designs" element={<DesignListPage />} />
            <Route path="documents/designs/:id" element={<DesignDetailPage />} />
            <Route path="documents/designs/:id/edit" element={<DesignEditPage />} />
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

