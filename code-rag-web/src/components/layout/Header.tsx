function Header() {
  return (
    <header
      style={{
        height: '60px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>code-rag</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* TODO: 用户信息、通知等 */}
        <span>用户</span>
      </div>
    </header>
  );
}

export default Header;

