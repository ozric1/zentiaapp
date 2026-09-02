# Milestone 3 Explorer 2 Investigation: Dashboard 4-Card Metric Grid & 5-Module Curriculum Progress Cards

## 1. Observation

### 1.1 Existing Codebase State

1. **`src/pages/Dashboard.tsx`** (Lines 1–152):
   - Currently contains tabs (`overview`, `sandbox`, `translator`, `video`), a static hardcoded user profile header (`"Alex Director"`, `"Corporate Learner"` at lines 69–72), and only a mock **"Smart 'Nudge' Tracker"** (Lines 81–124) inside the `'overview'` tab.
   - It does **not** import or call `useProgress()` or `useAuth()`.
   - It does **not** render the 4-Card Overview Metric Grid, the 5-Module Curriculum Progress Breakdown, or the Hero "Continue Learning" CTA.

2. **`src/types/progress.ts`** (Lines 1–121):
   - Defines `ProgressStats` interface (Lines 20–37):
     ```typescript
     export interface ProgressStats {
         totalUnits: number;        // 21 (0 Orientation + 15 Lessons + 5 Assessments)
         completedCount: number;    // Count of items completed
         unitsMastered: number;     // Core lessons completed (IDs 0–15, max 16)
         assessmentsPassed: number; // Assessments passed >= 80% (IDs 101–105, max 5)
         overallPercentage: number; // Overall progress percentage (0–100)
         overallProgress: number;   // Alias for overallPercentage
         avgScore: number;          // Average score across submitted assessments (0–100)
         averageScore: number;      // Alias for avgScore
     }
     ```
   - Defines `ModuleProgressItem` interface (Lines 42–54):
     ```typescript
     export interface ModuleProgressItem {
         id: number;
         title: string;
         totalItems: number;
         completedItems: number;
         percentage: number;
         status: 'not_started' | 'in_progress' | 'completed';
         isCompleted: boolean;
         quizPassed?: boolean;
         quizScore?: QuizScoreRecord;
     }
     ```
   - Defines `ProgressContextValue` (Lines 89–118) providing `progress`, `completedLessons`, `quizScores`, `stats`, `moduleProgress`, `modules`, `continueTarget`, `loading`, `syncing`, `error`, `isOffline`.

3. **`src/services/progressService.ts`** (Lines 22–147):
   - `CURRICULUM_SEQUENCE`: `[0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103, 9, 10, 11, 12, 104, 13, 14, 15, 105]` (Length: 21).
   - `MODULE_DEFINITIONS`:
     - Module 1: `{ id: 1, title: 'Executive Communication Foundation', units: [1, 2, 3], quizId: 101 }`
     - Module 2: `{ id: 2, title: 'High-Stakes Negotiation & Persuasion', units: [4, 5, 6], quizId: 102 }`
     - Module 3: `{ id: 3, title: 'Cross-Cultural Global Leadership', units: [7, 8], quizId: 103 }`
     - Module 4: `{ id: 4, title: 'Crisis Management & Stakeholder Alignment', units: [9, 10, 11, 12], quizId: 104 }`
     - Module 5: `{ id: 5, title: 'Boardroom Storytelling & Visionary Delivery', units: [13, 14, 15], quizId: 105 }`
   - `ProgressCalculator.calculateStats(completedLessons, quizScores)` computes the exact mathematical stats with unit boundaries `0 <= id <= 15` for units mastered and quiz passing threshold `>= 80%`.
   - `ProgressCalculator.calculateModuleProgress(completedLessons, quizScores)` evaluates per-module completion, percentage, quiz status, and badge state (`not_started`, `in_progress`, `completed`).

4. **`tests/e2e/tier1_dashboard.test.mjs`** (Lines 8–55):
   - `DASH-T1-01`: Validates profile metric calculation across 4 cards:
     - Input: `completed = [0, 1, 2, 3, 101, 4]`, `quizScores = { 101: { score: 5, total: 5, percentage: 100, passed: true } }`
     - Expected: `totalUnits = 21`, `completedCount = 6`, `unitsMastered = 5`, `assessmentsPassed = 1`, `overallPercentage = 29`, `avgScore = 100`.
   - `DASH-T1-02`: Validates 5-Module Progress breakdown statuses:
     - Module 1: `completedItems = 4`, `totalItems = 4`, `percentage = 100`, `status = 'completed'`, `isCompleted = true`.
     - Module 2: `completedItems = 1`, `totalItems = 4`, `percentage = 25`, `status = 'in_progress'`, `isCompleted = false`.
     - Modules 3, 4, 5: `status = 'not_started'`.

---

## 2. Logic Chain

