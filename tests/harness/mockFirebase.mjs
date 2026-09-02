// In-Memory Firebase Auth & Firestore Simulator for Zentia E2E Tests
// Emulates Firebase SDK 11 Auth & Firestore behaviors, contracts, and error codes

export class FirebaseError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FirebaseError';
    this.code = code;
  }
}

export class MockFieldValue {
  constructor(type, elements) {
    this.type = type;
    this.elements = elements;
  }
}

export function arrayUnion(...elements) {
  return new MockFieldValue('arrayUnion', elements);
}

export function serverTimestamp() {
  return new MockFieldValue('serverTimestamp', new Date().toISOString());
}

export class MockDocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path.replace(/^\/+|\/+$/g, '');
    const segments = this.path.split('/');
    this.id = segments[segments.length - 1];
  }
}

export function doc(db, ...pathSegments) {
  let fullPath = '';
  if (pathSegments.length === 1) {
    fullPath = pathSegments[0];
  } else {
    fullPath = pathSegments.join('/');
  }
  return new MockDocRef(db, fullPath);
}

export class MockDocumentSnapshot {
  constructor(ref, data) {
    this._ref = ref;
    this._data = data ? JSON.parse(JSON.stringify(data)) : null;
    this.id = ref.id;
  }

  exists() {
    return this._data !== null && this._data !== undefined;
  }

  data() {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
  }

  get ref() {
    return this._ref;
  }
}

export class MockFirestore {
  constructor() {
    this._docs = new Map(); // path -> object
    this.networkEnabled = true;
    this.latencyMs = 0;
  }

  _deepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      if (srcVal instanceof MockFieldValue) {
        if (srcVal.type === 'arrayUnion') {
          const currentArr = Array.isArray(output[key]) ? [...output[key]] : [];
          for (const el of srcVal.elements) {
            if (!currentArr.some(item => JSON.stringify(item) === JSON.stringify(el))) {
              currentArr.push(el);
            }
          }
          output[key] = currentArr;
        } else if (srcVal.type === 'serverTimestamp') {
          output[key] = new Date().toISOString();
        }
      } else if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
        output[key] = this._deepMerge(output[key] || {}, srcVal);
      } else {
        output[key] = srcVal;
      }
    }
    return output;
  }

  async getDoc(docRef) {
    if (!this.networkEnabled) {
      throw new FirebaseError('unavailable', 'The Firestore service is currently unavailable.');
    }
    if (this.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.latencyMs));
    }
    const data = this._docs.get(docRef.path);
    return new MockDocumentSnapshot(docRef, data);
  }

  async setDoc(docRef, data, options = {}) {
    if (!this.networkEnabled) {
      throw new FirebaseError('unavailable', 'The Firestore service is currently unavailable.');
    }
    if (this.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.latencyMs));
    }

    const existing = this._docs.get(docRef.path) || {};
    if (options.merge) {
      const merged = this._deepMerge(existing, data);
      this._docs.set(docRef.path, merged);
    } else {
      const evaluated = {};
      for (const [k, v] of Object.entries(data)) {
        if (v instanceof MockFieldValue) {
          if (v.type === 'arrayUnion') {
            evaluated[k] = [...v.elements];
          } else if (v.type === 'serverTimestamp') {
            evaluated[k] = new Date().toISOString();
          }
        } else {
          evaluated[k] = v;
        }
      }
      this._docs.set(docRef.path, evaluated);
    }
  }

  async updateDoc(docRef, data) {
    if (!this.networkEnabled) {
      throw new FirebaseError('unavailable', 'The Firestore service is currently unavailable.');
    }
    const existing = this._docs.get(docRef.path);
    if (!existing) {
      throw new FirebaseError('not-found', `No document to update: ${docRef.path}`);
    }
    const merged = this._deepMerge(existing, data);
    this._docs.set(docRef.path, merged);
  }

  clear() {
    this._docs.clear();
  }

  // Diagnostic helper
  dump() {
    return Object.fromEntries(this._docs.entries());
  }
}

export class GoogleAuthProvider {
  constructor() {
    this.providerId = 'google.com';
  }
}

