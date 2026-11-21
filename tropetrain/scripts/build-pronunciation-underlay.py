# SPDX-License-Identifier: GPL-3.0-only
"""Reproduce factual Hebrew syllable ranges using pinned Phonetic MAM GPL3 code.

The upstream implementation stays unmodified in the source archive. Derived
ranges annotate the existing CC BY-SA4 display; no phonemes or music are emitted.
"""
from pathlib import Path
import gzip,hashlib,json,re,sys,tempfile,zipfile,collections
APP=Path(__file__).resolve().parent.parent
COMMIT='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
ARCHIVE=APP/'assets/pronunciation/phonetic-mam-computation-sources.zip'
SOURCE=APP/'data/pronunciation/torah-display.json.gz'

def digest(data):return hashlib.sha256(data).hexdigest()

def source_cells(ar,row,style):
    cells=[]
    for index,tokens in enumerate(row['transcriptions'][style]):
        if tokens is None:continue
        label,text=ar._cell(tokens)
        if text=='—':
            assert index==1 and label==(None,None)
            first=ar._cell(row['transcriptions'][style][0])
            assert first[0]==(ar.QAMATS_DAL,None)
            label=(ar.QAMATS_SAM,None);text=first[1]
        cells.append((index+1,label,text))
    return cells

def build(ar,jtech):
    raw=SOURCE.read_bytes();data=json.loads(gzip.decompress(raw));groups={};counts=collections.Counter();errors=[]
    for group in data['groups']:
        rows=[]
        for row in group['rows']:
            variants=[]
            try:
                view=ar._row(row)
                columns=[i+1 for i,h in enumerate(row['hebrew']) if h is not None]
                for column,branch in zip(columns,view.branches,strict=True):
                    all_syllables=[];projections={s:[] for s in ['sephardic','ashkenazic']}
                    for reading in branch.readings:
                        atoms=re.split('[־'+ar.hpu.NU_GMAQ+']',reading.hebrew);transcriptions=reading.transcription.split('-')
                        assert len(atoms)==len(transcriptions)
                        decoded=[]
                        for atom,text in zip(atoms,transcriptions,strict=True):
                            syllables=ar.Reading(atom,text).syllables();assert len(syllables)==1
                            decoded.append(syllables[0]);all_syllables.extend(syllables[0])
                        for style,dialect in [('sephardic','jta-dialect-sefarad'),('ashkenazic','jta-dialect-ashkenaz')]:
                            projections[style].append(jtech.get_jtech_ascii(dialect,{'sas-syls-per-atom':decoded,'sas-isps-two-d':None}))
                    _,hebrew=ar._cell(row['hebrew'][column-1])
                    assert ''.join(s['sylrec-he'] for s in all_syllables)==re.sub('[^א-ת]','',hebrew)
                    style_columns=[]
                    for style in ['sephardic','ashkenazic']:
                        candidates=[(c,t) for c,(q,k),t in source_cells(ar,row,style) if q in (None,branch.qamats) and k in (None,branch.cantillation)]
                        assert len(candidates)==1,'nonunique transcription pairing'
                        c,expected=candidates[0];actual=' '.join(projections[style]);assert actual==expected.replace('!',''),f'{style} source projection mismatch'
                        assert len(re.split('[. -]',actual))==len(all_syllables)
                        style_columns.append(c);counts[style+'VariantUnits']+=len(all_syllables)
                    ends=[];shared=[];position=0
                    for i,s in enumerate(all_syllables):
                        position+=len(s['sylrec-he']);ends.append(position)
                        if s.get('sylrec-next-syl-swp1g'):
                            assert i+1<len(all_syllables) and all_syllables[i+1].get('sylrec-this-syl-swp2g');shared.append(i)
                    variants.append([column,*style_columns,ends,shared]);counts['variants']+=1;counts['variantUnits']+=len(ends);counts['sharedConsonants']+=len(shared)
                rows.append([row['number'],variants])
            except (ValueError,AssertionError,IndexError,KeyError) as error:
                errors.append({'groupId':group['id'],'row':row['number'],'error':str(error) or type(error).__name__})
        groups[group['id']]=rows
    result={'format':'tropetrain-pronunciation-underlay-v1','revision':1,'sourceCommit':COMMIT,'inputSha256':digest(raw),'license':'CC-BY-SA-4.0','computationSourceSha256':digest(ARCHIVE.read_bytes()),'variantFields':['hebrewColumn','sephardicColumn','ashkenazicColumn','syllableLetterEnds','sharesNextConsonantIndices'],'groups':groups}
    audit={'schema':'tropetrain-pronunciation-underlay-audit-v1','revision':1,'sourceCommit':COMMIT,'inputSha256':digest(raw),'computationSourceSha256':result['computationSourceSha256'],'groups':len(groups),'counts':dict(counts),'unresolved':errors,'method':'Pinned GPL3 Reading.syllables unique decoding against published Sephardic transcription, factored over independent maqaf atoms. Both complete style projections and explicit joins match original cells exactly, excluding literal stress markers only. Preserve original Hebrew-letter ranges and shared-consonant metadata; browser aligns exact written clusters separately.','limits':'Source computation, not independent linguistic review or Kinnor grammar equivalence. Original source AST/stress/source packet unchanged. No IPA, phonemes, music, singing, syllable audio times or inferred pronunciation generated.'}
    assert not errors,errors[:5]
    encoded=(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n').encode();compressed=gzip.compress(encoded,mtime=0);audit.update(outputBytes=len(compressed),outputSha256=digest(compressed))
    if '--check' in sys.argv:
        assert (APP/'data/pronunciation/torah-underlay.json.gz').read_bytes()==compressed
        assert json.loads((APP/'docs/PRONUNCIATION-UNDERLAY.json').read_text())==audit
    else:
        (APP/'data/pronunciation/torah-underlay.json.gz').write_bytes(compressed)
        (APP/'docs/PRONUNCIATION-UNDERLAY.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(audit,ensure_ascii=False))

with tempfile.TemporaryDirectory(prefix='tropetrain-mam-source-') as temporary:
    target=Path(temporary)
    with zipfile.ZipFile(ARCHIVE) as archive:
        manifest=json.loads(archive.read('MANIFEST.json'));assert manifest['commit']==COMMIT
        allowed={entry['path']:entry for entry in manifest['files']}
        assert set(archive.namelist())==set(allowed)|{'MANIFEST.json','NOTICE.txt'}
        for name,entry in allowed.items():
            assert not Path(name).is_absolute() and '..' not in Path(name).parts
            content=archive.read(name);assert len(content)==entry['bytes'] and digest(content)==entry['sha256']
            assert hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()==entry['gitBlob']
            path=target/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
    sys.path.insert(0,str(target/'py'));sys.dont_write_bytecode=True
    from phonetic_mam import analysis_reader
    from phonetic_mam.core import jtech_ascii
    build(analysis_reader,jtech_ascii)
