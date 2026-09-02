# Milestone 2 Investigation & Architecture Report: CourseViewer & ProgressCheck Firestore Integration

**Author:** Milestone 2 Explorer 1  
**Date:** 2026-09-02  
**Target Milestone:** Milestone 2 (Robust Firestore Progress Tracking & UI Integration)  
**Status:** Hard Handoff Complete  

---

## 1. Observation

### 1.1 Codebase Structure & File Paths
- **Course Viewer Page:** `src/pages/CourseViewer.tsx`
- **Quiz Assessment Component:** `components/ProgressCheck.tsx`
- **Curriculum & Lesson Data:** `constants.ts` (exports `COURSE_DATA: CourseData`)
- **Type Definitions:** `types.ts`
- **Lesson Viewer Container:** `components/LessonView.tsx`
- **Curriculum Navigation Sidebar:** `components/Sidebar.tsx`
- **Application Routing:** `src/App.tsx`
- **Firebase Initialization:** `src/firebase.ts`
- **Authentication Context:** `src/context/AuthContext.tsx`
- **Test Invariants & Domain Specification:** `tests/harness/zentiaSim.mjs`, `tests/e2e/tier1_progress.test.mjs`, `tests/e2e/tier3_cross_feature.test.mjs`

---

### 1.2 Analysis of Current `CourseViewer.tsx`
In `src/pages/CourseViewer.tsx` (lines 11–32):
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

const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

// 2. Persist state changes
useEffect(() => {
    localStorage.setItem('zentia_last_lesson', currentLessonId.toString());
}, [currentLessonId]);

useEffect(() => {
    localStorage.setItem('zentia_completed', JSON.stringify(completedLessons));
}, [completedLessons]);
```

**Key Findings:**
1. **Isolated Storage:** `CourseViewer` currently relies purely on synchronous browser `localStorage` keys `zentia_last_lesson` and `zentia_completed`. It has zero link to Firebase Auth `currentUser` or Firestore database collections.
2. **Missing Remote Synchronization:** When a user accesses the platform on a different device or browser, their progress is lost.
3. **No URL Query Param Handling:** When navigating from the Dashboard's "Continue Learning" button (e.g. `/programs/business-english?lesson=4`), `CourseViewer` ignores `searchParams` and only reads `localStorage`.
4. **Lesson Sequence:** Defined on lines 47–54 as:
   ```typescript
   const sequence = [
       0, 
       1, 2, 3, 101, 
       4, 5, 6, 102, 
       7, 8, 103, 
       9, 10, 11, 12, 104, 
       13, 14, 15, 105
   ];
   ```
   There are **21 units** in total: Lesson 0 (Orientation), 15 Core Business English Lessons, and 5 Module Progress Checks (Assessments 101, 102, 103, 104, 105).

---

### 1.3 Analysis of Current `components/ProgressCheck.tsx` & `components/LessonView.tsx`
In `components/ProgressCheck.tsx` (lines 10–33):
```typescript
interface ProgressCheckProps {
    title: string;
    questions: QuizQuestion[];
    lessonId: number;
}

