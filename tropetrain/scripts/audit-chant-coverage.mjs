import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {ReferenceLibrary} from '../reference-library.js';
import {chantCoverage} from '../recorded-practice.js';
const root=new URL('../',import.meta.url);
const report=chantCoverage(new ReferenceLibrary(JSON.parse(gunzipSync(await readFile(new URL('data/references/torah-library.json.gz',root))))));
await writeFile(new URL('docs/CHANT-COVERAGE.json',root),JSON.stringify(report,null,2)+'\n');
console.log(`Chant coverage: ${report.sourceTimedWords}/${report.words} source-timed words; ${report.reviewWords} blocked words in ${report.gaps.length} source takes.`);
