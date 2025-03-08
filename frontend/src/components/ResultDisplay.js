import React from 'react';
import './ResultDisplay.css';

const ResultDisplay = ({ result }) => {
  // Function to format the numerical information with proper styling
  const formatNumericInfo = (text) => {
    if (!text) return null;
    
    // Check if we have any numerical information
    if (text.includes("No medical measurements recorded")) {
      return <p className="no-measurements">No medical measurements recorded</p>;
    }
    
    // Split by numbered list items if present (1., 2., etc.)
    if (text.match(/^\d+\.\s/m)) {
      const items = text.split(/\n(?=\d+\.\s)/);
      return (
        <ol className="measurements-list">
          {items.map((item, index) => {
            // Remove the numbering that's added by Claude (we're using <ol> for that)
            const cleanedItem = item.replace(/^\d+\.\s/, '');
            return <li key={index}>{cleanedItem}</li>;
          })}
        </ol>
      );
    } else {
      // If not numbered list, split by lines
      const lines = text.split('\n').filter(line => line.trim());
      return (
        <ul className="measurements-list">
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      );
    }
  };

  return (
    <div className="result-display">
      <h2>Processing Results</h2>
      
      {result.success ? (
        <div className="result-content">
          <h3>Medical Information Log:</h3>
          <div className="summary-text">
            {formatNumericInfo(result.summary)}
          </div>
          <p className="file-info">
            Medical log saved to file: <code>{result.summary_file}</code>
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