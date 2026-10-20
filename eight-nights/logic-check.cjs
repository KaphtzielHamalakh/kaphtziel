const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{};const gradient={addColorStop:noop};const ctx=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||noop});const el=()=>({getContext:()=>ctx,addEventListener:noop,setAttribute:noop,focus:noop,dataset:{}});const elements={};const storage={};
const sandbox={console,assert,document:{getElementById:id=>elements[id]??=el(),querySelectorAll:()=>[],addEventListener:noop,hidden:false},window:{addEventListener:noop},localStorage:{setItem:(k,v)=>storage[k]=v,getItem:k=>storage[k]},requestAnimationFrame:noop,setTimeout:noop,Blob,URL};
vm.createContext(sandbox);for(const file of ['world.js','game.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),sandbox);
const browserTest=fs.readFileSync(__dirname+'/check.cjs','utf8');const logic=browserTest.split('const results=await page.evaluate(()=>{')[1].split("return 'Traversal")[0];
vm.runInContext(logic,sandbox,{timeout:30000});
vm.runInContext(`for(const id of Object.keys(World.rooms)){enter(id);draw();}for(const m of ['title','inventory','dead','ceremony','dialogue']){mode=m;dialogue=['A light in the darkness.'];draw();}console.log('PASS: traversal, keys, puzzles, Dreidel, boss phases, flame, death, save validation and all rendering branches');`,sandbox);
