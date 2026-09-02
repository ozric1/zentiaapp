# Zentia World Program - E2E Test Infrastructure & Specification

## 1. Overview & Testing Philosophy

This document defines the End-to-End (E2E) testing infrastructure, harness architecture, and 4-tier test specifications for the **Zentia World Program** (Executive Business English & Global Leadership Platform).

The test suite is structured strictly as an **opaque-box specification-driven test suite**, verifying observable behaviors, interface contracts, state mutations, persistence guarantees, and business invariants defined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

### 4-Tier Testing Methodology

```
+-------------------------------------------------------------------------+
|                  TIER 4: REAL-WORLD SCENARIOS                           |
|  - Complete executive learner onboarding & graduation                   |
|  - Guest learning session conversion to authenticated cloud profile    |
|  - Cross-device resume and multi-session progression                    |
|  - Concurrency & network resilience under rapid interaction             |
+-------------------------------------------------------------------------+
|                  TIER 3: CROSS-FEATURE INTEGRATION                      |
|  - Auth state change -> Storage migration -> Dashboard sync            |
|  - CourseViewer completion -> Firestore update -> Continue Learning CTA |
|  - Multi-user data isolation (User A vs User B document partitions)    |
|  - Route guard enforcement on session expiry / logout                   |
+-------------------------------------------------------------------------+
|                  TIER 2: BOUNDARY & CORNER CASES                        |
|  - 0% and 100% quiz scores, all 21 items completed, 0 items completed   |
|  - Corrupted localStorage JSON payload recovery                         |
|  - Duplicate lesson completion idempotency                              |
|  - Malformed email, weak passwords, and network timeouts                |
+-------------------------------------------------------------------------+
|                  TIER 1: FEATURE COVERAGE (CONTRACTS)                   |
|  - FA1: Email/Password, Google Sign-in, Route Guarding, Session, Logout  |
|  - FA2: Progress schema, atomic arrayUnion, Quiz scores, Migration      |
|  - FA3: Profile display, 4 metric cards, 5 modules, Continue Learning   |
+-------------------------------------------------------------------------+
```

---

## 2. Test Harness Architecture

The test harness provides a zero-dependency, high-fidelity execution environment designed for deterministic, repeatable, and fast execution across environments.

### Core Harness Components

1. **`tests/harness/testFramework.ts`**:
   - Comprehensive test runner supporting `describe`, `it`, `beforeEach`, `afterEach`, and nested suites.
   - Rich matcher assertion library:
     - `toBe(expected)`, `toEqual(expected)`, `toBeTruthy()`, `toBeFalsy()`
     - `toBeGreaterThanOrEqual(val)`, `toBeLessThanOrEqual(val)`, `toContain(item)`
     - `toThrow(expected?)`, `toBeNull()`, `toBeDefined()`, `toBeCloseTo(expected, delta)`
   - ANSI colorized terminal reporting with execution timestamps, pass/fail counts, assertion breakdowns, and formatted error traces.

