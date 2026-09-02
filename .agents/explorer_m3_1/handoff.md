# Milestone 3 Explorer 1 Investigation & Implementation Plan: Dynamic Profile & Dashboard Header

## 1. Observation

### Current Codebase State in `src/pages/Dashboard.tsx`
Inspection of `src/pages/Dashboard.tsx` (lines 1–151) revealed:
- **Hardcoded Profile Elements**: Line 66–69 contains hardcoded static strings `"Alex Director"` and `"Corporate Learner"` with an empty placeholder div `<div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-teal-400 rounded-full shadow-sm"></div>`.
- **Missing Auth Integration**: `Dashboard.tsx` does not import or invoke `useAuth()` from `../context/AuthContext`. There is no sign-out trigger, no email display, no name resolution fallback, no initials avatar calculation, and no executive membership badge.
- **Light Theme Header**: Lines 56–75 define `<header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">`, which is a stark light theme inconsistent with the luxury dark/gold executive aesthetic used in `LoginPage.tsx` and `ProtectedRoute.tsx`.
- **Missing Progress Integration**: The `overview` tab (lines 80–135) only displays static mock "Nudge Tracker" entries and does not connect to `useProgress()` from `../context/ProgressContext` (4-card metric grid, 5-module breakdown, and "Continue Learning" CTA are absent).
- **Navigation Links**: Sidebar currently has only a basic back link `<Link to="/" ...>Back to Market</Link>` and internal tab switch buttons, missing direct navigation to the executive curriculum `/programs/business-english`.

### Verified Code References
1. **`src/context/AuthContext.tsx`** (lines 14–24, 185–192):
   - Hook: `useAuth(): AuthContextType`
   - Contract:
     ```ts
     export interface AuthContextType {
         currentUser: User | null;
         loading: boolean;
         error: string | null;
         login: (email: string, password: string) => Promise<User>;
         signup: (email: string, password: string, displayName?: string) => Promise<User>;
         loginWithGoogle: () => Promise<User>;
         logout: () => Promise<void>;
         clearError: () => void;
     }
     ```
2. **`src/context/ProgressContext.tsx`** (lines 240–270):
   - Hook: `useProgress(): ProgressContextValue`
   - Contract: Provides `progress`, `completedLessons`, `lastLessonId`, `quizScores`, `stats`, `moduleProgress`, `continueTarget`, `syncing`, `isOffline`, `loading`.
3. **`src/services/progressService.ts`** (lines 20–45):
   - `CURRICULUM_SEQUENCE`: 21-item array `[0, 1, 2, 3, 101, 4, 5, 6, 102, 7, 8, 103, 9, 10, 11, 12, 104, 13, 14, 15, 105]`
   - `MODULE_DEFINITIONS`: 5 modules with titles, unit arrays, and quiz IDs.
   - `ProgressCalculator`: Pure calculation engine for stats, module breakdown, and continue target resolution.
4. **`src/components/ProtectedRoute.tsx`** (lines 18–60):
   - Establishes the luxury executive dark palette: `bg-slate-950`, `border-slate-800`, radial glow `from-blue-600 via-slate-900 to-slate-950`, gold/amber accents, and luxury serif monogram branding `Z`.
5. **`tests/runner.mjs` & `tests/e2e/tier1_dashboard.test.mjs`**:
   - 57/57 tests passing in test runner (`node tests/runner.mjs`).

---

## 2. Logic Chain

1. **User Identity Resolution**:
   - Firebase Auth provides `currentUser: User | null` via `useAuth()`.
   - If `currentUser.displayName` is set and non-empty (e.g., from Sign Up or Google Auth), display it directly.
   - If `currentUser.displayName` is null or empty, parse `currentUser.email` by extracting the username before `@`, splitting by `.` or `_` or `-`, and capitalizing each token (e.g. `alex.director@company.com` -> `"Alex Director"`).
   - If neither is available, fall back cleanly to `"Executive Learner"`.
   - Email is taken directly from `currentUser.email` with fallback to `"executive@zentia.world"`.

