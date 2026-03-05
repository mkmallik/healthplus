import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import DateNavigator from "../components/DateNavigator";
import PeriodToggle, { Period } from "../components/PeriodToggle";

interface NoteItem {
  id: number;
  title: string | null;
  content: string | null;
  date: string;
  audio_path: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSectionDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
    return "Today";
  }
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) {
    return "Yesterday";
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

export default function NotesScreen() {
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [period, setPeriod] = useState<Period>("day");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);

  const isToday = isSameDay(selectedDate, new Date());
  const dateStr = formatDateISO(selectedDate);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      let params: string;
      if (searchMode && searchQuery.trim()) {
        params = `?search=${encodeURIComponent(searchQuery.trim())}`;
      } else if (period === "day") {
        params = `?date=${dateStr}`;
      } else {
        const daysBack = period === "7days" ? 6 : 29;
        const fromDate = new Date(selectedDate);
        fromDate.setDate(fromDate.getDate() - daysBack);
        const fromStr = formatDateISO(fromDate);
        params = `?date_from=${fromStr}&date_to=${dateStr}`;
      }
      const res = await client.get(`/notes${params}`);
      setNotes(res.data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [dateStr, period, searchMode, searchQuery, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  const goToPrev = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToNext = useCallback(() => {
    setSelectedDate((prev) => {
      if (isSameDay(prev, new Date())) return prev;
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const renderNote = ({ item }: { item: NoteItem }) => {
    const preview = item.content
      ? item.content.length > 100
        ? item.content.slice(0, 100) + "..."
        : item.content
      : "No content";

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() =>
          navigation.navigate("NoteEditor", {
            noteId: item.id,
            noteDate: item.date,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title || "Untitled"}
          </Text>
          <View style={styles.badges}>
            {item.audio_path && (
              <Ionicons name="mic" size={14} color={COLORS.accent} style={styles.badge} />
            )}
            {item.image_path && (
              <Ionicons name="image" size={14} color={COLORS.primary} style={styles.badge} />
            )}
          </View>
        </View>
        <Text style={styles.notePreview} numberOfLines={2}>
          {preview}
        </Text>
        {(searchMode || period !== "day") && (
          <Text style={styles.noteDate}>{item.date}</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Group notes by date for multi-day mode
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (notes.length === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {searchMode ? "No notes found" : period === "day" ? "No notes for this day" : "No notes in this period"}
          </Text>
        </View>
      );
    }

    if (period !== "day" && !searchMode) {
      // Group by date
      const grouped: Record<string, NoteItem[]> = {};
      for (const note of notes) {
        if (!grouped[note.date]) grouped[note.date] = [];
        grouped[note.date].push(note);
      }
      const sections = Object.keys(grouped)
        .sort((a, b) => b.localeCompare(a))
        .map((d) => ({
          title: formatSectionDate(d),
          data: grouped[d],
        }));

      return (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionDateHeader}>{section.title}</Text>
          )}
          renderItem={renderNote}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      );
    }

    return (
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNote}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {!searchMode && (
        <DateNavigator
          selectedDate={selectedDate}
          onPrev={goToPrev}
          onNext={goToNext}
          onReset={goToToday}
          isToday={isToday}
          onDateSelect={(d) => setSelectedDate(d)}
        />
      )}

      {!searchMode && (
        <PeriodToggle period={period} onChange={setPeriod} />
      )}

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              if (t.trim()) {
                setSearchMode(true);
              }
            }}
            onSubmitEditing={fetchNotes}
            returnKeyType="search"
          />
          {searchMode && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchMode(false);
              }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderContent()}

      {/* FAB to create new note */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("NoteEditor", { noteDate: dateStr })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={COLORS.surface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  list: {
    padding: 16,
    paddingBottom: 96,
  },
  sectionDateHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  noteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    marginLeft: 4,
  },
  notePreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
