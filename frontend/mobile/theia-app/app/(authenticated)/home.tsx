import { UserContext } from "@/contexts/UserContext";
import { Link } from "expo-router";
import { useContext } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";

export default function Home() {
  const userContext = useContext(UserContext);

  async function doLogout() {
    await userContext?.logout();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Theia</Text>
      <Text style={styles.subtitle}>Indoor Navigation</Text>
      
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>"User mode or Caretaker mode?"</Text>
      </View>
      
      <Link href="/(authenticated)/user" asChild>
        <Pressable style={styles.modeCard}>
          <View style={styles.iconPlaceholder}></View>
          <Text style={styles.modeTitle}>User Mode</Text>
          <Text style={styles.modeDescription}>For visually impaired navigation with gesture controls</Text>
          <Text style={styles.activateText}>Tap twice to activate</Text>
        </Pressable>
      </Link>
      
      <Link href="/(authenticated)/caretaker" asChild>
        <Pressable style={styles.modeCard}>
          <View style={styles.iconPlaceholderDark}></View>
          <Text style={styles.modeTitle}>Caretaker Mode</Text>
          <Text style={styles.modeDescription}>For setup and monitoring with visible interface</Text>
          <Text style={styles.controlsText}>Full visual controls</Text>
        </Pressable>
      </Link>
      
      <View style={styles.bottomContainer}>
        <Text style={styles.preferenceText}>Remember my preference</Text>
        <Pressable style={styles.logoutButton} onPress={() => { doLogout() }}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 10,
    color: "black",
  },
  subtitle: {
    fontSize: 16,
    color: "black",
    textAlign: "center",
    marginBottom: 40,
  },
  questionContainer: {
    borderWidth: 1,
    borderColor: "black",
    padding: 15,
    marginBottom: 30,
  },
  questionText: {
    fontSize: 16,
    color: "black",
  },
  modeCard: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "black",
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  iconPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "black",
    marginBottom: 15,
  },
  iconPlaceholderDark: {
    width: 60,
    height: 60,
    backgroundColor: "black",
    marginBottom: 15,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "black",
  },
  modeDescription: {
    fontSize: 14,
    color: "black",
    textAlign: "center",
    marginBottom: 15,
  },
  activateText: {
    borderWidth: 1,
    borderColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    color: "black",
  },
  controlsText: {
    borderWidth: 1,
    borderColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    color: "black",
  },
  bottomContainer: {
    marginTop: "auto",
    alignItems: "center",
    width: "100%",
  },
  preferenceText: {
    fontSize: 14,
    marginBottom: 20,
    color: "black",
  },
  logoutButton: {
    backgroundColor: "black",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 14,
  },
});