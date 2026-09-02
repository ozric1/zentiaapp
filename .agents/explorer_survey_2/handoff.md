# Survey Explorer 2 — Handoff Report: Authentication & Routing Architecture

**Date**: 2026-09-02  
**Author**: Survey Explorer 2  
**Scope**: Authentication System, Routing Configuration, Route Guards, Firebase Client Configuration, Auth Context / Providers, and Current vs. Required State Comparison.

---

## 1. Observation

### 1.1 Dependency & Client Configuration
- **File**: `package.json`
  - Dependencies:
    ```json
    "dependencies": {
      "@google/genai": "^1.30.0",
      "lucide-react": "^1.11.0",
      "react": "^19.2.0",
      "react-dom": "^19.2.0",
      "react-router-dom": "^7.14.2"
    }
    ```
  - **Observation**: `firebase` is currently **not installed** in `package.json`.
- **Search across codebase**:
  - Pattern search for `firebase` returned 0 matches across all source directories (`src/`, `components/`, root).
  - No `firebase.ts`, `firebaseConfig.ts`, or environment configuration for Firebase exists in the project.
  - Required Firebase Project ID specified in `ORIGINAL_REQUEST.md`: `zentia-573f8`.

### 1.2 Routing Configuration & Route Protection
- **File**: `src/App.tsx` (Lines 1–19)
  ```tsx
  import React from 'react';
  import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
  import LandingPage from './pages/LandingPage';
  import CourseViewer from './pages/CourseViewer';
  import Dashboard from './pages/Dashboard';

  const App: React.FC = () => {
      return (
          <Router>
              <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/programs/business-english" element={<CourseViewer />} />
                  <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
          </Router>
      );
  };

  export default App;
  ```
  - **Observation**: 
    - Routes are configured with `react-router-dom` v7.
    - There is **no route protection** (no `ProtectedRoute`, `RequireAuth`, or auth guard wrapper).
    - Unauthenticated guests can directly access `/dashboard` and `/programs/business-english`.
    - No `/login` or `/auth` route exists.

### 1.3 UI Entry Points & Auth Triggers
- **File**: `src/pages/LandingPage.tsx` (Line 34)
  ```tsx
  <button className="text-slate-600 font-medium hover:text-blue-600 hidden md:block">Log in</button>
  ```
  - **Observation**: The "Log in" button has no `onClick` handler, no router `Link`, and is a dead element.
- **File**: `src/pages/Dashboard.tsx` (Lines 67–73)
  ```tsx
  <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
      <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-slate-800">Alex Director</p>
          <p className="text-xs text-slate-500">Corporate Learner</p>
      </div>
      <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-teal-400 rounded-full shadow-sm"></div>
  </div>
  ```
  - **Observation**: The user profile in the dashboard header is hardcoded ("Alex Director", "Corporate Learner") with no dynamic auth context or logout trigger.

### 1.4 State Persistence & Progress Flow
- **File**: `src/pages/CourseViewer.tsx` (Lines 11–31)
  ```tsx
  // 1. Initialize State from LocalStorage for persistence
  const [currentLessonId, setCurrentLessonId] = useState<number>(() => {
      const saved = localStorage.getItem('zentia_last_lesson');
      return saved ? parseInt(saved, 10) : 0;
  });

  const [completedLessons, setCompletedLessons] = useState<number[]>(() => {
      const saved = localStorage.getItem('zentia_completed');
      return saved ? JSON.parse(saved) : [];
  });

  // 2. Persist state changes
  useEffect(() => {
      localStorage.setItem('zentia_last_lesson', currentLessonId.toString());
  }, [currentLessonId]);

  useEffect(() => {
      localStorage.setItem('zentia_completed', JSON.stringify(completedLessons));
  }, [completedLessons]);
  ```
  - **File**: `components/ProgressCheck.tsx` (Lines 13, 28–34)
    ```tsx
    const [score, setScore] = useState(0);
    ...
    let newScore = 0;
    // calculates score from questions
    setScore(newScore);
    ```
  - **Observation**:
    - Course progress relies strictly on browser `localStorage` (`zentia_last_lesson`, `zentia_completed`).
    - Quiz scores are kept in transient local component state within `ProgressCheck.tsx` and never propagated to parent components or persisted.
    - No user-specific data isolation exists.

