// A bounded transcription of the printed example, never an accent-to-melody rule.
export const PRINTED_SCORE=Object.freeze({
  id:'cohen-1902-gen22-ending',revision:1,name:'Printed score study · Cohen 1902',
  status:'source transcription; independent musical/underlay review pending',license:'Public-domain printed source; new transcription CC0-1.0',
  creator:'Francis L. Cohen · Jewish Encyclopedia, vol. III (1902), p. 539',
  source:'https://www.jewishencyclopedia.com/articles/718',
  scan:'./assets/scores/cohen-1902-genesis22.png',
  description:'Only Genesis 22:1, final two words (12–13), before the separately printed untexted CODA. Six pitches and printed durations. No general melody rules or singing voice.',
  performanceNote:'The source says “Rather briskly; without strict tempo.” This study uses a regular quarter-note beat; expressive timing and vocal delivery are not reconstructed.',
  evidenceNote:'The printed Hebrew and underlay identify Genesis 22:1. The article prose instead says Gen. xxix.; that inconsistent reference is not silently adopted.',
  coverage:['gen-22-1-12','gen-22-1-13']
});

// Each row is a source word, letter-cluster counts, stress position, then
// [MIDI pitch, quarter-note beats, printed lyric, source location] per syllable.
// Exact marks are checked before these events can be used.
export const PRINTED_WORDS=Object.freeze([
  {id:'gen-22-1-12',sourceHebrew:'וַיֹּ֥אמֶר',lengths:[1,2,2],stress:1,
    notes:[[64,.5,'way','system 3, last note'],[71,2,'yo','system 4, note 1'],[69,1,'mer','system 4, note 2']]},
  {id:'gen-22-1-13',sourceHebrew:'הִנֵּֽנִי׃',lengths:[1,1,2],stress:1,
    notes:[[64,1,'hin','system 4, note 3'],[67,2,'ne','system 4, note 4'],[67,1,'ni','system 4, note 5']]}
]);
export function printedWord(word){
  return PRINTED_WORDS.find(row=>row.id===(word.sourceWordId??word.id)&&row.sourceHebrew===word.sourceHebrew)??null;
}
