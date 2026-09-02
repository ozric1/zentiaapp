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
