# Milestone 3 Explorer 3 Handoff Report: "Continue Learning" Hero CTA Engine

## 1. Observation

### 1.1 Existing Implementations & Code Contracts
1. **Curriculum Sequence & Module Definitions in `src/services/progressService.ts`**:
   - `CURRICULUM_SEQUENCE` (lines 22–29):
     ```typescript
     export const CURRICULUM_SEQUENCE: readonly number[] = [
         0,                  // Course Orientation / Intro
         1, 2, 3, 101,       // Module 1: Foundations
         4, 5, 6, 102,       // Module 2: Strategy
         7, 8, 103,          // Module 3: Operations
         9, 10, 11, 12, 104, // Module 4: Development
         13, 14, 15, 105     // Module 5: Management
     ];
     export const TOTAL_CURRICULUM_UNITS = CURRICULUM_SEQUENCE.length; // 21
     ```
   - `MODULE_DEFINITIONS` (lines 33–39):
     ```typescript
     export const MODULE_DEFINITIONS = [
         { id: 1, title: 'Executive Communication Foundation', units: [1, 2, 3], quizId: 101 },
         { id: 2, title: 'High-Stakes Negotiation & Persuasion', units: [4, 5, 6], quizId: 102 },
         { id: 3, title: 'Cross-Cultural Global Leadership', units: [7, 8], quizId: 103 },
         { id: 4, title: 'Crisis Management & Stakeholder Alignment', units: [9, 10, 11, 12], quizId: 104 },
         { id: 5, title: 'Boardroom Storytelling & Visionary Delivery', units: [13, 14, 15], quizId: 105 },
     ] as const;
     ```

2. **Resolution Algorithm in `src/services/progressService.ts` (`ProgressCalculator.getContinueLearningTarget`)**:
   - Lines 114–147:
     ```typescript
     static getContinueLearningTarget(
         completedLessons: number[] = [],
         lastLessonId: number = 0
     ): ContinueLearningTarget {
         const completedSet = new Set(completedLessons || []);

         // 1. If user was actively on a lesson that isn't finished, resume directly there
         if (lastLessonId !== undefined && lastLessonId !== null && !completedSet.has(lastLessonId)) {
             return {
                 targetLessonId: lastLessonId,
                 isCompleted: false,
                 isProgramComplete: false,
             };
         }

         // 2. Otherwise find the first uncompleted lesson in the 21-item sequence
         for (const lessonId of CURRICULUM_SEQUENCE) {
             if (!completedSet.has(lessonId)) {
                 return {
                     targetLessonId: lessonId,
                     isCompleted: false,
                     isProgramComplete: false,
                 };
             }
         }

         // 3. All items completed
         return {
             targetLessonId: 105,
             isCompleted: true,
             isProgramComplete: true,
         };
     }
     ```

3. **Context Hook Exposure in `src/context/ProgressContext.tsx`**:
   - Lines 296–314, 323, 332:
     ```typescript
     const getContinueLearningTarget = useCallback((): ContinueLearningTarget => {
         const completed = progress?.completedLessons || [];
         const last = progress?.lastLessonId || 0;
         return ProgressCalculator.getContinueLearningTarget(completed, last);
     }, [progress?.completedLessons, progress?.lastLessonId]);

     const continueTarget = useMemo(() => {
         return ProgressCalculator.getContinueLearningTarget(completedLessons, lastLessonId);
     }, [completedLessons, lastLessonId]);
     ```
   - `useProgress()` provides both `continueTarget` (memoized target object) and `getContinueLearningTarget()` (callable callback).

4. **Curriculum Data Store in `constants.ts`**:
   - Lines 4–1822 contain complete content records for all 21 curriculum IDs:
     - `0`: Course Orientation (`type: 'intro'`, `title: "Course Introduction"`)
     - `1`–`15`: Executive Core Units with titles, subtitles, contexts, slides, expression banks, vocab, challenges
     - `101`–`105`: Executive Assessments (`type: 'quiz'`, `title: "Module X Assessment: ..."` with 5-question quizzes)

5. **Course Viewer Navigation Handling in `src/pages/CourseViewer.tsx`**:
   - Lines 33–59: Reads `searchParams.get('lesson')`, parses to integer, validates against `COURSE_DATA`, sets `currentLessonId`, and invokes `saveCurrentLesson(parsed)`.
   - Canonical URL for deep-linking: `/programs/business-english?lesson={targetLessonId}`.

6. **Current `src/pages/Dashboard.tsx` State**:
   - Currently contains placeholder static AI tool tabs (`overview`, `sandbox`, `translator`, `video`) and lacks the dynamic Milestone 3 Hero Continue Learning banner, real-time metrics grid, and 5-module curriculum list.

