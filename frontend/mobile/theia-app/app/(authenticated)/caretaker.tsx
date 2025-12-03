import { UserContext } from "@/contexts/UserContext";
import { Link } from "expo-router";
import { useContext } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView } from "react-native";

export default function Caretaker() {
  const userContext = useContext(UserContext);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Caretaker Dashboard</Text>
          <Text style={styles.subtitle}>Theia Indoor Navigation</Text>
        </View>
        <Pressable style={styles.switchButton}>
          <Text style={styles.switchButtonText}>Switch to User Mode</Text>
        </Pressable>
      </View>
      
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Current User Status</Text>
          <View style={styles.onlineIndicator}>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
        <Text style={styles.statusText}>Active - Idle</Text>
        
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>Last Location</Text>
            <Text style={styles.statusValue}>Building A, Floor 2</Text>
          </View>
          <View>
            <Text style={styles.statusLabel}>Last Active</Text>
            <Text style={styles.statusValue}>2 minutes ago</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          <Pressable style={styles.gridItem}>
            <Text style={styles.gridTitle}>User Profile</Text>
            <Text style={styles.gridDescription}>Configure user settings and preferences</Text>
          </Pressable>
          <Pressable style={styles.gridItem}>
            <Text style={styles.gridTitle}>Emergency Contacts</Text>
            <Text style={styles.gridDescription}>Manage emergency contact list</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3 contacts</Text>
            </View>
          </Pressable>
        </View>
        
        <View style={styles.gridRow}>
          <Pressable style={styles.gridItem}>
            <Text style={styles.gridTitle}>Building Data</Text>
            <Text style={styles.gridDescription}>Upload and manage building maps</Text>
          </Pressable>
          <Pressable style={styles.gridItem}>
            <Text style={styles.gridTitle}>Monitoring</Text>
            <Text style={styles.gridDescription}>Real-time user tracking and alerts</Text>
          </Pressable>
        </View>
        
        <View style={styles.gridRow}>
          <Pressable style={styles.gridItem}>
            <Text style={styles.gridTitle}>Settings</Text>
            <Text style={styles.gridDescription}>Customize gestures and feedback</Text>
          </Pressable>
          <Pressable style={styles.gridItem}>
            <Text style={styles.gridTitle}>Recent Activity</Text>
            <Text style={styles.gridDescription}>Navigation to Cafeteria 30 minutes ago</Text>
          </Pressable>
        </View>
      </View>
      
      <View style={styles.alertsSection}>
        <Text style={styles.alertsTitle}>Recent Alerts</Text>
        <View style={styles.alertItem}>
          <Text style={styles.alertText}>Navigation completed successfully</Text>
          <Text style={styles.alertTime}>Today at 2:30 PM</Text>
        </View>
        <View style={styles.alertItem}>
          <Text style={styles.alertText}>Obstacle detected during navigation</Text>
          <Text style={styles.alertTime}>Today at 12:15 PM</Text>
        </View>
      </View>
      
      <Link href="/(authenticated)/home" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "black",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "black",
  },
  subtitle: {
    fontSize: 14,
    color: "black",
  },
  switchButton: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "black",
  },
  switchButtonText: {
    fontSize: 12,
    color: "black",
  },
  statusCard: {
    backgroundColor: "white",
    margin: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "black",
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
  onlineIndicator: {
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "black",
  },
  onlineText: {
    fontSize: 12,
    color: "black",
  },
  statusText: {
    fontSize: 14,
    marginBottom: 15,
    color: "black",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 12,
    color: "black",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "black",
  },
  gridContainer: {
    paddingHorizontal: 20,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 15,
  },
  gridItem: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderWidth: 1,
    borderColor: "black",
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    color: "black",
  },
  gridDescription: {
    fontSize: 12,
    color: "black",
    lineHeight: 16,
  },
  badge: {
    backgroundColor: "black",
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  badgeText: {
    fontSize: 10,
    color: "white",
  },
  alertsSection: {
    margin: 20,
    marginTop: 10,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "black",
  },
  alertItem: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "black",
  },
  alertText: {
    fontSize: 14,
    marginBottom: 2,
    color: "black",
  },
  alertTime: {
    fontSize: 12,
    color: "black",
  },
  backButton: {
    backgroundColor: "black",
    margin: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
  },
});