export class MockAuth {
  constructor() {
    this.currentUser = null;
    this.users = new Map(); // email -> { uid, email, password, displayName, photoURL }
    this.listeners = new Set();
    this.networkEnabled = true;
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser ? { ...this.currentUser } : null);
      } catch (err) {
        console.error('Error in onAuthStateChanged listener:', err);
      }
    }
  }

  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    // Trigger immediately with current state
    setTimeout(() => callback(this.currentUser ? { ...this.currentUser } : null), 0);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async createUserWithEmailAndPassword(email, password, displayName = '') {
    if (!this.networkEnabled) {
      throw new FirebaseError('auth/network-request-failed', 'Network request failed.');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new FirebaseError('auth/invalid-email', 'The email address is badly formatted.');
    }

    if (!password || password.length < 6) {
      throw new FirebaseError('auth/weak-password', 'Password should be at least 6 characters.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (this.users.has(normalizedEmail)) {
      throw new FirebaseError('auth/email-already-in-use', 'The email address is already in use by another account.');
    }

    const uid = 'uid_' + Math.random().toString(36).substring(2, 10);
    const userRecord = {
      uid,
      email: normalizedEmail,
      password,
      displayName: displayName || normalizedEmail.split('@')[0],
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || normalizedEmail)}&background=0D8ABC&color=fff`,
      emailVerified: false,
    };

    this.users.set(normalizedEmail, userRecord);
    this.currentUser = { ...userRecord };
    delete this.currentUser.password;
    this._notify();
    return { user: { ...this.currentUser } };
  }

  async signInWithEmailAndPassword(email, password) {
    if (!this.networkEnabled) {
      throw new FirebaseError('auth/network-request-failed', 'Network request failed.');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new FirebaseError('auth/invalid-email', 'The email address is badly formatted.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userRecord = this.users.get(normalizedEmail);
    if (!userRecord) {
      throw new FirebaseError('auth/user-not-found', 'There is no user record corresponding to this identifier.');
    }

    if (userRecord.password !== password) {
      throw new FirebaseError('auth/wrong-password', 'The password is invalid for the given email.');
    }

    this.currentUser = { ...userRecord };
    delete this.currentUser.password;
    this._notify();
    return { user: { ...this.currentUser } };
  }

  async signInWithPopup(provider) {
    if (!this.networkEnabled) {
      throw new FirebaseError('auth/network-request-failed', 'Network request failed.');
    }

    // Emulate Google Sign In
    const googleEmail = 'executive.learner@zentia-global.com';
    let userRecord = this.users.get(googleEmail);
    if (!userRecord) {
      userRecord = {
        uid: 'uid_google_' + Math.random().toString(36).substring(2, 10),
        email: googleEmail,
        password: '',
        displayName: 'Executive Global Learner',
        photoURL: 'https://lh3.googleusercontent.com/a/mock-avatar-zentia',
        emailVerified: true,
      };
      this.users.set(googleEmail, userRecord);
    }

    this.currentUser = { ...userRecord };
    delete this.currentUser.password;
    this._notify();
    return { user: { ...this.currentUser }, providerId: provider.providerId };
  }

  async signOut() {
    this.currentUser = null;
    this._notify();
  }

  clear() {
    this.currentUser = null;
    this.users.clear();
    this.listeners.clear();
  }
}

// Module-level exported instances and standalone methods matching Firebase v11 modular SDK
export const mockDb = new MockFirestore();
export const mockAuth = new MockAuth();

export const getDoc = (ref) => mockDb.getDoc(ref);
export const setDoc = (ref, data, opts) => mockDb.setDoc(ref, data, opts);
export const updateDoc = (ref, data) => mockDb.updateDoc(ref, data);
export const createUserWithEmailAndPassword = (auth, email, pass, name) => auth.createUserWithEmailAndPassword(email, pass, name);
export const signInWithEmailAndPassword = (auth, email, pass) => auth.signInWithEmailAndPassword(email, pass);
export const signInWithPopup = (auth, prov) => auth.signInWithPopup(prov);
export const signOut = (auth) => auth.signOut();
export const onAuthStateChanged = (auth, cb) => auth.onAuthStateChanged(cb);
