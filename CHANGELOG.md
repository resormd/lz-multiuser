# Changelog

## 0.3.1 — 启动兼容性修复

- 修复跨账户启动命令超过 Windows 1024 字符限制后返回“参数错误”的问题。
- 将启动代码写入本工具创建的短期脚本；目标账户只有读取和执行权限，不保存密码或令牌。
- 完成进程核验后清理本次脚本；无法清理的脚本保留在工具自己的作业目录中。
- 启动超时提示加入 VS Code 更新锁说明，不强制结束更新器或关闭用户窗口。
- 保留通用版的安装路径自动识别、手动选择和离线 VSIX 分发。

## 0.3.0 — Portable distribution preview

- Generalized sidebar account selection for other Windows computers.
- Automatically detect VS Code / Insiders and allow a machine-local executable choice.
- Pass launch settings as encoded data instead of interpolating program paths into CMD.
- Keep password entry inside Windows runas, preserve authentication errors, and verify process identity and executable path.
- Add offline VSIX packaging, tests, MIT license, Windows CI, and draft GitHub releases.

This preview still requires manual cross-account authentication and environment-isolation validation on each target machine.
