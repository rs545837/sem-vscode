import * as vscode from "vscode";
import * as path from "path";
import { Sem } from "../sem";

export async function showGraphPanel(
  sem: Sem,
  workspaceRoot: string,
  context: vscode.ExtensionContext
): Promise<void> {
  let graphData;
  try {
    graphData = await sem.graph();
  } catch (e: any) {
    vscode.window.showErrorMessage(`sem graph failed: ${e.message}`);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "semGraph",
    "Dependency Graph",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = renderGraphHtml(graphData);
}

function renderGraphHtml(data: {
  entities: number;
  edges: number;
  graph: { from: string; to: string; type: string }[];
}): string {
  // Extract unique nodes from edges
  const nodeSet = new Set<string>();
  for (const edge of data.graph) {
    nodeSet.add(edge.from);
    nodeSet.add(edge.to);
  }

  const nodes = Array.from(nodeSet).map((id) => {
    // Extract short name from entity ID (file::type::name -> name)
    const parts = id.split("::");
    const label = parts[parts.length - 1];
    const type = parts.length >= 2 ? parts[parts.length - 2] : "";
    const colors: Record<string, string> = {
      function: "#4FC1FF",
      class: "#DCDCAA",
      method: "#C586C0",
      interface: "#4EC9B0",
    };
    return {
      id,
      label,
      title: id,
      color: colors[type] ?? "#9CDCFE",
    };
  });

  const edges = data.graph.map((e, i) => {
    const colors: Record<string, string> = {
      Calls: "#569CD6",
      TypeRef: "#4EC9B0",
      Imports: "#CE9178",
    };
    return {
      id: i,
      from: e.from,
      to: e.to,
      arrows: "to",
      color: { color: colors[e.type] ?? "#666" },
      title: e.type,
    };
  });

  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; overflow: hidden; background: var(--vscode-editor-background); }
  #graph { width: 100vw; height: 100vh; }
  #legend {
    position: absolute; top: 12px; right: 12px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px; padding: 10px 14px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    font-size: 12px;
  }
  .legend-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  #stats {
    position: absolute; bottom: 12px; left: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family); font-size: 12px;
  }
</style>
<script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
</head>
<body>
  <div id="graph"></div>
  <div id="legend">
    <div class="legend-row"><div class="legend-dot" style="background:#569CD6"></div> Calls</div>
    <div class="legend-row"><div class="legend-dot" style="background:#4EC9B0"></div> TypeRef</div>
    <div class="legend-row"><div class="legend-dot" style="background:#CE9178"></div> Imports</div>
  </div>
  <div id="stats">${data.entities} entities, ${data.edges} edges</div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(nodes)});
    const edges = new vis.DataSet(${JSON.stringify(edges)});
    const container = document.getElementById('graph');
    const network = new vis.Network(container, { nodes, edges }, {
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: { gravitationalConstant: -30, centralGravity: 0.005, springLength: 120 },
        stabilization: { iterations: 150 }
      },
      nodes: {
        shape: 'dot',
        size: 12,
        font: { color: '#D4D4D4', size: 11 },
        borderWidth: 0
      },
      edges: {
        width: 1.5,
        smooth: { type: 'continuous' }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true
      }
    });
  </script>
</body>
</html>`;
}
