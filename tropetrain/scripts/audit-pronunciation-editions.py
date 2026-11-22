"""Independent primary-edition verification; imports no production join code."""
from pathlib import Path
import gzip,hashlib,itertools,json,re,zipfile

ROOT=Path(__file__).resolve().parents[1]
read=lambda name:json.loads((ROOT/name).read_text())
record=read('docs/PRONUNCIATION-EDITION-WORDS.json')
packet=json.loads(gzip.decompress((ROOT/'data/pronunciation/torah-display.json.gz').read_bytes()))
groups={g['id']:g for g in packet['groups']}
expected={'Gen.json':'2a0b8ad1b4f3ea1580e9eb9f5b050e954e8e3f6e','Exod.json':'c615e0059de6c01a80124b91ebfe13dad9c1b64b','Lev.json':'7925e3d5236c543e556d6c490ee2cb2f83888c4c','Num.json':'17c187b9b5622915940926c54c005cb734d50ea2','Deut.json':'aa762e9bc2d0b8a8d39c206b995beff7bc19e417','LICENSE.md':'3f2797ced5ccc2ac6d08d85a34c4164e75b8dacd'}
letter_text=lambda s:''.join(re.findall('[א-ת]',s))
def key(text):
    raw=letter_text(text);name=re.fullmatch('([ובכלמשה]{0,3})(יהוה|אדני|אלהים)',raw)
    if name:return name[1]+'@'
    raw=raw.replace('יששכר','ישכר')
    return raw[:-3]+'היא' if raw.endswith('הוא') else raw
def inline(nodes):return ''.join(n if isinstance(n,str) else inline(n['content']) for n in nodes)

def project(node):
    role=node['type']
    if role in ['kq','cant-all-three','scrdfftar']:
        wanted={'kq':'kq-q','cant-all-three':'cant-combined','scrdfftar':'sdt-target'}[role]
        parts=[n for n in node['contents'] if n['type']==wanted];assert len(parts)==1
        return project(parts[0])
    if role in ['lp-paseq','lp-legarmeih']:return '׀'
    if role=='spi-invnun':return '׆'+(' ' if node.get('class')=='including-trailing-space' else '')
    if role in ['spi-pe2','spi-pe3','spi-samekh2','spi-samekh3','shirah-space']:return ' '
    assert role in ['verse','text','sdt-target','cant-combined','kq-q','kq-trivial','slh-word','letter-small','letter-large','letter-hung'],role
    assert not ('text' in node and 'contents' in node)
    return node['text'] if 'text' in node else ''.join(project(child) for child in node.get('contents',[]))

