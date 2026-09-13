export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DocumentData {
  title: string;
  sourceType: 'url' | 'pdf' | 'sample';
  sourceName: string;
  text: string;
  wordCount: number;
  characterCount: number;
  estimatedReadingTime: number;
  pages?: number;
}

export interface SummarySections {
  raw: string;
  overview?: string;
  concepts?: string;
  technologies?: string;
  conclusion?: string;
}

export interface SourceFiles {
  appPy: string;
  reqTxt: string;
  readme: string;
}
