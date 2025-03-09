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
  const recognitionError = useRef(null);
  const recognitionSupported = useRef(false);
  
  // Reset transcript when starting a new recording
  useEffect(() => {
    // Check if isRecording changed from false to true
    if (isRecording && !prevRecordingStateRef.current) {
      console.log('Starting new recording, resetting transcript');
      setTranscript('');
      setManualInput('');
      // Explicitly notify parent of reset
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
      
      // Destroy previous instance if it exists
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping previous recognition instance:', e);
        }
      }
      
      // Create fresh instance
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Set language explicitly
      
      // Test if we can actually start it
      try {
        console.log('Testing speech recognition initialization...');
        recognitionRef.current.start();
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            console.log('Speech recognition initialized successfully');
          }
        }, 500);
      } catch (error) {
        console.error('Error during speech recognition test:', error);
        setUseFallback(true);
      }
      
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
        console.log('Number of results:', event.results.length);
        console.log('Current transcript state:', transcript);
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
          // Only append if we're actively recording
          if (isRecording) {
            const currentTranscript = transcript + ' ' + finalTranscript;
            console.log('Updated full transcript:', currentTranscript);
            setTranscript(currentTranscript);
            onTranscriptUpdate(currentTranscript);
          } else {
            console.log('Ignoring speech recognition result while not recording');
          }
        } else {
          console.log('No final transcript in this result batch');
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
          setUseFallback(true);
        }
      };
      
      recognitionSupported.current = true;
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
      
      // Check microphone permissions explicitly
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' })
          .then(permissionStatus => {
            console.log('Microphone permission status:', permissionStatus.state);
            
            if (permissionStatus.state === 'denied') {
              console.error('Microphone permission denied by browser');
              setUseFallback(true);
              return;
            }
            
            startRecordingWithPermission();
          })
          .catch(error => {
            console.error('Error checking permissions:', error);
            // Try anyway since permissions API might not be supported
            startRecordingWithPermission();
          });
      } else {
        // Permissions API not supported, try directly
        startRecordingWithPermission();
      }
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
    
    // Helper function to start recording after permissions check
    function startRecordingWithPermission() {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.start();
          
          // Start speech recognition
          if (recognitionRef.current && !recognitionActive) {
            try {
              recognitionRef.current.start();
              console.log('Speech recognition started successfully');
            } catch (error) {
              console.error('Error starting speech recognition:', error);
              setUseFallback(true);
            }
          }
        })
        .catch(error => {
          console.error('Error accessing microphone:', error);
          console.log('MediaDevices support:', !!navigator.mediaDevices);
          console.log('getUserMedia support:', !!navigator.mediaDevices.getUserMedia);
          setUseFallback(true);
        });
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
      <div className="audio-status">
        {recognitionError.current ? (
          <p className="error-message">
            Speech recognition error: {recognitionError.current}. <br />
            Using manual input mode.
          </p>
        ) : recognitionSupported.current ? (
          isRecording ? (
            <p>
              <span className="listening-indicator">●</span> Listening...
              {transcript && <span className="hint">Say something!</span>}
            </p>
          ) : (
            <p>Click "Start Stream" to begin speech recognition</p>
          )
        ) : (
          <p>
            Speech recognition not available. <br />
            Please use manual input below.
          </p>
        )}
      </div>

      {/* Add a text input for manual entry of spoken words */}
      <div className="text-input-container">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Type your message here..."
          disabled={isRecording && recognitionSupported.current && !recognitionError.current}
        />
        <button
          onClick={handleManualInputSubmit}
          disabled={isRecording && recognitionSupported.current && !recognitionError.current}
        >
          Submit
        </button>
      </div>
      
      {transcript && (
        <div className="transcript">
          <h3>Current Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder; 