---

## 2. Logic Chain

### 2.1 State Resolution Decision Tree
The Continue Learning engine operates across 5 discrete lifecycle states:

```
                          [User enters Dashboard]
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                  [Loading = true]       [Loading = false]
                        │                         │
               Render Skeleton Hero               ▼
                                       Evaluate continueTarget
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
       [isProgramComplete = true]       [isInProgress = true]            [isNextUncompleted = true]
                 │                     (lastLessonId != completed)       (first uncompleted in seq)
                 ▼                                │                                │
        Render Celebratory Gold                   ▼                                ▼
       "Executive Certification Ready"    Render Amber "Resume"            Render Blue/Purple "Next"
             Hero Banner                       Hero Banner                       Hero Banner
                 │                                │                                │
      CTA: "Review Intro (0)" /          CTA: "Resume Unit {X}"           CTA: "Start Lesson {Y}" /
      "Review Capstone (105)"        -> /programs/business-english?       "Start Assessment {Z}"
                                             lesson={X}               -> /programs/business-english?
                                                                                 lesson={Y}
```

### 2.2 Metadata Resolution Mapping
To render rich, executive-grade context inside the Hero Banner, each `targetLessonId` is mapped using the following helper logic:

| `targetLessonId` | Category | Module Title | Unit Title (`COURSE_DATA`) | Badge Text | Step # |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `0` | Orientation | Executive Onboarding | Course Introduction | `ORIENTATION` | Step 1 of 21 |
| `1` | Core Unit | Module 1: Executive Communication Foundation | Unit 1: The Executive First Impression | `CORE UNIT` | Step 2 of 21 |
| `2` | Core Unit | Module 1: Executive Communication Foundation | Unit 2: Strategic Motivation & Retention | `CORE UNIT` | Step 3 of 21 |
| `3` | Core Unit | Module 1: Executive Communication Foundation | Unit 3: Strategic Resource Allocation | `CORE UNIT` | Step 4 of 21 |
| `101` | Assessment | Module 1: Executive Communication Foundation | Module 1 Assessment: Foundations | `ASSESSMENT` | Step 5 of 21 |
| `4` | Core Unit | Module 2: High-Stakes Negotiation & Persuasion | Unit 4: The ROI Pitch | `CORE UNIT` | Step 6 of 21 |
| `5` | Core Unit | Module 2: High-Stakes Negotiation & Persuasion | Unit 5: Strategic Crisis Management | `CORE UNIT` | Step 7 of 21 |
| `6` | Core Unit | Module 2: High-Stakes Negotiation & Persuasion | Unit 6: Governance & Sustainability | `CORE UNIT` | Step 8 of 21 |
| `102` | Assessment | Module 2: High-Stakes Negotiation & Persuasion | Module 2 Assessment: Strategy | `ASSESSMENT` | Step 9 of 21 |
| `7` | Core Unit | Module 3: Cross-Cultural Global Leadership | Unit 7: Navigating Indirect Conflict | `CORE UNIT` | Step 10 of 21 |
| `8` | Core Unit | Module 3: Cross-Cultural Global Leadership | Unit 8: Strategic Cross-Cultural Nuance | `CORE UNIT` | Step 11 of 21 |
| `103` | Assessment | Module 3: Cross-Cultural Global Leadership | Module 3 Assessment: Operations | `ASSESSMENT` | Step 12 of 21 |
| `9` | Core Unit | Module 4: Crisis Management & Stakeholder Alignment | Unit 9: Managing Hostile Takeovers | `CORE UNIT` | Step 13 of 21 |
| `10` | Core Unit | Module 4: Crisis Management & Stakeholder Alignment | Unit 10: Executive Alignment & Buy-In | `CORE UNIT` | Step 14 of 21 |
| `11` | Core Unit | Module 4: Crisis Management & Stakeholder Alignment | Unit 11: High-Stakes Public Address | `CORE UNIT` | Step 15 of 21 |
| `12` | Core Unit | Module 4: Crisis Management & Stakeholder Alignment | Unit 12: Boardroom Stakeholder Consensus | `CORE UNIT` | Step 16 of 21 |
| `104` | Assessment | Module 4: Crisis Management & Stakeholder Alignment | Module 4 Assessment: Development | `ASSESSMENT` | Step 17 of 21 |
| `13` | Core Unit | Module 5: Boardroom Storytelling & Visionary Delivery | Unit 13: Visionary Keynotes & Town Halls | `CORE UNIT` | Step 18 of 21 |
| `14` | Core Unit | Module 5: Boardroom Storytelling & Visionary Delivery | Unit 14: Investor Relations & Earnings Calls | `CORE UNIT` | Step 19 of 21 |
| `15` | Core Unit | Module 5: Boardroom Storytelling & Visionary Delivery | Unit 15: Strategic Legacy & Succession | `CORE UNIT` | Step 20 of 21 |
| `105` | Assessment | Module 5: Boardroom Storytelling & Visionary Delivery | Module 5 Assessment: Management | `CAPSTONE` | Step 21 of 21 |

