# SPDX-License-Identifier: GPL-3.0-only
"""A closed, source-documented reading-form correspondence, never a normalizer.

Parse the pinned upstream rule as syntax evidence. Do not import/execute it.
The full marked primary verse must reproduce the original Phonetic MAM verse
after exactly its documented replacement. Both old word/row anchors remain.
"""
import ast,hashlib,json,re,zipfile

COMMIT='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
ARCHIVE_SHA='cf2aef1d9df85e4ead6f7ef9cfcb15001d777104a0c29b2dcbaddc7133292d0e'
RULE_PATH='py/phonetic_mam/core/qere_from_implicit_kq.py'
RULE_BLOB='5dcf34bd2e1fd4ad6de30c900366128b3dca7abd'
RULE_SHA='5cbfeb9f7e2cf626dc9695a8619a5c7c42b8597f5ef97ced9120d0abed163e3d'
READER='וּמְחִיּיָאֵ֗ל';PRIMARY='וּמְחִיָּיאֵ֗ל';READING='וּמְחִיָּאֵ֗ל'
letters=lambda s:re.sub('[^א-ת]','',s)
digest=lambda b:hashlib.sha256(b).hexdigest()

def source_rule(archive):
    raw=archive.read_bytes()
    if digest(raw)!=ARCHIVE_SHA:raise ValueError('Implicit-reading source archive changed.')
    with zipfile.ZipFile(archive) as z:
        manifest=json.loads(z.read('MANIFEST.json'))
        if manifest['commit']!=COMMIT or manifest['license']!='GPL-3.0-only' or set(z.namelist())!={RULE_PATH,'LICENSE','MANIFEST.json','NOTICE.txt'}:raise ValueError('Unpinned implicit-reading reference.')
        for spec in manifest['files']:
            b=z.read(spec['path'])
            if len(b)!=spec['bytes'] or digest(b)!=spec['sha256'] or hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()!=spec['gitBlob']:raise ValueError('Implicit-reading reference bytes changed.')
        code=z.read(RULE_PATH)
    if digest(code)!=RULE_SHA or hashlib.sha1(b'blob '+str(len(code)).encode()+b'\0'+code).hexdigest()!=RULE_BLOB:raise ValueError('Implicit-reading source rule changed.')
    tree=ast.parse(code);assignments={n.targets[0].id:n.value for n in tree.body if isinstance(n,ast.Assign) and len(n.targets)==1 and isinstance(n.targets[0],ast.Name)}
    def literal(node):
        if isinstance(node,ast.Constant) and isinstance(node.value,str):return node.value
        if isinstance(node,ast.BinOp) and isinstance(node.op,ast.Add):return literal(node.left)+literal(node.right)
        raise ValueError('Nonliteral source pattern needs review.')
    expr=assignments['_UMEXIYAEL']
    if not isinstance(expr,ast.Call) or not isinstance(expr.func,ast.Name) or expr.func.id!='_maybe_dx' or len(expr.args)!=1 or expr.keywords:raise ValueError('Source rule syntax changed.')
    pattern=literal(expr.args[0]);replacement=literal(assignments['_UMEXIYAEL_REPL_STR'])
    pairs=assignments['_PATT_REPL_PAIRS']
    if not isinstance(pairs,ast.Tuple) or not any(isinstance(n,ast.Tuple) and [v.id for v in n.elts if isinstance(v,ast.Name)]==['_UMEXIYAEL','_UMEXIYAEL_REPL_STR'] for n in pairs.elts):raise ValueError('Source rule is not registered.')
    match=re.fullmatch(pattern,PRIMARY)
    if match is None or match.expand(replacement)!=READING:raise ValueError('Source reading form changed.')
    return {'name':'_UMEXIYAEL','replacementName':'_UMEXIYAEL_REPL_STR','pattern':pattern,'replacement':replacement,'gitBlob':RULE_BLOB,'sha256':RULE_SHA,'sourceUrl':f'https://github.com/bdenckla/MAM-basics/blob/{COMMIT}/{RULE_PATH}'}