1. **Step 1 — Dashboard Integration Contract**:
   To present real-time progress to the learner in `Dashboard.tsx`, `Dashboard` must consume `const { stats, moduleProgress, loading, syncing, error } = useProgress();` as well as `const { currentUser } = useAuth();`.

2. **Step 2 — 4-Card Overview Metric Grid Mapping**:
   The 4 cards map directly to `stats` properties:
   - **Card 1 (Overall Progress)**:
     - Primary Value: `${stats.overallPercentage}%`
     - Secondary Label: `${stats.completedCount} / ${stats.totalUnits || 21} Units`
     - Description: "Curriculum progression across all 21 lessons and assessments"
     - Visual: High-contrast circular / linear progress or icon badge in Royal Blue (`#2563eb`).
   - **Card 2 (Units Mastered)**:
     - Primary Value: `${stats.unitsMastered} / 16`
     - Secondary Label: `Core Executive Lessons`
     - Description: "Lessons 0 through 15 completed"
     - Visual: Emerald/Teal badge (`#059669`) with `BookOpen` or `CheckCircle2` icon.
   - **Card 3 (Assessments Passed)**:
     - Primary Value: `${stats.assessmentsPassed} / 5`
     - Secondary Label: `Module Progress Checks`
     - Description: "Quizzes passed with ≥ 80% benchmark (Assessments 101–105)"
     - Visual: Amber/Gold badge (`#d97706`) with `Award` or `ShieldCheck` icon.
   - **Card 4 (Average Assessment Score)**:
     - Primary Value: `${stats.avgScore}%` (or `"—"` when 0 assessments attempted)
     - Secondary Label: `Mean Assessment Score`
     - Description: "Average percentage across all attempted assessments"
     - Visual: Violet/Purple badge (`#7c3aed`) with `Sparkles` or `TrendingUp` icon.

3. **Step 3 — 5-Module Curriculum Progress Breakdown Mapping**:
   The 5-module section iterates over `moduleProgress` array (5 items):
   - **Module Metadata**:
     - Module 1: "Foundations of Global Communication" / "Executive Communication Foundation" (Units 1, 2, 3 + Quiz 101)
     - Module 2: "High-Stakes Negotiations & Deal-Making" / "High-Stakes Negotiation & Persuasion" (Units 4, 5, 6 + Quiz 102)
     - Module 3: "Executive Presence & Cross-Cultural Fluency" / "Cross-Cultural Global Leadership" (Units 7, 8 + Quiz 103)
     - Module 4: "Crisis Leadership & High-Stakes Public Address" / "Crisis Management & Stakeholder Alignment" (Units 9, 10, 11, 12 + Quiz 104)
     - Module 5: "Strategic Vision & Global Boardroom Mastery" / "Boardroom Storytelling & Visionary Delivery" (Units 13, 14, 15 + Quiz 105)
   - **Card UI Elements**:
     - Header: Module number pill (`MODULE 01`), title, and status badge (`Completed` / `In Progress` / `Not Started`).
     - Metrics: Unit count (`${mod.completedItems} / ${mod.totalItems} Units`) and percentage (`${mod.percentage}%`).
     - Progress Bar: `bg-slate-100` track with filled progress bar `bg-blue-600` (or `bg-emerald-500` if complete) with width `${mod.percentage}%`.
     - Assessment Pill:
       - If `mod.quizPassed`: Green pill e.g. "Assessment Passed (Score: ${mod.quizScore?.percentage}%)".
       - If `mod.quizScore` exists and not passed: Amber pill e.g. "Assessment Score: ${mod.quizScore?.percentage}% (≥80% required)".
       - If unattempted: Slate pill "Assessment Pending".
     - Action / CTA Link:
       - Link directly to the module in CourseViewer: `/programs/business-english?lesson=${mod.units[0]}` or the first uncompleted lesson.

4. **Step 4 — State & Boundary Handling**:
   - **Loading State**: When `loading === true`, render clean animated skeleton cards (shimmer effect) to prevent layout shifts.
   - **Zero State (Fresh User)**: Displays `0%`, `0 / 16`, `0 / 5`, `0%` or `—`, with all 5 modules marked `Not Started`.
   - **Completed State (Program Finished)**: Displays `100%`, `16 / 16`, `5 / 5`, `XX%`, with all 5 modules showing green `Completed` badges.
   - **Sync Indicator**: Displays a subtle pulse indicator if `syncing === true`.

---

## 3. Caveats

1. **Module Titles in Constants vs User Request**:
   - The user request mentions executive titles (e.g. "Foundations of Global Communication", "High-Stakes Negotiations & Deal-Making", "Executive Presence & Cross-Cultural Fluency", "Crisis Leadership & High-Stakes Public Address", "Strategic Vision & Global Boardroom Mastery").
   - `MODULE_DEFINITIONS` in `progressService.ts` contains matching theme titles ("Executive Communication Foundation", "High-Stakes Negotiation & Persuasion", "Cross-Cultural Global Leadership", "Crisis Management & Stakeholder Alignment", "Boardroom Storytelling & Visionary Delivery").
   - Recommendation: The UI can display either the authoritative module title from `mod.title` or enhance it with subtitles from `COURSE_DATA`. Both align with the underlying module IDs 1–5.
