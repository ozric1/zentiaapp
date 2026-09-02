# Project: Zentia World Program

## Architecture
- **Tech Stack**: React 19, TypeScript 5.8, Vite 6, React Router 7, Firebase 11 (Auth & Firestore, project `zentia-573f8`), Tailwind CSS.
- **Frontend Architecture**:
  - `src/firebase.ts`: Firebase client initialization (Auth, Firestore, Google Auth Provider) with resilient project config & offline cache.
  - `src/context/AuthContext.tsx`: Central authentication context managing `currentUser`, `loading`, `error`, `login`, `signup`, `loginWithGoogle`, `logout`, `onAuthStateChanged`.
  - `src/components/ProtectedRoute.tsx`: Route guard redirecting unauthenticated users to `/login` with return target.
  - `src/pages/LoginPage.tsx`: Luxury executive branded authentication page supporting Email/Password (Sign In & Sign Up) and Google Sign-In with validation & error banners.
  - `src/services/progressService.ts` & `src/context/ProgressContext.tsx` / `useUserProgress`: Firestore sync service managing `/users/{uid}/progress/business-english`, atomic `setDoc` with merge, localStorage migration, quiz score tracking, and offline persistence.
  - `src/pages/CourseViewer.tsx` & `components/ProgressCheck.tsx`: 15-module Executive Business English curriculum viewer connected to Firestore progress and quiz score updates.
  - `src/pages/Dashboard.tsx`: Personalized learner dashboard displaying dynamic user identity, 4-card metric grid (Overall %, Units Mastered, Assessments Passed, Avg Score), 5-module curriculum progress breakdown, and hero "Continue Learning" CTA.
  - `src/pages/LandingPage.tsx`: Marketing landing page with dynamic auth state buttons (Sign In / Go to Dashboard).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Firebase SDK & Client Config | Install `firebase` package and initialize Auth and Firestore clients for project `zentia-573f8` with offline support and resilient fallback | M1 | survey / ORIGINAL_REQUEST §1 |
| 2 | Auth Context & Provider | Global React context for auth state (`currentUser`, `loading`, `login`, `signup`, `loginWithGoogle`, `logout`) | M1 | survey / ORIGINAL_REQUEST §1 |
| 3 | Login & Registration UI | Branded executive `/login` page with tab switching for Login/Register, form validation, error banners, and Google button | M1 | survey / ORIGINAL_REQUEST §1 |
| 4 | Route Protection & Navigation | `ProtectedRoute` wrapper guarding `/dashboard` and `/programs/business-english` with redirect to `/login` | M1 | survey / ORIGINAL_REQUEST §1 |
| 5 | Landing Page Auth Integration | Dynamic header and CTA buttons on landing page linking to `/login` or `/dashboard` based on auth state | M1 | survey / ORIGINAL_REQUEST §1 |
| 6 | Firestore Progress Data Schema | Scalable document structure `/users/{uid}/progress/business-english` with `completedLessons`, `quizScores`, `lastLessonId`, `stats`, `moduleProgress` | M2 | survey / ORIGINAL_REQUEST §2 |
| 7 | LocalStorage to Firestore Migration | Automated set-union merge of guest `localStorage` data (`zentia_completed`, `zentia_last_lesson`) into Firestore upon login | M2 | survey / ORIGINAL_REQUEST §2 |
| 8 | Multi-User Concurrency & Offline Resilience | Atomic Firestore operations (`setDoc` with merge, `arrayUnion`), IndexedDB offline persistence, error recovery | M2 | survey / ORIGINAL_REQUEST §2 |
| 9 | CourseViewer Firestore Integration | Connect `CourseViewer.tsx` to Firestore progress service for saving active unit and completed units | M2 | survey / ORIGINAL_REQUEST §2 |
| 10 | Quiz Score Tracking | Capture quiz results in `ProgressCheck.tsx` (Assessments 101-105) and persist to Firestore under `quizScores` | M2 | survey / ORIGINAL_REQUEST §2 |
| 11 | Personalized Learner Profile | Dynamic welcome banner and avatar in Dashboard displaying user's name, email, and executive learner status | M3 | survey / ORIGINAL_REQUEST §3 |
| 12 | Real-Time Metrics & Module Cards | 4-card metric grid (Overall %, Units Mastered, Assessments Passed, Avg Score) and 5-module breakdown cards in Dashboard | M3 | survey / ORIGINAL_REQUEST §3 |
| 13 | "Continue Learning" Engine | Automated resolution of active/next uncompleted unit in 21-item sequence with direct navigation to CourseViewer | M3 | survey / ORIGINAL_REQUEST §3 |
| 14 | E2E Test Harness & Tiers 1-4 Suite | Comprehensive opaque-box test runner & test suite covering Auth, Firestore Progress, and Dashboard Resume | E2E | Project Pattern Dual Track |
| 15 | Adversarial Coverage & Hardening (Tier 5) | White-box stress testing, race condition checks, edge-case hardening, and forensic audit verification | Final | Project Pattern Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test harness, test runners, and Tiers 1-4 opaque-box test cases for Auth, Firestore Progress, and Dashboard | None | DONE |
| 1 | Milestone 1: Authentication System | Firebase initialization, AuthContext, LoginPage, ProtectedRoute, LandingPage auth buttons | None | DONE |
| 2 | Milestone 2: Robust Firestore Progress Tracking | ProgressService, localStorage migration, multi-user concurrency, CourseViewer & ProgressCheck integration | Milestone 1 | DONE |
| 3 | Milestone 3: Personalized Dashboard & Resume Learning | Dynamic user profile, real-time metric cards, 5-module breakdown, "Continue Learning" CTA | Milestone 2 | IN_PROGRESS |
| Final | Final Milestone: 100% E2E Pass & Tier 5 Hardening | Pass 100% E2E tests, execute Tier 5 adversarial tests, Forensic Integrity Audit | M1, M2, M3, E2E | PLANNED |

