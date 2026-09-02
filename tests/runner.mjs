// Zentia World Program - Master E2E Test Runner
// Aggregates and executes all Tiers 1-4 opaque-box test suites

import { runner } from './harness/testFramework.mjs';
import { registerTier1AuthTests } from './e2e/tier1_auth.test.mjs';
import { registerTier1ProgressTests } from './e2e/tier1_progress.test.mjs';
import { registerTier1DashboardTests } from './e2e/tier1_dashboard.test.mjs';
import { registerTier2BoundaryTests } from './e2e/tier2_boundary.test.mjs';
import { registerTier3CrossFeatureTests } from './e2e/tier3_cross_feature.test.mjs';
import { registerTier4RealWorldTests } from './e2e/tier4_real_world.test.mjs';
import { registerTier5AdversarialM2Tests } from './e2e/tier5_adversarial_m2.test.mjs';
import { registerTier5AdversarialM3Tests } from './e2e/tier5_adversarial_m3.test.mjs';

// Register all suites
registerTier1AuthTests();
registerTier1ProgressTests();
registerTier1DashboardTests();
registerTier2BoundaryTests();
registerTier3CrossFeatureTests();
registerTier4RealWorldTests();
registerTier5AdversarialM2Tests();
registerTier5AdversarialM3Tests();

// Execute runner
export async function runAllTests() {
  const summary = await runner.run();
  if (summary.failed > 0) {
    if (typeof process !== 'undefined' && process.exitCode !== undefined) {
      process.exitCode = 1;
    }
  }
  return summary;
}

// Auto-run if executed directly via Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  const isDirectRun = process.argv[1].endsWith('runner.mjs') || process.argv[1].endsWith('runner.js');
  if (isDirectRun) {
    runAllTests();
  }
}
