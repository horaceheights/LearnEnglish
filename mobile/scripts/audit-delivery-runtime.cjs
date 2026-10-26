const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const ts=require(path.join(root,'node_modules/typescript'));
const loaded=new Map();
function load(name){if(loaded.has(name))return loaded.get(name);const src=fs.readFileSync(path.join(root,'src',name+'.ts'),'utf8');const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const module={exports:{}};new Function('exports','require','module',out)(module.exports,id=>id.startsWith('./')?load(id.slice(2)):require(id),module);loaded.set(name,module.exports);return module.exports;}
const {lessonMistakeHint}=load('lessonMistakeHints');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const records=[];
for(const lesson of input.canonicalProjection)for(const card of lesson.cards){if(!['Recognize','Listen'].includes(card.stage))continue;for(const option of card.options){if(option.id===card.correct_option_id)continue;const hint=lessonMistakeHint(card,[option.id]);records.push({lesson:lesson.id,card:card.slide_id,wrong:option.id,hint,generic:!hint.trim()||/^La respuesta es|^Aquí corresponde|Lee la explicación|Reintentar/i.test(hint),overlong:hint.length>140});}}
fs.writeFileSync(process.argv[3],JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify({wrongChoices:records.length,generic:records.filter(x=>x.generic).length,overlong:records.filter(x=>x.overlong).length}));
