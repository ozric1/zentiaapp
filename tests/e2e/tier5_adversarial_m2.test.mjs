// Zentia World Program - Tier 5 Adversarial & Empirical Challenge Suite (Milestone 2)
// Empirical validation of ProgressService, multi-user isolation, quiz score idempotency, offline resilience, and sequence traversal

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

export function registerTier5AdversarialM2Tests() {
  describe('Tier 5 Adversarial M2: Interface Contracts & Schema Conformance', () => {
    let service;

    beforeEach(() => {
      mockDb.clear();
      service = new ProgressService(mockDb);
    });

    it('ADV-M2-01: ProgressService adheres to all contract methods and signatures', async () => {
      expect(typeof service.fetchProgress).toBe('function');
      expect(typeof service.saveCurrentLesson).toBe('function');
      expect(typeof service.markLessonCompleted).toBe('function');
      expect(typeof service.saveQuizScore).toBe('function');
      expect(typeof service.migrateLocalStorage).toBe('function');

      // Static calculator methods
      expect(typeof ProgressCalculator.calculateStats).toBe('function');
      expect(typeof ProgressCalculator.calculateModuleProgress).toBe('function');
      expect(typeof ProgressCalculator.getContinueLearningTarget).toBe('function');
      expect(TOTAL_CURRICULUM_UNITS).toBe(21);
      expect(CURRICULUM_SEQUENCE.length).toBe(21);
      expect(MODULE_DEFINITIONS.length).toBe(5);
    });

    it('ADV-M2-02: ProgressStats schema compliance with baseline values', async () => {
      const stats = ProgressCalculator.calculateStats([], {});
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(0);
      expect(stats.unitsMastered).toBe(0);
      expect(stats.assessmentsPassed).toBe(0);
      expect(stats.overallPercentage).toBe(0);
      expect(stats.avgScore).toBe(0);
    });

    it('ADV-M2-03: ProgressCalculator resilience against empty inputs', () => {
      const stats = ProgressCalculator.calculateStats([], {});
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(0);
      expect(stats.overallPercentage).toBe(0);

      const modules = ProgressCalculator.calculateModuleProgress([], {});
      expect(modules.length).toBe(5);
      expect(modules[0].status).toBe('not_started');
      expect(modules[0].isCompleted).toBe(false);

      const target = ProgressCalculator.getContinueLearningTarget([], 0);
      expect(target.targetLessonId).toBe(0);
      expect(target.isProgramComplete).toBe(false);
    });
  });

  describe('Tier 5 Adversarial M2: Multi-User Isolation & Concurrency', () => {
    let service;

    beforeEach(() => {
      mockDb.clear();
      service = new ProgressService(mockDb);
    });

    it('ADV-M2-04: Strict data isolation across 3 distinct users with overlapping actions', async () => {
      const userA = 'uid_adv_user_a';
      const userB = 'uid_adv_user_b';
      const userC = 'uid_adv_user_c';

      // User A completes Module 1
      await service.markLessonCompleted(userA, 0);
      await service.markLessonCompleted(userA, 1);
      await service.markLessonCompleted(userA, 2);
      await service.markLessonCompleted(userA, 3);
      await service.saveQuizScore(userA, 101, 5, 5, { 1: 0, 2: 1 });
      await service.saveCurrentLesson(userA, 4);

      // User B completes Module 2 units only
      await service.markLessonCompleted(userB, 4);
      await service.markLessonCompleted(userB, 5);
      await service.saveQuizScore(userB, 102, 3, 5, { 1: 0 }); // 60% fail
      await service.saveCurrentLesson(userB, 6);

      // Fetch all three users
      const docA = await service.fetchProgress(userA);
      const docB = await service.fetchProgress(userB);
      const docC = await service.fetchProgress(userC);

      // Verify User A
      expect(docA.completedLessons).toContain(0);
      expect(docA.completedLessons).toContain(1);
      expect(docA.completedLessons).toContain(2);
      expect(docA.completedLessons).toContain(3);
      expect(docA.completedLessons).toContain(101);
      expect(docA.completedLessons).not.toContain(4);
      expect(docA.lastLessonId).toBe(4);
      expect(docA.quizScores['101'].passed).toBe(true);
      expect(docA.quizScores['101'].score).toBe(5);
      expect(docA.quizScores['102']).toBeUndefined();
      expect(docA.stats.unitsMastered).toBe(4); // 0, 1, 2, 3
      expect(docA.stats.assessmentsPassed).toBe(1);

      // Verify User B
      expect(docB.completedLessons).toContain(4);
      expect(docB.completedLessons).toContain(5);
      expect(docB.completedLessons).not.toContain(0);
      expect(docB.completedLessons).not.toContain(101);
      expect(docB.completedLessons).not.toContain(102); // failed quiz not completed
      expect(docB.lastLessonId).toBe(6);
      expect(docB.quizScores['102'].passed).toBe(false);
      expect(docB.quizScores['101']).toBeUndefined();
      expect(docB.stats.unitsMastered).toBe(2);
      expect(docB.stats.assessmentsPassed).toBe(0);

      // Verify User C is completely empty/default
      expect(docC.completedLessons.length).toBe(0);
      expect(docC.lastLessonId).toBe(0);
      expect(Object.keys(docC.quizScores).length).toBe(0);
      expect(docC.stats.completedCount).toBe(0);
    });

    it('ADV-M2-05: High concurrency stress test with 20 simultaneous users', async () => {
      const userCount = 20;
      const userIds = Array.from({ length: userCount }, (_, i) => `concurrent_user_${i + 1}`);

      // Run 20 users performing async writes simultaneously
      await Promise.all(
        userIds.map(async (uid, index) => {
          const lessonToComplete = index % 15;
          await service.markLessonCompleted(uid, lessonToComplete);
          await service.saveCurrentLesson(uid, lessonToComplete);
          if (index % 2 === 0) {
            await service.saveQuizScore(uid, 101, 5, 5);
          }
        })
      );

      // Verify each user has their isolated record
      for (let i = 0; i < userCount; i++) {
        const uid = userIds[i];
        const doc = await service.fetchProgress(uid);
        const expectedLesson = i % 15;
        expect(doc.completedLessons).toContain(expectedLesson);
        expect(doc.lastLessonId).toBe(expectedLesson);
        if (i % 2 === 0) {
          expect(doc.quizScores['101']).toBeDefined();
          expect(doc.quizScores['101'].passed).toBe(true);
        } else {
          expect(doc.quizScores['101']).toBeUndefined();
        }
      }
    });

    it('ADV-M2-06: Atomic arrayUnion writes for multi-lesson completion without lost updates', async () => {
      const uid = 'single_user_atomic_arrayunion';
      const docRef = doc(mockDb, 'users', uid, 'progress', 'business-english');
      
      // Fire parallel atomic setDoc operations with arrayUnion
      await Promise.all([
        mockDb.setDoc(docRef, { completedLessons: arrayUnion(1) }, { merge: true }),
        mockDb.setDoc(docRef, { completedLessons: arrayUnion(2) }, { merge: true }),
        mockDb.setDoc(docRef, { completedLessons: arrayUnion(3) }, { merge: true }),
        mockDb.setDoc(docRef, { completedLessons: arrayUnion(4) }, { merge: true }),
        mockDb.setDoc(docRef, { completedLessons: arrayUnion(5) }, { merge: true })
      ]);

      const docSnapshot = await service.fetchProgress(uid);
      expect(docSnapshot.completedLessons.length).toBe(5);
      expect(docSnapshot.completedLessons).toContain(1);
      expect(docSnapshot.completedLessons).toContain(2);
      expect(docSnapshot.completedLessons).toContain(3);
      expect(docSnapshot.completedLessons).toContain(4);
      expect(docSnapshot.completedLessons).toContain(5);
    });
  });

  describe('Tier 5 Adversarial M2: Quiz Score Idempotency & Score Transitions', () => {
    let service;

    beforeEach(() => {
      mockDb.clear();
      service = new ProgressService(mockDb);
    });

    it('ADV-M2-07: Retaking quiz with identical score does not duplicate completions', async () => {
      const uid = 'idempotent_quiz_user';
      await service.saveQuizScore(uid, 101, 5, 5, { 1: 0 });
      let doc = await service.fetchProgress(uid);
      expect(doc.completedLessons.filter(x => x === 101).length).toBe(1);
      expect(doc.stats.assessmentsPassed).toBe(1);

      // Retake identical
      await service.saveQuizScore(uid, 101, 5, 5, { 1: 0 });
      doc = await service.fetchProgress(uid);
      expect(doc.completedLessons.filter(x => x === 101).length).toBe(1);
      expect(doc.stats.assessmentsPassed).toBe(1);
      expect(doc.stats.avgScore).toBe(100);
    });

    it('ADV-M2-08: Retake transition from Failed (40%) to Passed (100%)', async () => {
      const uid = 'retry_pass_user';

      // First attempt: 2/5 (40% - failed)
      await service.saveQuizScore(uid, 101, 2, 5);
      let doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).not.toContain(101);
      expect(doc.quizScores['101'].passed).toBe(false);
      expect(doc.quizScores['101'].percentage).toBe(40);
      expect(doc.stats.assessmentsPassed).toBe(0);
      expect(doc.stats.avgScore).toBe(40);

      // Second attempt: 5/5 (100% - passed)
      await service.saveQuizScore(uid, 101, 5, 5);
      doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).toContain(101);
      expect(doc.quizScores['101'].passed).toBe(true);
      expect(doc.quizScores['101'].percentage).toBe(100);
      expect(doc.stats.assessmentsPassed).toBe(1);
      expect(doc.stats.avgScore).toBe(100);
    });

    it('ADV-M2-09: Retake transition with lower score after previously passing retains completion', async () => {
      const uid = 'lower_retake_user';

      // Passed first
      await service.saveQuizScore(uid, 101, 5, 5);
      let doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).toContain(101);

      // Retake with 3/5 (60%)
      await service.saveQuizScore(uid, 101, 3, 5);
      doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).toContain(101); // remains completed
      expect(doc.quizScores['101'].score).toBe(3);
      expect(doc.quizScores['101'].percentage).toBe(60);
      expect(doc.quizScores['101'].passed).toBe(false);
    });

    it('ADV-M2-10: Boundary quiz scoring percentages and average score precision', async () => {
      const uid = 'boundary_quiz_user';
      // 0/5 -> 0%
      await service.saveQuizScore(uid, 101, 0, 5);
      let doc = await service.fetchProgress(uid);
      expect(doc.quizScores['101'].percentage).toBe(0);
      expect(doc.quizScores['101'].passed).toBe(false);

      // 4/5 -> 80% (Pass threshold)
      await service.saveQuizScore(uid, 102, 4, 5);
      doc = await service.fetchProgress(uid);
      expect(doc.quizScores['102'].percentage).toBe(80);
      expect(doc.quizScores['102'].passed).toBe(true);

      // 3/5 -> 60% (Below threshold)
      await service.saveQuizScore(uid, 103, 3, 5);
      doc = await service.fetchProgress(uid);
      expect(doc.quizScores['103'].percentage).toBe(60);
      expect(doc.quizScores['103'].passed).toBe(false);

      // Check average: (0 + 80 + 60) / 3 = 140 / 3 = 47%
      expect(doc.stats.avgScore).toBe(47);
      expect(doc.stats.assessmentsPassed).toBe(1);
    });
  });

  describe('Tier 5 Adversarial M2: LocalStorage Migration & Offline Resilience', () => {
    let service;
    let mockStorage;

    beforeEach(() => {
      mockDb.clear();
      service = new ProgressService(mockDb);
      mockStorage = new MockLocalStorage();
    });

    it('ADV-M2-11: Set-union merge of guest localStorage with existing cloud progress', async () => {
      const uid = 'merge_guest_user_adv';
      // Existing cloud progress
      await service.markLessonCompleted(uid, 0);
      await service.markLessonCompleted(uid, 3);
      await service.saveCurrentLesson(uid, 3);

      // Guest localStorage data
      mockStorage.setItem('zentia_completed', JSON.stringify([1, 2, 3]));
      mockStorage.setItem('zentia_last_lesson', '2');

      const result = await service.migrateLocalStorage(uid, mockStorage);
      expect(result.migrated).toBe(true);

      const doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).toContain(0);
      expect(doc.completedLessons).toContain(1);
      expect(doc.completedLessons).toContain(2);
      expect(doc.completedLessons).toContain(3);
      expect(doc.completedLessons.length).toBe(4);
      expect(doc.lastLessonId).toBe(2);

      // Storage cleanup
      expect(mockStorage.getItem('zentia_completed')).toBeNull();
      expect(mockStorage.getItem('zentia_last_lesson')).toBeNull();
    });

    it('ADV-M2-12: Resilient handling of malformed and corrupted localStorage inputs', async () => {
      const uid = 'malformed_storage_user_adv';

      // 1. Corrupted JSON syntax
      mockStorage.setItem('zentia_completed', '{not valid json!!!');
      mockStorage.setItem('zentia_last_lesson', 'abc');

      let result = await service.migrateLocalStorage(uid, mockStorage);
      expect(result.migrated).toBe(false);
      let doc = await service.fetchProgress(uid);
      expect(doc.completedLessons.length).toBe(0);

      // 2. Valid numeric array
      mockStorage.setItem('zentia_completed', JSON.stringify([0, 5]));
      mockStorage.setItem('zentia_last_lesson', '5');

      result = await service.migrateLocalStorage(uid, mockStorage);
      expect(result.migrated).toBe(true);
      doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).toEqual([0, 5]);
      expect(doc.lastLessonId).toBe(5);
    });

    it('ADV-M2-13: Empty localStorage migration is a clean no-op', async () => {
      const uid = 'clean_empty_storage_user_adv';
      await service.markLessonCompleted(uid, 0);

      const result = await service.migrateLocalStorage(uid, mockStorage);
      expect(result.migrated).toBe(false);
      expect(result.count).toBe(0);

      const doc = await service.fetchProgress(uid);
      expect(doc.completedLessons).toEqual([0]);
    });
  });

  describe('Tier 5 Adversarial M2: Continue Learning Engine Traversal', () => {
    it('ADV-M2-14: Traversal across the 21-unit sequence from 0 to graduation', () => {
      // 1. Fresh user -> Unit 0
      let target = ProgressCalculator.getContinueLearningTarget([], 0);
      expect(target.targetLessonId).toBe(0);
      expect(target.isProgramComplete).toBe(false);

      // 2. Completed Unit 0 -> Lesson 1
      target = ProgressCalculator.getContinueLearningTarget([0], 0);
      expect(target.targetLessonId).toBe(1);

      // 3. Completed Module 1 Lessons [0, 1, 2, 3] -> Assessment 101
      target = ProgressCalculator.getContinueLearningTarget([0, 1, 2, 3], 3);
      expect(target.targetLessonId).toBe(101);

      // 4. Completed Assessment 101 -> Lesson 4 (Module 2)
      target = ProgressCalculator.getContinueLearningTarget([0, 1, 2, 3, 101], 101);
      expect(target.targetLessonId).toBe(4);

      // 5. Complete all 21 units
      const all21Units = [...CURRICULUM_SEQUENCE];
      target = ProgressCalculator.getContinueLearningTarget(all21Units, 15);
      expect(target.isProgramComplete).toBe(true);
      expect(target.isCompleted).toBe(true);
      expect(target.targetLessonId).toBe(105); // Final unit in 21-item curriculum sequence is Assessment 105
    });

    it('ADV-M2-15: Active uncompleted lastLessonId takes precedence over start of sequence', () => {
      // User completed 0 and 1, but navigated to lesson 5 without completing it
      const target = ProgressCalculator.getContinueLearningTarget([0, 1], 5);
      expect(target.targetLessonId).toBe(5);
      expect(target.isCompleted).toBe(false);
      expect(target.isProgramComplete).toBe(false);
    });
  });
}
