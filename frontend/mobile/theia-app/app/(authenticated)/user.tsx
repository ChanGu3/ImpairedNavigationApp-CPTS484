import { UserContext } from "@/contexts/UserContext";
import { Link, router } from "expo-router";
import { useContext, useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";

export default function User() {
  const userContext = useContext(UserContext);
  const [lastTap, setLastTap] = useState<number>(0);

  const handleEmergencyTap = () => {
    const now = Date.now();
    if (now - lastTap < 400) {
      // double-tap detected → navigate to emergency chat
      router.push("/(authenticated)/emergency");
    } else {
      setLastTap(now);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>Active</Text>
      </View>
      
      {/* Emergency section -> double-tap to open emergency chat */}
      <Pressable style={styles.emergencySection} onPress={handleEmergencyTap}>
        <View style={styles.emergencyIcon}>
          <Text style={styles.emergencyIconText}>!</Text>
        </View>
        <Text style={styles.emergencyTitle}>Emergency</Text>
        <Text style={styles.emergencySubtext}>Double tap for help</Text>
      </Pressable>
      
      <View style={styles.navigationSection}>
        <Text style={styles.navigationTitle}>Navigate</Text>
        <Text style={styles.navigationSubtext}>Double tap to start</Text>
        <Link href="/(authenticated)/camera" asChild>
          <Pressable style={styles.cameraButton}>
            <Text style={styles.cameraButtonText}>Navigate</Text>
          </Pressable>
        </Link>
      </View>
      
      <View style={styles.recentSection}>
        <Text style={styles.recentTitle}>Recent Places</Text>
        <View style={styles.recentButton}>
          <Text style={styles.recentButtonText}>Single tap to hear zone • Double tap to activate</Text>
        </View>
      </View>
      
      <Link href="/(authenticated)/home" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  statusBar: {
    borderBottomWidth: 1,
    borderBottomColor: "black",
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: "flex-start",
  },
  statusText: {
    fontSize: 14,
    color: "black",
  },
  emergencySection: {
    backgroundColor: "white",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: "black",
  },
  emergencyIcon: {
    width: 60,
    height: 60,
    backgroundColor: "#A0A0A0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  emergencyIconText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "black",
  },
  emergencySubtext: {
    fontSize: 16,
    color: "black",
  },
  navigationSection: {
    backgroundColor: "white",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: "black",
  },
  navigationTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "black",
  },
  navigationSubtext: {
    fontSize: 16,
    color: "black",
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: "#A0A0A0",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cameraButtonText: {
    color: "white",
    fontSize: 14,
  },
  recentSection: {
    backgroundColor: "white",
    alignItems: "center",
    paddingVertical: 40,
    flex: 1,
  },
  recentTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "black",
  },
  recentButton: {
    backgroundColor: "#A0A0A0",
    paddingHorizontal: 20,
    paddingVertical: 15,
    maxWidth: 300,
  },
  recentButtonText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#A0A0A0",
    margin: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
  },
});
