import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import client from "../api/client";
import { COLORS, MEAL_LABELS } from "../utils/constants";
import { useToast } from "../components/Toast";

interface FoodLibraryItem {
  id: number;
  name: string;
  aliases?: string[] | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g: number;
  sodium_per_100g: number;
  category: string;
  serving_size_g: number;
}

const PORTION_PRESETS = [50, 100, 150, 200];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodLibraryScreen() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FoodLibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [portionGrams, setPortionGrams] = useState<Record<number, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await client.get("/food-library/categories");
        setCategories(res.data);
      } catch {
        // silent
      }
    };
    fetchCategories();
  }, []);

  // Load items on mount (all)
  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCategory) params.category = selectedCategory;
      const res = await client.get("/food-library", { params });
      setItems(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      debounceRef.current = setTimeout(() => fetchItems(), 300);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await client.get("/food-library/search", { params: { q: text } });
        setItems(res.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [fetchItems]);

  const handleQuickLog = useCallback(async (item: FoodLibraryItem, mealType: string) => {
    const grams = parseFloat(portionGrams[item.id] || "100");
    if (isNaN(grams) || grams <= 0) {
      showToast("Please enter a valid portion in grams.", "error");
      return;
    }
    try {
      await client.post("/food-library/quick-log", {
        food_library_id: item.id,
        portion_grams: grams,
        meal_type: mealType,
      });
      showToast(`${item.name} (${Math.round(grams)}g) added to ${MEAL_LABELS[mealType] || mealType}.`, "success");
    } catch {
      showToast("Failed to log food.", "error");
    }
  }, [portionGrams]);

  const showMealPicker = useCallback((item: FoodLibraryItem) => {
    Alert.alert("Log to which meal?", `${item.name}`, [
      ...MEAL_TYPES.map((mt) => ({
        text: MEAL_LABELS[mt] || mt,
        onPress: () => { handleQuickLog(item, mt); },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }, [handleQuickLog]);

  const renderItem = ({ item }: { item: FoodLibraryItem }) => {
    const isExpanded = expandedId === item.id;
    const grams = parseFloat(portionGrams[item.id] || "100");
    const ratio = (isNaN(grams) ? 1 : grams) / 100;

    return (
      <View style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemHeader}
          activeOpacity={0.7}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category}</Text>
          </View>
          <View style={styles.calBadge}>
            <Text style={styles.calBadgeText}>{Math.round(item.calories_per_100g)} kcal</Text>
            <Text style={styles.calBadgeSub}>per 100g</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Nutrition per portion */}
            <View style={styles.nutritionGrid}>
              <View style={styles.nutriCol}>
                <Text style={styles.nutriValue}>{Math.round(item.calories_per_100g * ratio)}</Text>
                <Text style={styles.nutriLabel}>kcal</Text>
              </View>
              <View style={styles.nutriCol}>
                <Text style={[styles.nutriValue, { color: COLORS.protein }]}>{(item.protein_per_100g * ratio).toFixed(1)}</Text>
                <Text style={styles.nutriLabel}>Protein</Text>
              </View>
              <View style={styles.nutriCol}>
                <Text style={[styles.nutriValue, { color: COLORS.carbs }]}>{(item.carbs_per_100g * ratio).toFixed(1)}</Text>
                <Text style={styles.nutriLabel}>Carbs</Text>
              </View>
              <View style={styles.nutriCol}>
                <Text style={[styles.nutriValue, { color: COLORS.fat }]}>{(item.fat_per_100g * ratio).toFixed(1)}</Text>
                <Text style={styles.nutriLabel}>Fat</Text>
              </View>
            </View>

            <View style={styles.microRow}>
              <Text style={styles.microText}>Fiber: {(item.fiber_per_100g * ratio).toFixed(1)}g</Text>
              <Text style={styles.microText}>Sugar: {(item.sugar_per_100g * ratio).toFixed(1)}g</Text>
              <Text style={styles.microText}>Sodium: {Math.round(item.sodium_per_100g * ratio)}mg</Text>
            </View>

            {/* Portion input */}
            <View style={styles.portionRow}>
              <Text style={styles.portionLabel}>Portion:</Text>
              <TextInput
                style={styles.portionInput}
                value={portionGrams[item.id] || "100"}
                onChangeText={(v) => setPortionGrams((prev) => ({ ...prev, [item.id]: v }))}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.portionUnit}>g</Text>
            </View>

            {/* Portion presets */}
            <View style={styles.presetRow}>
              {PORTION_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.presetButton,
                    (portionGrams[item.id] || "100") === String(p) && styles.presetButtonActive,
                  ]}
                  onPress={() => setPortionGrams((prev) => ({ ...prev, [item.id]: String(p) }))}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      (portionGrams[item.id] || "100") === String(p) && styles.presetButtonTextActive,
                    ]}
                  >
                    {p}g
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Log button */}
            <TouchableOpacity
              style={styles.quickLogButton}
              onPress={() => showMealPicker(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickLogButtonText}>Quick Log</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={90}
    >
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods..."
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipScrollContent}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => { setSelectedCategory(null); setQuery(""); }}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => { setSelectedCategory(cat === selectedCategory ? null : cat); setQuery(""); }}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Food list */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No foods found. Try a different search.</Text>
          }
        />
      )}
    </KeyboardAvoidingView>
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
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipScroll: {
    maxHeight: 48,
    paddingVertical: 4,
  },
  chipScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  itemCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  calBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  calBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  calBadgeSub: {
    fontSize: 10,
    color: COLORS.primaryDark,
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  nutriCol: {
    alignItems: "center",
  },
  nutriValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  nutriLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 12,
  },
  microText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  portionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 10,
  },
  portionInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 70,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  portionUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  presetButtonTextActive: {
    color: COLORS.primaryDark,
  },
  quickLogButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickLogButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 40,
  },
});
