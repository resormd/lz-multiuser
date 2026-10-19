# Changelog

## 0.3.0 — Portable distribution preview

- Generalized sidebar account selection for other Windows computers.
- Automatically detect VS Code / Insiders and allow a machine-local executable choice.
- Pass launch settings as encoded data instead of interpolating program paths into CMD.
- Keep password entry inside Windows runas, preserve authentication errors, and verify process identity and executable path.
- Add offline VSIX packaging, tests, MIT license, Windows CI, and draft GitHub releases.

This preview still requires manual cross-account authentication and environment-isolation validation on each target machine.
