import {writtenReadingGroups} from './repertoire.js';

// Connect only preferred-reading source IDs to actual reading occurrences.
// Written-only forms remain inspectable text, with no invented sound target.
export function sourceAlternatives(verses,words){
  const byOccurrence=new Map(words.map(word=>[`${word.sectionId}|${word.sourceWordId??word.id}`,word]));
  return verses.flatMap(verse=>writtenReadingGroups(verse.sourceTokens??[])
    .filter(group=>group.status!=='same').map(group=>({
      id:`${group.id}@${verse.sectionId}`,reference:verse.reference,sectionId:verse.sectionId,
      status:group.status,written:group.written,
      reading:group.reading.map(token=>({token,word:byOccurrence.get(`${verse.sectionId}|${token.id}`)??null}))
    })));
}
