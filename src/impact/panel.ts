import * as vscode from "vscode";
import * as path from "path";
import { Sem } from "../sem";
import { ImpactOutput, EntityInfo } from "../types";

export async function showImpactPanel(
  sem: Sem,
  workspaceRoot: string,
  context: vscode.ExtensionContext
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor");
    return;
  }

  const filePath = path.relative(workspaceRoot, editor.document.uri.fsPath);
  const cursorLine = editor.selection.active.line + 1;

  // Find entity at cursor using blame line ranges
  let entityName: string | undefined;
  try {
    const entries = await sem.blame(filePath);
    for (const entry of entries) {
      if (cursorLine >= entry.lines[0] && cursorLine <= entry.lines[1]) {
        entityName = entry.name;
        break;
      }
    }
  } catch {
    vscode.window.showErrorMessage("Failed to run sem blame");
    return;
  }

  if (!entityName) {
    vscode.window.showWarningMessage("No entity found at cursor position");
    return;
  }

  let impact: ImpactOutput;
  try {
    impact = await sem.impact(entityName);
  } catch (e: any) {
    vscode.window.showErrorMessage(`sem impact failed: ${e.message}`);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "semImpact",
    `Impact: ${entityName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = renderImpactHtml(impact, workspaceRoot);

  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.command === "open") {
      const uri = vscode.Uri.file(path.join(workspaceRoot, msg.file));
      vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(msg.line - 1, 0, msg.line - 1, 0),
      });
    }
  });
}

function renderEntityRow(e: EntityInfo): string {
  return `<tr class="clickable" data-file="${e.file}" data-line="${e.lines[0]}">
    <td><code>${e.name}</code></td>
    <td>${e.type}</td>
    <td>${e.file}:${e.lines[0]}</td>
  </tr>`;
}

function renderImpactHtml(impact: ImpactOutput, _root: string): string {
  const e = impact.entity;
  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
  h2 { margin-top: 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border); }
  th { color: var(--vscode-descriptionForeground); }
  .clickable { cursor: pointer; }
  .clickable:hover { background: var(--vscode-list-hoverBackground); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
  .badge-impact { background: var(--vscode-inputValidation-errorBackground); color: var(--vscode-inputValidation-errorForeground); }
</style>
</head>
<body>
  <h1>${e.name}</h1>
  <p>${e.type} in <code>${e.file}:${e.lines[0]}</code></p>

  <h2>Dependencies (${impact.dependencies.length})</h2>
  <table>
    <tr><th>Entity</th><th>Type</th><th>Location</th></tr>
    ${impact.dependencies.map(renderEntityRow).join("")}
  </table>

  <h2>Impact <span class="badge badge-impact">${impact.impact.total} entities affected</span></h2>
  <table>
    <tr><th>Entity</th><th>Type</th><th>Location</th></tr>
    ${impact.impact.entities.map(renderEntityRow).join("")}
  </table>

  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('.clickable').forEach(row => {
      row.addEventListener('click', () => {
        vscode.postMessage({
          command: 'open',
          file: row.dataset.file,
          line: parseInt(row.dataset.line)
        });
      });
    });
  </script>
</body>
</html>`;
}
