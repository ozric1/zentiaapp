# Handoff Report — Milestone 2 Explorer 3
**Focus**: Guest `localStorage` to Firestore Migration, `ProgressContext` & `useProgress` Architecture, Resilient Offline/Error Handling, and Consuming Component Integration.

---

## 1. Observation

### 1.1 Current State of Progress Persistence & LocalStorage
Direct inspection of the codebase reveals that progress tracking is currently handled strictly via browser `localStorage` in `src/pages/CourseViewer.tsx`:
- **`src/pages/CourseViewer.tsx` (Lines 11–31)**:
  ```typescript
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
- **Observations on LocalStorage format**:
  - `zentia_last_lesson`: Stores single integer string (e.g. `"0"`, `"3"`, `"101"`).
  - `zentia_completed`: Stores stringified JSON array of numbers (e.g. `"[0, 1, 2]"`).
  - **Risk Factors**: 
    1. If a guest completes units locally, then registers/logs in, their progress is marooned in localStorage unless migrated.
    2. If localStorage contains corrupted data (e.g. invalid JSON, non-array object, or non-numeric values), `JSON.parse` or `parseInt` can throw runtime exceptions or produce `NaN`.
    3. Multi-device / multi-user isolation is completely absent; any subsequent user on the same machine inherits previous progress unless explicitly cleared.

### 1.2 Current State of Quiz Scoring in `components/ProgressCheck.tsx`
- **`components/ProgressCheck.tsx` (Lines 10–36)**:
  ```typescript
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleSubmit = () => {
      let newScore = 0;
      questions.forEach(q => {
          if (answers[q.id] === q.correctAnswer) {
              newScore++;
          }
      });
      setScore(newScore);
      setShowResults(true);
  };
  ```
- **Observation**:
  - `ProgressCheck.tsx` computes the score locally in React component state but does NOT persist quiz scores, passing status (`passed >= 80%`), timestamp, or answer breakdown to any backend or context.
  - Passing an assessment does not automatically trigger completion in `completedLessons` or update dashboard metrics.

### 1.3 Current State of Authentication & Context
- **`src/context/AuthContext.tsx`**:
  - Provides `useAuth()` exposing `{ currentUser, loading, error, login, signup, loginWithGoogle, logout, clearError }`.
  - Emits user transitions via Firebase Auth `onAuthStateChanged`.
  - When `currentUser` becomes non-null, `user.uid` is available.
- **`src/App.tsx` (Lines 13–50)**:
  - App is wrapped with `<AuthProvider>`, but currently lacks a `<ProgressProvider>`.

### 1.4 Curriculum Sequence & Invariants
From `constants.ts` and `tests/harness/zentiaSim.mjs`:
- Total Curriculum Items = **21 units**:
  - `0`: Orientation
  - `1, 2, 3`: Module 1 lessons; `101`: Assessment 1
  - `4, 5, 6`: Module 2 lessons; `102`: Assessment 2
  - `7, 8`: Module 3 lessons; `103`: Assessment 3
  - `9, 10, 11, 12`: Module 4 lessons; `104`: Assessment 4
  - `13, 14, 15`: Module 5 lessons; `105`: Assessment 5
- Metric Invariants:
  - `totalUnits`: 21
  - `unitsMastered`: Count of standard lessons (0 through 15) in `completedLessons` (max 16).
  - `assessmentsPassed`: Count of quizzes (101 through 105) with `passed === true` (score >= 80%, max 5).
  - `overallPercentage`: `Math.min(100, Math.round((completedCount / 21) * 100))`.
  - `avgScore`: Mean percentage across all submitted quizzes in `quizScores`.

---

## 2. Logic Chain

### 2.1 Guest LocalStorage to Firestore Migration Protocol
1. **Migration Trigger**:
   - Migration must execute automatically inside `ProgressProvider` upon user authentication (i.e. when `currentUser` changes from `null` to a valid `User` object with `uid`).
   - It must also be safely callable on explicit login/signup actions.

2. **Safe Parsing & Sanitization**:
   - Extract `zentia_completed` with `try/catch`. Verify `Array.isArray(parsed)`. Filter strictly for non-negative integers: `parsed.filter(n => typeof n === 'number' && Number.isInteger(n) && n >= 0)`. If invalid or empty, return `[]`.
   - Extract `zentia_last_lesson` with `try/catch`. Parse with `parseInt(raw, 10)`. Verify `!isNaN(val) && val >= 0`. If invalid, return `0`.

3. **Set-Union Merge Algorithm**:
   - Retrieve current cloud progress document from `/users/{uid}/progress/business-english`.
   - If cloud progress exists:
     - `mergedCompletedLessons = Array.from(new Set([...cloudDoc.completedLessons, ...guestCompleted]))`.
     - `mergedLastLessonId = guestLastLesson > 0 ? guestLastLesson : (cloudDoc.lastLessonId || 0)`.
   - If cloud progress does not exist:
     - `mergedCompletedLessons = Array.from(new Set(guestCompleted))`.
     - `mergedLastLessonId = guestLastLesson || 0`.
   - Recompute full `stats` using `ProgressCalculator.calculateStats(mergedCompletedLessons, cloudDoc?.quizScores || {})`.

4. **Atomic Cloud Write & LocalStorage Cleanup**:
   - Write merged payload to Firestore via `setDoc(docRef, { ...mergedPayload, updatedAt: serverTimestamp(), migratedAt: new Date().toISOString() }, { merge: true })`.
   - **Critical Safety Rule**: `localStorage.removeItem('zentia_completed')` and `localStorage.removeItem('zentia_last_lesson')` are executed **ONLY AFTER** `setDoc` succeeds. If the network is down or Firestore fails, localStorage is retained so the user experiences zero data loss.

5. **Multi-User Isolation**:
   - When a user logs out (`currentUser === null`), `ProgressProvider` resets internal progress state to empty baseline, preventing cross-user session bleeding.

---

### 2.2 `ProgressContext` & `useProgress` Hook Architecture
To provide a seamless, high-performance developer experience across `CourseViewer`, `Dashboard`, and `ProgressCheck`, `ProgressContext` will provide:

```typescript
export interface ProgressContextType {
    // State
    progress: ProgramProgressDocument | null;
    completedLessons: number[];
    lastLessonId: number;
    quizScores: Record<number, QuizScore>;
    stats: ProgressStats;
    moduleProgress: ModuleProgress[];
    
