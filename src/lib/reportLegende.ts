import { paletteGrafici } from "./chartColors";

// Palette chiara forzata, indipendente dal tema dell'app in quel momento: coerente con i grafici
// "muti" di GraficiReport.tsx, con cui queste legende sono sempre mostrate fianco a fianco nel PDF.
const colori = paletteGrafici(false);

export const LEGENDA_KCAL = [
  { colore: colori.kcal, etichetta: "Kcal consumate" },
  { colore: colori.limite, etichetta: "Limite massimo" },
  { colore: colori.tdee, etichetta: "TDEE stimato" },
  { colore: colori.limiteMin, etichetta: "Limite minimo" },
  { colore: colori.bmr, etichetta: "BMR stimato" },
];

export const LEGENDA_MACRO = [
  { colore: colori.proteine, etichetta: "Proteine (g)" },
  { colore: colori.carboidrati, etichetta: "Carboidrati (g)" },
  { colore: colori.grassi, etichetta: "Grassi (g)" },
];

export const LEGENDA_FIBRE_SALE = [
  { colore: colori.fibre, etichetta: "Fibre (g)" },
  { colore: colori.sale, etichetta: "Sale (g)" },
];

export const LEGENDA_PESO = [
  { colore: colori.peso, etichetta: "Peso (kg)" },
  { colore: colori.obiettivoPeso, etichetta: "Obiettivo" },
];

export const LEGENDA_TDEE = [
  { colore: colori.tdee, etichetta: "TDEE stimato (kcal)" },
  { colore: colori.asse, etichetta: "BMR a riposo (kcal)" },
];