2. **Avatar & Initials Generation**:
   - If `currentUser.photoURL` exists, render a luxury framed `<img>` element with `ring-2 ring-amber-400/30`.
   - If no photo URL exists, extract initials:
     - 2+ words (e.g., "Sarah Connor"): `parts[0][0] + parts[1][0]` -> `"SC"`.
     - 1 word (e.g., "Alex"): `name.slice(0, 2)` -> `"AL"`.
     - Fallback: `"EL"`.
   - Render initials in a circular badge styled with a rich gradient (`bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-bold text-sm shadow-md ring-2 ring-amber-400/20`).

3. **Executive Member Badge**:
   - Render a distinctive luxury pill badge:
     `<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm"><Sparkles size={11} className="text-amber-400" /> Executive Member</span>`.

4. **Sign-Out Action**:
   - `useAuth()` provides `logout: () => Promise<void>`.
   - Implement an interactive header profile menu / sign-out button.
   - On click: call `await logout()`, clear any session errors, and navigate to `/login` via `useNavigate()`.

5. **Header Navigation & Layout Architecture**:
   - Replace light `bg-white` header with luxury executive theme `bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 text-slate-100`.
   - Include:
     - Left: Mobile menu toggle, active tab title, and breadcrumb indicator.
     - Center/Right: Cloud synchronization badge (`syncing` pulse / `isOffline` indicator), "Resume Curriculum" fast-action CTA button linking to `/programs/business-english`, and user profile card with sign-out trigger.
   - Match sidebar styling with deep slate/navy `bg-slate-950`, subtle gold accent highlights on active navigation items, and an executive profile footer.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Utility Functions for Profile Resolution
In `src/pages/Dashboard.tsx` (or extracted to a helper):
```tsx
const getDisplayName = (user: User | null): string => {
    if (!user) return 'Executive Learner';
    if (user.displayName && user.displayName.trim()) {
        return user.displayName.trim();
    }
    if (user.email) {
        const prefix = user.email.split('@')[0];
        return prefix
            .split(/[._-]/)
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
    return 'Executive Learner';
};

const getUserInitials = (displayName: string, email?: string | null): string => {
    if (!displayName || displayName === 'Executive Learner') {
        if (email) {
            const prefix = email.split('@')[0];
            return prefix.slice(0, 2).toUpperCase();
        }
        return 'EL';
    }
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
};
```

### Step 2: Integrate `useAuth` & `useProgress` in `Dashboard.tsx`
```tsx
const { currentUser, logout } = useAuth();
const { progress, stats, moduleProgress, continueTarget, syncing, isOffline } = useProgress();
const navigate = useNavigate();
const [showProfileMenu, setShowProfileMenu] = useState(false);
const [isLoggingOut, setIsLoggingOut] = useState(false);

const displayName = getDisplayName(currentUser);
const userInitials = getUserInitials(displayName, currentUser?.email);

const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
        await logout();
        navigate('/login', { replace: true });
    } catch (err) {
        console.error('Logout error:', err);
    } finally {
        setIsLoggingOut(false);
    }
};
```

