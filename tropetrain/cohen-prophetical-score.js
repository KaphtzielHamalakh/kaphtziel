import {cohenPropheticalWords} from './cohen-prophetical-data.js';
// Literal worked example. The source explicitly makes this a hypothetical
// use of the same Torah verse, not an actual Haftarah or an arbitrary-word rule.
export const COHEN_PROPHETICAL=Object.freeze({
 id:'cohen-1902-gen22-prophetical',revision:1,eventPrefix:'cohen-prophetical',
 name:'Printed hypothetical example · Cohen 1902',
 status:'source transcription; independent musical/underlay review pending',
 license:'Public-domain printed source; new transcription CC0-1.0',
 creator:'Francis L. Cohen · Jewish Encyclopedia, vol.III (1902), p. 547',
 source:'https://www.jewishencyclopedia.com/articles/718',
 scan:'./assets/scores/cohen-1902-prophetical-gen22.png',
 coverageLabel:'Genesis 22:1',
 description:'Cohen’s hypothetical prophetical setting of Genesis 22:1: all 13original Hebrew words, 51 printed components, 50sounding attacks, five rests, one tied pair, seven slurs and three tuplets. The source imagines this Torah verse read as if it belonged to a lesson from the Prophets. This is a worked instrumental example, not an actual Haftarah passage, complete melody grammar or singing voice.',
 summary:'Cohen 1902, p. 547 · hypothetical prophetical Genesis 22:1 · source transcription, review pending · no added coda.',
 performanceNote:'The source says “Rather briskly: without strict tempo.” Written durations are regularized to your independent quarter-note tempo. Modern 12-tone tuning and instrumental articulation are approximate; no expressive timing or untexted coda is added.',
 exportNote:'Cohen 1902, p. 547: hypothetical prophetical setting of the same Genesis 22:1 Torah verse. Not an actual Haftarah passage or a complete musical grammar.51 printed components/50 attacks/41 quarter-note beats, five eighth rests, one tied pair. Source durations regularized; no untexted coda or singing voice.',
 evidenceNote:'The actual marked Hebrew and underlay identify Genesis 22:1; the article prose instead says Gen. xxix. Its inconsistency is preserved as a source discrepancy.',
 meterByBar:Object.freeze([4,4,4,3,3,3,3,3,3,3,4,4,4]),
 coverage:Object.freeze(cohenPropheticalWords.map(w=>w.id))
});
export function cohenPropheticalWord(word){return cohenPropheticalWords.find(w=>w.id===(word.sourceWordId??word.id)&&w.sourceHebrew===word.sourceHebrew)??null;}
