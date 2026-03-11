import React from "react";
import { ActivityIndicator, View, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ToastProvider } from "./src/components/Toast";
import { ReminderProvider } from "./src/context/ReminderContext";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CameraScreen from "./src/screens/CameraScreen";
import ReviewScreen from "./src/screens/ReviewScreen";
import GoalScreen from "./src/screens/GoalScreen";
import FoodDetailScreen from "./src/screens/FoodDetailScreen";
import FoodLibraryScreen from "./src/screens/FoodLibraryScreen";
import MealInsightsScreen from "./src/screens/MealInsightsScreen";
import AddFoodScreen from "./src/screens/AddFoodScreen";
import TextEntryScreen from "./src/screens/TextEntryScreen";
import VoiceEntryScreen from "./src/screens/VoiceEntryScreen";
import SavedMealsScreen from "./src/screens/SavedMealsScreen";
import ExerciseLogScreen from "./src/screens/ExerciseLogScreen";
import ExerciseReviewScreen from "./src/screens/ExerciseReviewScreen";
import StepLogScreen from "./src/screens/StepLogScreen";
import BodyMetricScreen from "./src/screens/BodyMetricScreen";
import StatsScreen from "./src/screens/StatsScreen";
import HabitScreen from "./src/screens/HabitScreen";
import DescriptiveHabitLogScreen from "./src/screens/DescriptiveHabitLogScreen";
import TodoScreen from "./src/screens/TodoScreen";
import UniversalVoiceLogScreen from "./src/screens/UniversalVoiceLogScreen";
import ReminderCreateScreen from "./src/screens/ReminderCreateScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import NotesScreen from "./src/screens/NotesScreen";
import NoteEditorScreen from "./src/screens/NoteEditorScreen";
import LogsScreen from "./src/screens/LogsScreen";
import HabitsFullScreen from "./src/screens/HabitsFullScreen";
import TodoFullScreen from "./src/screens/TodoFullScreen";
import { COLORS } from "./src/utils/constants";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function headerRightButtons(navigation: any) {
  return () => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 16 }}>
      <TouchableOpacity onPress={() => navigation.navigate("Insights")}>
        <Ionicons name="stats-chart-outline" size={21} color={COLORS.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
        <Ionicons name="settings-outline" size={21} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          paddingBottom: 4,
          paddingTop: 4,
          height: 64,
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { color: COLORS.text },
      }}
    >
      <Tab.Screen
        name="Today"
        component={HomeScreen}
        options={({ navigation }) => ({
          tabBarLabel: "Today",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "sunny" : "sunny-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsFullScreen}
        options={({ navigation }) => ({
          tabBarLabel: "Habits",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={({ navigation }) => ({
          tabBarLabel: "Logs",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Todo"
        component={TodoFullScreen}
        options={({ navigation }) => ({
          tabBarLabel: "Todo",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={({ navigation }) => ({
          tabBarLabel: "Notes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "create" : "create-outline"} size={22} color={color} />
          ),
          headerRight: headerRightButtons(navigation),
        })}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.primary, headerTitleStyle: { color: COLORS.text } }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Insights" component={StatsScreen} options={{ title: "Insights" }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
          <Stack.Screen name="GoalScreen" component={GoalScreen} options={{ title: "Goals" }} />
          <Stack.Screen name="FoodLibrary" component={FoodLibraryScreen} options={{ title: "Food Library" }} />
          <Stack.Screen name="AddFood" component={AddFoodScreen} options={{ title: "Add Food" }} />
          <Stack.Screen name="Camera" component={CameraScreen} options={{ title: "Log Food", headerShown: false }} />
          <Stack.Screen name="TextEntry" component={TextEntryScreen} options={{ title: "Type Food" }} />
          <Stack.Screen name="VoiceEntry" component={VoiceEntryScreen} options={{ title: "Voice Log" }} />
          <Stack.Screen name="SavedMeals" component={SavedMealsScreen} options={{ title: "Saved Meals" }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "Review" }} />
          <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: "Food Details" }} />
          <Stack.Screen name="MealInsights" component={MealInsightsScreen} options={{ title: "Meal Insights" }} />
          <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} options={{ title: "Log Exercise" }} />
          <Stack.Screen name="ExerciseReview" component={ExerciseReviewScreen} options={{ title: "Exercise Review" }} />
          <Stack.Screen name="StepLog" component={StepLogScreen} options={{ title: "Log Steps" }} />
          <Stack.Screen name="BodyMetric" component={BodyMetricScreen} options={{ title: "Body Metrics" }} />
          <Stack.Screen name="HabitStack" component={HabitScreen} options={{ title: "Habits" }} />
          <Stack.Screen name="DescriptiveHabitLog" component={DescriptiveHabitLogScreen} options={{ title: "Log Habit" }} />
          <Stack.Screen name="TodoList" component={TodoScreen} options={{ title: "Todo List" }} />
          <Stack.Screen name="UniversalVoiceLog" component={UniversalVoiceLogScreen} options={{ title: "Voice Log" }} />
          <Stack.Screen name="CreateReminder" component={ReminderCreateScreen} options={{ title: "Set Reminder" }} />
          <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ title: "Note" }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer>
          <ReminderProvider>
            <AppNavigator />
          </ReminderProvider>
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}
