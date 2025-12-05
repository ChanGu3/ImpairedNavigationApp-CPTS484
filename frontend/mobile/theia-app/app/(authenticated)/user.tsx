import { UserContext } from "@/contexts/UserContext";
import { Link } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Animated, Platform, Modal, Dimensions, useWindowDimensions } from "react-native";
import * as Speech from "expo-speech";
import { TripService, PastTrip } from "@/services/TripService";
import { EmergencyContactService, EmergencyContact } from "@/services/EmergencyContactService";
import { GPSNavigationService, Route, Location } from "@/services/GPSNavigationService";

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
  const [waitingForNext, setWaitingForNext] = useState(false);
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
  const waitingForNextRef = useRef(false);
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

  // Sync refs with state
  useEffect(() => {
    waitingForNextRef.current = waitingForNext;
  }, [waitingForNext]);

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
    
    // Add a small delay before activating destination listening to prevent system speech pickup
    setTimeout(() => {
      setWaitingForDestination(true);
      waitingForDestinationRef.current = true;
      setLastCommand("Waiting for destination...");
    }, 1500); // Wait 1.5 seconds after speaking
    
    // Set a timeout to reset waiting states if no response
    setTimeout(() => {
      if (waitingForDestinationRef.current) {
        console.log("Navigation input timeout");
        setWaitingForDestination(false);
        waitingForDestinationRef.current = false;
        setPendingDestination("");
        pendingDestinationRef.current = "";
        speak("Navigation cancelled due to no response");
        setLastCommand("Navigation cancelled - timeout");
      }
    }, 30000); // 30 second timeout
  };

  const handleStopNavigation = async () => {
    // Use ref to check actual state, not just the state variable
    if (isNavigatingRef.current || isNavigating) {
      isNavigatingRef.current = false;
      setIsNavigating(false);
      setWaitingForNext(false);
      await TripService.endTrip();
      speak("Navigation stopped");
      setLastCommand("Navigation stopped");
    } else {
      speak("No navigation in progress");
      setLastCommand("No navigation active");
    }
  };

  const simulateNavigationDirections = async (route: Route, destinationDisplayName: string) => {
    // Generate dynamic instructions from route waypoints
    const directions = GPSNavigationService.generateNavigationInstructions(route, destinationDisplayName);

    for (let i = 0; i < directions.length; i++) {
      // Check ref for immediate state
      if (!isNavigatingRef.current) {
        console.log("Navigation cancelled");
        break;
      }
      
      // Use speech callback to update text when speech actually starts
      await new Promise<void>((resolve) => {
        Speech.speak(directions[i], {
          onStart: () => {
            // Update text display exactly when speech starts
            setLastCommand(directions[i]);
          },
          onDone: () => {
            resolve();
          },
          onStopped: () => {
            resolve();
          },
          onError: () => {
            resolve();
          }
        });
      });
      
      // After each instruction (except the last one), wait for user to say "next"
      if (i < directions.length - 1) {
        console.log("Setting waitingForNext to true for step", i);
        setWaitingForNext(true);
        waitingForNextRef.current = true; // Set ref immediately for synchronization
        setLastCommand(`${directions[i]} - Say "next" when ready to continue`);
        
        console.log("Starting wait loop for next command");
        // Wait for user to say "next" - keep checking until waitingForNext becomes false
        while (waitingForNextRef.current && isNavigatingRef.current) {
          console.log("Waiting for next command, waitingForNextRef.current:", waitingForNextRef.current);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log("Exited wait loop, continuing to next step");
      }
    }

    // Only end trip if navigation wasn't cancelled
    if (isNavigatingRef.current) {
      // End the trip and add to past trips
      await TripService.endTrip();
      await TripService.addToPastTrips(destinationDisplayName);
      isNavigatingRef.current = false;
      setIsNavigating(false);
      const completionMessage = `Trip to ${destinationDisplayName} completed`;
      
      // Use speech callback for completion message too
      await new Promise<void>((resolve) => {
        Speech.speak(completionMessage, {
          onStart: () => {
            setLastCommand(completionMessage);
          },
          onDone: () => {
            resolve();
          },
          onStopped: () => {
            resolve();
          },
          onError: () => {
            resolve();
          }
        });
      });
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
    
    // Use GPS navigation service to calculate route
    const routeResult = GPSNavigationService.calculateRoute(destination, 'shortest');
    
    if (!routeResult.success) {
      const error = routeResult.error || "Unable to find route to destination";
      speak(error);
      setLastCommand(`Navigation failed: ${error}`);
      
      // If destination not found, suggest closest place
      if (error.includes("don't have GPS info")) {
        setTimeout(() => {
          const closestDestination = GPSNavigationService.getClosestDestination();
          if (closestDestination) {
            speak(`The closest place is ${closestDestination.displayName}`);
          }
        }, 2000);
      }
      return;
    }
    
    const { route, location } = routeResult;
    const destinationDisplayName = location!.displayName;
    
    speak(`Starting trip from ${from} to ${destinationDisplayName}. Using ${route!.name} - approximately ${route!.estimatedSteps} steps.`);
    setLastCommand(`Starting trip to ${destinationDisplayName} (${route!.estimatedSteps} steps)`);
    
    // Start the trip in the database
    const started = await TripService.startTrip(from, destinationDisplayName);
    
    if (started) {
      isNavigatingRef.current = true;
      setIsNavigating(true);
      // Navigate using the calculated route
      await simulateNavigationDirections(route!, destinationDisplayName);
    } else {
      speak("Could not start navigation");
      setLastCommand("Navigation failed");
    }
  };

  const handleHelp = () => {
    const helpText = "Available voice commands: Start navigation, to begin a new trip. Stop navigation, to end current trip. Next, to continue to next navigation step. Closest place, to find nearest destination. Navigate to place, for quick navigation. Open camera or Camera mode, to open camera. Close camera or Exit camera, to close camera. Start auto detection, to start auto detection, camera only. Stop auto detection, to stop auto detection, camera only. Start detection or What's in front of me, to take picture and detect once, camera only. Stop listening, to turn off voice commands. What is my recent location, to check last destination. Emergency contact, to get emergency info. Help, to hear these commands again.";
    speak(helpText);
    setLastCommand("Help: All commands explained");
  };

  const handleNextButton = () => {
    console.log("Next button clicked");
    console.log("Current waitingForNext state:", waitingForNext);
    console.log("Current waitingForNextRef:", waitingForNextRef.current);
    
    if (waitingForNext || waitingForNextRef.current) {
      console.log("Setting waitingForNext to false and updating ref immediately");
      setWaitingForNext(false);
      waitingForNextRef.current = false;  // Update ref immediately
      setLastCommand('Continuing to next step');
      speak('Continuing to next step');
    } else {
      console.log("Not currently waiting for next - current navigation state:", isNavigating);
      setLastCommand('Not waiting for next command');
      speak('Not waiting for next command');
    }
  };

  const handleListDestinations = () => {
    const closestDestination = GPSNavigationService.getClosestDestination();
    if (closestDestination) {
      speak(`The closest place is ${closestDestination.displayName}`);
      setLastCommand(`Closest: ${closestDestination.displayName}`);
    } else {
      speak("No destinations are currently available");
      setLastCommand("No destinations available");
    }
  };

  const handleOpenCamera = () => {
    // If camera window already exists, just focus it
    if (cameraWindowRef.current && !cameraWindowRef.current.closed) {
      cameraWindowRef.current.focus();
      speak("Camera is already open");
      setLastCommand("Camera already open");
      return;
    }
    
    // Temporarily pause voice recognition to prevent feedback loop
    const wasListening = isListeningRef.current;
    if (wasListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
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
    
    // Resume voice recognition after a delay to allow TTS to finish
    if (wasListening) {
      setTimeout(() => {
        if (isListeningRef.current && recognitionRef.current) {
          try {
            // Check if recognition is not already running before starting
            if (recognitionRef.current.readyState === 0) { // 0 = inactive
              recognitionRef.current.start();
            }
          } catch (e) {
            console.error("Error restarting recognition after camera open:", e);
          }
        }
      }, 2000); // 2 second delay to allow TTS to complete
    }
  };

  const handleCloseCamera = () => {
    if (!cameraWindowRef.current || cameraWindowRef.current.closed) {
      speak("No camera window is open");
      setLastCommand("No camera open");
      return;
    }
    
    // Temporarily pause voice recognition to prevent feedback loop
    const wasListening = isListeningRef.current;
    if (wasListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
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
    
    // Resume voice recognition after a delay to allow TTS to finish
    if (wasListening) {
      setTimeout(() => {
        if (isListeningRef.current && recognitionRef.current) {
          try {
            // Check if recognition is not already running before starting
            if (recognitionRef.current.readyState === 0) { // 0 = inactive
              recognitionRef.current.start();
            }
          } catch (e) {
            console.error("Error restarting recognition after camera close:", e);
          }
        }
      }, 2000); // 2 second delay to allow TTS to complete
    }
  };

  const handleStartAutoDetection = () => {
    if (!cameraWindowRef.current || cameraWindowRef.current.closed) {
      speak("Camera window must be open to start auto detection");
      setLastCommand("No camera window open");
      return;
    }
    
    // Send message to camera window to start auto detection
    cameraWindowRef.current.postMessage({ type: 'START_AUTO_DETECTION' }, window.location.origin);
    speak("Starting auto detection");
    setLastCommand("Starting auto detection");
  };

  const handleStopAutoDetection = () => {
    if (!cameraWindowRef.current || cameraWindowRef.current.closed) {
      speak("Camera window must be open to stop auto detection");
      setLastCommand("No camera window open");
      return;
    }
    
    // Send message to camera window to stop auto detection
    cameraWindowRef.current.postMessage({ type: 'STOP_AUTO_DETECTION' }, window.location.origin);
    speak("Stopping auto detection");
    setLastCommand("Stopping auto detection");
  };

  const handleStartDetection = () => {
    if (!cameraWindowRef.current || cameraWindowRef.current.closed) {
      speak("Camera window must be open to start detection");
      setLastCommand("No camera window open");
      return;
    }
    
    // Send message to camera window to take a picture and detect
    console.log('Sending START_DETECTION message to camera window');
    cameraWindowRef.current.postMessage({ type: 'START_DETECTION' }, window.location.origin);
    setLastCommand("Starting detection");
  };

  const normalizeLocation = (location: string): string => {
    const normalized = location.toLowerCase().trim();
    
    // First check if it's a known GPS location
    const gpsLocation = GPSNavigationService.findLocation(normalized);
    if (gpsLocation) {
      return gpsLocation.displayName;
    }
    
    // Handle common location variations and aliases
    const locationMap: { [key: string]: string } = {
      'school': 'School',
      'the school': 'School',
      'building a': 'School',
      'building': 'School',
      'a building': 'School',
      'the building': 'School',
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
      'current location': 'Current Location',
      'here': 'Current Location',
      'my location': 'Current Location',
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
    
    console.log("=== Processing command ===");
    console.log("Original:", command);
    console.log("Lower:", lowerCommand);
    console.log("Waiting for destination (ref):", waitingForDestinationRef.current);
    console.log("Waiting for from location (ref):", waitingForFromLocationRef.current);
    console.log("Waiting for next (ref):", waitingForNextRef.current);
    console.log("Current states - waitingForNext:", waitingForNext, "isNavigating:", isNavigating);
    
    // Handle voice input for destination
    if (waitingForDestinationRef.current) {
      // Validate that we have a non-empty command
      if (!command.trim()) {
        console.log("Empty destination command, ignoring");
        return;
      }
      
      // Additional check to ignore system speech that might leak through
      const lowerCmd = command.toLowerCase().trim();
      const systemSpeechPatterns = [
        "where do you want",
        "going to",
        "starting trip",
        "sorry i don't recognize",
        "navigation cancelled"
      ];
      
      const isSystemSpeech = systemSpeechPatterns.some(pattern => lowerCmd.includes(pattern));
      if (isSystemSpeech || lowerCmd === "current location") {
        console.log("Ignoring system speech during destination input:", command);
        return;
      }
      
      const destination = normalizeLocation(command);
      console.log("Recognized destination:", destination);
      
      // Check if the destination exists in our GPS system
      const routeCheck = GPSNavigationService.calculateRoute(destination, 'shortest');
      if (!routeCheck.success) {
        speak(routeCheck.error || "Sorry, I don't recognize that destination");
        setLastCommand(`Unknown destination: ${destination}`);
        // Don't change waiting states, let user try again
        return;
      }
      
      // Start navigation immediately from current location
      setWaitingForDestination(false);
      waitingForDestinationRef.current = false;
      setLastCommand(`Starting trip from current location to ${destination}`);
      handleNavigateTo(destination, "Current Location");
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
    } else if (lowerCommand.includes("next") || lowerCommand.includes("continue") || lowerCommand === "next") {
      console.log("Next command received, original command:", command);
      console.log("Lower command:", lowerCommand);
      console.log("Current waitingForNext state:", waitingForNext);
      console.log("Current waitingForNextRef:", waitingForNextRef.current);
      
      if (waitingForNext || waitingForNextRef.current) {
        console.log("Setting waitingForNext to false and updating ref immediately");
        setWaitingForNext(false);
        waitingForNextRef.current = false;  // Update ref immediately
        setLastCommand('Continuing to next step');
        speak('Continuing to next step');
      } else {
        console.log("Not currently waiting for next - current navigation state:", isNavigating);
        setLastCommand('Not waiting for next command');
        speak('Not waiting for next command');
      }
    } else if (lowerCommand.includes("navigate to")) {
      const destination = lowerCommand.split("navigate to")[1].trim();
      if (destination) {
        handleNavigateTo(destination, "Current Location");
      } else {
        speak("Please specify a destination");
        setLastCommand("No destination specified");
      }
    } else if (lowerCommand.includes("close camera") || lowerCommand.includes("exit camera") || lowerCommand.includes("turn off camera")) {
      handleCloseCamera();
    } else if (lowerCommand.includes("open camera") || lowerCommand.includes("turn on camera") || lowerCommand.includes("camera mode") || lowerCommand.includes("camera")) {
      handleOpenCamera();
    } else if (lowerCommand.includes("start auto detection")) {
      handleStartAutoDetection();
    } else if (lowerCommand.includes("stop auto detection")) {
      handleStopAutoDetection();
    } else if (lowerCommand.includes("start detection") || lowerCommand.includes("what's in front of me") || lowerCommand.includes("what is in front of me")) {
      handleStartDetection();
    } else if (lowerCommand.includes("closest place") || lowerCommand.includes("nearest place") || lowerCommand.includes("where can i go") || lowerCommand.includes("list destinations")) {
      handleListDestinations();
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
            
            // Priority checks - always allow these commands
            const lower = transcript.toLowerCase().trim();
            if (lower.includes("stop navigation") || lower.includes("end navigation")) {
              console.log("Stop navigation command detected");
              setLastCommand(`Heard: ${transcript}`);
              processCommand(transcript);
              lastInterimTranscript = "";
              return;
            }
            
            // Priority check for next command when waiting
            if ((lower.includes("next") || lower === "next" || lower.includes("continue")) && waitingForNextRef.current) {
              console.log("Next command detected while waiting for next");
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
              "starting navigation from",
              "head northeast for",
              "head east for",
              "head north for",
              "head south for",
              "head west for",
              "head northwest for",
              "head southeast for",
              "head southwest for",
              "steps ahead",
              "say next when ready",
              "turn right in",
              "turn left in",
              "continue straight for",
              "walk forward",
              "you have arrived",
              "you are approaching your destination",
              "trip to",
              "completed",
              "navigation stopped",
              "continuing to next step",
              "not waiting for next command",
              "checking your most recent location",
              "your most recent location was",
              "no recent locations found",
              "calling emergency contact",
              "calling",
              "emergency contact:",
              "no emergency contacts found",
              "opening camera",
              "closing camera",
              "your camera is turned on",
              "exit camera navigate mode",
              "camera is already open",
              "no camera window is open",
              "no camera open",
              "unable to open camera window",
              "camera window blocked",
              "starting auto detection",
              "stopping auto detection",
              "starting detection",
              "what's in front of me",
              "what is in front of me",
              "in front of you there are",
              "camera window must be open",
              "auto detection started",
              "auto detection stopped"
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
                  "starting navigation from",
                  "head northeast for",
                  "head north for",
                  "head south for",
                  "head east for",
                  "head west for",
                  "head northwest for",
                  "head southeast for",
                  "head southwest for",
                  "steps ahead",
                  "say next when ready",
                  "continuing to next step",
                  "not waiting for next command",
                  "where do you want to go",
                  "where are you starting from",
                  "going to",
                  "sorry i don't recognize that destination",
                  "navigation cancelled",
                  "starting trip from",
                  "current location",
                  "school",
                  "turn right in",
                  "turn left in",
                  "continue straight",
                  "you have arrived",
                  "you are approaching",
                  "opening camera",
                  "closing camera",
                  "your camera is turned on",
                  "exit camera navigate mode",
                  "camera is already open",
                  "no camera window is open",
                  "starting auto detection",
                  "stopping auto detection",
                  "starting detection",
                  "what's in front of me",
                  "what is in front of me",
                  "in front of you there are",
                  "auto detection started",
                  "auto detection stopped",
                  "available voice commands",
                  "help",
                  "to begin a new trip",
                  "to end current trip",
                  "to continue to next navigation step",
                  "to find nearest destination",
                  "for quick navigation",
                  "to open camera",
                  "to close camera",
                  "to start auto detection",
                  "to stop auto detection",
                  "to take picture and detect once",
                  "to turn off voice commands",
                  "to check last destination",
                  "to get emergency info",
                  "to hear these commands again"
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
            {(waitingForNext || waitingForNextRef.current) && (
              <Pressable 
                style={styles.navigationModalNextButton}
                onPress={handleNextButton}
              >
                <Text style={styles.navigationModalNextButtonText}>Next Step</Text>
              </Pressable>
            )}
            <Text style={styles.navigationModalHint}>
              Say "stop navigation" to cancel {(waitingForNext || waitingForNextRef.current) ? '• Say "next" or tap button above' : ''}
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
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Next" - Continue to next navigation step</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Closest place" - Find nearest destination</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Navigate to [place]" - Quick navigation</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Open camera" / "Camera mode" - Open camera</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Close camera" / "Exit camera" - Close camera</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Start auto detection" - Start auto detection (camera only)</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Stop auto detection" - Stop auto detection (camera only)</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Start detection" / "What's in front of me" - Take picture and detect once (camera only)</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Stop listening" - Turn off voice commands</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "What is my recent location" - Check last destination</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Emergency contact" - Get emergency info</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Help" - Hear all available commands</Text>
            <Text style={mergeStyles(styles.commandText, isMobileView && styles.mobileCommandText)}>• "Help" - Hear all available commands</Text>
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
  navigationModalNextButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 16,
    minWidth: 120,
    alignItems: "center",
  },
  navigationModalNextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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