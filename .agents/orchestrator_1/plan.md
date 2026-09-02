# Orchestration Plan: Zentia World Program Enhancements

## Phase 0: Survey & Scope Mapping
1. Spawn 3 survey subagents in parallel:
   - Explorer 1: Codebase structure, existing tech stack (React/Vite/Next, Firebase config, UI components, state management).
   - Explorer 2: Authentication & Route Protection landscape (current auth state, providers, route guards, session handling).
   - Spec Miner / Explorer 3: Requirements analysis from ORIGINAL_REQUEST.md + Progress Tracking & Dashboard specs (Firestore schemas, localStorage migration, resume learning logic).
2. Synthesize survey reports into `PROJECT.md` with full Feature Inventory, Architecture, Interface Contracts, and Milestones.

## Phase 1: Dual Track Launch
- **Track 1: E2E Testing Track**:
  - Test harness, runner, Tier 1-4 tests covering all inventoried features.
  - Generates `TEST_INFRA.md` and signals `TEST_READY.md`.
- **Track 2: Implementation Track**:
  - Milestone 1: Authentication System (Email/Password & Google Sign-In, Route Protection)
  - Milestone 2: Robust Firestore Progress Tracking (Migration from localStorage, multi-user concurrency, offline/error handling)
  - Milestone 3: Personalized Dashboard & Resume Learning ("Continue Learning" mechanism, real-time metrics)

## Phase 2: Final Verification & Hardening
- Pass 100% of E2E tests across Tiers 1-4.
- Tier 5: White-box adversarial testing & coverage hardening with Challenger.
- Forensic Auditor integrity review.
- Final user report and completion summary.
