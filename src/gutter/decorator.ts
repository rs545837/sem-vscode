import * as vscode from "vscode";
import { Sem } from "../sem";
import * as path from "path";

const addedDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconSize: "contain",
  isWholeLine: true,
  overviewRulerColor: new vscode.ThemeColor(
    "gitDecoration.addedResourceForeground"
  ),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  borderWidth: "0 0 0 3px",
  borderStyle: "solid",
  borderColor: new vscode.ThemeColor(
    "gitDecoration.addedResourceForeground"
  ),
});

const modifiedDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconSize: "contain",
  isWholeLine: true,
  overviewRulerColor: new vscode.ThemeColor(
    "gitDecoration.modifiedResourceForeground"
  ),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  borderWidth: "0 0 0 3px",
  borderStyle: "solid",
  borderColor: new vscode.ThemeColor(
    "gitDecoration.modifiedResourceForeground"
  ),
});

const deletedDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconSize: "contain",
  isWholeLine: true,
  overviewRulerColor: new vscode.ThemeColor(
    "gitDecoration.deletedResourceForeground"
  ),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  borderWidth: "0 0 0 3px",
  borderStyle: "solid",
  borderColor: new vscode.ThemeColor(
    "gitDecoration.deletedResourceForeground"
  ),
});

export class GutterDecorator {
  private disposables: vscode.Disposable[] = [];

  constructor(private sem: Sem, private workspaceRoot: string) {}

  async decorate(editor: vscode.TextEditor): Promise<void> {
    if (!vscode.workspace.getConfiguration("sem").get<boolean>("gutter.enabled", true)) {
      this.clear(editor);
      return;
    }

    const filePath = path.relative(
      this.workspaceRoot,
      editor.document.uri.fsPath
    );

    try {
      const [diff, blame] = await Promise.all([
        this.sem.diff(),
        this.sem.blame(filePath),
      ]);

      const fileChanges = diff.changes.filter(
        (c) => c.filePath === filePath
      );
      if (!fileChanges.length) {
        this.clear(editor);
        return;
      }

      const added: vscode.DecorationOptions[] = [];
      const modified: vscode.DecorationOptions[] = [];
      const deleted: vscode.DecorationOptions[] = [];

      for (const change of fileChanges) {
        const entity = blame.find((b) => b.name === change.entityName);
        if (!entity) continue;

        const [startLine, endLine] = entity.lines;
        const range = new vscode.Range(
          Math.max(0, startLine - 1),
          0,
          Math.max(0, endLine - 1),
          0
        );
        const decoration = { range, hoverMessage: `${change.entityType} **${change.entityName}** (${change.changeType})` };

        if (change.changeType === "added") added.push(decoration);
        else if (change.changeType === "deleted") deleted.push(decoration);
        else modified.push(decoration);
      }

      editor.setDecorations(addedDecoration, added);
      editor.setDecorations(modifiedDecoration, modified);
      editor.setDecorations(deletedDecoration, deleted);
    } catch {
      this.clear(editor);
    }
  }

  private clear(editor: vscode.TextEditor): void {
    editor.setDecorations(addedDecoration, []);
    editor.setDecorations(modifiedDecoration, []);
    editor.setDecorations(deletedDecoration, []);
  }

  dispose(): void {
    addedDecoration.dispose();
    modifiedDecoration.dispose();
    deletedDecoration.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
