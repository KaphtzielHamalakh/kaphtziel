'use strict';
(()=>{
 const find=id=>document.getElementById(id);
 const tracks=window.STILL_ATTUNE, player=find('practicePlayer'), audio=find('practiceAudio'), status=find('practiceAudioStatus'), search=find('practiceSearch');
 const playIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>';
 const waveIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" aria-hidden="true"><path d="M4 12v2m4-6v10m4-14v16m4-12v10m4-6v2"/></svg>';
 let group='All',selected, filterElements=[];
 function el(tag,cls,label){const e=document.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;return e;}
 function say(message){status.hidden=!message;status.textContent=message;}
 function play(track){
   player.hidden=false; find('practicePlaying').textContent=track.title;find('practiceDeckMeta').textContent=track.category+' · '+track.duration;
   find('practiceOriginal').href=track.url;
   if(selected!==track.id){selected=track.id;audio.src=track.url;}
   player.scrollIntoView({block:'nearest'});
   say('Loading audio…');
   const promise=audio.play();
   if(promise)promise.catch(err=>{if(selected===track.id&&err.name!=='AbortError')say(err.name==='NotAllowedError'?'Tap Play on the player to start.':'This track could not load here. Try Open original audio.');});
   for(const b of find('practiceTracks').querySelectorAll('button[data-track]')){const active=b.dataset.track===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
 }
 function render(){
   const q=search.value.trim().toLowerCase();
   const current=tracks.filter(t=>(group==='All'||t.category===group)&&[t.title,t.category].join(' ').toLowerCase().includes(q));
   find('practiceCount').textContent=current.length+(current.length===1?' meditation':' meditations');
   const root=find('practiceTracks'); root.replaceChildren();
   for(const t of current){
     const b=el('button','practice-track'+(selected===t.id?' selected':''));b.type='button';b.dataset.track=t.id;b.setAttribute('aria-pressed',String(selected===t.id));b.addEventListener('click',()=>play(t));
     const glyph=el('span','practice-play');glyph.innerHTML=playIcon;
     const title=el('span','practice-track-text');title.append(el('strong',null,t.title),el('small',null,t.category));
     b.append(glyph,title,el('span','practice-duration',t.duration));root.append(b);
   }
   if(!current.length)root.append(el('p','practice-empty','No meditations match this search.'));
   for(const b of filterElements)b.setAttribute('aria-pressed',String(b.textContent===group));
 }
 for(const category of ['All',...new Set(tracks.map(t=>t.category))]){
   const b=el('button','small secondary',category);b.type='button';b.onclick=()=>{group=category;render();};
   find('practiceFilters').append(b);filterElements.push(b);
 }
 find('tabPractice').innerHTML=waveIcon+'<span>Practice</span>';find('tabPractice').onclick=()=>switchTab('practice');
 audio.addEventListener('playing',()=>say(''));audio.addEventListener('loadedmetadata',()=>say(''));audio.addEventListener('error',()=>say('This track could not load here. Try Open original audio.'));
 search.addEventListener('input',render);
 render();
})();
