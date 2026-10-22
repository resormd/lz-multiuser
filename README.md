# lz-multiuser：Windows 多用户 VS Code 启动工具

在 VS Code 主侧栏选择本地 Windows 用户，在**当前桌面**打开属于该用户的新 VS Code 窗口。适合同时使用不同 Windows 用户的开发环境和扩展登录状态。

**预览版本：0.3.1。** 无需切换 Windows 用户；其他账户的密码必须由本人在 Windows `runas` 提示中输入。工具不接收或保存密码。

这是一个独立的开源社区工具，并非微软或 OpenAI 的官方产品。扩展安装后的名称为 **Windows User VS Code**。

## 下载与安装

可直接[下载 0.3.1 离线安装包](https://github.com/resormd/lz-multiuser/raw/refs/heads/main/downloads/windows-user-vscode-0.3.1.vsix)，也可在本仓库的 Releases 中查找已发布版本。将 `.vsix` 文件复制到另一台电脑后即可离线安装；使用者不需要 Node.js、Python、Git 或开发环境。当前 0.3.1 为预览版，跨账户登录仍需在目标电脑实际验证。

安装包的 SHA-256 校验值见仓库 `downloads/SHA256SUMS.txt`。

1. 在 VS Code 扩展面板右上角 `…` 中选择 **Install from VSIX… / 从 VSIX 安装…**。
2. 选择下载的 `.vsix`，按 VS Code 提示完成安装。
3. 保存正在编辑的文件，执行 **Developer: Reload Window**。
4. 点击左侧活动栏的双人图标 **“用户窗口”**。

也可在本机终端安装：`code --install-extension windows-user-vscode-0.3.1.vsix`。

## 使用

1. 从下拉框选择本机账户。
2. 确认界面底部显示的 VS Code 路径。如果未识别或想使用另一份安装，点击 **“选择 VS Code 程序”**，选择 `Code.exe` 或 `Code - Insiders.exe`。
3. 点击 **“打开新窗口”**。
4. 选择其他用户时，会出现独立 CMD。亲自输入该 Windows 用户的**账户密码**并按 Enter。输入时不显示字符，不能使用 Windows Hello PIN。
5. 等待新窗口。启动失败时保留 CMD 的完整错误信息。关闭密码 CMD 可取消输入；成功提交后该 CMD 正常退出。

当前账户无需再次输入密码。工具从本地空窗口开始，不会自动打开原窗口的项目或 SSH 连接。路径选择保存在本机扩展状态中，不写入项目配置，不跨电脑同步。

如活动栏图标被隐藏，右键活动栏勾选“用户窗口”，或在命令面板执行 **“用户窗口：选择用户并打开 VS Code”**。

## 0.3.1 修复了什么

旧版把整段 PowerShell 启动代码放入 `runas` 参数，可能超过 Windows 跨账户启动接口的 1024 字符限制，返回 `-2147024809：参数错误`。新版改为较短的 `-File` 命令，并在启动前检查长度。

启动代码临时保存在 `%ProgramData%\windows-user-vscode-<当前用户 SID>\<随机目录>\launch.ps1`。目录由工具创建，脚本不含密码或令牌；目标账户对本次脚本只有读取和执行权限。完成进程核验后清理本次目录；如果 VS Code 在验证期间退出或文件仍被占用，可能保留少量作业文件，可在不再进行启动操作时由创建者清理。

不会改动已有用户配置目录的权限。组织策略若禁止脚本执行，新版会尊重该限制，不设置 `ExecutionPolicy Bypass`。如工具自己的既有作业目录拥有异常的写入权限，会拒绝继续使用，而不自动修改该目录的权限。

## 输入密码后没有窗口

如果详细日志出现 `checkInnoSetupMutex: vscode-updating is held`，说明这一步被 VS Code 更新锁阻挡，不能据此认定密码错误。

1. 先保存原来运行 VS Code 的账户下所有窗口中的文件。
2. 在原账户的 VS Code 中执行“更新并重启”，让待完成的更新结束；远程连接和终端任务可能中断。
3. 等原窗口重新打开后，再启动其他账户的窗口。

不需要重启电脑或注销 Windows。插件不会强制关闭原窗口、结束更新安装器或跳过更新锁。不能关闭原窗口时，请先保留工作现场，安排合适的时间完成更新。

## 运行要求与限制

- Windows 10 / 11 桌面环境，VS Code 1.85 或以上，系统自带 Windows PowerShell 5.1。
- 其他本地账户必须已存在、已启用且未锁定，并具备相应登录权限。工具不创建账户、不修改权限或组织策略。
- 支持标准 VS Code 与 VS Code Insiders 安装。**暂不支持 Portable 模式**，以避免默认共享便携用户数据。
- 推荐所有用户可访问的系统安装。若程序安装在某个用户的个人目录，其他账户可能无权访问，应由用户选择可访问的安装位置。
- 账户列表排除已知系统/沙箱账户。目前不支持手动输入域账户或 Microsoft 账户；用户名支持字母、数字、中文等文字字符、空格、点、下划线和连字符。
- 如果扩展安装路径含 `%`，启动器会明确拒绝该路径，防止 CMD 变量展开产生歧义。所选 VS Code 程序路径通过编码数据传递，支持空格和中文。
- 组织策略若禁止 `runas`、PowerShell 或 `Add-Type`，工具会报告错误，不会绕过限制。
- Remote SSH 工作区中扩展运行于**本地 UI 侧**；启动的是本机 Windows 程序。WSL、容器或远端进程的用户身份由相应环境决定。
- 窗口进程核验最多等待约两分钟。权限限制可能使进程信息不可读；这将被报告为未核验。

## 用户数据和 Codex 账号

不同 Windows 用户通常有自己的 VS Code 用户数据和扩展目录，但工具不把“命令已提交”当作隔离验证。即使检测到所选用户的窗口进程，也仍需确认新窗口实际可见；已有窗口进程可能被复用。

在新窗口的**本地**集成终端运行 `whoami`，检查 `USERPROFILE`、`APPDATA` 以及是否设置 `CODEX_HOME`。确认目录属于预期用户，再安装需要的扩展并登录对应账号。两个 Codex 账号分别发送请求并获得响应后，才能认为账号隔离验收完成。工具不安装、登录或操作 Codex，也不读取其凭据。

## 开发与打包

开发者需要 Node.js **22 或以上** 和 npm。运行与 PowerShell 检查需要 Windows。扩展运行时没有 npm 依赖；开发依赖仅用于微软官方 VSIX 打包工具。

```powershell
npm ci --ignore-scripts
npm test
npm run check:ps
npm run package
```

产物在 `dist/`。VS Code 的 `.vsix` 是可离线安装的完整工具，不需要单独拷贝脚本。

开发时可用：`code --extensionDevelopmentPath="项目绝对路径"`。建议为开发窗口指定独立的 `--user-data-dir`，以免影响日常工作区。

## GitHub 发布

- 推送代码或创建 PR 时，GitHub Actions 在 Windows 上执行测试、检查 PowerShell 语法并生成 VSIX 构建附件。
- 将 `package.json` 版本号和 `CHANGELOG.md` 更新后，推送匹配版本的标签，例如 `v0.3.1`，会生成一个附带 VSIX 和 SHA-256 校验文件的 **GitHub 草稿 Release**。
- 维护者完成真实 Windows 账户登录和隔离测试后，手动发布草稿。流程不会自动发布到 VS Code Marketplace。
- `publisher: local-tools` 是本地 VSIX 标识，不表示已注册同名 Marketplace 发布者。若以后上架 Marketplace，需要另行设置拥有权限的 publisher。

## 从本机旧版迁移

旧的实验扩展标识为 `local-tools.resormd-window`。新版使用 `local-tools.windows-user-vscode`，属于独立扩展。安装新版前，可手动禁用旧版，避免看到两个“用户窗口”入口；本工具不会替你卸载旧版或改动其配置。

## 安全与验证范围

不保存 Windows 密码，不使用 `/savecred`，不读取令牌、浏览器登录数据或 Codex 配置，不修改注册表、访问控制或安全策略。常规账户名和所选程序路径会在本机进程参数或环境中出现，它们不是密码。启动帮助进程会清除继承的 VS Code IPC / Electron 专用变量，防止误连原窗口。

测试涵盖路径识别、输入验证、侧栏消息处理、Windows 原生控制台启动与构建包内容。跨账户密码输入、登录限制、目标用户文件权限和账号隔离必须在实际机器上验证；目前不宣称已经在所有 Windows 版本或所有组织策略下验证。

## 许可证

MIT，完整条款见 LICENSE 文件。欢迎通过 Issue 和 Pull Request 反馈；提交问题前请删除密码、令牌和不必要的个人信息。
