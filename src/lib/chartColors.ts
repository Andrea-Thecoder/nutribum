export interface PaletteGrafici {
  kcal: string;
  proteine: string;
  carboidrati: string;
  grassi: string;
  fibre: string;
  sale: string;
  peso: string;
  obiettivoPeso: string;
  limite: string;
  tdee: string;
  // Limite MINIMO di kcal e il suo fallback calcolato (BMR) — speculari a limite/tdee ma per il
  // rischio opposto (denutrizione, non sforamento), tinte diverse per non confonderli quando
  // compaiono tutti e quattro insieme nello stesso grafico.
  limiteMin: string;
  bmr: string;
  griglia: string;
  asse: string;
}

const PALETTE_CHIARA: PaletteGrafici = {
  kcal: "#f97316",
  proteine: "#3b82f6",
  carboidrati: "#eab308",
  grassi: "#ec4899",
  fibre: "#14b8a6",
  sale: "#8b5cf6",
  peso: "#6366f1",
  // Ambra, non un tono di blu/viola come "peso" (indigo): nell'unico grafico dove compaiono
  // insieme (Peso Corporeo) serve un contrasto netto anche per chi ha una discromatopsia
  // rosso-verde, che l'asse blu↔arancio preserva meglio di due tonalità vicine di blu/viola.
  obiettivoPeso: "#f59e0b",
  // Dedicato al "Limite impostato" in KcalGiornoChart/GraficiReport (report PDF): prima riusava
  // "asse", ma quel grigio è lo stesso di assi/griglia — la riga di riferimento si perdeva contro
  // lo sfondo del grafico E contro la linea TDEE quando i due valori sono vicini/coincidono.
  limite: "#dc2626",
  // Il TDEE usava "sale" (viola): confermato illeggibile contro il rosso di "limite" quando le due
  // linee coincidono (caso comune col checkbox "usa TDEE calcolato"). Verde smeraldo, l'unica tinta
  // fredda non già occupata da kcal (arancio) o limite (rosso) in questo grafico.
  tdee: "#059669",
  // Ambra, stessa famiglia usata per lo stato "sotto il minimo" nel calendario — coerente in tutta
  // l'app come tinta del rischio-denutrizione, distinta dal rosso dello sforamento.
  limiteMin: "#d97706",
  // Ciano, non verde come "tdee": nello stesso grafico compaiono entrambi (limite/TDEE per il
  // massimo, minimo/BMR per il minimo) e devono restare leggibili l'uno dall'altro a colpo d'occhio.
  bmr: "#0891b2",
  griglia: "#00000033",
  asse: "#525252",
};

const PALETTE_SCURA: PaletteGrafici = {
  kcal: "#60a5fa",
  proteine: "#34d399",
  carboidrati: "#fbbf24",
  grassi: "#fb7185",
  fibre: "#2dd4bf",
  sale: "#a78bfa",
  peso: "#818cf8",
  obiettivoPeso: "#fbbf24",
  limite: "#f87171",
  tdee: "#10b981",
  limiteMin: "#fbbf24",
  bmr: "#22d3ee",
  griglia: "#64748b33",
  asse: "#94a3b8",
};

export function paletteGrafici(isDark: boolean): PaletteGrafici {
  return isDark ? PALETTE_SCURA : PALETTE_CHIARA;
}

export function stileTooltip(isDark: boolean) {
  return {
    contentStyle: {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: {
      color: isDark ? "#f1f5f9" : "#0f172a",
      fontWeight: 600,
      marginBottom: 4,
    },
    itemStyle: {
      color: isDark ? "#e2e8f0" : "#334155",
    },
    cursor: { fill: isDark ? "rgba(148,163,184,0.15)" : "rgba(100,116,139,0.1)" },
  };
}
