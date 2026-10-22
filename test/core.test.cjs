const {test} = require('node:test');
const assert = require('node:assert/strict');
const {safeUser, cleanEnvironment, findExecutable} = require('../src/core');

test('only supported local user strings reach CMD', () => {
  for (const name of ['ExampleUser', '�û� ��', 'dev.user-2', 'user_2']) assert(safeUser(name));
  for (const name of ['', 'x\n', 'x\r', 'x&whoami', 'x%PATH%', 'x!PATH!', 'x"', "x'", 'domain\\user', 'x|y', 'x'.repeat(65), null]) assert(!safeUser(name), String(name));
});
test('clear IPC and launcher variables without mutating the caller', () => {
  const env = {PATH:'safe', SystemRoot:'C:\\Windows', VSCODE_IPC_HOOK:'pipe', electron_run_as_node:'1', CODEX_HOME:'old', UW_ACCOUNT:'old'};
  assert.deepEqual(cleanEnvironment(env), {PATH:'safe', SystemRoot:'C:\\Windows'});
  assert.equal(env.CODEX_HOME, 'old');
});
test('discover the executable currently hosting the local extension', () => {
  const executable='E:\\Applications\\VS Code\\Code.exe';
  assert.equal(findExecutable({execPath:executable,env:{},exists:p=>p===executable}),executable);
});
test('detect versioned app roots and Insiders without machine-specific paths', () => {
  const executable='C:\\Program Files\\Microsoft VS Code Insiders\\Code - Insiders.exe';
  assert.equal(findExecutable({execPath:'C:\\runtime\\node.exe',appRoot:'C:\\Program Files\\Microsoft VS Code Insiders\\build123\\resources\\app',env:{},exists:p=>p===executable}),executable);
});
test('detect a per-user install from LOCALAPPDATA', () => {
  const executable='C:\\Users\\ExampleUser\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe';
  assert.equal(findExecutable({execPath:'node.exe',env:{LOCALAPPDATA:'C:\\Users\\ExampleUser\\AppData\\Local'},exists:p=>p===executable}),executable);
});
test('manual selection supports spaces, Unicode and shell punctuation as data', () => {
  const saved="E:\\Tools\\It's & ���� 100%\\Code.exe";
  assert.equal(findExecutable({saved,exists:()=>true}),saved);
  assert.throws(()=>findExecutable({saved,execPath:'C:\\Other\\Code.exe',exists:()=>false}),/����ѡ��/);
  assert.throws(()=>findExecutable({saved:'C:\\Other\\tool.exe',exists:()=>true}),/����ѡ��/);
});
