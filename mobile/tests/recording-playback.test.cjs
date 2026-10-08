const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/recordingPlayback.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
const progress = {position:0,progressedAt:0};
// A healthy 25-second recording must pass the old eight-second boundary without advancing.
for (let second=0;second<25;second++) assert.equal(api.recordingPlaybackState({currentTime:second,duration:25,didJustFinish:false},progress,second*1000),'playing');
assert.equal(api.recordingPlaybackState({currentTime:25,duration:25,didJustFinish:true},progress,25000),'finished');
assert.equal(api.recordingPlaybackState({currentTime:2,duration:20,didJustFinish:false},{position:2,progressedAt:2000},9999),'playing');
assert.equal(api.recordingPlaybackState({currentTime:2,duration:20,didJustFinish:false},{position:2,progressedAt:2000},10000),'stalled');
assert.equal(api.recordingPlaybackState({currentTime:0,duration:0,didJustFinish:false},{position:0,progressedAt:0},8000),'stalled');
console.log('Healthy long recordings finish; stalled playback remains bounded.');
