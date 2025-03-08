import React, { useState, useEffect, useRef } from 'react';
import './AudioRecorder.css';

const AudioRecorder = ({ isRecording, onTranscriptUpdate }) => {
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const prevRecordingStateRef = useRef(false);
  
  // Reset transcript when starting a new recording
  useEffect(() => {
    // Check if isRecording changed from false to true
    if (isRecording && !prevRecordingStateRef.current) {
      console.log('Starting new recording, resetting transcript');
      setTranscript('');
      setManualInput('');
      onTranscriptUpdate('');
    } else if (!isRecording && prevRecordingStateRef.current) {
      console.log('Stopping recording, final transcript:', transcript);
      // Ensure the final transcript is sent to the parent component
      onTranscriptUpdate(transcript);
    }
    
    // Update previous recording state
    prevRecordingStateRef.current = isRecording;
  }, [isRecording, onTranscriptUpdate, transcript]);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      console.log('Speech recognition is available');
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Set language explicitly
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setRecognitionActive(true);
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setRecognitionActive(false);
        
        // Restart recognition if we're still recording
        if (isRecording && !useFallback) {
          console.log('Restarting speech recognition');
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
          }
        }
      };
      
      recognitionRef.current.onresult = (event) => {
        console.log('Speech recognition result event received', event);
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          console.log(`Result ${i}: ${transcriptText} (isFinal: ${event.results[i].isFinal})`);
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          }
        }
        
        if (finalTranscript) {
          console.log('New transcript segment:', finalTranscript);
          const currentTranscript = transcript + ' ' + finalTranscript;
          console.log('Updated full transcript:', currentTranscript);
          setTranscript(currentTranscript);
          onTranscriptUpdate(currentTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
          setUseFallback(true);
        }
      };
    } else {
      console.error('Speech recognition not supported in this browser');
      setUseFallback(true);
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
    };
  }, [isRecording, useFallback]);
  
  // Handle recording state changes
  useEffect(() => {
    if (isRecording && !useFallback) {
      console.log('Starting audio recording and speech recognition');
      // Start recording
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.start();
          
          // Start speech recognition
          if (recognitionRef.current && !recognitionActive) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error starting speech recognition:', error);
              setUseFallback(true);
            }
          }
        })
        .catch(error => {
          console.error('Error accessing microphone:', error);
          setUseFallback(true);
        });
    } else if (mediaRecorderRef.current) {
      console.log('Stopping audio recording and speech recognition');
      // Stop recording
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Stop speech recognition
      if (recognitionRef.current && recognitionActive) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
    }
  }, [isRecording, useFallback, recognitionActive]);
  
  const handleManualInputChange = (e) => {
    setManualInput(e.target.value);
  };
  
  const handleManualInputSubmit = () => {
    if (manualInput.trim()) {
      const newTranscript = transcript + ' ' + manualInput.trim();
      setTranscript(newTranscript);
      onTranscriptUpdate(newTranscript);
      setManualInput('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleManualInputSubmit();
    }
  };
  
  return (
    <div className="audio-recorder">
      {isRecording ? (
        <div className="recording-indicator">
          <div className="recording-icon"></div>
          <span>
            {useFallback ? 'Manual input mode' : (recognitionActive ? 'Recording audio...' : 'Initializing microphone...')}
          </span>
          
          {useFallback && (
            <div className="manual-input">
              <p>Speech recognition not available. Enter text manually:</p>
              <div className="input-group">
                <input 
                  type="text" 
                  value={manualInput}
                  onChange={handleManualInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your text here..."
                  autoFocus
                />
                <button onClick={handleManualInputSubmit}>Add</button>
              </div>
            </div>
          )}
          
          {transcript && (
            <div className="current-transcript">
              <p><strong>Current transcript:</strong></p>
              <p>{transcript}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="recorder-inactive">
          <p>Click "Start Stream" to begin recording</p>
          <button onClick={() => setUseFallback(!useFallback)}>
            {useFallback ? "Try Speech Recognition" : "Use Manual Text Input"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder; 