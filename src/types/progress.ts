/**
 * Zentia World Program - Progress Tracking Data Models & Types
 * Canonical Document Path: /users/{uid}/progress/business-english
 */

export interface QuizScoreRecord {
    quizId: number | string;
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    answers?: Record<number, number>;
    completedAt: string; // ISO 8601 string
}

export type QuizScore = QuizScoreRecord;
export type QuizScoreEntry = QuizScoreRecord;
export type QuizAttempt = QuizScoreRecord;

export interface ProgressStats {
    /** Total curriculum items (21: Orientation + 15 Lessons + 5 Assessments) */
    totalUnits: number;
    /** Number of unique items completed in completedLessons */
    completedCount: number;
    /** Number of standard core lessons completed (IDs 0 to 15, max 16) */
    unitsMastered: number;
    /** Number of module assessments (IDs 101 to 105) passed with score >= 80% (max 5) */
    assessmentsPassed: number;
    /** Overall progress percentage across the 21 curriculum items (0 - 100) */
    overallPercentage: number;
    /** Alias for overallPercentage */
    overallProgress: number;
    /** Mean percentage across all submitted assessments (0 - 100) */
    avgScore: number;
    /** Alias for avgScore */
    averageScore: number;
}

export type UserStats = ProgressStats;
export type ProgramStats = ProgressStats;

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

export type ModuleProgress = ModuleProgressItem;

export interface ContinueLearningTarget {
    targetLessonId: number;
    isCompleted: boolean;
    isProgramComplete: boolean;
    targetTitle?: string;
}

export interface ProgramProgressDocument {
    programId?: string;
    /** Array of unique completed lesson and assessment IDs (e.g., [0, 1, 2, 101]) */
    completedLessons: number[];
    /** Map of assessment quizId -> QuizScoreRecord */
    quizScores: Record<string | number, QuizScoreRecord>;
    /** ID of the active / last visited lesson */
    lastLessonId: number;
    /** Computed progress statistics */
    stats: ProgressStats;
    /** Timestamps */
    createdAt?: string;
    updatedAt?: any;
    lastUpdated?: string;
    migratedAt?: string;
}

export interface LocalStorageMigrationResult {
    migrated: boolean;
    count: number;
    mergedCompleted?: number[];
    error?: string;
}

export type MigrationResult = LocalStorageMigrationResult;

export interface ProgressContextValue {
    // Current Progress State
    progress: ProgramProgressDocument | null;
    completedLessons: number[];
    lastLessonId: number;
    quizScores: Record<string | number, QuizScoreRecord>;
    stats: ProgressStats;
    moduleProgress: ModuleProgressItem[];
    modules: ModuleProgressItem[];
    continueTarget: ContinueLearningTarget;

    // Status Flags
    loading: boolean;
    syncing: boolean;
    error: string | null;
    isOffline: boolean;

    // Actions & Mutations
    saveCurrentLesson: (lessonId: number) => Promise<void>;
    markLessonCompleted: (lessonId: number) => Promise<void>;
    saveQuizScore: (
        quizId: number,
        score: number,
        total: number,
        answers?: Record<number, number>
    ) => Promise<QuizScoreRecord>;
    refreshProgress: () => Promise<void>;
    getContinueLearningTarget: () => ContinueLearningTarget;
    clearError: () => void;
}

export type ProgressContextType = ProgressContextValue;
