import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

const ACCENT = COLORS.steps;

type Mode = "manual" | "photo" | "voice";

type StepLogRouteParams = {
  StepLog: {
    stepDate?: string;
    existingSteps?: number;
  };
};

export default function StepLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<StepLogRouteParams, "StepLog">>();
  const { stepDate, existingSteps } = route.params || {};
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("manual");
  const [stepCount, setStepCount] = useState(existingSteps ? String(existingSteps) : "");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("Camera permission is required to take a photo.", "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError(null);
    }
  };

  const canSubmit =
    mode === "manual"
      ? stepCount.trim().length > 0
      : mode === "photo"
      ? !!imageUri
      : !!audioUri;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      if (stepDate) {
        formData.append("step_date", stepDate);
      }

      if (mode === "manual") {
        const count = parseInt(stepCount, 10);
        if (!count || count <= 0) {
          setError("Please enter a valid step count.");
          setSubmitting(false);
          return;
        }
        formData.append("step_count", String(count));
      } else if (mode === "photo") {
        if (!imageUri) {
          setError("Please select or take a photo of your watch.");
          setSubmitting(false);
          return;
        }
        const filename = imageUri.split("/").pop() || "watch.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        } as any);
      } else {
        // voice mode — transcribe on backend then parse step count
        if (!audioUri) {
          setError("Please record your step count.");
          setSubmitting(false);
          return;
        }
        formData.append("audio", {
          uri: audioUri,
          type: "audio/m4a",
          name: "steps_voice.m4a",
        } as any);
      }

      const response = await client.post("/steps/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast(`${response.data.step_count.toLocaleString()} steps ${existingSteps ? "updated" : "recorded"}.`, "success");
      navigation.navigate("Home", { screen: "Today" });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Failed to log steps. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={90}
      >
      <View style={styles.content}>
        <Text style={styles.title}>{existingSteps ? "Update Steps" : "Log Steps"}</Text>
        <Text style={styles.hint}>
          {existingSteps
            ? `Current: ${existingSteps.toLocaleString()} steps. Enter a new value to update.`
            : "Track your daily steps manually, from a watch photo, or by voice."}
        </Text>

        {/* Mode Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "manual" && styles.toggleActive]}
            onPress={() => setMode("manual")}
            activeOpacity={0.7}
          >
            <Ionicons name="keypad-outline" size={16} color={mode === "manual" ? ACCENT : COLORS.textSecondary} />
            <Text style={[styles.toggleText, mode === "manual" && styles.toggleTextActive]}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "photo" && styles.toggleActive]}
            onPress={() => setMode("photo")}
            activeOpacity={0.7}
          >
            <Ionicons name="watch-outline" size={16} color={mode === "photo" ? ACCENT : COLORS.textSecondary} />
            <Text style={[styles.toggleText, mode === "photo" && styles.toggleTextActive]}>Watch Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "voice" && styles.toggleActive]}
            onPress={() => setMode("voice")}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={16} color={mode === "voice" ? ACCENT : COLORS.textSecondary} />
            <Text style={[styles.toggleText, mode === "voice" && styles.toggleTextActive]}>Voice</Text>
          </TouchableOpacity>
        </View>

        {mode === "manual" ? (
          <View style={styles.manualSection}>
            <TextInput
              style={styles.stepInput}
              placeholder="Enter step count"
              placeholderTextColor={COLORS.textSecondary}
              value={stepCount}
              onChangeText={(v) => {
                setStepCount(v.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
            {stepCount ? (
              <Text style={styles.stepsPreview}>{parseInt(stepCount || "0", 10).toLocaleString()} steps</Text>
            ) : null}
          </View>
        ) : mode === "photo" ? (
          <View style={styles.photoSection}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.watchPreview} resizeMode="contain" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="watch-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.photoPlaceholderText}>
                  Take or choose a photo of your watch/fitness tracker
                </Text>
              </View>
            )}
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.7}>
                <Ionicons name="camera" size={20} color={ACCENT} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.7}>
                <Ionicons name="images" size={20} color={ACCENT} />
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
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
                : 'Say your step count, e.g. "8500 steps"'}
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
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, (submitting || !canSubmit || isRecording) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !canSubmit || isRecording}
          activeOpacity={0.8}
        >
          {submitting ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={COLORS.surface} size="small" />
              <Text style={styles.submitButtonText}>
                {"  "}{mode === "photo" ? "Reading..." : mode === "voice" ? "Processing..." : "Saving..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === "photo" ? "Read & Save Steps" : "Save Steps"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
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
    marginBottom: 20,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  toggleActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + "15",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: ACCENT,
  },
  // Manual
  manualSection: {
    alignItems: "center",
  },
  stepInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    width: "100%",
  },
  stepsPreview: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: "600",
    marginTop: 8,
  },
  // Photo
  photoSection: {
    alignItems: "center",
  },
  watchPreview: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    padding: 20,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  photoButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ACCENT + "15",
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT,
  },
  // Voice
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
    textAlign: "center",
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
});
