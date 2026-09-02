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
    ModuleProgressItem,
    ContinueLearningTarget,
    QuizScoreRecord,
    ProgressContextValue
} from '../types/progress';

const DEFAULT_STATS: ProgressStats = {
    totalUnits: 21,
    completedCount: 0,
    unitsMastered: 0,
    assessmentsPassed: 0,
    overallPercentage: 0,
    overallProgress: 0,
    avgScore: 0,
    averageScore: 0,
};

const DEFAULT_CONTINUE_TARGET: ContinueLearningTarget = {
    targetLessonId: 0,
    isCompleted: false,
    isProgramComplete: false,
};

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, loading: authLoading } = useAuth();

    const [progress, setProgress] = useState<ProgramProgressDocument | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [syncing, setSyncing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState<boolean>(
        typeof navigator !== 'undefined' ? !navigator.onLine : false
    );

    // Track online/offline status
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load progress and migrate guest state on authentication
    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }

        if (!currentUser?.uid) {
            // Unauthenticated state: clean slate
            setProgress(null);
            setLoading(false);
            setError(null);
            return;
        }

        const uid = currentUser.uid;
        setLoading(true);
        setError(null);

        let unsubscribe: (() => void) | undefined;

        // Perform guest migration first
        const initUserProgress = async () => {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    try {
                        await progressService.migrateLocalStorage(uid, window.localStorage);
                    } catch (migErr) {
                        console.warn('Guest localStorage migration notice:', migErr);
                    }
                }

                // Subscribe to real-time updates
                unsubscribe = progressService.subscribeToProgress(
                    uid,
                    (data) => {
                        setProgress(data);
                        setLoading(false);
                    },
                    (err) => {
                        console.error('Progress subscription error:', err);
                        setError(err.message || 'Error subscribing to progress updates');
                        setLoading(false);
                    }
                );
            } catch (err: any) {
                console.error('Failed to initialize user progress:', err);
                setError(err?.message || 'Failed to load progress.');
                setLoading(false);
            }
        };

        initUserProgress();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [currentUser?.uid, authLoading]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const refreshProgress = useCallback(async () => {
        if (!currentUser?.uid) return;
        setLoading(true);
        try {
            const data = await progressService.fetchProgress(currentUser.uid);
            setProgress(data);
        } catch (err: any) {
            setError(err.message || 'Failed to refresh progress.');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.uid]);

    const saveCurrentLesson = useCallback(async (lessonId: number) => {
        // Optimistic local update
        setProgress(prev => {
            if (!prev) return null;
            return {
                ...prev,
                lastLessonId: lessonId,
            };
        });

        if (!currentUser?.uid) {
            // Unauthenticated fallback to localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    localStorage.setItem('zentia_last_lesson', lessonId.toString());
                } catch {
                    // ignore
                }
            }
            return;
        }

        setSyncing(true);
        try {
            await progressService.saveCurrentLesson(currentUser.uid, lessonId);
        } catch (err: any) {
            console.error('Failed to sync current lesson position:', err);
            setError('Failed to sync lesson position to cloud.');
        } finally {
            setSyncing(false);
        }
    }, [currentUser?.uid]);

    const markLessonCompleted = useCallback(async (lessonId: number) => {
        // Optimistic local update
        setProgress(prev => {
            if (!prev) {
                const completed = [lessonId];
                return {
                    programId: 'business-english',
                    completedLessons: completed,
                    quizScores: {},
                    lastLessonId: lessonId,
                    stats: ProgressCalculator.calculateStats(completed, {}),
                };
            }
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

        if (!currentUser?.uid) {
            // Unauthenticated fallback to localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    const saved = localStorage.getItem('zentia_completed');
                    const arr: number[] = saved ? JSON.parse(saved) : [];
                    if (!arr.includes(lessonId)) {
                        arr.push(lessonId);
                        localStorage.setItem('zentia_completed', JSON.stringify(arr));
                    }
                } catch {
                    // ignore
                }
            }
            return;
        }

        setSyncing(true);
        try {
            await progressService.markLessonCompleted(currentUser.uid, lessonId);
        } catch (err: any) {
            console.error('Failed to mark lesson completed in cloud:', err);
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
    ): Promise<QuizScoreRecord> => {
        const percentage = Math.round((score / (total || 1)) * 100);
        const passed = percentage >= 80;

        const quizResult: QuizScoreRecord = {
            quizId,
            score,
            total,
            percentage,
            passed,
            answers,
            completedAt: new Date().toISOString(),
        };

        // Optimistic local update
        setProgress(prev => {
            if (!prev) {
                const completed = passed ? [quizId] : [];
                return {
                    programId: 'business-english',
                    completedLessons: completed,
                    quizScores: { [quizId]: quizResult },
                    lastLessonId: quizId,
                    stats: ProgressCalculator.calculateStats(completed, { [quizId]: quizResult }),
                };
            }
            const completedSet = new Set(prev.completedLessons);
            if (passed) {
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
                lastLessonId: quizId,
                stats: updatedStats,
            };
        });

        if (!currentUser?.uid) {
            return quizResult;
        }

        setSyncing(true);
        try {
            return await progressService.saveQuizScore(currentUser.uid, quizId, score, total, answers);
        } catch (err: any) {
            console.error('Failed to persist quiz score in cloud:', err);
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

    const continueTarget = useMemo(() => {
        return ProgressCalculator.getContinueLearningTarget(completedLessons, lastLessonId);
    }, [completedLessons, lastLessonId]);

    const contextValue: ProgressContextValue = {
        progress,
        completedLessons,
        lastLessonId,
        quizScores,
        stats,
        moduleProgress,
        modules: moduleProgress,
        continueTarget,
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

export const useProgress = (): ProgressContextValue => {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error('useProgress must be used within a ProgressProvider');
    }
    return context;
};

export const useUserProgress = useProgress;
export default ProgressContext;