    // Status flags
    loading: boolean;        // Initial fetch or auth transition
    syncing: boolean;        // Background cloud sync in progress
    error: string | null;    // Human-friendly error description
    isOffline: boolean;      // Connectivity status
    
    // Actions
    saveCurrentLesson: (lessonId: number) => Promise<void>;
    markLessonCompleted: (lessonId: number) => Promise<void>;
    saveQuizScore: (quizId: number, score: number, total: number, answers?: Record<number, number>) => Promise<QuizScore>;
    refreshProgress: () => Promise<void>;
    getContinueLearningTarget: () => ContinueLearningTarget;
    clearError: () => void;
}
```

#### Synchronization & Concurrency Strategy:
1. **Real-Time Subscription with Cache-First Fallback**:
   - `ProgressProvider` uses Firestore `onSnapshot` on `/users/{uid}/progress/business-english` with `includeMetadataChanges: true`.
   - When offline, `onSnapshot` instantly serves from IndexedDB cache (`snap.metadata.fromCache`).
   - When online, server changes merge transparently.
2. **Optimistic UI Updates**:
   - When user clicks "Complete Lesson" or submits a quiz, React state updates instantly (optimistic UI) before the network roundtrip completes.
   - If the write fails, the error is captured and state reverts or displays a non-intrusive retry banner.
3. **Atomic Writes**:
   - Writes use `setDoc(docRef, payload, { merge: true })` and Firestore `arrayUnion` to guarantee concurrent tab safety.

---

### 2.3 Consuming Component Integration Specifications

#### A. `CourseViewer.tsx` Integration
1. Replace lines 12–31 (`localStorage.getItem/setItem`) with `useProgress()`:
   ```typescript
   const {
       completedLessons,
       lastLessonId,
       saveCurrentLesson,
       markLessonCompleted,
       loading,
       syncing
   } = useProgress();
   ```
2. Initialize `currentLessonId` from `lastLessonId` or URL query params.
3. On selecting a lesson (`handleLessonSelect`):
   ```typescript
   const handleLessonSelect = (id: number) => {
       setCurrentLessonId(id);
       saveCurrentLesson(id).catch(console.error);
       setIsMobileMenuOpen(false);
   };
   ```
4. On completing a lesson (`handleLessonComplete`):
   ```typescript
   const handleLessonComplete = async () => {
       await markLessonCompleted(currentLessonId);
       
       const sequence = [
           0, 
           1, 2, 3, 101, 
           4, 5, 6, 102, 
           7, 8, 103, 
           9, 10, 11, 12, 104, 
           13, 14, 15, 105
       ];
       const currentIndex = sequence.indexOf(currentLessonId);
       if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
           const nextId = sequence[currentIndex + 1];
           setCurrentLessonId(nextId);
           await saveCurrentLesson(nextId);
       }
   };
   ```
5. Pass `completedLessons` to `Sidebar.tsx` and render completion checkmarks.

#### B. `components/ProgressCheck.tsx` Integration
1. Consume `useProgress()`:
   ```typescript
   const { saveQuizScore, quizScores } = useProgress();
   ```
2. On `handleSubmit`:
   ```typescript
   const handleSubmit = async () => {
       let newScore = 0;
       questions.forEach(q => {
           if (answers[q.id] === q.correctAnswer) {
               newScore++;
           }
       });
       setScore(newScore);
       setShowResults(true);

       // Persist to Firestore via ProgressContext
       await saveQuizScore(lessonId, newScore, questions.length, answers);
   };
   ```
3. If the user previously completed this assessment, pre-populate their highest/last score from `quizScores[lessonId]`.

#### C. `src/pages/Dashboard.tsx` Integration
1. Consume `useAuth()` and `useProgress()`:
   ```typescript
   const { currentUser } = useAuth();
   const { stats, moduleProgress, getContinueLearningTarget, loading, error, refreshProgress } = useProgress();
   ```
2. Render Learner Profile:
   - Dynamic user name: `currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Executive Leader'`
   - Role badge: `Corporate Executive`
   - Avatar with initials: `currentUser?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'EX'`
