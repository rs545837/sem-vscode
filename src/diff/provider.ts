import * as vscode from "vscode";
import { Sem } from "../sem";
import { DiffChange } from "../types";

type TreeItem = FileItem | EntityItem;

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly filePath: string,
    public readonly entities: DiffChange[]
  ) {
    super(filePath, vscode.TreeItemCollapsibleState.Expanded);
    this.resourceUri = vscode.Uri.file(filePath);
    this.iconPath = vscode.ThemeIcon.File;
    this.description = `${entities.length} changes`;
  }
}

class EntityItem extends vscode.TreeItem {
  constructor(public readonly change: DiffChange) {
    super(change.entityName, vscode.TreeItemCollapsibleState.None);

    this.description = `${change.entityType} (${change.changeType})`;
    this.tooltip = `${change.entityId}\n${change.changeType}`;

    const icons: Record<string, vscode.ThemeIcon> = {
      added: new vscode.ThemeIcon(
        "diff-added",
        new vscode.ThemeColor("gitDecoration.addedResourceForeground")
      ),
      modified: new vscode.ThemeIcon(
        "diff-modified",
        new vscode.ThemeColor("gitDecoration.modifiedResourceForeground")
      ),
      deleted: new vscode.ThemeIcon(
        "diff-removed",
        new vscode.ThemeColor("gitDecoration.deletedResourceForeground")
      ),
      moved: new vscode.ThemeIcon("arrow-right"),
      renamed: new vscode.ThemeIcon("edit"),
    };
    this.iconPath = icons[change.changeType] ?? new vscode.ThemeIcon("circle");

    if (change.changeType !== "deleted") {
      this.command = {
        command: "sem.goToEntity",
        title: "Go to Entity",
        arguments: [change],
      };
    }
  }
}

export class DiffProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private sem: Sem) {}

  refresh(): void {
    this.sem.invalidateDiff();
    this._onDidChange.fire();
  }

  getTreeItem(el: TreeItem): vscode.TreeItem {
    return el;
  }

  async getChildren(el?: TreeItem): Promise<TreeItem[]> {
    if (el instanceof EntityItem) return [];

    if (el instanceof FileItem) {
      return el.entities.map((c) => new EntityItem(c));
    }

    // Root: group changes by file
    try {
      const diff = await this.sem.diff();
      if (!diff.changes.length) return [];

      const byFile = new Map<string, DiffChange[]>();
      for (const c of diff.changes) {
        const file = c.filePath;
        if (!byFile.has(file)) byFile.set(file, []);
        byFile.get(file)!.push(c);
      }

      return Array.from(byFile.entries()).map(
        ([file, entities]) => new FileItem(file, entities)
      );
    } catch {
      return [];
    }
  }
}
