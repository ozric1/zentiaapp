// Zentia Program Domain Simulator & Service Implementations
// Implements exact interface contracts and business invariants specified in PROJECT.md

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from './mockFirebase.mjs';

export const CURRICULUM_SEQUENCE = [
  0,               // Course Orientation
  1, 2, 3, 101,    // Module 1
  4, 5, 6, 102,    // Module 2
  7, 8, 103,       // Module 3
  9, 10, 11, 12, 104, // Module 4
  13, 14, 15, 105  // Module 5
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
  static calculateStats(completedLessons = [], quizScores = {}) {
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

  static calculateModuleProgress(completedLessons = [], quizScores = {}) {
    const completedSet = new Set(completedLessons || []);
    return MODULE_DEFINITIONS.map(mod => {
      const allModUnits = [...mod.units, mod.quizId];
      const completedModUnits = allModUnits.filter(u => completedSet.has(u));
      const percentage = Math.round((completedModUnits.length / allModUnits.length) * 100);
      const isQuizPassed = quizScores[mod.quizId]?.passed || (quizScores[mod.quizId]?.percentage >= 80);
      const isCompleted = percentage === 100 && (isQuizPassed || completedSet.has(mod.quizId));

      let status = 'not_started';
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

  static getContinueLearningTarget(completedLessons = [], lastLessonId = 0) {
    const completedSet = new Set(completedLessons || []);

    // If lastLessonId is defined and not yet completed, resume directly there
    if (lastLessonId !== undefined && lastLessonId !== null && !completedSet.has(lastLessonId)) {
      return {
        targetLessonId: lastLessonId,
        isCompleted: false,
        isProgramComplete: false,
      };
    }

    // Otherwise find the first uncompleted lesson in the authoritative 21-item sequence
    for (const lessonId of CURRICULUM_SEQUENCE) {
      if (!completedSet.has(lessonId)) {
        return {
          targetLessonId: lessonId,
          isCompleted: false,
          isProgramComplete: false,
        };
      }
    }

    // All items completed
    return {
      targetLessonId: 105,
      isCompleted: true,
      isProgramComplete: true,
    };
  }
}

export class ProgressService {
  constructor(db) {
    this.db = db;
  }

  _getProgressDocRef(uid) {
    return doc(this.db, `users/${uid}/progress/business-english`);
  }

  async fetchProgress(uid) {
    if (!uid) throw new Error('UID is required to fetch progress');
    const docRef = this._getProgressDocRef(uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const initialData = {
        completedLessons: [],
        quizScores: {},
        lastLessonId: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: ProgressCalculator.calculateStats([], {}),
      };
      await setDoc(docRef, initialData);
      return initialData;
    }
    const data = snap.data();
    return {
      completedLessons: data.completedLessons || [],
      quizScores: data.quizScores || {},
      lastLessonId: data.lastLessonId ?? 0,
      stats: data.stats || ProgressCalculator.calculateStats(data.completedLessons || [], data.quizScores || {}),
      ...data,
    };
  }

  async saveCurrentLesson(uid, lessonId) {
    if (!uid) throw new Error('UID is required');
    const docRef = this._getProgressDocRef(uid);
    await setDoc(
      docRef,
      {
        lastLessonId: lessonId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async markLessonCompleted(uid, lessonId) {
    if (!uid) throw new Error('UID is required');
    const docRef = this._getProgressDocRef(uid);
    
    // Read current to update stats
    const snap = await getDoc(docRef);
    const current = snap.exists() ? snap.data() : { completedLessons: [], quizScores: {} };
    const completed = new Set(current.completedLessons || []);
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

  async saveQuizScore(uid, quizId, score, total, answers = {}) {
    if (!uid) throw new Error('UID is required');
    const docRef = this._getProgressDocRef(uid);
    const percentage = Math.round((score / (total || 1)) * 100);
    const passed = percentage >= 80;

    const quizEntry = {
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
    const completed = new Set(current.completedLessons || []);
    if (passed) {
      completed.add(quizId);
    }
    const updatedQuizScores = {
      ...(current.quizScores || {}),
      [quizId]: quizEntry,
    };
    const stats = ProgressCalculator.calculateStats(Array.from(completed), updatedQuizScores);

    const updatePayload = {
      [`quizScores.${quizId}`]: quizEntry,
      quizScores: updatedQuizScores,
      stats,
      updatedAt: serverTimestamp(),
    };

    if (passed) {
      updatePayload.completedLessons = arrayUnion(quizId);
    }

    await setDoc(docRef, updatePayload, { merge: true });
    return quizEntry;
  }

  async migrateLocalStorage(uid, storage) {
    if (!uid) return { migrated: false, count: 0 };
    let guestCompleted = [];
    let guestLastLesson = 0;

    try {
      const rawCompleted = storage.getItem('zentia_completed');
      if (rawCompleted) {
        const parsed = JSON.parse(rawCompleted);
        if (Array.isArray(parsed)) {
          guestCompleted = parsed.filter(n => typeof n === 'number');
        }
      }
    } catch {
      // Safe fallback on corrupted JSON
      guestCompleted = [];
    }

    try {
      const rawLast = storage.getItem('zentia_last_lesson');
      if (rawLast) {
        const parsed = parseInt(rawLast, 10);
        if (!isNaN(parsed)) guestLastLesson = parsed;
      }
    } catch {
      guestLastLesson = 0;
    }

    if (guestCompleted.length === 0 && guestLastLesson === 0) {
      return { migrated: false, count: 0 };
    }

    const docRef = this._getProgressDocRef(uid);
    const snap = await getDoc(docRef);
    const current = snap.exists() ? snap.data() : { completedLessons: [], quizScores: {} };
    
    // Set-union merge
    const mergedCompleted = new Set([...(current.completedLessons || []), ...guestCompleted]);
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

    // Clear guest storage after successful migration
    storage.removeItem('zentia_completed');
    storage.removeItem('zentia_last_lesson');

    return {
      migrated: true,
      count: guestCompleted.length,
      mergedCompleted: mergedArray,
    };
  }
}

export class AuthService {
  constructor(auth) {
    this.auth = auth;
    this.currentUser = null;
    this.loading = true;
    this.error = null;
    this.unsubscribe = null;
  }

  init() {
    this.unsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      this.loading = false;
    });
  }

  async login(email, password) {
    this.loading = true;
    this.error = null;
    try {
      const res = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = res.user;
      return res.user;
    } catch (err) {
      this.error = err.message || 'Login failed';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async signup(email, password, displayName = '') {
    this.loading = true;
    this.error = null;
    try {
      const res = await createUserWithEmailAndPassword(this.auth, email, password, displayName);
      this.currentUser = res.user;
      return res.user;
    } catch (err) {
      this.error = err.message || 'Signup failed';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle() {
    this.loading = true;
    this.error = null;
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(this.auth, provider);
      this.currentUser = res.user;
      return res.user;
    } catch (err) {
      this.error = err.message || 'Google login failed';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    this.loading = true;
    this.error = null;
    try {
      await signOut(this.auth);
      this.currentUser = null;
    } catch (err) {
      this.error = err.message || 'Logout failed';
      throw err;
    } finally {
      this.loading = false;
    }
  }

  clearError() {
    this.error = null;
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export class RouteGuardSimulator {
  static evaluateRouteAccess(currentPath, currentUser) {
    const protectedRoutes = ['/dashboard', '/programs/business-english'];
    const isProtected = protectedRoutes.some(p => currentPath === p || currentPath.startsWith(p + '/'));

    if (isProtected && !currentUser) {
      return {
        canAccess: false,
        redirect: `/login?redirect=${encodeURIComponent(currentPath)}`,
      };
    }

    if (currentPath === '/login' && currentUser) {
      return {
        canAccess: false,
        redirect: '/dashboard',
      };
    }

    return {
      canAccess: true,
      redirect: null,
    };
  }
}
