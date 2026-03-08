import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

const CATEGORY_ICONS: Record<string, string> = {
  food: "restaurant",
  exercise: "fitness",
  steps: "footsteps",
  body_metric: "scale-outline",
  habit_log: "sparkles",
  todo: "checkbox",
  note: "create",
  reminder: "alarm",
};

const CATEGORY_COLORS: Record<string, string> = {
  food: COLORS.breakfast,
  exercise: COLORS.exercise,
  steps: COLORS.steps,
  body_metric: COLORS.weight,
  habit_log: "#7E57C2",
  todo: COLORS.primary,
  note: "#42A5F5",
  reminder: "#FF7043",
};

export default function UniversalVoiceLogScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const dateStr = route.params?.dateStr;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ category: string; message: string } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const startPulse = () => {
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animRef.current.start();
  };

  const stopPulse = () => {
    if (animRef.current) {
      animRef.current.stop();
    }
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showToast("Microphone permission required", "error");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setResult(null);
      startPulse();
    } catch (err) {
      showToast("Failed to start recording", "error");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    stopPulse();
    setProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        showToast("No audio recorded", "error");
        setProcessing(false);
        return;
      }

      // Send to backend
      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "voice_log.m4a",
        type: "audio/m4a",
      } as any);
      if (dateStr) {
        formData.append("log_date", dateStr);
      }

      const res = await client.post("/voice-log/process", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      const data = res.data;
      setResult({ category: data.category, message: data.message });
      showToast(data.message, "success");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to process voice log";
      showToast(msg, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Log</Text>
      <Text style={styles.subtitle}>
        Speak naturally — I'll figure out what to log
      </Text>

      <View style={styles.examplesCard}>
        <Text style={styles.examplesTitle}>Try saying:</Text>
        <Text style={styles.example}>"I had 2 rotis and dal for lunch"</Text>
        <Text style={styles.example}>"Ran 5km in 30 minutes"</Text>
        <Text style={styles.example}>"12000 steps today"</Text>
        <Text style={styles.example}>"Weight 72 kg"</Text>
        <Text style={styles.example}>"For gratitude: thankful for family"</Text>
        <Text style={styles.example}>"Add todo: buy groceries"</Text>
        <Text style={styles.example}>"Remind me at 5pm to drink water"</Text>
        <Text style={styles.example}>"Note: great meeting today"</Text>
      </View>

      {/* Result Card */}
      {result && (
        <View style={[styles.resultCard, { borderLeftColor: CATEGORY_COLORS[result.category] || COLORS.primary }]}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultIcon, { backgroundColor: (CATEGORY_COLORS[result.category] || COLORS.primary) + "20" }]}>
              <Ionicons
                name={(CATEGORY_ICONS[result.category] || "checkmark") as any}
                size={20}
                color={CATEGORY_COLORS[result.category] || COLORS.primary}
              />
            </View>
            <Text style={styles.resultCategory}>{result.category.replace("_", " ").toUpperCase()}</Text>
          </View>
          <Text style={styles.resultMessage}>{result.message}</Text>
        </View>
      )}

      {/* Mic Button */}
      <View style={styles.micContainer}>
        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
              ]}
              onPress={handlePress}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={40}
                color="#FFF"
              />
            </TouchableOpacity>
          </Animated.View>
        )}
        <Text style={styles.micHint}>
          {isRecording ? "Tap to stop" : processing ? "" : "Tap to record"}
        </Text>
      </View>

      {/* Done button after result */}
      {result && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  examplesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  examplesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  example: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontStyle: "italic",
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  resultCategory: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  resultMessage: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  micContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  processingContainer: {
    alignItems: "center",
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#7E57C2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#7E57C2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  micButtonRecording: {
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
  },
  micHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.surface,
  },
});
