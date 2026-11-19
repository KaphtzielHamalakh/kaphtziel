import {printedWords} from './printed-score-data.js';
// A bounded transcription of the printed example, never an accent-to-melody rule.
export const PRINTED_SCORE=Object.freeze({
  id:'cohen-1902-gen22-ending',revision:2,name:'Printed score study · Cohen 1902',
  status:'source transcription; independent musical/underlay review pending',license:'Public-domain printed source; new transcription CC0-1.0',
  creator:'Francis L. Cohen · Jewish Encyclopedia, vol. III (1902), p. 539',
  source:'https://www.jewishencyclopedia.com/articles/718',
  scan:'./assets/scores/cohen-1902-genesis22.png',
  description:'Genesis 22:1, all 13 words, before the separately printed untexted CODA. 52 printed components, 50 sounding attacks, four rests and two tied pairs. No general melody rules or singing voice.',
  performanceNote:'The source says “Rather briskly; without strict tempo.” This study uses a regular quarter-note beat; expressive timing and vocal delivery are not reconstructed.',
  evidenceNote:'The printed Hebrew and underlay identify Genesis 22:1. The article prose instead says Gen. xxix.; that inconsistent reference is not silently adopted.',
  coverage:printedWords.map(w=>w.id)
});

// The stable profile id is retained for existing saved assignments; revision 2 expands coverage.
export const PRINTED_WORDS=Object.freeze(printedWords);
export function printedWord(word){
  return PRINTED_WORDS.find(row=>row.id===(word.sourceWordId??word.id)&&row.sourceHebrew===word.sourceHebrew)??null;
}
