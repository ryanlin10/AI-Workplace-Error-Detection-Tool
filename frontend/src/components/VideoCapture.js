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
  const [faceRecognitionError, setFaceRecognitionError] = useState(null);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [currentCameraIndex, setCurrentCameraIndex] = useState(1); // Start with camera 1
  const [medicationSummary, setMedicationSummary] = useState({
    painkillers: 2,
    antibiotics: 1,
    antihistamines: 0,
    sedatives: 1
  });
  
  // Audio input status
  const [audioStatus, setAudioStatus] = useState("Audio recognition not available. Please use manual input.");
  
  // Medicine verification state
  const [medicineVerificationLoading, setMedicineVerificationLoading] = useState(false);
  const [medicineVerificationResult, setMedicineVerificationResult] = useState(null);
  const [correctMedicine, setCorrectMedicine] = useState('B'); // The medicine that should be used
  
  // Function to check if an image is blank/black
  const isImageBlank = useCallback((imageData) => {
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
  }, []);
  
  // Clean up camera resources
  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
        console.log('Camera stream tracks stopped');
      } catch (error) {
        console.error('Error stopping camera stream:', error);
      }
    }
  }, []);
  
  // Initialize camera when component becomes active
  useEffect(() => {
    if (isActive) {
      console.log('VideoCapture: Initializing camera');
      setIsCameraReady(false);
      setCameraError(false);
      setHasValidImage(false);
      setCameraStatus('Initializing camera...');
      
      // Define video-only constraints to avoid conflicts with audio
      const videoConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          deviceId: { exact: 1 }  // Use camera with index 1 instead of default camera
        },
        audio: false // Explicitly disable audio to avoid conflicts
      };
      
      // Clean up any existing camera stream first
      cleanupCamera();
      
      // Request camera access with a delay to avoid conflicts with audio
      setTimeout(() => {
        // First try to get a list of all available video devices
        navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            // Filter for video input devices (cameras)
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            console.log('Available video devices:', videoDevices.map((device, index) => 
              `Camera ${index}: ${device.label || 'unnamed camera'} (${device.deviceId.substring(0, 8)}...)`
            ));
            
            // Check if the requested camera index is available
            if (videoDevices.length > currentCameraIndex) {
              console.log(`Using camera ${currentCameraIndex}:`, videoDevices[currentCameraIndex].label || 'unnamed camera');
              const videoConstraints = {
                video: {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  deviceId: { exact: videoDevices[currentCameraIndex].deviceId }
                },
                audio: false
              };
              
              return navigator.mediaDevices.getUserMedia(videoConstraints);
            } 
            // Otherwise, fall back to the default camera
            else {
              console.log(`Camera ${currentCameraIndex} not available, falling back to default camera`);
              return navigator.mediaDevices.getUserMedia({
                video: {
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                },
                audio: false
              });
            }
          })
          .then(stream => {
            console.log('Camera access granted');
            streamRef.current = stream;
            
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () => {
                setIsCameraReady(true);
                setCameraStatus('Camera ready');
                console.log('Camera ready');
              };
            }
          })
          .catch(error => {
            console.error('Error accessing camera:', error);
            setCameraError(true);
            setCameraStatus(`Camera error: ${error.message}`);
          });
      }, 500); // Add delay before initializing camera
      
      return () => {
        cleanupCamera();
      };
    } else {
      // Component is inactive, clean up camera resources
      cleanupCamera();
      setIsCameraReady(false);
    }
  }, [isActive, cleanupCamera, currentCameraIndex]);
  
  // Function to process face recognition
  const processFaceRecognition = useCallback(async (imageData) => {
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
        error: true,
        message: error.response?.data?.error || 'Failed to process face recognition'
      });
    } finally {
      setFaceRecognitionLoading(false);
    }
  }, []);
  
  // Function to process medical image analysis
  const processMedicalImageAnalysis = useCallback(async (imageData) => {
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
  }, []);
  
  // Function to process medicine verification
  const processMedicineVerification = useCallback(async (imageData) => {
    try {
      setMedicineVerificationLoading(true);
      setMedicineVerificationResult(null);
      
      console.log('Sending image for medicine verification...');
      
      // Get the current patient ID from the face recognition result or use a default
      const currentPatientId = patientData?.patient_id || (faceRecognitionResult?.person_id || null);
      console.log(`Current patient ID for medicine verification: ${currentPatientId || 'None'}`);
      
      // Call the backend API for medicine verification
      const response = await axios.post('http://localhost:8080/api/verify-medicine', {
        image: imageData,
        patientId: currentPatientId
      });
      
      console.log('Medicine verification result:', response.data);
      
      // Add timestamp to the result for debugging
      const resultWithTimestamp = {
        ...response.data,
        timestamp: new Date().toISOString()
      };
      
      setMedicineVerificationResult(resultWithTimestamp);
      
    } catch (error) {
      console.error('Error in medicine verification:', error);
      setMedicineVerificationResult({
        success: false,
        error: error.response?.data?.error || 'Error processing medicine verification',
        timestamp: new Date().toISOString()
      });
    } finally {
      setMedicineVerificationLoading(false);
    }
  }, [patientData, faceRecognitionResult]);
  
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
      
      // Ensure canvas dimensions match video's actual dimensions
      const videoWidth = videoRef.current.videoWidth || 720;
      const videoHeight = videoRef.current.videoHeight || 1280;
      
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
      
      // Draw the current video frame to canvas
      const ctx = canvasRef.current.getContext('2d');
      
      // Clear the canvas first
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw the video frame maintaining aspect ratio
      ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
      
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
      } else if (mode === 'medicine') {
        await processMedicineVerification(imageDataUrl);
      }
      
      return true;
    } catch (error) {
      console.error(`Error capturing ${mode} image:`, error);
      return false;
    }
  }, [onImageCapture, isCameraReady, isImageBlank, processFaceRecognition, processMedicalImageAnalysis, processMedicineVerification]);
  
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
  
  // Medicine verification button handler
  const handleMedicineCapture = async () => {
    if (isCameraReady) {
      console.log('Manual medicine verification triggered');
      setCameraStatus('Verifying medicine...');
      
      const success = await captureImage('medicine');
      
      if (success) {
        setCameraStatus('Medicine image captured successfully!');
      } else {
        setCameraStatus('Failed to capture medicine image. Try again.');
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
      const popupClass = imageAnalysisResult.hasOvershot 
        ? 'verification-popup warning' 
        : 'verification-popup success';
        
      return (
        <div className={popupClass}>
          <h4>Scale Weight</h4>
          
          <div className={`result-text ${imageAnalysisResult.hasOvershot ? 'warning' : 'success'}`}>
            {imageAnalysisResult.weight} {imageAnalysisResult.unit}
            {imageAnalysisResult.hasOvershot ? 
              ' ⚠️ EXCEEDS TARGET!' : 
              ' ✓ Within target'
            }
          </div>
          
          <div className="details">
            Target: {imageAnalysisResult.targetWeight}g
          </div>
          
          {imageAnalysisResult.hasOvershot && (
            <div className="details">
              Reduce to match target of {imageAnalysisResult.targetWeight}g.
            </div>
          )}
        </div>
      );
    }
    
    if (imageAnalysisResult && !imageAnalysisResult.success) {
      return (
        <div className="verification-popup error">
          <h4>Scale Weight</h4>
          <div className="result-text error">
            Error: {imageAnalysisResult.error || 'Failed to analyze scale'}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Function to render medicine verification results
  const renderMedicineVerification = () => {
    if (medicineVerificationLoading) {
      return (
        <div className="analysis-loading">
          <p>Analyzing medicine image...</p>
        </div>
      );
    }
    
    if (medicineVerificationResult && medicineVerificationResult.success) {
      const popupClass = !medicineVerificationResult.isCorrectMedicine || medicineVerificationResult.allergyWarning 
        ? 'verification-popup error' 
        : 'verification-popup success';
        
      return (
        <div className={popupClass}>
          <h4>Medicine Verification</h4>
          
          <div className={`result-text ${!medicineVerificationResult.isCorrectMedicine || medicineVerificationResult.allergyWarning ? 'error' : 'success'}`}>
            {medicineVerificationResult.detectedMedicine} 
            {!medicineVerificationResult.isCorrectMedicine ? 
              ' ⚠️ INCORRECT MEDICINE!' : 
              medicineVerificationResult.allergyWarning ?
              ' ⚠️ ALLERGIC REACTION RISK!' :
              ' ✓ Correct medicine'
            }
          </div>
          
          <div className="details">
            Required: {medicineVerificationResult.correctMedicine}
          </div>
          
          {(!medicineVerificationResult.isCorrectMedicine || medicineVerificationResult.allergyWarning) && (
            <div className="details">
              {medicineVerificationResult.allergyWarning ? 
                `DO NOT administer. Use ${medicineVerificationResult.correctMedicine} instead.` :
                `Please use ${medicineVerificationResult.correctMedicine} as prescribed.`
              }
            </div>
          )}
        </div>
      );
    }
    
    if (medicineVerificationResult && !medicineVerificationResult.success) {
      return (
        <div className="verification-popup error">
          <h4>Medicine Verification</h4>
          <div className="result-text error">
            Error: {medicineVerificationResult.error || 'Failed to verify medicine'}
          </div>
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
  
  // Add AR overlay to display patient information directly on the video
  const renderAROverlay = () => {
    if (!faceRecognitionResult || !faceRecognitionResult.success || !patientData) {
      return null;
    }

    // Get current time for the AR display
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    
    return (
      <div className="ar-patient-overlay">
        <div className="ar-overlay-header">
          <div>
            <span className="ar-highlight">BuildX2</span> • Medical AR Interface
          </div>
          <div>
            <span>{timeString}</span> • <span>{dateString}</span>
          </div>
        </div>
        
        {/* Patient info box positioned at top left */}
        <div className="ar-patient-info">
          <div className="ar-patient-name">{patientData.full_name}</div>
          <div className="ar-patient-details">
            <span className="ar-highlight">ID:</span> {patientData.patient_id} • 
            <span className="ar-highlight"> Age:</span> {patientData.age} • 
            <span className="ar-highlight"> Blood Type:</span> {patientData.blood_type}
          </div>
          
          {patientData.current_complaint && (
            <div className="ar-warning">
              <strong>Current complaint:</strong> {patientData.current_complaint.description}
              <span> ({patientData.current_complaint.duration})</span>
            </div>
          )}
          
          <div>
            <span className="ar-vitals">
              <span className="ar-highlight">Conditions</span>: {patientData.medical_conditions.length}
            </span>
            <span className="ar-vitals">
              <span className="ar-highlight">Allergies</span>: {patientData.allergies.length}
            </span>
          </div>
          
          {patientData.medical_conditions && patientData.medical_conditions.length > 0 && (
            <div className="ar-conditions">
              {patientData.medical_conditions[0]}
              {patientData.medical_conditions.length > 1 && ` +${patientData.medical_conditions.length - 1} more`}
            </div>
          )}
        </div>
        
        <div className="medication-summary">
          <h4>Medication Administered</h4>
          <ul>
            <li>Painkillers: {medicationSummary.painkillers}</li>
            <li>Antibiotics: {medicationSummary.antibiotics}</li>
            <li>Antihistamines: {medicationSummary.antihistamines}</li>
            <li>Sedatives: {medicationSummary.sedatives}</li>
          </ul>
        </div>
      </div>
    );
  };
  
  // Add handleTextSubmit function
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    // Process the text input here (similar to how you would process audio)
    console.log("Processing text input:", textInput);
    
    // Example: Update medication summary based on text
    if (textInput.toLowerCase().includes("painkiller") || textInput.toLowerCase().includes("pain medication")) {
      setMedicationSummary(prev => ({...prev, painkillers: prev.painkillers + 1}));
    }
    if (textInput.toLowerCase().includes("antibiotic")) {
      setMedicationSummary(prev => ({...prev, antibiotics: prev.antibiotics + 1}));
    }
    
    // Clear the input after submission
    setTextInput("");
  };
  
  // Function to switch to the next available camera
  const switchCamera = useCallback(() => {
    // First clean up the current camera
    cleanupCamera();
    
    // Get available cameras and switch to the next one
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log('Available video devices for switching:', videoDevices.map((device, index) => 
          `Camera ${index}: ${device.label || 'unnamed camera'} (${device.deviceId.substring(0, 8)}...)`
        ));
        
        if (videoDevices.length > 1) {
          // Calculate the next camera index (cycle through available cameras)
          const nextCameraIndex = (currentCameraIndex + 1) % videoDevices.length;
          console.log(`Switching from camera ${currentCameraIndex} to camera ${nextCameraIndex}`);
          setCurrentCameraIndex(nextCameraIndex);
          setCameraStatus(`Switching to camera ${nextCameraIndex}...`);
          
          // The useEffect with currentCameraIndex dependency will handle the actual camera initialization
        } else {
          console.log('Only one camera available, cannot switch');
          setCameraStatus('Only one camera available');
          
          // Re-initialize the same camera since we cleaned it up
          setTimeout(() => {
            navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            })
            .then(stream => {
              console.log('Camera re-initialized');
              streamRef.current = stream;
              
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                  setIsCameraReady(true);
                  setCameraStatus('Camera ready');
                };
              }
            })
            .catch(error => {
              console.error('Error re-initializing camera:', error);
              setCameraError(true);
              setCameraStatus(`Camera error: ${error.message}`);
            });
          }, 500);
        }
      })
      .catch(error => {
        console.error('Error enumerating devices:', error);
        setCameraStatus('Error switching camera');
      });
  }, [cleanupCamera, currentCameraIndex]);
  
  return (
    <div className="video-capture-container">
      <div className="video-capture">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={isActive ? 'active' : 'inactive'}
        />
        
        {renderAROverlay()}
        
        {/* Place medicine verification and scale weight pop-ups here */}
        {renderMedicineVerification()}
        {renderImageAnalysis()}
        
        {isActive && (
          <div className="camera-controls">
            <div className="status-indicator">
              {cameraStatus}
              {hasValidImage && <span className="checkmark">✓</span>}
            </div>
            
            <button 
              className="switch-camera-button"
              onClick={switchCamera}
              disabled={!isCameraReady}
              title="Switch to next available camera"
            >
              🔄 Switch Camera
            </button>
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
          <button 
            className="medicine-capture-button"
            onClick={handleMedicineCapture}
            disabled={!isCameraReady || medicineVerificationLoading}
          >
            💊 Verify Medicine
          </button>
        </div>
      )}
      
      <div className="image-analysis-container">
        {renderFaceRecognition()}
        {renderPatientMedicalHistory()}
      </div>
    </div>
  );
};

export default VideoCapture; 