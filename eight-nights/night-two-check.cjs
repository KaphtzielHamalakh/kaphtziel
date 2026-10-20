// Extend the existing VM fixture with campaign regression checks.
const fs=require('fs'),vm=require('vm');
const harness=fs.readFileSync(__dirname+'/logic-check.cjs','utf8');
const extended=harness+`\nvm.runInContext(fs.readFileSync(__dirname+'/night-two-cases.js','utf8'),sandbox,{timeout:30000});`;
new Function('require','__dirname',extended)(require,__dirname);
