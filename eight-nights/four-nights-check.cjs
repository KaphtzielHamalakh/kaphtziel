const fs=require('fs'),vm=require('vm');
const fixture=fs.readFileSync(__dirname+'/logic-check.cjs','utf8');
new Function('require','__dirname',fixture+`\nvm.runInContext(fs.readFileSync(__dirname+'/four-nights-cases.js','utf8'),sandbox,{timeout:30000});`)(require,__dirname);
