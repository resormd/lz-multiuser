'use strict';
const vscode = require('vscode');
const {safeUser, findExecutable, helper, cleanupJob} = require('./core');
const {getHtml} = require('./view');

class UserWindowsView {
  constructor(context, services = {}) {
    this.context = context;
    this.helper = services.helper || helper;
    this.findExecutable = services.findExecutable || findExecutable;
    this.cleanupJob = services.cleanupJob || cleanupJob;
    this.users = []; this.busy = false; this.executable = '';
    this.status = 'ѡ��һ�� Windows �û����´��ڡ�';
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
      this.status = this.users.length ? 'ѡ���û��󣬵�������´��ڡ���' : 'û���ҵ����õı����û���';
    } catch (error) { this.status = error.message; }
    this.publish();
  }
  async browse() {
    if (this.busy) return;
    const files = await vscode.window.showOpenDialog({title:'ѡ�� Code.exe �� Code - Insiders.exe', canSelectFiles:true, canSelectFolders:false, canSelectMany:false, filters:{'VS Code':['exe']}});
    if (!files?.length) return;
    try {
      const selected = this.findExecutable({saved:files[0].fsPath});
      await this.context.globalState.update('executablePath', selected);
      this.executable = selected;
      this.status = '�ѱ��汾������·����';
    } catch (error) { this.status = error.message; }
    this.publish();
  }
  async open(name) {
    if (this.busy) return;
    const user = this.users.find(item => item.name === name);
    if (!user || !safeUser(name)) { this.status = '��ѡ���б��е���Ч�����û���'; return this.publish(); }
    this.busy = true;
    this.status = user.current ? `����Ϊ ${name} �򿪱��ؿմ��ڡ�` : `���ڶ��� CMD ���������� ${name} �� Windows ���룬����ʱ����ʾ�ַ���`;
    this.publish();
    let job;
    try {
      const executable = this.detectExecutable();
      const request = {user:name, executable, bootstrap:this.context.asAbsolutePath('src/authenticate.cmd')};
      job = JSON.parse(await this.helper(this.context, 'launch.ps1', request));
      const result = JSON.parse(await this.helper(this.context, 'verify.ps1', request));
      this.status = result.processes.length
        ? `�Ѽ�⵽ ${result.account} �Ĵ��ڽ��̡���ȷ���´��ڿɼ���Ŀ¼����չ��¼���赥�����顣`
        : `δ���鵽 ${name} �Ĵ��ڽ��̡���鿴 CMD ���������־��ʾ vscode-updating�����ȱ������д��ڲ���� VS Code ���¡�`;
    } catch (error) { this.status = `����δ��ɣ�${error.message}`; }
    finally { if (job?.jobDirectory) this.cleanupJob(job.jobDirectory); this.busy = false; this.publish(); }
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
