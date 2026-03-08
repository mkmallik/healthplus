# HealthPlus

A comprehensive AI-powered health and wellness tracking platform with a **FastAPI** backend, **React Native (Expo)** mobile app, and **Next.js** web dashboard. Track food, exercise, steps, body metrics, habits, todos, notes, and more — all with intelligent voice logging powered by GPT-4o.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [AI-Powered Features](#ai-powered-features)
- [Screenshots & Navigation](#screenshots--navigation)
- [Business Logic](#business-logic)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

---

## Features

### Core Tracking

- **Food Logging** — Log meals via text, voice, camera, or saved meals. AI estimates calories and macros for Indian and global cuisines with per-item breakdowns.
- **Exercise Logging** — Describe workouts via text or voice. MET-based calorie estimation, intensity classification, muscle group identification.
- **Step Tracking** — Manual entry, voice, or smartwatch screenshot (GPT-4o Vision). One entry per day with replace logic. Steps >= 8,000 auto-log as walking exercise.
- **Body Metrics** — Track weight, waist, and biceps measurements. Natural language parsing ("my weight is 72 kg"). Replace-per-day logic.
- **Nutrition Goals** — Daily targets for calories, protein, carbs, fat, and steps. Body metric targets (weight, waist, biceps) with unit toggles.

### Habits & Productivity

- **Habit Tracking** — Three habit types:
  - **Boolean** — Simple daily check-off (with auto-completion from logged data)
  - **Descriptive** — Journal-style logs via text, voice, or photo (e.g., gratitude, study logs)
  - **Todo** — Full todo lists with carry-over logic for undone items
- **Streaks** — Consecutive day tracking per habit, visible on home screen
- **4 Default Habits** — Log Food, Log Weight, Log Steps, Exercise — auto-complete based on logged data

### Universal Voice Log

The standout feature — a single voice input that intelligently routes to the correct action:

- *"I had 2 rotis and dal for lunch"* → logs food
- *"Ran 5km in 30 minutes"* → logs exercise
- *"12,000 steps today"* → updates steps (and auto-logs walking exercise)
- *"Weight 72 kg"* → logs body metric
- *"For gratitude: thankful for family"* → logs descriptive habit
- *"Add todo: buy groceries"* → adds todo item
- *"Remind me at 5pm to drink water"* → creates reminder with TTS audio
- *"Note: great meeting today"* → saves a note

### Reminders with TTS

- Create reminders via voice or manually
- OpenAI TTS generates spoken audio for each reminder
- Plays reminder audio at the scheduled time (3 repetitions)
- Reminders appear in the Todo screen with play buttons

### Insights & Analytics

- **Daily/Weekly/Monthly Dashboards** — Calorie trends, macro breakdowns, activity summaries
- **Calories Burned** — BMR (Mifflin-St Jeor, prorated) + exercise + steps (0.04 kcal/step)
- **Streaks & Trends** — Time-series charts for calories, steps, exercise, weight
- **Meal Insights** — AI-generated meal-level analysis with health scores, glycemic impact, satiety ratings

### Notes & Journal

- **Notes** — Rich notes with audio transcription and image attachments
- **Logs** — Descriptive habit journal with day/7-day/30-day/all views
- **Search** — Full-text search across notes

---

## Architecture

```
healthplus/
├── backend/     → FastAPI REST API + SQLite database + OpenAI integration
├── mobile/      → React Native Expo app (iOS / Android)
├── web/         → Next.js web dashboard
└── package.json → Root (sharp dependency for image processing)
```

All three frontends connect to the same backend API. The backend handles all AI processing (food analysis, exercise parsing, voice classification, TTS generation) via OpenAI's GPT-4o and Whisper APIs.

---

## Tech Stack

### Backend

| Technology    | Purpose                                |
|--------------|----------------------------------------|
| Python 3.9    | Runtime                                |
| FastAPI 0.115 | REST framework                         |
| SQLAlchemy 2  | ORM (SQLite)                           |
| Pydantic 2    | Request/response validation            |
| OpenAI SDK    | GPT-4o analysis, Whisper transcription, TTS |
| bcrypt        | Password hashing                       |
| Uvicorn       | ASGI server                            |

### Mobile

| Technology              | Purpose                        |
|------------------------|--------------------------------|
| React Native 0.81       | Cross-platform UI              |
| Expo SDK 54              | Dev tooling, native modules    |
| TypeScript 5.9           | Type safety                    |
| React Navigation 7       | Tab + stack navigation         |
| expo-av                  | Audio recording & playback     |
| expo-camera              | Camera access                  |
| react-native-calendars   | Calendar date picker           |
| react-native-chart-kit   | Charts & graphs                |
| Axios                    | HTTP client                    |

### Web

| Technology    | Purpose              |
|--------------|----------------------|
| Next.js 16    | React framework      |
| Tailwind CSS 4 | Styling             |
| Recharts      | Charts & graphs      |
| Lucide React  | Icons                |

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 22+
- [Expo Go](https://expo.dev/go) app on your phone (for mobile dev)
- OpenAI API key

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Seed the database
python3 seed.py               # Creates demo user: demo / demo123
python3 seed_food_library.py  # Populates food library

# Start the server
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Mobile App

```bash
cd mobile
npm install
npx expo start
# Press 'a' for Android emulator, 'i' for iOS simulator
# Or scan QR code with Expo Go on your phone
```

Update the API base URL in `src/api/client.ts`:
- **Emulator**: `http://10.0.2.2:8000/api` (Android) or `http://localhost:8000/api` (iOS)
- **Physical device**: `http://<your-local-ip>:8000/api`
- **Tunnel mode**: `npx expo start --tunnel`

### 3. Web Dashboard

```bash
cd web
npm install
npm run dev
# Opens at http://localhost:3000
```

### Demo Credentials

- **Username**: `demo`
- **Password**: `demo123`

---

## Project Structure

```
healthplus/
│
├── backend/
│   ├── .env                              # API keys (not committed)
│   ├── requirements.txt
│   ├── healthplus.db                     # SQLite database
│   ├── seed.py                           # Seed demo user
│   ├── seed_food_library.py              # Seed food library
│   ├── uploads/                          # User uploads (images, audio, TTS)
│   │
│   └── app/
│       ├── main.py                       # FastAPI app + auto-migration
│       ├── models.py                     # 15 SQLAlchemy models
│       ├── schemas.py                    # Pydantic schemas
│       ├── auth.py                       # Token auth + password hashing
│       ├── config.py                     # Environment settings
│       ├── database.py                   # SQLAlchemy engine
│       │
│       ├── routers/
│       │   ├── auth.py                   # Login, logout, me
│       │   ├── food.py                   # Food log (image/text/voice), CRUD
│       │   ├── exercise.py               # Exercise log, list, delete
│       │   ├── steps.py                  # Step log (auto-exercise >= 8k)
│       │   ├── body_metrics.py           # Weight/waist/biceps log
│       │   ├── habits.py                 # Habits CRUD, logs, todos, streaks
│       │   ├── notes.py                  # Notes CRUD, search
│       │   ├── voice_log.py              # Universal voice log classifier
│       │   ├── reminders.py              # Reminders CRUD + TTS
│       │   ├── dashboard.py              # Daily/weekly/monthly summaries
│       │   ├── stats.py                  # Streaks, trends
│       │   ├── goals.py                  # Goal management
│       │   ├── food_library.py           # Food library search/add
│       │   ├── saved_meals.py            # Saved meal templates
│       │   └── meals.py                  # Meals by date
│       │
│       └── services/
│           ├── openai_service.py         # GPT-4o analysis, Whisper, TTS
│           ├── meal_classifier.py        # Time-based meal classification
│           └── usda_service.py           # USDA FoodData Central
│
├── mobile/
│   ├── App.tsx                           # Root navigator (5 tabs + stacks)
│   └── src/
│       ├── api/client.ts                 # Axios + auth interceptor
│       ├── context/AuthContext.tsx        # Auth state management
│       ├── components/                   # Reusable UI components
│       │   ├── Toast.tsx                 # Toast notifications
│       │   ├── DateNavigator.tsx         # Date picker + calendar
│       │   ├── PeriodToggle.tsx          # Day/7d/30d toggle
│       │   ├── ProgressRing.tsx          # Calorie ring
│       │   ├── MacroBar.tsx              # Macro progress bars
│       │   └── MealSection.tsx           # Meal item groups
│       ├── screens/
│       │   ├── HomeScreen.tsx            # Today tab
│       │   ├── UniversalVoiceLogScreen.tsx # Voice log (mic + classifier)
│       │   ├── HabitsFullScreen.tsx      # Habits tab
│       │   ├── TodoFullScreen.tsx        # Todo tab (+ reminders)
│       │   ├── LogsScreen.tsx            # Logs tab (habits + exercises)
│       │   ├── NotesScreen.tsx           # Notes tab
│       │   ├── StatsScreen.tsx           # Insights (overview/streaks/trends)
│       │   └── ...                       # 15+ additional screens
│       └── utils/constants.ts            # Colors, labels, exercise types
│
└── web/
    └── src/
        ├── app/                          # Next.js pages
        │   ├── login/                    # Auth
        │   └── (authenticated)/          # Protected routes
        │       ├── home/                 # Today view
        │       ├── dashboard/            # Summaries
        │       ├── insights/             # Stats & trends
        │       ├── goals/                # Goal editor
        │       ├── habits/               # Habit management
        │       └── log/                  # Food, exercise, steps, body metrics
        ├── components/                   # Shared UI components
        └── lib/                          # API client, auth, types, utils
```

---

## API Reference

All endpoints are prefixed with `/api`. Authentication is via Bearer token.

### Authentication

| Method | Endpoint          | Description      |
|--------|-------------------|------------------|
| POST   | `/auth/login`     | Login, get token |
| GET    | `/auth/logout`    | Logout           |
| GET    | `/auth/me`        | Get current user |

### Food

| Method | Endpoint          | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | `/food/log`       | Log food (image + optional audio)    |
| POST   | `/food/log-text`  | Log food (text + optional audio)     |
| POST   | `/food/relog`     | Re-log a previous food entry         |
| GET    | `/food/{id}`      | Get food details                     |
| PUT    | `/food/{id}`      | Update food (optional AI recalculate)|
| DELETE | `/food/{id}`      | Delete food entry                    |
| GET    | `/food/recent`    | Recent food entries                  |

### Exercise

| Method | Endpoint            | Description                |
|--------|---------------------|----------------------------|
| POST   | `/exercise/log`     | Log exercise (text/voice)  |
| GET    | `/exercise/?date=`  | Get exercises for date     |
| GET    | `/exercise/recent`  | Recent unique exercises    |
| DELETE | `/exercise/{id}`    | Delete exercise            |

### Steps

| Method | Endpoint         | Description                           |
|--------|------------------|---------------------------------------|
| POST   | `/steps/log`     | Log steps (replaces per day, auto-exercise >= 8k) |
| GET    | `/steps/?date=`  | Get step summary for date             |

### Body Metrics

| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| POST   | `/body-metrics/log`       | Log metric (replaces per day+type) |
| GET    | `/body-metrics/?type=&days=` | Get metric history      |
| DELETE | `/body-metrics/{id}`      | Delete metric              |

### Habits

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/habits`                         | List active habits             |
| POST   | `/habits`                         | Create habit                   |
| PUT    | `/habits/{id}`                    | Update habit                   |
| DELETE | `/habits/{id}`                    | Delete habit                   |
| POST   | `/habits/{id}/log`                | Mark boolean habit complete    |
| DELETE | `/habits/{id}/log?date=`          | Remove habit log               |
| POST   | `/habits/{id}/log-descriptive`    | Log descriptive habit          |
| GET    | `/habits/today?date=`             | All habits with today's status |
| GET    | `/habits/logs?date_from=&date_to=`| Habit logs grouped by date     |
| GET    | `/habits/streaks`                 | Per-habit streak data          |

### Todos (under Habits)

| Method | Endpoint                              | Description         |
|--------|---------------------------------------|---------------------|
| GET    | `/habits/{id}/todos?date=`            | Get todo summary    |
| POST   | `/habits/{id}/todos`                  | Create todo item    |
| PATCH  | `/habits/{id}/todos/{itemId}?date=`   | Toggle done         |
| PATCH  | `/habits/{id}/todos/{itemId}/archive` | Archive item        |
| DELETE | `/habits/{id}/todos/{itemId}`         | Delete item         |

### Notes

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| POST   | `/notes`                      | Create note (multipart)  |
| GET    | `/notes?date=&search=`        | List/search notes        |
| GET    | `/notes/{id}`                 | Get note                 |
| PUT    | `/notes/{id}`                 | Update note              |
| DELETE | `/notes/{id}`                 | Delete note              |

### Voice Log

| Method | Endpoint              | Description                              |
|--------|-----------------------|------------------------------------------|
| POST   | `/voice-log/process`  | Universal voice classifier + action      |

### Reminders

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/reminders?date=`          | List reminders for date  |
| POST   | `/reminders`                | Create reminder + TTS    |
| DELETE | `/reminders/{id}`           | Delete reminder          |
| PATCH  | `/reminders/{id}/trigger`   | Mark as triggered        |

### Dashboard & Stats

| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| GET    | `/dashboard/daily?date=`              | Full daily summary            |
| GET    | `/dashboard/weekly?start_date=`       | Weekly summary                |
| GET    | `/dashboard/monthly?year=&month=`     | Monthly summary               |
| GET    | `/stats/streaks`                      | Category streaks              |
| GET    | `/stats/trends?metric=&period=`       | Time-series trend data        |

### Goals

| Method | Endpoint         | Description        |
|--------|------------------|--------------------|
| GET    | `/goals/active`  | Get active goal    |
| POST   | `/goals`         | Create/update goal |

---

## AI-Powered Features

All AI features use OpenAI's API:

| Feature | Model | Description |
|---------|-------|-------------|
| Food analysis (text) | GPT-4o | Calorie/macro estimation with Indian food reference data |
| Food analysis (image) | GPT-4o Vision | Portion estimation from food photos |
| Multi-food separation | GPT-4o | Split "2 rotis and dal" into individual items |
| Exercise analysis | GPT-4o | MET-based calorie estimation from descriptions |
| Step extraction | GPT-4o Vision | Read step count from smartwatch screenshots |
| Body metric parsing | GPT-4o | Extract weight/waist from natural language |
| Voice transcription | Whisper | Audio-to-text for all voice inputs |
| Voice classification | GPT-4o | Route voice input to correct action category |
| Habit image description | GPT-4o Vision | Summarize habit log photos |
| Text refinement | GPT-4o Mini | Clean up raw voice transcriptions |
| TTS generation | TTS-1 | Generate spoken audio for reminders |
| Meal insights | GPT-4o | Holistic meal analysis (health score, glycemic impact, synergies) |

### Indian Food Specialization

The food analysis prompts include comprehensive calorie reference data for:
- Breads (roti, paratha, naan, puri, bhatura, kulcha, thepla)
- Rice dishes (pulao, biryani, khichdi, curd rice)
- Dals & curries (dal tadka, rajma, paneer butter masala, chicken curry)
- South Indian (dosa, idli, vada, uttapam, pongal)
- Street food (pav bhaji, samosa, pani puri, bhel puri)
- Sweets (gulab jamun, barfi, jalebi, kheer)
- Beverages (chai, lassi, buttermilk, filter coffee)
- Common items (eggs, bread, fruits, biscuits)

---

## Screenshots & Navigation

### Mobile App — Bottom Tabs

| Tab | Icon | Screen | Description |
|-----|------|--------|-------------|
| Today | Sun | HomeScreen | Calorie ring, macros, activity row, calories burned, exercises, meals |
| Habits | Sparkles | HabitsFullScreen | Habit list with action sheets, create/edit, streaks |
| Logs | Book | LogsScreen | Descriptive habit journal + exercise logs |
| Todo | Checkbox | TodoFullScreen | Todo lists with carry-over + reminders |
| Notes | Pen | NotesScreen | Notes with search + audio/image |

### Header Icons (all tabs)
- **Insights** (chart icon) — Overview, streaks, trends with charts
- **Settings** (gear icon) — Goals, food library, logout

### Key Screens
- **UniversalVoiceLogScreen** — Animated mic button, example phrases, category-colored result cards
- **FoodExerciseTab** — Dual FAB (purple mic + green add), streak banner, calorie ring, macro bars
- **StatsScreen** — Weekly/monthly toggles, bar/line charts, streak cards

### Design System
- **Theme**: Dark mode (`#0D1117` background, `#1A1F2E` surface)
- **Primary**: `#00D4AA` (teal green)
- **Cards**: Rounded corners, left color accents, subtle shadows
- **Notifications**: Slide-in toast (success/error/info, auto-dismiss 2.5s)

---

## Business Logic

### Food Logging
- Multiple entry methods: camera, text, voice, relog recent, saved meals
- Multi-food separation: "2 rotis, dal, and salad" creates 3 separate food entries
- Auto meal classification: breakfast (6-10), lunch (11-14), dinner (17-21), snack (other)
- AI recalculation: re-analyze existing food entries with updated descriptions

### Steps & Exercise
- **1 step entry per day** — new logs replace existing for the same date
- **Steps >= 8,000** automatically create/update a "walking" exercise entry with:
  - Duration: ~15 min per km (~1,300 steps/km)
  - Calories: 0.04 kcal per step
  - Intensity: moderate (<12k) or high (>=12k)
- Exercise auto-completion threshold for habits: 8,000 steps

### Body Metrics
- **Replace per day+type** — logging weight on a day that already has weight replaces it
- Supports weight (kg/lbs), waist (cm/inches), biceps (cm/inches)

### Todos
- **Carry-over**: Undone, unarchived items from previous days appear on current date
- **Completion**: Todo habit is complete when >= 1 item exists AND all active items are done
- Items done on a specific date show on that date's view

### Calories Burned
- **BMR**: Mifflin-St Jeor formula (simplified), prorated to current time for today
- **Exercise**: Sum of all logged exercise calories
- **Steps**: 0.04 kcal per step
- **Net**: Consumed - Total Burned

### Habits Auto-Completion
Four default habits auto-complete when corresponding data is logged:
- "Log Food" — any food logged for the day
- "Log Weight" — weight body metric logged
- "Log Steps" — step entry exists
- "Exercise" — exercise entry exists OR steps >= 8,000

### Reminders
- Created via voice log or manually
- TTS audio generated via OpenAI TTS-1 (alloy voice)
- 30-second polling checks current time against reminder times
- Plays TTS audio 3 times when triggered
- Marked as triggered after playback

---

## Environment Variables

### `backend/.env`

```env
OPENAI_API_KEY=sk-...           # Required — GPT-4o, Whisper, TTS
USDA_API_KEY=...                # Optional — USDA FoodData Central
```

---

## Database

SQLite file at `backend/healthplus.db`. Auto-migration runs on startup — new columns are added automatically via `ALTER TABLE` in `main.py`'s lifespan handler.

### Models (15)

| Model | Description |
|-------|-------------|
| User | Username, password hash, auth token |
| Meal | Date, meal type (breakfast/lunch/dinner/snack) |
| Food | Calories, macros, AI analysis (JSON) |
| Goal | Daily targets + body metric targets |
| FoodLibrary | Pre-loaded foods with per-100g nutrition |
| SavedMeal / SavedMealItem | Reusable meal templates |
| Exercise | Type, duration, calories, intensity, muscle groups |
| StepEntry | Daily step count with source tracking |
| BodyMetric | Weight/waist/biceps with units |
| Habit | Boolean/descriptive/todo types |
| HabitLog | Dated habit completion records |
| TodoItem | Todo text, done status, carry-over |
| Note | Title, content, audio/image paths |
| Reminder | Time, text, TTS audio path, triggered status |
| Log | Activity log for audit trail |

---

## Seed Data

```bash
cd backend
python3 seed.py               # Creates user: demo / demo123
python3 seed_food_library.py  # 50+ food library entries
```

---

## License

Private project. All rights reserved.
