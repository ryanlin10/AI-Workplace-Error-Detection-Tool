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
    
    // Allow empty text submissions - don't show an error
    if (!audioText || audioText.trim() === '') {
      console.log('No text to send, but proceeding anyway');
      // Create a default message if no text was provided
      const defaultText = "No speech input was provided.";
      
      try {
        // Prepare request data with default text
        const requestData = {
          text: defaultText
        };
        
        console.log('Sending default text to backend');
        
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
        console.error('Error processing data with default text:', err);
        setError('An error occurred while processing your request');
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    try {
      // Prepare request data - only sending text now
      const requestData = {
        text: audioText  // Ensure text is never undefined
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
    // Otherwise, if we got new text, update the text regardless of recording state
    else if (text) {
      console.log('Updating audio text with new transcript');
      setAudioText(text);
    }
  };

  // Handler for image capture updates
  const handleImageCapture = (imageData) => {
    console.log('Image captured in App.js, data length:', imageData ? imageData.length : 0);
    setCapturedImage(imageData);
  };

  return (
    <div className="App">
      <div className="app-container">
        <h1>Augmented Reality Medical Assistant</h1>
        <p>Reducing Errors in Medical Practice</p>
        
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
        
        <div className="content-container">
          {/* Video takes up the left/main portion in landscape mode */}
          <div className="video-section">
            <VideoCapture 
              isActive={isRecording} 
              onImageCapture={handleImageCapture} 
            />
          </div>
          
          {/* Audio and results on the right side */}
          <div className="info-section">
            <AudioRecorder 
              isRecording={isRecording} 
              onTranscriptUpdate={handleTranscriptUpdate} 
            />
            
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
          </div>
        </div>
        
        {/* Add debug information section that's hidden by default */}
        <div className="debug-section">
          <details>
            <summary>Debug Information</summary>
            <div className="debug-content">
              <h4>Last Request</h4>
              <ul>
                <li>Text: {debug.lastTextSent ? `${debug.lastTextSent.substring(0, 50)}...` : 'None'}</li>
                <li>Image: {debug.lastImageSent ? 'Yes' : 'No'}</li>
              </ul>
              <h4>API Responses</h4>
              <ul>
                {debug.apiResponses.map((resp, index) => (
                  <li key={index}>
                    {resp.timestamp}: {resp.status} 
                    {resp.error && ` - Error: ${resp.error}`}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default App; 