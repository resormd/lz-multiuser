'use strict';
const crypto = require('node:crypto');
function getHtml() {
  const nonce = crypto.randomBytes(18).toString('base64');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
body{padding:18px 14px;color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);line-height:1.6}
h2{font-size:18px;font-weight:600;margin:0 0 6px}.intro{color:var(--vscode-descriptionForeground);margin:0 0 22px}
label{display:block;font-weight:600;margin-bottom:8px}select{box-sizing:border-box;width:100%;padding:8px;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border,transparent);border-radius:3px;font:inherit}
button{box-sizing:border-box;width:100%;padding:9px 8px;margin-top:14px;border:0;border-radius:3px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);font:inherit;cursor:pointer}button:hover{background:var(--vscode-button-hoverBackground)}button:disabled{opacity:.55;cursor:default}
button:focus-visible,select:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:2px}.secondary{margin-top:8px;background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}
.status{margin-top:20px;padding:12px;border-left:2px solid var(--vscode-focusBorder);background:var(--vscode-textBlockQuote-background);overflow-wrap:anywhere}.note{font-size:12px;color:var(--vscode-descriptionForeground);margin-top:20px}code{font-family:var(--vscode-editor-font-family)}
</style></head><body><h2>ѡ���û����򿪴���</h2><p class="intro">�ڵ�ǰ�����д򿪸� Windows �û��� VS Code��</p>
<label for="users">Windows �û�</label><select id="users" disabled><option>���ڶ�ȡ�����û���</option></select>
<button id="open" disabled>���´���</button><button id="refresh" class="secondary">ˢ���û��б�</button><button id="browse" class="secondary">ѡ�� VS Code ����</button><p id="executable" class="note"></p>
<div id="status" class="status" role="status" aria-live="polite">���ڶ�ȡ�û���</div>
<p class="note">�����û����ڶ��� CMD ������ Windows ���롣�˽��治���ջ򱣴����롣</p><p class="note">�´��ڴӱ��ؿմ��ڿ�ʼ��Codex �˺������ڶ�Ӧ�����е�����¼��</p>
<script nonce="${nonce}">
const api=acquireVsCodeApi(), select=document.getElementById('users'), open=document.getElementById('open'), refresh=document.getElementById('refresh'), status=document.getElementById('status');
const browse=document.getElementById('browse'), executable=document.getElementById('executable');
const saved=api.getState()||{};let selected=saved.selected;
window.addEventListener('message',event=>{const state=event.data;if(state.type!=='state')return;
const previous=select.value;select.replaceChildren();for(const user of state.users){const option=document.createElement('option');option.value=user.name;option.textContent=user.name+(user.current?'����ǰ�û���':'');select.appendChild(option);}
const wanted=selected||previous||(state.users.find(u=>u.current)||state.users[0]||{}).name;if(state.users.some(u=>u.name===wanted))select.value=wanted;
select.disabled=state.busy||!state.users.length;open.disabled=select.disabled;refresh.disabled=state.busy;browse.disabled=state.busy;executable.textContent=state.executable||'��δʶ�� VS Code ·��';open.textContent=state.busy?'���ڵȴ����������':'���´���';status.textContent=state.status;});
select.addEventListener('change',()=>{selected=select.value;api.setState({selected});});
open.addEventListener('click',()=>api.postMessage({type:'open',user:select.value}));refresh.addEventListener('click',()=>api.postMessage({type:'refresh'}));browse.addEventListener('click',()=>api.postMessage({type:'browse'}));api.postMessage({type:'ready'});
</script></body></html>`;
}

module.exports = {getHtml};
