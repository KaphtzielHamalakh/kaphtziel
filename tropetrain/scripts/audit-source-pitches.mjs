import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pitchManifest,validatePitchRecord} from '../source-pitch.js';
const read=file=>readFile(new URL('../'+file,import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const packet=await read('data/references/torah-library.json.gz'),refs=JSON.parse(gunzipSync(packet));
if(hash(packet)!==pitchManifest.referencePacketSha256||pitchManifest.records.length!==refs.recordings.length)throw Error('Pitch source coverage changed.');
const implementation=hash(Buffer.concat(await Promise.all(['measure-source-pitches.py','pitch_measurement.py'].map(f=>read('scripts/'+f)))));
if(implementation!==pitchManifest.implementationSha256)throw Error('Pitch implementation changed.');
for(const [index,entry] of pitchManifest.records.entries()){
 const raw=await read('data/pitch/'+entry.file),ref=refs.recordings[index];
 if(entry.bytes!==raw.length||entry.sha256!==hash(raw)||entry.id!==ref.id||entry.sourceAudio.sha1!==ref.audio.sha1||entry.sourceAudio.bytes!==ref.audio.bytes||entry.sourceAudio.url!==ref.audio.url||entry.wordTiming!==ref.status)throw Error('Pitch catalog/source mismatch: '+entry.id);
 validatePitchRecord(JSON.parse(gunzipSync(raw)),entry);
}
console.log('All378 source-pitch packets, original source pins, units, frame order, null syllables and implementation hashes validated.');
