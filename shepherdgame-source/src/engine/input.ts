import {options} from './save';
export type Key='left'|'right'|'up'|'down'|'jump'|'fire'|'lyre'|'pause'|'prev'|'next';
export class Input{
 queued=new Set<Key>();held=new Set<Key>();pressed=new Set<Key>(); released=new Set<Key>(); keyboard=new Set<Key>();touch=new Map<number,Key[]>();padKeys=new Set<Key>();last=new Set<Key>();onGesture=()=>{}; remap:Key|null=null;onRemap:(key:Key,code:string)=>void=()=>{};
 mapping:Record<string,Key>={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'jump',Space:'jump',KeyX:'fire',KeyJ:'fire',KeyC:'lyre',Enter:'pause',Escape:'pause',KeyQ:'prev',KeyE:'next'};
 constructor(){for(const [k,v] of Object.entries(options().keys))this.mapping[v]=k as Key;
 addEventListener('keydown',e=>{if(this.remap){e.preventDefault();this.onRemap(this.remap,e.code);this.remap=null;return;}const k=this.mapping[e.code];if(k){e.preventDefault();if(!this.keyboard.has(k))this.queued.add(k);this.keyboard.add(k);document.body.classList.remove('touch');this.onGesture();}});
 addEventListener('keyup',e=>{const k=this.mapping[e.code];if(k){e.preventDefault();this.keyboard.delete(k);}});
 addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>this.clear());
 const pad=document.querySelector<HTMLElement>('#pad')!;
 const bind=(el:HTMLElement,get:(e:PointerEvent)=>Key[])=>{el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);this.touch.set(e.pointerId,get(e));el.classList.add('held');document.body.classList.add('touch');this.onGesture();if(options().haptics&&el.dataset.key&&navigator.vibrate)navigator.vibrate(10);});el.addEventListener('pointermove',e=>{if(this.touch.has(e.pointerId))this.touch.set(e.pointerId,get(e));});const end=(e:PointerEvent)=>{this.touch.delete(e.pointerId);el.classList.remove('held');};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);};
 bind(pad,e=>{const r=pad.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;const a:Key[]=[];if(x<-.09)a.push('left');if(x>.09)a.push('right');if(y<-.09)a.push('up');if(y>.09)a.push('down');return a;});
 document.querySelectorAll<HTMLElement>('[data-key]').forEach(el=>bind(el,()=>[el.dataset.key as Key]));
 addEventListener('touchstart',()=>document.body.classList.add('touch'),{passive:true});if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
 }
 update(){this.padKeys.clear();const g=navigator.getGamepads?.()[0];if(g){const a=(k:Key,b:boolean)=>{if(b)this.padKeys.add(k);};a('left',g.axes[0]<-.35||!!g.buttons[14]?.pressed);a('right',g.axes[0]>.35||!!g.buttons[15]?.pressed);a('up',g.axes[1]<-.35||!!g.buttons[12]?.pressed);a('down',g.axes[1]>.35||!!g.buttons[13]?.pressed);(['jump','fire','lyre','pause','prev','next'] as Key[]).forEach((k,i)=>a(k,!!g.buttons[[0,1,3,9,4,5][i]]?.pressed));if(this.padKeys.size){document.body.classList.remove('touch');this.onGesture();}}
 this.held=new Set([...this.keyboard,...this.padKeys,...[...this.touch.values()].flat()]);this.pressed=new Set([...this.queued,...[...this.held].filter(k=>!this.last.has(k))]);this.queued.clear();this.released=new Set([...this.last].filter(k=>!this.held.has(k)));this.last=new Set(this.held);}
 is(k:Key){return this.held.has(k);}hit(k:Key){return this.pressed.has(k);}clear(){this.queued.clear();this.keyboard.clear();this.touch.clear();this.held.clear();this.last.clear();}
}
