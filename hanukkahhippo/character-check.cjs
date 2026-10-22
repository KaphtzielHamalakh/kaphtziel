const fs=require('node:fs');

function makeGame(html, saved = new Map()) {
  const noop=()=>{};
  const draw=new Proxy({}, {get:(t,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop:noop}):noop});
  let document;
  function element() {
    const listeners={};
    return {children:[],dataset:{},classList:{toggle:noop,contains:()=>false},
      addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn);},
      emit(name,e={}){for(const fn of listeners[name]??[])fn(e);},
      setAttribute:noop,replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},
      querySelector(){return this.children[0]||null;},querySelectorAll(){return this.children;},
      focus(){document.activeElement=this;},getContext:()=>draw};
  }
  const elements=new Map();
  document={body:element(),activeElement:null,createElement:element,addEventListener:noop,
    getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
  const window={addEventListener:noop,matchMedia:()=>({matches:true,addEventListener:noop})};
  const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const api=new Function('window','document','navigator','requestAnimationFrame','localStorage',
    html.match(/<script>([\s\S]*?)<\/script>/)[1]+'\nreturn {run: code=>eval(code)};')(window,document,{},noop,storage);
  api.saved=saved;return api;
}
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const game=makeGame(html);
const checks=game.run("\nconst checks=[];\nconst check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};\nconst tick=n=>{for(let i=0;i<n;i++)updateGame();};\ncheck(completions===0&&!goblinUnlocked,'new player starts with no completions');\ncheck(characterMenuButton.hidden,'character button hidden before eight wins');\nconst rewards=['goblin','goblin','harry','snowman','latke','hanukkiah','coin','coin'];\nfor(let win=1;win<=8;win++) {\n  player=undefined;stats.night=8;stats.checkpointLit=false;stats.checkpointX=32;stats.checkpointY=160;hitStop=0;\n  startLevel(false);gameState='MENORAH';stateTimer=60;justPressed.KeyZ=true;updateGame();\n  check(completions===win,'completion counted exactly once '+win);\n  check(gameState==='VICTORY','final celebration remains '+win);\n  tick(5);check(completions===win,'victory frames cannot duplicate win '+win);\n  draw();tick(240);draw();tick(720);\n  check(character===rewards[win-1],'correct automatic replay character '+win);\n  check(stats.night===1&&stats.lives===3,'new campaign reset '+win);\n  check(JSON.parse(localStorage.getItem(PROFILE_KEY)).completions===win,'win count saved '+win);\n  draw();\n}\ncheck(characterMenuOpen&&paused,'eighth ending opens paused character picker');\ncheck(!characterMenuButton.hidden,'menu button unlocks at eight completions');\ncheck(characterChoices.children.length===7,'all seven heroes available');\ncloseCharacterMenu();gameState='PLAY';\nplayer.x=400;player.y=186;player.setPower(2);stats.score=1234;oil=72;\nconst previous={x:player.x,y:player.y,lives:stats.lives,score:stats.score,oil,night:stats.night,power:player.power};\nfor(const hero of unlockedHeroes()) {\n  openCharacterMenu();check(paused&&characterMenuOpen,'menu pauses gameplay '+hero.id);\n  loop(0);loop(1000);\n  const button=characterChoices.children.find(b=>b.textContent===hero.name);button.emit('click');\n  check(character===hero.id&&!paused&&!characterMenuOpen,'button selects and resumes '+hero.id);\n  check(previous.x===player.x&&previous.y===player.y&&previous.score===stats.score&&previous.oil===oil&&previous.lives===stats.lives&&previous.power===player.power,'switch keeps level state '+hero.id);\n  for(const power of [0,1,2]) {player.setPower(power);draw();}player.setPower(2);\n}\nsetPaused(true);openCharacterMenu();selectCharacter('harry');\ncheck(paused&&!characterMenuOpen,'opening from pause preserves paused state');\nsetPaused(false);player.becomeHungry();openCharacterMenu();selectCharacter('snowman');\ncheck(character==='snowman'&&player.power===2,'selecting a costume exits Hungry Hippo safely');\nopenCharacterMenu();closeCharacterMenu();check(!paused,'cancel resumes play');\ngameState='PIPE';openCharacterMenu();check(!characterMenuOpen,'picker cannot interrupt pipe transitions');\ngameState='PLAY';character='latke';saveCharacterProgress();completions=2;\ncheck(!selectCharacter('coin'),'locked character selection rejected');\ngameState='PLAY';completions=8;character='coin';saveCharacterProgress();\nopenCharacterMenu();characterOverlay.emit('keydown',{key:'Escape',preventDefault(){}});\ncheck(!characterMenuOpen&&!paused,'Escape closes the menu and resumes');\nopenCharacterMenu();const first=characterChoices.children[0],last=document.getElementById('close-character-menu');\ncharacterOverlay.querySelectorAll=()=>[...characterChoices.children,last];\nfirst.focus();characterOverlay.emit('keydown',{key:'Tab',shiftKey:true,preventDefault(){}});\ncheck(document.activeElement===last,'Shift Tab stays within character menu');\nlast.focus();characterOverlay.emit('keydown',{key:'Tab',shiftKey:false,preventDefault(){}});\ncheck(document.activeElement===first,'Tab cycles within character menu');\ncloseCharacterMenu();\nchecks;\n");
function verify(ok,label){if(!ok)throw Error(label);checks.push(label);}
const reloaded=makeGame(html,game.saved).run('({completions,character,menuHidden:characterMenuButton.hidden})');
verify(reloaded.completions===8 && reloaded.character==='coin'&&!reloaded.menuHidden,'profile survives reload');
const legacy=makeGame(html,new Map([['hippo-goblin-unlocked','yes']])).run('({completions,character})');
verify(legacy.completions===1&&legacy.character==='goblin','legacy goblin save migrated');
const bad=makeGame(html,new Map([['hippo-character-progress-v1','{bad']])).run('completions');
verify(bad===0,'corrupt profile handled safely');
const early=makeGame(html,new Map([['hippo-character-progress-v1',JSON.stringify({completions:3,character:'coin'})]])).run('character');
verify(early==='harry','early profile cannot equip a locked character');
console.log('PASS: '+checks.length+' character progression, menu and persistence checks');
