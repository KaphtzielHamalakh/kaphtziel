import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay,SOURCE_SYLLABLE_UNDERLAY}from'../source-syllable-underlay.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),data=j('torah-display'),lib=new PronunciationLibrary(data,{underlay:j('torah-underlay'),segments:j('torah-segments')}),adapter=new SourceSyllableUnderlay(lib);
const counts={readerWords:0,available:0,unavailable:0,syllables:0,paths:0,sourceUnitReferences:0,sharedConsonantReferences:0},gaps={},examples={},conflicts=[],hash=createHash('sha256');
for(const group of data.groups)for(const [i,id]of group.readerIds.entries()){
 const w={id,sourceHebrew:group.readerHebrew[i]},p=adapter.word(w);counts.readerWords++;counts[p.status==='available'?'available':'unavailable']++;counts.syllables+=p.syllables.length;counts.paths+=p.paths.length;
 for(const path of p.paths)for(const u of path.units){counts.sourceUnitReferences++;counts.sharedConsonantReferences+=(u.hebrewClusterRanges??[]).filter(r=>r.role==='shared-consonant').length;}
 if(p.status!=='available'){gaps[p.reason]=(gaps[p.reason]??0)+1;(examples[p.reason]??=[]);if(examples[p.reason].length<12)examples[p.reason].push({id,hebrew:w.sourceHebrew});if(p.reason==='conflicting-source-paths')conflicts.push({id,hebrew:w.sourceHebrew,paths:p.paths.map(p=>({style:p.style,row:p.sourceRow,column:p.sourceColumn,units:p.units.map(u=>({id:u.sourceUnitId,start:u.start,end:u.end,stress:u.sourceStress}))}))});}
 if(p.status==='available'&&p.syllables.map(s=>s.sourceHebrew).join('')!==w.sourceHebrew)throw Error('Marked Hebrew changed: '+id);
 hash.update(JSON.stringify([id,w.sourceHebrew,p.status,p.reason,p.syllables.map(s=>[s.sourceHebrew,s.writtenRange,s.stress,s.sourceUnitIds])])+'\n');
}
const record={schema:'tropetrain-source-syllable-playback-audit-v1',revision:1,source:SOURCE_SYLLABLE_UNDERLAY,counts,gaps,gapExamples:examples,conflicts,assignmentSha256:hash.digest('hex'),
 method:'Every mapped Torah word; all individually owned paths in both original MAM text styles must cover complete unchanged marked Hebrew with identical syllable boundaries/stress. Every path/unit/shared reference is retained. No source-only or combined unit is assigned a substitute range.',
 performance:{melodyId:'original-demo-01',kind:'original-instrumental-demonstration',sourceDurationsAssigned:false,historicalMelodyGrammar:null,phonemes:null,singingVoice:null,review:null},
 attribution:'Hebrew Wikisource / Phonetic MAM, Benjamin Denckla; original data and derived source correspondence CC-BY-SA-4.0. Original instrumental note/timing policy remains CC0.',
 limits:'Structural correspondence, not independent linguistic/cantorial review or a historical musical realization. All recordings and original source data remain unchanged. No Kinnor pronunciation equivalence or new voice.'};
if(counts.readerWords!==79985||counts.available!==77790||counts.unavailable!==2195||counts.syllables!==187261)throw Error('Review changed whole-Torah coverage: '+JSON.stringify(counts));
writeFileSync(new URL('../docs/SOURCE-SYLLABLE-PLAYBACK.json',import.meta.url),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({sourceSyllablePlayback:counts,gaps,assignmentSha256:record.assignmentSha256}));