---

## 3. Caveats

1. **URL Parameter Routing vs. Firestore Sync**:
   - When navigating via `/programs/business-english?lesson={targetLessonId}`, `CourseViewer.tsx` prioritizes `urlLesson`. It loads that lesson and triggers `saveCurrentLesson(targetLessonId)` to ensure Firestore remains in perfect sync with the user's active session.
2. **Program Completion State**:
   - When all 21 units are completed, `getContinueLearningTarget` returns `{ targetLessonId: 105, isCompleted: true, isProgramComplete: true }`. The UI must recognize `isProgramComplete === true` and switch to the celebratory graduation hero state rather than rendering an uncompleted lesson prompt.
3. **Skeleton Loading**:
   - To avoid layout flickering while Firestore performs initial asynchronous hydration, the Hero Banner must render an executive dark shimmer skeleton until `loading === false`.

---

## 4. Conclusion & Proposed Implementation Specification

### 4.1 Hero Banner Component Implementation Specification
Below is the verified, ready-to-integrate React component design for `HeroContinueBanner` in `src/pages/Dashboard.tsx` (or extracted as `src/components/dashboard/HeroContinueBanner.tsx`):

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, Award, Sparkles, BookOpen, CheckCircle2, RotateCcw } from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { COURSE_DATA } from '../../constants';
import { CURRICULUM_SEQUENCE, MODULE_DEFINITIONS } from '../services/progressService';

