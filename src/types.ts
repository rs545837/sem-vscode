// sem diff --format json
export interface DiffOutput {
  summary: DiffSummary;
  changes: DiffChange[];
}

export interface DiffSummary {
  fileCount: number;
  added: number;
  modified: number;
  deleted: number;
  moved: number;
  renamed: number;
  total: number;
}

export interface DiffChange {
  id: string;
  entityId: string;
  changeType: "added" | "modified" | "deleted" | "moved" | "renamed";
  entityType: string;
  entityName: string;
  filePath: string;
  oldFilePath?: string;
  beforeContent?: string;
  afterContent?: string;
  commitSha?: string;
  author?: string;
  timestamp?: string;
  structuralChange?: boolean;
}

// sem blame <file> --json
export interface BlameEntry {
  name: string;
  type: string;
  lines: [number, number];
  author: string;
  date: string;
  commit: string;
  summary: string;
}

// sem impact <entity> --json
export interface ImpactOutput {
  entity: EntityInfo;
  dependencies: EntityInfo[];
  impact: {
    total: number;
    entities: EntityInfo[];
  };
}

export interface EntityInfo {
  name: string;
  type: string;
  file: string;
  lines: [number, number];
}

// sem graph --format json (full graph)
export interface GraphOutput {
  entities: number;
  edges: number;
  graph: GraphEdge[];
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "Calls" | "TypeRef" | "Imports";
}

// sem graph --entity <name> --format json
export interface GraphEntityOutput {
  results: GraphEntityResult[];
}

export interface GraphEntityResult {
  id: string;
  name: string;
  type: string;
  file: string;
  lines: [number, number];
  dependencies: GraphEntityRef[];
  dependents: GraphEntityRef[];
  impact: GraphEntityRef[];
}

export interface GraphEntityRef {
  id: string;
  name: string;
  type: string;
  file: string;
}
