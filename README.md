# 🧠 CogniCare — Cognitive Wellness Mobile App

A cross-platform React Native (Expo) mobile app for **PBDV301 & PBDE401**, designed to support people with cognitive disabilities through reminders, brain exercises, mood tracking, and AI-powered personalised suggestions.

---

## 📋 Problem Statement

People with cognitive disabilities face challenges with memory, focus, and daily organisation. CogniCare addresses this by providing:

- ⏰ **Task & schedule reminders** with push notifications
- 🧠 **Interactive brain exercises** (memory, attention, language, maths)
- 📅 **Daily routine planner** with recurring tasks
- 😊 **Mood & energy logging** with factor tracking
- 📊 **Progress tracking** with charts and trends
- 🤖 **AI-personalised reminders** and suggestions (Claude API)
- 📍 **Nearby support resources** via GPS
- ⚠️ **Alerts for missed tasks** and behavioural pattern detection

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 51) |
| Language | TypeScript |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| Database | expo-sqlite (local, offline-first) |
| Notifications | expo-notifications |
| AI | Anthropic Claude API (claude-haiku) |
| Location | expo-location |
| Sensors | expo-sensors (accelerometer) |
| Camera | expo-camera |
| Haptics | expo-haptics |
| Speech | expo-speech (text-to-speech) |
| Charts | react-native-chart-kit |
| Testing | Jest + jest-expo |

---

## 🚀 Getting Started in VS Code

### Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| VS Code | Latest | https://code.visualstudio.com |
| Expo Go app | Latest | iOS App Store / Google Play |

### 1. Clone / open the project

```bash
cd CogniCare
code .
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your API key

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_ANTHROPIC_KEY=your_claude_api_key_here
```

> Get your key at https://console.anthropic.com

### 4. Start the development server

```bash
npx expo start
```

This opens the **Expo Developer Tools** in your browser.

### 5. Run on a device

**Option A — Physical device (recommended):**
1. Install **Expo Go** from the App Store or Google Play
2. Scan the QR code shown in terminal with your phone camera (iOS) or the Expo Go app (Android)

**Option B — Android emulator:**
```bash
npx expo start --android
```
Requires Android Studio with a virtual device set up.

**Option C — iOS simulator (Mac only):**
```bash
npx expo start --ios
```
Requires Xcode installed.

---

## 📁 Project Structure

```
CogniCare/
├── App.tsx                    # Root entry point
├── app.json                   # Expo config (permissions, icons, etc.)
├── package.json
├── tsconfig.json
├── .env                       # API keys (not committed)
├── .vscode/
│   ├── settings.json          # Editor settings
│   ├── extensions.json        # Recommended extensions
│   └── launch.json            # Debug config
├── assets/                    # Icons, splash screens
└── src/
    ├── constants/
    │   ├── theme.ts            # Colors, fonts, spacing, shadows
    │   ├── types.ts            # TypeScript interfaces
    │   └── exercises.ts        # Exercise definitions + category info
    ├── services/
    │   ├── database.ts         # SQLite CRUD operations
    │   ├── aiService.ts        # Claude API integration
    │   ├── notifications.ts    # Push notification scheduling
    │   └── locationService.ts  # GPS + nearby resources
    ├── screens/
    │   ├── OnboardingScreen.tsx
    │   ├── HomeScreen.tsx       # Dashboard + AI insights
    │   ├── TasksScreen.tsx      # Task manager + add form
    │   ├── ExercisesScreen.tsx  # Brain games (4 interactive games)
    │   ├── ProgressScreen.tsx   # Charts + AI performance analysis
    │   ├── MoodLogScreen.tsx    # Mood & energy logging
    │   └── ProfileScreen.tsx   # Settings, profile, location
    ├── components/
    │   └── UIComponents.tsx    # Reusable: Card, Button, StatCard, etc.
    ├── navigation/
    │   └── AppNavigator.tsx    # Bottom tab + stack navigation
    └── __tests__/
        ├── database.test.ts
        ├── exercises.test.ts
        └── aiService.test.ts
```

---

## 🧪 Running Tests

```bash
npm test
```

Or for a single run:
```bash
npm test -- --watchAll=false
```

Tests cover:
- Task, MoodEntry, and ExerciseSession data model validation
- Exercise definitions completeness and uniqueness
- Theme constants integrity
- AI insight object construction
- Streak calculation logic

---

## 📱 App Screens

### 🏠 Home (Dashboard)
- Personalised greeting with time of day
- AI-generated daily motivation message
- Today's task progress bar
- AI alert card (pattern detection)
- Quick action buttons: Add Task, Log Mood, Exercise
- Today's task list with one-tap completion

### ✅ Tasks
- Filter: Today / All / Completed
- Add task: title, description, category, priority, date/time picker, reminder interval, recurring toggle
- Swipe-to-delete with confirmation
- Priority indicators (high = red dot)
- Category colour chips (8 categories)
- Auto-scheduled push notifications

### 🧠 Brain Exercises
- 8 cognitive exercises across 6 types
- **Memory Match** — emoji card flip game
- **Number Sequence** — repeat spoken number sequences
- **Colour Word** — Stroop effect attention test
- **Mental Maths** — timed arithmetic
- Difficulty badges, duration, point values
- AI cognitive performance analysis
- Session history and accuracy tracking

### 📊 Progress
- 7 / 14 / 30-day period toggle
- Mood trend line chart
- Exercise sessions bar chart
- Task completion ring/bar
- Recent mood log
- AI cognitive insight
- AI scheduling suggestion (optimal task times)

### 😊 Mood Log
- 5-level mood scale with emojis
- 5-level energy scale
- 12 mood factor chips
- Free-text notes
- Text-to-speech confirmation

### 👤 Profile & Settings
- Edit name and caregiver contact
- Toggle push notifications
- Toggle location (shows nearby hospitals, pharmacies, support centres)
- App version info

---

## 🤖 AI Features (Claude API)

| Feature | Description |
|---|---|
| Personalised reminder | Generated from pending tasks + recent mood |
| Cognitive insight | Exercise accuracy + streak analysis |
| Pattern detection | Flags declining mood or 3+ missed tasks |
| Motivation message | Celebrates task completion progress |
| Scheduling suggestion | Recommends optimal times based on energy patterns |

---

## 📋 Rubric Coverage

| # | Criterion | Implementation |
|---|---|---|
| 1 | UI/UX | Custom theme system, smooth navigation, haptic feedback, accessible labels |
| 2 | Functionality | All features implemented, camera/GPS/notifications/sensors used |
| 3 | Reliability | SQLite persistence, error handling, Jest unit tests |
| 4 | Content | AI-generated content, well-structured modular code |
| 5 | Documentation | This README, inline comments, typed interfaces |
| 6 | Value & Impact | Solves real cognitive disability problem, AI + mobile features |
| 7 | Presentation | Clean demo flow, Scrum-ready structure |

---

## 🔑 Environment Variables

```env
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...
```

> **Security note:** Never commit your API key. In production, proxy API calls through your own backend server.

---

## 👥 Team / Scrum Artifacts

- **Product Backlog**: All user stories in GitHub Issues or Trello
- **Sprint Backlog**: 2-week sprints, stories pulled from backlog
- **Definition of Done**: Feature complete + tested + peer-reviewed
- **Retrospectives**: End of each sprint review

---

## 📄 License

For academic submission — PBDV301 & PBDE401, 2026.
