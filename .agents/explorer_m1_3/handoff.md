# Milestone 1: Route Protection & Application Shell Architecture — Investigation & Implementation Blueprint

## 1. Observation

### Codebase & Routing Audit
1. **`src/App.tsx` (lines 1–18)**:
   ```tsx
   import React from 'react';
   import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
   import LandingPage from './pages/LandingPage';
   import CourseViewer from './pages/CourseViewer';
   import Dashboard from './pages/Dashboard';

   const App: React.FC = () => {
       return (
           <Router>
               <Routes>
                   <Route path="/" element={<LandingPage />} />
                   <Route path="/programs/business-english" element={<CourseViewer />} />
                   <Route path="/dashboard" element={<Dashboard />} />
               </Routes>
           </Router>
       );
   };

   export default App;
   ```
   - **Observation 1.1**: Routes `/dashboard` and `/programs/business-english` are rendered without any authentication checks or route guards. Any unauthenticated visitor directly accessing `http://localhost:5173/dashboard` or `http://localhost:5173/programs/business-english` immediately sees the full internal application views.
   - **Observation 1.2**: No `/login` route is registered in the router.
   - **Observation 1.3**: No `<AuthProvider>` is wrapped around the routing tree.
   - **Observation 1.4**: No fallback catch-all route (`path="*"`) exists to gracefully handle undefined URL paths.

2. **`index.tsx` & Application Entry (lines 1–15)**:
   ```tsx
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './src/App';

   const rootElement = document.getElementById('root');
   if (!rootElement) {
     throw new Error("Could not find root element to mount to");
   }

   const root = ReactDOM.createRoot(rootElement);
   root.render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   );
   ```
   - **Observation 2.1**: `index.tsx` mounts `./src/App`. Any routing or provider modifications must be located in `src/App.tsx` (the root `App.tsx` is an older legacy single-component course viewer).

3. **`package.json` Dependencies (lines 11–16)**:
   ```json
   "dependencies": {
     "@google/genai": "^1.30.0",
     "lucide-react": "^1.11.0",
     "react": "^19.2.0",
     "react-dom": "^19.2.0",
     "react-router-dom": "^7.14.2"
   }
   ```
   - **Observation 3.1**: `react-router-dom` is version `^7.14.2` (React Router 7) running in a React 19 environment.
   - **Observation 3.2**: `lucide-react` is version `^1.11.0`, offering executive icons (`Loader2`, `Shield`, `Lock`, `Sparkles`, `ArrowRight`).

4. **Authoritative Requirements (`ORIGINAL_REQUEST.md` lines 13–15, 23–24)**:
   - **Requirement R1**: "Implement a login page supporting Email/Password and Google Sign-In. Protect the app's core routes (`/dashboard`, `/programs/business-english`) so that unauthenticated users are redirected to the login page."
   - **Acceptance Criterion**: "Navigating to `/dashboard` while logged out redirects the user to the login page."

5. **Interface Contracts (`PROJECT.md` lines 44–55)**:
   - `useAuth()` hook provides:
     - `currentUser: User | null`
     - `loading: boolean`
     - `error: string | null`
     - `login: (email, password) => Promise<void>`
     - `signup: (email, password, displayName?) => Promise<void>`
     - `loginWithGoogle: () => Promise<void>`
     - `logout: () => Promise<void>`
     - `clearError: () => void`

---

## 2. Logic Chain

1. **Global Auth Context Injection (`src/App.tsx`)**:
   - *Observation*: All pages, route guards, and navigation headers require access to authentication state (`currentUser`, `loading`, `logout`).
   - *Logic*: Placing `<AuthProvider>` inside `<Router>` in `src/App.tsx` guarantees that both the router tree and all child pages have direct, unified access to `useAuth()` without prop drilling.

