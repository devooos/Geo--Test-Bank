export interface Question {
  id: string;
  globalId: number;
  source: 'examveda' | 'uh-butler' | 'oxford';
  chapter: string;
  chapterNum: number;
  chapterTitle: string;
  text: string;
  choices: {
    a?: string;
    b?: string;
    c?: string;
    d?: string;
    e?: string;
    [key: string]: string | undefined;
  };
  correctAnswer: string;
  imageUrl: string | null;
  category: string;
  tags: string[];
  reference?: string;
  tableHtml?: string | null;
}
