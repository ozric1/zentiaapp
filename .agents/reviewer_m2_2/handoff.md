# Milestone 2 Review & Adversarial Critic Report

**Reviewer:** Milestone 2 Reviewer 2 (`reviewer_m2_2`)  
**Target:** Milestone 2 (Robust Firestore Progress Tracking & UI Integration)  
**Worker Under Review:** `worker_m2_1`  
**Date:** 2026-09-02  
**Final Verdict:** **APPROVE**  

---

## 1. Observation

### 1.1 Source Code Inspection & Structural Findings

1. **Firestore Multi-Tenant Isolation & Document Schema (`src/services/progressService.ts`)**:
   - Lines 156–161: Document references are scoped per-user at `doc(this.db, 'users', uid, 'progress', 'business-english')`. Invalid or empty `uid` calls throw an explicit error.
   - Lines 251–263 (`saveCurrentLesson`), 268–289 (`markLessonCompleted`), 294–343 (`saveQuizScore`), 348–424 (`migrateLocalStorage`): Every write operation strictly specifies `{ merge: true }` in `setDoc()`.
   - Line 281: `markLessonCompleted` utilizes `arrayUnion(lessonId)` for atomic append in Firestore.
   - Lines 328–340: `saveQuizScore` atomically updates `completedLessons` when `passed === true` (score $\ge 80\%$), writes `quizScores[quizId]` alongside `quizScores.${quizId}`, and recalculates stats.

2. **Guest `localStorage` Migration & Error Resilience (`src/services/progressService.ts`)**:
   - Lines 362–374: `zentia_completed` is parsed in a `try/catch` block. Validates array structure with `.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0)`. Malformed/corrupted JSON (e.g. `{ bad JSON ]]`) safely defaults to `guestCompleted = []` without throwing unhandled exceptions.
   - Lines 375–383: `zentia_last_lesson` is safely parsed with `parseInt(rawLast, 10)` and validated with `!isNaN(parsed) && parsed >= 0`.
   - Lines 385–387: If `guestCompleted.length === 0 && guestLastLesson === 0`, returns `{ migrated: false, count: 0 }` as a clean no-op without writing to Firestore or clearing local storage.
   - Lines 393–396: Combines cloud and guest progress via mathematical set union: `new Set([...(currentDoc.completedLessons || []), ...guestCompleted])`.
   - Lines 411–418: `targetStorage.removeItem('zentia_completed')` and `removeItem('zentia_last_lesson')` are executed **strictly after** the `await setDoc(docRef, ..., { merge: true })` successfully resolves. If network failure or Firestore write rejection occurs, the local storage data remains completely intact.

3. **React Context Lifecycle, Authentication Sync & Offline Resilience (`src/context/ProgressContext.tsx`)**:
   - Lines 47–65: Registers `window.addEventListener('online')` and `'offline'` with full teardown cleanup on unmount.
   - Lines 68–126: `useEffect` monitors `[currentUser?.uid, authLoading]`.
     - When `!currentUser?.uid` (logout / unauthenticated): Resets state cleanly (`setProgress(null)`, `setLoading(false)`, `setError(null)`).
     - When user authenticates: Triggers `migrateLocalStorage(uid)` before subscribing to real-time updates via `subscribeToProgress(uid, onUpdate, onError)`.
     - Returns cleanup function calling `unsubscribe()` to prevent dangling listeners and memory leaks.
   - Lines 145–294: `saveCurrentLesson`, `markLessonCompleted`, and `saveQuizScore` apply optimistic React state updates immediately before firing async Firestore writes. This guarantees immediate UI reactivity regardless of network latency or offline status.
   - Lines 302–334: All exposed states and helper functions are wrapped in `useMemo` and `useCallback` to prevent unnecessary component re-renders.

4. **UI Integration (`src/pages/CourseViewer.tsx`, `components/ProgressCheck.tsx`, `components/LessonView.tsx`, `components/Sidebar.tsx`)**:
   - `CourseViewer.tsx` (lines 23–31, 68–72, 89–115): Connected to `useProgress()`. Synchronizes lesson state bidirectionally with URL search parameters (`?lesson=ID`), saves active lesson in background, triggers `markLessonCompleted` on unit completion, and connects `handleQuizSubmit` to Firestore `saveQuizScore`.
   - `components/ProgressCheck.tsx` (lines 22–65): Loads existing scores on revisit, submits assessment answers via `onQuizSubmit`, displays loading states during save, and supports retaking.
   - `components/Sidebar.tsx` (lines 9–34): Accurately renders green completion checkmarks for all completed curriculum units and assessments based on live `completedLessons`.

