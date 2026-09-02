// In-Memory LocalStorage Simulator for Zentia E2E Testing

export class MockLocalStorage {
  constructor() {
    this._store = new Map();
  }

  getItem(key) {
    const val = this._store.get(String(key));
    return val !== undefined ? val : null;
  }

  setItem(key, value) {
    this._store.set(String(key), String(value));
  }

  removeItem(key) {
    this._store.delete(String(key));
  }

  clear() {
    this._store.clear();
  }

  key(index) {
    const keys = Array.from(this._store.keys());
    return keys[index] || null;
  }

  get length() {
    return this._store.size;
  }

  // Diagnostic helper
  dump() {
    return Object.fromEntries(this._store.entries());
  }
}

export const mockLocalStorage = new MockLocalStorage();
