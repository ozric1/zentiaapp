// Zentia World Program - E2E Testing Framework
// Lightweight, zero-dependency, high-fidelity test runner with rich assertions and ANSI reporting

export class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _evaluate(condition, message) {
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      throw new Error(message);
    }
  }

  toBe(expected) {
    const condition = Object.is(this.actual, expected);
    this._evaluate(
      condition,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`
    );
  }

  toEqual(expected) {
    const isDeepEqual = (a, b) => {
      if (Object.is(a, b)) return true;
      if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key) || !isDeepEqual(a[key], b[key])) return false;
      }
      return true;
    };

    const condition = isDeepEqual(this.actual, expected);
    this._evaluate(
      condition,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to deeply equal' : 'to deeply equal'} ${JSON.stringify(expected)}`
    );
  }

  toBeTruthy() {
    this._evaluate(
      Boolean(this.actual),
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'to be falsy' : 'to be truthy'}`
    );
  }

  toBeFalsy() {
    this._evaluate(
      !Boolean(this.actual),
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'to be truthy' : 'to be falsy'}`
    );
  }

  toBeNull() {
    this.toBe(null);
  }

  toBeDefined() {
    this._evaluate(
      this.actual !== undefined,
      `Expected value ${this.isNot ? 'to be undefined' : 'to be defined'}`
    );
  }

  toBeUndefined() {
    this._evaluate(
      this.actual === undefined,
      `Expected value ${this.isNot ? 'not to be undefined' : 'to be undefined'}`
    );
  }

  toContain(item) {
    let condition = false;
    if (typeof this.actual === 'string' || Array.isArray(this.actual)) {
      condition = this.actual.includes(item);
    } else if (this.actual instanceof Set || this.actual instanceof Map) {
      condition = this.actual.has(item);
    }
    this._evaluate(
      condition,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(item)}`
    );
  }

  toBeGreaterThan(val) {
    this._evaluate(
      this.actual > val,
      `Expected ${this.actual} ${this.isNot ? 'not to be greater than' : 'to be greater than'} ${val}`
    );
  }

  toBeGreaterThanOrEqual(val) {
    this._evaluate(
      this.actual >= val,
      `Expected ${this.actual} ${this.isNot ? 'not to be greater than or equal to' : 'to be greater than or equal to'} ${val}`
    );
  }

  toBeLessThan(val) {
    this._evaluate(
      this.actual < val,
      `Expected ${this.actual} ${this.isNot ? 'not to be less than' : 'to be less than'} ${val}`
    );
  }

  toBeLessThanOrEqual(val) {
    this._evaluate(
      this.actual <= val,
      `Expected ${this.actual} ${this.isNot ? 'not to be less than or equal to' : 'to be less than or equal to'} ${val}`
    );
  }

  toBeCloseTo(expected, delta = 0.001) {
    const diff = Math.abs(this.actual - expected);
    this._evaluate(
      diff <= delta,
      `Expected ${this.actual} ${this.isNot ? 'not to be close to' : 'to be close to'} ${expected} (within +/-${delta})`
    );
  }

  toThrow(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new Error(`toThrow expectation requires a function, received ${typeof this.actual}`);
    }
    let threw = false;
    let thrownError = null;
    try {
      this.actual();
    } catch (err) {
      threw = true;
      thrownError = err;
    }

    let match = true;
    if (threw && expectedError) {
      if (typeof expectedError === 'string') {
        match = (thrownError?.message || '').includes(expectedError) || (thrownError?.code || '').includes(expectedError);
      } else if (expectedError instanceof RegExp) {
        match = expectedError.test(thrownError?.message || '') || expectedError.test(thrownError?.code || '');
      }
    }

    this._evaluate(
      threw && match,
      `Expected function ${this.isNot ? 'not to throw' : 'to throw'} error matching ${expectedError}, but it ${threw ? `threw: "${thrownError?.message || thrownError}"` : 'did not throw'}`
    );
  }

  async toThrowAsync(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new Error(`toThrowAsync expectation requires a function, received ${typeof this.actual}`);
    }
    let threw = false;
    let thrownError = null;
    try {
      await this.actual();
    } catch (err) {
      threw = true;
      thrownError = err;
    }

    let match = true;
    if (threw && expectedError) {
      if (typeof expectedError === 'string') {
        match = (thrownError?.message || '').includes(expectedError) || (thrownError?.code || '').includes(expectedError);
      } else if (expectedError instanceof RegExp) {
        match = expectedError.test(thrownError?.message || '') || expectedError.test(thrownError?.code || '');
      }
    }

    this._evaluate(
      threw && match,
      `Expected async function ${this.isNot ? 'not to throw' : 'to throw'} error matching ${expectedError}, but it ${threw ? `threw: "${thrownError?.message || thrownError}"` : 'did not throw'}`
    );
  }
}

export function expect(actual) {
  return new Expectation(actual);
}

class TestSuite {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.tests = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.suites = [];
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }

  addBeforeEach(fn) {
    this.beforeEachHooks.push(fn);
  }

  addAfterEach(fn) {
    this.afterEachHooks.push(fn);
  }

  addBeforeAll(fn) {
    this.beforeAllHooks.push(fn);
  }

  addAfterAll(fn) {
    this.afterAllHooks.push(fn);
  }

  getAllBeforeEachHooks() {
    const hooks = this.parent ? this.parent.getAllBeforeEachHooks() : [];
    return [...hooks, ...this.beforeEachHooks];
  }

  getAllAfterEachHooks() {
    const hooks = this.parent ? this.parent.getAllAfterEachHooks() : [];
    return [...this.afterEachHooks, ...hooks];
  }
}

class TestRunner {
  constructor() {
    this.rootSuite = new TestSuite('Root');
    this.currentSuite = this.rootSuite;
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.startTime = 0;
    this.endTime = 0;
  }

  describe(name, fn) {
    const suite = new TestSuite(name, this.currentSuite);
    this.currentSuite.suites.push(suite);
    const previous = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = previous;
  }

  it(name, fn) {
    this.currentSuite.addTest(name, fn);
  }

  beforeEach(fn) {
    this.currentSuite.addBeforeEach(fn);
  }

  afterEach(fn) {
    this.currentSuite.addAfterEach(fn);
  }

  beforeAll(fn) {
    this.currentSuite.addBeforeAll(fn);
  }

  afterAll(fn) {
    this.afterAllHooks.addAfterAll ? this.currentSuite.addAfterAll(fn) : this.currentSuite.addAfterAll(fn);
  }

  async runSuite(suite, suitePath = []) {
    const currentPath = suite.name === 'Root' ? [] : [...suitePath, suite.name];
    const headerPrefix = '  '.repeat(currentPath.length > 0 ? currentPath.length - 1 : 0);

    if (currentPath.length > 0) {
      console.log(`\n${headerPrefix}\x1b[1m\x1b[36m${suite.name}\x1b[0m`);
    }

    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    for (const test of suite.tests) {
      this.totalTests++;
      const testStart = performance.now();
      const testFullName = [...currentPath, test.name].join(' > ');
      const testIndent = '  '.repeat(currentPath.length);

      const beforeHooks = suite.getAllBeforeEachHooks();
      const afterHooks = suite.getAllAfterEachHooks();

      let passed = false;
      let error = null;

      try {
        for (const hook of beforeHooks) {
          await hook();
        }
        await test.fn();
        passed = true;
      } catch (err) {
        passed = false;
        error = err;
      } finally {
        for (const hook of afterHooks) {
          try {
            await hook();
          } catch (afterErr) {
            if (passed) {
              passed = false;
              error = afterErr;
            }
          }
        }
      }

      const durationMs = (performance.now() - testStart).toFixed(1);

      if (passed) {
        this.passedTests++;
        console.log(`${testIndent}\x1b[32m  ✓\x1b[0m \x1b[90m${test.name}\x1b[0m \x1b[90m(${durationMs}ms)\x1b[0m`);
        this.results.push({ name: testFullName, passed: true, durationMs });
      } else {
        this.failedTests++;
        console.log(`${testIndent}\x1b[31m  ✗\x1b[0m \x1b[1m\x1b[31m${test.name}\x1b[0m \x1b[90m(${durationMs}ms)\x1b[0m`);
        console.log(`${testIndent}    \x1b[31mError: ${error?.message || error}\x1b[0m`);
        if (error?.stack) {
          const lines = error.stack.split('\n').slice(1, 4).join(`\n${testIndent}      `);
          console.log(`${testIndent}      \x1b[90m${lines}\x1b[0m`);
        }
        this.results.push({ name: testFullName, passed: false, error: error?.message || String(error), durationMs });
      }
    }

    for (const childSuite of suite.suites) {
      await this.runSuite(childSuite, currentPath);
    }

    for (const hook of suite.afterAllHooks) {
      await hook();
    }
  }

  async run() {
    this.startTime = performance.now();
    console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');
    console.log('\x1b[1m\x1b[35m         ZENTIA WORLD PROGRAM - 4-TIER E2E TEST RUNNER           \x1b[0m');
    console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');

    await this.runSuite(this.rootSuite);

    this.endTime = performance.now();
    const totalDuration = ((this.endTime - this.startTime) / 1000).toFixed(2);

    console.log('\n\x1b[1m\x1b[35m-----------------------------------------------------------------\x1b[0m');
    console.log('\x1b[1mTEST EXECUTION SUMMARY:\x1b[0m');
    console.log(`  Total Suites & Tiers Run : \x1b[1m${this.rootSuite.suites.length}\x1b[0m`);
    console.log(`  Total Test Cases         : \x1b[1m${this.totalTests}\x1b[0m`);
    console.log(`  Passed                   : \x1b[1m\x1b[32m${this.passedTests}\x1b[0m`);
    console.log(`  Failed                   : \x1b[1m${this.failedTests > 0 ? `\x1b[31m${this.failedTests}` : '\x1b[32m0'}\x1b[0m`);
    console.log(`  Duration                 : \x1b[90m${totalDuration}s\x1b[0m`);
    console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');

    if (this.failedTests === 0) {
      console.log('\x1b[1m\x1b[32m✓ 100% E2E TEST SUITES PASSED CLEANLY WITH ZERO DEFECTS\x1b[0m\n');
    } else {
      console.log(`\x1b[1m\x1b[31m✗ ${this.failedTests} TEST(S) FAILED. INVESTIGATE LOGS ABOVE.\x1b[0m\n`);
    }

    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      duration: totalDuration,
      results: this.results,
    };
  }
}

export const runner = new TestRunner();
export const describe = (name, fn) => runner.describe(name, fn);
export const it = (name, fn) => runner.it(name, fn);
export const beforeEach = (fn) => runner.beforeEach(fn);
export const afterEach = (fn) => runner.afterEach(fn);
export const beforeAll = (fn) => runner.beforeAll(fn);
export const afterAll = (fn) => runner.afterAll(fn);
