export const realms=[
{name:'WILDERNESS OF ZIN',boss:'KETEV MERIRI',power:'NOON SCORCH',track:'realm_zin',sky:'#352138',back:'#714039',ground:'#b77643',light:'#f1cf8b',color:'#eb8246',shadow:'#9a382b',weak:6,cost:1,damage:2},
{name:'MOUNT HERMON',boss:'SHEMIHAZAH',power:'HERMON FROST',track:'realm_hermon',sky:'#152343',back:'#384875',ground:'#6285ad',light:'#bce3eb',color:'#9cdaec',shadow:'#354d87',weak:0,cost:2,damage:1},
{name:'SALT FLATS OF SODOM',boss:'GAFRIT',power:'BRIMSTONE',track:'realm_sodom',sky:'#252132',back:'#5f4144',ground:'#9c7955',light:'#eddb94',color:'#ddc45e',shadow:'#53474b',weak:1,cost:2,damage:3},
{name:'HIGH PLACE OF RESHEPH',boss:'RESHEPH',power:'FLASH ARROW',track:'realm_resheph',sky:'#172936',back:'#344d58',ground:'#57716a',light:'#a7d9da',color:'#5be1de',shadow:'#5a6886',weak:7,cost:1,damage:2},
{name:'RUINS OF EDOM',boss:'LILITH',power:'SCREECH GALE',track:'realm_edom',sky:'#262039',back:'#59405e',ground:'#8d6469',light:'#e4b6a4',color:'#b8a0d6',shadow:'#685080',weak:5,cost:1,damage:1},
{name:'DEPTHS OFF JAFFA',boss:'LEVIATHAN',power:'DEEP BUBBLE',track:'realm_jaffa',sky:'#122b3b',back:'#205163',ground:'#397c7d',light:'#9ed6b3',color:'#70c8b6',shadow:'#2d7b7c',weak:3,cost:2,damage:2},
{name:'CITY OF NIGHT',boss:'AGRAT BAT MAHALAT',power:'NIGHT VEIL',track:'realm_night',sky:'#171629',back:'#3d2d54',ground:'#695077',light:'#ddbf89',color:'#483356',shadow:'#c266a6',weak:4,cost:4,damage:2},
{name:'CLIFF OF AZAZEL',boss:'AZAZEL',power:'CLIFF STONE',track:'realm_azazel',sky:'#352333',back:'#6c3c42',ground:'#a3614c',light:'#e5b388',color:'#b37353',shadow:'#663d37',weak:2,cost:3,damage:2}];
// Correct weakness mapping: Cliff Stone grounds Resheph; Night Veil shades Ketev.
realms[3].weak=7;
export const tunes:Record<string,string>={D:'FOLD',U:'OPENING',R:'MORNING'};
export const songs=[{name:'FOLD',notes:'DLR',display:'DOWN LEFT RIGHT'},{name:'OPENING',notes:'UDU',display:'UP DOWN UP'},{name:'MORNING',notes:'RUL',display:'RIGHT UP LEFT'}];
export const psalms=['THE LORD IS MY SHEPHERD.','THE LORD IS MY LIGHT.','I WILL FEAR NO EVIL.','MY HELP COMETH FROM THE LORD.','HE RESTORETH MY SOUL.','HE LEADETH ME BESIDE STILL WATERS.','THY WORD IS A LAMP.','LET EVERY THING PRAISE THE LORD.'];
