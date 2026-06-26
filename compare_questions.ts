import { uhButlerCh1Ch2 } from './src/data/uhbutler_ch1_ch2';
import { uhButlerCh3Ch4 } from './src/data/uhbutler_ch3_ch4';
import { uhButlerCh5Ch6 } from './src/data/uhbutler_ch5_ch6';
import { uhButlerCh7Ch8 } from './src/data/uhbutler_ch7_ch8';
import { uhButlerCh9Ch10 } from './src/data/uhbutler_ch9_ch10';
import { uhButlerCh11Ch12 } from './src/data/uhbutler_ch11_ch12';
import { uhButlerCh13Ch14 } from './src/data/uhbutler_ch13_ch14';
import { uhButlerCh15Ch16 } from './src/data/uhbutler_ch15_ch16';
import { uhButlerCh17Ch18 } from './src/data/uhbutler_ch17_ch18';

const butlerQuestions = [
  ...uhButlerCh1Ch2,
  ...uhButlerCh3Ch4,
  ...uhButlerCh5Ch6,
  ...uhButlerCh7Ch8,
  ...uhButlerCh9Ch10,
  ...uhButlerCh11Ch12,
  ...uhButlerCh13Ch14,
  ...uhButlerCh15Ch16,
  ...uhButlerCh17Ch18,
];

console.log('Total Butler Questions:', butlerQuestions.length);

if (butlerQuestions.length > 0) {
  console.log('First Butler Question Text:', butlerQuestions[0].text);
  console.log('First Butler Question Choices:', JSON.stringify(butlerQuestions[0].choices));
}
