"""Exact UXLC written/read variants, only within already anchored source gaps.

This is correspondence evidence, not a spelling normalizer or phonology rule.
The original written and reading strings, source rows and all marks survive.
"""
import hashlib,itertools,json,re

def letters(text):return re.sub('[^א-ת]','',text)
def flatten(nodes):return '' if nodes is None else ''.join(n if isinstance(n,str) else flatten(n.get('content',[])) for n in nodes)
def digest_groups(groups):return hashlib.sha256(json.dumps(groups,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def explicit_pairs(book):
    pairs={}
    for chapter in book['chapters']:
        for verse in chapter['verses']:
            tokens=verse['tokens'];index=0
            while index<len(tokens):
                if tokens[index]['kind']!='k':index+=1;continue
                written=[];reading=[]
                while index<len(tokens) and tokens[index]['kind']=='k':written.append(tokens[index]);index+=1
                while index<len(tokens) and tokens[index]['kind']=='q':reading.append(tokens[index]);index+=1
                if len(written)==len(reading)==1:
                    q=reading[0];k=written[0]
                    pairs[q['id']]={'kind':'uxlc-explicit-one-written-one-reading','chapter':chapter['number'],'verse':verse['number'],
                        'readerWordId':q['id'],'readerHebrew':q['sourceHebrew'],'writtenTokenId':k['id'],'writtenHebrew':k['sourceHebrew']}
    return pairs

def anchored_written_variants(book_id,display,book,base_groups,row_info,reader_sha,source_spec):
    rows=[]
    for chapter in display['chapters']:
        for verse in chapter['verses']:
            for number,row in enumerate(verse['rows'],1):
                if row_info(row) is not None:rows.append((chapter['number'],verse['number'],number,row))
    words=[word for c in book['chapters'] for v in c['verses'] for word in v['tokens'] if word['kind']!='k' and letters(word['sourceHebrew'])]
    word_index={word['id']:i for i,word in enumerate(words)}
    row_index={(c,v,n):i for i,(c,v,n,_) in enumerate(rows)}
    anchors=[]
    for group in base_groups:
        indexes=[row_index[(group['displayChapter'],group['displayVerse'],r['number'])] for r in group['rows']]
        anchors.append({'id':group['id'],'sourceStart':min(indexes),'sourceEnd':max(indexes)+1,
            'readerStart':word_index[group['readerIds'][0]],'readerEnd':word_index[group['readerIds'][-1]]+1})
    anchors.sort(key=lambda a:a['sourceStart']);pairs=explicit_pairs(book);extra=[];evidence=[]
    for before,after in zip(anchors,anchors[1:]):
        assert before['sourceEnd']<=after['sourceStart'] and before['readerEnd']<=after['readerStart']
        source_rows=rows[before['sourceEnd']:after['sourceStart']];target=words[before['readerEnd']:after['readerStart']]
        # No open-ended windows, guessed offsets, multirow interpolation or
        # inferred written/read partition. Each new link needs both old anchors.
        if len(source_rows)!=1 or not 1<=len(target)<=2:continue
        variants=[pairs[w['id']] for w in target if w['id'] in pairs]
        if not variants:continue
        c,v,number,row=source_rows[0]
        if any((p['chapter'],p['verse'])!=(c,v) for p in variants):continue
        if any(tuple(map(int,w['id'].split('-')[1:3]))!=(c,v) for w in target):continue
        source_forms={letters(flatten(cell)) for cell in row['hebrew'] if cell is not None}
        choices=[{letters(w['sourceHebrew'])}|({letters(pairs[w['id']]['writtenHebrew'])} if w['id'] in pairs else set()) for w in target]
        allowed={''.join(parts) for parts in itertools.product(*choices)}
        raw=''.join(letters(w['sourceHebrew']) for w in target)
        if not source_forms or not source_forms<=allowed or source_forms=={raw}:continue
        gid=f'pmam-{book_id}-{c}-{v}-{number}'
        window={'beforeGroup':before['id'],'afterGroup':after['id'],
            'beforeReaderEnd':words[before['readerEnd']-1]['id'],'afterReaderStart':words[after['readerStart']]['id']}
        group={'readerIds':[w['id'] for w in target],'readerHebrew':[w['sourceHebrew'] for w in target],
            'rows':[{'number':number,**row}],'flags':['explicit-written-read-variant','source-text-difference']+(['source-group'] if len(target)>1 else []),
            'id':gid,'bookId':book_id,'displayChapter':c,'displayVerse':v,
            'match':'explicit-written-read-variants-between-anchors','variantWindow':window,
            'writtenReadVariants':variants,'readerStart':target[0]['id'],'readerEnd':target[-1]['id']}
        extra.append(group)
        evidence.append({'groupId':gid,'bookId':book_id,'displayChapter':c,'displayVerse':v,'rowNumber':number,
            'readerIds':group['readerIds'],'readerHebrew':group['readerHebrew'],
            'sourceHebrew':row['hebrew'],'writtenReadVariants':variants,'anchors':window,
            'readerBookSha256':reader_sha,'sourceFile':source_spec})
    return extra,evidence,word_index
