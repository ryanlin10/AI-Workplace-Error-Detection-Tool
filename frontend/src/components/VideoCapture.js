import React, { useRef, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './VideoCapture.css';

const VideoCapture = ({ isActive, onImageCapture }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [hasValidImage, setHasValidImage] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Initializing camera...');
  const [storedImage, setStoredImage] = useState(null);
  const [captureMode, setCaptureMode] = useState('face'); // 'face' or 'medical'
  const [faceRecognitionResult, setFaceRecognitionResult] = useState(null);
  const [faceRecognitionLoading, setFaceRecognitionLoading] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  
  // Function to check if an image is blank/black
  const isImageBlank = (imageData) => {
    // Create a temporary canvas to analyze the image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const img = new Image();
    
    // Set up a promise to handle the async image loading
    return new Promise((resolve) => {
      img.onload = () => {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        
        // Get image data and check if it's mostly black
        const data = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
        let nonBlackPixels = 0;
        const totalPixels = data.length / 4;
        
        // Sample pixels to check for non-black content
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is not black (allowing some noise)
          if (r > 10 || g > 10 || b > 10) {
            nonBlackPixels++;
          }
        }
        
        // If less than 5% of sampled pixels are non-black, consider it blank
        const isBlank = (nonBlackPixels / (totalPixels / 4)) < 0.05;
        console.log(`Image analysis: ${nonBlackPixels} non-black pixels out of ${totalPixels / 4} sampled. Blank: ${isBlank}`);
        resolve(isBlank);
      };
      
      img.onerror = () => {
        console.error('Error analyzing image');
        resolve(true); // Assume blank on error
      };
      
      img.src = imageData;
    });
  };
  
  // Function to capture image from video
  const captureImage = useCallback(async (mode) => {
    if (!videoRef.current) {
      console.warn('Video element not available');
      return false;
    }
    
    if (!isCameraReady) {
      console.warn('Camera not ready yet');
      return false;
    }
    
    if (videoRef.current.videoWidth <= 0 || videoRef.current.videoHeight <= 0) {
      console.warn('Video dimensions not available yet');
      return false;
    }
    
    console.log(`Capturing ${mode} image from video`, {
      videoWidth: videoRef.current.videoWidth,
      videoHeight: videoRef.current.videoHeight,
      readyState: videoRef.current.readyState
    });
    
    try {
      // Force a draw to make sure there's a frame to capture
      if (videoRef.current.readyState < 2) {
        console.warn('Video not fully loaded, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Ensure canvas dimensions match video
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      
      // Draw the current video frame to canvas
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Convert to data URL with higher quality
      const imageDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      
      console.log(`Raw ${mode} image captured, data URL length:`, imageDataUrl.length);
      
      // Check if the image is blank
      const isBlank = await isImageBlank(imageDataUrl);
      
      if (isBlank) {
        console.warn('Captured image appears to be blank');
        return false;
      }
      
      console.log(`Valid ${mode} image captured successfully, data URL length:`, imageDataUrl.length);
      
      // Store the image and notify parent component
      setStoredImage(imageDataUrl);
      setHasValidImage(true);
      onImageCapture(imageDataUrl);
      
      // Process the image based on the mode
      if (mode === 'face') {
        await processFaceRecognition(imageDataUrl);
      } else if (mode === 'medical') {
        await processMedicalImageAnalysis(imageDataUrl);
      }
      
      return true;
    } catch (error) {
      console.error(`Error capturing ${mode} image:`, error);
      return false;
    }
  }, [onImageCapture, isCameraReady]);
  
  // Function to process face recognition
  const processFaceRecognition = async (imageData) => {
    try {
      setFaceRecognitionLoading(true);
      setFaceRecognitionResult(null);
      
      console.log('Sending image for face recognition...');
      const response = await axios.post('http://localhost:8080/api/recognize-face', {
        image: imageData
      });
      
      console.log('Face recognition result:', response.data);
      setFaceRecognitionResult(response.data);
      
      // Store patient data if available
      if (response.data.patient_data) {
        setPatientData(response.data.patient_data);
      }
      
    } catch (error) {
      console.error('Error in face recognition:', error);
      setFaceRecognitionResult({
        success: false,
        error: error.response?.data?.error || 'Error processing face recognition'
      });
    } finally {
      setFaceRecognitionLoading(false);
    }
  };
  
  // Function to process medical image analysis
  const processMedicalImageAnalysis = async (imageData) => {
    try {
      setImageAnalysisLoading(true);
      setImageAnalysisResult(null);
      
      console.log('Sending image for medical analysis...');
      const response = await axios.post('http://localhost:8080/api/analyze-image', {
        image: imageData
      });
      
      console.log('Medical image analysis result:', response.data);
      setImageAnalysisResult(response.data);
      
    } catch (error) {
      console.error('Error in medical image analysis:', error);
      setImageAnalysisResult({
        success: false,
        error: error.response?.data?.error || 'Error processing image analysis'
      });
    } finally {
      setImageAnalysisLoading(false);
    }
  };
  
  // Face capture button handler
  const handleFaceCapture = async () => {
    if (isCameraReady) {
      console.log('Manual face capture triggered');
      setCameraStatus('Capturing face image...');
      
      const success = await captureImage('face');
      
      if (success) {
        setCameraStatus('Face image captured successfully!');
      } else {
        setCameraStatus('Failed to capture face image. Try again.');
      }
      
      // Reset status after a delay
      setTimeout(() => {
        setCameraStatus(isCameraReady ? 'Camera active' : 'Initializing camera...');
      }, 2000);
    }
  };
  
  // Medical capture button handler
  const handleMedicalCapture = async () => {
    if (isCameraReady) {
      console.log('Manual medical/scale capture triggered');
      setCameraStatus('Capturing scale measurement...');
      
      const success = await captureImage('medical');
      
      if (success) {
        setCameraStatus('Scale measurement captured successfully!');
      } else {
        setCameraStatus('Failed to capture scale image. Try again.');
      }
      
      // Reset status after a delay
      setTimeout(() => {
        setCameraStatus(isCameraReady ? 'Camera active' : 'Initializing camera...');
      }, 3000);
    }
  };
  
  // When stream ends, ensure the parent has the latest image
  useEffect(() => {
    if (!isActive && storedImage) {
      console.log('Stream ended, ensuring parent has the latest captured image');
      onImageCapture(storedImage);
    }
  }, [isActive, storedImage, onImageCapture]);
  
  // Handle camera setup and teardown
  useEffect(() => {
    if (isActive && !cameraError) {
      console.log('Starting camera');
      setCameraStatus('Initializing camera...');
      
      // Reset hasValidImage but keep any stored image
      if (!storedImage) {
        setHasValidImage(false);
      }
      
      // Only initialize the camera if it's not already ready
      if (!isCameraReady || !streamRef.current) {
        // Start camera with specific constraints for better quality
        navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        })
          .then(stream => {
            console.log('Camera access granted');
            streamRef.current = stream;
            
            if (videoRef.current) {
              // Set srcObject to the stream
              videoRef.current.srcObject = stream;
              
              // Listen for loadedmetadata event
              videoRef.current.onloadedmetadata = () => {
                console.log('Video metadata loaded');
                
                // Play the video
                videoRef.current.play()
                  .then(() => {
                    console.log('Video playback started');
                    setCameraStatus('Camera active - Use the capture buttons below');
                    
                    // Wait a moment to ensure video is actually rendering frames
                    setTimeout(() => {
                      setIsCameraReady(true);
                    }, 1000);
                  })
                  .catch(error => {
                    console.error('Error starting video playback:', error);
                    setCameraError(true);
                    setCameraStatus('Camera error: ' + error.message);
                  });
              };
              
              // Listen for errors
              videoRef.current.onerror = (error) => {
                console.error('Video element error:', error);
                setCameraError(true);
                setCameraStatus('Video error: ' + (error.message || 'Unknown error'));
              };
            }
          })
          .catch(error => {
            console.error('Error accessing camera:', error);
            setCameraError(true);
            setCameraStatus('Camera access error: ' + error.message);
          });
      } else {
        // Camera is already initialized, just update the status
        setCameraStatus('Camera active - Use the capture buttons below');
      }
    } else if (!isActive) {
      // Stop camera when stream ends
      if (streamRef.current) {
        console.log('Stopping camera');
        setCameraStatus('Stopping camera...');
        
        // Stop all tracks
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Track ${track.kind} stopped`);
        });
        streamRef.current = null;
        setIsCameraReady(false);
        setCameraStatus('Camera stopped');
      }
    }
    
    return () => {
      // Only stop the camera in the cleanup function if isActive is false
      // This prevents stopping the camera when the component re-renders
      if (!isActive && streamRef.current) {
        console.log('Cleanup: stopping camera tracks');
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, cameraError, storedImage]); // Remove captureMode from dependencies
  
  // Render face recognition result
  const renderFaceRecognition = () => {
    if (faceRecognitionLoading) {
      return <div className="analysis-loading">Identifying person...</div>;
    }
    
    if (faceRecognitionResult && faceRecognitionResult.success) {
      return (
        <div className="face-recognition-result">
          <h4>Person Identified:</h4>
          <div className="person-info">
            <div className="person-id">ID: {faceRecognitionResult.person_id}</div>
            <div className="person-name">{faceRecognitionResult.person_name}</div>
            <div className="person-profession">{faceRecognitionResult.person_profession}</div>
            <div className="confidence">Confidence: {faceRecognitionResult.confidence}%</div>
            {faceRecognitionResult.reference_comparison && faceRecognitionResult.reference_image_url && (
              <div className="reference-image-container">
                <p>Matched with reference image:</p>
                <img 
                  src={`http://localhost:8080${faceRecognitionResult.reference_image_url}`} 
                  alt={`Reference for ${faceRecognitionResult.person_name}`} 
                  className="reference-image"
                />
              </div>
            )}
            {faceRecognitionResult.is_fallback && (
              <div className="fallback-notice">
                Note: Using simulated recognition (API issue)
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (faceRecognitionResult && !faceRecognitionResult.success) {
      return (
        <div className="face-recognition-error">
          <p>Error identifying person: {faceRecognitionResult.error}</p>
        </div>
      );
    }
    
    return null;
  };
  
  // Render medical image analysis result
  const renderImageAnalysis = () => {
    if (imageAnalysisLoading) {
      return <div className="analysis-loading">Analyzing image...</div>;
    }
    
    if (imageAnalysisResult && imageAnalysisResult.success) {
      return (
        <div className="image-analysis-result">
          <h4>Scale Measurement Analysis:</h4>
          <div className="analysis-text">{imageAnalysisResult.analysis}</div>
          
          {imageAnalysisResult.weight && (
            <div className="weight-measurement">
              <h5>Detected Weight:</h5>
              <div className={`weight-value ${imageAnalysisResult.hasOvershot ? 'overshot' : 'acceptable'}`}>
                {imageAnalysisResult.weight} {imageAnalysisResult.unit}
                {imageAnalysisResult.hasOvershot ? 
                  <span className="overshot-warning"> ⚠️ EXCEEDS TARGET!</span> : 
                  <span className="target-ok"> ✓ Within target</span>
                }
              </div>
              <div className="target-info">
                Target: {imageAnalysisResult.targetWeight}g
              </div>
              {imageAnalysisResult.hasOvershot && (
                <div className="recommendation">
                  Recommendation: Reduce the amount to match the target weight of {imageAnalysisResult.targetWeight}g.
                </div>
              )}
            </div>
          )}
          
          {imageAnalysisResult.is_fallback && (
            <div className="fallback-notice">
              Note: Using simulated analysis (API issue)
            </div>
          )}
        </div>
      );
    }
    
    if (imageAnalysisResult && !imageAnalysisResult.success) {
      return (
        <div className="image-analysis-error">
          <p>Error analyzing image: {imageAnalysisResult.error}</p>
        </div>
      );
    }
    
    return null;
  };
  
  // Render patient medical history
  const renderPatientMedicalHistory = () => {
    // Only show patient data if we have a face recognition result and patient data
    if (!faceRecognitionResult || !faceRecognitionResult.success || !patientData) {
      return null;
    }
    
    return (
      <div className="patient-medical-history">
        <h3>Patient Medical History</h3>
        
        <div className="patient-header">
          <div className="patient-name-id">
            <h4>{patientData.full_name}</h4>
            <span className="patient-id-tag">ID: {patientData.patient_id}</span>
          </div>
          <div className="patient-demographics">
            <span>{patientData.age} years, {patientData.gender}</span>
            <span>Blood Type: {patientData.blood_type}</span>
          </div>
        </div>
        
        {patientData.current_complaint && (
          <div className="medical-data-section current-complaint">
            <h5>Current Complaint</h5>
            <div className="complaint-details">
              <div className="complaint-description">
                <p><strong>{patientData.current_complaint.description}</strong></p>
                <div className="complaint-metadata">
                  <span>Duration: {patientData.current_complaint.duration}</span>
                  <span>Severity: {patientData.current_complaint.severity}</span>
                </div>
              </div>
              {patientData.current_complaint.associated_symptoms && (
                <div className="associated-symptoms">
                  <h6>Associated Symptoms:</h6>
                  <ul>
                    {patientData.current_complaint.associated_symptoms.map((symptom, index) => (
                      <li key={index}>{symptom}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="medical-data-grid">
          <div className="medical-data-section">
            <h5>Medical Conditions</h5>
            <ul>
              {patientData.medical_conditions.map((condition, index) => (
                <li key={`condition-${index}`}>{condition}</li>
              ))}
            </ul>
          </div>
          
          <div className="medical-data-section">
            <h5>Current Medications</h5>
            <ul>
              {patientData.current_medications.map((med, index) => (
                <li key={`med-${index}`}>
                  {med.name} {med.dosage}, {med.frequency}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="medical-data-section">
            <h5>Allergies</h5>
            <ul>
              {patientData.allergies.map((allergy, index) => (
                <li key={`allergy-${index}`}>{allergy}</li>
              ))}
            </ul>
          </div>
          
          <div className="medical-data-section">
            <h5>Recent Visits</h5>
            <ul className="visits-list">
              {patientData.recent_visits.map((visit, index) => (
                <li key={`visit-${index}`}>
                  <span className="visit-date">{visit.date}</span>
                  <span className="visit-reason">{visit.reason}</span>
                  <span className="visit-doctor">{visit.doctor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {patientData.differential_diagnoses && (
          <div className="medical-data-section differential-diagnoses">
            <h5>Differential Diagnoses</h5>
            <div className="diagnosis-alert">
              <span className="alert-icon">⚠️</span>
              <span>Clinical Decision Support: Consider these possibilities based on patient presentation</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Probability</th>
                  <th>Specialty</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {patientData.differential_diagnoses.map((diagnosis, index) => (
                  <tr key={`diagnosis-${index}`} className={`probability-${diagnosis.probability.toLowerCase()}`}>
                    <td><strong>{diagnosis.condition}</strong></td>
                    <td className="probability">{diagnosis.probability}</td>
                    <td>{diagnosis.specialization}</td>
                    <td>{diagnosis.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {patientData.interdisciplinary_considerations && (
          <div className="medical-data-section interdisciplinary">
            <h5>Interdisciplinary Considerations</h5>
            <div className="considerations-intro">
              Recommendations that might be outside primary specialty scope:
            </div>
            <ul className="considerations-list">
              {patientData.interdisciplinary_considerations.map((consideration, index) => (
                <li key={`consideration-${index}`}>{consideration}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="medical-data-section lab-results">
          <h5>Lab Results</h5>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Test</th>
                <th>Result</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {patientData.lab_results.map((lab, index) => (
                <tr key={`lab-${index}`}>
                  <td>{lab.date}</td>
                  <td>{lab.test}</td>
                  <td>{lab.result}</td>
                  <td>{lab.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="medical-data-section">
          <h5>Clinical Notes</h5>
          <p className="clinical-notes">{patientData.notes}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="video-capture-container">
      <div className="video-capture">
        <video 
          ref={videoRef} 
          className={isActive ? 'active' : 'inactive'} 
          muted
          playsInline
          autoPlay
        />
        
        {isActive && (
          <div className="camera-controls">
            <div className="status-indicator">
              {cameraStatus}
              {hasValidImage && <span className="checkmark">✓</span>}
            </div>
          </div>
        )}
        
        {!isActive && hasValidImage && (
          <div className="image-saved-indicator">
            <p>Image saved and will be sent with your audio</p>
          </div>
        )}
        
        {!isActive && !hasValidImage && (
          <div className="camera-inactive">
            <p>No image captured. Start stream to use camera.</p>
          </div>
        )}
        
        {cameraError && (
          <div className="camera-error">
            <p>{cameraStatus || 'Camera access error. Please check your permissions.'}</p>
          </div>
        )}
      </div>
      
      {isActive && (
        <div className="capture-buttons">
          <button 
            className="face-capture-button"
            onClick={handleFaceCapture}
            disabled={!isCameraReady || faceRecognitionLoading}
          >
            👤 Capture Face
          </button>
          <button 
            className="medical-capture-button"
            onClick={handleMedicalCapture}
            disabled={!isCameraReady || imageAnalysisLoading}
          >
            🩺 Capture Scale Weight
          </button>
        </div>
      )}
      
      <div className="image-analysis-container">
        {renderFaceRecognition()}
        {renderImageAnalysis()}
        {renderPatientMedicalHistory()}
      </div>
    </div>
  );
};

export default VideoCapture; 