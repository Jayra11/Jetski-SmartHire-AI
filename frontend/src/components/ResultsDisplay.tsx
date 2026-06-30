import React from 'react';

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

interface ResultsDisplayProps {
  result: ScreeningResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  return (
    <div className="detailed-results card">
      <div className="score-section">
        <div className="score-circle">{result.score}</div>
        <div className="score-percentage">Overall Match Score</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${result.score}%` }}></div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">AI Feedback</h3>
        <p style={{ lineHeight: '1.6', color: 'var(--gray-700)' }}>{result.feedback}</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0' }}>
        <div className="section strengths">
          <h3 className="section-title">Key Strengths</h3>
          {result.strengths.map((strength, index) => (
            <div key={index} className="list-item">
              <span className="list-item-icon">✅</span>
              <span>{strength}</span>
            </div>
          ))}
        </div>

        <div className="section improvements">
          <h3 className="section-title">Areas for Improvement</h3>
          {result.improvements.map((improvement, index) => (
            <div key={index} className="list-item">
              <span className="list-item-icon">💡</span>
              <span>{improvement}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--gray-300)', textAlign: 'right' }}>
        Processed on {new Date(result.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default ResultsDisplay;
