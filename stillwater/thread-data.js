/* Stillwater: editorial themes connect questions, not doctrines.
   Exact mappings cover the original catalog; phrase matches extend them to new cards. */
(() => {
 'use strict';
 const themes=[
 ['Showing up for others','tarfon lib-0-1-2 lib-0-1-14 lib-2-berakhot-5b lib-2-shabbat-127a lib-2-taanit-23a lib-2-sotah-14a sw-f26f53c242a2 metta bell lib-3-12-13-14',/help(ing)? (others|another)|compassion|loving kindness|acts? of kindness|visit(ing)? (the|a) sick/],
 ['Doing the work and letting go','tarfon gita lib-3-2-48 lib-3-3-19 lib-6-1 lib-0-1-3 lib-6-46 lib-0-1-17',/fruit(s)? of (the |your )?action|grip on the results|without (attachment|expecting a reward)|outcome of (the |your )?(work|action)/],
 ['Change and what we hold onto','foam sw-da6e71ed8fd2 lib-3-2-14 sw-c5293ea0a265 lib-1-dhp273-289-277 watts sw-art-cma-153737',/impermanen|all things (change|pass)|comes? into being and passes|arising and passing|changing (seasons|world)/],
 ['Coming back to attention','lib-1-dhp21-32-21 lib-5-27 lib-1-dhp33-43-33 lib-1-dhp33-43-35 lib-5-28 lib-3-6-26 remember dukkha',/mind (wanders|wandering)|bring (the|your) mind back|return to (the breath|prayer)|careful attention|pay attention/],
 ['Seeing before judging','pebbles sw-note-steiner-observe lib-6-5 lib-0-2-4 lib-6-20 lib-2-eruvin-13b mirror recovery',/first impression|mind tells a story|before you judge|look again|point of view|generous reading/],
 ['Learning from other people','who sw-a71e0f0ade9e lib-0-1-6 sw-04d2d4cf803b sw-b5338595108a lib-0-2-5 lib-2-eruvin-13b lib-4-49-13 lib-2-berakhot-58a',/learn(ing)? from (others|one another|every person)|come to know one another|another point of view/],
 ['Steadiness in a difficult moment','lib-1-dhp21-32-25 lib-4-94-5-6 sw-b344f355fcf3 lib-4-2-286 lib-6-10 lib-1-dhp76-89-81 lib-3-2-14 lib-3-2-48 sw-9005ba14f3b3',/praise and blame|pleasure and pain|steady (mind|heart)|ease (alongside|in) difficulty|equanimity|peace of mind/],
 ['Anger and the choice to respond','hatred lib-0-1-12 lib-2-berakhot-10a lib-6-20 lib-1-dhp100-115-103 lib-1-dhp221-234-222 lib-0-4-15 hillel',/hatred|resentment|anger (arises|passes)|own temper|forbearance/],
 ['Words put into practice','lib-0-1-15 lib-0-1-17 lib-1-dhp44-59-51-52 lib-6-46 sw-d3fd2f1fc586 sw-236b6a162539 lib-3-17-15',/words and (deeds|actions)|put.{0,20}into practice|show up in how you live/],
 ['Speech and listening','watch lib-0-1-17 lib-6-33 lib-2-bava-metzia-58b lib-3-17-15 lib-0-4-15 lib-2-eruvin-13b',/right speech|before speaking|listen(ing)? closely|words (hurt|can wound)|room for silence/],
 ['Presence in ordinary life','salt return world lib-7-186-187 lib-4-50-16 lib-5-33 lib-5-34 sw-f26f53c242a2 dukkha lib-0-3-2',/divine (presence|is present|is nearer)|holy in the ordinary|ordinary (acts|life)|wherever you turn/],
 ['What makes room','room hevajra silk sw-372a25e73321 sw-44f45b284e04 lib-1-dhp76-89-82 moon',/empty space|whole pattern|muddy water|settle like|notice the space|gaze rest/],
 ['Light as an image','lib-4-24-35 tide sw-d3088d94b8a5 sw-4a7c8d287015 sw-9005ba14f3b3 sw-b97bb11291a6',/light upon light|light (of day|of reason|of the soul)|lamp is|gleam of light/],
 ['Grief and what remains','sw-note-spiritualism-grief watch hope lib-2-shabbat-127a lib-0-4-15 lib-4-93-3-5 sw-d63a7fd1c9c7',/grief|mourning|bereave|loved ones? (die|dies|died)|accompanying someone in grief/],
 ['Desire and enough','threshold lib-3-2-70 sw-b7b64a518828 lib-4-55-7-9 lib-1-dhp290-305-290 sw-99878b88e54b watts',/desires? (which|that|for)|craving|taking more than|longing that|satisfaction/],
 ['Practice grows over time','tide lib-3-4-38 sw-3408f1b8f4fb lib-1-dhp235-255-239 lib-0-3-17 lib-3-6-16-17 lib-1-dhp153-166-160',/grow (slowly|with time)|little at a time|over time|patient practice|keep practicing/],
 ['Care for beings unlike ourselves','metta bell lib-5-32 lib-3-5-18 lib-3-6-29 lib-1-dhp129-145-129-130 lib-2-berakhot-58a sw-91b4c4ff57dd',/all beings|every being|other beings|all living things|one another.s suffering/],
 ['Joy and devotion','sw-afd192ba5398 sw-e8bc891d2697 lib-4-13-28 lib-5-26 sw-2e37cf65c909 lib-5-33 sw-eacc4c32be97 sw-98b10c774b22',/joy (of|in) (prayer|devotion|singing)|remembrance of god|heart (finds|find) .{0,14}rest/],
 ['Words and the limits of words','sw-6de9d3d22409 heart lib-2-bava-metzia-59b lib-1-dhp60-75-64-65 moon mirror',/cannot be expressed|beyond words|direct experience|system of doctrine/],
 ['Turning attention toward yourself','lib-1-dhp44-59-50 sw-431c7a892e4c sw-note-steiner-agency lib-1-dhp76-89-76 sw-18f7eb56dc82 lib-4-59-18 lib-6-4 lib-6-5',/look at (your|what you did)|tell the truth to oursel|our own faults|habit you overlooked/],
 ['Bringing a little patience','lib-2-shabbat-31a lib-6-8 sw-3408f1b8f4fb lib-1-dhp33-43-33 sw-44f45b284e04 lib-0-4-15 lib-3-4-38',/give it time|patient care|patience makes|let it be still/],
 ['How we act toward others','sw-17f8c09a44e5 lib-0-2-9 lib-0-4-3 lib-4-28-77 lib-1-dhp183-196-183 lib-1-dhp256-272-260-261 hillel metta lib-1-dhp44-59-49',/leave harm aside|truthfulness and care|do good as you|respect for others/],
 ['Images of mind and feeling','waters foam sw-87c7aa8d5444 sw-bc69e388af10 sw-cb8572a20f4c lib-1-dhp76-89-82 sw-44f45b284e04 lib-3-2-70',/mind like (a )?(lake|stream|river|ocean)|mind.{0,30}like water/],
 ['Guiding our impulses','lib-8-1-3-3-9 lib-1-dhp221-234-222 sw-87c7aa8d5444 sw-bc69e388af10 lib-6-20 lib-1-dhp153-166-160 sw-b7b64a518828 lib-0-5-20',/mind as reins|feeling (rises|arises)|train(ing)? (this|your|the) mind/],
 ['Finding your own voice','sw-059aae75c41a sw-4a7c8d287015 moon grass sw-note-steiner-agency',/your own voice|voice from within|freedom to choose/],
 ['Love and absence','sw-25b5982e69c3 sw-d63a7fd1c9c7 watch sw-note-spiritualism-grief lib-4-93-3-5 lib-5-31',/memory of (a |the )?loved one|longing for the beloved|love in absence/],
 ['Images for close looking','room hevajra sw-art-met-37823 sw-art-cma-154073 sw-art-cma-153760 sw-art-met-53205 sw-art-cma-154395 sw-art-cma-147569 sw-art-cma-149682 sw-art-cma-153737 silk',/\b(thangka|mandala|bodhisattva)\b/]
 ].map(([label, ids, match])=>({label, ids:new Set(ids.split(' ')), match}));
 function affinities(c) {
   const s=String(c.text||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
   return themes.map(t=>t.ids.has(c.id)?3:(t.label!=='Images for close looking'||c.group==='Looking')&&t.match.test(s)?1:0);
 }
 const norm=v=>String(v||'').trim().toLowerCase();
 const family=(group)=>{
   if (['Mishnah','Talmud','Kabbalah','Mussar','Hasidism','Judaism'].includes(group)) return 'Jewish';
   if (['Early Buddhism','Mahāyāna','Tibetan Buddhism','Zen','Buddhism'].includes(group)) return 'Buddhist';
   if (['Sufism','Islam'].includes(group)) return 'Muslim';
   if (['Vedanta','Hinduism','Bhakti','Yoga'].includes(group)) return 'Hindu';
   return group;
 };
 function source(c) {
   // Skip different descriptions/translations of an identical cited passage.
   const key=String(c.source||'').split(' · ').slice(0,2).join(' · ');
   return norm(key);
 }
 window.stillwaterRelated=function(card,catalog) {
   if (!card || !Array.isArray(catalog)) return [];
   const affinity=affinities(card), ownFamily=family(card.group), ownSource=source(card);
   if (!affinity.some(Boolean)) return [];
   const candidates=[], seen=new Set([card.id]);
   for (const other of catalog) {
     if (!other?.id || seen.has(other.id)) continue;
     seen.add(other.id);
     const citation=source(other);
     if ((ownSource&&citation===ownSource)||norm(other.text)===norm(card.text)) continue;
     const weights=affinities(other);
     const common=themes.map((t,i)=>({theme:t.label,score:affinity[i]*weights[i]})).filter(t=>t.score).sort((a,b)=>b.score-a.score);
     if (!common.length) continue;
     candidates.push({card:other,theme:common[0].theme,score:common[0].score+Math.min(2,common.length-1),citation,family:family(other.group)});
   }
   const usedTraditions=new Set(), usedSources=new Set(), result=[];
   while(candidates.length&&result.length<4) {
     const score=x=>x.score+(x.family!==ownFamily&&x.family!=='Looking'?2:0)+(usedTraditions.has(x.family)?0:4);
     candidates.sort((a,b)=>score(b)-score(a));
     const x=candidates.shift();
     if(x.citation&&usedSources.has(x.citation)) continue;
     result.push({card:x.card,theme:x.theme});
     usedTraditions.add(x.family);
     if(x.citation) usedSources.add(x.citation);
   }
   return result;
 };
})();
