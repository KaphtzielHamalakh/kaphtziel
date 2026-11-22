// Original evidence model. Source category metadata is separately CC BY-SA4.0.
import {HISTORICAL_CATEGORY_INVENTORY as inventory} from './historical-pronunciation-categories.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const HISTORICAL_ACCENT_SOURCE=freeze({
 id:'kinnor-accent-help',version:'V5 r340 (2011) and preserved V6 6.0.428 help',
 manual:'https://doczz.net/doc/4581174/to-read-the-tropetrainer-v5-installation-and-user-s',pages:[48,49],
 archiveHelp:'AudioSettings.html',archiveHelpSha256:'997f560188a2bb977e385ce72b5e1d795f4712dfcb07884f433322221d3c51fd',
 rights:'Historical names and factual observations only. No proprietary help file, image, musical definition or voice is redistributed.',
 scope:'Six documented Accent labels, four example expressions and short descriptions. Example spellings are not IPA, complete phonological rules or musical realizations.'
});
const observation=(id,categories,description,scope='example-spellings')=>({id,categories,description,scope,categoryRelevanceReview:null,phonologicalRule:null,ipa:null,phonemes:null});
const holam=['XOLAM_HASER','VAV_XOLAM'],qamats=['QAMATS_G'],tav=['TAV_0DAG'];
const common=(cholam,qamatsSpelling,tavSpelling)=>[
 observation('cholam-examples',holam,`The help examples use ${cholam} for the vowel in Torah and Jacob. Stress, vowel quality and contextual rules are not fully specified.`),
 observation('qamats-examples',qamats,`The examples illustrate ${qamatsSpelling} in Sabbath and blessed. This does not define all qamats classes or contexts.`),
 observation('tav-examples',tav,`The construct-form and Sabbath examples end in ${tavSpelling}. No complete consonant or gemination rules are given.`)
];
export const HISTORICAL_ACCENT_PROFILES=freeze([
 {id:'ashkenazi-traditional',label:'Ashkenazi Traditional',observations:common('oy','o','s')},
 {id:'ashkenazi-modern',label:'Ashkenazi Modern',observations:common('o','o','s')},
 {id:'sephardi',label:'Sephardi',observations:common('o','a','t')},
 {id:'sephardi-traditional',label:'Sephardi Traditional',observations:[...common('o','a','t'),
  observation('pronounced-ayin',['AYIN_0DAG'],'The help explicitly describes a pronounced ayin. It gives no IPA target, duration or contextual realization.','explicit-description'),
  observation('chet-chaf-distinction',['XET_0DAG','KAF_0DAG','FKAF_0DAG'],'The help explicitly distinguishes chet from chaf. The acoustic targets and this category correspondence need review.','explicit-description')]},
 {id:'us-sephardi',label:'U.S. Sephardi',observations:[
  observation('us-cholam',holam,'The help compares this entry with Sephardi and describes a U.S. accent for cholam. It does not specify an exact vowel or diphthong.','explicit-description')]},
 {id:'galician',label:'Galician',observations:[
  observation('cholam-examples',holam,'The Torah and Jacob examples use oy. This does not settle all cholam contexts.'),
  observation('qamats-examples',qamats,'The examples use u or oo where other entries use a or o. Stress-conditioned reduction and qamats classes are not fully specified.'),
  observation('shuruq-example',['SHURUQ'],'The blessed example uses ee for its final vowel. This does not define shuruq, qubuts or reduction in every context.'),
  observation('tav-examples',tav,'The construct-form and Sabbath examples end in s. Other consonant rules remain unspecified.')]}
].map(profile=>({...profile,sourceId:HISTORICAL_ACCENT_SOURCE.id,labelStatus:'historically-attested',grammarStatus:'incomplete',playable:false,phonologicalRules:null,singingVoice:null,review:null})));
const profiles=new Map(HISTORICAL_ACCENT_PROFILES.map(p=>[p.id,p]));
const categories=new Map(inventory.catalog.map(c=>[c.id,c]));
if(profiles.size!==6||categories.size!==87||HISTORICAL_ACCENT_PROFILES.some(p=>p.observations.some(o=>o.categories.some(id=>!categories.has(id)))))throw Error('Historical pronunciation evidence needs review.');
export function historicalAccentProfile(id){const profile=profiles.get(id);if(!profile)throw Error('Unknown historical Accent label; no replacement selected.');return profile;}
export function historicalCategoryEvidence(profileId,categoryId){
 const profile=historicalAccentProfile(profileId),category=categories.get(categoryId);
 if(!category)throw Error('Unknown source pronunciation category.');
 return {categoryId,label:category.label,kind:category.kind,observations:profile.observations.filter(o=>o.categories.includes(categoryId)).map(o=>o.id),
  status:'unassigned-pronunciation-rule',phonologicalRule:null,ipa:null,phonemes:null,singingVoice:null,review:null};
}
export function historicalProfileSpecification(profileId){
 const profile=historicalAccentProfile(profileId);
 return {schema:'tropetrain-historical-pronunciation-specification-v1',revision:1,profile:structuredClone(profile),source:structuredClone(HISTORICAL_ACCENT_SOURCE),
  categorySource:{sourceCommit:inventory.sourceCommit,inputSha256:inventory.inputSha256,license:inventory.license},
  categories:inventory.catalog.map(c=>historicalCategoryEvidence(profileId,c.id)),
  contextualRules:['stress and vowel reduction','vocal and silent sheva','qamats classification','maqaf and word joins','furtive patah','gemination and shared consonants','diphthongs and vowel transitions','reading alternatives and source-edition differences'].map(topic=>({topic,rule:null,review:null})),
  counts:{sourceCategories:87,reviewedCategoryRules:0,unassignedCategoryRules:87},playable:false,singingVoice:null,
  limits:'Related help observations are documentary context, not approved rules for these source categories. Every realization remains unassigned. No melody, range, transposition, tempo, note allocation or audio timing is inferred.'};
}
export function historicalWordEvidence(study,word,sourceStyle,profileId){
 const specification=historicalProfileSpecification(profileId);
 if(!['sephardic','ashkenazic'].includes(sourceStyle))throw Error('Unknown source text style.');
 if(!word||typeof word.id!=='string'||typeof word.sourceHebrew!=='string')throw Error('Choose an unchanged marked Hebrew word.');
 const sourceWordId=word.sourceWordId??word.id,index=study?.readerIds.indexOf(sourceWordId);
 if(study&&(study.sourceCommit!==inventory.sourceCommit||index<0||study.readerHebrew[index]!==word.sourceHebrew))throw Error('The marked Hebrew or source word correspondence changed.');
 const units=[];
 if(study?.sourceSegments){
  if(study.sourceSegments.inputSha256!==inventory.inputSha256)throw Error('Source category evidence changed.');
  for(const row of study.rows)for(const cell of row.styles[sourceStyle])for(const unit of cell.units){
   if(unit.readerWordId!==sourceWordId&&unit.readerWordId!==null)continue;
   for(const variant of unit.sourceSegments.variants){
    const fragments=variant.segments.map(segment=>{
     const category=categories.get(segment.categoryId);
     if(!category||category.label!==segment.label||category.kind!==segment.kind||!['whole','first-half-shared','second-half-shared'].includes(segment.part)||segment.part!=='whole'&&!category.geminate)throw Error('Source pronunciation category or shared part changed.');
     return {sourceSegmentId:segment.id,sourceUnitId:unit.id,part:segment.part,sharedWithUnitId:segment.sharedWithUnitId,
      sourceText:segment.realizations[sourceStyle].text,...historicalCategoryEvidence(profileId,segment.categoryId),individualVowelPointRange:null,noteIds:null,audioTimes:null};
    });
    units.push({sourceUnitId:unit.id,ownerWordId:unit.readerWordId,occurrenceId:unit.readerWordId===sourceWordId?word.id:null,ownership:unit.readerWordId===null?'source-group-shared':'source-word',
     sourceRow:row.number,sourceColumn:cell.column,hebrewColumn:variant.hebrewColumn,sourceText:unit.text,sourceStress:unit.sourceStress,
     sourceLabels:structuredClone(variant.sourceLabels),sourceHebrew:structuredClone(variant.sourceHebrew),readerRanges:structuredClone(variant.readerRanges??null),letterClusterBindings:structuredClone(variant.letterClusterBindings??null),fragments});
   }
  }
 }
 const fragments=units.flatMap(u=>u.fragments);
 return {schema:'tropetrain-historical-pronunciation-word-evidence-v1',revision:1,wordId:word.id,sourceWordId,hebrew:word.sourceHebrew,selectedTranscriptionStyle:sourceStyle,
  historicalProfileId:profileId,specification,sourceCategoryStatus:study?.sourceSegments?'source-categories-available':'source-categories-unavailable',
  sourceDataLicense:'CC-BY-SA-4.0',sourceCommit:study?.sourceCommit??null,
  counts:{units:units.length,categoryReferences:fragments.length,relatedObservationReferences:fragments.filter(f=>f.observations.length).length,reviewedRealizations:0,unassignedRealizations:fragments.length},units,
  phonemes:null,notes:null,audioTimes:null,phonologicalReview:null,acousticReview:null,cantorialReview:null,playable:false,singingVoice:null};
}
