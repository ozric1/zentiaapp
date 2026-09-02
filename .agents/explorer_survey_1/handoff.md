# Codebase Survey & Architecture Report

## 1. Observation

### 1.1 Requirements Analysis (`ORIGINAL_REQUEST.md`)
- **R1: Authentication System**:
  - Implement login page supporting Email/Password and Google Sign-In.
  - Protect core routes (`/dashboard`, `/programs/business-english`) so unauthenticated users redirect to `/login`.
  - Firebase project: `zentia-573f8`.
- **R2: Robust Firestore Progress Tracking**:
  - Migrate existing `localStorage` progress logic (`zentia_last_lesson`, `zentia_completed`) to Firestore.
  - Store completed lessons array, quiz scores, and detailed progress metrics under the user's UID.
  - High concurrency resilience, robust error handling, and loading states.
- **R3: Personalized Dashboard & Resume Learning**:
  - Display authenticated user profile and real-time progress metrics from Firestore.
  - Provide a "Continue Learning" mechanism identifying the last/next lesson and routing to it.

### 1.2 Tech Stack & Dependencies (`package.json`)
- **Language & Runtime**: TypeScript 5.8.2 (`tsconfig.json`), Node.js (ES module `"type": "module"`).
- **Core Dependencies**:
  - `react`: `^19.2.0`
  - `react-dom`: `^19.2.0`
  - `react-router-dom`: `^7.14.2`
  - `lucide-react`: `^1.11.0`
  - `@google/genai`: `^1.30.0`
- **Dev Dependencies & Tooling**:
  - `vite`: `^6.2.0` (Vite v6.4.2 runtime)
  - `@vitejs/plugin-react`: `^5.0.0`
  - `@types/node`: `^22.14.0`
  - `typescript`: `~5.8.2`
- **Missing Core Libraries**:
  - `firebase` package is not yet installed in `package.json`.
  - No automated test runner (e.g., `vitest`, `@testing-library/react`) is currently in `package.json`.

### 1.3 Build, Run, & Test Configuration
- **Vite Config (`vite.config.ts`)**:
  - Dev server: Port 3000, host `0.0.0.0`.
  - Aliases: `@` maps to `.`.
  - Defines `process.env.API_KEY` and `process.env.GEMINI_API_KEY` from `GEMINI_API_KEY` env var.
- **Build Verification**:
  - Command: `npm run build` executed `vite build`.
  - Result: Successful compilation (`1776 modules transformed`, output in `dist/`, exit code 0).
- **Styling Setup**:
  - CDN-loaded Tailwind CSS (`<script src="https://cdn.tailwindcss.com"></script>` in `index.html`).
  - FontAwesome icons CDN (`cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`).
  - Google Fonts (`Plus Jakarta Sans`, `Playfair Display`).
- **Backend Service (`server/`)**:
  - Express server in `server/server.js` running on port 3001 with `@google/genai`, `cors`, `multer`.
  - Endpoints: `/api/sandbox`, `/api/translate`, `/api/analyze-video`.

### 1.4 Codebase Structure & File Mapping
- **Entry & Root**:
  - `index.html`: Base HTML template, CDN imports, root `div#root`.
  - `index.tsx`: Application entry point; mounts `<App />` from `./src/App`.
  - `App.tsx` (in root): Legacy single-page viewer (superseded by `src/App.tsx`).
- **Routing (`src/App.tsx`)**:
  - Route `/` -> `<LandingPage />` (`src/pages/LandingPage.tsx`)
  - Route `/programs/business-english` -> `<CourseViewer />` (`src/pages/CourseViewer.tsx`)
  - Route `/dashboard` -> `<Dashboard />` (`src/pages/Dashboard.tsx`)
- **Pages**:
  - `src/pages/LandingPage.tsx`: Marketing landing page with hero, value props, featured programs, links to `/dashboard` and `/programs/business-english`, placeholder login button.
  - `src/pages/CourseViewer.tsx`: The 15-module Executive Business English program viewer. Currently uses `localStorage.getItem('zentia_last_lesson')` and `localStorage.getItem('zentia_completed')`.
  - `src/pages/Dashboard.tsx`: Learner dashboard with tabbed AI tools (`overview`, `sandbox`, `translator`, `video`). Overview tab currently contains static mock data (`Alex Director`, mock logs), with no Firestore connection or "Continue Learning" CTA.
- **Curriculum & Data**:
  - `constants.ts`: Contains `COURSE_DATA` mapping lesson IDs (0: Intro, 1-15: Units 1-15, 101-105: Module 1-5 Progress Check Quizzes).
  - `types.ts`: Type definitions (`LessonData`, `Slide`, `QuizQuestion`, `ExpressionBank`, `VocabItem`, etc.).
- **Components (`components/` & `src/components/tools/`)**:
  - `components/Sidebar.tsx`: Navigation sidebar for the 15 units + 5 progress checks.
  - `components/LessonView.tsx`: Core unit renderer (Intro view, Quiz view, Standard lesson view).
  - `components/ProgressCheck.tsx`: Quiz component for units 101-105; calculates scores on submit.
  - `components/ChatWidget.tsx`: Floating AI executive coach powered by `@google/genai`.
  - `src/components/tools/`: `CommunicationSandbox.tsx`, `TechnicalTranslator.tsx`, `VideoAnalysis.tsx`.

---

## 2. Logic Chain

1. **Routing and Entry Point**:
   - `index.html` loads `index.tsx`, which mounts `src/App.tsx`.
   - `src/App.tsx` uses `react-router-dom` to route `/`, `/programs/business-english`, and `/dashboard`.
   - *Inference*: Adding `/login` and wrapping `/dashboard` & `/programs/business-english` in a `ProtectedRoute` component will cleanly enforce authentication requirements without disturbing existing routing architecture.

