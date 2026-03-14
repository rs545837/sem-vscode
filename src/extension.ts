import * as vscode from "vscode";
import * as path from "path";
import { Sem } from "./sem";
import { DiffProvider } from "./diff/provider";
import { GutterDecorator } from "./gutter/decorator";
import { BlameCodeLensProvider } from "./blame/provider";
import { showImpactPanel } from "./impact/panel";
import { showGraphPanel } from "./graph/panel";
import { DiffChange } from "./types";

let sem: Sem;

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  sem = new Sem(workspaceRoot);

  // Check binary exists
  const version = await sem.checkVersion();
  if (!version) {
    vscode.window
      .showErrorMessage(
        "sem binary not found. Install with: brew install ataraxy-labs/tap/sem",
        "Install Instructions"
      )
      .then((choice) => {
        if (choice) {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/Ataraxy-Labs/sem#install")
          );
        }
      });
    return;
  }

  // Diff sidebar
  const diffProvider = new DiffProvider(sem);
  vscode.window.registerTreeDataProvider("semDiff", diffProvider);

  // Gutter decorations
  const gutter = new GutterDecorator(sem, workspaceRoot);

  // Blame CodeLens
  const blameProvider = new BlameCodeLensProvider(sem, workspaceRoot);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: "file" }, blameProvider)
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("sem.refreshDiff", () => {
      sem.invalidateAll();
      diffProvider.refresh();
      blameProvider.refresh();
      const editor = vscode.window.activeTextEditor;
      if (editor) gutter.decorate(editor);
    }),

    vscode.commands.registerCommand("sem.impact", () =>
      showImpactPanel(sem, workspaceRoot, context)
    ),

    vscode.commands.registerCommand("sem.graph", () =>
      showGraphPanel(sem, workspaceRoot, context)
    ),

    vscode.commands.registerCommand("sem.toggleBlame", () => {
      const config = vscode.workspace.getConfiguration("sem");
      const current = config.get<boolean>("blame.enabled", true);
      config.update("blame.enabled", !current, true);
      blameProvider.refresh();
    }),

    vscode.commands.registerCommand(
      "sem.goToEntity",
      async (change: DiffChange) => {
        try {
          const entries = await sem.blame(change.filePath);
          const entry = entries.find((e) => e.name === change.entityName);
          const line = entry ? entry.lines[0] - 1 : 0;
          const uri = vscode.Uri.file(
            path.join(workspaceRoot, change.filePath)
          );
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(line, 0, line, 0),
          });
        } catch {
          // Fallback: just open the file
          const uri = vscode.Uri.file(
            path.join(workspaceRoot, change.filePath)
          );
          vscode.window.showTextDocument(uri);
        }
      }
    )
  );

  // Auto-refresh on save (debounced)
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (
        !vscode.workspace
          .getConfiguration("sem")
          .get<boolean>("diff.autoRefresh", true)
      ) {
        return;
      }

      const filePath = path.relative(workspaceRoot, doc.uri.fsPath);
      sem.invalidateDiff();
      sem.invalidateBlame(filePath);

      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        diffProvider.refresh();
        blameProvider.refresh();
        const editor = vscode.window.activeTextEditor;
        if (editor) gutter.decorate(editor);
      }, 500);
    })
  );

  // Decorate active editor on change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) gutter.decorate(editor);
    })
  );

  // Decorate current editor on activation
  if (vscode.window.activeTextEditor) {
    gutter.decorate(vscode.window.activeTextEditor);
  }

  context.subscriptions.push(gutter);
}

export function deactivate() {}
