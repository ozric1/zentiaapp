// Adversarial Stress Harness & Empirical Verification Oracle for Milestone 2
// Tests: Progress tracking, atomic updates, corrupted JSON resilience, concurrent writes,
// 21-item sequence boundary conditions (0 to 105), quiz passing thresholds (80%).

import {
  ProgressCalculator,
  ProgressService,
  CURRICULUM_SEQUENCE,
  TOTAL_CURRICULUM_UNITS,
  MODULE_DEFINITIONS
} from '../../src/services/progressService.js';

import { MockFirestore } from '../../tests/harness/mockFirebase.mjs';
import { MockLocalStorage } from '../../tests/harness/mockLocalStorage.mjs';

class Assertions {
  static assert(condition, message) {
    if (!condition) {
      throw new Error(`[ASSERTION FAILED] ${message}`);
    }
  }

  static assertEquals(actual, expected, message = '') {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr !== expStr) {
      throw new Error(`[ASSERTION FAILED] ${message}\nExpected: ${expStr}\nActual:   ${actStr}`);
    }
  }

  static assertDeepEquals(actual, expected, message = '') {
    this.assertEquals(actual, expected, message);
  }
}

async function runAdversarialMilestone2Tests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      results.push({ name, status: 'PASSED' });
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      results.push({ name, status: 'FAILED', error: err.message });
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }

  console.log('--- STARTING ADVERSARIAL EMPIRICAL TESTS FOR MILESTONE 2 ---');

  // ==========================================
  // AREA 1: 21-ITEM SEQUENCE BOUNDARY CONDITIONS (0 to 105)
  // ==========================================
  await test('ADV-SEQ-01: Curriculum sequence exact length and order', () => {
    Assertions.assertEquals(CURRICULUM_SEQUENCE.length, 21, 'Sequence must have exactly 21 items');
    Assertions.assertEquals(TOTAL_CURRICULUM_UNITS, 21, 'TOTAL_CURRICULUM_UNITS must be 21');
    Assertions.assertEquals(
      [...CURRICULUM_SEQUENCE],
      [0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103, 9, 10, 11, 12, 104, 13, 14, 15, 105],
      'Curriculum sequence must match exact course specification'
    );
  });

  await test('ADV-SEQ-02: Continue Learning target resolution across every step of 21-item sequence', () => {
    const sequence = [0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103, 9, 10, 11, 12, 104, 13, 14, 15, 105];
    const completed = [];

    // Step 0: Nothing completed, lastLesson 0
    let target = ProgressCalculator.getContinueLearningTarget(completed, 0);
    Assertions.assertEquals(target.targetLessonId, 0);
    Assertions.assertEquals(target.isCompleted, false);
    Assertions.assertEquals(target.isProgramComplete, false);

    for (let i = 0; i < sequence.length; i++) {
      const currentUnit = sequence[i];
      completed.push(currentUnit);

      const nextExpected = i < sequence.length - 1 ? sequence[i + 1] : 105;
      const isFinished = i === sequence.length - 1;

      target = ProgressCalculator.getContinueLearningTarget(completed, currentUnit);
      Assertions.assertEquals(target.targetLessonId, nextExpected, `Step ${i} after completing ${currentUnit}`);
      Assertions.assertEquals(target.isCompleted, isFinished, `Step ${i} isCompleted`);
      Assertions.assertEquals(target.isProgramComplete, isFinished, `Step ${i} isProgramComplete`);
    }
  });

  await test('ADV-SEQ-03: Out-of-order completions correctly target first missing item in sequence', () => {
    // User skipped Module 1 and did Module 3 (7, 8, 103)
    const completed = [7, 8, 103];
    // If active on completed unit 8, should fallback to first missing (0)
    let target = ProgressCalculator.getContinueLearningTarget(completed, 8);
    Assertions.assertEquals(target.targetLessonId, 0);

    // If active on uncompleted unit 4, should stay on 4
    target = ProgressCalculator.getContinueLearningTarget(completed, 4);
    Assertions.assertEquals(target.targetLessonId, 4);
  });

  // ==========================================
  // AREA 2: QUIZ PASSING THRESHOLD MATRIX (80%)
  // ==========================================
  await test('ADV-QUIZ-01: Granular Quiz Passing Thresholds (0% to 100%)', async () => {
    const mockDb = new MockFirestore();
    const service = new ProgressService(mockDb);
    const uid = 'quiz_threshold_user';

    const testCases = [
      { score: 0, total: 5, expectedPct: 0, shouldPass: false },
      { score: 1, total: 5, expectedPct: 20, shouldPass: false },
      { score: 2, total: 5, expectedPct: 40, shouldPass: false },
      { score: 3, total: 5, expectedPct: 60, shouldPass: false },
      { score: 3, total: 4, expectedPct: 75, shouldPass: false },
      { score: 7, total: 10, expectedPct: 70, shouldPass: false },
      { score: 79, total: 100, expectedPct: 79, shouldPass: false },
      { score: 4, total: 5, expectedPct: 80, shouldPass: true },
      { score: 8, total: 10, expectedPct: 80, shouldPass: true },
      { score: 80, total: 100, expectedPct: 80, shouldPass: true },
      { score: 5, total: 6, expectedPct: 83, shouldPass: true },
      { score: 9, total: 10, expectedPct: 90, shouldPass: true },
      { score: 5, total: 5, expectedPct: 100, shouldPass: true },
    ];

    for (const tc of testCases) {
      const quizId = 101;
      const res = await service.saveQuizScore(uid, quizId, tc.score, tc.total);
      Assertions.assertEquals(res.percentage, tc.expectedPct, `Score ${tc.score}/${tc.total}`);
      Assertions.assertEquals(res.passed, tc.shouldPass, `Passing status for ${tc.expectedPct}%`);

      const doc = await service.fetchProgress(uid);
      const isRecordedInCompleted = doc.completedLessons.includes(quizId);
      Assertions.assertEquals(isRecordedInCompleted, tc.shouldPass, `Completed lessons inclusion for ${tc.expectedPct}%`);
    }
  });

  await test('ADV-QUIZ-02: Retake Quiz progression (Failing -> Passing and Passing -> Retaking)', async () => {
    const mockDb = new MockFirestore();
    const service = new ProgressService(mockDb);
    const uid = 'quiz_retake_user';

    // 1. Initial attempt fails (3/5 = 60%)
    let res = await service.saveQuizScore(uid, 102, 3, 5);
    Assertions.assertEquals(res.passed, false);
    let doc = await service.fetchProgress(uid);
    Assertions.assertEquals(doc.completedLessons.includes(102), false);
    Assertions.assertEquals(doc.stats.assessmentsPassed, 0);

    // 2. Retake passes (5/5 = 100%)
    res = await service.saveQuizScore(uid, 102, 5, 5);
    Assertions.assertEquals(res.passed, true);
    doc = await service.fetchProgress(uid);
    Assertions.assertEquals(doc.completedLessons.includes(102), true);
    Assertions.assertEquals(doc.stats.assessmentsPassed, 1);
    Assertions.assertEquals(doc.stats.avgScore, 100);
  });

  // ==========================================
  // AREA 3: LOCALSTORAGE CORRUPTED JSON & SANITIZATION
  // ==========================================
  await test('ADV-MIG-01: Corrupted JSON strings and non-array types in LocalStorage', async () => {
    const mockDb = new MockFirestore();
    const mockStorage = new MockLocalStorage();
    const service = new ProgressService(mockDb);
    const uid = 'corrupted_mig_user';

    const corruptedInputs = [
      '{ invalid json string ...',
      '<html><body>404 Not Found</body></html>',
      'undefined',
      'null',
      '{"unit1": true}',
      '123456',
      '"just a plain string"',
    ];

    for (const badData of corruptedInputs) {
      mockStorage.setItem('zentia_completed', badData);
      mockStorage.setItem('zentia_last_lesson', 'invalid_num');

      const res = await service.migrateLocalStorage(uid, mockStorage);
      Assertions.assertEquals(res.migrated, false, `Should safely handle bad data: ${badData}`);
      const doc = await service.fetchProgress(uid);
      Assertions.assertEquals(doc.completedLessons, []);
    }
  });

  await test('ADV-MIG-02: Dirty Array with non-integers, negative numbers, nulls, and strings', async () => {
    const mockDb = new MockFirestore();
    const mockStorage = new MockLocalStorage();
    const service = new ProgressService(mockDb);
    const uid = 'dirty_array_mig_user';

    // Array contains valid numbers (0, 1, 2) alongside invalid types (-5, 3.14, 'hello', null, undefined, [4])
    const dirtyArray = [0, -5, 1, 3.14, 'hello', null, undefined, 2, [4]];
    mockStorage.setItem('zentia_completed', JSON.stringify(dirtyArray));
    mockStorage.setItem('zentia_last_lesson', '2');

    const res = await service.migrateLocalStorage(uid, mockStorage);
    Assertions.assertEquals(res.migrated, true);
    Assertions.assertEquals(res.count, 3, 'Should filter strictly to valid positive integers [0, 1, 2]');

    const doc = await service.fetchProgress(uid);
    Assertions.assertEquals(doc.completedLessons.sort(), [0, 1, 2]);
    Assertions.assertEquals(doc.lastLessonId, 2);

    // Verify localStorage was purged
    Assertions.assertEquals(mockStorage.getItem('zentia_completed'), null);
    Assertions.assertEquals(mockStorage.getItem('zentia_last_lesson'), null);
  });

  await test('ADV-MIG-03: Set-Union Merge of Cloud + LocalStorage without duplicates', async () => {
    const mockDb = new MockFirestore();
    const mockStorage = new MockLocalStorage();
    const service = new ProgressService(mockDb);
    const uid = 'merge_mig_user';

    // Cloud has [0, 1, 2]
    await service.markLessonCompleted(uid, 0);
    await service.markLessonCompleted(uid, 1);
    await service.markLessonCompleted(uid, 2);

    // Guest has [2, 3, 4] (2 is overlap)
    mockStorage.setItem('zentia_completed', JSON.stringify([2, 3, 4]));
    mockStorage.setItem('zentia_last_lesson', '4');

    const res = await service.migrateLocalStorage(uid, mockStorage);
    Assertions.assertEquals(res.migrated, true);

    const doc = await service.fetchProgress(uid);
    Assertions.assertEquals(doc.completedLessons.sort(), [0, 1, 2, 3, 4]);
    Assertions.assertEquals(doc.completedLessons.length, 5);
    Assertions.assertEquals(doc.stats.unitsMastered, 5);
    Assertions.assertEquals(doc.lastLessonId, 4);
  });

  // ==========================================
  // AREA 4: HIGH-CONCURRENCY & ATOMIC MUTATIONS
  // ==========================================
  await test('ADV-CONCUR-01: Concurrent lesson completions from 10 simultaneous tabs', async () => {
    const mockDb = new MockFirestore();
    const service = new ProgressService(mockDb);
    const uid = 'concurrent_heavy_user';

    const lessonIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // Fire 10 concurrent requests
    await Promise.all(lessonIds.map(id => service.markLessonCompleted(uid, id)));

    const doc = await service.fetchProgress(uid);
    for (const id of lessonIds) {
      Assertions.assert(doc.completedLessons.includes(id), `Completed lessons must contain ${id}`);
    }
    Assertions.assertEquals(doc.completedLessons.length, 10);
  });

  await test('ADV-CONCUR-02: Idempotent completions under duplicate rapid fire', async () => {
    const mockDb = new MockFirestore();
    const service = new ProgressService(mockDb);
    const uid = 'idempotent_heavy_user';

    // Fire 5 duplicate calls for lesson 12
    await Promise.all([
      service.markLessonCompleted(uid, 12),
      service.markLessonCompleted(uid, 12),
      service.markLessonCompleted(uid, 12),
      service.markLessonCompleted(uid, 12),
      service.markLessonCompleted(uid, 12),
    ]);

    const doc = await service.fetchProgress(uid);
    Assertions.assertEquals(doc.completedLessons, [12]);
    Assertions.assertEquals(doc.stats.unitsMastered, 1);
  });

  // ==========================================
  // AREA 5: ALL 5 MODULES BREAKDOWN ACCURACY
  // ==========================================
  await test('ADV-MOD-01: Module breakdown for all states (not_started, in_progress, completed)', () => {
    // Module 1: Complete (1, 2, 3, 101 passed)
    // Module 2: In Progress (4, 5 done, 6 not done, 102 not passed)
    // Module 3: Not Started (7, 8, 103 not done)
    // Module 4: In Progress (9 done)
    // Module 5: Not Started
    const completed = [1, 2, 3, 101, 4, 5, 9];
    const quizScores = {
      101: { score: 5, total: 5, percentage: 100, passed: true },
      102: { score: 2, total: 5, percentage: 40, passed: false },
    };

    const modules = ProgressCalculator.calculateModuleProgress(completed, quizScores);
    Assertions.assertEquals(modules.length, 5);

    // Module 1
    Assertions.assertEquals(modules[0].id, 1);
    Assertions.assertEquals(modules[0].status, 'completed');
    Assertions.assertEquals(modules[0].isCompleted, true);
    Assertions.assertEquals(modules[0].percentage, 100);

    // Module 2
    Assertions.assertEquals(modules[1].id, 2);
    Assertions.assertEquals(modules[1].status, 'in_progress');
    Assertions.assertEquals(modules[1].isCompleted, false);
    Assertions.assertEquals(modules[1].percentage, 50); // 2 of 4

    // Module 3
    Assertions.assertEquals(modules[2].id, 3);
    Assertions.assertEquals(modules[2].status, 'not_started');
    Assertions.assertEquals(modules[2].isCompleted, false);
    Assertions.assertEquals(modules[2].percentage, 0);

    // Module 4
    Assertions.assertEquals(modules[3].id, 4);
    Assertions.assertEquals(modules[3].status, 'in_progress');
    Assertions.assertEquals(modules[3].isCompleted, false);
    Assertions.assertEquals(modules[3].percentage, 20); // 1 of 5

    // Module 5
    Assertions.assertEquals(modules[4].id, 5);
    Assertions.assertEquals(modules[4].status, 'not_started');
    Assertions.assertEquals(modules[4].isCompleted, false);
    Assertions.assertEquals(modules[4].percentage, 0);
  });

  console.log('\n--- ADVERSARIAL TEST SUMMARY ---');
  console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
  return { total: passed + failed, passed, failed, results };
}

export { runAdversarialMilestone2Tests };
