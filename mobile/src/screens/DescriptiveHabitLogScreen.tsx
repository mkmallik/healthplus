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
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

type InputMode = "text" | "voice" | "camera";

export default function DescriptiveHabitLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { showToast } = useToast();

  const { habitId, habitName, habitColor, initialMode, logDate } = route.params || {};
  const ACCENT = habitColor || COLORS.primary;

  const [inputMode, setInputMode] = useState<InputMode>(initialMode || "text");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [pulseVisible, setPulseVisible] = useState(true);

  // Camera state
  const [imageUri, setImageUri] = useState<string | null>(null);

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
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setError(null);
      }
    } catch {
      setError("Failed to pick image.");
    }
  };

  const takePhoto = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        showToast("Camera permission is needed.", "error");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setError(null);
      }
    } catch {
      setError("Failed to take photo.");
    }
  };

  const canSubmit =
    inputMode === "text"
      ? content.trim().length > 0
      : inputMode === "voice"
      ? !!audioUri
      : !!imageUri;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      if (logDate) {
        formData.append("log_date", logDate);
      }

      if (inputMode === "text") {
        formData.append("content", content.trim());
      } else if (inputMode === "voice" && audioUri) {
        formData.append("audio", {
          uri: audioUri,
          type: "audio/m4a",
          name: "habit_voice.m4a",
        } as any);
      } else if (inputMode === "camera" && imageUri) {
        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: "habit_photo.jpg",
        } as any);
        if (content.trim()) {
          formData.append("content", content.trim());
        }
      }

      await client.post(`/habits/${habitId}/log-descriptive`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast(`${habitName} logged!`, "success");
      navigation.goBack();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Failed to log habit. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
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
          <View style={[styles.headerBadge, { backgroundColor: ACCENT + "20" }]}>
            <Ionicons name="document-text" size={20} color={ACCENT} />
            <Text style={[styles.headerBadgeText, { color: ACCENT }]}>{habitName}</Text>
          </View>

          <Text style={styles.title}>Log what you did</Text>
          <Text style={styles.hint}>
            Describe your activity via text, voice, or photo.
          </Text>

          {/* Input mode toggle */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggle, inputMode === "text" && { borderColor: ACCENT, backgroundColor: ACCENT + "15" }]}
              onPress={() => setInputMode("text")}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={inputMode === "text" ? ACCENT : COLORS.textSecondary} />
              <Text style={[styles.modeToggleText, inputMode === "text" && { color: ACCENT }]}>Type</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggle, inputMode === "voice" && { borderColor: ACCENT, backgroundColor: ACCENT + "15" }]}
              onPress={() => setInputMode("voice")}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={18} color={inputMode === "voice" ? ACCENT : COLORS.textSecondary} />
              <Text style={[styles.modeToggleText, inputMode === "voice" && { color: ACCENT }]}>Voice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggle, inputMode === "camera" && { borderColor: ACCENT, backgroundColor: ACCENT + "15" }]}
              onPress={() => setInputMode("camera")}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={18} color={inputMode === "camera" ? ACCENT : COLORS.textSecondary} />
              <Text style={[styles.modeToggleText, inputMode === "camera" && { color: ACCENT }]}>Photo</Text>
            </TouchableOpacity>
          </View>

          {inputMode === "text" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={`What did you do for "${habitName}" today?`}
                placeholderTextColor={COLORS.textSecondary}
                value={content}
                onChangeText={(v) => {
                  setContent(v);
                  setError(null);
                }}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.charCount}>{content.length}/500</Text>
            </>
          ) : inputMode === "voice" ? (
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
          ) : (
            <View style={styles.cameraContainer}>
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <View style={styles.imageActions}>
                    <TouchableOpacity onPress={() => setImageUri(null)} style={styles.clearButton}>
                      <Text style={styles.clearText}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage} style={styles.clearButton}>
                      <Text style={[styles.clearText, { color: ACCENT }]}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, { minHeight: 60, marginTop: 12 }]}
                    placeholder="Add a note (optional)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <View style={styles.imagePickerRow}>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={takePhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={32} color={ACCENT} />
                    <Text style={styles.imagePickerText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={pickImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="images" size={32} color={ACCENT} />
                    <Text style={styles.imagePickerText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
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
              { backgroundColor: ACCENT },
              (submitting || !canSubmit || isRecording) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !canSubmit || isRecording}
            activeOpacity={0.8}
          >
            {submitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator color={COLORS.surface} size="small" />
                <Text style={styles.submitButtonText}>  Saving...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Save Log</Text>
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
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: "700",
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
  // Mode toggle
  modeToggleRow: {
    flexDirection: "row",
    gap: 10,
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
  modeToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
  // Camera input
  cameraContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  imagePickerRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  imagePickerButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  imageActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 8,
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
  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
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
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
