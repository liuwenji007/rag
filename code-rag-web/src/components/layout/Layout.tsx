import { type ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <Header />
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            backgroundColor: '#fff',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;

