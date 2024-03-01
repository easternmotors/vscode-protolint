# vscode-protolint

This repo is a fork of https://github.com/plexsystems/vscode-protolint.

Notable changes:

* `protolint.path` and `protolint.configPath` are now required
* `protolint.path` now works properly and should point to a local executable file (i.e. `./node_modules/.bin/protolint`)
* `protolint.configPath` is added to point to a local configuration file (i.e. `./.protolint.yaml`)
* VSCode output channel is available and logs activity/linting commands for easier debugging of the extension
* Packaged extension is now 7.33KB
