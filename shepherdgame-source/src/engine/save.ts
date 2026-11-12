export type Save={mask:number,oil:number,morning:boolean,prologue:boolean,fortress:number,fragments:number,difficulty:number};
export const fresh=():Save=>({mask:0,oil:0,morning:false,prologue:false,fortress:0,fragments:0,difficulty:1});
const key='shepherd-elah-v1-';
export function read(slot:number):Save|null{try{const s=JSON.parse(localStorage.getItem(key+slot)||'null');return s&&Number.isInteger(s.mask)&&s.mask>=0&&s.mask<=255?{...fresh(),...s}:null;}catch{return null;}}
export function write(slot:number,s:Save){try{localStorage.setItem(key+slot,JSON.stringify(s));}catch{}}
export function checksum(v:number){return ((v&15)^((v>>4)&15)^((v>>8)&15)^0xA)&15;}
// 16 bits occupy eight base-6 digits. The remaining 28 cells carry a deterministic
// woven border, so every grid cell is validated and transcription errors are caught.
export function encode(s:Pick<Save,'mask'|'oil'|'morning'>){if(s.oil<0||s.oil>4)throw Error('Oil range');const v=s.mask|(s.oil<<8)|(Number(s.morning)<<11);let n=v|(checksum(v)<<12);const a:number[]=[];for(let i=0;i<8;i++){a.push(n%6);n=Math.floor(n/6);}for(let i=8;i<36;i++)a.push((a[i%8]+i)%6);return a;}
export function decode(a:number[]):Save|null{if(a.length!==36||a.some(n=>!Number.isInteger(n)||n<0||n>5))return null;for(let i=8;i<36;i++)if(a[i]!==((a[i%8]+i)%6))return null;let n=0;for(let i=7;i>=0;i--)n=n*6+a[i];if(n>65535)return null;const v=n&4095;if(checksum(v)!==(n>>12)||((v>>8)&7)>4)return null;return {...fresh(),mask:v&255,oil:(v>>8)&7,morning:!!(v&2048),prologue:true};}
export function options():typeof defaults{try{const saved={...defaults,...JSON.parse(localStorage.getItem('elah-options')||'{}')};saved.screenScale=Math.max(.6,Math.min(1,Number(saved.screenScale)||1));return saved;}catch{return {...defaults};}}
export const defaults={music:.7,sfx:.8,screenScale:1,shake:true,reduceFlash:true,touch:0,haptics:false,showNotes:true,opacity:.55,scale:1,layout:{} as Record<string,{x:number,y:number}>,keys:{} as Record<string,string>};
export function saveOptions(o:typeof defaults){try{localStorage.setItem('elah-options',JSON.stringify(o));}catch{}}
