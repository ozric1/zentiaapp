# Specification Mining & Architecture Report: Progress Tracking, Data Schemas & Personalized Dashboard

**Agent**: `spec_miner_survey_3`  
**Working Directory**: `.agents/spec_miner_survey_3/`  
**Target Program**: Zentia World — Executive Business English Program  
**Authoritative Sources**: `ORIGINAL_REQUEST.md`, `constants.ts`, `types.ts`, `App.tsx`, `src/App.tsx`, `src/pages/CourseViewer.tsx`, `src/pages/Dashboard.tsx`, `components/LessonView.tsx`, `components/ProgressCheck.tsx`, `components/Sidebar.tsx`

---

## 1. Observation

### 1.1 Codebase & Curriculum Observations
1. **Curriculum Hierarchy & Structure (`constants.ts:3-1815`)**:
   - Total Units/Items: 21 items across 5 core Modules plus an Introduction.
   - **Unit 0**: Course Introduction (`type: 'intro'`).
   - **Module 1: Foundations**:
     - Unit 1 (`id: 1`): *"The Executive First Impression"* (Subtitle: *"Executive Presence"*)
     - Unit 2 (`id: 2`): *"Strategic Motivation & Retention"* (Subtitle: *"Executive Leadership"*)
     - Unit 3 (`id: 3`): *"Strategic Resource Allocation"* (Subtitle: *"High Stakes Diplomacy"*)
     - Assessment 101 (`id: 101`, `type: 'quiz'`): *"Module 1 Assessment: Foundations"* (5 questions)
   - **Module 2: Strategy**:
     - Unit 4 (`id: 4`): *"The ROI Pitch"* (Subtitle: *"Strategic Influence"*)
     - Unit 5 (`id: 5`): *"Strategic Crisis Management"* (Subtitle: *"Mastering Diplomacy"*)
     - Unit 6 (`id: 6`): *"Governance & Sustainability"* (Subtitle: *"Speaking with Impact"*)
     - Assessment 102 (`id: 102`, `type: 'quiz'`): *"Module 2 Assessment: Strategy"* (5 questions)
   - **Module 3: Operations**:
     - Unit 7 (`id: 7`): *"Strategic Decision Making"* (Subtitle: *"Commanding Authority"*)
     - Unit 8 (`id: 8`): *"Operational Efficiency & Automation"* (Subtitle: *"Speaking with Impact"*)
     - Assessment 103 (`id: 103`, `type: 'quiz'`): *"Module 3 Assessment: Operations"* (5 questions)
   - **Module 4: Development**:
     - Unit 9 (`id: 9`): *"Strategic Project Oversight"* (Subtitle: *"Commanding Authority"*)
     - Unit 10 (`id: 10`): *"Internal Intrapreneurship"* (Subtitle: *"Commanding Authority"*)
     - Unit 11 (`id: 11`): *"Executive Digital Presence"* (Subtitle: *"Mastering Diplomacy"*)
     - Unit 12 (`id: 12`): *"Leading Organizational Transformation"* (Subtitle: *"Mastering Diplomacy"*)
     - Assessment 104 (`id: 104`, `type: 'quiz'`): *"Module 4 Assessment: Development"* (5 questions)
   - **Module 5: Management**:
     - Unit 13 (`id: 13`): *"Strategic Data Narrative"* (Subtitle: *"Speaking with Impact"*)
     - Unit 14 (`id: 14`): *"Global Strategic Alignment"* (Subtitle: *"Mastering Diplomacy"*)
     - Unit 15 (`id: 15`): *"Executive Performance Management"* (Subtitle: *"Commanding Authority"*)
     - Assessment 105 (`id: 105`, `type: 'quiz'`): *"Module 5 Assessment: Management"* (5 questions)

2. **Sequential Progression Flow (`src/pages/CourseViewer.tsx:53-60`)**:
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