3. Render 4 Metric Cards:
   - **Overall Progress**: `${stats.overallPercentage}%`
   - **Units Mastered**: `${stats.unitsMastered} / 16`
   - **Assessments Passed**: `${stats.assessmentsPassed} / 5`
   - **Average Score**: `${stats.avgScore}%`
4. Render "Continue Learning" CTA:
   - Resolve target via `getContinueLearningTarget()`.
   - If not complete, button navigates to `/programs/business-english` and loads `target.targetLessonId`.
   - If complete (`target.isProgramComplete`), display "Curriculum Completed — View Certificate".
5. Render 5-Module Progress Breakdown:
   - Map over `moduleProgress` array and display status badges (`Completed`, `In Progress`, `Not Started`), unit counters (`X / Y units`), and progress bars.

---

## 3. Caveats

1. **Multi-Tab Race Conditions**:
   - If a user opens two tabs and completes different lessons concurrently, Firestore's `arrayUnion` prevents array overwrite. However, `lastLessonId` will be the last written timestamp. This is intended standard behavior.
2. **Offline Local Storage vs IndexedDB**:
   - Firebase JS SDK Firestore uses IndexedDB for offline cache when enabled. In environments where IndexedDB is blocked (e.g., incognito with strict blocking or security sandboxes), in-memory cache is used as fallback.
3. **Guest LocalStorage Migration Single-Run**:
   - Once migrated, guest keys are removed from `localStorage`. If the user opens another incognito tab without logging in, that new incognito tab starts as a fresh guest until authenticated.
