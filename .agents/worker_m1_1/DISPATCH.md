## 2026-09-02T19:28:02Z
You are the Implementation Worker for Milestone 1 (Authentication System).
Your working directory is: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\worker_m1_1
The workspace root is: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program
The authoritative user request is in: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\ORIGINAL_REQUEST.md
The project master plan is in: c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\PROJECT.md

Read the explorer handoff blueprints before implementing:
- c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m1_1\handoff.md
- c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m1_2\handoff.md
- c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\explorer_m1_3\handoff.md

Scope & Assigned Files:
- Add firebase: ^11.4.0 to package.json.
- Implement src/firebase.ts: Firebase client initialization for project zentia-573f8, Auth, GoogleAuthProvider, Firestore exports, and resilient fallback.
- Implement src/context/AuthContext.tsx: AuthProvider, useAuth(), state (currentUser, loading, error), methods (login, signup, loginWithGoogle, logout, clearError), onAuthStateChanged persistence listener.
- Implement src/components/ProtectedRoute.tsx: Route guard checking auth state, showing elegant loading spinner while resolving, redirecting unauthenticated users to /login with state: { from: location }.
- Implement src/pages/LoginPage.tsx: Zentia executive dark-slate luxury design (#0f172a, Playfair typography, blue accents), tab switcher (Sign In vs Create Account), email/password fields, Google button, form validation, error message banners, loading spinners, and return-to-prior-route redirect.
- Update src/App.tsx: Wrap routing tree in <AuthProvider>, add /login route, wrap /dashboard and /programs/business-english in <ProtectedRoute>.
- Update src/pages/LandingPage.tsx: Dynamic auth navigation buttons (Sign In -> /login or Go to Dashboard -> /dashboard based on useAuth(), hero CTA linking to /login or /programs/business-english).

Verification:
- Run npm run build and npm test to verify everything builds and passes cleanly.
- Write your complete handoff report to c:\Users\USER\OneDrive\Desktop\Projects\zentia-world-program\.agents\worker_m1_1\handoff.md.
- Notify parent with send_message when complete.
