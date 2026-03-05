import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS, MEAL_LABELS } from "../utils/constants";
import { useToast } from "../components/Toast";

const MEAL_TYPES = ["auto", "breakfast", "lunch", "dinner", "snack"];

export default function VoiceEntryScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState("auto");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pulsing indicator
  const [pulseVisible, setPulseVisible] = useState(true);
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setPulseVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        showToast("Microphone permission is needed to record voice.", "error");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setAudioUri(null);
      setError(null);
    } catch {
      setError("Failed to start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      setError("Failed to stop recording.");
      setRecording(null);
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAnalyze = async () => {
    if (!audioUri) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", {
        uri: audioUri,
        type: "audio/m4a",
        name: "voice_description.m4a",
      } as any);
      if (selectedMealType !== "auto") {
        formData.append("meal_type", selectedMealType);
      }

      const response = await client.post("/food/log-text", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Handle both old {food} and new {foods} response shapes
      const resData = response.data;
      navigation.navigate("Review", { data: resData });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Failed to analyze food. Please try again.";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setAudioUri(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Voice Log</Text>
        <Text style={styles.hint}>
          Tap the microphone and describe what you ate.
        </Text>

        {/* Mic button */}
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={toggleRecording}
            activeOpacity={0.7}
            disabled={analyzing}
          >
            {isRecording ? (
              <View
                style={[
                  styles.recordingDot,
                  !pulseVisible && { opacity: 0.3 },
                ]}
              />
            ) : (
              <Ionicons
                name="mic"
                size={48}
                color={audioUri ? COLORS.primary : COLORS.textSecondary}
              />
            )}
          </TouchableOpacity>

          <Text style={styles.micLabel}>
            {isRecording
              ? "Recording... Tap to stop"
              : audioUri
              ? "Recording saved. Tap to re-record."
              : "Tap to start recording"}
          </Text>

          {audioUri && !isRecording && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear Recording</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meal type chips */}
        <Text style={styles.chipLabel}>Meal Type</Text>
        <View style={styles.chipRow}>
          {MEAL_TYPES.map((mt) => (
            <TouchableOpacity
              key={mt}
              style={[styles.chip, selectedMealType === mt && styles.chipActive]}
              onPress={() => setSelectedMealType(mt)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedMealType === mt && styles.chipTextActive,
                ]}
              >
                {mt === "auto" ? "Auto" : MEAL_LABELS[mt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Analyze button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (analyzing || !audioUri || isRecording) && styles.buttonDisabled,
          ]}
          onPress={handleAnalyze}
          disabled={analyzing || !audioUri || isRecording}
          activeOpacity={0.8}
        >
          {analyzing ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={COLORS.surface} size="small" />
              <Text style={styles.analyzeButtonText}>  Analyzing...</Text>
            </View>
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  micContainer: {
    alignItems: "center",
    marginVertical: 32,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonRecording: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + "20",
  },
  recordingDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error,
  },
  micLabel: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  clearButton: {
    marginTop: 8,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "500",
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: COLORS.error + "15",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