4. **Single Program Document vs Subcollection**:
   - Using `/users/{uid}/progress/business-english` provides atomic single-document reads/writes with zero overhead and minimal Firestore billing operations for 21 units.

---

## 4. Conclusion & Complete Design Specifications

### 4.1 Type Definitions: `src/types/progress.ts`
```typescript
/**
 * Types for Zentia World Progress Tracking System
 */

export interface QuizScore {
    quizId: number;
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    answers?: Record<number, number>;
    completedAt: string;
}

export interface ProgressStats {
    totalUnits: number;           // Always 21
    completedCount: number;       // Set size of completedLessons
    unitsMastered: number;        // Standard units 0..15 completed (max 16)
    assessmentsPassed: number;    // Quizzes 101..105 passed with >= 80% (max 5)
    overallPercentage: number;    // Math.min(100, Math.round(completedCount / 21 * 100))
    avgScore: number;             // Mean percentage across quizScores
}

export interface ModuleProgress {
    id: number;
    title: string;
    totalItems: number;
    completedItems: number;
    percentage: number;
    status: 'not_started' | 'in_progress' | 'completed';
    isCompleted: boolean;
}

export interface ContinueLearningTarget {
    targetLessonId: number;
    isCompleted: boolean;
    isProgramComplete: boolean;
}

export interface ProgramProgressDocument {
    completedLessons: number[];
    quizScores: Record<number, QuizScore>;
    lastLessonId: number;
    stats: ProgressStats;
    createdAt?: string;
    updatedAt?: any;
    migratedAt?: string;
}

export interface MigrationResult {
    migrated: boolean;
    count: number;
    mergedCompleted?: number[];
}
```

---

