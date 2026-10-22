# Windows User VS Code 0.3.1（预览版）

本次修复跨账户启动时因命令超过 Windows 1024 字符限制而返回“参数错误”的问题，改用具有受限读取权限的短期脚本，并补充 VS Code 更新锁的排查提示。不保存密码、不改变既有用户配置、不绕过 Windows 登录或组织脚本策略。

Download the VSIX attachment and use **Extensions → … → Install from VSIX…**. No development tools are required on the destination computer.

Select an existing local Windows user from the sidebar. For another account, enter its Windows password yourself at the independent runas prompt. Passwords are not saved by this extension.

Supports standard VS Code / Insiders installations on Windows; automatic path discovery and manual executable selection are included. Portable mode, domain accounts and Microsoft account input are not supported in this preview.

This draft should be published only after the maintainer completes the manual checks in CONTRIBUTING.md. Process detection does not by itself prove a newly created window or independent extension login state.
