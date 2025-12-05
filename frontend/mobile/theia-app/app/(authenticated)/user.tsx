import { UserContext } from "@/contexts/UserContext";
import { Link } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Animated, Platform, Modal, Dimensions, useWindowDimensions } from "react-native";
import * as Speech from "expo-speech";
import { TripService, PastTrip } from "@/services/TripService";
import { EmergencyContactService, EmergencyContact } from "@/services/EmergencyContactService";

export default function User() {
  const userContext = useContext(UserContext);
  const { width } = useWindowDimensions();
  const isMobileView = width < 768;
  
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [waitingForDestination, setWaitingForDestination] = useState(false);
  const [waitingForFromLocation, setWaitingForFromLocation] = useState(false);
  const [pendingDestination, setPendingDestination] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  
  // Helper function to merge styles
  const mergeStyles = (...styleArrays: any[]) => {
    return StyleSheet.flatten(styleArrays);
  };
  const recognitionRef = useRef<any>(null);
  
  // Use refs for immediate state tracking
  const waitingForDestinationRef = useRef(false);
  const waitingForFromLocationRef = useRef(false);
  const pendingDestinationRef = useRef("");
  const isNavigatingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const consecutiveAbortsRef = useRef(0);
  const restartTimeoutRef = useRef<any>(null);
  const lastAbortTimeRef = useRef(0);
  const cameraWindowRef = useRef<Window | null>(null);

  // Blink animation
  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    blinkAnimation.start();

    return () => blinkAnimation.stop();
  }, []);

  // Voice command handlers
  const speak = (text: string) => {
    isSpeakingRef.current = true;
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        isSpeakingRef.current = false;
      },
      onStopped: () => {
        isSpeakingRef.current = false;
      },
      onError: () => {
        isSpeakingRef.current = false;
      },
    });
  };

  const handleRecentLocation = async () => {
    speak("Checking your most recent location");
    const recentTrip = await TripService.getMostRecentTrip();
    if (recentTrip) {
      speak(`Your most recent location was ${recentTrip.destination_location}`);
      setLastCommand(`Recent: ${recentTrip.destination_location}`);
    } else {
      speak("No recent locations found");
      setLastCommand("No recent locations");
    }
  };

  const handleEmergencyContact = async () => {
    speak("Calling emergency contact");
    const contacts = await EmergencyContactService.getEmergencyContacts();
    if (contacts.length > 0) {
      const contact = contacts[0];
      speak(`Calling ${contact.contact_name} at ${contact.contact_tel}`);
      setLastCommand(`Calling: ${contact.contact_name}`);
    } else {
      speak("No emergency contacts found");
      setLastCommand("No emergency contacts");
    }
  };

  const handleStartNavigation = () => {
    // Clear any previous waiting states first
    setWaitingForDestination(false);
    waitingForDestinationRef.current = false;
    setWaitingForFromLocation(false);
    waitingForFromLocationRef.current = false;
    setPendingDestination("");
    pendingDestinationRef.current = "";
    
    // Now start the new navigation flow
    speak("Where do you want to go?");
    setWaitingForDestination(true);
    waitingForDestinationRef.current = true;
    setLastCommand("Waiting for destination...");
  };

  const handleStopNavigation = async () => {
    // Use ref to check actual state, not just the state variable
    if (isNavigatingRef.current || isNavigating) {
      isNavigatingRef.current = false;
      setIsNavigating(false);
      await TripService.endTrip();
      speak("Navigation stopped");
      setLastCommand("Navigation stopped");
    } else {
      speak("No navigation in progress");
      setLastCommand("No navigation active");
    }
  };

  const simulateNavigationDirections = async (fromLocation: string, toLocation: string) => {
    const directions = [
      "Starting navigation",
      "Turn right in 5 steps",
      "Continue straight for 10 steps",
      "Turn left in 3 steps",
      "Walk forward 8 steps",
      "You are approaching your destination",
      "You have arrived"
    ];

    for (let i = 0; i < directions.length; i++) {
      // Check ref for immediate state
      if (!isNavigatingRef.current) {
        console.log("Navigation cancelled");
        break;
      }
      
      // Speak the direction
      speak(directions[i]);
      setLastCommand(directions[i]);
      
      // Wait 5 seconds before next direction (except for last one)
      if (i < directions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Only end trip if navigation wasn't cancelled
    if (isNavigatingRef.current) {
      // End the trip and add to past trips
      await TripService.endTrip();
      await TripService.addToPastTrips(toLocation);
      isNavigatingRef.current = false;
      setIsNavigating(false);
      speak(`Trip to ${toLocation} completed`);
      setLastCommand(`Trip completed: ${toLocation}`);
    }
  };

  const handleNavigateTo = async (destination: string, fromLocation?: string) => {
    const from = fromLocation || "Current Location";
    
    // Stop any existing navigation first
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      setIsNavigating(false);
      await TripService.endTrip();
      // Wait a moment for the previous navigation to clean up
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    speak(`Starting trip from ${from} to ${destination}`);
    setLastCommand(`Starting trip to ${destination}`);
    
    // Start the trip in the database
    const started = await TripService.startTrip(from, destination);
    
    if (started) {
      isNavigatingRef.current = true;
      setIsNavigating(true);
      // Simulate navigation with directions (runs in background)
      await simulateNavigationDirections(from, destination);
    } else {
      speak("Could not start navigation");
      setLastCommand("Navigation failed");
    }
  };

  const handleHelp = () => {
    speak("Check the voice control section for available commands");
    setLastCommand("Commands listed on screen");
  };

  const handleOpenCamera = () => {
    // If camera window already exists, just focus it
    if (cameraWindowRef.current && !cameraWindowRef.current.closed) {
      cameraWindowRef.current.focus();
      speak("Camera is already open");
      setLastCommand("Camera already open");
      return;
    }
    
    speak("Opening camera");
    setLastCommand("Opening camera");
    // Open camera in a new window
    const cameraWindow = window.open(
      window.location.origin + '/(authenticated)/camera',
      'cameraWindow',
      'width=800,height=600,resizable=yes,scrollbars=no,toolbar=no,menubar=no'
    );
    
    // Store reference to the camera window
    cameraWindowRef.current = cameraWindow;
    
    if (cameraWindow) {
      let hasSpokenCloseMessage = false; // Flag to prevent duplicate audio
      
      // Send a message to the camera window when it loads
      cameraWindow.addEventListener('load', () => {
        cameraWindow.postMessage({ type: 'CAMERA_OPENED' }, window.location.origin);
      });
      
      // Listen for messages from the camera window
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'CAMERA_READY') {
          speak("Your camera is turned on");
        } else if (event.data.type === 'CAMERA_CLOSED' && !hasSpokenCloseMessage) {
          hasSpokenCloseMessage = true;
          speak("Exit camera navigate mode");
          window.removeEventListener('message', messageHandler);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Check if window was closed
      const checkClosed = setInterval(() => {
        if (cameraWindow.closed) {
          clearInterval(checkClosed);
          cameraWindowRef.current = null; // Clear reference
          if (!hasSpokenCloseMessage) {
            hasSpokenCloseMessage = true;
            speak("Exit camera navigate mode");
          }
          window.removeEventListener('message', messageHandler);
        }
      }, 1000);
    } else {
      speak("Unable to open camera window. Please allow pop-ups for this site.");
      setLastCommand("Camera window blocked");
    }
  };

  const handleCloseCamera = () => {
    if (!cameraWindowRef.current || cameraWindowRef.current.closed) {
      speak("No camera window is open");
      setLastCommand("No camera open");
      return;
    }
    
    speak("Closing camera");
    setLastCommand("Closing camera");
    
    // Send message directly to the camera window
    try {
      cameraWindowRef.current.postMessage({ type: 'CLOSE_CAMERA_REQUEST' }, window.location.origin);
    } catch (error) {
      // If postMessage fails, try to close directly
      cameraWindowRef.current.close();
    }
    
    // Clear the reference
    cameraWindowRef.current = null;
  };

  const normalizeLocation = (location: string): string => {
    const normalized = location.toLowerCase().trim();
    
    // Handle common location variations
    const locationMap: { [key: string]: string } = {
      'work': 'Work',
      'working': 'Work',
      'office': 'Work',
      'home': 'Home',
      'house': 'Home',
      'park': 'Park',
      'parking': 'Park',
      'store': 'Store',
      'shop': 'Store',
      'shopping': 'Store',
    };
    
    // Check for exact matches first
    if (locationMap[normalized]) {
      return locationMap[normalized];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(locationMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    
    // Return original with proper capitalization
    return location.trim().charAt(0).toUpperCase() + location.trim().slice(1);
  };

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    
    console.log("Processing command:", command);
    console.log("Waiting for destination (ref):", waitingForDestinationRef.current);
    console.log("Waiting for from location (ref):", waitingForFromLocationRef.current);
    
    // Handle voice input for destination
    if (waitingForDestinationRef.current) {
      const destination = normalizeLocation(command);
      console.log("Recognized destination:", destination);
      setPendingDestination(destination);
      pendingDestinationRef.current = destination;
      setWaitingForDestination(false);
      waitingForDestinationRef.current = false;
      setWaitingForFromLocation(true);
      waitingForFromLocationRef.current = true;
      speak(`Going to ${destination}. Where are you starting from?`);
      setLastCommand(`Destination: ${destination}, waiting for start location...`);
      return;
    }
    
    // Handle voice input for from location
    if (waitingForFromLocationRef.current) {
      const fromLocation = normalizeLocation(command);
      console.log("Recognized from location:", fromLocation);
      setWaitingForFromLocation(false);
      waitingForFromLocationRef.current = false;
      setLastCommand(`Starting trip from ${fromLocation} to ${pendingDestinationRef.current}`);
      handleNavigateTo(pendingDestinationRef.current, fromLocation);
      setPendingDestination("");
      pendingDestinationRef.current = "";
      return;
    }
    
    if (lowerCommand.includes("recent location") || lowerCommand.includes("last location")) {
      handleRecentLocation();
    } else if (lowerCommand.includes("emergency contact") || lowerCommand.includes("emergency")) {
      handleEmergencyContact();
    } else if (lowerCommand.includes("stop listening") || lowerCommand.includes("stop voice")) {
      toggleListening();
    } else if (lowerCommand.includes("start navigation") || lowerCommand.includes("begin navigation")) {
      handleStartNavigation();
    } else if (lowerCommand.includes("stop navigation") || lowerCommand.includes("end navigation")) {
      handleStopNavigation();
    } else if (lowerCommand.includes("navigate to")) {
      const destination = lowerCommand.split("navigate to")[1].trim();
      if (destination) {
        handleNavigateTo(destination, "Current Location");
      } else {
        speak("Please specify a destination");
        setLastCommand("No destination specified");
      }
    } else if (lowerCommand.includes("open camera") || lowerCommand.includes("turn on camera") || lowerCommand.includes("camera mode") || lowerCommand.includes("camera")) {
      handleOpenCamera();
    } else if (lowerCommand.includes("close camera") || lowerCommand.includes("exit camera") || lowerCommand.includes("turn off camera")) {
      handleCloseCamera();
    } else if (lowerCommand.includes("help") || lowerCommand.includes("what can you do")) {
      handleHelp();
    } else {
      // Only speak "command not recognized" if it's not empty or just noise
      if (command.trim().length > 2) {
        setLastCommand("Unknown: " + command);
      }
    }
  };

  // Setup voice recognition
  useEffect(() => {
    if (Platform.OS === "web") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; // Enable interim results for faster response
        recognition.lang = "en-US";
        recognition.maxAlternatives = 3; // Get multiple alternatives

        let finalTranscriptTimeout: number | null = null;
        let lastInterimTranscript = "";

        recognition.onstart = () => {
          console.log("Recognition started successfully");
          // Don't reset abort counter here - wait for actual speech
        };

        recognition.onresult = (event: any) => {
          // Reset abort counter on successful speech recognition
          consecutiveAbortsRef.current = 0;
          lastAbortTimeRef.current = 0;
          
          let interimTranscript = "";
          let finalTranscript = "";

          // Collect all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Process final results immediately
          if (finalTranscript) {
            const transcript = finalTranscript.trim();
            console.log("Final transcript:", transcript);
            
            // Priority check for stop navigation - always allow this command
            const lower = transcript.toLowerCase();
            if (lower.includes("stop navigation") || lower.includes("end navigation")) {
              console.log("Stop navigation command detected");
              setLastCommand(`Heard: ${transcript}`);
              processCommand(transcript);
              lastInterimTranscript = "";
              return;
            }
            
            // Filter out system speech - be more specific to avoid blocking user commands
            const systemPhrases = [
              "where do you want to go",
              "where are you starting from",
              "starting trip from",
              "turn right in",
              "turn left in",
              "continue straight for",
              "walk forward",
              "you have arrived",
              "you are approaching your destination",
              "trip to",
              "completed",
              "navigation stopped",
              "checking your most recent location",
              "your most recent location was",
              "no recent locations found",
              "calling emergency contact",
              "calling",
              "emergency contact:",
              "no emergency contacts found"
            ];
            
            const isSystemSpeech = systemPhrases.some(phrase => lower.includes(phrase));
            if (isSystemSpeech) {
              console.log("Ignoring system speech:", transcript);
              return;
            }
            
            setLastCommand(`Heard: ${transcript}`);
            processCommand(transcript);
            lastInterimTranscript = "";
          } 
          // For interim results when waiting for location
          else if (interimTranscript && (waitingForDestinationRef.current || waitingForFromLocationRef.current)) {
            console.log("Interim transcript:", interimTranscript);
            lastInterimTranscript = interimTranscript.trim();
            
            // Clear existing timeout
            if (finalTranscriptTimeout) {
              clearTimeout(finalTranscriptTimeout);
            }
            
            // Wait 800ms of silence before processing
            finalTranscriptTimeout = setTimeout(() => {
              if (lastInterimTranscript && lastInterimTranscript.length > 0) {
                console.log("Processing interim as final:", lastInterimTranscript);
                
                const lower = lastInterimTranscript.toLowerCase();
                const systemPhrases = [
                  "where do you want to go",
                  "where are you starting from",
                  "going to",
                  "starting trip",
                  "turn right in",
                  "turn left in",
                  "continue straight",
                  "you have arrived",
                  "you are approaching"
                ];
                
                const isSystemSpeech = systemPhrases.some(phrase => lower.includes(phrase));
                if (!isSystemSpeech) {
                  setLastCommand(`Heard: ${lastInterimTranscript}`);
                  processCommand(lastInterimTranscript);
                }
                lastInterimTranscript = "";
              }
            }, 800);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === 'no-speech' || event.error === 'audio-capture') {
            // These are recoverable, just continue
            return;
          }
          if (event.error === 'aborted') {
            // During navigation, aborts are expected due to TTS - be more lenient
            if (isNavigatingRef.current) {
              console.log("Abort during navigation (expected due to TTS)");
              return;
            }
            
            // Track consecutive aborts to detect loops
            const now = Date.now();
            if (now - lastAbortTimeRef.current < 2000) {
              consecutiveAbortsRef.current++;
              console.log("Consecutive aborts:", consecutiveAbortsRef.current);
              if (consecutiveAbortsRef.current >= 2) {
                console.log("Abort loop detected, stopping auto-restart");
                isListeningRef.current = false;
                setIsListening(false);
                consecutiveAbortsRef.current = 0;
                return;
              }
            } else {
              consecutiveAbortsRef.current = 1;
            }
            lastAbortTimeRef.current = now;
            return;
          }
          // For other errors, stop listening
          isListeningRef.current = false;
          setIsListening(false);
        };

        recognition.onend = () => {
          console.log("Recognition ended, isListening:", isListeningRef.current, "isNavigating:", isNavigatingRef.current);
          
          // Clear any pending restart
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
          
          // Only restart if user wants to be listening AND not currently navigating
          if (isListeningRef.current && !isNavigatingRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              if (isListeningRef.current && !isNavigatingRef.current) {
                try {
                  recognition.start();
                  console.log("Recognition restarted");
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                  isListeningRef.current = false;
                  setIsListening(false);
                }
              }
              restartTimeoutRef.current = null;
            }, 300);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isListening]);

  const toggleListening = () => {
    if (Platform.OS === "web") {
      if (!recognitionRef.current) {
        speak("Voice recognition not supported on this device");
        return;
      }

      if (isListening) {
        isListeningRef.current = false;
        setIsListening(false);
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping:", e);
        }
        speak("Voice commands stopped");
        // Reset states when stopping
        setWaitingForDestination(false);
        setWaitingForFromLocation(false);
        setPendingDestination("");
        waitingForDestinationRef.current = false;
        waitingForFromLocationRef.current = false;
        pendingDestinationRef.current = "";
      } else {
        // Reset abort tracking when manually starting
        consecutiveAbortsRef.current = 0;
        lastAbortTimeRef.current = 0;
        isListeningRef.current = true;
        setIsListening(true);
        // Small delay to ensure previous stop completed
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            console.log("Recognition started");
          } catch (error) {
            console.error("Error starting recognition:", error);
            isListeningRef.current = false;
            setIsListening(false);
          }
        }, 100);
      }
    } else {
      speak("Voice recognition only available on web platform");
    }
  };

  return (
    <>
      {/* Navigation Lock Modal */}
      <Modal
        visible={isNavigating}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Prevent closing modal except through stop command or completion
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.navigationModal}>
            <View style={styles.navigationModalHeader}>
              <Animated.View style={[styles.navigationIndicator, { opacity: blinkAnim }]} />
              <Text style={styles.navigationModalTitle}>Navigation Active</Text>
            </View>
            <Text style={styles.navigationModalText}>
              Trip in progress...
            </Text>
            <Text style={styles.navigationModalCommand}>
              {lastCommand}
            </Text>
            <Text style={styles.navigationModalHint}>
              Say "stop navigation" to cancel
            </Text>
          </View>
        </View>
      </Modal>

      <ScrollView style={mergeStyles(styles.container, isMobileView && styles.mobileContainer)}>
      <View style={mergeStyles(styles.statusBar, isMobileView && styles.mobileStatusBar)}>
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.statusDot, { opacity: blinkAnim }]} />
          <Text style={mergeStyles(styles.statusText, isMobileView && styles.mobileStatusText)}>
            {isListening ? "Listening..." : isNavigating ? "Navigating..." : "Active"}
          </Text>
        </View>
      </View>

      <View style={mergeStyles(styles.voiceControlSection, isMobileView && styles.mobileVoiceSection)}>
        <Text style={mergeStyles(styles.voiceTitle, isMobileView && styles.mobileVoiceTitle)}>Voice Control</Text>
        <Pressable 
          style={mergeStyles(styles.voiceButton, isListening && styles.voiceButtonActive, isMobileView && styles.mobileVoiceButton)}
          onPress={toggleListening}
        >
          <Text style={mergeStyles(styles.voiceButtonText, isMobileView && styles.mobileVoiceButtonText)}>
            {isListening ? "Stop Listening" : "Start Voice Commands"}
          </Text>
        </Pressable>
        {lastCommand && (
          <Text style={mergeStyles(styles.lastCommandText, isMobileView && styles.mobileLastCommandText)}>{lastCommand}</Text>
        )}
        
        <Pressable 
          style={mergeStyles(styles.commandsToggle, isMobileView && styles.mobileCommandsToggle)}
          onPress={() => setShowCommands(!showCommands)}
        >
          <Text style={mergeStyles(styles.commandsToggleText, isMobileView && styles.mobileCommandsToggleText)}>
            {showCommands ? "Hide" : "Show"} Available Commands
          </Text>
        </Pressable>
        
        {showCommands && (
          <View style={mergeStyles(styles.commandsBox, isMobileView && styles.mobileCommandsBox)}>
            <Text style={mergeStyles(styles.commandsTitle, isMobileView && styles.mobileCommandsTitle)}>Available Commands:</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Start navigation" - Begin a new trip</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Stop navigation" - End current trip</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Open camera" / "Camera mode" - Open camera</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Close camera" / "Exit camera" - Close camera</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Stop listening" - Turn off voice commands</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "What is my recent location" - Check last destination</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Emergency contact" - Get emergency info</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Navigate to [place]" - Quick navigation</Text>
            <Text style={mergeStyles(styles.commandNote, isMobileView && styles.mobileCommandNote)}>Note: Wait 3 seconds after Theia's question before responding</Text>
          </View>
        )}
      </View>
      <View style={mergeStyles(styles.emergencySection, isMobileView && styles.mobileEmergencySection)}>
        <View style={mergeStyles(styles.emergencyIcon, isMobileView && styles.mobileEmergencyIcon)}>
          <Text style={mergeStyles(styles.emergencyIconText, isMobileView && styles.mobileEmergencyIconText)}>!</Text>
        </View>
        <Text style={mergeStyles(styles.emergencyTitle, isMobileView && styles.mobileEmergencyTitle)}>Emergency</Text>
        <Text style={mergeStyles(styles.emergencySubtext, isMobileView && styles.mobileEmergencySubtext)}>Say "emergency contact" or double tap</Text>
        <Pressable 
          style={mergeStyles(styles.quickButton, isMobileView && styles.mobileQuickButton)}
          onPress={handleEmergencyContact}
        >
          <Text style={mergeStyles(styles.quickButtonText, isMobileView && styles.mobileQuickButtonText)}>Get Emergency Contact</Text>
        </Pressable>
      </View>
      <View style={mergeStyles(styles.navigationSection, isMobileView && styles.mobileNavigationSection)}>
        <Text style={mergeStyles(styles.navigationTitle, isMobileView && styles.mobileNavigationTitle)}>Navigate</Text>
        <Link href="/(authenticated)/camera" asChild>
          <Pressable style={mergeStyles(styles.cameraButton, isMobileView && styles.mobileCameraButton)}>
            <Text style={mergeStyles(styles.cameraButtonText, isMobileView && styles.mobileCameraButtonText)}>Camera Navigation</Text>
          </Pressable>
        </Link>
      </View>
      
      <View style={mergeStyles(styles.recentSection, isMobileView && styles.mobileRecentSection)}>
        <Text style={mergeStyles(styles.recentTitle, isMobileView && styles.mobileRecentTitle)}>Recent Places</Text>
        <Text style={mergeStyles(styles.recentSubtext, isMobileView && styles.mobileRecentSubtext)}>Say "what is my recent location"</Text>
        <Pressable 
          style={mergeStyles(styles.recentButton, isMobileView && styles.mobileRecentButton)}
          onPress={handleRecentLocation}
        >
          <Text style={mergeStyles(styles.recentButtonText, isMobileView && styles.mobileRecentButtonText)}>
            View Most Recent Location
          </Text>
        </Pressable>
      </View>
      
      <Link href="/(authenticated)/home" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </Link>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  statusBar: {
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  voiceControlSection: {
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#bbf7d0",
  },
  voiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#166534",
  },
  voiceButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
  },
  voiceButtonActive: {
    backgroundColor: "#dc2626",
  },
  voiceButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  lastCommandText: {
    marginTop: 12,
    fontSize: 14,
    color: "#166534",
    fontStyle: "italic",
  },
  commandsToggle: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: "center",
  },
  commandsToggleText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  commandsBox: {
    marginTop: 16,
    backgroundColor: "#dcfce7",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86efac",
    maxWidth: 400,
    width: "90%",
  },
  commandsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commandText: {
    fontSize: 11,
    color: "#15803d",
    lineHeight: 18,
    marginBottom: 4,
  },
  commandNote: {
    fontSize: 14,
    color: "#15803d",
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  emergencySection: {
    backgroundColor: "#fef2f2",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 2,
    borderBottomColor: "#fecaca",
  },
  emergencyIcon: {
    width: 70,
    height: 70,
    backgroundColor: "#ef4444",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emergencyIconText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#dc2626",
  },
  emergencySubtext: {
    fontSize: 16,
    color: "#991b1b",
    marginBottom: 16,
  },
  quickButton: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  navigationSection: {
    backgroundColor: "#eff6ff",
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#bfdbfe",
  },
  navigationTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1e40af",
  },
  navigationSubtext: {
    fontSize: 16,
    color: "#1e3a8a",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  navQuickButton: {
    backgroundColor: "#60a5fa",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  navQuickButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  cameraButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  recentSection: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    paddingVertical: 30,
  },
  recentTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#374151",
  },
  recentSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  recentButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    maxWidth: 320,
  },
  recentButtonText: {
    color: "white",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: "#4b5563",
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  navigationModal: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  navigationModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  navigationIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    marginRight: 12,
  },
  navigationModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  navigationModalText: {
    fontSize: 18,
    color: "#AAAAAA",
    textAlign: "center",
    marginBottom: 15,
  },
  navigationModalCommand: {
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
  },
  navigationModalHint: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    fontStyle: "italic",
  },
  
  // Mobile Styles
  mobileContainer: {
    backgroundColor: "#f9fafb",
  },
  mobileStatusBar: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  mobileStatusText: {
    fontSize: 18,
  },
  mobileVoiceSection: {
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  mobileVoiceTitle: {
    fontSize: 32,
    marginBottom: 20,
  },
  mobileVoiceButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    minWidth: 280,
  },
  mobileVoiceButtonText: {
    fontSize: 20,
  },
  mobileLastCommandText: {
    fontSize: 16,
    marginTop: 16,
  },
  mobileCommandsToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 160,
  },
  mobileCommandsToggleText: {
    fontSize: 12,
  },
  mobileCommandsBox: {
    marginTop: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: "95%",
    maxWidth: 380,
  },
  mobileCommandsTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  mobileCommandText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  mobileCommandNote: {
    fontSize: 16,
    marginTop: 16,
  },
  mobileEmergencySection: {
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  mobileEmergencyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 24,
  },
  mobileEmergencyIconText: {
    fontSize: 40,
  },
  mobileEmergencyTitle: {
    fontSize: 36,
    marginBottom: 12,
  },
  mobileEmergencySubtext: {
    fontSize: 18,
    marginBottom: 20,
  },
  mobileQuickButton: {
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  mobileQuickButtonText: {
    fontSize: 18,
  },
  mobileNavigationSection: {
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  mobileNavigationTitle: {
    fontSize: 36,
    marginBottom: 16,
  },
  mobileNavigationSubtext: {
    fontSize: 18,
    marginBottom: 24,
  },
  mobileCameraButton: {
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  mobileCameraButtonText: {
    fontSize: 20,
  },
  mobileRecentSection: {
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  mobileRecentTitle: {
    fontSize: 36,
    marginBottom: 12,
  },
  mobileRecentSubtext: {
    fontSize: 16,
    marginBottom: 24,
  },
  mobileRecentButton: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    maxWidth: 340,
  },
  mobileRecentButtonText: {
    fontSize: 18,
    lineHeight: 26,
  },
});