### 4.2 Progress Service & Domain Logic: `src/services/progressService.ts`
```typescript
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Firestore,
    arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    ProgramProgressDocument,
    ProgressStats,
    ModuleProgress,
    ContinueLearningTarget,
    QuizScore,
    MigrationResult
} from '../types/progress';

export const CURRICULUM_SEQUENCE = [
    0,                  // Course Orientation
    1, 2, 3, 101,       // Module 1
    4, 5, 6, 102,       // Module 2
    7, 8, 103,          // Module 3
    9, 10, 11, 12, 104, // Module 4
    13, 14, 15, 105     // Module 5
];

export const TOTAL_CURRICULUM_UNITS = CURRICULUM_SEQUENCE.length; // 21

export const MODULE_DEFINITIONS = [
    { id: 1, title: 'Executive Communication Foundation', units: [1, 2, 3], quizId: 101 },
    { id: 2, title: 'High-Stakes Negotiation & Persuasion', units: [4, 5, 6], quizId: 102 },
    { id: 3, title: 'Cross-Cultural Global Leadership', units: [7, 8], quizId: 103 },
    { id: 4, title: 'Crisis Management & Stakeholder Alignment', units: [9, 10, 11, 12], quizId: 104 },
    { id: 5, title: 'Boardroom Storytelling & Visionary Delivery', units: [13, 14, 15], quizId: 105 },
];

export class ProgressCalculator {
    static calculateStats(completedLessons: number[] = [], quizScores: Record<number, QuizScore> = {}): ProgressStats {
        const validCompletions = new Set(completedLessons || []);
        const unitsMastered = (completedLessons || []).filter(id => id >= 0 && id <= 15).length;
        
        const quizEntries = Object.values(quizScores || {});
        const assessmentsPassed = quizEntries.filter(q => q.passed || (q.percentage !== undefined && q.percentage >= 80)).length;
        
        const overallPercentage = Math.min(100, Math.round((validCompletions.size / TOTAL_CURRICULUM_UNITS) * 100));
        
        let avgScore = 0;
        if (quizEntries.length > 0) {
            const totalScoreSum = quizEntries.reduce((acc, q) => acc + (q.percentage ?? (q.score / (q.total || 1)) * 100), 0);
            avgScore = Math.round(totalScoreSum / quizEntries.length);
        }

        return {
            totalUnits: TOTAL_CURRICULUM_UNITS,
            completedCount: validCompletions.size,
            unitsMastered,
            assessmentsPassed,
            overallPercentage,
            avgScore,
        };
    }

    static calculateModuleProgress(completedLessons: number[] = [], quizScores: Record<number, QuizScore> = {}): ModuleProgress[] {
        const completedSet = new Set(completedLessons || []);
        return MODULE_DEFINITIONS.map(mod => {
            const allModUnits = [...mod.units, mod.quizId];
            const completedModUnits = allModUnits.filter(u => completedSet.has(u));
            const percentage = Math.round((completedModUnits.length / allModUnits.length) * 100);
            const isQuizPassed = quizScores[mod.quizId]?.passed || ((quizScores[mod.quizId]?.percentage ?? 0) >= 80);
            const isCompleted = percentage === 100 && (isQuizPassed || completedSet.has(mod.quizId));

            let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
            if (isCompleted) {
                status = 'completed';
            } else if (completedModUnits.length > 0) {
                status = 'in_progress';
            }

            return {
                id: mod.id,
                title: mod.title,
                totalItems: allModUnits.length,
                completedItems: completedModUnits.length,
                percentage,
                status,
                isCompleted,
            };
        });
    }

    static getContinueLearningTarget(completedLessons: number[] = [], lastLessonId: number = 0): ContinueLearningTarget {
        const completedSet = new Set(completedLessons || []);

        if (lastLessonId !== undefined && lastLessonId !== null && !completedSet.has(lastLessonId)) {
            return {
                targetLessonId: lastLessonId,
                isCompleted: false,
                isProgramComplete: false,
            };
        }

        for (const lessonId of CURRICULUM_SEQUENCE) {
            if (!completedSet.has(lessonId)) {
                return {
                    targetLessonId: lessonId,
                    isCompleted: false,
                    isProgramComplete: false,
                };
            }
        }

        return {
            targetLessonId: 105,
            isCompleted: true,
            isProgramComplete: true,
        };
    }
}

export class ProgressService {
    private db: Firestore;

    constructor(firestoreDb: Firestore = db) {
        this.db = firestoreDb;
    }

    private getDocRef(uid: string) {
        return doc(this.db, `users/${uid}/progress/business-english`);
    }

    async fetchProgress(uid: string): Promise<ProgramProgressDocument> {
        if (!uid) throw new Error('UID is required to fetch progress');
        const docRef = this.getDocRef(uid);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) {
            const initialData: ProgramProgressDocument = {
                completedLessons: [],
                quizScores: {},
                lastLessonId: 0,
                createdAt: new Date().toISOString(),
                stats: ProgressCalculator.calculateStats([], {}),
            };
            await setDoc(docRef, { ...initialData, updatedAt: serverTimestamp() });
            return initialData;
        }

        const data = snap.data() as any;
        const completedLessons = Array.isArray(data.completedLessons) ? data.completedLessons : [];
        const quizScores = data.quizScores || {};
        const lastLessonId = typeof data.lastLessonId === 'number' ? data.lastLessonId : 0;
        const stats = data.stats || ProgressCalculator.calculateStats(completedLessons, quizScores);

        return {
            completedLessons,
            quizScores,
            lastLessonId,
            stats,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            migratedAt: data.migratedAt,
        };
    }

    async saveCurrentLesson(uid: string, lessonId: number): Promise<void> {
        if (!uid) throw new Error('UID is required');
        const docRef = this.getDocRef(uid);
        await setDoc(
            docRef,
            {
                lastLessonId: lessonId,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    }

    async markLessonCompleted(uid: string, lessonId: number): Promise<void> {
        if (!uid) throw new Error('UID is required');
        const docRef = this.getDocRef(uid);
        
        const snap = await getDoc(docRef);
        const current = snap.exists() ? snap.data() : { completedLessons: [], quizScores: {} };
        const completed = new Set<number>(current.completedLessons || []);
        completed.add(lessonId);
        const completedArr = Array.from(completed);
        const stats = ProgressCalculator.calculateStats(completedArr, current.quizScores);

        await setDoc(
            docRef,
            {
                completedLessons: arrayUnion(lessonId),
                lastLessonId: lessonId,
                stats,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    }

    async saveQuizScore(
        uid: string,
        quizId: number,
        score: number,
        total: number,
        answers: Record<number, number> = {}
    ): Promise<QuizScore> {
        if (!uid) throw new Error('UID is required');
        const docRef = this.getDocRef(uid);
        const percentage = Math.round((score / (total || 1)) * 100);
        const passed = percentage >= 80;

        const quizEntry: QuizScore = {
            quizId,
            score,
            total,
            percentage,
            passed,
            answers,
            completedAt: new Date().toISOString(),
        };

        const snap = await getDoc(docRef);
        const current = snap.exists() ? snap.data() : { completedLessons: [], quizScores: {} };
        const completed = new Set<number>(current.completedLessons || []);
        if (passed) {
            completed.add(quizId);
        }
        const updatedQuizScores = {
            ...(current.quizScores || {}),
            [quizId]: quizEntry,
        };
        const stats = ProgressCalculator.calculateStats(Array.from(completed), updatedQuizScores);

        await setDoc(
            docRef,
            {
                completedLessons: Array.from(completed),
                [`quizScores.${quizId}`]: quizEntry,
                quizScores: updatedQuizScores,
                stats,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        return quizEntry;
    }

    async migrateLocalStorage(uid: string, storage: Storage = window.localStorage): Promise<MigrationResult> {
        if (!uid || !storage) return { migrated: false, count: 0 };
        let guestCompleted: number[] = [];
        let guestLastLesson = 0;

        try {
            const rawCompleted = storage.getItem('zentia_completed');
            if (rawCompleted) {
                const parsed = JSON.parse(rawCompleted);
                if (Array.isArray(parsed)) {
                    guestCompleted = parsed.filter(n => typeof n === 'number' && Number.isInteger(n) && n >= 0);
                }
            }
        } catch {
            guestCompleted = [];
        }

        try {
            const rawLast = storage.getItem('zentia_last_lesson');
            if (rawLast) {
                const parsed = parseInt(rawLast, 10);
                if (!isNaN(parsed) && parsed >= 0) guestLastLesson = parsed;
            }
        } catch {
            guestLastLesson = 0;
        }

        if (guestCompleted.length === 0 && guestLastLesson === 0) {
            return { migrated: false, count: 0 };
        }

        const docRef = this.getDocRef(uid);
        const snap = await getDoc(docRef);
        const current = snap.exists() ? snap.data() : { completedLessons: [], quizScores: {} };
        
        const mergedCompleted = new Set<number>([...(current.completedLessons || []), ...guestCompleted]);
        const mergedArray = Array.from(mergedCompleted);
        const lastLesson = guestLastLesson || current.lastLessonId || 0;
        const stats = ProgressCalculator.calculateStats(mergedArray, current.quizScores);

        await setDoc(
            docRef,
            {
                completedLessons: mergedArray,
                lastLessonId: lastLesson,
                stats,
                migratedAt: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        // Safe cleanup post successful write
        try {
            storage.removeItem('zentia_completed');
            storage.removeItem('zentia_last_lesson');
        } catch (e) {
            console.warn('LocalStorage cleanup notice:', e);
        }

        return {
            migrated: true,
            count: guestCompleted.length,
            mergedCompleted: mergedArray,
        };
    }
}

export const progressService = new ProgressService();
```

