import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

const ACCENT = COLORS.exercise;

type InputMode = "text" | "voice";

const EXERCISE_CHIPS = [
  { key: "badminton", label: "Badminton", icon: "tennisball-outline" as const },
  { key: "weight_training", label: "Weights", icon: "barbell-outline" as const },
  { key: "walking", label: "Walking", icon: "walk-outline" as const },
  { key: "running", label: "Running", icon: "speedometer-outline" as const },
  { key: "cycling", label: "Cycling", icon: "bicycle-outline" as const },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" as const },
];

export default function ExerciseLogScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState("other");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
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
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
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
    if (isRecording) stopRecording();
    else startRecording();
  };

  const canSubmit = inputMode === "text" ? description.trim().length > 0 : !!audioUri;

  const handleAnalyze = async () => {
    if (!canSubmit) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();

      // Always include exercise type as prefix context
      const typePrefix = selectedType !== "other" ? `${selectedType.replace("_", " ")}: ` : "";

      if (inputMode === "text") {
        formData.append("description", `${typePrefix}${description.trim()}`);
      } else {
        if (typePrefix) formData.append("description", typePrefix.trim());
        formData.append("audio", {
          uri: audioUri,
          type: "audio/m4a",
          name: "exercise_voice.m4a",
        } as any);
      }

      const response = await client.post("/exercise/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigation.navigate("ExerciseReview", { data: response.data });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Failed to analyze exercise. Please try again.";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={100}
          enableResetScrollToCoords={false}
        >
          <Text style={styles.title}>Log Exercise</Text>
          <Text style={styles.hint}>
            Select an exercise type and describe your session.
          </Text>

          {/* Exercise type chips */}
          <View style={styles.chipRow}>
            {EXERCISE_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.chip,
                  selectedType === chip.key && styles.chipActive,
                ]}
                onPress={() => setSelectedType(chip.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={chip.icon}
                  size={18}
                  color={selectedType === chip.key ? ACCENT : COLORS.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedType === chip.key && styles.chipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input mode toggle */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggle, inputMode === "text" && styles.modeToggleActive]}
              onPress={() => setInputMode("text")}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={inputMode === "text" ? ACCENT : COLORS.textSecondary} />
              <Text style={[styles.modeToggleText, inputMode === "text" && styles.modeToggleTextActive]}>Type</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggle, inputMode === "voice" && styles.modeToggleActive]}
              onPress={() => setInputMode("voice")}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={18} color={inputMode === "voice" ? ACCENT : COLORS.textSecondary} />
              <Text style={[styles.modeToggleText, inputMode === "voice" && styles.modeToggleTextActive]}>Voice</Text>
            </TouchableOpacity>
          </View>

          {inputMode === "text" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={'e.g. "Played badminton doubles for 45 minutes" or "Bench press 4x10 at 60kg"'}
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  setError(null);
                }}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </>
          ) : (
            <View style={styles.micContainer}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={toggleRecording}
                activeOpacity={0.7}
                disabled={analyzing}
              >
                {isRecording ? (
                  <View style={[styles.recordingDot, !pulseVisible && { opacity: 0.3 }]} />
                ) : (
                  <Ionicons name="mic" size={48} color={audioUri ? ACCENT : COLORS.textSecondary} />
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
                <TouchableOpacity onPress={() => { setAudioUri(null); setError(null); }} style={styles.clearButton}>
                  <Text style={styles.clearText}>Clear Recording</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </KeyboardAwareScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              (analyzing || !canSubmit || isRecording) && styles.buttonDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={analyzing || !canSubmit || isRecording}
            activeOpacity={0.8}
          >
            {analyzing ? (
              <View style={styles.analyzingRow}>
                <ActivityIndicator color={COLORS.surface} size="small" />
                <Text style={styles.analyzeButtonText}>  Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze Exercise</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
    marginBottom: 16,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: ACCENT + "20",
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: ACCENT,
  },
  // Mode toggle
  modeToggleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  modeToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modeToggleActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + "15",
  },
  modeToggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  modeToggleTextActive: {
    color: ACCENT,
  },
  // Text input
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    maxHeight: 200,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },
  // Voice input
  micContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error,
  },
  micLabel: {
    marginTop: 12,
    fontSize: 14,
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
  // Error
  errorBox: {
    marginTop: 16,
    backgroundColor: COLORS.error + "20",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
  },
  // Bottom
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  analyzeButton: {
    backgroundColor: ACCENT,
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