3. **Current LocalStorage State Storage (`src/pages/CourseViewer.tsx:11-31` & `App.tsx:10-30`)**:
   - `zentia_last_lesson`: Scalar string storing `currentLessonId` (e.g. `"0"`, `"1"`).
   - `zentia_completed`: JSON serialized array of numbers (e.g. `"[0, 1, 2]"`).
   - Deficiencies observed:
     - No user association (shared globally on local device).
     - Quiz scores calculated in `components/ProgressCheck.tsx:27-36` are retained only in local React state `score` and are lost on unmount/page reload.
     - No timestamps (`createdAt`, `updatedAt`, `completedAt`).
     - No offline queuing or cloud synchronization.

4. **Current Dashboard Implementation (`src/pages/Dashboard.tsx:1-150`)**:
   - Contains a static sidebar with tabs: `'overview'`, `'sandbox'`, `'translator'`, `'video'`.
   - The `'overview'` tab has a hardcoded static "Smart 'Nudge' Tracker" mock and static user name "Alex Director".
   - It does NOT yet integrate with user authentication, Firestore progress metrics, course completion calculations, or a "Continue Learning" button linking to `/programs/business-english`.

5. **Routing & Application Entry (`src/App.tsx:10-15` & `ORIGINAL_REQUEST.md:14-23`)**:
   - Routes:
     - `/` -> `LandingPage`
     - `/programs/business-english` -> `CourseViewer` (must be protected)
     - `/dashboard` -> `Dashboard` (must be protected)
     - `/login` -> Authentication page (needed for Email/Password and Google Sign-In)

---

## 2. Logic Chain

1. **User Request R1 & Acceptance Criteria Require Route Protection & Authentication**:
   - Unauthenticated visitors attempting to visit `/dashboard` or `/programs/business-english` must be intercepted by an `AuthGuard` / `ProtectedRoute` wrapper and redirected to `/login`.
   - Upon successful sign-in, user's UID and profile metadata (`email`, `displayName`, `photoURL`) are initialized in Firestore at `/users/{uid}`.

2. **User Request R2 Requires Scalable, Multi-User Resilient Firestore Architecture**:
   - The user base will scale to thousands of concurrent users.
   - Document partitioning per user UID (`/users/{uid}/progress/business-english`) ensures $O(1)$ reads/writes with zero write contention between different users.
   - Atomic array operations (`arrayUnion`) and `setDoc(..., { merge: true })` guarantee idempotent writes even during rapid navigation or multiple simultaneous client sessions.
   - Enabling Firestore offline cache (`persistentLocalCache` / IndexedDB) guarantees seamless offline learning and zero-data-loss queuing.

3. **LocalStorage to Firestore Migration Protocol**:
   - First-time authenticated login must detect any existing progress stored in `localStorage` (`zentia_completed`, `zentia_last_lesson`).
   - Merge algorithm:
     - Combine `localStorage` completed lessons with Firestore completed lessons using a set union.
     - Preserve quiz scores if existing, or initialize default quiz score records.
     - Commit merged record to Firestore.
     - Mark migration complete locally or clean up legacy keys to prevent re-merging stale data.

4. **User Request R3 Requires Real-Time Personalized Dashboard & Continue Learning Mechanics**:
   - Dashboard must subscribe to `/users/{uid}/progress/business-english` via Firestore snapshot or asynchronous hook.
   - Total progress calculation:
     $$\text{Overall Progress} = \left( \frac{\text{count of completed lessons in sequence}}{\text{total sequence length (21)}} \right) \times 100\%$$
   - "Continue Learning" target resolution:
     - Look up `lastLessonId`. If `lastLessonId` is set and valid, check if it's incomplete.
     - Otherwise, find the lowest index in `sequence` not present in `completedLessons`.
     - Route to `/programs/business-english` and automatically select that lesson ID.

---

## 3. Caveats

1. **Firebase Configuration**:
   - Firebase project ID is `zentia-573f8`.
   - Security Rules must be configured to ensure users can only read and write their own UID records (`request.auth.uid == resource.data.userId` or path match `/users/{uid}/...`).
2. **Backward Compatibility**:
   - If an unauthenticated user explores before logging in (if allowed on landing page), localStorage can act as a temporary holding buffer until login triggers migration.