---

### 4.3 React Context & Hooks: `src/context/ProgressContext.tsx`
```typescript
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
    ReactNode
} from 'react';
import { useAuth } from './AuthContext';
import { progressService, ProgressCalculator } from '../services/progressService';
import {
    ProgramProgressDocument,
    ProgressStats,
    ModuleProgress,
    ContinueLearningTarget,
    QuizScore
} from '../types/progress';

export interface ProgressContextType {
    progress: ProgramProgressDocument | null;
    completedLessons: number[];
    lastLessonId: number;
    quizScores: Record<number, QuizScore>;
    stats: ProgressStats;
    moduleProgress: ModuleProgress[];
    loading: boolean;
    syncing: boolean;
    error: string | null;
    isOffline: boolean;
    saveCurrentLesson: (lessonId: number) => Promise<void>;
    markLessonCompleted: (lessonId: number) => Promise<void>;
    saveQuizScore: (quizId: number, score: number, total: number, answers?: Record<number, number>) => Promise<QuizScore>;
    refreshProgress: () => Promise<void>;
    getContinueLearningTarget: () => ContinueLearningTarget;
    clearError: () => void;
}

const DEFAULT_STATS: ProgressStats = {
    totalUnits: 21,
    completedCount: 0,
    unitsMastered: 0,
    assessmentsPassed: 0,
    overallPercentage: 0,
    avgScore: 0,
};

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, loading: authLoading } = useAuth();

    const [progress, setProgress] = useState<ProgramProgressDocument | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [syncing, setSyncing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

    // Track online/offline browser state
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load progress and perform guest migration whenever authenticated user changes
    const loadUserProgress = useCallback(async (uid: string) => {
        setLoading(true);
        setError(null);
        try {
            // 1. Attempt one-time union migration from guest localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    await progressService.migrateLocalStorage(uid, window.localStorage);
                } catch (migErr) {
                    console.warn('LocalStorage migration non-blocking warning:', migErr);
                }
            }

            // 2. Fetch fresh cloud progress document
            const data = await progressService.fetchProgress(uid);
            setProgress(data);
        } catch (err: any) {
            console.error('Failed to load user progress:', err);
            setError(err?.message || 'Unable to load progress. Please check your network connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }

        if (currentUser?.uid) {
            loadUserProgress(currentUser.uid);
        } else {
            // Unauthenticated state: clean slate
            setProgress(null);
            setLoading(false);
            setError(null);
        }
    }, [currentUser?.uid, authLoading, loadUserProgress]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const refreshProgress = useCallback(async () => {
        if (!currentUser?.uid) return;
        await loadUserProgress(currentUser.uid);
    }, [currentUser?.uid, loadUserProgress]);

    const saveCurrentLesson = useCallback(async (lessonId: number) => {
        if (!currentUser?.uid) return;
        
        // Optimistic update
        setProgress(prev => prev ? { ...prev, lastLessonId: lessonId } : null);
        setSyncing(true);

        try {
            await progressService.saveCurrentLesson(currentUser.uid, lessonId);
        } catch (err: any) {
            console.error('saveCurrentLesson error:', err);
            setError('Failed to sync lesson position to cloud.');
        } finally {
            setSyncing(false);
        }
    }, [currentUser?.uid]);

    const markLessonCompleted = useCallback(async (lessonId: number) => {
        if (!currentUser?.uid) return;

        // Optimistic update
        setProgress(prev => {
            if (!prev) return null;
            const set = new Set([...prev.completedLessons, lessonId]);
            const newCompleted = Array.from(set);
            const newStats = ProgressCalculator.calculateStats(newCompleted, prev.quizScores);
            return {
                ...prev,
                completedLessons: newCompleted,
                lastLessonId: lessonId,
                stats: newStats,
            };
        });
        setSyncing(true);

        try {
            await progressService.markLessonCompleted(currentUser.uid, lessonId);
        } catch (err: any) {
            console.error('markLessonCompleted error:', err);
            setError('Failed to record lesson completion.');
        } finally {
            setSyncing(false);
        }
    }, [currentUser?.uid]);

    const saveQuizScore = useCallback(async (
        quizId: number,
        score: number,
        total: number,
        answers: Record<number, number> = {}
    ): Promise<QuizScore> => {
        if (!currentUser?.uid) {
            throw new Error('User must be authenticated to record quiz score');
        }

        setSyncing(true);
        try {
            const quizResult = await progressService.saveQuizScore(currentUser.uid, quizId, score, total, answers);
            
            // Update local state
            setProgress(prev => {
                if (!prev) return null;
                const completedSet = new Set(prev.completedLessons);
                if (quizResult.passed) {
                    completedSet.add(quizId);
                }
                const updatedCompleted = Array.from(completedSet);
                const updatedQuizzes = {
                    ...prev.quizScores,
                    [quizId]: quizResult,
                };
                const updatedStats = ProgressCalculator.calculateStats(updatedCompleted, updatedQuizzes);
                return {
                    ...prev,
                    completedLessons: updatedCompleted,
                    quizScores: updatedQuizzes,
                    stats: updatedStats,
                };
            });

            return quizResult;
        } catch (err: any) {
            console.error('saveQuizScore error:', err);
            setError('Failed to persist assessment results.');
            throw err;
        } finally {
            setSyncing(false);
        }
    }, [currentUser?.uid]);

    const getContinueLearningTarget = useCallback((): ContinueLearningTarget => {
        const completed = progress?.completedLessons || [];
        const last = progress?.lastLessonId || 0;
        return ProgressCalculator.getContinueLearningTarget(completed, last);
    }, [progress?.completedLessons, progress?.lastLessonId]);

    const completedLessons = useMemo(() => progress?.completedLessons || [], [progress?.completedLessons]);
    const lastLessonId = useMemo(() => progress?.lastLessonId ?? 0, [progress?.lastLessonId]);
    const quizScores = useMemo(() => progress?.quizScores || {}, [progress?.quizScores]);
    const stats = useMemo(() => progress?.stats || DEFAULT_STATS, [progress?.stats]);
    
    const moduleProgress = useMemo(() => {
        return ProgressCalculator.calculateModuleProgress(completedLessons, quizScores);
    }, [completedLessons, quizScores]);

    const contextValue: ProgressContextType = {
        progress,
        completedLessons,
        lastLessonId,
        quizScores,
        stats,
        moduleProgress,
        loading,
        syncing,
        error,
        isOffline,
        saveCurrentLesson,
        markLessonCompleted,
        saveQuizScore,
        refreshProgress,
        getContinueLearningTarget,
        clearError,
    };

    return (
        <ProgressContext.Provider value={contextValue}>
            {children}
        </ProgressContext.Provider>
    );
};

export const useProgress = (): ProgressContextType => {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error('useProgress must be used within a ProgressProvider');
    }
    return context;
};

export const useUserProgress = useProgress;
export default ProgressContext;
```

