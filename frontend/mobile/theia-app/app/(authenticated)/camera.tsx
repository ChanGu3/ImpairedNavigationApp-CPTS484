import { Link } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Text, View, StyleSheet, Pressable, Alert } from "react-native";
import * as Speech from "expo-speech";

export default function CameraPage() {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [lastDetectedObjects, setLastDetectedObjects] = useState<string[]>([]);
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoDetectIntervalRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (autoDetectIntervalRef.current) {
      clearInterval(autoDetectIntervalRef.current);
      autoDetectIntervalRef.current = null;
    }
    setIsAutoDetecting(false);
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraReady(false);
    }
  };

  const handleCloseWindow = () => {
    // Send message to parent before closing
    if (window.opener) {
      window.opener.postMessage({ type: 'CAMERA_CLOSED' }, window.location.origin);
    } else {
      // If not in a popup, speak directly
      Speech.speak("Your camera is turned off", {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
      });
    }
    stopCamera();
    
    // Close the window if it's a popup
    if (window.opener) {
      window.close();
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // Use back camera if available
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraReady(true);
          
          // Send message to parent window that camera is ready
          if (window.opener) {
            window.opener.postMessage({ type: 'CAMERA_READY' }, window.location.origin);
          } else {
            // If not in a popup, speak directly
            Speech.speak("Your camera is turned on", {
              language: "en-US",
              pitch: 1.0,
              rate: 0.9,
            });
          }
        }
      } catch (error) {
        Alert.alert("Error", "Unable to access camera. Please ensure camera permission is granted.");
      }
    };

    startCamera();

    // Listen for messages from parent window
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'CAMERA_OPENED') {
        // Parent window has opened this camera window
        console.log('Camera window opened by voice command');
      }
    };

    window.addEventListener('message', messageHandler);

    // Handle window closing
    const handleBeforeUnload = () => {
      if (window.opener) {
        window.opener.postMessage({ type: 'CAMERA_CLOSED' }, window.location.origin);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function to stop camera when component unmounts
    return () => {
      stopCamera();
      window.removeEventListener('message', messageHandler);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const areObjectsSame = (currentObjects: string[], previousObjects: string[]) => {
    if (currentObjects.length !== previousObjects.length) return false;
    
    // Count occurrences of each object type
    const countObjects = (objects: string[]) => {
      const counts: { [key: string]: number } = {};
      objects.forEach(obj => {
        counts[obj] = (counts[obj] || 0) + 1;
      });
      return counts;
    };
    
    const currentCounts = countObjects(currentObjects);
    const previousCounts = countObjects(previousObjects);
    
    // Compare object types and their counts (ignore accuracy differences)
    const currentKeys = Object.keys(currentCounts).sort();
    const previousKeys = Object.keys(previousCounts).sort();
    
    if (currentKeys.length !== previousKeys.length) return false;
    
    return currentKeys.every(key => 
      previousKeys.includes(key) && currentCounts[key] === previousCounts[key]
    );
  };

  const playBeep = () => {
    // Create a simple beep sound effect
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  };

  const speakDescription = (text: string) => {
    // Play beep sound before speaking
    playBeep();
    
    // Use Web Speech API if available, fallback to console log
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      console.log('Audio narration:', text);
      Alert.alert('Detection', text);
    }
  };

  const autoDetectObjects = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('photo', blob, 'auto_detect.jpg');

        try {
          const response = await fetch('http://localhost:5000/api/camera/auto-detect', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            const currentObjects = result.objects || [];
            const now = Date.now();
            
            // Only announce when objects actually change
            const objectsChanged = !areObjectsSame(currentObjects, lastDetectedObjects);
            
            if (objectsChanged) {
              if (currentObjects.length > 0) {
                speakDescription(result.description);
              } else {
                speakDescription("The area in front of you is now clear.");
              }
              setLastDetectedObjects(currentObjects);
              setLastAnnouncementTime(now);
            }
            // No repetitive announcements - only speak when objects change
          }
        } catch (error) {
          console.error('Auto-detection error:', error);
        }
      }, 'image/jpeg', 0.6); // Lower quality for auto-detection
    } catch (error) {
      console.error('Auto-detection capture error:', error);
    }
  };

  const startAutoDetection = () => {
    if (autoDetectIntervalRef.current) {
      clearInterval(autoDetectIntervalRef.current);
    }
    
    setIsAutoDetecting(true);
    setLastDetectedObjects([]);
    setLastAnnouncementTime(0);
    
    // Start auto-detection every 10 seconds
    autoDetectIntervalRef.current = setInterval(autoDetectObjects, 5000);
    
    // Initial detection
    setTimeout(autoDetectObjects, 500);
  };

  const stopAutoDetection = () => {
    if (autoDetectIntervalRef.current) {
      clearInterval(autoDetectIntervalRef.current);
      autoDetectIntervalRef.current = null;
    }
    setIsAutoDetecting(false);
    speakDescription("Auto-detection stopped.");
  };

  const takePicture = async () => {
    if (!videoRef.current || !canvasRef.current || isTakingPhoto) return;

    try {
      setIsTakingPhoto(true);
      
      // Play beep sound immediately when photo is taken
      playBeep();
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to canvas
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          Alert.alert("Error", "Failed to capture image");
          setIsTakingPhoto(false);
          return;
        }

        // Send photo to backend for processing
        const formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');

        try {
          const response = await fetch('http://localhost:5000/api/camera/process-photo', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            Alert.alert("Detection Complete", result.description || "Photo processed successfully");
          } else {
            Alert.alert("Error", "Failed to process photo");
          }
        } catch (error) {
          Alert.alert("Error", "Failed to send photo to server");
        }
        
        setIsTakingPhoto(false);
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      Alert.alert("Error", "Failed to take picture");
      setIsTakingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Navigation</Text>
      
      <View style={styles.cameraContainer}>
        {/* Video element for camera feed */}
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          playsInline
          muted
        />
        {/* Hidden canvas for capturing photos */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </View>
      
      <View style={styles.controlsContainer}>
        <Pressable 
          style={[styles.autoDetectButton, isAutoDetecting && styles.autoDetectButtonActive]} 
          onPress={isAutoDetecting ? stopAutoDetection : startAutoDetection}
          disabled={!isCameraReady}
        >
          <Text style={[styles.autoDetectButtonText, isAutoDetecting && styles.autoDetectButtonTextActive]}>
            {isAutoDetecting ? "Stop Auto Detection" : "Start Auto Detection"}
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.captureButton, (!isCameraReady || isTakingPhoto) && styles.captureButtonDisabled]} 
          onPress={takePicture}
          disabled={!isCameraReady || isTakingPhoto}
        >
          <Text style={styles.captureButtonText}>
            {isTakingPhoto ? "Processing..." : "Take Picture"}
          </Text>
        </Pressable>
        
        {window.opener ? (
          <Pressable style={styles.backButton} onPress={handleCloseWindow}>
            <Text style={styles.backButtonText}>× Close Camera</Text>
          </Pressable>
        ) : (
          <Link href="/(authenticated)/user" asChild>
            <Pressable style={styles.backButton} onPress={stopCamera}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  controlsContainer: {
    alignItems: "center",
    gap: 20,
    marginTop: 20,
  },
  captureButton: {
    backgroundColor: "#A0A0A0",
    paddingHorizontal: 30,
    paddingVertical: 15,
    minWidth: 150,
    alignItems: "center",
  },
  captureButtonDisabled: {
    backgroundColor: "gray",
  },
  captureButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  autoDetectButton: {
    backgroundColor: "#A0A0A0",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 180,
    alignItems: "center",
  },
  autoDetectButtonActive: {
    backgroundColor: "#808080",
    borderColor: "white",
  },
  autoDetectButtonText: {
    color: "black",
    fontSize: 14,
    fontWeight: "bold",
  },
  autoDetectButtonTextActive: {
    color: "white",
  },
  backButton: {
    backgroundColor: "black",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "white",
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
  },
});