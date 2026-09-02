import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    MessageSquare,
    ArrowRightLeft,
    Video,
    Target,
    ArrowLeft,
    TrendingUp,
    BookOpen,
    Award,
    Sparkles,
    CheckCircle2,
    Clock,
    ChevronRight,
    Play,
    AlertCircle,
    LogOut,
    Menu,
    X,
    ArrowRight,
    RotateCcw,
    GraduationCap,
    Zap,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { COURSE_DATA } from '../../constants';
import { CURRICULUM_SEQUENCE, MODULE_DEFINITIONS } from '../services/progressService';
import CommunicationSandbox from '../components/tools/CommunicationSandbox';
import TechnicalTranslator from '../components/tools/TechnicalTranslator';
import VideoAnalysis from '../components/tools/VideoAnalysis';

/**
 * Resolves formatted display name from user object or email prefix.
 */
const getDisplayName = (user: { displayName?: string | null; email?: string | null } | null): string => {
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

/**
 * Generates 2-letter uppercase initials for executive avatar badge.
 */
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

export const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'sandbox' | 'translator' | 'video'>('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const {
        stats,
        moduleProgress,
        continueTarget,
        completedLessons,
        lastLessonId,
        loading,
        syncing,
        isOffline
    } = useProgress();

    const displayName = getDisplayName(currentUser);
    const userEmail = currentUser?.email || 'executive@zentia.world';
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

    // Hero Continue Learning Target Resolution
    const targetId = continueTarget?.targetLessonId ?? 0;
    const isProgramComplete = !!continueTarget?.isProgramComplete;
    const lessonData = COURSE_DATA[targetId] || { title: 'Executive Communication Orientation', subtitle: 'Course Onboarding' };
    const sequenceIndex = CURRICULUM_SEQUENCE.indexOf(targetId);
    const stepNumber = sequenceIndex !== -1 ? sequenceIndex + 1 : 1;
    const isAssessment = targetId >= 101 && targetId <= 105;
    const isIntro = targetId === 0;
    const isResuming = lastLessonId === targetId && !completedLessons.includes(targetId) && completedLessons.length > 0;

    // Resolve parent module for Hero Banner
    let heroModuleTitle = 'Executive Orientation & Leadership Framework';
    let heroModuleBadge = 'Orientation';
    if (!isIntro) {
        const parentMod = MODULE_DEFINITIONS.find(m => (m.units as readonly number[]).includes(targetId) || m.quizId === targetId);
        if (parentMod) {
            heroModuleTitle = `Module ${parentMod.id}: ${parentMod.title}`;
            heroModuleBadge = isAssessment ? `Module ${parentMod.id} Assessment` : `Module ${parentMod.id}`;
        }
    }

    return (
        <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-950">
            {/* 1. Desktop & Mobile Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Brand Header */}
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/80 shrink-0">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-[1px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                                <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
                                    <span className="text-lg font-black text-amber-400 font-serif">Z</span>
                                </div>
                            </div>
                            <div>
                                <span className="font-extrabold tracking-wider text-white text-sm block font-serif">ZENTIA WORLD</span>
                                <span className="text-[10px] text-amber-400/90 tracking-widest font-semibold uppercase block">Executive Suite</span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            aria-label="Close Navigation"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {/* Core Workspace */}
                        <div>
                            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                                Executive Workspace
                            </p>
                            <nav className="space-y-1">
                                <button
                                    onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                                        activeTab === 'overview'
                                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border border-amber-500/30 shadow-sm'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <LayoutDashboard size={18} className={activeTab === 'overview' ? 'text-amber-400' : 'text-slate-400'} />
                                        <span>Executive Dashboard</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                                        {stats.overallPercentage}%
                                    </span>
                                </button>

                                <Link
                                    to={`/programs/business-english?lesson=${targetId}`}
                                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <GraduationCap size={18} className="text-blue-400 group-hover:text-blue-300" />
                                        <span>Curriculum Portal</span>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </nav>
                        </div>

                        {/* Executive AI Tools */}
                        <div>
                            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                                AI Simulation & Practice
                            </p>
                            <nav className="space-y-1">
                                <button
                                    onClick={() => { setActiveTab('sandbox'); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                                        activeTab === 'sandbox'
                                            ? 'bg-gradient-to-r from-blue-600/30 to-blue-600/10 text-blue-300 border border-blue-500/30 shadow-sm'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                    }`}
                                >
                                    <MessageSquare size={18} className={activeTab === 'sandbox' ? 'text-blue-400' : 'text-slate-400'} />
                                    <span>Comm. Sandbox</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('translator'); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                                        activeTab === 'translator'
                                            ? 'bg-gradient-to-r from-teal-600/30 to-teal-600/10 text-teal-300 border border-teal-500/30 shadow-sm'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                    }`}
                                >
                                    <ArrowRightLeft size={18} className={activeTab === 'translator' ? 'text-teal-400' : 'text-slate-400'} />
                                    <span>Tech-to-Board Translator</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('video'); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                                        activeTab === 'video'
                                            ? 'bg-gradient-to-r from-purple-600/30 to-purple-600/10 text-purple-300 border border-purple-500/30 shadow-sm'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                    }`}
                                >
                                    <Video size={18} className={activeTab === 'video' ? 'text-purple-400' : 'text-slate-400'} />
                                    <span>Video Speech Analysis</span>
                                </button>
                            </nav>
                        </div>

                        {/* Portal Navigation Links */}
                        <div>
                            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                                Public Links
                            </p>
                            <nav className="space-y-1">
                                <Link
                                    to="/"
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <ArrowLeft size={15} className="text-slate-400" />
                                        <span>Back to Marketplace</span>
                                    </div>
                                    <ExternalLink size={13} className="text-slate-400" />
                                </Link>
                            </nav>
                        </div>
                    </div>

                    {/* Sidebar Footer User Info & Sign Out */}
                    <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                    {userInitials}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-white truncate">{displayName}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                disabled={isLoggingOut}
                                title="Sign Out of Workspace"
                                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 transition-colors"
                                aria-label="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* 2. Main Executive Content Column */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-slate-950">
                {/* Executive Top Header */}
                <header className="h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-4 sm:px-6 md:px-8 shrink-0 z-30">
                    {/* Left: Tab Title & Breadcrumbs */}
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            aria-label="Toggle Menu"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                <span className="hidden sm:inline">Zentia World</span>
                                <span className="hidden sm:inline">/</span>
                                <span className="text-amber-400">Executive Workspace</span>
                            </div>
                            <h1 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight truncate">
                                {activeTab === 'overview' ? 'Personalized Dashboard & Curriculum Progress' :
                                 activeTab === 'sandbox' ? 'Executive Communication Sandbox' :
                                 activeTab === 'translator' ? 'Technical-to-Boardroom Translator' :
                                 'Automated Video Speech Analysis'}
                            </h1>
                        </div>
                    </div>

                    {/* Right: Sync Status, Fast Action CTA & User Profile */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        {/* Real-time Cloud Sync & Offline Indicator */}
                        {syncing && (
                            <div className="hidden lg:flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/70 border border-blue-800/70 px-3 py-1.5 rounded-full animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                                <span>Syncing Cloud...</span>
                            </div>
                        )}
                        {isOffline && (
                            <div className="hidden lg:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/70 border border-amber-800/70 px-3 py-1.5 rounded-full">
                                <span>Offline Cache Active</span>
                            </div>
                        )}

                        {/* Fast Action CTA to Resume Course */}
                        <Link
                            to={`/programs/business-english?lesson=${targetId}`}
                            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition-all shadow-sm"
                        >
                            <Play size={14} className="fill-current" />
                            <span>{isProgramComplete ? 'Review Course' : 'Resume Learning'}</span>
                        </Link>

                        {/* Profile Badge & Dropdown Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 transition-all text-left group"
                                aria-label="User profile menu"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate max-w-[140px]">
                                        {displayName}
                                    </p>
                                    <div className="flex items-center justify-end gap-1 text-[10px] text-amber-400 font-semibold">
                                        <Sparkles size={10} />
                                        <span>Executive Member</span>
                                    </div>
                                </div>
                                {currentUser?.photoURL ? (
                                    <img
                                        src={currentUser.photoURL}
                                        alt={displayName}
                                        className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400/40 shadow-sm"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-md ring-2 ring-amber-400/30">
                                        {userInitials}
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-bold text-sm flex items-center justify-center shrink-0">
                                            {userInitials}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                                            <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                <Sparkles size={9} /> VIP Executive Scholar
                                            </span>
                                        </div>
                                    </div>

                                    <div className="py-2 space-y-1">
                                        <Link
                                            to={`/programs/business-english?lesson=${targetId}`}
                                            onClick={() => setShowProfileMenu(false)}
                                            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <GraduationCap size={15} className="text-blue-400" />
                                                Course Curriculum
                                            </span>
                                            <span className="text-[10px] text-amber-400 font-mono font-bold">{stats.overallPercentage}% Done</span>
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
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/50 hover:text-red-300 transition-all disabled:opacity-50"
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

                {/* Workspace Body Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="space-y-8 max-w-6xl mx-auto pb-12">
                            {/* ========================================================
                                1. HERO "CONTINUE LEARNING" / "RESUME LEARNING" BANNER
                               ======================================================== */}
                            {loading ? (
                                <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 animate-pulse">
                                    <div className="h-6 w-36 bg-slate-800 rounded-full mb-4" />
                                    <div className="h-10 w-3/4 bg-slate-800 rounded-xl mb-3" />
                                    <div className="h-5 w-1/2 bg-slate-800/80 rounded-lg mb-6" />
                                    <div className="h-12 w-48 bg-slate-800 rounded-xl" />
                                </div>
                            ) : isProgramComplete ? (
                                /* Celebratory Completion Hero State */
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/40 p-6 sm:p-8 md:p-10 shadow-2xl shadow-amber-950/30">
                                    <div className="absolute -right-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="space-y-3 max-w-2xl">
                                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                                                <Award size={14} className="text-amber-400" />
                                                <span>Program Completed • Executive Certification Ready</span>
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                                                Executive Mastery Achieved
                                            </h2>
                                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                                Distinguished achievement. You have mastered all 21 executive communication units and passed all 5 high-stakes leadership assessments with peer-level distinction.
                                            </p>
                                            <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-300 font-medium">
                                                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                                    <CheckCircle2 size={14} className="text-amber-400" /> 21 / 21 Units Mastered
                                                </span>
                                                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                                    <CheckCircle2 size={14} className="text-amber-400" /> 5 / 5 Assessments Passed
                                                </span>
                                                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                                    <Sparkles size={14} className="text-amber-400" /> 100% Curriculum Mastered
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                                            <Link
                                                to="/programs/business-english?lesson=0"
                                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 hover:scale-[1.02] transition-all"
                                            >
                                                <RotateCcw size={16} />
                                                <span>Review Full Curriculum</span>
                                            </Link>
                                            <Link
                                                to="/programs/business-english?lesson=105"
                                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white transition-all"
                                            >
                                                <BookOpen size={16} />
                                                <span>View Capstone Assessment</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Active In-Progress or Up-Next Hero State */
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 hover:border-slate-700/80 p-6 sm:p-8 md:p-10 shadow-2xl shadow-slate-950/50 transition-all">
                                    <div className={`absolute -right-16 -top-16 w-80 h-80 ${isAssessment ? 'bg-purple-600/10' : isResuming ? 'bg-amber-500/10' : 'bg-blue-600/10'} rounded-full blur-3xl pointer-events-none`} />
                                    
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="space-y-3 max-w-2xl">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {isResuming ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                                                        <Play size={12} className="fill-amber-300 text-amber-300" /> Resume Lesson
                                                    </span>
                                                ) : isAssessment ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                                                        <Sparkles size={12} /> Executive Assessment Ready
                                                    </span>
                                                ) : isIntro ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                                                        <BookOpen size={12} /> Course Orientation
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                                                        <ArrowRight size={12} /> Up Next • Step {stepNumber} of 21
                                                    </span>
                                                )}

                                                <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/80">
                                                    {heroModuleBadge}
                                                </span>
                                            </div>

                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                                                    {heroModuleTitle}
                                                </p>
                                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                                                    {lessonData.title || `Unit ${targetId}`}
                                                </h2>
                                            </div>

                                            <p className="text-slate-300 text-sm md:text-base line-clamp-2 leading-relaxed">
                                                {lessonData.subtitle || lessonData.context || 'Executive Strategic Practice & Global Leadership Immersion.'}
                                            </p>

                                            {/* Mini Progress Bar */}
                                            <div className="flex items-center gap-3 pt-2">
                                                <div className="flex-1 max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isAssessment ? 'bg-purple-500' : isResuming ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${stats.overallPercentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-400">
                                                    {stats.overallPercentage}% Program Mastered
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 pt-2 md:pt-0">
                                            <Link
                                                to={`/programs/business-english?lesson=${targetId}`}
                                                className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm text-white shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 ${
                                                    isAssessment
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                                                        : isResuming
                                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
                                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                                                }`}
                                            >
                                                <span>
                                                    {isResuming
                                                        ? 'Resume Lesson'
                                                        : isAssessment
                                                        ? 'Start Assessment'
                                                        : isIntro
                                                        ? 'Begin Orientation'
                                                        : 'Continue Learning'}
                                                </span>
                                                <ArrowRight size={18} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========================================================
                                2. 4-CARD OVERVIEW METRIC GRID
                               ======================================================== */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <TrendingUp size={20} className="text-amber-400" />
                                        Executive Performance Metrics
                                    </h3>
                                    <span className="text-xs font-medium text-slate-400">
                                        Live Firestore Telemetry
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                                    {/* Card 1: Overall Progress */}
                                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-blue-500/40 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Progress</span>
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                                                <TrendingUp size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-white tracking-tight">
                                                {stats.overallPercentage}%
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                                {stats.completedCount} of {stats.totalUnits || 21} Units Completed
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${stats.overallPercentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Card 2: Units Mastered */}
                                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Units Mastered</span>
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                                <BookOpen size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-white tracking-tight">
                                                {stats.unitsMastered} <span className="text-base font-semibold text-slate-500">/ 16</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                                Core Lessons (IDs 0–15)
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.round((stats.unitsMastered / 16) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Card 3: Assessments Passed */}
                                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assessments Passed</span>
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                                                <Award size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-white tracking-tight">
                                                {stats.assessmentsPassed} <span className="text-base font-semibold text-slate-500">/ 5</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                                Module Checks (≥ 80% Benchmark)
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div
                                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.round((stats.assessmentsPassed / 5) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Card 4: Average Score */}
                                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-purple-500/40 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Assessment Score</span>
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                                                <Sparkles size={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-extrabold text-white tracking-tight">
                                                {stats.avgScore > 0 ? `${stats.avgScore}%` : stats.assessmentsPassed > 0 ? `${stats.avgScore}%` : '0%'}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                                Mean Accuracy on Progress Checks
                                            </p>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                                            <div
                                                className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${stats.avgScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ========================================================
                                3. 5-MODULE CURRICULUM PROGRESS BREAKDOWN CARDS
                               ======================================================== */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <BookOpen size={20} className="text-amber-400" />
                                        Curriculum Modules Breakdown
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-400">
                                        5 Executive Competency Pillars
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {moduleProgress.map((mod) => {
                                        // Determine starting unit for navigation
                                        const moduleFirstLesson = mod.id === 1 ? 1 : mod.id === 2 ? 4 : mod.id === 3 ? 7 : mod.id === 4 ? 9 : 13;

                                        return (
                                            <div
                                                key={mod.id}
                                                className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-6 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                                                            Module {mod.id}
                                                        </span>
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                            mod.status === 'completed'
                                                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                                : mod.status === 'in_progress'
                                                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}>
                                                            {mod.status === 'completed' ? 'Completed' : mod.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-bold text-white text-base leading-snug mb-2">
                                                        {mod.title}
                                                    </h4>

                                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2 mt-4 font-medium">
                                                        <span>{mod.completedItems} / {mod.totalItems} Units Completed</span>
                                                        <span className="font-bold text-amber-400">{mod.percentage}%</span>
                                                    </div>

                                                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                                mod.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                                            }`}
                                                            style={{ width: `${mod.percentage}%` }}
                                                        />
                                                    </div>

                                                    {/* Quiz status subtext */}
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-4">
                                                        {mod.quizPassed ? (
                                                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                                <CheckCircle2 size={13} /> Assessment Passed ({mod.quizScore?.percentage}%)
                                                            </span>
                                                        ) : mod.quizScore ? (
                                                            <span className="text-amber-400 font-medium flex items-center gap-1">
                                                                <AlertCircle size={13} /> Assessment Attempted ({mod.quizScore?.percentage}%) — 80% required
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                <Clock size={13} /> Assessment Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <Link
                                                    to={`/programs/business-english?lesson=${moduleFirstLesson}`}
                                                    className="w-full mt-2 py-2.5 px-4 rounded-xl border border-slate-700/80 hover:border-amber-500/50 bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    <span>{mod.status === 'completed' ? 'Review Module' : mod.status === 'in_progress' ? 'Continue Module' : 'Start Module'}</span>
                                                    <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5 text-amber-400" />
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ========================================================
                                4. EXECUTIVE AI TOOLS QUICK ACCESS GRID
                               ======================================================== */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Zap size={20} className="text-amber-400" />
                                    Executive Simulation Suites
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <button
                                        onClick={() => setActiveTab('sandbox')}
                                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 text-left transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                            <MessageSquare size={20} />
                                        </div>
                                        <h4 className="font-bold text-white text-sm mb-1 group-hover:text-blue-300 transition-colors">
                                            Communication Sandbox
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Roleplay high-stakes stakeholder dialogues with AI persona simulators (CTO, Board Director, Lead Investor).
                                        </p>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('translator')}
                                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-teal-500/40 text-left transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                            <ArrowRightLeft size={20} />
                                        </div>
                                        <h4 className="font-bold text-white text-sm mb-1 group-hover:text-teal-300 transition-colors">
                                            Tech-to-Boardroom Translator
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Convert complex engineering jargon into succinct, high-ROI boardroom value propositions.
                                        </p>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('video')}
                                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 text-left transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                            <Video size={20} />
                                        </div>
                                        <h4 className="font-bold text-white text-sm mb-1 group-hover:text-purple-300 transition-colors">
                                            Video Speech Analysis
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Automated feedback on delivery pacing, vocal presence, clarity, and executive gravitas.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* ========================================================
                                5. SMART "NUDGE" TRACKER (WHATSAPP MISSIONS LOG)
                               ======================================================== */}
                            <div className="bg-slate-900/80 rounded-2xl shadow-lg border border-slate-800/80 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Smart "Nudge" Tracker</h3>
                                        <p className="text-slate-400 text-xs">Weekly WhatsApp micro-missions and executive field feedback</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                        <div className="shrink-0 w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-xs font-bold text-slate-300">
                                            <span className="text-amber-400 font-mono text-[10px]">OCT</span>
                                            24
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-white text-sm">Mission: The 'Problem-Solution-Benefit' Framework</h4>
                                            <p className="text-xs text-slate-300 italic border-l-2 border-emerald-500/60 pl-3 py-0.5">
                                                "I tried it in the 10 AM standup. It felt structured at first, but the VP of Eng nodded along when I hit the 'Benefit' part."
                                            </p>
                                            <span className="inline-block text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                Logged via Voice Note
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                        <div className="shrink-0 w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-xs font-bold text-slate-300">
                                            <span className="text-slate-400 font-mono text-[10px]">OCT</span>
                                            17
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-white text-sm">Mission: Strategic Silence as a Tool</h4>
                                            <p className="text-xs text-slate-300 italic border-l-2 border-slate-700 pl-3 py-0.5">
                                                "Used the 3-second pause after stating the budget requirement. It was intense but highly effective."
                                            </p>
                                            <span className="inline-block text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                                                Logged via Text
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sandbox' && (
                        <div className="max-w-5xl mx-auto h-full flex flex-col">
                            <CommunicationSandbox />
                        </div>
                    )}

                    {activeTab === 'translator' && (
                        <div className="max-w-6xl mx-auto h-full flex flex-col">
                            <TechnicalTranslator />
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="max-w-6xl mx-auto h-full flex flex-col">
                            <VideoAnalysis />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
