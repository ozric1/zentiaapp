// Tier 1: Feature Area 2 - Firestore Progress Tracking & LocalStorage Migration Test Suite
import { describe, it, beforeEach, expect } from '../harness/testFramework.mjs';
import { MockFirestore } from '../harness/mockFirebase.mjs';
import { MockLocalStorage } from '../harness/mockLocalStorage.mjs';
import { ProgressService, ProgressCalculator } from '../harness/zentiaSim.mjs';

export function registerTier1ProgressTests() {
  describe('Tier 1: Feature Area 2 - Firestore Progress Tracking & LocalStorage Migration', () => {
    let mockDb;
    let mockStorage;
    let progressService;

    beforeEach(() => {
      mockDb = new MockFirestore();
      mockStorage = new MockLocalStorage();
      progressService = new ProgressService(mockDb);
    });

    it('PROG-T1-01: Progress document initialization on initial fetch', async () => {
      const doc = await progressService.fetchProgress('user_init_001');
      expect(doc).toBeDefined();
      expect(doc.completedLessons).toEqual([]);
      expect(doc.quizScores).toEqual({});
      expect(doc.lastLessonId).toBe(0);
      expect(doc.stats.overallPercentage).toBe(0);
      expect(doc.stats.unitsMastered).toBe(0);
      expect(doc.stats.assessmentsPassed).toBe(0);
    });

    it('PROG-T1-02: Save current lesson position updates lastLessonId', async () => {
      await progressService.saveCurrentLesson('user_pos_002', 3);
      const doc = await progressService.fetchProgress('user_pos_002');
      expect(doc.lastLessonId).toBe(3);
    });

    it('PROG-T1-03: Mark lesson completed atomically records unit completion', async () => {
      await progressService.markLessonCompleted('user_comp_003', 1);
      await progressService.markLessonCompleted('user_comp_003', 2);
      
      const doc = await progressService.fetchProgress('user_comp_003');
      expect(doc.completedLessons).toContain(1);
      expect(doc.completedLessons).toContain(2);
      expect(doc.completedLessons.length).toBe(2);
      expect(doc.stats.unitsMastered).toBe(2);
      expect(doc.stats.overallPercentage).toBe(10); // 2/21 * 100 ~ 10%
    });

    it('PROG-T1-04: Quiz score recording stores score, percentage, and passed flag', async () => {
      const quizResult = await progressService.saveQuizScore('user_quiz_004', 101, 4, 5, { 1: 0, 2: 1, 3: 2, 4: 0, 5: 3 });
      
      expect(quizResult.quizId).toBe(101);
      expect(quizResult.score).toBe(4);
      expect(quizResult.total).toBe(5);
      expect(quizResult.percentage).toBe(80);
      expect(quizResult.passed).toBe(true);

      const doc = await progressService.fetchProgress('user_quiz_004');
      expect(doc.quizScores[101]).toBeDefined();
      expect(doc.quizScores[101].score).toBe(4);
      expect(doc.quizScores[101].passed).toBe(true);
      expect(doc.completedLessons).toContain(101); // Passing quiz adds to completed units
      expect(doc.stats.assessmentsPassed).toBe(1);
      expect(doc.stats.avgScore).toBe(80);
    });

    it('PROG-T1-05: Multi-user progress isolation verifies zero data leakage', async () => {
      await progressService.markLessonCompleted('user_alpha', 1);
      await progressService.markLessonCompleted('user_alpha', 2);
      await progressService.markLessonCompleted('user_alpha', 3);

      await progressService.markLessonCompleted('user_beta', 4);

      const alphaDoc = await progressService.fetchProgress('user_alpha');
      const betaDoc = await progressService.fetchProgress('user_beta');

      expect(alphaDoc.completedLessons).toEqual([1, 2, 3]);
      expect(betaDoc.completedLessons).toEqual([4]);
      expect(alphaDoc.stats.unitsMastered).toBe(3);
      expect(betaDoc.stats.unitsMastered).toBe(1);
    });

    it('PROG-T1-06: LocalStorage guest progress migrates seamlessly to Firestore on login', async () => {
      // Setup existing cloud progress with lesson 0
      await progressService.markLessonCompleted('user_mig_006', 0);

      // Guest completed lessons 1 & 2 in LocalStorage
      mockStorage.setItem('zentia_completed', JSON.stringify([1, 2]));
      mockStorage.setItem('zentia_last_lesson', '2');

      const migrationResult = await progressService.migrateLocalStorage('user_mig_006', mockStorage);
      expect(migrationResult.migrated).toBe(true);
      expect(migrationResult.count).toBe(2);

      const updatedDoc = await progressService.fetchProgress('user_mig_006');
      expect(updatedDoc.completedLessons).toContain(0);
      expect(updatedDoc.completedLessons).toContain(1);
      expect(updatedDoc.completedLessons).toContain(2);
      expect(updatedDoc.completedLessons.length).toBe(3);
      expect(updatedDoc.lastLessonId).toBe(2);

      // LocalStorage keys should be cleaned up post-migration
      expect(mockStorage.getItem('zentia_completed')).toBeNull();
      expect(mockStorage.getItem('zentia_last_lesson')).toBeNull();
    });
  });
}
