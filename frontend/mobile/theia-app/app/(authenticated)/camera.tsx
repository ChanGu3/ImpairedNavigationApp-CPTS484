import { Link } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Text, View, StyleSheet, Pressable, Alert } from "react-native";

export default function CameraPage() {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraReady(false);
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
        }
      } catch (error) {
        Alert.alert("Error", "Unable to access camera. Please ensure camera permission is granted.");
      }
    };

    startCamera();

    // Cleanup function to stop camera when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  const takePicture = async () => {
    if (!videoRef.current || !canvasRef.current || isTakingPhoto) return;

    try {
      setIsTakingPhoto(true);
      
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
          style={[styles.captureButton, (!isCameraReady || isTakingPhoto) && styles.captureButtonDisabled]} 
          onPress={takePicture}
          disabled={!isCameraReady || isTakingPhoto}
        >
          <Text style={styles.captureButtonText}>
            {isTakingPhoto ? "Processing..." : "Take Picture"}
          </Text>
        </Pressable>
        
        <Link href="/(authenticated)/user" asChild>
          <Pressable style={styles.backButton} onPress={stopCamera}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </Link>
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
    backgroundColor: "white",
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