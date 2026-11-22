# SPDX-License-Identifier: GPL-3.0-only
"""Closed documentary projection of a pinned IPA proposal; no upstream execution."""
from pathlib import Path
import ast,gzip,hashlib,json,zipfile
ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=ROOT/'assets/pronunciation/ipa-proposal-sources.zip'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def build():
 raw=ARCHIVE.read_bytes()
 with zipfile.ZipFile(ARCHIVE) as z:source=z.read('py/phonetic_mam/core/ipa.py')
 assert hashlib.sha1(b'blob '+str(len(source)).encode()+b'\0'+source).hexdigest()=='ad3d3c368f5197644ef23b3eb92e1ada73d5be58'
 tree=ast.parse(source);node=next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='_IPA_FROM_UDL' for t in n.targets));assert isinstance(node,ast.Dict)
 entries={};lines=source.decode().splitlines()
 for key,value in zip(node.keys,node.values,strict=True):
  assert isinstance(key,ast.Attribute) and isinstance(key.value,ast.Name) and key.value.id=='deeplat' and isinstance(value,ast.Constant) and isinstance(value.value,str)
  comment=lines[value.lineno-1].partition('#')[2].strip() or None;assert key.attr not in entries
  entries[key.attr]={'ipa':value.value,'sourceLine':value.lineno,'sourceComment':comment,'questioned':bool(comment and ('?' in comment or 'not sure' in comment))}
 packet=ROOT/'data/pronunciation/torah-segments.json.gz';packet_raw=packet.read_bytes();data=json.loads(gzip.decompress(packet_raw));catalog=[]
 for category in data['catalog']:
  row=entries[category['id']];value=row['ipa'];half=None
  if category['geminate'] and len(value)%2==0 and value[:len(value)//2]*2==value:half=value[:len(value)//2]
  catalog.append({'categoryId':category['id'],'label':category['label'],'kind':category['kind'],'geminate':category['geminate'],**row,'sharedHalfIpa':half,'sharedHalfStatus':'literal-repeated-half' if half is not None else 'not-applicable' if not category['geminate'] else 'withheld-no-source-half','acousticPhonemes':None})
 assert len(entries)==89 and len(catalog)==87 and set(entries)-{x['categoryId'] for x in catalog}=={'BLACK_MAQAF','GRAY_MAQAF'}
 result={'schema':'tropetrain-source-ipa-proposal-v1','revision':1,'sourceCommit':data['sourceCommit'],'source':'https://github.com/bdenckla/MAM-basics/blob/6f0612ed2109d32e288d7c0ca41ae3dbfaad702b/py/phonetic_mam/core/ipa.py','sourceGitBlob':'ad3d3c368f5197644ef23b3eb92e1ada73d5be58','sourceBytes':len(source),'sourceSha256':sha(source),'archive':{'path':'assets/pronunciation/ipa-proposal-sources.zip','bytes':len(raw),'sha256':sha(raw),'license':'GPL-3.0-only'},'categoryPacketSha256':sha(packet_raw),'projectionLicense':'GPL-3.0-only','parameterizedByTextStyle':False,'phonologicalReview':None,'acousticReview':None,'scope':'One literal source IPA proposal, separately displayed as documentary evidence. It is not an IPA rendering of either selected MAM text style or a reviewed historical pronunciation. Source question marks/notes remain explicit. Shared halves are projected only where the source value is literally a doubled string; the tsadi geminate half remains withheld. No upstream code executes. No Hebrew, existing transcription, syllable division, notes or audio times change.','counts':{'categories':len(catalog),'questionedCategories':sum(x['questioned'] for x in catalog),'geminateCategories':sum(x['geminate'] for x in catalog),'withheldSharedHalfCategories':sum(x['sharedHalfStatus']=='withheld-no-source-half' for x in catalog)},'catalog':catalog}
 return result
if __name__=='__main__':
 result=build();text=json.dumps(result,ensure_ascii=False,indent=2)+'\n';(ROOT/'docs/PRONUNCIATION-IPA-PROPOSAL.json').write_text(text);(ROOT/'pronunciation-ipa-data.js').write_text('// Separate GPL3 source-document evidence; no phonological realization is executed.\nexport const SOURCE_IPA_PROPOSAL='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n');print(json.dumps(result['counts']))
