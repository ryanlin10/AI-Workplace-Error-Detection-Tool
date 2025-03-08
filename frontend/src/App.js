import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import VideoCapture from './components/VideoCapture';
import ResultDisplay from './components/ResultDisplay';

// Update to use Express backend on port 8080
const API_URL = 'http://localhost:8080/api';

// Configure axios defaults
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.timeout = 30000; // 30 seconds timeout

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioText, setAudioText] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState({
    lastTextSent: '',
    lastImageSent: false,
    apiResponses: []
  });

  // Add effect to log state changes
  useEffect(() => {
    console.log('Current state:', {
      isRecording,
      audioTextLength: audioText ? audioText.length : 0,
      hasCapturedImage: !!capturedImage,
      isProcessing,
      hasResult: !!result,
      hasError: !!error
    });
  }, [isRecording, audioText, capturedImage, isProcessing, result, error]);

  const handleStartStream = () => {
    console.log('Starting stream');
    setIsRecording(true);
    setAudioText('');
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setDebug({
      lastTextSent: '',
      lastImageSent: false,
      apiResponses: []
    });
  };

  const handleEndStream = async () => {
    console.log('Ending stream');
    setIsRecording(false);
    setIsProcessing(true);
    
    // Store what we're sending for debugging
    setDebug(prev => ({
      ...prev,
      lastTextSent: audioText,
      lastImageSent: false // No longer sending images to the final response endpoint
    }));
    
    console.log('Preparing to send text data to backend:', { 
      textLength: audioText ? audioText.length : 0,
      textSample: audioText ? audioText.substring(0, 50) + '...' : 'No text'
    });
    
    // Validate data before sending
    if (!audioText) {
      console.warn('No text to send');
      setError('Please provide text before submitting.');
      setIsProcessing(false);
      return;
    }
    
    try {
      // Prepare request data - only sending text now
      const requestData = {
        text: audioText || ''  // Ensure text is never undefined
      };
      
      console.log('Sending text data to backend:', { 
        textLength: requestData.text.length,
        requestSize: JSON.stringify(requestData).length
      });

      // Send data to backend with explicit content type
      const response = await axios.post(`${API_URL}/process/`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Received response from backend:', response.data);
      
      // Update debug info
      setDebug(prev => ({
        ...prev,
        apiResponses: [...prev.apiResponses, {
          timestamp: new Date().toISOString(),
          status: response.status,
          data: response.data
        }]
      }));
      
      setResult(response.data);
    } catch (err) {
      console.error('Error processing data:', err);
      
      // Add detailed error logging
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server response error:', {
          status: err.response.status,
          headers: err.response.headers,
          data: err.response.data
        });
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', err.message);
      }

      setError(err.response?.data?.error || 'An error occurred while processing your data');
      
      // Update debug info
      setDebug(prev => ({
        ...prev,
        apiResponses: [...prev.apiResponses, {
          timestamp: new Date().toISOString(),
          error: err.message,
          status: err.response?.status || 'Network Error'
        }]
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for transcript updates from AudioRecorder
  const handleTranscriptUpdate = (text) => {
    console.log('Transcript updated:', text ? text.substring(0, 50) + '...' : 'No text');
    
    // If this is a reset (empty text) and we're starting a new recording, reset the audioText
    if (text === '' && isRecording) {
      console.log('Resetting audio text at start of recording');
      setAudioText('');
    } 
    // Otherwise, if we got new text and we're recording, update the text
    else if (text && isRecording) {
      console.log('Updating audio text during active recording');
      setAudioText(text);
    } 
    // We're not recording, but might want to keep accumulating text
    else if (text && !isRecording) {
      console.log('Received transcript update while not recording - will still preserve for final submission');
      setAudioText(text);
    }
    else {
      console.log('Ignoring transcript update while not recording');
    }
  };

  // Handler for image capture updates
  const handleImageCapture = (imageData) => {
    console.log('Image captured in App.js, data length:', imageData ? imageData.length : 0);
    setCapturedImage(imageData);
  };

  return (
    <div className="app-container">
      <h1>Medical Assistant</h1>
      <h3>Reducing Errors in Medical Practice</h3>
      
      <div className="controls">
        <button 
          className={`control-button ${isRecording ? 'disabled' : 'start'}`}
          onClick={handleStartStream}
          disabled={isRecording || isProcessing}
        >
          Start Stream
        </button>
        <button 
          className={`control-button ${!isRecording ? 'disabled' : 'stop'}`}
          onClick={handleEndStream}
          disabled={!isRecording || isProcessing}
        >
          End Stream
        </button>
      </div>
      
      <div className="input-container">
        <div className="input-section">
          <h2>Audio Input</h2>
          <AudioRecorder 
            isRecording={isRecording} 
            onTranscriptUpdate={handleTranscriptUpdate} 
          />
          {audioText && (
            <div className="transcript">
              <h3>Transcript:</h3>
              <p>{audioText}</p>
            </div>
          )}
        </div>
        
        <div className="input-section">
          <h2>Video Input</h2>
          <VideoCapture 
            isActive={isRecording} 
            onImageCapture={handleImageCapture} 
          />
          {capturedImage && (
            <div className="image-preview">
              <h3>Captured Image:</h3>
              <img src={capturedImage} alt="Captured" />
            </div>
          )}
        </div>
      </div>
      
      {isProcessing && (
        <div className="processing">
          <p>Processing your data...</p>
          <div className="spinner"></div>
        </div>
      )}
      
      {error && (
        <div className="error">
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <ResultDisplay result={result} />
      )}
      
      {/* Add debug information section that's hidden by default */}
      <div className="debug-section">
        <details>
          <summary>Debug Information</summary>
          <div className="debug-content">
            <h4>Last Text Sent:</h4>
            <p>{debug.lastTextSent || 'None'}</p>
            
            <h4>Last Image Sent:</h4>
            <p>{debug.lastImageSent ? 'Yes' : 'No'}</p>
            
            <h4>API Responses:</h4>
            <ul>
              {debug.apiResponses.map((resp, idx) => (
                <li key={idx}>
                  {resp.timestamp}: Status {resp.status} 
                  {resp.error ? ` - Error: ${resp.error}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}

export default App; 