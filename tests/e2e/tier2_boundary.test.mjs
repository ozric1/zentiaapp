// Tier 2: Boundary & Corner Cases Test Suite
import { describe, it, beforeEach, expect } from '../harness/testFramework.mjs';
import { MockAuth, MockFirestore, FirebaseError } from '../harness/mockFirebase.mjs';
import { MockLocalStorage } from '../harness/mockLocalStorage.mjs';
import { AuthService, ProgressService, ProgressCalculator, CURRICULUM_SEQUENCE } from '../harness/zentiaSim.mjs';

export function registerTier2BoundaryTests() {
  describe('Tier 2: Boundary & Corner Cases', () => {
    let mockAuth;
    let authService;
    let mockDb;
    let mockStorage;
    let progressService;

    beforeEach(() => {
      mockAuth = new MockAuth();
      authService = new AuthService(mockAuth);
      authService.init();

      mockDb = new MockFirestore();
      mockStorage = new MockLocalStorage();
      progressService = new ProgressService(mockDb);
    });

    it('AUTH-T2-01: Malformed emails reject with auth/invalid-email', async () => {
      const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'user@domain'];
      for (const badEmail of invalidEmails) {
        let threw = false;
        try {
          await authService.signup(badEmail, 'ValidPass123!');
        } catch (err) {
          threw = true;
          expect(err.code).toBe('auth/invalid-email');
        }
        expect(threw).toBe(true);
      }
    });

    it('AUTH-T2-02: Passwords under 6 characters reject with auth/weak-password', async () => {
      const shortPasswords = ['', 'a', '123', 'pass5'];
      for (const weak of shortPasswords) {
        let threw = false;
        try {
          await authService.signup('valid@zentia.com', weak);
        } catch (err) {
          threw = true;
          expect(err.code).toBe('auth/weak-password');
        }
        expect(threw).toBe(true);
      }
    });

    it('AUTH-T2-03: Duplicate email registration rejects with auth/email-already-in-use', async () => {
      await authService.signup('ceo@zentia.com', 'Boardroom123!');
      
      let threw = false;
      try {
        await authService.signup('ceo@zentia.com', 'DifferentPass123!');
      } catch (err) {
        threw = true;
        expect(err.code).toBe('auth/email-already-in-use');
      }
      expect(threw).toBe(true);
    });

    it('AUTH-T2-04: Network disconnection during auth throws auth/network-request-failed gracefully', async () => {
      mockAuth.networkEnabled = false;
      let threw = false;
      try {
        await authService.login('ceo@zentia.com', 'Boardroom123!');
      } catch (err) {
        threw = true;
        expect(err.code).toBe('auth/network-request-failed');
      }
      expect(threw).toBe(true);
      expect(authService.error).toBeTruthy();
    });

    it('PROG-T2-01: Idempotent unit completion - repeatedly completing the same lesson causes no duplicate entries', async () => {
      const uid = 'idempotent_user';
      await progressService.markLessonCompleted(uid, 5);
      await progressService.markLessonCompleted(uid, 5);
      await progressService.markLessonCompleted(uid, 5);

      const doc = await progressService.fetchProgress(uid);
      expect(doc.completedLessons).toEqual([5]);
      expect(doc.completedLessons.length).toBe(1);
    });

    it('PROG-T2-02: Quiz scoring edge boundary 0% (0/5) marks failed and does not add quizId to completedLessons', async () => {
      const uid = 'quiz_fail_user';
      const result = await progressService.saveQuizScore(uid, 101, 0, 5);
      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);

      const doc = await progressService.fetchProgress(uid);
      expect(doc.completedLessons.includes(101)).toBe(false);
      expect(doc.stats.assessmentsPassed).toBe(0);
      expect(doc.stats.avgScore).toBe(0);
    });

    it('PROG-T2-03: Quiz scoring edge boundary 100% (5/5) marks passed and adds quizId to completedLessons', async () => {
      const uid = 'quiz_perfect_user';
      const result = await progressService.saveQuizScore(uid, 102, 5, 5);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);

      const doc = await progressService.fetchProgress(uid);
      expect(doc.completedLessons.includes(102)).toBe(true);
      expect(doc.stats.assessmentsPassed).toBe(1);
      expect(doc.stats.avgScore).toBe(100);
    });

    it('PROG-T2-04: Corrupted LocalStorage JSON string is safely handled during migration without throwing unhandled error', async () => {
      const uid = 'corrupt_storage_user';
      mockStorage.setItem('zentia_completed', '{ this is not valid JSON ]]');
      mockStorage.setItem('zentia_last_lesson', 'invalid_number');

      const migration = await progressService.migrateLocalStorage(uid, mockStorage);
      expect(migration.migrated).toBe(false);

      const doc = await progressService.fetchProgress(uid);
      expect(doc.completedLessons).toEqual([]);
    });

    it('PROG-T2-05: Non-array or malformed primitive LocalStorage payload is safely discarded', async () => {
      const uid = 'primitive_storage_user';
      mockStorage.setItem('zentia_completed', JSON.stringify({ 1: true, 2: true })); // object instead of array
      mockStorage.setItem('zentia_last_lesson', '3');

      const migration = await progressService.migrateLocalStorage(uid, mockStorage);
      expect(migration.migrated).toBe(true); // last_lesson was valid

      const doc = await progressService.fetchProgress(uid);
      expect(doc.completedLessons).toEqual([]);
      expect(doc.lastLessonId).toBe(3);
    });

    it('PROG-T2-06: Empty LocalStorage migration is clean no-op and preserves existing cloud document', async () => {
      const uid = 'empty_storage_user';
      await progressService.markLessonCompleted(uid, 7);

      const migration = await progressService.migrateLocalStorage(uid, mockStorage);
      expect(migration.migrated).toBe(false);

      const doc = await progressService.fetchProgress(uid);
      expect(doc.completedLessons).toEqual([7]);
    });

    it('DASH-T2-01: Zero completed items produces zero baseline statistics', () => {
      const stats = ProgressCalculator.calculateStats([], {});
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(0);
      expect(stats.unitsMastered).toBe(0);
      expect(stats.assessmentsPassed).toBe(0);
      expect(stats.overallPercentage).toBe(0);
      expect(stats.avgScore).toBe(0);
    });

    it('DASH-T2-02: 100% Curriculum Completion calculates exact 100% metrics and completion flags', () => {
      const allUnits = [...CURRICULUM_SEQUENCE];
      const allQuizzes = {
        101: { score: 5, total: 5, percentage: 100, passed: true },
        102: { score: 5, total: 5, percentage: 100, passed: true },
        103: { score: 5, total: 5, percentage: 100, passed: true },
        104: { score: 5, total: 5, percentage: 100, passed: true },
        105: { score: 5, total: 5, percentage: 100, passed: true },
      };

      const stats = ProgressCalculator.calculateStats(allUnits, allQuizzes);
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(21);
      expect(stats.unitsMastered).toBe(16); // Lessons 0 through 15
      expect(stats.assessmentsPassed).toBe(5);
      expect(stats.overallPercentage).toBe(100);
      expect(stats.avgScore).toBe(100);

      const modules = ProgressCalculator.calculateModuleProgress(allUnits, allQuizzes);
      for (const mod of modules) {
        expect(mod.status).toBe('completed');
        expect(mod.percentage).toBe(100);
        expect(mod.isCompleted).toBe(true);
      }

      const target = ProgressCalculator.getContinueLearningTarget(allUnits, 105);
      expect(target.isCompleted).toBe(true);
      expect(target.isProgramComplete).toBe(true);
    });
  });
}
