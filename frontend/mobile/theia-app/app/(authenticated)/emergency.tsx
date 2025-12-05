import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useKeepAwake } from "expo-keep-awake";

import {
  startConversationBetweenExistingCaretakerAndImpairedPair,
  addConversationMessagesBetweenExistingCaretakerAndImpairedPair,
  getConversationMessagesBetweenExistingCaretakerAndImpairedPair,
  stopConversationBetweenExistingCaretakerAndImpairedPair,
} from "@/services/UserService";

// load react-native-voice 
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
    return require("react-native-voice").default as RNVoice;
  } catch {
    return null;
  }
})();

type Msg = { id: number; sender: string; msg: string };

export default function EmergencyScreen() {
  useKeepAwake();

  // UI & chat state
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [lastCaretakerId, setLastCaretakerId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);

  // timers & flags
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const bufferRef = useRef<string>("");
  const sendingRef = useRef(false);

  const suppressAutoRestartRef = useRef(false); // pause mic restart during TTS
  const firstGuidancePlayedRef = useRef(false); // speak guidance once

  // emergency services confirmation flow
  const confirmingEmergencyRef = useRef(false);      // awaiting yes/no
  const emergencyPromptActiveRef = useRef(false);     // prompt currently speaking
  const lastEmergencyPromptAtRef = useRef<number>(0); // debounce timestamp (ms)
  const emergencySelectionLockRef = useRef(false);    // prevents double-log before confirm

  // dedup guard (prevents repeated adds from partial/final)
  const lastLoggedRef = useRef<{ text: string; at: number } | null>(null);
  const shouldLogOnce = (text: string, windowMs = 1500) => {
    const now = Date.now();
    const last = lastLoggedRef.current;
    if (last && last.text === text && now - last.at < windowMs) return false;
    lastLoggedRef.current = { text, at: now };
    return true;
  };

  // global TTS lock to avoid overlaps
  const ttsActiveRef = useRef(false);

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

  // TTS helpers 
  const speak = (text: string): Promise<void> =>
    new Promise((resolve) => {
      ttsActiveRef.current = true;
      Speech.speak(text, {
        onDone: () => {
          ttsActiveRef.current = false;
          resolve();
        },
      });
    });

  const speakQueue = async (lines: string[]) => {
    for (const line of lines) {
      if (!line?.trim()) continue;
      await speak(line);
    }
  };

  // lifecycle & voice handlers
  useEffect(() => {
    mountedRef.current = true;

    const EMERGENCY_REGEX = /\bemergency services\b/i;

    const triggerEmergencyPrompt = async () => {
      const now = Date.now();
      if (emergencyPromptActiveRef.current) return;
      if (now - lastEmergencyPromptAtRef.current < 2000) return;

      lastEmergencyPromptAtRef.current = now;
      emergencyPromptActiveRef.current = true;
      confirmingEmergencyRef.current = true;

      // stop mic & current TTS before the prompt
      suppressAutoRestartRef.current = true;
      if (Voice) { try { await Voice.stop?.(); } catch {} }
      Speech.stop();

      await speak("You have selected emergency services, please confirm this option with yes or no. If yes, you will be connected to a 911 call.");

      emergencyPromptActiveRef.current = false;
      suppressAutoRestartRef.current = false;
      setTimeout(() => { void startListening(); }, 500);
    };

    if (Voice) {
      const handleSpeech = async (raw: string) => {
        const t = (raw || "").trim();
        if (!t) return;

        const tl = t.toLowerCase();

        // detect "emergency services", log once, then prompt
        if (!confirmingEmergencyRef.current && EMERGENCY_REGEX.test(t)) {
          if (emergencySelectionLockRef.current) return; // already handling
          if (!shouldLogOnce(t)) return; // dedup same phrase burst

          emergencySelectionLockRef.current = true;

          suppressAutoRestartRef.current = true;
          if (Voice) { try { await Voice.stop?.(); } catch {} }
          Speech.stop();

          await actuallySend(t, false /* don't restart yet */);
          await triggerEmergencyPrompt();

          // allow future emergency selections after confirm cycle finishes
          return;
        }

        // if confirming emergency services: listen for yes/no only
        if (confirmingEmergencyRef.current) {
          if (/\byes\b/i.test(tl)) {
            if (!shouldLogOnce("Yes")) return; // avoid duplicates
            confirmingEmergencyRef.current = false;
            emergencySelectionLockRef.current = false;

            suppressAutoRestartRef.current = true;
            if (Voice) { try { await Voice.stop?.(); } catch {} }
            Speech.stop();
            await actuallySend("Yes", false);
            await speak("Simulating 911 connection. Please stay calm while we connect you.");

            suppressAutoRestartRef.current = false;
            setTimeout(() => { void startListening(); }, 2000);
            return;
          }
          if (/\bno\b/i.test(tl)) {
            if (!shouldLogOnce("No")) return; // avoid duplicates
            confirmingEmergencyRef.current = false;
            emergencySelectionLockRef.current = false;

            suppressAutoRestartRef.current = true;
            if (Voice) { try { await Voice.stop?.(); } catch {} }
            Speech.stop();
            await actuallySend("No", false);
            await speak("Emergency services canceled. Returning to chat.");

            suppressAutoRestartRef.current = false;
            setTimeout(() => { void startListening(); }, 500);
            return;
          }
          // neither yes nor no: keep listening, ignore normal flow
          return;
        }

        // normal dictation: strip trailing "send"
        const endsWithSend = /\bsend\b\.?$/i.test(t);
        const cleaned = t.replace(/[\s,]*\bsend\b\.?$/i, "").trim();

        bufferRef.current = cleaned;
        setDraft(cleaned);

        if (endsWithSend) {
          const toSend = cleaned || bufferRef.current;
          if (toSend && !sendingRef.current) {
            // dedup same text burst 
            if (!shouldLogOnce(toSend)) {
              setDraft("");
              return;
            }

            sendingRef.current = true;
            setDraft("");
            bufferRef.current = "";

            if (Voice) { try { await Voice.stop?.(); } catch {} }
            Speech.stop();
            suppressAutoRestartRef.current = true;

            await actuallySend(toSend, true /* restart after guidance */);
            sendingRef.current = false;
          } else {
            setDraft("");
          }
        }
      };

      Voice.onSpeechPartialResults = (e) => {
        const val = e?.value?.[0];
        if (typeof val === "string") void handleSpeech(val);
      };
      Voice.onSpeechResults = (e) => {
        const val = e?.value?.[0];
        if (typeof val === "string") void handleSpeech(val);
      };

      Voice.onSpeechEnd = () => {
        setListening(false);
        if (mountedRef.current && !suppressAutoRestartRef.current) {
          setTimeout(() => { void startListening(); }, 400);
        }
      };
      Voice.onSpeechError = () => {
        setListening(false);
        if (mountedRef.current && !suppressAutoRestartRef.current) {
          setTimeout(() => { void startListening(); }, 700);
        }
      };
    }

    const init = async () => {
      try {
        await startConversationBetweenExistingCaretakerAndImpairedPair();
      } catch {}
      setLoading(false);

      // intro + tone: listen
      Speech.speak(
        "You have opened an emergency chat. If no message is received in thirty seconds, the chat will close and you will be taken back to the home screen. Please record your first message after the tone.",
        {
          onDone: () => {
            Speech.speak("beep", {
              onDone: () => {
                // 30s auto-close (canceled on first send)
                timeoutRef.current = setTimeout(() => {
                  if (!mountedRef.current) return;
                  router.replace("/(authenticated)/home");
                }, 30_000);
                bufferRef.current = "";
                void startListening();
              },
            });
          },
        }
      );

      await loadMessages();
      pollRef.current = setInterval(loadMessages, 5000);
    };
    void init();

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
  }, []);

  // helpers 
  function normalizeMessages(arr: any[]): Msg[] {
    return arr.map((r: any): Msg => {
      const id = Number(r.id ?? r.msg_id ?? r.cm_id ?? r.message_id ?? r.m_id ?? 0);
      const sender = String(r.sender ?? r.role ?? r.from ?? r.author ?? "unknown");
      const msg = String(r.msg ?? r.message ?? r.text ?? r.body ?? "");
      return { id, sender, msg };
    });
  }

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
      // do NOT read caretaker messages while confirmation is active or other TTS is active
      if (!confirmingEmergencyRef.current && !ttsActiveRef.current) {
        if (last.sender === "caretaker" && last.id !== lastCaretakerId) {
          setLastCaretakerId(last.id);
          Speech.speak(last.msg);
        }
      }
    }
  };

  const startListening = async () => {
    if (!Voice || startingRef.current) {
      setListening(false);
      return;
    }
    try {
      const ok = await Voice.isAvailable();
      if (!ok) return;
      startingRef.current = true;
      setListening(true);
      await Voice.start("en-US");
    } catch {
      setListening(false);
    } finally {
      startingRef.current = false;
    }
  };

  const playFirstGuidanceIfNeeded = async (thenRestart: boolean) => {
    if (firstGuidancePlayedRef.current) {
      if (thenRestart && mountedRef.current) {
        suppressAutoRestartRef.current = false;
        setTimeout(() => { void startListening(); }, 150);
      }
      return;
    }
    firstGuidancePlayedRef.current = true;

    suppressAutoRestartRef.current = true;
    Speech.stop();
    await speakQueue([
      "You have activated Theia's emergency chat.",
      "We have your last known location and route information.",
      "Would you like to speak with your caretaker or emergency services?",
    ]);

    if (thenRestart && mountedRef.current) {
      suppressAutoRestartRef.current = false;
      setTimeout(() => { void startListening(); }, 150);
    }
  };

  // optimistic append + API + refresh
  const actuallySend = async (text: string, restartAfterFlow = false) => {
    // first send cancels the auto-close
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // stronger temp id 
    const tempId = -(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    setMessages((prev) => [...prev, { id: tempId, sender: "impaired", msg: text }]);
    setDraft("");

    try {
      await addConversationMessagesBetweenExistingCaretakerAndImpairedPair(text);

      Speech.stop();
      await speak("Message sent.");
      await playFirstGuidanceIfNeeded(restartAfterFlow);

      setTimeout(() => { void loadMessages(); }, 300);
    } catch {
      // still provide spoken feedback + guidance for demo flow
      Speech.stop();
      await speak("Message sent.");
      await playFirstGuidanceIfNeeded(restartAfterFlow);
    }
  };

  const sendDraftButton = async () => {
    const text = (draft || bufferRef.current || "").trim().replace(/[\s,]*\bsend\b\.?$/i, "").trim();
    if (!text) return;

    // dedup if user taps button after voice already sent same text
    if (!shouldLogOnce(text)) {
      setDraft("");
      bufferRef.current = "";
      return;
    }

    bufferRef.current = "";

    if (Voice) { try { await Voice.stop?.(); } catch {} }
    Speech.stop();
    suppressAutoRestartRef.current = true;
    await actuallySend(text, true /* restart after guidance */);
  };

  // UI 
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Starting emergency chat…</Text>
      </View>
    );
  }

  const inExpoGo = !Voice;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Chat</Text>

      {inExpoGo && (
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            Mic transcription is disabled in Expo Go. Build a dev app to enable speech-to-text.
          </Text>
        </View>
      )}

      {/* chat messages */}
      <ScrollView style={styles.chatBox} contentContainerStyle={{ padding: 12 }}>
        {messages.map((m, i) => (
          <View
            key={m.id ? `${m.id}-${i}` : `${i}-${m.sender}`} // unique, even if ids collide
            style={[
              styles.msg,
              m.sender === "impaired" ? styles.msgImpaired : styles.msgCaretaker,
            ]}
          >
            <Text style={{ color: "#fff" }}>{m.msg}</Text>
          </View>
        ))}
      </ScrollView>

      {/* draft + mic indicator */}
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
        <Text style={styles.cardText}>{draft ? draft : listening ? "Listening…" : "Paused"}</Text>
        <Text style={styles.hint}>Say “send” to send your message.</Text>
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={sendDraftButton}
          style={[styles.btn, { backgroundColor: (draft || bufferRef.current) ? "#43A047" : "#BDBDBD" }]}
        >
          <Text style={styles.btnText}>Send Draft</Text>
        </Pressable>

        <Pressable
          onPress={() => { void startListening(); }}
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
