import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const recognitionSupported = useRef(true); // Default to true until proven otherwise
  const recognitionAttempts = useRef(0);
  const MAX_RECOGNITION_ATTEMPTS = 5;
  const audioStreamRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const initializing = useRef(false);
  const lastRestartTime = useRef(0);
  const MIN_RESTART_INTERVAL = 2000; // Minimum time between restarts in ms
  
  // Define cleanupAudioResources with useCallback
  const cleanupAudioResources = useCallback(() => {
    console.log('Cleaning up audio resources');
    
    // Clear any pending restart timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      recognitionRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        console.log('Media recorder stopped');
      } catch (error) {
        console.error('Error stopping media recorder:', error);
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop audio stream tracks
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Audio track ${track.kind} stopped`);
        });
        audioStreamRef.current = null;
      } catch (error) {
        console.error('Error stopping audio stream tracks:', error);
      }
    }
    
    // Reset recognition state
    setRecognitionActive(false);
    recognitionAttempts.current = 0;
    initializing.current = false;
  }, []);
  
  // Function to check browser support for speech recognition
  const checkSpeechRecognitionSupport = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported in this browser');
      return false;
    }
    
    // Test if we can actually create an instance
    try {
      const testRecognition = new SpeechRecognition();
      if (testRecognition) {
        return true;
      }
    } catch (error) {
      console.error('Error creating test Speech Recognition instance:', error);
    }
    
    return false;
  }, []);
  
  // Initialize speech recognition on component mount
  useEffect(() => {
    const isSupported = checkSpeechRecognitionSupport();
    recognitionSupported.current = isSupported;
    console.log('Speech recognition supported:', isSupported);
    
    if (!isSupported) {
      setUseFallback(true);
      recognitionError.current = 'Speech recognition not supported in this browser';
    }
    
    return () => {
      cleanupAudioResources();
    };
  }, [checkSpeechRecognitionSupport, cleanupAudioResources]);
  
  // Function to check if we can attempt a restart
  const canAttemptRestart = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime.current;
    
    if (timeSinceLastRestart < MIN_RESTART_INTERVAL) {
      console.log('Too soon to restart, waiting...');
      return false;
    }
    
    if (recognitionAttempts.current >= MAX_RECOGNITION_ATTEMPTS) {
      console.log('Maximum restart attempts reached');
      return false;
    }
    
    return true;
  }, []);
  
  // Function to handle recognition restart
  const handleRecognitionRestart = useCallback(() => {
    if (!canAttemptRestart() || !isRecording || useFallback || initializing.current) {
      return;
    }
    
    console.log(`Restarting speech recognition (attempt ${recognitionAttempts.current + 1} of ${MAX_RECOGNITION_ATTEMPTS})`);
    recognitionAttempts.current += 1;
    lastRestartTime.current = Date.now();
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    initializing.current = true;
    
    restartTimeoutRef.current = setTimeout(() => {
      try {
        if (recognitionRef.current && isRecording && !useFallback) {
          recognitionRef.current.start();
          console.log('Speech recognition restarted successfully');
        }
      } catch (error) {
        console.error('Error restarting speech recognition:', error);
        recognitionError.current = error.message || 'Failed to restart';
        if (recognitionAttempts.current >= MAX_RECOGNITION_ATTEMPTS) {
          setUseFallback(true);
        }
      } finally {
        initializing.current = false;
      }
    }, 1000);
  }, [isRecording, useFallback, canAttemptRestart]);
  
  // Reset transcript when starting a new recording
  useEffect(() => {
    if (isRecording && !prevRecordingStateRef.current) {
      console.log('Starting new recording, resetting transcript');
      setTranscript('');
      setManualInput('');
      recognitionAttempts.current = 0;
      lastRestartTime.current = 0;
      recognitionError.current = null;
      setUseFallback(false);
      initializing.current = false;
      onTranscriptUpdate('');
    } else if (!isRecording && prevRecordingStateRef.current) {
      console.log('Stopping recording, final transcript:', transcript);
      onTranscriptUpdate(transcript);
      cleanupAudioResources();
    }
    
    prevRecordingStateRef.current = isRecording;
  }, [isRecording, onTranscriptUpdate, transcript, cleanupAudioResources]);
  
  // Update parent component when transcript changes
  useEffect(() => {
    if (transcript) {
      console.log('Transcript changed, updating parent:', transcript);
      onTranscriptUpdate(transcript);
    }
  }, [transcript, onTranscriptUpdate]);
  
  // Initialize speech recognition
  useEffect(() => {
    if (!isRecording || useFallback) {
      return;
    }
    
    console.log('Initializing speech recognition');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      recognitionError.current = 'Not supported in this browser';
      setUseFallback(true);
      return;
    }
    
    // Clean up any existing recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping previous recognition instance:', e);
      }
    }
    
    try {
      // Create fresh instance
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setRecognitionActive(true);
        initializing.current = false;
        recognitionAttempts.current = 0; // Reset attempts on successful start
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setRecognitionActive(false);
        
        if (isRecording && !useFallback && !initializing.current) {
          handleRecognitionRestart();
        }
      };
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          }
        }
        
        if (finalTranscript && isRecording) {
          setTranscript(prevTranscript => {
            const updatedTranscript = prevTranscript ? prevTranscript + ' ' + finalTranscript : finalTranscript;
            console.log('New transcript segment:', finalTranscript);
            console.log('Updated full transcript:', updatedTranscript);
            return updatedTranscript;
          });
          recognitionAttempts.current = 0; // Reset attempts on successful result
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        recognitionError.current = event.error || 'Unknown error';
        
        switch (event.error) {
          case 'no-speech':
            // Don't count no-speech as an error attempt
            console.log('No speech detected, not counting as error attempt');
            break;
          case 'aborted':
            // Don't count aborted as an error if we're stopping intentionally
            if (!initializing.current) {
              recognitionAttempts.current += 1;
              console.log('Recognition aborted, attempt:', recognitionAttempts.current);
            }
            break;
          case 'audio-capture':
            recognitionAttempts.current += 1;
            console.log('Audio capture error, attempt:', recognitionAttempts.current);
            break;
          case 'not-allowed':
            // Check if it's a permission issue
            navigator.permissions.query({ name: 'microphone' })
              .then(result => {
                if (result.state === 'denied') {
                  setUseFallback(true);
                  recognitionError.current = 'Microphone access denied';
                  console.log('Microphone permission denied, switching to fallback');
                }
              })
              .catch(() => {
                recognitionAttempts.current += 1;
                console.log('Error checking microphone permission, attempt:', recognitionAttempts.current);
              });
            break;
          case 'network':
            recognitionAttempts.current += 1;
            console.log('Network error, attempt:', recognitionAttempts.current);
            break;
          case 'service-not-allowed':
            setUseFallback(true);
            console.log('Service not allowed, switching to fallback');
            break;
          default:
            recognitionAttempts.current += 1;
            console.log('Unknown error, attempt:', recognitionAttempts.current);
        }
        
        if (recognitionAttempts.current >= MAX_RECOGNITION_ATTEMPTS) {
          setUseFallback(true);
          console.log('Max recognition attempts reached, switching to fallback');
        }
      };
      
      // Start recognition after a short delay
      setTimeout(() => {
        try {
          if (recognitionRef.current && isRecording && !useFallback) {
            recognitionRef.current.start();
            console.log('Speech recognition started after delay');
          }
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          recognitionError.current = error.message;
          setUseFallback(true);
        }
      }, 500);
    } catch (error) {
      console.error('Error creating speech recognition instance:', error);
      recognitionError.current = 'Failed to initialize: ' + error.message;
      setUseFallback(true);
    }
    
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [isRecording, useFallback, handleRecognitionRestart]);
  
  // Handle recording state changes
  useEffect(() => {
    if (isRecording && !useFallback) {
      console.log('Starting audio recording');
      cleanupAudioResources();
      
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      })
      .then(stream => {
        audioStreamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
        console.log('Media recorder started');
        
        // Reset recognition attempts on successful media stream
        recognitionAttempts.current = 0;
        
        if (recognitionRef.current && !recognitionActive && !initializing.current) {
          initializing.current = true;
          
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            try {
              if (isRecording && !useFallback) {
                recognitionRef.current.start();
                console.log('Speech recognition started successfully');
              }
            } catch (error) {
              console.error('Error starting speech recognition:', error);
              recognitionError.current = error.message;
              setUseFallback(true);
            } finally {
              initializing.current = false;
            }
          }, 1000);
        }
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        recognitionError.current = 'Microphone access error: ' + error.message;
        setUseFallback(true);
      });
    } else if (!isRecording) {
      cleanupAudioResources();
    }
  }, [isRecording, useFallback, recognitionActive, cleanupAudioResources]);
  
  const handleManualInputSubmit = () => {
    if (manualInput.trim()) {
      setTranscript(prevTranscript => {
        const newTranscript = prevTranscript ? prevTranscript + ' ' + manualInput.trim() : manualInput.trim();
        console.log('Manual input added to transcript:', newTranscript);
        onTranscriptUpdate(newTranscript); // Ensure manual input is immediately sent to parent
        return newTranscript;
      });
      setManualInput('');
    }
  };
  
  return (
    <div className="audio-recorder">
      <div className="audio-status">
        {useFallback || recognitionError.current ? (
          <p className="error-message">
            {recognitionError.current ? `Speech recognition error: ${recognitionError.current}.` : 'Speech recognition unavailable.'} <br />
            Using manual input mode.
          </p>
        ) : (
          isRecording ? (
            <p>
              <span className="listening-indicator">●</span> Listening...
              {!transcript && <span className="hint">Say something!</span>}
            </p>
          ) : (
            <p>Click "Start Stream" to begin speech recognition</p>
          )
        )}
      </div>

      <div className="text-input-container">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Type your message here..."
          onKeyPress={(e) => e.key === 'Enter' && handleManualInputSubmit()}
          disabled={isRecording && !useFallback && !recognitionError.current}
        />
        <button
          onClick={handleManualInputSubmit}
          disabled={!manualInput.trim() || (isRecording && !useFallback && !recognitionError.current)}
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