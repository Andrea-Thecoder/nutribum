import { COLS } from "./gridConstants";

export interface Rettangolo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function sovrapposti(a: Rettangolo, b: Rettangolo): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function trovaPosizioneLibera(occupati: Rettangolo[], w: number, h: number): { x: number; y: number } {
  const maxY = occupati.reduce((max, p) => Math.max(max, p.y + p.h), 0);

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= COLS - w; x++) {
      const candidato: Rettangolo = { x, y, w, h };
      const collide = occupati.some((p) => sovrapposti(candidato, p));
      if (!collide) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

// Chiude gli spazi vuoti verticali dopo un drag/resize: ogni pannello NON ancorato sale il più in
// alto possibile senza sovrapporsi a nulla già "sistemato" sopra di lui nella stessa fascia di
// colonne. I pannelli ancorati restano punti fissi (non si spostano né vengono attraversati).
// Elabora dall'alto verso il basso (ordine per y attuale) così un pannello più in alto nel layout
// originale mantiene la priorità sullo stesso spazio rispetto a uno più in basso.
export function comprimiVerticale<T extends Rettangolo & { id: string; ancorato?: boolean }>(pannelli: T[]): T[] {
  const ordinati = [...pannelli].sort((a, b) => a.y - b.y || a.x - b.x);
  const sistemati: Rettangolo[] = [];
  const nuovaY = new Map<string, number>();

  for (const p of ordinati) {
    if (p.ancorato) {
      sistemati.push(p);
      continue;
    }
    let y = 0;
    while (sistemati.some((s) => sovrapposti({ x: p.x, y, w: p.w, h: p.h }, s))) {
      y++;
    }
    nuovaY.set(p.id, y);
    sistemati.push({ x: p.x, y, w: p.w, h: p.h });
  }

  return pannelli.map((p) => (nuovaY.has(p.id) ? { ...p, y: nuovaY.get(p.id)! } : p));
}
