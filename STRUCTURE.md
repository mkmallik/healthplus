# HealthPlus — Project Structure

A full-stack health & wellness tracking app with a **FastAPI** backend, **React Native (Expo)** mobile app, and **Next.js** web app.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Tech Stack](#tech-stack)
- [How the App Was Created](#how-the-app-was-created)
- [Project Tree](#project-tree)
- [Backend](#backend)
- [Mobile App](#mobile-app)
- [Web App](#web-app)
- [API Reference](#api-reference)
- [Development Setup](#development-setup)
- [Environment Variables](#environment-variables)

---

## High-Level Overview

```
healthplus/
├── backend/     → FastAPI REST API + SQLite database
├── mobile/      → React Native Expo app (iOS / Android / Web)
├── web/         → Next.js web dashboard
├── package.json → Root (sharp dependency for image processing)
└── .gitignore
```

---

## Tech Stack

### Backend

| Technology   | Version  | Purpose                          |
|-------------|----------|----------------------------------|
| Python       | 3.9      | Runtime                          |
| FastAPI      | 0.115.0  | REST framework                   |
| Uvicorn      | 0.30.6   | ASGI server                      |
| SQLAlchemy   | 2.0.35   | ORM                              |
| SQLite       | —        | Database (file-based)            |
| Pydantic     | 2.9.2    | Request/response validation      |
| OpenAI SDK   | ≥1.51.0  | GPT-4o / GPT-4o Vision analysis  |
| bcrypt       | 4.2.0    | Password hashing                 |
| httpx        | ≥0.27.0  | Async HTTP client (USDA API)     |

### Mobile

| Technology              | Version    | Purpose                     |
|------------------------|------------|-----------------------------|
| React Native            | 0.81.5     | Cross-platform UI           |
| React                   | 19.1.0     | UI library                  |
| Expo                    | ~54.0.33   | Development & build tooling |
| TypeScript              | ~5.9.2     | Type safety                 |
| React Navigation        | 7.x        | Navigation (tabs + stack)   |
| Axios                   | 1.13.5     | HTTP client                 |
| expo-camera             | ~17.0.10   | Camera access               |
| expo-av                 | ~16.0.8    | Audio recording             |
| expo-image-picker       | ~17.0.10   | Photo library access        |
| react-native-calendars  | 1.1314.0   | Calendar date picker        |
| react-native-chart-kit  | 6.12.0     | Charts & graphs             |

### Web

| Technology   | Version  | Purpose                 |
|-------------|----------|-------------------------|
| Next.js      | 16.1.6   | React framework (SSR)   |
| React        | 19.2.3   | UI library              |
| TypeScript   | 5        | Type safety             |
| Tailwind CSS | 4        | Utility-first CSS       |
| Recharts     | 3.7.0    | Charts & graphs         |
| Lucide React | 0.574.0  | Icon library            |
| Axios        | 1.13.5   | HTTP client             |

---

## How the App Was Created

### Mobile App (Expo Go)

The mobile app was bootstrapped with **Expo CLI** and runs via **Expo Go** during development.

```bash
# 1. Create the project
npx create-expo-app@latest healthplus/mobile --template blank-typescript

# 2. Install core dependencies
cd healthplus/mobile
npx expo install expo-camera expo-av expo-image-picker expo-status-bar
npx expo install react-native-safe-area-context react-native-screens react-native-svg
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install @react-native-async-storage/async-storage axios
npm install react-native-chart-kit react-native-calendars react-native-keyboard-aware-scroll-view

# 3. Run with Expo Go
npx expo start
# Scan the QR code with Expo Go app on your phone
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

**Key Expo configuration** (`app.json`):
- **SDK**: Expo 54
- **UI style**: Dark mode (`userInterfaceStyle: "dark"`)
- **New Architecture**: Enabled (`newArchEnabled: true`)
- **Package name**: `com.healthplus.app`
- **Splash background**: `#0D1117` (dark theme)
- **Plugins**: `expo-camera`, `expo-av`, `expo-image-picker` (with permission messages)
- **Permissions**: Camera, microphone, storage, internet

**Running on a physical device**:
1. Install [Expo Go](https://expo.dev/go) on your iOS/Android device
2. Run `npx expo start` in the `mobile/` directory
3. Scan the QR code shown in the terminal
4. The app connects to the backend via the API base URL configured in `src/api/client.ts`

**For tunnel mode** (when device is on a different network):
```bash
npx expo start --tunnel
```
This uses `@expo/ngrok` (included in dependencies) to create a public tunnel.

### Backend

```bash
cd healthplus/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env with your keys
echo "OPENAI_API_KEY=sk-..." > .env

# Seed the database
python3 seed.py
python3 seed_food_library.py

# Run
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Web App

```bash
npx create-next-app@latest healthplus/web --typescript --tailwind --eslint --app
cd healthplus/web
npm install axios recharts lucide-react
npm run dev
```

---

## Project Tree

```
healthplus/
│
├── .gitignore
├── package.json                          # Root package (sharp)
│
├── backend/
│   ├── .env                              # API keys (not committed)
│   ├── requirements.txt                  # Python dependencies
│   ├── healthplus.db                     # SQLite database (not committed)
│   ├── seed.py                           # Seed demo user & sample data
│   ├── seed_food_library.py              # Seed food library entries
│   ├── uploads/                          # User-uploaded images & audio
│   │   └── .gitkeep
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                       # FastAPI app, CORS, router registration
│       ├── models.py                     # SQLAlchemy ORM models (14 models)
│       ├── schemas.py                    # Pydantic request/response schemas
│       ├── auth.py                       # JWT auth, password hashing
│       ├── config.py                     # Environment settings
│       ├── database.py                   # SQLAlchemy engine & session
│       │
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── auth.py                   # /api/auth — login, logout, me
│       │   ├── food.py                   # /api/food — log (image/text), relog, CRUD
│       │   ├── food_library.py           # /api/food-library — search, add, list
│       │   ├── saved_meals.py            # /api/saved-meals — CRUD
│       │   ├── meals.py                  # /api/meals — get meals by date
│       │   ├── exercise.py               # /api/exercise — log, list, recent, delete
│       │   ├── steps.py                  # /api/steps — log (1/day replace), list
│       │   ├── body_metrics.py           # /api/body-metrics — log, list, delete
│       │   ├── goals.py                  # /api/goals — active, create
│       │   ├── dashboard.py              # /api/dashboard — daily, weekly, monthly
│       │   ├── stats.py                  # /api/stats — streaks, trends
│       │   ├── habits.py                 # /api/habits — CRUD, logs, todos
│       │   └── notes.py                  # /api/notes — CRUD, search, date range
│       │
│       └── services/
│           ├── __init__.py
│           ├── openai_service.py         # GPT-4o analysis (food, exercise, steps, habits)
│           ├── meal_classifier.py        # Auto-classify meal type by time
│           └── usda_service.py           # USDA FoodData Central lookup
│
├── mobile/
│   ├── app.json                          # Expo configuration
│   ├── eas.json                          # EAS Build config
│   ├── package.json                      # npm dependencies
│   ├── tsconfig.json                     # TypeScript config (strict)
│   ├── index.ts                          # Entry point
│   ├── App.tsx                           # Root: Tab navigator + stack screens + Toast
│   │
│   ├── assets/
│   │   ├── icon.png                      # App icon (1024x1024)
│   │   ├── adaptive-icon.png             # Android adaptive icon
│   │   ├── favicon.png                   # Web favicon (48x48)
│   │   └── splash-icon.png              # Splash screen icon
│   │
│   └── src/
│       ├── api/
│       │   └── client.ts                 # Axios instance, auth token interceptor
│       │
│       ├── context/
│       │   └── AuthContext.tsx            # useAuth hook, login/logout, token persistence
│       │
│       ├── components/
│       │   ├── Toast.tsx                 # ToastProvider + useToast hook
│       │   ├── DateNavigator.tsx         # Date arrows + calendar modal
│       │   ├── PeriodToggle.tsx          # Day / 7 Days / 30 Days segmented control
│       │   ├── ProgressRing.tsx          # Circular calorie progress ring
│       │   ├── MacroBar.tsx              # Protein / Carbs / Fat progress bar
│       │   ├── NutritionCard.tsx         # 4-stat nutrition summary
│       │   ├── MealSection.tsx           # Meal items grouped by type
│       │   └── WeeklyChart.tsx           # Bar chart for weekly data
│       │
│       ├── screens/
│       │   ├── LoginScreen.tsx           # Auth screen
│       │   ├── HomeScreen.tsx            # Today tab — DateNavigator + FoodExerciseTab
│       │   ├── SettingsScreen.tsx        # Goals, Food Library, Logout
│       │   ├── AddFoodScreen.tsx         # Log hub — 8 entry cards
│       │   ├── TextEntryScreen.tsx       # Text food entry
│       │   ├── VoiceEntryScreen.tsx      # Voice food entry
│       │   ├── CameraScreen.tsx          # Camera food entry
│       │   ├── ReviewScreen.tsx          # Multi-food review
│       │   ├── FoodDetailScreen.tsx      # Food item detail + AI recalculate
│       │   ├── FoodLibraryScreen.tsx     # Browse / add to library
│       │   ├── SavedMealsScreen.tsx      # Saved meal templates
│       │   ├── GoalScreen.tsx            # Daily targets + body metric goals
│       │   ├── ExerciseLogScreen.tsx     # Log exercise (text/voice)
│       │   ├── ExerciseReviewScreen.tsx  # Review exercise analysis
│       │   ├── StepLogScreen.tsx         # Log steps (manual / watch image)
│       │   ├── BodyMetricScreen.tsx      # Log weight / waist / biceps
│       │   ├── HabitsFullScreen.tsx      # Habits tab — DateNavigator + habit list
│       │   ├── HabitScreen.tsx           # Standalone habit screen (legacy)
│       │   ├── DescriptiveHabitLogScreen.tsx  # Log descriptive habit
│       │   ├── TodoFullScreen.tsx        # Todo tab — DateNavigator + todo list
│       │   ├── TodoScreen.tsx            # Todo list screen
│       │   ├── LogsScreen.tsx            # Logs tab — descriptive habit journal
│       │   ├── NotesScreen.tsx           # Notes tab — date nav + search
│       │   ├── NoteEditorScreen.tsx      # Create / edit notes
│       │   ├── StatsScreen.tsx           # Insights — Overview / Streaks / Trends
│       │   ├── DashboardScreen.tsx       # Legacy (merged into Insights)
│       │   ├── MealInsightsScreen.tsx    # Meal analysis
│       │   │
│       │   └── tabs/
│       │       ├── types.ts              # Shared interfaces (DailyData, TabProps, etc.)
│       │       ├── FoodExerciseTab.tsx    # Calories, macros, activity, meals
│       │       ├── HabitsTab.tsx          # Habit list + action sheets
│       │       ├── LogsTab.tsx            # Descriptive habit logs journal
│       │       └── TodoTab.tsx            # Todo list with checkboxes
│       │
│       └── utils/
│           └── constants.ts              # Colors, calorie refs, MET values
│
└── web/
    ├── package.json                      # npm dependencies
    ├── tsconfig.json                     # TypeScript config (strict, path alias @/*)
    ├── next.config.ts                    # Next.js config
    ├── postcss.config.mjs                # PostCSS + Tailwind
    ├── eslint.config.mjs                 # ESLint config
    │
    ├── public/                           # Static assets (SVGs)
    │
    └── src/
        ├── app/
        │   ├── layout.tsx                # Root layout + providers
        │   ├── page.tsx                  # Redirect → /home
        │   ├── globals.css               # Tailwind globals
        │   ├── favicon.ico
        │   │
        │   ├── login/
        │   │   └── page.tsx              # Login page
        │   │
        │   └── (authenticated)/          # Protected route group
        │       ├── layout.tsx            # Sidebar + header icons
        │       ├── home/page.tsx         # Today view
        │       ├── dashboard/page.tsx    # Weekly/monthly summary
        │       ├── insights/page.tsx     # Stats, streaks, trends
        │       ├── goals/page.tsx        # Goals editor
        │       ├── habits/page.tsx       # Habits management
        │       ├── review/page.tsx       # Multi-food review
        │       │
        │       └── log/
        │           ├── page.tsx          # Log hub (6 cards)
        │           ├── food-image/page.tsx
        │           ├── food-text/page.tsx
        │           ├── food-voice/page.tsx
        │           ├── exercise/page.tsx
        │           ├── exercise/review/page.tsx
        │           ├── steps/page.tsx
        │           └── body-metrics/page.tsx
        │
        ├── components/
        │   ├── Sidebar.tsx               # Navigation sidebar
        │   ├── TabBar.tsx                # Tab switcher
        │   ├── DateNavigator.tsx         # Date picker
        │   ├── Toast.tsx                 # Toast notifications
        │   ├── Spinner.tsx               # Loading spinner
        │   ├── AudioRecorder.tsx         # Web audio recording
        │   ├── HabitIcon.tsx             # Habit icon renderer
        │   ├── HabitModal.tsx            # Habit create/edit modal
        │   ├── ActivityCard.tsx          # Exercise/steps/metrics card
        │   ├── CaloriesBurnedCard.tsx    # Burned breakdown (BMR/exercise/steps)
        │   ├── TrendsChart.tsx           # Bar/Line charts for trends
        │   ├── WeeklyChart.tsx           # Weekly bar chart
        │   ├── ProgressRing.tsx          # Circular progress ring
        │   ├── NutritionCard.tsx         # Nutrition display
        │   ├── MacroBar.tsx              # Macro progress bar
        │   └── MealSection.tsx           # Meals by type
        │
        └── lib/
            ├── api.ts                    # Axios API client
            ├── auth-context.tsx          # useAuth hook + context
            ├── constants.ts              # Colors, icons, config
            ├── types.ts                  # TypeScript interfaces
            └── utils.ts                  # Helper functions
```

---

## Backend

### Database Models

| Model          | Key Fields                                                         |
|---------------|--------------------------------------------------------------------|
| User           | username, password_hash, name, auth_token                         |
| Goal           | calories, protein, carbs, fat, daily_steps, target_weight/waist/biceps |
| Meal           | date, meal_type, description                                       |
| Food           | name, quantity, unit, calories, protein, carbs, fat, analysis      |
| FoodLibrary    | name, calories, protein, carbs, fat (per user)                    |
| SavedMeal      | name → SavedMealItem[]                                            |
| Exercise       | exercise_type, duration_minutes, intensity, calories_burned, summary |
| StepEntry      | date, step_count, source (manual/image)                           |
| BodyMetric     | date, metric_type (weight/waist/biceps), value, unit              |
| Habit          | name, icon, color, habit_type (boolean/descriptive/todo), frequency |
| HabitLog       | date, content, image_url, log_type                                |
| TodoItem       | text, is_done, done_date, is_archived (carry-over logic)          |
| Note           | title, content, date, audio_path, image_path                     |

### AI-Powered Features (via OpenAI GPT-4o)

- **Food analysis**: Estimate calories & macros from text descriptions or food photos
- **Exercise analysis**: Parse exercise descriptions, estimate calories via MET values
- **Step extraction**: Read step count from smartwatch screenshots (GPT-4o Vision)
- **Body metric extraction**: Parse natural language ("I weigh 72kg") into structured data
- **Habit descriptions**: Analyze habit log images
- **Note transcription**: Transcribe audio recordings to text

### Special Business Logic

- **Steps**: 1 entry per day — new log replaces existing for same date
- **Body metrics**: Latest-only per date+type — replaces existing on re-log
- **Todo carry-over**: Undone, unarchived todo items automatically carry forward to current date
- **Calories burned**: BMR (Mifflin-St Jeor, prorated) + exercise + steps (0.04 kcal/step)
- **Auto-migration**: `main.py` lifespan adds new columns via `ALTER TABLE` if missing

---

## Mobile App

### Navigation Structure

```
Bottom Tabs (5)
├── Today (sunny icon)      → HomeScreen → FoodExerciseTab
├── Habits (repeat icon)    → HabitsFullScreen
├── Todo (checkbox icon)    → TodoFullScreen
├── Logs (book icon)        → LogsScreen
└── Notes (create icon)     → NotesScreen

Header Icons (all tabs)
├── Insights (stats-chart)  → StatsScreen (stack)
└── Settings (gear)         → SettingsScreen (stack)

Stack Screens
├── GoalScreen, FoodLibraryScreen (from Settings)
├── AddFoodScreen, TextEntryScreen, VoiceEntryScreen, CameraScreen
├── ReviewScreen, FoodDetailScreen, SavedMealsScreen
├── ExerciseLogScreen, ExerciseReviewScreen
├── StepLogScreen, BodyMetricScreen
├── DescriptiveHabitLogScreen, TodoScreen
└── NoteEditorScreen
```

### Design System

- **Theme**: Dark mode (`#0D1117` background)
- **Shadows**: Deeper shadows (opacity 0.12, elevation 6, radius 3)
- **Accents**: Green primary, colored left-border cards per category
- **Icons**: Ionicons via `@expo/vector-icons`
- **Notifications**: Toast component (slide-in, auto-dismiss 2.5s)
- **Date navigation**: Arrow buttons + calendar modal (react-native-calendars)

---

## Web App

### Route Structure

```
/login                          → Login page
/home                           → Today view (date nav + activity summary)
/dashboard                      → Weekly/monthly summaries
/insights                       → Stats, streaks, trends
/goals                          → Daily + body metric targets
/habits                         → Habit management
/log                            → Log hub (6 entry cards)
/log/food-image                 → Image food entry
/log/food-text                  → Text food entry
/log/food-voice                 → Voice food entry
/log/exercise                   → Exercise log
/log/exercise/review            → Exercise review
/log/steps                      → Steps log
/log/body-metrics               → Body metrics log
/review                         → Multi-food review
```

### Layout

- **Sidebar**: 5 navigation links (Today / Dashboard / Insights / Goals / Log)
- **Authenticated layout**: Wraps all protected routes with sidebar + auth check
- **Styling**: Tailwind CSS v4 utility classes, dark theme

---

## API Reference

All endpoints are prefixed with `/api`.

| Group          | Prefix             | Key Endpoints                                                  |
|---------------|--------------------|-----------------------------------------------------------------|
| Auth           | `/api/auth`        | `POST /login`, `GET /logout`, `GET /me`                       |
| Food           | `/api/food`        | `POST /log`, `POST /log-text`, `POST /relog`, `GET /{id}`, `PUT /{id}`, `GET /recent` |
| Food Library   | `/api/food-library`| `GET /search`, `POST /add`, `GET /`                           |
| Saved Meals    | `/api/saved-meals` | `POST /`, `GET /`, `GET /{id}`, `DELETE /{id}`                |
| Meals          | `/api/meals`       | `GET /?date=`                                                  |
| Exercise       | `/api/exercise`    | `POST /log`, `GET /?date=`, `GET /recent`, `DELETE /{id}`     |
| Steps          | `/api/steps`       | `POST /log`, `GET /?date=`                                     |
| Body Metrics   | `/api/body-metrics`| `POST /log`, `GET /?type=&days=`, `DELETE /{id}`              |
| Goals          | `/api/goals`       | `GET /active`, `POST /`                                        |
| Dashboard      | `/api/dashboard`   | `GET /daily`, `GET /weekly`, `GET /monthly`                    |
| Stats          | `/api/stats`       | `GET /streaks`, `GET /trends?metric=&period=`                  |
| Habits         | `/api/habits`      | CRUD, `GET /today`, `GET /logs`, `GET /streaks`, `POST /{id}/log`, `POST /{id}/log-descriptive`, todo endpoints |
| Notes          | `/api/notes`       | `POST /`, `GET /?date=&search=`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` |
| Health         | `/api/health`      | `GET /` → `{ status: "ok" }`                                  |

---

## Development Setup

### Prerequisites

- Python 3.9+
- Node.js 22+
- npm
- [Expo Go](https://expo.dev/go) app on your phone (for mobile development)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Add your OPENAI_API_KEY
python3 seed.py               # Create demo user (demo / demo123)
python3 seed_food_library.py  # Seed food library
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Mobile

```bash
cd mobile
npm install
npx expo start
# Press 'a' for Android, 'i' for iOS, or scan QR with Expo Go
```

Update the API base URL in `src/api/client.ts` to point to your backend:
- Emulator: `http://10.0.2.2:8000/api` (Android) or `http://localhost:8000/api` (iOS)
- Physical device: `http://<your-ip>:8000/api`
- Tunnel mode: Use the ngrok URL

### 3. Web

```bash
cd web
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## Environment Variables

### `backend/.env`

```
OPENAI_API_KEY=sk-...           # Required — GPT-4o food/exercise analysis
USDA_API_KEY=...                # Optional — USDA FoodData Central lookup
SECRET_KEY=your-secret-key      # JWT signing key
```

---

## Seed Data

- **Demo user**: `demo` / `demo123` (user id = 1)
- Run `python3 seed.py` to create the user
- Run `python3 seed_food_library.py` to populate the food library
