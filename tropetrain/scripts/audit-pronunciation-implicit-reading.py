"""Independent original-data audit; imports no correspondence producer."""
from pathlib import Path
import gzip,hashlib,json,re,zipfile
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text())
record=read('docs/PRONUNCIATION-IMPLICIT-READING.json');packet=json.loads(gzip.decompress((root/'data/pronunciation/torah-display.json.gz').read_bytes()))
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
letters=lambda s:''.join(c for c in s if 'א'<=c<='ת')
reader='וּמְחִיּיָאֵ֗ל';written='וּמְחִיָּיאֵ֗ל';reading='וּמְחִיָּאֵ֗ל'
assert record['sourceCommit']==packet['sourceCommit']=='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
ar=root/record['sourceRuleArchive'];assert sha(ar.read_bytes())==record['sourceRuleArchiveSha256']=='cf2aef1d9df85e4ead6f7ef9cfcb15001d777104a0c29b2dcbaddc7133292d0e'
with zipfile.ZipFile(ar) as z:
    manifest=json.loads(z.read('MANIFEST.json'));assert manifest['commit']==record['sourceCommit'] and manifest['license']=='GPL-3.0-only'
    assert {f['path'] for f in manifest['files']}=={'LICENSE','py/phonetic_mam/core/qere_from_implicit_kq.py'}
    for spec in manifest['files']:
        raw=z.read(spec['path']);assert len(raw)==spec['bytes'] and sha(raw)==spec['sha256'] and blob(raw)==spec['gitBlob']
    raw=z.read('py/phonetic_mam/core/qere_from_implicit_kq.py');code=raw.decode()
assert blob(raw)==record['sourceRule']['gitBlob']=='5dcf34bd2e1fd4ad6de30c900366128b3dca7abd'
assert sha(raw)==record['sourceRule']['sha256']=='5cbfeb9f7e2cf626dc9695a8619a5c7c42b8597f5ef97ced9120d0abed163e3d'
assert '_UMEXIYAEL = _maybe_dx("(וּמְחִיָּ)" + "י" + "(אֵ֗ל)")' in code
assert '_UMEXIYAEL_REPL_STR = r"\\1\\2"' in code and '(_UMEXIYAEL, _UMEXIYAEL_REPL_STR),' in code
assert record['sourceRule']['pattern']=='(וּמְחִיָּ)י(אֵ֗ל)' and record['sourceRule']['replacement']=='\\1\\2'
assert re.fullmatch(record['sourceRule']['pattern'],written).expand(record['sourceRule']['replacement'])==reading

with zipfile.ZipFile(root/record['primaryArchive']) as z:
    assert sha((root/record['primaryArchive']).read_bytes())==record['primaryArchiveSha256']
    raw=z.read('Gen.json');assert blob(raw)=='2a0b8ad1b4f3ea1580e9eb9f5b050e954e8e3f6e'
    assert sha(raw)==record['primarySourceFile']['sha256'];primary=json.loads(raw)
def nodes(value):
    if isinstance(value,dict):
        yield value
        for v in value.values():yield from nodes(v)
    elif isinstance(value,list):
        for v in value:yield from nodes(v)
native=[v for v in nodes(primary) if v.get('osisID')=='Gen.4.18'];assert len(native)==1
assert set(native[0])=={'type','osisID','text'} and native[0]['type']=='verse'
primary_verse=native[0]['text'];assert primary_verse==record['primaryVerseText'] and primary_verse.count(written)==1
with zipfile.ZipFile(root/'assets/pronunciation/phonetic-mam-torah-sources.zip') as z:
    raw=z.read('A1-Genesis.json');assert blob(raw)=='b4f9767d1ab0514dbde253da8aad2e116ae4e4a2'
    source=json.loads(raw)['chapters'][3]['verses'][17]
assert source['number']==18 and len(source['rows'])==12
assert all(len(r['hebrew'])==1 and len(r['hebrew'][0])==1 and isinstance(r['hebrew'][0][0],str) for r in source['rows'])
source_verse=' '.join(r['hebrew'][0][0] for r in source['rows'])
assert primary_verse.replace(written,reading,1)==source_verse==record['sourceReadingVerseText']
book=read('data/torah/gen.json');tokens=book['chapters'][3]['verses'][17]['tokens']
assert len(tokens)==16 and tokens[8]=={'id':'gen-4-18-9','kind':'w','sourceHebrew':reader}
assert letters(reader)==letters(written) and letters(reader)!=letters(reading)
groups={g['id']:g for g in packet['groups']};g=groups['pmam-gen-4-18-7']
assert g['implicitReadingLinks']==[record['link']] and len([x for x in packet['groups'] if 'implicitReadingLinks' in x])==1
assert g['readerIds']==['gen-4-18-9'] and g['readerHebrew']==[reader] and g['rows']==[{'number':7,**source['rows'][6]}]
assert g['match']=='primary-implicit-reading-between-anchors' and 'documented-implicit-reading-form' in g['flags']
assert g['primaryEditionArchiveSha256']==record['primaryArchiveSha256'] and g['implicitReadingSourceArchiveSha256']==record['sourceRuleArchiveSha256']
link=record['link'];assert link['readerHebrew']==reader and link['primaryHebrew']==written and link['sourceReadingHebrew']==reading and link['readerWordId']=='gen-4-18-9'
assert link['kind']=='mam-explicit-implicit-reading-word' and link['ruleId']=='mam-umexiyael-gen4-18'
assert link['primaryAtom']==9 and link['primaryVerse']=='Gen.4.18' and link['sourceFileSha256']==record['primarySourceFile']['sha256']
assert link['sourceRuleGitBlob']=='5dcf34bd2e1fd4ad6de30c900366128b3dca7abd' and link['sourceRuleSha256']==record['sourceRule']['sha256']
assert g['bookId']=='gen' and (g['displayChapter'],g['displayVerse'])==(4,18) and g['readerStart']==g['readerEnd']=='gen-4-18-9'
window=record['anchors'];assert g['variantWindow']==window
before=groups[window['beforeGroup']];after=groups[window['afterGroup']]
assert before['id']=='pmam-gen-4-18-6' and after['id']=='pmam-gen-4-18-8'
assert before['readerIds'][-1]==window['beforeReaderEnd']=='gen-4-18-8' and after['readerIds'][0]==window['afterReaderStart']=='gen-4-18-10'
assert before['rows'][-1]['number']==6 and after['rows'][0]['number']==8
old=[x for x in packet['groups'] if 'implicitReadingLinks' not in x]
assert len(old)==record['previousGroups']==68503
assert sha(json.dumps(old,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==record['previousGroupsSha256']=='5403d1ec384384681ece8c86c3900ae844b550ebd4b360c2ae269c4bcf1da6fd'
owners=[word for group in packet['groups'] for word in group['readerIds']]
assert len(owners)==len(set(owners))==79985 and len(packet['groups'])==68504
print(json.dumps({'previousGroupsUnchanged':68503,'newWords':1,'totalSourceLinkedWords':79985,'markedVerseExact':True,'individualWrittenSyllableRangesInferred':False,'upstreamCodeExecuted':False}))
