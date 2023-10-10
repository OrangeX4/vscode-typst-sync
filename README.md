![](./icon.png)

# Typst Sync

A tool for Typst local packages management and synchronization.

https://github.com/OrangeX4/vscode-typst-sync

## Features

- `Shift + Cmd/Ctrl + P` to open the command panel to execute the commands. Of course, you can also set shortcuts for these commands.
- **Typst Package Manage**: manage your typst local packages.
  - `Import Typst Package` command: get text like `#import "@preview/example:0.1.0": *` and search local packages and preview packages.
  - `Import Typst Local Package` command: get text like `#import "@local/mytemplate:0.1.0": *` and only search local packages.
  - `Create Typst Local Package` command: create a typst local package.
  - `Open Typst Local Package` command: open a typst local package entrypoint file to edit it.
- **Sync**: synchronize local packages to remote repository.
  - You MUST to configure `syncRepo` setting to enable sync feature. **You can input a empty repo in github to init it.**
  - `Typst Sync`: synchronize local packages with remote repository.
  - `Push Typst Repo`: push to repository (actually consistent with `Typst Sync`).
  - `Pull Typst Repo`: pull from repository only.

## Requirements

**You should have git installed locally for simple-git to work.**

## Extension Settings

This extension contributes the following settings:

- `vscode-typst-sync.syncRepo`: syncRepo like https://github.com/OrangeX4/typst-sync-repo.git
- `vscode-typst-sync.dataDir`: data-dir in https://github.com/typst/packages#local-packages

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 0.2.0

- add command `Import Typst Package`
- add command `Import Typst Local Package`
- add command `Create Typst Local Package`
- add command `Open Typst Local Package`
- add command `Push Typst Repo`
- add command `Pull Typst Repo`
- add command `Typst Sync`


## License

This project is licensed under the MIT License.