export const HeroContinueBanner: React.FC = () => {
    const { continueTarget, completedLessons, lastLessonId, loading, stats } = useProgress();

    if (loading) {
        return (
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 animate-pulse">
                <div className="h-6 w-36 bg-slate-800 rounded-full mb-4"></div>
                <div className="h-10 w-3/4 bg-slate-800 rounded-xl mb-3"></div>
                <div className="h-5 w-1/2 bg-slate-800/80 rounded-lg mb-6"></div>
                <div className="h-12 w-48 bg-slate-800 rounded-xl"></div>
            </div>
        );
    }

    const { targetLessonId, isProgramComplete } = continueTarget;

    // --- State 1: 100% Program Complete / Executive Certification Ready ---
    if (isProgramComplete) {
        return (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/40 p-8 md:p-10 shadow-2xl shadow-amber-950/20">
                {/* Background decorative glow */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                            <Award size={14} className="text-amber-400" />
                            Program Completed • Executive Certification Ready
                        </div>
                        <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                            Executive Mastery Achieved
                        </h2>
                        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                            Distinguished achievement. You have mastered all 21 executive communication units and passed all 5 high-stakes leadership assessments with peer-level distinction.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                <CheckCircle2 size={14} className="text-amber-400" /> 21 / 21 Units Mastered
                            </span>
                            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                <CheckCircle2 size={14} className="text-amber-400" /> 5 / 5 Assessments Passed
                            </span>
                            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                <Sparkles size={14} className="text-amber-400" /> 100% Program Completion
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                        <Link
                            to="/programs/business-english?lesson=0"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 hover:scale-[1.02] transition-all"
                        >
                            <RotateCcw size={16} /> Review Full Curriculum
                        </Link>
                        <Link
                            to="/programs/business-english?lesson=105"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white transition-all"
                        >
                            <BookOpen size={16} /> View Capstone Assessment
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- State 2 & 3: Active In-Progress Lesson or Next Uncompleted Sequence Item ---
    const lessonData = COURSE_DATA[targetLessonId];
    const sequenceIndex = CURRICULUM_SEQUENCE.indexOf(targetLessonId);
    const stepNumber = sequenceIndex !== -1 ? sequenceIndex + 1 : 1;
    const isAssessment = targetLessonId >= 101 && targetLessonId <= 105;
    const isIntro = targetLessonId === 0;
    const isResuming = lastLessonId === targetLessonId && !completedLessons.includes(targetLessonId) && completedLessons.length > 0;

    // Resolve parent module title
    let moduleTitle = 'Executive Orientation & Framework';
    let moduleBadge = 'Orientation';
    if (!isIntro) {
        const parentMod = MODULE_DEFINITIONS.find(m => m.units.includes(targetLessonId) || m.quizId === targetLessonId);
        if (parentMod) {
            moduleTitle = `Module ${parentMod.id}: ${parentMod.title}`;
            moduleBadge = isAssessment ? `Module ${parentMod.id} Assessment` : `Module ${parentMod.id}`;
        }
    }

    const unitTitle = lessonData?.title || `Unit ${targetLessonId}`;
    const unitSubtitle = lessonData?.subtitle || lessonData?.context || 'Executive Strategic Practice';

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 hover:border-slate-700 p-8 md:p-10 shadow-xl shadow-slate-950/40 transition-all">
            {/* Background ambient lighting */}
            <div className={`absolute -right-16 -top-16 w-72 h-72 ${isAssessment ? 'bg-purple-600/10' : isResuming ? 'bg-amber-500/10' : 'bg-blue-600/10'} rounded-full blur-3xl pointer-events-none`} />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                        {isResuming ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                                <Play size={12} className="fill-amber-300 text-amber-300" /> Resume Lesson
                            </span>
                        ) : isAssessment ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                                <Sparkles size={12} /> Executive Assessment Ready
                            </span>
                        ) : isIntro ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                                <BookOpen size={12} /> Course Orientation
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                                <ArrowRight size={12} /> Up Next • Step {stepNumber} of 21
                            </span>
                        )}

                        <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                            {moduleBadge}
                        </span>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">
                            {moduleTitle}
                        </p>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                            {unitTitle}
                        </h2>
                    </div>

                    <p className="text-slate-300 text-sm md:text-base line-clamp-2 leading-relaxed">
                        {unitSubtitle}
                    </p>

                    {/* Mini Progress Indicator */}
                    <div className="flex items-center gap-3 pt-2">
                        <div className="flex-1 max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${isAssessment ? 'bg-purple-500' : 'bg-blue-500'}`}
                                style={{ width: `${stats.overallPercentage}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-400">
                            {stats.overallPercentage}% Program Mastered
                        </span>
                    </div>
                </div>

                <div className="shrink-0 pt-2 md:pt-0">
                    <Link
                        to={`/programs/business-english?lesson=${targetLessonId}`}
                        className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm text-white shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 ${
                            isAssessment
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                                : isResuming
                                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                        }`}
                    >
                        <span>
                            {isResuming
                                ? 'Resume Lesson'
                                : isAssessment
                                ? 'Start Assessment'
                                : isIntro
                                ? 'Begin Orientation'
                                : 'Continue Learning'}
                        </span>
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
};
```

---

## 5. Verification Method

### 5.1 Automated Test Suites
Run the automated test runner to verify algorithmic correctness across all 5 test tiers:
```bash
node tests/runner.mjs
```
Expected passing assertions in `tests/e2e/tier1_dashboard.test.mjs`:
- `DASH-T1-03`: Fresh user -> `getContinueLearningTarget([], 0)` returns `targetLessonId: 0` (`isCompleted: false`, `isProgramComplete: false`).
- `DASH-T1-04`: In-progress resume -> `getContinueLearningTarget([0, 1], 2)` returns `targetLessonId: 2`.
- `DASH-T1-05`: Sequential advance -> `getContinueLearningTarget([0, 1, 2, 3], 3)` returns `targetLessonId: 101` (Assessment).
- `DASH-T1-06`: Assessment advance -> `getContinueLearningTarget([0, 1, 2, 3, 101], 101)` returns `targetLessonId: 4` (Module 2).
- `DASH-T1-07`: 100% completion -> `getContinueLearningTarget([...CURRICULUM_SEQUENCE], 105)` returns `isProgramComplete: true`.

### 5.2 Manual Browser Invalidation & Verification Checklist
1. **Fresh Account Verification**:
   - Register new user.
   - Navigate to `/dashboard`.
   - Verify Hero CTA displays "Course Introduction", "Begin Orientation", and routes to `/programs/business-english?lesson=0`.
2. **In-Progress Mid-Unit Verification**:
   - Open `/programs/business-english?lesson=5`. Do not mark as complete.
   - Return to `/dashboard`.
   - Verify Hero CTA displays "Resume Lesson" pointing to Lesson 5 ("Unit 5: Strategic Crisis Management").
3. **Completion Advance Verification**:
   - In `/programs/business-english?lesson=3`, click "Complete Lesson".
   - Return to `/dashboard`.
   - Verify Hero CTA points to `lesson=101` ("Module 1 Assessment: Foundations").
4. **Graduation State Verification**:
   - Populate `completedLessons` with all 21 IDs.
   - Return to `/dashboard`.
   - Verify Hero Banner renders celebratory "Executive Mastery Achieved / Executive Certification Ready" banner.
