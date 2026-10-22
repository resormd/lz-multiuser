const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
let launch;
const original=Module._load;
Module._load=function(name,...args){
  if(name==='node:child_process')return {execFile(exe,args,options,callback){launch={exe,args,options};callback(null,'ok','');}};
  return original.call(this,name,...args);
};
const {helper}=require('../src/core');
Module._load=original;
test('paths are encoded JSON data, never interpolated into shell commands',async()=>{
  const request={user:'ExampleUser',executable:"E:\\It's & ���� 100%\\Code.exe",bootstrap:'X:\\Extension\\authenticate.cmd'};
  const context={asAbsolutePath:file=>path.resolve(__dirname,'..',file)};
  await helper(context,'launch.ps1',request);
  assert(launch.exe.endsWith('powershell.exe'));assert.equal(launch.options.shell,undefined);
  assert.equal(launch.args.at(-2),'-EncodedCommand');
  const script=Buffer.from(launch.args.at(-1),'base64').toString('utf16le');
  assert(!script.includes(request.executable));
  const data=script.match(/FromBase64String\('([^']+)'\)/)[1];
  assert.deepEqual(JSON.parse(Buffer.from(data,'base64').toString('utf8')),request);
  assert(script.includes('$false, 0x10'));
  assert(script.includes('UW_SCRIPT_PATH'));
  assert(script.includes('$targetCommand.Length -ge 1024'));
});
