import {baerHighHolidayWords} from './baer-high-holiday-data.js';
export const BAER_HIGH_HOLIDAY=Object.freeze({
 id:'baer-1894-gen22-19',revision:1,eventPrefix:'baer113',notationGroupScope:'verse',preserveBoundaryRests:true,
 name:'Printed Genesis 22:19 · Baer [1894], No. 113 · second setting',coverageLabel:'Genesis 22:19',
 status:'source transcription; independent musical/underlay review pending',license:'Public-domain printed source; new transcription CC0-1.0',
 creator:'Abraham Baer, third expanded edition [1894], No.113, second setting, pp.37–39',
 source:'https://sammlungen.ub.uni-frankfurt.de/freimann/content/titleinfo/853537',
 scan:'./assets/scores/baer-1894-no113-ii-page37.png',meterByBar:[4,4,4,4,4,4,4,4,4],
 summary:'Printed Genesis 22:19 · Baer No.113, second High Holiday setting · 14 words,46 notes,five rests · independent review pending.',
 description:'A complete texted example in Baer’s High Holiday section: Genesis22:19, No.113, second setting. All14marked Hebrew words,46notes,two tuplets,seven slurs and five rests are retained. This is a bounded instrumental source transcription, not a complete melody grammar or Kinnor preset.',
 performanceNote:'The source is a rhythmic recitative application. Written values use your quarter-note tempo; expressive timing, modern equal temperament and instrumental articulation are approximate. The final eighth rest is retained, including in repeats and exports.',
 exportNote:'Baer [1894], No.113, second setting, pp.37–39, Genesis22:19. One printed flat with B-natural and E-flat5 retained. Unequal triplet/slur spans el / n’o; the final eighth rest is included. Regularized recitative; independent musical/underlay review pending. No singing voice or inferred coda.',
 coverage:baerHighHolidayWords.map(w=>w.id)
});
export const BAER_HIGH_HOLIDAY_WORDS=Object.freeze(baerHighHolidayWords);
const byId=new Map(baerHighHolidayWords.map(w=>[w.id,w]));
export function baerHighHolidayWord(word){const row=byId.get(word.sourceWordId??word.id);return row?.sourceHebrew===word.sourceHebrew?row:null;}
