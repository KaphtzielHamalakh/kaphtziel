import {IDELSOHN_NO270,no270ScoreWord,no270WordEvents,no270WordPlan} from './idelsohn-no270-score.js';
import {PRINTED_SCORE,printedWord} from './printed-score.js';
import {BAER_SCORE,baerWord} from './baer-score.js';
import {COHEN_PROPHETICAL,cohenPropheticalWord} from './cohen-prophetical-score.js';
import {BAER_HIGH_HOLIDAY,baerHighHolidayWord} from './baer-high-holiday-score.js';
import {COHEN_PENITENTIAL,cohenPenitentialWord} from './cohen-penitential-score.js';
import {IDELSOHN_SCORE,idelsohnScoreWord,idelsohnWordEvents,idelsohnWordPlan} from './idelsohn-score.js';
import {IDELSOHN_NO266,no266ScoreWord,no266WordEvents,no266WordPlan} from './idelsohn-no266-score.js';
import {BAER_NO111_PROFILES,no111ScoreWord,no111WordEvents,no111WordPlan} from './baer-no111-score.js';
import {BAER_NO46_PROFILES,no46ScoreWord,no46WordEvents,no46WordPlan} from './baer-no46-score.js';
const no46Ids=new Set(BAER_NO46_PROFILES.map(p=>p.id));
const no111Ids=new Set(BAER_NO111_PROFILES.map(p=>p.id));
export const PRINTED_SCORE_PROFILES=Object.freeze([PRINTED_SCORE,BAER_SCORE,COHEN_PROPHETICAL,BAER_HIGH_HOLIDAY,COHEN_PENITENTIAL,IDELSOHN_SCORE,IDELSOHN_NO266,...BAER_NO111_PROFILES,...BAER_NO46_PROFILES,IDELSOHN_NO270]);
export const isPrintedScore=id=>PRINTED_SCORE_PROFILES.some(p=>p.id===id);
export function printedSourceWord(word,id){return id===IDELSOHN_NO270.id?no270ScoreWord(word):no46Ids.has(id)?no46ScoreWord(word,id):no111Ids.has(id)?no111ScoreWord(word,id):id===IDELSOHN_NO266.id?no266ScoreWord(word):id===IDELSOHN_SCORE.id?idelsohnScoreWord(word):id===PRINTED_SCORE.id?printedWord(word):id===BAER_SCORE.id?baerWord(word):id===COHEN_PROPHETICAL.id?cohenPropheticalWord(word):id===BAER_HIGH_HOLIDAY.id?baerHighHolidayWord(word):id===COHEN_PENITENTIAL.id?cohenPenitentialWord(word):null;}

// Word IDs alone do not identify a melody: No266 and No268 cover the same Hebrew.
export function printedWordEvents(id,words){if(id===IDELSOHN_NO270.id)return no270WordEvents(words);if(no46Ids.has(id))return no46WordEvents(id,words);if(no111Ids.has(id))return no111WordEvents(id,words);if(id===IDELSOHN_SCORE.id)return idelsohnWordEvents(words);if(id===IDELSOHN_NO266.id)return no266WordEvents(words);throw Error('This source has no word-candidate event provider.');}
export function printedWordPlan(id,events,options){if(events.some(e=>e.sourceProfile!==id))throw Error('Printed word plan contains a different musical source.');if(id===IDELSOHN_NO270.id)return no270WordPlan(events,options);if(no46Ids.has(id))return no46WordPlan(id,events,options);if(no111Ids.has(id))return no111WordPlan(id,events,options);if(id===IDELSOHN_SCORE.id)return idelsohnWordPlan(events,options);if(id===IDELSOHN_NO266.id)return no266WordPlan(events,options);throw Error('This source has no word-candidate timing provider.');}