---

## 2. Logic Chain

1. **Missing Authentication Infrastructure (Observation 1.1)**:
   - Because `firebase` is not in `package.json` and no Firebase client file exists, the application currently cannot communicate with Firebase Auth or Firestore.
   - *Requirement R1* dictates a login system supporting Email/Password and Google Sign-in backed by Firebase project `zentia-573f8`.

2. **Missing Route Guards (Observation 1.2)**:
   - `src/App.tsx` renders `<Route path="/dashboard" element={<Dashboard />} />` and `<Route path="/programs/business-english" element={<CourseViewer />} />` directly.
   - To satisfy the acceptance criterion ("Navigating to `/dashboard` while logged out redirects the user to the login page"), a `ProtectedRoute` component must wrap these routes, checking auth state and handling loading/redirect states.

3. **Missing Auth Context & Provider (Observations 1.1 & 1.3)**:
   - To provide the authenticated user's state (`currentUser`, `loading`, `error`, `login`, `signup`, `loginWithGoogle`, `logout`) to both the router guards, `Dashboard.tsx`, `CourseViewer.tsx`, and `LandingPage.tsx`, a unified `AuthContext` and `AuthProvider` must be wrapped around the route tree.

4. **Integration with Persistence & Dashboard (Observation 1.4)**:
   - For *Requirement R2* and *R3*, when a user logs in, their UID (`currentUser.uid`) must be used as the key in Firestore (`users/{uid}`) to save and retrieve `completedLessons`, `quizScores`, and `lastLessonId`.
   - `Dashboard.tsx` and `CourseViewer.tsx` must switch from `localStorage` to Firestore operations with proper fallback and loading states.

---

## 3. Implementation Comparison Matrix

| Feature / Area | Current State | Required Implementation (R1, R2, R3) | Gap Assessment |
|---|---|---|---|
| **Firebase Package** | Not installed in `package.json` | `firebase` SDK installed | **Critical**: Must add `firebase` package |
| **Firebase Config** | None | `src/firebase.ts` with project `zentia-573f8`, `auth`, and `db` exports | **Critical**: Must create config module |
| **Auth Context / Hook** | None | `src/context/AuthContext.tsx` + `useAuth()` hook with `onAuthStateChanged` | **Critical**: Must implement provider & hook |
| **Email/Password Auth** | None | `signInWithEmailAndPassword`, `createUserWithEmailAndPassword` | **Critical**: Must implement auth functions |
| **Google Sign-In** | None | `GoogleAuthProvider` + `signInWithPopup` | **Critical**: Must implement Google auth |
| **Auth Error Handling** | None | Form validation & friendly error mappings (`auth/user-not-found`, etc.) | **High**: Must provide UI error alerts |
| **Login / Sign-Up Page** | Dead button in `LandingPage.tsx` | Full branded `/login` page with tab switching, Google button, inputs | **Critical**: Must create `src/pages/LoginPage.tsx` |
| **Route Protection** | Open access to `/dashboard` & `/programs/*` | `ProtectedRoute` redirecting unauthenticated users to `/login` | **Critical**: Must implement `ProtectedRoute` |
| **User State Persistence** | `localStorage` (`zentia_last_lesson`, `zentia_completed`) | Firebase Auth persistence + Firestore `users/{uid}` document | **Critical**: Replace `localStorage` with Firestore |
| **Dashboard Metrics** | Hardcoded mock data ("Alex Director") | Dynamic metrics from Firestore (completed count, scores, user avatar) | **Critical**: Connect Firestore to `Dashboard.tsx` |
| **Resume Learning** | Static UI buttons | "Continue Learning" button routing to first incomplete lesson / `lastLessonId` | **High**: Dynamic lesson resolution |

---

