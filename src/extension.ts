import { commands, window, workspace, Disposable, OutputChannel } from 'vscode';

import lint from './lint';

let disposable: Disposable | undefined;
let outputChannel: OutputChannel | undefined;

const activate = () => {
  outputChannel = window.createOutputChannel('Protolint', 'proto3');
  outputChannel.appendLine('Activating Protolint extension');

  disposable = commands.registerCommand('protolint.lint', () => {
    if (outputChannel) {
      lint(outputChannel);
    }
  });

  window.onDidChangeActiveTextEditor(() => {
    commands.executeCommand('protolint.lint');
  });

  workspace.onDidSaveTextDocument(() => {
    commands.executeCommand('protolint.lint');
  });
};

const deactivate = () => {
  outputChannel?.appendLine('Deactivating Protolint extension');
  disposable?.dispose();
  outputChannel?.dispose();
};

export { activate, deactivate };
