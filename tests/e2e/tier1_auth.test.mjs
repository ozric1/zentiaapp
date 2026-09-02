// Tier 1: Feature Area 1 - Authentication & Route Protection Test Suite
import { describe, it, beforeEach, expect } from '../harness/testFramework.mjs';
import { MockAuth } from '../harness/mockFirebase.mjs';
import { AuthService, RouteGuardSimulator } from '../harness/zentiaSim.mjs';

export function registerTier1AuthTests() {
  describe('Tier 1: Feature Area 1 - Authentication & Route Protection', () => {
    let mockAuth;
    let authService;

    beforeEach(() => {
      mockAuth = new MockAuth();
      authService = new AuthService(mockAuth);
      authService.init();
    });

    it('AUTH-T1-01: Sign Up creates a new user account with UID, email, and display name', async () => {
      const user = await authService.signup('executive@zentia-program.com', 'SecurePass123!', 'John Executive');
      
      expect(user).toBeDefined();
      expect(user.uid).toBeTruthy();
      expect(user.uid.startsWith('uid_')).toBeTruthy();
      expect(user.email).toBe('executive@zentia-program.com');
      expect(user.displayName).toBe('John Executive');
      expect(authService.currentUser).toEqual(user);
      expect(authService.error).toBeNull();
    });

    it('AUTH-T1-02: Sign In authenticates existing credentials and updates session state', async () => {
      await mockAuth.createUserWithEmailAndPassword('director@zentia-program.com', 'Boardroom2026', 'Sarah Director');
      
      const loggedIn = await authService.login('director@zentia-program.com', 'Boardroom2026');
      expect(loggedIn).toBeDefined();
      expect(loggedIn.email).toBe('director@zentia-program.com');
      expect(loggedIn.displayName).toBe('Sarah Director');
      expect(authService.currentUser).toEqual(loggedIn);
    });

    it('AUTH-T1-03: Google Sign-In authenticates through popup provider and sets executive profile', async () => {
      const googleUser = await authService.loginWithGoogle();
      
      expect(googleUser).toBeDefined();
      expect(googleUser.email).toBe('executive.learner@zentia-global.com');
      expect(googleUser.displayName).toBe('Executive Global Learner');
      expect(googleUser.photoURL).toContain('googleusercontent.com');
      expect(authService.currentUser).toEqual(googleUser);
    });

    it('AUTH-T1-04: Route Guard blocks unauthenticated access to /dashboard and redirects to login', () => {
      const access = RouteGuardSimulator.evaluateRouteAccess('/dashboard', null);
      expect(access.canAccess).toBeFalsy();
      expect(access.redirect).toBe('/login?redirect=%2Fdashboard');
    });

    it('AUTH-T1-05: Route Guard blocks unauthenticated access to /programs/business-english', () => {
      const access = RouteGuardSimulator.evaluateRouteAccess('/programs/business-english', null);
      expect(access.canAccess).toBeFalsy();
      expect(access.redirect).toBe('/login?redirect=%2Fprograms%2Fbusiness-english');
    });

    it('AUTH-T1-06: Route Guard allows authenticated users to access protected routes', () => {
      const dummyUser = { uid: 'uid_test', email: 'test@zentia.com' };
      const dashboardAccess = RouteGuardSimulator.evaluateRouteAccess('/dashboard', dummyUser);
      expect(dashboardAccess.canAccess).toBeTruthy();
      expect(dashboardAccess.redirect).toBeNull();

      const courseAccess = RouteGuardSimulator.evaluateRouteAccess('/programs/business-english', dummyUser);
      expect(courseAccess.canAccess).toBeTruthy();
      expect(courseAccess.redirect).toBeNull();
    });

    it('AUTH-T1-07: Route Guard redirects authenticated users trying to access /login to /dashboard', () => {
      const dummyUser = { uid: 'uid_test', email: 'test@zentia.com' };
      const loginAccess = RouteGuardSimulator.evaluateRouteAccess('/login', dummyUser);
      expect(loginAccess.canAccess).toBeFalsy();
      expect(loginAccess.redirect).toBe('/dashboard');
    });

    it('AUTH-T1-08: Logout clears currentUser and invalidates route access', async () => {
      await authService.signup('officer@zentia.com', 'Pass12345!', 'Chief Officer');
      expect(authService.currentUser).toBeDefined();

      await authService.logout();
      expect(authService.currentUser).toBeNull();

      const afterLogoutAccess = RouteGuardSimulator.evaluateRouteAccess('/dashboard', authService.currentUser);
      expect(afterLogoutAccess.canAccess).toBeFalsy();
      expect(afterLogoutAccess.redirect).toBe('/login?redirect=%2Fdashboard');
    });

    it('AUTH-T1-09: Error state capture and clearError method reset', async () => {
      let threw = false;
      try {
        await authService.login('nonexistent@zentia.com', 'Password123!');
      } catch {
        threw = true;
      }

      expect(threw).toBeTruthy();
      expect(authService.error).toBeTruthy();
      expect(authService.error).toContain('no user record');

      authService.clearError();
      expect(authService.error).toBeNull();
    });
  });
}
