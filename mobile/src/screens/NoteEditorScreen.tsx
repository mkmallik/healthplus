import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

type NoteEditorRouteParams = {
  NoteEditor: {
    noteId?: number;
    noteDate?: string;
  };
};

export default function NoteEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<NoteEditorRouteParams, "NoteEditor">>();
  const { noteId, noteDate } = route.params || {};
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const isEditing = !!noteId;

  useEffect(() => {
    if (noteId) {
      setLoading(true);
      client
        .get(`/notes/${noteId}`)
        .then((res) => {
          setTitle(res.data.title || "");
          setContent(res.data.content || "");
        })
        .catch(() => {
          showToast("Failed to load note.", "error");
        })
        .finally(() => setLoading(false));
    }
  }, [noteId]);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        showToast("Microphone permission required.", "error");
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
    } catch {
      showToast("Failed to start recording.", "error");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setIsRecording(false);
      setRecording(null);
    } catch {
      setIsRecording(false);
      setRecording(null);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      showToast("Failed to pick image.", "error");
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !audioUri && !imageUri) {
      showToast("Add a title or content first.", "info");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await client.put(`/notes/${noteId}`, {
          title: title.trim(),
          content: content.trim(),
        });
        showToast("Note updated!", "success");
      } else {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("content", content.trim());
        if (noteDate) formData.append("note_date", noteDate);

        if (audioUri) {
          formData.append("audio", {
            uri: audioUri,
            name: "recording.m4a",
            type: "audio/m4a",
          } as any);
        }

        if (imageUri) {
          formData.append("image", {
            uri: imageUri,
            name: "photo.jpg",
            type: "image/jpeg",
          } as any);
        }

        await client.post("/notes", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("Note saved!", "success");
      }
      navigation.goBack();
    } catch {
      showToast("Failed to save note.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!noteId) return;
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/notes/${noteId}`);
            showToast("Note deleted.", "success");
            navigation.goBack();
          } catch {
            showToast("Failed to delete note.", "error");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={100}
        enableResetScrollToCoords={false}
      >
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={COLORS.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="Write your note..."
          placeholderTextColor={COLORS.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {/* Attachments */}
        {!isEditing && (
          <View style={styles.attachRow}>
            <TouchableOpacity
              style={[
                styles.attachButton,
                isRecording && { backgroundColor: COLORS.error + "20" },
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic"}
                size={22}
                color={isRecording ? COLORS.error : COLORS.primary}
              />
              <Text
                style={[
                  styles.attachText,
                  isRecording && { color: COLORS.error },
                ]}
              >
                {isRecording ? "Stop" : audioUri ? "Re-record" : "Record"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachButton}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <Ionicons
                name={imageUri ? "checkmark-circle" : "image"}
                size={22}
                color={imageUri ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={styles.attachText}>
                {imageUri ? "Image added" : "Add Image"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {audioUri && !isEditing && (
          <View style={styles.attachBadge}>
            <Ionicons name="mic" size={16} color={COLORS.accent} />
            <Text style={styles.attachBadgeText}>Audio attached</Text>
            <TouchableOpacity onPress={() => setAudioUri(null)}>
              <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {imageUri && !isEditing && (
          <View style={styles.attachBadge}>
            <Ionicons name="image" size={16} color={COLORS.primary} />
            <Text style={styles.attachBadgeText}>Image attached</Text>
            <TouchableOpacity onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          {isEditing && (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isEditing ? "Update" : "Save"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  contentInput: {
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 200,
    lineHeight: 24,
  },
  attachRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  attachButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
  },
  attachText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  attachBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  attachBadgeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  dangerButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