def anchored_implicit_reading(book_id,display,reader,groups,primary,spec,primary_sha,root):
    if book_id!='gen':return [],None
    rule=source_rule(root/'assets/pronunciation/implicit-reading-source.zip')
    from pronunciation_editions import primary_verses
    verse=primary_verses(primary)[(4,18)];display_verse=next(v for c in display['chapters'] if c['number']==4 for v in c['verses'] if v['number']==18)
    rows=display_verse['rows']
    if len(rows)!=12 or any(len(r['hebrew'])!=1 or len(r['hebrew'][0] or [])!=1 or not isinstance(r['hebrew'][0][0],str) for r in rows):raise ValueError('Implicit-reading source verse structure changed.')
    source_verse=' '.join(r['hebrew'][0][0] for r in rows)
    if verse['text'].count(PRIMARY)!=1 or verse['text'].replace(PRIMARY,READING,1)!=source_verse:raise ValueError('Complete marked primary/source verse differs beyond the documented reading.')
    atoms=[a for a in re.split(r'[־\s]+',verse['text']) if letters(a)]
    words=next(v['tokens'] for c in reader['chapters'] if c['number']==4 for v in c['verses'] if v['number']==18)
    if len(atoms)!=16 or atoms[8]!=PRIMARY or len(words)!=16 or words[8]!={'id':'gen-4-18-9','kind':'w','sourceHebrew':READER} or letters(READER)!=letters(PRIMARY):raise ValueError('Implicit-reading primary/reader atom identity changed.')
    by_id={g['id']:g for g in groups};before=by_id['pmam-gen-4-18-6'];after=by_id['pmam-gen-4-18-8']
    if before['readerIds']!=['gen-4-18-7','gen-4-18-8'] or after['readerIds']!=['gen-4-18-10'] or before['rows'][-1]['number']!=6 or after['rows'][0]['number']!=8 or rows[6]['hebrew']!=[[READING]]:raise ValueError('Implicit-reading word/row anchors changed.')
    for anchor in [before,after]:
        if anchor['bookId']!='gen' or (anchor['displayChapter'],anchor['displayVerse'])!=(4,18) or anchor['rows']!=[{'number':r['number'],**rows[r['number']-1]} for r in anchor['rows']]:raise ValueError('Implicit-reading original source anchor changed.')
    if any('gen-4-18-9' in g['readerIds'] or g['bookId']=='gen' and (g['displayChapter'],g['displayVerse'])==(4,18) and any(r['number']==7 for r in g['rows']) for g in groups):raise ValueError('Implicit-reading word/source row already assigned.')
    window={'beforeGroup':before['id'],'afterGroup':after['id'],'beforeReaderEnd':'gen-4-18-8','afterReaderStart':'gen-4-18-10'}
    link={'kind':'mam-explicit-implicit-reading-word','ruleId':'mam-umexiyael-gen4-18','readerWordId':'gen-4-18-9','readerHebrew':READER,'primaryHebrew':PRIMARY,'sourceReadingHebrew':READING,'primaryAtom':9,'primaryVerse':'Gen.4.18','sourceFileSha256':spec['sha256'],'sourceRuleGitBlob':RULE_BLOB,'sourceRuleSha256':RULE_SHA}
    group={'readerIds':['gen-4-18-9'],'readerHebrew':[READER],'rows':[{'number':7,**rows[6]}],'id':'pmam-gen-4-18-7','bookId':'gen','displayChapter':4,'displayVerse':18,'readerStart':'gen-4-18-9','readerEnd':'gen-4-18-9','flags':['documented-implicit-reading-form','source-text-difference'],'match':'primary-implicit-reading-between-anchors','variantWindow':window,'implicitReadingLinks':[link],'primaryEditionArchiveSha256':primary_sha,'implicitReadingSourceArchiveSha256':ARCHIVE_SHA}
    evidence={'schema':'tropetrain-explicit-implicit-reading-v1','revision':1,'sourceCommit':COMMIT,'license':'CC-BY-SA-4.0','groupId':group['id'],'link':link,'anchors':window,'sourceRule':rule,'sourceRuleArchive':'assets/pronunciation/implicit-reading-source.zip','sourceRuleArchiveSha256':ARCHIVE_SHA,'primaryArchive':'assets/pronunciation/mam-simple-torah-sources.zip','primaryArchiveSha256':primary_sha,'primarySourceFile':spec,'primaryVerseText':verse['text'],'sourceReadingVerseText':source_verse,'sourceRow':7,'review':'Exact contextual source-word correspondence through an explicit source reading rule. Original marked UXLC, primary MAM and Phonetic MAM remain separate and unchanged. No extra yod is allocated to a syllable; no phonemes, individual notes, audio times, independent singing voice or Kinnor grammar inferred. Qualified linguistic/cantorial review pending.'}
    return [group],evidence