const ProgressCheck: React.FC<ProgressCheckProps> = ({ title, questions, lessonId }) => {
    const [answers, setAnswers] = useState<{[key: number]: number}>({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        setAnswers({});
        setShowResults(false);
        setScore(0);
    }, [lessonId]);

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

In `components/LessonView.tsx` (lines 80–97):
```typescript
// Quiz View Wrapper
if (data.type === 'quiz' && data.quiz) {
    return (
        <div className="flex flex-col h-full">
            <ProgressCheck title={data.title} questions={data.quiz} lessonId={lessonId} />
            <div className="mt-12 flex justify-center pb-24">
                <button 
                    onClick={onComplete}
                    className={`...`}
                >
                    {isCompleted ? (
                        <>
                            <i className="fa-solid fa-check text-green-600"></i>
                            <span>Assessment Complete</span>
                            <i className="fa-solid fa-forward text-slate-400"></i>
                        </>
                    ) : (
                        <>
                            <span>Complete & Continue</span>
                            <i className="fa-solid fa-arrow-right"></i>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
```

**Key Findings:**
1. `ProgressCheck` calculates `newScore` and triggers `setShowResults(true)`, but **never records the score to Firestore** (`quizScores`), nor does it report the score up to `CourseViewer` or `ProgressContext`.
2. When revisiting an assessment that was already submitted, `ProgressCheck` resets to an empty state because it does not accept an `existingScore` or `initialAnswers` prop.
3. Submitting the assessment does not automatically trigger lesson completion or update module stats in Firestore.

---

### 1.4 Analysis of Curriculum Data & Assessment Map (`constants.ts`)
The 5 assessments in `constants.ts` map directly to curriculum modules:
| Assessment ID | Title | Module | Units Included | Question Count | Passing Criteria |
|---|---|---|---|---|---|
| **101** | Module 1 Assessment: Foundations | Module 1 (Foundations) | Lessons 1, 2, 3 | 5 questions (q1–q5) | $\ge 4/5$ (80%) |
| **102** | Module 2 Assessment: Strategy | Module 2 (Strategy) | Lessons 4, 5, 6 | 5 questions (q6–q10) | $\ge 4/5$ (80%) |
| **103** | Module 3 Assessment: Operations | Module 3 (Operations) | Lessons 7, 8 | 5 questions (q11–q15) | $\ge 4/5$ (80%) |
| **104** | Module 4 Assessment: Development | Module 4 (Development) | Lessons 9, 10, 11, 12 | 5 questions (q16–q20) | $\ge 4/5$ (80%) |
| **105** | Module 5 Assessment: Management | Module 5 (Management) | Lessons 13, 14, 15 | 5 questions (q21–q25) | $\ge 4/5$ (80%) |

---

### 1.5 Analysis of LocalStorage Usage & Test Expectations (`tests/harness/zentiaSim.mjs`)
From `tests/harness/zentiaSim.mjs` (lines 236–295):
- `zentia_completed`: Stringified array of numbers (e.g. `"[0, 1, 2]"`).
- `zentia_last_lesson`: Number string (e.g. `"2"`).
- **Migration Logic Requirement:** When a user logs in, `progressService.migrateLocalStorage(uid, localStorage)`:
  1. Reads `zentia_completed` and `zentia_last_lesson`.
  2. Parses JSON safely (handling corrupt JSON or non-array payloads without crashing).
  3. Merges the array with existing Firestore `completedLessons` using Set union (`Array.from(new Set([...firestoreCompleted, ...localCompleted]))`).
  4. Saves the merged state atomically to `/users/{uid}/progress/business-english`.
  5. Cleans up `localStorage.removeItem('zentia_completed')` and `localStorage.removeItem('zentia_last_lesson')`.

---

## 2. Logic Chain

### 2.1 Service & Context Architecture
To transition from isolated `localStorage` to high-concurrency Firestore persistence while maintaining instant responsiveness:
```
┌────────────────────────────────────────────────────────┐
│                      Firestore                         │
│       /users/{uid}/progress/business-english           │
└─────────────────────────▲──────────────────────────────┘
                          │ setDoc / updateDoc / getDoc
┌─────────────────────────┴──────────────────────────────┐
│                    ProgressService                     │
│  - getOrCreateProgress(uid)                            │
│  - saveCurrentLesson(uid, lessonId)                    │
│  - markLessonCompleted(uid, lessonId)                  │
│  - saveQuizScore(uid, quizId, score, total, answers)   │
│  - migrateLocalStorage(uid, storage)                   │
└─────────────────────────▲──────────────────────────────┘
                          │ React Context Provider
┌─────────────────────────┴──────────────────────────────┐
│                   ProgressContext                      │
│  - progress: ProgramProgressDocument | null            │
│  - stats: OverallStats (overall %, units, avg score)   │
│  - moduleProgress: ModuleProgress[]                    │
│  - saveCurrentLesson(lessonId)                         │
│  - markLessonCompleted(lessonId)                       │
│  - saveQuizScore(quizId, score, total, answers)        │
│  - getContinueLearningTarget()                         │
└────────────▲──────────────────────────────▲────────────┘
             │                              │
┌────────────┴─────────────┐   ┌────────────┴─────────────┐
│       CourseViewer       │   │        Dashboard         │
│  - Synchronizes active   │   │  - Real-time stat cards  │
│    lesson & sidebar      │   │  - 5-module breakdown    │
│  - Passes quiz submit &  │   │  - "Continue Learning"   │
│    completed status      │   │    routes to CourseViewer│
└────────────▲─────────────┘   └──────────────────────────┘
             │
┌────────────┴─────────────┐
│  LessonView / Progress   │
│  - Instant feedback      │
│  - Quiz scores saved     │
└──────────────────────────┘
```

### 2.2 Optimistic Local State Pattern for CourseViewer
To ensure navigation and interactions remain silky-smooth with 0ms latency:
1. **Local State as Primary Driver:** `CourseViewer` maintains local state (`currentLessonId`, `completedLessons`, `quizScores`) initialized from `progress` (or fallback).
2. **Immediate UI Update:** When the user selects a lesson or clicks "Complete & Continue", local state updates immediately.
3. **Asynchronous Background Sync:** Simultaneously, `CourseViewer` calls `markLessonCompleted(id)` and/or `saveCurrentLesson(id)`.
4. **Offline & Concurrency Handling:** Firestore's offline cache automatically queues writes if network connectivity drops, and resolves them upon reconnect.

### 2.3 URL Deep Linking & "Continue Learning"
When the user clicks "Continue Learning" on the Dashboard:
1. Dashboard resolves next unit (e.g. `lesson 4`) and navigates to `/programs/business-english?lesson=4`.
2. `CourseViewer` reads `searchParams.get('lesson')`:
   - If present and valid (0–15 or 101–105), it sets `currentLessonId` to `parseInt(lessonParam, 10)`.
   - If absent, it falls back to `progress?.lastLessonId ?? 0`.

---

## 3. Recommended Implementation Specification

### 3.1 Data Types (`src/types/progress.ts`)
```typescript
export interface QuizAttempt {
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    completedAt: string;
    answers?: Record<number, number>;
}

export interface ProgramProgressDocument {
    programId: string; // 'business-english'
    lastLessonId: number;
    completedLessons: number[];
    quizScores: Record<string, QuizAttempt>;
    updatedAt: string;
    createdAt: string;
}

export interface ProgramStats {
    overallPercentage: number;
    unitsMastered: number;
    assessmentsPassed: number;
    avgScore: number;
}

export interface ModuleProgress {
    id: number;
    title: string;
    totalUnits: number;
    completedUnits: number;
    percentage: number;
    isCompleted: boolean;
    quizPassed: boolean;
    quizScore?: QuizAttempt;
}
```

---

### 3.2 Step-by-Step Modifications for `CourseViewer.tsx`

#### Step 1: Add Imports
```typescript
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
```

#### Step 2: Connect to ProgressContext with URL Fallback
```typescript
const CourseViewer: React.FC = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const { progress, loading, saveCurrentLesson, markLessonCompleted, saveQuizScore } = useProgress();

    // 1. Resolve initial lesson from URL param or Firestore progress
    const urlLesson = searchParams.get('lesson');
    const [currentLessonId, setCurrentLessonId] = useState<number>(() => {
        if (urlLesson !== null && !isNaN(parseInt(urlLesson, 10))) {
            return parseInt(urlLesson, 10);
        }
        if (progress?.lastLessonId !== undefined) {
            return progress.lastLessonId;
        }
        return 0;
    });

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Sync lesson if URL search param changes
    useEffect(() => {
        if (urlLesson !== null) {
            const parsed = parseInt(urlLesson, 10);
            if (!isNaN(parsed) && parsed !== currentLessonId) {
                setCurrentLessonId(parsed);
            }
        }
    }, [urlLesson]);

    // Sync active lesson to Firestore
    useEffect(() => {
        if (currentUser && currentLessonId !== undefined) {
            saveCurrentLesson(currentLessonId).catch(console.error);
        }
    }, [currentLessonId, currentUser]);

    // Scroll to top when lesson changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [currentLessonId]);

    const completedLessons = progress?.completedLessons ?? [];
    const quizScores = progress?.quizScores ?? {};
    const lessonData = COURSE_DATA[currentLessonId];
```

#### Step 3: Handle Lesson Selection & Progression
```typescript
    const handleLessonSelect = (id: number) => {
        setCurrentLessonId(id);
        setSearchParams({ lesson: id.toString() });
        setIsMobileMenuOpen(false);
    };

    const handleLessonComplete = async () => {
        // Mark current as complete in Firestore
        await markLessonCompleted(currentLessonId);

        // Advance to next lesson in sequence
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
            setSearchParams({ lesson: nextId.toString() });
        } else {
            alert("Congratulations! You have completed the entire Zentia World Executive Program.");
        }
    };
```

#### Step 4: Render LessonView with Quiz Callback
```typescript
    <LessonView 
        data={lessonData} 
        lessonId={currentLessonId} 
        onComplete={handleLessonComplete}
        isCompleted={completedLessons.includes(currentLessonId)}
        existingQuizScore={quizScores[currentLessonId.toString()]}
        onQuizSubmit={async (score, total, answers) => {
            await saveQuizScore(currentLessonId, score, total, answers);
            await markLessonCompleted(currentLessonId);
        }}
    />
```

---

### 3.3 Step-by-Step Modifications for `components/ProgressCheck.tsx`

#### Step 1: Extend Component Props
```typescript
interface ProgressCheckProps {
    title: string;
    questions: QuizQuestion[];
    lessonId: number;
    existingScore?: QuizAttempt | null;
    onQuizSubmit?: (score: number, total: number, answers: Record<number, number>) => Promise<void> | void;
    isCompleted?: boolean;
}
```

#### Step 2: Handle Initial State & Remote Submissions
```typescript
const ProgressCheck: React.FC<ProgressCheckProps> = ({ 
    title, 
    questions, 
    lessonId, 
    existingScore,
    onQuizSubmit,
    isCompleted 
}) => {
    const [answers, setAnswers] = useState<{[key: number]: number}>(() => existingScore?.answers || {});
    const [showResults, setShowResults] = useState<boolean>(() => !!existingScore || !!isCompleted);
    const [score, setScore] = useState<number>(() => existingScore?.score || 0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Sync when lesson or existingScore changes
    useEffect(() => {
        if (existingScore) {
            setAnswers(existingScore.answers || {});
            setShowResults(true);
            setScore(existingScore.score);
        } else {
            setAnswers({});
            setShowResults(false);
            setScore(0);
        }
    }, [lessonId, existingScore]);

    const handleSubmit = async () => {
        let newScore = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                newScore++;
            }
        });
        setScore(newScore);
        setShowResults(true);

        if (onQuizSubmit) {
            setIsSubmitting(true);
            try {
                await onQuizSubmit(newScore, questions.length, answers);
            } catch (err) {
                console.error("Failed to save quiz score:", err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };
```

---

### 3.4 Step-by-Step Modifications for `components/LessonView.tsx`

Update `LessonViewProps` and the Quiz Wrapper:
```typescript
interface LessonViewProps {
    data: LessonData;
    lessonId: number;
    onComplete?: () => void;
    isCompleted?: boolean;
    existingQuizScore?: QuizAttempt | null;
    onQuizSubmit?: (score: number, total: number, answers: Record<number, number>) => Promise<void> | void;
}

// Inside LessonView:
if (data.type === 'quiz' && data.quiz) {
    return (
        <div className="flex flex-col h-full">
            <ProgressCheck 
                title={data.title} 
                questions={data.quiz} 
                lessonId={lessonId} 
                existingScore={existingQuizScore}
                onQuizSubmit={onQuizSubmit}
                isCompleted={isCompleted}
            />
            <div className="mt-12 flex justify-center pb-24">
                <button 
                    onClick={onComplete}
                    className={`
                        px-8 py-4 rounded-full font-bold shadow-lg transition-all flex items-center gap-3
                        ${isCompleted 
                            ? 'bg-slate-100 border-2 border-slate-200 text-slate-500 hover:bg-slate-200' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-xl'}
                    `}
                >
                    {isCompleted ? (
                        <>
                            <i className="fa-solid fa-check text-green-600"></i>
                            <span>Assessment Complete</span>
                            <i className="fa-solid fa-forward text-slate-400"></i>
                        </>
                    ) : (
                        <>
                            <span>Complete & Continue</span>
                            <i className="fa-solid fa-arrow-right"></i>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
```

---

### 3.5 Sidebar Enhancement (`components/Sidebar.tsx`)
In `Sidebar.tsx`, accept `completedLessons?: number[]` and display a discreet green checkmark on completed items:
```typescript
interface SidebarProps {
    currentLesson: number;
    onSelectLesson: (id: number) => void;
    completedLessons?: number[];
}
```
Inside `NavItem`:
```typescript
const isCompleted = completedLessons?.includes(id);
// Render check icon badge if completed:
{isCompleted && (
    <i className="fa-solid fa-circle-check text-green-400 text-xs ml-auto shrink-0"></i>
)}
```

---

## 4. Caveats & Edge Case Handling

1. **Unauthenticated / Guest Access:**
   If a user views `CourseViewer` without being logged in (though protected by `ProtectedRoute`), the code safely falls back to local in-memory/localStorage state without throwing unhandled exceptions.
2. **Corrupt / Malformed LocalStorage Data:**
   During migration, `try / catch` around `JSON.parse` protects against invalid JSON in `zentia_completed` or non-numeric values in `zentia_last_lesson`.
3. **Assessment Retake Invariance:**
   If a user retakes an assessment, the higher/latest score updates `quizScores[quizId]` while preserving the `completedLessons` entry.
4. **High Concurrency & Atomic Writes:**
   Firestore writes should use `setDoc(docRef, data, { merge: true })` or `updateDoc` with `arrayUnion` to prevent overwriting parallel updates.
5. **No Visual Flashing / Optimistic UI:**
   UI transitions (lesson switching, answering questions, clicking complete) update React state instantaneously, while Firestore promises execute asynchronously in the background.

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the full test harness to verify:
```powershell
node tests/e2e/tier1_progress.test.mjs
node tests/e2e/tier3_cross_feature.test.mjs
node tests/e2e/tier4_real_world.test.mjs
```

### 5.2 Manual Verification Steps
1. **Course Progression:**
   - Log in as a test user.
   - Navigate to `/programs/business-english`.
   - Complete Lesson 0 -> verify active lesson updates to Lesson 1.
   - Refresh page -> verify user resumes at Lesson 1.
2. **Assessment Submission:**
   - Navigate to Assessment 101 (`/programs/business-english?lesson=101`).
   - Answer all 5 questions and click "Submit Assessment".
   - Verify score banner appears, score is stored under `/users/{uid}/progress/business-english`, and unit 101 is added to `completedLessons`.
3. **LocalStorage Migration:**
   - In browser DevTools, set `localStorage.setItem('zentia_completed', '[0, 1, 2]')`.
   - Sign in -> verify Firestore receives `[0, 1, 2]` and `localStorage` keys are cleared.
4. **Dashboard Synchronicity:**
   - Visit `/dashboard` -> verify "Continue Learning" routes to the first uncompleted lesson.
