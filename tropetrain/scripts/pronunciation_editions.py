"""Word correspondence between two unchanged, explicitly different editions.

The primary MAM reading must account for the complete Phonetic MAM verse.
Only a closed gap between existing source/reader anchors can gain links.
This proves contextual word correspondence, never phonological equivalence.
"""
import hashlib,itertools,json,re,zipfile

COMMIT='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
PRIMARY_FILES={'gen':'Gen.json','exo':'Exod.json','lev':'Lev.json','num':'Num.json','deu':'Deut.json'}
EXPECTED_BLOBS={'Gen.json':'2a0b8ad1b4f3ea1580e9eb9f5b050e954e8e3f6e','Exod.json':'c615e0059de6c01a80124b91ebfe13dad9c1b64b','Lev.json':'7925e3d5236c543e556d6c490ee2cb2f83888c4c','Num.json':'17c187b9b5622915940926c54c005cb734d50ea2','Deut.json':'aa762e9bc2d0b8a8d39c206b995beff7bc19e417','LICENSE.md':'3f2797ced5ccc2ac6d08d85a34c4164e75b8dacd'}
letters=lambda s:re.sub('[^א-ת]','',s)

def primary_text(node):
    """Select Scripture roles before reassembling fragments; never normalize."""
    kind=node.get('type')
    containers={'verse','text','letter-large','letter-small','letter-hung','kq-q','kq-trivial','sdt-target','cant-combined','slh-word'}
    if kind in containers:
        if kind in {'text','letter-large','letter-small','letter-hung'} and 'text' not in node:raise ValueError('Missing primary literal text.')
        if 'text' in node:
            if 'contents' in node:raise ValueError('Primary text and contents co-occur.')
            return node['text']
        result=''.join(primary_text(n) for n in node.get('contents',[]))
        if kind=='slh-word' and result!=node['slhw-desc-0']:raise ValueError('Primary formatted atom differs from its description.')
        return result
    if kind in {'spi-pe2','spi-pe3','spi-samekh2','spi-samekh3','shirah-space'}:return ' '
    if kind in {'lp-legarmeih','lp-paseq'}:return '׀'
    if kind=='spi-invnun':return '׆'+(' ' if node.get('class')=='including-trailing-space' else '')
    choices={'kq':('kq-q',{'kq-k','kq-q'}),'cant-all-three':('cant-combined',{'cant-combined','cant-alef','cant-bet'}),'scrdfftar':('sdt-target',{'sdt-target','sdt-note'})}
    if kind in choices:
        chosen,allowed=choices[kind];children=node['contents']
        if len(children)!=len(allowed) or {c['type'] for c in children}!=allowed:raise ValueError('Primary alternative roles need review.')
        return primary_text(next(c for c in children if c['type']==chosen))
    raise ValueError('Unknown primary MAM role: '+str(kind))

def load_primary(path):
    raw=path.read_bytes()
    with zipfile.ZipFile(path) as archive:
        manifest=json.loads(archive.read('SOURCE-MANIFEST.json'))
        if manifest['commit']!=COMMIT or set(archive.namelist())!={f['file'] for f in manifest['files']}|{'SOURCE-MANIFEST.json','NOTICE.txt'}:raise ValueError('Unpinned primary edition archive.')
        if {f['file'] for f in manifest['files']}!=set(PRIMARY_FILES.values())|{'LICENSE.md'}:raise ValueError('Unexpected primary edition files.')
        books={};specs={}
        for entry in manifest['files']:
            if entry['gitBlob']!=EXPECTED_BLOBS[entry['file']]:raise ValueError('Unpinned primary Git blob.')
            content=archive.read(entry['file'])
            if len(content)!=entry['bytes'] or hashlib.sha256(content).hexdigest()!=entry['sha256'] or hashlib.sha1(f'blob {len(content)}\0'.encode()+content).hexdigest()!=entry['gitBlob']:raise ValueError('Primary edition bytes changed.')
            if entry['file'].endswith('.json'):
                book=json.loads(content)
                if set(book)!= {'provenance','consumer_notice','versification-tradition','contents'} or 'vtmam' not in book['versification-tradition'].split(','):raise ValueError('Primary native versification needs review.')
                books[entry['file']]=book;specs[entry['file']]=entry
    return books,specs,hashlib.sha256(raw).hexdigest()

def primary_verses(book):
    result={}
    for b in book['contents']:
        if b['type'] in {'spi-pe2','spi-pe3','spi-samekh2','spi-samekh3'}:continue
        if b['type']!='book39':raise ValueError('Unknown primary root role.')
        for c in b['contents']:
            if c['type'] in {'spi-pe2','spi-pe3','spi-samekh2','spi-samekh3'}:continue
            if c['type']!='chapter':raise ValueError('Unknown primary book role.')
            for v in c['contents']:
                if v['type'] in {'spi-pe2','spi-pe3','spi-samekh2','spi-samekh3'}:continue
                if v['type']!='verse':raise ValueError('Unknown primary chapter role.')
                _,chapter,verse=v['osisID'].split('.');key=(int(chapter),int(verse))
                if key in result:raise ValueError('Repeated primary verse.')
                result[key]={'osisID':v['osisID'],'text':primary_text(v)}
    return result

