import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  TextInput,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../utils/constants";

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pulsing animation for recording indicator
  const [pulseVisible, setPulseVisible] = useState(true);
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setPulseVisible((v) => !v);
    }, 500);
    return () => clearInterval(interval);
  }, [isRecording]);

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        setAudioUri(null);
        setTextDescription("");
        setError(null);
      }
    } catch (err) {
      setError("Failed to pick image from gallery.");
    }
  };

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionMessage}>
          HealthPlus needs access to your camera to photograph meals for
          nutrition tracking.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.galleryPermissionButton]}
          onPress={pickFromGallery}
          activeOpacity={0.8}
        >
          <Text style={[styles.permissionButtonText, styles.galleryPermissionText]}>
            Choose from Gallery
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        setPhotoUri(photo.uri);
        setAudioUri(null);
        setTextDescription("");
        setError(null);
      }
    } catch (err) {
      setError("Failed to take photo. Please try again.");
    }
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError("Microphone permission is required to record voice descriptions.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Failed to start recording. Please try again.");
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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (err) {
      setError("Failed to stop recording. Please try again.");
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

  const analyze = async () => {
    if (!photoUri) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();

      formData.append("image", {
        uri: photoUri,
        type: "image/jpeg",
        name: "food_photo.jpg",
      } as any);

      if (audioUri) {
        formData.append("audio", {
          uri: audioUri,
          type: "audio/m4a",
          name: "voice_description.m4a",
        } as any);
      }

      if (textDescription.trim()) {
        formData.append("description", textDescription.trim());
      }

      const response = await client.post("/food/log", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      navigation.navigate("Review", { data: response.data });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to analyze food. Please try again.";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const retake = () => {
    setPhotoUri(null);
    setAudioUri(null);
    setTextDescription("");
    setIsRecording(false);
    setRecording(null);
    setError(null);
  };

  // Photo preview mode
  if (photoUri) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Analyzing overlay */}
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.analyzingText}>Analyzing your meal...</Text>
            </View>
          </View>
        )}


          {/* Header */}
          <View style={styles.previewHeader}>
            <TouchableOpacity
              onPress={retake}
              style={styles.backButton}
              activeOpacity={0.7}
              disabled={analyzing}
            >
              <Text style={styles.backButtonText}>Retake</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Preview</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
              disabled={analyzing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={100}
            enableResetScrollToCoords={false}
          >
            {/* Photo */}
            <View style={styles.previewImageContainer}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Text description input */}
            <View style={styles.textSection}>
              <Text style={styles.sectionTitle}>Describe Your Meal</Text>
              <Text style={styles.sectionHint}>
                Type what you're eating for more accurate results.
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder='e.g. "Grilled chicken with rice and salad"'
                placeholderTextColor={COLORS.textSecondary}
                value={textDescription}
                onChangeText={setTextDescription}
                multiline
                maxLength={300}
                editable={!analyzing}
              />
            </View>

            {/* Voice recording section */}
            <View style={styles.voiceSection}>
              <Text style={styles.sectionTitle}>Voice Description</Text>
              <Text style={styles.sectionHint}>
                {audioUri
                  ? "Recording saved. Tap microphone to re-record."
                  : "Optionally describe your meal by voice."}
              </Text>

              <View style={styles.recordingRow}>
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    isRecording && styles.micButtonRecording,
                  ]}
                  onPress={toggleRecording}
                  activeOpacity={0.7}
                  disabled={analyzing}
                >
                  {isRecording && pulseVisible && (
                    <View style={styles.recordingDot} />
                  )}
                  {isRecording && !pulseVisible && (
                    <View style={styles.recordingDotHidden} />
                  )}
                  {!isRecording && (
                    <Text style={styles.micIcon}>🎤</Text>
                  )}
                </TouchableOpacity>

                {isRecording && (
                  <Text style={styles.recordingLabel}>Recording... Tap to stop</Text>
                )}
                {!isRecording && audioUri && (
                  <Text style={styles.recordedLabel}>Voice recorded</Text>
                )}
              </View>
              {!isRecording && audioUri && (
                <TouchableOpacity
                  onPress={() => setAudioUri(null)}
                  activeOpacity={0.7}
                  disabled={analyzing}
                >
                  <Text style={styles.clearRecordingText}>Clear Recording</Text>
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAwareScrollView>

          {/* Analyze button */}
          <View style={styles.previewBottomBar}>
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                (analyzing || isRecording) && styles.analyzeButtonDisabled,
              ]}
              onPress={analyze}
              activeOpacity={0.8}
              disabled={analyzing || isRecording}
            >
              {analyzing ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              )}
            </TouchableOpacity>
          </View>
      </SafeAreaView>
    );
  }

  // Camera viewfinder mode
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Top bar */}
        <SafeAreaView style={styles.cameraTopBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cameraBackButton}
            activeOpacity={0.7}
          >
            <Text style={styles.cameraBackText}>Back</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Bottom bar with capture + gallery buttons */}
        <View style={styles.cameraBottomBar}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickFromGallery}
            activeOpacity={0.7}
          >
            <Text style={styles.galleryIcon}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            activeOpacity={0.7}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <View style={styles.galleryPlaceholder} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  // Permission screen
  permissionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  galleryPermissionButton: {
    backgroundColor: COLORS.surface,
    marginTop: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  galleryPermissionText: {
    color: COLORS.primary,
  },

  // Camera viewfinder
  camera: {
    flex: 1,
  },
  cameraTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "android" ? 16 : 0,
    paddingHorizontal: 16,
  },
  cameraBackButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  cameraBackText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFF",
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryIcon: {
    fontSize: 24,
  },
  galleryPlaceholder: {
    width: 48,
  },

  // Preview screen
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "600",
  },
  previewImageContainer: {
    width: "100%",
    height: 260,
    backgroundColor: "#000",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  // Error
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.error + "20",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
  },

  // Text description section
  textSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 56,
    maxHeight: 100,
    textAlignVertical: "top",
  },

  // Voice section
  voiceSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.background,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micButtonRecording: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + "20",
  },
  micIcon: {
    fontSize: 24,
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
  },
  recordingDotHidden: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  recordingLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.error,
    fontWeight: "600",
  },
  recordedLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "500",
  },
  clearRecordingText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },

  // Analyze button
  previewBottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },

  // Analyzing overlay
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  analyzingBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: "center",
  },
  analyzingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
});