primary={};file_specs={}
archive=ROOT/record['archive'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==record['archiveSha256']
with zipfile.ZipFile(archive) as z:
    manifest=json.loads(z.read('SOURCE-MANIFEST.json'));assert manifest['commit']==record['sourceCommit']=='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
    assert {f['file'] for f in manifest['files']}==set(expected)
    for spec in manifest['files']:
        raw=z.read(spec['file']);assert len(raw)==spec['bytes'] and hashlib.sha256(raw).hexdigest()==spec['sha256']
        assert hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()==spec['gitBlob']==expected[spec['file']]
        file_specs[spec['file']]=spec
        if spec['file'].endswith('.json'):
            j=json.loads(raw);assert 'vtmam' in j['versification-tradition'].split(',')
            for book in j['contents']:
                if book['type']!='book39':continue
                for chapter in book['contents']:
                    if chapter['type']!='chapter':continue
                    for verse in chapter['contents']:
                        if verse['type']=='verse':primary[verse['osisID']]=project(verse)

source={};source_order={};reader_order={}
names={'gen':'A1-Genesis.json','exo':'A2-Exodus.json','lev':'A3-Levit.json','num':'A4-Numbers.json','deu':'A5-Deuter.json'}
with zipfile.ZipFile(ROOT/'assets/pronunciation/phonetic-mam-torah-sources.zip') as z:
    for bid,name in names.items():
        index=0
        for c in json.loads(z.read(name))['chapters']:
            for v in c['verses']:
                source[(bid,c['number'],v['number'])]=v['rows']
                for number,row in enumerate(v['rows'],1):
                    forms=[inline(h) for h in row['hebrew'] if h is not None]
                    if forms and not all(h in ['פפפ','ססס','פפ','סס','׀',''] for h in forms):
                        source_order[(bid,c['number'],v['number'],number)]=index;index+=1
        book=read('data/torah/'+bid+'.json');words=[w for c in book['chapters'] for v in c['verses'] for w in v['tokens'] if w['kind']!='k' and letter_text(w['sourceHebrew'])]
        reader_order.update({w['id']:i for i,w in enumerate(words)})

seen=set()
for e in record['entries']:
    g=groups[e['groupId']];assert g['editionWordLinks']==e['editionWordLinks'] and g['readerIds']==e['readerIds'] and g['readerHebrew']==e['readerHebrew']
    assert e['archiveSha256']==g['primaryEditionArchiveSha256']==record['archiveSha256']
    assert e['sourceFile']==file_specs[e['sourceFile']['file']]
    a=groups[e['anchors']['beforeGroup']];b=groups[e['anchors']['afterGroup']]
    assert 'editionWordLinks' not in a and 'editionWordLinks' not in b
    assert a['bookId']==b['bookId']==g['bookId'] and g['variantWindow']==e['anchors']
    assert [reader_order[r] for r in g['readerIds']]==list(range(reader_order[a['readerIds'][-1]]+1,reader_order[b['readerIds'][0]]))
    source_index=lambda group,row:source_order[(group['bookId'],group['displayChapter'],group['displayVerse'],row['number'])]
    assert [source_index(g,r) for r in g['rows']]==list(range(source_index(a,a['rows'][-1])+1,source_index(b,b['rows'][0])))
    osis=g['editionWordLinks'][0]['primaryVerse'];assert primary[osis]==e['primaryVerseText']
    atoms=[s for s in re.split('[־\\s׀׆]+',primary[osis]) if letter_text(s)];links=g['editionWordLinks']
    assert [l['primaryAtom'] for l in links]==list(range(links[0]['primaryAtom'],links[0]['primaryAtom']+len(links)))
    start=sum(len(key(s)) for s in atoms[:links[0]['primaryAtom']-1]);end=start
    for link,reader_text in zip(links,g['readerHebrew']):
        assert link['readerHebrew']==reader_text and link['primaryVerse']==osis
        assert tuple(map(int,link['readerWordId'].split('-')[1:3]))==(g['displayChapter'],g['displayVerse'])
        assert atoms[link['primaryAtom']-1]==link['primaryHebrew'] and link['sourceFileSha256']==e['sourceFile']['sha256']
        assert link['readerWordId'] not in seen;seen.add(link['readerWordId']);end+=len(key(link['primaryHebrew']))
    emitted=[];offset=0;source_start=source_end=None
    for number,row in enumerate(source[(g['bookId'],g['displayChapter'],g['displayVerse'])],1):
        forms=[inline(h) for h in row['hebrew'] if h is not None]
        if not forms or all(f in ['פפפ','ססס','פפ','סס','׀',''] for f in forms):continue
        variants={''.join(key(part) for part in re.split('[־\\s]+',f) if letter_text(part)) for f in forms};assert len(variants)==1
        value=variants.pop()
        if number in e['sourceRows']:
            if source_start is None:source_start=offset
            source_end=offset+len(value)
        emitted.append(value);offset+=len(value)
    assert ''.join(emitted)==''.join(key(s) for s in atoms) and (source_start,source_end)==(start,end)
    raw_forms=[{letter_text(inline(h)) for h in r['hebrew'] if h is not None} for r in g['rows']]
    assert {''.join(parts) for parts in itertools.product(*raw_forms)}=={''.join(letter_text(l['primaryHebrew']) for l in links)}

old=[g for g in packet['groups'] if 'editionWordLinks' not in g and 'implicitReadingLinks' not in g]
assert len(old)==record['baseGroups']==68384
assert hashlib.sha256(json.dumps(old,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==record['baseGroupsSha256']=='779e9ce9376665b3cf04d553d5d51de4c6db37da9d4188ac63dd13339e8ba862'
assert len(record['entries'])==119 and len(seen)==record['addedWords']==141
assert len(record['refused'])==1 and record['refused'][0]['readerIds']==['gen-4-18-9'] and record['refused'][0]['reason']=='primary-verse-differs'
print(json.dumps({'editionGroups':119,'editionWords':141,'allPreviousGroupsUnchanged':68384,'refusedWords':['gen-4-18-9'],'phonologicalEquivalenceInferred':False}))
