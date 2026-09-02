import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { QuizScoreRecord } from '../src/types/progress';

interface ProgressCheckProps {
    title: string;
    questions: QuizQuestion[];
    lessonId: number;
    existingScore?: QuizScoreRecord | null;
    onQuizSubmit?: (score: number, total: number, answers: Record<number, number>) => Promise<any> | void;
    isCompleted?: boolean;
}

const ProgressCheck: React.FC<ProgressCheckProps> = ({
    title,
    questions,
    lessonId,
    existingScore,
    onQuizSubmit,
    isCompleted
}) => {
    const [answers, setAnswers] = useState<{ [key: number]: number }>(() => existingScore?.answers || {});
    const [showResults, setShowResults] = useState<boolean>(() => !!existingScore || !!isCompleted);
    const [score, setScore] = useState<number>(() => existingScore?.score || 0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Sync state when lesson or existingScore changes
    useEffect(() => {
        if (existingScore) {
            setAnswers(existingScore.answers || {});
            setShowResults(true);
            setScore(existingScore.score);
        } else {
            setAnswers({});
            setShowResults(false);
            setScore(0);
        }
    }, [lessonId, existingScore]);

    const handleSelect = (qId: number, optionIdx: number) => {
        if (showResults) return; // Prevent changing after submission
        setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    };

    const handleSubmit = async () => {
        let newScore = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                newScore++;
            }
        });
        setScore(newScore);
        setShowResults(true);

        if (onQuizSubmit) {
            setIsSubmitting(true);
            try {
                await onQuizSubmit(newScore, questions.length, answers);
            } catch (err) {
                console.error('Failed to submit quiz score:', err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleRetake = () => {
        setShowResults(false);
        setAnswers({});
        setScore(0);
    };

    const getScoreColor = () => {
        const percentage = Math.round((score / (questions.length || 1)) * 100);
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreMessage = () => {
        const percentage = Math.round((score / (questions.length || 1)) * 100);
        if (percentage === 100) return 'Outstanding. You have mastered this module.';
        if (percentage >= 80) return 'Excellent work. You are ready to proceed.';
        if (percentage >= 60) return 'Good, but review the explanations for missed questions.';
        return 'We recommend reviewing the module units before proceeding.';
    };

    return (
        <div className="max-w-4xl mx-auto pb-24 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-slate-900 text-white mb-4 shadow-lg">
                    <i className="fa-solid fa-graduation-cap text-3xl"></i>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
                <p className="text-slate-500 uppercase tracking-widest font-bold text-sm">Competency Assessment</p>
            </div>

            <div className="space-y-8">
                {questions.map((q, idx) => {
                    const isCorrect = answers[q.id] === q.correctAnswer;

                    return (
                        <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-bold text-slate-700">Question {idx + 1}</span>
                                {showResults && (
                                    <span className={`text-sm font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                )}
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-500 italic mb-2 font-serif">{q.scenario}</p>
                                <h4 className="font-bold text-slate-900 text-lg mb-6">{q.question}</h4>

                                <div className="space-y-3">
                                    {q.options.map((opt, optIdx) => {
                                        let btnClass = 'w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-center ';

                                        if (showResults) {
                                            if (optIdx === q.correctAnswer) {
                                                btnClass += 'bg-green-50 border-green-500 text-green-900 font-bold';
                                            } else if (answers[q.id] === optIdx) {
                                                btnClass += 'bg-red-50 border-red-500 text-red-900 opacity-70';
                                            } else {
                                                btnClass += 'bg-white border-slate-200 text-slate-400 opacity-50';
                                            }
                                        } else {
                                            if (answers[q.id] === optIdx) {
                                                btnClass += 'bg-blue-50 border-blue-500 text-blue-900 shadow-md ring-1 ring-blue-500';
                                            } else {
                                                btnClass += 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300';
                                            }
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                onClick={() => handleSelect(q.id, optIdx)}
                                                disabled={showResults}
                                                className={btnClass}
                                            >
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 shrink-0 ${
                                                    showResults && optIdx === q.correctAnswer ? 'border-green-600 bg-green-600 text-white' :
                                                    showResults && answers[q.id] === optIdx ? 'border-red-500 text-red-500' :
                                                    answers[q.id] === optIdx ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                                }`}>
                                                    {showResults && optIdx === q.correctAnswer ? <i className="fa-solid fa-check text-xs"></i> :
                                                     showResults && answers[q.id] === optIdx ? <i className="fa-solid fa-xmark text-xs"></i> :
                                                     String.fromCharCode(65 + optIdx)}
                                                </div>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>

                                {showResults && (
                                    <div className="mt-6 p-4 bg-slate-50 border-l-4 border-slate-400 rounded-r text-sm text-slate-700 animate-in fade-in">
                                        <span className="font-bold text-slate-900 block mb-1">Explanation:</span>
                                        {q.explanation}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!showResults ? (
                <div className="mt-10 text-center">
                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(answers).length !== questions.length || isSubmitting}
                        className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <i className="fa-solid fa-spinner fa-spin"></i> Saving Score...
                            </span>
                        ) : (
                            'Submit Assessment'
                        )}
                    </button>
                    {Object.keys(answers).length !== questions.length && (
                        <p className="text-slate-400 text-xs mt-3 uppercase tracking-wide">Please answer all questions</p>
                    )}
                </div>
            ) : (
                <div className="mt-12 bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center animate-in zoom-in duration-300">
                    <p className="text-slate-500 uppercase tracking-widest font-bold text-xs mb-2">Final Score</p>
                    <div className={`text-5xl font-black mb-4 ${getScoreColor()}`}>
                        {Math.round((score / (questions.length || 1)) * 100)}%
                    </div>
                    <p className="text-xl font-serif text-slate-800 mb-6">{getScoreMessage()}</p>
                    <div className="flex justify-center items-center gap-4">
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="text-blue-600 font-bold hover:underline"
                        >
                            Review Answers
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            onClick={handleRetake}
                            className="text-slate-600 font-medium hover:text-slate-900 hover:underline"
                        >
                            Retake Assessment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgressCheck;