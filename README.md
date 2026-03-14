# sem for VS Code

Entity-level semantic diffs, blame, impact analysis, and dependency graphs inside VS Code. Powered by [sem](https://github.com/Ataraxy-Labs/sem).

## Features

**Semantic Diff Sidebar** — See what changed at the entity level (functions, classes, methods), not just lines. Changes grouped by file with add/modify/delete/move icons. Click to navigate.

**Gutter Decorations** — Colored bars in the gutter showing which entities changed. Green for added, yellow for modified, red for deleted.

**Entity Blame** — CodeLens showing author, date, and commit message at the start of each function/class/method.

**Impact Analysis** — Place your cursor on any entity, run "Sem: Impact Analysis", and see every entity that would be affected if it changed. Uses the full cross-file dependency graph.

**Dependency Graph** — Interactive force-directed graph of your codebase's entity dependencies. Zoom, pan, click to explore.

## Requirements

Install the `sem` CLI:

```sh
brew install ataraxy-labs/tap/sem
```

Or build from source:

```sh
cargo install sem-cli
```

## Settings

| Setting | Default | Description |
|---|---|---|
| `sem.binaryPath` | `"sem"` | Path to the sem binary |
| `sem.blame.enabled` | `true` | Show entity blame CodeLens |
| `sem.gutter.enabled` | `true` | Show gutter decorations |
| `sem.diff.autoRefresh` | `true` | Refresh diff on file save |

## Commands

- **Sem: Refresh Semantic Diff** — Force refresh the diff sidebar
- **Sem: Impact Analysis** — Analyze impact of entity at cursor
- **Sem: Show Dependency Graph** — Open interactive dependency graph
- **Sem: Toggle Entity Blame** — Toggle blame CodeLens on/off
