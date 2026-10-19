'use strict';
const vscode = require('vscode');
const {safeUser, findExecutable, helper} = require('./core');
const {getHtml} = require('./view');

class UserWindowsView {
  constructor(context, services = {}) {
    this.context = context;
    this.helper = services.helper || helper;
    this.findExecutable = services.findExecutable || findExecutable;
    this.users = []; this.busy = false; this.executable = '';
    this.status = '选择一个 Windows 用户打开新窗口。';
  }
  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = {enableScripts:true, localResourceRoots:[]};
    this.context.subscriptions.push(view.webview.onDidReceiveMessage(async message => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'ready' || message.type === 'refresh') await this.refresh();
      else if (message.type === 'browse') await this.browse();
      else if (message.type === 'open' && typeof message.user === 'string') await this.open(message.user);
    }));
    view.webview.html = getHtml();
  }
  publish() { this.view?.webview.postMessage({type:'state', users:this.users, busy:this.busy, status:this.status, executable:this.executable}); }
  detectExecutable() {
    this.executable = this.findExecutable({saved:this.context.globalState.get('executablePath'), appRoot:vscode.env.appRoot});
    return this.executable;
  }
  async refresh() {
    if (this.busy) return this.publish();
    try {
      const data = JSON.parse(await this.helper(this.context, 'users.ps1'));
      this.users = data.users.filter(user => safeUser(user.name));
      this.detectExecutable();
      this.status = this.users.length ? '选择用户后，点击“打开新窗口”。' : '没有找到可用的本地用户。';
    } catch (error) { this.status = error.message; }
    this.publish();
  }
  async browse() {
    if (this.busy) return;
    const files = await vscode.window.showOpenDialog({title:'选择 Code.exe 或 Code - Insiders.exe', canSelectFiles:true, canSelectFolders:false, canSelectMany:false, filters:{'VS Code':['exe']}});
    if (!files?.length) return;
    try {
      const selected = this.findExecutable({saved:files[0].fsPath});
      await this.context.globalState.update('executablePath', selected);
      this.executable = selected;
      this.status = '已保存本机程序路径。';
    } catch (error) { this.status = error.message; }
    this.publish();
  }
  async open(name) {
    if (this.busy) return;
    const user = this.users.find(item => item.name === name);
    if (!user || !safeUser(name)) { this.status = '请选择列表中的有效本地用户。'; return this.publish(); }
    this.busy = true;
    this.status = user.current ? `正在为 ${name} 打开本地空窗口…` : `请在独立 CMD 中亲自输入 ${name} 的 Windows 密码，输入时不显示字符。`;
    this.publish();
    try {
      const executable = this.detectExecutable();
      const request = {user:name, executable, bootstrap:this.context.asAbsolutePath('src/authenticate.cmd')};
      await this.helper(this.context, 'launch.ps1', request);
      const result = JSON.parse(await this.helper(this.context, 'verify.ps1', request));
      this.status = result.processes.length
        ? `已检测到 ${result.account} 的窗口进程。请确认新窗口可见；目录与扩展登录仍需单独核验。`
        : `未核验到 ${name} 的窗口进程。请查看 CMD 错误信息。`;
    } catch (error) { this.status = `启动未完成：${error.message}`; }
    finally { this.busy = false; this.publish(); }
  }
}
function activate(context) {
  if (process.platform !== 'win32') return;
  const provider = new UserWindowsView(context);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('windowsUserVSCode.launcher', provider),
    vscode.commands.registerCommand('windowsUserVSCode.open', () => vscode.commands.executeCommand('windowsUserVSCode.launcher.focus')),
    vscode.commands.registerCommand('windowsUserVSCode.refresh', () => provider.refresh()));
}
module.exports = {activate, UserWindowsView};