## 4. Caveats

1. **Environment Variables**:
   - The Firebase configuration requires a project ID (`zentia-573f8`). API keys can be passed via `VITE_FIREBASE_API_KEY` (or standard Vite env vars) with safe defaults/fallbacks configured in the code.
2. **Duplicate App.tsx**:
   - There is an `App.tsx` in the root and `src/App.tsx`. `index.tsx` explicitly imports `./src/App`. Any routing and provider changes should be made to `src/App.tsx`.
3. **React 19 Compatibility**:
   - React version is `19.2.0`. The Firebase JS SDK (v10/v11 modular API) is fully compatible with React 19 hooks (`useState`, `useEffect`, `useContext`).

---

## 5. Conclusion & Architectural Blueprint

### Recommended Architectural Blueprint

1. **Install Firebase**:
   - Add `"firebase": "^11.4.0"` (or latest compatible modular release) to `package.json`.

2. **Create Firebase Initialization Module** (`src/firebase.ts`):
   ```typescript
   import { initializeApp, getApps, getApp } from 'firebase/app';
   import { getAuth, GoogleAuthProvider } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';

   const firebaseConfig = {
       apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForZentiaProject573f8",
       authDomain: "zentia-573f8.firebaseapp.com",
       projectId: "zentia-573f8",
       storageBucket: "zentia-573f8.firebasestorage.app",
       messagingSenderId: "1234567890",
       appId: "1:1234567890:web:abcdef123456"
   };

   const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
   export const auth = getAuth(app);
   export const googleProvider = new GoogleAuthProvider();
   export const db = getFirestore(app);
   export default app;
   ```

3. **Create Auth Context & Provider** (`src/context/AuthContext.tsx`):
   - Expose `currentUser`, `loading`, `error`, `login`, `signup`, `loginWithGoogle`, `logout`.
   - Use `onAuthStateChanged` to manage persistent state across browser reloads.

4. **Create Route Guard** (`src/components/ProtectedRoute.tsx`):
   - Check `loading` -> render branded loading screen.
   - Check `!currentUser` -> `<Navigate to="/login" state={{ from: location }} replace />`.
   - Check `currentUser` -> render child route.

5. **Create Login Page** (`src/pages/LoginPage.tsx`):
   - Zentia-themed luxury styling matching `LandingPage.tsx` (`Playfair Display`, deep slate `#0f172a`, royal blue `#2563eb`).
   - Mode switcher: "Sign In" vs "Create Account".
   - Inputs for Email & Password with validation, loading indicator, and error banners.
   - "Continue with Google" button.
   - Post-login navigation back to `state?.from?.pathname || '/dashboard'`.

6. **Update Navigation & Route Table** (`src/App.tsx` & `src/pages/LandingPage.tsx`):
   - Wrap tree in `<AuthProvider>`.
   - Add `/login` route.
   - Wrap `/dashboard` and `/programs/business-english` in `<ProtectedRoute>`.
   - Update `LandingPage.tsx` navigation buttons to link to `/login` (or `/dashboard` if logged in).

---

## 6. Verification Method

To verify the implementation once built:
1. **Unauthenticated Redirect Test**:
   - Navigate directly to `/dashboard` and `/programs/business-english`.
   - **Expected**: Instantly redirects to `/login` without exposing protected content.
2. **Email/Password Sign-Up & Login Test**:
   - Register a new user on `/login`.
   - **Expected**: Authenticates successfully, redirects to `/dashboard`, and displays the user's email/name.
3. **Google Sign-In Test**:
   - Click "Continue with Google".
   - **Expected**: Opens Google popup, authenticates, and redirects to destination.
4. **State Persistence Test**:
   - Refresh `/dashboard` or `/programs/business-english` while authenticated.
   - **Expected**: Auth state persists, loading spinner shows briefly during re-auth, and page stays on the protected route without redirecting to `/login`.
5. **Logout Test**:
   - Click logout from Dashboard header.
   - **Expected**: Clears auth state, redirects to `/login` or `/`.
