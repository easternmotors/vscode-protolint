import { execSync } from 'child_process';
import { languages, window, workspace, Diagnostic, DiagnosticSeverity, OutputChannel, Uri } from 'vscode';

const diagnosticCollection = languages.createDiagnosticCollection('protolint');

const lint = (outputChannel: OutputChannel): void => {
  // Ensure a VSCode workspace is open and a proto3 file is active
  if (
    !window.activeTextEditor ||
    window.activeTextEditor.document.languageId !== 'proto3' ||
    typeof workspace.workspaceFolders === 'undefined'
  ) {
    return;
  }

  // Search for a root workspace folder
  const { document } = window.activeTextEditor;
  let workspaceFolderUri = undefined as Uri | undefined;
  for (let workspaceFolder of workspace.workspaceFolders ?? []) {
    if (document.uri.fsPath.startsWith(workspaceFolder.uri.fsPath)) {
      workspaceFolderUri = workspaceFolder.uri;
    }
  }

  // Ensure a root workspace folder is found
  if (!workspaceFolderUri) {
    return;
  }

  // Ensure both protolint.path and protolint.configPath are both set
  const protolintConfigPath = workspace.getConfiguration('protolint').get<string>('configPath');
  const protolintPath = workspace.getConfiguration('protolint').get<string>('path');
  if (!protolintConfigPath || !protolintPath) {
    return;
  }

  // Build the protolint command to be run
  const protolintFsConfigPath = Uri.joinPath(workspaceFolderUri, protolintConfigPath).fsPath;
  const protolintFsPath = Uri.joinPath(workspaceFolderUri, protolintPath).fsPath;
  const command = `${protolintFsPath} lint -config_path ${protolintFsConfigPath} ${document.uri.fsPath}`;

  // Run the protolint command and catch/log protolint errors
  try {
    outputChannel.appendLine(`Running protolint command: ${command}`);
    execSync(command, { cwd: workspaceFolderUri.fsPath });
    // If execSync doesn't error, no protolint errors were detected
    outputChannel.appendLine(`Protolint found no errors`);
    diagnosticCollection.set(document.uri, []);
  } catch ({ stderr }: any) {
    // If execSync errors, read the protolint errors from stderr
    outputChannel.appendLine(`Protolint produced output:\n${stderr.toString().trim()}`);
    const diagnostics = (stderr.toString().trim() as string).split('\n').reduce((previousValue, currentValue) => {
      const lineNumber = parseInt(currentValue.split('.proto:')[1] ?? '', 10);
      const message = currentValue.split('] ')[1];

      // Ensure lineNumber and message were parsed correctly
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
};

export default lint;
