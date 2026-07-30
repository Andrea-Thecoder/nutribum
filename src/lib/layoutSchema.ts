export type TipoPannello =
  | "calendario"
  | "kcal-giorno"
  | "macro-giorno"
  | "fibre-sale-giorno"
  | "top-alimenti"
  | "top-alimenti-frequenza"
  | "dettaglio-giorno"
  | "registra-pasto"
  | "libro-alimenti"
  | "andamento-obiettivi"
  | "progresso-obiettivi"
  | "confronto-periodi"
  | "peso-corporeo"
  | "andamento-tdee"
  | "correlazione-peso-sforamenti"
  | "gestione-ricette";

export interface DefinizionePannello {
  tipo: TipoPannello;
  titolo: string;
}

export const DEFINIZIONI_PANNELLI: DefinizionePannello[] = [
  { tipo: "calendario", titolo: "Calendario kcal" },
  { tipo: "kcal-giorno", titolo: "Kcal per periodo" },
  { tipo: "macro-giorno", titolo: "Macronutrienti per periodo" },
  { tipo: "fibre-sale-giorno", titolo: "Altri nutrienti per periodo" },
  { tipo: "top-alimenti", titolo: "Top 10 alimenti per kcal" },
  { tipo: "top-alimenti-frequenza", titolo: "Top 10 alimenti più consumati" },
  { tipo: "dettaglio-giorno", titolo: "Dettaglio Giorno" },
  { tipo: "registra-pasto", titolo: "Registra pasto" },
  { tipo: "libro-alimenti", titolo: "Libro Degli Alimenti" },
  { tipo: "andamento-obiettivi", titolo: "Storico obiettivi" },
  { tipo: "progresso-obiettivi", titolo: "Progresso Obiettivi Nutrizionali" },
  { tipo: "confronto-periodi", titolo: "Confronto periodi" },
  { tipo: "peso-corporeo", titolo: "Peso corporeo" },
  { tipo: "andamento-tdee", titolo: "Andamento TDEE" },
  { tipo: "correlazione-peso-sforamenti", titolo: "Correlazione Peso - Sforamenti" },
  { tipo: "gestione-ricette", titolo: "Ricette" },
];

// Dimensione minima (in celle di griglia) sotto la quale un pannello smette di mostrare
// qualcosa di leggibile (es. un grafico si riduce ai soli controlli, senza area del grafico).
// Stimata in base ai controlli/elementi che ogni tipo di pannello impila in verticale.
const DIMENSIONE_MINIMA_DEFAULT = { w: 2, h: 2 };
const DIMENSIONI_MINIME: Partial<Record<TipoPannello, { w: number; h: number }>> = {
  calendario: { w: 4, h: 6 },
  "kcal-giorno": { w: 4, h: 8 },
  "macro-giorno": { w: 4, h: 8 },
  "fibre-sale-giorno": { w: 4, h: 8 },
  "top-alimenti": { w: 4, h: 8 },
  "top-alimenti-frequenza": { w: 4, h: 8 },
  "dettaglio-giorno": { w: 4, h: 6 },
  "registra-pasto": { w: 4, h: 6 },
  "libro-alimenti": { w: 6, h: 4 },
  "andamento-obiettivi": { w: 4, h: 12 },
  "progresso-obiettivi": { w: 4, h: 8 },
  "confronto-periodi": { w: 4, h: 8 },
  "peso-corporeo": { w: 4, h: 9 },
  "andamento-tdee": { w: 4, h: 8 },
  "correlazione-peso-sforamenti": { w: 5, h: 12 },
  "gestione-ricette": { w: 4, h: 8 },
};

export function dimensioneMinima(tipo: TipoPannello): { w: number; h: number } {
  return DIMENSIONI_MINIME[tipo] ?? DIMENSIONE_MINIMA_DEFAULT;
}

export interface Pannello {
  id: string;
  tipo: TipoPannello;
  x: number;
  y: number;
  w: number;
  h: number;
  dataGiorni?: string[];
  tabAttiva?: string;
  z?: number;
  ancorato?: boolean;
  vista?: "tabella" | "grafico";
}

export interface LayoutStorico {
  schemaVersion: string;
  pannelli: Pannello[];
}

// Altezza "di apertura" standard: fissa, non dipendente dalla finestra (a differenza di
// dimensioneDefault() in App.tsx, che si adatta al contenitore per l'aggiunta di un singolo
// pannello). Usata sia per il Calendario del layout di default sia da "Aggiungi tutti i grafici",
// così restano sempre alla stessa altezza per costruzione, non per coincidenza.
export const ALTEZZA_APERTURA_STANDARD = 9;

export function layoutDiDefault(): LayoutStorico {
  return {
    schemaVersion: "1.0",
    pannelli: [
      { id: "calendario-iniziale", tipo: "calendario", x: 0, y: 0, w: 4, h: ALTEZZA_APERTURA_STANDARD },
    ],
  };
}
