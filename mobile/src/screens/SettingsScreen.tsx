import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/constants";

interface SettingsItem {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const items: SettingsItem[] = [
    {
      icon: "trophy-outline",
      label: "Daily Goals",
      description: "Set calorie, macro, step, and body metric targets",
      onPress: () => navigation.navigate("GoalScreen"),
      color: COLORS.primary,
    },
    {
      icon: "nutrition-outline",
      label: "Food Library",
      description: "Browse and manage your food database",
      onPress: () => navigation.navigate("FoodLibrary"),
      color: COLORS.accent,
    },
    {
      icon: "log-out-outline",
      label: "Logout",
      description: "Sign out of your account",
      onPress: handleLogout,
      danger: true,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Settings</Text>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.card, item.danger && styles.cardDanger]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: item.danger
                    ? COLORS.error + "20"
                    : (item.color || COLORS.primary) + "20",
                },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={22}
                color={item.danger ? COLORS.error : item.color || COLORS.primary}
              />
            </View>
            <View style={styles.cardContent}>
              <Text
                style={[
                  styles.cardLabel,
                  item.danger && { color: COLORS.error },
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
  cardDanger: {
    borderWidth: 1,
    borderColor: COLORS.error + "30",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
