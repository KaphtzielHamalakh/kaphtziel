const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{},storage={},elements={},events={},gradient={addColorStop:noop};
const ctx=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||noop});
function element(){return {hidden:false,value:'',dataset:{},children:[],textContent:'',innerHTML:'',getContext:()=>ctx,addEventListener:noop,setAttribute:noop,focus:noop,replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}};}
const document={getElementById:id=>elements[id]??=element(),createElement:element,querySelectorAll:()=>[],addEventListener:noop};
const sandbox={document,window:{addEventListener:(n,f)=>(events[n]??=[]).push(f),confirm:()=>true},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},requestAnimationFrame:noop,setTimeout:noop,Blob,URL,console,assert};
vm.createContext(sandbox);for(const file of ['world.js','art.js','campaign.js','music.js','game.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),sandbox);
vm.runInContext(`const legacy=fresh();delete legacy.name;delete legacy.tunic;delete legacy.seen;legacy.mallet=true;legacy.dreidel=true;legacy.gelt=91;legacy.flame=true;legacy.max=8;legacy.hp=5;localStorage.setItem(SAVE,JSON.stringify(legacy));`,sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/profiles.js','utf8'),sandbox);
vm.runInContext(`
const submit=(name)=>{document.getElementById('hero-name').value=name;document.getElementById('register').onsubmit({preventDefault(){}});};
assert.equal(mode,'files');assert.equal(profileSlots.length,3);assert.equal(profileSlots[0].gelt,91);assert.equal(profileSlots[0].name,'');assert.equal(profileSlots[1],null);
registerProfile(0);submit('');assert.equal(activeSlot,null);assert.equal(document.getElementById('register').hidden,false);
submit('miriam');assert.equal(state.name,'MIRIAM');assert.equal(state.gelt,91);assert.equal(state.dreidel,true);assert.equal(activeSlot,0);assert.equal(mode,'play');assert.equal(heroName(),'MIRIAM');assert.equal(document.getElementById('profiles').hidden,true);
state.gelt=103;save();showProfiles();registerProfile(1);chosenTunic='green';submit('avi');assert.equal(state.name,'AVI');assert.equal(state.gelt,0);assert.equal(state.mallet,false);assert.equal(state.tunic,'green');
state.gelt=7;state.mallet=true;mode='play';save();showProfiles();registerProfile(2);submit('lev');state.gelt=22;state.mallet=true;mode='play';save();
assert.equal(profileSlots[0].gelt,103);assert.equal(profileSlots[1].gelt,7);assert.equal(profileSlots[2].gelt,22);
startProfile(0);assert.equal(state.gelt,103);assert.equal(state.hp,5);assert.equal(state.flame,true);registerProfile(0,true);submit('noam');assert.equal(profileSlots[0].name,'NOAM');assert.equal(profileSlots[0].gelt,103);
const reloaded=ProfileStore.load();assert.equal(reloaded.length,3);assert.equal(reloaded[0].name,'NOAM');assert.equal(reloaded[1].name,'AVI');assert.equal(reloaded[2].name,'LEV');
confirmErase(1);const confirm=document.getElementById('profile-message').children.find(x=>x?.textContent==='Erase file');confirm.onclick();assert.equal(profileSlots[1],null);assert.equal(profileSlots[0].gelt,103);assert.equal(profileSlots[2].gelt,22);assert.equal(ProfileStore.load()[1],null);
assert.equal(cleanName('  A<B>\\n  '),'AB');assert.equal(Array.from(cleanName('ABCDEFGHIJKLMNO')).length,12);assert.equal(cleanName('יעל'),'יעל');
assert.equal(valid({...fresh(),name:5}),false);assert.equal(valid({...fresh(),tunic:'bad'}),false);
startProfile(2);state.gelt=55;save();assert.equal(ProfileStore.load()[2].gelt,55);assert.equal(ProfileStore.load()[0].gelt,103);
startProfile(0);enter('grove0');const full=enemies.length;enemies[0].inv=0;hit(enemies[0],10);save();startProfile(2);enter('grove0');assert.equal(enemies.length,full,'other slot keeps its own monsters');startProfile(0);enter('grove0');assert.equal(enemies.length,full-1,'slot retains its own defeated monster');
for(const id of Object.keys(World.rooms)){enter(id);draw();}mode='inventory';draw();mode='files';draw();
console.log('PASS: legacy migration, name required, three independent files, tunics, switching, rename without reset, erase isolation, reload persistence, name validation and all shaded room/HUD rendering');
`,sandbox,{timeout:30000});
