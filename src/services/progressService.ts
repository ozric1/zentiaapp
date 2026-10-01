import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    arrayUnion,
    serverTimestamp,
    Firestore,
    DocumentReference,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    ProgramProgressDocument,
    ProgressStats,
    ModuleProgressItem,
    ContinueLearningTarget,
    QuizScoreRecord,
    LocalStorageMigrationResult
} from '../types/progress';

export const CURRICULUM_SEQUENCE: readonly number[] = [
    0,                  // Course Orientation / Intro
    1, 2, 3, 101,       // Module 1: Foundations
    4, 5, 6, 102,       // Module 2: Strategy
    7, 8, 103,          // Module 3: Operations
    9, 10, 11, 12, 104, // Module 4: Development
    13, 14, 15, 105     // Module 5: Management
];

export const TOTAL_CURRICULUM_UNITS = CURRICULUM_SEQUENCE.length; // 21

export const MODULE_DEFINITIONS = [
    { id: 1, title: 'Executive Communication Foundation', units: [1, 2, 3], quizId: 101 },
    { id: 2, title: 'High-Stakes Negotiation & Persuasion', units: [4, 5, 6], quizId: 102 },
    { id: 3, title: 'Cross-Cultural Global Leadership', units: [7, 8], quizId: 103 },
    { id: 4, title: 'Crisis Management & Stakeholder Alignment', units: [9, 10, 11, 12], quizId: 104 },
    { id: 5, title: 'Boardroom Storytelling & Visionary Delivery', units: [13, 14, 15], quizId: 105 },
] as const;

export class ProgressCalculator {
    static calculateStats(
        completedLessons: number[] = [],
        quizScores: Record<string | number, QuizScoreRecord> = {}
    ): ProgressStats {
        const validCompletions = new Set(completedLessons || []);
        const unitsMastered = (completedLessons || []).filter(id => id >= 0 && id <= 15).length;

        const quizEntries = Object.values(quizScores || {});
        const assessmentsPassed = quizEntries.filter(
            q => q.passed || (q.percentage !== undefined && q.percentage >= 80)
        ).length;

        const overallPercentage = Math.min(
            100,
            Math.round((validCompletions.size / TOTAL_CURRICULUM_UNITS) * 100)
        );

        let avgScore = 0;
        if (quizEntries.length > 0) {
            const totalScoreSum = quizEntries.reduce(
                (acc, q) => acc + (q.percentage ?? (q.score / (q.total || 1)) * 100),
                0
            );
            avgScore = Math.round(totalScoreSum / quizEntries.length);
        }

        return {
            totalUnits: TOTAL_CURRICULUM_UNITS,
            completedCount: validCompletions.size,
            unitsMastered,
            assessmentsPassed,
            overallPercentage,
            overallProgress: overallPercentage,
            avgScore,
            averageScore: avgScore,
        };
    }

    static calculateModuleProgress(
        completedLessons: number[] = [],
        quizScores: Record<string | number, QuizScoreRecord> = {}
    ): ModuleProgressItem[] {
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
                quizPassed: !!isQuizPassed,
                quizScore: quizScores[mod.quizId],
            };
        });
    }

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
}

export class ProgressService {
    private db: Firestore;

    constructor(firestore: Firestore = db) {
        this.db = firestore;
    }

    private _getProgressDocRef(uid: string): DocumentReference {
        if (!uid || typeof uid !== 'string') {
            throw new Error('Valid User UID is required to access progress document.');
        }
        return doc(this.db, 'users', uid, 'progress', 'business-english');
    }

    /**
     * Fetches user progress document or initializes a fresh 0% baseline document if non-existent.
     */
    async fetchProgress(uid: string): Promise<ProgramProgressDocument> {
        if (!uid) throw new Error('UID is required to fetch progress');
        const docRef = this._getProgressDocRef(uid);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            const initialStats = ProgressCalculator.calculateStats([], {});
            const initialDoc: ProgramProgressDocument = {
                programId: 'business-english',
                completedLessons: [],
                quizScores: {},
                lastLessonId: 0,
                stats: initialStats,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            };
            await setDoc(docRef, initialDoc);
            return initialDoc;
        }

        const data = snapshot.data();
        const completedLessons: number[] = Array.isArray(data.completedLessons) ? data.completedLessons : [];
        const quizScores: Record<string | number, QuizScoreRecord> = data.quizScores || {};
        const lastLessonId: number = typeof data.lastLessonId === 'number' ? data.lastLessonId : 0;
        const stats: ProgressStats = data.stats || ProgressCalculator.calculateStats(completedLessons, quizScores);

