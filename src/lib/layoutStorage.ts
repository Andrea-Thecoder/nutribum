import { exists, mkdir, readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { layoutDiDefault, type LayoutStorico } from "./layoutSchema";

const LAYOUT_FILE = "layout.json";

async function assicuraDirDati(): Promise<void> {
  const presente = await exists("", { baseDir: BaseDirectory.AppData });
  if (!presente) {
    await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

export async function caricaLayout(): Promise<LayoutStorico> {
  await assicuraDirDati();
  const presente = await exists(LAYOUT_FILE, { baseDir: BaseDirectory.AppData });
  if (!presente) {
    return layoutDiDefault();
  }
  const contenuto = await readTextFile(LAYOUT_FILE, { baseDir: BaseDirectory.AppData });
  return JSON.parse(contenuto) as LayoutStorico;
}

export async function salvaLayout(layout: LayoutStorico): Promise<void> {
  await assicuraDirDati();
  await writeTextFile(LAYOUT_FILE, JSON.stringify(layout, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}
