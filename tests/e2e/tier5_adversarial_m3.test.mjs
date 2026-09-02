// Zentia World Program - Tier 5 Adversarial & Empirical Challenge Suite (Milestone 3)
// Stress-testing Personalized Dashboard, Resume Learning Engine, Query Deep-Linking,
// Quiz Score Thresholds (< 80% vs >= 80%), and Celebratory Graduation State

import { describe, it, expect, beforeEach } from '../harness/testFramework.mjs';
import {
  ProgressService,
  ProgressCalculator,
  CURRICULUM_SEQUENCE,
  TOTAL_CURRICULUM_UNITS,
  MODULE_DEFINITIONS
} from '../harness/zentiaSim.mjs';
import { mockDb, arrayUnion, doc } from '../harness/mockFirebase.mjs';
import { MockLocalStorage } from '../harness/mockLocalStorage.mjs';

// Display name resolver matching Dashboard.tsx
function getDisplayName(user) {
  if (!user) return 'Executive Learner';
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }
  if (user.email) {
    const prefix = user.email.split('@')[0];
    return prefix
      .split(/[._-]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return 'Executive Learner';
}

// Initials monogram resolver matching Dashboard.tsx
function getUserInitials(displayName, email) {
  if (!displayName || displayName === 'Executive Learner') {
    if (email) {
      const prefix = email.split('@')[0];
      return prefix.slice(0, 2).toUpperCase();
    }
    return 'EL';
  }
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

// URL param resolver matching CourseViewer.tsx
function resolveCurrentLessonFromUrl(urlLesson, progressLastLessonId, courseDataKeys) {
  if (urlLesson !== null && urlLesson !== undefined) {
    const parsed = parseInt(urlLesson, 10);
    if (!isNaN(parsed) && courseDataKeys.has(parsed)) {
      return parsed;
    }
  }
  if (progressLastLessonId !== undefined && progressLastLessonId !== null && courseDataKeys.has(progressLastLessonId)) {
    return progressLastLessonId;
  }
  return 0;
}

const VALID_LESSON_IDS = new Set([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  101, 102, 103, 104, 105
]);

export function registerTier5AdversarialM3Tests() {
  describe('Tier 5 Adversarial M3: Personalized Dashboard & Resume Learning Engine', () => {
    let service;
    let mockStorage;

    beforeEach(() => {
      mockDb.clear();
      service = new ProgressService(mockDb);
      mockStorage = new MockLocalStorage();
    });

    // 1. Zero Progress Fresh User State
    it('ADV-M3-01: Fresh onboarding zero baseline state across all 4 metrics, 5 modules, and hero target', async () => {
      const uid = 'fresh_executive_user';
      const initialDoc = await service.fetchProgress(uid);

      expect(initialDoc.completedLessons).toEqual([]);
      expect(initialDoc.quizScores).toEqual({});
      expect(initialDoc.lastLessonId).toBe(0);

      const stats = ProgressCalculator.calculateStats(initialDoc.completedLessons, initialDoc.quizScores);
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(0);
      expect(stats.unitsMastered).toBe(0);
      expect(stats.assessmentsPassed).toBe(0);
      expect(stats.overallPercentage).toBe(0);
      expect(stats.avgScore).toBe(0);

      const modules = ProgressCalculator.calculateModuleProgress(initialDoc.completedLessons, initialDoc.quizScores);
      expect(modules.length).toBe(5);
      for (const mod of modules) {
        expect(mod.status).toBe('not_started');
        expect(mod.percentage).toBe(0);
        expect(mod.completedItems).toBe(0);
        expect(mod.isCompleted).toBe(false);
      }

      const target = ProgressCalculator.getContinueLearningTarget(initialDoc.completedLessons, initialDoc.lastLessonId);
      expect(target.targetLessonId).toBe(0);
      expect(target.isCompleted).toBe(false);
      expect(target.isProgramComplete).toBe(false);
    });

    // 2. Mid-Course Resumption with lastLessonId
    it('ADV-M3-02: Mid-course resumption precedence with uncompleted lastLessonId across various curriculum stages', async () => {
      const uid = 'midcourse_resume_user';

      // User has completed [0, 1, 2], but last visited Lesson 5
      await service.markLessonCompleted(uid, 0);
      await service.markLessonCompleted(uid, 1);
      await service.markLessonCompleted(uid, 2);
      await service.saveCurrentLesson(uid, 5);

      const doc1 = await service.fetchProgress(uid);
      const target1 = ProgressCalculator.getContinueLearningTarget(doc1.completedLessons, doc1.lastLessonId);
      expect(target1.targetLessonId).toBe(5);
      expect(target1.isCompleted).toBe(false);
      expect(target1.isProgramComplete).toBe(false);

      // User navigates to Assessment 103 without completing prior units
      await service.saveCurrentLesson(uid, 103);
      const doc2 = await service.fetchProgress(uid);
      const target2 = ProgressCalculator.getContinueLearningTarget(doc2.completedLessons, doc2.lastLessonId);
      expect(target2.targetLessonId).toBe(103);
      expect(target2.isCompleted).toBe(false);

      // Once lesson 5 is marked completed, target advances to next uncompleted sequence item (Lesson 3)
      await service.markLessonCompleted(uid, 5);
      await service.saveCurrentLesson(uid, 5);
      const doc3 = await service.fetchProgress(uid);
      const target3 = ProgressCalculator.getContinueLearningTarget(doc3.completedLessons, doc3.lastLessonId);
      expect(target3.targetLessonId).toBe(3); // 3 is first uncompleted in [0, 1, 2, 3, 101, 4, 5, ...]
    });

    // 3. Traversal and Sequential Advancement After Unit Completion
    it('ADV-M3-03: Sequential traversal advances smoothly through the entire 21-unit curriculum sequence', async () => {
      const uid = 'sequential_traversal_user';
      let currentCompleted = [];

      for (let i = 0; i < CURRICULUM_SEQUENCE.length; i++) {
        const currentUnit = CURRICULUM_SEQUENCE[i];
        const nextExpectedUnit = i < CURRICULUM_SEQUENCE.length - 1 ? CURRICULUM_SEQUENCE[i + 1] : 105;

        // Verify target points to current unit before completion
        const targetBefore = ProgressCalculator.getContinueLearningTarget(currentCompleted, currentUnit);
        expect(targetBefore.targetLessonId).toBe(currentUnit);

        // Complete unit (quiz if > 100, lesson otherwise)
        if (currentUnit > 100) {
          await service.saveQuizScore(uid, currentUnit, 5, 5);
        } else {
          await service.markLessonCompleted(uid, currentUnit);
        }
        await service.saveCurrentLesson(uid, currentUnit);
        currentCompleted.push(currentUnit);

        // Verify target advances to next unit after completion
        const targetAfter = ProgressCalculator.getContinueLearningTarget(currentCompleted, currentUnit);
        if (i === CURRICULUM_SEQUENCE.length - 1) {
          expect(targetAfter.isProgramComplete).toBe(true);
          expect(targetAfter.isCompleted).toBe(true);
          expect(targetAfter.targetLessonId).toBe(105);
        } else {
          expect(targetAfter.targetLessonId).toBe(nextExpectedUnit);
          expect(targetAfter.isProgramComplete).toBe(false);
        }
      }
    });

    // 4. Low Quiz Score Boundary Handling (< 80%)
    it('ADV-M3-04: Low quiz score handling (< 80%) never increments assessmentsPassed or marks module completed', async () => {
      const uid = 'low_quiz_user';
      await service.markLessonCompleted(uid, 1);
      await service.markLessonCompleted(uid, 2);
      await service.markLessonCompleted(uid, 3);

      // Scores: 0/5 (0%), 2/5 (40%), 3/5 (60%), 79/100 (79%)
      const lowScores = [
        { score: 0, total: 5, expectedPct: 0 },
        { score: 2, total: 5, expectedPct: 40 },
        { score: 3, total: 5, expectedPct: 60 },
        { score: 79, total: 100, expectedPct: 79 },
      ];

      for (const attempt of lowScores) {
        const result = await service.saveQuizScore(uid, 101, attempt.score, attempt.total);
        expect(result.passed).toBe(false);
        expect(result.percentage).toBe(attempt.expectedPct);

        const progress = await service.fetchProgress(uid);
        expect(progress.completedLessons).not.toContain(101);
        expect(progress.stats.assessmentsPassed).toBe(0);

        const modules = ProgressCalculator.calculateModuleProgress(progress.completedLessons, progress.quizScores);
        expect(modules[0].status).toBe('in_progress');
        expect(modules[0].percentage).toBe(75); // 3 of 4 units
        expect(modules[0].isCompleted).toBe(false);

        // Target remains on quiz 101
        const target = ProgressCalculator.getContinueLearningTarget(progress.completedLessons, 101);
        expect(target.targetLessonId).toBe(101);
      }
    });

    // 5. High Quiz Score Boundary Handling (>= 80%)
    it('ADV-M3-05: Passing quiz scores (>= 80%) atomically unlock completions, module status, and next module', async () => {
      const uid = 'high_quiz_user';
      await service.markLessonCompleted(uid, 0);
      await service.markLessonCompleted(uid, 1);
      await service.markLessonCompleted(uid, 2);
      await service.markLessonCompleted(uid, 3);

      // Boundary: Exactly 4/5 (80%)
      const quizResult = await service.saveQuizScore(uid, 101, 4, 5);
      expect(quizResult.passed).toBe(true);
      expect(quizResult.percentage).toBe(80);

      const progress = await service.fetchProgress(uid);
      expect(progress.completedLessons).toContain(101);
      expect(progress.stats.assessmentsPassed).toBe(1);
      expect(progress.stats.completedCount).toBe(5); // 0, 1, 2, 3, 101
      expect(progress.stats.unitsMastered).toBe(4); // 0, 1, 2, 3

      const modules = ProgressCalculator.calculateModuleProgress(progress.completedLessons, progress.quizScores);
      expect(modules[0].id).toBe(1);
      expect(modules[0].status).toBe('completed');
      expect(modules[0].percentage).toBe(100);
      expect(modules[0].isCompleted).toBe(true);

      // Target advances to Module 2 Lesson 4
      const nextTarget = ProgressCalculator.getContinueLearningTarget(progress.completedLessons, 101);
      expect(nextTarget.targetLessonId).toBe(4);
    });

    // 6. Retake transitions and score averaging
    it('ADV-M3-06: Quiz retake transitions from Fail to Pass, and multiple quiz average rounding precision', async () => {
      const uid = 'retake_precision_user';

      // 1. Fail Quiz 101 (60%)
      await service.saveQuizScore(uid, 101, 3, 5);
      let doc = await service.fetchProgress(uid);
      expect(doc.stats.assessmentsPassed).toBe(0);
      expect(doc.stats.avgScore).toBe(60);

      // 2. Pass Quiz 101 on retake (100%)
      await service.saveQuizScore(uid, 101, 5, 5);
      doc = await service.fetchProgress(uid);
      expect(doc.stats.assessmentsPassed).toBe(1);
      expect(doc.stats.avgScore).toBe(100);

      // 3. Pass Quiz 102 (80%)
      await service.saveQuizScore(uid, 102, 4, 5);
      // 4. Pass Quiz 103 (85%)
      await service.saveQuizScore(uid, 103, 85, 100);

      doc = await service.fetchProgress(uid);
      expect(doc.stats.assessmentsPassed).toBe(3);
      // Mean: (100 + 80 + 85) / 3 = 265 / 3 = 88.33 -> 88%
      expect(doc.stats.avgScore).toBe(88);
    });

    // 7. 100% Full Program Completion Celebratory Graduation State
    it('ADV-M3-07: 100% Program graduation state produces perfect completion metrics and graduation flags', async () => {
      const uid = 'graduate_user_m3';
      const allQuizzes = [101, 102, 103, 104, 105];

      for (const unitId of CURRICULUM_SEQUENCE) {
        if (allQuizzes.includes(unitId)) {
          await service.saveQuizScore(uid, unitId, 5, 5);
        } else {
          await service.markLessonCompleted(uid, unitId);
        }
      }
      await service.saveCurrentLesson(uid, 105);

      const gradDoc = await service.fetchProgress(uid);
      expect(gradDoc.completedLessons.length).toBe(21);
      expect(gradDoc.stats.totalUnits).toBe(21);
      expect(gradDoc.stats.completedCount).toBe(21);
      expect(gradDoc.stats.unitsMastered).toBe(16); // Lessons 0-15
      expect(gradDoc.stats.assessmentsPassed).toBe(5);
      expect(gradDoc.stats.overallPercentage).toBe(100);
      expect(gradDoc.stats.avgScore).toBe(100);

      const modules = ProgressCalculator.calculateModuleProgress(gradDoc.completedLessons, gradDoc.quizScores);
      expect(modules.length).toBe(5);
      for (const mod of modules) {
        expect(mod.status).toBe('completed');
        expect(mod.percentage).toBe(100);
        expect(mod.isCompleted).toBe(true);
        expect(mod.completedItems).toBe(mod.totalItems);
      }

      const target = ProgressCalculator.getContinueLearningTarget(gradDoc.completedLessons, gradDoc.lastLessonId);
      expect(target.isCompleted).toBe(true);
      expect(target.isProgramComplete).toBe(true);
      expect(target.targetLessonId).toBe(105);
    });

    // 8. Direct Deep-Linking via Query Parameters
    it('ADV-M3-08: URL query parameter deep linking correctly resolves valid IDs and falls back on invalid inputs', () => {
      // 1. Direct valid lesson deep links
      expect(resolveCurrentLessonFromUrl('0', 0, VALID_LESSON_IDS)).toBe(0);
      expect(resolveCurrentLessonFromUrl('7', 0, VALID_LESSON_IDS)).toBe(7);
      expect(resolveCurrentLessonFromUrl('101', 0, VALID_LESSON_IDS)).toBe(101);
      expect(resolveCurrentLessonFromUrl('105', 0, VALID_LESSON_IDS)).toBe(105);

      // 2. Invalid string or out-of-range lesson ID falls back to cloud lastLessonId
      expect(resolveCurrentLessonFromUrl('999', 4, VALID_LESSON_IDS)).toBe(4);
      expect(resolveCurrentLessonFromUrl('invalid_string', 6, VALID_LESSON_IDS)).toBe(6);
      expect(resolveCurrentLessonFromUrl('-1', 3, VALID_LESSON_IDS)).toBe(3);

      // 3. Null URL param falls back to cloud lastLessonId or default 0
      expect(resolveCurrentLessonFromUrl(null, 8, VALID_LESSON_IDS)).toBe(8);
      expect(resolveCurrentLessonFromUrl(null, null, VALID_LESSON_IDS)).toBe(0);
    });

    // 9. Display Name Resolution and Initials Monogram Generation
    it('ADV-M3-09: Display name formatting and initials monogram generation handles diverse user profiles', () => {
      // Custom display name
      const user1 = { displayName: 'Elena Rostova', email: 'elena@zentia.com' };
      expect(getDisplayName(user1)).toBe('Elena Rostova');
      expect(getUserInitials('Elena Rostova', user1.email)).toBe('ER');

      // Email prefix with dot
      const user2 = { displayName: null, email: 'alex.director@company.com' };
      expect(getDisplayName(user2)).toBe('Alex Director');
      expect(getUserInitials('Alex Director', user2.email)).toBe('AD');

      // Email prefix with hyphen and underscore
      const user3 = { displayName: '', email: 'sarah_jane-cfo@domain.co.uk' };
      expect(getDisplayName(user3)).toBe('Sarah Jane Cfo');
      expect(getUserInitials('Sarah Jane Cfo', user3.email)).toBe('SJ');

      // Single word name
      const user4 = { displayName: 'Cher', email: 'cher@zentia.com' };
      expect(getDisplayName(user4)).toBe('Cher');
      expect(getUserInitials('Cher', user4.email)).toBe('CH');

      // Null user object fallback
      expect(getDisplayName(null)).toBe('Executive Learner');
      expect(getUserInitials('Executive Learner', null)).toBe('EL');
    });

    // 10. 5-Module Competency Breakdown Definition Matrix
    it('ADV-M3-10: 5-Module definition structure rigorously satisfies all curriculum specifications', () => {
      expect(MODULE_DEFINITIONS.length).toBe(5);

      // Module 1: Foundations (Units 1, 2, 3 + Quiz 101 = 4 total)
      expect(MODULE_DEFINITIONS[0].id).toBe(1);
      expect(MODULE_DEFINITIONS[0].units).toEqual([1, 2, 3]);
      expect(MODULE_DEFINITIONS[0].quizId).toBe(101);

      // Module 2: Negotiations (Units 4, 5, 6 + Quiz 102 = 4 total)
      expect(MODULE_DEFINITIONS[1].id).toBe(2);
      expect(MODULE_DEFINITIONS[1].units).toEqual([4, 5, 6]);
      expect(MODULE_DEFINITIONS[1].quizId).toBe(102);

      // Module 3: Cross-Cultural (Units 7, 8 + Quiz 103 = 3 total)
      expect(MODULE_DEFINITIONS[2].id).toBe(3);
      expect(MODULE_DEFINITIONS[2].units).toEqual([7, 8]);
      expect(MODULE_DEFINITIONS[2].quizId).toBe(103);

      // Module 4: Crisis Leadership (Units 9, 10, 11, 12 + Quiz 104 = 5 total)
      expect(MODULE_DEFINITIONS[3].id).toBe(4);
      expect(MODULE_DEFINITIONS[3].units).toEqual([9, 10, 11, 12]);
      expect(MODULE_DEFINITIONS[3].quizId).toBe(104);

      // Module 5: Boardroom Delivery (Units 13, 14, 15 + Quiz 105 = 4 total)
      expect(MODULE_DEFINITIONS[4].id).toBe(5);
      expect(MODULE_DEFINITIONS[4].units).toEqual([13, 14, 15]);
      expect(MODULE_DEFINITIONS[4].quizId).toBe(105);

      // Total Module Units = 4 + 4 + 3 + 5 + 4 = 20 + Unit 0 (Orientation) = 21 Total Units
      const totalModuleItems = MODULE_DEFINITIONS.reduce((acc, m) => acc + m.units.length + 1, 0);
      expect(totalModuleItems + 1).toBe(TOTAL_CURRICULUM_UNITS);
    });

    // 11. Concurrent Multi-Unit Completion & Progress Calculation Resilience
    it('ADV-M3-11: Concurrent writes across multiple units do not corrupt stats or module progress', async () => {
      const uid = 'concurrent_m3_user';

      // Fire simultaneous completions for Module 1 units
      await Promise.all([
        service.markLessonCompleted(uid, 0),
        service.markLessonCompleted(uid, 1),
        service.markLessonCompleted(uid, 2),
        service.markLessonCompleted(uid, 3),
        service.saveQuizScore(uid, 101, 5, 5),
      ]);

      const doc = await service.fetchProgress(uid);
      expect(doc.completedLessons.length).toBe(5);
      expect(doc.completedLessons).toContain(0);
      expect(doc.completedLessons).toContain(1);
      expect(doc.completedLessons).toContain(2);
      expect(doc.completedLessons).toContain(3);
      expect(doc.completedLessons).toContain(101);

      const stats = ProgressCalculator.calculateStats(doc.completedLessons, doc.quizScores);
      expect(stats.completedCount).toBe(5);
      expect(stats.unitsMastered).toBe(4);
      expect(stats.assessmentsPassed).toBe(1);
      expect(stats.overallPercentage).toBe(24); // 5/21 ~ 24%

      const modules = ProgressCalculator.calculateModuleProgress(doc.completedLessons, doc.quizScores);
      expect(modules[0].status).toBe('completed');
      expect(modules[0].percentage).toBe(100);
      expect(modules[0].isCompleted).toBe(true);
    });
  });
}
