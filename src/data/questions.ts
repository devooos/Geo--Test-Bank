import type { Question } from '../types';
import { examvedaQuestions } from './examveda';
import { uhButlerCh1Ch2 } from './uhbutler_ch1_ch2';
import { uhButlerCh3Ch4 } from './uhbutler_ch3_ch4';
import { uhButlerCh5Ch6 } from './uhbutler_ch5_ch6';
import { uhButlerCh7Ch8 } from './uhbutler_ch7_ch8';
import { uhButlerCh9Ch10 } from './uhbutler_ch9_ch10';
import { uhButlerCh11Ch12 } from './uhbutler_ch11_ch12';
import { uhButlerCh13Ch14 } from './uhbutler_ch13_ch14';
import { uhButlerCh15Ch16 } from './uhbutler_ch15_ch16';
import { uhButlerCh17Ch18 } from './uhbutler_ch17_ch18';
import { oxfordQuestions } from './oxford';

function fixDisplacedImages(questions: Question[]): Question[] {
  const list = questions.map(q => ({ ...q }));

  const refKeywords = [
    'above', 'below', 'depicted', 'diagram', 'figure', 'picture', 
    'illustration', 'graph', 'table', 'map', 'cross section', 'cross-section',
    'region a', 'region b', 'region c', 'box i', 'box ii', 'box iii',
    'bowen', 'reaction series', 'sample depicted', 'zone a', 'zone b',
    'unit a', 'unit d', 'unit g'
  ];

  const hasReference = (text: string) => {
    const lower = text.toLowerCase();
    return refKeywords.some(keyword => lower.includes(keyword));
  };

  // Keep track of which donors had their images borrowed
  const borrowedMap: Record<number, number[]> = {};

  // Step 1: Recipient search and borrow
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (q.source !== 'uh-butler') continue;

    // If this question does not have an image, but it references one in its text
    if (!q.imageUrl && hasReference(q.text)) {
      let donorIdx = -1;
      let minDistance = 999;
      
      // Look within +/- 3 positions for an image donor
      for (let offset = -3; offset <= 3; offset++) {
        if (offset === 0) continue;
        const targetIdx = i + offset;
        if (targetIdx >= 0 && targetIdx < list.length) {
          const neighbor = list[targetIdx];
          if (neighbor.source === 'uh-butler' && neighbor.imageUrl) {
            if (Math.abs(offset) < minDistance) {
              minDistance = Math.abs(offset);
              donorIdx = targetIdx;
            }
          }
        }
      }
      
      if (donorIdx !== -1) {
        // Borrow the image url
        q.imageUrl = list[donorIdx].imageUrl;
        if (!borrowedMap[donorIdx]) {
          borrowedMap[donorIdx] = [];
        }
        borrowedMap[donorIdx].push(i);
      }
    }
  }

  // Step 2: Clean up original donor questions that don't need their own image
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (q.source !== 'uh-butler') continue;
    
    // If this question had its image borrowed, and its own text does NOT contain any diagram references,
    // we clear its own imageUrl to avoid displaying it on the wrong question.
    if (q.imageUrl && borrowedMap[i] && !hasReference(q.text)) {
      q.imageUrl = null;
    }
  }

  return list;
}

const rawQuestions: Question[] = [
  ...uhButlerCh1Ch2,
  ...uhButlerCh3Ch4,
  ...uhButlerCh5Ch6,
  ...uhButlerCh7Ch8,
  ...uhButlerCh9Ch10,
  ...uhButlerCh11Ch12,
  ...uhButlerCh13Ch14,
  ...uhButlerCh15Ch16,
  ...uhButlerCh17Ch18,
  ...examvedaQuestions,
  ...oxfordQuestions
];

export const allQuestions: Question[] = fixDisplacedImages(rawQuestions);

