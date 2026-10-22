const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original=Module._load;
const vscode={env:{appRoot:'X:\\VSCode\\resources\\app'},window:{showOpenDialog:async()=>undefined}};
Module._load=function(name,...args){return name==='vscode'?vscode:original.call(this,name,...args);};
const {UserWindowsView}=require('../src/extension');
Module._load=original;

function fixture() {
  const calls=[],states=[],cleaned=[];
  const context={subscriptions:[],globalState:{get:()=>undefined,update:async()=>{}},asAbsolutePath:p=>'X:\\Extension\\'+p};
  const view=new UserWindowsView(context,{cleanupJob:directory=>cleaned.push(directory),findExecutable:()=> 'X:\\VSCode\\Code.exe',helper:async(ctx,name,request)=>{
    calls.push({name,request});
    if(name==='users.ps1')return JSON.stringify({users:[{name:'ExampleUser',current:true},{name:'OtherUser',current:false}]});
    if(name==='verify.ps1')return JSON.stringify({account:'PC\\OtherUser',processes:[111]});
    return JSON.stringify({jobDirectory:'test-owned-job',commandLength:250});
  }});
  view.view={webview:{postMessage:m=>states.push(m)}};
  return {view,calls,states,cleaned};
}
test('reject fabricated users and injection without creating a process', async()=>{
  const {view,calls}=fixture();await view.refresh();const before=calls.length;
  await view.open('OtherUser & whoami');await view.open('Administrator');
  assert.equal(calls.length,before);
});
test('selected local user and discovered executable reach launch and identity verification', async()=>{
  const {view,calls,states,cleaned}=fixture();await view.refresh();await view.open('OtherUser');
  assert.equal(calls[1].name,'launch.ps1');assert.equal(calls[1].request.user,'OtherUser');
  assert.equal(calls[1].request.executable,'X:\\VSCode\\Code.exe');
  assert.equal(calls[2].name,'verify.ps1');assert.equal(states.at(-1).busy,false);
  assert(states.at(-1).status.includes('PC\\OtherUser'));
  assert.deepEqual(cleaned,['test-owned-job']);
});
test('launch failure clears busy state and preserves the error', async()=>{
  const {view,states}=fixture();await view.refresh();
  view.helper=async()=>{throw Error('Native console creation denied');};
  await view.open('OtherUser');assert.equal(view.busy,false);
  assert(states.at(-1).status.includes('Native console creation denied'));
});