def anchored_edition_words(book_id,display,reader,base_groups,row_info,canonical,primary,spec,archive_sha):
    verses=primary_verses(primary)
    rows=[(c['number'],v['number'],number,row) for c in display['chapters'] for v in c['verses'] for number,row in enumerate(v['rows'],1) if row_info(row) is not None]
    words=[w for c in reader['chapters'] for v in c['verses'] for w in v['tokens'] if w['kind']!='k' and letters(w['sourceHebrew'])]
    ri={(c,v,n):i for i,(c,v,n,_) in enumerate(rows)};wi={w['id']:i for i,w in enumerate(words)}
    anchors=[]
    for g in base_groups:
        indexes=[ri[(g['displayChapter'],g['displayVerse'],r['number'])] for r in g['rows']]
        anchors.append({'group':g,'sourceStart':min(indexes),'sourceEnd':max(indexes)+1,'readerStart':wi[g['readerIds'][0]],'readerEnd':wi[g['readerIds'][-1]]+1})
    anchors.sort(key=lambda a:a['sourceStart']);added=[];evidence=[];refused=[]
    source_verses={(c['number'],v['number']):v for c in display['chapters'] for v in c['verses']}
    for before,after in zip(anchors,anchors[1:]):
        if before['sourceEnd']>after['sourceStart'] or before['readerEnd']>after['readerStart']:raise ValueError('Overlapping original edition anchors.')
        rr=rows[before['sourceEnd']:after['sourceStart']];ww=words[before['readerEnd']:after['readerStart']]
        if not rr and not ww:continue
        reason=None
        if not 1<=len(rr)<=4 or not 1<=len(ww)<=8:reason='window-bounds'
        if reason is None:
            c,v,number,_=rr[0];key=(c,v)
            if any((cc,vv)!=key for cc,vv,_,_ in rr) or any(tuple(map(int,w['id'].split('-')[1:3]))!=key for w in ww):reason='different-verse-coordinates'
            elif key not in verses:reason='no-primary-verse'
        if reason is None:
            p=verses[key];sequence=[];position=0;start=end=None
            gap_numbers={n for _,_,n,_ in rr};gap_forms=[]
            for n,row in enumerate(source_verses[key]['rows'],1):
                info=row_info(row)
                if info is None:continue
                if info is False:reason='ambiguous-source-letters';break
                k,forms=info
                if n in gap_numbers:
                    if start is None:start=position
                    end=position+len(k);gap_forms.append({letters(f) for f in forms})
                sequence.append(k);position+=len(k)
            atoms=[a for a in re.split('[־\\s׀׆]+',p['text']) if letters(a)]
            keys=[canonical(letters(a)) for a in atoms]
            if reason is None and ''.join(keys)!=''.join(sequence):reason='primary-verse-differs'
        if reason is None:
            selected=[];position=0
            for i,(atom,k) in enumerate(zip(atoms,keys)):
                if position>=start and position+len(k)<=end:selected.append({'atom':i+1,'hebrew':atom,'start':position,'end':position+len(k)})
                position+=len(k)
            if len(selected)!=len(ww) or not selected or selected[0]['start']!=start or selected[-1]['end']!=end:reason='primary-atom-boundaries-differ'
            elif {''.join(parts) for parts in itertools.product(*gap_forms)}!={''.join(letters(a['hebrew']) for a in selected)}:reason='primary-word-letters-differ'
        if reason:
            refused.append({'readerIds':[w['id'] for w in ww],'sourceRows':[[cc,vv,n] for cc,vv,n,_ in rr],'reason':reason});continue
        window={'beforeGroup':before['group']['id'],'afterGroup':after['group']['id'],'beforeReaderEnd':words[before['readerEnd']-1]['id'],'afterReaderStart':words[after['readerStart']]['id']}
        gid=f'pmam-{book_id}-{c}-{v}-{number}'
        links=[{'kind':'mam-primary-edition-word','readerWordId':w['id'],'readerHebrew':w['sourceHebrew'],'primaryHebrew':a['hebrew'],'primaryAtom':a['atom'],'primaryVerse':p['osisID'],'sourceFileSha256':spec['sha256']} for w,a in zip(ww,selected)]
        group={'readerIds':[w['id'] for w in ww],'readerHebrew':[w['sourceHebrew'] for w in ww],'rows':[{'number':n,**r} for _,_,n,r in rr],
            'id':gid,'bookId':book_id,'displayChapter':c,'displayVerse':v,'readerStart':ww[0]['id'],'readerEnd':ww[-1]['id'],
            'flags':['primary-edition-correspondence','source-text-difference']+(['source-group'] if len(ww)>1 else []),'match':'primary-edition-words-between-anchors','variantWindow':window,'editionWordLinks':links,'primaryEditionArchiveSha256':archive_sha}
        added.append(group)
        evidence.append({'groupId':gid,'bookId':book_id,'readerIds':group['readerIds'],'readerHebrew':group['readerHebrew'],'sourceRows':[n for _,_,n,_ in rr],
            'editionWordLinks':links,'anchors':window,'primaryVerseText':p['text'],'sourceFile':spec,'archiveSha256':archive_sha})
    return added,evidence,refused