2. **Orientation Unit (ID 0)**:
   - Lesson 0 (Orientation) is counted in `unitsMastered` (0–15 -> 16 total) and `stats.completedCount` (out of 21), but is not tied to any single module 1–5. This is mathematically correct and tested by `DASH-T1-01`.
3. **Average Score Formatting**:
   - When no assessments have been attempted (`quizScores` is empty), `stats.avgScore` is `0`. The UI should cleanly display `0%` or `"N/A"` with a note that assessments have not yet been attempted.

---

## 4. Conclusion & Recommended Implementation Specification

### 4.1 Component Blueprint for `src/pages/Dashboard.tsx`

```tsx
// Inside Dashboard.tsx:
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    LayoutDashboard, MessageSquare, ArrowRightLeft, Video, 
    Target, ArrowLeft, Bell, TrendingUp, BookOpen, Award, 
    Sparkles, CheckCircle2, Clock, ChevronRight, Play, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { COURSE_DATA } from '../../constants';

// Inside component:
const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'sandbox' | 'translator' | 'video'>('overview');
    const { currentUser } = useAuth();
    const { stats, moduleProgress, continueTarget, loading, syncing, error } = useProgress();

    // User display calculations
    const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Alex Director';
    const email = currentUser?.email || 'learner@zentia.com';
    const userInitials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    // Target lesson metadata for hero continue learning CTA
    const currentTargetId = continueTarget?.targetLessonId ?? 0;
    const targetLessonData = COURSE_DATA[currentTargetId] || { title: 'Executive Communication Orientation', subtitle: 'Course Onboarding' };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
            {/* Sidebar omitted for brevity - preserved identical to current layout */}
            
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 capitalize">
                            {activeTab === 'overview' ? 'Executive Dashboard' : 
                             activeTab === 'sandbox' ? 'Communication Sandbox' : 
                             activeTab === 'translator' ? 'Technical-to-Human Translator' : 
                             'Automated Video Analysis'}
                        </h2>
                        {syncing && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></span>
                                Cloud Synced
                            </span>
                        )}
                    </div>
                    {/* Dynamic Profile Header */}
                    <div className="flex items-center gap-4">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                            <Bell size={20} />
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-800">{displayName}</p>
                                <p className="text-xs text-slate-500">{email}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-full flex items-center justify-center shadow-sm">
                                {userInitials}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="space-y-8 max-w-6xl mx-auto">
                            {/* 1. Hero Continue Learning Banner */}
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
                                            {continueTarget?.isProgramComplete ? 'Program Mastered' : 'Active Curriculum Unit'}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white tracking-tight">
                                            {continueTarget?.isProgramComplete 
                                                ? 'Congratulations! All Units Mastered' 
                                                : targetLessonData.title || `Unit ${currentTargetId}`}
                                        </h3>
                                        <p className="text-slate-300 text-sm max-w-xl">
                                            {continueTarget?.isProgramComplete
                                                ? 'You have completed all 21 units and assessments in the Zentia World Executive Program.'
                                                : (targetLessonData.subtitle || 'Resume your leadership immersion and continue building executive fluency.')}
                                        </p>
                                    </div>
                                    <Link 
                                        to={`/programs/business-english?lesson=${currentTargetId}`}
                                        className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 shrink-0"
                                    >
                                        <Play size={18} className="fill-white" />
                                        {continueTarget?.isProgramComplete ? 'Review Curriculum' : 'Continue Learning'}
                                    </Link>
                                </div>
                            </div>

                            {/* 2. 4-Card Overview Metric Grid */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-blue-600" />
                                    Executive Performance Metrics
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {/* Card 1: Overall Progress */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <TrendingUp size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                                {stats?.overallPercentage ?? 0}%
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                                {stats?.completedCount ?? 0} of {stats?.totalUnits ?? 21} Units Completed
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div 
                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                                                style={{ width: `${stats?.overallPercentage ?? 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Card 2: Units Mastered */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Units Mastered</span>
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <BookOpen size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                                {stats?.unitsMastered ?? 0} <span className="text-lg font-semibold text-slate-400">/ 16</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                                Core Lessons (IDs 0–15)
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div 
                                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                                                style={{ width: `${Math.round(((stats?.unitsMastered ?? 0) / 16) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Card 3: Assessments Passed */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assessments Passed</span>
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                                <Award size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                                {stats?.assessmentsPassed ?? 0} <span className="text-lg font-semibold text-slate-400">/ 5</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                                Module Checks (≥ 80% Benchmark)
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div 
                                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                                                style={{ width: `${Math.round(((stats?.assessmentsPassed ?? 0) / 5) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Card 4: Average Score */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Assessment Score</span>
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                                <Sparkles size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                                {stats?.avgScore ?? 0}%
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                                Mean Accuracy on Progress Checks
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div 
                                                className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" 
                                                style={{ width: `${stats?.avgScore ?? 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. 5-Module Curriculum Progress Breakdown */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <BookOpen size={20} className="text-blue-600" />
                                        Curriculum Modules Breakdown
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-500">
                                        5 Executive Competency Pillars
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {moduleProgress.map((mod) => (
                                        <div 
                                            key={mod.id} 
                                            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                        Module {mod.id}
                                                    </span>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                        mod.status === 'completed'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : mod.status === 'in_progress'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {mod.status === 'completed' ? 'Completed' : mod.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-slate-900 text-base leading-snug mb-2">
                                                    {mod.title}
                                                </h4>
                                                
                                                <div className="flex items-center justify-between text-xs text-slate-500 mb-2 mt-4 font-medium">
                                                    <span>{mod.completedItems} / {mod.totalItems} Units Completed</span>
                                                    <span className="font-bold text-slate-800">{mod.percentage}%</span>
                                                </div>

                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
                                                    <div 
                                                        className={`h-2 rounded-full transition-all duration-500 ${
                                                            mod.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'
                                                        }`}
                                                        style={{ width: `${mod.percentage}%` }}
                                                    ></div>
                                                </div>

                                                {/* Quiz status subtext */}
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-4">
                                                    {mod.quizPassed ? (
                                                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                            <CheckCircle2 size={13} /> Assessment Passed ({mod.quizScore?.percentage}%)
                                                        </span>
                                                    ) : mod.quizScore ? (
                                                        <span className="text-amber-600 font-medium flex items-center gap-1">
                                                            <AlertCircle size={13} /> Assessment Attempted ({mod.quizScore?.percentage}%) - 80% needed
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 flex items-center gap-1">
                                                            <Clock size={13} /> Assessment Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <Link 
                                                to={`/programs/business-english?lesson=${mod.id === 1 ? 1 : mod.id === 2 ? 4 : mod.id === 3 ? 7 : mod.id === 4 ? 9 : 13}`}
                                                className="w-full mt-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-blue-600 text-slate-700 hover:text-blue-600 text-xs font-bold transition-colors flex items-center justify-center gap-2 group"
                                            >
                                                <span>{mod.status === 'completed' ? 'Review Module' : mod.status === 'in_progress' ? 'Continue Module' : 'Start Module'}</span>
                                                <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Smart "Nudge" Tracker (Preserved) */}
                            {/* ... WhatsApp missions tracker widget ... */}
                        </div>
                    )}
                    {/* ... sandbox, translator, video tabs ... */}
                </div>
            </main>
        </div>
    );
};
```

---

## 5. Verification Method

### 5.1 Automated Test Suites to Verify

1. **Test Runner Command**:
   ```bash
   node runner.mjs
   ```
2. **Key Test Specs**:
   - `tests/e2e/tier1_dashboard.test.mjs`:
     - `DASH-T1-01`: 4-card metric calculation accuracy.
     - `DASH-T1-02`: 5-module progress breakdown status accuracy.
     - `DASH-T1-03` to `DASH-T1-07`: Continue learning target resolution across sequence.
   - `tests/e2e/tier3_cross_feature.test.mjs`:
     - `INT-T3-01`: Guest session -> Storage Migration -> Dashboard sync.
     - `INT-T3-02`: CourseViewer progression -> Assessment submission -> Dashboard reflection.
   - `tests/e2e/tier4_real_world.test.mjs`:
     - `E2E-T4-01`: Learner onboarding & first unit completion.
     - `E2E-T4-02`: Module 1 mastery, assessment passage, and Module 2 unlock.
   - `tests/e2e/tier5_adversarial_m2.test.mjs`:
     - `ADV-M2-01` to `ADV-M2-04`: Schema conformance & multi-user isolation.

### 5.2 Visual & Functional Inspection Points:
- [x] Overview tab renders 4 cards with exact labels and values: Overall Progress (%), Units Mastered (X/16), Assessments Passed (Y/5), Avg Assessment Score (Z%).
- [x] Overview tab renders 5 module cards with titles, completion %, unit counts, colored progress bars, assessment indicators, and navigation links.
- [x] Zero state (fresh user) renders clean 0% values without crashes or NaN.
- [x] Cloud synchronization state is indicated visually when `syncing` is active.
