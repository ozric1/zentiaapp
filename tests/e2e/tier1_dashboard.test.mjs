// Tier 1: Feature Area 3 - Personalized Dashboard & Continue Learning Mechanics Test Suite
import { describe, it, beforeEach, expect } from '../harness/testFramework.mjs';
import { ProgressCalculator, CURRICULUM_SEQUENCE } from '../harness/zentiaSim.mjs';

export function registerTier1DashboardTests() {
  describe('Tier 1: Feature Area 3 - Personalized Dashboard & Continue Learning Mechanics', () => {

    it('DASH-T1-01: Profile metric calculations calculate all 4 key metric cards accurately', () => {
      // Completed: Lessons 0, 1, 2, 3, Quiz 101 (passed), Lesson 4 (6 total items out of 21)
      const completed = [0, 1, 2, 3, 101, 4];
      const quizScores = {
        101: { score: 5, total: 5, percentage: 100, passed: true },
      };

      const stats = ProgressCalculator.calculateStats(completed, quizScores);
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(6);
      expect(stats.unitsMastered).toBe(5); // Lessons 0, 1, 2, 3, 4
      expect(stats.assessmentsPassed).toBe(1);
      expect(stats.overallPercentage).toBe(29); // Math.round(6/21 * 100) = 29%
      expect(stats.avgScore).toBe(100);
    });

    it('DASH-T1-02: 5-Module Progress breakdown calculates module-by-module statuses correctly', () => {
      // Complete Module 1: Lessons 1, 2, 3 and Quiz 101
      // Start Module 2: Lesson 4
      const completed = [1, 2, 3, 101, 4];
      const quizScores = {
        101: { score: 4, total: 5, percentage: 80, passed: true },
      };

      const modules = ProgressCalculator.calculateModuleProgress(completed, quizScores);
      expect(modules.length).toBe(5);

      // Module 1 (Executive Communication Foundation)
      expect(modules[0].id).toBe(1);
      expect(modules[0].completedItems).toBe(4);
      expect(modules[0].totalItems).toBe(4);
      expect(modules[0].percentage).toBe(100);
      expect(modules[0].status).toBe('completed');
      expect(modules[0].isCompleted).toBe(true);

      // Module 2 (High-Stakes Negotiation & Persuasion)
      expect(modules[1].id).toBe(2);
      expect(modules[1].completedItems).toBe(1);
      expect(modules[1].totalItems).toBe(4);
      expect(modules[1].percentage).toBe(25);
      expect(modules[1].status).toBe('in_progress');
      expect(modules[1].isCompleted).toBe(false);

      // Module 3, 4, 5 (Not started)
      expect(modules[2].status).toBe('not_started');
      expect(modules[3].status).toBe('not_started');
      expect(modules[4].status).toBe('not_started');
    });

    it('DASH-T1-03: Continue Learning target for fresh user points to Lesson 0 (Orientation)', () => {
      const target = ProgressCalculator.getContinueLearningTarget([], 0);
      expect(target.targetLessonId).toBe(0);
      expect(target.isCompleted).toBe(false);
      expect(target.isProgramComplete).toBe(false);
    });

    it('DASH-T1-04: Continue Learning target resumes active uncompleted lesson if set', () => {
      // User has completed [0, 1], was last viewing Lesson 2
      const target = ProgressCalculator.getContinueLearningTarget([0, 1], 2);
      expect(target.targetLessonId).toBe(2);
      expect(target.isCompleted).toBe(false);
      expect(target.isProgramComplete).toBe(false);
    });

    it('DASH-T1-05: Continue Learning target advances to next uncompleted sequence item', () => {
      // User completed [0, 1, 2, 3] and was on Lesson 3 (which is now complete)
      const target = ProgressCalculator.getContinueLearningTarget([0, 1, 2, 3], 3);
      // Next in sequence is Quiz 101
      expect(target.targetLessonId).toBe(101);
      expect(target.isCompleted).toBe(false);
      expect(target.isProgramComplete).toBe(false);
    });

    it('DASH-T1-06: Continue Learning advances past passed quiz to next module', () => {
      // User completed [0, 1, 2, 3, 101]
      const target = ProgressCalculator.getContinueLearningTarget([0, 1, 2, 3, 101], 101);
      // Next in sequence is Module 2 Lesson 4
      expect(target.targetLessonId).toBe(4);
      expect(target.isCompleted).toBe(false);
      expect(target.isProgramComplete).toBe(false);
    });

    it('DASH-T1-07: Continue Learning target signals program complete when all 21 units are done', () => {
      const target = ProgressCalculator.getContinueLearningTarget([...CURRICULUM_SEQUENCE], 105);
      expect(target.isCompleted).toBe(true);
      expect(target.isProgramComplete).toBe(true);
    });

    it('DASH-T1-08: Zero-progress baseline state calculates 0% across all 4 cards and 5 modules', () => {
      const stats = ProgressCalculator.calculateStats([], {});
      expect(stats.totalUnits).toBe(21);
      expect(stats.completedCount).toBe(0);
      expect(stats.unitsMastered).toBe(0);
      expect(stats.assessmentsPassed).toBe(0);
      expect(stats.overallPercentage).toBe(0);
      expect(stats.avgScore).toBe(0);

      const modules = ProgressCalculator.calculateModuleProgress([], {});
      expect(modules.length).toBe(5);
      modules.forEach(mod => {
        expect(mod.status).toBe('not_started');
        expect(mod.percentage).toBe(0);
        expect(mod.completedItems).toBe(0);
        expect(mod.isCompleted).toBe(false);
      });
    });

    it('DASH-T1-09: Failed quiz (< 80%) is not counted in assessmentsPassed or completedUnits', () => {
      const completed = [1, 2, 3];
      const quizScores = {
        101: { score: 3, total: 5, percentage: 60, passed: false }, // 60% < 80%
      };

      const stats = ProgressCalculator.calculateStats(completed, quizScores);
      expect(stats.completedCount).toBe(3);
      expect(stats.unitsMastered).toBe(3);
      expect(stats.assessmentsPassed).toBe(0);
      expect(stats.avgScore).toBe(60);

      const modules = ProgressCalculator.calculateModuleProgress(completed, quizScores);
      expect(modules[0].status).toBe('in_progress');
      expect(modules[0].percentage).toBe(75); // 3 of 4 units
      expect(modules[0].isCompleted).toBe(false);
    });

    it('DASH-T1-10: Average assessment score correctly averages multiple quizzes with rounding', () => {
      const quizScores = {
        101: { score: 5, total: 5, percentage: 100, passed: true },
        102: { score: 4, total: 5, percentage: 80, passed: true },
        103: { score: 4, total: 5, percentage: 85, passed: true },
      };

      const stats = ProgressCalculator.calculateStats([0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103], quizScores);
      expect(stats.assessmentsPassed).toBe(3);
      expect(stats.avgScore).toBe(88); // Math.round((100 + 80 + 85) / 3) = 88%
    });

    it('DASH-T1-11: All 5 modules report 100% completion in fully graduated state', () => {
      const completed = [...CURRICULUM_SEQUENCE];
      const quizScores = {
        101: { score: 5, total: 5, percentage: 100, passed: true },
        102: { score: 5, total: 5, percentage: 100, passed: true },
        103: { score: 5, total: 5, percentage: 100, passed: true },
        104: { score: 5, total: 5, percentage: 100, passed: true },
        105: { score: 5, total: 5, percentage: 100, passed: true },
      };

      const stats = ProgressCalculator.calculateStats(completed, quizScores);
      expect(stats.completedCount).toBe(21);
      expect(stats.unitsMastered).toBe(16);
      expect(stats.assessmentsPassed).toBe(5);
      expect(stats.overallPercentage).toBe(100);
      expect(stats.avgScore).toBe(100);

      const modules = ProgressCalculator.calculateModuleProgress(completed, quizScores);
      expect(modules.length).toBe(5);
      modules.forEach(mod => {
        expect(mod.status).toBe('completed');
        expect(mod.percentage).toBe(100);
        expect(mod.isCompleted).toBe(true);
        expect(mod.completedItems).toBe(mod.totalItems);
      });
    });
  });
}