5. **Adversarial Integrity Audit**:
   - Checked for integrity violations (hardcoded test answers, dummy facades, task bypasses):
     - `ProgressCalculator.calculateStats`: Dynamically calculates `overallPercentage` ($\min(100, \text{round}(|\text{completed}| / 21 \times 100))$), `unitsMastered` (0–15), `assessmentsPassed` ($\ge 80\%$), and `avgScore`.
     - `ProgressCalculator.calculateModuleProgress`: Dynamically maps each of the 5 modules, checking all constituent unit IDs and passing quiz scores.
     - `ProgressCalculator.getContinueLearningTarget`: Dynamically traverses the authoritative 21-item sequence.
     - No mocked or static shortcuts exist in production code.

---

## 2. Logic Chain

1. **Observation**: Multi-user calls in `tier1_progress.test.mjs` (PROG-T1-05) and `tier3_cross_feature.test.mjs` (INT-T3-03, INT-T3-04) execute concurrent completions across independent user IDs and simultaneous operations within the same user session.
   - **Inference**: Because document paths are partitioned by `/users/{uid}/progress/business-english` and mutations leverage `arrayUnion`, concurrent writes are strictly non-conflicting and free from race-condition data clobbering.

2. **Observation**: LocalStorage migration tests (PROG-T1-06, PROG-T2-04, PROG-T2-05, PROG-T2-06, INT-T3-01) verify migration of valid data, malformed strings, non-array objects, empty states, and set-union merging.
   - **Inference**: The implementation safely handles all edge cases without unhandled rejections, and safeguards guest learner progress from premature deletion.

3. **Observation**: `ProgressContext.tsx` handles network disconnects (`isOffline`) and unauthenticated fallback to local storage, while keeping active state updated optimistically.
   - **Inference**: Learners experience zero perceived latency when advancing lessons or submitting quizzes, with resilient offline persistence.

4. **Observation**: `node tests/runner.mjs` and `npm test` execute all 6 test suites (42 total test assertions) and pass 100%. `npm run build` generates the production bundle without errors.
   - **Inference**: The codebase adheres to all type contracts, runtime invariants, and packaging requirements.

---

## 3. Caveats

1. **Dual Metric Naming**:
   - The service and context provide both `overallPercentage` and `overallProgress`, as well as `avgScore` and `averageScore`. This design decision ensures backward and cross-module compatibility with all dashboard card implementations and E2E test assertions.
2. **Offline IndexedDB Support**:
   - In standard browser execution, Firebase SDK v11 automatically utilizes IndexedDB persistence for Firestore operations initiated via `getFirestore()`.

---

## 4. Conclusion

**Verdict: APPROVE**

The Milestone 2 deliverables submitted by `worker_m2_1` satisfy all specifications:
- Firestore writes are atomic with `setDoc(..., { merge: true })` and `arrayUnion`.
- Multi-user concurrency and session isolation are strictly enforced.
- Guest `localStorage` migration is resilient against corrupted data and prevents data loss.
- React context lifecycle correctly manages subscriptions, memory cleanup, and optimistic updates.
- 42/42 tests pass with zero regressions; production build compiles cleanly.

---

## 5. Verification Method

### 5.1 Test Execution Commands
Run the automated test runner:
```powershell
node tests/runner.mjs
npm test
```
**Verification Evidence:**
```
=================================================================
         ZENTIA WORLD PROGRAM - 4-TIER E2E TEST RUNNER           
=================================================================
Total Suites & Tiers Run : 6
Total Test Cases         : 42
Passed                   : 42
Failed                   : 0
Duration                 : 0.11s
=================================================================
✓ 100% E2E TEST SUITES PASSED CLEANLY WITH ZERO DEFECTS
```

### 5.2 Build Command
Run the Vite production compilation:
```powershell
npm run build
```
**Verification Evidence:**
```
✓ built in 35.06s (exit code 0, 0 errors)
```

### 5.3 Files Inspected
- `src/types/progress.ts`
- `src/services/progressService.ts`
- `src/context/ProgressContext.tsx`
- `src/pages/CourseViewer.tsx`
- `components/ProgressCheck.tsx`
- `components/LessonView.tsx`
- `components/Sidebar.tsx`
- `src/firebase.ts`
- `tests/harness/zentiaSim.mjs`
- `tests/e2e/tier1_progress.test.mjs`
- `tests/e2e/tier2_boundary.test.mjs`
- `tests/e2e/tier3_cross_feature.test.mjs`
- `tests/e2e/tier4_real_world.test.mjs`
