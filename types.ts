export interface Slide {
    title: string;
    context: string;
    dialogue: { spk: string; txt: string }[];
    bad: string[];
    good: string[];
    expressions: string[];
}

export interface Sentence {
    pre: string;
    blank: string;
    post: string;
}

export interface ControlledPractice {
    title: string;
    words: string[];
    sentences: Sentence[];
}

export interface VocabItem {
    id: string;
    word: string;
    def: string;
}

export interface VocabContextExercise {
    title: string;
    sentences: Sentence[]; // Uses the same structure, but answers must match VocabItem words
}

export interface ChartPoint {
    label: string;
    value: number;
}

export interface ChartData {
    title: string;
    yAxisLabel: string;
    data: ChartPoint[];
    trendDescription: string; // e.g., "Rocketed then leveled off"
}

export interface Challenge {
    title: string;
    context: string;
    task: string;
}

export interface Activity {
    title: string;
    context?: string;
    task?: string;
    prompt?: string;
    trainerRole?: string;
    yourRole?: string;
    steps?: string[];
}

export interface QuizQuestion {
    id: number;
    question: string;
    scenario: string;
    options: string[];
    correctAnswer: number; // Index of the correct option (0-3)
    explanation: string;
}

export interface ExpressionBank {
    title: string;
    phrases: string[];
    samples: string[];
}

export interface LessonData {
    type?: 'intro' | 'quiz'; // Added 'quiz' type
    title: string;
    subtitle?: string;
    context?: string;
    objectives?: string[];
    greeting?: { text: string };
    chart?: ChartData;
    slides?: Slide[];
    expressionBank?: ExpressionBank; // New field for executive expressions
    controlled?: ControlledPractice;
    vocab?: VocabItem[];
    vocabPractice?: VocabContextExercise;
    challenge?: Challenge;
    activity1?: Activity;
    activity2?: Activity;
    feedback?: string;
    content?: string;
    quiz?: QuizQuestion[]; // New field for assessment data
}

export interface CourseData {
    [key: number]: LessonData;
}

export * from './src/types/progress';