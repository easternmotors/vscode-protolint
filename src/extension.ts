import { commands, window, workspace, Disposable, OutputChannel } from 'vscode';

import lint from './lint';

let disposable: Disposable | undefined;
let outputChannel: OutputChannel | undefined;

const activate = () => {
  // Create a VSCode output channel for better telemetry
  outputChannel = window.createOutputChannel('Protolint', 'proto3');
  outputChannel.appendLine('Activating Protolint extension');

  disposable = commands.registerCommand('protolint.lint', () => {
    if (outputChannel) {
      lint(outputChannel);
    }
  });

  // Run protolint when changing tabs
  window.onDidChangeActiveTextEditor(() => {
    commands.executeCommand('protolint.lint');
  });

  // Run protolint onSave
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
