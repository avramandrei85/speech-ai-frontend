type DashboardNavProps = {
  activeTab: 'ai' | 'about';
  onTabChange: (tab: 'ai' | 'about') => void;
  onLogout: () => void;
};

export default function DashboardNav({ activeTab, onTabChange, onLogout }: DashboardNavProps) {
  return (
    <nav className="dashboard-nav">
      <div className="nav-left">
        <div className="nav-title">AI Dashboard</div>
        <div className="nav-tabs">
          <button
            className={`dashboard-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => onTabChange('ai')}
          >
            My AI Agent
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => onTabChange('about')}
          >
            About Me
          </button>
        </div>
      </div>
      <button className="logout-btn" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
}
