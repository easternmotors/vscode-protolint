import { execSync } from 'child_process';
import { languages, window, workspace, Diagnostic, DiagnosticSeverity, OutputChannel, Uri } from 'vscode';

const diagnosticCollection = languages.createDiagnosticCollection('protolint');

const lint = (outputChannel: OutputChannel): void => {
  if (
    window.activeTextEditor &&
    window.activeTextEditor.document.languageId === 'proto3' &&
    workspace.workspaceFolders
  ) {
    const { document } = window.activeTextEditor;

    let workspaceFolderUri = undefined as Uri | undefined;
    for (let workspaceFolder of workspace.workspaceFolders ?? []) {
      if (document.uri.fsPath.startsWith(workspaceFolder.uri.fsPath)) {
        workspaceFolderUri = workspaceFolder.uri;
      }
    }

    if (workspaceFolderUri) {
      let command = `protolint lint`;

      const protolintPath = workspace.getConfiguration('protolint').get<string>('path');
      if (protolintPath) {
        const uri = Uri.joinPath(workspaceFolderUri, protolintPath).fsPath;
        command = `${uri} lint`;
      }

      const protolintConfigPath = workspace.getConfiguration('protolint').get<string>('configPath');
      if (protolintConfigPath) {
        const uri = Uri.joinPath(workspaceFolderUri, protolintConfigPath).fsPath;
        command += ` -config_path ${uri}`;
      }

      command += ` ${document.uri.fsPath}`;

      try {
        outputChannel.appendLine(`Running protolint command: ${command}`);
        execSync(command, { cwd: workspaceFolderUri.fsPath });
        outputChannel.appendLine(`Protolint found no errors`);
        diagnosticCollection.set(document.uri, []);
      } catch ({ stderr }: any) {
        outputChannel.appendLine(`Protolint produced output:\n${stderr.toString().trim()}`);
        const diagnostics = (stderr.toString().trim() as string).split('\n').reduce((previousValue, currentValue) => {
          const lineNumber = parseInt(currentValue.split('.proto:')[1] ?? '', 10);
          const message = currentValue.split('] ')[1];

          if (!isNaN(lineNumber) && message) {
            const diagnostic = new Diagnostic(document.lineAt(lineNumber - 1).range, message, DiagnosticSeverity.Error);
            diagnostic.source = 'protolint';
            return [...previousValue, diagnostic];
          }

          return previousValue;
        }, [] as Diagnostic[]);

        outputChannel.appendLine(`Protolint found ${diagnostics.length} errors`);
        diagnosticCollection.set(document.uri, diagnostics);
      }
    }
  }
};

export default lint;