3. **Module 3 Item Count**:
   - Note that Module 3 has 2 units (7, 8) + Assessment 103 (3 items total), whereas Module 4 has 4 units (9, 10, 11, 12) + Assessment 104 (5 items total). Calculations must dynamically use actual module definitions rather than assuming equal unit counts per module.

---

## 4. Conclusion & Technical Specifications

### 4.1 Target Firestore Data Schema

#### A. User Profile Document: `/users/{uid}`
```typescript
interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    role: 'learner' | 'executive' | 'admin';
    organization?: string;
    createdAt: Timestamp;
    lastLoginAt: Timestamp;
}
```

#### B. Program Progress Document: `/users/{uid}/progress/{programId}`
*(Where `programId` = `"business-english"`)*
```typescript
interface QuizScoreRecord {
    quizId: number;              // e.g. 101, 102, 103, 104, 105
    score: number;               // 0 to 5
    totalQuestions: number;      // 5
    percentage: number;          // 0 to 100
    passed: boolean;             // percentage >= 80
    attemptsCount: number;       // Number of times attempted
    lastAttemptedAt: Timestamp;
    answers?: Record<number, number>; // { [questionId]: selectedOptionIndex }
}

interface ModuleProgressSummary {
    moduleId: number;            // 1 to 5
    moduleTitle: string;
    completedUnitsCount: number;
    totalUnitsCount: number;
    assessmentPassed: boolean;
    percentage: number;
    isCompleted: boolean;
}

interface ProgramProgressDocument {
    userId: string;
    programId: string;           // "business-english"
    lastLessonId: number;        // ID of last viewed lesson (0..15, 101..105)
    completedLessons: number[];  // Array of completed lesson & quiz IDs
    quizScores: Record<string, QuizScoreRecord>; // Key: quizId as string ("101", etc.)
    moduleProgress: Record<string, ModuleProgressSummary>; // Key: "module_1", etc.
    stats: {
        totalItemsCount: number;       // 21
        completedItemsCount: number;   // count of completedLessons
        overallPercentage: number;     // 0 to 100
        passedAssessmentsCount: number;// 0 to 5
        averageQuizScore: number;      // average percentage across taken quizzes
        lastActiveAt: Timestamp;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
```

---

### 4.2 LocalStorage Migration & Sync Specification

```
[User Authenticates (Login/Signup)]
               │
               ▼
[Check LocalStorage] ──> Has `zentia_completed` or `zentia_last_lesson`?
               │
      ┌────────┴────────┐
     YES                NO
      │                 │
      ▼                 ▼
[Fetch Firestore Doc] [Fetch Firestore Doc or Init Blank]
      │
      ▼
[Execute Merge Algorithm]:
  - mergedCompleted = Array.from(new Set([...firestore.completedLessons, ...local.completed]))
  - mergedLastLesson = local.lastLesson || firestore.lastLesson || 0
  - recalculate stats and module progress
      │
      ▼
[Atomic setDoc(merge: true) to Firestore]
      │
      ▼
[Clear Legacy LocalStorage Keys] -> `zentia_completed`, `zentia_last_lesson`
      │
      ▼
[App State Subscribed to Firestore]
```

---

### 4.3 "Continue Learning" Resolution Algorithm

```typescript
function getContinueLearningTarget(
    completedLessons: number[], 
    lastLessonId: number, 
    sequence: number[] = [0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103, 9, 10, 11, 12, 104, 13, 14, 15, 105]
): { targetLessonId: number; isCompleted: boolean; isProgramComplete: boolean } {
    // 1. If program is 100% completed
    const allCompleted = sequence.every(id => completedLessons.includes(id));
    if (allCompleted) {
        return { targetLessonId: 0, isCompleted: true, isProgramComplete: true };
    }

    // 2. If lastLessonId is set, valid, and not yet completed, resume there
    if (sequence.includes(lastLessonId) && !completedLessons.includes(lastLessonId)) {
        return { targetLessonId: lastLessonId, isCompleted: false, isProgramComplete: false };
    }

    // 3. Find the first uncompleted lesson in the sequential order
    const nextUncompleted = sequence.find(id => !completedLessons.includes(id));
    return {
        targetLessonId: nextUncompleted !== undefined ? nextUncompleted : 0,
        isCompleted: false,
        isProgramComplete: false
    };
}
```

