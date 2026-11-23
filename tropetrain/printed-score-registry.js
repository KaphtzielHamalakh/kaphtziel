import {PRINTED_SCORE,printedWord} from './printed-score.js';
import {BAER_SCORE,baerWord} from './baer-score.js';
import {COHEN_PROPHETICAL,cohenPropheticalWord} from './cohen-prophetical-score.js';
import {BAER_HIGH_HOLIDAY,baerHighHolidayWord} from './baer-high-holiday-score.js';
import {COHEN_PENITENTIAL,cohenPenitentialWord} from './cohen-penitential-score.js';
export const PRINTED_SCORE_PROFILES=Object.freeze([PRINTED_SCORE,BAER_SCORE,COHEN_PROPHETICAL,BAER_HIGH_HOLIDAY,COHEN_PENITENTIAL]);
export const isPrintedScore=id=>PRINTED_SCORE_PROFILES.some(p=>p.id===id);
export function printedSourceWord(word,id){return id===PRINTED_SCORE.id?printedWord(word):id===BAER_SCORE.id?baerWord(word):id===COHEN_PROPHETICAL.id?cohenPropheticalWord(word):id===BAER_HIGH_HOLIDAY.id?baerHighHolidayWord(word):id===COHEN_PENITENTIAL.id?cohenPenitentialWord(word):null;}
