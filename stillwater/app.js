'use strict';
const catalog=window.STILL_CARDS, byId=new Map(catalog.map(c=>[c.id,c])), $=id=>document.getElementById(id);
const STORE='stillwater-notebook-v1', batch=10;
const attrs={feed:'<path d="M3 5h18M3 12h18M3 19h18"/>',book:'<path d="M4 5h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4zM14 8a3 3 0 0 1 3-3h3v13h-3a3 3 0 0 0-3 3"/>',save:'<path d="M6 4h12v17l-6-4-6 4z"/>',share:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',spark:'<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z"/>', pin:'<path d="m13 3 8 8-3 1-3 5-3-1-5 5-1-1 5-5-1-3 5-3z"/>',pen:'<path d="m4 16 12-12 4 4L8 20H4zM14 6l4 4"/>'};
const icon=k=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+attrs[k]+'</svg>';
function el(tag,cls,t){const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=t;return n;}
function btn(label,cls,act,k){const n=el('button',cls);n.type='button';if(k)n.innerHTML=icon(k);n.append(document.createTextNode(label));n.addEventListener('click',act);return n;}
let scrollMore, readingObserver;
const PROGRESS='stillwater-feed-position-v1';
let lastRead='';
try{lastRead=localStorage.getItem(PROGRESS)||'';}catch(e){}
const resumeId=lastRead;
const ORDER='stillwater-feed-order-v1', RESUME_ORDER='stillwater-resume-order-v1';
function shuffled(items){
 const out=items.slice();
 for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
function previousOrder(storageKey){
 try{const ids=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(ids)?Array.from(new Set(ids)).filter(id=>byId.has(id)):[];}catch(e){return [];}
}
function rememberOrder(order,storageKey=ORDER){
 try{localStorage.setItem(storageKey,JSON.stringify(order.map(c=>c.id)));}catch(e){}
}
function freshOrder(exclude){
 const recent=new Set(exclude.slice(0,batch));
 return [...shuffled(catalog.filter(c=>!recent.has(c.id))),...shuffled(catalog.filter(c=>recent.has(c.id)))];
}
const previous=previousOrder(ORDER);
const resumeOrder=previousOrder(RESUME_ORDER);
let C=freshOrder(previous);
rememberOrder(C);
function restoreOrder(ids){
 const known=new Set(ids);
 return [...ids.map(id=>byId.get(id)),...C.filter(c=>!known.has(c.id))];
}
function showResume(){
 const row=$('feedResume'), next=byId.get(resumeId);
 row.replaceChildren();row.hidden=group!=='All'||!!$('feedSearch').value.trim();
 if(row.hidden)return;
 row.append(btn('Fresh mix','small secondary',()=>{
   C=freshOrder(C.map(c=>c.id));rememberOrder(C);limit=batch;renderFeed();
   window.scrollTo(0,0);
   $('feedResume').querySelector('button')?.focus({preventScroll:true});
 }));
 if(next)row.append(btn('Continue where you left off','small secondary',()=>{
   if(resumeOrder.length){C=restoreOrder(resumeOrder);rememberOrder(C);}
   const i=C.findIndex(c=>c.id===resumeId);
   limit=Math.min(C.length,Math.max(batch,Math.ceil((i+1)/batch)*batch));
   renderFeed();
   focusCard(resumeId);
 }));
}
function watchReading(cards){
 if(typeof IntersectionObserver!=='function')return;
 if(!readingObserver)readingObserver=new IntersectionObserver(entries=>{
   if(tab!=='feed'||group!=='All'||$('feedSearch').value.trim())return;
   const candidates=entries.filter(e=>e.isIntersecting && e.intersectionRatio>=.62);
   if(!candidates.length || window.scrollY<150)return;
   const id=candidates.at(-1).target.dataset.card;
   if(id===lastRead)return;
   lastRead=id;try{localStorage.setItem(PROGRESS,id);rememberOrder(C,RESUME_ORDER);}catch(e){}
 },{threshold:[.62]});
 for(const n of cards)readingObserver.observe(n);
}
let shelf={},storageOK=true,group='All',limit=batch,tab='feed',toastTime;
function validated(x){const out={};if(!x||typeof x!=='object'||Array.isArray(x))return out;for(const id of Object.keys(x)){const v=x[id];if(!byId.has(id)||!v||typeof v!=='object'||Array.isArray(v))continue;out[id]={note:typeof v.note==='string'?v.note.slice(0,4000):'',history: Array.isArray(v.history)?v.history.filter(h=>h&&typeof h.note==='string'&&Number.isFinite(h.at)).slice(0,30).map(h=>({note:h.note.slice(0,4000),at:h.at})):[], reflectedAt:Number.isFinite(v.reflectedAt)?v.reflectedAt:0,pin:v.pin===true,at:typeof v.at==='number'&&Number.isFinite(v.at)?Math.max(0,v.at):0};}return out;}
try{shelf=validated(JSON.parse(localStorage.getItem(STORE)||'{}'));}catch(e){storageOK=false;}
const count=()=>Object.keys(shelf).length;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(shelf));storageOK=true;return true;}catch(e){storageOK=false;return false;}}
function toast(message){clearTimeout(toastTime);$('status').textContent=message;toastTime=setTimeout(()=>$('status').textContent='',3000);}
function change(update,message){update();const ok=persist();syncButtons();if(tab==='notes')renderNotebook();toast(ok?message:'Kept for this session only. Export to keep a copy.');}
function saved(c){return Object.hasOwn(shelf,c.id);}
function keep(c){if(saved(c)){toast('Already in your notebook');return;}change(()=>shelf[c.id]={at:Date.now(),note:'',pin:false},'Saved to notebook');}
function remove(c){if(shelf[c.id]?.note){const part=document.createDocumentFragment();part.append(el('p',null,'This will also remove your note for this passage.'));part.append(btn('Remove passage','small primary',()=>{ $('modal').close();removeNow(c); }));return dialog('Remove from notebook?',part);}removeNow(c);}
function removeNow(c){change(()=>delete shelf[c.id],'Removed from notebook');}
function syncButtons(){for(const b of document.querySelectorAll('[data-save]')){const on=Object.hasOwn(shelf,b.dataset.save);b.classList.toggle('saved',on);b.setAttribute('aria-pressed',String(on));b.querySelector('span').textContent=on?'Saved':'Save';}$('tabNotes').querySelector('span').textContent=count()?'Notebook · '+count():'Notebook';}
function key(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function matches(c,q,note=''){return key([c.group,c.author,c.source,c.text,c.kind,note].join(' ')).includes(key(q));}
function filtered(){return C.filter(c=>(group==='All'||group===c.group)&&matches(c,$('feedSearch').value));}
const glyphs={'All':'≋','Mishnah':'מ','Talmud':'ת','Kabbalah':'✡','Mussar':'מ','Early Buddhism':'◉','Mahāyāna':'✺','Tibetan Buddhism':'❖','Zen':'◯','Sufism':'☾','Vedanta':'ॐ','Poetry':'✒','Modern thinkers':'✦','Looking':'⊙'};
function glyph(type){return glyphs[type]||'•';}
function card(c,mode='feed'){
 const n=el('article','card');n.dataset.theme=c.theme;n.dataset.card=c.id;n.tabIndex=-1;
 const head=el('header','post-header');
 const avatar=el('span','avatar',glyph(c.group));avatar.setAttribute('aria-hidden','true');
 const name=el('div','post-author');name.append(el('strong',null,c.author),el('span',null,c.group+' · '+c.kind));
 head.append(avatar,name);n.append(head);
 if(c.art){const img=el('img','artwork');img.src='./'+c.art;img.alt=c.alt||c.source;img.loading='lazy';n.append(img);}
 const passage=el(c.kind==='Public-domain verse'||c.kind==='English rendering'||c.kind==='Original rendering'||c.kind==='Historical excerpt'?'blockquote':'p','passage',c.text);
 if(c.art)n.append(passage);else{const tile=el('div','quote-tile');tile.append(passage);n.append(tile);}
 const inner=el('div','card-inner');
 const actions=el('div','actions');const save=btn('','action',()=>saved(c)?remove(c):keep(c),'save');save.append(el('span',null,'Save'));save.dataset.save=c.id;
 const share=btn('Share','action',()=>shareCard(c),'share');
 if(mode==='notes'){const pinned=shelf[c.id]?.pin;const pin=btn(pinned?'Pinned':'Pin','action'+(pinned?' pin':''),()=>change(()=>shelf[c.id].pin=!pinned,pinned?'Unpinned':'Pinned to the top'),'pin');pin.setAttribute('aria-pressed',String(!!pinned));actions.append(btn('Reflection','action',()=>editNote(c),'pen'),pin,share,save);}
 else actions.append(btn('Reflect','action',()=>inlineReflect(c,n),'pen'),share,save);
 if(mode!=='related')actions.append(btn('Sit with this','action',()=>sitWith(c),'spark'),btn('Follow the thread','action',()=>followThread(c)));
 inner.append(actions);
 const a=el('p','attribution');a.append(el('span','context',c.source));if(c.credit)a.append(el('span','context credit',c.credit));inner.append(a);
 if(c.url){
   const anchor=el('a','source-link');anchor.href=c.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
   anchor.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m10 14 4-4m-7 2-2 2a3.5 3.5 0 0 0 5 5l3-3m-2-8 3-3a3.5 3.5 0 0 1 5 5l-2 2"/></svg>';
   const host=new URL(c.url).hostname.replace(/^www[.]/,'');
   anchor.append(el('span',null,'Read source'),el('small',null,host));inner.append(anchor);
 }
 if(mode==='notes'&&shelf[c.id]?.note)inner.append(el('p','note-preview sw-lines',shelf[c.id].note));
 if(mode==='notes'&&shelf[c.id]?.history?.length){const details=el('details','sw-history');details.append(el('summary',null,'Earlier reflections'));for(const h of shelf[c.id].history){details.append(el('p','sw-date',new Date(h.at).toLocaleDateString()),el('p','sw-lines',h.note));}inner.append(details);}
 n.append(inner);return n;
}
function renderFilters(){const n=$('filters');for(const type of ['All',...new Set(catalog.map(c=>c.group))]){const b=btn('','chip',()=>{group=type;limit=batch;syncFilters();renderFeed();});b.dataset.group=type;
 const mark=el('span','filter-mark',glyph(type));mark.setAttribute('aria-hidden','true');
 b.append(mark,el('span','filter-name',type==='All'?'For you':type));n.append(b);}syncFilters();}
function syncFilters(){for(const b of $('filters').children)b.setAttribute('aria-pressed',String(group===b.dataset.group));}
function renderFeed({append=false}={}){
 const list=filtered(), root=$('feed'), end=$('feedEnd');scrollMore?.disconnect();if(!append){readingObserver?.disconnect();root.replaceChildren();}showResume();
 const existing=append?root.children.length:0;
 const fresh=list.slice(existing,limit).map(c=>card(c));root.append(...fresh);watchReading(fresh);
 $('feedLabel').textContent=(group==='All'?'Your feed':group);$('surprise').disabled=!list.length;
 end.replaceChildren();
 if(!list.length){end.append(el('p',null,'Nothing matches that search. Try another word or tradition.'));return;}
 if(limit<list.length){const more=btn('Keep scrolling','small secondary',()=>{const next=list[limit];limit+=batch;renderFeed({append:true});focusCard(next.id);});end.append(more);if(typeof IntersectionObserver==='function'){scrollMore=new IntersectionObserver(entries=>{if(tab==='feed'&&entries.some(entry=>entry.isIntersecting)){limit+=batch;renderFeed({append:true});}},{rootMargin:'160px'});scrollMore.observe(more);}}
 else end.append(el('p',null,group==='All'&&!$('feedSearch').value?'You’re caught up with the current library. Your place is saved on this device.':'You’ve reached the end of this shelf. Explore another tradition to keep going.'));
 syncButtons();
}
function renderNotebook(){
 const root=$('notebook'), q=$('noteSearch').value;root.replaceChildren();
 const today=Object.keys(shelf).filter(id=>shelf[id].note&&Date.now()-(shelf[id].reflectedAt||shelf[id].at)>=30*86400000).sort((a,b)=>(shelf[b].reflectedAt||shelf[b].at)-(shelf[a].reflectedAt||shelf[a].at))[0];
 const revisit=$('revisit');revisit.replaceChildren();revisit.hidden=!today||!!q.trim();if(!revisit.hidden){const c=byId.get(today);revisit.append(el('strong',null,'From your notebook'),el('p',null,'Revisit your reflection on '+c.author+' · '+c.source),btn('Revisit','small secondary',()=>editNote(c,true)));}
 const list=Object.keys(shelf).sort((a,b)=>Number(shelf[b].pin)-Number(shelf[a].pin)||shelf[b].at-shelf[a].at).map(a=>byId.get(a)).filter(c=>matches(c,q,[shelf[c.id].note,...(shelf[c.id].history||[]).map(h=>h.note)].join(' ')));
 $('noteCount').textContent=count()===1?'1 SAVED PASSAGE':count()+' SAVED PASSAGES';
 if(!list.length){const box=el('div','empty');box.append(el('h2',null,q?'No matching passages':'What stays with you goes here'),el('p',null,q?'Try a different word.':'Tap Save on any feed card, then find it here to add a reflection.'));if(!q)box.append(btn('Browse the feed','small primary',()=>switchTab('feed')));root.append(box);}
 else for(const c of list)root.append(card(c,'notes'));
 syncButtons();
}
function switchTab(next){const old=tab;tab=next;$('feedPage').hidden=next!=='feed';$('notesPage').hidden=next!=='notes';$('practicePage').hidden=next!=='practice';for(const [name,id] of [['feed','tabFeed'],['practice','tabPractice'],['notes','tabNotes']]){if(name===next)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}if(next==='notes')renderNotebook();if(old!==next)window.scrollTo(0,0);}
function focusCard(id){const a=[...$('feed').children].find(n=>n.dataset.card===id);if(a){a.focus({preventScroll:true});a.scrollIntoView({behavior:'auto',block:'start'});}}
let lastSurprise;
function jump(){const a=filtered();if(!a.length)return;let i=Math.floor(Math.random()*a.length);if(a.length>1&&a[i].id===lastSurprise)i=(i+1)%a.length;lastSurprise=a[i].id;if(i>=limit){limit=i+1;renderFeed({append:true});}focusCard(a[i].id);}
function dialog(title,part){stopSit?.();stopSit=null;$('dialogTitle').textContent=title;$('dialogBody').replaceChildren(part);if(!$('modal').open)$('modal').showModal();}
function reflectionForm(c,finish,asNew=false){
 const f=el('form','sw-reflection'), l=el('label',null,'What did this bring up for you?');
 const t=el('textarea');t.maxLength=4000;t.required=true;t.value=asNew?'':shelf[c.id]?.note||'';t.placeholder='A line, a journal entry, or a poem…';l.append(t);
 const b=el('button','small primary','Save to Notebook');b.type='submit';
 const row=el('div','row');row.append(b,btn('Cancel','small secondary',finish));
 f.append(l,el('p','sw-muted','Private on this device unless you choose to share.'),row);
 f.addEventListener('submit',ev=>{ev.preventDefault();const note=t.value.trim();if(!note){t.setCustomValidity('Write a reflection first.');t.reportValidity();return;}const old=shelf[c.id]||{at:Date.now(),pin:false};let history=old.history||[];if(asNew&&old.note)history=[{note:old.note,at:old.reflectedAt||old.at||Date.now()},...history].slice(0,30);change(()=>shelf[c.id]={...old,history,note,reflectedAt:Date.now()},'Reflection saved to Notebook');finish();});
 t.addEventListener('input',()=>t.setCustomValidity(''));return {f,t};
}
function inlineReflect(c,n){const above=n.querySelector('.sw-reflection');if(above){above.querySelector('textarea').focus();return;}const trigger=document.activeElement;const {f,t}=reflectionForm(c,()=>{f.remove();if(trigger?.isConnected)trigger.focus();});n.querySelector('.card-inner').append(f);t.focus();}
function editNote(c,asNew=false){const part=el('div');if(asNew&&shelf[c.id]?.note)part.append(el('p','note-preview sw-lines',shelf[c.id].note));const {f,t}=reflectionForm(c,()=>$('modal').close(),asNew);part.append(f);dialog(asNew?'Add a new reflection':'Reflection',part);t.focus();}
function shareText(c){return c.text+'\n\n'+c.kind+' · '+c.author+' · '+c.source+(c.url?'\n'+c.url:'')+'\n\nStillwater card: SW-'+c.id;}
function deepLink(c){return location.protocol==='https:' ? new URL('#card='+encodeURIComponent(c.id),location.href).href : '';}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied');}catch(e){const part=el('div');const t=el('textarea');t.readOnly=true;t.value=text;part.append(el('p',null,'Select the text below to copy it.'),t);dialog('Copy passage',part);t.focus();t.select();}}
function shareCard(c){
 const panel=el('div'), row=el('div','row'), url=deepLink(c), note=shelf[c.id]?.note;
 const box=el('input');box.type='checkbox';
 if(note){const label=el('label','sw-check');label.append(box,document.createTextNode('Include my reflection'));panel.append(label);}
 const preview=el('textarea');preview.readOnly=true;preview.setAttribute('aria-label','Message preview');
 const txt=()=>shareText(c)+(url?'\n'+url:'')+(box.checked&&note?'\n\nMy reflection:\n'+note:'');
 const sms=el('a','small secondary','Text'), mail=el('a','small secondary','Email');
 function update(){const value=txt();preview.value=value;const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(value.length<1800){sms.href=(apple?'sms:&body=':'sms:?body=')+encodeURIComponent(value);mail.href='mailto:?subject='+encodeURIComponent('A passage from Stillwater')+'&body='+encodeURIComponent(value);sms.hidden=mail.hidden=false;}else{sms.hidden=mail.hidden=true;}}
 box.onchange=update;update();
 if(typeof navigator.share==='function')row.append(btn('Share…','small primary',async()=>{try{await navigator.share({title:'Stillwater · '+c.author,text:txt()});}catch(err){if(err.name!=='AbortError')toast('Use Copy to share your message.');}}));
 row.append(sms,mail,btn('Copy message','small secondary',()=>copy(txt())));
 if(url)row.append(btn('Copy card link','small secondary',()=>copy(url)));
 panel.append(preview,row,el('p','sw-muted','A card link contains only the card. Reflection text is included only if you select it above. For long messages, use Share or Copy.'));
 dialog(note?'Send a reflection':'Share passage',panel);
}
function parseCode(input){
 let str=input.trim();const m=str.match(/(?:\bSW-|#card=)([a-z][a-z0-9-]*)\b/i);const id=(m?m[1]:str).toLowerCase();return byId.get(id);
}
function promptImport(){
 const f=el('form'), l=el('label',null,'Paste the card code, link, or shared message.'), t=el('input'), msg=el('p'), b=el('button','small primary','Add to notebook');l.htmlFor='shareInput';t.id='shareInput';t.type='text';t.autocapitalize='none';t.placeholder='SW-tarfon';b.type='submit';msg.setAttribute('role','status');f.append(l,t,b,msg);
 f.addEventListener('submit',ev=>{ev.preventDefault();const c=parseCode(t.value);if(!c){msg.textContent='That card code isn’t in this version of Stillwater.';return;} $('modal').close();keep(c);});dialog('Add a shared card',f);t.focus();
}
function openShared(){if(!location.hash.startsWith('#card='))return;const c=parseCode(location.hash);if(!c)return;const part=el('div');part.append(el('blockquote','passage',c.text),el('p',null,c.kind+' · '+c.author+' · '+c.source),btn('Save to notebook','small primary',()=>{$('modal').close();keep(c);switchTab('notes');},'save'));part.append(btn('Reflect','small secondary',()=>editNote(c),'pen'),btn('Sit with this','small secondary',()=>sitWith(c),'spark'),btn('Follow the thread','small secondary',()=>followThread(c)));dialog('A shared passage',part);}
function exportBackup(){
 const blob=new Blob([JSON.stringify({app:'Stillwater',version:1,entries:shelf},null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=el('a');
 a.href=url;a.download='Stillwater-notebook-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Notebook backup created');
}
async function importBackup(){
 const f=$('importFile').files[0];$('importFile').value='';if(!f)return;
 try{if(f.size>1000000)throw 0;const obj=JSON.parse(await f.text());if(obj?.app!=='Stillwater'||obj?.version!==1||!obj.entries||typeof obj.entries!=='object'||Array.isArray(obj.entries))throw 0;const incoming=validated(obj.entries);const fresh=Object.keys(incoming).filter(id=>!Object.hasOwn(shelf,id));if(!fresh.length){toast('No new passages in this backup');return;}change(()=>{for(const id of fresh)shelf[id]=incoming[id];},'Added '+fresh.length+' from backup');}catch(e){toast('Choose a valid Stillwater notebook backup');}
}
function followThread(origin){
 const part=el('div','sw-thread'), related=window.stillwaterRelated?.(origin,[...byId.values()])||[];
 part.append(el('p','sw-muted','Read the original beside another perspective. What changes when you read them together?'));
 const compare=el('div','sw-compare'), initial=card(origin,'related'), next=el('div','sw-related-next');
 compare.append(initial,next);
 if(related.length){
   const options=el('div','row sw-related-options');options.setAttribute('aria-label','Related passages');
   for(const {card:c,theme} of related){const b=btn(c.group+' · '+c.author,'small secondary',()=>select(c,theme,b));b.setAttribute('aria-pressed','false');options.append(b);}
   function select(c,theme,b){[...options.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));next.replaceChildren(el('p','sw-muted','Shared thread: '+theme),card(c,'related'));syncButtons();}
   part.append(options,compare);select(related[0].card,related[0].theme,options.firstChild);
 }else{part.append(initial,el('p','sw-muted','There isn’t a close companion passage for this card yet.'));}
 dialog('Follow the thread',part);syncButtons();
}
function sitWith(c){
 const data=window.StillwaterPracticeData||{}, practices=data.practices||[], tracks=data.tracks||[];
 const part=el('section','sw-sit'), still=el('div','sw-still'+(c.art?' sw-sit-art':''));
 if(!c.art){const lotus=el('img','sw-lotus');lotus.src='./quiet-lotus.svg?v=1';lotus.alt='';lotus.width=700;lotus.height=280;still.append(lotus);}
 if(c.art){const img=el('img');img.src=new URL(c.art,document.baseURI);img.alt=c.alt||c.source;still.append(img);}
 still.append(el('blockquote','passage',c.text),el('p','sw-muted',c.author+' · '+c.source));part.append(still);
 if(!practices.length){part.append(el('p',null,'Try a quiet minute with this passage. Read slowly and notice which words stay with you.'));dialog('Sit with this',part);return;}
 const settings=el('div','sw-setup'), practice=el('select'), track=el('select'), pl=el('label',null,'Practice'), tl=el('label',null,'Background audio');
 pl.append(practice);tl.append(track);
 practices.forEach(p=>{const o=el('option',null,p.title+' · '+p.steps.reduce((a,b)=>a+b.seconds,0)+' sec');o.value=p.id;practice.append(o);});
 const wanted=c.art?'look-slowly':'sit-with-a-line';if(practices.some(p=>p.id===wanted))practice.value=wanted;
 const silent=el('option',null,'Silence');silent.value='';track.append(silent);
 const chakraAudio=window.StillwaterChakraAudio;
 const chakra=el('optgroup'), attune=el('optgroup');chakra.label='Chakra bowls · Stillwater originals';attune.label='From Attune';
 chakraAudio?.tracks.forEach(({id,title})=>{const o=el('option',null,title);o.value='chakra:'+id;chakra.append(o);});
 tracks.filter(t=>t.url).forEach(({title,url})=>{const o=el('option',null,title);o.value=url;attune.append(o);});
 if(chakra.children.length)track.append(chakra);if(attune.children.length)track.append(attune);
 settings.append(pl,tl);const audioCredit=el('p','sw-muted');const desc=el('p','sw-muted');const instruction=el('p','sw-instruction'), stamp=el('p','sw-muted sw-clock'), sound=el('p','sw-muted');instruction.setAttribute('aria-live','polite');sound.setAttribute('role','status');
 const audio=el('audio');audio.loop=true;audio.preload='none';audio.volume=.35;
 const row=el('div','row');let mode='idle', interval, elapsed=0, last=0, active, endAt=0, stepBefore=-1, audioRun=0;
 const pick=()=>practices.find(p=>p.id===practice.value)||practices[0];
 function pauseAudio(){audioRun++;audio.pause();}
 function playAudio(){if(!audio.getAttribute('src'))return;const token=++audioRun;audio.play().catch(()=>{if(token===audioRun&&mode==='running')sound.textContent='Audio couldn’t play. Your practice can continue in silence.';});}
 function cleanup(){clearInterval(interval);pauseAudio();audio.removeAttribute('src');audio.load();}
 function reset(){clearInterval(interval);pauseAudio();audio.removeAttribute('src');mode='idle';stamp.textContent='';instruction.textContent='';sound.textContent='';stepBefore=-1;elapsed=0;practice.disabled=track.disabled=false;desc.textContent=pick().description;controls();}
 function controls(){row.replaceChildren();if(mode==='idle')row.append(btn('Begin practice','small primary',begin));if(mode==='running')row.append(btn('Pause','small secondary',pause),btn('End practice','small secondary',complete));if(mode==='paused')row.append(btn('Resume','small primary',resume),btn('End practice','small secondary',complete));if(mode==='done')row.append(btn('Write a reflection','small primary',()=>editNote(c,saved(c)&&!!shelf[c.id]?.note),'pen'),btn('Sit again','small secondary',reset));}
 function begin(){if(mode!=='idle')return;active=pick();endAt=active.steps.reduce((a,b)=>a+b.seconds,0)*1000;practice.disabled=track.disabled=true;$('practiceAudio')?.pause();if(track.value){const src=track.value.startsWith('chakra:')?chakraAudio?.urlFor(track.value.slice(7)):track.value;if(src)audio.src=src;else sound.textContent='Audio unavailable. Your practice can continue in silence.';}resume();}
 function resume(){mode='running';last=performance.now();controls();playAudio();tick();if(mode==='running')interval=setInterval(tick,250);}
 function pause(){if(mode!=='running')return;tick();if(mode==='done')return;mode='paused';clearInterval(interval);pauseAudio();controls();}
 function complete(){clearInterval(interval);pauseAudio();mode='done';instruction.textContent='Take one more unhurried moment before you move on.';stamp.textContent='Practice ended';controls();}
 function tick(){const now=performance.now();elapsed+=now-last;last=now;if(elapsed>=endAt){complete();return;}let until=0;const i=active.steps.findIndex(s=>(until+=s.seconds*1000)>elapsed);if(i!==stepBefore){instruction.textContent=active.steps[i].text;stepBefore=i;}const left=Math.ceil((endAt-elapsed)/1000);stamp.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0')+' remaining';}
 practice.onchange=()=>{desc.textContent=pick().description;};
 track.onchange=()=>{const choice=tracks.find(t=>t.url===track.value);audioCredit.replaceChildren();if(choice?.source){const a=el('a',null,choice.credit||'Original track');a.href=choice.source;a.target='_blank';a.rel='noopener noreferrer';audioCredit.append(a);}};
 audio.onerror=()=>{if(track.value&&mode==='running')sound.textContent='Audio couldn’t load. Your practice can continue in silence.';};
 part.append(settings,audioCredit,desc,instruction,stamp,sound,audio,row);dialog('Sit with this',part);stopSit=cleanup;reset();
}

function about(){const part=el('div');part.append(el('p',null,'A library of sourced passages, sacred art and quiet practices. Cards distinguish historical excerpts, original renderings and Stillwater reading notes. Follow the source link to read each in context.'),el('p',null,'Your notebook stays in this browser. It doesn’t sync automatically or post anywhere. Export it to keep a backup or move it to another device.'),el('p',null,'On iPhone, open Stillwater in Safari and choose Share → Add to Home Screen.'));if(!storageOK)part.append(el('p','callout','Browser storage is blocked right now. Export anything you want to keep.'));dialog('About Stillwater',part);}
$('tabFeed').innerHTML=icon('feed')+'<span>Feed</span>';$('tabNotes').innerHTML=icon('book')+'<span>Notebook</span>';
$('tabFeed').onclick=()=>switchTab('feed');$('tabNotes').onclick=()=>switchTab('notes');$('home').onclick=()=>{switchTab('feed');window.scrollTo(0,0);};$('info').onclick=about;
$('surprise').innerHTML=icon('spark')+'Surprise me';$('surprise').onclick=jump;
$('feedSearch').oninput=()=>{limit=batch;renderFeed();};$('noteSearch').oninput=renderNotebook;
$('close').onclick=()=>$('modal').close();$('export').onclick=exportBackup;$('importCode').onclick=promptImport;$('importFile').onchange=importBackup;
window.addEventListener('hashchange',openShared);
let stopSit=null;
$('modal').addEventListener('close',()=>{if(!$('modal').open){stopSit?.();stopSit=null;}});
renderFilters();renderFeed();openShared();
