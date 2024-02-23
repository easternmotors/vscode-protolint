import { execSync } from "child_process";
import {
  commands,
  languages,
  window,
  workspace,
  Diagnostic,
  DiagnosticSeverity,
  Disposable,
  Uri,
} from "vscode";

const diagnosticCollection = languages.createDiagnosticCollection("protolint");
let disposable: Disposable | undefined;

const activate = () => {
  // Register the protolint lint command
  disposable = commands.registerCommand("protolint.lint", (): void => {
    // Ensure there is an activeTextEditor and an open VSCode workspace
    if (!window.activeTextEditor || !workspace.workspaceFolders) {
      return;
    }

    // Only lint Protobuf files
    if (
      window.activeTextEditor.document.languageId !== "proto" &&
      window.activeTextEditor.document.languageId !== "proto3"
    ) {
      return;
    }

    // Attempt to find the VSCode workspace folder's Uri
    let workspaceFolderUri = undefined as Uri | undefined;
    for (let workspaceFolder of workspace.workspaceFolders ?? []) {
      if (
        window.activeTextEditor.document.uri.fsPath.startsWith(
          workspaceFolder.uri.fsPath
        )
      ) {
        workspaceFolderUri = workspaceFolder.uri;
      }
    }

    // Ensure a VSCode workspace folder Uri is found
    if (!workspaceFolderUri) {
      return undefined;
    }

    // Start building the protolint command to be executed
    // This defaults to the protolint executable found on the user's PATH
    let command = `protolint lint ${window.activeTextEditor.document.uri.fsPath}`;

    // If a custom protolint path is passed in, use it instead of the protolint executable found on the user's PATH
    const protolintPath = workspace
      .getConfiguration("protolint")
      .get<string>("path");
    if (protolintPath) {
      const uri = Uri.joinPath(workspaceFolderUri, protolintPath).fsPath;
      command = `${uri} lint ${window.activeTextEditor.document.uri.fsPath}`;
    }

    try {
      // Run the protolint command
      execSync(command, { cwd: workspaceFolderUri.fsPath });
    } catch ({ stderr }: any) {
      // Parse the stderr of the protolint command to build VSCode Diagnostics
      const diagnostics = (stderr.toString() as string)
        .split("\n")
        .reduce((previousValue, currentValue) => {
          // Ensure there is an activeTextEditor
          if (!window.activeTextEditor) {
            return previousValue;
          }

          // Ensure the line contains content
          if (!currentValue) {
            return previousValue;
          }

          // Parse the line number and the message
          const lineNumber = parseInt(
            currentValue.split(".proto:")[1] ?? "",
            10
          );
          const message = currentValue.split("] ")[1];

          // Ensure the line number and message exist
          if (isNaN(lineNumber) || !message) {
            return previousValue;
          }

          return [
            ...previousValue,
            new Diagnostic(
              window.activeTextEditor.document.lineAt(lineNumber - 1).range,
              message,
              DiagnosticSeverity.Error
            ),
          ];
        }, [] as Diagnostic[]);

      diagnosticCollection.set(
        window.activeTextEditor.document.uri,
        diagnostics
      );
    }
  });

  // Run linter when opening a new file
  window.onDidChangeActiveTextEditor(() => {
    commands.executeCommand("protolint.lint");
  });

  // Run linter when saving file
  workspace.onDidSaveTextDocument(() => {
    commands.executeCommand("protolint.lint");
  });
};

const deactivate = () => {
  disposable?.dispose();
}

export { activate, deactivate };
