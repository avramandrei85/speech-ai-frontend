type DashboardNavProps = {
  activeTab: "chatbot" | "ai" | "about" | "orders";
  onTabChange: (tab: "chatbot" | "ai" | "about" | "orders") => void;
  onLogout: () => void;
};

export default function DashboardNav({
  activeTab,
  onTabChange,
  onLogout,
}: DashboardNavProps) {
  return (
    <nav className="dashboard-nav">
      <div className="nav-left">
        <div className="nav-tabs">
          {/* <button
            className={`dashboard-tab ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => onTabChange("ai")}
          >
            My AI Agent
          </button> */}
          {/* <button
            className={`dashboard-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => onTabChange('about')}
          >
            About Me
          </button> */}
          <button
            className={`dashboard-tab ${activeTab === "chatbot" ? "active" : ""}`}
            onClick={() => onTabChange("chatbot")}
          >
            Chatbot
          </button>
          <button
            className={`dashboard-tab ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => onTabChange("orders")}
          >
            Orders
          </button>
        </div>
      </div>
      <button className="logout-btn" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
}
