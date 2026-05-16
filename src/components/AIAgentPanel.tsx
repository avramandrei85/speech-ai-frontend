type AIAgentPanelProps = {
  isActive: boolean;
  status: string;
  transcript: string;
  visualization: string | null;
  onSessionToggle: () => void;
};

export default function AIAgentPanel({ 
  isActive, 
  status, 
  transcript, 
  visualization, // Added this
  onSessionToggle 
}: AIAgentPanelProps) {
  return (
    <div className="dashboard-content">
      <button
        className={`record-btn ${isActive ? 'active' : ''}`}
        onClick={onSessionToggle}
      >
        {isActive ? 'Stop Conversation' : 'Start Conversation'}
      </button>
      
      <p className="status-text">Status: {status}</p>

      <div className="data-display-container">
        {/* The ongoing conversation */}
        <div className="transcript-box">
           <h3>Conversation</h3>
           <div dangerouslySetInnerHTML={{ __html: transcript }} />
        </div>

        {/* The generated table/data visualization */}
        {visualization && (
          <div className="visualization-box">
            <h3>Data View</h3>
            <div dangerouslySetInnerHTML={{ __html: visualization }} />
          </div>
        )}
      </div>
    </div>
  );
}