2. **`tests/harness/mockFirebase.ts`**:
   - In-memory Firebase Auth simulation:
     - Multi-account registry with password hashing and validation.
     - Google OAuth popup provider mock.
     - Token lifecycle, session rehydration, and listener subscriptions (`onAuthStateChanged`).
     - Error code parity (`auth/user-not-found`, `auth/wrong-password`, `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, `auth/network-request-failed`).
   - In-memory Firestore Database simulation:
     - Hierarchical document path resolution (`/users/{uid}/progress/business-english`).
     - Atomic operations: `setDoc` (with `{ merge: true }`), `updateDoc`, `getDoc`.
     - Field values: `arrayUnion(...)`, `serverTimestamp()`.
     - Multi-tenant tenant isolation enforcing UID scoping.
     - Network latency simulation and offline cache queuing.

3. **`tests/harness/mockLocalStorage.ts`**:
   - Standard W3C Web Storage implementation for guest session state testing (`zentia_last_lesson`, `zentia_completed`).
   - Serialization, item removal, clearance, and storage event propagation.

4. **`tests/harness/appSimulator.ts`**:
   - Model-level simulation of AuthContext, ProgressService, RouteGuard, and Dashboard metric calculators according to interface contracts in `PROJECT.md`.

---

## 3. Feature Area Test Matrices

### Feature Area 1: Authentication & Route Protection (R1)

| Test ID | Tier | Feature / Contract | Description / Assertion |
|---------|------|-------------------|-------------------------|
| `AUTH-T1-01` | Tier 1 | Sign Up with Email/Password | Creates new user in Auth, initializes UID and email, sets `currentUser`. |
| `AUTH-T1-02` | Tier 1 | Sign In with Email/Password | Validates registered credentials, updates session, emits `onAuthStateChanged`. |
| `AUTH-T1-03` | Tier 1 | Google Sign-In Provider | Simulates Google popup auth, creates/retrieves user with displayName and avatar. |
| `AUTH-T1-04` | Tier 1 | Protected Route Guarding | Unauthenticated navigation to `/dashboard` or `/programs/business-english` redirects to `/login?redirect=...`. |
| `AUTH-T1-05` | Tier 1 | Authenticated Redirect | Authenticated user accessing `/login` is automatically redirected to `/dashboard`. |
| `AUTH-T1-06` | Tier 1 | Session Persistence | Rehydrating stored session restores `currentUser` without requiring re-login. |
| `AUTH-T1-07` | Tier 1 | Logout Action | `logout()` clears active session, resets `currentUser` to `null`, and triggers route guard. |
| `AUTH-T1-08` | Tier 1 | Error State Management | Authentication errors (invalid password, existing email) set `error` message; `clearError()` resets it. |
| `AUTH-T2-01` | Tier 2 | Malformed Email Validation | Attempting signup/login with invalid email formats throws `auth/invalid-email`. |
| `AUTH-T2-02` | Tier 2 | Weak Password Boundary | Password length < 6 characters triggers `auth/weak-password` rejection. |
| `AUTH-T2-03` | Tier 2 | Duplicate User Registration | Registering with an existing email throws `auth/email-already-in-use`. |
| `AUTH-T2-04` | Tier 2 | Network Error Handling | Network disconnection during sign-in gracefully surfaces `auth/network-request-failed` without crash. |

---

### Feature Area 2: Firestore Progress Tracking & LocalStorage Migration (R2)

| Test ID | Tier | Feature / Contract | Description / Assertion |
|---------|------|-------------------|-------------------------|
| `PROG-T1-01` | Tier 1 | Progress Document Initialization | Creating/fetching progress for new user returns empty `completedLessons: []` and default document structure. |
| `PROG-T1-02` | Tier 1 | Active Lesson Update | `saveCurrentLesson(lessonId)` persists `lastLessonId` and `updatedAt` to `/users/{uid}/progress/business-english`. |
| `PROG-T1-03` | Tier 1 | Mark Lesson Completed | `markLessonCompleted(lessonId)` atomically appends `lessonId` to `completedLessons` via set-union. |
| `PROG-T1-04` | Tier 1 | Quiz Score Recording | `saveQuizScore(101, 5, 5)` saves quiz data with `score`, `total`, `percentage`, and `passed` flag. |
| `PROG-T1-05` | Tier 1 | Multi-User Data Isolation | Writes to User A's progress document (`uid_123`) do not modify or leak into User B's document (`uid_456`). |
| `PROG-T1-06` | Tier 1 | LocalStorage to Cloud Migration | On login, guest lessons in `localStorage` (`zentia_completed`) are merged with Firestore document without losing remote data. |
| `PROG-T2-01` | Tier 2 | Duplicate Lesson Idempotency | Completing the same lesson ID multiple times does not produce duplicate entries in `completedLessons`. |
| `PROG-T2-02` | Tier 2 | Out-of-Range Lesson IDs | Non-existent or boundary lesson IDs are handled gracefully with validation errors. |
| `PROG-T2-03` | Tier 2 | Quiz Score Edge Percentages | 0% (0/5) correctly records `passed: false`, 100% (5/5) correctly records `passed: true`. |
| `PROG-T2-04` | Tier 2 | Corrupted LocalStorage Payload | Malformed or non-JSON string in `localStorage` is safely handled during migration without throwing unhandled exceptions. |
| `PROG-T2-05` | Tier 2 | Empty Migration No-op | Login with no guest data preserves existing cloud document untouched. |
| `PROG-T2-06` | Tier 2 | Concurrent Writes Merge | Rapid concurrent updates merge correctly without overwriting interleaved completed lesson IDs. |

---

### Feature Area 3: Personalized Dashboard & Continue Learning Mechanics (R3)

| Test ID | Tier | Feature / Contract | Description / Assertion |
|---------|------|-------------------|-------------------------|
| `DASH-T1-01` | Tier 1 | Learner Profile Presentation | Dashboard displays user's display name, email, avatar URL, and executive status badge. |
| `DASH-T1-02` | Tier 1 | 4-Card Metric Calculations | Calculates Units Mastered, Assessments Passed, Overall Progress % (out of 21 total items), and Average Quiz Score %. |
| `DASH-T1-03` | Tier 1 | 5-Module Progress Breakdown | Computes completion percentage and status (Locked/In Progress/Completed) for each of the 5 curriculum modules. |
| `DASH-T1-04` | Tier 1 | Continue Learning Target (Fresh) | For new user with no progress, `getContinueLearningTarget()` points to Lesson 0 (Orientation). |
| `DASH-T1-05` | Tier 1 | Continue Learning Target (Active) | If user was on Lesson 2 and it is uncompleted, target is Lesson 2. |
| `DASH-T1-06` | Tier 1 | Continue Learning Target (Next) | If Lesson 2 is completed, target advances to next uncompleted sequence item (Lesson 3 or Quiz 101). |
| `DASH-T1-07` | Tier 1 | Continue Learning Target (Complete) | When all 21 items are completed, returns `isProgramComplete: true` and `isCompleted: true`. |
| `DASH-T2-01` | Tier 2 | Zero Progress Dashboard Metrics | 0 completed lessons yields 0% Overall, 0 Units Mastered, 0 Assessments Passed, and N/A or 0% Avg Score. |
| `DASH-T2-02` | Tier 2 | 100% Program Completion Metrics | 21 completed items yields 100% Overall Progress and all 5 modules marked 100% Completed. |
| `DASH-T2-03` | Tier 2 | Module Boundary Progression | Completing Lesson 3 unlocks Quiz 101; passing Quiz 101 completes Module 1 and unlocks Module 2 (Lesson 4). |

---

### Tier 3: Cross-Feature Integration & Concurrency

| Test ID | Focus | Scenario Description |
|---------|-------|----------------------|
| `INT-T3-01` | Auth + Migration + Dashboard | Guest completes Lessons 1 & 2 in LocalStorage -> User logs in -> LocalStorage merged to Firestore -> Dashboard immediately reflects 2 units completed and target points to Lesson 3. |
| `INT-T3-02` | CourseViewer + Firestore + Continue CTA | User navigates to CourseViewer, finishes Lesson 3, submits Quiz 101 -> Returns to Dashboard -> Continue Learning CTA now routes to Module 2 Lesson 4. |
| `INT-T3-03` | Multi-User Session Switching | User A (10 units completed) logs out -> User B (2 units completed) logs in -> Dashboard and CourseViewer reflect strictly User B's state with zero residue from User A. |
| `INT-T3-04` | Session Termination Route Protection | Active session on `/dashboard` is logged out -> Route guard intercepts next action and redirects to `/login`. |

---

### Tier 4: Real-World Scenarios & End-to-End Workflows

| Test ID | Persona | Full End-to-End Workflow |
|---------|---------|--------------------------|
| `E2E-T4-01` | Executive Onboarding | New User signs up with Email/Password -> Redirected to Dashboard -> Clicks "Start Journey" -> Completes Lesson 0 (Orientation) -> Completes Lesson 1 -> Dashboard shows 2/21 (10%) progress. |
| `E2E-T4-02` | Mid-Career Mastery & Assessment | Returning User logs in -> Resumes Module 1 -> Completes Lessons 2 & 3 -> Attempts Assessment 101 with 5/5 score -> Receives 100% passing feedback -> Module 1 completes -> Unlocks Module 2. |
| `E2E-T4-03` | Guest Exploration to Cloud Account Conversion | Unauthenticated guest explores Lesson 1 & 2 -> Promoted to create account -> Registers -> Local progress seamlessly migrates into Firestore -> Resumes without losing any work. |
| `E2E-T4-04` | Full Program Graduation | User systematically completes all 5 Modules (Lessons 0..15 and Quizzes 101..105) -> Verifies 100% Overall, 16 Units Mastered, 5 Assessments Passed, Program Complete certificate status. |

---

## 4. Curriculum Sequence Reference (21 Units Total)

The authoritative sequence for the Zentia Executive Business English curriculum is:
```typescript
export const CURRICULUM_SEQUENCE = [
  0,               // Course Orientation
  1, 2, 3, 101,    // Module 1: Executive Communication Foundation & Assessment 1
  4, 5, 6, 102,    // Module 2: High-Stakes Negotiation & Persuasion & Assessment 2
  7, 8, 103,       // Module 3: Cross-Cultural Global Leadership & Assessment 3
  9, 10, 11, 12, 104, // Module 4: Crisis Management & Stakeholder Alignment & Assessment 4
  13, 14, 15, 105  // Module 5: Boardroom Storytelling & Visionary Delivery & Assessment 5
];
```

Module mapping:
- **Module 1**: Lessons `[1, 2, 3]`, Quiz `101` (4 items)
- **Module 2**: Lessons `[4, 5, 6]`, Quiz `102` (4 items)
- **Module 3**: Lessons `[7, 8]`, Quiz `103` (3 items)
- **Module 4**: Lessons `[9, 10, 11, 12]`, Quiz `104` (5 items)
- **Module 5**: Lessons `[13, 14, 15]`, Quiz `105` (4 items)
- **Orientation**: Lesson `0` (1 item)
- **Total**: 1 + 4 + 4 + 3 + 5 + 4 = **21 items**

---

## 5. Test Runner Execution & Validation Standard

### Running the Test Suite
The E2E test runner can be executed directly using Node.js:
```bash
node tests/runner.js
```
or via the ES-compatible runner:
```bash
node tests/runner.mjs
```

### Exit Codes & Verification
- `0`: All test suites passed cleanly with 100% assertions satisfied.
- `1`: One or more test assertions failed or an unhandled exception occurred.

Detailed test execution logs, pass/fail counts, and coverage breakdowns are recorded in `TEST_READY.md`.
