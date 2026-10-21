'use strict';
const ProfileStore=(()=>{
 const key='kaphtziel-eight-nights-slots-v1';
 function load(){
  try{const data=JSON.parse(localStorage.getItem(key));if(data?.version===1&&Array.isArray(data.slots)&&data.slots.length===3)return data.slots.map(s=>valid(s)?normalize(s):null);}catch{}
  const slots=[null,null,null];
  try{const legacy=JSON.parse(localStorage.getItem(SAVE));if(valid(legacy)){slots[0]=normalize(legacy);persist(slots);}}catch{}
  return slots;
 }
 function persist(slots){try{localStorage.setItem(key,JSON.stringify({version:1,slots}));return true;}catch{return false;}}
 return {load,persist,key};
})();
let profileSlots=ProfileStore.load(),activeSlot=null,registrationSlot=0,editingProfile=false,chosenTunic='blue';
function cleanName(value){return Array.from(String(value).normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().toUpperCase()).slice(0,12).join('');}
function portraitSVG(tunic='blue'){
 const color={blue:'#547dc2',green:'#638a62',gold:'#b58b47'}[tunic]||'#547dc2';
 return '<svg class="hippo-portrait" viewBox="0 0 20 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#192537" d="M4 21h13v3H4z"/><path fill="'+color+'" d="M4 12h13v9H4z"/><path fill="#a3afcf" d="M4 3h3v3h7V3h3v12H4z"/><path fill="#d0d2e0" d="M3 10h15v7H3z"/><path fill="#6b7fa8" d="M4 15h13v2H4zM4 20h5v3H4zM12 20h5v3h-5z"/><path fill="#202f45" d="M6 7h2v3H6zM12 7h2v3h-2zM5 12h2v1H5zM14 12h2v1h-2z"/><path fill="#fff1ca" d="M5 15h2v2H5zM14 15h2v2h-2z"/><path fill="#d2ac64" d="M6 19h9v1H6z"/></svg>';
}
function profileMessage(message){document.getElementById('profile-message').textContent=message;}
function saveActiveProfile(){if(activeSlot===null)return;profileSlots[activeSlot]=JSON.parse(JSON.stringify(state));if(!ProfileStore.persist(profileSlots))profileMessage('Storage unavailable. Export your adventure to keep it.');}
function renderSlotList(){
 const list=document.getElementById('slot-list');list.replaceChildren();
 profileSlots.forEach((slot,index)=>{
  const card=document.createElement('div');card.className='slot-card';
  const play=document.createElement('button');play.className='slot-play';play.type='button';play.innerHTML=portraitSVG(slot?.tunic);
  const label=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');
  name.textContent=slot?.name||('FILE '+(index+1)+' · '+(slot?'NAME YOUR HERO':'NEW ADVENTURE'));
  detail.textContent=slot?`${slot.max/2} HEARTS · ${[1,2,3,4].filter(n=>slot[flameFor(n)]).length} LIGHTS · ${World.rooms[slot.room].name}`:'REGISTER A NAME TO BEGIN';
  label.append(name,detail);play.append(label);play.onclick=()=>slot?.name?startProfile(index):registerProfile(index);card.append(play);
  if(slot){const manage=document.createElement('div');manage.className='slot-manage';for(const [text,fn]of [['Rename',()=>registerProfile(index,true)],['Erase',()=>confirmErase(index)]]){const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=fn;manage.append(button);}card.append(manage);}
  list.append(card);
 });
}
function showProfiles(){
 if(activeSlot!==null&&room)save();clearInput();mode='files';
 document.getElementById('profiles').hidden=false;document.getElementById('register').hidden=true;document.getElementById('slot-list').hidden=false;
 document.getElementById('profile-title').textContent='Choose your adventure';profileMessage('Three adventures · saved on this device');renderSlotList();
}
function registerProfile(index,editing=false){
 registrationSlot=index;editingProfile=editing;chosenTunic=profileSlots[index]?.tunic||'blue';
 document.getElementById('slot-list').hidden=true;document.getElementById('register').hidden=false;
 document.getElementById('profile-title').textContent='Register your name';
 document.getElementById('hero-name').value=profileSlots[index]?.name||'';
 document.getElementById('name-done').textContent=editing?'Save character':'Begin adventure';updatePortrait();
 profileMessage(profileSlots[index]&&!profileSlots[index].name?'Your existing progress is safe. Give your hero a name.':'Choose a name and a tunic for file '+(index+1)+'.');
}
function updatePortrait(){document.getElementById('hero-preview').innerHTML=portraitSVG(chosenTunic);for(const button of document.querySelectorAll('[data-color]'))button.setAttribute('aria-pressed',String(button.dataset.color===chosenTunic));}
function startProfile(index){
 const slot=profileSlots[index];if(!slot?.name){registerProfile(index);return;}
 activeSlot=index;state=normalize(JSON.parse(JSON.stringify(slot)));p.face=state.face;
 document.getElementById('profiles').hidden=true;clearInput();enter(state.room,state.x,state.y);mode=state.hp<=0?'dead':'play';canvas.focus({preventScroll:true});
 if(!state.mallet&&mode==='play')say('BUBBE: '+heroName()+', the eight flames are gone.','It’s dark out there. Take this shamash.','Find Judah by the well. Then go east.');
}
function confirmErase(index){
 profileMessage('Erase '+(profileSlots[index].name||'file '+(index+1))+'? This removes only this file.');
 const host=document.getElementById('profile-message');for(const [label,fn]of [['Erase file',()=>{profileSlots[index]=null;if(activeSlot===index)activeSlot=null;ProfileStore.persist(profileSlots);showProfiles();}],['Cancel',showProfiles]]){const button=document.createElement('button');button.textContent=label;button.onclick=fn;host.append(' ',button);}
}
const nameInput=document.getElementById('hero-name');
for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-\''){
 const button=document.createElement('button');button.type='button';button.textContent=letter;button.onclick=()=>{nameInput.value=Array.from(nameInput.value+letter).slice(0,12).join('');};document.getElementById('name-keys').append(button);
}
for(const [label,fn]of [['SPACE',()=>{nameInput.value=Array.from(nameInput.value+' ').slice(0,12).join('');}],['DELETE',()=>{nameInput.value=Array.from(nameInput.value).slice(0,-1).join('');}]]){const button=document.createElement('button');button.type='button';button.className='wide';button.textContent=label;button.onclick=fn;document.getElementById('name-keys').append(button);}
for(const button of document.querySelectorAll('[data-color]'))button.onclick=()=>{chosenTunic=button.dataset.color;updatePortrait();};
document.getElementById('register').onsubmit=event=>{
 event.preventDefault();const name=cleanName(nameInput.value);if(!name){profileMessage('Please choose a name first.');nameInput.focus();return;}
 const existing=profileSlots[registrationSlot];profileSlots[registrationSlot]={...normalize(existing||fresh()),name,tunic:chosenTunic};
 if(activeSlot===registrationSlot){state.name=name;state.tunic=chosenTunic;}
 const stored=ProfileStore.persist(profileSlots);if(editingProfile)showProfiles();else startProfile(registrationSlot);
 if(!stored)document.getElementById('status').textContent='Storage unavailable · export to keep this adventure';
};
document.getElementById('name-back').onclick=showProfiles;
document.getElementById('files').onclick=showProfiles;
document.getElementById('start').onclick=()=>{if(mode==='files'||mode==='title')showProfiles();else if(mode==='inventory')mode='play';else action('KeyZ');};
const exportSelected=document.getElementById('export').onclick;
document.getElementById('export').onclick=()=>{if(activeSlot===null){profileMessage('Choose a file before exporting an adventure.');return;}exportSelected();};
// Import/export work on the selected file; importing never overwrites another slot.
document.getElementById('import').onclick=()=>{
 if(activeSlot===null){profileMessage('Choose or register a file before importing into it.');return;}
 suspend();const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{try{if(!input.files?.[0])return;if(input.files[0].size>524288)throw Error();const imported=JSON.parse(await input.files[0].text());if(!valid(imported))throw Error();if(!window.confirm('Replace file '+(activeSlot+1)+' with this imported adventure?'))return;const name=cleanName(imported.name||state.name);state={...normalize(imported),name,tunic:imported.tunic||state.tunic};saveActiveProfile();startProfile(activeSlot);}catch{document.getElementById('status').textContent='Invalid save file · progress kept';}};input.click();
};
showProfiles();
