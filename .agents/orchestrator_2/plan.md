# Master Execution Plan: Zentia World Program (Gen 2)

## Status Overview
- **Milestone 1 (Auth)**: Complete
- **Milestone 2 (Firestore Progress Tracking)**: In Progress
- **Milestone 3 (Personalized Dashboard & Resume Learning)**: Planned
- **Milestone 4 (Final Verification, Tier 5 Hardening & Audit)**: Planned

---

## Step-by-Step Plan

### 1. Milestone 2: Robust Firestore Progress Tracking
- **Scope**:
  - `src/types/progress.ts`: Progress data structures, completedLessons, quizScores, stats.
  - `src/services/progressService.ts`: Real Firestore sync with atomic setDoc(merge: true) / updateDoc / arrayUnion, offline persistence & error handling.
  - `src/context/ProgressContext.tsx`: React Context providing progress state, sync operations, localStorage migration on auth.
  - `src/pages/CourseViewer.tsx`: Connect active lesson saving and lesson completion marking to Firestore ProgressContext.
  - `components/ProgressCheck.tsx`: Connect quiz scoring (101-105) to Firestore ProgressContext.
- **Workflow**:
  1. Spawn 3 parallel Explorers (`teamwork_preview_explorer`) to investigate existing CourseViewer, ProgressCheck, localStorage format, Firestore schema, and migration logic.
  2. Spawn 1 Worker (`teamwork_preview_worker`) to implement the full Milestone 2 stack with build/test validation.
  3. Spawn 2 Reviewers (`teamwork_preview_reviewer`) to verify code quality, build/test pass, and requirement conformance.
  4. Spawn 2 Challengers (`teamwork_preview_challenger`) to stress-test concurrency, offline fallback, and edge cases.
  5. Spawn 1 Forensic Auditor (`teamwork_preview_auditor`) for anti-cheating & integrity checks.
  6. Evaluate Gate Status.

### 2. Milestone 3: Personalized Dashboard & Resume Learning
- **Scope**:
  - `src/pages/Dashboard.tsx`: Dynamic user profile display (name, email, avatar), 4-metric overview cards computed from Firestore progress (`Overall %`, `Units Mastered`, `Assessments Passed`, `Avg Score`), 5-module curriculum progress cards, and hero "Continue Learning" CTA resolving the next uncompleted lesson in the 21-item sequence.
  - Integration with `useAuth` and `useProgress`.
- **Workflow**:
  1. Spawn Explorers -> Worker -> Reviewers -> Challengers -> Auditor -> Gate Check.

### 3. Milestone 4: Final Verification, Tier 5 Hardening & Audit
- **Scope**:
  - Execute full E2E Test Suite (`node tests/runner.mjs` and `npm test` / `npm run build`).
  - Tier 5 White-box Adversarial Hardening (Challenger -> Worker -> Reviewer).
  - Full Forensic Integrity Audit.
  - Final human report synthesis.
