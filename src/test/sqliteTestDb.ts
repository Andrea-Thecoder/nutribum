import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SCHEMA_PATH = fileURLToPath(new URL("../../src-tauri/migrations/0001_schema.sql", import.meta.url));

interface QueryResult {
  rowsAffected: number;
  lastInsertId?: number;
}

// Stessa forma di @tauri-apps/plugin-sql (select/execute), ma dietro c'è node:sqlite reale: nessun
// mock del database, solo un trasporto diverso da quello IPC di Tauri (non disponibile fuori
// dall'app reale). $1/$2/... sono parametri nominati nativi di SQLite: node:sqlite li lega passando
// un oggetto { "$1": valore, ... } invece di un array posizionale.
export interface TestDb {
  select<T>(query: string, params?: unknown[]): Promise<T>;
  execute(query: string, params?: unknown[]): Promise<QueryResult>;
  close(): void;
}

function legaParametri(params: unknown[] = []): Record<string, unknown> {
  const legati: Record<string, unknown> = {};
  params.forEach((valore, indice) => {
    legati[`$${indice + 1}`] = valore;
  });
  return legati;
}

export function creaDbDiTest(): TestDb {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(SCHEMA_PATH, "utf-8"));

  return {
    async select<T>(query: string, params: unknown[] = []): Promise<T> {
      return sqlite.prepare(query).all(legaParametri(params)) as T;
    },
    async execute(query: string, params: unknown[] = []): Promise<QueryResult> {
      const info = sqlite.prepare(query).run(legaParametri(params));
      return { rowsAffected: info.changes as number, lastInsertId: Number(info.lastInsertRowid) };
    },
    close() {
      sqlite.close();
    },
  };
}
