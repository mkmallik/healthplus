import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import client from "../api/client";
import { COLORS } from "../utils/constants";

interface ReminderData {
  id: number;
  text: string;
  reminder_time: string;
  reminder_date: string;
  audio_path: string | null;
  is_triggered: boolean;
  recurrence: string;
  is_active: boolean;
  is_triggered_today: boolean;
}

interface ReminderContextType {
  refreshReminders: () => void;
}

const ReminderContext = createContext<ReminderContextType>({
  refreshReminders: () => {},
});

export const useReminders = () => useContext(ReminderContext);

const SNOOZE_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
];

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [alarmReminder, setAlarmReminder] = useState<ReminderData | null>(null);
  const [showAlarm, setShowAlarm] = useState(false);
  const snoozedRef = useRef<Map<number, number>>(new Map()); // id -> snooze until timestamp
  const soundRef = useRef<Audio.Sound | null>(null);
  const loopRef = useRef<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const fetchReminders = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await client.get(`/reminders?date=${today}`);
      setReminders(res.data);
    } catch {
      // silent - user may not be logged in
    }
  }, []);

  // Poll reminders every 60s
  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  // Check if any reminder should fire
  useEffect(() => {
    const checkAlarms = () => {
      if (showAlarm) return; // Don't fire another while one is showing

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const nowTs = now.getTime();

      for (const r of reminders) {
        if (r.is_triggered_today) continue;
        if (r.reminder_time !== currentTime) continue;

        // Check snooze
        const snoozedUntil = snoozedRef.current.get(r.id);
        if (snoozedUntil && nowTs < snoozedUntil) continue;

        // Fire this reminder
        snoozedRef.current.delete(r.id);
        setAlarmReminder(r);
        setShowAlarm(true);
        break;
      }
    };

    const interval = setInterval(checkAlarms, 10000); // check every 10s
    checkAlarms(); // immediate check
    return () => clearInterval(interval);
  }, [reminders, showAlarm]);

  // Play alarm audio in loop when alarm is showing
  useEffect(() => {
    if (!showAlarm || !alarmReminder) return;

    const playLoop = async () => {
      loopRef.current = true;

      // Vibrate pattern
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
      }

      // Start pulse animation
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animRef.current.start();

      if (alarmReminder.audio_path) {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
          });
          const baseUrl = client.defaults.baseURL?.replace("/api", "") || "";
          const audioUrl = alarmReminder.audio_path.startsWith("/")
            ? `${baseUrl}${alarmReminder.audio_path}`
            : `${baseUrl}/uploads/${alarmReminder.audio_path}`;

          const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
          soundRef.current = sound;

          // Loop the audio
          await sound.setIsLoopingAsync(true);
          await sound.setVolumeAsync(1.0);
          await sound.playAsync();
        } catch {
          // Audio failed, vibration still works
        }
      }
    };

    playLoop();

    return () => {
      loopRef.current = false;
      Vibration.cancel();
      if (animRef.current) {
        animRef.current.stop();
        pulseAnim.setValue(1);
      }
    };
  }, [showAlarm, alarmReminder]);

  const stopAlarm = useCallback(async () => {
    Vibration.cancel();
    if (animRef.current) {
      animRef.current.stop();
      pulseAnim.setValue(1);
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(async () => {
    await stopAlarm();
    if (alarmReminder) {
      try {
        const today = new Date().toISOString().split("T")[0];
        await client.patch(`/reminders/${alarmReminder.id}/trigger?date=${today}`);
      } catch {}
    }
    setShowAlarm(false);
    setAlarmReminder(null);
    fetchReminders();
  }, [alarmReminder, stopAlarm, fetchReminders]);

  const handleSnooze = useCallback(
    async (minutes: number) => {
      await stopAlarm();
      if (alarmReminder) {
        const snoozeUntil = Date.now() + minutes * 60 * 1000;
        snoozedRef.current.set(alarmReminder.id, snoozeUntil);
      }
      setShowAlarm(false);
      setAlarmReminder(null);
    },
    [alarmReminder, stopAlarm]
  );

  return (
    <ReminderContext.Provider value={{ refreshReminders: fetchReminders }}>
      {children}

      {/* Full-screen alarm modal */}
      <Modal
        visible={showAlarm}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => {}} // Prevent back button dismiss on Android
      >
        <View style={styles.overlay}>
          <View style={styles.alarmContainer}>
            {/* Pulsing alarm icon */}
            <Animated.View
              style={[styles.alarmIconContainer, { transform: [{ scale: pulseAnim }] }]}
            >
              <Ionicons name="alarm" size={64} color="#FFF" />
            </Animated.View>

            <Text style={styles.alarmLabel}>REMINDER</Text>
            <Text style={styles.alarmText}>{alarmReminder?.text}</Text>
            <Text style={styles.alarmTime}>{alarmReminder?.reminder_time}</Text>

            {/* Dismiss button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>

            {/* Snooze options */}
            <Text style={styles.snoozeLabel}>Snooze</Text>
            <View style={styles.snoozeRow}>
              {SNOOZE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.minutes}
                  style={styles.snoozeButton}
                  onPress={() => handleSnooze(opt.minutes)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={18} color="#FF7043" />
                  <Text style={styles.snoozeButtonText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ReminderContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alarmContainer: {
    width: "100%",
    alignItems: "center",
  },
  alarmIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FF7043",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#FF7043",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  alarmLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF7043",
    letterSpacing: 3,
    marginBottom: 12,
  },
  alarmText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  alarmTime: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 40,
  },
  dismissButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 32,
    width: "100%",
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  snoozeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 12,
  },
  snoozeRow: {
    flexDirection: "row",
    gap: 12,
  },
  snoozeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,112,67,0.3)",
  },
  snoozeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF7043",
  },
});
