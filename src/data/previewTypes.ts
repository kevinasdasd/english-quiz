export type PreviewCourseType = "preview";

export type PreviewUnitStatus = "available" | "coming-soon";

export interface PreviewCourse {
  id: string;
  type: PreviewCourseType;
  title: string;
  book: string;
  edition: string;
  grade: string;
  term: string;
  description: string;
  units: PreviewUnit[];
}

export interface PreviewUnit {
  id: string;
  label: string;
  title: string;
  status: PreviewUnitStatus;
  wordCount: number;
}

export interface PreviewWord {
  id: string;
  courseId: string;
  book: string;
  edition: string;
  grade: string;
  unit: string;
  unitId: string;
  order: number;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  translation: string;
  derivedWords: PreviewDerivedWord[];
  coreMeaning: string;
  explanation: string;
  nearSynonyms: PreviewNearSynonym[];
  corePoints: PreviewCorePoint[];
  examples: PreviewExample[];
  usageTip: string;
  quiz: PreviewQuiz | null;
}

export interface PreviewDerivedWord {
  word: string;
  partOfSpeech: string;
  translation: string;
}

export interface PreviewNearSynonym {
  word: string;
  translation: string;
  difference: string;
}

export interface PreviewCorePoint {
  phrase: string;
  translation: string;
  note: string;
}

export interface PreviewExample {
  sentence: string;
  translation: string;
}

export interface PreviewQuiz {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}
