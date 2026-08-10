import { mkdtemp, rm } from "node:fs/promises";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Stessa idea di sqliteTestDb.ts ma per @tauri-apps/plugin-fs: le funzioni exists/mkdir/
// readTextFile/writeTextFile funzionano solo sull'IPC di Tauri, quindi nei test si mocka il modulo
// "@tauri-apps/plugin-fs" per farlo puntare qui - un vero filesystem (una directory temporanea
// reale), non un mock in-memory del filesystem stesso.
export interface TestFsPlugin {
  exists(path: string): Promise<boolean>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contenuto: string): Promise<void>;
  cleanup(): Promise<void>;
}

export async function creaFsDiTest(): Promise<TestFsPlugin> {
  const root = await mkdtemp(join(tmpdir(), "nutrition-tracker-test-"));
  const risolvi = (path: string) => join(root, path);

  return {
    async exists(path) {
      try {
        await fs.access(risolvi(path));
        return true;
      } catch {
        return false;
      }
    },
    async mkdir(path, opts) {
      await fs.mkdir(risolvi(path), { recursive: opts?.recursive });
    },
    async readTextFile(path) {
      return fs.readFile(risolvi(path), "utf-8");
    },
    async writeTextFile(path, contenuto) {
      await fs.writeFile(risolvi(path), contenuto, "utf-8");
    },
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
  };
}
