import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Mail, 
    Lock, 
    User as UserIcon, 
    ArrowRight, 
    Shield, 
    Sparkles, 
    AlertCircle, 
    Eye, 
    EyeOff,
    CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { currentUser, login, signup, loginWithGoogle, error: authError, clearError, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Mode: 'signin' | 'signup'
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');

    // Form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Local validation / processing state
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

    // Destination path determination
    const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
    const urlParams = new URLSearchParams(location.search);
    const redirectParam = urlParams.get('redirect');

    const targetPath = fromState
        ? `${fromState.pathname || '/dashboard'}${fromState.search || ''}${fromState.hash || ''}`
        : (redirectParam || '/dashboard');

    // Auto-redirect if already logged in
    useEffect(() => {
        if (currentUser) {
            navigate(targetPath, { replace: true });
        }
    }, [currentUser, navigate, targetPath]);

    // Handle tab change
    const switchMode = (newMode: 'signin' | 'signup') => {
        setMode(newMode);
        setLocalError(null);
        clearError();
    };

    // Client-side validation
    const validateForm = (): boolean => {
        if (!email.trim()) {
            setLocalError('Please enter your corporate email address.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setLocalError('Please provide a valid email format (e.g. alex@zentia.com).');
            return false;
        }

        if (!password) {
            setLocalError('Please enter your password.');
            return false;
        }

        if (password.length < 6) {
            setLocalError('Security requirement: Password must be at least 6 characters.');
            return false;
        }

        if (mode === 'signup' && !displayName.trim()) {
            setLocalError('Please enter your full executive name.');
            return false;
        }

        setLocalError(null);
        return true;
    };

    // Form Submit Handler (Sign In / Sign Up)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            if (mode === 'signin') {
                await login(email.trim(), password);
            } else {
                await signup(email.trim(), password, displayName.trim());
            }
            // Successful auth will trigger the useEffect redirect, or navigate directly:
            navigate(targetPath, { replace: true });
        } catch (err: unknown) {
            console.error('Authentication error:', err);
            // Error state is captured and mapped in AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    // Google Sign In Handler
    const handleGoogleSignIn = async () => {
        setLocalError(null);
        clearError();
        setIsGoogleSubmitting(true);
        try {
            await loginWithGoogle();
            navigate(targetPath, { replace: true });
        } catch (err: unknown) {
            console.error('Google authentication error:', err);
        } finally {
            setIsGoogleSubmitting(false);
        }
    };

    const activeError = localError || authError;
    const isLoading = isSubmitting || isGoogleSubmitting || authLoading;

    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
            {/* Ambient Executive Background Lighting */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

            {/* Header / Brand Navigation */}
            <header className="relative z-10 px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-400 p-[2px] shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                            <span className="text-xl font-black text-white font-serif tracking-wider">Z</span>
                        </div>
                    </div>
                    <div>
                        <span className="font-bold text-xl tracking-tight text-white block leading-none">Zentia</span>
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-teal-400 block mt-0.5">Executive World</span>
                    </div>
                </Link>

                <Link 
                    to="/" 
                    className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-900/60 border border-transparent hover:border-slate-800"
                >
                    Return to Portal
                </Link>
            </header>

            {/* Main Authentication Container */}
            <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-md">
                    {/* Glassmorphic Card Container */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-teal-400 to-blue-600" />

                        {/* Title & Mode Descriptor */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-400 mb-3">
                                <Sparkles size={12} className="text-teal-400" />
                                <span>Executive Learner Portal</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-serif">
                                {mode === 'signin' ? 'Welcome Back' : 'Create Executive Account'}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
                                {mode === 'signin' 
                                    ? 'Enter your credentials to access your personalized dashboard & modules.' 
                                    : 'Join the premier corporate coaching & language acceleration network.'}
                            </p>
                        </div>

                        {/* Mode Switcher Tabs */}
                        <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-2xl border border-slate-800/60 mb-6">
                            <button
                                type="button"
                                onClick={() => switchMode('signin')}
                                className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                                    mode === 'signin'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => switchMode('signup')}
                                className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                                    mode === 'signup'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                                }`}
                            >
                                Create Account
                            </button>
                        </div>

                        {/* Error Notification Banner */}
                        {activeError && (
                            <div 
                                role="alert"
                                className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                            >
                                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                                <div className="flex-1 leading-relaxed">
                                    {activeError}
                                </div>
                            </div>
                        )}

                        {/* Google OAuth Quick Action */}
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all hover:border-slate-600 disabled:opacity-60 disabled:cursor-not-allowed mb-5 shadow-sm active:scale-[0.99]"
                        >
                            {isGoogleSubmitting ? (
                                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                    />
                                </svg>
                            )}
                            <span>Continue with Google Workspace</span>
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-[1px] bg-slate-800" />
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">or with credentials</span>
                            <div className="flex-1 h-[1px] bg-slate-800" />
                        </div>

                        {/* Main Authentication Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Display Name Field (Sign Up Only) */}
                            {mode === 'signup' && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                            <UserIcon size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => {
                                                setDisplayName(e.target.value);
                                                if (localError) setLocalError(null);
                                            }}
                                            placeholder="Alexander Hamilton"
                                            disabled={isLoading}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email Address */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-300">
                                    Corporate Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (localError) setLocalError(null);
                                        }}
                                        placeholder="executive@company.com"
                                        disabled={isLoading}
                                        autoComplete="email"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Password
                                    </label>
                                    {mode === 'signin' && (
                                        <span className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                                            Forgot password?
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (localError) setLocalError(null);
                                        }}
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Initialize Executive Account'}</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Sign In vs Sign Up Footnote */}
                        <div className="mt-6 text-center text-xs text-slate-400">
                            {mode === 'signin' ? (
                                <span>
                                    Don't have an executive profile yet?{' '}
                                    <button
                                        type="button"
                                        onClick={() => switchMode('signup')}
                                        className="text-teal-400 hover:text-teal-300 font-semibold transition-colors underline-offset-2 hover:underline"
                                    >
                                        Create one now
                                    </button>
                                </span>
                            ) : (
                                <span>
                                    Already registered?{' '}
                                    <button
                                        type="button"
                                        onClick={() => switchMode('signin')}
                                        className="text-blue-400 hover:text-blue-300 font-semibold transition-colors underline-offset-2 hover:underline"
                                    >
                                        Sign in to existing account
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Security & Confidentiality Attestation */}
                    <div className="mt-6 text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <Shield size={13} className="text-blue-400" />
                            <span>Enterprise Single Sign-On & ISO-27001 Certified Vault</span>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600">
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">Confidentiality Terms</span>
                            <span>•</span>
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Charter</span>
                            <span>•</span>
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">Security Center</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Notice */}
            <footer className="relative z-10 py-4 text-center text-[11px] text-slate-600">
                &copy; {new Date().getFullYear()} Zentia World Executive Coaching. All rights reserved.
            </footer>
        </div>
    );
};

export default LoginPage;
