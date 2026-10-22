const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {cleanupJob}=require('../src/core');

test('cleanup removes only a generated job inside the supplied ProgramData root', {skip:process.platform!=='win32'},()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'windows-user-vscode-test-'));
  const job=path.join(root,'windows-user-vscode-S-1-5-21-1-2-3-1000','a'.repeat(32));
  const unrelated=path.join(root,'unrelated');
  try {
    fs.mkdirSync(job,{recursive:true});fs.writeFileSync(path.join(job,'launch.ps1'),'probe');
    fs.mkdirSync(unrelated);fs.writeFileSync(path.join(unrelated,'keep.txt'),'keep');
    cleanupJob(unrelated,{ProgramData:root});assert(fs.existsSync(path.join(unrelated,'keep.txt')));
    cleanupJob(job,{ProgramData:root});assert(!fs.existsSync(job));
  } finally {
    assert.equal(path.dirname(root),os.tmpdir());
    assert(path.basename(root).startsWith('windows-user-vscode-test-'));
    fs.rmSync(root,{recursive:true,force:true});
  }
});
test('cross-account bootstrap uses a short file command without weakening execution policy',()=>{
  const batch=fs.readFileSync(path.join(__dirname,'../src/authenticate.cmd'),'utf8');
  assert(batch.includes('-File'));
  assert(!batch.includes('-EncodedCommand'));
  assert(!/ExecutionPolicy\s+Bypass|\/savecred/i.test(batch));
  const launch=fs.readFileSync(path.join(__dirname,'../src/launch.ps1'),'utf8');
  assert(launch.includes('$targetCommand.Length -ge 1024'));
  assert(launch.includes('$targetSid, \'ReadAndExecute\''));
});