2. **Authentication Layer**:
   - The application requires Firebase Auth with Email/Password and Google Sign-In for project `zentia-573f8`.
   - *Inference*: A centralized `src/firebase/firebase.ts` (or `src/services/firebase.ts`) initialization module is needed, accompanied by an `AuthContext` (`src/context/AuthContext.tsx` or `src/hooks/useAuth.ts`) providing `currentUser`, `loading`, `loginWithEmail`, `signupWithEmail`, `loginWithGoogle`, and `logout`.
   - *Inference*: In demo mode (integrity mode: demo), providing resilient fallback/demo credentials or mock-auth if Firebase remote service credentials or network is offline ensures flawless testability and demo execution.

3. **Progress Tracking Migration**:
   - In `src/pages/CourseViewer.tsx`: lines 12-30 initialize and persist `currentLessonId` and `completedLessons` directly to `localStorage` (`zentia_last_lesson` and `zentia_completed`).
   - In `components/ProgressCheck.tsx`: `handleSubmit` calculates `score` but does not persist quiz scores anywhere.
   - *Inference*: A Firestore user document structure (e.g. `users/{uid}` or `users/{uid}/progress/business-english`) needs to be defined:
     ```ts
     interface UserProgress {
         lastLessonId: number;
         completedLessons: number[];
         quizScores: Record<string, number>; // e.g. { "101": 100, "102": 80 }
         updatedAt: string | number;
     }
     ```
   - *Inference*: A dedicated progress service (`src/services/progressService.ts` or hook `src/hooks/useUserProgress.ts`) will handle fetching, real-time subscription/caching, optimistic updates, and fallback handling.
   - *Inference*: `CourseViewer.tsx` should use the progress hook instead of `localStorage`.
   - *Inference*: `ProgressCheck.tsx` should pass submitted quiz scores to `onComplete` or a score callback to save to Firestore.

4. **Personalized Dashboard**:
   - `src/pages/Dashboard.tsx` currently renders hardcoded `Alex Director` and mock nudge logs.
   - *Inference*: To fulfill R3 and Acceptance Criteria:
     - Replace static user profile with dynamic `currentUser.displayName || currentUser.email`.
     - Display dynamic stats: Course progress %, Completed Lessons count (out of 15), Average/Latest Quiz scores, and competency status.
     - Add a prominent "Continue Learning" / "Resume Course" card that calculates the next unfinished lesson (or `lastLessonId`) and links directly to `/programs/business-english`.
     - Provide a Logout button in the header/sidebar for seamless authentication state management.

---

## 3. Caveats

- **Firebase Config**: The prompt specifies Firebase project `zentia-573f8`. A complete Firebase config with project ID `zentia-573f8` (and environment variable support / demo fallback) must be configured in the codebase.
- **Node/Browser Compatibility**: `@google/genai` is loaded both in the Vite frontend (defined via `process.env.GEMINI_API_KEY`) and in `server/server.js`. The Firebase integration is frontend client-side.
- **Tailwind Setup**: Tailwind is loaded via CDN `<script src="https://cdn.tailwindcss.com"></script>` rather than a PostCSS build pipeline, which means custom Tailwind utility classes work immediately in all React TSX files.
- **Legacy Files**: `App.tsx` exists at the root, but `index.tsx` explicitly imports `./src/App`. Root `App.tsx` can be left intact or aligned to avoid confusion.

---

## 4. Conclusion

The application is well-structured with modern React 19 + TypeScript + Vite 6 + React Router 7. All UI components for the 15-module curriculum, interactive exercises, quizzes, and dashboard AI tools exist and build successfully.

To satisfy all requirements of `ORIGINAL_REQUEST.md`, the implementation plan requires:
1. **Firebase Package & Config**: Install `firebase` and create `src/firebase/config.ts` (project `zentia-573f8` + demo mode resilience).
2. **Auth Layer**: Create `AuthContext`, `ProtectedRoute`, and a `/login` page with Email/Password & Google Sign-In, plus registration and logout capabilities.
3. **Firestore Progress Tracking Service**: Create `progressService.ts` to manage user progress (`completedLessons`, `lastLessonId`, `quizScores`) with robust error handling and loading states.
4. **CourseViewer Integration**: Wire `CourseViewer.tsx` and `ProgressCheck.tsx` to read and write progress to Firestore for the authenticated user.
5. **Personalized Dashboard Enhancement**: Upgrade `Dashboard.tsx` to display real-time user metrics, progress bars, quiz competency badges, and a dynamic "Continue Learning" CTA.

---

## 5. Verification Method

- **Build Verification**:
  ```powershell
  npm run build
  ```
  Expected: Clean build without TypeScript or Vite errors.
- **Run Verification**:
  ```powershell
  npm run dev
  ```
  Expected: Starts Vite server on `http://localhost:3000`.
- **Manual Verification Steps**:
  1. Open `http://localhost:3000/dashboard` while logged out -> Verifies redirection to `/login`.
  2. Open `http://localhost:3000/programs/business-english` while logged out -> Verifies redirection to `/login`.
  3. Sign in via `/login` using Email/Password and Google Sign-In -> Verifies successful auth state transition.
  4. Navigate to `/programs/business-english`, complete a lesson and quiz -> Verifies Firestore document update under user UID.
  5. Refresh page -> Verifies progress persists from Firestore.
  6. Navigate to `/dashboard` -> Verifies user name, progress metrics, and "Continue Learning" button pointing to next lesson.
