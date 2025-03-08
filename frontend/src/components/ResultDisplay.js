import React from 'react';
import './ResultDisplay.css';

const ResultDisplay = ({ result }) => {
  return (
    <div className="result-display">
      <h2>Processing Results</h2>
      
      {result.success ? (
        <div className="result-content">
          <h3>Response:</h3>
          <div className="summary-text">
            {result.summary}
          </div>
          <p className="file-info">
            Response saved to file: <code>{result.summary_file}</code>
          </p>
        </div>
      ) : (
        <div className="error-message">
          <p>Failed to process data: {result.error}</p>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay; 