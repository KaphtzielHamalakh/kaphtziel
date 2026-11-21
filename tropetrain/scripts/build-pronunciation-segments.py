# SPDX-License-Identifier: GPL-3.0-only
"""Closed factual source-category projection; no IPA or acoustic realization.

Uses the unchanged, pinned GPL3 computation closure. Emits only named source
categories, the two already-published transcription mappings and syllable-local
category references. No raw calculation/audit objects enter the output.
"""
from pathlib import Path
import collections,gzip,hashlib,json,re,sys,tempfile,zipfile
ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=ROOT/'assets/pronunciation/phonetic-mam-computation-sources.zip'
SOURCE=ROOT/'data/pronunciation/torah-display.json.gz'
UNDERLAY=ROOT/'data/pronunciation/torah-underlay.json.gz'
COMMIT='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
STYLES=['sephardic','ashkenazic']
def digest(raw):return hashlib.sha256(raw).hexdigest()
def encoded(value):return (json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n').encode()
def flatten(tokens):
 return ''.join(t if isinstance(t,str) else 'ᵉ' if t['kind']=='superscript-e' else flatten(t['content']) for t in tokens)
def label(name):
 special={'SHEVA_NA':'Vocal sheva','SHEVA_NAX':'Silent sheva','VARIKA_WITH_GENERIC_SHEVA':'Varika with generic sheva','VARIKA_WITH_VOCAL_SHEVA':'Varika with vocal sheva','XSEGOL':'Ḥataf segol','XPATAX':'Ḥataf pataḥ','XQAMATS':'Ḥataf qamats','XIRIQ_Q':'Ḥiriq qatan · source category','XIRIQ_G':'Ḥiriq gadol · source category','TSERE':'Tsere','SEGOL_V':'Segol','PATAX':'Pataḥ','QAMATS_G':'Qamats gadol','QAMATS_Q':'Qamats qatan','VAV_XOLAM':'Ḥolam with vav','XOLAM_HASER':'Ḥolam ḥaser','QUBUTS':'Qubuts','SHURUQ':'Shuruq','SHURUQ_PART1_OF_YOD_DIPHTHONG':'Yod diphthong · shuruq part','VAV_XOLAM_PART1_OF_YOD_DIPHTHONG':'Yod diphthong · ḥolam part','ALEF_SHURUQ_VOWEL':'Alef shuruq vowel · source category','FPP_PATAX_MAPIQ_HE':'Furtive pataḥ and mapiq he','FPP_PATAX_XET':'Furtive pataḥ and ḥet','FPP_PATAX_AYIN':'Furtive pataḥ and ayin'}
 if name in special:return special[name]
 base,suffix=name.split('_',1);bases={'ALEF':'Alef','BET':'Bet','GIMEL':'Gimel','DALET':'Dalet','HE':'He','VAV':'Vav','ZAYIN':'Zayin','XET':'Ḥet','TET':'Tet','YOD':'Yod','KAF':'Kaf','LAMED':'Lamed','MEM':'Mem','NUN':'Nun','SAMEKH':'Samekh','AYIN':'Ayin','PE':'Pe','TSADI':'Tsadi','QOF':'Qof','RESH':'Resh','TRUESHIN':'Shin','SIN':'Sin','TAV':'Tav','FKAF':'Final kaf','FMEM':'Final mem','FNUN':'Final nun','FPE':'Final pe','FTSADI':'Final tsadi'}
 suffixes={'1MAPIQ':'mapiq','0MAPIQ_CON':'consonantal','0MAPIQ_ML':'mater lectionis','1DAG_QAL':'dagesh qal','1DAG_XAZAQ':'dagesh ḥazaq','0DAG':'without dagesh','1DAG':'geminate source reading','0DAGOSD_CON':'consonantal','0DAGOSD_ML':'mater lectionis','0DAG_CON':'consonantal','0DAG_ML':'mater lectionis','0DAG_PART2_OF_DIPHTHONG':'diphthong, second part'}
 return bases[base]+' · '+suffixes[suffix]
def source_cells(ar,row,style):
 cells=[]
 for i,tokens in enumerate(row['transcriptions'][style]):
  if tokens is None:continue
  label,text=ar._cell(tokens)
  if text=='—':
   assert i==1 and label==(None,None)
   first=ar._cell(row['transcriptions'][style][0]);assert first[0]==(ar.QAMATS_DAL,None)
   label=(ar.QAMATS_SAM,None);text=first[1]
  cells.append((i+1,label,text))
 return cells
def build(ar,jtech,deep):
 raw=SOURCE.read_bytes();source=json.loads(gzip.decompress(raw));old=json.loads(gzip.decompress(UNDERLAY.read_bytes()))
 inverse={v:k for k,v in ar._DISPLAY_TO_ASCII.items()};inverse['^']='ᵉ'
 def shown_text(text):return ''.join(inverse.get(c,c) for c in text)
 tables={s:jtech._JTECH_FROM_UDL[d] for s,d in [('sephardic','jta-dialect-sefarad'),('ashkenazic','jta-dialect-ashkenaz')]}
 names=collections.defaultdict(list)
 for name,value in vars(deep).items():
  if name.isupper() and isinstance(value,str) and len(value)==1:names[value].append(name)
 assert set(tables['sephardic'])==set(tables['ashkenazic'])
 catalog=[];indices={};counts=collections.Counter()
 vowel={'SHEVA_NA','SHEVA_NAX','VARIKA_WITH_GENERIC_SHEVA','VARIKA_WITH_VOCAL_SHEVA','XSEGOL','XPATAX','XQAMATS','XIRIQ_Q','TSERE','SEGOL_V','PATAX','QAMATS_G','QAMATS_Q','VAV_XOLAM','XOLAM_HASER','QUBUTS','SHURUQ','XIRIQ_G','SHURUQ_PART1_OF_YOD_DIPHTHONG','VAV_XOLAM_PART1_OF_YOD_DIPHTHONG','ALEF_SHURUQ_VOWEL'}
 for symbol in sorted(tables['sephardic'],key=lambda c:names[c][0]):
  assert len(names[symbol])==1,(symbol,names[symbol])
  name=names[symbol][0];indices[symbol]=len(catalog)
  texts={s:tables[s][symbol] for s in STYLES};shown={s:shown_text(t) for s,t in texts.items()}
  geminate=symbol in deep.GEMINATES
  if geminate:
   for text in texts.values():assert len(text)%2==0 and text[:len(text)//2]==text[len(text)//2:]
  half={s:t[:len(t)//2] for s,t in texts.items()} if geminate else None
  kind='vowel-consonant-pair' if name.startswith('FPP_') else 'silent-vowel-sign' if name=='SHEVA_NAX' else 'diphthong-part' if 'DIPHTHONG' in name else 'vowel' if name in vowel else 'silent-letter' if not texts['sephardic'] else 'consonant'
  catalog.append({'id':name,'label':label(name),'kind':kind,'hebrewLetters':deep.get_he_letters_back(symbol),'geminate':geminate,'ascii':texts,'display':shown,'half':{'ascii':half,'display':{s:shown_text(t) for s,t in half.items()}} if half else None})
 groups={};errors=[]
 for group in source['groups']:
  rows=[]
  for row in group['rows']:
   variants=[]
   try:
    view=ar._row(row);columns=[i+1 for i,h in enumerate(row['hebrew']) if h is not None]
    for column,branch in zip(columns,view.branches,strict=True):
     syllables=[];projected={s:[] for s in STYLES}
     for reading in branch.readings:
      atoms=re.split('[־'+ar.hpu.NU_GMAQ+']',reading.hebrew);transcriptions=reading.transcription.split('-');assert len(atoms)==len(transcriptions)
      atom_plans=[]
      for atom,text in zip(atoms,transcriptions,strict=True):
       decoded=ar.Reading(atom,text).syllables();assert len(decoded)==1
       plans=[]
       for syllable in decoded[0]:
        symbols=syllable['sylrec-udl'];plan=[]
        for i,symbol in enumerate(symbols):plan.append([indices[symbol],2 if i==0 and syllable.get('sylrec-this-syl-swp2g') else 0])
        if shared:=syllable.get('sylrec-next-syl-swp1g'):plan.append([indices[shared],1]);counts['sharedFirstHalves']+=1
        assert ''.join(catalog[c]['hebrewLetters'] for c,part in plan if part!=1)==syllable['sylrec-he']
        plans.append(plan);syllables.append(plan);counts['syllables']+=1;counts['segments']+=len(plan)
        for c,part in plan:counts['category:'+catalog[c]['id']]+=1;counts['part:'+str(part)]+=1
       atom_plans.append(plans)
      for style in STYLES:
       atoms=[]
       for plans in atom_plans:
        units=[]
        for plan in plans:
         pieces=[]
         for c,part in plan:
          text=catalog[c]['ascii'][style]
          if part:assert catalog[c]['geminate'];text=text[:len(text)//2]
          pieces.append(text)
         units.append(''.join(pieces))
        atoms.append('.'.join(units))
       projected[style].append('-'.join(atoms))
     style_columns=[]
     for style in STYLES:
      matches=[(c,t) for c,(q,k),t in source_cells(ar,row,style) if q in (None,branch.qamats) and k in (None,branch.cantillation)]
      assert len(matches)==1
      c,expected=matches[0];actual=' '.join(projected[style]);assert actual==expected.replace('!',''),(group['id'],row['number'],column,style,actual,expected)
      tokens=row['transcriptions'][style][c-1]
      if flatten(tokens)=='—':tokens=row['transcriptions'][style][0]
      assert shown_text(actual)==flatten(tokens),(group['id'],row['number'],column,style,'display mismatch')
      style_columns.append(c);counts[style+'ReconstructedUnits']+=len(syllables)
     # The previous underlay is an independent, unchanged source boundary proof.
     oldrow=next(r for r in old['groups'][group['id']] if r[0]==row['number'])
     previous=next(v for v in oldrow[1] if v[0]==column)
     assert previous[1:3]==style_columns and len(previous[3])==len(syllables)
     counts['variants']+=1;variants.append([column,*style_columns,syllables])
    rows.append([row['number'],variants])
   except (ValueError,AssertionError,IndexError,KeyError) as error:errors.append({'groupId':group['id'],'row':row['number'],'error':str(error) or type(error).__name__})
  groups[group['id']]=rows
 assert not errors,errors[:5]
 result={'format':'tropetrain-pronunciation-segments-v1','revision':1,'sourceCommit':COMMIT,'inputSha256':digest(raw),'underlaySha256':digest(UNDERLAY.read_bytes()),'computationSourceSha256':digest(ARCHIVE.read_bytes()),'license':'CC-BY-SA-4.0','styles':STYLES,'categoryFields':'Named source categories and original technical/display transcription values; no IPA or acoustic phonemes','variantFields':['hebrewColumn','sephardicColumn','ashkenazicColumn','syllables'],'segmentFields':['categoryIndex','part:0whole/1first-half-shared/2second-half-shared'],'catalog':catalog,'groups':groups}
 packed=gzip.compress(encoded(result),compresslevel=9,mtime=0)
 audit={'schema':'tropetrain-pronunciation-segment-audit-v1','revision':1,'sourceCommit':COMMIT,'inputSha256':result['inputSha256'],'underlaySha256':result['underlaySha256'],'computationSourceSha256':result['computationSourceSha256'],'outputSha256':digest(packed),'outputBytes':len(packed),'groups':len(groups),'categories':len(catalog),'counts':dict(counts),'styleDifferences':[c['id'] for c in catalog if c['ascii']['sephardic']!=c['ascii']['ashkenazic']],'sourceFiles':['py/phonetic_mam/core/deep_latin.py','py/phonetic_mam/core/jtech_ascii.py','py/phonetic_mam/analysis_reader.py'],'source':'https://github.com/bdenckla/MAM-basics/tree/'+COMMIT,'method':'Unchanged pinned GPL3 Reading.syllables uniquely decoded against public transcription. Closed category references reproduce every complete Sephardic/Ashkenazic technical transcription, excluding stress markup only. Existing underlay boundaries and style/alternative columns independently agree. No raw calculation dictionaries, private annotations or tentative IPA emitted.','rights':'Original source data/derived facts CC BY-SA4.0 with original attribution; GPL3 build-time adapter and unchanged computation archive. Original browser/UI implementation.','review':'Source computational distinctions, not independent phonological/cantorial/acoustic review or equivalence to the six Kinnor Accent labels.','unassigned':['IPA','acoustic phonemes','segment/note durations','singing voice','Kinnor pronunciation equivalence']}
 if '--check' in sys.argv:
  assert (ROOT/'data/pronunciation/torah-segments.json.gz').read_bytes()==packed
  assert json.loads((ROOT/'docs/PRONUNCIATION-SEGMENTS.json').read_text())==audit
 else:
  (ROOT/'data/pronunciation/torah-segments.json.gz').write_bytes(packed)
  (ROOT/'docs/PRONUNCIATION-SEGMENTS.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in audit.items() if k!='counts'},ensure_ascii=False))
with tempfile.TemporaryDirectory(prefix='tropetrain-source-segments-') as folder:
 target=Path(folder)
 with zipfile.ZipFile(ARCHIVE) as archive:
  manifest=json.loads(archive.read('MANIFEST.json'));assert manifest['commit']==COMMIT
  files={r['path']:r for r in manifest['files']};assert set(archive.namelist())==set(files)|{'MANIFEST.json','NOTICE.txt'}
  for name,entry in files.items():
   assert not Path(name).is_absolute() and '..' not in Path(name).parts
   content=archive.read(name);assert len(content)==entry['bytes'] and digest(content)==entry['sha256']
   assert hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()==entry['gitBlob']
   path=target/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
 sys.path.insert(0,str(target/'py'));sys.dont_write_bytecode=True
 from phonetic_mam import analysis_reader
 from phonetic_mam.core import jtech_ascii,deep_latin
 build(analysis_reader,jtech_ascii,deep_latin)
