import React from 'react';
import { LessonData, ExpressionBank } from '../types';
import SlideCard from './SlideCard';
import Exercise from './Exercise';
import VocabDragDrop from './VocabDragDrop';
import VocabContextBuilder from './VocabContextBuilder';
import ChartVisual from './ChartVisual';
import IntroView from './IntroView';
import ProgressCheck from './ProgressCheck';

import { QuizScoreRecord } from '../src/types/progress';

interface LessonViewProps {
    data: LessonData;
    lessonId: number;
    onComplete?: () => void;
    isCompleted?: boolean;
    existingQuizScore?: QuizScoreRecord | null;
    onQuizSubmit?: (score: number, total: number, answers: Record<number, number>) => Promise<any> | void;
}

const ExpressionBankSection: React.FC<{ data: ExpressionBank }> = ({ data }) => (
    <div className="bg-slate-900 text-slate-200 rounded-xl p-6 mb-12 shadow-xl border border-slate-700">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                <i className="fa-solid fa-briefcase text-lg"></i>
            </div>
            <div>
                <h4 className="font-bold text-white text-lg">{data.title}</h4>
                <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">Executive Toolkit</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Key Expressions</h5>
                <ul className="space-y-3">
                    {data.phrases.map((phrase, idx) => (
                        <li key={idx} className="flex items-start gap-3 group">
                            <i className="fa-solid fa-angle-right text-blue-500 mt-1.5 text-xs group-hover:translate-x-1 transition-transform"></i>
                            <span className="font-medium text-slate-300 group-hover:text-white transition-colors">{phrase}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700/50">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Contextual Application</h5>
                <div className="space-y-4">
                    {data.samples.map((sample, idx) => (
                        <div key={idx} className="flex gap-3">
                            <i className="fa-solid fa-quote-left text-slate-600 text-sm shrink-0 mt-1"></i>
                            <p className="text-sm text-slate-400 italic leading-relaxed">"{sample}"</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const LessonView: React.FC<LessonViewProps> = ({
    data,
    lessonId,
    onComplete,
    isCompleted,
    existingQuizScore,
    onQuizSubmit
}) => {
    
    // Intro View Wrapper
    if (data.type === 'intro') {
        return (
            <div className="flex flex-col h-full">
                <IntroView />
                <div className="mt-8 flex justify-center pb-12">
                    <button 
                        onClick={onComplete}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-3 transform hover:scale-105"
                    >
                        <span>Start Course</span>
                        <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        );
    }

    // Quiz View Wrapper
    if (data.type === 'quiz' && data.quiz) {
        return (
            <div className="flex flex-col h-full">
                <ProgressCheck
                    title={data.title}
                    questions={data.quiz}
                    lessonId={lessonId}
                    existingScore={existingQuizScore}
                    onQuizSubmit={onQuizSubmit}
                    isCompleted={isCompleted}
                />
                <div className="mt-12 flex justify-center pb-24">
                    <button 
                        onClick={onComplete}
                        className={`
                            px-8 py-4 rounded-full font-bold shadow-lg transition-all flex items-center gap-3
                            ${isCompleted 
                                ? 'bg-slate-100 border-2 border-slate-200 text-slate-500 hover:bg-slate-200' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-xl'}
                        `}
                    >
                        {isCompleted ? (
                            <>
                                <i className="fa-solid fa-check text-green-600"></i>
                                <span>Assessment Complete</span>
                                <i className="fa-solid fa-forward text-slate-400"></i>
                            </>
                        ) : (
                            <>
                                <span>Mark Complete & Continue</span>
                                <i className="fa-solid fa-arrow-right"></i>
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Standard Lesson View
    return (
        <div className="max-w-5xl mx-auto pb-24 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{data.subtitle}</h1>
                <p className="text-slate-600 text-lg mb-6 max-w-3xl leading-relaxed">{data.context}</p>
                
                {/* Objectives */}
                <div className="bg-white border border-slate-200 border-l-4 border-l-slate-900 rounded-r-lg p-5 shadow-sm mb-6">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Executive Learning Objectives:</span>
                    <div className="space-y-2">
                        {data.objectives?.map((obj, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-700">
                                <i className="fa-solid fa-check text-blue-500 text-xs"></i> 
                                <span>{obj}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warm Up */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
                     <div className="bg-white p-2 rounded-full shadow-sm text-blue-600 shrink-0">
                        <i className="fa-regular fa-comments text-xl"></i>
                     </div>
                     <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide block mb-1">STRATEGIC DISCUSSION</span>
                        <p className="text-slate-800 font-medium">{data.greeting?.text}</p>
                     </div>
                </div>
            </div>

            {/* Slides Section */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Concept Slides</h3>
                </div>
                
                {/* Special Chart for Data Lessons */}
                {data.chart && (
                    <ChartVisual data={data.chart} />
                )}

                {data.slides?.map((slide, idx) => (
                    /* Key updated to include lessonId to force fresh mount on lesson change */
                    <SlideCard key={`${lessonId}-${idx}`} slide={slide} />
                ))}
            </div>

            {/* Expression Bank (New) */}
            {data.expressionBank && (
                <ExpressionBankSection data={data.expressionBank} />
            )}

            {/* Controlled Practice (Grammar) */}
            {data.controlled && (
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Executive Structure Practice</h3>
                    </div>
                    <Exercise data={data.controlled} lessonId={lessonId} />
                </div>
            )}

            {/* Vocabulary Section */}
            {data.vocab && (
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Strategic Vocabulary</h3>
                    </div>
                    {/* Part 1: Definition Match */}
                    <VocabDragDrop vocab={data.vocab} lessonId={lessonId} />
                    
                    {/* Part 2: Context Builder (New) */}
                    {data.vocabPractice && (
                        <div className="mt-12">
                            <VocabContextBuilder 
                                data={data.vocabPractice} 
                                vocabList={data.vocab} 
                                lessonId={lessonId} 
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Production Section */}
            <div className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Executive Simulation</h3>
                </div>

                {/* Activities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {data.activity1 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 border-l-4 border-l-amber-500">
                                <h4 className="font-bold text-slate-800">Scenario</h4>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h5 className="font-bold text-slate-900 mb-2 text-lg">{data.activity1.title}</h5>
                                <p className="text-sm text-slate-600 mb-4">{data.activity1.context}</p>
                                <div className="bg-slate-50 p-4 rounded border border-slate-100 mb-4 flex-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Task</span>
                                    <p className="text-slate-800 font-medium text-sm leading-relaxed">{data.activity1.task}</p>
                                </div>
                                <p className="text-xs text-slate-500 italic bg-amber-50 px-3 py-2 rounded text-amber-800 inline-block self-start">
                                    <i className="fa-solid fa-lightbulb mr-1"></i> {data.activity1.prompt}
                                </p>
                            </div>
                        </div>
                    )}

                    {data.activity2 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 border-l-4 border-l-emerald-500">
                                <h4 className="font-bold text-slate-800">Roleplay</h4>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h5 className="font-bold text-slate-900 mb-4 text-lg">{data.activity2.title}</h5>
                                <div className="flex gap-4 mb-5">
                                    <div className="flex-1 bg-slate-50 p-3 rounded border border-slate-100">
                                        <span className="bg-slate-200 text-slate-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Trainer</span>
                                        <p className="text-sm font-medium text-slate-700 mt-1">{data.activity2.trainerRole}</p>
                                    </div>
                                    <div className="flex-1 bg-blue-50 p-3 rounded border border-blue-100">
                                        <span className="bg-blue-200 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">You</span>
                                        <p className="text-sm font-medium text-blue-900 mt-1">{data.activity2.yourRole}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-auto">
                                    {data.activity2.steps?.map((step, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                            <i className="fa-solid fa-angle-right text-slate-300 text-xs shrink-0"></i>
                                            <span className="leading-snug">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Challenge Card */}
                {data.challenge && (
                    <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl p-8 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
                                <i className="fa-solid fa-trophy text-yellow-400 text-xl"></i>
                                <h4 className="font-bold text-lg tracking-wide">Executive Challenge</h4>
                            </div>
                            
                            <h5 className="font-bold text-2xl mb-2">{data.challenge.title}</h5>
                            <p className="text-indigo-200 mb-6">{data.challenge.context}</p>
                            
                            <div className="bg-black/20 backdrop-blur-sm p-5 rounded-lg border border-white/10">
                                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest block mb-2">Your Mission</span>
                                <p className="font-medium text-lg leading-relaxed">{data.challenge.task}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Feedback Footer */}
            {data.feedback && (
                <div className="bg-slate-900 text-slate-300 p-8 rounded-xl flex items-start gap-5 shadow-lg border border-slate-800 mb-12">
                    <i className="fa-solid fa-clipboard-check text-2xl text-blue-500 mt-1"></i>
                    <div>
                        <h4 className="font-bold text-white text-lg mb-2">Strategic Outcome</h4>
                        <p className="leading-relaxed text-slate-400">{data.feedback}</p>
                    </div>
                </div>
            )}

            {/* Completion Button */}
            <div className="flex justify-center border-t border-slate-200 pt-8">
                <button 
                    onClick={onComplete}
                    className={`
                        px-8 py-4 rounded-full font-bold shadow-xl transition-all transform hover:scale-105 flex items-center gap-3 text-lg
                        ${isCompleted 
                            ? 'bg-white border-2 border-green-500 text-green-700 hover:bg-green-50' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/40'}
                    `}
                >
                    {isCompleted ? (
                        <>
                            <i className="fa-solid fa-circle-check"></i>
                            <span>Module Completed</span>
                            <i className="fa-solid fa-forward ml-2 text-sm opacity-70"></i>
                        </>
                    ) : (
                        <>
                            <span>Complete & Continue</span>
                            <i className="fa-solid fa-arrow-right"></i>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LessonView;