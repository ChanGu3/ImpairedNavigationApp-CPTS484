// app/(authenticated)/emergency.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";

export default function EmergencyScreen() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    // 1) Speak the script, then 2) play a "tone", then 3) start 30s auto-close timer
    const script =
      "You have opened an emergency chat. If no message is received in thirty seconds, the chat will close and you will be taken back to the home screen. Please record your first message now.";

    const playTone = () => {
      // Simple tone stand-in using TTS; we can swap to an audio asset later
      Speech.speak("");
      // Start 30s auto-close timer after the tone
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        router.replace("/(authenticated)/home");
      }, 30_000);
    };

    Speech.speak(script, {
      onDone: playTone,
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      Speech.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Chat</Text>
      <Text style={styles.subtitle}>
        Voice instructions will play automatically. After the tone, record your
        first message. If no message is received in 30 seconds, this chat will
        close.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <Text style={styles.cardText}>
          Awaiting first message… (STT and messaging will be added next.)
        </Text>
      </View>

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#444",
  },
  backBtn: {
    alignSelf: "center",
    marginTop: 24,
    backgroundColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  backBtnText: {
    fontWeight: "600",
    color: "#333",
  },
});
