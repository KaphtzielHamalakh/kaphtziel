// Source character interpretation, not a melodic realization or syntax tree.
// Facts: UXLC Coding.html and Unicode Hebrew names/annotations. Prose classes
// are the source guide's C / D-1..D-4; contextual composites stay unresolved.
export const SIGN_ANALYSIS=Object.freeze({id:'uxlc-prose-signs',revision:1,
  source:'https://www.tanach.us/Pages/Coding.html',
  unicode:'https://www.unicode.org/Public/18.0.0/charts/PDF/U0590.pdf',
  scope:'Source-sign recognition for Torah/prose. Full contextual hierarchy and melodies are not implemented.'});
const rows=[
  [0x0591,'etnahta','Etnaḥta','ETNAHTA','D1'],[0x0592,'segolta','Segolta','SEGOL','D2'],
  [0x0593,'shalshelet','Shalshelet','SHALSHELET','D2'],[0x0594,'zakef-katon','Zakef katon','ZAQEF QATAN','D2'],
  [0x0595,'zakef-gadol','Zakef gadol','ZAQEF GADOL','D2'],[0x0596,'tipha','Tipḥa','TIPEHA','D2'],
  [0x0597,'revia','Revia','REVIA','D3'],[0x0598,'zarqa-helper','Zarqa stress helper','ZARQA',null,'helper'],
  [0x0599,'pashta','Pashta','PASHTA','D3'],[0x059a,'yetiv','Yetiv','YETIV','D3'],
  [0x059b,'tevir','Tevir','TEVIR','D3'],[0x059c,'geresh','Geresh','GERESH','D4'],
  [0x059d,'geresh-muqdam','Geresh muqdam','GERESH MUQDAM',null,'poetic'],
  [0x059e,'gershayim','Gershayim','GERSHAYIM','D4'],[0x059f,'qarnei-fara','Qarnei fara','QARNEY PARA','D4'],
  [0x05a0,'telisha-gedola','Telisha gedola','TELISHA GEDOLA','D4'],[0x05a1,'pazer','Pazer','PAZER','D4'],
  [0x05a2,'atnah-hafukh','Atnaḥ hafukh','ATNAH HAFUKH',null,'poetic'],
  [0x05a3,'munah','Munaḥ','MUNAH','C'],[0x05a4,'mahapakh','Mahapakh','MAHAPAKH','C'],
  [0x05a5,'merkha','Merkha','MERKHA','C'],[0x05a6,'merkha-kefula','Merkha kefula','MERKHA KEFULA','C'],
  [0x05a7,'darga','Darga','DARGA','C'],[0x05a8,'qadma','Qadma','QADMA','C'],
  [0x05a9,'telisha-qetana','Telisha qetana','TELISHA QETANA','C'],[0x05aa,'yerah-ben-yomo','Yeraḥ ben yomo','YERAH BEN YOMO','C'],
  [0x05ab,'ole','Ole','OLE',null,'poetic'],[0x05ac,'iluy','Iluy','ILUY',null,'poetic'],
  [0x05ad,'dehi','Deḥi','DEHI',null,'poetic'],[0x05ae,'zarqa','Zarqa (postpositive)','ZINOR','D3']
];
export const ACCENT_CATALOG=Object.freeze(rows.map(([point,id,name,unicode,proseClass,role])=>Object.freeze({
  id,point,char:String.fromCodePoint(point),code:`U+${point.toString(16).toUpperCase().padStart(4,'0')}`,
  name,unicodeName:`HEBREW ACCENT ${unicode}`,proseClass,
  role:role??(proseClass==='C'?'conjunctive':'disjunctive')
})));
const byPoint=new Map(ACCENT_CATALOG.map(s=>[s.point,s]));
const otherRows=[
  [0x05bd,'meteg','Meteg','HEBREW POINT METEG'],[0x05be,'maqaf','Maqaf','HEBREW PUNCTUATION MAQAF'],
  [0x05c0,'paseq','Paseq','HEBREW PUNCTUATION PASEQ'],[0x05c3,'sof-pasuq','Sof pasuq','HEBREW PUNCTUATION SOF PASUQ'],
  [0x05bf,'rafe','Rafe','HEBREW POINT RAFE'],[0x05c4,'upper-dot','Extraordinary upper dot','HEBREW MARK UPPER DOT'],
  [0x05c5,'lower-dot','Extraordinary lower dot','HEBREW MARK LOWER DOT'],
  [0x034f,'cgj','CGJ (source shaping control)','COMBINING GRAPHEME JOINER'],
  [0x200d,'zwj','ZWJ (source shaping control)','ZERO WIDTH JOINER']
];
const others=new Map(otherRows.map(([point,id,name,unicodeName])=>[point,Object.freeze({point,id,name,unicodeName,
  char:String.fromCodePoint(point),code:`U+${point.toString(16).toUpperCase().padStart(4,'0')}`,proseClass:null,role:'source-mark'})]));
