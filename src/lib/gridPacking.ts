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
