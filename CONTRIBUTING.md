# Contributing

Use Node.js 22+ on Windows. Run `npm ci --ignore-scripts`, `npm test`, `npm run check:ps`, and `npm run package`.

Before publishing a release, manually verify:

1. Installing the VSIX without Node.js/Python on a second machine.
2. The sidebar lists ordinary local accounts and identifies the current local account correctly.
3. Auto detection and manual selection work for system installs and non-default paths.
4. The current account opens a blank window without a password prompt.
5. Another account prompts for its password in a real independent CMD; cancellation and incorrect credentials preserve useful errors without repeated automatic attempts.
6. The new window process belongs to the selected account and remains running after the launcher exits.
7. `whoami`, USERPROFILE, APPDATA, extension directories and any custom credential-home paths are appropriate in that window.
8. Existing windows and account credentials remain intact. Test independent extension sign-ins manually when relevant.
9. Portable mode and inaccessible installations produce clear failures rather than sharing data or changing permissions.

Do not add password collection to the webview, `/savecred`, security-policy changes, automatic elevation or credential-file access. Keep UI actions separate from local-account enumeration and validate messages before starting processes.

Do not include machine-specific logs, screenshots of authentication, account details, `.env` files, credentials, or personal VS Code profiles in commits.