---

### 4.4 Personalized Dashboard Layout Specification

1. **User Welcome Banner**:
   - User Name: `user.displayName || user.email.split('@')[0]`
   - Avatar / Initial Icon
   - Role Badge: `"Executive Corporate Learner"`
2. **Hero "Continue Learning" Action Card**:
   - Current Unit Title, Subtitle, and Module label.
   - High-contrast button: `"Continue Learning"` $\to$ links to `/programs/business-english` with `lessonId` state.
   - Progress bar for the current module.
3. **Core Metrics Grid (4 Stat Cards)**:
   - **Overall Completion**: Percentage ring/bar + count (`X / 21 Items`).
   - **Units Mastered**: Count of completed core units (`X / 15 Units`).
   - **Assessments Passed**: Count of passed assessments (`X / 5 Assessments`).
   - **Avg Assessment Score**: Average score percentage across all submitted quizzes.
4. **Curriculum Modules Breakdown (5 Modules)**:
   - Module 1: Foundations (Units 1-3, Check 101)
   - Module 2: Strategy (Units 4-6, Check 102)
   - Module 3: Operations (Units 7-8, Check 103)
   - Module 4: Development (Units 9-12, Check 104)
   - Module 5: Management (Units 13-15, Check 105)
   - Each card displays module progress bar, status (Not Started / In Progress / Completed), and individual unit status pills.
5. **Assessment History Section**:
   - Lists all 5 assessments with score pills (e.g. `100% Mastered`, `80% Passed`, `Unattempted`), score breakdown, and retake link.

---

## 5. Verification Method

1. **Data Model Verification**:
   - Inspect `types.ts` to ensure `ProgramProgressDocument`, `QuizScoreRecord`, and `UserProfile` interfaces match all program requirements.
2. **Curriculum Mapping Verification**:
   - Check all 21 items in `constants.ts` against `sequence` array `[0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103, 9, 10, 11, 12, 104, 13, 14, 15, 105]`.
3. **Migration Verification**:
   - Test localStorage initial state with mock items `[0, 1]` and verify migration merges into Firestore without data loss.
4. **Concurrency & Resilience Verification**:
   - Verify `setDoc` with `{ merge: true }` and `arrayUnion` ensures zero collision across concurrent writes.
