// Navigation is distinct from word ownership for a joint source word.
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const isJointEvent=e=>e?.sourceSyllableLink?.alignmentLevel==='source-reading-group';
export const eventNavigationIndex=e=>isJointEvent(e)?e.navigationWordIndex:e.wordIndex;
export function jointEventCorrespondence(event,words){
 if(!isJointEvent(event)||event.wordId!==null||event.sourceWordId!==null||event.wordIndex!==null)throw Error('Joint source notes must keep individual word ownership null.');
 const first=words[event.navigationWordIndex],group=first?.sourceJointGroup;
 if(!group||group.id!==event.jointGroupId||event.navigationWordId!==first.id||!equal(event.wordIds,group.wordIds)||!equal(event.sourceWordIds,group.sourceWordIds)||!equal(event.wordIndices,group.wordIndices)||group.navigationWordIndex!==event.navigationWordIndex)throw Error('Joint source note lost its complete word occurrence group.');
 const members=group.wordIndices.map(i=>words[i]);
 if(members.some((w,i)=>!w||w.id!==group.wordIds[i]||(w.sourceWordId??w.id)!==group.sourceWordIds[i]||w.sourceHebrew!==group.readerHebrew[i]||!equal(w.sourceJointGroup,group)))throw Error('Joint source reader words or accents changed.');
 const syllable=group.syllables.find(s=>s.id===event.syllableId),link=event.sourceSyllableLink;
 if(!syllable||syllable.sourceHebrew!==event.syllable||link.jointGroupId!==group.id||link.sourceGroupId!==group.sourceGroupId||!equal(link.wordIds,group.wordIds)||!equal(link.sourceWordIds,group.sourceWordIds)||!equal(link.readerHebrew,group.readerHebrew)||link.sourceReadingHebrew!==group.sourceReadingHebrew||link.writtenRange!==null||!equal(link.sourceReadingRange,syllable.sourceReadingRange)||!equal(link.sourceUnitIds,syllable.sourceUnitIds)||!equal(link.sourceReadingChoices,group.sourceReadingChoices))throw Error('Joint source note syllable correspondence changed.');
 return {group,syllable,word:first,members};
}
