import {baerWords} from './baer-score-data.js';
export const BAER_SCORE=Object.freeze({
 id:'baer-1894-gen1-1-5',revision:1,name:'Printed Genesis 1:1–5 · Baer [1894], No. 939',
 status:'source transcription; independent musical/underlay review pending',license:'Public-domain printed source; new transcription CC0-1.0',
 creator:'Abraham Baer, third expanded edition [1894], No. 939, p.210; credited to S. Naumbourg’s Agudas Schirim on p.XL',
 source:'https://sammlungen.ub.uni-frankfurt.de/freimann/content/titleinfo/853537',scan:'./assets/scores/baer-1894-genesis1.png',
 description:'Complete printed Genesis 1:1–5 worked example: 52 words, 145 distinct pitched notes,one eighth rest and six unspecified fermatas. The source appendix is headed Sephardic rite; this is a bounded instrumental transcription, not a complete Torah grammar or Kinnor preset.',
 performanceNote:'The source calls this a rhythmic (recitative) application. Written durations are regularized to the selected quarter-note tempo; fermata hold lengths and expressive timing are unspecified and are not added. Modern 12-tone tuning is approximate.',
 coverage:baerWords.map(w=>w.id)
});
export const BAER_WORDS=Object.freeze(baerWords);
const byId=new Map(baerWords.map(w=>[w.id,w]));
export function baerWord(word){const row=byId.get(word.sourceWordId??word.id);return row?.sourceHebrew===word.sourceHebrew?row:null;}
