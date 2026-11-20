const KEY='tropetrain-practice-recoveries-v1';
export function practiceRecovery(rawPractice,reason,created=new Date().toISOString()){
  if(typeof rawPractice!=='string'||!rawPractice||rawPractice.length>6_000_000)throw Error('Original saved practice data is unavailable for recovery.');
  return {format:'tropetrain-practice-recovery-v1',created,reason:String(reason).slice(0,2000),rawPractice};
}
const valid=record=>record?.format==='tropetrain-practice-recovery-v1'&&typeof record.rawPractice==='string'&&record.rawPractice.length<=6_000_000&&typeof record.reason==='string';
export function latestPracticeRecovery(storage){
  try{const records=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(records)?records.find(valid)??null:null;}catch{return null;}
}
export function savePracticeRecovery(storage,record){
  if(!valid(record))return false;
  try{
    if(!storage)return false;let previous=[];try{previous=JSON.parse(storage.getItem(KEY)||'[]');}catch{}
    const records=[record,...(Array.isArray(previous)?previous:[]).filter(valid).filter(old=>old.rawPractice!==record.rawPractice)].slice(0,8);
    storage.setItem(KEY,JSON.stringify(records));return true;
  }catch{return false;}
}