### Step 3: Implement Executive Header
Replace lines 56–75 with:
```tsx
<header className="h-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 md:px-8 shrink-0 z-30">
    {/* Left: Tab Title & Breadcrumb */}
    <div className="flex items-center gap-4">
        <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle Menu"
        >
            <Menu size={20} />
        </button>
        <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Zentia World</span>
                <span>/</span>
                <span className="text-amber-400">Executive Workspace</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
                {activeTab === 'overview' ? 'Learner Progress & Curriculum' : 
                 activeTab === 'sandbox' ? 'Executive Communication Sandbox' : 
                 activeTab === 'translator' ? 'Technical-to-Boardroom Translator' : 
                 'Automated Video Speech Analysis'}
            </h1>
        </div>
    </div>

    {/* Right: Quick Actions & Profile */}
    <div className="flex items-center gap-4">
        {/* Sync / Offline Status */}
        {syncing && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-full animate-pulse">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span>Syncing Cloud...</span>
            </div>
        )}
        {isOffline && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-full">
                <span>Offline Cache Active</span>
            </div>
        )}

        {/* Quick Link to Curriculum */}
        <Link
            to={`/programs/business-english?lesson=${continueTarget.targetLessonId}`}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
        >
            <BookOpen size={15} />
            <span>Resume Course</span>
        </Link>

        {/* Profile Card & Sign Out Menu */}
        <div className="relative">
            <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all text-left group"
            >
                <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        {displayName}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-amber-400 font-medium">
                        <Sparkles size={10} />
                        <span>Executive Member</span>
                    </div>
                </div>
                {currentUser?.photoURL ? (
                    <img 
                        src={currentUser.photoURL} 
                        alt={displayName} 
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40 shadow-sm"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-bold text-sm flex items-center justify-center shadow-md ring-2 ring-amber-400/30">
                        {userInitials}
                    </div>
                )}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-bold text-base flex items-center justify-center shrink-0">
                            {userInitials}
                        </div>
                        <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-white truncate">{displayName}</h4>
                            <p className="text-xs text-slate-400 truncate">{currentUser?.email || 'executive@zentia.world'}</p>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Sparkles size={9} /> VIP Executive Scholar
                            </span>
                        </div>
                    </div>

                    <div className="py-2 space-y-1">
                        <Link
                            to={`/programs/business-english?lesson=${continueTarget.targetLessonId}`}
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <GraduationCap size={15} className="text-blue-400" />
                                Course Curriculum
                            </span>
                            <span className="text-[10px] text-slate-500">{stats.overallPercentage}% Done</span>
                        </Link>
                        <Link
                            to="/"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={15} className="text-slate-400" />
                            Marketplace Portal
                        </Link>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                        <button
                            onClick={handleSignOut}
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/50 hover:text-red-300 transition-all disabled:opacity-50"
                        >
                            <LogOut size={14} />
                            <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out of Workspace'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
</header>
```

### Step 4: Executive Sidebar Modernization
Update sidebar with:
- Zentia Gold/Blue Emblem Crest (`Z`)
- Direct navigation links to `/programs/business-english` and `/`
- User status footer at bottom of sidebar with quick sign-out button.

---

## 4. Caveats

- **No Caveats**: The codebase has full contracts defined in `AuthContext` and `ProgressContext`. All necessary hooks, types, calculation functions, and icons exist in the project and are verified with 57 automated tests.

---

## 5. Conclusion

1. `Dashboard.tsx` currently contains mock static profile data ("Alex Director") and light-themed header styling that must be replaced.
2. The dynamic profile section must source data directly from `useAuth()` (`currentUser.displayName`, `currentUser.email`, photo URL/initials fallback) and provide a seamless `logout()` action with redirect to `/login`.
3. The dashboard header and layout should adopt the luxury dark/gold executive design language (`bg-slate-900`, `border-slate-800`, `text-amber-400`, `bg-gradient-to-tr from-amber-500 to-yellow-300`).
4. This implementation plan provides all exact imports, utility functions, JSX layout, and state management required for Milestone 3 implementation.

---

## 6. Verification Method

- **Command**: `node tests/runner.mjs` to run the 4-tier + Tier 5 E2E test harness.
- **Code Inspection**: View `src/pages/Dashboard.tsx` to verify dynamic `useAuth()` wiring, absence of hardcoded user strings, proper fallback chains, and luxury aesthetic classes.
- **Runtime Flow**: Test signing in with different user accounts (Email/Password, Google), navigating to `/dashboard`, verifying custom display names / initials, and triggering sign-out back to `/login`.
