"""Independent literal enumeration; imports no production join or alignment code."""
from pathlib import Path
import collections,gzip,hashlib,itertools,json,re
ROOT=Path(__file__).resolve().parents[1]
data=json.loads(gzip.decompress((ROOT/'data/pronunciation/torah-display.json.gz').read_bytes()))
def inline(nodes):
 if nodes is None:return None
 return ''.join(n if isinstance(n,str) else 'ᵉ' if n['kind']=='superscript-e' else inline(n['content']) for n in nodes)
def letters(text):return ''.join(re.findall('[א-ת]',text))
def forms(text):
 raw=letters(text);values={raw}
 if re.fullmatch('[ובכלמשה]{0,3}יהוה',raw):values.update([raw[:-4]+'אדני',raw[:-4]+'אלהים'])
 clusters=re.findall('[א-ת][^א-ת]*',text)
 if raw.endswith('הוא') and '\u05b4' in clusters[-3]:values.add(raw[:-3]+'היא')
 if re.fullmatch('[ובכלמשה]{0,3}יששכר',raw):values.add(raw.replace('יששכר','ישכר'))
 return sorted(values)
styles={s:collections.Counter({k:0 for k in ['singleWordGroups','joinedGroupsAligned','joinedGroupsPartial','joinedGroupsUnsplit','wordsWithUnits','assignedUnits','groupOnlyUnits','missingCells','repeatCells','unresolvedRepeats','resolvedRepeatUnits']}) for s in ['sephardic','ashkenazic']};hashes={s:hashlib.sha256() for s in styles};literal_hashes={s:hashlib.sha256() for s in styles};words={s:set() for s in styles};enumerated=0;maximum=0
base_hashes={s:hashlib.sha256() for s in styles};base_literal_hashes={s:hashlib.sha256() for s in styles}
for group in data['groups']:
 single=len(group['readerIds'])==1;proof=None
 if not single:
  source_rows=[]
  for row in group['rows']:
   variants=[]
   for cell in row['hebrew']:
    if cell is None:continue
    parts=[letters(m[0]) for m in re.finditer('[^־\\s]+',inline(cell))]
    if not parts or not all(parts):raise AssertionError('Unaccounted nonlexical source cell')
    variants.append(parts)
   if not variants or len({len(v) for v in variants})!=1:raise AssertionError('Unaccounted alternative boundaries')
   source_rows.append(variants)
  proof=[[set() for _ in row[0]] for row in source_rows]
  choices=[set(forms(h)) for h in group['readerHebrew']]
  for variant in group.get('writtenReadVariants',[]):choices[group['readerIds'].index(variant['readerWordId'])].add(letters(variant['writtenHebrew']))
  reader_choices=list(itertools.product(*(sorted(c) for c in choices)));maximum=max(maximum,len(reader_choices))
  for source_choice in itertools.product(*source_rows):
   source=''.join(p for row in source_choice for p in row);matches=[]
   for choice in reader_choices:
    enumerated+=1
    if ''.join(choice)==source:matches.append(choice)
   if not matches:raise AssertionError('Unaccounted reader-form mismatch: '+group['id'])
   for choice in matches:
    ends=list(itertools.accumulate(map(len,choice)));starts=[0]+ends[:-1];source_position=0
    for row_index,row_parts in enumerate(source_choice):
     for part_index,part in enumerate(row_parts):
      finish=source_position+len(part)
      for word,(start,end) in enumerate(zip(starts,ends)):
       if start<finish and end>source_position:proof[row_index][part_index].add(word)
      source_position=finish
 for style,count in styles.items():
  group_units=[]
  for row_index,row in enumerate(group['rows']):
   for column,cell in enumerate(row['transcriptions'][style],1):
    text=inline(cell);is_repeat=False
    if text is None:count['missingCells']+=1;continue
    if text=='—':
     count['repeatCells']+=1
     first=row['transcriptions'][style][0]
     labels=[n.get('label') for h in row['hebrew'] if h is not None for n in h if isinstance(n,dict) and n.get('kind')=='reading']
     if column!=2 or first is None or len(first)!=1 or not isinstance(first[0],dict) or first[0].get('kind')!='reading' or first[0].get('label')!='קמץ-ד' or not any(x in ['קמץ-ס','טעם תחתון, קמץ-ס','טעם עליון, קמץ-ס'] for x in labels):
      count['unresolvedRepeats']+=1;continue
     text=inline(first);is_repeat=True
    assert all(ord(c)<=0xffff for c in text),'UTF16 offset audit needs an astral-character update'
    parts=list(re.finditer('[^-\\s]+',text));units=list(re.finditer('[^·\\-\\s]+',text))
    if is_repeat:count['resolvedRepeatUnits']+=len(units)
    valid=single or len(parts)==len(proof[row_index])
    for unit_number,unit in enumerate(units,1):
     owner=None
     if single:owner=group['readerIds'][0]
     elif valid:
      part_index=next(i for i,p in enumerate(parts) if p.start()<=unit.start() and p.end()>=unit.end())
      owners=proof[row_index][part_index]
      if len(owners)==1:owner=group['readerIds'][next(iter(owners))]
     group_units.append(owner)
     if owner is None:count['groupOnlyUnits']+=1
     else:count['assignedUnits']+=1;words[style].add(owner)
     record=[style,group['id'],row['number'],column,unit_number,owner]
     line=(json.dumps(record,separators=(',',':'))+'\n').encode();hashes[style].update(line)
     if not is_repeat:literal_hashes[style].update(line)
     if 'writtenReadVariants' not in group:
      base_hashes[style].update(line)
      if not is_repeat:base_literal_hashes[style].update(line)
  assigned=sum(owner is not None for owner in group_units)
  key='singleWordGroups' if single else 'joinedGroupsAligned' if group_units and assigned==len(group_units) else 'joinedGroupsPartial' if assigned else 'joinedGroupsUnsplit'
  count[key]+=1
for style,count in styles.items():count['wordsWithUnits']=len(words[style]);count['assignmentSha256']=hashes[style].hexdigest();count['literalAssignmentSha256']=literal_hashes[style].hexdigest();count['baseAssignmentSha256']=base_hashes[style].hexdigest();count['baseLiteralAssignmentSha256']=base_literal_hashes[style].hexdigest()
print(json.dumps({'styles':styles,'enumeratedReaderChoices':enumerated,'maximumReaderChoices':maximum}))
