// Tier 4: Real-World Scenarios & End-to-End User Workflows
import { describe, it, beforeEach, expect } from '../harness/testFramework.mjs';
import { MockAuth, MockFirestore } from '../harness/mockFirebase.mjs';
import { MockLocalStorage } from '../harness/mockLocalStorage.mjs';
import {
  AuthService,
  ProgressService,
  ProgressCalculator,
  RouteGuardSimulator,
  CURRICULUM_SEQUENCE
} from '../harness/zentiaSim.mjs';

export function registerTier4RealWorldTests() {
  describe('Tier 4: Real-World Scenarios & End-to-End Workflows', () => {
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

    it('E2E-T4-01: Executive Learner Onboarding & First Unit Completion', async () => {
      // 1. Initial attempt to visit dashboard unauthenticated is intercepted
      const unauthRoute = RouteGuardSimulator.evaluateRouteAccess('/dashboard', null);
      expect(unauthRoute.canAccess).toBe(false);
      expect(unauthRoute.redirect).toContain('/login');

      // 2. Executive registers
      const user = await authService.signup('managing.director@zentia.com', 'Excellence2026#', 'Elena Rostova');
      expect(user.displayName).toBe('Elena Rostova');

      // 3. User lands on Dashboard and verifies 0% baseline state
      const initialProgress = await progressService.fetchProgress(user.uid);
      expect(initialProgress.completedLessons.length).toBe(0);

      const target = ProgressCalculator.getContinueLearningTarget(initialProgress.completedLessons, initialProgress.lastLessonId);
      expect(target.targetLessonId).toBe(0); // Orientation lesson

      // 4. User navigates to CourseViewer and completes Lesson 0 (Orientation)
      await progressService.saveCurrentLesson(user.uid, 0);
      await progressService.markLessonCompleted(user.uid, 0);

      // 5. Dashboard updates metrics in real-time
      const updatedProgress = await progressService.fetchProgress(user.uid);
      expect(updatedProgress.completedLessons).toEqual([0]);

      const updatedStats = ProgressCalculator.calculateStats(updatedProgress.completedLessons, updatedProgress.quizScores);
      expect(updatedStats.unitsMastered).toBe(1);
      expect(updatedStats.overallPercentage).toBe(5); // 1/21 * 100 ~ 5%

      // 6. Next target automatically resolves to Lesson 1
      const nextTarget = ProgressCalculator.getContinueLearningTarget(updatedProgress.completedLessons, updatedProgress.lastLessonId);
      expect(nextTarget.targetLessonId).toBe(1);
    });

    it('E2E-T4-02: Module 1 Mastery, Assessment 101 Passage, and Module 2 Unlock', async () => {
      // 1. Existing user logs in
      await mockAuth.createUserWithEmailAndPassword('cfo.finance@zentia.com', 'Treasury2026!', 'David Vance');
      const user = await authService.login('cfo.finance@zentia.com', 'Treasury2026!');

      // 2. User completes Orientation and all Module 1 lessons (1, 2, 3)
      await progressService.markLessonCompleted(user.uid, 0);
      await progressService.markLessonCompleted(user.uid, 1);
      await progressService.markLessonCompleted(user.uid, 2);
      await progressService.markLessonCompleted(user.uid, 3);
      await progressService.saveCurrentLesson(user.uid, 3);

      // 3. Continue learning CTA points to Assessment 101
      const preQuizProgress = await progressService.fetchProgress(user.uid);
      const quizTarget = ProgressCalculator.getContinueLearningTarget(preQuizProgress.completedLessons, preQuizProgress.lastLessonId);
      expect(quizTarget.targetLessonId).toBe(101);

      // 4. User submits Assessment 101 with 5/5 score (100%)
      const quizResult = await progressService.saveQuizScore(user.uid, 101, 5, 5, { 1: 0, 2: 1, 3: 2, 4: 0, 5: 3 });
      expect(quizResult.passed).toBe(true);
      expect(quizResult.percentage).toBe(100);

      // 5. Verify Dashboard reflects Module 1 complete and unlocks Module 2
      const postQuizProgress = await progressService.fetchProgress(user.uid);
      expect(postQuizProgress.completedLessons).toContain(101);

      const modules = ProgressCalculator.calculateModuleProgress(postQuizProgress.completedLessons, postQuizProgress.quizScores);
      expect(modules[0].id).toBe(1);
      expect(modules[0].status).toBe('completed');
      expect(modules[0].isCompleted).toBe(true);

      expect(modules[1].id).toBe(2);
      expect(modules[1].status).toBe('not_started');

      // 6. Continue learning target now points to Module 2 Lesson 4
      const nextTarget = ProgressCalculator.getContinueLearningTarget(postQuizProgress.completedLessons, 101);
      expect(nextTarget.targetLessonId).toBe(4);
    });

    it('E2E-T4-03: Multi-Session Cloud Sync across Devices', async () => {
      // 1. Device A: User logs in and finishes Module 1 & Module 2
      const userA = await authService.signup('global.exec@zentia.com', 'GlobalLeader99!', 'Global Leader');
      const unitsDeviceA = [0, 1, 2, 3, 101, 4, 5, 6, 102];
      for (const u of unitsDeviceA) {
        if (u > 100) {
          await progressService.saveQuizScore(userA.uid, u, 5, 5);
        } else {
          await progressService.markLessonCompleted(userA.uid, u);
        }
      }
      await progressService.saveCurrentLesson(userA.uid, 102);

      // Device A logs out
      await authService.logout();

      // 2. Device B: User logs in on different device/client
      const deviceBAuth = new AuthService(mockAuth);
      deviceBAuth.init();
      const userB = await deviceBAuth.login('global.exec@zentia.com', 'GlobalLeader99!');

      const deviceBProgressService = new ProgressService(mockDb);
      const syncedProgress = await deviceBProgressService.fetchProgress(userB.uid);

      // 3. Verify exact state synchronization
      expect(syncedProgress.completedLessons.length).toBe(9);
      expect(syncedProgress.quizScores[101].score).toBe(5);
      expect(syncedProgress.quizScores[102].score).toBe(5);

      const target = ProgressCalculator.getContinueLearningTarget(syncedProgress.completedLessons, syncedProgress.lastLessonId);
      // Next uncompleted unit is Module 3 Lesson 7
      expect(target.targetLessonId).toBe(7);
    });

    it('E2E-T4-04: Full Program Graduation & Executive Certification', async () => {
      // 1. Register executive candidate
      const user = await authService.signup('valedictorian@zentia.com', 'Mastery2026!', 'Alex Valedictorian');

      // 2. Complete all 21 items in the curriculum sequence
      for (const unitId of CURRICULUM_SEQUENCE) {
        if (unitId > 100) {
          await progressService.saveQuizScore(user.uid, unitId, 5, 5);
        } else {
          await progressService.markLessonCompleted(user.uid, unitId);
        }
      }
      await progressService.saveCurrentLesson(user.uid, 105);

      // 3. Fetch final graduation progress document
      const gradProgress = await progressService.fetchProgress(user.uid);
      expect(gradProgress.completedLessons.length).toBe(21);

      // 4. Verify all 4 metrics at graduation
      const stats = ProgressCalculator.calculateStats(gradProgress.completedLessons, gradProgress.quizScores);
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(21);
      expect(stats.unitsMastered).toBe(16);
      expect(stats.assessmentsPassed).toBe(5);
      expect(stats.overallPercentage).toBe(100);
      expect(stats.avgScore).toBe(100);

      // 5. Verify all 5 modules completed
      const modules = ProgressCalculator.calculateModuleProgress(gradProgress.completedLessons, gradProgress.quizScores);
      for (const mod of modules) {
        expect(mod.status).toBe('completed');
        expect(mod.percentage).toBe(100);
        expect(mod.isCompleted).toBe(true);
      }

      // 6. Verify program completion target state
      const target = ProgressCalculator.getContinueLearningTarget(gradProgress.completedLessons, gradProgress.lastLessonId);
      expect(target.isCompleted).toBe(true);
      expect(target.isProgramComplete).toBe(true);
    });
  });
}
