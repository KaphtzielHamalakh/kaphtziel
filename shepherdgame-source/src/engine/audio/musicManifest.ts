const loops=['title','stage_select','prologue','anointing','realm_zin','realm_hermon','realm_sodom','realm_resheph','realm_edom','realm_jaffa','realm_night','realm_azazel','boss','elah','goliath','ashmedai_hall','ashmedai_final','saul'];
const jingles=['coronation','credits','jingle_get_power','jingle_stage_clear','jingle_boss_intro','jingle_game_over','jingle_song_learned'];
export const musicManifest=Object.fromEntries([...loops,...jingles].map(id=>[id,{id,file:id+'.mp3',loop:loops.includes(id),loopStart:0,loopEnd:null as number|null,trimStart:0,volume:1,bpm:id==='realm_night'?120:undefined}]));

// Temporary soundtrack assignments from the author's first five uploads.
// Replace any entry's file here as more realm-specific music arrives.
export const soundtrackAssignments:Record<string,string>={
 title:'shepherd-main-theme-1.mp3',
 stage_select:'shepherd-main-theme-1.mp3',
 prologue:'fields-of-bethlehem.mp3',
 realm_zin:'fields-of-bethlehem-1.mp3',
 realm_hermon:'fields-of-bethlehem-alt.mp3',
 realm_sodom:'shepherd-main-theme-2.mp3',
 realm_resheph:'shepherd-main-theme-2.mp3',
 realm_edom:'fields-of-bethlehem-alt.mp3',
 realm_jaffa:'fields-of-bethlehem.mp3',
 realm_night:'fields-of-bethlehem.mp3',
 realm_azazel:'fields-of-bethlehem-1.mp3',
};
for(const [id,file] of Object.entries(soundtrackAssignments))musicManifest[id].file=file;