## Interface Contracts

### AuthContext ↔ App / Routes
- `useAuth()` hook provides:
  - `currentUser: User | null`
  - `loading: boolean`
  - `error: string | null`
  - `login: (email, password) => Promise<void>`
  - `signup: (email, password, displayName?) => Promise<void>`
  - `loginWithGoogle: () => Promise<void>`
  - `logout: () => Promise<void>`
  - `clearError: () => void`

### ProgressService / ProgressContext ↔ CourseViewer & Dashboard
- `useProgress()` hook provides:
  - `progress: ProgramProgressDocument | null`
  - `loading: boolean`
  - `error: string | null`
  - `saveCurrentLesson: (lessonId: number) => Promise<void>`
  - `markLessonCompleted: (lessonId: number) => Promise<void>`
  - `saveQuizScore: (quizId: number, score: number, total: number, answers?: Record<number, number>) => Promise<void>`
  - `refreshProgress: () => Promise<void>`
  - `getContinueLearningTarget: () => { targetLessonId: number; isCompleted: boolean; isProgramComplete: boolean }`

### Code Layout
- `src/firebase.ts` (or `src/firebase/config.ts`): Firebase SDK initialization
- `src/context/AuthContext.tsx`: Authentication state & actions
- `src/components/ProtectedRoute.tsx`: Auth route protection wrapper
- `src/pages/LoginPage.tsx`: Executive sign-in/sign-up page
- `src/types/progress.ts` (or `types.ts`): Progress & Profile types
- `src/services/progressService.ts`: Firestore read/write/merge methods
- `src/context/ProgressContext.tsx`: Progress provider & hooks
- `src/pages/CourseViewer.tsx`: Updated course progression with Firestore
- `components/ProgressCheck.tsx`: Quiz scoring with Firestore persistence
- `src/pages/Dashboard.tsx`: Dynamic dashboard with metrics & continue learning CTA
- `src/pages/LandingPage.tsx`: Updated navigation links & auth buttons
- `tests/e2e/`: E2E test suites (Tier 1-4)
- `tests/harness/`: Test runner and execution harness
