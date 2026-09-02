## 2026-09-02T20:57:08Z

You are Milestone 2 Worker on the Zentia World Program project.
Your working directory is: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\worker_m2_1\
The authoritative user request is in: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\ORIGINAL_REQUEST.md
The project master plan is in: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Input Explorer Handoff Reports (read these for complete architecture & specs):
- c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m2_1\handoff.md
- c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m2_2\handoff.md
- c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m2_3\handoff.md

Your task is to implement Milestone 2 (Robust Firestore Progress Tracking):
1. Create `src/types/progress.ts` with all TypeScript interfaces (`QuizScoreRecord`, `UserStats`, `ModuleProgressItem`, `ProgramProgressDocument`, `ProgressContextValue`).
2. Create `src/services/progressService.ts` providing Firestore sync at `/users/{uid}/progress/business-english` (`setDoc(..., { merge: true })`, `getDoc`, `onSnapshot`, atomic updates, error handling, offline support, guest `localStorage` migration with union merge, progress calculations, and continue-target resolution).
3. Create `src/context/ProgressContext.tsx` providing `ProgressProvider` and `useProgress()` hook, integrated with `AuthContext` (`useAuth()`), handling automatic migration on user login, optimistic state updates, and clean state on logout.
4. Update `src/App.tsx` to wrap the component tree with `<ProgressProvider>`.
5. Update `src/pages/CourseViewer.tsx` to consume `useProgress()`, handle URL search params (`?lesson=ID`), optimistic local selection and completion, syncing `saveCurrentLesson` and `markLessonCompleted`, and passing quiz handlers down.
6. Update `components/ProgressCheck.tsx` (and `components/LessonView.tsx` if applicable) to accept existing scores, persist submitted quiz results via `saveQuizScore`, and mark assessment units completed.
7. Run the build and test suites: `npm run build`, `npm test`, and `node tests/runner.mjs`. Ensure 100% compilation and test pass rate.
8. Document all changes, files touched, build and test verification outputs in `c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\worker_m2_1\handoff.md`.
9. Send a completion message to the caller with a concise summary and the path to your handoff file.
