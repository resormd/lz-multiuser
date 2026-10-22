'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

function safeUser(value) {
  return typeof value === 'string' && !/[\r\n]/.test(value) && /^[\p{L}\p{N}_. -]{1,64}$/u.test(value);
}
function cleanEnvironment(source) {
  return Object.fromEntries(Object.entries(source).filter(([key]) =>
    !/^(VSCODE_|ELECTRON_|UW_)/i.test(key) && !/^CODEX_HOME$/i.test(key)));
}
function supportedExecutable(file) {
  return typeof file === 'string' && ['code.exe', 'code - insiders.exe'].includes(path.win32.basename(file).toLowerCase());
}
function findExecutable(options = {}) {
  const { saved, execPath = process.execPath, appRoot = '', env = process.env, exists = fs.existsSync } = options;
  // A manual choice is authoritative; don't silently use another install if it disappears.
  if (saved) {
    if (!supportedExecutable(saved) || !exists(saved)) throw new Error('所选 VS Code 程序不存在，请重新选择。');
    return saved;
  }
  const candidates = [execPath];
  let ancestor = appRoot;
  for (let i = 0; ancestor && i < 6; i++) {
    candidates.push(path.win32.join(ancestor, 'Code.exe'), path.win32.join(ancestor, 'Code - Insiders.exe'));
    const parent = path.win32.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  for (const base of [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && path.win32.join(env.LOCALAPPDATA, 'Programs')]) {
    if (base) candidates.push(path.win32.join(base, 'Microsoft VS Code', 'Code.exe'), path.win32.join(base, 'Microsoft VS Code Insiders', 'Code - Insiders.exe'));
  }
  const result = candidates.find(file => supportedExecutable(file) && exists(file));
  if (!result) throw new Error('未找到 VS Code，请点击“选择 VS Code 程序”。');
  return result;
}
function helper(context, scriptName, request = {}) {
  const request64 = Buffer.from(JSON.stringify(request), 'utf8').toString('base64');
  let script = "$ErrorActionPreference='Stop'\n$ProgressPreference='SilentlyContinue'\n$env:PSModulePath=$PSHOME+'\\Modules'\n[Console]::OutputEncoding=New-Object Text.UTF8Encoding $false\n" +
    `$request = ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${request64}')))\n`;
  if (scriptName === 'launch.ps1') script += fs.readFileSync(context.asAbsolutePath('src/native-console.ps1'), 'utf8') + '\n';
  script += fs.readFileSync(context.asAbsolutePath(`src/${scriptName}`), 'utf8');
  return new Promise((resolve, reject) => {
    execFile(path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      {windowsHide:true, env:cleanEnvironment(process.env), encoding:'utf8', maxBuffer:256*1024},
      (error, stdout, stderr) => error ? reject(new Error((stderr || error.message).trim())) : resolve(stdout.trim()));
  });
}
function cleanupJob(directory, env = process.env) {
  if (typeof directory !== 'string' || !env.ProgramData) return;
  const relative = path.win32.relative(path.win32.resolve(env.ProgramData), path.win32.resolve(directory));
  if (!/^windows-user-vscode-S-1-5-21-[0-9-]+\\[a-f0-9]{32}$/i.test(relative)) return;
  try {
    const root = path.win32.dirname(directory);
    if (fs.lstatSync(root).isSymbolicLink() || fs.lstatSync(directory).isSymbolicLink()) return;
    fs.rmSync(directory, {recursive:true, force:true});
  } catch { /* Keep a still-in-use job rather than disrupt a target process. */ }
}
module.exports = { safeUser, cleanEnvironment, supportedExecutable, findExecutable, helper, cleanupJob };
