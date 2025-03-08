import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const captureImage = useCallback(async () => {
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
    
    console.log('Capturing image from video', {
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
      
      console.log('Raw image captured, data URL length:', imageDataUrl.length);
      
      // Check if the image is blank
      const isBlank = await isImageBlank(imageDataUrl);
      
      if (isBlank) {
        console.warn('Captured image appears to be blank');
        return false;
      }
      
      console.log('Valid image captured successfully, data URL length:', imageDataUrl.length);
      
      // Store the image and notify parent component
      setStoredImage(imageDataUrl);
      setHasValidImage(true);
      onImageCapture(imageDataUrl);
      
      return true;
    } catch (error) {
      console.error('Error capturing image:', error);
      return false;
    }
  }, [onImageCapture, isCameraReady]);
  
  // Manual capture button handler with status updates
  const handleManualCapture = async () => {
    if (isCameraReady) {
      console.log('Manual capture triggered');
      setCameraStatus('Capturing image...');
      
      const success = await captureImage();
      
      if (success) {
        setCameraStatus('Image captured successfully!');
      } else {
        setCameraStatus('Failed to capture image. Try again.');
      }
      
      // Reset status after a delay
      setTimeout(() => {
        setCameraStatus(isCameraReady ? 'Camera active' : 'Initializing camera...');
      }, 2000);
    }
  };
  
  // Function to retry capture if needed
  const handleRetryCapture = async () => {
    setHasValidImage(false);
    await handleManualCapture();
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
                    setCameraStatus('Camera active - Click "Capture Image" button when ready');
                    
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
        setCameraStatus('Camera active - Click "Capture Image" button when ready');
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
  }, [isActive, cameraError, storedImage]); // Removed isCameraReady from dependencies
  
  return (
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
          
          <div className="buttons">
            <button 
              className="capture-button"
              onClick={handleManualCapture}
              disabled={!isCameraReady}
              title="Take a snapshot"
            >
              📷 Capture Image
            </button>
            
            {hasValidImage && (
              <button 
                className="retry-button"
                onClick={handleRetryCapture}
                disabled={!isCameraReady}
                title="Capture a new image"
              >
                🔄 Retry
              </button>
            )}
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
  );
};

export default VideoCapture; 