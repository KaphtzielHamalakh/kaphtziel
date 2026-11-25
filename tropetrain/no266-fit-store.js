import {blankNo266FittingDraft,validateNo266FittingDraft,no266FittingStorageKey} from './no266-mam-fitting.js';
const copy=v=>structuredClone(v),schema='tropetrain-no266-personal-mam-settings-v1';
export class No266FittingStore{
 constructor(storage){this.storage=storage;this.records=new Map();}
 get(context){
  const key=no266FittingStorageKey(context);if(this.records.has(key))return this.records.get(key);
  const entry={key,context:copy(context),draft:blankNo266FittingDraft(context),enabled:false,previous:null,revision:0,recovery:null,message:'',durable:true};
  try{if(!this.storage)throw Error('Device storage is unavailable.');const raw=this.storage.getItem(key);if(raw!==null){try{const s=JSON.parse(raw);if(s.schema!==schema||typeof s.enabled!=='boolean'||Object.keys(s).sort().join(',')!=='draft,enabled,schema')throw Error('Saved settings do not match this editor.');validateNo266FittingDraft(s.draft,context);entry.draft=copy(s.draft);entry.enabled=s.enabled;}catch(e){entry.recovery=raw;entry.message='Stored fitting was kept for recovery and not applied: '+e.message;entry.durable=false;}}}catch(e){entry.message='Device saving unavailable: '+e.message;entry.durable=false;}
  this.records.set(key,entry);return entry;
 }
 check(entry){if(this.records.get(entry?.key)!==entry||entry.key!==no266FittingStorageKey(entry.context))throw Error('Unknown No266 fitting context.');validateNo266FittingDraft(entry.draft,entry.context);}
 retained(entry){this.check(entry);if(entry.recovery!==null)return entry.recovery;try{return this.storage?.getItem(entry.key+':retained')??null;}catch{return null;}}
 persist(entry){
  this.check(entry);try{if(!this.storage)throw Error('Device storage is unavailable.');if(entry.recovery!==null){const retained=this.storage.getItem(entry.key+':retained');if(retained!==null&&retained!==entry.recovery)throw Error('A different recovery copy already exists. Both stored copies were kept. Export the current draft before leaving.');this.storage.setItem(entry.key+':retained',entry.recovery);entry.recovery=null;}this.storage.setItem(entry.key,JSON.stringify({schema,enabled:entry.enabled,draft:entry.draft}));entry.durable=true;return true;}catch(e){entry.durable=false;entry.message='Draft kept in this page; saving failed: '+e.message;return false;}
 }
 change(entry,draft,message){this.check(entry);validateNo266FittingDraft(draft,entry.context);entry.previous=copy(entry.draft);entry.draft=copy(draft);entry.revision++;entry.message=message;return this.persist(entry);}
 setEnabled(entry,enabled){this.check(entry);if(typeof enabled!=='boolean')throw Error('Choose whether to follow this personal draft.');entry.enabled=enabled;entry.revision++;entry.message=enabled?'Personal No266 text follow enabled for this reading section. Only complete proposed spans follow; singing and acoustic syllable timing remain unassigned.':'Personal No266 text follow off for this reading section. Draft and source notes kept.';return this.persist(entry);}
 undo(entry){this.check(entry);if(entry.previous===null)return false;entry.draft=entry.previous;entry.previous=null;entry.revision++;entry.message='Previous personal No266 draft restored.';return this.persist(entry);}
}