export const SEARCH_SIGNS=Object.freeze([
  ...ACCENT_CATALOG.filter(s=>s.role!=='poetic'),
  Object.freeze({...others.get(0x05bd),id:'silluq',name:'Silluq position before sof pasuq',proseClass:'D1',role:'contextual'}),
  ...[0x05bd,0x05be,0x05c0,0x05c3].map(p=>others.get(p))
]);
export function analyzeSourceSigns(sourceHebrew){
  const signs=[],marks=[],warnings=[];let offset=0;
  const sof=sourceHebrew.lastIndexOf('׃'),silluqOffset=sof<0?-1:sourceHebrew.lastIndexOf('ֽ',sof);
  for(const char of sourceHebrew){
    const point=char.codePointAt(0),definition=byPoint.get(point)??others.get(point);
    if(definition){
      const record={char,code:definition.code,offset,id:definition.id,name:definition.name,
        unicodeName:definition.unicodeName,proseClass:definition.proseClass,role:definition.role};
      if(point===0x05bd&&offset===silluqOffset){record.id='silluq';record.name='Silluq position';record.proseClass='D1';record.role='contextual';}
      (byPoint.has(point)?signs:marks).push(record);
    }
    offset+=char.length;
  }
  if(signs.some(s=>s.id==='zarqa'))warnings.push('UXLC encodes postpositive Zarqa with U+05AE, whose Unicode name is ZINOR. Its position alone does not identify the stressed syllable.');
  if(signs.some(s=>s.id==='zarqa-helper'))warnings.push('U+0598 is a Zarqa stress helper in this prose edition; it is kept separate from the postpositive sign.');
  if(signs.some(s=>s.role==='poetic'))warnings.push('A poetic-system sign is present. This prose inspector does not infer its contextual function.');
  if(new Set(signs.map(s=>s.id)).size<signs.length)warnings.push('Repeated source signs are listed separately. Their count is not a count of musical motifs.');
  const paseq=marks.some(s=>s.id==='paseq'),hasMunah=signs.some(s=>s.id==='munah');
  if(paseq)warnings.push(hasMunah?'Munaḥ with paseq can form legarmeh. Classification of the composite requires phrase context.':'Paseq is retained as punctuation. A contextual musical function is not inferred.');
  if(marks.some(s=>s.id==='silluq'))warnings.push('The last U+05BD before sof pasuq is identified by its verse-closing position. Earlier meteg signs remain separate.');
  const musical=[...signs,...marks.filter(s=>s.id==='silluq')].sort((a,b)=>a.offset-b.offset);
  const classes=[...new Set(musical.map(s=>s.proseClass).filter(Boolean))];
  const disjunctives=new Set(musical.filter(s=>s.proseClass?.startsWith('D')).map(s=>s.id));
  if(new Set(signs.map(s=>s.id)).size>1&&disjunctives.size<=1)warnings.push('Several different signs share this word. Their combined reading is not inferred from the character names.');
  const className=paseq&&hasMunah?'ambiguous':disjunctives.size>1?'multiple':classes.find(c=>c.startsWith('D'))??classes[0]??(signs.some(s=>s.role==='helper')?'helper':null);
  if(disjunctives.size>1)warnings.push('Several disjunctive signs are encoded on this word. Their combined reading is not reduced to one hierarchy level.');
  const label=musical.length?musical.map(s=>s.name).join(' + '):marks.some(s=>s.id==='maqaf')?'Joined by maqaf':marks.some(s=>s.id==='sof-pasuq')?'Sof pasuq (no Silluq codepoint)':marks.some(s=>s.id==='meteg')?'Meteg (no cantillation accent encoded)':'No cantillation accent encoded';
  return {revision:SIGN_ANALYSIS.revision,signs,marks,label,className,warnings};
}
export function sourceClassLabel(className){
  if(className==='C')return 'Conjunctive (C)';
  if(/^D[1-4]$/u.test(className??''))return `Disjunctive · source level ${className[1]} (${className})`;
  if(className==='ambiguous')return 'Context required · Munaḥ / paseq';
  if(className==='multiple')return 'Several disjunctives · context required';
  if(className==='helper')return 'Stress helper · not a separate cadence';
  return 'No prose class assigned';
}
