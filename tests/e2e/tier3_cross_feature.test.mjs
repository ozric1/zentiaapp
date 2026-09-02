// Tier 3: Cross-Feature Combinations & Integration Test Suite
import { describe, it, beforeEach, expect } from '../harness/testFramework.mjs';
import { MockAuth, MockFirestore } from '../harness/mockFirebase.mjs';
import { MockLocalStorage } from '../harness/mockLocalStorage.mjs';
import {
  AuthService,
  ProgressService,
  ProgressCalculator,
  RouteGuardSimulator
} from '../harness/zentiaSim.mjs';

export function registerTier3CrossFeatureTests() {
  describe('Tier 3: Cross-Feature Combinations & Integration', () => {
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

    it('INT-T3-01: Guest Session -> Authentication -> Storage Migration -> Dashboard Sync', async () => {
      // 1. Unauthenticated guest learns in LocalStorage
      mockStorage.setItem('zentia_completed', JSON.stringify([0, 1, 2]));
      mockStorage.setItem('zentia_last_lesson', '2');

      // 2. Route guard blocks direct dashboard access
      const unauthAccess = RouteGuardSimulator.evaluateRouteAccess('/dashboard', authService.currentUser);
      expect(unauthAccess.canAccess).toBe(false);

      // 3. Guest registers an account
      const user = await authService.signup('exec.partner@zentia.com', 'Passw0rd2026!', 'Executive Partner');
      expect(user).toBeDefined();

      // 4. Migrate local guest state into Firestore
      const migration = await progressService.migrateLocalStorage(user.uid, mockStorage);
      expect(migration.migrated).toBe(true);
      expect(migration.count).toBe(3);

      // 5. Verify Firestore has the merged data
      const cloudDoc = await progressService.fetchProgress(user.uid);
      expect(cloudDoc.completedLessons).toEqual([0, 1, 2]);
      expect(cloudDoc.lastLessonId).toBe(2);

      // 6. Dashboard metrics reflect the migrated progress
      const stats = ProgressCalculator.calculateStats(cloudDoc.completedLessons, cloudDoc.quizScores);
      expect(stats.unitsMastered).toBe(3);
      expect(stats.overallPercentage).toBe(14); // 3/21 * 100 ~ 14%

      // 7. Continue Learning CTA resolves to Lesson 3
      const target = ProgressCalculator.getContinueLearningTarget(cloudDoc.completedLessons, cloudDoc.lastLessonId);
      expect(target.targetLessonId).toBe(3);

      // 8. LocalStorage is cleared
      expect(mockStorage.getItem('zentia_completed')).toBeNull();
    });

    it('INT-T3-02: CourseViewer Progression -> Assessment Submission -> Dashboard Reflection', async () => {
      // 1. Authenticated user starts with Orientation (0) and Module 1 lessons 1 and 2
      const user = await authService.signup('vp.sales@zentia.com', 'Leadership123!', 'VP Sales');
      await progressService.markLessonCompleted(user.uid, 0);
      await progressService.markLessonCompleted(user.uid, 1);
      await progressService.markLessonCompleted(user.uid, 2);

      // 2. User completes Lesson 3
      await progressService.markLessonCompleted(user.uid, 3);
      await progressService.saveCurrentLesson(user.uid, 3);

      // 3. User attempts and passes Assessment 101 with 5/5 (100%)
      const quizResult = await progressService.saveQuizScore(user.uid, 101, 5, 5, { 1: 2, 2: 1, 3: 0, 4: 2, 5: 3 });
      expect(quizResult.passed).toBe(true);

      // 4. Fetch updated cloud progress
      const progress = await progressService.fetchProgress(user.uid);
      expect(progress.completedLessons).toContain(101);

      // 5. Dashboard module breakdown reflects Module 1 as 100% completed
      const modules = ProgressCalculator.calculateModuleProgress(progress.completedLessons, progress.quizScores);
      expect(modules[0].id).toBe(1);
      expect(modules[0].percentage).toBe(100);
      expect(modules[0].status).toBe('completed');
      expect(modules[0].isCompleted).toBe(true);

      // 6. Next Continue Learning target advances to Module 2 Lesson 4
      const nextTarget = ProgressCalculator.getContinueLearningTarget(progress.completedLessons, 101);
      expect(nextTarget.targetLessonId).toBe(4);
    });

    it('INT-T3-03: Multi-User Session Switching with Strict Data Isolation', async () => {
      // 1. User A progresses through Module 1 & 2
      const userA = await authService.signup('user.a@zentia.com', 'PassAlpha123!', 'User Alpha');
      await progressService.markLessonCompleted(userA.uid, 0);
      await progressService.markLessonCompleted(userA.uid, 1);
      await progressService.markLessonCompleted(userA.uid, 2);
      await progressService.markLessonCompleted(userA.uid, 3);
      await progressService.saveQuizScore(userA.uid, 101, 5, 5);

      // 2. User A logs out
      await authService.logout();
      expect(authService.currentUser).toBeNull();
      expect(RouteGuardSimulator.evaluateRouteAccess('/dashboard', authService.currentUser).canAccess).toBe(false);

      // 3. User B registers (fresh account)
      const userB = await authService.signup('user.b@zentia.com', 'PassBeta123!', 'User Beta');
      const userBDoc = await progressService.fetchProgress(userB.uid);

      // 4. Verify User B has completely clean 0% state
      expect(userBDoc.completedLessons).toEqual([]);
      expect(userBDoc.quizScores).toEqual({});
      expect(userBDoc.stats.overallPercentage).toBe(0);
      expect(userBDoc.stats.unitsMastered).toBe(0);

      // 5. Re-verify User A data was untouched in Firestore
      const userADoc = await progressService.fetchProgress(userA.uid);
      expect(userADoc.completedLessons.length).toBe(5);
      expect(userADoc.stats.assessmentsPassed).toBe(1);
    });

    it('INT-T3-04: Concurrent Writes & Atomic arrayUnion Resilience', async () => {
      const user = await authService.signup('concurrent@zentia.com', 'ConcurPass1!', 'Concurrent User');

      // Simulate simultaneous completion requests from multiple tabs
      await Promise.all([
        progressService.markLessonCompleted(user.uid, 4),
        progressService.markLessonCompleted(user.uid, 5),
        progressService.markLessonCompleted(user.uid, 6),
      ]);

      const doc = await progressService.fetchProgress(user.uid);
      expect(doc.completedLessons).toContain(4);
      expect(doc.completedLessons).toContain(5);
      expect(doc.completedLessons).toContain(6);
      expect(doc.completedLessons.length).toBe(3);
    });
  });
}