5. **Dashboard & Resume Learning Verification**:
   - Validate `getContinueLearningTarget` with edge cases (empty completed array, partial completed array, all completed array, quiz in progress).

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Curriculum | 15 Executive Units | 15 structured units with slides, charts, expression banks, controlled practice, challenges, and activities | `COURSE_DATA[1..15]` | Rendered interactive lesson view | Fallback error screen if ID not found | `constants.ts`, `LessonView.tsx` |
| 2 | Curriculum | Course Intro | Unit 0 overview introducing the executive curriculum | `COURSE_DATA[0]` | Intro interactive view | Fallback to default | `constants.ts`, `IntroView.tsx` |
| 3 | Curriculum | 5 Module Assessments | Quizzes (IDs 101 to 105) with 5 multiple-choice questions per assessment (25 total questions) | `COURSE_DATA[101..105]` | Interactive quiz UI, scoring (0-100%), pass/fail evaluation | Prevents modification after submit; allow retake | `constants.ts`, `ProgressCheck.tsx` |
| 4 | Navigation | Sequence Engine | Linear order of 21 curriculum items interleaving units and assessments | `currentLessonId`, `sequence` | Next/Previous lesson ID navigation | Clamps at start (0) and end (105) | `CourseViewer.tsx:53-65` |
| 5 | State | LocalStorage Persistence | Legacy caching for current lesson and completed lesson IDs | `zentia_last_lesson`, `zentia_completed` | Number, number array | Defaults to 0 and `[]` on parse error | `CourseViewer.tsx:11-31` |
| 6 | Firestore | User Profile Store | Centralized document storing user identity, email, displayName, role, timestamps | `auth.currentUser` | `/users/{uid}` document | Handles missing profile gracefully | `ORIGINAL_REQUEST.md:R1` |
| 7 | Firestore | Progress Tracking Store | Dedicated document per user storing completed lessons, quiz scores, metrics, timestamps | `uid`, `completedLessons`, `quizScores` | `/users/{uid}/progress/business-english` | Offline caching via IndexedDB; merge on reconnect | `ORIGINAL_REQUEST.md:R2` |
| 8 | Migration | LocalStorage to Firestore Sync | Automatic one-time merge of guest/localStorage data into user's Firestore document upon login | Local storage keys + Remote doc | Merged Firestore record, cleared local keys | Retains local copy if remote write fails | `ORIGINAL_REQUEST.md:R2` |
| 9 | Dashboard | Personalized Stats | Real-time calculation of overall progress %, units completed (0-15), checks passed (0-5), avg score | Firestore progress doc | Calculated metrics & stat cards | Shows skeleton loader while fetching | `ORIGINAL_REQUEST.md:R3` |
| 10 | Dashboard | Continue Learning CTA | Automated resolution of user's active/next uncompleted lesson with direct jump button | `completedLessons`, `lastLessonId` | Target lesson ID and navigation route | Points to Unit 0 if all completed | `ORIGINAL_REQUEST.md:R3` |
| 11 | Dashboard | Module Progress Grid | Visual breakdown of the 5 modules with progress bars, unit lists, and assessment badges | `moduleProgress` records | 5 module summary cards | Displays 0% for unstarted modules | `ORIGINAL_REQUEST.md:R3` |
| 12 | Dashboard | Assessment History | Detailed records of quiz scores, dates, and mastery ratings (Mastered $\ge 80\%$) | `quizScores` record | Assessment history cards with score badges | Shows "Unattempted" for pending quizzes | `ORIGINAL_REQUEST.md:R3` |
| 13 | Interactive | Executive AI Tools | Communication Sandbox, Technical-to-Human Translator, Video Analysis | User prompt, text, audio | AI-generated feedback & evaluations | Displays error notice if Gemini API fails | `src/components/tools/` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Sequence Navigation | Navigating past Assessment 105 (last item) | Sequence array ends at index 20 (id 105); next button disables or stays on 105 |
| 2 | Continue Learning | User has completed all 21 items (0-15, 101-105) | `getContinueLearningTarget` detects 100% completion; renders "Program Completed" banner and routes to Unit 0 or review |
| 3 | LocalStorage Migration | Corrupted JSON in `localStorage.getItem('zentia_completed')` | `try/catch` fallback initializes empty array `[]` without crashing the application |
| 4 | LocalStorage Migration | User logs into account on new device with clean localStorage | Migration detects empty local storage; reads existing Firestore data without overwriting remote progress |
| 5 | LocalStorage Migration | User completes lessons offline on device A, while device B had other progress | Set-union merge (`new Set([...docA, ...docB])`) preserves all completed items from both sessions |
| 6 | Quiz Submission | User clicks answer after clicking "Submit Assessment" | `ProgressCheck.tsx:23` guards `if (showResults) return;` preventing answer modification after grading |
| 7 | Offline Network | User completes lesson while disconnected from internet | Firestore offline persistence queues write locally; UI updates optimistically; writes sync on reconnection |
| 8 | Unauthenticated Route | Logged-out user visits `/programs/business-english` or `/dashboard` | `ProtectedRoute` intercepts request, saves redirect target in location state, and redirects to `/login` |
| 9 | Multi-Tab Concurrency | User completes Lesson 1 in Tab A and Lesson 2 in Tab B | Firestore `arrayUnion` or real-time snapshot listener synchronizes state across tabs without race condition |
