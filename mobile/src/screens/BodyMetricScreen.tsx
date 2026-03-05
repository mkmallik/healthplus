import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

const ACCENT = COLORS.weight;

type InputMode = "text" | "voice";

const METRIC_CHIPS = [
  { key: "weight", label: "Weight", icon: "scale-outline" as const },
  { key: "waist", label: "Waist", icon: "resize-outline" as const },
  { key: "biceps", label: "Biceps", icon: "barbell-outline" as const },
];

export default function BodyMetricScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [selectedMetric, setSelectedMetric] = useState("weight");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);

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

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      if (inputMode === "text") {
        formData.append("description", description.trim());
      } else {
        formData.append("audio", {
          uri: audioUri,
          type: "audio/m4a",
          name: "body_metric_voice.m4a",
        } as any);
      }

      const response = await client.post("/body-metrics/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResults(response.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Failed to log body metric. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (results) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>Metrics Logged!</Text>

          {results.map((m: any, idx: number) => (
            <View key={idx} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons
                  name={m.metric_type === "weight" ? "scale-outline" : m.metric_type === "biceps" ? "barbell-outline" : "resize-outline"}
                  size={22}
                  color={ACCENT}
                />
                <Text style={styles.resultType}>
                  {m.metric_type === "weight" ? "Weight" : m.metric_type === "biceps" ? "Biceps" : "Waist"}
                </Text>
              </View>
              <Text style={styles.resultValue}>
                {m.value} {m.unit}
              </Text>
              {m.notes ? <Text style={styles.resultNotes}>{m.notes}</Text> : null}
            </View>
          ))}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.navigate("Home", { screen: "Today" })}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Log Body Metrics</Text>
          <Text style={styles.hint}>
            Type or say your measurement, e.g. "72.5 kg" or "I weigh 160 lbs and waist is 32 inches"
          </Text>

          {/* Metric type chips */}
          <View style={styles.metricChipRow}>
            {METRIC_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.metricChip,
                  selectedMetric === chip.key && styles.metricChipActive,
                ]}
                onPress={() => setSelectedMetric(chip.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={chip.icon}
                  size={18}
                  color={selectedMetric === chip.key ? ACCENT : COLORS.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.metricChipText,
                    selectedMetric === chip.key && styles.metricChipTextActive,
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
            <TextInput
              style={styles.input}
              placeholder={
                selectedMetric === "weight"
                  ? 'e.g. "72.5 kg" or "I weigh 160 pounds"'
                  : selectedMetric === "biceps"
                  ? 'e.g. "14 inches" or "biceps are 36 cm"'
                  : 'e.g. "82 cm" or "waist is 32 inches"'
              }
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={(v) => {
                setDescription(v);
                setError(null);
              }}
              multiline
              maxLength={200}
              textAlignVertical="top"
              autoFocus
            />
          ) : (
            <View style={styles.micContainer}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={toggleRecording}
                activeOpacity={0.7}
                disabled={submitting}
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
              styles.submitButton,
              (submitting || !canSubmit || isRecording) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !canSubmit || isRecording}
            activeOpacity={0.8}
          >
            {submitting ? (
              <View style={styles.analyzingRow}>
                <ActivityIndicator color={COLORS.surface} size="small" />
                <Text style={styles.submitButtonText}>  Processing...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Log Measurement</Text>
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
  // Metric chips
  metricChipRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  metricChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  metricChipActive: {
    backgroundColor: ACCENT + "20",
    borderColor: ACCENT,
  },
  metricChipText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  metricChipTextActive: {
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
    fontSize: 18,
    color: COLORS.text,
    minHeight: 80,
    lineHeight: 24,
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
  submitButton: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Results view
  successIcon: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  resultType: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
  },
  resultNotes: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  doneButton: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  doneButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },
});
