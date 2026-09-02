import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Briefcase, 
    MessageSquare, 
    BrainCircuit, 
    TrendingUp, 
    GraduationCap,
    ArrowRight,
    Users,
    Video,
    ShieldCheck,
    LayoutDashboard,
    User as UserIcon
} from 'lucide-react';

const LandingPage: React.FC = () => {
    const { currentUser } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                Z
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-blue-900">Zentia</span>
                        </Link>
                        <div className="hidden md:flex space-x-8">
                            <a href="#marketplace" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Programs</a>
                            <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">For Corporates</a>
                            <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">For Trainers</a>
                            <Link to="/dashboard" className="text-slate-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-1.5">
                                <LayoutDashboard size={16} />
                                <span>AI Dashboard</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            {currentUser ? (
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                        <UserIcon size={14} className="text-blue-600" />
                                        <span>{currentUser.displayName || currentUser.email}</span>
                                    </div>
                                    <Link
                                        to="/dashboard"
                                        className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 text-sm"
                                    >
                                        <span>Dashboard</span>
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-slate-600 font-medium hover:text-blue-600 hidden md:block"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-blue-900 text-white pt-24 pb-32">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <span className="inline-block py-1 px-3 rounded-full bg-blue-800/50 text-blue-200 text-sm font-semibold mb-6 border border-blue-700/50">
                            The Premium Executive Coaching Network
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                            Elevate Leadership. <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-300">Empower Teams.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto font-light">
                            Connecting forward-thinking corporates with world-class expert trainers for impactful, AI-enhanced learning experiences.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            {currentUser ? (
                                <Link
                                    to="/programs/business-english"
                                    className="bg-white text-blue-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
                                >
                                    Resume Business English <ArrowRight size={20} />
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="bg-white text-blue-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
                                >
                                    Start Learning <ArrowRight size={20} />
                                </Link>
                            )}
                            <a
                                href="#marketplace"
                                className="bg-blue-800/40 text-white border border-blue-700/50 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-800/60 transition-all backdrop-blur-sm flex items-center justify-center"
                            >
                                Explore Programs
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform Value Proposition */}
            <section id="how-it-works" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">How Zentia Works</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">A seamless intermediary platform bridging the gap between corporate learning needs and top-tier educational delivery.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                <Briefcase size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">For Corporates</h3>
                            <p className="text-slate-600">Discover and book specialized training programs for your teams. Track ROI and progress via our AI-powered dashboards.</p>
                        </div>
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-6">
                                <Users size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Expert Trainers</h3>
                            <p className="text-slate-600">List your courses, manage bookings, and deliver content seamlessly—either on-site at the company or online via our platform.</p>
                        </div>
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Verified Quality</h3>
                            <p className="text-slate-600">Every trainer and curriculum is vetted. Programs are augmented with our proprietary AI Sandbox and Smart Nudge features.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Programs Marketplace */}
            <section id="marketplace" className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-4">Featured Programs</h2>
                            <p className="text-lg text-slate-600 max-w-2xl">Browse our curated selection of high-impact corporate training programs.</p>
                        </div>
                        <a href="#marketplace" className="hidden md:flex text-blue-600 font-semibold items-center gap-2 hover:text-blue-700">
                            View All <ArrowRight size={18} />
                        </a>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* 1. Business English (Links to existing app) */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 group flex flex-col">
                            <div className="h-48 bg-gradient-to-br from-blue-900 to-blue-700 p-6 flex items-end relative overflow-hidden">
                                <MessageSquare className="absolute -top-4 -right-4 text-white/10" size={120} />
                                <span className="bg-white text-blue-900 text-xs font-bold px-3 py-1 rounded-full absolute top-4 left-4 shadow-sm">Bestseller</span>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3 font-medium">
                                    <Video size={16} /> Online & On-site
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">Business English Training</h3>
                                <p className="text-slate-600 mb-6 flex-1">The definitive 15-module Executive English Program designed for senior leadership and management.</p>
                                <Link 
                                    to="/programs/business-english" 
                                    className="w-full py-3 rounded-xl border-2 border-blue-100 text-blue-600 font-bold text-center hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    View Program <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* 2. AI Automation */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 group flex flex-col opacity-80 hover:opacity-100">
                            <div className="h-48 bg-gradient-to-br from-purple-900 to-indigo-700 p-6 flex items-end relative overflow-hidden">
                                <BrainCircuit className="absolute -top-4 -right-4 text-white/10" size={120} />
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3 font-medium">
                                    <Video size={16} /> Online Only
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">AI Automation for Leaders</h3>
                                <p className="text-slate-600 mb-6 flex-1">Learn to integrate LLMs and automation into your daily operational workflows to 10x team productivity.</p>
                                <button className="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-400 font-bold text-center cursor-not-allowed">
                                    Coming Soon
                                </button>
                            </div>
                        </div>

                        {/* 3. Effective Communication */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 group flex flex-col opacity-80 hover:opacity-100">
                            <div className="h-48 bg-gradient-to-br from-teal-900 to-emerald-700 p-6 flex items-end relative overflow-hidden">
                                <TrendingUp className="absolute -top-4 -right-4 text-white/10" size={120} />
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3 font-medium">
                                    <GraduationCap size={16} /> On-site Intensive
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">High-Stakes Communication</h3>
                                <p className="text-slate-600 mb-6 flex-1">Master negotiation, conflict resolution, and motivational speaking for C-suite executives.</p>
                                <button className="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-400 font-bold text-center cursor-not-allowed">
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
