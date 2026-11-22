// Original validation of one factual source reading, not a pronunciation rule.
import {IMPLICIT_READING as evidence} from './pronunciation-implicit-reading-data.js';
const equal=(actual,expected)=>actual&&Object.keys(actual).length===Object.keys(expected).length&&Object.entries(expected).every(([key,value])=>actual[key]===value);
export const isImplicitReadingGroup=group=>group.readerIds?.includes(evidence.link.readerWordId)||group.id===evidence.groupId||group.match==='primary-implicit-reading-between-anchors'||Object.hasOwn(group,'implicitReadingLinks');
export function implicitReadingWordForm(group,index){
 const link=group.implicitReadingLinks?.[0],known=evidence.link;
 if(index!==0||group.id!==evidence.groupId||group.bookId!=='gen'||group.displayChapter!==4||group.displayVerse!==18||group.readerIds.length!==1||group.readerIds[0]!==known.readerWordId||group.readerHebrew[0]!==known.readerHebrew||group.readerStart!==known.readerWordId||group.readerEnd!==known.readerWordId||group.implicitReadingLinks?.length!==1||!equal(link,known)||group.match!=='primary-implicit-reading-between-anchors'||!group.flags.includes('documented-implicit-reading-form')||!equal(group.variantWindow,evidence.anchors)||group.primaryEditionArchiveSha256!==evidence.primaryArchiveSha256||group.implicitReadingSourceArchiveSha256!==evidence.sourceRuleArchiveSha256||group.rows.length!==1||group.rows[0].number!==7||JSON.stringify(group.rows[0].hebrew)!==JSON.stringify([[known.sourceReadingHebrew]]))
  throw Error('The documented implicit-reading correspondence needs review.');
 return known.sourceReadingHebrew.replace(/[^א-ת]/gu,'');
}
