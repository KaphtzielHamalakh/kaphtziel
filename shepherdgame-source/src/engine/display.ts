// A browser can restore or force page zoom despite viewport metadata (notably iOS).
// Keep the whole game in the visible viewport instead of trusting zoom prevention.
export function installViewportFit(game:HTMLElement,onResize:()=>void){
 const sync=()=>{
  const v=window.visualViewport,scale=v?.scale||1;
  game.style.width=`${(v?.width??innerWidth)*scale}px`;
  game.style.height=`${(v?.height??innerHeight)*scale}px`;
  game.style.transform=`translate(${v?.offsetLeft??0}px,${v?.offsetTop??0}px) scale(${1/scale})`;
  onResize();
 };
 let settle:ReturnType<typeof setTimeout>;
 const refresh=()=>{sync();clearTimeout(settle);settle=setTimeout(sync,250);};
 for(const name of ['resize','orientationchange','pageshow','focus'])window.addEventListener(name,refresh);
 window.visualViewport?.addEventListener('resize',refresh);
 window.visualViewport?.addEventListener('scroll',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 sync();return refresh;
}

export function guardGameGestures(game:HTMLElement){
 const prevent=(event:Event)=>{if(event.cancelable)event.preventDefault();};
 for(const name of ['gesturestart','gesturechange','gestureend','dblclick'])document.addEventListener(name,prevent,{passive:false});
 for(const name of ['touchstart','touchmove'])document.addEventListener(name,event=>{if((event as TouchEvent).touches.length>1)prevent(event);},{passive:false});
 game.addEventListener('wheel',event=>{if(event.ctrlKey)prevent(event);},{passive:false});
 let lastTap=-Infinity;
 game.addEventListener('touchend',event=>{if((event.target as HTMLElement).closest('[data-ui]'))return;const now=performance.now();if(now-lastTap<280)prevent(event);lastTap=now;},{passive:false});
}
export function installDisplayPanel(config:{get:()=>number,set:(value:number)=>void,open:()=>void,close:()=>void,resetControls:()=>void,arrange:()=>void}){
 const panel=document.querySelector<HTMLElement>('#display-panel')!,slider=document.querySelector<HTMLInputElement>('#screen-size')!,output=document.querySelector<HTMLOutputElement>('#screen-percent')!;
 const sync=()=>{slider.value=String(Math.round(config.get()*100));output.value=slider.value+'%';};
 const open=()=>{if(!panel.hidden)return;config.open();panel.hidden=false;sync();document.querySelector<HTMLButtonElement>('#display-close')!.focus({preventScroll:true});};
 const close=()=>{if(panel.hidden)return;panel.hidden=true;config.close();};
 document.querySelector('#screen-settings')!.addEventListener('click',open);
 document.querySelector('#display-close')!.addEventListener('click',close);
 slider.addEventListener('input',()=>{config.set(Number(slider.value)/100);sync();});
 document.querySelector('#display-fit')!.addEventListener('click',()=>{
  config.set(1);sync();
  document.querySelector('meta[name=viewport]')?.setAttribute('content','width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  window.scrollTo(0,0);
 });
 document.querySelector('#control-reset')!.addEventListener('click',config.resetControls);
 document.querySelector('#control-arrange')!.addEventListener('click',()=>{close();config.arrange();});
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){
  const controls=[...panel.querySelectorAll<HTMLElement>('button,input')],i=controls.indexOf(document.activeElement as HTMLElement);
  if(event.shiftKey&&i===0){event.preventDefault();controls.at(-1)!.focus();}else if(!event.shiftKey&&i===controls.length-1){event.preventDefault();controls[0].focus();}
 }});
 return {open,close};
}
