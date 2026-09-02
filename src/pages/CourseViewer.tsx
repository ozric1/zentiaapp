import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import LessonView from '../../components/LessonView';
import ChatWidget from '../../components/ChatWidget';
import { COURSE_DATA } from '../../constants';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';

const CURRICULUM_SEQUENCE = [
    0, 
    1, 2, 3, 101, 
    4, 5, 6, 102, 
    7, 8, 103, 
    9, 10, 11, 12, 104, 
    13, 14, 15, 105
];

const CourseViewer: React.FC = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const {
        progress,
        completedLessons,
        quizScores,
        saveCurrentLesson,
        markLessonCompleted,
        saveQuizScore,
        syncing
    } = useProgress();

    // 1. Resolve initial lesson from URL param (?lesson=ID) or progress
    const urlLesson = searchParams.get('lesson');
    const [currentLessonId, setCurrentLessonId] = useState<number>(() => {
        if (urlLesson !== null) {
            const parsed = parseInt(urlLesson, 10);
            if (!isNaN(parsed) && COURSE_DATA[parsed]) {
                return parsed;
            }
        }
        if (progress?.lastLessonId !== undefined && COURSE_DATA[progress.lastLessonId]) {
            return progress.lastLessonId;
        }
        return 0;
    });

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 2. Sync active lesson when URL search param changes
    useEffect(() => {
        if (urlLesson !== null) {
            const parsed = parseInt(urlLesson, 10);
            if (!isNaN(parsed) && COURSE_DATA[parsed] && parsed !== currentLessonId) {
                setCurrentLessonId(parsed);
            }
        }
    }, [urlLesson, currentLessonId]);

    // 3. Sync lesson from cloud progress on initial load if URL param is absent
    useEffect(() => {
        if (urlLesson === null && progress?.lastLessonId !== undefined && COURSE_DATA[progress.lastLessonId]) {
            setCurrentLessonId(progress.lastLessonId);
        }
    }, [progress?.lastLessonId, urlLesson]);

    // 4. Persist active lesson position in background
    useEffect(() => {
        if (currentLessonId !== undefined) {
            saveCurrentLesson(currentLessonId).catch(console.error);
        }
    }, [currentLessonId, saveCurrentLesson]);

    // 5. Scroll container to top when lesson changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [currentLessonId]);

    const lessonData = COURSE_DATA[currentLessonId];

    const handleLessonSelect = (id: number) => {
        setCurrentLessonId(id);
        setSearchParams({ lesson: id.toString() });
        setIsMobileMenuOpen(false);
    };

    const handleLessonComplete = async () => {
        // Mark current lesson as completed in Firestore
        await markLessonCompleted(currentLessonId);

        // Advance to next lesson in curriculum sequence
        const currentIndex = CURRICULUM_SEQUENCE.indexOf(currentLessonId);
        if (currentIndex !== -1 && currentIndex < CURRICULUM_SEQUENCE.length - 1) {
            const nextId = CURRICULUM_SEQUENCE[currentIndex + 1];
            setCurrentLessonId(nextId);
            setSearchParams({ lesson: nextId.toString() });
            await saveCurrentLesson(nextId);
        } else {
            alert("Congratulations! You have completed the entire Zentia World Executive Program.");
        }
    };

    const handleQuizSubmit = async (
        score: number,
        total: number,
        answers: Record<number, number>
    ) => {
        await saveQuizScore(currentLessonId, score, total, answers);
        const percentage = Math.round((score / (total || 1)) * 100);
        if (percentage >= 80) {
            await markLessonCompleted(currentLessonId);
        }
    };

    if (!lessonData) {
        return (
            <div className="flex w-full h-full bg-slate-50 items-center justify-center">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-slate-200">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Lesson Data Not Found</h2>
                    <p className="text-slate-600 mb-6">Could not load content for Lesson ID: {currentLessonId}</p>
                    <button 
                        onClick={() => {
                            setCurrentLessonId(0);
                            setSearchParams({ lesson: '0' });
                        }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Return to Introduction
                    </button>
                </div>
            </div>
        );
    }

    const isLessonCompleted = completedLessons.includes(currentLessonId);
    const existingQuizScore = quizScores[currentLessonId] || quizScores[currentLessonId.toString()] || null;

    const userInitials = currentUser?.displayName
        ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : currentUser?.email
            ? currentUser.email.slice(0, 2).toUpperCase()
            : 'EX';

    return (
        <div className="flex w-full h-screen bg-slate-50 relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full shadow-xl z-30">
                <Sidebar 
                    currentLesson={currentLessonId} 
                    onSelectLesson={handleLessonSelect}
                    completedLessons={completedLessons}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                    <div className="relative w-72 h-full bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300">
                        <button 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                        <Sidebar 
                            currentLesson={currentLessonId} 
                            onSelectLesson={handleLessonSelect}
                            completedLessons={completedLessons}
                        />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden w-full">
                {/* Top Sticky Header */}
                <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <button 
                            className="md:hidden text-slate-600 hover:text-blue-600 p-2 -ml-2 transition-colors"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <i className="fa-solid fa-bars text-xl"></i>
                        </button>
                        <Link to="/dashboard" className="hidden md:flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mr-4">
                            <i className="fa-solid fa-arrow-left"></i>
                            Dashboard
                        </Link>
                        <h2 className="text-sm md:text-lg font-bold text-slate-800 truncate border-l pl-4 border-slate-200">
                            {lessonData.title}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {syncing && (
                            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 animate-pulse">
                                <i className="fa-solid fa-cloud-arrow-up text-blue-500"></i> Syncing...
                            </span>
                        )}
                        {isLessonCompleted && (
                            <span className="hidden sm:flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 animate-in fade-in">
                                <i className="fa-solid fa-circle-check"></i> COMPLETED
                            </span>
                        )}
                        <Link
                            to="/dashboard"
                            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-gauge-high"></i>
                            <span className="hidden sm:inline">Overview</span>
                        </Link>
                        <div
                            title={currentUser?.email || 'Executive Learner'}
                            className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-200 transition-colors"
                        >
                            {userInitials}
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-12 scroll-smooth pb-20">
                    <LessonView 
                        data={lessonData} 
                        lessonId={currentLessonId} 
                        onComplete={handleLessonComplete}
                        isCompleted={isLessonCompleted}
                        existingQuizScore={existingQuizScore}
                        onQuizSubmit={handleQuizSubmit}
                    />
                </div>
            </main>

            {/* Global Chat Bot */}
            <ChatWidget />
        </div>
    );
};

export default CourseViewer;
