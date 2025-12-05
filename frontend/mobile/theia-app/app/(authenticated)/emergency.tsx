// app/(authenticated)/emergency.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";

import {
  startConversationBetweenExistingCaretakerAndImpairedPair,
  addConversationMessagesBetweenExistingCaretakerAndImpairedPair,
  getConversationMessagesBetweenExistingCaretakerAndImpairedPair,
  stopConversationBetweenExistingCaretakerAndImpairedPair,
} from "@/services/UserService";

// ---- SAFE LOAD of react-native-voice (prevents Expo Go crash) ----
type RNVoice = {
  onSpeechResults?: (e: { value?: string[] }) => void;
  onSpeechPartialResults?: (e: { value?: string[] }) => void;
  onSpeechEnd?: () => void;
  onSpeechError?: (e: { error?: { message?: string } }) => void;
  start(locale?: string): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  destroy(): Promise<void>;
  isAvailable(): Promise<boolean>;
};
const Voice: RNVoice | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-voice").default as RNVoice;
  } catch {
    return null;
  }
})();

type Msg = { id: number; sender: string; msg: string };

export default function EmergencyScreen() {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [lastCaretakerId, setLastCaretakerId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // mic pulse anim
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (listening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [listening, pulse]);

  useEffect(() => {
    mountedRef.current = true;

    // ---- Voice event handlers (only if Voice is available) ----
    if (Voice) {
      Voice.onSpeechPartialResults = (e) => {
        const t = (e?.value?.[0] || "").trim();
        if (!t) return;
        setDraft(t);
      };
      Voice.onSpeechResults = (e) => {
        const t = (e?.value?.[0] || "").trim();
        if (!t) return;
        setDraft(t);
      };
      Voice.onSpeechEnd = () => {
        setListening(false);
        void handleDraftAutoSend();
        if (mountedRef.current) setTimeout(() => void startListening(), 250);
      };
      Voice.onSpeechError = () => {
        setListening(false);
        if (mountedRef.current) setTimeout(() => void startListening(), 500);
      };
    }

    const run = async () => {
      try {
        await startConversationBetweenExistingCaretakerAndImpairedPair();
      } catch {}
      setLoading(false);

      const script =
        "You have opened an emergency chat. If no message is received in thirty seconds, the chat will close and you will be taken back to the home screen. Please record your first message after the tone.";
      Speech.speak(script, {
        onDone: () => {
          Speech.speak("beep", {
            onDone: () => {
              // 30s auto-close (cancel after first send)
              timeoutRef.current = setTimeout(() => {
                if (!mountedRef.current) return;
                router.replace("/(authenticated)/home");
              }, 30_000);
              void startListening();
            },
          });
        },
      });

      await loadMessages();
      pollRef.current = setInterval(loadMessages, 5000);
    };

    void run();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      Speech.stop();
      if (Voice) {
        void Voice.stop();
        void Voice.destroy();
      }
      stopConversationBetweenExistingCaretakerAndImpairedPair().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize backend messages to local shape
  function normalizeMessages(arr: any[]): Msg[] {
    return arr.map((r: any): Msg => {
      const id = Number(r.id ?? r.msg_id ?? r.cm_id ?? r.message_id ?? r.m_id ?? 0);
      const sender = String(r.sender ?? r.role ?? r.from ?? r.author ?? "unknown");
      const msg = String(r.msg ?? r.message ?? r.text ?? r.body ?? "");
      return { id, sender, msg };
    });
  }

  // Merge server messages with local optimistic (negative-id) messages
  function mergeMessages(server: Msg[], local: Msg[]): Msg[] {
    const temps = local.filter((m) => m.id < 0);
    const remainingTemps = temps.filter(
      (t) => !server.some((m) => m.sender === t.sender && m.msg === t.msg)
    );
    return [...server, ...remainingTemps];
  }

  const loadMessages = async () => {
    const res = await getConversationMessagesBetweenExistingCaretakerAndImpairedPair();
    if (!Array.isArray(res)) return;
    const mapped = normalizeMessages(res);

    setMessages((prev) => mergeMessages(mapped, prev));

    if (mapped.length) {
      const last = mapped[mapped.length - 1];
      if (last.sender === "caretaker" && last.id !== lastCaretakerId) {
        setLastCaretakerId(last.id);
        Speech.speak(last.msg);
      }
    }
  };

  const startListening = async () => {
    // If Voice is not available (Expo Go), do nothing, keep UI running
    if (!Voice) {
      setListening(false);
      return;
    }
    try {
      const ok = await Voice.isAvailable();
      if (!ok) return;
      setListening(true);
      setDraft("");
      await Voice.start("en-US");
    } catch {
      setListening(false);
    }
  };

  // if user finishes with "... send" → send it
  const handleDraftAutoSend = async () => {
    let text = draft.trim();
    if (!/\bsend\b\.?$/i.test(text)) return;

    text = text.replace(/[\s,]*\bsend\b\.?$/i, "").trim();
    if (!text) {
      setDraft("");
      return;
    }
    await actuallySend(text);
  };

  // optimistic append + API + refresh
  const actuallySend = async (text: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const tempId = -Date.now();
    setMessages((prev) => [...prev, { id: tempId, sender: "impaired", msg: text }]);
    setDraft("");

    try {
      await addConversationMessagesBetweenExistingCaretakerAndImpairedPair(text);
      Speech.speak("Message sent.");
      setTimeout(() => void loadMessages(), 300);
    } catch {
      // keep optimistic message for now
    }
  };

  const sendDraftButton = async () => {
    let text = draft.trim().replace(/[\s,]*\bsend\b\.?$/i, "").trim();
    if (!text) return;
    await actuallySend(text);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Starting emergency chat…</Text>
      </View>
    );
  }

  const inExpoGo = !Voice; // if native module missing, we are likely in Expo Go

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Chat</Text>
      <Text style={styles.subtitle}>
        Speak your message after the tone. Say “send” at the end to deliver it.
      </Text>

      {inExpoGo && (
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            Mic transcription is disabled in Expo Go. Build a dev app to enable speech-to-text.
          </Text>
        </View>
      )}

      {/* Chat messages */}
      <ScrollView style={styles.chatBox} contentContainerStyle={{ padding: 12 }}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.msg,
              m.sender === "impaired" ? styles.msgImpaired : styles.msgCaretaker,
            ]}
          >
            <Text style={{ color: "#fff" }}>{m.msg}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Draft + mic indicator */}
      <View style={styles.draftCard}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={styles.cardTitle}>Draft</Text>
          <Animated.View
            style={[
              styles.micDot,
              { transform: [{ scale: pulse }], opacity: listening ? 1 : 0.3 },
            ]}
          />
        </View>
        <Text style={styles.cardText}>
          {draft ? draft : listening ? "Listening…" : inExpoGo ? "Mic unavailable in Expo Go" : "Paused"}
        </Text>
        <Text style={styles.hint}>Say “send” to send your message.</Text>
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={sendDraftButton}
          style={[styles.btn, { backgroundColor: draft ? "#43A047" : "#BDBDBD" }]}
        >
          <Text style={styles.btnText}>Send Draft</Text>
        </Pressable>

        <Pressable
          onPress={() => void startListening()}
          style={[styles.btn, { backgroundColor: inExpoGo ? "#BDBDBD" : "#1E88E5" }]}
          disabled={inExpoGo}
        >
          <Text style={styles.btnText}>{listening ? "Listening…" : inExpoGo ? "Mic Disabled" : "Restart Mic"}</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.btn, styles.endBtn]}
        onPress={() => router.replace("/(authenticated)/home")}
      >
        <Text style={styles.btnText}>End Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 48, paddingHorizontal: 18 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  subtitle: { textAlign: "center", color: "#555", marginBottom: 10 },
  tip: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FFEEBA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  tipText: { color: "#856404", fontSize: 12, textAlign: "center" },
  chatBox: { flex: 1, borderTopWidth: 1, borderColor: "#eee", marginTop: 6 },
  msg: { padding: 10, borderRadius: 12, marginVertical: 4, maxWidth: "85%" },
  msgImpaired: { backgroundColor: "#1E88E5", alignSelf: "flex-end" },
  msgCaretaker: { backgroundColor: "#757575", alignSelf: "flex-start" },
  draftCard: { borderWidth: 1, borderColor: "#ddd", borderRadius: 14, padding: 12, marginTop: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginRight: 8 },
  cardText: { fontSize: 14, color: "#333" },
  hint: { marginTop: 6, fontSize: 12, color: "#666" },
  row: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 12 },
  btn: { borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  endBtn: { backgroundColor: "#E53935", marginVertical: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  micDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    backgroundColor: "#E53935",
  },
});
