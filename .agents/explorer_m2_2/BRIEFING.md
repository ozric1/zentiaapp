# BRIEFING — 2026-09-02T20:51:00Z

## Mission
Investigate Firestore configuration in `src/firebase.ts` and design the complete Firestore progress data model (`src/types/progress.ts`) and service (`src/services/progressService.ts`) for Zentia World Program Milestone 2.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m2_2\
- Original parent: 29ce8025-044b-4ad2-ab84-5b714a9ebd3f
- Milestone: Milestone 2 (Cloud Persistence & Progress Service)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in `src/`, produce comprehensive design, types, and service spec in handoff report.
- Schema must live at `/users/{uid}/progress/business-english`.
- Target fields: `completedLessons`, `quizScores`, `lastLessonId`, `lastUpdated`, `stats`.
- Atomic read/write/merge methods (`setDoc` with `merge: true`, `arrayUnion`, error handling, offline support, retry logic, subscription/onSnapshot/getDoc).

## Current Parent
- Conversation ID: 29ce8025-044b-4ad2-ab84-5b714a9ebd3f
- Updated: 2026-09-02T20:51:00Z

## Investigation State
- **Explored paths**: `src/firebase.ts`, `types.ts`, `constants.ts`, `src/App.tsx`, `App.tsx`, `src/pages/CourseViewer.tsx`, `components/ProgressCheck.tsx`, `src/context/AuthContext.tsx`, `tests/harness/zentiaSim.mjs`, `tests/e2e/tier1_progress.test.mjs`, `tests/e2e/tier2_boundary.test.mjs`, `tests/e2e/tier3_cross_feature.test.mjs`, `tests/e2e/tier4_real_world.test.mjs`.
- **Key findings**:
  1. `src/firebase.ts` exports `app`, `auth`, `db`, `googleProvider` using Firebase v11.4.0 modular SDK with `zentia-573f8` configuration.
  2. Data schema at `/users/{uid}/progress/business-english` has full parity with domain simulator in `tests/harness/zentiaSim.mjs` (which currently passes 42/42 tests).
  3. Curriculum sequence consists of 21 units (Orientation 0, Units 1-15, Quizzes 101-105).
  4. Atomic operations must utilize `setDoc(docRef, data, { merge: true })` and `arrayUnion` to avoid race conditions and protect multi-tab/multi-device workflows.
  5. LocalStorage migration requires safe JSON parsing, set-union merge, and post-migration key cleanup (`zentia_completed`, `zentia_last_lesson`).
- **Unexplored areas**: None. Complete specifications ready for handoff.

## Key Decisions Made
- [2026-09-02]: Confirmed 21-item curriculum sequence and module breakdown.
- [2026-09-02]: Designed comprehensive TypeScript interfaces in `src/types/progress.ts` including aliases (`overallProgress`/`overallPercentage`, `averageScore`/`avgScore`).
- [2026-09-02]: Specified `ProgressService` class and `ProgressCalculator` mathematical engine with full error handling, exponential backoff, and offline persistence.

## Artifact Index
- `.agents/explorer_m2_2/DISPATCH.md` — Dispatch message log
- `.agents/explorer_m2_2/BRIEFING.md` — Persistent working memory and state
- `.agents/explorer_m2_2/progress.md` — Liveness and progress heartbeat
- `.agents/explorer_m2_2/handoff.md` — Comprehensive design and findings report