2. **Route Guard Mechanics (`src/components/ProtectedRoute.tsx`)**:
   - *Observation*: Firebase `onAuthStateChanged` initializes asynchronously on page load (typically 100–300ms to read from IndexedDB). During this initial phase, `currentUser` is `null` and `loading` is `true`.
   - *Logic Step 2A (Loading State & Anti-Flicker)*: If `ProtectedRoute` does not inspect `loading`, an authenticated user refreshing `/dashboard` would be immediately and incorrectly bounced to `/login`. Therefore, `ProtectedRoute` must display an executive-grade loading screen while `loading === true`.
   - *Logic Step 2B (Unauthenticated Redirection & Return Target)*: When `loading === false` and `!currentUser`, `ProtectedRoute` must execute `<Navigate to="/login" state={{ from: location }} replace />`.
     - `state={{ from: location }}` captures the attempted route (e.g. `/dashboard` or `/programs/business-english`) so `LoginPage` can redirect the user back to their intended destination upon successful login.
     - `replace={true}` prevents the redirected URL from accumulating in the browser history stack, avoiding back-button redirect loops.
   - *Logic Step 2C (Authenticated Render & Structural Flexibility)*: When `currentUser` exists, `ProtectedRoute` renders `children ? <>{children}</> : <Outlet />`. This dual-mode design supports both wrapping individual elements (`<ProtectedRoute><Dashboard /></ProtectedRoute>`) and layout route nesting (`<Route element={<ProtectedRoute />}><Route ... /></Route>`).

3. **Zentia Luxury Brand Loading Experience**:
   - *Observation*: The application features a high-end corporate executive aesthetic (dark slate `#0f172a`, deep navy `#0B132B`, royal blue `#2563eb`, teal accents, and Playfair Display serif typography).
   - *Logic*: The loading state in `ProtectedRoute` should not be a raw generic spinner; it should feature a styled executive loader with an ambient radial backdrop glow, animated badge, smooth dual-ring spinner, and micro-copy ("Authenticating Executive Session...").

4. **Routing Table Configuration (`src/App.tsx`)**:
   - *Logic*:
     - Route `/`: Public marketing view (`LandingPage`).
     - Route `/login`: Authentication portal (`LoginPage`).
     - Route `/dashboard`: Guarded by `<ProtectedRoute>` -> `Dashboard`.
     - Route `/programs/business-english`: Guarded by `<ProtectedRoute>` -> `CourseViewer`.
     - Route `*`: Fallback redirect `<Navigate to="/" replace />` to capture invalid routes safely.

---

## 3. Caveats

1. **Cold Start & Token Refresh Resolution**:
   - When a user refreshes a protected route or opens a deep link in a new tab, `useAuth()` starts with `loading: true`. The loading screen will render briefly until Firebase confirms token validity. This is intentional and prevents Flash of Unauthenticated Content (FOUC).
2. **Preservation of Search Parameters & Hashes**:
   - If a user deep-links to `/programs/business-english?lesson=3#assessment`, `useLocation()` in `ProtectedRoute` captures the full location object (`pathname`, `search`, `hash`). When `LoginPage` handles redirecting via `navigate(location.state?.from || '/dashboard', { replace: true })`, the user lands back on the exact lesson and hash anchor.
3. **Double `App.tsx` in Workspace**:
   - The workspace has both `App.tsx` (root) and `src/App.tsx`. `index.tsx` imports from `./src/App`. Implementations must modify `src/App.tsx`.
4. **Already Authenticated Visitors on `/login`**:
   - When an already logged-in user manually navigates to `/login`, `LoginPage` should check `if (currentUser && !loading)` and redirect them to `location.state?.from?.pathname || '/dashboard'`.

---

## 4. Conclusion & Complete Implementation Blueprint

### A. Component Blueprint: `src/components/ProtectedRoute.tsx`

Create `src/components/ProtectedRoute.tsx` with the following production-ready implementation:

```tsx
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
    children?: React.ReactNode;
}

/**
 * ProtectedRoute Guard for Zentia World Executive Program
 * 
 * Mechanics:
 * 1. Checks `loading` from AuthContext -> displays luxury branded loading spinner.
 * 2. Checks `currentUser` -> if absent, redirects to `/login` preserving intended path in `state: { from: location }`.
 * 3. If authenticated -> renders child components or nested `<Outlet />`.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    // 1. Executive Loading State while Firebase verifies session
    if (loading) {
        return (
            <div 
                role="status" 
                aria-live="polite"
                className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
            >
                {/* Background Ambient Glow */}
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600 via-slate-900 to-slate-950 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
                    {/* Zentia Executive Brand Icon & Animated Ring */}
                    <div className="relative mb-6 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-400 p-[2px] shadow-2xl shadow-blue-500/20 animate-pulse">
                            <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                <span className="text-3xl font-extrabold text-white tracking-wider font-serif">Z</span>
                            </div>
                        </div>
                        {/* Orbiting Spinner Ring */}
                        <div className="absolute -inset-2 border-2 border-transparent border-t-blue-400 border-r-teal-400 rounded-full animate-spin" />
                    </div>

                    {/* Status Titles */}
                    <h2 className="text-xl font-bold text-white tracking-tight mb-2 flex items-center gap-2">
                        Authenticating Session <Sparkles size={16} className="text-teal-400 animate-spin" />
                    </h2>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                        Verifying executive credentials and establishing secure workspace connection...
                    </p>

                    {/* Security Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400">
                        <Shield size={12} className="text-blue-400" />
                        <span>256-Bit Encrypted Corporate Workspace</span>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Unauthenticated Redirect with Return Target
    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Authenticated Access Granted
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
```

---

### B. Application Shell Blueprint: `src/App.tsx`

Update `src/App.tsx` with complete provider wrapping, route registration, and route guards:

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CourseViewer from './pages/CourseViewer';
import Dashboard from './pages/Dashboard';

/**
 * Root Application Router with Firebase Authentication & Route Guards
 */
const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public Landing & Marketing */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Authentication Portal */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Executive Dashboard */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected Executive Course Viewer */}
                    <Route
                        path="/programs/business-english"
                        element={
                            <ProtectedRoute>
                                <CourseViewer />
                            </ProtectedRoute>
                        }
                    />

                    {/* Graceful Fallback for Unmatched Routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
};

export default App;
```

---

### C. Login Page Redirection Contract (`src/pages/LoginPage.tsx` Integration)

To ensure seamless handoff between `ProtectedRoute.tsx` and `LoginPage.tsx`:

1. In `src/pages/LoginPage.tsx`:
   ```tsx
   import { useLocation, useNavigate } from 'react-router-dom';
   import { useAuth } from '../context/AuthContext';

   const LoginPage: React.FC = () => {
       const { currentUser, login, loginWithGoogle } = useAuth();
       const navigate = useNavigate();
       const location = useLocation();

       // Target destination resolution
       const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
       const targetPath = from ? `${from.pathname || '/dashboard'}${from.search || ''}${from.hash || ''}` : '/dashboard';

       // If already logged in, immediately redirect
       useEffect(() => {
           if (currentUser) {
               navigate(targetPath, { replace: true });
           }
       }, [currentUser, navigate, targetPath]);

       const handleAuthSuccess = () => {
           navigate(targetPath, { replace: true });
       };
       // ...
   };
   ```

---

## 5. Verification Method

To verify the route protection and application routing implementation:

1. **Unauthenticated Access Redirection**:
   - With no active Firebase session, open a private/incognito window and navigate directly to:
     - `http://localhost:5173/dashboard`
     - `http://localhost:5173/programs/business-english`
   - **Expected Result**: Browser instantly redirects to `http://localhost:5173/login`, and internal dashboard/course contents are never rendered.

2. **Return-to-Target Navigation**:
   - Access `http://localhost:5173/programs/business-english` while logged out (redirects to `/login`).
   - Log in using valid credentials or Google sign-in.
   - **Expected Result**: User is automatically directed back to `/programs/business-english` (not defaulted to `/dashboard`).

3. **Cold Reload & Session Persistence**:
   - Log in and navigate to `/dashboard`.
   - Press F5 / browser reload.
   - **Expected Result**: The luxury loading screen (`Authenticating Session...`) shows briefly for ~150ms while Firebase initializes, and the dashboard loads seamlessly without kicking the user to `/login`.

4. **Sign-Out Route Eviction**:
   - From `/dashboard` or `/programs/business-english`, trigger `logout()`.
   - **Expected Result**: User session is cleared, and the view immediately redirects to `/login` or `/`.

5. **Build & Type Check Validation**:
   - Execute:
     ```powershell
     npm run build
     ```
   - **Expected Result**: TypeScript compiles cleanly with 0 errors and Vite builds the production bundle successfully.
