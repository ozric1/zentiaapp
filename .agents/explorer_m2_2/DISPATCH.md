## 2026-09-02T20:34:52Z
You are Milestone 2 Explorer 2 on the Zentia World Program project.
Your working directory is: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m2_2\
The authoritative user request is: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\ORIGINAL_REQUEST.md
The project master plan is: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\PROJECT.md

Your task:
1. Investigate Firestore configuration in `src/firebase.ts` and design the complete Firestore progress data model and service in `src/types/progress.ts` and `src/services/progressService.ts`.
2. The schema must live at `/users/{uid}/progress/business-english` and store:
   - `completedLessons: number[]` (or string[])
   - `quizScores: Record<string | number, { score: number; total: number; percentage: number; passed: boolean; answers?: Record<number, number>; completedAt: string }>`
   - `lastLessonId: number`
   - `lastUpdated: string` (ISO timestamp or serverTimestamp)
   - `stats: { overallProgress: number; unitsMastered: number; assessmentsPassed: number; averageScore: number }`
3. Design atomic read/write/merge methods (`setDoc` with `merge: true`, `arrayUnion`, error handling, offline support, retry logic, subscription/onSnapshot or getDoc).
4. Write your findings, type definitions, service methods specification, and concurrency/offline strategies to `c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m2_2\handoff.md`.
5. Send a completion message to the caller with a concise summary and the path to your handoff file.
