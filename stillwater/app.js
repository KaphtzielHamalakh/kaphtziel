'use strict';
const C=window.STILL_CARDS, byId=new Map(C.map(c=>[c.id,c])), $=id=>document.getElementById(id);
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
function showResume(){
 const row=$('feedResume'), next=byId.get(resumeId);
 row.replaceChildren();row.hidden=group!=='All'||!!$('feedSearch').value.trim()||!next;
 if(row.hidden)return;
 row.append(btn('Continue where you left off','small secondary',()=>{
   const i=C.findIndex(c=>c.id===resumeId);
   if(i>=limit){ limit=Math.min(C.length,Math.ceil((i+1)/batch)*batch);renderFeed({append:true}); }
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
   lastRead=id;try{localStorage.setItem(PROGRESS,id);}catch(e){}
 },{threshold:[.62]});
 for(const n of cards)readingObserver.observe(n);
}
let shelf={},storageOK=true,group='All',limit=batch,tab='feed',toastTime;
function validated(x){const out={};if(!x||typeof x!=='object'||Array.isArray(x))return out;for(const id of Object.keys(x)){const v=x[id];if(!byId.has(id)||!v||typeof v!=='object'||Array.isArray(v))continue;out[id]={note:typeof v.note==='string'?v.note.slice(0,4000):'',pin:v.pin===true,at:typeof v.at==='number'&&Number.isFinite(v.at)?Math.max(0,v.at):0};}return out;}
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
 else actions.append(share,save);
 inner.append(actions);
 const a=el('p','attribution');a.append(el('span','context',c.source));if(c.credit)a.append(el('span','context credit',c.credit));inner.append(a);
 if(c.url){
   const anchor=el('a','source-link');anchor.href=c.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
   anchor.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m10 14 4-4m-7 2-2 2a3.5 3.5 0 0 0 5 5l3-3m-2-8 3-3a3.5 3.5 0 0 1 5 5l-2 2"/></svg>';
   const host=new URL(c.url).hostname.replace(/^www[.]/,'');
   anchor.append(el('span',null,'Read source'),el('small',null,host));inner.append(anchor);
 }
 if(mode==='notes'&&shelf[c.id]?.note)inner.append(el('p','note-preview',shelf[c.id].note));
 n.append(inner);return n;
}
function renderFilters(){const n=$('filters');for(const type of ['All',...new Set(C.map(c=>c.group))]){const b=btn('','chip',()=>{group=type;limit=batch;syncFilters();renderFeed();});b.dataset.group=type;
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
 const list=Object.keys(shelf).sort((a,b)=>Number(shelf[b].pin)-Number(shelf[a].pin)||shelf[b].at-shelf[a].at).map(a=>byId.get(a)).filter(c=>matches(c,q,shelf[c.id].note));
 $('noteCount').textContent=count()===1?'1 SAVED PASSAGE':count()+' SAVED PASSAGES';
 if(!list.length){const box=el('div','empty');box.append(el('h2',null,q?'No matching passages':'What stays with you goes here'),el('p',null,q?'Try a different word.':'Tap Save on any feed card, then find it here to add a reflection.'));if(!q)box.append(btn('Browse the feed','small primary',()=>switchTab('feed')));root.append(box);}
 else for(const c of list)root.append(card(c,'notes'));
 syncButtons();
}
function switchTab(next){const old=tab;tab=next;$('feedPage').hidden=next!=='feed';$('notesPage').hidden=next!=='notes';$('practicePage').hidden=next!=='practice';for(const [name,id] of [['feed','tabFeed'],['practice','tabPractice'],['notes','tabNotes']]){if(name===next)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}if(next==='notes')renderNotebook();if(old!==next)window.scrollTo(0,0);}
function focusCard(id){const a=[...$('feed').children].find(n=>n.dataset.card===id);if(a){a.focus({preventScroll:true});a.scrollIntoView({behavior:'auto',block:'start'});}}
let lastSurprise;
function jump(){const a=filtered();if(!a.length)return;let i=Math.floor(Math.random()*a.length);if(a.length>1&&a[i].id===lastSurprise)i=(i+1)%a.length;lastSurprise=a[i].id;if(i>=limit){limit=i+1;renderFeed({append:true});}focusCard(a[i].id);}
function dialog(title,part){$('dialogTitle').textContent=title;$('dialogBody').replaceChildren(part);if(!$('modal').open)$('modal').showModal();}
function editNote(c){
 const f=el('form');const l=el('label',null,'What stays with you about this passage?');l.htmlFor='reflection';const t=el('textarea');t.id='reflection';t.maxLength=4000;t.value=shelf[c.id]?.note||'';t.placeholder='Write for yourself…';const b=el('button','small primary','Save reflection');b.type='submit';f.append(l,t,b);
 f.addEventListener('submit',ev=>{ev.preventDefault();const existing=shelf[c.id]||{at:Date.now(),pin:false};change(()=>shelf[c.id]={...existing,note:t.value.trim()},'Reflection saved');$('modal').close();});dialog('Reflection',f);t.focus();
}
function shareText(c){return c.text+'\n\n'+c.kind+' · '+c.author+' · '+c.source+(c.url?'\n'+c.url:'')+'\n\nStillwater card: SW-'+c.id;}
function deepLink(c){return location.protocol==='https:' ? new URL('#card='+encodeURIComponent(c.id),location.href).href : '';}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied');}catch(e){const part=el('div');const t=el('textarea');t.readOnly=true;t.value=text;part.append(el('p',null,'Select the text below to copy it.'),t);dialog('Copy passage',part);t.focus();t.select();}}
function shareCard(c){
 const panel=el('div');const txt=shareText(c), url=deepLink(c);
 panel.append(el('p',null,'Share the passage without sharing your private reflection. The card code can be added to another Stillwater notebook.'));
 const row=el('div','row');
 if(typeof navigator.share==='function')row.append(btn('Share…','small primary',async()=>{try{await navigator.share({title:'Stillwater · '+c.author,text:txt});}catch(err){if(err.name!=='AbortError')toast('Use Text, Email, or Copy instead.');}}));
 const sms=el('a','small secondary','Text');sms.href=(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'sms:&body=':'sms:?body=')+encodeURIComponent(txt);
 const a=el('a','small secondary','Email');a.href='mailto:?subject='+encodeURIComponent('A passage from Stillwater')+'&body='+encodeURIComponent(txt);
 row.append(sms,a,btn('Copy passage','small secondary',()=>copy(txt)));
 if(url)row.append(btn('Copy app link','small secondary',()=>copy(url)));
 panel.append(row);
 if(url)panel.append(el('p',null,'The app link opens this card in Stillwater. Your notebook reflections are never included.'));
 dialog('Share passage',panel);
}
function parseCode(input){
 let str=input.trim();const m=str.match(/(?:\bSW-|#card=)([a-z][a-z0-9-]*)\b/i);const id=(m?m[1]:str).toLowerCase();return byId.get(id);
}
function promptImport(){
 const f=el('form'), l=el('label',null,'Paste the card code, link, or shared message.'), t=el('input'), msg=el('p'), b=el('button','small primary','Add to notebook');l.htmlFor='shareInput';t.id='shareInput';t.type='text';t.autocapitalize='none';t.placeholder='SW-tarfon';b.type='submit';msg.setAttribute('role','status');f.append(l,t,b,msg);
 f.addEventListener('submit',ev=>{ev.preventDefault();const c=parseCode(t.value);if(!c){msg.textContent='That card code isn’t in this version of Stillwater.';return;} $('modal').close();keep(c);});dialog('Add a shared card',f);t.focus();
}
function openShared(){if(!location.hash.startsWith('#card='))return;const c=parseCode(location.hash);if(!c)return;const part=el('div');part.append(el('blockquote','passage',c.text),el('p',null,c.kind+' · '+c.author+' · '+c.source),btn('Save to notebook','small primary',()=>{$('modal').close();keep(c);switchTab('notes');},'save'));dialog('A shared passage',part);}
function exportBackup(){
 const blob=new Blob([JSON.stringify({app:'Stillwater',version:1,entries:shelf},null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=el('a');
 a.href=url;a.download='Stillwater-notebook-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Notebook backup created');
}
async function importBackup(){
 const f=$('importFile').files[0];$('importFile').value='';if(!f)return;
 try{if(f.size>1000000)throw 0;const obj=JSON.parse(await f.text());if(obj?.app!=='Stillwater'||obj?.version!==1||!obj.entries||typeof obj.entries!=='object'||Array.isArray(obj.entries))throw 0;const incoming=validated(obj.entries);const fresh=Object.keys(incoming).filter(id=>!Object.hasOwn(shelf,id));if(!fresh.length){toast('No new passages in this backup');return;}change(()=>{for(const id of fresh)shelf[id]=incoming[id];},'Added '+fresh.length+' from backup');}catch(e){toast('Choose a valid Stillwater notebook backup');}
}
function about(){const part=el('div');part.append(el('p',null,'A library of sourced passages, sacred art and quiet practices. Cards distinguish historical excerpts, original renderings and Stillwater reading notes. Follow the source link to read each in context.'),el('p',null,'Your notebook stays in this browser. It doesn’t sync automatically or post anywhere. Export it to keep a backup or move it to another device.'),el('p',null,'On iPhone, open Stillwater in Safari and choose Share → Add to Home Screen.'));if(!storageOK)part.append(el('p','callout','Browser storage is blocked right now. Export anything you want to keep.'));dialog('About Stillwater',part);}
$('tabFeed').innerHTML=icon('feed')+'<span>Feed</span>';$('tabNotes').innerHTML=icon('book')+'<span>Notebook</span>';
$('tabFeed').onclick=()=>switchTab('feed');$('tabNotes').onclick=()=>switchTab('notes');$('home').onclick=()=>{switchTab('feed');window.scrollTo(0,0);};$('info').onclick=about;
$('surprise').innerHTML=icon('spark')+'Surprise me';$('surprise').onclick=jump;
$('feedSearch').oninput=()=>{limit=batch;renderFeed();};$('noteSearch').oninput=renderNotebook;
$('close').onclick=()=>$('modal').close();$('export').onclick=exportBackup;$('importCode').onclick=promptImport;$('importFile').onchange=importBackup;
window.addEventListener('hashchange',openShared);
renderFilters();renderFeed();openShared();