        return {
            programId: data.programId || 'business-english',
            completedLessons,
            quizScores,
            lastLessonId,
            stats,
            createdAt: data.createdAt,
            lastUpdated: data.lastUpdated || (data.updatedAt ? new Date().toISOString() : undefined),
            updatedAt: data.updatedAt,
            migratedAt: data.migratedAt,
        };
    }

    /**
     * Subscribes to real-time progress updates via Firestore onSnapshot.
     */
    subscribeToProgress(
        uid: string,
        onUpdate: (data: ProgramProgressDocument) => void,
        onError?: (error: Error) => void
    ): Unsubscribe {
        const docRef = this._getProgressDocRef(uid);
        return onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const completedLessons = Array.isArray(data.completedLessons) ? data.completedLessons : [];
                    const quizScores = data.quizScores || {};
                    const lastLessonId = typeof data.lastLessonId === 'number' ? data.lastLessonId : 0;
                    const stats = data.stats || ProgressCalculator.calculateStats(completedLessons, quizScores);

                    onUpdate({
                        programId: data.programId || 'business-english',
                        completedLessons,
                        quizScores,
                        lastLessonId,
                        stats,
                        createdAt: data.createdAt,
                        lastUpdated: data.lastUpdated,
                        updatedAt: data.updatedAt,
                        migratedAt: data.migratedAt,
                    });
                } else {
                    // Document missing, trigger fetch to create and broadcast initial state
                    this.fetchProgress(uid).then(onUpdate).catch(onError);
                }
            },
            (err) => {
                console.error('Firestore progress subscription error:', err);
                if (onError) onError(err);
            }
        );
    }

    /**
     * Updates user's active lesson position in Firestore.
     */
    async saveCurrentLesson(uid: string, lessonId: number): Promise<void> {
        if (!uid) throw new Error('UID is required');
        const docRef = this._getProgressDocRef(uid);
        await setDoc(
            docRef,
            {
                lastLessonId: lessonId,
                lastUpdated: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    }

    /**
     * Atomically marks a lesson as completed using arrayUnion and recalculates progress metrics.
     */
    async markLessonCompleted(uid: string, lessonId: number): Promise<void> {
        if (!uid) throw new Error('UID is required');
        const docRef = this._getProgressDocRef(uid);

        const currentDoc = await this.fetchProgress(uid);
        const completedSet = new Set(currentDoc.completedLessons);
        completedSet.add(lessonId);
        const updatedCompleted = Array.from(completedSet);
        const updatedStats = ProgressCalculator.calculateStats(updatedCompleted, currentDoc.quizScores);

        await setDoc(
            docRef,
            {
                completedLessons: arrayUnion(lessonId),
                lastLessonId: lessonId,
                stats: updatedStats,
                lastUpdated: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    }

    /**
     * Persists quiz score and passed status. Passing assessment (>= 80%) atomically adds quizId to completedLessons.
     */
    async saveQuizScore(
        uid: string,
        quizId: number,
        score: number,
        total: number,
        answers: Record<number, number> = {}
    ): Promise<QuizScoreRecord> {
        if (!uid) throw new Error('UID is required');
        const docRef = this._getProgressDocRef(uid);
        const percentage = Math.round((score / (total || 1)) * 100);
        const passed = percentage >= 80;

        const quizEntry: QuizScoreRecord = {
            quizId,
            score,
            total,
            percentage,
            passed,
            answers,
            completedAt: new Date().toISOString(),
        };

        const currentDoc = await this.fetchProgress(uid);
        const completedSet = new Set(currentDoc.completedLessons);
        if (passed) {
            completedSet.add(quizId);
        }
        const updatedCompleted = Array.from(completedSet);
        const updatedQuizScores = {
            ...currentDoc.quizScores,
            [quizId]: quizEntry,
        };
        const stats = ProgressCalculator.calculateStats(updatedCompleted, updatedQuizScores);

        const updatePayload: Record<string, any> = {
            [`quizScores.${quizId}`]: quizEntry,
            quizScores: updatedQuizScores,
            stats,
            lastUpdated: new Date().toISOString(),
            updatedAt: serverTimestamp(),
        };

        if (passed) {
            updatePayload.completedLessons = arrayUnion(quizId);
        }

        await setDoc(
            docRef,
            updatePayload,
            { merge: true }
        );

        return quizEntry;
    }

    /**
     * Migrates guest localStorage progress into Firestore via set-union. Cleans up local keys upon success.
     */
    async migrateLocalStorage(
        uid: string,
        storage?: Storage
    ): Promise<LocalStorageMigrationResult> {
        if (!uid) return { migrated: false, count: 0 };

        const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
        if (!targetStorage) {
            return { migrated: false, count: 0 };
        }

        let guestCompleted: number[] = [];
        let guestLastLesson = 0;

        try {
            const rawCompleted = targetStorage.getItem('zentia_completed');
            if (rawCompleted) {
                const parsed = JSON.parse(rawCompleted);
                if (Array.isArray(parsed)) {
                    guestCompleted = parsed.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0);
                }
            }
        } catch {
            // Defensive recovery on corrupted JSON
            guestCompleted = [];
        }

        try {
            const rawLast = targetStorage.getItem('zentia_last_lesson');
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

        const docRef = this._getProgressDocRef(uid);
        const currentDoc = await this.fetchProgress(uid);

        // Mathematical Set-Union merge
        const mergedCompleted = new Set([...(currentDoc.completedLessons || []), ...guestCompleted]);
        const mergedArray = Array.from(mergedCompleted);
        const lastLesson = guestLastLesson > 0 ? guestLastLesson : (currentDoc.lastLessonId || 0);
        const stats = ProgressCalculator.calculateStats(mergedArray, currentDoc.quizScores);

        await setDoc(
            docRef,
            {
                completedLessons: mergedArray,
                lastLessonId: lastLesson,
                stats,
                migratedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        // Safe cleanup post-migration only after successful Firestore write
        try {
            targetStorage.removeItem('zentia_completed');
            targetStorage.removeItem('zentia_last_lesson');
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
export default progressService;
