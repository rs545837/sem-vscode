import { execFile } from "child_process";
import * as vscode from "vscode";
import {
  DiffOutput,
  BlameEntry,
  ImpactOutput,
  GraphOutput,
  GraphEntityOutput,
} from "./types";

export class Sem {
  private binaryPath: string;
  private cwd: string;

  // Caches
  private diffCache: DiffOutput | null = null;
  private blameCache = new Map<string, BlameEntry[]>();

  constructor(cwd: string) {
    this.cwd = cwd;
    this.binaryPath =
      vscode.workspace.getConfiguration("sem").get<string>("binaryPath") ??
      "sem";
  }

  private exec(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        this.binaryPath,
        args,
        { cwd: this.cwd, maxBuffer: 10 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || err.message));
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }

  async checkVersion(): Promise<string | null> {
    try {
      const out = await this.exec(["--version"]);
      return out.trim();
    } catch {
      return null;
    }
  }

  async diff(staged = false): Promise<DiffOutput> {
    if (this.diffCache) return this.diffCache;
    const args = ["diff", "--format", "json"];
    if (staged) args.push("--staged");
    const out = await this.exec(args);
    const result: DiffOutput = JSON.parse(out);
    this.diffCache = result;
    return result;
  }

  async blame(filePath: string): Promise<BlameEntry[]> {
    const cached = this.blameCache.get(filePath);
    if (cached) return cached;
    const out = await this.exec(["blame", filePath, "--json"]);
    const result: BlameEntry[] = JSON.parse(out);
    this.blameCache.set(filePath, result);
    return result;
  }

  async impact(entityName: string): Promise<ImpactOutput> {
    const out = await this.exec(["impact", entityName, "--json"]);
    return JSON.parse(out);
  }

  async graph(): Promise<GraphOutput> {
    const out = await this.exec(["graph", "--format", "json"]);
    return JSON.parse(out);
  }

  async graphEntity(entityName: string): Promise<GraphEntityOutput> {
    const out = await this.exec([
      "graph",
      "--entity",
      entityName,
      "--format",
      "json",
    ]);
    return JSON.parse(out);
  }

  invalidateDiff(): void {
    this.diffCache = null;
  }

  invalidateBlame(filePath?: string): void {
    if (filePath) {
      this.blameCache.delete(filePath);
    } else {
      this.blameCache.clear();
    }
  }

  invalidateAll(): void {
    this.diffCache = null;
    this.blameCache.clear();
  }
}
