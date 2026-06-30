import React from 'react';
import ResultsDisplay from './ResultsDisplay';

interface ScreeningResult {
  id: string;
  filename: string;
  score: number;
  status: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  timestamp: string;
  match_percentage: number;
}

interface DashboardProps {
  results: ScreeningResult[];
  selectedResult: ScreeningResult | null;
  setSelectedResult: (result: ScreeningResult | null) => void;
  onDeleteResult: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  results,
  selectedResult,
  setSelectedResult,
  onDeleteResult,
}) => {
  const stats = {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    average:
      results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
        : 0,
  };

  return (
    <div className="dashboard">
      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Screened</div>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, #065f46 100%)' }}>
          <div className="stat-value">{stats.passed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, var(--warning) 0%, #92400e 100%)' }}>
          <div className="stat-value">{stats.average}%</div>
          <div className="stat-label">Avg. Score</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="results-list">
          <h3 className="section-title">Recent Results</h3>
          {results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p>No screening results yet.</p>
            </div>
          ) : (
            <div className="results-container" style={{ gridTemplateColumns: '1fr' }}>
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`result-card ${selectedResult?.id === result.id ? 'active' : ''}`}
                  onClick={() => setSelectedResult(result)}
                  style={{ borderLeftColor: result.status === 'passed' ? 'var(--success)' : 'var(--danger)' }}
                >
                  <div className="result-filename">{result.filename}</div>
                  <div className="result-score">{result.score}%</div>
                  <span className={`result-status status-${result.status}`}>
                    {result.status.toUpperCase()}
                  </span>
                  <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteResult(result.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="result-details">
          {selectedResult ? (
            <ResultsDisplay result={selectedResult} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="empty-icon">🔍</div>
              <p>Select a result from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
