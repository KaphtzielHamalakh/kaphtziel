import {PRINTED_SCORE,printedWord} from './printed-score.js';
import {BAER_SCORE,baerWord} from './baer-score.js';
export const PRINTED_SCORE_PROFILES=Object.freeze([PRINTED_SCORE,BAER_SCORE]);
export const isPrintedScore=id=>PRINTED_SCORE_PROFILES.some(p=>p.id===id);
export function printedSourceWord(word,id){return id===PRINTED_SCORE.id?printedWord(word):id===BAER_SCORE.id?baerWord(word):null;}