---

## 5. Verification Method

To verify the implementation independently:

1. **Automated Test Execution**:
   - Run the E2E test harness:
     ```powershell
     node tests/runner.mjs
     ```
   - Target test suites verifying progress and migration:
     - `tests/e2e/tier1_progress.test.mjs`: Tests PROG-T1-01 through PROG-T1-06 (initialization, lesson completion, quiz recording, isolation, and LocalStorage migration).
     - `tests/e2e/tier2_boundary.test.mjs`: Tests PROG-T2-01 through PROG-T2-06 (idempotency, quiz boundaries 0% & 100%, malformed/corrupted localStorage recovery).
     - `tests/e2e/tier3_cross_feature.test.mjs`: Tests INT-T3-01 through INT-T3-04 (Guest session -> Auth -> Migration -> Dashboard sync, concurrent writes).
     - `tests/e2e/tier4_real_world.test.mjs`: Tests E2E-T4-01 through E2E-T4-04 (full curriculum completion, multi-device cloud sync).

2. **Manual In-Browser Verification**:
   - Open browser developer tools -> Application -> Local Storage.
   - Set `zentia_completed = "[0, 1, 2]"` and `zentia_last_lesson = "2"`.
   - Navigate to `/login` and sign in / register.
   - Inspect Firestore document `/users/{uid}/progress/business-english` in Firebase Console:
     - Verify `completedLessons` includes `[0, 1, 2]`.
     - Verify `lastLessonId` is `2`.
     - Verify `stats.unitsMastered` is `3`.
   - Check browser Local Storage: verify `zentia_completed` and `zentia_last_lesson` are cleared.
   - Refresh page: verify progress persists directly from Firestore without `localStorage`.
