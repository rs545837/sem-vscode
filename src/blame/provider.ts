import * as vscode from "vscode";
import * as path from "path";
import { Sem } from "../sem";

export class BlameCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChange.event;

  constructor(private sem: Sem, private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  async provideCodeLenses(
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    if (
      !vscode.workspace
        .getConfiguration("sem")
        .get<boolean>("blame.enabled", true)
    ) {
      return [];
    }

    const filePath = path.relative(
      this.workspaceRoot,
      document.uri.fsPath
    );

    try {
      const entries = await this.sem.blame(filePath);
      return entries.map((entry) => {
        const line = Math.max(0, entry.lines[0] - 1);
        const range = new vscode.Range(line, 0, line, 0);
        return new vscode.CodeLens(range, {
          title: `${entry.author} | ${entry.date} | ${entry.summary}`,
          command: "",
        });
      });
    } catch {
      return [];
    }
  }
}
